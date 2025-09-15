import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useUser } from '@/contexts/UserContext';
import { useNotificationSound } from './useNotificationSound';
import { SupportTicket, SupportResponse } from './useSupportTickets';

interface NotificationState {
  hasNewMessages: boolean;
  lastNotificationId: string | null;
  newMessageCount: number;
}

export const useSupportNotifications = () => {
  const { user } = useAuth();
  const { user: userContextUser } = useUser();
  const { playNotificationSound } = useNotificationSound();
  const [notifications, setNotifications] = useState<NotificationState>({
    hasNewMessages: false,
    lastNotificationId: null,
    newMessageCount: 0
  });
  const [showBanner, setShowBanner] = useState(false);
  const lastCheckedRef = useRef<string | null>(null);

  const clearNotifications = () => {
    setNotifications({
      hasNewMessages: false,
      lastNotificationId: null,
      newMessageCount: 0
    });
    setShowBanner(false);
  };

  const dismissBanner = () => {
    setShowBanner(false);
  };

  useEffect(() => {
    if (!user) return;

    // Set up real-time subscription for new support responses
    const responseChannel = supabase
      .channel('support_responses_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'support_responses'
        },
        async (payload) => {
          try {
            const newResponse = payload.new as SupportResponse;

            // Super admin: notify on any message not authored by this super admin
            if (userContextUser?.role === 'super_admin') {
              if (newResponse.admin_id !== user.id) {
                setNotifications(prev => ({
                  hasNewMessages: true,
                  lastNotificationId: newResponse.id,
                  newMessageCount: prev.newMessageCount + 1
                }));
                setShowBanner(true);
                playNotificationSound();
              }
              return;
            }

            // Regular user: notify only if the response belongs to one of their tickets
            const { data: ticket, error } = await supabase
              .from('support_tickets')
              .select('user_id')
              .eq('id', newResponse.ticket_id)
              .maybeSingle();

            if (!error && ticket && ticket.user_id === user?.id && newResponse.admin_id && newResponse.admin_id !== user.id) {
              setNotifications(prev => ({
                hasNewMessages: true,
                lastNotificationId: newResponse.id,
                newMessageCount: prev.newMessageCount + 1
              }));
              setShowBanner(true);
              playNotificationSound();
            }
          } catch (e) {
            console.error('Error processing support response notification:', e);
          }
        }
      )
      .subscribe();

    // Set up real-time subscription for ticket status changes
    const ticketChannel = supabase
      .channel('support_tickets_changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'support_tickets'
        },
        (payload) => {
          const updatedTicket = payload.new as SupportTicket;
          
          // Only notify if this is the current user's ticket and status changed to resolved/pending
          if (updatedTicket.user_id === user.id && 
              (updatedTicket.status === 'resolved' || updatedTicket.status === 'pending')) {
            setNotifications(prev => ({
              hasNewMessages: true,
              lastNotificationId: updatedTicket.id,
              newMessageCount: prev.newMessageCount + 1
            }));
            setShowBanner(true);
            playNotificationSound();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(responseChannel);
      supabase.removeChannel(ticketChannel);
    };
  }, [user, playNotificationSound]);

  // Check for existing unread messages on mount
  useEffect(() => {
    if (!user) return;

    const checkForUnreadMessages = async () => {
      try {
        // Get user's tickets with recent responses
        const { data: tickets } = await supabase
          .from('support_tickets')
          .select(`
            id,
            updated_at,
            support_responses(id, created_at, admin_id)
          `)
          .eq('user_id', user.id)
          .order('updated_at', { ascending: false });

        if (tickets && tickets.length > 0) {
          // Check if there are any responses newer than last check
          const hasUnread = tickets.some(ticket => 
            ticket.support_responses && 
            ticket.support_responses.length > 0 &&
            ticket.support_responses.some((response: any) => 
              response.admin_id !== user.id && 
              new Date(response.created_at) > new Date(lastCheckedRef.current || '1970-01-01')
            )
          );

          if (hasUnread) {
            setNotifications(prev => ({
              hasNewMessages: true,
              lastNotificationId: tickets[0].id,
              newMessageCount: prev.newMessageCount + 1
            }));
            setShowBanner(true);
          }
        }

        lastCheckedRef.current = new Date().toISOString();
      } catch (error) {
        console.error('Error checking for unread messages:', error);
      }
    };

    checkForUnreadMessages();
  }, [user]);

  return {
    notifications,
    showBanner,
    clearNotifications,
    dismissBanner
  };
};