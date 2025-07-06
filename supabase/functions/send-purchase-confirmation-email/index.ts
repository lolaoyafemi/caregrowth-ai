import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PurchaseEmailRequest {
  email: string;
  name?: string;
  credits: number;
  planName: string;
  amount: number; // in cents
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, name, credits, planName, amount }: PurchaseEmailRequest = await req.json();
    
    console.log('Sending purchase confirmation email to:', email);

    const amountInDollars = (amount / 100).toFixed(2);

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
            subject: amount > 0 ? 'Purchase Confirmation - Credits Added to Your Account!' : 'Free Credits Added to Your Account!'
          }
        ],
        from: {
          email: 'andrew@ghostryt.net',
          name: 'CareGrowthAI Team'
        },
        content: [
          {
            type: 'text/html',
            value: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background: linear-gradient(135deg, #10B981, #059669); padding: 40px 20px; text-align: center; border-radius: 8px 8px 0 0;">
                  <h1 style="color: white; margin: 0; font-size: 28px;">${amount > 0 ? 'Payment Successful! 🎉' : 'Credits Added! 🎉'}</h1>
                  <p style="color: #D1FAE5; margin: 10px 0 0 0; font-size: 16px;">Your credits have been added to your account</p>
                </div>
                
                <div style="background: white; padding: 40px 20px; border-radius: 0 0 8px 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                  <h2 style="color: #1F2937; margin-bottom: 20px;">Hi ${name || 'there'}! 👋</h2>
                  
                   <p style="color: #4B5563; line-height: 1.6; margin-bottom: 20px;">
                     ${amount > 0 ? 
                       'Thank you for your purchase! Your payment has been processed successfully and your credits are now available.' : 
                       'Great news! Your free credits have been added to your account and are now available for use.'
                     }
                   </p>
                  
                  <div style="background: #F0FDF4; border: 2px solid #10B981; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <h3 style="color: #065F46; margin-top: 0; margin-bottom: 15px;">📋 ${amount > 0 ? 'Purchase Details:' : 'Credit Details:'}</h3>
                     <div style="color: #065F46; line-height: 1.8;">
                       <div><strong>Plan:</strong> ${planName}</div>
                       <div><strong>Credits Added:</strong> ${credits.toLocaleString()}</div>
                       ${amount > 0 ? `<div><strong>Amount Paid:</strong> $${amountInDollars}</div>` : `<div><strong>Amount Paid:</strong> Free</div>`}
                     </div>
                  </div>
                  
                  <div style="text-align: center; margin: 30px 0;">
                    <a href="${'https://www.spicymessaging.com'}/dashboard" 
                       style="background: linear-gradient(135deg, #10B981, #059669); color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                      Start Using Your Credits
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

    console.log('Purchase confirmation email sent successfully to:', email);

    return new Response(JSON.stringify({ success: true, message: 'Purchase confirmation email sent' }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    });

  } catch (error: any) {
    console.error('Error sending purchase confirmation email:', error);
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