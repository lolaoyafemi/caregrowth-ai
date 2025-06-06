
import { StripeService } from './stripe-service.ts';
import { DatabaseService } from './database-service.ts';
import { PaymentConfirmationResponse } from './types.ts';
import { logStep } from './utils.ts';

export class PaymentProcessor {
  private stripeService: StripeService;
  private databaseService: DatabaseService;

  constructor() {
    this.stripeService = new StripeService();
    this.databaseService = new DatabaseService();
  }

  async processPaymentConfirmation(sessionId: string): Promise<PaymentConfirmationResponse> {
    try {
      logStep('Processing payment confirmation', { sessionId });

      // Retrieve and validate Stripe session
      const session = await this.stripeService.retrieveSession(sessionId);
      const customerEmail = this.stripeService.validatePayment(session);
      
      logStep('Processing payment for email', { customerEmail });

      // Get payment record
      const paymentRecord = await this.databaseService.getPaymentRecord(sessionId);

      // Calculate total credits
      const existingCredits = await this.databaseService.calculateTotalCredits(customerEmail);
      const totalCredits = existingCredits + paymentRecord.credits_granted;

      logStep('Calculated total credits', { 
        existing: existingCredits, 
        new: paymentRecord.credits_granted, 
        total: totalCredits 
      });

      // Update or create user profile
      const businessName = session.customer_details?.name || null;
      await this.databaseService.upsertUserProfile(customerEmail, paymentRecord, totalCredits, businessName);

      // Mark payment as completed
      await this.databaseService.markPaymentCompleted(paymentRecord.id);

      logStep('Payment confirmation completed successfully', { sessionId });

      return {
        success: true,
        message: 'Payment confirmed and credits added successfully',
        total_credits: totalCredits
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logStep('Payment processing error', { error: errorMessage });
      throw new Error(errorMessage);
    }
  }
}
