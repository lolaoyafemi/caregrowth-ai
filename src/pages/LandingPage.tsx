
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
      <section className="bg-caregrowth-blue py-20">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="text-white">
              <h1 className="text-5xl md:text-6xl font-bold mb-6">
                Supercharge Your Agency's Growth
              </h1>
              <p className="text-xl mb-8 opacity-90">
                Say goodbye to content blocks and tedious document searches. 
                CareGrowthAI is your team's AI co-pilot for creating killer content, finding 
                answers fast, and scaling your agency without the headaches.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link to="/stripe-payment">
                  <Button size="lg" className="bg-white text-caregrowth-blue hover:bg-gray-100 px-8 py-4 text-lg font-semibold">
                    I'm Ready Now
                  </Button>
                </Link>
                <Button variant="outline" size="lg" className="border-white text-caregrowth-blue bg-white hover:bg-gray-100 px-8 py-4 text-lg">
                  See Features
                </Button>
              </div>
            </div>
            <div className="relative">
              <div className="bg-white rounded-lg shadow-2xl p-6">
                <img 
                  src="/lovable-uploads/98e532e2-ec1b-4eef-9b99-c7fa21e65e07.png" 
                  alt="CareGrowthAI Dashboard" 
                  className="w-full h-auto rounded-lg"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Video Section */}
      <section id="video" className="py-20 bg-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-4xl font-bold mb-4">See CareGrowthAI in Action</h2>
          <p className="text-xl text-gray-600 mb-12">Watch how our platform transforms your workflow in under 3 minutes</p>
          
          <div className="max-w-4xl mx-auto">
            <div className="bg-gray-900 rounded-lg overflow-hidden shadow-2xl">
              <img 
                src="/lovable-uploads/ba3df0e3-bf40-4e47-bd99-3c11abe8f638.png" 
                alt="CareGrowthAI Demo Video" 
                className="w-full h-auto"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Everything Your Agency Needs</h2>
            <p className="text-xl text-gray-600">Powerful AI tools designed specifically for growing agencies</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
            <Card className="text-center hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="w-16 h-16 bg-caregrowth-lightblue rounded-lg flex items-center justify-center mx-auto mb-4">
                  <MessageCircle className="w-8 h-8 text-caregrowth-blue" />
                </div>
                <CardTitle>Content Creation Machine</CardTitle>
                <CardDescription>
                  Writer's block? Not anymore. Create social-stopping social media posts in seconds that actually sound like your brand.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="text-center hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="w-16 h-16 bg-caregrowth-lightgreen rounded-lg flex items-center justify-center mx-auto mb-4">
                  <FileText className="w-8 h-8 text-caregrowth-green" />
                </div>
                <CardTitle>Document Search Wizard</CardTitle>
                <CardDescription>
                  Stop wasting hours digging through files. Ask questions in plain English and get instant answers from your documents.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="text-center hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="w-16 h-16 bg-caregrowth-lightblue rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Users className="w-8 h-8 text-caregrowth-blue" />
                </div>
                <CardTitle>Agency Growth Assistant</CardTitle>
                <CardDescription>
                  Get expert advice on marketing, hiring, compliance, and management without the consulting fees. Just ask and get actionable answers.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>

          {/* Feature showcase with image */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="relative">
              <img 
                src="/lovable-uploads/602b5e27-d16d-4566-adc3-bf5f8b9541e0.png" 
                alt="Create Engaging Content" 
                className="w-full h-auto rounded-lg shadow-lg"
              />
            </div>
            <div>
              <h3 className="text-3xl font-bold mb-6">Create Engaging Content In Seconds</h3>
              <p className="text-lg text-gray-600 mb-6">
                Enter your industry, target audience, and tone - then watch as our AI crafts perfect 
                posts for Facebook, Instagram, and LinkedIn that actually sound like you wrote them.
              </p>
              <ul className="space-y-3">
                <li className="flex items-center">
                  <Check className="w-5 h-5 text-green-500 mr-3" />
                  <span>Generate 5 unique posts in under 30 seconds</span>
                </li>
                <li className="flex items-center">
                  <Check className="w-5 h-5 text-green-500 mr-3" />
                  <span>Customize hooks, body text, and CTAs separately</span>
                </li>
                <li className="flex items-center">
                  <Check className="w-5 h-5 text-green-500 mr-3" />
                  <span>Save templates for your repeat clients and offers</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Document Feature Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h3 className="text-3xl font-bold mb-6">Unlock The Knowledge Buried In Your Files</h3>
              <p className="text-lg text-gray-600 mb-6">
                Upload your documents once, then ask questions in plain English. Our AI reads 
                through everything and delivers precise answers with highlighted source sections.
              </p>
              <ul className="space-y-3">
                <li className="flex items-center">
                  <Check className="w-5 h-5 text-green-500 mr-3" />
                  <span>Search across PDFs, Word docs, and Google Drive files</span>
                </li>
                <li className="flex items-center">
                  <Check className="w-5 h-5 text-green-500 mr-3" />
                  <span>Get answers from hundreds of pages in seconds</span>
                </li>
                <li className="flex items-center">
                  <Check className="w-5 h-5 text-green-500 mr-3" />
                  <span>Ask follow-up questions for deeper understanding</span>
                </li>
              </ul>
            </div>
            <div className="relative">
              <img 
                src="/lovable-uploads/66145fd3-e6e2-4f37-9f20-7f810d04761d.png" 
                alt="Document Search Feature" 
                className="w-full h-auto rounded-lg shadow-lg"
              />
            </div>
          </div>
        </div>
      </section>

      {/* How it Works Section */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Get Started in Three Simple Steps</h2>
            <p className="text-xl text-gray-600">We've eliminated the complexity so you can focus on growing your agency</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-caregrowth-blue text-white rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
                1
              </div>
              <h3 className="text-xl font-semibold mb-3">Choose Your Tool</h3>
              <p className="text-gray-600">Log in and select which part of your workflow you need help with today</p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-caregrowth-green text-white rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
                2
              </div>
              <h3 className="text-xl font-semibold mb-3">Answer a Few Questions</h3>
              <p className="text-gray-600">Tell us about your specific needs with our simple guided inputs</p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-caregrowth-blue text-white rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
                3
              </div>
              <h3 className="text-xl font-semibold mb-3">Get Instant Results</h3>
              <p className="text-gray-600">Review your AI-generated content, search results, or expert advice</p>
            </div>
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
      <section id="pricing" className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Simple, Transparent Pricing</h2>
            <p className="text-xl text-gray-600">Choose the plan that fits your agency's needs</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {pricingPlans.map((plan, index) => (
              <Card key={index} className={`relative ${plan.popular ? 'border-2 border-caregrowth-blue' : ''}`}>
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <span className="bg-caregrowth-blue text-white px-4 py-1 text-sm font-medium rounded-full">
                      MOST POPULAR
                    </span>
                  </div>
                )}
                
                <CardHeader className="text-center">
                  <CardTitle className="text-2xl">{plan.name}</CardTitle>
                  <div className="mt-4">
                    <span className="text-4xl font-bold">${plan.price}</span>
                  </div>
                  <p className="text-sm text-gray-600 mt-2">
                    {plan.name === 'Starter' && 'Perfect for small agencies just getting started'}
                    {plan.name === 'Professional' && 'Ideal for growing agencies with multiple clients'}
                    {plan.name === 'Enterprise' && 'For established agencies with high volume needs'}
                  </p>
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
                      {plan.popular ? "I'm Ready Now" : "I'm Ready Now"}
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
          <h2 className="text-4xl font-bold mb-4">Ready to Grow Faster with Less Effort?</h2>
          <p className="text-xl mb-8 opacity-90">
            Join hundreds of agencies already using CareGrowthAI to create better 
            content, access knowledge faster, and make smarter business decisions.
          </p>
          <Link to="/stripe-payment">
            <Button size="lg" className="bg-white text-caregrowth-blue hover:bg-gray-100 px-8 py-4 text-lg font-semibold">
              I'm Ready Now
            </Button>
          </Link>
          <p className="text-sm mt-4 opacity-75">No credit card required. Cancel anytime.</p>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default LandingPage;
