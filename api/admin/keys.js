import crypto from 'crypto';
import { getSupabase } from '../_supabase.js';

function checkAdmin(req) {
  const auth = req.headers.authorization;
  return auth === `Bearer ${process.env.ADMIN_SECRET}`;
}

export default async function handler(req, res) {
  if (!checkAdmin(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const supabase = getSupabase();

  if (req.method === 'GET') {
    // List all keys with today's usage count
    const { data: keys, error } = await supabase
      .from('api_keys')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) return res.status(500).json({ error: error.message });

    // Get today's usage per key
    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);

    const keysWithUsage = await Promise.all(keys.map(async (key) => {
      const { count } = await supabase
        .from('usage_logs')
        .select('*', { count: 'exact', head: true })
        .eq('api_key_id', key.id)
        .gte('created_at', todayStart.toISOString());

      // Total usage all time
      const { count: totalCount } = await supabase
        .from('usage_logs')
        .select('*', { count: 'exact', head: true })
        .eq('api_key_id', key.id);

      return { ...key, todayUsage: count || 0, totalUsage: totalCount || 0 };
    }));

    return res.json({ keys: keysWithUsage });
  }

  if (req.method === 'POST') {
    // Create a new API key
    const { teamName, coachEmail, dailyLimit } = req.body;
    if (!teamName || !coachEmail) {
      return res.status(400).json({ error: 'teamName and coachEmail are required' });
    }

    const key = `dbt_${crypto.randomBytes(16).toString('hex')}`;

    const { data, error } = await supabase
      .from('api_keys')
      .insert({
        key,
        team_name: teamName,
        coach_email: coachEmail,
        daily_limit: dailyLimit || 100,
      })
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });

    return res.json({ key: data });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
