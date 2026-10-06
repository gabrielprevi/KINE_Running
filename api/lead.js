// Grava cadastros (pop-up e rodapé) na tabela public.leads do Supabase.
// A chave secreta vive só nas variáveis de ambiente da Vercel
// (SUPABASE_URL e SUPABASE_SECRET_KEY) — nunca no navegador nem no repositório.

const MAX_BODY_BYTES = 2048;
const SUPABASE_TIMEOUT_MS = 8000;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const WHATSAPP_RE = /^[1-9][1-9]9\d{8}$/;

// O texto de consentimento é decidido aqui, nunca pelo navegador.
const CONSENT_TEXT = {
  popup: 'Aceito receber ofertas e novidades da KINE por e-mail e WhatsApp.',
  rodape: 'Ao enviar, você aceita receber ofertas e novidades da KINE por e-mail.'
};

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

async function saveLead(row, preferResolution) {
  const baseUrl = process.env.SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!baseUrl || !secretKey) {
    console.error('lead: variáveis de ambiente do Supabase ausentes');
    return 500;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SUPABASE_TIMEOUT_MS);
  try {
    const response = await fetch(baseUrl.replace(/\/+$/, '') + '/rest/v1/leads?on_conflict=email', {
      method: 'POST',
      headers: {
        // A chave sb_secret_ não é JWT: vai só em apikey, sem Authorization: Bearer.
        apikey: secretKey,
        'Content-Type': 'application/json',
        Prefer: preferResolution + ',return=minimal'
      },
      body: JSON.stringify(row),
      signal: controller.signal
    });
    // Descarta o corpo sem lê-lo nem registrá-lo.
    await response.arrayBuffer().catch(() => {});
    if (!response.ok) {
      console.error('lead: o Supabase recusou a gravação, status HTTP ' + response.status);
      return 502;
    }
    return 200;
  } catch (e) {
    console.error('lead: falha de rede ou tempo esgotado ao chamar o Supabase');
    return 502;
  } finally {
    clearTimeout(timer);
  }
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return fail(res, 405, 'method_not_allowed', { Allow: 'POST' });
  }

  const body = readBody(req);
  if (!body) return fail(res, 400, 'invalid_body');

  if (body.source !== 'popup' && body.source !== 'rodape') {
    return fail(res, 400, 'invalid_source');
  }
  const source = body.source;

  const email = normalizeEmail(body.email);
  if (!email) return fail(res, 400, 'invalid_email');

  let whatsapp = null;
  if (source === 'popup') {
    whatsapp = normalizeWhatsapp(body.whatsapp);
    if (!whatsapp) return fail(res, 400, 'invalid_whatsapp');
    if (body.consent !== true) return fail(res, 400, 'consent_required');
  }

  const row = {
    email,
    whatsapp,
    source,
    // No rodapé o consentimento é o aviso exibido junto ao formulário.
    consent: true,
    consent_text: CONSENT_TEXT[source],
    consent_at: new Date().toISOString()
  };

  // Pop-up: e-mail repetido atualiza WhatsApp e consentimento.
  // Rodapé: e-mail repetido não altera nada.
  const resolution = source === 'popup' ? 'resolution=merge-duplicates' : 'resolution=ignore-duplicates';

  const status = await saveLead(row, resolution);
  if (status === 200) return send(res, 200, { ok: true });
  return fail(res, status, 'server_error');
};
