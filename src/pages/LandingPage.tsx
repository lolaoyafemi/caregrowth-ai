
import React, { useRef } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import {
  ArrowRight, Building2, Eye, MessageCircle,
  CalendarDays, FileText, Sparkles, ChevronDown,
} from 'lucide-react';
import { motion, useInView, useScroll, useTransform } from 'framer-motion';

/* ------------------------------------------------------------------ */
/*  Reusable reveal                                                    */
/* ------------------------------------------------------------------ */
const Reveal = ({ children, className = '', delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 50 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 1, delay, ease: [0.16, 1, 0.3, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

/* ------------------------------------------------------------------ */
/*  Horizontal rule accent                                             */
/* ------------------------------------------------------------------ */
const LuxuryDivider = () => (
  <div className="relative py-1">
    <div className="h-px bg-gradient-to-r from-transparent via-[hsl(43,60%,55%)] to-transparent opacity-40" />
  </div>
);

/* ------------------------------------------------------------------ */
/*  Landing page                                                       */
/* ------------------------------------------------------------------ */
const LandingPage = () => {
  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
  const heroY = useTransform(scrollYProgress, [0, 1], ['0%', '20%']);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  /* Pillar data */
  const pillars = [
    {
      num: 'I',
      icon: <Building2 className="h-5 w-5" />,
      title: 'Build Your Agency Foundation',
      description: 'Complete your agency profile and onboarding so CareGrowth can generate guidance and content tailored to your services.',
      details: ['Complete agency profile', 'Upload agency documents', 'Continue onboarding training'],
      cta: 'Continue Setup',
      link: '/dashboard/agency-setup',
    },
    {
      num: 'II',
      icon: <Eye className="h-5 w-5" />,
      title: 'Stay Visible to Families',
      description: 'Generate and schedule helpful posts that show families how your agency can support them.',
      details: ['Generate social media posts in seconds', 'Schedule content across platforms', 'Track what resonates with families'],
      cta: 'Generate Posts',
      secondaryCta: 'Calendar',
      link: '/dashboard/social-media',
      secondaryLink: '/dashboard/content-calendar',
    },
    {
      num: 'III',
      icon: <MessageCircle className="h-5 w-5" />,
      title: 'Ask Jared',
      description: 'Your home care assistant trained on agency knowledge and documents. Get answers, not searches.',
      prompts: [
        'How should I respond to a family asking about dementia care?',
        'What content should I post this week?',
        'How do I handle hospital discharge inquiries?',
      ],
      cta: 'Start Conversation',
      link: '/dashboard/qa-assistant',
    },
  ];

  const insights = [
    { icon: <CalendarDays className="h-4 w-4" />, label: 'Content Opportunity', text: 'Families search for "fall prevention tips" more this time of year. A timely post could help them find you.' },
    { icon: <Sparkles className="h-4 w-4" />, label: 'Training Reminder', text: 'Practice responding to hospital discharge calls so your team feels confident when families reach out.' },
    { icon: <FileText className="h-4 w-4" />, label: 'Family Care Trend', text: 'More families are asking about overnight care options. Consider highlighting your availability.' },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[hsl(220,20%,4%)] scroll-smooth selection:bg-[hsl(43,60%,55%)]/30 selection:text-white">
      <Header />

      <main className="flex-grow">

        {/* ════════════════════════════════════════════════════════════ */}
        {/*  HERO — Cinematic full-bleed, parallax, dramatic type      */}
        {/* ════════════════════════════════════════════════════════════ */}
        <section ref={heroRef} className="relative min-h-screen flex items-center justify-center overflow-hidden">
          {/* Layered background */}
          <div className="absolute inset-0 bg-gradient-to-b from-[hsl(220,20%,4%)] via-[hsl(222,25%,7%)] to-[hsl(220,20%,4%)]" />

          {/* Animated orbs */}
          <motion.div
            className="absolute top-1/4 left-1/4 w-[600px] h-[600px] rounded-full"
            style={{
              background: 'radial-gradient(circle, hsla(43,60%,55%,0.08) 0%, transparent 70%)',
              y: heroY,
            }}
          />
          <motion.div
            className="absolute bottom-1/4 right-1/6 w-[500px] h-[500px] rounded-full"
            style={{
              background: 'radial-gradient(circle, hsla(104,71%,34%,0.06) 0%, transparent 70%)',
              y: heroY,
            }}
          />

          {/* Subtle grid texture */}
          <div className="absolute inset-0 opacity-[0.025]" style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.4) 1px, transparent 1px)',
            backgroundSize: '100px 100px',
          }} />

          {/* Horizontal accent lines */}
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[hsl(43,60%,55%)]/20 to-transparent" />

          <motion.div
            style={{ opacity: heroOpacity }}
            className="container mx-auto px-5 sm:px-6 lg:px-16 relative z-10 text-center"
          >
            {/* Eyebrow */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.8 }}
              className="mb-8"
            >
              <span className="inline-block text-[10px] sm:text-[11px] tracking-[0.4em] uppercase text-[hsl(43,60%,55%)]/70 font-medium border border-[hsl(43,60%,55%)]/15 px-6 py-2">
                Agency Command Center
              </span>
            </motion.div>

            {/* Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 1, ease: [0.16, 1, 0.3, 1] }}
              className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold text-white leading-[1.02] tracking-[-0.03em] mb-8"
            >
              Your Agency.
              <br />
              <span className="bg-gradient-to-r from-[hsl(43,60%,55%)] via-[hsl(43,50%,70%)] to-[hsl(43,60%,55%)] bg-clip-text text-transparent">
                Elevated.
              </span>
            </motion.h1>

            {/* Subline */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8, duration: 0.8 }}
              className="text-base sm:text-lg md:text-xl text-white/40 leading-relaxed max-w-2xl mx-auto mb-12 font-light"
            >
              Everything you need to grow your home care agency in one place.
              Set up your foundation, stay visible to families, and get expert guidance whenever you need it.
            </motion.p>

            {/* CTA cluster */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.1, duration: 0.8 }}
              className="flex flex-col sm:flex-row gap-4 justify-center items-center"
            >
              <Link to="/login">
                <Button
                  size="lg"
                  className="bg-gradient-to-r from-[hsl(43,60%,48%)] to-[hsl(43,50%,40%)] text-white hover:from-[hsl(43,60%,52%)] hover:to-[hsl(43,50%,44%)] rounded-none px-12 h-14 text-[11px] tracking-[0.35em] uppercase font-semibold transition-all duration-500 shadow-[0_0_40px_hsla(43,60%,55%,0.15)] hover:shadow-[0_0_60px_hsla(43,60%,55%,0.25)] group border-0"
                >
                  Enter CareGrowth
                  <ArrowRight size={14} className="ml-3 group-hover:translate-x-1.5 transition-transform duration-300" />
                </Button>
              </Link>
              <Button
                size="lg"
                variant="outline"
                className="border-white/10 text-white/70 bg-white/[0.02] hover:bg-white/[0.06] hover:border-white/20 rounded-none px-12 h-14 text-[11px] tracking-[0.35em] uppercase font-semibold backdrop-blur-sm transition-all duration-500"
                onClick={() => document.getElementById('pillars')?.scrollIntoView({ behavior: 'smooth' })}
              >
                Explore
              </Button>
            </motion.div>
          </motion.div>

          {/* Scroll indicator */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 2, duration: 1 }}
            className="absolute bottom-10 left-1/2 -translate-x-1/2 z-10"
          >
            <motion.div
              animate={{ y: [0, 8, 0] }}
              transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
            >
              <ChevronDown className="h-5 w-5 text-white/20" />
            </motion.div>
          </motion.div>

          {/* Bottom fade */}
          <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-[hsl(220,20%,4%)] to-transparent" />
        </section>

        <LuxuryDivider />

        {/* ════════════════════════════════════════════════════════════ */}
        {/*  THREE PILLARS — Editorial luxury grid                     */}
        {/* ════════════════════════════════════════════════════════════ */}
        <section id="pillars" className="py-28 sm:py-36 bg-[hsl(220,20%,4%)] relative overflow-hidden">
          {/* Ambient light */}
          <div className="absolute top-0 right-0 w-[700px] h-[700px] bg-[hsl(43,60%,55%)]/[0.03] rounded-full blur-[200px]" />
          <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-caregrowth-green/[0.03] rounded-full blur-[180px]" />

          <div className="container mx-auto px-5 sm:px-6 lg:px-16 relative z-10">
            <Reveal className="text-center mb-20 sm:mb-28">
              <p className="text-[10px] sm:text-[11px] tracking-[0.4em] uppercase text-[hsl(43,60%,55%)]/60 font-medium mb-5">The Suite</p>
              <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white tracking-[-0.02em] mb-5">
                Three pillars of growth
              </h2>
              <p className="text-base sm:text-lg text-white/35 max-w-xl mx-auto font-light leading-relaxed">
                We built CareGrowth around the three actions that actually move your agency forward.
              </p>
            </Reveal>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-[1px] bg-white/[0.06] overflow-hidden">
              {pillars.map((pillar, i) => (
                <Reveal key={pillar.title} delay={i * 0.15}>
                  <div className="bg-[hsl(220,20%,5%)] p-8 sm:p-10 lg:p-12 h-full flex flex-col group hover:bg-[hsl(220,18%,7%)] transition-all duration-700 relative overflow-hidden">
                    {/* Hover glow */}
                    <div className="absolute inset-0 bg-gradient-to-b from-[hsl(43,60%,55%)]/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

                    <div className="relative z-10 flex flex-col h-full">
                      {/* Numeral */}
                      <span className="text-[hsl(43,60%,55%)]/30 text-6xl sm:text-7xl font-extralight tracking-tight absolute top-0 right-0 leading-none select-none">
                        {pillar.num}
                      </span>

                      {/* Icon */}
                      <div className="w-10 h-10 rounded-none border border-[hsl(43,60%,55%)]/20 flex items-center justify-center text-[hsl(43,60%,55%)]/80 mb-8 group-hover:border-[hsl(43,60%,55%)]/40 transition-colors duration-500">
                        {pillar.icon}
                      </div>

                      {/* Title */}
                      <h3 className="text-xl sm:text-2xl font-semibold text-white tracking-tight mb-4 leading-tight">
                        {pillar.title}
                      </h3>
                      <p className="text-sm text-white/35 leading-relaxed mb-8 font-light">
                        {pillar.description}
                      </p>

                      {/* Details */}
                      {pillar.details && (
                        <ul className="space-y-3 mb-10 flex-1">
                          {pillar.details.map((d) => (
                            <li key={d} className="flex items-center gap-3 text-xs text-white/45">
                              <span className="w-1 h-1 rounded-full bg-[hsl(43,60%,55%)]/60 shrink-0" />
                              <span className="font-light">{d}</span>
                            </li>
                          ))}
                        </ul>
                      )}

                      {/* Prompts */}
                      {pillar.prompts && (
                        <div className="space-y-2.5 mb-10 flex-1">
                          {pillar.prompts.map((p) => (
                            <div
                              key={p}
                              className="border border-white/[0.05] bg-white/[0.02] px-4 py-3 text-xs text-white/40 leading-relaxed font-light hover:bg-white/[0.04] hover:border-white/[0.08] transition-all duration-300 cursor-default"
                            >
                              "{p}"
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Buttons */}
                      <div className="flex gap-3 mt-auto">
                        <Link to={pillar.link} className={pillar.secondaryCta ? 'flex-1' : 'w-full'}>
                          <Button className="w-full bg-gradient-to-r from-[hsl(43,60%,48%)] to-[hsl(43,50%,40%)] text-white rounded-none h-12 text-[10px] tracking-[0.3em] uppercase font-semibold hover:from-[hsl(43,60%,52%)] hover:to-[hsl(43,50%,44%)] transition-all duration-500 shadow-[0_4px_20px_hsla(43,60%,55%,0.1)] border-0">
                            {pillar.cta}
                          </Button>
                        </Link>
                        {pillar.secondaryCta && pillar.secondaryLink && (
                          <Link to={pillar.secondaryLink} className="flex-1">
                            <Button
                              variant="outline"
                              className="w-full border-white/10 text-white/60 bg-transparent hover:bg-white/[0.04] hover:border-white/20 rounded-none h-12 text-[10px] tracking-[0.3em] uppercase font-semibold gap-2 transition-all duration-500"
                            >
                              <CalendarDays className="h-3.5 w-3.5" />
                              {pillar.secondaryCta}
                            </Button>
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        <LuxuryDivider />

        {/* ════════════════════════════════════════════════════════════ */}
        {/*  TODAY'S INSIGHTS — Refined editorial cards                 */}
        {/* ════════════════════════════════════════════════════════════ */}
        <section id="features" className="py-28 sm:py-36 bg-[hsl(220,20%,4%)] relative overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[hsl(43,60%,55%)]/[0.02] rounded-full blur-[200px]" />

          <div className="container mx-auto px-5 sm:px-6 lg:px-16 relative z-10">
            <Reveal className="text-center mb-16 sm:mb-24">
              <p className="text-[10px] sm:text-[11px] tracking-[0.4em] uppercase text-[hsl(43,60%,55%)]/60 font-medium mb-5">Intelligence</p>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white tracking-[-0.02em] mb-5">
                Today's Insights
              </h2>
              <p className="text-base sm:text-lg text-white/35 max-w-xl mx-auto font-light leading-relaxed">
                Quick suggestions to help you connect with the families who need you most.
              </p>
            </Reveal>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {insights.map((insight, i) => (
                <Reveal key={insight.label} delay={i * 0.12}>
                  <div className="group border border-white/[0.06] bg-white/[0.02] p-8 hover:border-[hsl(43,60%,55%)]/15 hover:bg-white/[0.03] transition-all duration-700 h-full flex flex-col relative overflow-hidden">
                    {/* Top accent line */}
                    <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[hsl(43,60%,55%)]/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

                    <div className="flex items-center gap-3 mb-5">
                      <span className="text-[hsl(43,60%,55%)]/70">{insight.icon}</span>
                      <span className="text-[9px] tracking-[0.3em] text-[hsl(43,60%,55%)]/50 uppercase font-medium">
                        {insight.label}
                      </span>
                    </div>
                    <p className="text-sm text-white/40 leading-relaxed flex-1 font-light">
                      {insight.text}
                    </p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        <LuxuryDivider />

        {/* ════════════════════════════════════════════════════════════ */}
        {/*  HOW IT WORKS — Cinematic numbered steps                   */}
        {/* ════════════════════════════════════════════════════════════ */}
        <section id="video" className="py-28 sm:py-36 bg-[hsl(222,25%,6%)] relative overflow-hidden">
          <div className="container mx-auto px-5 sm:px-6 lg:px-16 relative z-10">
            <Reveal className="text-center mb-20 sm:mb-28">
              <p className="text-[10px] sm:text-[11px] tracking-[0.4em] uppercase text-[hsl(43,60%,55%)]/60 font-medium mb-5">The Process</p>
              <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white tracking-[-0.02em] mb-5">
                Up and running in minutes
              </h2>
              <p className="text-base sm:text-lg text-white/35 max-w-xl mx-auto font-light leading-relaxed">
                No complicated setup. Just log in, tell us about your agency, and start growing.
              </p>
            </Reveal>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-0 max-w-5xl mx-auto relative">
              {/* Connecting line */}
              <div className="hidden md:block absolute top-16 left-[16.67%] right-[16.67%] h-px bg-gradient-to-r from-[hsl(43,60%,55%)]/10 via-[hsl(43,60%,55%)]/20 to-[hsl(43,60%,55%)]/10" />

              {[
                { num: '01', title: 'Set Up Your Profile', desc: 'Tell us about your agency, your services, and the families you serve.' },
                { num: '02', title: 'Create Your First Post', desc: 'Generate helpful content that shows families why your agency stands out.' },
                { num: '03', title: 'Ask a Question', desc: 'Get guidance on real situations your team faces every day.' },
              ].map((step, i) => (
                <Reveal key={step.num} delay={i * 0.15} className="text-center px-6 py-8 relative">
                  <div className="w-20 h-20 mx-auto mb-8 flex items-center justify-center relative z-10 border border-[hsl(43,60%,55%)]/20 bg-[hsl(220,20%,4%)]">
                    <span className="text-lg font-light tracking-[0.2em] text-[hsl(43,60%,55%)]/80">{step.num}</span>
                  </div>
                  <h3 className="text-lg sm:text-xl font-semibold text-white mb-3 tracking-tight">{step.title}</h3>
                  <p className="text-sm text-white/35 leading-relaxed max-w-xs mx-auto font-light">{step.desc}</p>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        <LuxuryDivider />

        {/* ════════════════════════════════════════════════════════════ */}
        {/*  PRICING — Monolithic card                                 */}
        {/* ════════════════════════════════════════════════════════════ */}
        <section id="pricing" className="py-28 sm:py-36 bg-[hsl(220,20%,4%)] relative overflow-hidden">
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-[hsl(43,60%,55%)]/[0.03] rounded-full blur-[180px]" />

          <div className="container mx-auto px-5 sm:px-6 lg:px-16 relative z-10">
            <Reveal className="text-center mb-16 sm:mb-24">
              <p className="text-[10px] sm:text-[11px] tracking-[0.4em] uppercase text-[hsl(43,60%,55%)]/60 font-medium mb-5">Investment</p>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white tracking-[-0.02em]">
                Simple, transparent pricing
              </h2>
            </Reveal>

            <Reveal className="flex justify-center max-w-lg mx-auto" delay={0.15}>
              <div className="w-full border border-white/[0.08] bg-white/[0.02] overflow-hidden relative group hover:border-[hsl(43,60%,55%)]/15 transition-all duration-700">
                {/* Gold accent top */}
                <div className="h-px bg-gradient-to-r from-transparent via-[hsl(43,60%,55%)]/50 to-transparent" />
                <div className="bg-gradient-to-r from-[hsl(43,60%,48%)] to-[hsl(43,50%,40%)] text-white text-center py-3.5">
                  <p className="text-[10px] tracking-[0.4em] uppercase font-medium">Complete Solution</p>
                </div>

                <div className="p-8 sm:p-12">
                  <h3 className="text-xl font-semibold text-white text-center mb-8 tracking-tight">CareGrowth Assistant Credits</h3>
                  <div className="mb-2 text-center">
                    <span className="text-6xl sm:text-7xl font-extralight tracking-tight text-white">$49</span>
                    <span className="text-white/30 ml-2 text-sm font-light">/month</span>
                  </div>
                  <p className="text-center text-xs text-white/25 mb-10 tracking-wider font-light">Monthly subscription</p>

                  <div className="h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent mb-10" />

                  <ul className="space-y-4 mb-10">
                    {['1,000 Social Media Posts', 'Unlimited Documents', 'Unlimited Q&A Queries', 'Priority Support', 'Advanced Analytics', 'Custom Integrations'].map((f) => (
                      <li key={f} className="flex items-center gap-3">
                        <span className="w-1 h-1 rounded-full bg-[hsl(43,60%,55%)]/60" />
                        <span className="text-sm text-white/50 font-light">{f}</span>
                      </li>
                    ))}
                  </ul>

                  <Link to="/login">
                    <Button className="w-full bg-gradient-to-r from-[hsl(43,60%,48%)] to-[hsl(43,50%,40%)] text-white rounded-none h-14 text-[10px] tracking-[0.35em] uppercase font-semibold hover:from-[hsl(43,60%,52%)] hover:to-[hsl(43,50%,44%)] transition-all duration-500 shadow-[0_4px_30px_hsla(43,60%,55%,0.12)] border-0">
                      Get Started Now
                    </Button>
                  </Link>
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        <LuxuryDivider />

        {/* ════════════════════════════════════════════════════════════ */}
        {/*  FINAL CTA — Dramatic close                                */}
        {/* ════════════════════════════════════════════════════════════ */}
        <section className="py-32 sm:py-44 bg-[hsl(220,20%,4%)] text-white relative overflow-hidden">
          {/* Grid texture */}
          <div className="absolute inset-0 opacity-[0.02]" style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.4) 1px, transparent 1px)',
            backgroundSize: '80px 80px',
          }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-[hsl(43,60%,55%)]/[0.04] rounded-full blur-[200px]" />

          <div className="container mx-auto px-5 sm:px-6 lg:px-16 text-center relative z-10">
            <Reveal>
              <p className="text-[10px] sm:text-[11px] tracking-[0.4em] uppercase text-[hsl(43,60%,55%)]/50 font-medium mb-8">Start Today</p>
              <h2 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-[-0.02em] mb-8 leading-[1.05]">
                Ready to help more families
                <br />
                <span className="bg-gradient-to-r from-[hsl(43,60%,55%)] via-[hsl(43,50%,70%)] to-[hsl(43,60%,55%)] bg-clip-text text-transparent">
                  find your agency?
                </span>
              </h2>
              <p className="text-base sm:text-lg text-white/35 max-w-2xl mx-auto mb-14 leading-relaxed font-light">
                Join agencies already using CareGrowth to create better content, train their teams,
                and respond to families with confidence.
              </p>
              <Link to="/login">
                <Button
                  size="lg"
                  className="bg-gradient-to-r from-[hsl(43,60%,48%)] to-[hsl(43,50%,40%)] text-white hover:from-[hsl(43,60%,52%)] hover:to-[hsl(43,50%,44%)] rounded-none px-14 h-16 text-[11px] tracking-[0.35em] uppercase font-semibold shadow-[0_0_50px_hsla(43,60%,55%,0.15)] hover:shadow-[0_0_70px_hsla(43,60%,55%,0.25)] transition-all duration-500 border-0"
                >
                  Enter CareGrowth
                </Button>
              </Link>
              <p className="mt-8 text-white/20 text-xs tracking-[0.2em] font-light">
                No credit card required. Cancel anytime.
              </p>
            </Reveal>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default LandingPage;
