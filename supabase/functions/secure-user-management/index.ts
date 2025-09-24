import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';
import { rateLimiters, applyRateLimit } from '../security/rate-limiter.ts';
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

// User management schema
const userManagementSchema = securitySchemas.adminAction.extend({
  targetUserId: securitySchemas.uuid.optional(),
  newRole: securitySchemas.userRole.optional(),
  userData: securitySchemas.textContent.optional(),
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

async function validateSuperAdminAccess(req: Request): Promise<{ valid: boolean; userId?: string; response?: Response }> {
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

    // Check if user is super admin
    const { data: isSuperAdmin, error: roleError } = await supabase
      .rpc('is_current_user_super_admin');

    if (roleError || !isSuperAdmin) {
      await logSecurityEvent('unauthorized_admin_access', user.id, {
        endpoint: 'secure-user-management',
        reason: 'Not super admin'
      });
      
      return {
        valid: false,
        response: new Response(
          JSON.stringify({ error: 'Super admin access required' }),
          { status: 403, headers: corsHeaders }
        )
      };
    }

    return { valid: true, userId: user.id };
  } catch (error) {
    console.error('Error validating super admin access:', error);
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

    // Validate super admin access
    const authResult = await validateSuperAdminAccess(req);
    if (!authResult.valid) {
      return authResult.response!;
    }

    // Validate request input
    const validator = validateRequest(userManagementSchema);
    const validationResult = await validator(req);
    
    if (!validationResult.valid) {
      await logSecurityEvent('invalid_user_management_input', authResult.userId!, {
        errors: validationResult.response
      });
      return validationResult.response!;
    }

    const { action, targetUserId, newRole, reason } = validationResult.data;

    // Log the user management attempt
    await logSecurityEvent('user_management_initiated', authResult.userId!, {
      action,
      targetUserId,
      newRole,
      reason
    });

    let result;

    switch (action.toLowerCase()) {
      case 'read':
        // Get user information
        if (targetUserId) {
          const { data: userData, error } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('user_id', targetUserId)
            .single();
          
          if (error) {
            return new Response(
              JSON.stringify({ error: 'User not found' }),
              { status: 404, headers: corsHeaders }
            );
          }
          
          result = { user: userData };
        } else {
          // Get all users
          const { data: allUsers, error } = await supabase
            .from('user_profiles')
            .select('user_id, email, role, business_name, created_at, last_sign_in_at, status')
            .order('created_at', { ascending: false });
          
          if (error) {
            return new Response(
              JSON.stringify({ error: 'Failed to fetch users' }),
              { status: 500, headers: corsHeaders }
            );
          }
          
          result = { users: allUsers };
        }
        break;

      case 'update':
        if (!targetUserId || !newRole) {
          return new Response(
            JSON.stringify({ error: 'targetUserId and newRole required for update' }),
            { status: 400, headers: corsHeaders }
          );
        }

        // Use the secure role assignment function
        const { error: roleError } = await supabase.rpc('assign_user_role', {
          p_user_id: targetUserId,
          p_new_role: newRole,
          p_reason: reason || 'Role updated by super admin'
        });

        if (roleError) {
          await logSecurityEvent('role_assignment_failed', authResult.userId!, {
            targetUserId,
            newRole,
            error: roleError.message
          });
          
          return new Response(
            JSON.stringify({ error: roleError.message }),
            { status: 400, headers: corsHeaders }
          );
        }

        result = { message: 'User role updated successfully', targetUserId, newRole };
        break;

      case 'delete':
        // Soft delete - deactivate user instead of hard delete
        if (!targetUserId) {
          return new Response(
            JSON.stringify({ error: 'targetUserId required for delete' }),
            { status: 400, headers: corsHeaders }
          );
        }

        const { error: deleteError } = await supabase
          .from('user_profiles')
          .update({ 
            status: 'deactivated',
            updated_at: new Date().toISOString()
          })
          .eq('user_id', targetUserId);

        if (deleteError) {
          return new Response(
            JSON.stringify({ error: 'Failed to deactivate user' }),
            { status: 500, headers: corsHeaders }
          );
        }

        result = { message: 'User deactivated successfully', targetUserId };
        break;

      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action. Supported: read, update, delete' }),
          { status: 400, headers: corsHeaders }
        );
    }

    // Log successful operation
    await logSecurityEvent('user_management_completed', authResult.userId!, {
      action,
      targetUserId,
      newRole,
      success: true
    });

    // Use admin action logging
    await supabase.rpc('log_admin_action', {
      p_action: `user_${action}`,
      p_resource_type: 'user',
      p_resource_id: targetUserId,
      p_new_values: { action, newRole, reason }
    });

    return new Response(
      JSON.stringify({ success: true, ...result }),
      { status: 200, headers: corsHeaders }
    );

  } catch (error) {
    console.error('Secure user management error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: 'User management operation failed'
      }),
      { status: 500, headers: corsHeaders }
    );
  }
});