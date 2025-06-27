
import { toast } from 'sonner';
import type { AdminAgency } from '@/types/admin';

export const fetchAgencies = async (): Promise<AdminAgency[]> => {
  try {
    // Mock data for now - in a real app, you'd have an agencies table
    const mockAgencies: AdminAgency[] = [
      {
        id: '1',
        name: 'CareFirst Agency',
        admin_email: 'admin@carefirst.com',
        users_count: 5,
        credits_used: 2500,
        last_active: '2024-01-15',
        status: 'active',
        created_at: '2024-01-01'
      },
      {
        id: '2',
        name: 'Golden Years Care',
        admin_email: 'admin@goldenyears.com',
        users_count: 3,
        credits_used: 1800,
        last_active: '2024-01-14',
        status: 'active',
        created_at: '2024-01-02'
      },
      {
        id: '3',
        name: 'Comfort Home Services',
        admin_email: 'admin@comfort.com',
        users_count: 7,
        credits_used: 3200,
        last_active: '2024-01-13',
        status: 'pending',
        created_at: '2024-01-03'
      }
    ];
    
    return mockAgencies;
  } catch (error) {
    console.error('Error fetching agencies:', error);
    toast.error('Failed to load agencies');
    return [];
  }
};
