import { put } from '@vercel/blob';
import { v4 as uuidv4 } from 'uuid';

export interface UploadResult {
  url: string;
  pathname: string;
  contentType: string;
  contentDisposition: string;
}

export class BlobService {
  private static MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
  private static ALLOWED_TYPES = ['application/pdf'];

  static validateFile(file: File): { isValid: boolean; error?: string } {
    if (file.size > this.MAX_FILE_SIZE) {
      return { 
        isValid: false, 
        error: `File size exceeds ${this.MAX_FILE_SIZE / (1024 * 1024)}MB limit` 
      };
    }

    if (!this.ALLOWED_TYPES.includes(file.type)) {
      return { 
        isValid: false, 
        error: 'Only PDF files are allowed' 
      };
    }

    return { isValid: true };
  }

  static async uploadFile(
    file: File, 
    token: string
  ): Promise<UploadResult & { fileSize: number; fileName: string }> {
    const validation = this.validateFile(file);
    if (!validation.isValid) {
      throw new Error(validation.error);
    }

    try {
      // Generate unique filename
      const fileExtension = file.name.split('.').pop();
      const fileName = `${uuidv4()}.${fileExtension}`;
      
      // Upload to Vercel Blob
      const blob = await put(fileName, file, {
        access: 'public',
        token,
      });

      return {
        url: blob.url,
        pathname: blob.pathname,
        contentType: blob.contentType,
        contentDisposition: blob.contentDisposition,
        fileSize: file.size,
        fileName: file.name,
      };
    } catch (error: any) {
      console.error('Blob upload error:', error);
      throw new Error(`Upload failed: ${error.message}`);
    }
  }
}