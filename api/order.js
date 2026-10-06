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

  const address = cleanText(body.address, 3, 200);
  if (!address) return fail(res, 400, 'invalid_address');

  const city = cleanText(body.city, 2, 100);
  if (!city) return fail(res, 400, 'invalid_city');

  const zip = typeof body.zip === 'string' ? body.zip.replace(/\D/g, '') : '';
  if (zip.length !== 8) return fail(res, 400, 'invalid_zip');

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
  const order = {
    customer_name: name,
    customer_email: email,
    customer_whatsapp: whatsapp,
    address,
    city,
    zip_code: zip,
    payment_method: paymentMethod,
    installments,
    total_cents: built.totalCents
  };

  const saved = await saveOrder(order, built.rows);
  if (saved.status === 200) return send(res, 200, { ok: true, orderNumber: saved.orderNumber });
  return fail(res, saved.status, 'server_error');
};
