
import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from "sonner";

const DocumentSearchTool = () => {
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResult, setSearchResult] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState([
    { id: 1, name: 'Marketing_Strategy_2024.pdf', date: '2023-05-10', size: '2.4 MB' },
    { id: 2, name: 'Client_Onboarding_Process.pdf', date: '2023-05-08', size: '1.8 MB' },
    { id: 3, name: 'Agency_Growth_Playbook.pdf', date: '2023-05-01', size: '3.2 MB' }
  ]);

  const handleSearch = () => {
    if (!query.trim()) {
      toast.error("Please enter a search query.");
      return;
    }
    
    setIsSearching(true);
    setSearchResult('');
    
    // Simulate API call with setTimeout
    setTimeout(() => {
      setSearchResult(`Based on your query "${query}", I found the following information in your documents:

1. From "Marketing_Strategy_2024.pdf" (page 12):
   "${query} is a key component of our 2024 strategy. We've identified that implementing this approach can lead to a 25% increase in client engagement and a 18% improvement in conversion rates."

2. From "Agency_Growth_Playbook.pdf" (page 8):
   "When considering ${query}, agencies should focus on both short-term implementation and long-term sustainability. Our research shows that agencies that properly integrate this strategy see an average growth of 32% year-over-year."

3. From "Client_Onboarding_Process.pdf" (page 5):
   "During client onboarding, it's crucial to discuss ${query} expectations and set realistic goals. This conversation should happen in the initial strategy session to align team efforts."

Would you like me to provide more specific information about any of these findings?`);
      setIsSearching(false);
      toast.success("Search completed!");
    }, 2000);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files).map((file, index) => ({
        id: uploadedFiles.length + index + 1,
        name: file.name,
        date: new Date().toISOString().split('T')[0],
        size: `${(file.size / (1024 * 1024)).toFixed(1)} MB`
      }));
      
      setUploadedFiles([...uploadedFiles, ...newFiles]);
      toast.success(`${newFiles.length} file(s) uploaded successfully!`);
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
              <Input 
                placeholder="Ask a question about your documents..."
                className="mb-4"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <Button 
                className="w-full bg-caregrowth-green"
                onClick={handleSearch}
                disabled={isSearching}
              >
                {isSearching ? "Searching..." : "Search Documents"}
              </Button>
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
              ) : (
                <div className="prose max-w-none">
                  <div className="whitespace-pre-line">
                    {searchResult}
                  </div>
                  
                  <div className="mt-6">
                    <Textarea 
                      placeholder="Ask a follow-up question..."
                      className="mb-4"
                    />
                    <Button className="bg-caregrowth-green">
                      Submit Follow-up
                    </Button>
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
            <h2 className="text-xl font-semibold mb-4">Your Documents</h2>
            <div className="space-y-3">
              {uploadedFiles.map((file) => (
                <div key={file.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-md hover:bg-gray-100 transition-colors">
                  <div className="flex items-center">
                    <svg className="h-5 w-5 text-caregrowth-green mr-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <div>
                      <p className="text-sm font-medium">{file.name}</p>
                      <p className="text-xs text-gray-500">Uploaded on {file.date} • {file.size}</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                    </svg>
                  </Button>
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
