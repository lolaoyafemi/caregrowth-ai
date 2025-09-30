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

      // Validate session ID
      if (!sessionId || typeof sessionId !== 'string' || sessionId.trim() === '') {
        throw new Error('Invalid session ID provided');
      }

      // Retrieve and validate Stripe session
      const session = await this.stripeService.retrieveSession(sessionId);
      if (!session) {
        throw new Error('Session not found in Stripe');
      }

      const customerEmail = this.stripeService.validatePayment(session);
      if (!customerEmail) {
        throw new Error('Customer email not found in session');
      }
      
      logStep('Processing payment for email', { customerEmail });

      // First check if we have a payment record (either pending or completed)
      let paymentRecord;
      let paymentRecordExists = false;
      
      try {
        paymentRecord = await this.databaseService.getPaymentRecord(sessionId);
        paymentRecordExists = true;
        logStep('Found payment record', { 
          id: paymentRecord?.id, 
          status: paymentRecord?.status,
          credits: paymentRecord?.credits_granted 
        });
      } catch (error) {
        logStep('No payment record found, will handle via direct processing', { error: error instanceof Error ? error.message : 'Unknown error' });
        paymentRecordExists = false;
      }

      // If no payment record exists, do NOT allocate credits for subscriptions here (webhook handles it)
      if (!paymentRecordExists || !paymentRecord) {
        logStep('Processing payment without existing record');
        
        // Get current credits before any changes
        let currentCredits = 0;
        try {
          currentCredits = await this.databaseService.calculateTotalCredits(customerEmail);
        } catch (error) {
          logStep('Could not calculate existing credits, defaulting to 0', { error: error instanceof Error ? error.message : 'Unknown error' });
          currentCredits = 0;
        }
        
        // For subscription checkouts, avoid double-crediting; webhook handles allocation
        if ((session as any).mode === 'subscription') {
          logStep('Subscription detected; skipping direct credit allocation to avoid duplicates', { sessionMode: (session as any).mode });
          return {
            success: true,
            message: 'Payment confirmed via webhook',
            total_credits: currentCredits
          };
        }

        // Extract payment details from Stripe session
        const amountTotal = session.amount_total || 0;
        let creditsGranted = 0;
        let planName = 'Unknown';

        // Map amount to credits (amounts are in cents)
        if (amountTotal === 4900) { // $49 - Main subscription plan
          planName = 'CareGrowth Assistant Credits';
          creditsGranted = 3000;
        } else if (amountTotal === 100) { // $1
          planName = 'Starter';
          creditsGranted = 50;
        } else if (amountTotal === 200) { // $2
          planName = 'Professional';
          creditsGranted = 200;
        } else if (amountTotal === 300) { // $3
          planName = 'Enterprise';
          creditsGranted = 500;
        } else if (amountTotal > 0) {
          creditsGranted = Math.max(1, Math.floor(amountTotal / 2));
          planName = 'Custom';
        } else {
          throw new Error('Invalid payment amount in session');
        }

        logStep('Processing direct credit addition', { 
          customerEmail, 
          creditsGranted, 
          planName,
          amountTotal 
        });

        // Add credits directly for one-time payments
        try {
          await this.databaseService.addCreditsDirectly(
            customerEmail, 
            null, 
            creditsGranted, 
            planName
          );
        } catch (error) {
          logStep('Error adding credits directly', { error: error instanceof Error ? error.message : 'Unknown error' });
          throw new Error(`Failed to add credits: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
        
        const finalCredits = currentCredits + creditsGranted;
        
        return {
          success: true,
          message: 'Payment confirmed and credits added successfully',
          total_credits: finalCredits
        };
      }

      // If payment record exists and is already completed
      if (paymentRecord.status === 'completed') {
        let totalCredits = 0;
        try {
          totalCredits = await this.databaseService.calculateTotalCredits(customerEmail);
        } catch (error) {
          logStep('Error calculating total credits for completed payment', { error: error instanceof Error ? error.message : 'Unknown error' });
          // Don't throw here, just use 0 as fallback
          totalCredits = 0;
        }
        
        logStep('Payment already completed', { sessionId, totalCredits });
        
        return {
          success: true,
          message: 'Payment already confirmed',
          total_credits: totalCredits
        };
      }

      // Process pending payment record
      if (paymentRecord.status !== 'pending') {
        throw new Error(`Unexpected payment status: ${paymentRecord.status}`);
      }

      // Validate payment record data
      if (!paymentRecord.credits_granted || paymentRecord.credits_granted <= 0) {
        throw new Error('Invalid credits amount in payment record');
      }

      // Do NOT allocate again here to avoid duplicate credits.
      let currentCredits = 0;
      try {
        currentCredits = await this.databaseService.calculateTotalCredits(customerEmail);
      } catch (error) {
        logStep('Error calculating current credits, using 0', { error: error instanceof Error ? error.message : 'Unknown error' });
        currentCredits = 0;
      }

      logStep('Skipping credit allocation in confirm-payment for pending record; webhook should have allocated already', {
        paymentId: paymentRecord.id,
      });

      // Mark payment as completed
      try {
        await this.databaseService.markPaymentCompleted(paymentRecord.id);
      } catch (error) {
        logStep('Error marking payment as completed', { error: error instanceof Error ? error.message : 'Unknown error' });
        throw new Error(`Failed to mark payment as completed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }

      logStep('Payment confirmation completed successfully', { sessionId, totalCredits: currentCredits });

      return {
        success: true,
        message: 'Payment confirmed',
        total_credits: currentCredits
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      const errorStack = error instanceof Error ? error.stack : undefined;
      
      logStep('Payment processing error', { 
        error: errorMessage, 
        stack: errorStack,
        sessionId 
      });
      
      // Instead of throwing, return an error response
      return {
        success: false,
        message: `Payment verification failed: ${errorMessage}`,
        error: errorMessage
      };
    }
  }
}




