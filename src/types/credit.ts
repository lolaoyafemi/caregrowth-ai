
export interface Transaction {
  id: string;
  user_email: string;
  type: 'purchase' | 'usage' | 'gift';
  amount: number;
  timestamp: string;
  status: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  credits: number;
}

export interface CreditManagementProps {
  onUpdateCredits: (userId: string, credits: number) => void;
}

export type CreditType = 'add' | 'remove' | 'gift';
