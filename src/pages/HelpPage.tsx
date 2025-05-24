
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
import { Shield, MessageSquare, User, Calendar } from 'lucide-react';

// Mock support tickets data
const mockSupportTickets = [
  {
    id: 1,
    user: 'john@example.com',
    userRole: 'agency_admin',
    subject: 'How to add team members?',
    question: 'I\'m having trouble adding new team members to my agency. The invite button doesn\'t seem to work.',
    status: 'open',
    createdAt: '2024-01-15',
    priority: 'medium'
  },
  {
    id: 2,
    user: 'sarah@careagency.com',
    userRole: 'admin',
    subject: 'Social Media tool not generating content',
    question: 'When I try to generate social media posts, I get an error message. This has been happening for the past 2 days.',
    status: 'pending',
    createdAt: '2024-01-14',
    priority: 'high'
  },
  {
    id: 3,
    user: 'mike@homecare.com',
    userRole: 'content_writer',
    subject: 'API usage tracking question',
    question: 'Where can I see how many API calls I\'ve used this month?',
    status: 'resolved',
    createdAt: '2024-01-13',
    priority: 'low'
  },
  {
    id: 4,
    user: 'lisa@wellness.com',
    userRole: 'collaborator',
    subject: 'Document search not finding files',
    question: 'I uploaded several documents but they don\'t appear in search results. Are there specific file formats required?',
    status: 'open',
    createdAt: '2024-01-12',
    priority: 'medium'
  }
];

const SuperAdminSupportDashboard = () => {
  const [selectedTicket, setSelectedTicket] = useState<number | null>(null);
  const [response, setResponse] = useState('');

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

  const handleSendResponse = () => {
    console.log('Sending response for ticket:', selectedTicket, 'Response:', response);
    setResponse('');
    setSelectedTicket(null);
    // In a real app, this would send the response and update the ticket status
  };

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
                Support Tickets
              </CardTitle>
              <CardDescription>
                Manage and respond to user support requests
              </CardDescription>
            </CardHeader>
            <CardContent>
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
                  {mockSupportTickets.map((ticket) => (
                    <TableRow key={ticket.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User size={16} className="text-gray-500" />
                          <div>
                            <div className="font-medium">{ticket.user}</div>
                            <div className="text-sm text-gray-500">{ticket.userRole}</div>
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
                          {ticket.createdAt}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => setSelectedTicket(ticket.id)}
                        >
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
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
              {selectedTicket ? (
                <div className="space-y-4">
                  {(() => {
                    const ticket = mockSupportTickets.find(t => t.id === selectedTicket);
                    if (!ticket) return null;
                    
                    return (
                      <>
                        <div>
                          <h4 className="font-medium mb-2">Question/Issue:</h4>
                          <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-md">
                            {ticket.question}
                          </p>
                        </div>
                        
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Response:</label>
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
                            Send Response
                          </Button>
                          <Button 
                            variant="outline" 
                            onClick={() => setSelectedTicket(null)}
                          >
                            Close
                          </Button>
                        </div>
                      </>
                    );
                  })()}
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
              </Accordion>
            </CardContent>
          </Card>
        </div>
        
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Ask a Question</CardTitle>
              <CardDescription>
                Can't find what you're looking for? Ask us directly.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-4">
                <div>
                  <Input placeholder="Subject" className="mb-2" />
                  <textarea 
                    className="min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm" 
                    placeholder="Describe your question or issue..."
                  ></textarea>
                </div>
                <Button className="w-full">Submit Question</Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Contact Support</CardTitle>
          <CardDescription>
            Get help from our support team
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline" className="w-full">
            <a href="mailto:admin@blahblah.com">Send Message</a>
          </Button>
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
