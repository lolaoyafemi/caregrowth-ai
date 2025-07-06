
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { EmbeddingService } from './embedding-service.ts';
import { SearchService } from './search-service.ts';
import { AnswerGenerator } from './answer-generator.ts';
import { DatabaseService } from './database-service.ts';
import { QAResponse } from './types.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const startTime = Date.now();
    console.log('Starting optimized Q&A assistant processing...');
    
    const requestBody = await req.json();
    const { question, userId } = requestBody;
    
    // Fast validation
    if (!question || !userId || !openAIApiKey) {
      const errorMsg = !question || !userId ? 'Question and userId are required' : 'OpenAI API key not configured';
      return new Response(JSON.stringify({ error: errorMsg }), {
        status: !openAIApiKey ? 500 : 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Processing question for user:', userId, 'Length:', question.length);

    // Initialize services once
    const embeddingService = new EmbeddingService(openAIApiKey);
    const searchService = new SearchService();
    const answerGenerator = new AnswerGenerator(openAIApiKey);
    const databaseService = new DatabaseService();

    // Parallel data fetching for optimal performance
    console.log('Starting parallel data fetching...');
    const fetchStart = Date.now();
    
    const [conversationHistory, questionEmbedding, userDocs, sharedDocs] = await Promise.all([
      databaseService.getRecentConversationHistory(userId, 3), // Reduced for speed
      embeddingService.generateEmbedding(question),
      databaseService.getUserDocuments(userId),
      databaseService.getSharedDocuments()
    ]);
    
    console.log('Parallel fetch completed in:', Date.now() - fetchStart, 'ms');

    const userDocIds = userDocs.map(doc => doc.id);
    const sharedDocIds = sharedDocs.map(doc => doc.id);

    // Parallel chunk fetching
    const chunkPromises = [];
    if (userDocIds.length > 0) {
      chunkPromises.push(databaseService.getDocumentChunks(userDocIds));
    }
    chunkPromises.push(databaseService.getSharedDocumentChunks());
    
    const chunkResults = await Promise.all(chunkPromises);
    const allChunks = chunkResults.flat();
    
    console.log('Document chunks loaded:', {
      userDocs: userDocIds.length,
      sharedDocs: sharedDocIds.length,
      totalChunks: allChunks.length
    });

    // Early exit if no chunks available
    let relevantChunks: any[] = [];
    
    if (allChunks.length === 0) {
      console.log('No document chunks available - returning generic answer');
      const genericAnswer = "I don't have access to any documents to answer your question. Please upload some documents first or ask a general question about agency management.";
      
      // Quick response without heavy processing
      return new Response(JSON.stringify({
        answer: genericAnswer,
        category: 'other',
        sources: 0,
        generation_time_ms: Date.now() - startTime
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Optimized search and answer generation
    const searchStart = Date.now();
    relevantChunks = await searchService.findRelevantChunks(questionEmbedding, allChunks, question);
    console.log(`Search completed in ${Date.now() - searchStart}ms - found ${relevantChunks.length} relevant chunks`);

    // Parallel answer generation and categorization
    const generationStart = Date.now();
    const [answerResult, category] = await Promise.all([
      answerGenerator.generateContextualAnswer(question, relevantChunks, conversationHistory),
      answerGenerator.categorizeResponse(question, question) // Pre-categorize based on question
    ]);
    
    const answer = answerResult.answer;
    const tokensUsed = answerResult.tokensUsed || 0;
    console.log('Answer generated in:', Date.now() - generationStart, 'ms, tokens:', tokensUsed);

    // Background logging (don't block response)
    const logPromise = databaseService.logQAInteraction(
      userId, 
      question, 
      answer, 
      category, 
      relevantChunks.map(chunk => chunk.document_id) || []
    );

    const totalTime = Date.now() - startTime;
    console.log('Q&A processing completed in:', totalTime, 'ms');

    const response: QAResponse = {
      answer, 
      category,
      sources: relevantChunks.length,
      generation_time_ms: totalTime,
      debug: {
        documentsFound: userDocIds.length + sharedDocIds.length,
        userDocuments: userDocIds.length,
        sharedDocuments: sharedDocIds.length,
        chunksFound: allChunks.length,
        relevantChunks: relevantChunks.length,
        userSourceChunks: relevantChunks.filter(c => !c.is_shared).length,
        sharedSourceChunks: relevantChunks.filter(c => c.is_shared).length,
        searchMethod: relevantChunks[0]?.searchMethod || 'none',
        tokensUsed: tokensUsed,
        hasEmbedding: !!questionEmbedding
      }
    };

    // Complete background logging
    EdgeRuntime.waitUntil(logPromise);

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in qa-assistant function:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'An error occurred processing your question'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
