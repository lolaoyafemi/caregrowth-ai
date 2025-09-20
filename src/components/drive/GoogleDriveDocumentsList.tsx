import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useGoogleDriveConnection } from '@/hooks/useGoogleDriveConnection';
import { supabase } from '@/integrations/supabase/client';
import { FileText, RefreshCw, Download, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface GoogleDriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  modifiedTime?: string;
  webViewLink?: string;
}

interface ProcessedDocument {
  id: string;
  doc_link: string;
  doc_title: string;
  fetched: boolean;
}

export const GoogleDriveDocumentsList: React.FC = () => {
  const { connection } = useGoogleDriveConnection();
  const [documents, setDocuments] = useState<GoogleDriveFile[]>([]);
  const [processedDocs, setProcessedDocs] = useState<ProcessedDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncingIds, setSyncingIds] = useState<Set<string>>(new Set());

  const loadDocuments = async () => {
    if (!connection?.selected_folder_id) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('google-drive-enhanced', {
        body: {
          action: 'listFiles',
          folder_id: connection.selected_folder_id,
        },
      });

      if (error) throw error;

      if (data?.success) {
        // Filter for supported document types
        const supportedMimeTypes = [
          'application/vnd.google-apps.document',
          'application/vnd.google-apps.spreadsheet',
          'application/pdf',
          'text/plain',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ];

        const supportedDocs = data.files.filter((file: GoogleDriveFile) => 
          supportedMimeTypes.includes(file.mimeType)
        );

        setDocuments(supportedDocs);
      }
    } catch (error) {
      console.error('Error loading documents:', error);
      toast.error('Failed to load documents from Google Drive');
    } finally {
      setLoading(false);
    }
  };

  const loadProcessedDocuments = async () => {
    try {
      const { data, error } = await supabase
        .from('google_documents')
        .select('*')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id);

      if (error) throw error;
      setProcessedDocs(data || []);
    } catch (error) {
      console.error('Error loading processed documents:', error);
    }
  };

  const syncDocument = async (file: GoogleDriveFile) => {
    setSyncingIds(prev => new Set([...prev, file.id]));
    
    try {
      // 1. Get file content from Google Drive
      const { data: contentData, error: contentError } = await supabase.functions.invoke('google-drive-enhanced', {
        body: {
          action: 'getFileContent',
          file_id: file.id,
        },
      });

      if (contentError) throw contentError;
      if (!contentData?.success) throw new Error('Failed to get file content');

      // 2. Store document in google_documents table
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('User not authenticated');

      const { data: docData, error: docError } = await supabase
        .from('google_documents')
        .upsert({
          user_id: user.user.id,
          doc_link: `https://drive.google.com/file/d/${file.id}`,
          doc_title: file.name,
          fetched: false
        }, {
          onConflict: 'doc_link'
        })
        .select()
        .single();

      if (docError) throw docError;

      // 3. Process document for search indexing
      const { data: processData, error: processError } = await supabase.functions.invoke('process-document', {
        body: {
          documentId: docData.id,
          content: contentData.content,
          skipChunking: false
        },
      });

      if (processError) throw processError;

      toast.success(`Document "${file.name}" synced and indexed successfully!`);
      loadProcessedDocuments(); // Refresh processed docs list

    } catch (error) {
      console.error('Error syncing document:', error);
      toast.error(`Failed to sync "${file.name}": ${error.message}`);
    } finally {
      setSyncingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(file.id);
        return newSet;
      });
    }
  };

  const syncAllDocuments = async () => {
    for (const doc of documents) {
      if (!isDocumentProcessed(doc.id)) {
        await syncDocument(doc);
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  };

  const isDocumentProcessed = (fileId: string): boolean => {
    return processedDocs.some(doc => 
      doc.doc_link.includes(fileId) && doc.fetched
    );
  };

  const formatFileSize = (bytes?: string): string => {
    if (!bytes) return 'Unknown size';
    const size = parseInt(bytes);
    const units = ['B', 'KB', 'MB', 'GB'];
    let unitIndex = 0;
    let fileSize = size;
    
    while (fileSize >= 1024 && unitIndex < units.length - 1) {
      fileSize /= 1024;
      unitIndex++;
    }
    
    return `${fileSize.toFixed(1)} ${units[unitIndex]}`;
  };

  const getMimeTypeIcon = (mimeType: string) => {
    if (mimeType.includes('document')) return '📝';
    if (mimeType.includes('spreadsheet')) return '📊';
    if (mimeType.includes('pdf')) return '📄';
    if (mimeType.includes('text')) return '📃';
    return '📁';
  };

  useEffect(() => {
    if (connection?.selected_folder_id) {
      loadDocuments();
      loadProcessedDocuments();
    }
  }, [connection?.selected_folder_id]);

  if (!connection?.selected_folder_id) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <div className="text-center text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Please select a Google Drive folder to view documents</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Documents in Selected Folder
            </CardTitle>
            <CardDescription>
              Sync documents to make them searchable in QA Assistant
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={loadDocuments}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button 
              size="sm" 
              onClick={syncAllDocuments}
              disabled={loading || documents.length === 0}
            >
              <Download className="h-4 w-4 mr-2" />
              Sync All
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            <span>Loading documents...</span>
          </div>
        ) : documents.length === 0 ? (
          <div className="text-center text-muted-foreground p-8">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No supported documents found in this folder</p>
            <p className="text-sm mt-2">Supported: Google Docs, Sheets, PDF, Word, Text files</p>
          </div>
        ) : (
          <div className="space-y-2">
            {documents.map((doc) => {
              const isProcessed = isDocumentProcessed(doc.id);
              const isSyncing = syncingIds.has(doc.id);
              
              return (
                <div
                  key={doc.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <div className="text-2xl">
                      {getMimeTypeIcon(doc.mimeType)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{doc.name}</p>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>{formatFileSize(doc.size)}</span>
                        {doc.modifiedTime && (
                          <span>Modified {new Date(doc.modifiedTime).toLocaleDateString()}</span>
                        )}
                        <div className="flex items-center gap-1">
                          {isProcessed ? (
                            <>
                              <CheckCircle className="h-4 w-4 text-green-600" />
                              <span className="text-green-600">Indexed</span>
                            </>
                          ) : (
                            <>
                              <AlertCircle className="h-4 w-4 text-orange-600" />
                              <span className="text-orange-600">Not indexed</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isProcessed && (
                      <Badge variant="outline" className="text-green-600 border-green-200">
                        Searchable
                      </Badge>
                    )}
                    <Button
                      variant={isProcessed ? "outline" : "default"}
                      size="sm"
                      onClick={() => syncDocument(doc)}
                      disabled={isSyncing}
                    >
                      {isSyncing ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Syncing...
                        </>
                      ) : isProcessed ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Re-sync
                        </>
                      ) : (
                        <>
                          <Download className="h-4 w-4 mr-2" />
                          Sync
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};