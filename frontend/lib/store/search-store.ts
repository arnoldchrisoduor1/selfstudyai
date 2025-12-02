import { create } from 'zustand';
import { SearchRequest, SearchResponse, SearchResultItem } from '@/lib/types/document';
import { documentApi } from '@/lib/api/document';

interface SearchStore {
  results: SearchResultItem[];
  isLoading: boolean;
  isSearching: boolean;
  error: string | null;
  query: string;
  selectedDocumentId: string | null;
  limit: number;
  
  // Actions
  setQuery: (query: string) => void;
  setSelectedDocument: (documentId: string | null) => void;
  setLimit: (limit: number) => void;
  search: (request?: Partial<SearchRequest>) => Promise<void>;
  clearResults: () => void;
  clearError: () => void;
}

export const useSearchStore = create<SearchStore>((set, get) => ({
  results: [],
  isLoading: false,
  isSearching: false,
  error: null,
  query: '',
  selectedDocumentId: null,
  limit: 5,

  setQuery: (query) => set({ query }),

  setSelectedDocument: (documentId) => set({ selectedDocumentId: documentId }),

  setLimit: (limit) => set({ limit: Math.max(1, Math.min(limit, 20)) }), // Limit to 1-20

  search: async (request?: Partial<SearchRequest>) => {
    const state = get();
    const searchRequest: SearchRequest = {
      query: request?.query || state.query,
      document_id: request?.document_id || state.selectedDocumentId || undefined,
      limit: request?.limit || state.limit,
    };

    if (!searchRequest.query.trim()) {
      set({ error: 'Please enter a search query' });
      return;
    }

    set({ isSearching: true, error: null });
    
    try {
      const response = await documentApi.searchDocuments(searchRequest);
      set({ 
        results: response.results,
        isSearching: false,
        query: searchRequest.query,
      });
    } catch (error: any) {
      console.error('Search error:', error);
      set({ 
        error: error.response?.data?.error || 'Search failed. Please try again.',
        isSearching: false,
        results: [],
      });
    }
  },

  clearResults: () => set({ results: [], query: '' }),

  clearError: () => set({ error: null }),
}));