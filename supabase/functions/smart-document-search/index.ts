
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

// Fetch content directly from Google Docs
async function fetchDocumentContent(url: string, title: string): Promise<DocumentContent | null> {
  try {
    const docId = extractDocumentId(url);
    if (!docId) {
      console.error('Could not extract document ID from URL:', url);
      return null;
    }

    const exportUrls = [
      `https://docs.google.com/document/d/${docId}/export?format=txt`,
      `https://docs.google.com/spreadsheets/d/${docId}/export?format=csv`,
      `https://docs.google.com/presentation/d/${docId}/export?format=txt`
    ];

    for (const exportUrl of exportUrls) {
      try {
        const response = await fetch(exportUrl);
        if (response.ok) {
          const content = await response.text();
          if (content && content.trim().length > 50) {
            return {
              title,
              url,
              content: content.trim()
            };
          }
        }
      } catch (error) {
        continue;
      }
    }

    return null;
  } catch (error) {
    console.error('Error fetching document content:', error);
    return null;
  }
}

// Smart search function using GPT
async function performSmartSearch(query: string, documents: DocumentContent[]): Promise<{answer: string, sources: SearchResult[], tokensUsed?: number}> {
  if (!openAIApiKey) {
    throw new Error('OpenAI API key not configured');
  }

  // Prepare document context
  const documentContext = documents
    .map((doc, index) => `Document ${index + 1}: ${doc.title}\nContent: ${doc.content.substring(0, 2000)}...`)
    .join('\n\n');

  const prompt = `Based on the following documents, please answer the user's question. Be specific and reference which documents contain the relevant information.

DOCUMENTS:
${documentContext}

QUESTION: ${query}

Please provide a comprehensive answer based on the document content. If the answer isn't found in the documents, please say so.`;

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
            content: 'You are a helpful assistant that analyzes documents and provides accurate answers based on their content. Always cite which documents you\'re referencing.'
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
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const answer = data.choices[0].message.content;
    const tokensUsed = data.usage?.total_tokens;

    // Create sources from documents
    const sources: SearchResult[] = documents.map(doc => ({
      documentTitle: doc.title,
      documentUrl: doc.url,
      relevantContent: doc.content.substring(0, 500) + '...',
      confidence: 0.8 // High confidence since we're using full documents
    }));

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

    // Get user's documents
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
    
    if (documents.length === 0) {
      return new Response(JSON.stringify({ 
        answer: "I don't have access to any documents to search through. Please upload some documents first.",
        sources: [],
        tokensUsed: 0
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch document contents
    const documentContents: DocumentContent[] = [];
    
    for (const doc of documents.slice(0, 5)) { // Limit to 5 docs to avoid token limits
      const content = await fetchDocumentContent(doc.doc_link, doc.doc_title || 'Untitled Document');
      if (content) {
        documentContents.push(content);
      }
    }

    if (documentContents.length === 0) {
      return new Response(JSON.stringify({ 
        answer: "I couldn't access the content of your documents. Please ensure they are publicly accessible or shared with view permissions.",
        sources: [],
        tokensUsed: 0
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Perform smart search
    const result = await performSmartSearch(query, documentContents);

    console.log(`Smart search completed: ${result.sources.length} sources, ${result.tokensUsed} tokens used`);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in smart-document-search function:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'An error occurred processing your search'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
