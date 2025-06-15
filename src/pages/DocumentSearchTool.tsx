import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from "sonner";
import { SearchIcon, LinkIcon, ExternalLinkIcon, Trash2Icon, LogOutIcon, UserIcon, FileTextIcon, BookOpenIcon } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useGoogleDocuments } from '@/hooks/useGoogleDocuments';
import { useDocumentSearch } from '@/hooks/useDocumentSearch';
import { highlightKeywords } from '@/utils/highlightKeywords';
import GoogleSignIn from '@/components/auth/GoogleSignIn';

const DocumentSearchTool = () => {
  const { user, signOut, loading: authLoading } = useAuth();
  const { documents, loading: docsLoading, addDocument, deleteDocument } = useGoogleDocuments();
  const { searchDocuments, isSearching, error: searchError } = useDocumentSearch();
  
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [totalDocumentsSearched, setTotalDocumentsSearched] = useState(0);
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

  const handleSearch = async () => {
    if (!query.trim()) {
      toast.error("Please enter a search query.");
      return;
    }
    
    const results = await searchDocuments(query.trim());
    
    if (results) {
      setSearchResults(results.results);
      setTotalDocumentsSearched(results.totalDocumentsSearched);
      
      if (results.results.length === 0) {
        toast.info("No relevant content found in your documents.");
      } else {
        toast.success(`Found ${results.results.length} relevant results!`);
      }
    }
  };

  const handleFollowUp = async () => {
    if (!followUpQuery.trim()) {
      return;
    }
    
    setQuery(followUpQuery);
    const results = await searchDocuments(followUpQuery.trim());
    setFollowUpQuery('');
    
    if (results) {
      setSearchResults(results.results);
      setTotalDocumentsSearched(results.totalDocumentsSearched);
      
      if (results.results.length === 0) {
        toast.info("No relevant content found in your documents.");
      } else {
        toast.success(`Found ${results.results.length} relevant results!`);
      }
    }
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
    if (url.includes('/document/')) return <FileTextIcon className="h-5 w-5 text-blue-500" />;
    if (url.includes('/spreadsheets/')) return <LinkIcon className="h-5 w-5 text-green-500" />;
    if (url.includes('/presentation/')) return <LinkIcon className="h-5 w-5 text-orange-500" />;
    return <LinkIcon className="h-5 w-5 text-gray-500" />;
  };

  return (
    <div className="p-6">
      <div className="mb-8 flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Document Search & Access</h1>
          <p className="text-gray-600 mt-2">Search directly through your Google documents and find specific content with page references.</p>
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
              <label className="block text-lg font-medium mb-2">Search your documents</label>
              <div className="relative">
                <Input 
                  placeholder="Search for specific content in your documents..."
                  className="pr-12"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                />
                <Button 
                  className="absolute right-0 top-0 h-full bg-caregrowth-green"
                  onClick={handleSearch}
                  disabled={isSearching || !query.trim()}
                >
                  <SearchIcon className="h-5 w-5" />
                </Button>
              </div>
              {searchError && (
                <p className="text-red-500 text-sm mt-2">{searchError}</p>
              )}
            </div>
          </Card>
          
          {(isSearching || searchResults.length > 0) && (
            <Card className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Search Results</h2>
                {totalDocumentsSearched > 0 && (
                  <span className="text-sm text-gray-500">
                    Searched {totalDocumentsSearched} document{totalDocumentsSearched !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
              
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
              ) : searchResults.length > 0 ? (
                <div className="space-y-4">
                  {searchResults.map((result, index) => (
                    <div key={index} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex justify-between items-start mb-3">
                        <h3 className="font-semibold text-lg flex items-center gap-2">
                          <FileTextIcon className="h-5 w-5 text-blue-500" />
                          {result.documentTitle}
                        </h3>
                        <div className="flex gap-2 flex-wrap">
                          {result.pageNumber && (
                            <div className="flex items-center gap-1 text-xs bg-blue-100 text-blue-800 px-3 py-1 rounded-full">
                              <BookOpenIcon className="h-3 w-3" />
                              Page {result.pageNumber}
                            </div>
                          )}
                          <span className="text-xs bg-green-100 text-green-800 px-3 py-1 rounded-full">
                            {Math.round(result.confidence * 100)}% match
                          </span>
                        </div>
                      </div>
                      
                      <div className="bg-gray-50 border-l-4 border-blue-500 p-3 mb-3 rounded-r">
                        <div 
                          className="text-gray-700 leading-relaxed text-sm"
                          dangerouslySetInnerHTML={{ 
                            __html: highlightKeywords(result.relevantContent, query) 
                          }}
                        />
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          {result.pageNumber && (
                            <span className="flex items-center gap-1">
                              <BookOpenIcon className="h-3 w-3" />
                              Found on page {result.pageNumber}
                            </span>
                          )}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(result.documentUrl, '_blank')}
                          className="flex items-center gap-2"
                        >
                          <ExternalLinkIcon className="h-4 w-4" />
                          Open Document
                        </Button>
                      </div>
                    </div>
                  ))}
                  
                  <div className="mt-6">
                    <h3 className="text-lg font-semibold mb-2">Refine your search</h3>
                    <div className="flex gap-2">
                      <Textarea 
                        placeholder="Ask a more specific question..."
                        className="mb-0"
                        value={followUpQuery}
                        onChange={(e) => setFollowUpQuery(e.target.value)}
                      />
                      <Button 
                        className="h-auto bg-caregrowth-green"
                        onClick={handleFollowUp}
                        disabled={!followUpQuery.trim() || isSearching}
                      >
                        Search
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <SearchIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No results found for your search query.</p>
                  <p className="text-sm">Try using different keywords or make sure your documents are publicly accessible.</p>
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
                Documents must be publicly accessible or shared with view permissions
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
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium truncate">{document.doc_title}</p>
                          <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                            Active
                          </span>
                        </div>
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
