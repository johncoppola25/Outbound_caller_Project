import express from 'express';
import Stripe from 'stripe';
import { getDb } from '../db/init.js';

const router = express.Router();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Plan definitions
const PLANS = [
  {
    id: 'setup',
    name: 'Setup Fee',
    price: 100000, // cents = $1,000
    priceDisplay: '$1,000',
    interval: null, // one-time
    oneTime: true,
    features: ['Full platform setup', 'Custom AI script configuration', 'Campaign creation', 'Contact import assistance', 'Training & onboarding']
  },
  {
    id: 'monthly',
    name: 'Monthly Subscription',
    price: 100000, // cents = $1,000
    priceDisplay: '$1,000',
    interval: 'month',
    popular: true,
    features: ['Unlimited AI calls', 'Call recording & transcripts', 'Voicemail detection', 'Full analytics dashboard', 'Priority support', 'Custom AI scripts', 'Multiple campaigns', '$100 per booked appointment (billed automatically)']
  }
];

// Stripe price IDs cache
let stripePrices = {};

async function ensureStripeProducts() {
  if (Object.keys(stripePrices).length > 0) return stripePrices;

  try {
    const existingProducts = await stripe.products.list({ limit: 100 });

    for (const plan of PLANS) {
      const productName = `EstateReach ${plan.name}`;
      let product = existingProducts.data.find(p => p.name === productName && p.active);

      if (!product) {
        const description = plan.oneTime
          ? 'One-time platform setup and onboarding'
          : 'Monthly AI calling platform subscription';
        product = await stripe.products.create({
          name: productName,
          description,
          metadata: { plan_id: plan.id }
        });
        console.log(`Created Stripe product: ${productName}`);
      }

      // Check for existing price
      const existingPrices = await stripe.prices.list({ product: product.id, active: true, limit: 10 });
      let price;
      if (plan.interval) {
        price = existingPrices.data.find(p => p.unit_amount === plan.price && p.recurring?.interval === plan.interval && p.recurring?.usage_type !== 'metered');
      } else {
        price = existingPrices.data.find(p => p.unit_amount === plan.price && !p.recurring);
      }

      if (!price) {
        const priceData = {
          product: product.id,
          unit_amount: plan.price,
          currency: 'usd',
          metadata: { plan_id: plan.id }
        };
        if (plan.interval) priceData.recurring = { interval: plan.interval };
        price = await stripe.prices.create(priceData);
        console.log(`Created Stripe price: ${productName} - ${plan.priceDisplay}${plan.interval ? '/mo' : ' one-time'}`);
      }

      stripePrices[plan.id] = { priceId: price.id, productId: product.id };
    }

    // Create metered appointment price (separate product)
    const apptProductName = 'EstateReach Appointment Fee';
    let apptProduct = existingProducts.data.find(p => p.name === apptProductName && p.active);
    if (!apptProduct) {
      apptProduct = await stripe.products.create({
        name: apptProductName,
        description: '$100 per booked appointment',
        metadata: { plan_id: 'appointment_metered' }
      });
      console.log(`Created Stripe product: ${apptProductName}`);
    }

    const apptPrices = await stripe.prices.list({ product: apptProduct.id, active: true, limit: 10 });
    let apptPrice = apptPrices.data.find(p => p.unit_amount === 10000 && p.recurring?.usage_type === 'metered');
    if (!apptPrice) {
      apptPrice = await stripe.prices.create({
        product: apptProduct.id,
        unit_amount: 10000, // $100
        currency: 'usd',
        recurring: { interval: 'month', usage_type: 'metered' },
        metadata: { plan_id: 'appointment_metered' }
      });
      console.log(`Created Stripe metered price: Appointment Fee - $100/each`);
    }
    stripePrices['appointment_metered'] = { priceId: apptPrice.id, productId: apptProduct.id };

    console.log('Stripe products ready:', Object.keys(stripePrices));
    return stripePrices;
  } catch (error) {
    console.error('Error setting up Stripe products:', error.message);
    return {};
  }
}

// Get available plans
router.get('/plans', async (req, res) => {
  try {
    const prices = await ensureStripeProducts();
    const db = await getDb();
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
    const setupFeePaid = !!user?.setup_fee_paid;

    const plans = PLANS.map(plan => ({
      ...plan,
      stripePriceId: prices[plan.id]?.priceId || null
    }));
    res.json({ plans, setupFeePaid });
  } catch (error) {
    console.error('Error fetching plans:', error);
    res.status(500).json({ error: 'Failed to fetch plans' });
  }
});

