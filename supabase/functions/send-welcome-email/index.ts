import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WelcomeEmailRequest {
  email: string;
  name?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, name }: WelcomeEmailRequest = await req.json();
    
    console.log('Sending welcome email to:', email);

    const sendGridResponse = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('SENDGRID_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [
          {
            to: [{ email, name: name || email.split('@')[0] }],
            subject: 'Welcome to CareGrowthAI!'
          }
        ],
        from: {
          email: 'welcome@caregrowth.ai',
          name: 'CareGrowthAI Team'
        },
        content: [
          {
            type: 'text/html',
            value: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background: linear-gradient(135deg, #3B82F6, #6366F1); padding: 40px 20px; text-align: center; border-radius: 8px 8px 0 0;">
                  <h1 style="color: white; margin: 0; font-size: 28px;">Welcome to CareGrowthAI!</h1>
                  <p style="color: #E0E7FF; margin: 10px 0 0 0; font-size: 16px;">Transform your agency with AI-powered tools</p>
                </div>
                
                <div style="background: white; padding: 40px 20px; border-radius: 0 0 8px 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                  <h2 style="color: #1F2937; margin-bottom: 20px;">Hi ${name || 'there'}! 👋</h2>
                  
                  <p style="color: #4B5563; line-height: 1.6; margin-bottom: 20px;">
                    Thank you for joining CareGrowthAI! We're excited to help you supercharge your agency with our powerful AI tools.
                  </p>
                  
                  <div style="background: #F9FAFB; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <h3 style="color: #1F2937; margin-top: 0;">🚀 Get Started:</h3>
                    <ul style="color: #4B5563; line-height: 1.8;">
                      <li>Complete your business profile</li>
                      <li>Explore our Social Media tools</li>
                      <li>Try the Q&A Assistant</li>
                      <li>Upload documents for smart search</li>
                    </ul>
                  </div>
                  
                  <div style="text-align: center; margin: 30px 0;">
                    <a href="${Deno.env.get('PROJECT_URL') || 'https://your-app.lovable.app'}/dashboard" 
                       style="background: linear-gradient(135deg, #3B82F6, #6366F1); color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                      Access Your Dashboard
                    </a>
                  </div>
                  
                  <p style="color: #6B7280; font-size: 14px; text-align: center; margin-top: 30px;">
                    Need help? Reply to this email or visit our help center.<br>
                    The CareGrowthAI Team
                  </p>
                </div>
              </div>
            `
          }
        ]
      })
    });

    if (!sendGridResponse.ok) {
      const error = await sendGridResponse.text();
      console.error('SendGrid API error:', error);
      throw new Error(`SendGrid API error: ${sendGridResponse.status} - ${error}`);
    }

    console.log('Welcome email sent successfully to:', email);

    return new Response(JSON.stringify({ success: true, message: 'Welcome email sent' }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    });

  } catch (error: any) {
    console.error('Error sending welcome email:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
};

serve(handler);