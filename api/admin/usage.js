import { getSupabase } from '../_supabase.js';

function checkAdmin(req) {
  const auth = req.headers.authorization;
  return auth === `Bearer ${process.env.ADMIN_SECRET}`;
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  if (!checkAdmin(req)) return res.status(401).json({ error: 'Unauthorized' });

  const supabase = getSupabase();
  const { key_id, user_id, from, to, limit: queryLimit } = req.query;

  let query = supabase
    .from('usage_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(parseInt(queryLimit) || 100);

  if (key_id) query = query.eq('api_key_id', key_id);
  if (user_id) query = query.eq('user_id', user_id);
  if (from) query = query.gte('created_at', from);
  if (to) query = query.lte('created_at', to);

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });

  // Aggregate stats
  const totalTokens = data.reduce((sum, log) => sum + (log.input_tokens || 0) + (log.output_tokens || 0), 0);
  const byEndpoint = {};
  data.forEach(log => {
    byEndpoint[log.endpoint] = (byEndpoint[log.endpoint] || 0) + 1;
  });

  res.json({
    logs: data,
    summary: {
      totalRequests: data.length,
      totalTokens,
      byEndpoint,
    },
  });
}
