
import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, ArrowLeft, CreditCard, Shield, Lock, Clock } from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import CreditExpirationWarning from '@/components/dashboard/CreditExpirationWarning';

const StripePaymentPage = () => {
  const [selectedPlan, setSelectedPlan] = useState<string>('professional');
  const [loading, setLoading] = useState(false);
  const [addingCredits, setAddingCredits] = useState<string | null>(null);
  const { user, session, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const plans = [
    {
      id: 'starter',
      name: 'Starter',
      price: 1,
      credits: 50,
      features: ['50 Social Media Posts', '5 Documents', '100 Q&A Queries', 'Email Support']
    },
    {
      id: 'professional',
      name: 'Professional',
      price: 2,
      credits: 200,
      features: ['200 Posts', '20 Documents', '500 Q&A', 'Priority Support', 'Analytics'],
      popular: true
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      price: 3,
      credits: 500,
      features: ['Unlimited Posts', 'Unlimited Docs', 'Unlimited Q&A', 'Account Manager']
    }
  ];

  const creditPackages = [
    { credits: 50, label: '50 Credits', planName: 'Starter Package' },
    { credits: 200, label: '200 Credits', planName: 'Professional Package' },
    { credits: 500, label: '500 Credits', planName: 'Enterprise Package' }
  ];

  const selectedPlanData = plans.find(plan => plan.id === selectedPlan);

  // Show loading while auth is being checked
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-caregrowth-blue mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!user || !session) {
    toast({
      title: "Login Required",
      description: "Please log in before proceeding to payment.",
      variant: "destructive"
    });
    navigate('/login');
    return null;
  }

  const handleCheckout = async () => {
    if (!user || !session) {
      toast({
        title: "Authentication Required",
        description: "Please log in to continue with payment.",
        variant: "destructive"
      });
      navigate('/login');
      return;
    }

    if (!selectedPlanData) {
      toast({
        title: "Plan Selection Required",
        description: "Please select a plan before proceeding.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      console.log('Starting checkout with authenticated user:', {
        userId: user.id,
        email: user.email,
        hasSession: !!session,
        plan: selectedPlan,
        planName: selectedPlanData.name,
        amount: selectedPlanData.price,
        credits: selectedPlanData.credits
      });

      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: {
          plan: selectedPlan,
          planName: selectedPlanData.name,
          amount: selectedPlanData.price,
          credits: selectedPlanData.credits,
          email: user.email,
          user_id: user.id
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        }
      });

      console.log('Checkout response:', { data, error });

      if (error) {
        console.error('Supabase function error:', error);
        let errorMessage = 'Failed to create checkout session';
        
        if (error.message) {
          errorMessage = error.message;
        } else if (typeof error === 'string') {
          errorMessage = error;
        }
        
        throw new Error(errorMessage);
      }

      if (!data) {
        throw new Error('No response data received from checkout session');
      }

      if (data.error) {
        throw new Error(data.error);
      }

      if (data.url) {
        console.log('Redirecting to Stripe checkout:', data.url);
        window.location.href = data.url;
      } else {
        throw new Error("No checkout URL returned from payment service");
      }
    } catch (error) {
      console.error('Checkout error:', error);
      
      let errorMessage = "Unable to create checkout session. Please try again.";
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Checkout Failed",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddCredits = async (credits: number, planName: string) => {
    if (!user || !session) {
      toast({
        title: "Login Required",
        description: "Please log in to add credits.",
        variant: "destructive"
      });
      navigate('/login');
      return;
    }

    setAddingCredits(credits.toString());

    try {
      // Create a credit purchase record directly for testing
      const { data, error } = await supabase
        .from('credit_purchases')
        .insert({
          user_id: user.id,
          email: user.email,
          credits_granted: credits,
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
          status: 'active'
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      // Update user profile credits using the new function
      const { data: updatedCredits, error: updateError } = await supabase.rpc('get_active_credits', {
        p_user_id: user.id
      });

      if (!updateError) {
        await supabase
          .from('user_profiles')
          .upsert({
            user_id: user.id,
            email: user.email,
            credits: updatedCredits,
            credits_expire_at: data.expires_at,
            updated_at: new Date().toISOString()
          });

        // Send purchase confirmation email
        try {
          await supabase.functions.invoke('send-purchase-confirmation-email', {
            body: {
              email: user.email,
              name: user.user_metadata?.full_name || user.email?.split('@')[0],
              credits: credits,
              planName: planName,
              amount: 0 // Free credits
            }
          });
        } catch (emailError) {
          console.error('Failed to send purchase confirmation email:', emailError);
          // Don't fail the credit addition if email fails
        }

        toast({
          title: "Credits Added!",
          description: `Successfully added ${credits} credits to your account. They expire in 30 days.`,
        });
      } else {
        throw new Error("Failed to update credit balance");
      }
    } catch (error) {
      console.error('Add credits error:', error);
      toast({
        title: "Failed to Add Credits",
        description: error.message || "Unable to add credits to your account.",
        variant: "destructive"
      });
    } finally {
      setAddingCredits(null);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      <main className="flex-grow py-12">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="mb-8">
            <Link to="/payment" className="inline-flex items-center text-caregrowth-blue">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Plans
            </Link>
          </div>

          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold mb-4">Complete Your Purchase</h1>
            <p className="text-xl text-gray-600">Secure payment powered by Stripe</p>
            {user && (
              <p className="text-sm text-gray-500 mt-2">Logged in as: {user.email}</p>
            )}
          </div>

          <CreditExpirationWarning />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-6">
              <h2 className="text-2xl font-bold mb-6">Choose Your Credit Package</h2>
              {plans.map(plan => (
                <Card
                  key={plan.id}
                  className={`${selectedPlan === plan.id ? 'border-2 border-caregrowth-blue shadow-md' : 'border'} cursor-pointer transition-all hover:shadow-md`}
                  onClick={() => setSelectedPlan(plan.id)}
                >
                  <CardHeader className="pb-4">
                    <CardTitle className="text-xl">{plan.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium">{plan.credits} credits</span>
                      <span className="font-bold text-lg">${plan.price}</span>
                    </div>
                    <div className="flex items-center text-sm text-gray-500 mb-3">
                      <Clock className="w-4 h-4 mr-1" />
                      Expires 30 days after purchase
                    </div>
                    <ul className="text-sm text-gray-600 space-y-1">
                      {plan.features.slice(0, 3).map((f, i) => (
                        <li key={i} className="flex items-center">
                          <Check className="w-4 h-4 text-green-500 mr-2" />
                          {f}
                        </li>
                      ))}
                      {plan.features.length > 3 && (
                        <li className="text-sm text-gray-500">
                          +{plan.features.length - 3} more
                        </li>
                      )}
                    </ul>
                  </CardContent>
                </Card>
              ))}

              {/* Free Credit Addition Section */}
              <div className="mt-8">
                <h3 className="text-xl font-bold mb-4">Add Credits Directly (Free for Testing)</h3>
                <div className="space-y-3">
                  {creditPackages.map((pkg) => (
                    <Button
                      key={pkg.credits}
                      onClick={() => handleAddCredits(pkg.credits, pkg.planName)}
                      disabled={addingCredits === pkg.credits.toString()}
                      variant="outline"
                      className="w-full text-left justify-between border-2 border-gray-300 hover:border-caregrowth-blue transition-colors"
                    >
                      <span>Add {pkg.label}</span>
                      <div className="flex items-center space-x-2">
                        <Clock className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-500">30 days</span>
                        {addingCredits === pkg.credits.toString() ? (
                          <span className="text-sm">Adding...</span>
                        ) : (
                          <span className="text-sm text-gray-500">Free</span>
                        )}
                      </div>
                    </Button>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <h2 className="text-2xl font-bold mb-6">Payment Summary</h2>
              <Card className="border-2 border-gray-200">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <CreditCard className="w-5 h-5 mr-2" />
                    Order Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {selectedPlanData && (
                    <>
                      <div className="flex justify-between">
                        <span>{selectedPlanData.name} Credits</span>
                        <span className="font-bold">${selectedPlanData.price}</span>
                      </div>
                      <div className="flex justify-between text-sm text-gray-600">
                        <span>{selectedPlanData.credits} credits</span>
                        <span>Expires in 30 days</span>
                      </div>
                    </>
                  )}
                  <Button 
                    onClick={handleCheckout}
                    disabled={loading || !selectedPlanData || !user || !session}
                    className="w-full bg-caregrowth-blue hover:bg-blue-700 text-white py-4 text-lg transition-colors"
                  >
                    {loading ? (
                      <div className="flex items-center">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                        Processing...
                      </div>
                    ) : !user || !session ? (
                      'Please Log In'
                    ) : (
                      `Pay $${selectedPlanData?.price || 0} with Stripe`
                    )}
                  </Button>
                  
                  <div className="flex items-center justify-center space-x-2 text-sm text-gray-500 mt-4">
                    <Shield className="w-4 h-4" />
                    <span>Secure payment powered by Stripe</span>
                    <Lock className="w-4 h-4" />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default StripePaymentPage;
