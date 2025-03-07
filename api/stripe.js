const Stripe = require('stripe');

// Initialize Stripe
const stripe = new Stripe(process.env.NODE_ENV === 'production' 
  ? process.env.STRIPE_SECRET_KEY_LIVE 
  : process.env.STRIPE_SECRET_KEY_TEST
);

async function createCheckoutSession(req, res) {
  try {
    const baseUrl = process.env.CLIENT_URL || 
      (process.env.NODE_ENV === 'production' 
        ? 'https://www.retainvoice.com'
        : 'http://localhost:3000');

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: '4 Voice Pack',
              description: 'Unlock the ability to create 4 additional voice clones',
            },
            unit_amount: 499, // $4.99
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${baseUrl}/dashboard?payment=success`,
      cancel_url: `${baseUrl}/dashboard?payment=cancelled`,
    });

    res.json({ url: session.url });
  } catch (error) {
    console.error('Stripe error:', error);
    res.status(500).json({ 
      error: process.env.NODE_ENV === 'production' 
        ? 'Payment session creation failed' 
        : error.message 
    });
  }
}

module.exports = {
  createCheckoutSession
}; 