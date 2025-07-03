
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Package } from 'lucide-react';
import { toast } from 'sonner';

interface CreditInventory {
  id: string;
  total_purchased: number;
  sold_to_agencies: number;
  available_balance: number;
  updated_at: string;
}

const CreditInventoryManager = () => {
  const [creditInventory, setCreditInventory] = useState<CreditInventory | null>(null);
  const [totalPurchased, setTotalPurchased] = useState(0);

  useEffect(() => {
    fetchCreditInventory();
    
    // Set up real-time subscription for credit inventory updates
    const channel = supabase
      .channel('credit-inventory-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'credit_inventory'
        },
        (payload) => {
          console.log('Credit inventory update received:', payload);
          fetchCreditInventory();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'credit_sales_log'
        },
        (payload) => {
          console.log('Credit sales update received:', payload);
          fetchCreditInventory(); // Refresh to recalculate sold_to_agencies
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchCreditInventory = async () => {
    try {
      // Fetch or create credit inventory record
      let { data: inventory, error } = await supabase
        .from('credit_inventory')
        .select('*')
        .single();

      if (error && error.code === 'PGRST116') {
        // No record exists, create one
        const { data: newInventory, error: createError } = await supabase
          .from('credit_inventory')
          .insert({
            total_purchased: 0,
            sold_to_agencies: 0,
            available_balance: 0
          })
          .select()
          .single();

        if (createError) {
          console.error('Error creating credit inventory:', createError);
          return;
        }
        inventory = newInventory;
      } else if (error) {
        console.error('Error fetching credit inventory:', error);
        return;
      }

      // Calculate sold_to_agencies from credit_sales_log
      const { data: salesData, error: salesError } = await supabase
        .from('credit_sales_log')
        .select('credits_purchased');

      if (salesError) {
        console.error('Error fetching sales data:', salesError);
      } else {
        const totalSold = salesData?.reduce((sum, sale) => sum + sale.credits_purchased, 0) || 0;
        
        // Update the inventory record with calculated values
        const availableBalance = inventory.total_purchased - totalSold;
        
        const { data: updatedInventory, error: updateError } = await supabase
          .from('credit_inventory')
          .update({
            sold_to_agencies: totalSold,
            available_balance: availableBalance
          })
          .eq('id', inventory.id)
          .select()
          .single();

        if (updateError) {
          console.error('Error updating inventory calculations:', updateError);
        } else {
          inventory = updatedInventory;
        }
      }

      setCreditInventory(inventory);
      setTotalPurchased(inventory?.total_purchased || 0);
    } catch (error) {
      console.error('Error in fetchCreditInventory:', error);
    }
  };

  const updateCreditInventory = async () => {
    if (!creditInventory) return;

    try {
      // Recalculate sold_to_agencies from current sales data
      const { data: salesData, error: salesError } = await supabase
        .from('credit_sales_log')
        .select('credits_purchased');

      if (salesError) {
        console.error('Error fetching sales data:', salesError);
        toast.error('Failed to fetch sales data');
        return;
      }

      const totalSold = salesData?.reduce((sum, sale) => sum + sale.credits_purchased, 0) || 0;
      const availableBalance = totalPurchased - totalSold;

      const { error } = await supabase
        .from('credit_inventory')
        .update({
          total_purchased: totalPurchased,
          sold_to_agencies: totalSold,
          available_balance: availableBalance,
          updated_at: new Date().toISOString()
        })
        .eq('id', creditInventory.id);

      if (error) {
        console.error('Error updating credit inventory:', error);
        toast.error('Failed to update credit inventory');
        return;
      }

      toast.success('Credit inventory updated successfully');
      fetchCreditInventory();
    } catch (error) {
      console.error('Error in updateCreditInventory:', error);
      toast.error('Failed to update credit inventory');
    }
  };

  return (
    <Card className="border-green-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-green-800">
          <Package className="h-6 w-6" />
          Credit Inventory Summary
        </CardTitle>
        <CardDescription>
          Monitor and manage platform credit inventory
        </CardDescription>
      </CardHeader>
      <CardContent>
        {creditInventory && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-blue-800">Total Purchased</h3>
                  <div className="h-2 w-2 bg-blue-500 rounded-full"></div>
                </div>
                <p className="text-3xl font-bold text-blue-900">
                  {creditInventory.total_purchased.toLocaleString()}
                </p>
                <p className="text-xs text-blue-600 mt-1">Credits bought from provider</p>
              </div>
              
              <div className="bg-orange-50 p-6 rounded-lg border border-orange-200">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-orange-800">Sold to Agencies</h3>
                  <div className="h-2 w-2 bg-orange-500 rounded-full"></div>
                </div>
                <p className="text-3xl font-bold text-orange-900">
                  {creditInventory.sold_to_agencies.toLocaleString()}
                </p>
                <p className="text-xs text-orange-600 mt-1">Credits distributed to agencies</p>
              </div>
              
              <div className="bg-green-50 p-6 rounded-lg border border-green-200">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-green-800">Available Balance</h3>
                  <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                </div>
                <p className="text-3xl font-bold text-green-900">
                  {creditInventory.available_balance.toLocaleString()}
                </p>
                <p className="text-xs text-green-600 mt-1">Credits ready for distribution</p>
              </div>
            </div>

            {/* Inventory Management Controls */}
            <div className="bg-gray-50 p-4 rounded-lg border">
              <div className="flex gap-4 items-end">
                <div className="flex-1">
                  <Label htmlFor="totalPurchased" className="text-sm font-medium">
                    Adjust Total Purchased Credits
                  </Label>
                  <Input
                    id="totalPurchased"
                    type="number"
                    value={totalPurchased}
                    onChange={(e) => setTotalPurchased(parseInt(e.target.value) || 0)}
                    className="mt-1"
                    min="0"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Current: {creditInventory.total_purchased.toLocaleString()} credits
                  </p>
                </div>
                <Button 
                  onClick={updateCreditInventory} 
                  className="bg-green-600 hover:bg-green-700"
                  disabled={totalPurchased === creditInventory.total_purchased}
                >
                  Update Inventory
                </Button>
              </div>
            </div>

            {/* Last Updated Info */}
            <div className="text-sm text-gray-500 text-center">
              Last updated: {new Date(creditInventory.updated_at).toLocaleString()}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CreditInventoryManager;
