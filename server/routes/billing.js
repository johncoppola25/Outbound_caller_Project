import express from 'express';
import Stripe from 'stripe';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/init.js';

// Broadcast function set by index.js to avoid circular import
let _broadcast = () => {};
export function setBroadcast(fn) { _broadcast = fn; }

const router = express.Router();

const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;

// Plan definitions
const PLANS = [
  {
    id: 'setup',
    name: 'Setup Fee',
    price: 50000, // cents = $500
    priceDisplay: '$500',
    interval: null, // one-time
    oneTime: true,
    features: ['Full platform setup', 'Custom AI script configuration', 'Campaign creation', 'Contact import assistance', 'Training & onboarding']
  },
  {
    id: 'monthly',
    name: 'Monthly Platform Fee',
    price: 70000, // cents = $700
    priceDisplay: '$700',
    interval: 'month',
    popular: true,
    features: ['Full access to all platform features', 'AI-powered outbound calls', 'Call recording & transcripts', 'Voicemail detection', 'Full analytics dashboard', 'Priority support', 'Custom AI scripts', 'Multiple campaigns', 'Usage: $0.17 per calling minute']
  }
];

// Per-user pricing overrides (by username)
const USER_PRICING = {
  'Dozer19': {
    monthly: { price: 15000, priceDisplay: '$150' } // $150/month for Kenny
  }
};

// Stripe price IDs cache
let stripePrices = {};
let userStripePrices = {}; // Cache for user-specific prices

