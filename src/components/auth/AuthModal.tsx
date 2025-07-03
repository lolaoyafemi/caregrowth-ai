
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff, Mail, User, Lock, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from "@/hooks/use-toast";
import ForgotPasswordModal from './ForgotPasswordModal';

const AuthModal: React.FC = () => {
  const [isLogin, setIsLogin] = useState(false); // Default to signup
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{[key: string]: string}>({});
  const [passwordStrength, setPasswordStrength] = useState<{score: number, text: string, color: string}>({
    score: 0,
    text: '',
    color: ''
  });
  
  const { signInWithEmail, signUpWithEmail } = useAuth();

  // Real-time email validation
  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Real-time password strength checker
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
    
    // Clear email error when user starts typing
    if (fieldErrors.email) {
      setFieldErrors(prev => ({ ...prev, email: '' }));
    }
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setPassword(value);
    
    // Clear password error when user starts typing
    if (fieldErrors.password) {
      setFieldErrors(prev => ({ ...prev, password: '' }));
    }

    // Update password strength for signup
    if (!isLogin) {
      setPasswordStrength(checkPasswordStrength(value));
    }
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setName(value);
    
    // Clear name error when user starts typing
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
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      if (isLogin) {
        await signInWithEmail(email, password);
        toast({
          title: "Welcome back!",
          description: "You have successfully signed in.",
        });
      } else {
        await signUpWithEmail(email, password, name);
        toast({
          title: "Account created!",
          description: "Please check your email to verify your account.",
        });
      }
    } catch (error: any) {
      console.error('Auth error:', error);
      
      // Handle specific error messages
      let errorMessage = "An error occurred during authentication";
      if (error.message?.includes('Invalid login credentials')) {
        errorMessage = "Invalid email or password. Please try again.";
      } else if (error.message?.includes('User already registered')) {
        errorMessage = "An account with this email already exists. Try signing in instead.";
      } else if (error.message) {
        errorMessage = error.message;
      }

      toast({
        title: "Authentication Error",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const handleForgotPassword = () => {
    setIsForgotPasswordOpen(true);
  };

  const switchMode = () => {
    setIsLogin(!isLogin);
    setFieldErrors({});
    setPasswordStrength({ score: 0, text: '', color: '' });
    setEmail('');
    setPassword('');
    setName('');
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden">
          <div className="bg-gradient-to-r from-caregrowth-blue to-blue-700 p-8 text-white">
            <h2 className="text-2xl font-bold mb-3">
              {isLogin ? 'Welcome Back' : 'Create Your Account'}
            </h2>
            <p className="text-blue-100 leading-relaxed">
              {isLogin
                ? 'Sign in to access your CareGrowthAI dashboard'
                : 'Get started with CareGrowthAI and supercharge your agency'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="p-8 space-y-6">
            {!isLogin && (
              <div className="space-y-3">
                <Label htmlFor="name" className="block text-sm font-medium text-gray-700">
                  Full Name *
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                  <Input
                    id="name"
                    value={name}
                    onChange={handleNameChange}
                    className={`pl-10 ${fieldErrors.name ? 'border-red-500 focus:border-red-500' : 'focus:border-caregrowth-blue'}`}
                    placeholder="Enter your full name"
                    disabled={loading}
                    aria-invalid={!!fieldErrors.name}
                    aria-describedby={fieldErrors.name ? "name-error" : undefined}
                  />
                  {fieldErrors.name && (
                    <AlertCircle className="absolute right-3 top-1/2 transform -translate-y-1/2 text-red-500" size={18} />
                  )}
                </div>
                {fieldErrors.name && (
                  <p id="name-error" className="text-sm text-red-500 flex items-center mt-2">
                    <AlertCircle size={14} className="mr-1" />
                    {fieldErrors.name}
                  </p>
                )}
              </div>
            )}

            <div className="space-y-3">
              <Label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email Address *
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={handleEmailChange}
                  className={`pl-10 ${fieldErrors.email ? 'border-red-500 focus:border-red-500' : 'focus:border-caregrowth-blue'}`}
                  placeholder="Enter your email address"
                  disabled={loading}
                  aria-invalid={!!fieldErrors.email}
                  aria-describedby={fieldErrors.email ? "email-error" : undefined}
                />
                {email && !fieldErrors.email && validateEmail(email) && (
                  <CheckCircle2 className="absolute right-3 top-1/2 transform -translate-y-1/2 text-green-500" size={18} />
                )}
                {fieldErrors.email && (
                  <AlertCircle className="absolute right-3 top-1/2 transform -translate-y-1/2 text-red-500" size={18} />
                )}
              </div>
              {fieldErrors.email && (
                <p id="email-error" className="text-sm text-red-500 flex items-center mt-2">
                  <AlertCircle size={14} className="mr-1" />
                  {fieldErrors.email}
                </p>
              )}
            </div>

            <div className="space-y-3">
              <Label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password *
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={handlePasswordChange}
                  className={`pl-10 pr-10 ${fieldErrors.password ? 'border-red-500 focus:border-red-500' : 'focus:border-caregrowth-blue'}`}
                  placeholder={isLogin ? "Enter your password" : "Create a secure password"}
                  disabled={loading}
                  aria-invalid={!!fieldErrors.password}
                  aria-describedby={fieldErrors.password ? "password-error" : (!isLogin && passwordStrength.text ? "password-strength" : undefined)}
                />
                <button
                  type="button"
                  onClick={togglePasswordVisibility}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  disabled={loading}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {fieldErrors.password && (
                <p id="password-error" className="text-sm text-red-500 flex items-center mt-2">
                  <AlertCircle size={14} className="mr-1" />
                  {fieldErrors.password}
                </p>
              )}
              {!isLogin && password && passwordStrength.text && (
                <p id="password-strength" className={`text-sm ${passwordStrength.color} mt-2`}>
                  Password strength: {passwordStrength.text}
                </p>
              )}
              {!isLogin && (
                <p className="text-xs text-gray-500 mt-2 leading-relaxed">
                  Use 8+ characters with a mix of letters, numbers & symbols
                </p>
              )}
            </div>

            {isLogin && (
              <div className="text-right">
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="text-sm text-caregrowth-blue hover:underline transition-colors"
                  disabled={loading}
                >
                  Forgot password?
                </button>
              </div>
            )}

            <Button 
              type="submit" 
              className="w-3/4 mx-auto block bg-caregrowth-blue hover:bg-blue-700 transition-all duration-200 h-12 text-base font-medium"
              disabled={loading}
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  {isLogin ? 'Signing In...' : 'Creating Account...'}
                </div>
              ) : (
                isLogin ? 'Sign In' : 'Create Account'
              )}
            </Button>

            <div className="relative my-8">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white text-gray-500">
                  {isLogin ? "Don't have an account?" : "Already have an account?"}
                </span>
              </div>
            </div>

            <div className="text-center">
              <button
                type="button"
                onClick={switchMode}
                className="text-caregrowth-blue hover:underline font-medium transition-colors text-base inline-block px-6 py-2"
                disabled={loading}
              >
                {isLogin ? 'Create Account' : 'Sign In'}
              </button>
            </div>
          </form>
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
