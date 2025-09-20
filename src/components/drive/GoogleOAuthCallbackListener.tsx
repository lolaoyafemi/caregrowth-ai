import React from 'react';
import { useGoogleDriveConnection } from '@/hooks/useGoogleDriveConnection';

// Listens for Google OAuth callback query params on all routes and processes them.
const GoogleOAuthCallbackListener: React.FC = () => {
  useGoogleDriveConnection();
  return null; // No UI needed
};

export default GoogleOAuthCallbackListener;
