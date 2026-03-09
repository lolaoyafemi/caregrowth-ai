
import React from 'react';
import { useUser } from '@/contexts/UserContext';
import { Settings } from 'lucide-react';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import AccountSettings from '@/components/settings/AccountSettings';
import NotificationSettings from '@/components/settings/NotificationSettings';
import TeamPermissionsSection from '@/components/settings/TeamPermissionsSection';
import TokenLimitsSection from '@/components/settings/TokenLimitsSection';
import SubscriptionManager from '@/components/subscription/SubscriptionManager';

const SettingsPage = () => {
  const { user } = useUser();
  const isSuperAdmin = user?.role === 'super_admin';
  const isAgencyAdmin = user?.role === 'agency_admin';

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <Breadcrumb>
          <BreadcrumbList className="text-white/30">
            <BreadcrumbItem>
              <BreadcrumbLink href="/" className="text-white/40 hover:text-white/60">Home</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink href="/settings" className="text-white/40 hover:text-white/60">Settings</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage className="text-white/60">Platform Settings</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <h1 className="text-2xl font-bold mt-3 flex items-center text-white/90">
          <Settings className="mr-2 h-6 w-6" /> Settings
        </h1>
      </div>
      
      <div className="space-y-6">
        {!isSuperAdmin && <SubscriptionManager />}
        <AccountSettings />
        <NotificationSettings />
        <TeamPermissionsSection isVisible={isAgencyAdmin && !isSuperAdmin} />
        <TokenLimitsSection isVisible={isAgencyAdmin && !isSuperAdmin} />
      </div>
    </div>
  );
};

export default SettingsPage;
