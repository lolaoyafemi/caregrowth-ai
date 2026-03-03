
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

  const linkClass = "text-[11px] text-luxury-spacing tracking-widest text-gray-500 hover:text-gray-900 transition-colors duration-300";

  return (
    <footer className="bg-gray-950 text-white">
      <div className="container mx-auto px-6 lg:px-12">
        {/* Thin top line */}
        <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

        <div className="py-20 grid grid-cols-1 md:grid-cols-4 gap-12">
          <div className="md:col-span-1">
            <h3 className="text-lg font-semibold tracking-[0.08em] mb-4">CareGrowth Assistant</h3>
            <p className="text-sm text-gray-400 leading-relaxed">
              Your AI-powered agency growth assistant.
            </p>
          </div>

          <div>
            <h4 className="text-luxury-spacing text-[11px] tracking-widest text-gray-400 mb-6">Product</h4>
            <ul className="space-y-3">
              <li>
                <button onClick={() => scrollToSection('features')} className="text-sm text-gray-400 hover:text-white transition-colors bg-transparent border-none p-0 cursor-pointer">
                  Features
                </button>
              </li>
              <li><Link to="/dashboard" className="text-sm text-gray-400 hover:text-white transition-colors">Dashboard</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-luxury-spacing text-[11px] tracking-widest text-gray-400 mb-6">Resources</h4>
            <ul className="space-y-3">
              <li><Link to="https://www.caregrowthassistant.com/docs" className="text-sm text-gray-400 hover:text-white transition-colors">Documentation</Link></li>
              <li>
                <SupportDialog>
                  <button className="text-sm text-gray-400 hover:text-white transition-colors bg-transparent border-none p-0">
                    Support
                  </button>
                </SupportDialog>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-luxury-spacing text-[11px] tracking-widest text-gray-400 mb-6">Company</h4>
            <ul className="space-y-3">
              <li><Link to="https://www.caregrowthassistant.com/about" className="text-sm text-gray-400 hover:text-white transition-colors">About</Link></li>
              <li>
                <ContactDialog>
                  <button className="text-sm text-gray-400 hover:text-white transition-colors bg-transparent border-none p-0">
                    Contact
                  </button>
                </ContactDialog>
              </li>
            </ul>
          </div>
        </div>

        <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

        <div className="py-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-xs text-gray-500 tracking-wider">
            &copy; {new Date().getFullYear()} CareGrowth Assistant. All rights reserved.
          </p>
          <div className="flex gap-6">
            <Link to="/privacy" className="text-xs text-gray-500 hover:text-white transition-colors tracking-wider">Privacy Policy</Link>
            <Link to="/terms" className="text-xs text-gray-500 hover:text-white transition-colors tracking-wider">Terms of Service</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
