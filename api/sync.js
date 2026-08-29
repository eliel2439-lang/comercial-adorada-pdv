const TABLE = 'pdv_snapshots';
const ROW_ID = 'main';

function supabaseHeaders(extra) {
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    return Object.assign({
          apikey: key,
          Authorization: 'Bearer ' + key,
          'Content-Type': 'application/json'
    }, extra || {});
}

function restUrl() {
    const url = process.env.SUPABASE_URL;
    if (!url) throw new Error('SUPABASE_URL não configurado no Vercel.');
    return url.replace(/\/$/, '') + '/rest/v1/' + TABLE;
}

module.exports = async (req, res) => {
    try {
          if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
                  res.status(500).json({ error: 'SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não configurados no Vercel.' });
                  return;
          }

      if (req.method === 'GET') {
              const metaOnly = req.query && (req.query.meta === '1' || req.query.meta === 1);
              const select = metaOnly ? 'id,updated_at' : 'id,updated_at,snapshot';
              const r = await fetch(restUrl() + '?id=eq.' + ROW_ID + '&select=' + select, {
                        headers: supabaseHeaders()
              });
              const rows = await r.json().catch(() => []);
              if (!r.ok) throw new Error((rows && rows.message) || ('HTTP ' + r.status));
              const row = Array.isArray(rows) ? rows[0] : null;
              if (!row) {
                        res.status(200).json({ found: false });
                        return;
              }
              if (metaOnly) {
                        res.status(200).json({ found: true, updatedAt: row.updated_at });
                        return;
              }
              res.status(200).json({ found: true, updatedAt: row.updated_at, snapshot: row.snapshot });
              return;
      }

      if (req.method === 'POST') {
              const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
              const { snapshot, baseRemoteUpdatedAt, forceSeed } = body;
              if (!snapshot) {
                        res.status(400).json({ error: 'snapshot ausente no corpo da requisição.' });
                        return;
              }

            const checkR = await fetch(restUrl() + '?id=eq.' + ROW_ID + '&select=id,updated_at,snapshot', {
                      headers: supabaseHeaders()
            });
              const checkRows = await checkR.json().catch(() => []);
              if (!checkR.ok) throw new Error((checkRows && checkRows.message) || ('HTTP ' + checkR.status));
              const current = Array.isArray(checkRows) ? checkRows[0] : null;

            if (current && !forceSeed) {
                      const currentTs = current.updated_at;
                      const baseTs = baseRemoteUpdatedAt || null;
                      if (baseTs && currentTs && baseTs !== currentTs) {
                                  res.status(409).json({ snapshot: current.snapshot, updatedAt: currentTs });
                                  return;
                      }
            }

            const nowIso = new Date().toISOString();
              const writeR = await fetch(restUrl() + '?on_conflict=id', {
                        method: 'POST',
                        headers: supabaseHeaders({ Prefer: 'resolution=merge-duplicates,return=minimal' }),
                        body: JSON.stringify({ id: ROW_ID, updated_at: nowIso, snapshot: snapshot })
              });
              if (!writeR.ok) {
                        const errBody = await writeR.json().catch(() => ({}));
                        throw new Error(errBody.message || ('HTTP ' + writeR.status));
              }

            res.status(200).json({ updatedAt: nowIso, syncedAt: nowIso });
              return;
                }

      res.status(405).json({ error: 'Método não permitido.' });
    } catch (e) {
          res.status(500).json({ error: e.message });
    }
                                              };
