
import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from "sonner";
import { BookmarkIcon, CheckCircle2Icon, FileTextIcon } from 'lucide-react';

interface Message {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  category?: 'management' | 'marketing' | 'hiring' | 'compliance' | 'other';
}

interface SavedAnswer {
  id: number;
  question: string;
  answer: string;
  category: string;
  date: string;
}

const QAAssistantTool = () => {
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [conversation, setConversation] = useState<Message[]>([
    {
      id: 1,
      role: 'assistant',
      content: 'Hello! I\'m your CareGrowthAI assistant. How can I help you today?',
      timestamp: new Date()
    }
  ]);
  const [savedAnswers, setSavedAnswers] = useState<SavedAnswer[]>([
    {
      id: 1,
      question: "What are the best client retention strategies?",
      answer: "Effective client retention strategies include regular check-ins, value-added services, proactive communication, and addressing issues quickly. Set up a system to track client satisfaction and implement a tiered service model.",
      category: "management",
      date: "2023-05-10"
    },
    {
      id: 2,
      question: "How should we structure our social media team?",
      answer: "For an efficient social media team, consider roles like strategist, content creator, community manager, and analyst. Structure depends on agency size, with small agencies often having hybrid roles.",
      category: "marketing",
      date: "2023-05-08"
    }
  ]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!query.trim()) {
      return;
    }

    // Add user message to conversation
    const userMessage: Message = {
      id: conversation.length + 1,
      role: 'user',
      content: query,
      timestamp: new Date()
    };
    
    setConversation([...conversation, userMessage]);
    setQuery('');
    setIsLoading(true);
    
    // Simulate API call with setTimeout
    setTimeout(() => {
      // Randomly determine a category
      const categories = ['management', 'marketing', 'hiring', 'compliance', 'other'] as const;
      const category = categories[Math.floor(Math.random() * categories.length)];
      
      // Generate response based on category
      let response = '';
      
      switch(category) {
        case 'management':
          response = `Based on my analysis, this is a management question.

STEP-BY-STEP APPROACH:

1. Start by establishing clear performance metrics for each client account
2. Implement a tiered service level framework based on client value and needs
3. Develop standardized processes for client onboarding, reporting, and communication
4. Create a feedback loop system to continuously improve service delivery

EXAMPLE:
One of our agency clients increased retention by 32% by implementing a "Client Success Plan" for each account that outlined:
- Clear deliverables and timelines
- Regular strategic review meetings (beyond standard reporting)
- Proactive recommendations based on data insights
- Escalation procedures for when results don't meet expectations

Would you like me to elaborate on any specific aspect of this approach?`;
          break;
          
        case 'marketing':
          response = `This is primarily a marketing question.

STEP-BY-STEP APPROACH:

1. Begin with a comprehensive competitive analysis of your client's market position
2. Develop a multi-channel strategy with primary and secondary platforms based on audience data
3. Create a content calendar with themes aligned to business objectives and seasonal factors
4. Implement a measurement framework focusing on both leading and lagging indicators

EXAMPLE:
A recent case study from a B2B technology client showed that focusing on LinkedIn as primary and email as secondary channel increased qualified leads by 47% in 90 days when content was specifically crafted for each stage of the buyer journey.

KEY METRICS TO TRACK:
- Channel-specific engagement rates
- Content performance by theme
- Lead quality score
- Attribution modeling for conversions

Is there a particular aspect of this strategy you'd like to explore further?`;
          break;
          
        case 'hiring':
          response = `This falls under hiring and team building.

STEP-BY-STEP APPROACH:

1. Define the exact skills needed versus nice-to-have qualifications
2. Create a structured interview process with practical assessments
3. Develop a scoring system for each candidate to reduce bias
4. Implement a 30-60-90 day onboarding plan

EXAMPLE:
One agency reduced their hiring mistakes by 40% by implementing a "working interview" where candidates complete a paid half-day project alongside the team. This revealed both skills and cultural fit in a real-world context.

BEST PRACTICES:
- Use behavioral interviewing techniques
- Check references thoroughly with specific questions
- Consider cultural contribution, not just cultural fit
- Establish clear performance expectations before hiring

Would you like more specific hiring criteria for a particular role?`;
          break;
          
        case 'compliance':
          response = `This question relates to compliance and regulatory issues.

STEP-BY-STEP APPROACH:

1. Conduct a thorough audit of current practices against relevant regulations
2. Develop a compliance calendar for all recurring requirements
3. Implement documentation standards for all client work
4. Create a training program for team members on key regulations

IMPORTANT CONSIDERATIONS:
- GDPR requirements for data handling
- FTC guidelines for transparency in marketing
- Industry-specific regulations that may affect your clients
- Contract terms and service level agreements

EXAMPLE:
A digital marketing agency avoided significant penalties by implementing a quarterly compliance review process that caught outdated consent practices on lead generation campaigns before they became an issue.

Would you like me to focus on a specific aspect of compliance for digital marketing agencies?`;
          break;
          
        default:
          response = `Thank you for your question.

Based on my analysis, here's what I recommend:

1. Start by clearly defining your specific goals and metrics for success
2. Research industry best practices and benchmark your current performance
3. Develop a structured implementation plan with clear timelines
4. Set up a measurement framework to track progress

I'd be happy to provide more detailed guidance if you can share more specific information about your situation.

Is there a particular aspect of this question you'd like me to explore in more depth?`;
      }
      
      const assistantMessage: Message = {
        id: conversation.length + 2,
        role: 'assistant',
        content: response,
        timestamp: new Date(),
        category: category
      };
      
      setActiveCategory(category);
      setConversation(prev => [...prev, assistantMessage]);
      setIsLoading(false);
      
      // Scroll to bottom of chat
      const chatContainer = document.getElementById('chat-container');
      if (chatContainer) {
        chatContainer.scrollTop = chatContainer.scrollHeight;
      }
    }, 2000);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handleClearChat = () => {
    setConversation([
      {
        id: 1,
        role: 'assistant',
        content: 'Hello! I\'m your CareGrowthAI assistant. How can I help you today?',
        timestamp: new Date()
      }
    ]);
    setActiveCategory(null);
    toast.success("Conversation cleared!");
  };

  const handleSaveAnswer = (message: Message) => {
    const lastUserMessage = [...conversation]
      .reverse()
      .find(m => m.role === 'user' && m.id < message.id);
      
    if (!lastUserMessage) return;
    
    const newSavedAnswer = {
      id: Date.now(),
      question: lastUserMessage.content,
      answer: message.content,
      category: message.category || 'other',
      date: new Date().toISOString().split('T')[0]
    };
    
    setSavedAnswers([...savedAnswers, newSavedAnswer]);
    toast.success("Answer saved successfully!");
  };

  const getCategoryLabel = (category: string) => {
    const labels = {
      management: "Management",
      marketing: "Marketing",
      hiring: "Hiring",
      compliance: "Compliance",
      other: "General"
    };
    
    return labels[category as keyof typeof labels] || "General";
  };

  const getCategoryColor = (category: string) => {
    const colors = {
      management: "bg-blue-100 text-blue-800",
      marketing: "bg-purple-100 text-purple-800",
      hiring: "bg-green-100 text-green-800",
      compliance: "bg-orange-100 text-orange-800",
      other: "bg-gray-100 text-gray-800"
    };
    
    return colors[category as keyof typeof colors] || "bg-gray-100 text-gray-800";
  };

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">GPT-Powered Q&A Assistant</h1>
        <p className="text-gray-600 mt-2">Get instant answers to your agency and marketing questions.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3">
          <Card className="flex flex-col h-[calc(100vh-240px)]">
            {activeCategory && (
              <div className="bg-gray-50 px-4 py-2 border-b flex items-center justify-between">
                <div className="flex items-center">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getCategoryColor(activeCategory)}`}>
                    {getCategoryLabel(activeCategory)}
                  </span>
                  <span className="ml-2 text-sm text-gray-500">Category determined based on your question</span>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  className="text-xs"
                  onClick={() => setActiveCategory(null)}
                >
                  Clear Category
                </Button>
              </div>
            )}
            
            <div 
              id="chat-container" 
              className="flex-1 overflow-y-auto p-4 space-y-4"
            >
              {conversation.map((message) => (
                <div 
                  key={message.id}
                  className={`flex ${message.role === 'assistant' ? 'justify-start' : 'justify-end'}`}
                >
                  <div 
                    className={`max-w-[80%] rounded-lg p-4 ${
                      message.role === 'assistant' 
                        ? 'bg-white border shadow-sm' 
                        : 'bg-caregrowth-blue text-white'
                    }`}
                  >
                    <div className="mb-1 text-sm flex justify-between">
                      <div>{message.role === 'assistant' ? 'CareGrowthAI' : 'You'} • {formatTime(message.timestamp)}</div>
                      {message.role === 'assistant' && message.id > 1 && (
                        <button 
                          className="text-gray-400 hover:text-caregrowth-blue transition-colors ml-4"
                          onClick={() => handleSaveAnswer(message)}
                          title="Save answer"
                        >
                          <BookmarkIcon className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                    <div className="whitespace-pre-line">
                      {message.content}
                    </div>
                  </div>
                </div>
              ))}
              
              {isLoading && (
                <div className="flex justify-start">
                  <div className="max-w-[80%] rounded-lg p-4 bg-white border shadow-sm">
                    <div className="mb-1 text-sm">
                      CareGrowthAI is typing...
                    </div>
                    <div className="flex space-x-2">
                      <div className="w-2 h-2 rounded-full bg-gray-300 animate-bounce" style={{ animationDelay: '0ms' }}></div>
                      <div className="w-2 h-2 rounded-full bg-gray-300 animate-bounce" style={{ animationDelay: '150ms' }}></div>
                      <div className="w-2 h-2 rounded-full bg-gray-300 animate-bounce" style={{ animationDelay: '300ms' }}></div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            <div className="border-t p-4">
              <form onSubmit={handleSubmit} className="flex gap-2">
                <Input
                  placeholder="Ask a question..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  disabled={isLoading}
                  className="flex-1"
                />
                <Button 
                  type="submit" 
                  className="bg-caregrowth-blue"
                  disabled={isLoading || !query.trim()}
                >
                  Send
                </Button>
              </form>
            </div>
          </Card>
        </div>
        
        <div>
          <Card className="p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4">Suggested Questions</h2>
            <div className="space-y-2">
              <Button 
                variant="outline" 
                className="w-full justify-start text-left h-auto py-2 px-3"
                onClick={() => setQuery("What are the best practices for social media content strategy?")}
              >
                What are the best practices for social media content strategy?
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start text-left h-auto py-2 px-3"
                onClick={() => setQuery("How can we improve our client retention rate?")}
              >
                How can we improve our client retention rate?
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start text-left h-auto py-2 px-3"
                onClick={() => setQuery("What's the optimal posting frequency for our clients?")}
              >
                What's the optimal posting frequency for our clients?
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start text-left h-auto py-2 px-3"
                onClick={() => setQuery("How can we scale our agency operations efficiently?")}
              >
                How can we scale our agency operations efficiently?
              </Button>
            </div>
          </Card>
          
          <Tabs defaultValue="session">
            <TabsList className="w-full">
              <TabsTrigger value="session" className="flex-1">Session Info</TabsTrigger>
              <TabsTrigger value="saved" className="flex-1">Saved Answers</TabsTrigger>
            </TabsList>
            
            <TabsContent value="session">
              <Card className="p-6">
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Messages Used</p>
                    <p className="text-lg font-semibold">{conversation.filter(m => m.role === 'user').length}/100</p>
                    <div className="w-full h-2 bg-gray-100 rounded-full mt-1">
                      <div 
                        className="h-full bg-caregrowth-blue rounded-full" 
                        style={{ width: `${(conversation.filter(m => m.role === 'user').length / 100) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                  
                  <div>
                    <p className="text-sm font-medium text-gray-500">Chat Categories</p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {['management', 'marketing', 'hiring', 'compliance', 'other'].map(category => {
                        const count = conversation.filter(m => m.category === category).length;
                        if (count === 0) return null;
                        
                        return (
                          <div 
                            key={category}
                            className={`text-xs rounded-full px-2 py-1 ${getCategoryColor(category)}`}
                          >
                            {getCategoryLabel(category)}: {count}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  
                  <div>
                    <Button 
                      variant="outline" 
                      className="w-full" 
                      onClick={handleClearChat}
                    >
                      Clear Conversation
                    </Button>
                  </div>
                </div>
              </Card>
            </TabsContent>
            
            <TabsContent value="saved">
              <Card className="p-6 max-h-[400px] overflow-y-auto">
                {savedAnswers.length === 0 ? (
                  <div className="text-center py-6 text-gray-500">
                    <BookmarkIcon className="h-8 w-8 mx-auto opacity-20 mb-2" />
                    <p>No saved answers yet</p>
                    <p className="text-xs mt-2">Click the bookmark icon on any answer to save it</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {savedAnswers.map(item => (
                      <div key={item.id} className="border rounded-md p-3 hover:bg-gray-50">
                        <div className="flex justify-between items-center mb-2">
                          <div className={`text-xs rounded-full px-2 py-0.5 ${getCategoryColor(item.category)}`}>
                            {getCategoryLabel(item.category)}
                          </div>
                          <div className="text-xs text-gray-500">
                            {item.date}
                          </div>
                        </div>
                        <p className="font-medium text-sm mb-1">{item.question}</p>
                        <p className="text-xs text-gray-700 line-clamp-2">{item.answer}</p>
                        <div className="flex justify-end mt-2">
                          <Button variant="ghost" size="sm" className="h-8 text-xs">
                            <FileTextIcon className="h-3 w-3 mr-1" /> View
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default QAAssistantTool;
