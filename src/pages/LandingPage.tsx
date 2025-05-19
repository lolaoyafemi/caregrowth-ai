
import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

const LandingPage = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-grow">
        {/* Hero Section */}
        <section className="bg-gradient-to-r from-caregrowth-blue to-blue-700 text-white py-20">
          <div className="container mx-auto px-4">
            <div className="flex flex-col md:flex-row items-center">
              <div className="md:w-1/2 mb-10 md:mb-0">
                <h1 className="text-4xl md:text-5xl font-bold mb-6">
                  Accelerate Your Agency Growth with AI
                </h1>
                <p className="text-xl mb-8 text-blue-100">
                  CareGrowthAI is an all-in-one platform that helps agencies generate content, search documents, and get instant answers to crucial questions.
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Link to="/dashboard">
                    <Button size="lg" className="bg-white text-caregrowth-blue hover:bg-blue-50">
                      Get Started
                    </Button>
                  </Link>
                  <Link to="#features">
                    <Button size="lg" variant="outline" className="border-white text-white hover:bg-blue-700">
                      Learn More
                    </Button>
                  </Link>
                </div>
              </div>
              <div className="md:w-1/2 md:pl-10">
                <div className="bg-white p-6 rounded-lg shadow-xl">
                  <img 
                    src="/placeholder.svg" 
                    alt="CareGrowthAI Dashboard" 
                    className="rounded-md w-full"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-20">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold mb-4">All-In-One Agency Growth Tools</h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                Our integrated AI solutions help you streamline content creation, document management, and client communications.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="bg-white p-8 rounded-lg shadow-md border border-gray-100">
                <div className="h-12 w-12 bg-caregrowth-lightblue rounded-lg flex items-center justify-center mb-6">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-caregrowth-blue">
                    <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M7 10H9V17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M15 10H17L15 13.5H17V17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M11 10H13V17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M8 7H8.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <h3 className="text-xl font-semibold mb-3">Social Media Content Generator</h3>
                <p className="text-gray-600 mb-4">
                  Create engaging, platform-specific content in seconds with our AI-powered social media assistant.
                </p>
                <Link to="/dashboard/social-media" className="text-caregrowth-blue font-medium hover:underline inline-flex items-center">
                  Learn more
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="ml-1">
                    <path d="M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M12 5L19 12L12 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </Link>
              </div>

              <div className="bg-white p-8 rounded-lg shadow-md border border-gray-100">
                <div className="h-12 w-12 bg-caregrowth-lightgreen rounded-lg flex items-center justify-center mb-6">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-caregrowth-green">
                    <path d="M4 19.5V4.5C4 3.67157 4.67157 3 5.5 3H18.5C19.3284 3 20 3.67157 20 4.5V19.5C20 20.3284 19.3284 21 18.5 21H5.5C4.67157 21 4 20.3284 4 19.5Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M7 7H17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M7 11H17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M7 15H13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <h3 className="text-xl font-semibold mb-3">Document Search & Access</h3>
                <p className="text-gray-600 mb-4">
                  Upload documents and get instant answers from your PDFs, contracts, and knowledge base.
                </p>
                <Link to="/dashboard/document-search" className="text-caregrowth-green font-medium hover:underline inline-flex items-center">
                  Learn more
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="ml-1">
                    <path d="M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M12 5L19 12L12 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </Link>
              </div>

              <div className="bg-white p-8 rounded-lg shadow-md border border-gray-100">
                <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center mb-6">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-caregrowth-blue">
                    <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 13.8214 2.48697 15.5291 3.33782 17L2.5 21.5L7 20.6622C8.47087 21.513 10.1786 22 12 22Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M12 17V17.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M12 13.5C12 12.6716 12.6716 12 13.5 12C14.3284 12 15 11.3284 15 10.5C15 9.67157 14.3284 9 13.5 9H12C11.1716 9 10.5 9.67157 10.5 10.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <h3 className="text-xl font-semibold mb-3">GPT-Powered Q&A Assistant</h3>
                <p className="text-gray-600 mb-4">
                  Get instant answers to your questions with our AI assistant trained on marketing and agency best practices.
                </p>
                <Link to="/dashboard/qa-assistant" className="text-caregrowth-blue font-medium hover:underline inline-flex items-center">
                  Learn more
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="ml-1">
                    <path d="M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M12 5L19 12L12 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section id="how-it-works" className="py-20 bg-gray-50">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold mb-4">How CareGrowthAI Works</h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                Our platform simplifies your agency workflows in three easy steps.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="bg-caregrowth-blue h-16 w-16 rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto mb-6">1</div>
                <h3 className="text-xl font-semibold mb-3">Select Your Tool</h3>
                <p className="text-gray-600">
                  Choose from our content generator, document search, or Q&A assistant based on your needs.
                </p>
              </div>

              <div className="text-center">
                <div className="bg-caregrowth-green h-16 w-16 rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto mb-6">2</div>
                <h3 className="text-xl font-semibold mb-3">Input Your Requirements</h3>
                <p className="text-gray-600">
                  Provide basic details about what you need, upload documents, or ask questions.
                </p>
              </div>

              <div className="text-center">
                <div className="bg-caregrowth-blue h-16 w-16 rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto mb-6">3</div>
                <h3 className="text-xl font-semibold mb-3">Get AI-Generated Results</h3>
                <p className="text-gray-600">
                  Review, edit, and implement the AI-generated content, search results, or answers.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section id="pricing" className="py-20">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold mb-4">Simple, Transparent Pricing</h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                Choose the plan that fits your agency's needs
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="p-8">
                  <h3 className="text-2xl font-bold mb-3">Starter</h3>
                  <div className="mb-5">
                    <span className="text-4xl font-bold">$49</span>
                    <span className="text-gray-600">/month</span>
                  </div>
                  <p className="text-gray-600 mb-8">Perfect for small agencies just getting started</p>
                  <ul className="space-y-3 mb-8">
                    <li className="flex items-center">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-green-500 mr-3">
                        <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      <span>50 Social Media Posts</span>
                    </li>
                    <li className="flex items-center">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-green-500 mr-3">
                        <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      <span>5 Documents (up to 25 pages each)</span>
                    </li>
                    <li className="flex items-center">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-green-500 mr-3">
                        <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      <span>100 Q&A Queries</span>
                    </li>
                  </ul>
                  <Link to="/dashboard">
                    <Button className="w-full" variant="outline">Start Free Trial</Button>
                  </Link>
                </div>
              </div>

              <div className="border-2 border-caregrowth-blue rounded-lg overflow-hidden relative">
                <div className="bg-caregrowth-blue text-white text-center py-2 text-sm font-medium">
                  MOST POPULAR
                </div>
                <div className="p-8">
                  <h3 className="text-2xl font-bold mb-3">Professional</h3>
                  <div className="mb-5">
                    <span className="text-4xl font-bold">$99</span>
                    <span className="text-gray-600">/month</span>
                  </div>
                  <p className="text-gray-600 mb-8">Ideal for growing agencies with multiple clients</p>
                  <ul className="space-y-3 mb-8">
                    <li className="flex items-center">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-green-500 mr-3">
                        <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      <span>200 Social Media Posts</span>
                    </li>
                    <li className="flex items-center">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-green-500 mr-3">
                        <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      <span>20 Documents (up to 50 pages each)</span>
                    </li>
                    <li className="flex items-center">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-green-500 mr-3">
                        <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      <span>500 Q&A Queries</span>
                    </li>
                    <li className="flex items-center">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-green-500 mr-3">
                        <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      <span>Priority Support</span>
                    </li>
                  </ul>
                  <Link to="/dashboard">
                    <Button className="w-full bg-caregrowth-blue">Start Free Trial</Button>
                  </Link>
                </div>
              </div>

              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="p-8">
                  <h3 className="text-2xl font-bold mb-3">Enterprise</h3>
                  <div className="mb-5">
                    <span className="text-4xl font-bold">$249</span>
                    <span className="text-gray-600">/month</span>
                  </div>
                  <p className="text-gray-600 mb-8">For established agencies with high volume needs</p>
                  <ul className="space-y-3 mb-8">
                    <li className="flex items-center">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-green-500 mr-3">
                        <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      <span>Unlimited Social Media Posts</span>
                    </li>
                    <li className="flex items-center">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-green-500 mr-3">
                        <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      <span>Unlimited Documents</span>
                    </li>
                    <li className="flex items-center">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-green-500 mr-3">
                        <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      <span>Unlimited Q&A Queries</span>
                    </li>
                    <li className="flex items-center">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-green-500 mr-3">
                        <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      <span>Dedicated Account Manager</span>
                    </li>
                  </ul>
                  <Link to="/dashboard">
                    <Button className="w-full" variant="outline">Contact Sales</Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 bg-caregrowth-blue text-white">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl font-bold mb-6">Ready to Transform Your Agency?</h2>
            <p className="text-xl mb-8 max-w-2xl mx-auto">
              Start using CareGrowthAI today and see how our AI-powered tools can help your agency grow faster.
            </p>
            <Link to="/dashboard">
              <Button size="lg" className="bg-white text-caregrowth-blue hover:bg-blue-50">
                Get Started Now
              </Button>
            </Link>
          </div>
        </section>
      </main>
      
      <Footer />
    </div>
  );
};

export default LandingPage;
