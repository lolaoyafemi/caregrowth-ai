import React, { useState, useEffect } from 'react';
import { toast } from "sonner";
import { useOptimizedQA } from '@/hooks/useOptimizedQA';
import { useUser } from '@/contexts/UserContext';
import { useUserCredits } from '@/hooks/useUserCredits';
import StreamingChatInterface from '@/components/qa/StreamingChatInterface';
import QASidebar from '@/components/qa/QASidebar';
import QAHeader from '@/components/qa/QAHeader';
import ErrorBoundary from '@/components/common/ErrorBoundary';

interface Message {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  category?: 'management' | 'marketing' | 'hiring' | 'compliance' | 'other';
  isStreaming?: boolean;
  responseTime?: number;
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

  const { 
    askQuestion, 
    getQAHistory, 
    cancelRequest, 
    isLoading, 
    isStreaming, 
    error, 
    connectionStatus, 
    metrics, 
    cacheSize 
  } = useOptimizedQA();
  const { user } = useUser();
  const { credits, loading: creditsLoading } = useUserCredits();
  

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

  useEffect(() => {
    if (user) {
      const savedConversation = loadConversationFromStorage();
      
      if (savedConversation && savedConversation.length > 0) {
        setConversation(savedConversation);
      } else {
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
      setConversation([]);
    }
  }, [user]);

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
    
    setConversation(prev => [...prev, userMessage]);
    
    const currentQuery = query;
    setQuery('');
    
    // Create streaming message placeholder
    const streamingMessageId = Date.now() + 1;
    const streamingMessage: Message = {
      id: streamingMessageId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isStreaming: true
    };
    
    setConversation(prev => [...prev, streamingMessage]);
    
    // Get conversation history for context
    const conversationHistory = conversation.slice(-6).map(msg => ({
      role: msg.role,
      content: msg.content
    }));
    
    const response = await askQuestion(
      currentQuery,
      conversationHistory,
      // Stream callback
      (chunk: string, fullResponse: string) => {
        setConversation(prev => 
          prev.map(msg => 
            msg.id === streamingMessageId
              ? { ...msg, content: fullResponse, isStreaming: true }
              : msg
          )
        );
      }
    );
    
    if (response) {
      // Update final message
      setConversation(prev => 
        prev.map(msg => 
          msg.id === streamingMessageId
            ? { 
                ...msg, 
                content: response.answer, 
                category: response.category as any,
                isStreaming: false,
                responseTime: response.responseTime
              }
            : msg
        )
      );
      
      setActiveCategory(response.category);
      
      const updatedHistory = await getQAHistory();
      setQAHistory(updatedHistory);
    } else {
      // Remove streaming message if failed
      setConversation(prev => prev.filter(msg => msg.id !== streamingMessageId));
      if (error) {
        toast.error(error);
      }
    }
  };
  
  const handleQuickReply = (question: string) => {
    setQuery(question);
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

  const handleContactSue = () => {
    toast.success("We'll add Sue's contact details here soon!");
  };

  return (
    <ErrorBoundary>
      <div className="p-6">
        {/* Jared Description */}
        <div className="mb-8 bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg border border-blue-100">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Jared – Your Business Assistant</h2>
          <p className="text-gray-700 mb-3">
            Jared is your on-demand business assistant. It answers questions, explains strategies, and helps you work through challenges with clear guidance. Think of it as a reliable teammate available 24/7.
          </p>
          <p className="text-sm text-gray-600">
            <strong>What do you get?</strong> Instant support, clear direction, and actionable solutions.
          </p>
        </div>

        <QAHeader credits={credits} creditsLoading={creditsLoading} />

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3">
            <StreamingChatInterface
              conversation={conversation}
              query={query}
              setQuery={setQuery}
              onSubmit={handleSubmit}
              onSaveAnswer={handleSaveAnswer}
              onClearChat={handleClearChat}
              onCancelRequest={cancelRequest}
              isLoading={isLoading}
              isStreaming={isStreaming}
              user={user}
              activeCategory={activeCategory}
              setActiveCategory={setActiveCategory}
              connectionStatus={connectionStatus}
              metrics={metrics}
              cacheSize={cacheSize}
              onQuickReply={handleQuickReply}
            />
          </div>
          
          <div>
            <QASidebar
              onSuggestedQuestionClick={setQuery}
              conversation={conversation}
              onClearChat={handleClearChat}
              qaHistory={qaHistory}
              isLoading={isLoading}
            />
          </div>
        </div>

      </div>
    </ErrorBoundary>
  );
};

export default QAAssistantTool;
