import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Facebook, Instagram, Linkedin, Twitter, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { useSearchParams } from 'react-router-dom';

interface ConnectedAccount {
  id: string;
  platform: string;
  account_name: string | null;
  is_connected: boolean;
  connected_at: string | null;
  platform_account_name: string | null;
  token_expires_at: string | null;
  error_message: string | null;
}

const PLATFORMS = [
  { key: 'linkedin', label: 'LinkedIn', icon: Linkedin, color: 'text-blue-700', bgColor: 'bg-blue-50 border-blue-200', supported: true },
  { key: 'facebook', label: 'Facebook', icon: Facebook, color: 'text-blue-600', bgColor: 'bg-blue-50 border-blue-200', supported: false },
  { key: 'instagram', label: 'Instagram', icon: Instagram, color: 'text-pink-600', bgColor: 'bg-pink-50 border-pink-200', supported: false },
  { key: 'x', label: 'X (Twitter)', icon: Twitter, color: 'text-gray-900', bgColor: 'bg-gray-50 border-gray-200', supported: false },
];

const ConnectAccountsPanel = () => {
  const [accounts, setAccounts] = useState<ConnectedAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    fetchAccounts();
  }, []);

  // Handle OAuth redirect results
  useEffect(() => {
    const success = searchParams.get('oauth_success');
    const error = searchParams.get('oauth_error');

    if (success) {
      toast.success(`${success.charAt(0).toUpperCase() + success.slice(1)} connected successfully!`);
      searchParams.delete('oauth_success');
      setSearchParams(searchParams, { replace: true });
      fetchAccounts();
    }
    if (error) {
      toast.error(`OAuth error: ${error.replace(/_/g, ' ')}`);
      searchParams.delete('oauth_error');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams]);

  const fetchAccounts = async () => {
    try {
      const { data, error } = await supabase
        .from('connected_accounts')
        .select('*');

      if (error) throw error;
      setAccounts((data as ConnectedAccount[]) || []);
    } catch (err) {
      console.error('Error fetching accounts:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async (platform: string) => {
    setConnecting(platform);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;
      if (!userId) throw new Error('Not authenticated');

      const { data, error } = await supabase.functions.invoke('social-oauth-start', {
        body: { platform, user_id: userId },
      });

      if (error) throw error;
      if (data?.auth_url) {
        window.location.href = data.auth_url;
      } else {
        throw new Error('No authorization URL returned');
      }
    } catch (err: any) {
      toast.error('Connection failed: ' + err.message);
      setConnecting(null);
    }
  };

  const handleDisconnect = async (platform: string) => {
    try {
      const account = accounts.find(a => a.platform === platform);
      if (!account) return;

      const { error } = await supabase
        .from('connected_accounts')
        .update({
          is_connected: false,
          access_token: null,
          refresh_token: null,
          platform_account_id: null,
          platform_account_name: null,
          token_expires_at: null,
        })
        .eq('id', account.id);

      if (error) throw error;
      toast.success(`${platform.charAt(0).toUpperCase() + platform.slice(1)} disconnected.`);
      fetchAccounts();
    } catch (err: any) {
      toast.error('Failed to disconnect: ' + err.message);
    }
  };

  const isTokenExpired = (expiresAt: string | null) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  if (loading) {
    return <div className="flex justify-center py-8"><Loader2 className="animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-3 py-2">
      <p className="text-sm text-muted-foreground mb-4">
        Connect your social accounts to enable auto-publishing. Your tokens are stored securely.
      </p>
      {PLATFORMS.map(({ key, label, icon: Icon, color, bgColor, supported }) => {
        const account = accounts.find(a => a.platform === key);
        const connected = account?.is_connected || false;
        const expired = isTokenExpired(account?.token_expires_at || null);
        const displayName = account?.platform_account_name || account?.account_name || null;

        return (
          <div key={key} className={cn("flex items-center justify-between p-4 border rounded-lg", bgColor)}>
            <div className="flex items-center gap-3">
              <Icon className={cn("h-6 w-6", color)} />
              <div>
                <p className="text-sm font-medium">{label}</p>
                {connected && displayName && (
                  <p className="text-xs text-muted-foreground">{displayName}</p>
                )}
                {connected && expired && (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <AlertCircle size={10} /> Token expired — reconnect
                  </p>
                )}
                {!supported && (
                  <p className="text-xs text-muted-foreground italic">Coming soon</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {connected && !expired ? (
                <>
                  <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 gap-1">
                    <CheckCircle2 size={12} /> Connected
                  </Badge>
                  <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" onClick={() => handleDisconnect(key)}>
                    Disconnect
                  </Button>
                </>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleConnect(key)}
                  disabled={connecting === key || !supported}
                  className="gap-1"
                >
                  {connecting === key ? <Loader2 size={14} className="animate-spin" /> : null}
                  {connected && expired ? 'Reconnect' : 'Connect'}
                </Button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ConnectAccountsPanel;
