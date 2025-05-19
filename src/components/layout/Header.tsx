
import React from 'react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

const Header = () => {
  return (
    <header className="border-b bg-white">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        <Link to="/" className="flex items-center gap-2">
          <h1 className="text-2xl font-bold text-caregrowth-blue">CareGrowthAI</h1>
        </Link>
        <div className="hidden md:flex items-center gap-6">
          <nav className="flex gap-6">
            <Link to="/#features" className="text-gray-600 hover:text-caregrowth-blue transition-colors">Features</Link>
            <Link to="/#how-it-works" className="text-gray-600 hover:text-caregrowth-blue transition-colors">How it Works</Link>
            <Link to="/#pricing" className="text-gray-600 hover:text-caregrowth-blue transition-colors">Pricing</Link>
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
