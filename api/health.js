module.exports = async function handler(req, res) {
      const supabaseUrl = process.env.SUPABASE_URL;
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      const databaseUrl = process.env.DATABASE_URL;
      const dbConfigured = Boolean(supabaseUrl && serviceKey);

      res.status(200).json({
              ok: true,
              service: 'Comercial Adorada PDV',
              environment: process.env.VERCEL_ENV || 'local',
              database: dbConfigured ? 'configured' : 'not-configured-yet',
              databaseUrlPresent: Boolean(databaseUrl),
              fiscal: 'not-configured-yet',
              timestamp: new Date().toISOString()
      });
};
