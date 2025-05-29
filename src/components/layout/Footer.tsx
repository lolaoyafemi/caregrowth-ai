
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
      // If not on landing page, navigate to landing page with hash
      window.location.href = `https://www.spicymessaging.com/#${sectionId}`;
    }
  };

  return (
    <footer className="bg-gray-50 border-t">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <h3 className="text-xl font-bold text-caregrowth-blue mb-4">CareGrowthAI</h3>
            <p className="text-gray-600 mb-4">
              Your AI-powered agency growth assistant.
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-gray-900 mb-4">Product</h4>
            <ul className="space-y-2">
              <li>
                <button 
                  onClick={() => scrollToSection('features')} 
                  className="text-gray-600 hover:text-caregrowth-blue bg-transparent border-none p-0 text-left cursor-pointer"
                >
                  Features
                </button>
              </li>
              <li><Link to="/dashboard" className="text-gray-600 hover:text-caregrowth-blue">Dashboard</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-gray-900 mb-4">Resources</h4>
            <ul className="space-y-2">
              <li><Link to="https://www.spicymessaging.com/docs" className="text-gray-600 hover:text-caregrowth-blue">Documentation</Link></li>
              <li>
                <SupportDialog>
                  <button className="text-gray-600 hover:text-caregrowth-blue bg-transparent border-none p-0 text-left">
                    Support
                  </button>
                </SupportDialog>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-gray-900 mb-4">Company</h4>
            <ul className="space-y-2">
              <li><Link to="https://www.spicymessaging.com/about" className="text-gray-600 hover:text-caregrowth-blue">About</Link></li>
              <li>
                <ContactDialog>
                  <button className="text-gray-600 hover:text-caregrowth-blue bg-transparent border-none p-0 text-left">
                    Contact
                  </button>
                </ContactDialog>
              </li>
            </ul>
          </div>
        </div>
        <div className="border-t mt-8 pt-8 flex flex-col md:flex-row justify-between items-center">
          <p className="text-gray-600 mb-4 md:mb-0">
            &copy; {new Date().getFullYear()} CareGrowthAI. All rights reserved.
          </p>
          <div className="flex gap-4">
            <Link to="https://www.spicymessaging.com/privacy" className="text-gray-600 hover:text-caregrowth-blue">Privacy Policy</Link>
            <Link to="https://www.spicymessaging.com/terms" className="text-gray-600 hover:text-caregrowth-blue">Terms of Service</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
