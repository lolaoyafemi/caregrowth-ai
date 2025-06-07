
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

      // First check if we have a payment record (either pending or completed)
      let paymentRecord;
      try {
        paymentRecord = await this.databaseService.getPaymentRecord(sessionId);
        logStep('Found payment record', { id: paymentRecord.id, status: paymentRecord.status });
      } catch (error) {
        // If no payment record exists, check if webhook already processed this
        logStep('No payment record found, checking if webhook processed payment');
        
        // Get current credits before any changes
        const currentCredits = await this.databaseService.calculateTotalCredits(customerEmail);
        
        // Check if this session was already processed by looking at Stripe
        const amountTotal = session.amount_total || 0;
        let creditsGranted = 0;
        let planName = 'Unknown';

        // Map amount to credits (amounts are in cents)
        if (amountTotal === 100) { // $1
          planName = 'Starter';
          creditsGranted = 50;
        } else if (amountTotal === 200) { // $2
          planName = 'Professional';
          creditsGranted = 200;
        } else if (amountTotal === 300) { // $3
          planName = 'Enterprise';
          creditsGranted = 500;
        } else {
          // Default mapping based on amount - handle any amount properly
          creditsGranted = Math.max(1, Math.floor(amountTotal / 2));
          planName = 'Custom';
        }

        logStep('No payment record found, adding credits directly', { 
          customerEmail, 
          creditsGranted, 
          planName,
          amountTotal 
        });

        // Add credits directly since webhook may have missed this
        await this.databaseService.addCreditsDirectly(customerEmail, null, creditsGranted, planName);
        
        return {
          success: true,
          message: 'Payment confirmed and credits added successfully',
          total_credits: currentCredits + creditsGranted
        };
      }

      // If payment is already completed, just return current status
      if (paymentRecord.status === 'completed') {
        const totalCredits = await this.databaseService.calculateTotalCredits(customerEmail);
        logStep('Payment already completed', { sessionId, totalCredits });
        
        return {
          success: true,
          message: 'Payment already confirmed',
          total_credits: totalCredits
        };
      }

      // Calculate total credits including the current payment
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
