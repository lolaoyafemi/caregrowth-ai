
import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { BookmarkIcon } from 'lucide-react';

interface Message {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  category?: 'management' | 'marketing' | 'hiring' | 'compliance' | 'other';
}

interface ChatInterfaceProps {
  conversation: Message[];
  query: string;
  setQuery: (query: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onSaveAnswer: (message: Message) => void;
  onClearChat: () => void;
  isLoading: boolean;
  user: any;
  activeCategory: string | null;
  setActiveCategory: (category: string | null) => void;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({
  conversation,
  query,
  setQuery,
  onSubmit,
  onSaveAnswer,
  onClearChat,
  isLoading,
  user,
  activeCategory,
  setActiveCategory
}) => {
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
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
              <div className="mb-1 text-sm flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span>{message.role === 'assistant' ? 'Jared' : 'You'} • {formatTime(message.timestamp)}</span>
                </div>
                {message.role === 'assistant' && message.id > 1 && (
                  <button 
                    className="text-gray-400 hover:text-caregrowth-blue transition-colors ml-4"
                    onClick={() => onSaveAnswer(message)}
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
                Jared is thinking...
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
        <form onSubmit={onSubmit} className="flex gap-2">
          <Input
            placeholder="Ask Jared about agency management, marketing, hiring, or compliance..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            disabled={isLoading}
            className="flex-1"
          />
          <Button 
            type="submit" 
            className="bg-caregrowth-blue"
            disabled={isLoading || !query.trim() || !user}
          >
            Send
          </Button>
        </form>
        {!user && (
          <p className="text-sm text-gray-500 mt-2">Please log in to use Ask Jared</p>
        )}
      </div>
    </Card>
  );
};

export default ChatInterface;
