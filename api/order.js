// Grava pedidos do checkout nas tabelas public.orders e public.order_items do Supabase.
// A chave secreta vive só nas variáveis de ambiente da Vercel
// (SUPABASE_URL e SUPABASE_SECRET_KEY) — nunca no navegador nem no repositório.
// Dados de cartão não fazem parte do contrato desta API: só os campos listados
// abaixo são lidos do corpo, e qualquer outro é ignorado.

const MAX_BODY_BYTES = 16384;
const SUPABASE_TIMEOUT_MS = 8000;
const MAX_TOTAL_CENTS = 100000000;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const WHATSAPP_RE = /^[1-9][1-9]9\d{8}$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PAYMENT_METHODS = ['cartao', 'pix', 'boleto'];
const STATES = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA',
  'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
];

function send(res, status, body, extraHeaders) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  if (extraHeaders) {
    Object.keys(extraHeaders).forEach((name) => res.setHeader(name, extraHeaders[name]));
  }
  res.end(JSON.stringify(body));
}

function fail(res, status, error, extraHeaders) {
  send(res, status, { ok: false, error }, extraHeaders);
}

// Devolve o objeto do corpo, ou null se estiver ausente, inválido ou grande demais.
function readBody(req) {
  const declared = Number(req.headers && req.headers['content-length']);
  if (declared > MAX_BODY_BYTES) return null;

  let body;
  try {
    body = req.body; // a Vercel já entrega o JSON interpretado; JSON inválido lança erro
  } catch (e) {
    return null;
  }

  if (Buffer.isBuffer(body)) body = body.toString('utf8');
  if (typeof body === 'string') {
    if (Buffer.byteLength(body, 'utf8') > MAX_BODY_BYTES) return null;
    try {
      body = JSON.parse(body);
    } catch (e) {
      return null;
    }
  }

  if (body === null || typeof body !== 'object' || Array.isArray(body)) return null;
  if (Buffer.byteLength(JSON.stringify(body), 'utf8') > MAX_BODY_BYTES) return null;
  return body;
}

function normalizeEmail(value) {
  if (typeof value !== 'string') return null;
  const email = value.trim().toLowerCase();
  if (email.length === 0 || email.length > 254 || !EMAIL_RE.test(email)) return null;
  return email;
}

// "+55 (11) 91234-5678" -> "5511912345678"
function normalizeWhatsapp(value) {
  if (typeof value !== 'string') return null;
  let digits = value.replace(/\D/g, '');
  if (digits.length === 13 && digits.startsWith('55')) digits = digits.slice(2);
  if (!WHATSAPP_RE.test(digits)) return null;
  return '55' + digits;
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

// CPF: só os dígitos, 11 no total, não pode ser uma sequência de dígitos iguais
// e os dois dígitos verificadores precisam bater (módulo 11). Devolve os 11
// dígitos ou null. O CPF é validado aqui e nunca gravado nem registrado em log.
function normalizeCpf(value) {
  if (typeof value !== 'string') return null;
  const digits = value.replace(/\D/g, '');
  if (digits.length !== 11 || /^(\d)\1{10}$/.test(digits)) return null;

  const checkDigit = (length) => {
    let sum = 0;
    for (let i = 0; i < length; i++) sum += Number(digits[i]) * (length + 1 - i);
    const rest = (sum * 10) % 11;
    return rest === 10 ? 0 : rest;
  };
  if (checkDigit(9) !== Number(digits[9]) || checkDigit(10) !== Number(digits[10])) return null;
  return digits;
}

// Texto obrigatório: após o trim, entre min e max caracteres.
function cleanText(value, min, max) {
  if (typeof value !== 'string') return null;
  const text = value.trim();
  if (text.length < min || text.length > max) return null;
  return text;
}

// Texto opcional (tamanho, cor): ausente ou vazio vira null; se vier, precisa caber em max.
// Devolve undefined quando o valor é inválido.
function cleanOptionalText(value, max) {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'string') return undefined;
  const text = value.trim();
  if (text.length === 0) return null;
  if (text.length > max) return undefined;
  return text;
}

