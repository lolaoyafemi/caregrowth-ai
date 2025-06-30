
import React from 'react';
import { Button } from '@/components/ui/button';

interface QAHeaderProps {
  credits: number;
  creditsLoading: boolean;
}

const QAHeader: React.FC<QAHeaderProps> = ({ credits, creditsLoading }) => {
  return (
    <div className="mb-8">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Ask Jared</h1>
          <p className="text-gray-600 mt-2">Get instant answers to your agency and marketing questions powered by your documents and AI expertise.</p>
          <p className="text-sm text-gray-500 mt-1">Cost: 1 credit per question</p>
          {!creditsLoading && (
            <div className="mt-2">
              <span className={`text-sm font-medium ${credits > 0 ? 'text-green-600' : 'text-red-600'}`}>
                Available Credits: {credits}
              </span>
              {credits <= 0 && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="ml-2"
                  onClick={() => window.open('/payment', '_blank')}
                >
                  Buy Credits
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default QAHeader;
