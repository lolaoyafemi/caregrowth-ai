
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CreditCard, RefreshCw } from 'lucide-react';
import { useCreditTransactions } from '@/hooks/useCreditTransactions';
import { useCreditUsers } from '@/hooks/useCreditUsers';
import CreditUpdateDialog from './CreditUpdateDialog';
import TransactionTable from './TransactionTable';
import type { CreditManagementProps } from '@/types/credit';

const CreditManagement = ({ onUpdateCredits }: CreditManagementProps) => {
  const { transactions, loadTransactions } = useCreditTransactions();
  const { users, loading, loadUsers } = useCreditUsers();

  const handleRefresh = () => {
    loadUsers();
    loadTransactions();
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
              Total users: {users.length} | Credits are now synchronized between tables
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={handleRefresh}
                variant="outline" 
                size="sm"
                className="gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </Button>
              <CreditUpdateDialog
                users={users}
                onCreditUpdate={onUpdateCredits}
                onUsersReload={loadUsers}
                onTransactionsReload={loadTransactions}
              />
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
          <TransactionTable transactions={transactions} />
        </CardContent>
      </Card>
    </div>
  );
};

export default CreditManagement;
