
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { User, CreditType } from '@/types/credit';

interface CreditUpdateDialogProps {
  users: User[];
  onCreditUpdate: (userId: string, amount: number) => void;
  onUsersReload: () => void;
  onTransactionsReload: () => void;
}

const CreditUpdateDialog = ({
  users,
  onCreditUpdate,
  onUsersReload,
  onTransactionsReload
}: CreditUpdateDialogProps) => {
  const [selectedUser, setSelectedUser] = useState('');
  const [creditAmount, setCreditAmount] = useState('');
  const [creditType, setCreditType] = useState<CreditType>('add');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleCreditUpdate = async () => {
    if (!selectedUser || !creditAmount) {
      toast.error('Please select a user and enter credit amount');
      return;
    }

    const amount = parseInt(creditAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid credit amount');
      return;
    }

    setIsLoading(true);

    try {
      console.log('Updating credits for user:', selectedUser, 'Amount:', amount, 'Type:', creditType);

      // Find the selected user to get their current credits
      const selectedUserData = users.find(u => u.id === selectedUser);
      if (!selectedUserData) {
        toast.error('Selected user not found');
        return;
      }

      const currentCredits = selectedUserData.credits;
      const finalAmount = creditType === 'remove' ? -amount : amount;
      const newCredits = Math.max(0, currentCredits + finalAmount);

      console.log('Credit calculation:', { currentCredits, finalAmount, newCredits });

      // Update user_profiles (which will trigger the sync to users table)
      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({ 
          credits: newCredits,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', selectedUser);

      if (updateError) {
        console.error('Error updating credits:', updateError);
        toast.error('Failed to update credits: ' + updateError.message);
        return;
      }

      // Log the credit change
      if (creditType === 'gift' || creditType === 'add') {
        const { error: logError } = await supabase
          .from('credit_sales_log')
          .insert({
            user_id: selectedUser,
            email: selectedUserData.email,
            credits_purchased: amount,
            amount_paid: creditType === 'gift' ? 0 : amount * 0.01,
            plan_name: creditType === 'gift' ? 'Admin Gift' : 'Admin Addition'
          });

        if (logError) {
          console.error('Error logging credit addition:', logError);
        }
      }

      onCreditUpdate(selectedUser, finalAmount);
      
      // Reset form
      setSelectedUser('');
      setCreditAmount('');
      setIsDialogOpen(false);
      
      // Reload data
      await onUsersReload();
      await onTransactionsReload();
      
      toast.success(`Credits ${creditType === 'remove' ? 'removed' : 'added'} successfully`);
    } catch (error) {
      console.error('Error updating credits:', error);
      toast.error('Failed to update credits: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Button className="bg-green-600 hover:bg-green-700">
          <Plus className="h-4 w-4 mr-2" />
          Manage Credits
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Manage User Credits</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="user-select">Select User ({users.length} available)</Label>
            <Select value={selectedUser} onValueChange={setSelectedUser}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a user" />
              </SelectTrigger>
              <SelectContent>
                {users.map(user => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.name} ({user.email}) - {user.credits} credits
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="credit-type">Action Type</Label>
            <Select value={creditType} onValueChange={(value: CreditType) => setCreditType(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="add">Add Credits</SelectItem>
                <SelectItem value="remove">Remove Credits</SelectItem>
                <SelectItem value="gift">Gift Credits</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="credit-amount">Credit Amount</Label>
            <Input
              id="credit-amount"
              type="number"
              value={creditAmount}
              onChange={(e) => setCreditAmount(e.target.value)}
              placeholder="Enter amount"
              min="1"
            />
          </div>
          <Button 
            onClick={handleCreditUpdate} 
            className="w-full" 
            disabled={!selectedUser || !creditAmount || isLoading}
          >
            {isLoading ? 'Updating...' : 'Update Credits'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreditUpdateDialog;
