import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X, MessageCircle, Bell } from 'lucide-react';

interface NotificationBannerProps {
  message: string;
  type?: 'info' | 'success' | 'warning';
  onDismiss?: () => void;
  showIcon?: boolean;
}

const NotificationBanner: React.FC<NotificationBannerProps> = ({ 
  message, 
  type = 'info', 
  onDismiss,
  showIcon = true 
}) => {
  const getBgColor = () => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-200';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200';
      default:
        return 'bg-blue-50 border-blue-200';
    }
  };

  const getTextColor = () => {
    switch (type) {
      case 'success':
        return 'text-green-800';
      case 'warning':
        return 'text-yellow-800';
      default:
        return 'text-blue-800';
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <MessageCircle className="h-5 w-5" />;
      case 'warning':
        return <Bell className="h-5 w-5" />;
      default:
        return <MessageCircle className="h-5 w-5" />;
    }
  };

  return (
    <Card className={`p-4 ${getBgColor()} animate-fade-in mb-4`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {showIcon && (
            <div className={getTextColor()}>
              {getIcon()}
            </div>
          )}
          <p className={`${getTextColor()} font-medium`}>
            {message}
          </p>
        </div>
        {onDismiss && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onDismiss}
            className={`${getTextColor()} hover:bg-white/50`}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </Card>
  );
};

export default NotificationBanner;