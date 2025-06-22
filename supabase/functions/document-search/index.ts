import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface SearchResult {
  documentTitle: string;
  documentUrl: string;
  relevantContent: string;
  pageNumber?: number;
  confidence: number;
}

interface DocumentContent {
  title: string;
  url: string;
  content: string;
}

// Extract document ID from Google Docs URL
function extractDocumentId(url: string): string | null {
  const patterns = [
    /\/document\/d\/([a-zA-Z0-9-_]+)/,
    /\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/,
    /\/presentation\/d\/([a-zA-Z0-9-_]+)/,
    /id=([a-zA-Z0-9-_]+)/
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

// Fetch content directly from Google Docs
async function fetchDocumentContent(url: string, title: string): Promise<DocumentContent | null> {
  try {
    const docId = extractDocumentId(url);
    if (!docId) {
      console.error('Could not extract document ID from URL:', url);
      return null;
    }

    // Try different export formats
    const exportUrls = [
      `https://docs.google.com/document/d/${docId}/export?format=txt`,
      `https://docs.google.com/spreadsheets/d/${docId}/export?format=csv`,
      `https://docs.google.com/presentation/d/${docId}/export?format=txt`
    ];

    for (const exportUrl of exportUrls) {
      try {
        console.log(`Trying export URL: ${exportUrl}`);
        const response = await fetch(exportUrl);
        console.log(`Response status: ${response.status}`);
        
        if (response.ok) {
          const content = await response.text();
          if (content && content.trim().length > 50) {
            console.log(`Successfully extracted ${content.length} characters from ${exportUrl}`);
            return {
              title,
              url,
              content: content.trim()
            };
          }
        }
      } catch (error) {
        console.log(`Failed to fetch from ${exportUrl}:`, error);
        continue;
      }
    }

    console.error('Failed to fetch content from any export URL for:', url);
    return null;
  } catch (error) {
    console.error('Error fetching document content:', error);
    return null;
  }
}

// Improved search function with better confidence calculation
function searchInDocument(content: string, query: string): { relevantContent: string; confidence: number; pageNumber?: number } | null {
  const originalQuery = query.trim();
  const queryLower = originalQuery.toLowerCase();
  const contentLower = content.toLowerCase();
  
  // Split content into words for page estimation
  const words = content.split(/\s+/);
  const wordsPerPage = 250;
  
  // Split content into pages
  const pages = [];
  for (let i = 0; i < words.length; i += wordsPerPage) {
    const pageWords = words.slice(i, i + wordsPerPage);
    pages.push(pageWords.join(' '));
  }
  
  // Check for exact phrase match first
  const hasExactMatch = contentLower.includes(queryLower);
  
  // Split query into individual words for partial matching
  const queryWords = queryLower.split(/\s+/).filter(word => word.length > 2);
  
  let bestMatch = { content: '', confidence: 0, pageNumber: 1 };
  let allMatchingSentences: string[] = [];
  
  // Search through pages
  pages.forEach((page, pageIndex) => {
    const pageLower = page.toLowerCase();
    
    // Calculate confidence based on exact phrase match and individual word matches
    let pageConfidence = 0;
    
    if (hasExactMatch && pageLower.includes(queryLower)) {
      // Give high confidence for exact phrase matches
      pageConfidence = 1.0;
    } else {
      // Calculate based on individual word matches
      let wordMatchCount = 0;
      queryWords.forEach(word => {
        if (pageLower.includes(word)) {
          wordMatchCount++;
        }
      });
      pageConfidence = queryWords.length > 0 ? wordMatchCount / queryWords.length : 0;
    }
    
    if (pageConfidence > 0.1) {
      // Split page into sentences and find those containing keywords
      const sentences = page.split(/[.!?]+/).filter(s => s.trim().length > 10);
      const matchingSentences: string[] = [];
      
      sentences.forEach(sentence => {
        const sentenceLower = sentence.toLowerCase();
        
        // Check for exact phrase match in sentence
        if (hasExactMatch && sentenceLower.includes(queryLower)) {
          matchingSentences.push(sentence.trim());
        } else {
          // Check for individual word matches
          let sentenceMatches = 0;
          queryWords.forEach(word => {
            if (sentenceLower.includes(word)) {
              sentenceMatches++;
            }
          });
          
          if (sentenceMatches > 0) {
            matchingSentences.push(sentence.trim());
          }
        }
      });
      
      if (matchingSentences.length > 0) {
        const pageMarkedSentences = matchingSentences.map(sentence => 
          `[Page ${pageIndex + 1}] ${sentence}`
        );
        allMatchingSentences.push(...pageMarkedSentences);
        
        if (pageConfidence > bestMatch.confidence) {
          bestMatch = {
            content: pageMarkedSentences.join('. '),
            confidence: pageConfidence,
            pageNumber: pageIndex + 1
          };
        }
      }
    }
  });

  // Fallback to paragraph search if no page matches found
  if (allMatchingSentences.length === 0) {
    const paragraphs = content.split(/\n\s*\n/).filter(p => p.trim().length > 20);
    
    paragraphs.forEach((paragraph, index) => {
      const paragraphLower = paragraph.toLowerCase();
      
      let confidence = 0;
      if (hasExactMatch && paragraphLower.includes(queryLower)) {
        confidence = 1.0;
      } else {
        let matchCount = 0;
        queryWords.forEach(word => {
          if (paragraphLower.includes(word)) {
            matchCount++;
          }
        });
        confidence = queryWords.length > 0 ? matchCount / queryWords.length : 0;
      }
      
      if (confidence > 0.1) {
        const sentences = paragraph.split(/[.!?]+/).filter(s => s.trim().length > 10);
        const matchingSentences: string[] = [];
        
        sentences.forEach(sentence => {
          const sentenceLower = sentence.toLowerCase();
          
          if (hasExactMatch && sentenceLower.includes(queryLower)) {
            matchingSentences.push(sentence.trim());
          } else {
            let sentenceMatches = 0;
            queryWords.forEach(word => {
              if (sentenceLower.includes(word)) {
                sentenceMatches++;
              }
            });
            
            if (sentenceMatches > 0) {
              matchingSentences.push(sentence.trim());
            }
          }
        });
        
        if (matchingSentences.length > 0) {
          const estimatedPage = Math.ceil((index + 1) / Math.ceil(paragraphs.length / pages.length)) || 1;
          const pageMarkedSentences = matchingSentences.map(sentence => 
            `[Page ${estimatedPage}] ${sentence}`
          );
          allMatchingSentences.push(...pageMarkedSentences);
          
          if (confidence > bestMatch.confidence) {
            bestMatch = {
              content: pageMarkedSentences.join('. '),
              confidence,
              pageNumber: estimatedPage
            };
          }
        }
      }
    });
  }

  // Return matching sentences with proper confidence
  if (allMatchingSentences.length > 0) {
    const combinedContent = allMatchingSentences.slice(0, 5).join('. ');
    return {
      relevantContent: combinedContent,
      confidence: bestMatch.confidence,
      pageNumber: bestMatch.pageNumber
    };
  }

  return null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting document search request processing...');
    
    const requestBody = await req.json();
    console.log('Request received:', { 
      hasQuery: !!requestBody.query,
      hasUserId: !!requestBody.userId,
      queryLength: requestBody.query?.length || 0
    });
    
    const { query, userId } = requestBody;
    
    if (!query || !userId) {
      console.error('Missing required fields:', { query: !!query, userId: !!userId });
      return new Response(JSON.stringify({ 
        error: 'Query and userId are required' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Processing search query for user:', userId);
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user's documents
    console.log('Fetching user documents...');
    const { data: userDocs, error: docsError } = await supabase
      .from('google_documents')
      .select('id, doc_title, doc_link')
      .eq('user_id', userId);

    if (docsError) {
      console.error('Error fetching user documents:', docsError);
      return new Response(JSON.stringify({ 
        error: 'Failed to fetch user documents' 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const documents = userDocs || [];
    console.log('Found user documents:', documents.length);

    if (documents.length === 0) {
      return new Response(JSON.stringify({ 
        results: [],
        totalDocumentsSearched: 0
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Search through each document
    const searchResults: SearchResult[] = [];
    let documentsProcessed = 0;

    for (const doc of documents) {
      try {
        console.log(`Searching document: ${doc.doc_title}`);
        
        const documentContent = await fetchDocumentContent(doc.doc_link, doc.doc_title || 'Untitled Document');
        
        if (documentContent) {
          const searchResult = searchInDocument(documentContent.content, query);
          
          if (searchResult) {
            searchResults.push({
              documentTitle: documentContent.title,
              documentUrl: doc.doc_link,
              relevantContent: searchResult.relevantContent,
              pageNumber: searchResult.pageNumber,
              confidence: searchResult.confidence
            });
            console.log(`Found match in ${doc.doc_title}: page ${searchResult.pageNumber}, confidence ${searchResult.confidence}`);
          }
        }
        
        documentsProcessed++;
      } catch (error) {
        console.error(`Error searching document ${doc.doc_title}:`, error);
        // Continue with other documents
      }
    }

    // Sort results by confidence
    searchResults.sort((a, b) => b.confidence - a.confidence);

    console.log(`Document search completed: ${searchResults.length} results from ${documentsProcessed} documents`);

    return new Response(JSON.stringify({ 
      results: searchResults,
      totalDocumentsSearched: documentsProcessed
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in document-search function:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'An error occurred processing your search'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
