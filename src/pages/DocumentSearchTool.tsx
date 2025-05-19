
import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from "sonner";
import { SearchIcon, FileTextIcon, FileIcon, Trash2Icon } from 'lucide-react';

interface Document {
  id: number;
  name: string;
  date: string;
  size: string;
  type: 'pdf' | 'docx' | 'txt';
}

interface SearchResult {
  query: string;
  answer: string;
  sources: Array<{
    documentName: string;
    page: number;
    excerpt: string;
    confidence: number;
  }>;
}

const DocumentSearchTool = () => {
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null);
  const [followUpQuery, setFollowUpQuery] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<Document[]>([
    { id: 1, name: 'Marketing_Strategy_2024.pdf', date: '2023-05-10', size: '2.4 MB', type: 'pdf' },
    { id: 2, name: 'Client_Onboarding_Process.pdf', date: '2023-05-08', size: '1.8 MB', type: 'pdf' },
    { id: 3, name: 'Agency_Growth_Playbook.pdf', date: '2023-05-01', size: '3.2 MB', type: 'pdf' }
  ]);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);

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
        answer: `Based on your query "${query}", I found the following information in your documents:

The ${query} process should be implemented according to the guidelines outlined in the Marketing Strategy document. Key elements include:

1. Initial assessment of client needs and goals
2. Creation of a tailored implementation plan with clear KPIs
3. Regular review meetings (bi-weekly recommended)
4. Performance tracking using our standard metrics framework

The Agency Growth Playbook specifically mentions that this process has led to a 32% increase in client retention when properly executed.`,
        sources: [
          {
            documentName: 'Marketing_Strategy_2024.pdf',
            page: 12,
            excerpt: `The ${query} is a key component of our 2024 strategy. We've identified that implementing this approach can lead to a 25% increase in client engagement and a 18% improvement in conversion rates.`,
            confidence: 0.92
          },
          {
            documentName: 'Agency_Growth_Playbook.pdf',
            page: 8,
            excerpt: `When considering ${query}, agencies should focus on both short-term implementation and long-term sustainability. Our research shows that agencies that properly integrate this strategy see an average growth of 32% year-over-year.`,
            confidence: 0.87
          },
          {
            documentName: 'Client_Onboarding_Process.pdf',
            page: 5,
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
            documentName: 'Marketing_Strategy_2024.pdf',
            page: 14,
            excerpt: `Best practices for ${followUpQuery} include a phased roll-out approach, with dedicated personnel assigned to each step. Organizations that follow this structured method report 40% higher satisfaction rates.`,
            confidence: 0.89
          },
          {
            documentName: 'Client_Onboarding_Process.pdf',
            page: 7,
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

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files).map((file, index) => {
        const fileType = file.name.split('.').pop()?.toLowerCase() as 'pdf' | 'docx' | 'txt';
        return {
          id: uploadedFiles.length + index + 1,
          name: file.name,
          date: new Date().toISOString().split('T')[0],
          size: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
          type: fileType || 'pdf'
        };
      });
      
      setUploadedFiles([...uploadedFiles, ...newFiles]);
      toast.success(`${newFiles.length} file(s) uploaded successfully!`);
    }
  };

  const handleDeleteFile = (id: number) => {
    setUploadedFiles(uploadedFiles.filter(file => file.id !== id));
    toast.success("File removed successfully");
  };

  const handleViewDocument = (document: Document) => {
    setSelectedDocument(document);
  };

  const getFileIcon = (type: string) => {
    switch(type) {
      case 'pdf': return <FileTextIcon className="h-5 w-5 text-red-500" />;
      case 'docx': return <FileTextIcon className="h-5 w-5 text-blue-500" />;
      case 'txt': return <FileIcon className="h-5 w-5 text-gray-500" />;
      default: return <FileIcon className="h-5 w-5 text-gray-500" />;
    }
  };

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Document Search & Access</h1>
        <p className="text-gray-600 mt-2">Upload documents and get instant answers from your knowledge base.</p>
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
                        onClick={() => handleViewDocument(uploadedFiles.find(f => f.name === source.documentName) || uploadedFiles[0])}
                      >
                        <div className="flex justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <FileTextIcon className="h-4 w-4 text-caregrowth-blue" />
                            <span className="font-medium">{source.documentName}</span>
                          </div>
                          <div className="text-sm text-gray-500">
                            Page {source.page} • Match: {Math.round(source.confidence * 100)}%
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
            <h2 className="text-xl font-semibold mb-4">Upload Documents</h2>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center mb-4">
              <svg className="mx-auto h-12 w-12 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <p className="mt-2 text-sm text-gray-600">
                Drag and drop files here, or
              </p>
              <div className="mt-4">
                <Input
                  id="file-upload"
                  type="file"
                  className="hidden"
                  multiple
                  onChange={handleFileUpload}
                />
                <label htmlFor="file-upload">
                  <Button 
                    variant="outline" 
                    className="pointer" 
                    onClick={() => document.getElementById('file-upload')?.click()}
                  >
                    Browse Files
                  </Button>
                </label>
              </div>
              <p className="mt-2 text-xs text-gray-500">
                PDF, DOCX, TXT (Max 25MB per file)
              </p>
            </div>
            <p className="text-sm text-gray-600 mb-2">2/5 documents used this month</p>
            <div className="w-full h-2 bg-gray-100 rounded-full">
              <div className="h-full bg-caregrowth-green rounded-full" style={{ width: '40%' }}></div>
            </div>
          </Card>
          
          <Card className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Your Documents</h2>
              {selectedDocument && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-gray-500"
                  onClick={() => setSelectedDocument(null)}
                >
                  Close Preview
                </Button>
              )}
            </div>
            
            {selectedDocument ? (
              <div>
                <div className="bg-gray-100 p-4 rounded-md mb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getFileIcon(selectedDocument.type)}
                      <span className="font-medium">{selectedDocument.name}</span>
                    </div>
                    <span className="text-sm text-gray-500">{selectedDocument.size}</span>
                  </div>
                </div>
                
                <div className="border rounded-md p-4 h-[400px] overflow-y-auto bg-white">
                  <div className="font-mono text-sm">
                    {/* This would be replaced with an actual document viewer */}
                    <div className="text-center text-gray-500 mt-10 mb-6">
                      <FileTextIcon className="h-16 w-16 mx-auto mb-2 opacity-20" />
                      <p>Document Preview</p>
                      <p className="text-xs mt-2">
                        Viewing {selectedDocument.name} • Uploaded on {selectedDocument.date}
                      </p>
                    </div>
                    <div className="p-4">
                      <p className="mb-3">Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nullam auctor, nisl eget ultricies tincidunt, nisl nisl aliquam nisl, eget aliquam nisl nisl eget.</p>
                      <p className="mb-3">Nullam auctor, nisl eget ultricies tincidunt, nisl nisl aliquam nisl, eget aliquam nisl nisl eget.</p>
                      <p className="mb-3">Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nullam auctor, nisl eget ultricies tincidunt, nisl nisl aliquam nisl, eget aliquam nisl nisl eget.</p>
                      <p className="font-bold mb-3">Key Findings:</p>
                      <ul className="list-disc pl-5 mb-3">
                        <li className="mb-1">First important point from document</li>
                        <li className="mb-1">Second important consideration</li>
                        <li className="mb-1">Critical implementation detail</li>
                      </ul>
                      <p className="mb-3">Final recommendations and next steps...</p>
                    </div>
                  </div>
                </div>
                
                <div className="mt-4 flex justify-end gap-2">
                  <Button variant="outline" size="sm">
                    Download
                  </Button>
                  <Button size="sm" className="bg-caregrowth-blue">
                    View Full Document
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                {uploadedFiles.map((file) => (
                  <div key={file.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-md hover:bg-gray-100 transition-colors">
                    <div className="flex items-center cursor-pointer" onClick={() => handleViewDocument(file)}>
                      {getFileIcon(file.type)}
                      <div className="ml-3">
                        <p className="text-sm font-medium">{file.name}</p>
                        <p className="text-xs text-gray-500">Uploaded on {file.date} • {file.size}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 w-8 p-0 text-gray-500"
                        onClick={() => handleViewDocument(file)}
                      >
                        <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"
                        onClick={() => handleDeleteFile(file.id)}
                      >
                        <Trash2Icon className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};

export default DocumentSearchTool;
