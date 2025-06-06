
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.5';
import { PaymentRecord, UserProfile } from './types.ts';
import { logStep } from './utils.ts';

export class DatabaseService {
  private supabase;

  constructor() {
    this.supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
  }

  async getPaymentRecord(sessionId: string): Promise<PaymentRecord> {
    logStep('Finding payment record', { sessionId });
    
    const { data: paymentRecord, error: paymentError } = await this.supabase
      .from('payments')
      .select('*')
      .eq('stripe_session_id', sessionId)
      .eq('status', 'pending')
      .single();

    if (paymentError || !paymentRecord) {
      logStep('Payment record not found', { error: paymentError });
      throw new Error('Payment record not found');
    }

    logStep('Found payment record', { id: paymentRecord.id, credits: paymentRecord.credits_granted });
    return paymentRecord;
  }

  async calculateTotalCredits(email: string): Promise<number> {
    logStep('Calculating total credits for email', { email });
    
    const { data: allPayments, error: paymentsError } = await this.supabase
      .from('payments')
      .select('credits_granted')
      .eq('email', email)
      .eq('status', 'completed');

    if (paymentsError) {
      logStep('Error querying payments', { error: paymentsError });
      throw new Error('Error querying payments');
    }

    const totalCredits = allPayments?.reduce((sum, payment) => sum + payment.credits_granted, 0) || 0;
    logStep('Calculated total credits from all completed payments', { totalCredits });
    return totalCredits;
  }

  async upsertUserProfile(email: string, paymentRecord: PaymentRecord, totalCredits: number, businessName?: string): Promise<string> {
    logStep('Finding or creating user profile', { email });
    
    // First try to find existing profile by email
    let { data: existingProfile, error: profileQueryError } = await this.supabase
      .from('user_profiles')
      .select('*')
      .eq('email', email)
      .maybeSingle();

    if (profileQueryError) {
      logStep('Error querying user profile by email', { error: profileQueryError });
      throw new Error('Error querying user profile');
    }

    let profileId = existingProfile?.id;

    if (!existingProfile) {
      // Try to find by user_id if we have one
      if (paymentRecord.user_id) {
        const { data: profileByUserId, error: userIdQueryError } = await this.supabase
          .from('user_profiles')
          .select('*')
          .eq('user_id', paymentRecord.user_id)
          .maybeSingle();

        if (userIdQueryError) {
          logStep('Error querying user profile by user_id', { error: userIdQueryError });
        } else if (profileByUserId) {
          existingProfile = profileByUserId;
          profileId = profileByUserId.id;
          logStep('Found existing profile by user_id', { profileId });
        }
      }
    }

    if (!existingProfile) {
      // Create new profile
      const { data: newProfile, error: createProfileError } = await this.supabase
        .from('user_profiles')
        .insert({
          user_id: paymentRecord.user_id,
          email: email,
          credits: totalCredits,
          plan_name: paymentRecord.plan_name,
          business_name: businessName || null
        })
        .select()
        .single();

      if (createProfileError || !newProfile) {
        logStep('Error creating user profile', { error: createProfileError });
        throw new Error('Error creating user profile');
      }

      profileId = newProfile.id;
      logStep('Created new user profile', { profileId, totalCredits });
    } else {
      // Update existing profile
      const updateData: any = {
        credits: totalCredits,
        plan_name: paymentRecord.plan_name
      };

      // Only update user_id if we have one and it's not already set
      if (paymentRecord.user_id && !existingProfile.user_id) {
        updateData.user_id = paymentRecord.user_id;
      }

      // Only update email if it's different
      if (existingProfile.email !== email) {
        updateData.email = email;
      }

      // Only update business_name if provided
      if (businessName) {
        updateData.business_name = businessName;
      }

      const { error: updateProfileError } = await this.supabase
        .from('user_profiles')
        .update(updateData)
        .eq('id', existingProfile.id);

      if (updateProfileError) {
        logStep('Error updating user profile', { error: updateProfileError });
        throw new Error('Error updating user profile');
      }

      logStep('Updated existing user profile', { profileId, totalCredits });
    }

    return profileId;
  }

  async markPaymentCompleted(paymentId: string): Promise<void> {
    logStep('Updating payment status to completed', { paymentId });
    
    const { error: updatePaymentError } = await this.supabase
      .from('payments')
      .update({
        status: 'completed',
        updated_at: new Date().toISOString()
      })
      .eq('id', paymentId);

    if (updatePaymentError) {
      logStep('Error updating payment status', { error: updatePaymentError });
      throw new Error('Error updating payment status');
    }

    logStep('Payment status updated successfully');
  }

  async addCreditsDirectly(email: string, userId: string | null, credits: number, planName: string): Promise<void> {
    logStep('Adding credits directly', { email, userId, credits, planName });

    // First, find or create user profile
    let { data: existingProfile, error: profileQueryError } = await this.supabase
      .from('user_profiles')
      .select('*')
      .eq('email', email)
      .maybeSingle();

    if (profileQueryError) {
      logStep('Error querying user profile', { error: profileQueryError });
      throw new Error('Error querying user profile');
    }

    const currentCredits = existingProfile?.credits || 0;
    const newTotalCredits = currentCredits + credits;

    if (!existingProfile) {
      // Create new profile
      const { error: createError } = await this.supabase
        .from('user_profiles')
        .insert({
          user_id: userId,
          email: email,
          credits: newTotalCredits,
          plan_name: planName
        });

      if (createError) {
        logStep('Error creating user profile', { error: createError });
        throw new Error('Error creating user profile');
      }

      logStep('Created new user profile with credits', { email, credits: newTotalCredits });
    } else {
      // Update existing profile
      const { error: updateError } = await this.supabase
        .from('user_profiles')
        .update({
          credits: newTotalCredits,
          plan_name: planName,
          user_id: userId || existingProfile.user_id
        })
        .eq('id', existingProfile.id);

      if (updateError) {
        logStep('Error updating user profile', { error: updateError });
        throw new Error('Error updating user profile');
      }

      logStep('Updated user profile with credits', { email, credits: newTotalCredits });
    }
  }
}
