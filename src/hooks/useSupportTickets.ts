
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
  const [responses, setResponses] = useState<SupportResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { user } = useUser();

  const fetchTickets = async () => {
    try {
      setLoading(true);
      
      // Super admins can see all tickets, regular users only their own
      const { data, error } = await supabase
        .from('support_tickets')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTickets(data || []);
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

      if (error) throw error;
      return data || [];
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
      const { data, error } = await supabase
        .from('support_tickets')
        .insert({
          user_id: user?.id,
          user_email: user?.email || '',
          user_role: user?.role,
          subject: ticketData.subject,
          question: ticketData.question,
          priority: ticketData.priority || 'medium'
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Success",
        description: "Support ticket created successfully"
      });

      await fetchTickets();
      return data;
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

      if (error) throw error;

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
      const { error } = await supabase
        .from('support_responses')
        .insert({
          ticket_id: ticketId,
          admin_id: user?.id,
          admin_email: user?.email,
          response_text: responseText
        });

      if (error) throw error;

      // Update ticket status to pending if it was open
      const ticket = tickets.find(t => t.id === ticketId);
      if (ticket && ticket.status === 'open') {
        await updateTicketStatus(ticketId, 'pending');
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
    fetchTickets();
  }, []);

  return {
    tickets,
    responses,
    loading,
    fetchTickets,
    fetchResponses,
    createTicket,
    updateTicketStatus,
    createResponse
  };
};
