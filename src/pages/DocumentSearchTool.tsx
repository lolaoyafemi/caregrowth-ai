
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Trash2, ExternalLink, Link, Loader2 } from 'lucide-react';
import { useGoogleDocuments } from '@/hooks/useGoogleDocuments';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const DocumentSearchTool = () => {
  const [docUrl, setDocUrl] = useState('');
  const { documents, loading, isAdding, deletingIds, addDocument, deleteDocument } = useGoogleDocuments();

  const handleAddDocument = async () => {
    if (!docUrl.trim()) {
      toast.error('Please enter a document URL');
      return;
    }

    // Basic URL validation
    if (!docUrl.includes('docs.google.com') && !docUrl.includes('drive.google.com')) {
      toast.error('Please enter a valid Google Docs, Sheets, or Slides URL');
      return;
    }

    try {
      await addDocument(docUrl);
      setDocUrl('');
    } catch (error) {
      // Error is already handled in the hook
    }
  };

  const handleDeleteDocument = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this document and all its chunks? This action cannot be undone.')) {
      await deleteDocument(id);
    }
  };

  const openDocument = (url: string) => {
    window.open(url, '_blank');
  };

  return (
    <div className="flex flex-col h-screen">
      <div className="border-b p-4">
        <h1 className="text-2xl font-bold">Document Search Tool</h1>
        <p className="text-muted-foreground">Manage your Google Documents for AI-powered search</p>
      </div>
      
      <Tabs defaultValue="chat" className="flex-1 flex flex-col">
        <TabsList className="grid w-full max-w-md mx-4 mt-4 grid-cols-2">
          <TabsTrigger value="chat">Chat</TabsTrigger>
          <TabsTrigger value="manage">Manage Documents</TabsTrigger>
        </TabsList>
        
        <TabsContent value="chat" className="flex-1 p-6">
          <Card className="h-full">
            <CardContent className="p-6">
              <div className="text-center py-8">
                <h3 className="text-lg font-semibold mb-2">Document Search Chat</h3>
                <p className="text-muted-foreground">Chat interface will be implemented here</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="manage" className="flex-1 overflow-auto">
          <div className="p-6 space-y-6">
            {/* Add Document Section */}
            <Card>
              <CardHeader>
                <CardTitle>Add Google Document</CardTitle>
                <CardDescription>
                  Add Google Docs, Sheets, or Slides to your knowledge base for AI-powered search
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label htmlFor="doc-url" className="text-sm font-medium">
                    Google Document URL
                  </label>
                  <Input
                    id="doc-url"
                    type="url"
                    placeholder="https://docs.google.com/document/d/..."
                    value={docUrl}
                    onChange={(e) => setDocUrl(e.target.value)}
                    className="mt-1"
                    disabled={isAdding}
                  />
                </div>
                <Button 
                  onClick={handleAddDocument} 
                  className="w-full"
                  disabled={isAdding || !docUrl.trim()}
                >
                  {isAdding ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processing Document...
                    </>
                  ) : (
                    <>
                      <Link className="w-4 h-4 mr-2" />
                      Add Document Link
                    </>
                  )}
                </Button>
                <p className="text-sm text-muted-foreground">
                  Documents must be publicly accessible or shared with view permissions
                </p>
                <div className="text-sm text-muted-foreground">
                  {documents.length}/25 documents linked
                </div>
                <div className="w-full bg-secondary rounded-full h-2">
                  <div 
                    className="bg-primary h-2 rounded-full transition-all duration-300" 
                    style={{ width: `${(documents.length / 25) * 100}%` }}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Linked Documents Section */}
            <Card>
              <CardHeader>
                <CardTitle>Linked Documents</CardTitle>
                <CardDescription>
                  Manage your uploaded documents
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin" />
                    <span className="ml-2">Loading documents...</span>
                  </div>
                ) : documents.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No documents linked yet. Add your first document above.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {documents.map((doc) => (
                      <div
                        key={doc.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-blue-100 rounded flex items-center justify-center">
                            <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M4 18h12V6h-4V2H4v16zM6 4h6v2H6V4z"/>
                            </svg>
                          </div>
                          <div>
                            <h3 className="font-medium">
                              {doc.doc_title || 'Untitled Document'}
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              Added on {new Date(doc.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant="secondary">Active</Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openDocument(doc.doc_link)}
                            disabled={deletingIds.has(doc.id)}
                          >
                            <ExternalLink className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteDocument(doc.id)}
                            disabled={deletingIds.has(doc.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            {deletingIds.has(doc.id) ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DocumentSearchTool;
