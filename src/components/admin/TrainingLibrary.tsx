import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Upload, FileText, Trash2, RefreshCw, Edit, BookOpen, 
  MessageSquare, Shield, HelpCircle, GraduationCap, Users, Sparkles 
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useUser } from '@/contexts/UserContext';
import { toast } from 'sonner';
import { 
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, 
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, 
  AlertDialogTitle, AlertDialogTrigger 
} from '@/components/ui/alert-dialog';
import { 
  Dialog, DialogContent, DialogDescription, DialogFooter, 
  DialogHeader, DialogTitle 
} from '@/components/ui/dialog';

interface TrainingDocument {
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

const TRAINING_CATEGORIES = [
  { 
    value: 'client_intake_guidance', 
    label: 'Client Intake Guidance',
    description: 'Documents describing intake workflows and onboarding processes',
    icon: Users
  },
  { 
    value: 'conversation_scripts', 
    label: 'Conversation Scripts',
    description: 'Scripts used when speaking with families or caregivers',
    icon: MessageSquare
  },
  { 
    value: 'insurance_payment_knowledge', 
    label: 'Insurance & Payment Knowledge',
    description: 'Information about Medicaid, VA benefits, long term care insurance, and private pay',
    icon: Shield
  },
  { 
    value: 'family_faq', 
    label: 'Family FAQ',
    description: 'Common questions families ask about home care services',
    icon: HelpCircle
  },
  { 
    value: 'training_modules', 
    label: 'Training Modules',
    description: 'Role play scenarios, onboarding training material, and staff guidance',
    icon: GraduationCap
  }
];

const TrainingLibrary = () => {
  const [documents, setDocuments] = useState<TrainingDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [activeCategory, setActiveCategory] = useState('client_intake_guidance');
  const [isUploading, setIsUploading] = useState(false);
  const [editingDoc, setEditingDoc] = useState<TrainingDocument | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [generatingScenarios, setGeneratingScenarios] = useState<string | null>(null);
  const { user } = useUser();

  const loadDocuments = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('shared_documents')
        .select('*')
        .in('document_category', TRAINING_CATEGORIES.map(c => c.value))
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (error) {
      console.error('Error fetching training documents:', error);
      toast.error('Failed to load training documents');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const maxSize = 50 * 1024 * 1024; // 50MB
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'text/plain'
    ];
    
    const validFiles: File[] = [];
    const invalidFiles: string[] = [];
    
    files.forEach(file => {
      const ext = file.name.split('.').pop()?.toLowerCase();
      const isValidType = allowedTypes.includes(file.type) || ['pdf', 'docx', 'doc', 'txt'].includes(ext || '');
      
      if (file.size > maxSize) {
        invalidFiles.push(`${file.name} (exceeds 50MB)`);
      } else if (!isValidType) {
        invalidFiles.push(`${file.name} (unsupported format - use PDF, DOCX, or TXT)`);
      } else {
        validFiles.push(file);
      }
    });
    
    if (invalidFiles.length > 0) {
      toast.error(`Files rejected: ${invalidFiles.join(', ')}`);
    }
    
    setSelectedFiles(validFiles);
  };

