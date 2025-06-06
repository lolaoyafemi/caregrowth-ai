
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { PaymentProcessor } from './payment-processor.ts';
import { corsHeaders, createErrorResponse, createSuccessResponse } from './utils.ts';

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const session_id = url.searchParams.get('session_id');

    if (!session_id) {
      return createErrorResponse('Missing session_id', 400);
    }

    const processor = new PaymentProcessor();
    const result = await processor.processPaymentConfirmation(session_id);
    
    return createSuccessResponse(result);

  } catch (err) {
    console.error('Function error:', err);
    const errorMessage = err instanceof Error ? err.message : 'Internal server error';
    return createErrorResponse(errorMessage);
  }
});
