
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

  const addDocument = async (docLink: string, docTitle?: string) => {
    if (!user) return;

    try {
      // Use provided title or generate a fallback name
      const finalTitle = docTitle || generateDocumentName(docLink);

      const { data, error } = await supabase
        .from('google_documents')
        .insert({
          user_id: user.id,
          doc_link: docLink,
          doc_title: finalTitle
        })
        .select()
        .single();

      if (error) throw error;
      
      setDocuments(prev => [data, ...prev]);
      toast.success('Document added successfully! You can now search through it.');

      return data;
    } catch (error) {
      console.error('Error adding document:', error);
      toast.error('Failed to add document');
      throw error;
    }
  };

  const deleteDocument = async (id: string) => {
    try {
      console.log('Deleting document:', id);
      
      const { error } = await supabase
        .from('google_documents')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting document:', error);
        toast.error('Failed to remove document');
        return;
      }
      
      console.log('Document deleted successfully');
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
