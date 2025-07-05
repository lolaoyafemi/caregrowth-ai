
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Upload, FileText, Trash2, RefreshCw, Edit, Download } from 'lucide-react';
import { useSharedDocuments } from '@/hooks/useSharedDocuments';
import { toast } from 'sonner';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

interface SharedDocument {
  id: string;
  file_name: string;
  file_path: string;
  doc_title: string | null;
  document_category: string;
  training_priority: number;
  processing_status: string;
  file_size: number | null;
  mime_type: string | null;
  uploaded_by: string | null;
  created_at: string;
  updated_at: string;
  fetched: boolean;
}

const SharedDocumentManager = () => {
  const [documents, setDocuments] = useState<SharedDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadCategory, setUploadCategory] = useState('general');
  const [uploadPriority, setUploadPriority] = useState(1);
  const [editingDoc, setEditingDoc] = useState<SharedDocument | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editCategory, setEditCategory] = useState('general');
  const [editPriority, setEditPriority] = useState(1);

  const {
    getSharedDocuments,
    uploadSharedDocument,
    reprocessDocument,
    deleteSharedDocument,
    updateDocumentSettings,
    isUploading
  } = useSharedDocuments();

  const loadDocuments = async () => {
    setIsLoading(true);
    const docs = await getSharedDocuments();
    setDocuments(docs);
    setIsLoading(false);
  };

  useEffect(() => {
    loadDocuments();
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const maxSize = 50 * 1024 * 1024; // 50MB
      if (file.size > maxSize) {
        toast.error('File size must be less than 50MB');
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error('Please select a file to upload');
      return;
    }

    const success = await uploadSharedDocument(selectedFile, uploadCategory, uploadPriority);
    if (success) {
      setSelectedFile(null);
      setUploadCategory('general');
      setUploadPriority(1);
      loadDocuments();
      // Reset file input
      const fileInput = document.getElementById('file-upload') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
    }
  };

  const handleReprocess = async (docId: string) => {
    const success = await reprocessDocument(docId);
    if (success) {
      loadDocuments();
    }
  };

  const handleDelete = async (docId: string) => {
    const success = await deleteSharedDocument(docId);
    if (success) {
      loadDocuments();
    }
  };

  const handleEdit = (doc: SharedDocument) => {
    setEditingDoc(doc);
    setEditTitle(doc.doc_title || doc.file_name);
    setEditCategory(doc.document_category);
    setEditPriority(doc.training_priority);
  };

  const handleSaveEdit = async () => {
    if (!editingDoc) return;

    const success = await updateDocumentSettings(editingDoc.id, {
      doc_title: editTitle,
      document_category: editCategory,
      training_priority: editPriority
    });

    if (success) {
      setEditingDoc(null);
      loadDocuments();
    }
  };

  const getStatusBadge = (status: string, fetched: boolean) => {
    if (status === 'completed' && fetched) {
      return <Badge variant="default" className="bg-green-500">Ready</Badge>;
    } else if (status === 'processing') {
      return <Badge variant="secondary">Processing</Badge>;
    } else if (status === 'error') {
      return <Badge variant="destructive">Error</Badge>;
    } else {
      return <Badge variant="outline">Pending</Badge>;
    }
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return 'Unknown';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const categories = [
    { value: 'general', label: 'General' },
    { value: 'marketing', label: 'Marketing' },
    { value: 'operations', label: 'Operations' },
    { value: 'compliance', label: 'Compliance' },
    { value: 'training', label: 'Training' },
    { value: 'policies', label: 'Policies' }
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload Shared Knowledge Document
          </CardTitle>
          <CardDescription>
            Upload documents that will be available to Ask Jared for all users
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="file-upload">Select File</Label>
              <Input
                id="file-upload"
                type="file"
                accept=".pdf,.txt,.docx,.doc,.csv"
                onChange={handleFileSelect}
                className="mt-1"
              />
            </div>
            
            <div>
              <Label htmlFor="category">Category</Label>
              <Select value={uploadCategory} onValueChange={setUploadCategory}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(cat => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="priority">Priority</Label>
              <Select value={uploadPriority.toString()} onValueChange={(value) => setUploadPriority(parseInt(value))}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Low (1)</SelectItem>
                  <SelectItem value="2">Medium (2)</SelectItem>
                  <SelectItem value="3">High (3)</SelectItem>
                  <SelectItem value="4">Critical (4)</SelectItem>
                  <SelectItem value="5">Essential (5)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button 
                onClick={handleUpload} 
                disabled={!selectedFile || isUploading}
                className="w-full"
              >
                {isUploading ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload
                  </>
                )}
              </Button>
            </div>
          </div>

          {selectedFile && (
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm">
                <strong>Selected:</strong> {selectedFile.name} ({formatFileSize(selectedFile.size)})
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Shared Knowledge Documents
          </CardTitle>
          <CardDescription>
            Manage documents available to Ask Jared for all users
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2" />
              <p>Loading documents...</p>
            </div>
          ) : documents.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No shared documents uploaded yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {documents.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-medium">{doc.doc_title || doc.file_name}</h3>
                      {getStatusBadge(doc.processing_status, doc.fetched)}
                      <Badge variant="outline">{doc.document_category}</Badge>
                      <Badge variant="outline">Priority: {doc.training_priority}</Badge>
                    </div>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p>File: {doc.file_name} ({formatFileSize(doc.file_size)})</p>
                      <p>Uploaded: {new Date(doc.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(doc)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Edit Document</DialogTitle>
                          <DialogDescription>
                            Update document settings and metadata
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="edit-title">Document Title</Label>
                            <Input
                              id="edit-title"
                              value={editTitle}
                              onChange={(e) => setEditTitle(e.target.value)}
                              placeholder="Enter document title"
                            />
                          </div>
                          <div>
                            <Label htmlFor="edit-category">Category</Label>
                            <Select value={editCategory} onValueChange={setEditCategory}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {categories.map(cat => (
                                  <SelectItem key={cat.value} value={cat.value}>
                                    {cat.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label htmlFor="edit-priority">Priority</Label>
                            <Select value={editPriority.toString()} onValueChange={(value) => setEditPriority(parseInt(value))}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="1">Low (1)</SelectItem>
                                <SelectItem value="2">Medium (2)</SelectItem>
                                <SelectItem value="3">High (3)</SelectItem>
                                <SelectItem value="4">Critical (4)</SelectItem>
                                <SelectItem value="5">Essential (5)</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setEditingDoc(null)}>
                            Cancel
                          </Button>
                          <Button onClick={handleSaveEdit}>
                            Save Changes
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>

                    {(doc.processing_status === 'error' || doc.processing_status === 'pending') && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleReprocess(doc.id)}
                      >
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                    )}

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Document</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete this document? This will remove it from the shared knowledge base and all associated chunks will be deleted. This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(doc.id)}>
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SharedDocumentManager;
