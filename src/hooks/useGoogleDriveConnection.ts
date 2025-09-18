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
      const { data, error } = await supabase
        .from('google_connections')
        .select('*')
        .single();

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
      // Redirect to Google OAuth
      window.location.href = '/connect-google';
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
      // Get current user's agency
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('No authenticated user');

      // Get or create agency for user
      let { data: agency, error: agencyError } = await supabase
        .from('agencies')
        .select('*')
        .eq('admin_user_id', user.user.id)
        .single();

      if (agencyError || !agency) {
        // Create agency for user
        const { data: newAgency, error: createError } = await supabase
          .from('agencies')
          .insert({
            name: connectionData.google_email.split('@')[0] + ' Agency',
            admin_user_id: user.user.id,
          })
          .select()
          .single();

        if (createError) throw createError;
        agency = newAgency;
      }

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

      if (error) throw error;

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
      
      if (data.reconnect_required) {
        toast.error('Google Drive connection expired. Please reconnect.');
        setConnection(null);
        return;
      }

      if (data?.success) {
        setFolders(data.folders || []);
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
          folderName,
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
      
      if (urlParams.get('google_success') === 'true') {
        const connectionData = {
          access_token: urlParams.get('access_token') || '',
          refresh_token: urlParams.get('refresh_token') || '',
          expires_at: urlParams.get('expires_at') || '',
          google_user_id: urlParams.get('google_user_id') || '',
          google_email: urlParams.get('google_email') || '',
          scope: urlParams.get('scope') || '',
        };

        if (connectionData.access_token) {
          await storeConnection(connectionData);
          // Clean up URL
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      } else if (urlParams.get('google_error')) {
        toast.error('Failed to connect to Google Drive: ' + urlParams.get('google_error'));
        // Clean up URL
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    };

    handleOAuthCallback();
  }, []);

  useEffect(() => {
    fetchConnection();
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