
import { Link } from 'react-router-dom';
import SupportDialog from '@/components/ui/SupportDialog';
import ContactDialog from '@/components/ui/ContactDialog';

const Footer = () => {
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
              <li><Link to="/#features" className="text-gray-600 hover:text-caregrowth-blue">Features</Link></li>
              <li><Link to="/dashboard" className="text-gray-600 hover:text-caregrowth-blue">Dashboard</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-gray-900 mb-4">Resources</h4>
            <ul className="space-y-2">
              <li><Link to="#" className="text-gray-600 hover:text-caregrowth-blue">Documentation</Link></li>
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
              <li><Link to="#" className="text-gray-600 hover:text-caregrowth-blue">About</Link></li>
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
            <Link to="#" className="text-gray-600 hover:text-caregrowth-blue">Privacy Policy</Link>
            <Link to="#" className="text-gray-600 hover:text-caregrowth-blue">Terms of Service</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
