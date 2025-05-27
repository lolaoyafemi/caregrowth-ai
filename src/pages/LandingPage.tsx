
import React from 'react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, Star, Users, TrendingUp, MessageCircle, FileText, BarChart3 } from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

const LandingPage = () => {
  const pricingPlans = [
    {
      name: 'Starter',
      price: 49,
      features: [
        '50 Social Media Posts',
        '5 Documents (up to 25 pages each)',
        '100 Q&A Queries',
        'Email Support'
      ]
    },
    {
      name: 'Professional',
      price: 99,
      features: [
        '200 Social Media Posts',
        '20 Documents (up to 50 pages each)',
        '500 Q&A Queries',
        'Priority Support',
        'Advanced Analytics'
      ],
      popular: true
    },
    {
      name: 'Enterprise',
      price: 249,
      features: [
        'Unlimited Social Media Posts',
        'Unlimited Documents',
        'Unlimited Q&A Queries',
        'Dedicated Account Manager',
        'Custom Integrations',
        'White-label Options'
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-white">
      <Header />
      
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-caregrowth-lightblue to-white py-20">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-5xl md:text-6xl font-bold mb-6 text-gray-900">
            Grow Your Agency with
            <span className="text-caregrowth-blue"> AI-Powered</span> Tools
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Transform your agency's productivity with our comprehensive AI toolkit. Generate engaging content, 
            analyze documents, and provide instant customer support - all in one platform.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link to="/stripe-payment">
              <Button size="lg" className="bg-caregrowth-blue hover:bg-blue-700 text-white px-8 py-4 text-lg">
                I'm Ready Now
              </Button>
            </Link>
            <Button variant="outline" size="lg" className="px-8 py-4 text-lg">
              Watch Demo
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Everything Your Agency Needs</h2>
            <p className="text-xl text-gray-600">Powerful AI tools designed specifically for growing agencies</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="text-center hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="w-16 h-16 bg-caregrowth-lightblue rounded-lg flex items-center justify-center mx-auto mb-4">
                  <MessageCircle className="w-8 h-8 text-caregrowth-blue" />
                </div>
                <CardTitle>AI Content Generation</CardTitle>
                <CardDescription>
                  Create engaging social media posts and marketing content that converts
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="text-center hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="w-16 h-16 bg-caregrowth-lightgreen rounded-lg flex items-center justify-center mx-auto mb-4">
                  <FileText className="w-8 h-8 text-caregrowth-green" />
                </div>
                <CardTitle>Document Intelligence</CardTitle>
                <CardDescription>
                  Extract insights and analyze data from your agency documents instantly
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="text-center hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="w-16 h-16 bg-caregrowth-lightblue rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Users className="w-8 h-8 text-caregrowth-blue" />
                </div>
                <CardTitle>Customer Support AI</CardTitle>
                <CardDescription>
                  Provide instant, accurate answers to client questions 24/7
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* Social Proof Section */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4 text-center">
          <h3 className="text-2xl font-bold mb-8">Trusted by Growing Agencies</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="flex flex-col items-center">
              <div className="flex mb-2">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              <p className="text-gray-600 mb-2">"CareGrowthAI has transformed how we create content for our clients."</p>
              <p className="font-semibold">- Sarah Johnson, Agency Owner</p>
            </div>
            
            <div className="flex flex-col items-center">
              <div className="flex mb-2">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              <p className="text-gray-600 mb-2">"The document analysis feature saves us hours every week."</p>
              <p className="font-semibold">- Michael Chen, Marketing Director</p>
            </div>
            
            <div className="flex flex-col items-center">
              <div className="flex mb-2">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              <p className="text-gray-600 mb-2">"Our client satisfaction has improved dramatically with the Q&A assistant."</p>
              <p className="font-semibold">- Emily Rodriguez, Operations Manager</p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Simple Credit Packages</h2>
            <p className="text-xl text-gray-600">One-time purchases for all your AI needs</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {pricingPlans.map((plan, index) => (
              <Card key={index} className={`relative ${plan.popular ? 'border-2 border-caregrowth-blue' : ''}`}>
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <span className="bg-caregrowth-blue text-white px-4 py-1 text-sm font-medium rounded-full">
                      Most Popular
                    </span>
                  </div>
                )}
                
                <CardHeader className="text-center">
                  <CardTitle className="text-2xl">{plan.name}</CardTitle>
                  <div className="mt-4">
                    <span className="text-4xl font-bold">${plan.price}</span>
                    <span className="text-gray-600 ml-2">one-time</span>
                  </div>
                </CardHeader>
                
                <CardContent>
                  <ul className="space-y-3 mb-6">
                    {plan.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-center">
                        <Check className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  
                  <Link to="/stripe-payment">
                    <Button 
                      className={`w-full ${plan.popular 
                        ? 'bg-caregrowth-blue hover:bg-blue-700 text-white' 
                        : 'bg-gray-100 hover:bg-gray-200 text-gray-900'
                      }`}
                    >
                      Get Started
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-caregrowth-blue text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-4xl font-bold mb-4">Ready to Transform Your Agency?</h2>
          <p className="text-xl mb-8 opacity-90">
            Join thousands of agencies already using CareGrowthAI to scale their business
          </p>
          <Link to="/stripe-payment">
            <Button size="lg" variant="secondary" className="bg-white text-caregrowth-blue hover:bg-gray-100 px-8 py-4 text-lg">
              Start Your Journey Today
            </Button>
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default LandingPage;
