
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUser } from '@/contexts/UserContext';
import { toast } from 'sonner';

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

export const useSharedDocuments = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const { user } = useUser();

  const getSharedDocuments = async (): Promise<SharedDocument[]> => {
    try {
      const { data, error } = await supabase
        .from('shared_documents')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching shared documents:', error);
      return [];
    }
  };

  const uploadSharedDocument = async (
    file: File, 
    category: string = 'general', 
    priority: number = 1
  ): Promise<boolean> => {
    if (!user) {
      toast.error('You must be logged in to upload documents');
      return false;
    }

    setIsUploading(true);

    try {
      console.log('Uploading file:', file.name, 'Size:', file.size);

      // Generate unique file path
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `documents/${fileName}`;

      // Upload file to storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('shared-knowledge')
        .upload(filePath, file);

      if (uploadError) {
        console.error('Storage upload error:', uploadError);
        toast.error('Failed to upload file to storage');
        return false;
      }

      console.log('File uploaded to storage:', uploadData.path);

      // Create database record
      const { data: docData, error: docError } = await supabase
        .from('shared_documents')
        .insert({
          file_name: file.name,
          file_path: filePath,
          doc_title: file.name.replace(/\.[^/.]+$/, ''), // Remove extension
          document_category: category,
          training_priority: priority,
          file_size: file.size,
          mime_type: file.type,
          uploaded_by: user.id,
          processing_status: 'pending'
        })
        .select()
        .single();

      if (docError) {
        console.error('Database insert error:', docError);
        // Clean up uploaded file
        await supabase.storage.from('shared-knowledge').remove([filePath]);
        toast.error('Failed to create document record');
        return false;
      }

      console.log('Document record created:', docData.id);

      // Trigger document processing
      const { error: processError } = await supabase.functions.invoke('process-shared-document', {
        body: {
          documentId: docData.id,
          filePath: filePath
        }
      });

      if (processError) {
        console.error('Document processing error:', processError);
        toast.error('Document uploaded but processing failed. Please try reprocessing it.');
      } else {
        toast.success('Document uploaded and processing started');
      }

      return true;
    } catch (error) {
      console.error('Error uploading shared document:', error);
      toast.error('Failed to upload document');
      return false;
    } finally {
      setIsUploading(false);
    }
  };

  const reprocessDocument = async (documentId: string): Promise<boolean> => {
    try {
      const { data: doc, error: fetchError } = await supabase
        .from('shared_documents')
        .select('file_path')
        .eq('id', documentId)
        .single();

      if (fetchError || !doc) {
        toast.error('Document not found');
        return false;
      }

      // Update status to processing
      await supabase
        .from('shared_documents')
        .update({ processing_status: 'processing' })
        .eq('id', documentId);

      const { error: processError } = await supabase.functions.invoke('process-shared-document', {
        body: {
          documentId: documentId,
          filePath: doc.file_path
        }
      });

      if (processError) {
        console.error('Reprocessing error:', processError);
        toast.error('Failed to reprocess document');
        return false;
      }

      toast.success('Document reprocessing started');
      return true;
    } catch (error) {
      console.error('Error reprocessing document:', error);
      toast.error('Failed to reprocess document');
      return false;
    }
  };

  const deleteSharedDocument = async (documentId: string): Promise<boolean> => {
    try {
      // Get document details first
      const { data: doc, error: fetchError } = await supabase
        .from('shared_documents')
        .select('file_path')
        .eq('id', documentId)
        .single();

      if (fetchError) {
        console.error('Error fetching document for deletion:', fetchError);
        toast.error('Failed to find document');
        return false;
      }

      // Delete associated chunks
      await supabase
        .from('document_chunks')
        .delete()
        .eq('document_id', documentId)
        .eq('is_shared', true);

      // Delete from storage
      await supabase.storage
        .from('shared-knowledge')
        .remove([doc.file_path]);

      // Delete database record
      const { error: deleteError } = await supabase
        .from('shared_documents')
        .delete()
        .eq('id', documentId);

      if (deleteError) {
        console.error('Error deleting document record:', deleteError);
        toast.error('Failed to delete document');
        return false;
      }

      toast.success('Document deleted successfully');
      return true;
    } catch (error) {
      console.error('Error deleting shared document:', error);
      toast.error('Failed to delete document');
      return false;
    }
  };

  const updateDocumentSettings = async (
    documentId: string,
    updates: Partial<Pick<SharedDocument, 'doc_title' | 'document_category' | 'training_priority'>>
  ): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('shared_documents')
        .update(updates)
        .eq('id', documentId);

      if (error) {
        console.error('Error updating document:', error);
        toast.error('Failed to update document');
        return false;
      }

      toast.success('Document updated successfully');
      return true;
    } catch (error) {
      console.error('Error updating document:', error);
      toast.error('Failed to update document');
      return false;
    }
  };

  const uploadMultipleSharedDocuments = async (
    files: File[], 
    category: string = 'general', 
    priority: number = 1
  ): Promise<boolean> => {
    if (!user) {
      toast.error('You must be logged in to upload documents');
      return false;
    }

    if (files.length === 0) {
      toast.error('No files selected');
      return false;
    }

    setIsUploading(true);
    let successCount = 0;
    let errorCount = 0;

    try {
      toast.info(`Uploading ${files.length} files...`);
      
      for (const file of files) {
        try {
          console.log('Uploading file:', file.name, 'Size:', file.size);

          // Generate unique file path
          const fileExt = file.name.split('.').pop();
          const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
          const filePath = `documents/${fileName}`;

          // Upload file to storage
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('shared-knowledge')
            .upload(filePath, file);

          if (uploadError) {
            console.error('Storage upload error for', file.name, ':', uploadError);
            errorCount++;
            continue;
          }

          console.log('File uploaded to storage:', uploadData.path);

          // Create database record
          const { data: docData, error: docError } = await supabase
            .from('shared_documents')
            .insert({
              file_name: file.name,
              file_path: filePath,
              doc_title: file.name.replace(/\.[^/.]+$/, ''), // Remove extension
              document_category: category,
              training_priority: priority,
              file_size: file.size,
              mime_type: file.type,
              uploaded_by: user.id,
              processing_status: 'pending'
            })
            .select()
            .single();

          if (docError) {
            console.error('Database insert error for', file.name, ':', docError);
            // Clean up uploaded file
            await supabase.storage.from('shared-knowledge').remove([filePath]);
            errorCount++;
            continue;
          }

          console.log('Document record created for', file.name, ':', docData.id);

          // Trigger document processing
          const { error: processError } = await supabase.functions.invoke('process-shared-document', {
            body: {
              documentId: docData.id,
              filePath: filePath
            }
          });

          if (processError) {
            console.error('Document processing error for', file.name, ':', processError);
          }

          successCount++;
        } catch (error) {
          console.error('Error uploading file', file.name, ':', error);
          errorCount++;
        }
      }

      // Show final result
      if (successCount > 0 && errorCount === 0) {
        toast.success(`All ${successCount} files uploaded successfully!`);
      } else if (successCount > 0 && errorCount > 0) {
        toast.warning(`${successCount} files uploaded successfully, ${errorCount} failed`);
      } else {
        toast.error('Failed to upload any files');
        return false;
      }

      return successCount > 0;
    } catch (error) {
      console.error('Error uploading multiple shared documents:', error);
      toast.error('Failed to upload documents');
      return false;
    } finally {
      setIsUploading(false);
    }
  };

  return {
    getSharedDocuments,
    uploadSharedDocument,
    uploadMultipleSharedDocuments,
    reprocessDocument,
    deleteSharedDocument,
    updateDocumentSettings,
    isLoading,
    isUploading
  };
};