// Get current subscription
router.get('/subscription', async (req, res) => {
  try {
    const db = await getDb();
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);

    if (!user?.stripe_customer_id) {
      return res.json({ subscription: null, plan: null, setupFeePaid: !!user?.setup_fee_paid });
    }

    // Check if setup fee was paid via Stripe (in case DB flag missed it)
    if (!user.setup_fee_paid) {
      const payments = await stripe.paymentIntents.list({
        customer: user.stripe_customer_id,
        limit: 50
      });
      const setupPayment = payments.data.find(p =>
        p.status === 'succeeded' && p.metadata?.plan_id === 'setup'
      );
      if (setupPayment) {
        db.prepare('UPDATE users SET setup_fee_paid = 1 WHERE id = ?').run(user.id);
        user.setup_fee_paid = 1;
      }
    }

    // Get active subscription from Stripe
    const subscriptions = await stripe.subscriptions.list({
      customer: user.stripe_customer_id,
      status: 'active',
      limit: 1
    });

    if (subscriptions.data.length === 0) {
      const allSubs = await stripe.subscriptions.list({
        customer: user.stripe_customer_id,
        limit: 1
      });
      if (allSubs.data.length > 0) {
        const sub = allSubs.data[0];
        const plan = PLANS.find(p => stripePrices[p.id]?.priceId === sub.items.data[0]?.price?.id);
        return res.json({ subscription: sub, plan: plan || null, setupFeePaid: !!user.setup_fee_paid });
      }
      return res.json({ subscription: null, plan: null, setupFeePaid: !!user.setup_fee_paid });
    }

    const sub = subscriptions.data[0];
    const plan = PLANS.find(p => stripePrices[p.id]?.priceId === sub.items.data[0]?.price?.id);

    // Keep subscription_status in sync
    if (sub.status === 'active') {
      db.prepare('UPDATE users SET subscription_status = ?, subscription_plan = ? WHERE id = ?')
        .run('active', plan?.id || 'monthly', user.id);
    }

    res.json({ subscription: sub, plan: plan || null, setupFeePaid: !!user.setup_fee_paid });
  } catch (error) {
    console.error('Error fetching subscription:', error);
    res.status(500).json({ error: 'Failed to fetch subscription' });
  }
});

// Create checkout session
router.post('/create-checkout-session', async (req, res) => {
  try {
    const { planId } = req.body;
    const db = await getDb();
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);

    // Require setup fee before monthly subscription
    if (planId === 'monthly' && !user?.setup_fee_paid) {
      return res.status(400).json({ error: 'Please pay the setup fee first before subscribing.' });
    }

    const prices = await ensureStripeProducts();
    const priceData = prices[planId];

    if (!priceData) {
      return res.status(400).json({ error: 'Invalid plan' });
    }

    // Get or create Stripe customer
    let customerId = user.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.name || user.email,
        metadata: { user_id: user.id }
      });
      customerId = customer.id;
      db.prepare('UPDATE users SET stripe_customer_id = ? WHERE id = ?').run(customerId, user.id);
    }

    const baseUrl = process.env.RENDER_EXTERNAL_URL || process.env.WEBHOOK_BASE_URL || 'https://outboundcaller.ai';

    const plan = PLANS.find(p => p.id === planId);
    const mode = plan?.interval ? 'subscription' : 'payment';

    // Build line items
    const lineItems = [{ price: priceData.priceId, quantity: 1 }];

    // For monthly subscription, also add the metered appointment price
    if (planId === 'monthly' && prices['appointment_metered']) {
      lineItems.push({ price: prices['appointment_metered'].priceId });
    }

    const sessionConfig = {
      customer: customerId,
      payment_method_types: ['card'],
      line_items: lineItems,
      mode,
      success_url: `${baseUrl}/billing?success=true&plan=${planId}`,
      cancel_url: `${baseUrl}/billing?canceled=true`,
      metadata: { user_id: user.id, plan_id: planId }
    };

    // For one-time payments, track in payment intent metadata
    if (mode === 'payment') {
      sessionConfig.payment_intent_data = {
        metadata: { user_id: user.id, plan_id: planId }
      };
    }

    const session = await stripe.checkout.sessions.create(sessionConfig);

    res.json({ url: session.url });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

