import React, { useState, useEffect } from 'react';
import { toast } from "sonner";
import { useQAAssistant } from '@/hooks/useQAAssistant';
import { useUser } from '@/contexts/UserContext';
import { useUserCredits } from '@/hooks/useUserCredits';
import { useFeelingStuckPopup } from '@/hooks/useFeelingStuckPopup';
import FeelingStuckPopup from '@/components/ui/FeelingStuckPopup';
import ChatInterface from '@/components/qa/ChatInterface';
import QASidebar from '@/components/qa/QASidebar';
import QAHeader from '@/components/qa/QAHeader';

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
  const { credits, loading: creditsLoading } = useUserCredits();
  
  const { showPopup, closePopup } = useFeelingStuckPopup({
    delayMs: 180000,
    enabled: !!user
  });

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
    closePopup();
  };

  return (
    <div className="p-6">
      <QAHeader credits={credits} creditsLoading={creditsLoading} />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3">
          <ChatInterface
            conversation={conversation}
            query={query}
            setQuery={setQuery}
            onSubmit={handleSubmit}
            onSaveAnswer={handleSaveAnswer}
            onClearChat={handleClearChat}
            isLoading={isLoading}
            user={user}
            activeCategory={activeCategory}
            setActiveCategory={setActiveCategory}
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

      {showPopup && (
        <FeelingStuckPopup 
          onClose={closePopup}
          onContactSue={handleContactSue}
        />
      )}
    </div>
  );
};

export default QAAssistantTool;
