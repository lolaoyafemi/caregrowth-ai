
import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from "sonner";

interface Message {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const QAAssistantTool = () => {
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversation, setConversation] = useState<Message[]>([
    {
      id: 1,
      role: 'assistant',
      content: 'Hello! I\'m your CareGrowthAI assistant. How can I help you today?',
      timestamp: new Date()
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
      const responses = [
        "Based on industry best practices, I'd recommend focusing on three key aspects: consistent messaging across platforms, authentic engagement with your audience, and data-driven content strategy. Our most successful agency clients have found that authentic, value-driven content performs 2-3x better than purely promotional material.",
        "Looking at current trends, the most effective strategy would be to implement a multi-channel approach that leverages both organic and paid methods. Start with identifying your client's core audience segments, develop tailored messaging for each segment, and then deploy across appropriate channels with consistent measurement and optimization.",
        "From my analysis, the optimal frequency depends on the platform and your specific audience. For most B2B clients, LinkedIn posts 3-4 times per week show the best engagement rates, while B2C clients on Instagram may benefit from daily posts. I'd recommend starting with a moderate frequency and adjusting based on engagement metrics over a 30-day period.",
        "The most common issue agencies face when scaling is maintaining quality while increasing capacity. I'd recommend: 1) Developing clear processes and documentation for all services, 2) Implementing tiered QA review systems, 3) Utilizing project management software with automated workflows, and 4) Considering a pod-based team structure where each client has a dedicated cross-functional team."
      ];
      
      const assistantMessage: Message = {
        id: conversation.length + 2,
        role: 'assistant',
        content: responses[Math.floor(Math.random() * responses.length)],
        timestamp: new Date()
      };
      
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
    toast.success("Conversation cleared!");
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
                    <div className="mb-1 text-sm">
                      {message.role === 'assistant' ? 'CareGrowthAI' : 'You'} • {formatTime(message.timestamp)}
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
          
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">Session Info</h2>
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
        </div>
      </div>
    </div>
  );
};

export default QAAssistantTool;
