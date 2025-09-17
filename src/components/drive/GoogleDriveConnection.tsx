import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useGoogleDriveConnection } from '@/hooks/useGoogleDriveConnection';
import { GoogleDriveFolderBrowser } from './GoogleDriveFolderBrowser';
import { CheckCircle, ExternalLink, Loader2, Plus, Unplug } from 'lucide-react';

export const GoogleDriveConnection: React.FC = () => {
  const {
    connection,
    loading,
    connecting,
    connectGoogleDrive,
    disconnectGoogleDrive,
  } = useGoogleDriveConnection();

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          <span>Loading Google Drive connection...</span>
        </CardContent>
      </Card>
    );
  }

  if (!connection) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ExternalLink className="h-5 w-5" />
            Connect Google Drive
          </CardTitle>
          <CardDescription>
            Connect your Google Drive account to access documents and folders for AI training.
            This enables secure, read-only access to your selected Drive content.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="bg-muted/50 rounded-lg p-4">
              <h4 className="font-medium mb-2">What you'll grant access to:</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Read-only access to Google Drive files</li>
                <li>• View file names and folder structure</li>
                <li>• Export Google Docs/Sheets as text for AI processing</li>
              </ul>
            </div>
            
            <div className="bg-muted/50 rounded-lg p-4">
              <h4 className="font-medium mb-2">Security & Privacy:</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• No write access to your files</li>
                <li>• Tokens stored securely and encrypted</li>
                <li>• Compliant with Google API Services User Data Policy</li>
                <li>• You can revoke access anytime</li>
              </ul>
            </div>

            <Button 
              onClick={connectGoogleDrive} 
              disabled={connecting}
              className="w-full"
            >
              {connecting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Connect Google Drive
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            Google Drive Connected
          </CardTitle>
          <CardDescription>
            Your Google Drive account is connected and ready to use.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{connection.google_email}</p>
                <p className="text-sm text-muted-foreground">
                  Connected on {new Date(connection.created_at).toLocaleDateString()}
                </p>
              </div>
              <Badge variant="outline" className="text-green-600 border-green-200">
                Connected
              </Badge>
            </div>

            {connection.selected_folder_name && (
              <>
                <Separator />
                <div>
                  <p className="text-sm font-medium mb-1">Selected Folder:</p>
                  <p className="text-sm text-muted-foreground">{connection.selected_folder_name}</p>
                </div>
              </>
            )}

            <Separator />
            
            <Button
              variant="outline"
              onClick={disconnectGoogleDrive}
              className="text-destructive hover:bg-destructive/10"
            >
              <Unplug className="h-4 w-4 mr-2" />
              Disconnect Google Drive
            </Button>
          </div>
        </CardContent>
      </Card>

      <GoogleDriveFolderBrowser />
    </div>
  );
};