// Mark setup fee as paid (called after successful checkout redirect)
router.post('/confirm-setup', async (req, res) => {
  try {
    const db = await getDb();
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);

    if (!user?.stripe_customer_id) {
      return res.status(400).json({ error: 'No billing account found' });
    }

    // Verify payment in Stripe
    const sessions = await stripe.checkout.sessions.list({
      customer: user.stripe_customer_id,
      limit: 10
    });

    const setupSession = sessions.data.find(s =>
      s.metadata?.plan_id === 'setup' && s.payment_status === 'paid'
    );

    if (setupSession) {
      db.prepare('UPDATE users SET setup_fee_paid = 1 WHERE id = ?').run(user.id);
      return res.json({ setupFeePaid: true });
    }

    res.json({ setupFeePaid: false });
  } catch (error) {
    console.error('Error confirming setup:', error);
    res.status(500).json({ error: 'Failed to confirm setup payment' });
  }
});

// Create customer portal session (manage subscription)
router.post('/create-portal-session', async (req, res) => {
  try {
    const db = await getDb();
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);

    if (!user?.stripe_customer_id) {
      return res.status(400).json({ error: 'No billing account found' });
    }

    const baseUrl = process.env.RENDER_EXTERNAL_URL || process.env.WEBHOOK_BASE_URL || 'https://outboundcaller.ai';

    const session = await stripe.billingPortal.sessions.create({
      customer: user.stripe_customer_id,
      return_url: `${baseUrl}/billing`
    });

    res.json({ url: session.url });
  } catch (error) {
    console.error('Error creating portal session:', error);
    res.status(500).json({ error: 'Failed to create portal session' });
  }
});

// Get payment history
router.get('/invoices', async (req, res) => {
  try {
    const db = await getDb();
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);

    if (!user?.stripe_customer_id) {
      return res.json([]);
    }

    const invoices = await stripe.invoices.list({
      customer: user.stripe_customer_id,
      limit: 20
    });

    const formatted = invoices.data.map(inv => ({
      id: inv.id,
      date: new Date(inv.created * 1000).toLocaleDateString(),
      amount: (inv.amount_paid / 100).toFixed(2),
      status: inv.status,
      pdf: inv.invoice_pdf,
      plan: inv.lines?.data?.[0]?.description || 'Subscription'
    }));

    res.json(formatted);
  } catch (error) {
    console.error('Error fetching invoices:', error);
    res.status(500).json({ error: 'Failed to fetch invoices' });
  }
});

// Report appointment usage to Stripe (called when AI books an appointment)
export async function reportAppointmentUsage(userId) {
  try {
    const db = await getDb();
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);

    if (!user?.stripe_customer_id) {
      console.log('No Stripe customer for user, skipping appointment billing');
      return;
    }

    // Find the user's active subscription
    const subscriptions = await stripe.subscriptions.list({
      customer: user.stripe_customer_id,
      status: 'active',
      limit: 1
    });

    if (subscriptions.data.length === 0) {
      console.log('No active subscription, skipping appointment billing');
      return;
    }

    const sub = subscriptions.data[0];

    // Find the metered subscription item (appointment fee)
    const meteredItem = sub.items.data.find(item =>
      item.price.recurring?.usage_type === 'metered'
    );

    if (!meteredItem) {
      console.log('No metered item on subscription, skipping appointment billing');
      return;
    }

    // Report 1 appointment usage
    await stripe.subscriptionItems.createUsageRecord(meteredItem.id, {
      quantity: 1,
      timestamp: Math.floor(Date.now() / 1000),
      action: 'increment'
    });

    console.log(`Reported 1 appointment usage for user ${userId} (Stripe item: ${meteredItem.id})`);
  } catch (error) {
    console.error('Error reporting appointment usage to Stripe:', error.message);
  }
}

// Helper: find user ID from campaign (for webhook usage)
export async function findUserForBilling() {
  try {
    const db = await getDb();
    // Find the user with an active Stripe subscription
    const user = db.prepare(`
      SELECT id FROM users
      WHERE stripe_customer_id IS NOT NULL
      AND subscription_status != 'none'
      LIMIT 1
    `).get();

    // Fallback: any user with a Stripe customer ID
    if (!user) {
      const fallback = db.prepare(`
        SELECT id FROM users
        WHERE stripe_customer_id IS NOT NULL
        LIMIT 1
      `).get();
      return fallback?.id || null;
    }

    return user.id;
  } catch (error) {
    console.error('Error finding user for billing:', error);
    return null;
  }
}

export default router;
