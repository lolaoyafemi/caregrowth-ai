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
import { useUserCredits } from '@/hooks/useUserCredits';
import { highlightKeywords } from '@/utils/highlightKeywords';
import GoogleSignIn from '@/components/auth/GoogleSignIn';

const DocumentSearchTool = () => {
  const { user, signOut, loading: authLoading } = useAuth();
  const { documents, loading: docsLoading, addDocument, deleteDocument } = useGoogleDocuments();
  const { searchDocuments, smartSearchDocuments, isSearching, error: searchError } = useDocumentSearch();
  const { credits, loading: creditsLoading } = useUserCredits();
  
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [smartSearchResult, setSmartSearchResult] = useState(null);
  const [totalDocumentsSearched, setTotalDocumentsSearched] = useState(0);
  const [followUpQuery, setFollowUpQuery] = useState('');
  const [googleUrl, setGoogleUrl] = useState('');
  const [searchMode, setSearchMode] = useState<'basic' | 'smart'>('smart');

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
    
    console.log(`Starting ${searchMode} search with query:`, query);
    
    if (searchMode === 'smart') {
      const result = await smartSearchDocuments(query.trim());
      
      if (result) {
        console.log('Smart search result received:', result);
        setSmartSearchResult(result);
        setSearchResults([]); // Clear basic results
        
        if (!result.answer || result.answer.includes("don't have access")) {
          toast.info("No relevant content found in your documents.");
        } else {
          toast.success(`Generated intelligent answer from ${result.sources.length} documents!`);
        }
      }
    } else {
      const results = await searchDocuments(query.trim());
      
      if (results) {
        console.log('Basic search results received:', results);
        setSearchResults(results.results);
        setSmartSearchResult(null); // Clear smart results
        setTotalDocumentsSearched(results.totalDocumentsSearched);
        
        if (results.results.length === 0) {
          toast.info("No relevant content found in your documents.");
        } else {
          toast.success(`Found ${results.results.length} relevant results!`);
        }
      }
    }
  };

  const handleFollowUp = async () => {
    if (!followUpQuery.trim()) {
      return;
    }
    
    setQuery(followUpQuery);
    
    if (searchMode === 'smart') {
      const result = await smartSearchDocuments(followUpQuery.trim());
      setFollowUpQuery('');
      
      if (result) {
        setSmartSearchResult(result);
        setSearchResults([]);
        
        if (!result.answer || result.answer.includes("don't have access")) {
          toast.info("No relevant content found in your documents.");
        } else {
          toast.success(`Generated intelligent answer from ${result.sources.length} documents!`);
        }
      }
    } else {
      const results = await searchDocuments(followUpQuery.trim());
      setFollowUpQuery('');
      
      if (results) {
        setSearchResults(results.results);
        setSmartSearchResult(null);
        setTotalDocumentsSearched(results.totalDocumentsSearched);
        
        if (results.results.length === 0) {
          toast.info("No relevant content found in your documents.");
        } else {
          toast.success(`Found ${results.results.length} relevant results!`);
        }
      }
    }
  };

  const handleAddGoogleLink = async () => {
    if (!googleUrl.trim()) {
      toast.error("Please enter Google document URLs.");
      return;
    }

    // Split by lines and filter out empty lines
    const urls = googleUrl.split('\n').map(url => url.trim()).filter(url => url);
    
    if (urls.length === 0) {
      toast.error("Please enter at least one Google document URL.");
      return;
    }

    // Validate all URLs
    const invalidUrls = urls.filter(url => !url.includes('docs.google.com') && !url.includes('drive.google.com'));
    if (invalidUrls.length > 0) {
      toast.error(`Invalid URLs found. Please ensure all URLs are valid Google document URLs.`);
      return;
    }

    let successCount = 0;
    let errorCount = 0;

    for (const url of urls) {
      try {
        const title = url.includes('/document/') ? 'Google Doc' :
                     url.includes('/spreadsheets/') ? 'Google Sheet' :
                     url.includes('/presentation/') ? 'Google Slides' : 'Google Document';
        
        await addDocument(url, `${title} ${documents.length + successCount + 1}`);
        successCount++;
      } catch (error) {
        errorCount++;
      }
    }

    if (successCount > 0) {
      toast.success(`Successfully added ${successCount} document${successCount !== 1 ? 's' : ''}`);
    }
    if (errorCount > 0) {
      toast.error(`Failed to add ${errorCount} document${errorCount !== 1 ? 's' : ''}`);
    }

    if (successCount > 0) {
      setGoogleUrl('');
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
          <p className="text-gray-600 mt-2">Search directly through your Google documents and get intelligent answers powered by AI.</p>
          <p className="text-sm text-gray-500 mt-1">Cost: 1 credit per basic search, 2 credits per smart search</p>
          {!creditsLoading && (
            <div className="mt-2">
              <span className={`text-sm font-medium ${credits > 0 ? 'text-green-600' : 'text-red-600'}`}>
                Available Credits: {credits}
              </span>
              {credits <= 0 && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="ml-2"
                  onClick={() => window.open('/payment', '_blank')}
                >
                  Buy Credits
                </Button>
              )}
            </div>
          )}
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
              <div className="flex justify-between items-center mb-4">
                <label className="block text-lg font-medium">Search your documents</label>
                <div className="flex gap-2">
                  <Button
                    variant={searchMode === 'smart' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSearchMode('smart')}
                    className="text-xs"
                  >
                    🧠 Smart Search
                  </Button>
                  <Button
                    variant={searchMode === 'basic' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSearchMode('basic')}
                    className="text-xs"
                  >
                    🔍 Basic Search
                  </Button>
                </div>
              </div>
              <div className="relative">
                <Input 
                  placeholder={searchMode === 'smart' ? 
                    "Ask a question about your documents..." : 
                    "Search for specific content in your documents..."
                  }
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
              <p className="text-xs text-gray-500 mt-2">
                {searchMode === 'smart' ? 
                  'Smart Search uses AI to understand your question and provide intelligent answers from your documents.' :
                  'Basic Search finds exact matches of keywords in your documents.'
                }
              </p>
            </div>
          </Card>
          
          {(isSearching || searchResults.length > 0 || smartSearchResult) && (
            <Card className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">
                  {searchMode === 'smart' ? 'AI-Powered Answer' : 'Search Results'}
                </h2>
                {searchMode === 'basic' && totalDocumentsSearched > 0 && (
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
              ) : smartSearchResult ? (
                <div className="space-y-6">
                  <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r">
                    <h3 className="font-semibold text-blue-900 mb-2">AI Answer</h3>
                    <div className="text-gray-700 leading-relaxed whitespace-pre-line">
                      {smartSearchResult.answer}
                    </div>
                    {smartSearchResult.tokensUsed && (
                      <div className="text-xs text-gray-500 mt-2">
                        Tokens used: {smartSearchResult.tokensUsed}
                      </div>
                    )}
                  </div>
                  
                  {smartSearchResult.sources && smartSearchResult.sources.length > 0 && (
                    <div>
                      <h3 className="font-semibold mb-3">
                        Source Documents ({smartSearchResult.sources.length} found)
                      </h3>
                      <div className="space-y-3">
                        {smartSearchResult.sources.map((source, index) => (
                          <div key={index} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                            <div className="flex justify-between items-start mb-3">
                              <div className="flex items-center gap-2">
                                <h4 className="font-medium text-blue-600">{source.documentTitle}</h4>
                                {source.pageNumber && (
                                  <div className="flex items-center gap-1 text-xs bg-blue-100 text-blue-800 px-3 py-1 rounded-full">
                                    <BookOpenIcon className="h-3 w-3" />
                                    Page {source.pageNumber}
                                  </div>
                                )}
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => window.open(source.documentUrl, '_blank')}
                                className="flex items-center gap-2"
                              >
                                <ExternalLinkIcon className="h-4 w-4" />
                                Open
                              </Button>
                            </div>
                            
                            {source.relevantContent && (
                              <div className="bg-gray-50 border-l-4 border-blue-500 p-3 rounded-r">
                                <div className="text-gray-700 leading-relaxed text-sm">
                                  {source.relevantContent}
                                </div>
                              </div>
                            )}
                            
                            <div className="flex justify-between items-center mt-3">
                              <div className="flex items-center gap-2 text-xs text-gray-500">
                                {source.pageNumber && (
                                  <span className="flex items-center gap-1">
                                    <BookOpenIcon className="h-3 w-3" />
                                    Found on page {source.pageNumber}
                                  </span>
                                )}
                                <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full">
                                  {Math.round(source.confidence * 100)}% relevance
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
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
                            __html: highlightKeywords(result.relevantContent || '', query) 
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
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <SearchIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No results found for your search query.</p>
                  <p className="text-sm">Try using different keywords or make sure your documents are publicly accessible.</p>
                </div>
              )}
              
              {(searchResults.length > 0 || smartSearchResult) && (
                <div className="mt-6">
                  <h3 className="text-lg font-semibold mb-2">Ask a follow-up question</h3>
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
              )}
            </Card>
          )}
        </div>
        
        
        <div>
          <Card className="p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Add Google Documents</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Google Document URLs</label>
                <Textarea
                  placeholder="Enter one or multiple Google document URLs (one per line):
https://docs.google.com/document/d/...
https://docs.google.com/spreadsheets/d/...
https://docs.google.com/presentation/d/..."
                  value={googleUrl}
                  onChange={(e) => setGoogleUrl(e.target.value)}
                  rows={4}
                />
              </div>
              <Button 
                onClick={handleAddGoogleLink}
                className="w-full bg-caregrowth-green"
                disabled={!googleUrl.trim()}
              >
                <LinkIcon className="h-4 w-4 mr-2" />
                Add Document Links
              </Button>
              <p className="text-xs text-gray-500">
                Documents must be publicly accessible or shared with view permissions. Add multiple URLs separated by new lines.
              </p>
            </div>
            <div className="mt-4">
              <p className="text-sm text-gray-600">{documents.length} documents linked</p>
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
