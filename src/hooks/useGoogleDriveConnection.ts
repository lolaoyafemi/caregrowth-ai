import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface GoogleConnection {
  id: string;
  user_id: string;
  google_user_id: string;
  google_email: string;
  selected_folder_id?: string;
  selected_folder_name?: string;
  created_at: string;
  expires_at: string;
}

interface GoogleFolder {
  id: string;
  name: string;
  parents?: string[];
}

export const useGoogleDriveConnection = () => {
  const [connection, setConnection] = useState<GoogleConnection | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [folders, setFolders] = useState<GoogleFolder[]>([]);
  const [loadingFolders, setLoadingFolders] = useState(false);

  const fetchConnection = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        setConnection(null);
        return;
      }

      const { data, error } = await supabase
        .from('google_connections')
        .select('*')
        .eq('user_id', session.user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching connection:', error);
        toast.error('Failed to fetch Google Drive connection');
      } else {
        setConnection(data);
      }
    } catch (error) {
      console.error('Error in fetchConnection:', error);
    } finally {
      setLoading(false);
    }
  };

  const connectGoogleDrive = async () => {
    setConnecting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.info('Please log in to connect Google Drive');
        localStorage.setItem('pendingGoogleConnect', 'true');
        const redirect = encodeURIComponent(window.location.href);
        window.location.href = `/login?redirect=${redirect}`;
        return;
      }
      // Redirect to Google OAuth via Supabase edge function
      window.location.href = 'https://ljtikbkilyeyuexzhaqd.supabase.co/functions/v1/connect-google';
    } catch (error) {
      console.error('Error connecting to Google Drive:', error);
      toast.error('Failed to connect to Google Drive');
      setConnecting(false);
    }
  };

  const storeConnection = async (connectionData: {
    access_token: string;
    refresh_token: string;
    expires_at: string;
    google_user_id: string;
    google_email: string;
    scope: string;
  }) => {
    try {
      console.log('storeConnection - Starting to store connection for:', connectionData.google_email);
      
      // Get current user's agency
      const { data: user } = await supabase.auth.getUser();
      console.log('storeConnection - Current user:', { hasUser: !!user.user, userId: user.user?.id });
      if (!user.user) {
        console.warn('storeConnection - No authenticated user; deferring connection save until after login');
        localStorage.setItem('pendingGoogleTokens', JSON.stringify(connectionData));
        toast.info('Please log in to finish connecting Google Drive');
        return;
      }

      // Get or create agency for user
      console.log('storeConnection - Looking for existing agency...');
      let { data: agency, error: agencyError } = await supabase
        .from('agencies')
        .select('*')
        .eq('admin_user_id', user.user.id)
        .single();

      console.log('storeConnection - Agency query result:', { agency: !!agency, agencyError });

      if (agencyError || !agency) {
        console.log('storeConnection - Creating new agency...');
        // Create agency for user
        const { data: newAgency, error: createError } = await supabase
          .from('agencies')
          .insert({
            name: connectionData.google_email.split('@')[0] + ' Agency',
            admin_user_id: user.user.id,
          })
          .select()
          .single();

        console.log('storeConnection - Agency creation result:', { newAgency: !!newAgency, createError });
        if (createError) throw createError;
        agency = newAgency;
      }

      console.log('storeConnection - Inserting Google connection...');
      const { error } = await supabase
        .from('google_connections')
        .upsert({
          agency_id: agency.id,
          user_id: user.user.id,
          google_user_id: connectionData.google_user_id,
          google_email: connectionData.google_email,
          access_token: connectionData.access_token,
          refresh_token: connectionData.refresh_token,
          expires_at: connectionData.expires_at,
          scope: connectionData.scope,
        });

      console.log('storeConnection - Google connection upsert result:', { error });
      if (error) throw error;

      console.log('storeConnection - Connection stored successfully!');
      toast.success('Google Drive connected successfully!');
      await fetchConnection();
    } catch (error) {
      console.error('Error storing connection:', error);
      toast.error('Failed to store Google Drive connection');
    }
  };

  const disconnectGoogleDrive = async () => {
    if (!connection) return;

    try {
      const { error } = await supabase
        .from('google_connections')
        .delete()
        .eq('id', connection.id);

      if (error) throw error;

      setConnection(null);
      setFolders([]);
      toast.success('Google Drive disconnected successfully');
    } catch (error) {
      console.error('Error disconnecting Google Drive:', error);
      toast.error('Failed to disconnect Google Drive');
    }
  };

  const listFolders = async (parentFolderId?: string) => {
    if (!connection) return;

    setLoadingFolders(true);
    try {
      const { data, error } = await supabase.functions.invoke('google-drive-enhanced', {
        body: {
          action: 'listFolders',
          folder_id: parentFolderId,
        },
      });

      if (error) throw error;

      if (data?.reconnect_required) {
        toast.error('Google Drive connection expired. Please reconnect.');
        setConnection(null);
        return;
      }

      if (data?.success) {
        setFolders(data.folders || []);
      } else if (data?.error) {
        toast.error(data.error);
        setFolders([]);
      } else {
        setFolders([]);
      }
    } catch (error) {
      console.error('Error listing folders:', error);
      toast.error('Failed to load folders from Google Drive');
    } finally {
      setLoadingFolders(false);
    }
  };

  const selectFolder = async (folderId: string, folderName: string) => {
    if (!connection) return;

    try {
      const { data, error } = await supabase.functions.invoke('google-drive-enhanced', {
        body: {
          action: 'selectFolder',
          folder_id: folderId,
          folder_name: folderName,
        },
      });

      if (error) throw error;

      if (data?.success) {
        setConnection(prev => prev ? {
          ...prev,
          selected_folder_id: folderId,
          selected_folder_name: folderName,
        } : null);

        toast.success(`Selected folder: ${folderName}`);
      }
    } catch (error) {
      console.error('Error selecting folder:', error);
      toast.error('Failed to select folder');
    }
  };

  // Handle OAuth callback
  useEffect(() => {
    const handleOAuthCallback = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const urlHash = new URLSearchParams(window.location.hash.slice(1));
      
      console.log('OAuth callback - Full URL:', window.location.href);
      console.log('OAuth callback - Search params:', window.location.search);
      console.log('OAuth callback - Hash:', window.location.hash);
      console.log('OAuth callback - URL params:', Array.from(urlParams.entries()));
      console.log('OAuth callback - Hash params:', Array.from(urlHash.entries()));

      // Check URL params first, then hash params (some OAuth flows use hash)
      const getParam = (key: string) => urlParams.get(key) || urlHash.get(key);

      if (getParam('google_success') === 'true') {
        console.log('OAuth callback - Success detected, processing tokens...');
        const connectionData = {
          access_token: getParam('access_token') || '',
          refresh_token: getParam('refresh_token') || '',
          expires_at: getParam('expires_at') || '',
          google_user_id: getParam('google_user_id') || '',
          google_email: getParam('google_email') || '',
          scope: getParam('scope') || '',
        };

        console.log('OAuth callback - Connection data:', { 
          hasAccessToken: !!connectionData.access_token,
          email: connectionData.google_email,
          userId: connectionData.google_user_id,
          allData: connectionData
        });

        if (connectionData.access_token && connectionData.google_email) {
          console.log('OAuth callback - Valid connection data, storing connection...');
          try {
            await storeConnection(connectionData);
            console.log('OAuth callback - Connection stored successfully');
            toast.success('Google Drive connected successfully!');
          } catch (error) {
            console.error('OAuth callback - Error storing connection:', error);
            toast.error('Failed to store Google Drive connection');
          }
          // Clean up URL
          window.history.replaceState({}, document.title, window.location.pathname);
        } else {
          console.error('OAuth callback - Missing required data:', {
            hasAccessToken: !!connectionData.access_token,
            hasEmail: !!connectionData.google_email
          });
          toast.error('Received incomplete Google Drive authorization data');
        }
      } else if (getParam('google_error')) {
        const errorMsg = getParam('google_error');
        console.error('OAuth callback - Google error:', errorMsg);
        toast.error('Failed to connect to Google Drive: ' + errorMsg);
        // Clean up URL
        window.history.replaceState({}, document.title, window.location.pathname);
      } else if (getParam('error')) {
        const error = getParam('error');
        const errorDescription = getParam('error_description');
        console.error('OAuth callback - OAuth error:', { error, errorDescription });
        toast.error('OAuth error: ' + (errorDescription || error));
        // Clean up URL
        window.history.replaceState({}, document.title, window.location.pathname);
      } else {
        console.log('OAuth callback - No OAuth-related parameters found');
        const allParams = [...Array.from(urlParams.entries()), ...Array.from(urlHash.entries())];
        if (allParams.length > 0) {
          console.log('OAuth callback - Found other parameters:', allParams);
        }
      }
    };

    handleOAuthCallback();
  }, []);

  useEffect(() => {
    fetchConnection();
  }, []);

  // After login, if OAuth tokens were captured before authentication, finalize connection
  useEffect(() => {
    const processPending = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        const raw = localStorage.getItem('pendingGoogleTokens');
        if (raw) {
          const tokens = JSON.parse(raw);
          await storeConnection(tokens);
          localStorage.removeItem('pendingGoogleTokens');
        }
        if (localStorage.getItem('pendingGoogleConnect') === 'true') {
          localStorage.removeItem('pendingGoogleConnect');
        }
      } catch (e) {
        console.error('Error processing pending Google tokens:', e);
      }
    };
    processPending();
  }, []);

  return {
    connection,
    loading,
    connecting,
    folders,
    loadingFolders,
    connectGoogleDrive,
    disconnectGoogleDrive,
    listFolders,
    selectFolder,
    refetch: fetchConnection,
  };
};