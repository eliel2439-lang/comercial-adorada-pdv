const { createClient } = require('@supabase/supabase-js');

const TABLE = 'pdv_snapshot';
const ROW_ID = 'main';

function getClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não configurados no Vercel.');
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

module.exports = async (req, res) => {
  let supabase;
  try {
    supabase = getClient();
  } catch (e) {
    res.status(500).json({ error: e.message });
    return;
  }

  if (req.method === 'GET') {
    const metaOnly = req.query && (req.query.meta === '1' || req.query.meta === 1);
    try {
      const { data: row, error } = await supabase
        .from(TABLE)
        .select('id, updated_at, data')
        .eq('id', ROW_ID)
        .maybeSingle();
      if (error) throw error;
      if (!row) {
        res.status(200).json({ found: false });
        return;
      }
      if (metaOnly) {
        res.status(200).json({ found: true, updatedAt: row.updated_at });
        return;
      }
      res.status(200).json({ found: true, updatedAt: row.updated_at, snapshot: row.data });
      return;
    } catch (e) {
      res.status(500).json({ error: e.message });
      return;
    }
  }

  if (req.method === 'POST') {
    try {
      const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
      const { snapshot, baseRemoteUpdatedAt, forceSeed } = body;
      if (!snapshot) {
        res.status(400).json({ error: 'snapshot ausente no corpo da requisição.' });
        return;
      }

      const { data: current, error: readError } = await supabase
        .from(TABLE)
        .select('id, updated_at, data')
        .eq('id', ROW_ID)
        .maybeSingle();
      if (readError) throw readError;

      if (current && !forceSeed) {
        const currentTs = current.updated_at;
        const baseTs = baseRemoteUpdatedAt || null;
        if (baseTs && currentTs && baseTs !== currentTs) {
          res.status(409).json({ snapshot: current.data, updatedAt: currentTs });
          return;
        }
      }

      const nowIso = new Date().toISOString();
      const { error: writeError } = await supabase
        .from(TABLE)
        .upsert({ id: ROW_ID, updated_at: nowIso, data: snapshot }, { onConflict: 'id' });
      if (writeError) throw writeError;

      res.status(200).json({ updatedAt: nowIso, syncedAt: nowIso });
      return;
    } catch (e) {
      res.status(500).json({ error: e.message });
      return;
    }
  }

  res.status(405).json({ error: 'Método não permitido.' });
};