async function ensureStripeProducts() {
  if (Object.keys(stripePrices).length > 0) return stripePrices;

  try {
    const existingProducts = await stripe.products.list({ limit: 100 });

    for (const plan of PLANS) {
      const productName = `OutReach ${plan.name}`;
      // Match by metadata plan_id first, then by name
      let product = existingProducts.data.find(p => p.metadata?.plan_id === plan.id && p.active)
        || existingProducts.data.find(p => p.name === productName && p.active);

      const correctDescription = plan.oneTime
        ? 'One-time platform setup and onboarding'
        : 'Monthly AI calling platform subscription';

      if (!product) {
        product = await stripe.products.create({
          name: productName,
          description: correctDescription,
          metadata: { plan_id: plan.id }
        });
        console.log(`Created Stripe product: ${productName}`);
      } else if (product.description !== correctDescription || product.name !== productName) {
        // Keep product name and description in sync
        product = await stripe.products.update(product.id, { name: productName, description: correctDescription });
        console.log(`Updated Stripe product: ${productName}`);
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

    console.log('Stripe products ready:', Object.keys(stripePrices));
    return stripePrices;
  } catch (error) {
    console.error('Error setting up Stripe products:', error.message);
    throw error;
  }
}

// Ensure user-specific Stripe price exists (for custom pricing)
async function ensureUserPrice(userName, planId) {
  const cacheKey = `${userName}_${planId}`;
  if (userStripePrices[cacheKey]) return userStripePrices[cacheKey];

  const override = USER_PRICING[userName]?.[planId];
  if (!override) return null;

  await ensureStripeProducts();
  const productId = stripePrices[planId]?.productId;
  if (!productId) return null;

  try {
    // Check if price already exists
    const existingPrices = await stripe.prices.list({ product: productId, active: true, limit: 20 });
    const plan = PLANS.find(p => p.id === planId);
    let price;
    if (plan?.interval) {
      price = existingPrices.data.find(p => p.unit_amount === override.price && p.recurring?.interval === plan.interval);
    } else {
      price = existingPrices.data.find(p => p.unit_amount === override.price && !p.recurring);
    }

    if (!price) {
      const priceData = {
        product: productId,
        unit_amount: override.price,
        currency: 'usd',
        metadata: { plan_id: planId, user_override: userName }
      };
      if (plan?.interval) priceData.recurring = { interval: plan.interval };
      price = await stripe.prices.create(priceData);
      console.log(`Created custom Stripe price for ${userName}: ${override.priceDisplay}/${plan?.interval || 'one-time'}`);
    }

    userStripePrices[cacheKey] = { priceId: price.id, productId };
    return userStripePrices[cacheKey];
  } catch (error) {
    console.error(`Error creating user price for ${userName}:`, error.message);
    return null;
  }
}

// Get available plans (with per-user pricing overrides)
router.get('/plans', async (req, res) => {
  try {
    const prices = await ensureStripeProducts();
    const db = await getDb();
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.userId);
    const setupFeePaid = !!user?.setup_fee_paid;
    const userOverrides = USER_PRICING[user?.name] || {};

    const plans = await Promise.all(PLANS.map(async (plan) => {
      const override = userOverrides[plan.id];
      if (override) {
        const userPrice = await ensureUserPrice(user.name, plan.id);
        return {
          ...plan,
          price: override.price,
          priceDisplay: override.priceDisplay,
          stripePriceId: userPrice?.priceId || prices[plan.id]?.priceId || null
        };
      }
      return {
        ...plan,
        stripePriceId: prices[plan.id]?.priceId || null
      };
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
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.userId);

    // Server-side bypass check: admin role or free accounts (checked from DB, not JWT)
    const bypass = user?.role === 'admin' || user?.email === 'johnc@apbsecurity.com' || user?.email === 'john.coppola25@gmail.com';

    if (!user?.stripe_customer_id) {
      return res.json({ subscription: null, plan: null, setupFeePaid: !!user?.setup_fee_paid, bypass });
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

    await ensureStripeProducts();

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
        return res.json({ subscription: sub, plan: plan || null, setupFeePaid: !!user.setup_fee_paid, bypass });
      }
      return res.json({ subscription: null, plan: null, setupFeePaid: !!user.setup_fee_paid, bypass });
    }

    const sub = subscriptions.data[0];
    const plan = PLANS.find(p => stripePrices[p.id]?.priceId === sub.items.data[0]?.price?.id);

    // Keep subscription_status in sync
    if (sub.status === 'active') {
      db.prepare('UPDATE users SET subscription_status = ?, subscription_plan = ? WHERE id = ?')
        .run('active', plan?.id || 'monthly', user.id);
    }

    res.json({ subscription: sub, plan: plan || null, setupFeePaid: !!user.setup_fee_paid, bypass });
  } catch (error) {
    console.error('Error fetching subscription:', error);
    res.status(500).json({ error: 'Failed to fetch subscription' });
  }
});

// Cancel subscription
router.post('/cancel-subscription', async (req, res) => {
  try {
    const db = await getDb();
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.userId);

    if (!user?.stripe_customer_id || !stripe) {
      return res.status(400).json({ error: 'No active subscription found.' });
    }

    // Find active subscription
    const subscriptions = await stripe.subscriptions.list({
      customer: user.stripe_customer_id,
      status: 'active',
      limit: 1
    });

    if (subscriptions.data.length === 0) {
      return res.status(400).json({ error: 'No active subscription found.' });
    }

    // Cancel at end of billing period
    const sub = await stripe.subscriptions.update(subscriptions.data[0].id, {
      cancel_at_period_end: true
    });

    db.prepare('UPDATE users SET subscription_status = ? WHERE id = ?').run('canceling', user.id);

    res.json({
      success: true,
      message: 'Subscription will be canceled at the end of the current billing period.',
      cancelAt: sub.current_period_end
    });
  } catch (error) {
    console.error('Error canceling subscription:', error);
    res.status(500).json({ error: 'Failed to cancel subscription.' });
  }
});

// Create checkout session
router.post('/create-checkout-session', async (req, res) => {
  try {
    const { planId } = req.body;
    const db = await getDb();
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.userId);

    // Require setup fee before monthly subscription
    if (planId === 'monthly' && !user?.setup_fee_paid) {
      return res.status(400).json({ error: 'Please pay the setup fee first before subscribing.' });
    }

    const prices = await ensureStripeProducts();
    // Check for user-specific pricing
    const userOverride = USER_PRICING[user?.name]?.[planId];
    let priceData;
    if (userOverride) {
      priceData = await ensureUserPrice(user.name, planId);
    }
    if (!priceData) {
      priceData = prices[planId];
    }

    if (!priceData) {
      return res.status(400).json({ error: 'Invalid plan' });
    }

    // Get or create Stripe customer (handle test->live key switch)
    let customerId = user.stripe_customer_id;
    if (customerId) {
      try {
        await stripe.customers.retrieve(customerId);
      } catch (e) {
        console.log('Stripe customer not found (likely test mode ID), creating new one');
        customerId = null;
      }
    }
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

    const sessionConfig = {
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [{ price: priceData.priceId, quantity: 1 }],
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
    res.status(500).json({ error: 'Failed to create checkout session: ' + (error.message || '') });
  }
});

// Mark setup fee as paid (called after successful checkout redirect)
router.post('/confirm-setup', async (req, res) => {
  try {
    const db = await getDb();
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.userId);

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
      // Record payment locally
      const existing = db.prepare('SELECT id FROM payments WHERE user_id = ? AND type = ?').get(user.id, 'setup_fee');
      if (!existing) {
        db.prepare('INSERT INTO payments (id, user_id, type, amount, stripe_payment_id, status, description) VALUES (?, ?, ?, ?, ?, ?, ?)')
          .run(uuidv4(), user.id, 'setup_fee', 500, setupSession.payment_intent || setupSession.id, 'succeeded', 'Setup fee - platform onboarding');
      }
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
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.userId);

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
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.userId);

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

// Get calling balance + auto-fund settings
router.get('/balance', async (req, res) => {
  try {
    const db = await getDb();
    const user = db.prepare('SELECT calling_balance, auto_fund_enabled, auto_fund_amount, auto_fund_threshold FROM users WHERE id = ?').get(req.user.userId);
    res.json({
      balance: user?.calling_balance || 0,
      autoFund: {
        enabled: !!user?.auto_fund_enabled,
        amount: user?.auto_fund_amount || 50,
        threshold: user?.auto_fund_threshold || 20
      }
    });
  } catch (error) {
    console.error('Error fetching balance:', error);
    res.status(500).json({ error: 'Failed to fetch balance' });
  }
});

// Update auto-fund settings
router.post('/auto-fund', async (req, res) => {
  try {
    const { enabled, amount, threshold } = req.body;
    const validAmounts = [25, 50, 100, 200];
    const validThresholds = [10, 20, 30, 50];

    if (amount !== undefined && !validAmounts.includes(amount)) {
      return res.status(400).json({ error: 'Invalid amount.' });
    }
    if (threshold !== undefined && !validThresholds.includes(threshold)) {
      return res.status(400).json({ error: 'Invalid threshold.' });
    }

    const db = await getDb();
    db.prepare('UPDATE users SET auto_fund_enabled = ?, auto_fund_amount = ?, auto_fund_threshold = ? WHERE id = ?')
      .run(enabled ? 1 : 0, amount || 50, threshold || 20, req.user.userId);

    res.json({ success: true });
  } catch (error) {
    console.error('Error updating auto-fund:', error);
    res.status(500).json({ error: 'Failed to update auto-fund settings' });
  }
});

// Add funds - create Stripe checkout
const FUND_AMOUNTS = [25, 50, 100, 200];

router.post('/add-funds', async (req, res) => {
  try {
    const { amount } = req.body;
    if (!FUND_AMOUNTS.includes(amount)) {
      return res.status(400).json({ error: 'Invalid amount. Choose $25, $50, $100, or $200.' });
    }

    const db = await getDb();
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.userId);

    // Get or create Stripe customer (handle test->live key switch)
    let customerId = user.stripe_customer_id;
    if (customerId) {
      try {
        await stripe.customers.retrieve(customerId);
      } catch (e) {
        customerId = null;
      }
    }
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

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: { name: `Add $${amount} Calling Credits` },
          unit_amount: amount * 100,
        },
        quantity: 1
      }],
      mode: 'payment',
      success_url: `${baseUrl}/dashboard?funds_added=${amount}`,
      cancel_url: `${baseUrl}/dashboard?funds_canceled=true`,
      metadata: { user_id: user.id, type: 'add_funds', amount: String(amount) },
      payment_intent_data: {
        metadata: { user_id: user.id, type: 'add_funds', amount: String(amount) }
      }
    });

    res.json({ url: session.url });
  } catch (error) {
    console.error('Error creating add-funds session:', error);
    res.status(500).json({ error: 'Failed to create payment session' });
  }
});

