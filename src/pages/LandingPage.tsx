
import React, { useRef } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import {
  ArrowRight, Building2, Eye, MessageCircle,
  CalendarDays, FileText, Sparkles, CheckCircle2,
} from 'lucide-react';
import { motion, useInView } from 'framer-motion';

const FadeIn = ({ children, className = '', delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-60px' });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 32 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, delay, ease: [0.16, 1, 0.3, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

const LandingPage = () => {
  const pillars = [
    {
      icon: <Building2 className="h-6 w-6" />,
      title: 'Build Your Agency Foundation',
      description:
        'Complete your agency profile and onboarding so CareGrowth can generate guidance and content tailored to your services.',
      details: [
        'Complete agency profile',
        'Upload agency documents',
        'Continue onboarding training',
      ],
      cta: 'Continue Setup',
      link: '/dashboard/agency-setup',
      accent: 'border-caregrowth-green',
    },
    {
      icon: <Eye className="h-6 w-6" />,
      title: 'Stay Visible to Families Searching for Care',
      description:
        'Generate and schedule helpful posts that show families how your agency can support them.',
      details: [
        'Generate social media posts in seconds',
        'Schedule content across platforms',
        'Track what resonates with families',
      ],
      cta: 'Generate Posts',
      secondaryCta: 'Open Calendar',
      link: '/dashboard/social-media',
      secondaryLink: '/dashboard/content-calendar',
      accent: 'border-caregrowth-green',
    },
    {
      icon: <MessageCircle className="h-6 w-6" />,
      title: 'Ask Jared',
      description:
        'Your home care assistant trained on agency knowledge and documents. Get answers, not searches.',
      prompts: [
        'How should I respond to a family asking about dementia care?',
        'What content should I post this week?',
        'How do I handle hospital discharge inquiries?',
      ],
      cta: 'Start Conversation',
      link: '/dashboard/qa-assistant',
      accent: 'border-caregrowth-green',
    },
  ];

  const insights = [
    {
      icon: <CalendarDays className="h-4 w-4" />,
      label: 'Content Opportunity',
      text: 'Families search for "fall prevention tips" more this time of year. A timely post could help them find you.',
    },
    {
      icon: <Sparkles className="h-4 w-4" />,
      label: 'Training Reminder',
      text: 'Practice responding to hospital discharge calls so your team feels confident when families reach out.',
    },
    {
      icon: <FileText className="h-4 w-4" />,
      label: 'Family Care Trend',
      text: 'More families are asking about overnight care options. Consider highlighting your availability.',
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-caregrowth-blue scroll-smooth">
      <Header />

      <main className="flex-grow">
        {/* Hero */}
        <section className="relative pt-32 pb-20 sm:pt-40 sm:pb-28 overflow-hidden">
          {/* Background accents */}
          <div className="absolute top-1/3 -left-32 w-96 h-96 bg-caregrowth-green/8 rounded-full blur-[120px]" />
          <div className="absolute bottom-1/4 -right-32 w-80 h-80 bg-white/5 rounded-full blur-[100px]" />

          <div className="container mx-auto px-5 sm:px-6 lg:px-12 relative z-10">
            <motion.div
              className="max-w-3xl mx-auto text-center"
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
            >
              <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white leading-[1.08] tracking-tight mb-6">
                Your Agency Command Center
              </h1>
              <p className="text-lg sm:text-xl text-white/55 leading-relaxed max-w-2xl mx-auto mb-10">
                Everything you need to grow your home care agency in one place.
                Set up your foundation, stay visible to families, and get expert guidance whenever you need it.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link to="/login">
                  <Button
                    size="lg"
                    className="w-full sm:w-auto bg-caregrowth-green text-white hover:bg-caregrowth-green/90 rounded-none px-10 h-14 text-sm tracking-widest font-semibold transition-all duration-300 group"
                  >
                    Get Started
                    <ArrowRight size={16} className="ml-2 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full sm:w-auto border-white/20 text-white bg-white/5 hover:bg-white/10 rounded-none px-10 h-14 text-sm tracking-widest font-semibold backdrop-blur-sm"
                  onClick={() => document.getElementById('pillars')?.scrollIntoView({ behavior: 'smooth' })}
                >
                  See How It Works
                </Button>
              </div>
            </motion.div>
          </div>

          <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[hsl(222.2,47.4%,8%)] to-transparent" />
        </section>

        {/* Three Pillar Cards */}
        <section id="pillars" className="py-20 sm:py-28 bg-[hsl(222.2,47.4%,8%)] relative">
          <div className="container mx-auto px-5 sm:px-6 lg:px-12">
            <FadeIn className="text-center mb-14 sm:mb-20">
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white tracking-tight mb-4">
                Three things that matter most
              </h2>
              <p className="text-base sm:text-lg text-white/45 max-w-2xl mx-auto">
                We built CareGrowth around the three actions that actually move your agency forward.
              </p>
            </FadeIn>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-px bg-white/10 rounded-sm overflow-hidden">
              {pillars.map((pillar, i) => (
                <FadeIn key={pillar.title} delay={i * 0.1}>
                  <div className={`bg-white/[0.04] p-7 sm:p-9 h-full flex flex-col border-t-2 ${pillar.accent} hover:bg-white/[0.07] transition-all duration-500`}>
                    {/* Icon */}
                    <div className="w-11 h-11 rounded-lg bg-caregrowth-green/15 flex items-center justify-center text-caregrowth-green mb-6">
                      {pillar.icon}
                    </div>

                    {/* Title & description */}
                    <h3 className="text-xl font-bold text-white tracking-tight mb-3">
                      {pillar.title}
                    </h3>
                    <p className="text-sm text-white/45 leading-relaxed mb-6">
                      {pillar.description}
                    </p>

                    {/* Details or prompts */}
                    {pillar.details && (
                      <ul className="space-y-2.5 mb-8 flex-1">
                        {pillar.details.map((d) => (
                          <li key={d} className="flex items-start gap-2.5 text-xs text-white/55">
                            <CheckCircle2 className="h-3.5 w-3.5 text-caregrowth-green mt-0.5 shrink-0" />
                            <span>{d}</span>
                          </li>
                        ))}
                      </ul>
                    )}

                    {pillar.prompts && (
                      <div className="space-y-2 mb-8 flex-1">
                        {pillar.prompts.map((p) => (
                          <div
                            key={p}
                            className="rounded-md bg-white/[0.05] px-3.5 py-2.5 text-xs text-white/50 leading-relaxed"
                          >
                            "{p}"
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Buttons */}
                    <div className="flex gap-2 mt-auto">
                      <Link to={pillar.link} className={pillar.secondaryCta ? 'flex-1' : 'w-full'}>
                        <Button className="w-full bg-caregrowth-green rounded-none h-11 text-xs tracking-widest font-semibold hover:bg-caregrowth-green/90 text-white">
                          {pillar.cta}
                        </Button>
                      </Link>
                      {pillar.secondaryCta && pillar.secondaryLink && (
                        <Link to={pillar.secondaryLink} className="flex-1">
                          <Button
                            variant="outline"
                            className="w-full border-white/15 text-white bg-white/5 hover:bg-white/10 rounded-none h-11 text-xs tracking-widest font-semibold gap-1.5"
                          >
                            <CalendarDays className="h-3.5 w-3.5" />
                            {pillar.secondaryCta}
                          </Button>
                        </Link>
                      )}
                    </div>
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>
        </section>

        {/* Divider */}
        <div className="h-px bg-gradient-to-r from-transparent via-caregrowth-green/25 to-transparent" />

        {/* Today's Insights */}
        <section className="py-20 sm:py-28 bg-caregrowth-blue relative overflow-hidden">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-caregrowth-green/5 rounded-full blur-[140px]" />

          <div className="container mx-auto px-5 sm:px-6 lg:px-12 relative z-10">
            <FadeIn className="text-center mb-12 sm:mb-16">
              <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight mb-4">
                Today's Insights
              </h2>
              <p className="text-base sm:text-lg text-white/45 max-w-xl mx-auto">
                Quick suggestions to help you connect with the families who need you most.
              </p>
            </FadeIn>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-5xl mx-auto">
              {insights.map((insight, i) => (
                <FadeIn key={insight.label} delay={i * 0.1}>
                  <div className="bg-white/[0.04] border border-white/8 rounded-sm p-6 hover:bg-white/[0.07] transition-colors duration-300 h-full flex flex-col">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-caregrowth-green">{insight.icon}</span>
                      <span className="text-[10px] tracking-[0.2em] text-white/35 uppercase font-medium">
                        {insight.label}
                      </span>
                    </div>
                    <p className="text-sm text-white/55 leading-relaxed flex-1">
                      {insight.text}
                    </p>
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="py-20 sm:py-28 bg-[hsl(222.2,47.4%,8%)] relative">
          <div className="container mx-auto px-5 sm:px-6 lg:px-12">
            <FadeIn className="text-center mb-14 sm:mb-20">
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white tracking-tight mb-4">
                Up and running in minutes
              </h2>
              <p className="text-base sm:text-lg text-white/45 max-w-2xl mx-auto">
                No complicated setup. Just log in, tell us about your agency, and start growing.
              </p>
            </FadeIn>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-12 sm:gap-16 relative max-w-4xl mx-auto">
              <div className="hidden md:block absolute top-12 left-[16.67%] right-[16.67%] h-px bg-white/10" />
              {[
                { num: '01', title: 'Set Up Your Profile', desc: 'Tell us about your agency, your services, and the families you serve.' },
                { num: '02', title: 'Create Your First Post', desc: 'Generate helpful content that shows families why your agency stands out.' },
                { num: '03', title: 'Ask a Question', desc: 'Get guidance on real situations your team faces every day.' },
              ].map((step, i) => (
                <FadeIn key={step.num} delay={i * 0.1} className="text-center relative">
                  <div className="bg-caregrowth-green h-20 w-20 rounded-full flex items-center justify-center text-white mx-auto mb-6 relative z-10 shadow-lg shadow-caregrowth-green/20">
                    <span className="text-xl font-light tracking-wider">{step.num}</span>
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2 tracking-tight">{step.title}</h3>
                  <p className="text-white/40 text-sm leading-relaxed max-w-xs mx-auto">{step.desc}</p>
                </FadeIn>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-20 sm:py-28 bg-caregrowth-blue text-white relative overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-caregrowth-green/8 rounded-full blur-[140px]" />

          <div className="container mx-auto px-5 sm:px-6 lg:px-12 text-center relative z-10">
            <FadeIn>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight mb-6">
                Ready to help more families find your agency?
              </h2>
              <p className="text-base sm:text-lg text-white/45 max-w-2xl mx-auto mb-10 leading-relaxed">
                Join agencies already using CareGrowth to create better content, train their teams,
                and respond to families with confidence.
              </p>
              <Link to="/login">
                <Button
                  size="lg"
                  className="bg-caregrowth-green text-white hover:bg-caregrowth-green/90 rounded-none px-12 h-14 text-sm tracking-widest font-semibold shadow-lg shadow-caregrowth-green/20"
                >
                  Get Started Free
                </Button>
              </Link>
              <p className="mt-5 text-white/30 text-xs tracking-wider">
                No credit card required. Cancel anytime.
              </p>
            </FadeIn>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default LandingPage;
