import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff, Mail, User, Lock, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from "@/hooks/use-toast";
import { useNavigate } from 'react-router-dom';
import ForgotPasswordModal from './ForgotPasswordModal';
import { Badge } from '@/components/ui/badge';

const SIGNIN_METHOD_LABELS: Record<string, { label: string; color: string }> = {
  email: { label: 'Email', color: 'bg-blue-100 text-blue-800 border-blue-200' },
  google: { label: 'Google', color: 'bg-red-100 text-red-800 border-red-200' },
  facebook: { label: 'Facebook', color: 'bg-indigo-100 text-indigo-800 border-indigo-200' },
  twitter: { label: 'X (Twitter)', color: 'bg-gray-100 text-gray-800 border-gray-200' },
  linkedin_oidc: { label: 'LinkedIn', color: 'bg-sky-100 text-sky-800 border-sky-200' },
};

const AuthModal: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<string | null>(null);
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{[key: string]: string}>({});
  const [passwordStrength, setPasswordStrength] = useState<{score: number, text: string, color: string}>({
    score: 0,
    text: '',
    color: ''
  });
  
  const { signInWithEmail, signUpWithEmail, signInWithGoogle, signInWithFacebook, signInWithTwitter, signInWithLinkedIn } = useAuth();
  const navigate = useNavigate();

  const lastMethod = localStorage.getItem('last_signin_method');
  const lastMethodInfo = lastMethod ? SIGNIN_METHOD_LABELS[lastMethod] : null;

  // ... keep existing code (validateEmail, checkPasswordStrength, handleEmailChange, handlePasswordChange, handleNameChange, validateForm, handleSubmit, togglePasswordVisibility, handleForgotPassword, switchMode)
  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const checkPasswordStrength = (password: string) => {
    if (!password) return { score: 0, text: '', color: '' };
    
    let score = 0;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    const strength = {
      0: { text: '', color: '' },
      1: { text: 'Very Weak', color: 'text-red-500' },
      2: { text: 'Weak', color: 'text-orange-500' },
      3: { text: 'Fair', color: 'text-yellow-500' },
      4: { text: 'Good', color: 'text-blue-500' },
      5: { text: 'Strong', color: 'text-green-500' }
    };

    return { score, ...strength[score as keyof typeof strength] };
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setEmail(value);
    if (fieldErrors.email) {
      setFieldErrors(prev => ({ ...prev, email: '' }));
    }
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setPassword(value);
    if (fieldErrors.password) {
      setFieldErrors(prev => ({ ...prev, password: '' }));
    }
    if (!isLogin) {
      setPasswordStrength(checkPasswordStrength(value));
    }
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setName(value);
    if (fieldErrors.name) {
      setFieldErrors(prev => ({ ...prev, name: '' }));
    }
  };

  const validateForm = () => {
    const errors: {[key: string]: string} = {};
    if (!email) {
      errors.email = 'Email is required';
    } else if (!validateEmail(email)) {
      errors.email = 'Please enter a valid email address';
    }
    if (!password) {
      errors.password = 'Password is required';
    } else if (!isLogin && password.length < 6) {
      errors.password = 'Password must be at least 6 characters long';
    }
    if (!isLogin && !name.trim()) {
      errors.name = 'Full name is required';
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setLoading(true);
    try {
      if (isLogin) {
        await signInWithEmail(email, password);
        toast({ title: "Welcome back!", description: "You have successfully signed in." });
        navigate('/dashboard');
      } else {
        await signUpWithEmail(email, password, name);
        toast({ title: "Account created successfully!", description: "Welcome to CareGrowth Assistant. Redirecting to your dashboard..." });
        setTimeout(() => { navigate('/dashboard'); }, 1500);
      }
    } catch (error: any) {
      console.error('Auth error:', error);
      let errorMessage = "An error occurred during authentication";
      if (error.message?.includes('Invalid login credentials')) {
        errorMessage = "Invalid email or password. Please try again.";
      } else if (error.message?.includes('User already registered')) {
        errorMessage = "An account with this email already exists. Try signing in instead.";
      } else if (error.message) {
        errorMessage = error.message;
      }
      toast({ title: "Authentication Error", description: errorMessage, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const togglePasswordVisibility = () => setShowPassword(!showPassword);
  const handleForgotPassword = () => setIsForgotPasswordOpen(true);

  const switchMode = () => {
    setIsLogin(!isLogin);
    setFieldErrors({});
    setPasswordStrength({ score: 0, text: '', color: '' });
    setEmail('');
    setPassword('');
    setName('');
  };

  const handleSocialSignIn = async (provider: string, signInFn: () => Promise<void>) => {
    setSocialLoading(provider);
    try {
      await signInFn();
    } catch (error: any) {
      console.error(`${provider} sign in error:`, error);
      toast({ title: "Sign In Error", description: `Failed to sign in with ${provider}. Please try again.`, variant: "destructive" });
    } finally {
      setSocialLoading(null);
    }
  };

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-blue-100">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-8 text-center">
            <h2 className="text-2xl font-bold text-white mb-2">
              {isLogin ? 'Welcome Back' : 'Create Account'}
            </h2>
            <p className="text-blue-100 text-sm">
              {isLogin ? 'Sign in to access your CareGrowth Assistant dashboard' : 'Get started with CareGrowth Assistant and supercharge your agency'}
            </p>
            {isLogin && lastMethodInfo && (
              <div className="mt-3 flex items-center justify-center gap-2">
                <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${lastMethodInfo.color}`}>
                  <CheckCircle2 size={12} />
                  Last signed in with {lastMethodInfo.label}
                </span>
              </div>
            )}
          </div>

          <div className="px-8 py-8">
            {/* Social sign-in buttons */}
            <div className="space-y-3 mb-6">
              <Button
                type="button"
                variant="outline"
                className="w-full h-11 border-2 border-gray-200 hover:border-gray-300 hover:bg-gray-50 flex items-center justify-center gap-3 font-medium"
                onClick={() => handleSocialSignIn('google', signInWithGoogle)}
                disabled={loading || !!socialLoading}
              >
                {socialLoading === 'google' ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-600"></div>
                ) : (
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                )}
                Continue with Google
                {lastMethod === 'google' && <span className="ml-auto text-[10px] text-green-600 font-semibold">LAST USED</span>}
              </Button>

              <Button
                type="button"
                variant="outline"
                className="w-full h-11 border-2 border-gray-200 hover:border-blue-300 hover:bg-blue-50 flex items-center justify-center gap-3 font-medium"
                onClick={() => handleSocialSignIn('facebook', signInWithFacebook)}
                disabled={loading || !!socialLoading}
              >
                {socialLoading === 'facebook' ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                ) : (
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="#1877F2">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                )}
                Continue with Facebook
                {lastMethod === 'facebook' && <span className="ml-auto text-[10px] text-green-600 font-semibold">LAST USED</span>}
              </Button>

              <Button
                type="button"
                variant="outline"
                className="w-full h-11 border-2 border-gray-200 hover:border-gray-400 hover:bg-gray-50 flex items-center justify-center gap-3 font-medium"
                onClick={() => handleSocialSignIn('twitter', signInWithTwitter)}
                disabled={loading || !!socialLoading}
              >
                {socialLoading === 'twitter' ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-800"></div>
                ) : (
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                  </svg>
                )}
                Continue with X
                {lastMethod === 'twitter' && <span className="ml-auto text-[10px] text-green-600 font-semibold">LAST USED</span>}
              </Button>

              <Button
                type="button"
                variant="outline"
                className="w-full h-11 border-2 border-gray-200 hover:border-sky-300 hover:bg-sky-50 flex items-center justify-center gap-3 font-medium"
                onClick={() => handleSocialSignIn('linkedin', signInWithLinkedIn)}
                disabled={loading || !!socialLoading}
              >
                {socialLoading === 'linkedin' ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-sky-600"></div>
                ) : (
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="#0A66C2">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                  </svg>
                )}
                Continue with LinkedIn
                {lastMethod === 'linkedin_oidc' && <span className="ml-auto text-[10px] text-green-600 font-semibold">LAST USED</span>}
              </Button>
            </div>

            {/* Divider */}
            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-white px-4 text-gray-500">or continue with email</span>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {!isLogin && (
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-gray-700 font-medium">Full Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                    <Input
                      id="name"
                      value={name}
                      onChange={handleNameChange}
                      className={`pl-10 border-2 h-12 ${fieldErrors.name ? 'border-red-500' : 'border-gray-200 focus:border-blue-500'} rounded-lg`}
                      placeholder="Enter your full name"
                      disabled={loading}
                    />
                  </div>
                  {fieldErrors.name && <p className="text-sm text-red-500 mt-1">{fieldErrors.name}</p>}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email" className="text-gray-700 font-medium">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={handleEmailChange}
                    className={`pl-10 border-2 h-12 ${fieldErrors.email ? 'border-red-500' : 'border-gray-200 focus:border-blue-500'} rounded-lg`}
                    placeholder="Enter your email"
                    disabled={loading}
                  />
                </div>
                {fieldErrors.email && <p className="text-sm text-red-500 mt-1">{fieldErrors.email}</p>}
                {lastMethod === 'email' && isLogin && (
                  <p className="text-xs text-green-600 flex items-center gap-1"><CheckCircle2 size={12} /> Last signed in with email</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-gray-700 font-medium">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={handlePasswordChange}
                    className={`pl-10 pr-10 border-2 h-12 ${fieldErrors.password ? 'border-red-500' : 'border-gray-200 focus:border-blue-500'} rounded-lg`}
                    placeholder="Enter your password"
                    disabled={loading}
                  />
                  <button type="button" onClick={togglePasswordVisibility} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600" disabled={loading}>
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
                {fieldErrors.password && <p className="text-sm text-red-500 mt-1">{fieldErrors.password}</p>}
                {!isLogin && password && passwordStrength.text && (
                  <p className={`text-sm mt-1 ${passwordStrength.color}`}>Password strength: {passwordStrength.text}</p>
                )}
              </div>

              {isLogin && (
                <div className="flex justify-end">
                  <button type="button" onClick={handleForgotPassword} className="text-sm text-blue-600 hover:text-blue-800 hover:underline" disabled={loading}>
                    Forgot password?
                  </button>
                </div>
              )}

              <Button 
                type="submit" 
                className="w-full h-12 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-lg shadow-lg"
                disabled={loading || !!socialLoading}
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    {isLogin ? 'Signing In...' : 'Creating Account...'}
                  </div>
                ) : (
                  isLogin ? 'Sign In with Email' : 'Create Account'
                )}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-gray-600 text-sm">
                {isLogin ? "Don't have an account?" : "Already have an account?"}{' '}
                <button type="button" onClick={switchMode} className="text-blue-600 hover:text-blue-800 font-semibold hover:underline" disabled={loading}>
                  {isLogin ? 'Sign up' : 'Sign in'}
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>

      <ForgotPasswordModal 
        isOpen={isForgotPasswordOpen}
        onClose={() => setIsForgotPasswordOpen(false)}
      />
    </>
  );
};

export default AuthModal;
