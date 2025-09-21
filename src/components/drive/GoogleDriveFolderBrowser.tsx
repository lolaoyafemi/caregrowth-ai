import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useGoogleDriveConnection } from '@/hooks/useGoogleDriveConnection';
import { useGoogleDrive } from '@/hooks/useGoogleDrive';
import { Folder, FolderOpen, ArrowLeft, Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface GoogleFolder {
  id: string;
  name: string;
  parents?: string[];
}

export const GoogleDriveFolderBrowser: React.FC<{ onFolderSelected?: (folder: { id: string; name: string }) => void }> = ({ onFolderSelected }) => {
  const { connection, selectFolder } = useGoogleDriveConnection();
  const { 
    folders: driveFolders, 
    listFolders: listDriveFolders, 
    loading: driveLoading, 
    gapiReady 
  } = useGoogleDrive();

  const [currentFolderId, setCurrentFolderId] = useState<string | undefined>();
  const [folderPath, setFolderPath] = useState<Array<{id: string, name: string}>>([]);

  useEffect(() => {
    if (connection && gapiReady) {
      console.log('Connection and gapi ready, loading root folders');
      listDriveFolders();
    }
  }, [connection, gapiReady]);

  const handleFolderClick = (folder: GoogleFolder) => {
    setCurrentFolderId(folder.id);
    setFolderPath(prev => [...prev, { id: folder.id, name: folder.name }]);
    listDriveFolders(folder.id);
  };

  const handleBackClick = () => {
    if (folderPath.length > 0) {
      const newPath = folderPath.slice(0, -1);
      setFolderPath(newPath);
      
      if (newPath.length === 0) {
        setCurrentFolderId(undefined);
        listDriveFolders();
      } else {
        const parentFolder = newPath[newPath.length - 1];
        setCurrentFolderId(parentFolder.id);
        listDriveFolders(parentFolder.id);
      }
    }
  };

  const handleSelectFolder = async () => {
    if (!currentFolderId) {
      console.error('GoogleDriveFolderBrowser: No folder ID available for selection');
      toast.error('No folder selected');
      return;
    }
    
    const currentFolder = folderPath[folderPath.length - 1];
    if (!currentFolder) {
      console.error('GoogleDriveFolderBrowser: No current folder in path');
      toast.error('No folder selected');
      return;
    }

    console.log('GoogleDriveFolderBrowser: Selecting folder:', {
      id: currentFolder.id,
      name: currentFolder.name,
      path: folderPath
    });
    
    try {
      await selectFolder(currentFolder.id, currentFolder.name);
      console.log('GoogleDriveFolderBrowser: Folder selection completed successfully');
      
      // Call the callback to refresh the parent component
      if (onFolderSelected) {
        console.log('GoogleDriveFolderBrowser: Calling onFolderSelected callback');
        onFolderSelected(currentFolder);
      }
    } catch (error) {
      console.error('GoogleDriveFolderBrowser: Error selecting folder:', error);
      toast.error('Failed to select folder: ' + (error?.message || 'Unknown error'));
    }
  };
  if (!connection) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FolderOpen className="h-5 w-5" />
          Browse Google Drive Folders
        </CardTitle>
        <CardDescription>
          Select a folder from your Google Drive to train the AI on its contents.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setCurrentFolderId(undefined);
                setFolderPath([]);
                listDriveFolders();
              }}
              className="p-0 h-auto"
            >
              My Drive
            </Button>
            {folderPath.map((folder, index) => (
              <React.Fragment key={folder.id}>
                <span>/</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const newPath = folderPath.slice(0, index + 1);
                    setFolderPath(newPath);
                    setCurrentFolderId(folder.id);
                    listDriveFolders(folder.id);
                  }}
                  className="p-0 h-auto"
                >
                  {folder.name}
                </Button>
              </React.Fragment>
            ))}
          </div>

          {/* Navigation */}
          <div className="flex items-center gap-2">
            {folderPath.length > 0 && (
              <Button variant="outline" size="sm" onClick={handleBackClick}>
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
            )}
            
            {currentFolderId && (
              <Button onClick={handleSelectFolder} size="sm">
                <Check className="h-4 w-4 mr-1" />
                Select This Folder
              </Button>
            )}
          </div>

          {/* Error state */}
          {(!gapiReady && !driveLoading) && (
            <div className="p-3 rounded-lg border border-warning/30 bg-warning/5 text-sm text-warning">
              Google Drive API initializing... Please wait.
            </div>
          )}

          {/* Folders list */}
          <div className="border rounded-lg">
            {driveLoading ? (
              <div className="p-4 flex items-center justify-center">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                <span className="text-sm text-muted-foreground">Loading folders...</span>
              </div>
            ) : driveFolders.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                {!gapiReady ? 'Google Drive API loading...' : 'No folders found in this location'}
              </div>
            ) : (
              <div className="divide-y">
                {driveFolders.map((folder) => (
                  <div
                    key={folder.id}
                    className="flex items-center justify-between p-3 hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => handleFolderClick(folder)}
                  >
                    <div className="flex items-center gap-3">
                      <Folder className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-medium">{folder.name}</span>
                    </div>
                    <Button variant="ghost" size="sm" className="text-xs">
                      Open
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};