
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CreditCard, Plus, Minus, Gift, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface CreditManagementProps {
  onUpdateCredits: (userId: string, credits: number) => void;
}

const CreditManagement = ({ onUpdateCredits }: CreditManagementProps) => {
  const [selectedUser, setSelectedUser] = useState('');
  const [creditAmount, setCreditAmount] = useState('');
  const [creditType, setCreditType] = useState<'add' | 'remove' | 'gift'>('add');
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Mock data for recent credit transactions
  const recentTransactions = [
    {
      id: '1',
      user: 'john@example.com',
      type: 'purchase',
      amount: 1000,
      timestamp: '2024-01-15 10:30:00',
      status: 'completed'
    },
    {
      id: '2',
      user: 'jane@example.com',
      type: 'usage',
      amount: -25,
      timestamp: '2024-01-15 10:25:00',
      status: 'completed'
    },
    {
      id: '3',
      user: 'admin@example.com',
      type: 'gift',
      amount: 500,
      timestamp: '2024-01-15 10:15:00',
      status: 'completed'
    }
  ];

  const handleCreditUpdate = () => {
    if (!selectedUser || !creditAmount) {
      toast.error('Please select a user and enter credit amount');
      return;
    }

    const amount = parseInt(creditAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid credit amount');
      return;
    }

    const finalAmount = creditType === 'remove' ? -amount : amount;
    onUpdateCredits(selectedUser, finalAmount);
    
    setSelectedUser('');
    setCreditAmount('');
    setIsDialogOpen(false);
    
    toast.success(`Credits ${creditType === 'remove' ? 'removed' : 'added'} successfully`);
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
              Use the controls below to manage user credits across the platform
            </div>
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
                    <Label htmlFor="user-select">Select User</Label>
                    <Select value={selectedUser} onValueChange={setSelectedUser}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a user" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user1">john@example.com</SelectItem>
                        <SelectItem value="user2">jane@example.com</SelectItem>
                        <SelectItem value="user3">admin@example.com</SelectItem>
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
                    />
                  </div>
                  <Button onClick={handleCreditUpdate} className="w-full">
                    Update Credits
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
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
              {recentTransactions.map((transaction) => (
                <TableRow key={transaction.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getTransactionIcon(transaction.type)}
                      <span className="capitalize">{transaction.type}</span>
                    </div>
                  </TableCell>
                  <TableCell>{transaction.user}</TableCell>
                  <TableCell>
                    <span className={transaction.amount > 0 ? 'text-green-600' : 'text-red-600'}>
                      {transaction.amount > 0 ? '+' : ''}{transaction.amount}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm text-gray-600">
                    {transaction.timestamp}
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
        </CardContent>
      </Card>
    </div>
  );
};

export default CreditManagement;
