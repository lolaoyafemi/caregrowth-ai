
import Stripe from 'https://esm.sh/stripe@12.0.0';
import { logStep } from './utils.ts';

export class StripeService {
  private stripe: Stripe;

  constructor() {
    this.stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
      apiVersion: '2022-11-15'
    });
  }

  async retrieveSession(sessionId: string) {
    logStep('Retrieving Stripe session', { sessionId });
    const session = await this.stripe.checkout.sessions.retrieve(sessionId);
    logStep('Stripe session retrieved', { id: session.id, paymentStatus: session.payment_status });
    return session;
  }

  validatePayment(session: Stripe.Checkout.Session) {
    if (session.payment_status !== 'paid') {
      throw new Error('Payment not completed');
    }

    const customerEmail = session.customer_email || session.customer_details?.email;
    if (!customerEmail) {
      throw new Error('No customer email found');
    }

    return customerEmail;
  }
}
