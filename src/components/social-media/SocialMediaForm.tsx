
import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useUserCredits } from '@/hooks/useUserCredits';
import { validateCreditsBeforeAction } from '@/utils/creditValidation';
import { toast } from "sonner";

interface SocialMediaFormProps {
  audience: string;
  setAudience: (value: string) => void;
  contentCategory: string;
  setContentCategory: (value: string) => void;
  toneOfPost: string;
  setToneOfPost: (value: string) => void;
  subject: string;
  setSubject: (value: string) => void;
  onGenerate: () => void;
  isGenerating: boolean;
  businessProfile: any;
  onShowBusinessForm: () => void;
}

const SocialMediaForm: React.FC<SocialMediaFormProps> = ({
  audience,
  setAudience,
  contentCategory,
  setContentCategory,
  toneOfPost,
  setToneOfPost,
  subject,
  setSubject,
  onGenerate,
  isGenerating,
  businessProfile,
  onShowBusinessForm
}) => {
  const { credits } = useUserCredits();

  const isBusinessProfileComplete = () => {
    if (!businessProfile) return false;
    
    // Check required fields from business details form
    const requiredFields = [
      'business_name',
      'location', 
      'core_service'
    ];
    
    return requiredFields.every(field => 
      businessProfile[field] && businessProfile[field].trim() !== ''
    );
  };

  const handleGenerate = () => {
    if (!isBusinessProfileComplete()) {
      toast.error("Please complete your business details first to generate content.", {
        duration: 5000,
        action: {
          label: "Add Details",
          onClick: onShowBusinessForm
        }
      });
      return;
    }

    if (validateCreditsBeforeAction(credits, 'Social Media Content Generator')) {
      onGenerate();
    }
  };

  const isButtonDisabled = isGenerating || credits <= 0 || !isBusinessProfileComplete();
  const getButtonText = () => {
    if (isGenerating) return "Generating Content...";
    if (!isBusinessProfileComplete()) return "Complete Business Details First";
    return "Generate Content";
  };

  return (
    <Card className="p-6 mb-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <div className="mb-4">
            <Label htmlFor="subject">Subject of Post</Label>
            <Input
              id="subject"
              placeholder="What do you want to talk about?"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>
          <div className="mb-4">
            <Label htmlFor="audience">Target Audience</Label>
            <Input
              id="audience"
              placeholder="e.g. dementia patients, autistic children"
              value={audience}
              onChange={(e) => setAudience(e.target.value)}
            />
          </div>
        </div>
        <div>
          <div className="mb-4">
            <Label htmlFor="tone">Tone of Post</Label>
            <Select value={toneOfPost} onValueChange={setToneOfPost}>
              <SelectTrigger>
                <SelectValue placeholder="Select tone" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="professional">Professional</SelectItem>
                <SelectItem value="conversational">Conversational</SelectItem>
                <SelectItem value="enthusiastic">Enthusiastic</SelectItem>
                <SelectItem value="authoritative">Authoritative</SelectItem>
                <SelectItem value="humorous">Humorous</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="mb-4">
            <Label htmlFor="contentCategory">Type of Content</Label>
            <Select value={contentCategory} onValueChange={setContentCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Select content type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="attract">Attract</SelectItem>
                <SelectItem value="connect">Connect</SelectItem>
                <SelectItem value="transact">Transact</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="mt-8">
            <Button 
              className="w-full bg-caregrowth-blue text-white"
              onClick={handleGenerate}
              disabled={isButtonDisabled}
            >
              {getButtonText()}
            </Button>
            {!isBusinessProfileComplete() && (
              <p className="text-sm text-orange-600 mt-2 text-center">
                Complete your business details to unlock content generation. 
                <button 
                  onClick={onShowBusinessForm}
                  className="underline ml-1 text-orange-700 hover:text-orange-800"
                >
                  Add details now
                </button>
              </p>
            )}
            {credits <= 0 && (
              <p className="text-sm text-red-600 mt-2 text-center">
                You need credits to generate content. <a href="/stripe-payment" className="underline">Buy credits</a>
              </p>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
};

export default SocialMediaForm;
