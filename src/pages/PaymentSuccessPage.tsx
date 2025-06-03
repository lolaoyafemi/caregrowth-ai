
import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { useToast } from '@/hooks/use-toast';

const PaymentSuccessPage = () => {
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [confirmed, setConfirmed] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const confirmPayment = async () => {
      const sessionId = searchParams.get("session_id");

      if (!sessionId) {
        toast({
          title: "Missing session",
          description: "No session ID found. Please contact support.",
          variant: "destructive"
        });
        navigate("/");
        return;
      }

      setLoading(true);

      try {
        const response = await fetch(`/api/confirm-payment?session_id=${sessionId}`);
        const result = await response.json();

        if (response.ok) {
          toast({
            title: "Payment Confirmed",
            description: "Your credits have been added!",
          });
          setConfirmed(true);
        } else {
          throw new Error(result.error || "Could not confirm payment");
        }
      } catch (error) {
        console.error("Payment confirmation error:", error);
        toast({
          title: "Error",
          description: "Something went wrong confirming your payment.",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    confirmPayment();
  }, [searchParams, navigate, toast]);

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      <main className="flex-grow flex items-center justify-center">
        <Card className="w-full max-w-md mx-4 mt-12">
          <CardHeader>
            <CardTitle>Payment Status</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            {loading && <p>Processing your payment...</p>}
            {!loading && confirmed && (
              <>
                <p className="text-green-600 font-semibold">✅ Payment confirmed!</p>
                <Button onClick={() => navigate('/dashboard')}>Go to your dashboard</Button>
              </>
            )}
            {!loading && !confirmed && (
              <p className="text-red-600 font-semibold">❌ Payment could not be verified.</p>
            )}
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
};

export default PaymentSuccessPage;
