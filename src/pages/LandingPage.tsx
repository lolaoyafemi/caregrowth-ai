
import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { Play } from 'lucide-react';
import { motion, useInView } from 'framer-motion';

const FadeInSection = ({ children, className = '', delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.8, delay, ease: [0.16, 1, 0.3, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

const LandingPage = () => {
  const [isPlaying, setIsPlaying] = useState(false);

  const handleVideoPlay = () => setIsPlaying(true);

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const CheckIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-caregrowth-green flex-shrink-0">
      <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
  
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />
      
      <main className="flex-grow">
        {/* Hero — Cinematic full-bleed */}
        <section className="relative min-h-screen flex items-center bg-caregrowth-blue overflow-hidden">
          {/* Subtle grid overlay */}
          <div className="absolute inset-0 opacity-[0.03]" style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.5) 1px, transparent 1px)',
            backgroundSize: '80px 80px'
          }} />
          
          {/* Gradient accent line at top */}
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
          
          <div className="container mx-auto px-6 lg:px-12 relative z-10">
            <div className="flex flex-col lg:flex-row items-center gap-16 pt-24 pb-12">
              <motion.div 
                className="lg:w-1/2"
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 1, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
              >
                <p className="text-luxury-spacing text-[11px] tracking-[0.3em] text-white/50 mb-8">
                  AI-Powered Growth Platform
                </p>
                <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold mb-8 text-white leading-[1.05] tracking-tight">
                  Supercharge Your Agency's Growth
                </h1>
                <p className="text-lg md:text-xl mb-10 text-white/70 leading-relaxed max-w-xl">
                  Say goodbye to content blocks and tedious document searches. CareGrowth Assistant is your team's AI co-pilot for creating killer content, finding answers fast, and scaling your agency without the headaches.
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Link to="/login">
                    <Button size="lg" className="bg-white text-caregrowth-blue hover:bg-blue-50 hover:text-caregrowth-blue rounded-none px-10 h-14 text-sm tracking-widest font-semibold transition-all duration-300">
                      I'm Ready Now
                    </Button>
                  </Link>
                  <Button 
                    size="lg" 
                    variant="outline" 
                    className="border-white/30 text-white bg-transparent hover:bg-white/10 rounded-none px-10 h-14 text-sm tracking-widest font-semibold transition-all duration-300"
                    onClick={() => scrollToSection('features')}
                  >
                    See Features
                  </Button>
                </div>
              </motion.div>

              <motion.div 
                className="lg:w-1/2"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 1, delay: 0.6, ease: [0.16, 1, 0.3, 1] }}
              >
                <div className="relative">
                  {/* Glow behind image */}
                  <div className="absolute -inset-4 bg-white/5 blur-3xl rounded-lg" />
                  <div className="relative glass-card-dark rounded-sm overflow-hidden">
                    <img 
                      src="https://images.unsplash.com/photo-1498050108023-c5249f4df085?ixlib=rb-1.2.1&auto=format&fit=crop&w=1200&q=80" 
                      alt="CareGrowth Assistant Dashboard" 
                      className="w-full opacity-90"
                    />
                  </div>
                </div>
              </motion.div>
            </div>
          </div>

          {/* Bottom gradient fade */}
          <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-white to-transparent" />
        </section>

        {/* Explainer Video Section */}
        <section id="video" className="py-32 bg-white">
          <div className="container mx-auto px-6 lg:px-12">
            <FadeInSection className="text-center mb-16">
              <p className="text-luxury-spacing text-[11px] tracking-[0.3em] text-gray-400 mb-4">Platform Overview</p>
              <h2 className="text-4xl md:text-5xl font-bold mb-6 tracking-tight">See CareGrowth Assistant in Action</h2>
              <p className="text-lg text-gray-500 max-w-2xl mx-auto">
                Watch how our platform transforms your workflow in under 3 minutes
              </p>
            </FadeInSection>
            
            <FadeInSection className="max-w-5xl mx-auto" delay={0.15}>
              <div className="relative aspect-video bg-gray-100 rounded-sm overflow-hidden shadow-2xl shadow-gray-200/50">
                {!isPlaying ? (
                  <div className="absolute inset-0 flex items-center justify-center z-10">
                    <button 
                      className="bg-caregrowth-blue rounded-full p-6 cursor-pointer hover:scale-110 transition-transform duration-500 shadow-2xl"
                      onClick={handleVideoPlay}
                    >
                      <Play className="h-10 w-10 text-white ml-1" />
                    </button>
                  </div>
                ) : null}
                
                {isPlaying ? (
                  <iframe 
                    className="w-full h-full absolute inset-0"
                    src="https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1" 
                    title="CareGrowth Assistant Demo"
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
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-px mt-16 bg-gray-200 rounded-sm overflow-hidden">
                {[
                  { title: 'Quick Setup', desc: 'Get started in minutes with our intuitive dashboard and pre-built templates', accent: 'border-caregrowth-blue' },
                  { title: 'Smart Results', desc: 'Our AI delivers agency-specific answers tailored to your business needs', accent: 'border-caregrowth-green' },
                  { title: 'Simple Sharing', desc: 'Export content or share insights with your team in just one click', accent: 'border-caregrowth-blue' },
                ].map((card, i) => (
                  <FadeInSection key={card.title} delay={i * 0.1}>
                    <div className={`bg-white p-8 border-t-2 ${card.accent} h-full`}>
                      <h3 className="font-semibold mb-2 tracking-wide">{card.title}</h3>
                      <p className="text-gray-500 text-sm leading-relaxed">{card.desc}</p>
                    </div>
                  </FadeInSection>
                ))}
              </div>
            </FadeInSection>
          </div>
        </section>

        {/* Divider */}
        <div className="luxury-line mx-auto max-w-md" />

        {/* AI Solutions Section */}
        <section id="features" className="py-32 bg-white">
          <div className="container mx-auto px-6 lg:px-12">
            <FadeInSection className="text-center mb-20">
              <p className="text-luxury-spacing text-[11px] tracking-[0.3em] text-gray-400 mb-4">The Suite</p>
              <h2 className="text-4xl md:text-5xl font-bold mb-6 tracking-tight">AI Solutions</h2>
              <p className="text-lg text-gray-500 max-w-2xl mx-auto">
                Three powerful AI tools working together to transform your agency operations.
              </p>
            </FadeInSection>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-gray-200 rounded-sm overflow-hidden mb-32">
              {[
                {
                  icon: (
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="text-caregrowth-blue">
                      <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M7 10H9V17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M15 10H17L15 13.5H17V17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M11 10H13V17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M8 7H8.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  ),
                  name: 'Nora',
                  desc: 'Nora is your content partner for social media post generation. It helps you generate posts that attract attention, connect with your audience, and keep your message consistent.',
                  value: 'What do you get? Fresh ideas and ready-to-share drafts in minutes.',
                  valueColor: 'text-caregrowth-blue',
                  link: '/dashboard/social-media',
                  cta: 'Create Your Next Post',
                  bgColor: 'bg-caregrowth-blue'
                },
                {
                  icon: (
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="text-caregrowth-green">
                      <path d="M4 19.5V4.5C4 3.67157 4.67157 3 5.5 3H18.5C19.3284 3 20 3.67157 20 4.5V19.5C20 20.3284 19.3284 21 18.5 21H5.5C4.67157 21 4 20.3284 4 19.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M7 7H17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M7 11H17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M7 15H13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  ),
                  name: 'Indexa',
                  desc: 'Indexa is your intelligent document search tool. It connects to your Google Drive, indexes your files, and gives you instant answers with references. No more scrolling to search through documents.',
                  value: 'What do you get? Quick, accurate answers from the right page every time.',
                  valueColor: 'text-caregrowth-green',
                  link: '/dashboard/document-search',
                  cta: 'Analyze Documents',
                  bgColor: 'bg-caregrowth-green'
                },
                {
                  icon: (
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="text-caregrowth-blue">
                      <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M12 17V17.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M12 13.5C12 12.6716 12.6716 12 13.5 12C14.3284 12 15 11.3284 15 10.5C15 9.67157 14.3284 9 13.5 9H12C11.1716 9 10.5 9.67157 10.5 10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  ),
                  name: 'Jared',
                  desc: 'Jared is your on-demand business assistant. It answers questions, explains strategies, and helps you work through challenges with clear guidance. Think of it as a reliable teammate available 24/7.',
                  value: 'What do you get? Instant support, clear direction, and actionable solutions.',
                  valueColor: 'text-caregrowth-blue',
                  link: '/dashboard/qa-assistant',
                  cta: 'Answer Questions',
                  bgColor: 'bg-caregrowth-blue'
                }
              ].map((tool, i) => (
                <FadeInSection key={tool.name} delay={i * 0.12}>
                  <div className="bg-white p-10 h-full flex flex-col group">
                    <div className="mb-8 transition-transform duration-500 group-hover:scale-110 inline-flex">
                      {tool.icon}
                    </div>
                    <h3 className="text-2xl font-bold mb-3 tracking-tight">{tool.name}</h3>
                    <p className="text-gray-500 text-sm leading-relaxed mb-4 flex-1">
                      {tool.desc}
                    </p>
                    <p className={`text-sm font-medium mb-8 ${tool.valueColor}`}>
                      {tool.value}
                    </p>
                    <Link to={tool.link}>
                      <Button className={`w-full ${tool.bgColor} rounded-none h-12 text-sm tracking-widest font-semibold transition-all duration-300 hover:opacity-90`}>
                        {tool.cta}
                      </Button>
                    </Link>
                  </div>
                </FadeInSection>
              ))}
            </div>

            {/* Feature Showcase — Editorial layout */}
            <div className="space-y-32">
              <div className="flex flex-col lg:flex-row items-center gap-16">
                <FadeInSection className="lg:w-1/2">
                  <div className="relative overflow-hidden rounded-sm">
                    <img 
                      src="https://images.unsplash.com/photo-1499951360447-b19be8fe80f5?ixlib=rb-1.2.1&auto=format&fit=crop&w=1200&q=80" 
                      alt="Social Media Generator" 
                      className="w-full transition-transform duration-700 hover:scale-105"
                    />
                  </div>
                </FadeInSection>
                <FadeInSection className="lg:w-1/2" delay={0.15}>
                  <p className="text-luxury-spacing text-[11px] tracking-[0.3em] text-gray-400 mb-4">Content Engine</p>
                  <h3 className="text-3xl md:text-4xl font-bold mb-6 tracking-tight">Create Engaging Content In Seconds</h3>
                  <p className="text-lg text-gray-500 mb-8 leading-relaxed">
                    Enter your industry, target audience, and tone - then watch as our AI crafts perfect posts for Facebook, Instagram, and LinkedIn that actually sound like you wrote them.
                  </p>
                  <ul className="space-y-4">
                    {[
                      'Generate 5 unique posts in under 30 seconds',
                      'Customize hooks, body text, and CTAs separately',
                      'Save templates for your repeat clients and offers'
                    ].map((item) => (
                      <li key={item} className="flex items-center gap-3 text-sm text-gray-600">
                        <CheckIcon />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </FadeInSection>
              </div>
              
              <div className="flex flex-col lg:flex-row-reverse items-center gap-16">
                <FadeInSection className="lg:w-1/2">
                  <div className="relative overflow-hidden rounded-sm">
                    <img 
                      src="https://images.unsplash.com/photo-1461749280684-dccba630e2f6?ixlib=rb-1.2.1&auto=format&fit=crop&w=1200&q=80" 
                      alt="Document Search" 
                      className="w-full transition-transform duration-700 hover:scale-105"
                    />
                  </div>
                </FadeInSection>
                <FadeInSection className="lg:w-1/2" delay={0.15}>
                  <p className="text-luxury-spacing text-[11px] tracking-[0.3em] text-gray-400 mb-4">Knowledge Intelligence</p>
                  <h3 className="text-3xl md:text-4xl font-bold mb-6 tracking-tight">Unlock The Knowledge Buried In Your Files</h3>
                  <p className="text-lg text-gray-500 mb-8 leading-relaxed">
                    Upload your documents once, then ask questions in plain English. Our AI reads through everything and delivers precise answers with highlighted source sections.
                  </p>
                  <ul className="space-y-4">
                    {[
                      'Search across PDFs, Word docs, and Google Drive files',
                      'Get answers from hundreds of pages in seconds',
                      'Ask follow-up questions for deeper understanding'
                    ].map((item) => (
                      <li key={item} className="flex items-center gap-3 text-sm text-gray-600">
                        <CheckIcon />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </FadeInSection>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section id="how-it-works" className="py-32 bg-gray-50">
          <div className="container mx-auto px-6 lg:px-12">
            <FadeInSection className="text-center mb-20">
              <p className="text-luxury-spacing text-[11px] tracking-[0.3em] text-gray-400 mb-4">The Process</p>
              <h2 className="text-4xl md:text-5xl font-bold mb-6 tracking-tight">Get Started in Three Simple Steps</h2>
              <p className="text-lg text-gray-500 max-w-2xl mx-auto">
                We've eliminated the complexity so you can focus on growing your agency
              </p>
            </FadeInSection>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-16 relative">
              {/* Connecting line */}
              <div className="hidden md:block absolute top-12 left-[16.67%] right-[16.67%] h-px bg-gray-300" />
              
              {[
                { num: '01', title: 'Choose Your Tool', desc: 'Log in and select which part of your workflow you need help with today', bg: 'bg-caregrowth-blue' },
                { num: '02', title: 'Answer a Few Questions', desc: 'Tell us about your specific needs with our simple guided inputs', bg: 'bg-caregrowth-green' },
                { num: '03', title: 'Get Instant Results', desc: 'Review your AI-generated content, search results, or expert advice', bg: 'bg-caregrowth-blue' },
              ].map((step, i) => (
                <FadeInSection key={step.num} delay={i * 0.12} className="text-center relative">
                  <div className={`${step.bg} h-24 w-24 rounded-full flex items-center justify-center text-white mx-auto mb-8 relative z-10`}>
                    <span className="text-2xl font-light tracking-wider">{step.num}</span>
                  </div>
                  <h3 className="text-xl font-bold mb-3 tracking-tight">{step.title}</h3>
                  <p className="text-gray-500 text-sm leading-relaxed max-w-xs mx-auto">
                    {step.desc}
                  </p>
                </FadeInSection>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section id="pricing" className="py-32 bg-white">
          <div className="container mx-auto px-6 lg:px-12">
            <FadeInSection className="text-center mb-20">
              <p className="text-luxury-spacing text-[11px] tracking-[0.3em] text-gray-400 mb-4">Investment</p>
              <h2 className="text-4xl md:text-5xl font-bold mb-6 tracking-tight">Simple, Transparent Pricing</h2>
              <p className="text-lg text-gray-500 max-w-2xl mx-auto">
                Choose the credit package that fits your agency's needs
              </p>
            </FadeInSection>

            <FadeInSection className="flex justify-center max-w-lg mx-auto" delay={0.15}>
              <div className="w-full border border-gray-200 rounded-sm overflow-hidden shadow-xl shadow-gray-100/50">
                <div className="bg-caregrowth-blue text-white text-center py-3">
                  <p className="text-luxury-spacing text-[11px] tracking-[0.3em]">COMPLETE SOLUTION</p>
                </div>
                <div className="p-10">
                  <h3 className="text-2xl font-bold mb-6 text-center tracking-tight">CareGrowth Assistant Credits</h3>
                  <div className="mb-2 text-center">
                    <span className="text-6xl font-light tracking-tight">$49</span>
                    <span className="text-gray-400 ml-1">/month</span>
                  </div>
                  <p className="text-center text-sm text-gray-400 mb-10">Monthly subscription</p>
                  
                  <div className="luxury-line mb-10" />
                  
                  <ul className="space-y-4 mb-10">
                    {[
                      '1000 Social Media Posts',
                      'Unlimited Documents',
                      'Unlimited Q&A Queries',
                      'Priority Support',
                      'Advanced Analytics',
                      'Custom Integrations'
                    ].map((feature) => (
                      <li key={feature} className="flex items-center gap-3">
                        <CheckIcon />
                        <span className="text-sm text-gray-700">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Link to="/login">
                    <Button className="w-full bg-caregrowth-blue rounded-none h-14 text-sm tracking-widest font-semibold transition-all duration-300 hover:opacity-90">
                      Get Started Now
                    </Button>
                  </Link>
                </div>
              </div>
            </FadeInSection>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-32 bg-caregrowth-blue text-white relative overflow-hidden">
          {/* Background texture */}
          <div className="absolute inset-0 opacity-[0.03]" style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.5) 1px, transparent 1px)',
            backgroundSize: '60px 60px'
          }} />
          
          <div className="container mx-auto px-6 lg:px-12 text-center relative z-10">
            <FadeInSection>
              <p className="text-luxury-spacing text-[11px] tracking-[0.3em] text-white/40 mb-6">Start Today</p>
              <h2 className="text-4xl md:text-5xl font-bold mb-8 tracking-tight">Ready to Grow Faster with Less Effort?</h2>
              <p className="text-lg mb-12 max-w-2xl mx-auto text-white/70 leading-relaxed">
                Join hundreds of agencies already using CareGrowth Assistant to create better content, access knowledge faster, and make smarter business decisions.
              </p>
              <Link to="/login">
                <Button size="lg" className="bg-white text-caregrowth-blue hover:bg-blue-50 rounded-none px-12 h-14 text-sm tracking-widest font-semibold transition-all duration-300">
                  I'm Ready Now
                </Button>
              </Link>
              <p className="mt-6 text-white/40 text-sm tracking-wider">No credit card required. Cancel anytime.</p>
            </FadeInSection>
          </div>
        </section>
      </main>
      
      <Footer />
    </div>
  );
};

export default LandingPage;
