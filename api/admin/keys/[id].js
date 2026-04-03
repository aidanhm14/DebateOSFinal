import { getSupabase } from '../../_supabase.js';

function checkAdmin(req) {
  const auth = req.headers.authorization;
  return auth === `Bearer ${process.env.ADMIN_SECRET}`;
}

export default async function handler(req, res) {
  if (!checkAdmin(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { id } = req.query;
  if (!id) return res.status(400).json({ error: 'Missing key id' });

  const supabase = getSupabase();

  if (req.method === 'PATCH') {
    // Update key (revoke, change limit, etc.)
    const updates = {};
    const { isActive, dailyLimit } = req.body;

    if (typeof isActive === 'boolean') {
      updates.is_active = isActive;
      if (!isActive) updates.revoked_at = new Date().toISOString();
    }
    if (typeof dailyLimit === 'number') {
      updates.daily_limit = dailyLimit;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No valid updates provided' });
    }

    const { data, error } = await supabase
      .from('api_keys')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.json({ key: data });
  }

  if (req.method === 'DELETE') {
    const { error } = await supabase
      .from('api_keys')
      .delete()
      .eq('id', id);

    if (error) return res.status(500).json({ error: error.message });
    return res.json({ deleted: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
