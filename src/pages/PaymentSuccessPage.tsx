import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const PaymentSuccessPage: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    document.title = 'Payment Successful - CareGrowth Assistant';
    // Auto-redirect to dashboard after a brief delay
    const timer = setTimeout(() => {
      navigate('/dashboard', { replace: true });
    }, 1500);

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50">
      <section className="text-center max-w-md mx-auto px-6">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-caregrowth-blue mx-auto mb-6" />
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">Payment Successful!</h1>
        <p className="text-gray-600 mb-4">Thank you for your purchase. Your credits are being processed.</p>
        <p className="text-sm text-gray-500">Redirecting you to your dashboard…</p>
      </section>
    </main>
  );
};

export default PaymentSuccessPage;