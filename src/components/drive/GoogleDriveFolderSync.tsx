import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  FolderIcon, 
  RefreshCwIcon, 
  CheckCircleIcon, 
  XCircleIcon, 
  AlertCircleIcon,
  FileTextIcon,
  RotateCcwIcon,
  LinkIcon,
  WifiOffIcon
} from 'lucide-react';
import { useGoogleDriveConnection } from '@/hooks/useGoogleDriveConnection';
import { useGoogleDrive } from '@/hooks/useGoogleDrive';
import { useGoogleDriveSync } from '@/hooks/useGoogleDriveSync';
import { GoogleDriveFolderBrowser } from '@/components/drive/GoogleDriveFolderBrowser';
import { toast } from 'sonner';

interface SyncStatus {
  isActive: boolean;
  lastSync: Date | null;
  nextSync: Date | null;
  totalFiles: number;
  syncedFiles: number;
  errors: string[];
}

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime?: string;
  size?: string;
  status: 'pending' | 'synced' | 'error' | 'processing';
}

const GoogleDriveFolderSync: React.FC = () => {
  const { connection, connecting, connectGoogleDrive, disconnectGoogleDrive, listFolders, selectFolder, refetch } = useGoogleDriveConnection();
  const { listFiles, getFileContent } = useGoogleDrive();
  const { isRunning: isSyncRunning, triggerSync, scheduleSync } = useGoogleDriveSync();
  
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isActive: false,
    lastSync: null,
    nextSync: null,
    totalFiles: 0,
    syncedFiles: 0,
    errors: []
  });
  
  const [driveFiles, setDriveFiles] = useState<DriveFile[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);

  // Check for PDF files in the selected folder
  const scanForPDFFiles = useCallback(async () => {
    if (!connection?.selected_folder_id) return;

    try {
      const result = await listFiles(connection.selected_folder_id);
      if (result?.files) {
        const pdfFiles = result.files.filter(file => 
          file.mimeType === 'application/pdf' ||
          file.mimeType === 'application/vnd.google-apps.document' ||
          file.mimeType === 'text/plain' ||
          file.mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ).map(file => ({
          id: file.id,
          name: file.name,
          mimeType: file.mimeType,
          status: 'pending' as const
        }));
        
        setDriveFiles(pdfFiles);
        setSyncStatus(prev => ({
          ...prev,
          totalFiles: pdfFiles.length
        }));
      }
    } catch (error) {
      console.error('Error scanning for files:', error);
      toast.error('Failed to scan Google Drive folder');
    }
  }, [connection?.selected_folder_id, listFiles]);

  // Trigger backend sync process
  const syncFiles = useCallback(async () => {
    if (!connection?.selected_folder_id) {
      toast.info('No folder selected for syncing');
      return;
    }

    setIsSyncing(true);
    
    try {
      const result = await triggerSync();
      
      if (result) {
        setSyncStatus(prev => ({
          ...prev,
          lastSync: new Date(),
          nextSync: new Date(Date.now() + 10 * 60 * 1000),
          syncedFiles: result.files_processed,
          errors: result.errors > 0 ? [`${result.errors} files failed to sync`] : []
        }));

        // Refresh file list after sync
        await scanForPDFFiles();
      }
    } catch (error) {
      console.error('Sync error:', error);
      toast.error('Sync process failed');
    } finally {
      setIsSyncing(false);
    }
  }, [connection?.selected_folder_id, triggerSync, scanForPDFFiles]);

  // Enable automatic sync using the backend sync monitor
  const enableAutoSync = useCallback(async () => {
    setSyncStatus(prev => ({ ...prev, isActive: true }));
    await scheduleSync(10); // Schedule sync every 10 minutes
    
    // Run initial sync
    const result = await triggerSync();
    if (result) {
      setSyncStatus(prev => ({
        ...prev,
        lastSync: new Date(),
        nextSync: new Date(Date.now() + 10 * 60 * 1000),
        totalFiles: prev.totalFiles,
        syncedFiles: result.files_processed,
        errors: result.errors > 0 ? [`${result.errors} files failed to sync`] : []
      }));
    }
  }, [scheduleSync, triggerSync]);

  // Initial scan when folder is selected
  useEffect(() => {
    if (connection?.selected_folder_id) {
      scanForPDFFiles();
    }
  }, [connection?.selected_folder_id, scanForPDFFiles]);

  const getStatusIcon = (status: DriveFile['status']) => {
    switch (status) {
      case 'synced':
        return <CheckCircleIcon className="h-4 w-4 text-green-500" />;
      case 'error':
        return <XCircleIcon className="h-4 w-4 text-red-500" />;
      case 'processing':
        return <RotateCcwIcon className="h-4 w-4 text-blue-500 animate-spin" />;
      default:
        return <AlertCircleIcon className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getStatusColor = (status: DriveFile['status']) => {
    switch (status) {
      case 'synced': return 'bg-green-100 text-green-800';
      case 'error': return 'bg-red-100 text-red-800';
      case 'processing': return 'bg-blue-100 text-blue-800';
      default: return 'bg-yellow-100 text-yellow-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Connection Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderIcon className="h-5 w-5" />
            Google Drive Folder Sync
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!connection ? (
            <div className="text-center py-8">
              <WifiOffIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-4">Connect your Google Drive to enable folder synchronization</p>
              <Button onClick={connectGoogleDrive} disabled={connecting} aria-label="Connect Google Drive">
                <LinkIcon className="h-4 w-4 mr-2" />
                {connecting ? 'Connecting...' : 'Connect Google Drive'}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{connection.google_email}</p>
                  <p className="text-sm text-gray-600">
                    {connection.selected_folder_name ? 
                      `Syncing: ${connection.selected_folder_name}` : 
                      'No folder selected'
                    }
                  </p>
                </div>
                <Button variant="outline" onClick={disconnectGoogleDrive}>
                  Disconnect
                </Button>
              </div>

              {!connection.selected_folder_id && (
                <div className="space-y-4">
                  <Alert>
                    <AlertCircleIcon className="h-4 w-4" />
                    <AlertDescription>
                      Please select a Google Drive folder to sync documents from.
                    </AlertDescription>
                  </Alert>
                  
                  {/* Add folder browser */}
                  <GoogleDriveFolderBrowser onFolderSelected={() => refetch()} />
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sync Status */}
      {connection?.selected_folder_id && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Sync Status</span>
              <div className="flex items-center gap-2">
                <Badge variant={syncStatus.isActive ? "default" : "secondary"}>
                  {syncStatus.isActive ? 'Active' : 'Inactive'}
                </Badge>
                 {!syncStatus.isActive && (
                  <Button size="sm" onClick={enableAutoSync} disabled={isSyncRunning}>
                    Enable Auto-Sync
                  </Button>
                )}
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isSyncing && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Syncing files...</span>
                  <span>{Math.round(syncProgress)}%</span>
                </div>
                <Progress value={syncProgress} />
              </div>
            )}

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{syncStatus.totalFiles}</div>
                <div className="text-sm text-gray-600">Total Files</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{syncStatus.syncedFiles}</div>
                <div className="text-sm text-gray-600">Synced</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{syncStatus.errors.length}</div>
                <div className="text-sm text-gray-600">Errors</div>
              </div>
              <div className="text-center">
                <div className="text-sm font-medium">
                  {syncStatus.lastSync ? syncStatus.lastSync.toLocaleTimeString() : 'Never'}
                </div>
                <div className="text-sm text-gray-600">Last Sync</div>
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={scanForPDFFiles} disabled={isSyncing || isSyncRunning}>
                <RefreshCwIcon className="h-4 w-4 mr-2" />
                Scan Folder
              </Button>
              <Button onClick={syncFiles} disabled={isSyncing || isSyncRunning}>
                <RotateCcwIcon className="h-4 w-4 mr-2" />
                {isSyncRunning ? 'Syncing...' : 'Sync Now'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* File List */}
      {driveFiles.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Documents in Folder ({driveFiles.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {driveFiles.map((file) => (
                <div key={file.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <FileTextIcon className="h-4 w-4 text-blue-500" />
                    <div>
                      <div className="font-medium">{file.name}</div>
                      <div className="text-sm text-gray-600">{file.mimeType}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(file.status)}
                    <Badge variant="secondary" className={getStatusColor(file.status)}>
                      {file.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sync Errors */}
      {syncStatus.errors.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-red-600">Sync Errors</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {syncStatus.errors.map((error, index) => (
                <Alert key={index} variant="destructive">
                  <XCircleIcon className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default GoogleDriveFolderSync;