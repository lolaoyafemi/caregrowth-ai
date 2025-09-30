import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Lock, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

// IMPORTANT: Use your actual publishable key that matches your secret key
// Get both keys from the same Stripe account: https://dashboard.stripe.com/apikeys
const stripePromise = loadStripe('pk_live_tOHra2qE5gWVHJ7NmYaojGdC');

interface EmbeddedPaymentFormProps {
  plan: {
    id: string;
    name: string;
    price: number;
    credits: number;
    features: string[];
  };
  onSuccess: () => void;
  onCancel: () => void;
}

const PaymentForm: React.FC<EmbeddedPaymentFormProps> = ({ plan, onSuccess, onCancel }) => {
  const stripe = useStripe();
  const elements = useElements();
  const { user, session } = useAuth();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(false);
  const [clientSecret, setClientSecret] = useState<string>('');
  const [paymentIntentId, setPaymentIntentId] = useState<string>('');
  const [couponCode, setCouponCode] = useState<string>('');
  const [couponError, setCouponError] = useState<string>('');
  const [discountAmount, setDiscountAmount] = useState<number>(0);

  useEffect(() => {
    createPaymentIntent();
  }, []);

  const createPaymentIntent = async () => {
    if (!session?.access_token) {
      console.error('No session token available');
      toast({
        title: "Authentication Error",
        description: "Please log in to continue with your subscription.",
        variant: "destructive"
      });
      return;
    }

    try {
      console.log('Creating payment intent for plan:', plan);
      
      const { data, error } = await supabase.functions.invoke('create-payment-intent', {
        body: {
          plan: plan.id,
          planName: plan.name,
          amount: plan.price,
          credits: plan.credits,
          couponCode: couponCode.trim() || undefined
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        }
      });

      if (error) {
        console.error('Supabase function error:', error);
        throw error;
      }

      // Check if the response contains an error/warning about coupon
      if (data?.error && !data?.clientSecret) {
        if (data.warning) {
          // Show coupon warning but allow payment to proceed
          setCouponError(data.error);
          toast({
            title: "Coupon Notice",
            description: data.error,
            variant: "default"
          });
          // Clear coupon code and retry without it
          setCouponCode('');
          // Retry payment intent creation without coupon
          const retryResponse = await supabase.functions.invoke('create-payment-intent', {
            body: {
              plan: plan.id,
              planName: plan.name,
              amount: plan.price,
              credits: plan.credits
            },
            headers: {
              Authorization: `Bearer ${session.access_token}`,
            }
          });
          
          if (retryResponse.error || !retryResponse.data?.clientSecret) {
            throw new Error('Failed to create payment intent without coupon');
          }
          
          setClientSecret(retryResponse.data.clientSecret);
          setPaymentIntentId(retryResponse.data.paymentIntentId);
          setDiscountAmount(0);
          return;
        } else {
          // Handle other coupon errors
          setCouponError(data.error);
          return;
        }
      }

      if (!data?.clientSecret) {
        throw new Error('No client secret received from server');
      }

      console.log('Payment intent created successfully');
      setClientSecret(data.clientSecret);
      setPaymentIntentId(data.paymentIntentId);
      
      // Handle coupon discount info
      if (data.discountAmount) {
        setDiscountAmount(data.discountAmount);
        setCouponError('');
      } else {
        setDiscountAmount(0);
      }
    } catch (error) {
      console.error('Error creating payment intent:', error);
      
      // Handle coupon-specific errors from response data
      if (error?.message?.includes('coupon') || error?.message?.includes('Coupon')) {
        setCouponError(error.message);
        setDiscountAmount(0);
      } else {
        toast({
          title: "Setup Error",
          description: `Failed to initialize payment: ${error.message || 'Please try again.'}`,
          variant: "destructive"
        });
      }
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements || !clientSecret) {
      console.error('Stripe not loaded or missing client secret');
      return;
    }

    if (!session?.access_token) {
      toast({
        title: "Authentication Error",
        description: "Please log in to continue.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      const cardElement = elements.getElement(CardElement);
      if (!cardElement) {
        throw new Error('Card element not found');
      }

      console.log('Confirming payment with client secret:', clientSecret.substring(0, 20) + '...');

      // Confirm the payment using Stripe's client-side library
      const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: cardElement,
          billing_details: {
            email: user?.email,
          },
        },
      });

      if (error) {
        console.error('Payment confirmation failed:', error);
        throw new Error(error.message || 'Payment failed');
      }

      if (paymentIntent.status !== 'succeeded') {
        throw new Error(`Payment status: ${paymentIntent.status}`);
      }

      console.log('Payment succeeded, confirming subscription...');

      // Confirm subscription setup
      const { data, error: subscriptionError } = await supabase.functions.invoke('confirm-subscription', {
        body: {
          paymentIntentId: paymentIntent.id
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        }
      });

      if (subscriptionError) {
        console.error('Subscription confirmation error:', subscriptionError);
        throw new Error(subscriptionError.message || 'Subscription setup failed');
      }

      console.log('Subscription confirmed successfully:', data);

      toast({
        title: "Subscription Active!",
        description: `Your ${plan.name} subscription has been activated. Credits will be added to your account.`,
      });

      onSuccess();

    } catch (error) {
      console.error('Payment/subscription error:', error);
      toast({
        title: "Payment Error",
        description: error.message || "There was an issue processing your payment. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const cardElementOptions = {
    style: {
      base: {
        fontSize: '16px',
        color: '#424770',
        '::placeholder': {
          color: '#aab7c4',
        },
      },
    },
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-center">
          Subscribe to {plan.name}
        </CardTitle>
        <div className="text-center text-2xl font-bold text-primary">
          ${discountAmount > 0 ? (plan.price - discountAmount).toFixed(2) : plan.price}/month
          {discountAmount > 0 && (
            <span className="text-sm text-muted-foreground ml-2">
              <span className="line-through">${plan.price}</span> Save ${discountAmount}
            </span>
          )}
        </div>
        <div className="text-center text-sm text-muted-foreground">
          {plan.credits} credits per month
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <h4 className="font-semibold">Included features:</h4>
          <ul className="space-y-1 text-sm">
            {plan.features.slice(0, 4).map((feature, index) => (
              <li key={index} className="flex items-center">
                <Check className="h-4 w-4 text-green-500 mr-2" />
                {feature}
              </li>
            ))}
          </ul>
           <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={createPaymentIntent}
                  disabled={!couponCode.trim() || loading}
                  className="px-4"
                >
                  Apply
                </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-3">
            <div>
              <label htmlFor="coupon" className="block text-sm font-medium mb-1">
                Coupon Code (Optional)
              </label>
              <div className="flex space-x-2">
                <input
                  id="coupon"
                  type="text"
                  value={couponCode}
                  onChange={(e) => {
                    setCouponCode(e.target.value);
                    setCouponError('');
                  }}
                  placeholder="Enter coupon code"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={createPaymentIntent}
                  disabled={!couponCode.trim() || loading}
                  className="px-4"
                >
                  Apply
                </Button>
              </div>
              {couponError && (
                <p className="text-sm text-red-500 mt-1">{couponError}</p>
              )}
              {discountAmount > 0 && (
                <p className="text-sm text-green-600 mt-1">
                  ✅ Coupon applied! You save ${discountAmount}/month
                </p>
              )}
            </div>
            
            <div className="border rounded-lg p-3">
              <CardElement options={cardElementOptions} />
            </div>
          </div>
          
          <Alert>
            <Lock className="h-4 w-4" />
            <AlertDescription>
              Your payment information is secure and encrypted. You can cancel anytime.
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Button 
              type="submit" 
              disabled={!stripe || loading || !clientSecret}
              className="w-full"
            >
              {loading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Processing...
                </div>
              ) : (
                `Subscribe $${discountAmount > 0 ? (plan.price - discountAmount).toFixed(2) : plan.price}/month`
              )}
            </Button>
            
            <Button 
              type="button" 
              variant="outline" 
              onClick={onCancel}
              disabled={loading}
              className="w-full"
            >
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

const EmbeddedPaymentForm: React.FC<EmbeddedPaymentFormProps> = (props) => {
  return (
    <Elements stripe={stripePromise}>
      <PaymentForm {...props} />
    </Elements>
  );
};

export default EmbeddedPaymentForm;