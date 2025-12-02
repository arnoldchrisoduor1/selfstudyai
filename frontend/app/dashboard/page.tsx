'use client';

import { ProtectedRoute } from '@/components/auth/protected-route';
import { FileUpload } from '@/components/documents/file-upload';
import { DocumentList } from '@/components/documents/document-list';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

function DashboardContent() {
  return (
    <div className="container mx-auto p-6 space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Manage your documents and upload new PDF files
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <Tabs defaultValue="documents" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="documents">My Documents</TabsTrigger>
              <TabsTrigger value="upload">Upload New</TabsTrigger>
            </TabsList>
            <TabsContent value="documents" className="space-y-4">
              <DocumentList />
            </TabsContent>
            <TabsContent value="upload">
              <FileUpload />
            </TabsContent>
          </Tabs>
        </div>

        <div className="space-y-6">
          <div className="bg-card border rounded-lg p-6">
            <h3 className="font-semibold mb-4">Upload Guidelines</h3>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li className="flex items-start">
                <div className="bg-primary/10 text-primary rounded-full p-1 mr-2 mt-0.5">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                Only PDF files are accepted
              </li>
              <li className="flex items-start">
                <div className="bg-primary/10 text-primary rounded-full p-1 mr-2 mt-0.5">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                Maximum file size: 50MB
              </li>
              <li className="flex items-start">
                <div className="bg-primary/10 text-primary rounded-full p-1 mr-2 mt-0.5">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                Files are stored securely in Vercel Blob
              </li>
              <li className="flex items-start">
                <div className="bg-primary/10 text-primary rounded-full p-1 mr-2 mt-0.5">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                You can download or delete anytime
              </li>
            </ul>
          </div>

          <div className="bg-card border rounded-lg p-6">
            <h3 className="font-semibold mb-4">Storage Usage</h3>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Used space</span>
                <span className="font-medium">0 MB</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-primary w-0"></div>
              </div>
              <p className="text-xs text-muted-foreground">
                Unlimited storage available
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <DashboardContent />
    </ProtectedRoute>
  );
}