import axios from "axios";
import { DocumentResponse, DocumentsResponse, DocumentUploadRequest, SearchRequest, SearchResponse } from "../types/document";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle token refresh (optional for future)
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      // Handle token refresh here if implemented
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    
    return Promise.reject(error);
  }
);


// Add to authApi object
const documentApi = {
  uploadDocument: async (data: DocumentUploadRequest): Promise<DocumentResponse> => {
    const response = await api.post<DocumentResponse>('/api/documents', data);
    return response.data;
  },

  getDocuments: async (): Promise<DocumentResponse[]> => {
    const response = await api.get<DocumentsResponse[]>('/api/documents');
    return response.data.documents;
  },

  deleteDocument: async (id: string): Promise<void> => {
    await api.delete(`/api/documents/${id}`);
  },

  searchDocuments: async (data: SearchRequest): Promise<SearchResponse> => {
    const response = await api.post<SearchResponse>('/api/search', data);
    return response.data;
  },

  // Optional: Get a single document by ID
  getDocumentById: async (id: string): Promise<DocumentResponse> => {
    const response = await api.get<DocumentResponse>(`/api/documents/${id}`);
    return response.data;
  },
};



// Update export
export { documentApi };