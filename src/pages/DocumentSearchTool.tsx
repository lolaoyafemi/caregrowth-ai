
import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from "sonner";
import { SearchIcon, LinkIcon, ExternalLinkIcon, Trash2Icon, LogOutIcon, UserIcon } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useGoogleDocuments } from '@/hooks/useGoogleDocuments';
import GoogleSignIn from '@/components/auth/GoogleSignIn';

interface SearchResult {
  query: string;
  answer: string;
  sources: Array<{
    documentTitle: string;
    url: string;
    excerpt: string;
    confidence: number;
  }>;
}

const DocumentSearchTool = () => {
  const { user, signOut, loading: authLoading } = useAuth();
  const { documents, loading: docsLoading, addDocument, deleteDocument } = useGoogleDocuments();
  
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null);
  const [followUpQuery, setFollowUpQuery] = useState('');
  const [googleUrl, setGoogleUrl] = useState('');

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-caregrowth-blue"></div>
      </div>
    );
  }

  if (!user) {
    return <GoogleSignIn />;
  }

  const handleSearch = () => {
    if (!query.trim()) {
      toast.error("Please enter a search query.");
      return;
    }
    
    setIsSearching(true);
    setSearchResult(null);
    
    // Simulate search with real documents
    setTimeout(() => {
      const availableDocs = documents.slice(0, 3);
      const sampleResult: SearchResult = {
        query: query,
        answer: `Based on your query "${query}", I found the following information in your linked Google documents:

The process should be implemented according to the guidelines outlined in your documents. Key elements include:

1. Initial assessment and planning phase
2. Implementation with clear milestones and KPIs
3. Regular review meetings and progress tracking
4. Performance monitoring using established metrics

${availableDocs.length > 0 ? `Your documents contain relevant information that shows this approach has been effective in similar contexts.` : 'To get more specific answers, try adding some Google documents to your knowledge base.'}`,
        sources: availableDocs.map((doc, index) => ({
          documentTitle: doc.doc_title || `Document ${index + 1}`,
          url: doc.doc_link,
          excerpt: `Information from your Google document regarding ${query}. This document contains relevant details about implementation strategies and best practices that can guide your approach.`,
          confidence: 0.9 - (index * 0.1)
        }))
      };
      
      setSearchResult(sampleResult);
      setIsSearching(false);
      toast.success("Search completed!");
    }, 2000);
  };

  const handleFollowUp = () => {
    if (!followUpQuery.trim() || !searchResult) {
      return;
    }
    
    setIsSearching(true);
    
    setTimeout(() => {
      const updatedResult: SearchResult = {
        query: followUpQuery,
        answer: `To expand on the previous answer about ${query}, here's more information about ${followUpQuery}:

Based on your Google documents, the best practices include:

1. Structured approach with dedicated resources
2. Clear timeline with specific milestones  
3. Stakeholder engagement and feedback loops
4. Automated reporting and progress tracking

${documents.length > 0 ? 'Your documents provide detailed guidance on implementation that typically takes 4-6 weeks for optimal results.' : 'Consider adding more Google documents for more comprehensive answers.'}`,
        sources: documents.slice(0, 2).map((doc, index) => ({
          documentTitle: doc.doc_title || `Document ${index + 1}`,
          url: doc.doc_link,
          excerpt: `Additional insights from your Google document about ${followUpQuery}. This content provides specific recommendations for successful implementation.`,
          confidence: 0.85 - (index * 0.05)
        }))
      };
      
      setSearchResult(updatedResult);
      setFollowUpQuery('');
      setIsSearching(false);
    }, 2000);
  };

  const handleAddGoogleLink = async () => {
    if (!googleUrl.trim()) {
      toast.error("Please enter a Google document URL.");
      return;
    }

    if (!googleUrl.includes('docs.google.com') && !googleUrl.includes('drive.google.com')) {
      toast.error("Please enter a valid Google document URL.");
      return;
    }

    try {
      const title = googleUrl.includes('/document/') ? 'Google Doc' :
                   googleUrl.includes('/spreadsheets/') ? 'Google Sheet' :
                   googleUrl.includes('/presentation/') ? 'Google Slides' : 'Google Document';
      
      await addDocument(googleUrl, `${title} ${documents.length + 1}`);
      setGoogleUrl('');
    } catch (error) {
      // Error already handled in hook
    }
  };

  const handleDeleteDocument = async (id: string) => {
    await deleteDocument(id);
  };

  const handleViewDocument = (doc: any) => {
    window.open(doc.doc_link, '_blank');
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success("Signed out successfully");
    } catch (error) {
      toast.error("Failed to sign out");
    }
  };

  const getDocumentIcon = (url: string) => {
    if (url.includes('/document/')) return <LinkIcon className="h-5 w-5 text-blue-500" />;
    if (url.includes('/spreadsheets/')) return <LinkIcon className="h-5 w-5 text-green-500" />;
    if (url.includes('/presentation/')) return <LinkIcon className="h-5 w-5 text-orange-500" />;
    return <LinkIcon className="h-5 w-5 text-gray-500" />;
  };

  return (
    <div className="p-6">
      <div className="mb-8 flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Document Search & Access</h1>
          <p className="text-gray-600 mt-2">Search your Google documents and get instant answers from your knowledge base.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <UserIcon className="h-4 w-4" />
            <span>{user?.email}</span>
          </div>
          <Button 
            variant="outline" 
            onClick={handleSignOut}
            className="flex items-center gap-2"
          >
            <LogOutIcon className="h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card className="p-6 mb-6">
            <div className="mb-4">
              <label className="block text-lg font-medium mb-2">What would you like to know?</label>
              <div className="relative">
                <Input 
                  placeholder="Ask a question about your documents..."
                  className="pr-12"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
                <Button 
                  className="absolute right-0 top-0 h-full bg-caregrowth-green"
                  onClick={handleSearch}
                  disabled={isSearching || !query.trim()}
                >
                  <SearchIcon className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </Card>
          
          {(isSearching || searchResult) && (
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Search Results</h2>
              {isSearching ? (
                <div className="min-h-[200px] flex items-center justify-center">
                  <div className="animate-pulse space-y-4 w-full">
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-4 bg-gray-200 rounded w-full"></div>
                    <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                    <div className="h-4 bg-gray-200 rounded w-4/6"></div>
                    <div className="h-4 bg-gray-200 rounded w-full"></div>
                    <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                  </div>
                </div>
              ) : searchResult && (
                <div className="prose max-w-none">
                  <div className="p-4 bg-gray-50 rounded-lg mb-6">
                    <h3 className="text-lg font-semibold mb-2">Answer</h3>
                    <div className="whitespace-pre-line">
                      {searchResult.answer}
                    </div>
                  </div>
                  
                  {searchResult.sources.length > 0 && (
                    <>
                      <h3 className="text-lg font-semibold mb-2">Sources</h3>
                      <div className="space-y-4 mb-6">
                        {searchResult.sources.map((source, index) => (
                          <div 
                            key={index} 
                            className="border rounded-lg p-3 hover:bg-gray-50 cursor-pointer"
                            onClick={() => window.open(source.url, '_blank')}
                          >
                            <div className="flex justify-between items-start mb-1">
                              <div className="flex items-center gap-2">
                                <LinkIcon className="h-4 w-4 text-caregrowth-blue" />
                                <span className="font-medium">{source.documentTitle}</span>
                                <ExternalLinkIcon className="h-3 w-3 text-gray-400" />
                              </div>
                              <div className="text-sm text-gray-500">
                                Match: {Math.round(source.confidence * 100)}%
                              </div>
                            </div>
                            <p className="text-sm bg-white p-2 rounded border border-gray-100">
                              "...{source.excerpt}..."
                            </p>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                  
                  <div className="mt-6">
                    <h3 className="text-lg font-semibold mb-2">Ask a follow-up question</h3>
                    <div className="flex gap-2">
                      <Textarea 
                        placeholder="Ask a related question..."
                        className="mb-0"
                        value={followUpQuery}
                        onChange={(e) => setFollowUpQuery(e.target.value)}
                      />
                      <Button 
                        className="h-auto bg-caregrowth-green"
                        onClick={handleFollowUp}
                        disabled={!followUpQuery.trim() || isSearching}
                      >
                        Submit
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </Card>
          )}
        </div>
        
        <div>
          <Card className="p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Add Google Document</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Google Document URL</label>
                <Input
                  placeholder="https://docs.google.com/document/d/..."
                  value={googleUrl}
                  onChange={(e) => setGoogleUrl(e.target.value)}
                />
              </div>
              <Button 
                onClick={handleAddGoogleLink}
                className="w-full bg-caregrowth-green"
                disabled={!googleUrl.trim()}
              >
                <LinkIcon className="h-4 w-4 mr-2" />
                Add Document Link
              </Button>
              <p className="text-xs text-gray-500">
                Supports Google Docs, Sheets, Slides, and Drive files
              </p>
            </div>
            <div className="mt-4">
              <p className="text-sm text-gray-600 mb-2">{documents.length}/25 documents linked</p>
              <div className="w-full h-2 bg-gray-100 rounded-full">
                <div className="h-full bg-caregrowth-green rounded-full" style={{ width: `${(documents.length / 25) * 100}%` }}></div>
              </div>
            </div>
          </Card>
          
          <Card className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Linked Documents</h2>
            </div>
            
            {docsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse">
                    <div className="h-12 bg-gray-200 rounded"></div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                {documents.map((document) => (
                  <div key={document.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-md hover:bg-gray-100 transition-colors">
                    <div className="flex items-center cursor-pointer flex-1" onClick={() => handleViewDocument(document)}>
                      {getDocumentIcon(document.doc_link)}
                      <div className="ml-3 flex-1">
                        <p className="text-sm font-medium truncate">{document.doc_title}</p>
                        <p className="text-xs text-gray-500">Added on {new Date(document.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="flex gap-2 ml-2">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 w-8 p-0 text-gray-500"
                        onClick={() => handleViewDocument(document)}
                      >
                        <ExternalLinkIcon className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"
                        onClick={() => handleDeleteDocument(document.id)}
                      >
                        <Trash2Icon className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                
                {documents.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <LinkIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>No documents linked yet</p>
                    <p className="text-sm">Add your first Google document to get started</p>
                  </div>
                )}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};

export default DocumentSearchTool;
