
import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CreditCard, Minus, Gift, AlertCircle } from 'lucide-react';
import type { Transaction } from '@/types/credit';

interface TransactionTableProps {
  transactions: Transaction[];
}

const TransactionTable = ({ transactions }: TransactionTableProps) => {
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

  if (transactions.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No transaction data available
      </div>
    );
  }

  return (
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
  );
};

export default TransactionTable;