  const handleUpload = async () => {
    if (!user) {
      toast.error('You must be logged in to upload documents');
      return;
    }

    if (selectedFiles.length === 0) {
      toast.error('Please select files to upload');
      return;
    }

    setIsUploading(true);
    let successCount = 0;
    let errorCount = 0;

    try {
      toast.info(`Uploading ${selectedFiles.length} training document(s)...`);

      for (const file of selectedFiles) {
        try {
          const fileExt = file.name.split('.').pop();
          const fileName = `training/${activeCategory}/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;

          // Upload to storage
          const { error: uploadError } = await supabase.storage
            .from('shared-knowledge')
            .upload(fileName, file);

          if (uploadError) {
            console.error('Upload error:', uploadError);
            errorCount++;
            continue;
          }

          // Create database record
          const { data: docData, error: docError } = await supabase
            .from('shared_documents')
            .insert({
              file_name: file.name,
              file_path: fileName,
              doc_title: file.name.replace(/\.[^/.]+$/, ''),
              document_category: activeCategory,
              training_priority: 3, // Higher priority for training docs
              file_size: file.size,
              mime_type: file.type,
              uploaded_by: user.id,
              processing_status: 'processing'
            })
            .select()
            .single();

          if (docError) {
            console.error('Database error:', docError);
            await supabase.storage.from('shared-knowledge').remove([fileName]);
            errorCount++;
            continue;
          }

          // Trigger processing
          const { error: processError } = await supabase.functions.invoke('process-training-document', {
            body: {
              documentId: docData.id,
              filePath: fileName,
              category: activeCategory
            }
          });

          if (processError) {
            console.error('Processing error:', processError);
            // Still count as success since upload worked
          }

          successCount++;
        } catch (error) {
          console.error('Error uploading file:', error);
          errorCount++;
        }
      }

      if (successCount > 0) {
        toast.success(`${successCount} document(s) uploaded and processing started`);
        setSelectedFiles([]);
        const fileInput = document.getElementById('training-file-upload') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
        loadDocuments();
      }
      
      if (errorCount > 0) {
        toast.error(`${errorCount} document(s) failed to upload`);
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload documents');
    } finally {
      setIsUploading(false);
    }
  };

  const handleReprocess = async (docId: string, filePath: string, category: string) => {
    try {
      await supabase
        .from('shared_documents')
        .update({ processing_status: 'processing' })
        .eq('id', docId);

      const { error } = await supabase.functions.invoke('process-training-document', {
        body: { documentId: docId, filePath, category }
      });

      if (error) throw error;
      toast.success('Reprocessing started');
      loadDocuments();
    } catch (error) {
      console.error('Reprocess error:', error);
      toast.error('Failed to reprocess document');
    }
  };

  const handleDelete = async (docId: string, filePath: string) => {
    try {
      // Delete chunks
      await supabase
        .from('document_chunks')
        .delete()
        .eq('document_id', docId)
        .eq('is_shared', true);

      // Delete file from storage
      await supabase.storage.from('shared-knowledge').remove([filePath]);

      // Delete record
      const { error } = await supabase
        .from('shared_documents')
        .delete()
        .eq('id', docId);

      if (error) throw error;
      toast.success('Document deleted');
      loadDocuments();
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete document');
    }
  };

  const handleSaveEdit = async () => {
    if (!editingDoc) return;

    try {
      const { error } = await supabase
        .from('shared_documents')
        .update({ doc_title: editTitle })
        .eq('id', editingDoc.id);

      if (error) throw error;
      toast.success('Document updated');
      setEditingDoc(null);
      loadDocuments();
    } catch (error) {
      console.error('Update error:', error);
      toast.error('Failed to update document');
    }
  };

  const handleGenerateScenarios = async (docId: string) => {
    setGeneratingScenarios(docId);
    try {
      const { data, error } = await supabase.functions.invoke('generate-training-scenarios', {
        body: { documentId: docId }
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);

      toast.success(`Generated ${data.scenarios_generated} training scenarios!`);
    } catch (error: any) {
      console.error('Scenario generation error:', error);
      toast.error(error?.message || 'Failed to generate scenarios');
    } finally {
      setGeneratingScenarios(null);
    }
  };

  const getStatusBadge = (status: string, fetched: boolean) => {
    if (status === 'completed' && fetched) {
      return <Badge variant="default">Ready</Badge>;
    } else if (status === 'processing') {
      return <Badge variant="secondary">Processing</Badge>;
    } else if (status === 'error' || status === 'failed') {
      return <Badge variant="destructive">Error</Badge>;
    }
    return <Badge variant="outline">Pending</Badge>;
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return 'Unknown';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getCategoryDocs = (category: string) => {
    return documents.filter(d => d.document_category === category);
  };

  const activeCategoryInfo = TRAINING_CATEGORIES.find(c => c.value === activeCategory);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Training Library
          </CardTitle>
          <CardDescription>
            Upload training materials that power the AI assistant for all agencies. 
            These documents are processed into embeddings for intelligent search and responses.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeCategory} onValueChange={setActiveCategory}>
            <TabsList className="grid w-full grid-cols-5 mb-6">
              {TRAINING_CATEGORIES.map(cat => {
                const Icon = cat.icon;
                const count = getCategoryDocs(cat.value).length;
                return (
                  <TabsTrigger key={cat.value} value={cat.value} className="flex flex-col gap-1 py-3">
                    <Icon className="h-4 w-4" />
                    <span className="text-xs">{cat.label}</span>
                    {count > 0 && (
                      <Badge variant="secondary" className="text-xs px-1.5 py-0">
                        {count}
                      </Badge>
                    )}
                  </TabsTrigger>
                );
              })}
            </TabsList>

            {TRAINING_CATEGORIES.map(cat => (
              <TabsContent key={cat.value} value={cat.value} className="space-y-4">
                {/* Category Description */}
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">{cat.description}</p>
                </div>

                {/* Upload Section */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Upload to {cat.label}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex gap-4">
                      <div className="flex-1">
                        <Label htmlFor="training-file-upload" className="sr-only">Select Files</Label>
                        <Input
                          id="training-file-upload"
                          type="file"
                          multiple
                          accept=".pdf,.docx,.doc,.txt"
                          onChange={handleFileSelect}
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Supported: PDF, DOCX, TXT (max 50MB each)
                        </p>
                      </div>
                      <Button 
                        onClick={handleUpload} 
                        disabled={selectedFiles.length === 0 || isUploading}
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

                    {selectedFiles.length > 0 && (
                      <div className="p-3 bg-muted rounded-lg border">
                        <p className="text-sm font-medium mb-2">
                          Selected ({selectedFiles.length}):
                        </p>
                        <div className="space-y-1">
                          {selectedFiles.map((file, idx) => (
                            <div key={idx} className="flex items-center justify-between text-sm">
                              <span className="truncate">{file.name}</span>
                              <span className="text-muted-foreground ml-2">
                                ({formatFileSize(file.size)})
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Documents List */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">
                      Documents ({getCategoryDocs(cat.value).length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {isLoading ? (
                      <div className="text-center py-8">
                        <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2 text-muted-foreground" />
                        <p className="text-muted-foreground">Loading...</p>
                      </div>
                    ) : getCategoryDocs(cat.value).length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No documents in this category yet</p>
                        <p className="text-sm">Upload training materials above</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {getCategoryDocs(cat.value).map((doc) => (
                          <div 
                            key={doc.id} 
                            className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-medium truncate">
                                  {doc.doc_title || doc.file_name}
                                </h4>
                                {getStatusBadge(doc.processing_status, doc.fetched)}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                <span>{formatFileSize(doc.file_size)}</span>
                                <span className="mx-2">•</span>
                                <span>{new Date(doc.created_at).toLocaleDateString()}</span>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-2 ml-4">
                              {(doc.processing_status === 'completed' && doc.fetched) && (
                                <Button
                                  variant="default"
                                  size="sm"
                                  onClick={() => handleGenerateScenarios(doc.id)}
                                  disabled={generatingScenarios === doc.id}
                                >
                                  {generatingScenarios === doc.id ? (
                                    <>
                                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                      Generating...
                                    </>
                                  ) : (
                                    <>
                                      <Sparkles className="h-4 w-4 mr-2" />
                                      Generate Scenarios
                                    </>
                                  )}
                                </Button>
                              )}

                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setEditingDoc(doc);
                                  setEditTitle(doc.doc_title || doc.file_name);
                                }}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>

                              {(doc.processing_status === 'error' || doc.processing_status === 'pending' || doc.processing_status === 'failed') && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleReprocess(doc.id, doc.file_path, doc.document_category)}
                                >
                                  <RefreshCw className="h-4 w-4" />
                                </Button>
                              )}

                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="sm">
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete Training Document</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      This will permanently delete "{doc.doc_title || doc.file_name}" and 
                                      remove it from the AI knowledge base. This action cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction 
                                      onClick={() => handleDelete(doc.id, doc.file_path)}
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    >
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
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!editingDoc} onOpenChange={(open) => !open && setEditingDoc(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Document Title</DialogTitle>
            <DialogDescription>
              Update the display title for this training document.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="edit-title">Document Title</Label>
            <Input
              id="edit-title"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              placeholder="Enter document title"
              className="mt-2"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingDoc(null)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TrainingLibrary;
