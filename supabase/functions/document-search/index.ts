
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

interface PageEstimate {
  method: string;
  estimatedPage: number;
  confidence: number;
}

interface PageAnalysisResult {
  estimatedPage: number;
  confidence: 'high' | 'medium' | 'low';
  confidenceIcon: string;
  methods: PageEstimate[];
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

// Advanced page estimation with multiple methods
function estimatePageLocation(content: string, targetParagraphIndex: number): PageAnalysisResult {
  const paragraphs = content.split(/\n\s*\n/).filter(p => p.trim().length > 0);
  
  if (targetParagraphIndex >= paragraphs.length) {
    return {
      estimatedPage: 1,
      confidence: 'low',
      confidenceIcon: '⚠️',
      methods: []
    };
  }

  // Method 1: Character-Based Analysis (40% weight)
  const characterBasedEstimate = () => {
    let charCount = 0;
    for (let i = 0; i <= targetParagraphIndex; i++) {
      charCount += paragraphs[i].length + 2; // +2 for paragraph breaks
    }
    const CHARS_PER_PAGE = 2800;
    const estimatedPage = Math.max(1, Math.ceil(charCount / CHARS_PER_PAGE));
    
    return {
      method: 'Character-Based',
      estimatedPage,
      confidence: 0.9 // High confidence for character counting
    };
  };

  // Method 2: Word-Based Analysis (30% weight)
  const wordBasedEstimate = () => {
    let wordCount = 0;
    for (let i = 0; i <= targetParagraphIndex; i++) {
      const words = paragraphs[i].split(/\s+/).filter(word => word.length > 0);
      wordCount += words.length;
    }
    const WORDS_PER_PAGE = 500;
    const estimatedPage = Math.max(1, Math.ceil(wordCount / WORDS_PER_PAGE));
    
    return {
      method: 'Word-Based',
      estimatedPage,
      confidence: 0.8
    };
  };

  // Method 3: Line-Based Analysis (30% weight)
  const lineBasedEstimate = () => {
    let totalLines = 0;
    let hasComplexContent = false;
    
    for (let i = 0; i <= targetParagraphIndex; i++) {
      const paragraph = paragraphs[i];
      const charLength = paragraph.length;
      
      // Smart content detection
      if (paragraph.includes('|') && paragraph.includes('-')) {
        // Likely table content
        hasComplexContent = true;
        totalLines += Math.max(2, Math.ceil(charLength / 60)); // Tables use more space
      } else if (paragraph.toLowerCase().includes('image') || paragraph.includes('[img]')) {
        // Image references
        hasComplexContent = true;
        totalLines += 3; // Images take space
      } else if (charLength === 0) {
        // Empty paragraph
        totalLines += 0.5;
      } else if (charLength < 50) {
        // Short paragraph (likely heading)
        totalLines += 1;
      } else if (charLength < 100) {
        // Medium paragraph
        totalLines += 2;
      } else {
        // Long paragraph - calculate based on line wrapping
        const CHARS_PER_LINE = 80;
        totalLines += Math.ceil(charLength / CHARS_PER_LINE);
      }
    }
    
    const LINES_PER_PAGE = 45;
    const estimatedPage = Math.max(1, Math.ceil(totalLines / LINES_PER_PAGE));
    const confidence = hasComplexContent ? 0.6 : 0.8;
    
    return {
      method: 'Line-Based',
      estimatedPage,
      confidence
    };
  };

  // Calculate estimates using all methods
  const charEstimate = characterBasedEstimate();
  const wordEstimate = wordBasedEstimate();
  const lineEstimate = lineBasedEstimate();

  const methods = [charEstimate, wordEstimate, lineEstimate];

  // Weighted average calculation
  const weightedSum = (charEstimate.estimatedPage * 0.4) + 
                     (wordEstimate.estimatedPage * 0.3) + 
                     (lineEstimate.estimatedPage * 0.3);
  
  const finalEstimate = Math.max(1, Math.round(weightedSum));

  // Confidence scoring based on method agreement
  const pageNumbers = methods.map(m => m.estimatedPage);
  const minPage = Math.min(...pageNumbers);
  const maxPage = Math.max(...pageNumbers);
  const variance = maxPage - minPage;

  let confidence: 'high' | 'medium' | 'low';
  let confidenceIcon: string;

  if (variance <= 1) {
    confidence = 'high';
    confidenceIcon = '🎯';
  } else if (variance <= 2) {
    confidence = 'medium';
    confidenceIcon = '📊';
  } else {
    confidence = 'low';
    confidenceIcon = '⚠️';
  }

  // Adjust confidence if complex content detected
  if (lineEstimate.confidence < 0.7) {
    if (confidence === 'high') confidence = 'medium';
    else if (confidence === 'medium') confidence = 'low';
  }

  return {
    estimatedPage: finalEstimate,
    confidence,
    confidenceIcon,
    methods
  };
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

// Improved search function with advanced page estimation
function searchInDocument(content: string, query: string): { relevantContent: string; confidence: number; pageNumber?: number } | null {
  const originalQuery = query.trim();
  const queryLower = originalQuery.toLowerCase();
  const contentLower = content.toLowerCase();
  
  // Split content into paragraphs for analysis
  const paragraphs = content.split(/\n\s*\n/).filter(p => p.trim().length > 10);
  
  // Check for exact phrase match first
  const hasExactMatch = contentLower.includes(queryLower);
  
  // Split query into individual words for partial matching
  const queryWords = queryLower.split(/\s+/).filter(word => word.length > 2);
  
  let bestMatch = { content: '', confidence: 0, paragraphIndex: 0 };
  let allMatchingSentences: string[] = [];
  
  // Search through paragraphs
  paragraphs.forEach((paragraph, paragraphIndex) => {
    const paragraphLower = paragraph.toLowerCase();
    
    // Calculate confidence based on exact phrase match and individual word matches
    let paragraphConfidence = 0;
    
    if (hasExactMatch && paragraphLower.includes(queryLower)) {
      // Give high confidence for exact phrase matches
      paragraphConfidence = 1.0;
    } else {
      // Calculate based on individual word matches
      let wordMatchCount = 0;
      queryWords.forEach(word => {
        if (paragraphLower.includes(word)) {
          wordMatchCount++;
        }
      });
      paragraphConfidence = queryWords.length > 0 ? wordMatchCount / queryWords.length : 0;
    }
    
    if (paragraphConfidence > 0.1) {
      // Split paragraph into sentences and find those containing keywords
      const sentences = paragraph.split(/[.!?]+/).filter(s => s.trim().length > 10);
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
        // Use advanced page estimation
        const pageAnalysis = estimatePageLocation(content, paragraphIndex);
        
        const pageMarkedSentences = matchingSentences.map(sentence => 
          `[Page ${pageAnalysis.estimatedPage} ${pageAnalysis.confidenceIcon}] ${sentence}`
        );
        allMatchingSentences.push(...pageMarkedSentences);
        
        if (paragraphConfidence > bestMatch.confidence) {
          bestMatch = {
            content: pageMarkedSentences.join('. '),
            confidence: paragraphConfidence,
            paragraphIndex
          };
        }
      }
    }
  });

  // Return matching sentences with proper confidence and page estimation
  if (allMatchingSentences.length > 0) {
    const combinedContent = allMatchingSentences.slice(0, 5).join('. ');
    const pageAnalysis = estimatePageLocation(content, bestMatch.paragraphIndex);
    
    return {
      relevantContent: combinedContent,
      confidence: bestMatch.confidence,
      pageNumber: pageAnalysis.estimatedPage
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
    
    // SECURITY: Validate JWT token and extract userId
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({
        error: 'Unauthorized - Missing or invalid authorization header'
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.substring(7);
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Verify the JWT token and get the user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      console.error('Authentication failed:', authError);
      return new Response(JSON.stringify({
        error: 'Unauthorized - Invalid token'
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Use the authenticated user's ID instead of trusting client input
    const authenticatedUserId = user.id;
    
    const requestBody = await req.json();
    console.log('Request received:', { 
      hasQuery: !!requestBody.query,
      userId: authenticatedUserId,
      queryLength: requestBody.query?.length || 0
    });
    
    const { query } = requestBody;
    
    if (!query) {
      console.error('Missing required field: query');
      return new Response(JSON.stringify({ 
        error: 'Query is required' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Processing search query for user:', authenticatedUserId);

    // Get user's documents
    console.log('Fetching user documents...');
    const { data: userDocs, error: docsError } = await supabase
      .from('google_documents')
      .select('id, doc_title, doc_link')
      .eq('user_id', authenticatedUserId);

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
      error: (error as Error).message || 'An error occurred processing your search'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
