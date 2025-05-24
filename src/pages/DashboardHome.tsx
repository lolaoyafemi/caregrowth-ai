import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { Progress } from '@/components/ui/progress';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Coins, HelpCircle, FileText, MessageCircle } from 'lucide-react';

const DashboardHome = () => {
  // Sample data for usage metrics
  const usageMetrics = {
    socialContent: { used: 24, total: 50, percent: 48 },
    documentSearch: { used: 3, total: 5, percent: 60 },
    qaAssistant: { used: 62, total: 100, percent: 62 },
    creditsLeft: 11250,
    monthlyUsage: 3750,
  };

  return (
    <div className="p-6">
      <div className="mb-8 flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Welcome to CareGrowthAI</h1>
          <p className="text-gray-600 mt-2">Your AI-powered agency growth assistant</p>
        </div>
        
        {/* Credit Balance Module */}
        <Card className="w-64 bg-gradient-to-br from-caregrowth-lightblue to-white border-caregrowth-blue">
          <CardHeader className="pb-2">
            <div className="flex justify-between items-center">
              <CardTitle className="text-lg font-semibold flex items-center">
                <Coins className="mr-2 h-5 w-5 text-caregrowth-blue" />
                Credit Balance
              </CardTitle>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="h-4 w-4 text-gray-400" />
                  </TooltipTrigger>
                  <TooltipContent className="w-80 p-2">
                    <p>Credits power all AI features. Each generation consumes credits from your agency wallet.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-gray-600">Available Credits</span>
              <span className="font-bold text-xl">{usageMetrics.creditsLeft.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center mb-4 text-xs text-gray-500">
              <span>Used this month: {usageMetrics.monthlyUsage.toLocaleString()}</span>
            </div>
            <Button className="w-full bg-caregrowth-blue hover:bg-caregrowth-blue/90 transition-all duration-200">
              Buy More Credits
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <Card className="overflow-hidden transition-all duration-200 hover:shadow-lg">
          <CardHeader className="pb-3">
            <div className="flex justify-between items-center">
              <CardTitle>Social Media Post</CardTitle>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="h-4 w-4 text-gray-400" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Generate engaging social posts and content for your clients</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <CardDescription>Boost client engagement with AI</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{usageMetrics.socialContent.used}/{usageMetrics.socialContent.total}</div>
            <div className="space-y-1 mt-3">
              <div className="flex justify-between text-xs">
                <span>Usage</span>
                <span>{usageMetrics.socialContent.percent}%</span>
              </div>
              <Progress value={usageMetrics.socialContent.percent} className="h-2" />
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden transition-all duration-200 hover:shadow-lg">
          <CardHeader className="pb-3">
            <div className="flex justify-between items-center">
              <CardTitle>Research & Analysis</CardTitle>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="h-4 w-4 text-gray-400" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Search across documents to extract insights and information</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <CardDescription>Extract insights from documents</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{usageMetrics.documentSearch.used}/{usageMetrics.documentSearch.total}</div>
            <div className="space-y-1 mt-3">
              <div className="flex justify-between text-xs">
                <span>Usage</span>
                <span>{usageMetrics.documentSearch.percent}%</span>
              </div>
              <Progress value={usageMetrics.documentSearch.percent} className="h-2" />
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden transition-all duration-200 hover:shadow-lg">
          <CardHeader className="pb-3">
            <div className="flex justify-between items-center">
              <CardTitle>Customer Support AI</CardTitle>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="h-4 w-4 text-gray-400" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Answer client questions instantly with AI-powered responses</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <CardDescription>Instant answers to client questions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{usageMetrics.qaAssistant.used}/{usageMetrics.qaAssistant.total}</div>
            <div className="space-y-1 mt-3">
              <div className="flex justify-between text-xs">
                <span>Usage</span>
                <span>{usageMetrics.qaAssistant.percent}%</span>
              </div>
              <Progress value={usageMetrics.qaAssistant.percent} className="h-2" />
            </div>
          </CardContent>
        </Card>
      </div>

      <h2 className="text-2xl font-semibold mb-6">AI Solutions</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="transition-transform duration-200 hover:scale-[1.02] hover:shadow-md">
          <CardHeader>
            <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-caregrowth-lightblue mb-4">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-caregrowth-blue">
                <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M7 10H9V17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M15 10H17L15 13.5H17V17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M11 10H13V17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M8 7H8.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <CardTitle>Social Media Content</CardTitle>
            <CardDescription>Generate engaging posts that drive client engagement and growth</CardDescription>
          </CardHeader>
          <CardContent>
            <Link to="/dashboard/social-media">
              <Button className="w-full bg-caregrowth-blue hover:bg-caregrowth-blue/90 transition-all duration-200">
                Create Your Next Post
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="transition-transform duration-200 hover:scale-[1.02] hover:shadow-md">
          <CardHeader>
            <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-caregrowth-lightgreen mb-4">
              <FileText className="h-6 w-6 text-caregrowth-green" />
            </div>
            <CardTitle>Document Search</CardTitle>
            <CardDescription>Extract insights and analyze data from your agency documents</CardDescription>
          </CardHeader>
          <CardContent>
            <Link to="/dashboard/document-search">
              <Button className="w-full bg-caregrowth-green hover:bg-caregrowth-green/90 transition-all duration-200">
                Analyze Documents
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="transition-transform duration-200 hover:scale-[1.02] hover:shadow-md">
          <CardHeader>
            <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-caregrowth-lightblue mb-4">
              <MessageCircle className="h-6 w-6 text-caregrowth-blue" />
            </div>
            <CardTitle>Q&A Assistant</CardTitle>
            <CardDescription>Get instant, accurate answers to client and team questions</CardDescription>
          </CardHeader>
          <CardContent>
            <Link to="/dashboard/qa-assistant">
              <Button className="w-full bg-caregrowth-blue hover:bg-caregrowth-blue/90 transition-all duration-200">
                Answer Questions
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DashboardHome;
