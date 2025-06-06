
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { PaymentProcessor } from './payment-processor.ts';
import { corsHeaders, createErrorResponse, createSuccessResponse } from './utils.ts';

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    let session_id: string | null = null;

    // Try to get session_id from query parameters first
    const url = new URL(req.url);
    session_id = url.searchParams.get('session_id');

    // If not found in query params, try request body
    if (!session_id && req.method === 'POST') {
      try {
        const body = await req.json();
        session_id = body.session_id;
      } catch (error) {
        console.log('No JSON body or failed to parse:', error);
      }
    }

    if (!session_id) {
      console.error('Missing session_id in both query params and body');
      return createErrorResponse('Missing session_id', 400);
    }

    console.log('Processing payment confirmation for session:', session_id);

    const processor = new PaymentProcessor();
    const result = await processor.processPaymentConfirmation(session_id);
    
    return createSuccessResponse(result);

  } catch (err) {
    console.error('Function error:', err);
    const errorMessage = err instanceof Error ? err.message : 'Internal server error';
    return createErrorResponse(errorMessage, 500);
  }
});
