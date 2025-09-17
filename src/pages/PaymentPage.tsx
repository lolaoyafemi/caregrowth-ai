
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, ArrowLeft } from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

const PaymentPage = () => {
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  const plans = [
    {
      id: 'professional',
      name: 'CareGrowthAI Credits',
      price: 49,
      description: 'Complete access to all CareGrowthAI features',
      features: [
        '1000 Social Media Posts',
        'Unlimited Documents',
        'Unlimited Q&A Queries',
        'Priority Support',
        'Advanced Analytics',
        'Custom Integrations'
      ],
      popular: true
    }
  ];

  const handleSelectPlan = (planId: string) => {
    setSelectedPlan(planId);
  };

  const handleCheckout = () => {
    const baseUrl = 'https://buy.stripe.com/3cI28sbNC05F3QCeXHbsc0y';
    const successUrl = `https://www.caregrowthassistant.com/payment-success?plan=${selectedPlan || 'professional'}`;
    
    // Redirect directly to your live Stripe payment link with custom success URL
    window.open(`${baseUrl}?success_url=${encodeURIComponent(successUrl)}`, '_blank');
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      
      <main className="flex-grow py-20">
        <div className="container mx-auto px-4">
          {/* Back to Home */}
          <div className="mb-8">
            <Link 
              to="/" 
              className="inline-flex items-center text-caregrowth-blue hover:text-blue-700 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Link>
          </div>

          {/* Header */}
          <div className="text-center mb-16">
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              Choose Your Credit Package
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Select the perfect credit package to supercharge your agency's growth. 
              Get instant access to all CareGrowthAI features with your credit purchase.
            </p>
          </div>

          {/* Pricing Card */}
          <div className="flex justify-center max-w-2xl mx-auto">
            {plans.map((plan) => (
              <Card 
                key={plan.id}
                className={`relative overflow-hidden transition-all duration-300 hover:shadow-lg ${
                  plan.popular 
                    ? 'border-2 border-caregrowth-blue shadow-lg scale-105' 
                    : selectedPlan === plan.id 
                      ? 'border-2 border-caregrowth-blue' 
                      : 'border border-gray-200'
                }`}
              >
                {plan.popular && (
                  <div className="bg-caregrowth-blue text-white text-center py-2 text-sm font-medium">
                    MOST POPULAR
                  </div>
                )}
                
                <CardHeader className="text-center pb-4">
                  <CardTitle className="text-2xl font-bold mb-2">{plan.name}</CardTitle>
                  <div className="mb-4">
                    <span className="text-4xl font-bold">${plan.price}</span>
                    <span className="text-gray-600"> credits</span>
                  </div>
                  <p className="text-gray-600">{plan.description}</p>
                </CardHeader>

                <CardContent className="space-y-6">
                  <ul className="space-y-3">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-center">
                        <Check className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                        <span className="text-gray-700">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="space-y-3">
                    <Button
                      onClick={() => handleSelectPlan(plan.id)}
                      variant={selectedPlan === plan.id ? "default" : "outline"}
                      className={`w-full ${
                        plan.popular 
                          ? 'bg-caregrowth-blue hover:bg-blue-700 text-white' 
                          : selectedPlan === plan.id
                            ? 'bg-caregrowth-blue hover:bg-blue-700 text-white'
                            : ''
                      }`}
                    >
                      {selectedPlan === plan.id ? 'Selected' : 'Select Package'}
                    </Button>

                    {selectedPlan === plan.id && (
                      <Button
                        onClick={handleCheckout}
                        className="w-full bg-caregrowth-green hover:bg-green-700 text-white"
                      >
                        Buy Credits Now
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Trust Indicators */}
          <div className="text-center mt-16">
            <p className="text-gray-600 mb-4">
              ✓ Instant credit delivery &nbsp;&nbsp;&nbsp; 
              ✓ Secure payment processing &nbsp;&nbsp;&nbsp; 
              ✓ 24/7 customer support
            </p>
            <div className="flex justify-center items-center space-x-8 opacity-60">
              <div className="text-sm font-medium">SSL Secured</div>
              <div className="text-sm font-medium">GDPR Compliant</div>
              <div className="text-sm font-medium">Bank-Level Security</div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default PaymentPage;
