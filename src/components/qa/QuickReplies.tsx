import React from 'react';
import { Button } from '@/components/ui/button';
import { MessageSquare, Users, TrendingUp, Shield, FileText } from 'lucide-react';

interface QuickRepliesProps {
  onQuickReply: (question: string) => void;
  isLoading: boolean;
}

const quickReplies = [
  {
    icon: Users,
    category: 'Management',
    questions: [
      'How can I improve team productivity?',
      'What are effective delegation strategies?',
      'How do I handle difficult employees?',
      'Best practices for remote team management?'
    ]
  },
  {
    icon: TrendingUp,
    category: 'Marketing',  
    questions: [
      'How to create effective marketing campaigns?',
      'What are the best social media strategies?',
      'How to measure ROI on marketing spend?',
      'Tips for improving brand awareness?'
    ]
  },
  {
    icon: FileText,
    category: 'Hiring',
    questions: [
      'How to write compelling job descriptions?',
      'What questions should I ask in interviews?',
      'How to assess cultural fit?',
      'Best practices for onboarding new hires?'
    ]
  },
  {
    icon: Shield,
    category: 'Compliance',
    questions: [
      'What compliance requirements should I know?',
      'How to ensure data privacy compliance?',
      'Employment law basics for agencies?',
      'How to handle workplace safety requirements?'
    ]
  }
];

const QuickReplies: React.FC<QuickRepliesProps> = ({ onQuickReply, isLoading }) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <MessageSquare className="h-4 w-4" />
        <span>Quick questions to get started:</span>
      </div>
      
      <div className="grid gap-4">
        {quickReplies.map((category) => {
          const Icon = category.icon;
          return (
            <div key={category.category} className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Icon className="h-4 w-4" />
                <span>{category.category}</span>
              </div>
              
              <div className="grid gap-2">
                {category.questions.map((question, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    className="justify-start text-left h-auto py-2 px-3 whitespace-normal"
                    disabled={isLoading}
                    onClick={() => onQuickReply(question)}
                  >
                    {question}
                  </Button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default QuickReplies;