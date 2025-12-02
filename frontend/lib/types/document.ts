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