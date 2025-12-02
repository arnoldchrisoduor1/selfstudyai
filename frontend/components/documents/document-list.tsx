'use client';

import { useEffect } from 'react';
import { useDocumentStore } from '@/lib/store/document-store';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { File, Download, Trash2, Calendar, FileText, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';

export function DocumentList() {
  const { documents, isLoading, error, fetchDocuments, deleteDocument, clearError } = useDocumentStore();

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  // Ensure documents is always an array
  const safeDocuments = Array.isArray(documents) ? documents : [];
  
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleDownload = (url: string, fileName: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDelete = async (id: string, title: string) => {
    if (window.confirm(`Are you sure you want to delete "${title}"?`)) {
      try {
        await deleteDocument(id);
      } catch (error) {
        // Error handled in store
      }
    }
  };

  if (isLoading && safeDocuments.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Your Documents</CardTitle>
          <CardDescription>Loading your documents...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center space-x-4 p-4 border rounded">
                <Skeleton className="h-12 w-12 rounded" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
                <Skeleton className="h-10 w-10 rounded" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your Documents</CardTitle>
        <CardDescription>
          {safeDocuments.length} document{safeDocuments.length !== 1 ? 's' : ''} uploaded
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>
              {error}
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={clearError}
                className="ml-2"
              >
                Dismiss
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {!Array.isArray(documents) && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4 mr-2" />
            <AlertDescription>
              Invalid documents data received from server
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => fetchDocuments()}
                className="ml-2"
              >
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {safeDocuments.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No documents yet</h3>
            <p className="text-muted-foreground">
              Upload your first PDF document to get started
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {safeDocuments.map((document) => (
              <div
                key={document.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-start space-x-4 mb-4 sm:mb-0">
                  <div className="bg-primary/10 p-3 rounded-lg">
                    <File className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium mb-1">{document.title}</h4>
                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center">
                        <File className="h-3 w-3 mr-1" />
                        {document.file_name}
                      </div>
                      <div className="flex items-center">
                        <FileText className="h-3 w-3 mr-1" />
                        {formatFileSize(document.file_size)}
                      </div>
                      <div className="flex items-center">
                        <Calendar className="h-3 w-3 mr-1" />
                        {formatDate(document.uploaded_at)}
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex space-x-2 self-end sm:self-auto">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownload(document.file_url, document.file_name)}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDelete(document.id, document.title)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}