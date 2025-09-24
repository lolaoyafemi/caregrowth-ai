import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

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

// Advanced page estimation
function estimatePageLocation(content: string, targetText: string): number {
  const paragraphs = content.split(/\n\s*\n/).filter(p => p.trim().length > 0);
  const contentLower = content.toLowerCase();
  const targetLower = targetText.toLowerCase();
  
  // Find the position of the target text in the content
  const targetIndex = contentLower.indexOf(targetLower);
  if (targetIndex === -1) return 1;
  
  // Count characters up to the target position
  const charCount = targetIndex;
  const CHARS_PER_PAGE = 2800;
  
  return Math.max(1, Math.ceil(charCount / CHARS_PER_PAGE));
}

// Fetch content directly from Google Docs with better error handling
async function fetchDocumentContent(url: string, title: string): Promise<DocumentContent | null> {
  try {
    console.log(`Attempting to fetch content for document: "${title}" from URL: ${url}`);
    
    const docId = extractDocumentId(url);
    if (!docId) {
      console.error('Could not extract document ID from URL:', url);
      return null;
    }

    console.log(`Extracted document ID: ${docId} for document: "${title}"`);

    const exportUrls = [
      `https://docs.google.com/document/d/${docId}/export?format=txt`,
      `https://docs.google.com/spreadsheets/d/${docId}/export?format=csv`,
      `https://docs.google.com/presentation/d/${docId}/export?format=txt`
    ];

    for (let i = 0; i < exportUrls.length; i++) {
      const exportUrl = exportUrls[i];
      console.log(`Trying export URL ${i + 1}/3 for "${title}": ${exportUrl}`);
      
      try {
        const response = await fetch(exportUrl);
        console.log(`Response status for "${title}": ${response.status} ${response.statusText}`);
        
        if (response.ok) {
          const content = await response.text();
          console.log(`Content length for "${title}": ${content.length} characters`);
          console.log(`First 200 characters of "${title}": ${content.substring(0, 200)}...`);
          
          if (content && content.trim().length > 50) {
            console.log(`Successfully fetched content for "${title}"`);
            return {
              title,
              url,
              content: content.trim()
            };
          } else {
            console.log(`Content too short for "${title}" (${content.length} chars)`);
          }
        } else {
          console.log(`Failed to fetch from export URL for "${title}": ${response.status} ${response.statusText}`);
        }
      } catch (error) {
        console.error(`Error fetching from export URL for "${title}":`, error);
        continue;
      }
    }

    console.error(`All export attempts failed for document: "${title}"`);
    return null;
  } catch (error) {
    console.error(`Error fetching document content for "${title}":`, error);
    return null;
  }
}

