import { getSupabase } from './_supabase.js';
import { createClient } from '@supabase/supabase-js';

/**
 * Wraps a Vercel serverless handler with auth validation, rate limiting, and usage logging.
 * Supports two auth paths:
 *   - API key (B2B teams): Authorization: Bearer dbt_xxx
 *   - Supabase JWT (B2C users): Authorization: Bearer eyJxxx
 */
export function withAuth(handler) {
  return async function authedHandler(req, res) {
    // Skip auth in local dev if SKIP_AUTH is set
    if (process.env.SKIP_AUTH === 'true') {
      await handler(req, res);
      return;
    }

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing authorization. Provide an API key or sign in.' });
    }

    const token = authHeader.slice(7);
    const supabase = getSupabase();
    let authContext = null; // { type: 'api_key'|'user', id, dailyLimit }

    try {
      if (token.startsWith('dbt_')) {
        // B2B: API key validation
        const { data: keyRow, error } = await supabase
          .from('api_keys')
          .select('id, team_name, daily_limit, is_active')
          .eq('key', token)
          .single();

        if (error || !keyRow) {
          return res.status(401).json({ error: 'Invalid API key.' });
        }
        if (!keyRow.is_active) {
          return res.status(401).json({ error: 'This API key has been revoked.' });
        }

        authContext = { type: 'api_key', id: keyRow.id, dailyLimit: keyRow.daily_limit };
      } else {
        // B2C: Supabase JWT validation
        // Use the anon client to verify the JWT
        const anonClient = createClient(
          process.env.SUPABASE_URL,
          process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_KEY
        );
        const { data: { user }, error } = await anonClient.auth.getUser(token);

        if (error || !user) {
          return res.status(401).json({ error: 'Invalid or expired session. Please sign in again.' });
        }

        // Look up user profile for plan/limits
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, plan, daily_limit')
          .eq('id', user.id)
          .single();

        if (!profile) {
          // Auto-create profile for new users (free tier)
          const { data: newProfile } = await supabase
            .from('profiles')
            .insert({ id: user.id, email: user.email, plan: 'free', daily_limit: 5 })
            .select()
            .single();

          authContext = { type: 'user', id: user.id, dailyLimit: newProfile?.daily_limit || 5 };
        } else {
          authContext = { type: 'user', id: profile.id, dailyLimit: profile.daily_limit };
        }
      }

      // Rate limiting: count today's requests
      const todayStart = new Date();
      todayStart.setUTCHours(0, 0, 0, 0);

      const countColumn = authContext.type === 'api_key' ? 'api_key_id' : 'user_id';
      const { count } = await supabase
        .from('usage_logs')
        .select('*', { count: 'exact', head: true })
        .eq(countColumn, authContext.id)
        .gte('created_at', todayStart.toISOString());

      if (count >= authContext.dailyLimit) {
        return res.status(429).json({
          error: 'Daily usage limit reached.',
          limit: authContext.dailyLimit,
          used: count,
          upgradeUrl: authContext.type === 'user' ? '/upgrade' : null,
        });
      }

      // Attach auth context for handler use
      req._auth = authContext;

      // Run the actual handler
      await handler(req, res);

      // Log usage (fire after response — token counts attached by handler)
      const usage = req._usage || {};
      await supabase.from('usage_logs').insert({
        api_key_id: authContext.type === 'api_key' ? authContext.id : null,
        user_id: authContext.type === 'user' ? authContext.id : null,
        endpoint: req.url || req.path || 'unknown',
        input_tokens: usage.input_tokens || 0,
        output_tokens: usage.output_tokens || 0,
      });
    } catch (err) {
      console.error('Auth middleware error:', err);
      if (!res.headersSent) {
        return res.status(500).json({ error: 'Internal server error.' });
      }
    }
  };
}
