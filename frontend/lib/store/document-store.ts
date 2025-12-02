import { create } from 'zustand';
import { DocumentResponse, DocumentUploadRequest } from '@/lib/types/document';
import { documentApi } from '@/lib/api/document';
import { BlobService } from '@/lib/services/blob-service';

interface DocumentStore {
  documents: DocumentResponse[];
  isLoading: boolean;
  isUploading: boolean;
  error: string | null;
  uploadProgress: number;
  
  // Actions
  uploadDocument: (
    file: File, 
    title: string, 
    token: string, 
    blobToken: string
  ) => Promise<void>;
  
  fetchDocuments: () => Promise<void>;
  deleteDocument: (id: string) => Promise<void>;
  clearError: () => void;
  clearDocuments: () => void;
}

export const useDocumentStore = create<DocumentStore>((set, get) => ({
  documents: [],
  isLoading: false,
  isUploading: false,
  error: null,
  uploadProgress: 0,

  uploadDocument: async (file, title, authToken, blobToken) => {
    set({ isUploading: true, error: null, uploadProgress: 0 });
    
    try {
      // Upload to Vercel Blob
      const blobResult = await BlobService.uploadFile(file, blobToken);
      
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        set((state) => ({
          uploadProgress: Math.min(state.uploadProgress + 10, 90)
        }));
      }, 100);

      // Send document metadata to backend
      const documentData: DocumentUploadRequest = {
        title,
        file_url: blobResult.url,
        file_name: blobResult.fileName,
        file_size: blobResult.fileSize,
      };

      const response = await documentApi.uploadDocument(documentData);
      
      clearInterval(progressInterval);
      set({ uploadProgress: 100 });

      // Add to local state
      set((state) => ({
        documents: [response, ...state.documents],
        isUploading: false,
        uploadProgress: 0,
      }));

      // Reset progress after delay
      setTimeout(() => {
        set({ uploadProgress: 0 });
      }, 1000);

    } catch (error: any) {
      set({ 
        error: error.message || 'Upload failed',
        isUploading: false,
        uploadProgress: 0,
      });
      throw error;
    }
  },

  fetchDocuments: async () => {
    set({ isLoading: true, error: null });
    
    try {
      const documents = await documentApi.getDocuments();
      set({ documents, isLoading: false });
      console.log("Documents Loaded", documents);
    } catch (error: any) {
      set({ 
        error: error.response?.data?.error || 'Failed to fetch documents',
        isLoading: false,
        documents: [],
      });
    }
  },

  deleteDocument: async (id: string) => {
    try {
      await documentApi.deleteDocument(id);
      set((state) => ({
        documents: state.documents.filter(doc => doc.id !== id)
      }));
    } catch (error: any) {
      set({ 
        error: error.response?.data?.error || 'Failed to delete document'
      });
      throw error;
    }
  },

  clearError: () => set({ error: null }),
  clearDocuments: () => set({ documents: [] }),
}));