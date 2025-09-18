import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const PaymentComplete: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    document.title = 'Payment Complete - Redirecting to Dashboard';
    const t = setTimeout(() => navigate('/dashboard', { replace: true }), 1200);
    return () => clearTimeout(t);
  }, [navigate]);

  return (
    <main className="min-h-screen flex items-center justify-center">
      <section className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-caregrowth-blue mx-auto mb-4" />
        <h1 className="text-xl font-semibold mb-1">Payment successful</h1>
        <p className="text-muted-foreground">Taking you to your dashboard…</p>
      </section>
    </main>
  );
};

export default PaymentComplete;
