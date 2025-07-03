import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff, Mail, User, Lock, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from "@/hooks/use-toast";
import ForgotPasswordModal from './ForgotPasswordModal';

const AuthModal: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true); // Start with login
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
        <div className="bg-white rounded-lg shadow-xl w-full max-w-sm overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-caregrowth-blue to-blue-700 p-6 text-white text-center">
            <h2 className="text-xl font-bold mb-2">Login Form</h2>
          </div>

          {/* Tab-style toggle */}
          <div className="flex bg-gray-50 border-b">
            <button
              type="button"
              onClick={switchMode}
              className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
                isLogin 
                  ? 'bg-caregrowth-blue text-white' 
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
              }`}
              disabled={loading}
            >
              Login
            </button>
            <button
              type="button"
              onClick={switchMode}
              className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
                !isLogin 
                  ? 'bg-caregrowth-blue text-white' 
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
              }`}
              disabled={loading}
            >
              Signup
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {!isLogin && (
              <div className="space-y-2">
                <Input
                  id="name"
                  value={name}
                  onChange={handleNameChange}
                  className={`${fieldErrors.name ? 'border-red-500' : ''}`}
                  placeholder="Full Name"
                  disabled={loading}
                />
                {fieldErrors.name && (
                  <p className="text-xs text-red-500">{fieldErrors.name}</p>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Input
                id="email"
                type="email"
                value={email}
                onChange={handleEmailChange}
                className={`${fieldErrors.email ? 'border-red-500' : ''}`}
                placeholder="Email Address"
                disabled={loading}
              />
              {fieldErrors.email && (
                <p className="text-xs text-red-500">{fieldErrors.email}</p>
              )}
            </div>

            <div className="space-y-2">
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={handlePasswordChange}
                  className={`pr-10 ${fieldErrors.password ? 'border-red-500' : ''}`}
                  placeholder="Password"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={togglePasswordVisibility}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  disabled={loading}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {fieldErrors.password && (
                <p className="text-xs text-red-500">{fieldErrors.password}</p>
              )}
              {!isLogin && password && passwordStrength.text && (
                <p className={`text-xs ${passwordStrength.color}`}>
                  Password strength: {passwordStrength.text}
                </p>
              )}
            </div>

            {isLogin && (
              <div className="text-left">
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="text-xs text-caregrowth-blue hover:underline"
                  disabled={loading}
                >
                  Forgot password?
                </button>
              </div>
            )}

            <Button 
              type="submit" 
              className="w-full bg-caregrowth-blue hover:bg-blue-700 text-white font-medium"
              disabled={loading}
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  {isLogin ? 'Signing In...' : 'Creating Account...'}
                </div>
              ) : (
                isLogin ? 'Login' : 'Create Account'
              )}
            </Button>

            <div className="text-center text-xs text-gray-600">
              {isLogin ? "Not a member?" : "Already have an account?"}{' '}
              <button
                type="button"
                onClick={switchMode}
                className="text-caregrowth-blue hover:underline font-medium"
                disabled={loading}
              >
                {isLogin ? 'Signup now' : 'Login'}
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
