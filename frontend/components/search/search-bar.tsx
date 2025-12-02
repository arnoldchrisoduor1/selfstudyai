'use client';

import { useState, useEffect } from 'react';
import { Search, Filter, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useSearchStore } from '@/lib/store/search-store';
import { useDocumentStore } from '@/lib/store/document-store';

export function SearchBar() {
  const [localQuery, setLocalQuery] = useState('');
  const {
    query,
    selectedDocumentId,
    limit,
    isSearching,
    setQuery,
    setSelectedDocument,
    setLimit,
    search,
    clearResults,
  } = useSearchStore();

  const { documents } = useDocumentStore();

  // Initialize with current store values
  useEffect(() => {
    setLocalQuery(query);
  }, [query]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!localQuery.trim()) return;
    
    setQuery(localQuery);
    await search({ query: localQuery });
  };

  const handleClear = () => {
    setLocalQuery('');
    clearResults();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSearch(e);
    }
  };

  return (
    <div className="w-full">
      <form onSubmit={handleSearch} className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search through your documents..."
              value={localQuery}
              onChange={(e) => setLocalQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              className="pl-10 pr-10"
              disabled={isSearching}
            />
            {localQuery && (
              <button
                type="button"
                onClick={handleClear}
                className="absolute right-3 top-1/2 transform -translate-y-1/2"
                disabled={isSearching}
              >
                <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
              </button>
            )}
          </div>
          
          <Button 
            type="submit" 
            disabled={isSearching || !localQuery.trim()}
            className="min-w-[100px]"
          >
            {isSearching ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Searching...
              </>
            ) : (
              <>
                <Search className="h-4 w-4 mr-2" />
                Search
              </>
            )}
          </Button>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Filters:</span>
          </div>
          
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Search in document</label>
              <Select
                value={selectedDocumentId || 'all'}
                onValueChange={(value) => 
                  setSelectedDocument(value === 'all' ? null : value)
                }
                disabled={isSearching || documents.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All documents" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All documents</SelectItem>
                  {documents.map((doc) => (
                    <SelectItem key={doc.id} value={doc.id}>
                      {doc.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Results limit</label>
              <Select
                value={limit.toString()}
                onValueChange={(value) => setLimit(parseInt(value))}
                disabled={isSearching}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Results limit" />
                </SelectTrigger>
                <SelectContent>
                  {[3, 5, 10, 15, 20].map((num) => (
                    <SelectItem key={num} value={num.toString()}>
                      {num} results
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}