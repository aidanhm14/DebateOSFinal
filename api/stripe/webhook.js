import Stripe from 'stripe';
import { getSupabase } from '../_supabase.js';

// Disable body parsing — Stripe needs the raw body for signature verification
export const config = { api: { bodyParser: false } };

async function getRawBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const supabase = getSupabase();

  let event;
  try {
    const rawBody = await getRawBody(req);
    const sig = req.headers['stripe-signature'];
    event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).json({ error: `Webhook Error: ${err.message}` });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const userId = session.metadata?.supabase_user_id;
        if (userId) {
          await supabase
            .from('profiles')
            .update({
              plan: 'pro',
              daily_limit: 50,
              stripe_customer_id: session.customer,
              stripe_subscription_id: session.subscription,
            })
            .eq('id', userId);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        // Downgrade user back to free
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id')
          .eq('stripe_subscription_id', subscription.id);

        if (profiles?.length > 0) {
          await supabase
            .from('profiles')
            .update({ plan: 'free', daily_limit: 5, stripe_subscription_id: null })
            .eq('id', profiles[0].id);
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        if (subscription.cancel_at_period_end) {
          // User cancelled but still has access until period end — no action needed
        }
        break;
      }
    }

    res.json({ received: true });
  } catch (err) {
    console.error('Webhook handler error:', err);
    res.status(500).json({ error: 'Webhook handler failed' });
  }
}