// import { StripeService } from './stripe-service.ts';
// import { DatabaseService } from './database-service.ts';
// import { PaymentConfirmationResponse } from './types.ts';
// import { logStep } from './utils.ts';

// export class PaymentProcessor {
//   private stripeService: StripeService;
//   private databaseService: DatabaseService;

//   constructor() {
//     this.stripeService = new StripeService();
//     this.databaseService = new DatabaseService();
//   }

//   async processPaymentConfirmation(sessionId: string): Promise<PaymentConfirmationResponse> {
//     try {
//       logStep('Processing payment confirmation', { sessionId });

//       // Retrieve and validate Stripe session
//       const session = await this.stripeService.retrieveSession(sessionId);
//       const customerEmail = this.stripeService.validatePayment(session);
      
//       logStep('Processing payment for email', { customerEmail });

//       // First check if we have a payment record (either pending or completed)
//       let paymentRecord;
//       try {
//         paymentRecord = await this.databaseService.getPaymentRecord(sessionId);
//         logStep('Found payment record', { id: paymentRecord.id, status: paymentRecord.status });
//       } catch (error) {
//         // If no payment record exists, check if webhook already processed this
//         logStep('No payment record found, checking if webhook processed payment');
        
//         // Get current credits before any changes
//         const currentCredits = await this.databaseService.calculateTotalCredits(customerEmail);
        
//         // Check if this session was already processed by looking at Stripe
//         const amountTotal = session.amount_total || 0;
//         let creditsGranted = 0;
//         let planName = 'Unknown';

//         // Map amount to credits (amounts are in cents)
//         if (amountTotal === 100) { // $1
//           planName = 'Starter';
//           creditsGranted = 50;
//         } else if (amountTotal === 200) { // $2
//           planName = 'Professional';
//           creditsGranted = 200;
//         } else if (amountTotal === 300) { // $3
//           planName = 'Enterprise';
//           creditsGranted = 500;
//         } else {
//           // Default mapping based on amount - handle any amount properly
//           creditsGranted = Math.max(1, Math.floor(amountTotal / 2));
//           planName = 'Custom';
//         }

//         logStep('No payment record found, adding credits directly', { 
//           customerEmail, 
//           creditsGranted, 
//           planName,
//           amountTotal 
//         });

//         // Add credits directly since webhook may have missed this
//         await this.databaseService.addCreditsDirectly(customerEmail, null, creditsGranted, planName);
        
//         return {
//           success: true,
//           message: 'Payment confirmed and credits added successfully',
//           total_credits: currentCredits + creditsGranted
//         };
//       }

//       // If payment is already completed, just return current status
//       if (paymentRecord.status === 'completed') {
//         const totalCredits = await this.databaseService.calculateTotalCredits(customerEmail);
//         logStep('Payment already completed', { sessionId, totalCredits });
        
//         return {
//           success: true,
//           message: 'Payment already confirmed',
//           total_credits: totalCredits
//         };
//       }

//       // Calculate total credits including the current payment
//       const existingCredits = await this.databaseService.calculateTotalCredits(customerEmail);
//       const totalCredits = existingCredits + paymentRecord.credits_granted;

//       logStep('Calculated total credits', { 
//         existing: existingCredits, 
//         new: paymentRecord.credits_granted, 
//         total: totalCredits 
//       });

//       // Update or create user profile
//       const businessName = session.customer_details?.name || null;
//       await this.databaseService.upsertUserProfile(customerEmail, paymentRecord, totalCredits, businessName);

//       // Mark payment as completed
//       await this.databaseService.markPaymentCompleted(paymentRecord.id);

//       logStep('Payment confirmation completed successfully', { sessionId });

//       return {
//         success: true,
//         message: 'Payment confirmed and credits added successfully',
//         total_credits: totalCredits
//       };

//     } catch (error) {
//       const errorMessage = error instanceof Error ? error.message : 'Unknown error';
//       logStep('Payment processing error', { error: errorMessage });
//       throw new Error(errorMessage);
//     }
//   }
// }
