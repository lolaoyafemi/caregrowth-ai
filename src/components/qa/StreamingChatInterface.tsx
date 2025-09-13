import React, { useState, useRef, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { BookmarkIcon, X, Loader2, Send } from 'lucide-react';
import { cn } from '@/lib/utils';
import QuickReplies from './QuickReplies';
import PerformanceMonitor from './PerformanceMonitor';

interface Message {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  category?: string;
  isStreaming?: boolean;
  responseTime?: number;
}

interface StreamingChatInterfaceProps {
  conversation: Message[];
  query: string;
  setQuery: (query: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onSaveAnswer: (message: Message) => void;
  onClearChat: () => void;
  onCancelRequest: () => void;
  isLoading: boolean;
  isStreaming: boolean;
  user: any;
  activeCategory: string | null;
  setActiveCategory: (category: string | null) => void;
  connectionStatus: 'connected' | 'disconnected' | 'reconnecting';
  metrics: any;
  cacheSize: number;
  onQuickReply: (question: string) => void;
}

const StreamingChatInterface: React.FC<StreamingChatInterfaceProps> = ({
  conversation,
  query,
  setQuery,
  onSubmit,
  onSaveAnswer,
  onClearChat,
  onCancelRequest,
  isLoading,
  isStreaming,
  user,
  activeCategory,
  setActiveCategory,
  connectionStatus,
  metrics,
  cacheSize,
  onQuickReply
}) => {
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const [showPerformanceMonitor, setShowPerformanceMonitor] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when new messages are added
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [conversation]);

  // Focus input when not loading
  useEffect(() => {
    if (!isLoading && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isLoading]);

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

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSubmit(e);
    }
  };

  const handleQuickReply = (question: string) => {
    setQuery(question);
    setShowQuickReplies(false);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const renderTypingIndicator = () => (
    <div className="flex justify-start">
      <div className="max-w-[80%] rounded-lg p-4 bg-white border shadow-sm">
        <div className="mb-1 text-sm flex items-center gap-2">
          <span>Jared is thinking</span>
          <Loader2 className="h-3 w-3 animate-spin" />
        </div>
        <div className="flex space-x-2">
          <div className="w-2 h-2 rounded-full bg-gray-300 animate-bounce" style={{ animationDelay: '0ms' }}></div>
          <div className="w-2 h-2 rounded-full bg-gray-300 animate-bounce" style={{ animationDelay: '150ms' }}></div>
          <div className="w-2 h-2 rounded-full bg-gray-300 animate-bounce" style={{ animationDelay: '300ms' }}></div>
        </div>
      </div>
    </div>
  );

  const renderSkeletonLoader = () => (
    <div className="flex justify-start">
      <div className="max-w-[80%] rounded-lg p-4 bg-white border shadow-sm space-y-2">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-4 w-16" />
        </div>
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-5/6" />
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-[calc(100vh-240px)]">
      {/* Category and Performance Monitor Header */}
      <div className="flex flex-wrap gap-4 mb-4">
        {/* Active Category */}
        {activeCategory && (
          <div className="bg-gray-50 px-4 py-2 border rounded-lg flex items-center justify-between">
            <div className="flex items-center">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getCategoryColor(activeCategory)}`}>
                {getCategoryLabel(activeCategory)}
              </span>
              <span className="ml-2 text-sm text-gray-500">Category determined based on your question</span>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              className="text-xs ml-4"
              onClick={() => setActiveCategory(null)}
            >
              Clear Category
            </Button>
          </div>
        )}

        {/* Performance Monitor Toggle */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowPerformanceMonitor(!showPerformanceMonitor)}
          className="text-xs"
        >
          {showPerformanceMonitor ? 'Hide' : 'Show'} Performance
        </Button>
      </div>

      {/* Performance Monitor */}
      {showPerformanceMonitor && (
        <PerformanceMonitor
          metrics={metrics}
          connectionStatus={connectionStatus}
          cacheSize={cacheSize}
          isStreaming={isStreaming}
          className="mb-4"
        />
      )}

      {/* Chat Container */}
      <Card className="flex-1 flex flex-col">
        <div 
          ref={chatContainerRef}
          className="flex-1 overflow-y-auto p-4 space-y-4"
        >
          {conversation.map((message) => (
            <div 
              key={message.id}
              className={cn(
                "flex",
                message.role === 'assistant' ? 'justify-start' : 'justify-end'
              )}
            >
              <div 
                className={cn(
                  "max-w-[80%] rounded-lg p-4",
                  message.role === 'assistant' 
                    ? 'bg-white border shadow-sm' 
                    : 'bg-primary text-primary-foreground'
                )}
              >
                <div className="mb-1 text-sm flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span>
                      {message.role === 'assistant' ? 'Jared' : 'You'} • {formatTime(message.timestamp)}
                    </span>
                    {message.responseTime && (
                      <span className="text-xs text-muted-foreground">
                        ({message.responseTime}ms)
                      </span>
                    )}
                  </div>
                  {message.role === 'assistant' && message.id > 1 && !message.isStreaming && (
                    <button 
                      className="text-gray-400 hover:text-primary transition-colors ml-4"
                      onClick={() => onSaveAnswer(message)}
                      title="Save answer"
                    >
                      <BookmarkIcon className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <div className={cn(
                  "whitespace-pre-line",
                  message.isStreaming && "animate-pulse"
                )}>
                  {message.content}
                  {message.isStreaming && <span className="animate-pulse">|</span>}
                </div>
              </div>
            </div>
          ))}
          
          {/* Loading States */}
          {isLoading && !isStreaming && renderTypingIndicator()}
          {isLoading && isStreaming && renderSkeletonLoader()}
        </div>
        
        {/* Input Area */}
        <div className="border-t p-4 space-y-3">
          {/* Quick Replies Toggle */}
          {conversation.length <= 1 && (
            <div className="flex justify-center">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowQuickReplies(!showQuickReplies)}
                className="text-xs"
              >
                {showQuickReplies ? 'Hide' : 'Show'} Quick Questions
              </Button>
            </div>
          )}

          {/* Quick Replies */}
          {showQuickReplies && (
            <div className="border rounded-lg p-4 bg-gray-50">
              <QuickReplies onQuickReply={handleQuickReply} isLoading={isLoading} />
            </div>
          )}

          {/* Input Form */}
          <form onSubmit={onSubmit} className="flex gap-2">
            <Input
              ref={inputRef}
              placeholder="Ask Jared about agency management, marketing, hiring, or compliance..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={isLoading}
              className="flex-1"
              autoComplete="off"
            />
            
            {isLoading ? (
              <Button 
                type="button"
                variant="outline"
                onClick={onCancelRequest}
                disabled={!isStreaming}
                className="shrink-0"
              >
                <X className="h-4 w-4" />
              </Button>
            ) : (
              <Button 
                type="submit" 
                disabled={!query.trim() || !user}
                className="shrink-0"
              >
                <Send className="h-4 w-4" />
              </Button>
            )}
          </form>
          
          {!user && (
            <p className="text-sm text-muted-foreground text-center">
              Please log in to use Ask Jared
            </p>
          )}

          {/* Connection Status */}
          {connectionStatus !== 'connected' && (
            <div className="text-center">
              <div className={cn(
                "inline-flex items-center gap-2 text-xs px-2 py-1 rounded",
                connectionStatus === 'disconnected' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
              )}>
                {connectionStatus === 'reconnecting' ? 'Reconnecting...' : 'Disconnected'}
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default StreamingChatInterface;