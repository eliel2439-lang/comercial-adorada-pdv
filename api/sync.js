const TABLE = 'pdv_snapshots';

function getConfig() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || '';
  if (!url || !key) {
    const err = new Error('Variáveis SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY não configuradas no Vercel.');
    err.code = 'SUPABASE_ENV_MISSING';
    throw err;
  }
  return { url: url.replace(/\/$/, ''), key };
}

async function supabase(path, options = {}) {
  const { url, key } = getConfig();
  const headers = {
    apikey: key,
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };
  const response = await fetch(`${url}/rest/v1/${path}`, { ...options, headers });
  const text = await response.text();
  let body = null;
  if (text) {
    try { body = JSON.parse(text); } catch { body = text; }
  }
  if (!response.ok) {
    const error = new Error(typeof body === 'string' ? body : (body?.message || body?.hint || `Supabase HTTP ${response.status}`));
    error.status = response.status;
    error.details = body;
    throw error;
  }
  return body;
}

async function getLatest() {
  const rows = await supabase(`${TABLE}?select=id,schema_version,snapshot,updated_at,synced_at&order=updated_at.desc&limit=1`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
  return Array.isArray(rows) && rows.length ? rows[0] : null;
}

function publicRow(row, includeSnapshot = true) {
  if (!row) return { ok: true, found: false };
  const result = {
    ok: true,
    found: true,
    id: row.id,
    schemaVersion: row.schema_version,
    updatedAt: row.updated_at,
    syncedAt: row.synced_at,
  };
  if (includeSnapshot) result.snapshot = row.snapshot;
  return result;
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  if (req.method === 'OPTIONS') {
    res.setHeader('Allow', 'GET, POST, OPTIONS');
    return res.status(204).end();
  }

  try {
    if (req.method === 'GET') {
      const row = await getLatest();
      const metaOnly = String(req.query?.meta || '') === '1';
      return res.status(200).json(publicRow(row, !metaOnly));
    }

    if (req.method !== 'POST') {
      res.setHeader('Allow', 'GET, POST, OPTIONS');
      return res.status(405).json({ ok: false, error: 'Método não permitido.' });
    }

    const body = req.body || {};
    if (!body.snapshot || typeof body.snapshot !== 'object') {
      return res.status(400).json({ ok: false, error: 'snapshot obrigatório.' });
    }

    const current = await getLatest();
    const baseRemoteUpdatedAt = body.baseRemoteUpdatedAt || null;

    // Proteção contra navegador/dispositivo desatualizado sobrescrever o banco.
    if (current && baseRemoteUpdatedAt && current.updated_at && baseRemoteUpdatedAt !== current.updated_at) {
      return res.status(409).json({
        ...publicRow(current, true),
        ok: false,
        conflict: true,
        code: 'STALE_SNAPSHOT',
        error: 'O banco foi atualizado por outro dispositivo. Recarregue antes de salvar novamente.',
      });
    }

    // Se já existe snapshot e o cliente não informou a versão-base, não aceitamos
    // uma gravação cega. Isso impede um navegador novo/vazio de apagar o banco.
    if (current && !baseRemoteUpdatedAt && !body.forceSeed) {
      return res.status(409).json({
        ...publicRow(current, true),
        ok: false,
        conflict: true,
        code: 'REMOTE_BASE_REQUIRED',
        error: 'É necessário carregar o snapshot remoto antes de gravar.',
      });
    }

    const now = new Date().toISOString();
    const payload = {
      schema_version: Number(body.schemaVersion || body.snapshot?.schemaVersion || 1),
      snapshot: body.snapshot,
      updated_at: now,
      synced_at: now,
    };

    let saved;
    if (current) {
      const rows = await supabase(`${TABLE}?id=eq.${encodeURIComponent(current.id)}&select=id,schema_version,snapshot,updated_at,synced_at`, {
        method: 'PATCH',
        headers: { Prefer: 'return=representation', Accept: 'application/json' },
        body: JSON.stringify(payload),
      });
      saved = Array.isArray(rows) && rows.length ? rows[0] : { ...current, ...payload };
    } else {
      const rows = await supabase(`${TABLE}?select=id,schema_version,snapshot,updated_at,synced_at`, {
        method: 'POST',
        headers: { Prefer: 'return=representation', Accept: 'application/json' },
        body: JSON.stringify(payload),
      });
      saved = Array.isArray(rows) && rows.length ? rows[0] : payload;
    }

    return res.status(200).json({
      ...publicRow(saved, false),
      ok: true,
      saved: true,
      deviceId: body.deviceId || null,
    });
  } catch (error) {
    console.error('PDV sync error:', error);
    return res.status(error.status && error.status >= 400 ? error.status : 500).json({
      ok: false,
      error: error.message || 'Erro interno na sincronização.',
      code: error.code || 'SYNC_ERROR',
    });
  }
};