// Valida um endereço (entrega ou cobrança), campo a campo e nesta ordem.
// Devolve { error: <código> } na primeira falha, ou { address } com os valores
// limpos. A referência só é lida quando withReference é true.
function checkAddress(raw, withReference) {
  const a = isPlainObject(raw) ? raw : {};

  const zip = typeof a.zip === 'string' ? a.zip.replace(/\D/g, '') : '';
  if (zip.length !== 8) return { error: 'invalid_zip' };

  const street = cleanText(a.street, 3, 120);
  if (!street) return { error: 'invalid_street' };

  const number = cleanText(a.number, 1, 15);
  if (!number) return { error: 'invalid_number' };

  const complement = cleanOptionalText(a.complement, 50);
  if (complement === undefined) return { error: 'invalid_complement' };

  const neighborhood = cleanText(a.neighborhood, 2, 80);
  if (!neighborhood) return { error: 'invalid_neighborhood' };

  const city = cleanText(a.city, 2, 100);
  if (!city) return { error: 'invalid_city' };

  if (typeof a.state !== 'string' || !STATES.includes(a.state)) return { error: 'invalid_state' };
  const state = a.state;

  let reference = null;
  if (withReference) {
    reference = cleanOptionalText(a.reference, 100);
    if (reference === undefined) return { error: 'invalid_reference' };
  }

  return { address: { zip, street, number, complement, neighborhood, city, state, reference } };
}

// "{rua}, {número}[ - {complemento}] - {bairro} - {UF}[ - Ref.: {referência}]"
// O texto é montado aqui, a partir dos campos já validados.
function buildAddressText(a) {
  return a.street + ', ' + a.number +
    (a.complement ? ' - ' + a.complement : '') +
    ' - ' + a.neighborhood + ' - ' + a.state +
    (a.reference ? ' - Ref.: ' + a.reference : '');
}

// Valida as linhas do carrinho e calcula os valores em centavos no servidor.
// Devolve { rows, totalCents } ou null se qualquer linha violar as regras.
function buildItems(items) {
  if (!Array.isArray(items) || items.length < 1 || items.length > 30) return null;

  const rows = [];
  let totalCents = 0;
  for (const item of items) {
    if (item === null || typeof item !== 'object' || Array.isArray(item)) return null;

    const id = cleanText(item.id, 1, 60);
    const name = cleanText(item.name, 1, 120);
    const size = cleanOptionalText(item.size, 20);
    const color = cleanOptionalText(item.color, 60);
    if (!id || !name || size === undefined || color === undefined) return null;

    if (!Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 99) return null;
    if (typeof item.price !== 'number' || !Number.isFinite(item.price) || item.price <= 0 || item.price > 5000) return null;

    const unitPriceCents = Math.round(item.price * 100);
    if (unitPriceCents < 1) return null;

    totalCents += unitPriceCents * item.quantity;
    rows.push({
      product_id: id,
      product_name: name,
      size,
      color,
      quantity: item.quantity,
      unit_price_cents: unitPriceCents
    });
  }

  if (totalCents > MAX_TOTAL_CENTS) return null;
  return { rows, totalCents };
}

// Uma chamada ao Supabase com timeout próprio. Lança erro em falha de rede ou timeout.
// Devolve { ok, status, data }; data só é lido (e nunca registrado) quando expectJson é true.
async function supabaseRequest(config, path, { method, prefer, body, expectJson }) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SUPABASE_TIMEOUT_MS);
  try {
    // A chave sb_secret_ não é JWT: vai só em apikey, sem Authorization: Bearer.
    const headers = { apikey: config.secretKey };
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (prefer) headers.Prefer = prefer;

    const response = await fetch(config.baseUrl + path, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal
    });

    let data = null;
    if (expectJson && response.ok) {
      data = await response.json().catch(() => null);
    } else {
      // Descarta o corpo sem lê-lo nem registrá-lo.
      await response.arrayBuffer().catch(() => {});
    }
    return { ok: response.ok, status: response.status, data };
  } finally {
    clearTimeout(timer);
  }
}

// Apaga um pedido que ficou sem itens (os itens, se existirem, saem em cascata).
// O resultado não muda a resposta ao navegador.
async function deleteOrder(config, orderId) {
  try {
    const result = await supabaseRequest(config, '/rest/v1/orders?id=eq.' + encodeURIComponent(orderId), { method: 'DELETE' });
    if (!result.ok) console.error('order: não foi possível apagar o pedido incompleto, status HTTP ' + result.status);
  } catch (e) {
    console.error('order: não foi possível apagar o pedido incompleto (rede ou tempo esgotado)');
  }
}

