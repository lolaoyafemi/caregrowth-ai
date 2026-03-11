
import React, { useState, useCallback, useEffect } from 'react';
import { useUser } from '@/contexts/UserContext';
import { Settings, Palette, Building2, Link2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import AccountSettings from '@/components/settings/AccountSettings';
import ThemeSelector from '@/components/settings/ThemeSelector';
import NotificationSettings from '@/components/settings/NotificationSettings';
import TeamPermissionsSection from '@/components/settings/TeamPermissionsSection';
import TokenLimitsSection from '@/components/settings/TokenLimitsSection';
import SubscriptionManager from '@/components/subscription/SubscriptionManager';
import BrandStyleSetup from '@/components/calendar/BrandStyleSetup';
import BusinessDetailsForm from '@/components/business/BusinessDetailsForm';
import ConnectAccountsPanel from '@/components/calendar/ConnectAccountsPanel';
import { useBrandStyle } from '@/hooks/useBrandStyle';
import { supabase } from '@/integrations/supabase/client';

const SettingsPage = () => {
  const { user } = useUser();
  const isSuperAdmin = user?.role === 'super_admin';
  const isAgencyAdmin = user?.role === 'agency_admin';

  const [showBrandSetup, setShowBrandSetup] = useState(false);
  const [showBusinessForm, setShowBusinessForm] = useState(false);
  const [connectOpen, setConnectOpen] = useState(false);
  const { brandStyle, saveBrandStyle } = useBrandStyle();

  const fetchConnectedAccounts = useCallback(async () => {
    try {
      await supabase
        .from('connected_accounts')
        .select('platform, is_connected')
        .eq('is_connected', true);
    } catch {}
  }, []);

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
        {/* Nora Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Palette size={18} /> Nora Configuration
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Configure your brand style, business details, and connected social accounts for content generation.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button
                variant="outline"
                onClick={() => setShowBrandSetup(true)}
                className="gap-2"
              >
                <Palette size={16} /> Brand Style
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowBusinessForm(true)}
                className="gap-2"
              >
                <Building2 size={16} /> Business Details
              </Button>
              <Button
                variant="outline"
                onClick={() => setConnectOpen(true)}
                className="gap-2"
              >
                <Link2 size={16} /> Connect Accounts
              </Button>
            </div>
          </CardContent>
        </Card>

        {!isSuperAdmin && <SubscriptionManager />}
        <AccountSettings />
        <ThemeSelector />
        <NotificationSettings />
        <TeamPermissionsSection isVisible={isAgencyAdmin && !isSuperAdmin} />
        <TokenLimitsSection isVisible={isAgencyAdmin && !isSuperAdmin} />
      </div>

      <BrandStyleSetup
        open={showBrandSetup}
        onOpenChange={setShowBrandSetup}
        onSave={saveBrandStyle}
        initialValues={brandStyle || undefined}
      />

      {showBusinessForm && (
        <BusinessDetailsForm onClose={() => setShowBusinessForm(false)} />
      )}

      <Dialog open={connectOpen} onOpenChange={(open) => { setConnectOpen(open); if (!open) fetchConnectedAccounts(); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Connect Your Social Accounts</DialogTitle>
          </DialogHeader>
          <ConnectAccountsPanel />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SettingsPage;
