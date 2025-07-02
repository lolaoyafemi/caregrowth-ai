
import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileTextIcon } from 'lucide-react';

interface Message {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  category?: 'management' | 'marketing' | 'hiring' | 'compliance' | 'other';
}

interface QASidebarProps {
  onSuggestedQuestionClick: (question: string) => void;
  conversation: Message[];
  onClearChat: () => void;
  qaHistory: any[];
  isLoading: boolean;
}

const QASidebar: React.FC<QASidebarProps> = ({
  onSuggestedQuestionClick,
  conversation,
  onClearChat,
  qaHistory,
  isLoading
}) => {
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

  const suggestedQuestions = [
    "What are the best practices for social media content strategy?",
    "How can we improve our client retention rate?",
    "What's the optimal posting frequency for our clients?",
    "How can we scale our agency operations efficiently?"
  ];

  return (
    <div className="h-full overflow-y-auto">
      <Card className="p-4 mb-6">
        <h2 className="text-lg font-semibold mb-4">Suggested Questions</h2>
        <div className="space-y-3">
          {suggestedQuestions.map((question, index) => (
            <Button 
              key={index}
              variant="outline" 
              className="w-full justify-start text-left h-auto py-3 px-3 whitespace-normal leading-relaxed text-sm"
              onClick={() => onSuggestedQuestionClick(question)}
              disabled={isLoading}
            >
              <span className="block">{question}</span>
            </Button>
          ))}
        </div>
      </Card>
      
      <Tabs defaultValue="session">
        <TabsList className="w-full">
          <TabsTrigger value="session" className="flex-1">Session Info</TabsTrigger>
          <TabsTrigger value="history" className="flex-1">Ask Jared History</TabsTrigger>
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
                  onClick={onClearChat}
                  disabled={isLoading}
                >
                  Clear Conversation
                </Button>
              </div>
            </div>
          </Card>
        </TabsContent>
        
        <TabsContent value="history">
          <Card className="p-6 max-h-[400px] overflow-y-auto">
            {qaHistory.length === 0 ? (
              <div className="text-center py-6 text-gray-500">
                <FileTextIcon className="h-8 w-8 mx-auto opacity-20 mb-2" />
                <p>No Ask Jared history yet</p>
                <p className="text-xs mt-2">Your questions and answers will appear here</p>
              </div>
            ) : (
              <div className="space-y-4">
                {qaHistory.map(item => (
                  <div key={item.id} className="border rounded-md p-3 hover:bg-gray-50">
                    <div className="flex justify-between items-center mb-2">
                      <div className={`text-xs rounded-full px-2 py-0.5 ${getCategoryColor(item.category || 'other')}`}>
                        {getCategoryLabel(item.category || 'other')}
                      </div>
                      <div className="text-xs text-gray-500">
                        {new Date(item.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    <p className="font-medium text-sm mb-1">{item.question}</p>
                    <p className="text-xs text-gray-700 line-clamp-2">{item.response}</p>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default QASidebar;