// Grava o pedido e os itens. Devolve { status, orderNumber }.
async function saveOrder(order, itemRows) {
  const baseUrl = process.env.SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!baseUrl || !secretKey) {
    console.error('order: variáveis de ambiente do Supabase ausentes');
    return { status: 500 };
  }
  const config = { baseUrl: baseUrl.replace(/\/+$/, ''), secretKey };

  // Etapa a: cria o pedido e descobre id e número.
  let created;
  try {
    const result = await supabaseRequest(config, '/rest/v1/orders?select=id,order_number', {
      method: 'POST',
      prefer: 'return=representation',
      body: order,
      expectJson: true
    });
    if (!result.ok) {
      console.error('order: o Supabase recusou a gravação do pedido, status HTTP ' + result.status);
      return { status: 502 };
    }
    created = Array.isArray(result.data) ? result.data[0] : null;
  } catch (e) {
    console.error('order: falha de rede ou tempo esgotado ao gravar o pedido');
    return { status: 502 };
  }

  const orderId = created && typeof created.id === 'string' && UUID_RE.test(created.id) ? created.id : null;
  const orderNumber = created ? Number(created.order_number) : NaN;
  if (!orderId || !Number.isSafeInteger(orderNumber) || orderNumber < 1) {
    console.error('order: resposta do Supabase sem id ou número do pedido');
    return { status: 502 };
  }

  // Etapa b: grava os itens.
  const rows = itemRows.map((row) => Object.assign({ order_id: orderId }, row));
  let itemsSaved = false;
  try {
    const result = await supabaseRequest(config, '/rest/v1/order_items', {
      method: 'POST',
      prefer: 'return=minimal',
      body: rows
    });
    itemsSaved = result.ok;
    if (!result.ok) console.error('order: o Supabase recusou a gravação dos itens, status HTTP ' + result.status);
  } catch (e) {
    console.error('order: falha de rede ou tempo esgotado ao gravar os itens');
  }

  // Etapa c: sem itens não existe pedido — desfaz o que foi criado.
  if (!itemsSaved) {
    await deleteOrder(config, orderId);
    return { status: 502 };
  }

  return { status: 200, orderNumber };
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return fail(res, 405, 'method_not_allowed', { Allow: 'POST' });
  }

  const body = readBody(req);
  if (!body) return fail(res, 400, 'invalid_body');

  const name = cleanText(body.name, 2, 120);
  if (!name) return fail(res, 400, 'invalid_name');

  const email = normalizeEmail(body.email);
  if (!email) return fail(res, 400, 'invalid_email');

  const whatsapp = normalizeWhatsapp(body.whatsapp);
  if (!whatsapp) return fail(res, 400, 'invalid_whatsapp');

  if (!normalizeCpf(body.cpf)) return fail(res, 400, 'invalid_cpf');

  // Os campos antigos address, city e zip no topo do corpo não são mais lidos:
  // o endereço vem só de delivery.
  const checked = checkAddress(body.delivery, true);
  if (checked.error) return fail(res, 400, checked.error);
  const delivery = checked.address;

  // Pagador diferente do comprador: só quando payerSame é exatamente false.
  // Para qualquer outro valor, payer é ignorado por completo.
  if (body.payerSame === false) {
    const payer = isPlainObject(body.payer) ? body.payer : {};
    if (!cleanText(payer.name, 2, 120)) return fail(res, 400, 'invalid_payer_name');
    if (!normalizeCpf(payer.cpf)) return fail(res, 400, 'invalid_payer_cpf');
    if (!normalizeEmail(payer.email)) return fail(res, 400, 'invalid_payer_email');
    if (checkAddress(payer.billing, false).error) return fail(res, 400, 'invalid_payer_address');
  }

  const paymentMethod = body.paymentMethod;
  if (!PAYMENT_METHODS.includes(paymentMethod)) return fail(res, 400, 'invalid_payment');

  let installments = 1;
  if (paymentMethod === 'cartao') {
    installments = body.installments;
    if (!Number.isInteger(installments) || installments < 1 || installments > 10) {
      return fail(res, 400, 'invalid_installments');
    }
  }

  const built = buildItems(body.items);
  if (!built) return fail(res, 400, 'invalid_items');

  // O total e o status nunca vêm do navegador: o total é recalculado aqui e o
  // status fica no padrão da tabela ('aguardando_pagamento').
  // TODO(banco): hoje só existem as colunas abaixo. O CPF do comprador, os dados
  // do pagador e os campos number, complement, neighborhood, state e reference
  // são validados acima e descartados (number, complement, neighborhood, state e
  // reference só entram no texto de "address"). Quando as colunas existirem,
  // gravar cada um no seu campo. Até lá, CPF e dados do pagador nunca são
  // gravados, registrados em log ou devolvidos na resposta.
  const order = {
    customer_name: name,
    customer_email: email,
    customer_whatsapp: whatsapp,
    address: buildAddressText(delivery),
    city: delivery.city,
    zip_code: delivery.zip,
    payment_method: paymentMethod,
    installments,
    total_cents: built.totalCents
  };

  const saved = await saveOrder(order, built.rows);
  if (saved.status === 200) return send(res, 200, { ok: true, orderNumber: saved.orderNumber });
  return fail(res, saved.status, 'server_error');
};
