import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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
      const { data, error } = await supabase.functions.invoke('google-drive-enhanced', {
        body: { 
          action: 'listFolders', 
          folder_id: parentFolderId, 
          page_token: pageToken 
        }
      });

      if (error) {
        console.error('Error listing folders:', error);
        toast.error('Failed to list Google Drive folders');
        return null;
      }

      if (data?.success) {
        setFolders(data.folders || []);
        return {
          files: data.folders || [],
          nextPageToken: data.nextPageToken
        };
      }

      return null;
    } catch (error) {
      console.error('Error in listFolders:', error);
      toast.error('Failed to connect to Google Drive');
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

  return {
    loading,
    files,
    folders,
    listFiles,
    listFolders,
    getFileContent,
    searchFiles
  };
};