import { loadStripe, Stripe } from '@stripe/stripe-js';

let stripePromise: Promise<Stripe | null>;

export const getStripe = () => {
  if (!stripePromise) {
    // Use a public key for the frontend
    const STRIPE_PUBLISHABLE_KEY = 'pk_test_TYooMQauvdEDq54NiTphI7jx';
    stripePromise = loadStripe(STRIPE_PUBLISHABLE_KEY);
  }
  
  return stripePromise;
};