import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from "sonner";
import { BookmarkIcon, CheckCircle2Icon, FileTextIcon } from 'lucide-react';
import { useQAAssistant } from '@/hooks/useQAAssistant';
import { useUser } from '@/contexts/UserContext';

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
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [conversation, setConversation] = useState<Message[]>([]);
  const [savedAnswers, setSavedAnswers] = useState<SavedAnswer[]>([]);
  const [qaHistory, setQAHistory] = useState<any[]>([]);

  const { askQuestion, getQAHistory, isLoading, error } = useQAAssistant();
  const { user } = useUser();

  // Save conversation to localStorage whenever it changes
  const saveConversationToStorage = (conversationData: Message[]) => {
    if (user && conversationData.length > 0) {
      try {
        localStorage.setItem(`qa-conversation-${user.id}`, JSON.stringify(conversationData));
        console.log('Conversation saved to localStorage');
      } catch (error) {
        console.error('Error saving conversation:', error);
      }
    }
  };

  // Load conversation from localStorage
  const loadConversationFromStorage = () => {
    if (!user) return null;
    
    try {
      const savedConversation = localStorage.getItem(`qa-conversation-${user.id}`);
      if (savedConversation) {
        const parsedConversation = JSON.parse(savedConversation).map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        }));
        console.log('Conversation loaded from localStorage:', parsedConversation.length, 'messages');
        return parsedConversation;
      }
    } catch (error) {
      console.error('Error loading conversation from localStorage:', error);
    }
    return null;
  };

  // Initialize conversation on component mount and user change
  useEffect(() => {
    if (user) {
      const savedConversation = loadConversationFromStorage();
      
      if (savedConversation && savedConversation.length > 0) {
        setConversation(savedConversation);
      } else {
        // Start with default welcome message
        const welcomeMessage: Message = {
          id: 1,
          role: 'assistant',
          content: 'Hello! I\'m Jared, your CareGrowthAI assistant. I can help you with questions about agency management, marketing strategies, hiring, compliance, and more. How can I help you today?',
          timestamp: new Date()
        };
        setConversation([welcomeMessage]);
        saveConversationToStorage([welcomeMessage]);
      }
    } else {
      // Clear conversation if user logs out
      setConversation([]);
    }
  }, [user]);

  // Save conversation whenever it changes
  useEffect(() => {
    if (conversation.length > 0) {
      saveConversationToStorage(conversation);
    }
  }, [conversation, user]);

  useEffect(() => {
    const loadHistory = async () => {
      const history = await getQAHistory();
      setQAHistory(history);
    };

    if (user) {
      loadHistory();
    }
  }, [user, getQAHistory]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!query.trim()) {
      return;
    }

    if (!user) {
      toast.error("Please log in to use Ask Jared");
      return;
    }

    const userMessage: Message = {
      id: Date.now(),
      role: 'user',
      content: query,
      timestamp: new Date()
    };
    
    setConversation(prev => {
      const updated = [...prev, userMessage];
      return updated;
    });
    
    const currentQuery = query;
    setQuery('');
    
    const response = await askQuestion(currentQuery);
    
    if (response) {
      const assistantMessage: Message = {
        id: Date.now() + 1,
        role: 'assistant',
        content: response.answer,
        timestamp: new Date(),
        category: response.category as any
      };
      
      setActiveCategory(response.category);
      setConversation(prev => {
        const updated = [...prev, assistantMessage];
        return updated;
      });
      
      const updatedHistory = await getQAHistory();
      setQAHistory(updatedHistory);
      
      setTimeout(() => {
        const chatContainer = document.getElementById('chat-container');
        if (chatContainer) {
          chatContainer.scrollTop = chatContainer.scrollHeight;
        }
      }, 100);
    } else if (error) {
      toast.error(error);
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handleClearChat = () => {
    const defaultMessage: Message = {
      id: 1,
      role: 'assistant',
      content: 'Hello! I\'m Jared, your CareGrowthAI assistant. I can help you with questions about agency management, marketing strategies, hiring, compliance, and more. How can I help you today?',
      timestamp: new Date()
    };
    
    setConversation([defaultMessage]);
    setActiveCategory(null);
    
    // Clear from localStorage
    if (user) {
      try {
        localStorage.removeItem(`qa-conversation-${user.id}`);
        console.log('Conversation cleared from localStorage');
      } catch (error) {
        console.error('Error clearing conversation:', error);
      }
    }
    
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
        <h1 className="text-3xl font-bold text-gray-900">Ask Jared</h1>
        <p className="text-gray-600 mt-2">Get instant answers to your agency and marketing questions powered by your documents and AI expertise.</p>
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
                    <div className="mb-1 text-sm flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <span>{message.role === 'assistant' ? 'Jared' : 'You'} • {formatTime(message.timestamp)}</span>
                      </div>
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
              <form onSubmit={handleSubmit} className="flex gap-2">
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
        </div>
        
        <div>
          <Card className="p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4">Suggested Questions</h2>
            <div className="space-y-2">
              <Button 
                variant="outline" 
                className="w-full justify-start text-left h-auto py-2 px-3"
                onClick={() => setQuery("What are the best practices for social media content strategy?")}
                disabled={isLoading}
              >
                What are the best practices for social media content strategy?
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start text-left h-auto py-2 px-3"
                onClick={() => setQuery("How can we improve our client retention rate?")}
                disabled={isLoading}
              >
                How can we improve our client retention rate?
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start text-left h-auto py-2 px-3"
                onClick={() => setQuery("What's the optimal posting frequency for our clients?")}
                disabled={isLoading}
              >
                What's the optimal posting frequency for our clients?
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start text-left h-auto py-2 px-3"
                onClick={() => setQuery("How can we scale our agency operations efficiently?")}
                disabled={isLoading}
              >
                How can we scale our agency operations efficiently?
              </Button>
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
                      onClick={handleClearChat}
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
      </div>
    </div>
  );
};

export default QAAssistantTool;
