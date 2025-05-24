
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const HelpPage = () => {
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

export default HelpPage;
