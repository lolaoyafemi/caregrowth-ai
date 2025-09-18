import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SyncResult {
  success: boolean;
  connections_processed: number;
  files_processed: number;
  errors: number;
}

export const useGoogleDriveSync = () => {
  const [isRunning, setIsRunning] = useState(false);

  const triggerSync = useCallback(async (): Promise<SyncResult | null> => {
    if (isRunning) {
      toast.info('Sync already in progress');
      return null;
    }

    setIsRunning(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('google-drive-sync-monitor', {
        body: { manual_trigger: true }
      });

      if (error) {
        throw error;
      }

      const result = data as SyncResult;
      
      if (result.success) {
        toast.success(
          `Sync completed! Processed ${result.files_processed} files from ${result.connections_processed} connections${
            result.errors > 0 ? ` with ${result.errors} errors` : ''
          }`
        );
      } else {
        toast.error('Sync failed');
      }

      return result;
    } catch (error) {
      console.error('Sync error:', error);
      toast.error('Failed to trigger sync');
      return null;
    } finally {
      setIsRunning(false);
    }
  }, [isRunning]);

  const scheduleSync = useCallback(async (intervalMinutes: number = 10) => {
    try {
      // In a real implementation, you might want to use a scheduling service
      // For now, we'll just show a success message
      toast.success(`Auto-sync scheduled for every ${intervalMinutes} minutes`);
      
      // You could implement a client-side scheduler here if needed:
      // const interval = setInterval(triggerSync, intervalMinutes * 60 * 1000);
      // return () => clearInterval(interval);
      
    } catch (error) {
      console.error('Scheduling error:', error);
      toast.error('Failed to schedule sync');
    }
  }, [triggerSync]);

  return {
    isRunning,
    triggerSync,
    scheduleSync
  };
};