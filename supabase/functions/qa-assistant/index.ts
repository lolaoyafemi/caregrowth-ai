
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
    console.log('Starting Q&A assistant request processing...');
    
    const requestBody = await req.json();
    console.log('Request received:', { 
      hasQuestion: !!requestBody.question,
      hasUserId: !!requestBody.userId,
      questionLength: requestBody.question?.length || 0
    });
    
    const { question, userId } = requestBody;
    
    if (!question || !userId) {
      console.error('Missing required fields:', { question: !!question, userId: !!userId });
      return new Response(JSON.stringify({ 
        error: 'Question and userId are required' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!openAIApiKey) {
      console.error('OpenAI API key not configured');
      return new Response(JSON.stringify({ 
        error: 'OpenAI API key not configured. Please contact support.' 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Processing question for user:', userId);

    // Initialize services
    const embeddingService = new EmbeddingService(openAIApiKey);
    const searchService = new SearchService();
    const answerGenerator = new AnswerGenerator(openAIApiKey);
    const databaseService = new DatabaseService();

    // Step 1: Get recent conversation history for context
    console.log('Fetching conversation history...');
    const conversationHistory = await databaseService.getRecentConversationHistory(userId, 5);
    console.log('Retrieved conversation history:', conversationHistory.length, 'messages');

    // Step 2: Generate embedding for the question
    console.log('Generating embedding for question...');
    const questionEmbedding = await embeddingService.generateEmbedding(question);

    // Step 3: Get user's documents and chunks
    console.log('Fetching user documents and chunks...');
    const userDocs = await databaseService.getUserDocuments(userId);
    const userDocIds = userDocs.map(doc => doc.id);
    console.log('Found user documents:', userDocIds.length);

    // Step 4: Get shared documents and chunks
    console.log('Fetching shared documents and chunks...');
    const sharedDocs = await databaseService.getSharedDocuments();
    const sharedDocIds = sharedDocs.map(doc => doc.id);
    console.log('Found shared documents:', sharedDocIds.length);

    let relevantChunks: any[] = [];
    let allChunks: any[] = [];

    // Get user document chunks
    if (userDocIds.length > 0) {
      const userChunks = await databaseService.getDocumentChunks(userDocIds);
      allChunks = [...allChunks, ...userChunks];
      console.log('Retrieved user chunks:', userChunks.length);
    }

    // Get shared document chunks
    const sharedChunks = await databaseService.getSharedDocumentChunks();
    allChunks = [...allChunks, ...sharedChunks];
    console.log('Retrieved shared chunks:', sharedChunks.length);

    console.log('Total chunks available:', {
      totalChunks: allChunks.length,
      userChunks: allChunks.filter(c => !c.is_shared).length,
      sharedChunks: allChunks.filter(c => c.is_shared).length,
      chunksWithEmbeddings: allChunks.filter(c => c.embedding).length,
      averageContentLength: allChunks.length > 0 
        ? Math.round(allChunks.reduce((sum, c) => sum + (c.content?.length || 0), 0) / allChunks.length)
        : 0
    });

    if (allChunks.length > 0) {
      // Find relevant chunks using enhanced search
      relevantChunks = await searchService.findRelevantChunks(questionEmbedding, allChunks, question);
      console.log(`Selected ${relevantChunks.length} relevant chunks from ${allChunks.length} total`);
      
      // Log source breakdown
      const userSourceChunks = relevantChunks.filter(c => !c.is_shared).length;
      const sharedSourceChunks = relevantChunks.filter(c => c.is_shared).length;
      console.log(`Source breakdown: ${userSourceChunks} user chunks, ${sharedSourceChunks} shared chunks`);
    }

    // Step 5: Generate answer using enhanced context with conversation history
    console.log('Generating enhanced answer with conversation context...');
    let answer = "I apologize, but I'm having trouble generating a response right now. Please try again in a moment.";
    let tokensUsed = 0;

    try {
      const result = await answerGenerator.generateContextualAnswer(question, relevantChunks, conversationHistory);
      answer = result.answer;
      tokensUsed = result.tokensUsed || 0;
      console.log('Successfully generated answer with conversation context, tokens used:', tokensUsed);
    } catch (error) {
      console.error('Error generating answer:', error);
    }

    // Step 6: Categorize the response
    console.log('Categorizing the response...');
    const category = await answerGenerator.categorizeResponse(question, answer);

    // Step 7: Log the Q&A interaction
    await databaseService.logQAInteraction(
      userId, 
      question, 
      answer, 
      category, 
      relevantChunks.map(chunk => chunk.document_id) || []
    );

    console.log('Q&A processing completed successfully');

    const response: QAResponse = {
      answer, 
      category,
      sources: relevantChunks.length,
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
