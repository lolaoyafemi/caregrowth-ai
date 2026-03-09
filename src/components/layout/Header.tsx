
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
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled
          ? 'bg-white/90 backdrop-blur-xl shadow-[0_1px_0_0_rgba(0,0,0,0.05)]'
          : 'bg-transparent'
      }`}
    >
      <div className="container mx-auto px-5 sm:px-6 lg:px-12">
        <div className="flex justify-between items-center h-16 sm:h-20">
          <Link to="/" className="flex items-center gap-3">
            <h1 className={`text-base sm:text-lg font-semibold tracking-[0.08em] transition-colors duration-500 ${
              scrolled ? 'text-gray-900' : 'text-white'
            }`}>
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
                  className={`${navLinkClass} ${scrolled ? 'text-gray-600 hover:text-gray-900' : 'text-white/80 hover:text-white'}`}
                >
                  {item.label}
                </button>
              ))}
              <SupportDialog>
                <button className={`${navLinkClass} ${scrolled ? 'text-gray-600 hover:text-gray-900' : 'text-white/80 hover:text-white'}`}>
                  Support
                </button>
              </SupportDialog>
              <ContactDialog>
                <button className={`${navLinkClass} ${scrolled ? 'text-gray-600 hover:text-gray-900' : 'text-white/80 hover:text-white'}`}>
                  Contact
                </button>
              </ContactDialog>
            </nav>
            <Link to="/dashboard">
              <Button
                variant="outline"
                className={`text-luxury-spacing text-[11px] tracking-widest rounded-none border px-6 py-2 h-auto transition-all duration-300 ${
                  scrolled
                    ? 'border-gray-900 text-gray-900 hover:bg-gray-900 hover:text-white'
                    : 'border-white/60 text-white hover:bg-white hover:text-gray-900'
                }`}
              >
                Dashboard
              </Button>
            </Link>
          </div>

          <button
            className={`lg:hidden p-2 transition-colors ${scrolled ? 'text-gray-900' : 'text-white'}`}
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
            className="lg:hidden bg-white border-t border-gray-100 overflow-hidden"
          >
            <nav className="flex flex-col items-center px-6 py-6 gap-4">
              <button onClick={() => scrollToSection('features')} className="text-sm text-gray-700 hover:text-gray-900 py-2">Features</button>
              <button onClick={() => scrollToSection('video')} className="text-sm text-gray-700 hover:text-gray-900 py-2">How it Works</button>
              <button onClick={() => scrollToSection('pricing')} className="text-sm text-gray-700 hover:text-gray-900 py-2">Pricing</button>
              <SupportDialog><button className="text-sm text-gray-700 hover:text-gray-900 py-2">Support</button></SupportDialog>
              <ContactDialog><button className="text-sm text-gray-700 hover:text-gray-900 py-2">Contact</button></ContactDialog>
              <Link to="/dashboard" onClick={() => setMobileOpen(false)} className="w-full max-w-xs mt-2">
                <Button className="w-full bg-caregrowth-blue rounded-none">Dashboard</Button>
              </Link>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
};

export default Header;
