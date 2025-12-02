'use client';

import { useState, useRef, ChangeEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Upload, File, X, CheckCircle } from 'lucide-react';
import { useDocumentStore } from '@/lib/store/document-store';
import { useAuthStore } from '@/lib/store/auth-store';

export function FileUpload() {
  const [title, setTitle] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { uploadDocument, isUploading, uploadProgress, error, clearError } = useDocumentStore();
  const { token } = useAuthStore();
  
  // Get Vercel Blob token from environment
  const BLOB_READ_WRITE_TOKEN = process.env.NEXT_PUBLIC_BLOB_READ_WRITE_TOKEN;

  const handleFileSelectFromFile = (file: File) => {
    // Validate file type
    if (file.type !== 'application/pdf') {
      clearError();
      useDocumentStore.setState({ error: 'Please select a PDF file' });
      return;
    }

    // Validate file size (50MB limit)
    if (file.size > 50 * 1024 * 1024) {
      clearError();
      useDocumentStore.setState({ error: 'File size must be less than 50MB' });
      return;
    }

    setSelectedFile(file);
    
    // Create preview URL
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);

    // Auto-generate title from filename if empty
    if (!title) {
      const fileName = file.name.replace(/\.[^/.]+$/, ""); // Remove extension
      setTitle(fileName);
    }
  };

  const handleFileSelect = (event: ChangeEvent<HTMLInputElement>) => {
    clearError();
    const file = event.target.files?.[0];
    
    if (!file) return;

    handleFileSelectFromFile(file);
  };

  const handleUpload = async () => {
    if (!selectedFile || !title.trim() || !token || !BLOB_READ_WRITE_TOKEN) {
      useDocumentStore.setState({ 
        error: !BLOB_READ_WRITE_TOKEN 
          ? 'Upload service is not configured' 
          : 'Please fill all fields and select a file'
      });
      return;
    }

    try {
      await uploadDocument(selectedFile, title, token, BLOB_READ_WRITE_TOKEN);
      
      // Reset form after successful upload
      setTitle('');
      setSelectedFile(null);
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
      }
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      // Error is already handled in the store
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    clearError();
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      handleFileSelectFromFile(file);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upload Document</CardTitle>
        <CardDescription>
          Upload PDF files up to 50MB. They will be stored securely and accessible anytime.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="title" className="text-sm font-medium">
              Document Title
            </label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter a descriptive title"
              disabled={isUploading}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Select PDF File</label>
            
            {!selectedFile ? (
              <div
                className="border-2 border-dashed border-muted rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
              >
                <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <div className="space-y-2">
                  <p className="text-sm font-medium">
                    Drag & drop your PDF here, or click to browse
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Maximum file size: 50MB
                  </p>
                </div>
                <Input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,application/pdf"
                  onChange={handleFileSelect}
                  className="hidden"
                  disabled={isUploading}
                />
              </div>
            ) : (
              <div className="border rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <File className="h-8 w-8 text-primary" />
                    <div>
                      <p className="font-medium">{selectedFile.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleRemoveFile}
                    disabled={isUploading}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                
                {previewUrl && (
                  <div className="mt-4 border rounded overflow-hidden">
                    <iframe
                      src={previewUrl}
                      className="w-full h-64"
                      title="PDF Preview"
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {isUploading && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Uploading...</span>
                <span>{uploadProgress}%</span>
              </div>
              <Progress value={uploadProgress} className="h-2" />
            </div>
          )}

          <div className="flex justify-end">
            <Button
              onClick={handleUpload}
              disabled={!selectedFile || !title.trim() || isUploading}
              className="min-w-[120px]"
            >
              {isUploading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Document
                </>
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}