
export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: string;
  created_at: string;
  last_sign_in_at: string | null;
  credits: number;
  status: 'active' | 'suspended';
}

export interface AdminAgency {
  id: string;
  name: string;
  admin_email: string;
  users_count: number;
  credits_used: number;
  last_active: string;
  status: 'active' | 'suspended' | 'pending';
  created_at: string;
}

export interface SystemMetrics {
  totalUsers: number;
  totalAgencies: number;
  totalCreditsUsed: number;
  totalRevenue: number;
  monthlyRevenue: number;
  activeUsers: number;
}
