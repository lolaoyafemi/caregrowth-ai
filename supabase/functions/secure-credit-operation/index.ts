import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';
import { RateLimiter, rateLimiters, applyRateLimit } from '../security/rate-limiter.ts';
import { InputValidator, securitySchemas, validateRequest } from '../security/input-validator.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin'
};

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Credit operation schema
const creditOperationSchema = securitySchemas.adminAction.extend({
  userId: securitySchemas.uuid,
  credits: securitySchemas.credits,
  operation: z.string().max(50),
  reason: z.string().max(500).optional()
});

async function logSecurityEvent(eventType: string, userId: string, details: any) {
  try {
    await supabase.from('security_events').insert({
      user_id: userId,
      event_type: eventType,
      event_data: details
    });
  } catch (error) {
    console.error('Failed to log security event:', error);
  }
}

async function validateAdminAccess(req: Request): Promise<{ valid: boolean; userId?: string; role?: string; response?: Response }> {
  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return {
      valid: false,
      response: new Response(
        JSON.stringify({ error: 'Missing or invalid authorization header' }),
        { status: 401, headers: corsHeaders }
      )
    };
  }

  const token = authHeader.replace('Bearer ', '');
  
  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return {
        valid: false,
        response: new Response(
          JSON.stringify({ error: 'Invalid or expired token' }),
          { status: 401, headers: corsHeaders }
        )
      };
    }

    // Check user role
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile) {
      await logSecurityEvent('unauthorized_access_attempt', user.id, {
        reason: 'No profile found',
        endpoint: 'secure-credit-operation'
      });
      
      return {
        valid: false,
        response: new Response(
          JSON.stringify({ error: 'User profile not found' }),
          { status: 403, headers: corsHeaders }
        )
      };
    }

    // Only super admins and agency admins can perform credit operations
    if (!['super_admin', 'agency_admin'].includes(profile.role)) {
      await logSecurityEvent('unauthorized_access_attempt', user.id, {
        reason: 'Insufficient privileges',
        role: profile.role,
        endpoint: 'secure-credit-operation'
      });
      
      return {
        valid: false,
        response: new Response(
          JSON.stringify({ error: 'Insufficient privileges for credit operations' }),
          { status: 403, headers: corsHeaders }
        )
      };
    }

    return { valid: true, userId: user.id, role: profile.role };
  } catch (error) {
    console.error('Error validating admin access:', error);
    return {
      valid: false,
      response: new Response(
        JSON.stringify({ error: 'Authentication error' }),
        { status: 500, headers: corsHeaders }
      )
    };
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Apply rate limiting
    const rateLimitResult = await applyRateLimit(req, rateLimiters.admin);
    if (!rateLimitResult.success) {
      return (rateLimitResult as any).response;
    }

    // Validate authentication and authorization
    const authResult = await validateAdminAccess(req);
    if (!authResult.valid) {
      return authResult.response!;
    }

    // Validate request input
    const validator = validateRequest(creditOperationSchema);
    const validationResult = await validator(req);
    
    if (!validationResult.valid) {
      await logSecurityEvent('invalid_input_attempt', authResult.userId!, {
        endpoint: 'secure-credit-operation',
        errors: validationResult.response
      });
      return validationResult.response!;
    }

    const { userId, credits, operation, reason } = validationResult.data;

    // Log the credit operation attempt
    await logSecurityEvent('credit_operation_initiated', authResult.userId!, {
      targetUserId: userId,
      credits,
      operation,
      reason,
      adminRole: authResult.role
    });

    // Perform the credit operation based on operation type
    let result;
    switch (operation.toLowerCase()) {
      case 'add':
        result = await supabase.rpc('deduct_credits_and_log', {
          p_user_id: userId,
          p_tool: 'admin_credit_adjustment',
          p_credits_used: -credits, // Negative to add credits
          p_description: reason || 'Admin credit addition'
        });
        break;
        
      case 'deduct':
        result = await supabase.rpc('deduct_credits_and_log', {
          p_user_id: userId,
          p_tool: 'admin_credit_adjustment',
          p_credits_used: credits,
          p_description: reason || 'Admin credit deduction'
        });
        break;
        
      default:
        await logSecurityEvent('invalid_operation_attempt', authResult.userId!, {
          operation,
          targetUserId: userId
        });
        
        return new Response(
          JSON.stringify({ error: 'Invalid operation. Supported: add, deduct' }),
          { status: 400, headers: corsHeaders }
        );
    }

    if (result.error) {
      await logSecurityEvent('credit_operation_failed', authResult.userId!, {
        targetUserId: userId,
        operation,
        error: result.error.message
      });
      
      return new Response(
        JSON.stringify({ error: result.error.message }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Log successful operation
    await logSecurityEvent('credit_operation_completed', authResult.userId!, {
      targetUserId: userId,
      credits,
      operation,
      result: result.data
    });

    // Use admin action logging function
    await supabase.rpc('log_admin_action', {
      p_action: `credit_${operation}`,
      p_resource_type: 'credit',
      p_resource_id: userId,
      p_new_values: { credits, operation, reason }
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Successfully ${operation}ed ${credits} credits`,
        result: result.data 
      }),
      { status: 200, headers: corsHeaders }
    );

  } catch (error) {
    console.error('Secure credit operation error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: 'Credit operation failed due to server error'
      }),
      { status: 500, headers: corsHeaders }
    );
  }
});