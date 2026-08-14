module.exports = function handler(req, res) {
  res.status(200).json({
    ok: true,
    service: 'Comercial Adorada PDV',
    environment: process.env.VERCEL_ENV || 'local',
    database: 'not-configured-yet',
    fiscal: 'not-configured-yet',
    timestamp: new Date().toISOString()
  });
};
