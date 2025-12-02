export interface DocumentUploadRequest {
  title: string;
  file_url: string;
  file_name: string;
  file_size: number;
}

export interface DocumentResponse {
  id: string;
  title: string;
  file_url: string;
  file_name: string;
  file_size: number;
  uploaded_at: string;
  user_id: string;
}

export interface DocumentsResponse {
  documents: DocumentResponse[];
}

export interface SearchRequest {
  query: string;
  document_id?: string;
  limit?: number;
}

export interface SearchResultItem {
  document_id: string;
  chunk_id: string;
  content: string;
  score: number;
}

export interface SearchResponse {
  results: SearchResultItem[];
}

export interface DocumentResponse {
  id: string;
  title: string;
  file_name: string;
  file_url: string;
  file_size: number;
  page_count: number | null;
  processing_status: string;
  created_at: string;
}

export interface DocumentListResponse {
  documents: DocumentResponse[];
}