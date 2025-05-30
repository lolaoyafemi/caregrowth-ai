
import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { CheckCircle, CreditCard, ArrowRight, User } from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const PaymentSuccessPage = () => {
  const [searchParams] = useSearchParams();
  const [isProcessing, setIsProcessing] = useState(true);
  const [showSignup, setShowSignup] = useState(false);
  const [paymentData, setPaymentData] = useState<any>(null);
  const [formData, setFormData] = useState({
    fullName: '',
    password: '',
    confirmPassword: ''
  });
  const { signUpWithEmail } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const processPayment = async () => {
      try {
        const sessionId = searchParams.get('session_id');
        console.log('Processing payment success with session ID:', sessionId);
        
        if (!sessionId) {
          console.log('No session ID found, redirecting to home');
          navigate('/');
          return;
        }

        // Get payment data from Supabase using session ID
        const { data: payment, error } = await supabase
          .from('payments')
          .select('*')
          .eq('stripe_session_id', sessionId)
          .single();

        if (error) {
          console.error('Error fetching payment:', error);
          toast({
            title: "Payment Error",
            description: "Could not find payment information. Please contact support.",
            variant: "destructive"
          });
          return;
        }

        console.log('Payment data found:', payment);
        setPaymentData(payment);

        // Check if user already exists
        const { data: userData, error: userListError } = await supabase.auth.admin.listUsers();
        
        if (userListError) {
          console.error('Error fetching users:', userListError);
          // If we can't check users, assume new user and show signup
          setShowSignup(true);
          toast({
            title: "Payment Successful!",
            description: "Please create your account to access your credits.",
          });
          return;
        }

        const existingUser = userData.users.find((u: any) => u.email === payment.email);

        if (existingUser) {
          // User exists, redirect to login
          toast({
            title: "Payment Successful!",
            description: "Please log in to access your credits.",
          });
          navigate('/login');
        } else {
          // User doesn't exist, show signup form
          setShowSignup(true);
          toast({
            title: "Payment Successful!",
            description: "Please create your account to access your credits.",
          });
        }

      } catch (error) {
        console.error('Error processing payment:', error);
        toast({
          title: "Processing Error",
          description: "There was an issue processing your payment. Please contact support.",
          variant: "destructive"
        });
      } finally {
        setIsProcessing(false);
      }
    };

    processPayment();
  }, [searchParams, navigate, toast]);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!paymentData?.email) {
      toast({
        title: "Email Missing",
        description: "Email information is missing. Please contact support.",
        variant: "destructive"
      });
      return;
    }
    
    if (formData.password !== formData.confirmPassword) {
      toast({
        title: "Password Mismatch",
        description: "Passwords do not match. Please try again.",
        variant: "destructive"
      });
      return;
    }

    if (formData.password.length < 6) {
      toast({
        title: "Password Too Short",
        description: "Password must be at least 6 characters long.",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsProcessing(true);
      
      console.log('Creating account for:', paymentData.email);
      await signUpWithEmail(paymentData.email, formData.password, formData.fullName);
      
      // After successful signup, allocate the credits
      // The handle_new_user trigger will create the user record
      // We need to update it with the purchased credits
      setTimeout(async () => {
        try {
          const { error: creditError } = await supabase
            .from('users')
            .update({ 
              credits: paymentData.credits_granted + 100, // 100 default + purchased credits
              plan: paymentData.plan_name.toLowerCase()
            })
            .eq('email', paymentData.email);

          if (creditError) {
            console.error('Error allocating credits:', creditError);
          }

          // Update payment record with user_id
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            await supabase
              .from('payments')
              .update({ user_id: user.id })
              .eq('stripe_session_id', paymentData.stripe_session_id);
          }
        } catch (error) {
          console.error('Error in post-signup credit allocation:', error);
        }
      }, 2000); // Wait 2 seconds for user creation to complete
      
      toast({
        title: "Account Created!",
        description: "Your account has been created successfully. You can now access your dashboard.",
      });

      // Redirect to dashboard after a short delay
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);

    } catch (error: any) {
      console.error('Signup error:', error);
      toast({
        title: "Account Creation Error",
        description: error.message || "Failed to create account. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  if (isProcessing && !showSignup) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        <Header />
        <main className="flex-grow flex items-center justify-center">
          <Card className="w-full max-w-md mx-4">
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-caregrowth-blue mx-auto mb-4"></div>
                <h2 className="text-xl font-semibold mb-2">Processing Your Payment</h2>
                <p className="text-gray-600">Please wait while we confirm your payment...</p>
              </div>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      
      <main className="flex-grow py-20">
        <div className="container mx-auto px-4 max-w-2xl">
          <div className="text-center mb-8">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-4">Payment Successful!</h1>
            <p className="text-xl text-gray-600">
              {showSignup 
                ? "Thank you for your purchase. Complete your account setup to access your credits." 
                : "Thank you for your purchase. Please log in to access your credits."
              }
            </p>
          </div>

          {/* Purchase Summary */}
          {paymentData && (
            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <CreditCard className="w-5 h-5 mr-2" />
                  Purchase Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Credits Purchased:</span>
                    <span className="font-bold text-2xl text-caregrowth-blue">
                      {paymentData.credits_granted}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Plan:</span>
                    <span className="font-medium capitalize">{paymentData.plan_name}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Amount Paid:</span>
                    <span className="font-medium">${(paymentData.amount / 100).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Status:</span>
                    <span className="text-green-600 font-medium">Completed</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Account Creation Form */}
          {showSignup && paymentData && (
            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <User className="w-5 h-5 mr-2" />
                  Create Your Account
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSignup} className="space-y-4">
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                      Email Address
                    </label>
                    <Input
                      id="email"
                      type="email"
                      value={paymentData.email}
                      disabled
                      className="bg-gray-50"
                    />
                  </div>

                  <div>
                    <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1">
                      Full Name
                    </label>
                    <Input
                      id="fullName"
                      type="text"
                      value={formData.fullName}
                      onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                      placeholder="Enter your full name"
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                      Password
                    </label>
                    <Input
                      id="password"
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({...formData, password: e.target.value})}
                      placeholder="Create a password (min 6 characters)"
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                      Confirm Password
                    </label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                      placeholder="Confirm your password"
                      required
                    />
                  </div>

                  <Button 
                    type="submit"
                    disabled={isProcessing}
                    className="w-full bg-caregrowth-blue hover:bg-blue-700 text-white py-3"
                  >
                    {isProcessing ? (
                      <div className="flex items-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Creating Account...
                      </div>
                    ) : (
                      <>
                        Create Account & Access Dashboard
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}

          <div className="text-center mt-8">
            <p className="text-gray-600">
              Need help? <a href="/help" className="text-caregrowth-blue hover:underline">Contact our support team</a>
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default PaymentSuccessPage;
