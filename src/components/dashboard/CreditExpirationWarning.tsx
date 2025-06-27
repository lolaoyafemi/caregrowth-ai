
import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Clock, AlertTriangle } from 'lucide-react';
import { useUserCredits } from '@/hooks/useUserCredits';

const CreditExpirationWarning = () => {
  const { getExpirationInfo } = useUserCredits();
  const expirationInfo = getExpirationInfo();

  if (!expirationInfo || expirationInfo.isExpired) {
    return null;
  }

  if (expirationInfo.isExpiringSoon) {
    return (
      <Alert className="mb-4 border-orange-200 bg-orange-50">
        <AlertTriangle className="h-4 w-4 text-orange-600" />
        <AlertDescription className="text-orange-800">
          <strong>Credits expiring soon!</strong> Your credits will expire in {expirationInfo.daysUntilExpiry} day{expirationInfo.daysUntilExpiry !== 1 ? 's' : ''} 
          ({expirationInfo.expiresAt.toLocaleDateString()}).
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Alert className="mb-4 border-blue-200 bg-blue-50">
      <Clock className="h-4 w-4 text-blue-600" />
      <AlertDescription className="text-blue-800">
        Your credits expire on {expirationInfo.expiresAt.toLocaleDateString()} 
        ({expirationInfo.daysUntilExpiry} days remaining).
      </AlertDescription>
    </Alert>
  );
};

export default CreditExpirationWarning;
