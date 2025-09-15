import React from 'react';
import NotificationBanner from '@/components/ui/NotificationBanner';
import { useSupportNotifications } from '@/hooks/useSupportNotifications';

const SupportNotificationListener: React.FC = () => {
  const { showBanner, notifications, dismissBanner } = useSupportNotifications();

  if (!showBanner) return null;

  const count = notifications.newMessageCount;
  const message = count > 1
    ? `${count} new support messages`
    : 'New support message received';

  return (
    <div className="px-4 pt-4">
      <NotificationBanner
        message={`${message}. Go to Help & Support to view.`}
        type="warning"
        onDismiss={dismissBanner}
        showIcon
      />
    </div>
  );
};

export default SupportNotificationListener;