// Confirm funds added (called after successful redirect)
router.post('/confirm-funds', async (req, res) => {
  try {
    const { amount } = req.body;
    const db = await getDb();
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.userId);

    if (!user?.stripe_customer_id) {
      return res.status(400).json({ error: 'No billing account found' });
    }

    // Verify payment in Stripe
    const sessions = await stripe.checkout.sessions.list({
      customer: user.stripe_customer_id,
      limit: 5
    });

    const fundSession = sessions.data.find(s =>
      s.metadata?.type === 'add_funds' &&
      s.metadata?.amount === String(amount) &&
      s.payment_status === 'paid'
    );

    if (fundSession) {
      // Check if already credited (prevent double-credit)
      const alreadyCredited = fundSession.metadata?.credited === 'true';
      if (!alreadyCredited) {
        const currentBalance = user.calling_balance || 0;
        db.prepare('UPDATE users SET calling_balance = ? WHERE id = ?').run(currentBalance + Number(amount), user.id);

        // Record payment locally
        db.prepare('INSERT INTO payments (id, user_id, type, amount, stripe_payment_id, status, description) VALUES (?, ?, ?, ?, ?, ?, ?)')
          .run(uuidv4(), user.id, 'add_funds', Number(amount), fundSession.payment_intent || fundSession.id, 'succeeded', `Added $${amount} calling credits`);

        // Mark session as credited
        await stripe.checkout.sessions.update(fundSession.id, {
          metadata: { ...fundSession.metadata, credited: 'true' }
        });

        return res.json({ balance: currentBalance + Number(amount), added: true });
      }
      // Already credited
      const updatedUser = db.prepare('SELECT calling_balance FROM users WHERE id = ?').get(user.id);
      return res.json({ balance: updatedUser?.calling_balance || 0, added: false });
    }

    res.json({ balance: user.calling_balance || 0, added: false });
  } catch (error) {
    console.error('Error confirming funds:', error);
    res.status(500).json({ error: 'Failed to confirm payment' });
  }
});

