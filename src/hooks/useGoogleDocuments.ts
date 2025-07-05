
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from "sonner";

export interface GoogleDoc {
  id: string;
  doc_link: string;
  doc_title: string | null;
  created_at: string;
}

// Function to generate a meaningful document name from URL as fallback
const generateDocumentName = (docUrl: string): string => {
  try {
    // Extract document ID for uniqueness
    const docIdMatch = docUrl.match(/\/document\/d\/([a-zA-Z0-9-_]+)/);
    const spreadsheetMatch = docUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    const presentationMatch = docUrl.match(/\/presentation\/d\/([a-zA-Z0-9-_]+)/);
    
    let docType = 'Document';
    let docId = '';
    
    if (docIdMatch) {
      docType = 'Document';
      docId = docIdMatch[1].substring(0, 8); // First 8 chars of ID
    } else if (spreadsheetMatch) {
      docType = 'Spreadsheet';
      docId = spreadsheetMatch[1].substring(0, 8);
    } else if (presentationMatch) {
      docType = 'Presentation';
      docId = presentationMatch[1].substring(0, 8);
    }
    
    // Create a more descriptive name with timestamp
    const timestamp = new Date().toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
    
    return `Google ${docType} - ${timestamp} (${docId})`;
  } catch (error) {
    console.error('Error generating document name:', error);
    return `Google Document - ${new Date().toLocaleDateString()}`;
  }
};

// Function to fetch document content from Google Docs
const fetchDocumentContent = async (docUrl: string): Promise<string | null> => {
  try {
    // Convert Google Docs URL to plain text export URL
    let exportUrl = '';
    
    if (docUrl.includes('/document/d/')) {
      const docId = docUrl.match(/\/document\/d\/([a-zA-Z0-9-_]+)/)?.[1];
      if (docId) {
        exportUrl = `https://docs.google.com/document/d/${docId}/export?format=txt`;
      }
    } else if (docUrl.includes('/spreadsheets/d/')) {
      const docId = docUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/)?.[1];
      if (docId) {
        exportUrl = `https://docs.google.com/spreadsheets/d/${docId}/export?format=csv`;
      }
    } else if (docUrl.includes('/presentation/d/')) {
      const docId = docUrl.match(/\/presentation\/d\/([a-zA-Z0-9-_]+)/)?.[1];
      if (docId) {
        exportUrl = `https://docs.google.com/presentation/d/${docId}/export/txt`;
      }
    }

    if (!exportUrl) {
      throw new Error('Unable to create export URL');
    }

    const response = await fetch(exportUrl);
    if (!response.ok) {
      throw new Error('Failed to fetch document content');
    }

    const content = await response.text();
    return content;
  } catch (error) {
    console.error('Error fetching document content:', error);
    return null;
  }
};

export const useGoogleDocuments = () => {
  const [documents, setDocuments] = useState<GoogleDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
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

  const addDocument = async (docLink: string, docTitle?: string) => {
    if (!user) return;

    setIsAdding(true);
    try {
      // First, try to fetch the document content
      console.log('Fetching document content for:', docLink);
      const content = await fetchDocumentContent(docLink);
      
      if (!content) {
        toast.error('Unable to access document content. Please ensure the document is publicly accessible.');
        return;
      }

      console.log('Document content fetched, length:', content.length);

      // Use provided title or generate a fallback name
      const finalTitle = docTitle || generateDocumentName(docLink);

      // Save document to database first
      const { data, error } = await supabase
        .from('google_documents')
        .insert({
          user_id: user.id,
          doc_link: docLink,
          doc_title: finalTitle,
          fetched: false
        })
        .select()
        .single();

      if (error) throw error;
      
      console.log('Document saved to database:', data.id);

      // Call the process-document function to handle both chunking and embedding generation
      try {
        const { error: processError } = await supabase.functions.invoke('process-document', {
          body: {
            documentId: data.id,
            content: content,
            skipChunking: false // Let the function handle chunking and embeddings
          }
        });

        if (processError) {
          console.error('Error in process-document function:', processError);
          throw processError;
        }
        
        console.log('Document processed successfully with embeddings');
      } catch (processError) {
        console.error('Error calling process-document function:', processError);
        throw processError;
      }
      
      // Refresh the documents list to show the updated document
      await fetchDocuments();
      toast.success(`Document processed successfully with embeddings generated!`);

      return data;
    } catch (error) {
      console.error('Error adding document:', error);
      toast.error('Failed to add document');
      throw error;
    } finally {
      setIsAdding(false);
    }
  };

  const deleteDocument = async (id: string) => {
    if (deletingIds.has(id)) return; // Prevent multiple deletions

    setDeletingIds(prev => new Set(prev).add(id));
    try {
      console.log('Deleting document and its chunks:', id);
      
      // First delete all chunks associated with this document
      const { error: chunksError } = await supabase
        .from('document_chunks')
        .delete()
        .eq('document_id', id);

      if (chunksError) {
        console.error('Error deleting document chunks:', chunksError);
        toast.error('Failed to remove document chunks');
        return;
      }

      console.log('Document chunks deleted successfully');

      // Then delete the document itself
      const { error: docError } = await supabase
        .from('google_documents')
        .delete()
        .eq('id', id);

      if (docError) {
        console.error('Error deleting document:', docError);
        toast.error('Failed to remove document');
        return;
      }
      
      console.log('Document deleted successfully');
      setDocuments(prev => prev.filter(doc => doc.id !== id));
      toast.success('Document and all its chunks removed successfully');
    } catch (error) {
      console.error('Error during document deletion:', error);
      toast.error('Failed to remove document');
    } finally {
      setDeletingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
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
    isAdding,
    deletingIds,
    addDocument,
    deleteDocument,
    refetch: fetchDocuments
  };
};
