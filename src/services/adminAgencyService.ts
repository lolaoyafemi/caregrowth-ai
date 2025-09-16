
import { toast } from 'sonner';
import type { AdminAgency } from '@/types/admin';

export const fetchAgencies = async (): Promise<AdminAgency[]> => {
  try {
    console.log('Fetching real agency data...');
    
    // For now, return empty array since we don't have an agencies table yet
    // In the future, this would query actual agency data from the database
    const agencies: AdminAgency[] = [];
    
    console.log('Fetched agencies:', agencies.length);
    return agencies;
  } catch (error) {
    console.error('Error fetching agencies:', error);
    toast.error('Failed to load agencies');
    return [];
  }
};
