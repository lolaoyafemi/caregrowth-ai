
import { Link, useLocation } from 'react-router-dom';
import SupportDialog from '@/components/ui/SupportDialog';
import ContactDialog from '@/components/ui/ContactDialog';

const Footer = () => {
  const location = useLocation();
  const isOnLandingPage = location.pathname === '/';

  const scrollToSection = (sectionId: string) => {
    if (isOnLandingPage) {
      const element = document.getElementById(sectionId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    } else {
      window.location.href = `https://www.caregrowthassistant.com/#${sectionId}`;
    }
  };

  const linkClass = "text-xs text-white/30 hover:text-caregrowth-green/80 transition-colors duration-500 font-light";

  return (
    <footer className="bg-[hsl(222,47%,6%)] text-white">
      <div className="container mx-auto px-5 sm:px-6 lg:px-16">
        {/* Accent top line */}
        <div className="h-px bg-gradient-to-r from-transparent via-caregrowth-green/20 to-transparent" />

        <div className="py-16 sm:py-24 grid grid-cols-2 md:grid-cols-4 gap-10 sm:gap-14">
          <div className="col-span-2 md:col-span-1">
            <h3 className="text-base font-semibold tracking-[0.1em] mb-4 text-white">CareGrowth Assistant</h3>
            <p className="text-xs text-white/25 leading-relaxed font-light">
              Your AI-powered agency growth assistant.
            </p>
          </div>

          <div>
            <h4 className="text-[10px] tracking-[0.35em] uppercase text-caregrowth-green/40 font-medium mb-6">Product</h4>
            <ul className="space-y-3">
              <li>
                <button onClick={() => scrollToSection('features')} className={`${linkClass} bg-transparent border-none p-0 cursor-pointer`}>
                  Features
                </button>
              </li>
              <li><Link to="/dashboard" className={linkClass}>Dashboard</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-[10px] tracking-[0.35em] uppercase text-caregrowth-green/40 font-medium mb-6">Resources</h4>
            <ul className="space-y-3">
              <li><Link to="https://www.caregrowthassistant.com/docs" className={linkClass}>Documentation</Link></li>
              <li>
                <SupportDialog>
                  <button className={`${linkClass} bg-transparent border-none p-0`}>
                    Support
                  </button>
                </SupportDialog>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-[10px] tracking-[0.35em] uppercase text-caregrowth-green/40 font-medium mb-6">Company</h4>
            <ul className="space-y-3">
              <li><Link to="https://www.caregrowthassistant.com/about" className={linkClass}>About</Link></li>
              <li>
                <ContactDialog>
                  <button className={`${linkClass} bg-transparent border-none p-0`}>
                    Contact
                  </button>
                </ContactDialog>
              </li>
            </ul>
          </div>
        </div>

        <div className="h-px bg-gradient-to-r from-transparent via-white/[0.05] to-transparent" />

        <div className="py-8 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-[10px] text-white/20 tracking-[0.15em] font-light">
            &copy; {new Date().getFullYear()} CareGrowth Assistant. All rights reserved.
          </p>
          <div className="flex gap-6">
            <Link to="/privacy" className="text-[10px] text-white/20 hover:text-caregrowth-green/60 transition-colors duration-500 tracking-[0.15em] font-light">Privacy Policy</Link>
            <Link to="/terms" className="text-[10px] text-white/20 hover:text-caregrowth-green/60 transition-colors duration-500 tracking-[0.15em] font-light">Terms of Service</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
