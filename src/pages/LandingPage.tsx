
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { Card, CardContent } from '@/components/ui/card';
import { Play } from 'lucide-react';

const LandingPage = () => {
  const [isPlaying, setIsPlaying] = useState(false);

  const handleVideoPlay = () => {
    setIsPlaying(true);
  };

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };
  
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
                  Supercharge Your Agency's Growth
                </h1>
                <p className="text-xl mb-8 text-blue-100">
                  Say goodbye to content blocks and tedious document searches. CareGrowthAI is your team's AI co-pilot for creating killer content, finding answers fast, and scaling your agency without the headaches.
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Link to="/login">
                    <Button size="lg" className="bg-white text-blue-600 hover:bg-blue-50 hover:text-blue-700">
                      I'm Ready Now
                    </Button>
                  </Link>
                  <Button 
                    size="lg" 
                    variant="outline" 
                    className="border-white text-blue-600 bg-white hover:bg-blue-50 hover:text-blue-700"
                    onClick={() => scrollToSection('features')}
                  >
                    See Features
                  </Button>
                </div>
              </div>
              <div className="md:w-1/2 md:pl-10">
                <div className="bg-white p-6 rounded-lg shadow-xl">
                  <img 
                    src="https://images.unsplash.com/photo-1498050108023-c5249f4df085?ixlib=rb-1.2.1&auto=format&fit=crop&w=1200&q=80" 
                    alt="CareGrowthAI Dashboard" 
                    className="rounded-md w-full"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Explainer Video Section */}
        <section id="video" className="py-20 bg-gray-50">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4">See CareGrowthAI in Action</h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                Watch how our platform transforms your workflow in under 3 minutes
              </p>
            </div>
            
            <div className="max-w-4xl mx-auto">
              <div className="relative aspect-video bg-gray-200 rounded-xl overflow-hidden shadow-lg border border-gray-100">
                {!isPlaying ? (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <button 
                      className="bg-caregrowth-blue rounded-full p-5 cursor-pointer hover:bg-blue-700 transition-colors shadow-lg"
                      onClick={handleVideoPlay}
                    >
                      <Play className="h-12 w-12 text-white" />
                    </button>
                  </div>
                ) : null}
                
                {isPlaying ? (
                  <iframe 
                    className="w-full h-full absolute inset-0"
                    src="https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1" 
                    title="CareGrowthAI Demo"
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  ></iframe>
                ) : (
                  <img 
                    src="https://images.unsplash.com/photo-1605810230434-7631ac76ec81?ixlib=rb-1.2.1&auto=format&fit=crop&w=1200&q=80" 
                    alt="Video thumbnail" 
                    className="w-full h-full object-cover opacity-80"
                  />
                )}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
                <Card className="border-l-4 border-l-caregrowth-blue">
                  <CardContent className="pt-6">
                    <h3 className="font-semibold mb-2">Quick Setup</h3>
                    <p className="text-gray-600">Get started in minutes with our intuitive dashboard and pre-built templates</p>
                  </CardContent>
                </Card>
                <Card className="border-l-4 border-l-caregrowth-green">
                  <CardContent className="pt-6">
                    <h3 className="font-semibold mb-2">Smart Results</h3>
                    <p className="text-gray-600">Our AI delivers agency-specific answers tailored to your business needs</p>
                  </CardContent>
                </Card>
                <Card className="border-l-4 border-l-caregrowth-blue">
                  <CardContent className="pt-6">
                    <h3 className="font-semibold mb-2">Simple Sharing</h3>
                    <p className="text-gray-600">Export content or share insights with your team in just one click</p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </section>

        {/* Enhanced Features Section */}
        <section id="features" className="py-20">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold mb-4">Three Tools, One Powerful Platform</h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                Stop juggling between different apps. We've built everything your agency needs into one seamless experience.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
              <div className="bg-white p-8 rounded-lg shadow-md border border-gray-100 transform transition-all hover:scale-105">
                <div className="h-12 w-12 bg-caregrowth-lightblue rounded-lg flex items-center justify-center mb-6">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-caregrowth-blue">
                    <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M7 10H9V17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M15 10H17L15 13.5H17V17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M11 10H13V17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M8 7H8.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <h3 className="text-xl font-semibold mb-3">Content Creation Machine</h3>
                <p className="text-gray-600 mb-4">
                  Writer's block? Not anymore. Create scroll-stopping social media posts in seconds that actually sound like your brand.
                </p>
                <ul className="mb-6 space-y-2 text-gray-600">
                  <li className="flex items-start">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-green-500 mt-1 mr-2 flex-shrink-0">
                      <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <span>Platform-specific formatting</span>
                  </li>
                  <li className="flex items-start">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-green-500 mt-1 mr-2 flex-shrink-0">
                      <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <span>Edit any section separately</span>
                  </li>
                  <li className="flex items-start">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-green-500 mt-1 mr-2 flex-shrink-0">
                      <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <span>One-click export options</span>
                  </li>
                </ul>
                <Link to="/dashboard/social-media" className="text-caregrowth-blue font-medium hover:underline inline-flex items-center">
                  Start creating content
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="ml-1">
                    <path d="M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M12 5L19 12L12 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </Link>
              </div>

              <div className="bg-white p-8 rounded-lg shadow-md border border-gray-100 transform transition-all hover:scale-105">
                <div className="h-12 w-12 bg-caregrowth-lightgreen rounded-lg flex items-center justify-center mb-6">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-caregrowth-green">
                    <path d="M4 19.5V4.5C4 3.67157 4.67157 3 5.5 3H18.5C19.3284 3 20 3.67157 20 4.5V19.5C20 20.3284 19.3284 21 18.5 21H5.5C4.67157 21 4 20.3284 4 19.5Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M7 7H17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M7 11H17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M7 15H13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <h3 className="text-xl font-semibold mb-3">Document Search Wizard</h3>
                <p className="text-gray-600 mb-4">
                  Stop wasting hours digging through files. Ask questions in plain English and get instant answers from your documents.
                </p>
                <ul className="mb-6 space-y-2 text-gray-600">
                  <li className="flex items-start">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-green-500 mt-1 mr-2 flex-shrink-0">
                      <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <span>Instant PDF/Doc search</span>
                  </li>
                  <li className="flex items-start">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-green-500 mt-1 mr-2 flex-shrink-0">
                      <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <span>Highlighted source excerpts</span>
                  </li>
                  <li className="flex items-start">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-green-500 mt-1 mr-2 flex-shrink-0">
                      <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <span>Follow-up question support</span>
                  </li>
                </ul>
                <Link to="/dashboard/document-search" className="text-caregrowth-green font-medium hover:underline inline-flex items-center">
                  Search your documents
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="ml-1">
                    <path d="M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M12 5L19 12L12 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </Link>
              </div>

              <div className="bg-white p-8 rounded-lg shadow-md border border-gray-100 transform transition-all hover:scale-105">
                <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center mb-6">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-caregrowth-blue">
                    <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M12 17V17.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M12 13.5C12 12.6716 12.6716 12 13.5 12C14.3284 12 15 11.3284 15 10.5C15 9.67157 14.3284 9 13.5 9H12C11.1716 9 10.5 9.67157 10.5 10.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <h3 className="text-xl font-semibold mb-3">Agency Growth Assistant</h3>
                <p className="text-gray-600 mb-4">
                  Get expert advice on marketing, hiring, compliance, and management without the consulting fees. Just ask and get actionable answers.
                </p>
                <ul className="mb-6 space-y-2 text-gray-600">
                  <li className="flex items-start"> 
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-green-500 mt-1 mr-2 flex-shrink-0">
                      <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <span>Expert-level advice</span>
                  </li>
                  <li className="flex items-start">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-green-500 mt-1 mr-2 flex-shrink-0">
                      <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <span>Step-by-step guidance</span>
                  </li>
                  <li className="flex items-start">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-green-500 mt-1 mr-2 flex-shrink-0">
                      <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <span>Save answers for reference</span>
                  </li>
                </ul>
                <Link to="/dashboard/qa-assistant" className="text-caregrowth-blue font-medium hover:underline inline-flex items-center">
                  Get expert advice
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="ml-1">
                    <path d="M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M12 5L19 12L12 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </Link>
              </div>
            </div>

            {/* Feature Showcase */}
            <div className="mt-20">
              <div className="flex flex-col md:flex-row items-center gap-10 mb-20">
                <div className="md:w-1/2">
                  <img 
                    src="https://images.unsplash.com/photo-1499951360447-b19be8fe80f5?ixlib=rb-1.2.1&auto=format&fit=crop&w=1200&q=80" 
                    alt="Social Media Generator" 
                    className="rounded-lg shadow-lg border border-gray-100 w-full"
                  />
                </div>
                <div className="md:w-1/2">
                  <h3 className="text-2xl font-bold mb-4">Create Engaging Content In Seconds</h3>
                  <p className="text-lg text-gray-600 mb-6">
                    Enter your industry, target audience, and tone - then watch as our AI crafts perfect posts for Facebook, Instagram, and LinkedIn that actually sound like you wrote them.
                  </p>
                  <ul className="space-y-3 mb-8">
                    <li className="flex items-start">
                      <div className="h-6 w-6 rounded-full bg-green-100 flex items-center justify-center mr-3 mt-1">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-green-600">
                          <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                      <span>Generate 5 unique posts in under 30 seconds</span>
                    </li>
                    <li className="flex items-start">
                      <div className="h-6 w-6 rounded-full bg-green-100 flex items-center justify-center mr-3 mt-1">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-green-600">
                          <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                      <span>Customize hooks, body text, and CTAs separately</span>
                    </li>
                    <li className="flex items-start">
                      <div className="h-6 w-6 rounded-full bg-green-100 flex items-center justify-center mr-3 mt-1">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-green-600">
                          <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                      <span>Save templates for your repeat clients and offers</span>
                    </li>
                  </ul>
                </div>
              </div>
              
              <div className="flex flex-col md:flex-row-reverse items-center gap-10">
                <div className="md:w-1/2">
                  <img 
                    src="https://images.unsplash.com/photo-1461749280684-dccba630e2f6?ixlib=rb-1.2.1&auto=format&fit=crop&w=1200&q=80" 
                    alt="Document Search" 
                    className="rounded-lg shadow-lg border border-gray-100 w-full"
                  />
                </div>
                <div className="md:w-1/2">
                  <h3 className="text-2xl font-bold mb-4">Unlock The Knowledge Buried In Your Files</h3>
                  <p className="text-lg text-gray-600 mb-6">
                    Upload your documents once, then ask questions in plain English. Our AI reads through everything and delivers precise answers with highlighted source sections.
                  </p>
                  <ul className="space-y-3 mb-8">
                    <li className="flex items-start">
                      <div className="h-6 w-6 rounded-full bg-green-100 flex items-center justify-center mr-3 mt-1">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-green-600">
                          <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                      <span>Search across PDFs, Word docs, and Google Drive files</span>
                    </li>
                    <li className="flex items-start">
                      <div className="h-6 w-6 rounded-full bg-green-100 flex items-center justify-center mr-3 mt-1">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-green-600">
                          <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                      <span>Get answers from hundreds of pages in seconds</span>
                    </li>
                    <li className="flex items-start">
                      <div className="h-6 w-6 rounded-full bg-green-100 flex items-center justify-center mr-3 mt-1">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-green-600">
                          <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                      <span>Ask follow-up questions for deeper understanding</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section id="how-it-works" className="py-20 bg-gray-50">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold mb-4">Get Started in Three Simple Steps</h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                We've eliminated the complexity so you can focus on growing your agency
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center relative">
                <div className="bg-caregrowth-blue h-16 w-16 rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto mb-6 relative z-10">1</div>
                <div className="hidden md:block absolute top-8 left-1/2 w-full h-0.5 bg-gray-200 z-0"></div>
                <h3 className="text-xl font-semibold mb-3">Choose Your Tool</h3>
                <p className="text-gray-600">
                  Log in and select which part of your workflow you need help with today
                </p>
              </div>

              <div className="text-center relative">
                <div className="bg-caregrowth-green h-16 w-16 rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto mb-6 relative z-10">2</div>
                <div className="hidden md:block absolute top-8 left-1/2 w-full h-0.5 bg-gray-200 z-0"></div>
                <h3 className="text-xl font-semibold mb-3">Answer a Few Questions</h3>
                <p className="text-gray-600">
                  Tell us about your specific needs with our simple guided inputs
                </p>
              </div>

              <div className="text-center">
                <div className="bg-caregrowth-blue h-16 w-16 rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto mb-6">3</div>
                <h3 className="text-xl font-semibold mb-3">Get Instant Results</h3>
                <p className="text-gray-600">
                  Review your AI-generated content, search results, or expert advice
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
                Choose the credit package that fits your agency's needs
              </p>
            </div>

            <div className="flex justify-center max-w-lg mx-auto">
              <div className="border-2 border-caregrowth-blue rounded-lg overflow-hidden relative w-full">
                <div className="bg-caregrowth-blue text-white text-center py-2 text-sm font-medium">
                  COMPLETE SOLUTION
                </div>
                <div className="p-8">
                  <h3 className="text-2xl font-bold mb-3 text-center">CareGrowthAI Credits</h3>
                  <div className="mb-5 text-center">
                    <span className="text-4xl font-bold">$49</span>
                    <span className="text-gray-600"> one-time</span>
                  </div>
                  <div className="mb-5 text-center">
                    <span className="text-black-600">1000 credits included</span>
                  </div>
                  <ul className="space-y-3 mb-8">
                    <li className="flex items-center">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-green-500 mr-3">
                        <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      <span>1000 Social Media Posts</span>
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
                      <span>Priority Support</span>
                    </li>
                    <li className="flex items-center">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-green-500 mr-3">
                        <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      <span>Advanced Analytics</span>
                    </li>
                    <li className="flex items-center">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-green-500 mr-3">
                        <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      <span>Custom Integrations</span>
                    </li>
                  </ul>
                  <Link to="/login">
                    <Button className="w-full bg-caregrowth-blue">Get Started Now</Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 bg-caregrowth-blue text-white">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl font-bold mb-6">Ready to Grow Faster with Less Effort?</h2>
            <p className="text-xl mb-8 max-w-2xl mx-auto">
              Join hundreds of agencies already using CareGrowthAI to create better content, access knowledge faster, and make smarter business decisions.
            </p>
            <Link to="/login">
              <Button size="lg" className="bg-white text-caregrowth-blue hover:bg-blue-50">
                I'm Ready Now
              </Button>
            </Link>
            <p className="mt-4 text-blue-200">No credit card required. Cancel anytime.</p>
          </div>
        </section>
      </main>
      
      <Footer />
    </div>
  );
};

export default LandingPage;
