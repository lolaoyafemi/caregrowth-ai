
import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from "sonner";
import { SearchIcon, LinkIcon, ExternalLinkIcon, Trash2Icon } from 'lucide-react';

interface GoogleDocument {
  id: number;
  title: string;
  url: string;
  dateAdded: string;
  type: 'docs' | 'sheets' | 'slides' | 'pdf' | 'other';
}

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
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null);
  const [followUpQuery, setFollowUpQuery] = useState('');
  const [googleUrl, setGoogleUrl] = useState('');
  const [linkedDocuments, setLinkedDocuments] = useState<GoogleDocument[]>([
    { 
      id: 1, 
      title: 'Marketing Strategy 2024', 
      url: 'https://docs.google.com/document/d/example1', 
      dateAdded: '2023-05-10',
      type: 'docs'
    },
    { 
      id: 2, 
      title: 'Client Onboarding Process', 
      url: 'https://docs.google.com/document/d/example2', 
      dateAdded: '2023-05-08',
      type: 'docs'
    },
    { 
      id: 3, 
      title: 'Agency Growth Playbook', 
      url: 'https://drive.google.com/file/d/example3', 
      dateAdded: '2023-05-01',
      type: 'pdf'
    }
  ]);
  const [selectedDocument, setSelectedDocument] = useState<GoogleDocument | null>(null);

  const handleSearch = () => {
    if (!query.trim()) {
      toast.error("Please enter a search query.");
      return;
    }
    
    setIsSearching(true);
    setSearchResult(null);
    
    // Simulate API call with setTimeout
    setTimeout(() => {
      const sampleResult: SearchResult = {
        query: query,
        answer: `Based on your query "${query}", I found the following information in your linked documents:

The ${query} process should be implemented according to the guidelines outlined in the Marketing Strategy document. Key elements include:

1. Initial assessment of client needs and goals
2. Creation of a tailored implementation plan with clear KPIs
3. Regular review meetings (bi-weekly recommended)
4. Performance tracking using our standard metrics framework

The Agency Growth Playbook specifically mentions that this process has led to a 32% increase in client retention when properly executed.`,
        sources: [
          {
            documentTitle: 'Marketing Strategy 2024',
            url: 'https://docs.google.com/document/d/example1',
            excerpt: `The ${query} is a key component of our 2024 strategy. We've identified that implementing this approach can lead to a 25% increase in client engagement and a 18% improvement in conversion rates.`,
            confidence: 0.92
          },
          {
            documentTitle: 'Agency Growth Playbook',
            url: 'https://drive.google.com/file/d/example3',
            excerpt: `When considering ${query}, agencies should focus on both short-term implementation and long-term sustainability. Our research shows that agencies that properly integrate this strategy see an average growth of 32% year-over-year.`,
            confidence: 0.87
          },
          {
            documentTitle: 'Client Onboarding Process',
            url: 'https://docs.google.com/document/d/example2',
            excerpt: `During client onboarding, it's crucial to discuss ${query} expectations and set realistic goals. This conversation should happen in the initial strategy session to align team efforts.`,
            confidence: 0.78
          }
        ]
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
    
    // Simulate API call for follow-up
    setTimeout(() => {
      const updatedResult: SearchResult = {
        query: followUpQuery,
        answer: `To expand on the previous answer about ${query}, here's more information about ${followUpQuery}:

According to the documents, the best practices for implementation include:

1. Assigning a dedicated project manager for each client
2. Creating a detailed timeline with specific milestones
3. Establishing clear communication channels for feedback
4. Setting up automated reporting tools to track progress

The Marketing Strategy document emphasizes that proper implementation typically takes 4-6 weeks, with the most critical phase being the first 14 days.`,
        sources: [
          {
            documentTitle: 'Marketing Strategy 2024',
            url: 'https://docs.google.com/document/d/example1',
            excerpt: `Best practices for ${followUpQuery} include a phased roll-out approach, with dedicated personnel assigned to each step. Organizations that follow this structured method report 40% higher satisfaction rates.`,
            confidence: 0.89
          },
          {
            documentTitle: 'Client Onboarding Process',
            url: 'https://docs.google.com/document/d/example2',
            excerpt: `When implementing ${followUpQuery}, it's essential to establish a feedback loop with stakeholders. Weekly check-ins during the first month are strongly recommended.`,
            confidence: 0.82
          }
        ]
      };
      
      setSearchResult(updatedResult);
      setFollowUpQuery('');
      setIsSearching(false);
    }, 2000);
  };

  const handleAddGoogleLink = () => {
    if (!googleUrl.trim()) {
      toast.error("Please enter a Google document URL.");
      return;
    }

    // Basic validation for Google URLs
    if (!googleUrl.includes('google.com') && !googleUrl.includes('drive.google.com')) {
      toast.error("Please enter a valid Google document URL.");
      return;
    }

    // Extract document type from URL
    let docType: GoogleDocument['type'] = 'other';
    if (googleUrl.includes('/document/')) docType = 'docs';
    else if (googleUrl.includes('/spreadsheets/')) docType = 'sheets';
    else if (googleUrl.includes('/presentation/')) docType = 'slides';
    else if (googleUrl.includes('.pdf')) docType = 'pdf';

    // Extract title from URL or use placeholder
    const title = `Document ${linkedDocuments.length + 1}`;

    const newDocument: GoogleDocument = {
      id: linkedDocuments.length + 1,
      title: title,
      url: googleUrl,
      dateAdded: new Date().toISOString().split('T')[0],
      type: docType
    };

    setLinkedDocuments([...linkedDocuments, newDocument]);
    setGoogleUrl('');
    toast.success("Google document linked successfully!");
  };

  const handleDeleteDocument = (id: number) => {
    setLinkedDocuments(linkedDocuments.filter(doc => doc.id !== id));
    toast.success("Document link removed successfully");
  };

  const handleViewDocument = (document: GoogleDocument) => {
    // Open in new tab
    window.open(document.url, '_blank');
  };

  const getDocumentIcon = (type: string) => {
    switch(type) {
      case 'docs': return <LinkIcon className="h-5 w-5 text-blue-500" />;
      case 'sheets': return <LinkIcon className="h-5 w-5 text-green-500" />;
      case 'slides': return <LinkIcon className="h-5 w-5 text-orange-500" />;
      case 'pdf': return <LinkIcon className="h-5 w-5 text-red-500" />;
      default: return <LinkIcon className="h-5 w-5 text-gray-500" />;
    }
  };

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Document Search & Access</h1>
        <p className="text-gray-600 mt-2">Link Google documents and get instant answers from your knowledge base.</p>
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
                Supports Google Docs, Sheets, Slides, and Drive PDFs
              </p>
            </div>
            <div className="mt-4">
              <p className="text-sm text-gray-600 mb-2">{linkedDocuments.length}/10 documents linked</p>
              <div className="w-full h-2 bg-gray-100 rounded-full">
                <div className="h-full bg-caregrowth-green rounded-full" style={{ width: `${(linkedDocuments.length / 10) * 100}%` }}></div>
              </div>
            </div>
          </Card>
          
          <Card className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Linked Documents</h2>
            </div>
            
            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
              {linkedDocuments.map((document) => (
                <div key={document.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-md hover:bg-gray-100 transition-colors">
                  <div className="flex items-center cursor-pointer flex-1" onClick={() => handleViewDocument(document)}>
                    {getDocumentIcon(document.type)}
                    <div className="ml-3 flex-1">
                      <p className="text-sm font-medium truncate">{document.title}</p>
                      <p className="text-xs text-gray-500">Added on {document.dateAdded}</p>
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
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default DocumentSearchTool;
