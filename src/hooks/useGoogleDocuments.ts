
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from "sonner";

export interface GoogleDoc {
  id: string;
  doc_link: string;
  doc_title: string | null;
  created_at: string;
  fetched: boolean;
}

export const useGoogleDocuments = () => {
  const [documents, setDocuments] = useState<GoogleDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchDocuments = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('google_documents')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (error) {
      console.error('Error fetching documents:', error);
      toast.error('Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  const processDocument = async (documentId: string, docLink: string, docTitle?: string) => {
    try {
      console.log('Starting document processing for:', documentId, docTitle);
      
      const { data, error } = await supabase.functions.invoke('process-document', {
        body: {
          documentId,
          docLink,
          docTitle
        }
      });

      if (error) {
        console.error('Error processing document:', error);
        toast.error('Failed to process document content');
        return false;
      }

      console.log('Document processed successfully:', data);
      toast.success(`Document processed! Created ${data.chunksCreated || 0} content chunks.`);
      return true;
    } catch (error) {
      console.error('Error invoking process-document function:', error);
      toast.error('Failed to process document content');
      return false;
    }
  };

  const addDocument = async (docLink: string, docTitle?: string) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('google_documents')
        .insert({
          user_id: user.id,
          doc_link: docLink,
          doc_title: docTitle || `Document ${documents.length + 1}`
        })
        .select()
        .single();

      if (error) throw error;
      
      setDocuments(prev => [data, ...prev]);
      toast.success('Document added successfully!');

      // Process the document to create chunks and embeddings
      const processingToast = toast.loading('Processing document content and creating embeddings...');
      
      const processed = await processDocument(data.id, docLink, data.doc_title);
      
      toast.dismiss(processingToast);
      
      if (processed) {
        // Refresh documents to show updated fetched status
        fetchDocuments();
      }

      return data;
    } catch (error) {
      console.error('Error adding document:', error);
      toast.error('Failed to add document');
      throw error;
    }
  };

  const deleteDocument = async (id: string) => {
    try {
      console.log('Starting document deletion process for:', id);
      
      // Delete the document - chunks will be automatically deleted due to CASCADE
      const { error } = await supabase
        .from('google_documents')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting document:', error);
        toast.error('Failed to remove document');
        return;
      }
      
      console.log('Document and associated chunks deleted successfully');
      setDocuments(prev => prev.filter(doc => doc.id !== id));
      toast.success('Document removed successfully');
    } catch (error) {
      console.error('Error during document deletion:', error);
      toast.error('Failed to remove document');
    }
  };

  useEffect(() => {
    if (user) {
      fetchDocuments();
    }
  }, [user]);

  return {
    documents,
    loading,
    addDocument,
    deleteDocument,
    refetch: fetchDocuments
  };
};