// Deduct calling balance after a call (called from webhooks)
export async function deductCallCost(userId, durationSeconds) {
  try {
    const db = await getDb();
    const minutes = Math.ceil(durationSeconds / 60);
    const cost = minutes * 0.17; // $0.17 per minute

    const user = db.prepare('SELECT calling_balance, auto_fund_enabled, auto_fund_amount, auto_fund_threshold, stripe_customer_id FROM users WHERE id = ?').get(userId);
    const newBalance = Math.max(0, (user?.calling_balance || 0) - cost);
    db.prepare('UPDATE users SET calling_balance = ? WHERE id = ?').run(newBalance, userId);

    console.log(`Deducted $${cost.toFixed(2)} (${minutes}min) from user ${userId}. Balance: $${newBalance.toFixed(2)}`);

    // Alert user if balance dropped below $20
    if (newBalance < 20) {
      _broadcast({
        type: 'balance_low',
        userId,
        balance: newBalance,
        message: newBalance < 1
          ? 'Your calling balance is empty! Add funds to continue making calls.'
          : `Your calling balance is low ($${newBalance.toFixed(2)}). Add funds to avoid interruptions.`
      });
    }

    // Auto-fund: if balance dropped below threshold, charge saved payment method
    if (user?.auto_fund_enabled && stripe && user?.stripe_customer_id && newBalance < (user.auto_fund_threshold || 20)) {
      try {
        const amount = user.auto_fund_amount || 50;
        // Get customer's default payment method
        const customer = await stripe.customers.retrieve(user.stripe_customer_id);
        const paymentMethod = customer.invoice_settings?.default_payment_method || customer.default_source;

        if (paymentMethod) {
          const paymentIntent = await stripe.paymentIntents.create({
            amount: amount * 100,
            currency: 'usd',
            customer: user.stripe_customer_id,
            payment_method: paymentMethod,
            off_session: true,
            confirm: true,
            description: `Auto-fund: $${amount} calling credits`,
            metadata: { user_id: userId, type: 'auto_fund' }
          });

          if (paymentIntent.status === 'succeeded') {
            const updatedBalance = newBalance + amount;
            db.prepare('UPDATE users SET calling_balance = ? WHERE id = ?').run(updatedBalance, userId);
            // Record payment locally
            db.prepare('INSERT INTO payments (id, user_id, type, amount, stripe_payment_id, status, description) VALUES (?, ?, ?, ?, ?, ?, ?)')
              .run(uuidv4(), userId, 'auto_fund', amount, paymentIntent.id, 'succeeded', `Auto-fund: $${amount} calling credits`);
            console.log(`Auto-funded $${amount} for user ${userId}. New balance: $${updatedBalance.toFixed(2)}`);
          }
        } else {
          console.log(`Auto-fund: No saved payment method for user ${userId}`);
        }
      } catch (autoFundErr) {
        console.error('Auto-fund failed:', autoFundErr.message);
      }
    }

    return { cost, newBalance };
  } catch (error) {
    console.error('Error deducting call cost:', error.message);
    return null;
  }
}

// Helper: find user ID for billing (for webhook usage)
export async function findUserForBilling() {
  try {
    const db = await getDb();
    // Find the user with an active Stripe subscription
    const user = db.prepare(`
      SELECT id FROM users
      WHERE stripe_customer_id IS NOT NULL
      LIMIT 1
    `).get();

    return user?.id || null;
  } catch (error) {
    console.error('Error finding user for billing:', error);
    return null;
  }
}

export default router;
