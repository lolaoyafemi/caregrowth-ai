import React, { useState, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { toast } from "sonner";
import { FolderIcon, FileIcon, CheckCircleIcon, XCircleIcon, UploadIcon } from 'lucide-react';
import { useSharedDocuments } from '@/hooks/useSharedDocuments';

interface FileUploadStatus {
  file: File;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  progress: number;
  error?: string;
}

interface FolderUploadProps {
  onUploadComplete?: () => void;
}

const FolderUpload: React.FC<FolderUploadProps> = ({ onUploadComplete }) => {
  const [selectedFiles, setSelectedFiles] = useState<FileUploadStatus[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const { uploadMultipleSharedDocuments } = useSharedDocuments();

  // Handle folder selection
  const handleFolderSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    
    if (files.length === 0) {
      toast.error("No files selected. Please select a folder with documents.");
      return;
    }

    // Filter supported file types
    const supportedFiles = files.filter(file => {
      const extension = file.name.toLowerCase().split('.').pop();
      return ['pdf', 'docx', 'txt', 'md', 'rtf', 'csv'].includes(extension || '');
    });

    if (supportedFiles.length === 0) {
      toast.error("No supported files found. Please select folders containing PDF, DOCX, TXT, MD, RTF, or CSV files.");
      return;
    }

    if (supportedFiles.length !== files.length) {
      const skipped = files.length - supportedFiles.length;
      toast.warning(`${skipped} unsupported file(s) were skipped. Only PDF, DOCX, TXT, MD, RTF, and CSV files are supported.`);
    }

    // Create file upload status objects
    const fileStatuses: FileUploadStatus[] = supportedFiles.map(file => ({
      file,
      status: 'pending',
      progress: 0
    }));

    setSelectedFiles(fileStatuses);
    toast.success(`Selected ${supportedFiles.length} file(s) for upload.`);
  }, []);

  // Handle individual file selection
  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    
    if (files.length === 0) return;

    // Filter supported file types
    const supportedFiles = files.filter(file => {
      const extension = file.name.toLowerCase().split('.').pop();
      return ['pdf', 'docx', 'txt', 'md', 'rtf', 'csv'].includes(extension || '');
    });

    if (supportedFiles.length === 0) {
      toast.error("Please select supported file types: PDF, DOCX, TXT, MD, RTF, or CSV.");
      return;
    }

    // Create file upload status objects
    const fileStatuses: FileUploadStatus[] = supportedFiles.map(file => ({
      file,
      status: 'pending',
      progress: 0
    }));

    setSelectedFiles(prev => [...prev, ...fileStatuses]);
    toast.success(`Added ${supportedFiles.length} file(s) to upload queue.`);
  }, []);

  // Start batch upload
  const handleStartUpload = useCallback(async () => {
    if (selectedFiles.length === 0) {
      toast.error("Please select files to upload first.");
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const files = selectedFiles.map(fileStatus => fileStatus.file);
      const category = 'general'; // Default category
      const priority = 1; // Default priority

      // Simulate progress updates for each file
      let completed = 0;
      const updateProgress = () => {
        completed++;
        const progress = (completed / files.length) * 100;
        setUploadProgress(progress);
        
        // Update file statuses
        setSelectedFiles(prev => prev.map((fileStatus, index) => {
          if (index < completed) {
            return { ...fileStatus, status: 'completed', progress: 100 };
          } else if (index === completed) {
            return { ...fileStatus, status: 'uploading', progress: 50 };
          }
          return fileStatus;
        }));
      };

      // Simulate progressive uploads (in reality this would be handled by the hook)
      const progressInterval = setInterval(updateProgress, 500);

      const success = await uploadMultipleSharedDocuments(files, category, priority);
      
      clearInterval(progressInterval);

      if (success) {
        setSelectedFiles(prev => prev.map(fileStatus => ({
          ...fileStatus, 
          status: 'completed', 
          progress: 100
        })));
        
        toast.success(`Successfully uploaded ${files.length} files!`);
        onUploadComplete?.();
        
        // Clear files after successful upload
        setTimeout(() => {
          setSelectedFiles([]);
          setUploadProgress(0);
        }, 2000);
      } else {
        // Update failed files
        setSelectedFiles(prev => prev.map(fileStatus => ({
          ...fileStatus, 
          status: 'error', 
          error: 'Upload failed'
        })));
        
        toast.error("Some files failed to upload. Please try again.");
      }
    } catch (error) {
      console.error('Upload error:', error);
      setSelectedFiles(prev => prev.map(fileStatus => ({
        ...fileStatus, 
        status: 'error', 
        error: 'Upload failed'
      })));
      
      toast.error("Upload failed. Please try again.");
    } finally {
      setIsUploading(false);
    }
  }, [selectedFiles, uploadMultipleSharedDocuments, onUploadComplete]);

  // Clear selected files
  const handleClear = useCallback(() => {
    setSelectedFiles([]);
    setUploadProgress(0);
  }, []);

  // Remove specific file
  const removeFile = useCallback((index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  }, []);

  // Get file icon based on extension
  const getFileIcon = (fileName: string) => {
    const extension = fileName.toLowerCase().split('.').pop();
    return <FileIcon className="h-4 w-4 text-blue-500" />;
  };

  // Get status icon
  const getStatusIcon = (status: FileUploadStatus['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon className="h-4 w-4 text-green-500" />;
      case 'error':
        return <XCircleIcon className="h-4 w-4 text-red-500" />;
      default:
        return <FileIcon className="h-4 w-4 text-gray-400" />;
    }
  };

  return (
    <Card className="p-6">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h3 className="text-lg font-semibold mb-2">Bulk Document Upload</h3>
          <p className="text-sm text-gray-600">
            Upload multiple documents at once. Supports PDF, DOCX, TXT, MD, RTF, and CSV files.
          </p>
        </div>

        {/* Upload Controls */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Folder Upload */}
          <div className="space-y-2">
            <label className="block text-sm font-medium">Select Folder</label>
            <input
              type="file"
              id="folder-upload"
              multiple
              // @ts-ignore - webkitdirectory is not in React types but works
              webkitdirectory=""
              className="hidden"
              onChange={handleFolderSelect}
              disabled={isUploading}
            />
            <Button
              variant="outline"
              className="w-full"
              onClick={() => document.getElementById('folder-upload')?.click()}
              disabled={isUploading}
            >
              <FolderIcon className="h-4 w-4 mr-2" />
              Choose Folder
            </Button>
          </div>

          {/* Individual File Upload */}
          <div className="space-y-2">
            <label className="block text-sm font-medium">Select Files</label>
            <input
              type="file"
              id="files-upload"
              multiple
              accept=".pdf,.docx,.txt,.md,.rtf,.csv"
              className="hidden"
              onChange={handleFileSelect}
              disabled={isUploading}
            />
            <Button
              variant="outline"
              className="w-full"
              onClick={() => document.getElementById('files-upload')?.click()}
              disabled={isUploading}
            >
              <FileIcon className="h-4 w-4 mr-2" />
              Choose Files
            </Button>
          </div>
        </div>

        {/* Upload Progress */}
        {isUploading && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Upload Progress</span>
              <span>{Math.round(uploadProgress)}%</span>
            </div>
            <Progress value={uploadProgress} className="w-full" />
          </div>
        )}

        {/* File List */}
        {selectedFiles.length > 0 && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h4 className="font-medium">Selected Files ({selectedFiles.length})</h4>
              <div className="space-x-2">
                {!isUploading && (
                  <>
                    <Button variant="outline" size="sm" onClick={handleClear}>
                      Clear All
                    </Button>
                    <Button size="sm" onClick={handleStartUpload}>
                      <UploadIcon className="h-4 w-4 mr-2" />
                      Upload All
                    </Button>
                  </>
                )}
              </div>
            </div>

            <div className="max-h-64 overflow-y-auto border rounded-lg">
              <div className="space-y-1 p-2">
                {selectedFiles.map((fileStatus, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 border rounded hover:bg-gray-50"
                  >
                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                      {getFileIcon(fileStatus.file.name)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium truncate">
                            {fileStatus.file.name}
                          </span>
                          {getStatusIcon(fileStatus.status)}
                        </div>
                        <div className="flex items-center space-x-4 text-xs text-gray-500">
                          <span>{(fileStatus.file.size / 1024 / 1024).toFixed(1)} MB</span>
                          <span className="capitalize">{fileStatus.status}</span>
                          {fileStatus.error && (
                            <span className="text-red-500">{fileStatus.error}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {!isUploading && fileStatus.status === 'pending' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFile(index)}
                        className="ml-2"
                      >
                        <XCircleIcon className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r">
          <h4 className="font-medium text-blue-900 mb-2">Upload Instructions</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Folder upload will process all supported files in the selected folder and subfolders</li>
            <li>• Individual file upload allows you to select specific files</li>
            <li>• Large files may take several minutes to process</li>
            <li>• Documents are automatically processed for search after upload</li>
          </ul>
        </div>
      </div>
    </Card>
  );
};

export default FolderUpload;