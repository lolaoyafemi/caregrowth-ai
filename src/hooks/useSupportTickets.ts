
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/contexts/UserContext';

export interface SupportTicket {
  id: string;
  user_id: string | null;
  user_email: string;
  user_role: string | null;
  subject: string;
  question: string;
  status: 'open' | 'pending' | 'resolved';
  priority: 'low' | 'medium' | 'high';
  created_at: string;
  updated_at: string;
}

export interface SupportResponse {
  id: string;
  ticket_id: string;
  admin_id: string | null;
  admin_email: string | null;
  response_text: string;
  created_at: string;
}

export const useSupportTickets = () => {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { user } = useUser();

  const fetchTickets = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('support_tickets')
        .select('*')
        .order('created_at', { ascending: false });

      // Regular users can only see their own tickets
      // Super admins can see all tickets (handled by RLS)
      const { data, error } = await query;

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }
      
      // Type cast the data to ensure proper typing
      setTickets((data || []) as SupportTicket[]);
    } catch (error) {
      console.error('Error fetching support tickets:', error);
      toast({
        title: "Error",
        description: "Failed to load support tickets",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchResponses = async (ticketId: string) => {
    try {
      const { data, error } = await supabase
        .from('support_responses')
        .select('*')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching responses:', error);
        throw error;
      }
      
      return (data || []) as SupportResponse[];
    } catch (error) {
      console.error('Error fetching responses:', error);
      return [];
    }
  };

  const createTicket = async (ticketData: {
    subject: string;
    question: string;
    priority?: 'low' | 'medium' | 'high';
  }) => {
    try {
      if (!user) {
        throw new Error('User not authenticated');
      }

      const { data, error } = await supabase
        .from('support_tickets')
        .insert({
          user_id: user.id,
          user_email: user.email || '',
          user_role: user.role,
          subject: ticketData.subject,
          question: ticketData.question,
          priority: ticketData.priority || 'medium'
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating ticket:', error);
        throw error;
      }

      toast({
        title: "Success",
        description: "Support ticket created successfully"
      });

      await fetchTickets();
      return data as SupportTicket;
    } catch (error) {
      console.error('Error creating ticket:', error);
      toast({
        title: "Error",
        description: "Failed to create support ticket",
        variant: "destructive"
      });
      throw error;
    }
  };

  const updateTicketStatus = async (ticketId: string, status: 'open' | 'pending' | 'resolved') => {
    try {
      const { error } = await supabase
        .from('support_tickets')
        .update({ 
          status,
          updated_at: new Date().toISOString()
        })
        .eq('id', ticketId);

      if (error) {
        console.error('Error updating ticket status:', error);
        throw error;
      }

      toast({
        title: "Success",
        description: "Ticket status updated successfully"
      });

      await fetchTickets();
    } catch (error) {
      console.error('Error updating ticket status:', error);
      toast({
        title: "Error",
        description: "Failed to update ticket status",
        variant: "destructive"
      });
    }
  };

  const createResponse = async (ticketId: string, responseText: string) => {
    try {
      if (!user) {
        throw new Error('User not authenticated');
      }

      const { error } = await supabase
        .from('support_responses')
        .insert({
          ticket_id: ticketId,
          admin_id: user.id,
          admin_email: user.email,
          response_text: responseText
        });

      if (error) {
        console.error('Error creating response:', error);
        throw error;
      }

      // Update ticket status to pending if it was open
      const ticket = tickets.find(t => t.id === ticketId);
      if (ticket && ticket.status === 'open') {
        await updateTicketStatus(ticketId, 'pending');
      } else {
        // Just refresh tickets if no status change needed
        await fetchTickets();
      }

      toast({
        title: "Success",
        description: "Response sent successfully"
      });

      return true;
    } catch (error) {
      console.error('Error creating response:', error);
      toast({
        title: "Error",
        description: "Failed to send response",
        variant: "destructive"
      });
      return false;
    }
  };

  useEffect(() => {
    if (user) {
      fetchTickets();
    }
  }, [user]);

  return {
    tickets,
    loading,
    fetchTickets,
    fetchResponses,
    createTicket,
    updateTicketStatus,
    createResponse
  };
};
