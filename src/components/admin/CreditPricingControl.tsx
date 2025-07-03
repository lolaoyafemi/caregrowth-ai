
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

interface CreditPricing {
  id: string;
  price_per_credit: number;
  last_updated: string;
}

const CreditPricingControl = () => {
  const [creditPricing, setCreditPricing] = useState<CreditPricing | null>(null);
  const [newPricePerCredit, setNewPricePerCredit] = useState(0);

  useEffect(() => {
    fetchCreditPricing();
  }, []);

  const fetchCreditPricing = async () => {
    let { data, error } = await supabase
      .from('credit_pricing')
      .select('*')
      .single();

    if (error && error.code === 'PGRST116') {
      // No record exists, create one with default pricing
      const { data: newPricing, error: createError } = await supabase
        .from('credit_pricing')
        .insert({
          price_per_credit: 0.01
        })
        .select()
        .single();

      if (createError) {
        console.error('Error creating credit pricing:', createError);
        return;
      }
      data = newPricing;
    } else if (error) {
      console.error('Error fetching credit pricing:', error);
      return;
    }

    setCreditPricing(data);
    setNewPricePerCredit(data?.price_per_credit || 0);
  };

  const updateCreditPricing = async () => {
    if (!creditPricing) return;

    const { error } = await supabase
      .from('credit_pricing')
      .update({ 
        price_per_credit: newPricePerCredit,
        last_updated: new Date().toISOString()
      })
      .eq('id', creditPricing.id);

    if (error) {
      console.error('Error updating credit pricing:', error);
      toast.error('Failed to update credit pricing');
      return;
    }

    toast.success('Credit pricing updated successfully');
    fetchCreditPricing();
  };

  return (
    <Card className="border-green-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-green-800">
          🏷️ Credit Pricing Control
        </CardTitle>
        <CardDescription>
          Set and manage credit pricing for the platform
        </CardDescription>
      </CardHeader>
      <CardContent>
        {creditPricing && (
          <div className="space-y-6">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-gray-700">Current Price Per Credit</h3>
              <p className="text-2xl font-bold text-gray-900">
                ${creditPricing.price_per_credit.toFixed(4)} USD
              </p>
              <p className="text-sm text-gray-500">
                Last updated: {new Date(creditPricing.last_updated).toLocaleString()}
              </p>
            </div>

            <div className="flex gap-4 items-end">
              <div className="flex-1">
                <Label htmlFor="pricePerCredit">New Price Per Credit (USD)</Label>
                <Input
                  id="pricePerCredit"
                  type="number"
                  step="0.0001"
                  value={newPricePerCredit}
                  onChange={(e) => setNewPricePerCredit(parseFloat(e.target.value) || 0)}
                />
              </div>
              <Button onClick={updateCreditPricing} className="bg-green-600 hover:bg-green-700">
                Update Pricing
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CreditPricingControl;
