import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ShareIcon, ExternalLink, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface SharedFolder {
  id: string;
  folder_id: string;
  folder_name: string;
  folder_url: string;
  status: 'active' | 'error' | 'processing';
  documents_count?: number;
  last_synced_at?: string;
  error_message?: string;
}

export const GoogleFolderSharing: React.FC = () => {
  const [folderUrl, setFolderUrl] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [sharedFolders, setSharedFolders] = useState<SharedFolder[]>([]);

  useEffect(() => {
    loadSharedFolders();
  }, []);

  const loadSharedFolders = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      const { data: folders, error } = await supabase
        .from('shared_folders')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading shared folders:', error);
        return;
      }

      const typedFolders: SharedFolder[] = (folders || []).map(folder => ({
        id: folder.id,
        folder_id: folder.folder_id,
        folder_name: folder.folder_name,
        folder_url: folder.folder_url,
        status: (folder.status as 'active' | 'error' | 'processing') || 'active',
        documents_count: folder.documents_count || undefined,
        last_synced_at: folder.last_synced_at || undefined,
        error_message: folder.error_message || undefined
      }));

      setSharedFolders(typedFolders);
    } catch (error) {
      console.error('Error loading shared folders:', error);
    }
  };

  const extractFolderId = (url: string): string | null => {
    // Handle various Google Drive folder sharing URL formats
    const patterns = [
      /\/folders\/([a-zA-Z0-9-_]+)/,  // Standard sharing URL
      /[?&]id=([a-zA-Z0-9-_]+)/,      // Alternative format
      /^([a-zA-Z0-9-_]+)$/            // Just the ID
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return null;
  };

  const validateFolderAccess = async (folderId: string): Promise<{ name: string; accessible: boolean }> => {
    try {
      // Basic validation - in production you'd want to check if folder is accessible
      // For now, we'll assume it's accessible if it looks like a valid ID
      if (folderId && folderId.length > 10) {
        return { name: `Folder ${folderId.substring(0, 8)}...`, accessible: true };
      }
      
      return { name: 'Unknown Folder', accessible: false };
    } catch (error) {
      console.error('Error validating folder access:', error);
      return { name: 'Unknown Folder', accessible: false };
    }
  };

  const handleAddFolder = async () => {
    if (!folderUrl.trim()) {
      toast.error('Please enter a folder URL or ID');
      return;
    }

    const folderId = extractFolderId(folderUrl.trim());
    if (!folderId) {
      toast.error('Invalid Google Drive folder URL or ID');
      return;
    }

    setIsProcessing(true);
    
    try {
      // Validate folder access
      const { name, accessible } = await validateFolderAccess(folderId);
      
      if (!accessible) {
        toast.error('Folder is not accessible. Please make sure it is shared publicly or with your account.');
        setIsProcessing(false);
        return;
      }

      // Save to database
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Please log in to add folders');
        setIsProcessing(false);
        return;
      }

      const { error: insertError } = await supabase
        .from('shared_folders')
        .insert({
          user_id: user.id,
          folder_id: folderId,
          folder_name: name,
          folder_url: folderUrl.trim(),
          status: 'active'
        });

      if (insertError) {
        console.error('Error saving folder:', insertError);
        toast.error('Failed to save folder');
        setIsProcessing(false);
        return;
      }

      await loadSharedFolders();
      setFolderUrl('');
      toast.success(`Added folder: ${name}`);
      
    } catch (error) {
      console.error('Error adding folder:', error);
      toast.error('Failed to add folder');
    } finally {
      setIsProcessing(false);
    }
  };

  const removeFolder = async (folderId: string) => {
    try {
      const { error } = await supabase
        .from('shared_folders')
        .delete()
        .eq('id', folderId);

      if (error) {
        console.error('Error removing folder:', error);
        toast.error('Failed to remove folder');
        return;
      }

      await loadSharedFolders();
      toast.success('Folder removed');
    } catch (error) {
      console.error('Error removing folder:', error);
      toast.error('Failed to remove folder');
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShareIcon className="h-5 w-5" />
            Share Google Drive Folders
          </CardTitle>
          <CardDescription>
            Share specific Google Drive folders for AI training without giving full Drive access.
            This is more secure and gives you precise control over what content is used.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="bg-muted/50 rounded-lg p-4">
              <h4 className="font-medium mb-2">How to share a folder:</h4>
              <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                <li>Open Google Drive and find the folder you want to share</li>
                <li>Right-click the folder and select "Share"</li>
                <li>Click "Change to anyone with the link" or add specific people</li>
                <li>Set permissions to "Viewer" (recommended)</li>
                <li>Copy the sharing link and paste it below</li>
              </ol>
            </div>

            <div className="space-y-2">
              <Label htmlFor="folder-url">Google Drive Folder Link or ID</Label>
              <div className="flex gap-2">
                <Input
                  id="folder-url"
                  placeholder="https://drive.google.com/drive/folders/1ABC..."
                  value={folderUrl}
                  onChange={(e) => setFolderUrl(e.target.value)}
                  disabled={isProcessing}
                />
                <Button 
                  onClick={handleAddFolder}
                  disabled={isProcessing || !folderUrl.trim()}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    'Add Folder'
                  )}
                </Button>
              </div>
            </div>

            {sharedFolders.length > 0 && (
              <>
                <Separator />
                <div>
                  <h4 className="font-medium mb-3">Shared Folders</h4>
                  <div className="space-y-2">
                    {sharedFolders.map((folder) => (
                      <div key={folder.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          {folder.status === 'active' ? (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          ) : folder.status === 'error' ? (
                            <AlertCircle className="h-4 w-4 text-red-600" />
                          ) : (
                            <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                          )}
                          <div>
                            <p className="font-medium">{folder.folder_name}</p>
                            <p className="text-sm text-muted-foreground">ID: {folder.folder_id}</p>
                            {folder.documents_count !== undefined && (
                              <p className="text-xs text-muted-foreground">{folder.documents_count} documents</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={folder.status === 'active' ? 'default' : 'destructive'}>
                            {folder.status}
                          </Badge>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(folder.folder_url, '_blank')}
                          >
                            <ExternalLink className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => removeFolder(folder.id)}
                            className="text-destructive hover:bg-destructive/10"
                          >
                            Remove
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-4">
              <h4 className="font-medium mb-2 text-blue-900 dark:text-blue-100">Security Benefits:</h4>
              <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                <li>• No OAuth permissions required</li>
                <li>• You control exactly which folders are accessible</li>
                <li>• Can revoke access by unsharing the folder</li>
                <li>• Works with any Google account</li>
                <li>• No stored authentication tokens</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};