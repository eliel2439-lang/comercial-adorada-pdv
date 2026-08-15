const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const TABLE = 'pdv_snapshots';
const ROW_ID = 'default';

function readBody(req) {
  return new Promise((resolve, reject) => {
      if (req.body) {
            if (typeof req.body === 'string') {
                    try { resolve(JSON.parse(req.body)); } catch (e) { reject(e); }
                          } else {
                                  resolve(req.body);
                                        }
                                              return;
                                                  }
                                                      let raw = '';
                                                          req.on('data', (chunk) => { raw += chunk; });
                                                              req.on('end', () => {
                                                                    try { resolve(raw ? JSON.parse(raw) : {}); } catch (e) { reject(e); }
                                                                        });
                                                                            req.on('error', reject);
                                                                              });
                                                                              }

                                                                              module.exports = async function handler(req, res) {
                                                                                if (!SUPABASE_URL || !SERVICE_KEY) {
                                                                                    res.status(500).json({ ok: false, error: 'Supabase nao configurado (SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY ausente nas Environment Variables do Vercel).' });
                                                                                        return;
                                                                                          }

                                                                                            const headers = {
                                                                                                apikey: SERVICE_KEY,
                                                                                                    Authorization: 'Bearer ' + SERVICE_KEY,
                                                                                                        'Content-Type': 'application/json'
                                                                                                          };
                                                                                                          
                                                                                                            if (req.method === 'POST') {
                                                                                                                try {
                                                                                                                      const body = await readBody(req);
                                                                                                                            const payload = {
                                                                                                                                    id: ROW_ID,
                                                                                                                                            schema_version: body.schemaVersion || null,
                                                                                                                                                    updated_at: body.updatedAt || new Date().toISOString(),
                                                                                                                                                            snapshot: body.snapshot || {},
                                                                                                                                                                    synced_at: new Date().toISOString()
                                                                                                                                                                          };
                                                                                                                                                                                const r = await fetch(SUPABASE_URL + '/rest/v1/' + TABLE, {
                                                                                                                                                                                        method: 'POST',
                                                                                                                                                                                                headers: Object.assign({}, headers, { Prefer: 'resolution=merge-duplicates,return=minimal' }),
                                                                                                                                                                                                        body: JSON.stringify([payload])
                                                                                                                                                                                                              });
                                                                                                                                                                                                                    if (!r.ok) {
                                                                                                                                                                                                                            const errText = await r.text();
                                                                                                                                                                                                                                    res.status(502).json({ ok: false, error: 'Falha ao gravar no Supabase', detail: errText });
                                                                                                                                                                                                                                            return;
                                                                                                                                                                                                                                                  }
                                                                                                                                                                                                                                                        res.status(200).json({ ok: true, syncedAt: payload.synced_at });
                                                                                                                                                                                                                                                            } catch (e) {
                                                                                                                                                                                                                                                                  res.status(500).json({ ok: false, error: e.message });
                                                                                                                                                                                                                                                                      }
                                                                                                                                                                                                                                                                          return;
                                                                                                                                                                                                                                                                            }
                                                                                                                                                                                                                                                                            
                                                                                                                                                                                                                                                                              if (req.method === 'GET') {
                                                                                                                                                                                                                                                                                  try {
                                                                                                                                                                                                                                                                                        const r = await fetch(SUPABASE_URL + '/rest/v1/' + TABLE + '?id=eq.' + ROW_ID + '&select=*', { headers });
                                                                                                                                                                                                                                                                                              if (!r.ok) {
                                                                                                                                                                                                                                                                                                      const errText = await r.text();
                                                                                                                                                                                                                                                                                                              res.status(502).json({ ok: false, error: 'Falha ao ler do Supabase', detail: errText });
                                                                                                                                                                                                                                                                                                                      return;
                                                                                                                                                                                                                                                                                                                            }
                                                                                                                                                                                                                                                                                                                                  const rows = await r.json();
                                                                                                                                                                                                                                                                                                                                        res.status(200).json({ ok: true, data: rows[0] || null });
                                                                                                                                                                                                                                                                                                                                            } catch (e) {
                                                                                                                                                                                                                                                                                                                                                  res.status(500).json({ ok: false, error: e.message });
                                                                                                                                                                                                                                                                                                                                                      }
                                                                                                                                                                                                                                                                                                                                                          return;
                                                                                                                                                                                                                                                                                                                                                            }
                                                                                                                                                                                                                                                                                                                                                            
                                                                                                                                                                                                                                                                                                                                                              res.status(405).json({ ok: false, error: 'Metodo nao suportado' });
                                                                                                                                                                                                                                                                                                                                                              };
                                                                                                                                                                                                                                                                                                                                                              
