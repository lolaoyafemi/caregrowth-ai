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

// Search within document content with improved page estimation
function searchInDocument(content: string, query: string): { relevantContent: string; confidence: number; pageNumber?: number } | null {
  const queryWords = query.toLowerCase().split(/\s+/).filter(word => word.length > 2);
  const contentLower = content.toLowerCase();
  
  // Improved page estimation: split by common page breaks and logical sections
  const pageBreakPatterns = [
    /\n\s*\n\s*\n/g, // Multiple line breaks (common page separator)
    /\f/g, // Form feed character (actual page break)
    /Page \d+/gi, // Explicit page markers
    /^\s*\d+\s*$/gm // Standalone numbers that might be page numbers
  ];
  
  // Split content into logical sections that might represent pages
  let sections = [content];
  
  // Apply page break patterns to split content
  pageBreakPatterns.forEach(pattern => {
    const newSections = [];
    sections.forEach(section => {
      const parts = section.split(pattern);
      newSections.push(...parts.filter(part => part.trim().length > 50));
    });
    if (newSections.length > sections.length) {
      sections = newSections;
    }
  });
  
  // If no clear breaks found, split by paragraphs and group them
  if (sections.length === 1 && content.length > 1000) {
    const paragraphs = content.split(/\n\s*\n/).filter(p => p.trim().length > 20);
    sections = [];
    
    // Group paragraphs into logical pages (assuming 2-3 paragraphs per page for typical documents)
    const paragraphsPerPage = Math.max(2, Math.ceil(paragraphs.length / 2)); // Assuming 2 pages max
    for (let i = 0; i < paragraphs.length; i += paragraphsPerPage) {
      const pageContent = paragraphs.slice(i, i + paragraphsPerPage).join('\n\n');
      if (pageContent.trim().length > 50) {
        sections.push(pageContent);
      }
    }
  }
  
  // Ensure we don't exceed 2 pages for any document
  if (sections.length > 2) {
    // Combine sections to fit into 2 pages
    const midPoint = Math.ceil(sections.length / 2);
    const page1 = sections.slice(0, midPoint).join('\n\n');
    const page2 = sections.slice(midPoint).join('\n\n');
    sections = [page1, page2];
  }
  
  let bestMatch = { content: '', confidence: 0, pageNumber: 1 };
  
  // Search through sections (pages) to find the best match
  sections.forEach((section, index) => {
    const sectionLower = section.toLowerCase();
    let matchCount = 0;
    
    queryWords.forEach(word => {
      if (sectionLower.includes(word)) {
        matchCount++;
      }
    });
    
    const confidence = matchCount / queryWords.length;
    if (confidence > bestMatch.confidence) {
      // Find the specific sentence or paragraph with the match
      const sentences = section.split(/[.!?]+/).filter(s => s.trim().length > 10);
      let bestSentence = section;
      let maxSentenceMatches = 0;
      
      sentences.forEach(sentence => {
        const sentenceLower = sentence.toLowerCase();
        let sentenceMatches = 0;
        queryWords.forEach(word => {
          if (sentenceLower.includes(word)) {
            sentenceMatches++;
          }
        });
        
        if (sentenceMatches > maxSentenceMatches) {
          maxSentenceMatches = sentenceMatches;
          bestSentence = sentence.trim();
        }
      });
      
      bestMatch = {
        content: bestSentence.length > 300 ? bestSentence.substring(0, 300) + '...' : bestSentence,
        confidence,
        pageNumber: Math.min(index + 1, 2) // Cap at page 2
      };
    }
  });

  // If no section-based match, fall back to full content search
  if (bestMatch.confidence < 0.1) {
    const paragraphs = content.split(/\n\s*\n/).filter(p => p.trim().length > 20);
    
    paragraphs.forEach((paragraph, index) => {
      const paragraphLower = paragraph.toLowerCase();
      let matchCount = 0;
      
      queryWords.forEach(word => {
        if (paragraphLower.includes(word)) {
          matchCount++;
        }
      });
      
      const confidence = matchCount / queryWords.length;
      if (confidence > bestMatch.confidence) {
        // Estimate page based on paragraph position (assuming documents are 2 pages)
        const estimatedPage = Math.min(Math.ceil((index + 1) / Math.ceil(paragraphs.length / 2)), 2);
        bestMatch = {
          content: paragraph.trim().length > 300 
            ? paragraph.trim().substring(0, 300) + '...'
            : paragraph.trim(),
          confidence,
          pageNumber: estimatedPage
        };
      }
    });
  }

  if (bestMatch.confidence > 0.1) {
    return {
      relevantContent: bestMatch.content,
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
