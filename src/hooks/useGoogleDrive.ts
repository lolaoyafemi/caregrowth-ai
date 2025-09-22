import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

declare global {
  interface Window {
    gapi: any;
  }
}

export interface GoogleDriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  parents?: string[];
  webViewLink?: string;
}

export interface GoogleDriveResponse {
  files: GoogleDriveFile[];
  nextPageToken?: string;
}

export const useGoogleDrive = () => {
  const [loading, setLoading] = useState(false);
  const [files, setFiles] = useState<GoogleDriveFile[]>([]);
  const [folders, setFolders] = useState<GoogleDriveFile[]>([]);
  const [gapiReady, setGapiReady] = useState(false);
  const [needsReconnect, setNeedsReconnect] = useState(false);

  useEffect(() => {
    const initializeGapi = async () => {
      try {
        // Load Google API
        if (!window.gapi) {
          await new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://apis.google.com/js/api.js';
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
          });
        }

        // Initialize gapi
        await new Promise((resolve) => {
          window.gapi.load('client', resolve);
        });

        // Get and validate access token BEFORE initializing gapi client
        const { data: { session } } = await supabase.auth.getSession();
        let accessToken: string | null = null;
        let tokenExpiry: string | null = null;

        // Case 1: User authenticated via Google provider (provider_token present)
        if (session?.provider_token) {
          accessToken = session.provider_token;
        }

        // Case 2: Read token from stored Google connection (separate Drive connect flow)
        if (!accessToken && session?.user?.id) {
          const { data: connection } = await supabase
            .from('google_connections')
            .select('access_token, expires_at, refresh_token')
            .eq('user_id', session.user.id)
            .maybeSingle();

          if (connection?.access_token) {
            accessToken = connection.access_token as string;
            tokenExpiry = connection.expires_at;
          }
        }

        // Determine if we need a refresh (missing or expiring within 5 minutes)
        const needsRefresh = (() => {
          if (!accessToken) return true;
          if (!tokenExpiry) return false;
          const expiryTime = new Date(tokenExpiry).getTime();
          const now = Date.now();
          const buffer = 5 * 60 * 1000; // 5 minutes buffer
          return expiryTime <= now + buffer;
        })();

        if (needsRefresh) {
          const refreshedToken = await refreshAccessToken();
          if (refreshedToken) {
            accessToken = refreshedToken;
          } else {
            console.warn('Google API init: No access token available after refresh');
            setNeedsReconnect(true);
            setGapiReady(false);
            return;
          }
        }

        // Initialize the client with discovery doc (after we have a valid token)
        await window.gapi.client.init({
          discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'],
        });

        // Attach token to gapi client
        window.gapi.client.setToken({ access_token: accessToken });
        setGapiReady(true);
        setNeedsReconnect(false);
        console.log('Google Drive API initialized successfully');
      } catch (error) {
        console.error('Failed to initialize Google API:', error);
        toast.error('Failed to initialize Google Drive API');
        setGapiReady(false);
        setNeedsReconnect(true);
      }
    };

    initializeGapi();
  }, []);

  const refreshAccessToken = async (): Promise<string | null> => {
    try {
      const { data, error } = await supabase.functions.invoke('refresh-google-token');
      if (error || !data?.success || !data?.access_token) {
        console.warn('Token refresh failed', error || data);
        setNeedsReconnect(true);
        toast.error('Google Drive session expired. Please reconnect.');
        return null;
      }
      // Attach refreshed token to gapi if available
      if (window.gapi?.client && data.access_token) {
        window.gapi.client.setToken({ access_token: data.access_token });
      }
      setNeedsReconnect(false);
      return data.access_token as string;
    } catch (e) {
      console.error('Error refreshing access token:', e);
      setNeedsReconnect(true);
      toast.error('Failed to refresh Google Drive access. Please reconnect.');
      return null;
    }
  };

  const listFiles = async (folderId?: string, query?: string, pageToken?: string): Promise<GoogleDriveResponse | null> => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('google-drive-enhanced', {
        body: { 
          action: 'listFiles', 
          folder_id: folderId, 
          page_token: pageToken 
        }
      });

      if (error) {
        console.error('Error listing files:', error);
        toast.error('Failed to list Google Drive files');
        return null;
      }

      if (data?.success) {
        setFiles(data.files || []);
        return {
          files: data.files || [],
          nextPageToken: data.nextPageToken
        };
      }

      return null;
    } catch (error) {
      console.error('Error in listFiles:', error);
      toast.error('Failed to connect to Google Drive');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const listFolders = async (parentFolderId?: string, pageToken?: string): Promise<GoogleDriveResponse | null> => {
    setLoading(true);
    try {
      // First try gapi if ready
      if (gapiReady && window.gapi?.client?.drive) {
        console.log('Using gapi for folder listing');
        const q = parentFolderId
          ? `mimeType='application/vnd.google-apps.folder' and '${parentFolderId}' in parents and trashed=false`
          : `mimeType='application/vnd.google-apps.folder' and trashed=false`;
        
        const listCall = async () => await window.gapi.client.drive.files.list({
          q,
          corpora: 'user',
          fields: 'files(id, name)',
          includeItemsFromAllDrives: true,
          supportsAllDrives: true,
          pageSize: 100,
          pageToken: pageToken,
        });

        try {
          const response = await listCall();
          const folders = response.result.files || [];
          setFolders(folders);
          return { files: folders, nextPageToken: response.result.nextPageToken };
        } catch (e: any) {
          const status = e?.status || e?.result?.error?.code;
          const message: string = e?.result?.error?.message || e?.message || '';
          console.warn('gapi folder list error', status, message);
          if (status === 401 || /invalid_token/i.test(message || '')) {
            const refreshed = await refreshAccessToken();
            if (refreshed) {
              try {
                const retry = await listCall();
                const folders = retry.result.files || [];
                setFolders(folders);
                return { files: folders, nextPageToken: retry.result.nextPageToken };
              } catch (retryErr) {
                console.error('Retry after refresh failed:', retryErr);
              }
            }
            setNeedsReconnect(true);
            return null;
          }
          toast.error('Failed to list Google Drive folders');
          return null;
        }
      }

      // Fallback to edge function
      console.log('Using edge function fallback for folder listing');
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast.error('Please log in to access folders');
        return null;
      }

      const invokeList = async () => await supabase.functions.invoke('google-drive-list-folders', {
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: { scope: parentFolderId || 'root' },
      });

      let { data, error } = await invokeList();
      if (error) {
        const status = (error as any)?.status;
        console.warn('Edge function error:', status, error);
        if (status === 401) {
          const refreshed = await refreshAccessToken();
          if (refreshed) {
            ({ data, error } = await invokeList());
          } else {
            return null;
          }
        } else {
          toast.error('Failed to list Google Drive folders');
          return null;
        }
      }

      if (data?.success && data.folders) {
        const folders = data.folders;
        setFolders(folders);
        return { files: folders, nextPageToken: undefined };
      }

      return null;
    } catch (error) {
      console.error('Error listing folders:', error);
      toast.error('Failed to list Google Drive folders');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const getFileContent = async (fileId: string): Promise<{ content: string; fileName: string; mimeType: string } | null> => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('google-drive-enhanced', {
        body: { 
          action: 'getFileContent', 
          file_id: fileId 
        }
      });

      if (error) {
        console.error('Error getting file content:', error);
        toast.error('Failed to download file content');
        return null;
      }

      if (data?.success) {
        return {
          content: data.content,
          fileName: data.fileName,
          mimeType: data.mimeType
        };
      }

      return null;
    } catch (error) {
      console.error('Error in getFileContent:', error);
      toast.error('Failed to download file from Google Drive');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const searchFiles = async (searchQuery: string, pageToken?: string): Promise<GoogleDriveResponse | null> => {
    // Enhanced search - the backend now handles the document type filtering
    const query = `name contains '${searchQuery}' and (mimeType='application/vnd.google-apps.document' or mimeType='application/vnd.google-apps.spreadsheet' or mimeType='application/vnd.google-apps.presentation' or mimeType='application/pdf' or mimeType='text/plain' or mimeType='application/vnd.openxmlformats-officedocument.wordprocessingml.document')`;
    
    return listFiles(undefined, query, pageToken);
  };

  const reconnectGoogle = () => {
    const functionsBase = 'https://ljtikbkilyeyuexzhaqd.functions.supabase.co';
    const target = `${functionsBase}/connect-google`;
    window.location.href = target;
  };

  return {
    loading,
    files,
    folders,
    listFiles,
    listFolders,
    getFileContent,
    searchFiles,
    gapiReady,
    needsReconnect,
    reconnectGoogle,
  };
};