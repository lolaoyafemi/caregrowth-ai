
export interface PaymentConfirmationRequest {
  session_id: string;
}

export interface PaymentConfirmationResponse {
  success: boolean;
  message?: string;
  total_credits?: number;
  error?: string;
}

export interface PaymentRecord {
  id: string;
  user_id: string | null;
  email: string;
  credits_granted: number;
  plan_name: string;
  stripe_session_id: string;
  status: string;
}

export interface UserProfile {
  id: string;
  user_id: string | null;
  email: string;
  credits: number | null;
  plan_name: string | null;
  business_name: string | null;
}
