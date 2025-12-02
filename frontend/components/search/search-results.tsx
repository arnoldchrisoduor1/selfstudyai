'use client';

import { useState } from 'react';
import { Search, File, Copy, Check, ExternalLink, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useSearchStore } from '@/lib/store/search-store';
import { useDocumentStore } from '@/lib/store/document-store';
import { Alert, AlertDescription } from '@/components/ui/alert';

export function SearchResults() {
  const { results, isLoading, isSearching, error, query, clearError } = useSearchStore();
  const { documents } = useDocumentStore();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const getDocumentById = (id: string) => {
    return documents.find(doc => doc.id === id);
  };

  const formatScore = (score: number) => {
    return (score * 100).toFixed(1);
  };

  const handleCopyContent = async (content: string, chunkId: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedId(chunkId);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const highlightQuery = (text: string, query: string) => {
    if (!query.trim()) return text;
    
    const regex = new RegExp(`(${query.split(' ').filter(q => q.length > 2).join('|')})`, 'gi');
    return text.split(regex).map((part, i) => 
      regex.test(part) ? (
        <mark key={i} className="bg-yellow-200 dark:bg-yellow-800 px-1 rounded">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  if (isLoading || isSearching) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Search Results</CardTitle>
          <CardDescription>Searching through your documents...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
            <p className="text-muted-foreground">Searching for "{query}"...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Search Results</CardTitle>
          <CardDescription>Search encountered an error</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
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
        </CardContent>
      </Card>
    );
  }

  if (!query) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Search Results</CardTitle>
          <CardDescription>Enter a query to search your documents</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <Search className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Ready to search</h3>
            <p className="text-muted-foreground mb-4">
              Enter a query above to search through your documents using AI-powered semantic search
            </p>
            <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
              <Star className="h-4 w-4" />
              <span>Powered by vector embeddings and semantic search</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (results.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Search Results</CardTitle>
          <CardDescription>No results found for "{query}"</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <Search className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No matches found</h3>
            <p className="text-muted-foreground">
              Try different keywords or search in all documents
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Search Results</CardTitle>
        <CardDescription>
          Found {results.length} result{results.length !== 1 ? 's' : ''} for "{query}"
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {results.map((result, index) => {
            const document = getDocumentById(result.document_id);
            
            return (
              <div
                key={`${result.document_id}-${result.chunk_id}`}
                className="border rounded-lg p-6 hover:bg-muted/50 transition-colors"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="secondary" className="font-normal">
                        #{index + 1}
                      </Badge>
                      <Badge 
                        variant="outline"
                        className={`${
                          result.score > 0.8 ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300' :
                          result.score > 0.6 ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300' :
                          'bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-300'
                        }`}
                      >
                        {formatScore(result.score)}% match
                      </Badge>
                    </div>
                    
                    <h3 className="font-semibold text-lg mb-2">
                      {document?.title || 'Unknown Document'}
                    </h3>
                    
                    {document && (
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                        <div className="flex items-center gap-1">
                          <File className="h-3 w-3" />
                          <span>{document.file_name}</span>
                        </div>
                        {document.page_count && (
                          <span>{document.page_count} pages</span>
                        )}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopyContent(result.content, result.chunk_id)}
                    >
                      {copiedId === result.chunk_id ? (
                        <>
                          <Check className="h-4 w-4 mr-2" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4 mr-2" />
                          Copy
                        </>
                      )}
                    </Button>
                    
                    {document?.file_url && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(document.file_url, '_blank')}
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Open PDF
                      </Button>
                    )}
                  </div>
                </div>
                
                <div className="bg-muted/30 rounded-lg p-4">
                  <div className="prose prose-sm max-w-none dark:prose-invert">
                    <p className="whitespace-pre-wrap leading-relaxed">
                      {highlightQuery(result.content, query)}
                    </p>
                  </div>
                </div>
                
                <div className="mt-4 pt-4 border-t flex justify-between items-center text-sm text-muted-foreground">
                  <div>
                    <span className="font-medium">Chunk ID:</span> {result.chunk_id}
                  </div>
                  <div className="text-xs">
                    From document: {result.document_id.slice(0, 8)}...
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        
        <div className="mt-8 pt-6 border-t">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              Search powered by AI embeddings and Qdrant vector search
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const allText = results.map(r => r.content).join('\n\n');
                  navigator.clipboard.writeText(allText);
                }}
              >
                <Copy className="h-4 w-4 mr-2" />
                Copy all results
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}