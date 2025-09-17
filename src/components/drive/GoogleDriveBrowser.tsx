import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { 
  FolderIcon, 
  FileTextIcon, 
  SearchIcon, 
  RefreshCwIcon, 
  PlusIcon,
  ArrowLeftIcon,
  FileIcon,
  DownloadIcon
} from 'lucide-react';
import { useGoogleDrive, GoogleDriveFile } from '@/hooks/useGoogleDrive';
import { useGoogleDocuments } from '@/hooks/useGoogleDocuments';

interface GoogleDriveBrowserProps {
  onFileSelected?: (files: GoogleDriveFile[]) => void;
  multiSelect?: boolean;
}

export const GoogleDriveBrowser: React.FC<GoogleDriveBrowserProps> = ({ 
  onFileSelected, 
  multiSelect = false 
}) => {
  const { loading, files, folders, listFiles, listFolders, getFileContent, searchFiles } = useGoogleDrive();
  const { addDocument } = useGoogleDocuments();
  
  const [currentFolder, setCurrentFolder] = useState<string | null>(null);
  const [currentFolderName, setCurrentFolderName] = useState<string>('My Drive');
  const [folderStack, setFolderStack] = useState<{ id: string | null; name: string }[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [isSearchMode, setIsSearchMode] = useState(false);
  const [processingFiles, setProcessingFiles] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadCurrentFolder();
  }, [currentFolder]);

  const loadCurrentFolder = async () => {
    if (isSearchMode) {
      if (searchQuery.trim()) {
        await searchFiles(searchQuery.trim());
      }
    } else {
      await listFiles(currentFolder || undefined);
      await listFolders(currentFolder || undefined);
    }
  };

  const handleFolderClick = (folder: GoogleDriveFile) => {
    setFolderStack([...folderStack, { id: currentFolder, name: currentFolderName }]);
    setCurrentFolder(folder.id);
    setCurrentFolderName(folder.name);
    setIsSearchMode(false);
    setSearchQuery('');
  };

  const handleBackClick = () => {
    const previous = folderStack.pop();
    if (previous !== undefined) {
      setCurrentFolder(previous.id);
      setCurrentFolderName(previous.name);
      setFolderStack([...folderStack]);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      toast.error('Please enter a search query');
      return;
    }
    setIsSearchMode(true);
    setCurrentFolderName(`Search: "${searchQuery}"`);
    await searchFiles(searchQuery.trim());
  };

  const handleFileSelection = (file: GoogleDriveFile) => {
    if (multiSelect) {
      const newSelection = new Set(selectedFiles);
      if (newSelection.has(file.id)) {
        newSelection.delete(file.id);
      } else {
        newSelection.add(file.id);
      }
      setSelectedFiles(newSelection);
    } else {
      setSelectedFiles(new Set([file.id]));
      if (onFileSelected) {
        onFileSelected([file]);
      }
    }
  };

  const handleAddSelectedFiles = async () => {
    if (selectedFiles.size === 0) {
      toast.error('Please select files to add');
      return;
    }

    const filesToProcess = files.filter(file => selectedFiles.has(file.id));
    setProcessingFiles(new Set(selectedFiles));
    
    let successCount = 0;
    let errorCount = 0;

    for (const file of filesToProcess) {
      try {
        const contentData = await getFileContent(file.id);
        if (contentData && contentData.content) {
          // Extract file ID from Google Drive URL if it's a drive link
          const fileIdFromUrl = file.webViewLink ? 
            file.webViewLink.match(/\/file\/d\/([a-zA-Z0-9-_]+)/)?.[1] : null;
          
          // Create a Google Drive URL for reference  
          const driveUrl = file.webViewLink || `https://drive.google.com/file/d/${file.id}/view`;
          
          // Add document using the existing addDocument function with fileId for Drive API access
          await addDocument(driveUrl, file.name, file.id);
          successCount++;
        } else {
          errorCount++;
        }
      } catch (error) {
        console.error(`Error processing file ${file.name}:`, error);
        errorCount++;
      }
    }

    setProcessingFiles(new Set());
    setSelectedFiles(new Set());

    if (successCount > 0) {
      toast.success(`Successfully added ${successCount} file${successCount !== 1 ? 's' : ''}`);
    }
    if (errorCount > 0) {
      toast.error(`Failed to add ${errorCount} file${errorCount !== 1 ? 's' : ''}`);
    }
  };

  const getSupportedFiles = () => {
    const supportedMimeTypes = [
      'application/vnd.google-apps.document',
      'application/vnd.google-apps.spreadsheet', 
      'application/vnd.google-apps.presentation',
      'application/pdf',
      'text/plain',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    
    return files.filter(file => supportedMimeTypes.includes(file.mimeType));
  };

  const getFileIcon = (mimeType: string) => {
    switch (mimeType) {
      case 'application/vnd.google-apps.document':
        return <FileTextIcon className="h-5 w-5 text-blue-500" />;
      case 'application/vnd.google-apps.spreadsheet':
        return <FileIcon className="h-5 w-5 text-green-500" />;
      case 'application/vnd.google-apps.presentation':
        return <FileIcon className="h-5 w-5 text-orange-500" />;
      case 'application/pdf':
        return <FileIcon className="h-5 w-5 text-red-500" />;
      default:
        return <FileIcon className="h-5 w-5 text-gray-500" />;
    }
  };

  const supportedFiles = getSupportedFiles();

  return (
    <Card className="p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <FolderIcon className="h-5 w-5" />
          Browse Google Drive
        </h3>
        
        {/* Search */}
        <div className="flex gap-2 mb-4">
          <Input
            placeholder="Search files in Google Drive..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          />
          <Button onClick={handleSearch} disabled={loading}>
            <SearchIcon className="h-4 w-4" />
          </Button>
        </div>

        {/* Navigation */}
        <div className="flex items-center gap-2 mb-4">
          {folderStack.length > 0 && (
            <Button variant="outline" size="sm" onClick={handleBackClick}>
              <ArrowLeftIcon className="h-4 w-4 mr-1" />
              Back
            </Button>
          )}
          <span className="text-sm text-gray-600">{currentFolderName}</span>
          <Button variant="outline" size="sm" onClick={loadCurrentFolder} disabled={loading}>
            <RefreshCwIcon className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-sm text-gray-500 mt-2">Loading Google Drive...</p>
        </div>
      ) : (
        <>
          {/* Folders */}
          {!isSearchMode && folders.length > 0 && (
            <div className="mb-6">
              <h4 className="font-medium mb-3">Folders</h4>
              <div className="grid grid-cols-1 gap-2">
                {folders.map((folder) => (
                  <div
                    key={folder.id}
                    className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                    onClick={() => handleFolderClick(folder)}
                  >
                    <FolderIcon className="h-5 w-5 text-blue-500" />
                    <span className="flex-1">{folder.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Files */}
          <div>
            <div className="flex justify-between items-center mb-3">
              <h4 className="font-medium">
                Supported Files ({supportedFiles.length})
              </h4>
              {multiSelect && selectedFiles.size > 0 && (
                <Button onClick={handleAddSelectedFiles} disabled={processingFiles.size > 0}>
                  <PlusIcon className="h-4 w-4 mr-1" />
                  Add Selected ({selectedFiles.size})
                </Button>
              )}
            </div>
            
            {supportedFiles.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <FileIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No supported files found</p>
                <p className="text-xs mt-1">
                  Supported: Google Docs, Sheets, Slides, PDFs, Word documents
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2">
                {supportedFiles.map((file) => (
                  <div
                    key={file.id}
                    className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedFiles.has(file.id) 
                        ? 'bg-blue-50 border-blue-200' 
                        : 'hover:bg-gray-50'
                    }`}
                    onClick={() => handleFileSelection(file)}
                  >
                    <div className="flex-shrink-0">
                      {getFileIcon(file.mimeType)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{file.name}</p>
                      {file.size && (
                        <p className="text-xs text-gray-500">
                          {(parseInt(file.size) / 1024 / 1024).toFixed(2)} MB
                        </p>
                      )}
                    </div>
                    {processingFiles.has(file.id) && (
                      <div className="flex-shrink-0">
                        <DownloadIcon className="h-4 w-4 animate-pulse text-blue-500" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </Card>
  );
};