// Smart search function using GPT with source tracking
async function performSmartSearch(query: string, documents: DocumentContent[]): Promise<{answer: string, sources: SearchResult[], tokensUsed?: number}> {
  if (!openAIApiKey) {
    throw new Error('OpenAI API key not configured');
  }

  console.log(`Performing smart search with ${documents.length} documents`);
  documents.forEach((doc, index) => {
    console.log(`Document ${index + 1}: "${doc.title}" - ${doc.content.length} characters`);
  });

  // Prepare document context using actual document titles instead of generic numbering
  const documentContext = documents
    .map((doc) => `"${doc.title}":\nContent: ${doc.content.substring(0, 2000)}...`)
    .join('\n\n');

  const prompt = `Based on the following documents, please answer the user's question. Be specific and reference which documents contain the relevant information. For each piece of information you use, please indicate which document it came from by using the exact document title.

DOCUMENTS:
${documentContext}

QUESTION: ${query}

Please provide a comprehensive answer based on the document content. If the answer isn't found in the documents, please say so. When referencing information, please mention the document by its exact title (e.g., "According to '[Document Title]'..." or "'[Document Title]' states...").`;

  console.log(`Sending prompt to OpenAI with ${documentContext.length} characters of context`);

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant that analyzes documents and provides accurate answers based on their content. Always cite which documents you\'re referencing by their exact document title. When you reference specific information, try to include a relevant excerpt or quote.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      console.error(`OpenAI API error: ${response.status} ${response.statusText}`);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const answer = data.choices[0].message.content;
    const tokensUsed = data.usage?.total_tokens;

    console.log(`OpenAI response received. Tokens used: ${tokensUsed}`);
    console.log(`Answer preview: ${answer.substring(0, 200)}...`);

    // Analyze the answer to determine which documents were actually referenced by their titles
    const referencedDocuments: Set<number> = new Set();
    
    // Check for document title mentions in the answer
    documents.forEach((doc, index) => {
      const titleInAnswer = answer.toLowerCase().includes(doc.title.toLowerCase()) || 
                           answer.includes(`"${doc.title}"`) ||
                           answer.includes(`'${doc.title}'`);
      
      if (titleInAnswer) {
        console.log(`Document "${doc.title}" was referenced in the answer`);
        referencedDocuments.add(index);
      }
    });

    console.log(`Documents referenced in answer: ${Array.from(referencedDocuments).map(i => documents[i]?.title).join(', ')}`);

    // If no specific documents were referenced by title, check for content relevance
    if (referencedDocuments.size === 0) {
      const queryLower = query.toLowerCase();
      documents.forEach((doc, index) => {
        const contentMatch = doc.content.toLowerCase().includes(queryLower);
        
        if (contentMatch) {
          console.log(`Document "${doc.title}" appears to be relevant based on content analysis`);
          referencedDocuments.add(index);
        }
      });
    }

    // Create sources only from documents that were actually referenced or contain relevant content
    const sources: SearchResult[] = [];
    
    if (referencedDocuments.size > 0) {
      referencedDocuments.forEach(docIndex => {
        const doc = documents[docIndex];
        if (doc) {
          console.log(`Creating source entry for document: "${doc.title}"`);
          
          // Find the most relevant excerpt from this document
          const queryWords = query.toLowerCase().split(/\s+/).filter(word => word.length > 2);
          let bestExcerpt = doc.content.substring(0, 300);
          let bestScore = 0;
          
          // Look for the best matching paragraph
          const paragraphs = doc.content.split(/\n\s*\n/).filter(p => p.trim().length > 50);
          paragraphs.forEach(paragraph => {
            const paragraphLower = paragraph.toLowerCase();
            let score = 0;
            queryWords.forEach(word => {
              if (paragraphLower.includes(word)) {
                score++;
              }
            });
            
            if (score > bestScore && paragraph.length >= 100) {
              bestScore = score;
              bestExcerpt = paragraph.substring(0, 400);
            }
          });
          
          // Estimate page number based on the excerpt location
          const pageNumber = estimatePageLocation(doc.content, bestExcerpt.substring(0, 100));
          
          sources.push({
            documentTitle: doc.title,
            documentUrl: doc.url,
            relevantContent: bestExcerpt + (bestExcerpt.length < doc.content.length ? '...' : ''),
            pageNumber: pageNumber,
            confidence: Math.min(0.9, 0.6 + (bestScore * 0.1)) // High confidence for smart search
          });
        }
      });
    }

    console.log(`Created ${sources.length} source entries`);

    // If no sources were found but we have an answer, include all documents as potential sources
    if (sources.length === 0 && !answer.includes("don't have access") && !answer.includes("not contain") && !answer.includes("do not contain")) {
      console.log('No specific sources found, including all documents as potential sources');
      documents.forEach(doc => {
        const pageNumber = estimatePageLocation(doc.content, query);
        sources.push({
          documentTitle: doc.title,
          documentUrl: doc.url,
          relevantContent: doc.content.substring(0, 300) + '...',
          pageNumber: pageNumber,
          confidence: 0.5
        });
      });
    }

    return {
      answer,
      sources,
      tokensUsed
    };
  } catch (error) {
    console.error('Error calling OpenAI API:', error);
    throw error;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting smart document search request processing...');
    
    const requestBody = await req.json();
    const { query, userId } = requestBody;
    
    console.log(`Processing query: "${query}" for user: ${userId}`);
    
    if (!query || !userId) {
      return new Response(JSON.stringify({ 
        error: 'Query and userId are required' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!openAIApiKey) {
      return new Response(JSON.stringify({ 
        error: 'OpenAI API key not configured' 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user's documents - include all documents for search
    console.log('Fetching user documents from database...');
    const { data: userDocs, error: docsError } = await supabase
      .from('google_documents')
      .select('id, doc_title, doc_link')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

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
    console.log(`Found ${documents.length} documents in database:`);
    documents.forEach((doc, index) => {
      console.log(`  ${index + 1}. "${doc.doc_title}" - ${doc.doc_link}`);
    });
    
    if (documents.length === 0) {
      return new Response(JSON.stringify({ 
        answer: "I don't have access to any documents to search through. Please upload some documents first.",
        sources: [],
        tokensUsed: 0
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch document contents - increased limit to 10 documents
    console.log('Fetching document contents...');
    const documentContents: DocumentContent[] = [];
    
    for (const doc of documents.slice(0, 25)) { // Increased limit to 25 docs
      const content = await fetchDocumentContent(doc.doc_link, doc.doc_title || 'Untitled Document');
      if (content) {
        documentContents.push(content);
        console.log(`Successfully added content for: "${content.title}"`);
      } else {
        console.log(`Failed to fetch content for: "${doc.doc_title}"`);
      }
    }

    console.log(`Successfully fetched content from ${documentContents.length} out of ${Math.min(documents.length, 10)} documents`);

    if (documentContents.length === 0) {
      return new Response(JSON.stringify({ 
        answer: "I couldn't access the content of your documents. Please ensure they are publicly accessible or shared with view permissions. Make sure the documents are not restricted and that the sharing settings allow viewing.",
        sources: [],
        tokensUsed: 0
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Perform smart search
    console.log('Performing smart search...');
    const result = await performSmartSearch(query, documentContents);

    console.log(`Smart search completed: ${result.sources.length} sources, ${result.tokensUsed} tokens used`);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in smart-document-search function:', error);
    return new Response(JSON.stringify({ 
      error: (error as Error).message || 'An error occurred processing your search'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
