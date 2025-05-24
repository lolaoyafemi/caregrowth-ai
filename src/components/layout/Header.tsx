
import React from 'react';
import { Button } from '@/components/ui/button';
import { Link, useLocation } from 'react-router-dom';

const Header = () => {
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
      window.location.href = `/#${sectionId}`;
    }
  };

  return (
    <header className="border-b bg-white">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        <Link to="/" className="flex items-center gap-2">
          <h1 className="text-2xl font-bold text-caregrowth-blue">CareGrowthAI</h1>
        </Link>
        <div className="hidden md:flex items-center gap-6">
          <nav className="flex gap-6">
            <button 
              onClick={() => scrollToSection('features')} 
              className="text-gray-600 hover:text-caregrowth-blue transition-colors cursor-pointer bg-transparent border-none"
            >
              Features
            </button>
            <button 
              onClick={() => scrollToSection('video')} 
              className="text-gray-600 hover:text-caregrowth-blue transition-colors cursor-pointer bg-transparent border-none"
            >
              How it Works
            </button>
            <button 
              onClick={() => scrollToSection('pricing')} 
              className="text-gray-600 hover:text-caregrowth-blue transition-colors cursor-pointer bg-transparent border-none"
            >
              Pricing
            </button>
          </nav>
          <div className="flex items-center gap-4">
            <Link to="/dashboard">
              <Button variant="outline" className="border-caregrowth-blue text-caregrowth-blue">
                Dashboard
              </Button>
            </Link>
          </div>
        </div>
        <Button variant="outline" className="md:hidden">Menu</Button>
      </div>
    </header>
  );
};

export default Header;
