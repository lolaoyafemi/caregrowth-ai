
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useUser } from '@/contexts/UserContext';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Shield, MessageSquare, User, Calendar, Send, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useSupportTickets } from '@/hooks/useSupportTickets';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const SuperAdminSupportDashboard = () => {
  const [selectedTicket, setSelectedTicket] = useState<string | null>(null);
  const [response, setResponse] = useState('');
  const { 
    tickets, 
    loading, 
    updateTicketStatus, 
    createResponse,
    fetchResponses
  } = useSupportTickets();
  const { toast } = useToast();
  const [ticketResponses, setTicketResponses] = useState<any[]>([]);
  const [loadingResponses, setLoadingResponses] = useState(false);

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      open: { variant: 'destructive' as const, label: 'Open' },
      pending: { variant: 'secondary' as const, label: 'Pending' },
      resolved: { variant: 'default' as const, label: 'Resolved' }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.open;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getPriorityBadge = (priority: string) => {
    const priorityConfig = {
      high: { variant: 'destructive' as const, label: 'High' },
      medium: { variant: 'secondary' as const, label: 'Medium' },
      low: { variant: 'outline' as const, label: 'Low' }
    };
    
    const config = priorityConfig[priority as keyof typeof priorityConfig] || priorityConfig.medium;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const handleViewTicket = async (ticketId: string) => {
    setSelectedTicket(ticketId);
    setLoadingResponses(true);
    try {
      const responses = await fetchResponses(ticketId);
      setTicketResponses(responses);
    } catch (error) {
      console.error('Error fetching responses:', error);
      toast({
        title: "Error",
        description: "Failed to load ticket responses",
        variant: "destructive"
      });
    } finally {
      setLoadingResponses(false);
    }
  };

  const handleSendResponse = async () => {
    if (!selectedTicket || !response.trim()) return;
    
    const success = await createResponse(selectedTicket, response);
    if (success) {
      setResponse('');
      // Refresh responses
      const updatedResponses = await fetchResponses(selectedTicket);
      setTicketResponses(updatedResponses);
    }
  };

  const handleStatusChange = async (ticketId: string, newStatus: 'open' | 'pending' | 'resolved') => {
    await updateTicketStatus(ticketId, newStatus);
  };

  const selectedTicketData = tickets.find(t => t.id === selectedTicket);

  if (loading) {
    return (
      <div className="container mx-auto p-6 bg-green-50/30">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-700"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 bg-green-50/30">
      <div className="flex items-center gap-3 mb-6">
        <Shield className="text-green-700" size={24} />
        <h1 className="text-2xl font-bold text-green-800">Support Dashboard</h1>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Support Tickets Table */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare size={20} />
                Support Tickets ({tickets.length})
              </CardTitle>
              <CardDescription>
                Manage and respond to user support requests
              </CardDescription>
            </CardHeader>
            <CardContent>
              {tickets.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No support tickets found
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tickets.map((ticket) => (
                      <TableRow key={ticket.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User size={16} className="text-gray-500" />
                            <div>
                              <div className="font-medium">{ticket.user_email}</div>
                              <div className="text-sm text-gray-500">{ticket.user_role || 'user'}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="max-w-xs">
                          <div className="truncate">{ticket.subject}</div>
                        </TableCell>
                        <TableCell>{getStatusBadge(ticket.status)}</TableCell>
                        <TableCell>{getPriorityBadge(ticket.priority)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Calendar size={14} className="text-gray-500" />
                            {format(new Date(ticket.created_at), 'MMM dd, yyyy')}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handleViewTicket(ticket.id)}
                            >
                              View
                            </Button>
                            {ticket.status !== 'resolved' && (
                              <Button 
                                size="sm" 
                                variant="ghost"
                                onClick={() => handleStatusChange(ticket.id, 'resolved')}
                                className="text-green-600 hover:text-green-700"
                              >
                                Resolve
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Ticket Details & Response */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Ticket Details</CardTitle>
              <CardDescription>
                {selectedTicket ? 'View and respond to ticket' : 'Select a ticket to view details'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {selectedTicketData ? (
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">Subject:</h4>
                    <p className="text-sm text-gray-700 font-medium">{selectedTicketData.subject}</p>
                  </div>
                  
                  <div>
                    <h4 className="font-medium mb-2">Question/Issue:</h4>
                    <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-md">
                      {selectedTicketData.question}
                    </p>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-600">
                      Status: {getStatusBadge(selectedTicketData.status)}
                    </div>
                    <div className="text-sm text-gray-600">
                      Priority: {getPriorityBadge(selectedTicketData.priority)}
                    </div>
                  </div>

                  {/* Previous Responses */}
                  {ticketResponses.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2">Previous Responses:</h4>
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {ticketResponses.map((resp) => (
                          <div key={resp.id} className="bg-blue-50 p-2 rounded text-sm">
                            <div className="font-medium text-blue-700">
                              {resp.admin_email || 'Admin'}
                            </div>
                            <div className="text-gray-700">{resp.response_text}</div>
                            <div className="text-xs text-gray-500">
                              {format(new Date(resp.created_at), 'MMM dd, yyyy HH:mm')}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">New Response:</label>
                    <Textarea
                      placeholder="Type your response here..."
                      value={response}
                      onChange={(e) => setResponse(e.target.value)}
                      className="min-h-[100px]"
                    />
                  </div>
                  
                  <div className="flex gap-2">
                    <Button 
                      onClick={handleSendResponse}
                      disabled={!response.trim()}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Send size={16} className="mr-2" />
                      Send Response
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => setSelectedTicket(null)}
                    >
                      Close
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">
                  Select a ticket from the table to view details and respond
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

const RegularUserHelpPage = () => {
  const [subject, setSubject] = useState('');
  const [question, setQuestion] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<string | null>(null);
  const [newResponse, setNewResponse] = useState('');
  const [ticketResponses, setTicketResponses] = useState<any[]>([]);
  const [loadingResponses, setLoadingResponses] = useState(false);
  const { createTicket, tickets, loading, fetchResponses, createResponse } = useSupportTickets();
  const { user } = useUser();
  const { toast } = useToast();

  // Filter tickets for current user
  const userTickets = tickets.filter(ticket => ticket.user_id === user?.id);

  const handleViewTicketResponses = async (ticketId: string) => {
    setSelectedTicket(ticketId);
    setLoadingResponses(true);
    try {
      const responses = await fetchResponses(ticketId);
      setTicketResponses(responses);
    } catch (error) {
      console.error('Error fetching responses:', error);
      toast({
        title: "Error",
        description: "Failed to load ticket responses",
        variant: "destructive"
      });
    } finally {
      setLoadingResponses(false);
    }
  };

  const handleSendUserResponse = async (ticketId: string) => {
    if (!newResponse.trim()) return;
    
    const success = await createResponse(ticketId, newResponse);
    if (success) {
      setNewResponse('');
      // Refresh responses
      const updatedResponses = await fetchResponses(ticketId);
      setTicketResponses(updatedResponses);
      toast({
        title: "Success",
        description: "Your response has been sent successfully"
      });
    }
  };

  const handleSubmitQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!subject.trim() || !question.trim()) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      await createTicket({
        subject: subject.trim(),
        question: question.trim(),
        priority
      });
      
      // Reset form on success
      setSubject('');
      setQuestion('');
      setPriority('medium');
      
      toast({
        title: "Success",
        description: "Your support ticket has been submitted successfully",
      });
    } catch (error) {
      // Error is already handled in the hook
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Help & Support</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Frequently Asked Questions</CardTitle>
              <CardDescription>
                Quick answers to the most common questions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="item-1">
                  <AccordionTrigger>How do I add team members?</AccordionTrigger>
                  <AccordionContent>
                    If you're an Agency Admin, navigate to the Team Management section from the sidebar. 
                    Click the "Add Team Member" button, and fill in their details including their email 
                    and assigned role.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-2">
                  <AccordionTrigger>How does the Social Media tool work?</AccordionTrigger>
                  <AccordionContent>
                    The Social Media Content Generator creates professional, engaging social media posts
                    for your home care agency. Simply provide a topic or theme, select your desired platform,
                    and our AI will generate content tailored to your specifications.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-3">
                  <AccordionTrigger>How can I track my API usage?</AccordionTrigger>
                  <AccordionContent>
                    Agency Admins can view usage analytics in the Agency Usage section of the dashboard.
                    This includes total token usage, breakdowns by tool and team member, and historical trends.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-4">
                  <AccordionTrigger>What roles are available for team members?</AccordionTrigger>
                  <AccordionContent>
                    CareGrowthAI offers several role types including Agency Admin, Marketing, HR Admin, and
                    Carer. Each role has specific permissions and access to different tools. Agency Admins
                    can manage all aspects of the dashboard.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-5">
                  <AccordionTrigger>How do I reset my password?</AccordionTrigger>
                  <AccordionContent>
                    You can reset your password by clicking the "Forgot Password" link on the login page.
                    Enter your email address and we'll send you instructions to reset your password.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-6">
                  <AccordionTrigger>What file formats are supported for document upload?</AccordionTrigger>
                  <AccordionContent>
                    The Document Search tool supports PDF, Word documents (.doc, .docx), text files (.txt),
                    and common image formats (PNG, JPG, JPEG). Files should be under 10MB for optimal processing.
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>
        </div>
        
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Submit a Support Ticket</CardTitle>
              <CardDescription>
                Can't find what you're looking for? Submit a support ticket and we'll help you out.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmitQuestion} className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Subject *</label>
                  <Input 
                    placeholder="Brief description of your issue" 
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Priority</label>
                  <select 
                    value={priority} 
                    onChange={(e) => setPriority(e.target.value as 'low' | 'medium' | 'high')}
                    className="w-full mt-1 p-2 border rounded-md"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium">Description *</label>
                  <Textarea 
                    className="min-h-[120px]" 
                    placeholder="Describe your question or issue in detail..."
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    required
                  />
                </div>
                <Button 
                  type="submit" 
                  className="w-full"
                  disabled={isSubmitting || !subject.trim() || !question.trim()}
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Send size={16} className="mr-2" />
                      Submit Support Ticket
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
      
      {/* User's Tickets with Conversation */}
      {userTickets.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Your Support Tickets</CardTitle>
            <CardDescription>
              Track and continue conversations with our support team
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {userTickets.map((ticket) => (
                <div key={ticket.id} className="border rounded-lg">
                  <div 
                    className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => handleViewTicketResponses(ticket.id)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">{ticket.subject}</h4>
                      <div className="flex items-center gap-2">
                        <Badge variant={ticket.status === 'resolved' ? 'default' : ticket.status === 'pending' ? 'secondary' : 'destructive'}>
                          {ticket.status}
                        </Badge>
                        <Badge variant={ticket.priority === 'high' ? 'destructive' : ticket.priority === 'medium' ? 'secondary' : 'outline'}>
                          {ticket.priority}
                        </Badge>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 line-clamp-2">{ticket.question}</p>
                    <div className="flex items-center justify-between mt-2">
                      <div className="text-xs text-gray-500">
                        Submitted on {format(new Date(ticket.created_at), 'MMM dd, yyyy')}
                      </div>
                      <Button variant="ghost" size="sm">
                        {selectedTicket === ticket.id ? 'Hide Conversation' : 'View Conversation'}
                      </Button>
                    </div>
                  </div>
                  
                  {/* Conversation Display */}
                  {selectedTicket === ticket.id && (
                    <div className="border-t bg-gray-50 p-4">
                      {loadingResponses ? (
                        <div className="flex items-center justify-center py-4">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-700"></div>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {/* Original ticket message */}
                          <div className="bg-white p-3 rounded-lg shadow-sm">
                            <div className="flex items-center gap-2 mb-2">
                              <User size={16} className="text-blue-600" />
                              <span className="font-medium text-blue-600">You</span>
                              <span className="text-xs text-gray-500">
                                {format(new Date(ticket.created_at), 'MMM dd, yyyy HH:mm')}
                              </span>
                            </div>
                            <p className="text-sm text-gray-700">{ticket.question}</p>
                          </div>
                          
                          {/* Responses */}
                          {ticketResponses.map((response) => (
                            <div key={response.id} className="bg-green-50 p-3 rounded-lg shadow-sm">
                              <div className="flex items-center gap-2 mb-2">
                                <Shield size={16} className="text-green-600" />
                                <span className="font-medium text-green-600">
                                  {response.admin_email || 'Support Team'}
                                </span>
                                <span className="text-xs text-gray-500">
                                  {format(new Date(response.created_at), 'MMM dd, yyyy HH:mm')}
                                </span>
                              </div>
                              <p className="text-sm text-gray-700">{response.response_text}</p>
                            </div>
                          ))}
                          
                          {/* Response input - only show if ticket is not resolved */}
                          {ticket.status !== 'resolved' && (
                            <div className="bg-white p-3 rounded-lg shadow-sm">
                              <div className="space-y-3">
                                <label className="text-sm font-medium">Continue the conversation:</label>
                                <Textarea
                                  placeholder="Type your response here..."
                                  value={selectedTicket === ticket.id ? newResponse : ''}
                                  onChange={(e) => setNewResponse(e.target.value)}
                                  className="min-h-[80px]"
                                />
                                <div className="flex gap-2">
                                  <Button 
                                    size="sm"
                                    onClick={() => handleSendUserResponse(ticket.id)}
                                    disabled={!newResponse.trim()}
                                  >
                                    <Send size={14} className="mr-2" />
                                    Send Response
                                  </Button>
                                  <Button 
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setSelectedTicket(null);
                                      setNewResponse('');
                                    }}
                                  >
                                    Close
                                  </Button>
                                </div>
                              </div>
                            </div>
                          )}
                          
                          {ticket.status === 'resolved' && (
                            <div className="text-center py-4">
                              <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-100 text-green-800 rounded-full text-sm">
                                <CheckCircle size={16} />
                                This ticket has been resolved
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="text-green-600" size={20} />
            Contact Support
          </CardTitle>
          <CardDescription>
            Get help from our support team
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-600">
            For urgent matters or complex issues, you can reach out to our support team directly:
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button asChild variant="outline" className="flex-1">
              <a href="mailto:admin@caregrowth.com">
                <MessageSquare size={16} className="mr-2" />
                Email Support
              </a>
            </Button>
            <Button asChild variant="outline" className="flex-1">
              <a href="https://wa.me/2348068920166" target="_blank" rel="noopener noreferrer">
                <MessageSquare size={16} className="mr-2" />
                WhatsApp Chat
              </a>
            </Button>
          </div>
          <p className="text-xs text-gray-500">
            Response time: We typically respond within 24 hours on business days.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

const HelpPage = () => {
  const { user } = useUser();
  const isSuperAdmin = user?.role === 'super_admin';

  return isSuperAdmin ? <SuperAdminSupportDashboard /> : <RegularUserHelpPage />;
};

export default HelpPage;
