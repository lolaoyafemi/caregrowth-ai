import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Facebook, Instagram, Linkedin, Twitter, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface ConnectedAccount {
  id: string;
  platform: string;
  account_name: string | null;
  is_connected: boolean;
  connected_at: string | null;
}

const PLATFORMS = [
  { key: 'facebook', label: 'Facebook', icon: Facebook, color: 'text-blue-600', bgColor: 'bg-blue-50 border-blue-200' },
  { key: 'instagram', label: 'Instagram', icon: Instagram, color: 'text-pink-600', bgColor: 'bg-pink-50 border-pink-200' },
  { key: 'linkedin', label: 'LinkedIn', icon: Linkedin, color: 'text-blue-700', bgColor: 'bg-blue-50 border-blue-200' },
  { key: 'x', label: 'X (Twitter)', icon: Twitter, color: 'text-gray-900', bgColor: 'bg-gray-50 border-gray-200' },
];

const ConnectAccountsPanel = () => {
  const [accounts, setAccounts] = useState<ConnectedAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState<string | null>(null);

  useEffect(() => {
    fetchAccounts();
  }, []);

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

      // Check if account record exists
      const existing = accounts.find(a => a.platform === platform);

      if (existing) {
        const { error } = await supabase
          .from('connected_accounts')
          .update({ is_connected: true, connected_at: new Date().toISOString(), account_name: `${platform} account` })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('connected_accounts')
          .insert({
            user_id: userId,
            platform,
            is_connected: true,
            connected_at: new Date().toISOString(),
            account_name: `${platform} account`,
          });
        if (error) throw error;
      }

      toast.success(`${platform.charAt(0).toUpperCase() + platform.slice(1)} connected. You're all set!`);
      fetchAccounts();
    } catch (err: any) {
      toast.error('Connection failed: ' + err.message);
    } finally {
      setConnecting(null);
    }
  };

  const handleDisconnect = async (platform: string) => {
    try {
      const account = accounts.find(a => a.platform === platform);
      if (!account) return;

      const { error } = await supabase
        .from('connected_accounts')
        .update({ is_connected: false, access_token: null, refresh_token: null })
        .eq('id', account.id);

      if (error) throw error;
      toast.success(`${platform.charAt(0).toUpperCase() + platform.slice(1)} disconnected.`);
      fetchAccounts();
    } catch (err: any) {
      toast.error('Failed to disconnect: ' + err.message);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-8"><Loader2 className="animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-3 py-2">
      <p className="text-sm text-muted-foreground mb-4">
        Connect your social accounts to enable auto-publishing. Your tokens are stored securely.
      </p>
      {PLATFORMS.map(({ key, label, icon: Icon, color, bgColor }) => {
        const account = accounts.find(a => a.platform === key);
        const connected = account?.is_connected || false;

        return (
          <div key={key} className={cn("flex items-center justify-between p-4 border rounded-lg", bgColor)}>
            <div className="flex items-center gap-3">
              <Icon className={cn("h-6 w-6", color)} />
              <div>
                <p className="text-sm font-medium">{label}</p>
                {connected && account?.account_name && (
                  <p className="text-xs text-muted-foreground">{account.account_name}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {connected ? (
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
                  disabled={connecting === key}
                  className="gap-1"
                >
                  {connecting === key ? <Loader2 size={14} className="animate-spin" /> : null}
                  Connect
                </Button>
              )}
            </div>
          </div>
        );
      })}
      <p className="text-xs text-muted-foreground mt-4 italic">
        Full OAuth integration coming soon. For now, connections are saved as placeholders to enable scheduling.
      </p>
    </div>
  );
};

export default ConnectAccountsPanel;
