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
const stripePromise = loadStripe('pk_test_51Rvd1mPnmK6WBcMPuLc4LUtR6QqvDel67C17W732wNADYDfmYDa6fLKDkGEbH5qxi6eJPBVnpNwTfmtGIQecat3u00ln5dp6WQ');

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
          credits: plan.credits
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        }
      });

      if (error) {
        console.error('Supabase function error:', error);
        throw error;
      }

      if (!data?.clientSecret) {
        throw new Error('No client secret received from server');
      }

      console.log('Payment intent created successfully');
      setClientSecret(data.clientSecret);
      setPaymentIntentId(data.paymentIntentId);
    } catch (error) {
      console.error('Error creating payment intent:', error);
      toast({
        title: "Setup Error",
        description: `Failed to initialize payment: ${error.message || 'Please try again.'}`,
        variant: "destructive"
      });
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
          ${plan.price}/month
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
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="border rounded-lg p-3">
            <CardElement options={cardElementOptions} />
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
                `Subscribe $${plan.price}/month`
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