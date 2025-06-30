
import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X, MessageCircle } from 'lucide-react';

interface FeelingStuckPopupProps {
  onClose: () => void;
  onContactSue: () => void;
}

const FeelingStuckPopup: React.FC<FeelingStuckPopupProps> = ({ onClose, onContactSue }) => {
  return (
    <div className="fixed bottom-4 left-4 z-50 animate-slide-in-left">
      <Card className="p-4 bg-white border shadow-lg max-w-sm">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-caregrowth-blue" />
            <h3 className="font-semibold text-gray-900">Feeling stuck?</h3>
          </div>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        
        <p className="text-sm text-gray-600 mb-4">
          Need help with your questions? Sue is here to assist you personally!
        </p>
        
        <div className="flex gap-2">
          <Button 
            onClick={onContactSue}
            className="bg-caregrowth-blue hover:bg-caregrowth-blue/90 text-white flex-1"
            size="sm"
          >
            Ask Sue
          </Button>
          <Button 
            onClick={onClose}
            variant="outline"
            size="sm"
          >
            Maybe later
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default FeelingStuckPopup;
