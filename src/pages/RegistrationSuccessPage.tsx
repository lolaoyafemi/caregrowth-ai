import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, Mail, ArrowRight } from 'lucide-react';

const RegistrationSuccessPage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-blue-100">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">Welcome to CareGrowth Assistant!</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 text-center">
          <div className="space-y-3">
            <p className="text-lg font-medium text-gray-800">
              Your registration was successful!
            </p>
            <div className="flex items-center justify-center space-x-2 text-blue-600">
              <Mail className="w-5 h-5" />
              <p className="text-sm">
                Check your email to verify your account
              </p>
            </div>
          </div>
          
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <p className="text-sm text-gray-700">
              We've sent a verification email to your inbox. Please click the link in the email to activate your account and access your dashboard.
            </p>
          </div>
          
          <div className="space-y-3">
            <Button 
              asChild
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-lg shadow-lg h-12"
            >
              <Link 
                to="/login" 
                state={{ fromRegistration: true }}
                className="flex items-center justify-center space-x-2"
              >
                <span>Continue to Sign In</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
            
            <p className="text-xs text-gray-500">
              Didn't receive the email? Check your spam folder or contact support.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RegistrationSuccessPage;