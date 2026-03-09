
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Link, useLocation } from 'react-router-dom';
import SupportDialog from '@/components/ui/SupportDialog';
import ContactDialog from '@/components/ui/ContactDialog';
import { Menu, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const Header = () => {
  const location = useLocation();
  const isOnLandingPage = location.pathname === '/';
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (sectionId: string) => {
    setMobileOpen(false);
    if (isOnLandingPage) {
      const element = document.getElementById(sectionId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    } else {
      window.location.href = `https://www.caregrowthassistant.com/#${sectionId}`;
    }
  };

  const navLinkClass = "text-[11px] font-medium tracking-[0.25em] uppercase transition-colors duration-500 bg-transparent border-none cursor-pointer";

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-700 ${
        scrolled
          ? 'bg-[hsl(220,20%,4%)]/95 backdrop-blur-2xl shadow-[0_1px_0_0_hsla(43,60%,55%,0.08)]'
          : 'bg-transparent'
      }`}
    >
      <div className="container mx-auto px-5 sm:px-6 lg:px-12">
        <div className="flex justify-between items-center h-16 sm:h-20">
          <Link to="/" className="flex items-center gap-3">
            <h1 className="text-base sm:text-lg font-semibold tracking-[0.1em] text-white transition-colors duration-500">
              CareGrowth Assistant
            </h1>
          </Link>

          <div className="hidden lg:flex items-center gap-10">
            <nav className="flex gap-8">
              {[
                { label: 'Features', action: () => scrollToSection('features') },
                { label: 'How it Works', action: () => scrollToSection('video') },
                { label: 'Pricing', action: () => scrollToSection('pricing') },
              ].map((item) => (
                <button
                  key={item.label}
                  onClick={item.action}
                  className={`${navLinkClass} text-white/50 hover:text-[hsl(43,60%,55%)]`}
                >
                  {item.label}
                </button>
              ))}
              <SupportDialog>
                <button className={`${navLinkClass} text-white/50 hover:text-[hsl(43,60%,55%)]`}>
                  Support
                </button>
              </SupportDialog>
              <ContactDialog>
                <button className={`${navLinkClass} text-white/50 hover:text-[hsl(43,60%,55%)]`}>
                  Contact
                </button>
              </ContactDialog>
            </nav>
            <Link to="/dashboard">
              <Button
                variant="outline"
                className="text-[11px] tracking-[0.25em] uppercase rounded-none border border-[hsl(43,60%,55%)]/30 text-[hsl(43,60%,55%)]/80 hover:bg-[hsl(43,60%,55%)]/10 hover:border-[hsl(43,60%,55%)]/50 px-6 py-2 h-auto transition-all duration-500"
              >
                Dashboard
              </Button>
            </Link>
          </div>

          <button
            className="lg:hidden p-2 text-white/70 hover:text-white transition-colors"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="lg:hidden bg-[hsl(220,20%,4%)]/98 backdrop-blur-2xl border-t border-white/[0.06] overflow-hidden"
          >
            <nav className="flex flex-col items-center px-6 py-8 gap-5">
              <button onClick={() => scrollToSection('features')} className="text-xs tracking-[0.2em] uppercase text-white/50 hover:text-[hsl(43,60%,55%)] py-2 transition-colors">Features</button>
              <button onClick={() => scrollToSection('video')} className="text-xs tracking-[0.2em] uppercase text-white/50 hover:text-[hsl(43,60%,55%)] py-2 transition-colors">How it Works</button>
              <button onClick={() => scrollToSection('pricing')} className="text-xs tracking-[0.2em] uppercase text-white/50 hover:text-[hsl(43,60%,55%)] py-2 transition-colors">Pricing</button>
              <SupportDialog><button className="text-xs tracking-[0.2em] uppercase text-white/50 hover:text-[hsl(43,60%,55%)] py-2 transition-colors">Support</button></SupportDialog>
              <ContactDialog><button className="text-xs tracking-[0.2em] uppercase text-white/50 hover:text-[hsl(43,60%,55%)] py-2 transition-colors">Contact</button></ContactDialog>
              <Link to="/dashboard" onClick={() => setMobileOpen(false)} className="w-full max-w-xs mt-3">
                <Button className="w-full bg-gradient-to-r from-[hsl(43,60%,48%)] to-[hsl(43,50%,40%)] text-white rounded-none h-12 text-[10px] tracking-[0.3em] uppercase font-semibold border-0">Dashboard</Button>
              </Link>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
};

export default Header;
