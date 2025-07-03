
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CreditCard, Plus, Minus, Gift, AlertCircle, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface CreditManagementProps {
  onUpdateCredits: (userId: string, credits: number) => void;
}

interface Transaction {
  id: string;
  user_email: string;
  type: 'purchase' | 'usage' | 'gift';
  amount: number;
  timestamp: string;
  status: string;
}

interface User {
  id: string;
  email: string;
  name: string;
  credits: number;
}

const CreditManagement = ({ onUpdateCredits }: CreditManagementProps) => {
  const [selectedUser, setSelectedUser] = useState('');
  const [creditAmount, setCreditAmount] = useState('');
  const [creditType, setCreditType] = useState<'add' | 'remove' | 'gift'>('add');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTransactions();
    loadUsers();
  }, []);

  const loadTransactions = async () => {
    try {
      console.log('Loading credit transactions...');
      
      // Fetch recent credit purchases
      const { data: purchases } = await supabase
        .from('credit_sales_log')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(10);

      // Fetch recent credit usage
      const { data: usage } = await supabase
        .from('credit_usage_log')
        .select('*')
        .order('used_at', { ascending: false })
        .limit(10);

      const allTransactions: Transaction[] = [];

      // Add purchases
      purchases?.forEach(purchase => {
        allTransactions.push({
          id: purchase.id,
          user_email: purchase.email,
          type: 'purchase',
          amount: purchase.credits_purchased,
          timestamp: purchase.timestamp,
          status: 'completed'
        });
      });

      // Add usage
      usage?.forEach(usageItem => {
        allTransactions.push({
          id: usageItem.id,
          user_email: usageItem.email || 'Unknown',
          type: 'usage',
          amount: -usageItem.credits_used,
          timestamp: usageItem.used_at,
          status: 'completed'
        });
      });

      // Sort by timestamp
      const sortedTransactions = allTransactions
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 15);

      setTransactions(sortedTransactions);
      console.log('Loaded transactions:', sortedTransactions.length);
    } catch (error) {
      console.error('Error loading transactions:', error);
      toast.error('Failed to load transaction data');
    }
  };

  const loadUsers = async () => {
    try {
      console.log('Loading users for credit management...');
      
      // First try user_profiles table
      const { data: profiles, error: profilesError } = await supabase
        .from('user_profiles')
        .select('user_id, email, business_name, credits')
        .not('email', 'is', null)
        .order('created_at', { ascending: false });

      console.log('User profiles query result:', { profiles, profilesError });

      if (profiles && profiles.length > 0) {
        const userList = profiles.map(profile => ({
          id: profile.user_id,
          email: profile.email || 'No email',
          name: profile.business_name || 'No name',
          credits: profile.credits || 0
        }));
        setUsers(userList);
        console.log('Loaded users from profiles:', userList.length);
      } else {
        // Fallback to users table
        const { data: usersData, error: usersError } = await supabase
          .from('users')
          .select('id, email, name, credits')
          .not('email', 'is', null)
          .order('created_at', { ascending: false });

        console.log('Users table query result:', { usersData, usersError });

        if (usersData && usersData.length > 0) {
          const userList = usersData.map(user => ({
            id: user.id,
            email: user.email || 'No email',
            name: user.name || 'No name',
            credits: user.credits || 0
          }));
          setUsers(userList);
          console.log('Loaded users from users table:', userList.length);
        } else {
          console.warn('No users found in either table');
          toast.error('No users found in the system');
        }
      }
    } catch (error) {
      console.error('Error loading users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

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

    try {
      console.log('Updating credits for user:', selectedUser, 'Amount:', amount, 'Type:', creditType);

      // First try to get current credits from user_profiles
      let { data: currentProfile, error: fetchProfileError } = await supabase
        .from('user_profiles')
        .select('credits, email')
        .eq('user_id', selectedUser)
        .single();

      console.log('Current profile data:', { currentProfile, fetchProfileError });

      let currentCredits = 0;
      let userEmail = '';

      if (currentProfile) {
        currentCredits = currentProfile.credits || 0;
        userEmail = currentProfile.email || '';
      } else {
        // Fallback to users table
        const { data: currentUser, error: fetchUserError } = await supabase
          .from('users')
          .select('credits, email')
          .eq('id', selectedUser)
          .single();

        console.log('Current user data:', { currentUser, fetchUserError });

        if (currentUser) {
          currentCredits = currentUser.credits || 0;
          userEmail = currentUser.email || '';
        } else {
          toast.error('User not found');
          return;
        }
      }

      const finalAmount = creditType === 'remove' ? -amount : amount;
      const newCredits = Math.max(0, currentCredits + finalAmount); // Ensure credits don't go negative

      console.log('Credit calculation:', { currentCredits, finalAmount, newCredits });

      // Update credits in user_profiles first
      const { error: updateProfileError } = await supabase
        .from('user_profiles')
        .update({ 
          credits: newCredits,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', selectedUser);

      if (updateProfileError) {
        console.log('Profile update failed, trying users table:', updateProfileError);
        
        // Fallback to users table
        const { error: updateUserError } = await supabase
          .from('users')
          .update({ credits: newCredits })
          .eq('id', selectedUser);

        if (updateUserError) {
          console.error('Both profile and user update failed:', updateUserError);
          toast.error('Failed to update credits');
          return;
        }
      }

      // Log the credit change
      if (creditType === 'gift' || creditType === 'add') {
        const { error: logError } = await supabase
          .from('credit_sales_log')
          .insert({
            user_id: selectedUser,
            email: userEmail,
            credits_purchased: amount,
            amount_paid: creditType === 'gift' ? 0 : amount * 0.01, // Assuming 1 cent per credit
            plan_name: creditType === 'gift' ? 'Admin Gift' : 'Admin Addition'
          });

        if (logError) {
          console.error('Error logging credit addition:', logError);
        }
      }

      onUpdateCredits(selectedUser, finalAmount);
      
      setSelectedUser('');
      setCreditAmount('');
      setIsDialogOpen(false);
      
      // Reload data
      await loadTransactions();
      await loadUsers();
      
      toast.success(`Credits ${creditType === 'remove' ? 'removed' : 'added'} successfully`);
    } catch (error) {
      console.error('Error updating credits:', error);
      toast.error('Failed to update credits');
    }
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'purchase':
        return <CreditCard className="h-4 w-4 text-green-600" />;
      case 'usage':
        return <Minus className="h-4 w-4 text-red-600" />;
      case 'gift':
        return <Gift className="h-4 w-4 text-blue-600" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-600" />;
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Card className="border-green-200">
          <CardContent className="p-6">
            <div className="animate-pulse">
              <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-2/3 mb-6"></div>
              <div className="h-10 bg-gray-200 rounded w-32"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Credit Management Controls */}
      <Card className="border-green-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-green-600" />
            Credit Management
          </CardTitle>
          <CardDescription>
            Manage user credits, handle refunds, and track credit usage
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600">
              Total users: {users.length} | Use the controls below to manage user credits
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={() => { loadUsers(); loadTransactions(); }} 
                variant="outline" 
                size="sm"
                className="gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </Button>
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
                      <Select value={creditType} onValueChange={(value: 'add' | 'remove' | 'gift') => setCreditType(value)}>
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
                    <Button onClick={handleCreditUpdate} className="w-full" disabled={!selectedUser || !creditAmount}>
                      Update Credits
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Transactions */}
      <Card className="border-green-200">
        <CardHeader>
          <CardTitle>Recent Credit Transactions</CardTitle>
          <CardDescription>Latest credit activities across the platform</CardDescription>
        </CardHeader>
        <CardContent>
          {transactions.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getTransactionIcon(transaction.type)}
                        <span className="capitalize">{transaction.type}</span>
                      </div>
                    </TableCell>
                    <TableCell>{transaction.user_email}</TableCell>
                    <TableCell>
                      <span className={transaction.amount > 0 ? 'text-green-600' : 'text-red-600'}>
                        {transaction.amount > 0 ? '+' : ''}{transaction.amount}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {formatTimestamp(transaction.timestamp)}
                    </TableCell>
                    <TableCell>
                      <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">
                        {transaction.status}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-gray-500">
              No transaction data available
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CreditManagement;
