
import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, ArrowLeft, CreditCard, Shield, Lock, Clock } from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { useToast } from '@/hooks/use-toast';
import CreditExpirationWarning from '@/components/dashboard/CreditExpirationWarning';
import EmbeddedPaymentForm from '@/components/payment/EmbeddedPaymentForm';

const StripePaymentPage = () => {
  const [selectedPlan, setSelectedPlan] = useState<string>('professional');
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  
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

  const handleSubscribe = () => {
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

    setShowPaymentForm(true);
  };

  const handlePaymentSuccess = () => {
    navigate('/dashboard');
  };

  const handlePaymentCancel = () => {
    setShowPaymentForm(false);
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

          {showPaymentForm && selectedPlanData ? (
            <div className="flex justify-center">
              <EmbeddedPaymentForm
                plan={selectedPlanData}
                onSuccess={handlePaymentSuccess}
                onCancel={handlePaymentCancel}
              />
            </div>
          ) : (
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
                        Monthly subscription - auto-renews
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
                          <span>{selectedPlanData.credits} credits/month</span>
                          <span>Auto-renews monthly</span>
                        </div>
                      </>
                    )}
                    <Button 
                      onClick={handleSubscribe}
                      disabled={!selectedPlanData || !user || !session}
                      className="w-full bg-caregrowth-blue hover:bg-blue-700 text-white py-4 text-lg transition-colors"
                    >
                      {!user || !session ? (
                        'Please Log In'
                      ) : (
                        `Subscribe $${selectedPlanData?.price || 0}/month`
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
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default StripePaymentPage;
