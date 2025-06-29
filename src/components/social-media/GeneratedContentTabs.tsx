import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Copy, Eye } from 'lucide-react';
import { toast } from "sonner";
import { useUserCredits } from '@/hooks/useUserCredits';
import { validateCreditsBeforeAction } from '@/utils/creditValidation';

interface GeneratedSection {
  hook: string;
  body: string;
  cta: string;
}

interface GeneratedContent {
  facebook: GeneratedSection;
  twitter: GeneratedSection;
  linkedin: GeneratedSection;
  instagram: GeneratedSection;
}

interface GeneratedContentTabsProps {
  generatedContent: GeneratedContent | null;
  isGenerating: boolean;
  regeneratingSection: {platform: string, section: string} | null;
  onRegenerateSection: (platform: string, section: string) => void;
  onCopy: (platform: string) => void;
  onSavePost: (platform: string) => void;
  onContentChange: (platform: string, section: string, value: string) => void;
}

const GeneratedContentTabs: React.FC<GeneratedContentTabsProps> = ({
  generatedContent,
  isGenerating,
  regeneratingSection,
  onRegenerateSection,
  onCopy,
  onSavePost,
  onContentChange
}) => {
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewContent, setPreviewContent] = useState('');
  const [previewPlatform, setPreviewPlatform] = useState('');
  const { credits } = useUserCredits();

  if (!generatedContent && !isGenerating) return null;

  const handleCopy = (platform: string) => {
    if (!generatedContent) return;
    
    const content = generatedContent[platform as keyof GeneratedContent];
    const fullText = `${content.hook}\n\n${content.body}\n\n${content.cta}`;
    
    navigator.clipboard.writeText(fullText);
    toast.success("Copied!");
  };

  const handlePreview = (platform: string) => {
    if (!generatedContent) return;
    
    const content = generatedContent[platform as keyof GeneratedContent];
    const fullText = `${content.hook}\n\n${content.body}\n\n${content.cta}`;
    
    setPreviewContent(fullText);
    setPreviewPlatform(platform.charAt(0).toUpperCase() + platform.slice(1));
    setPreviewOpen(true);
  };

  const handleRegenerateSection = (platform: string, section: string) => {
    if (validateCreditsBeforeAction(credits, 'Section Regeneration')) {
      onRegenerateSection(platform, section);
    }
  };

  const handleFullContentChange = (platform: string, value: string) => {
    // Split the content back into sections for storage
    const lines = value.split('\n').filter(line => line.trim());
    
    if (lines.length >= 3) {
      // Find natural breaks in the content
      const firstBreakIndex = lines.findIndex((line, index) => index > 0 && line.trim() !== '');
      const lastBreakIndex = lines.length - 1;
      
      const hook = lines.slice(0, Math.max(1, firstBreakIndex)).join('\n');
      const body = lines.slice(Math.max(1, firstBreakIndex), lastBreakIndex).join('\n');
      const cta = lines[lastBreakIndex];
      
      onContentChange(platform, 'hook', hook);
      onContentChange(platform, 'body', body);
      onContentChange(platform, 'cta', cta);
    } else {
      // If content is too short, put it all in hook
      onContentChange(platform, 'hook', value);
      onContentChange(platform, 'body', '');
      onContentChange(platform, 'cta', '');
    }
  };

  const getConcatenatedContent = (platform: string) => {
    if (!generatedContent) return '';
    const content = generatedContent[platform as keyof GeneratedContent];
    return `${content.hook}\n\n${content.body}\n\n${content.cta}`;
  };

  return (
    <div className="mb-6">
      <h2 className="text-xl font-semibold mb-4">Generated Content</h2>
      <Tabs defaultValue="facebook">
        <TabsList className="mb-6 w-full justify-start">
          <TabsTrigger value="facebook">Facebook</TabsTrigger>
          <TabsTrigger value="twitter">Twitter</TabsTrigger>
          <TabsTrigger value="linkedin">LinkedIn</TabsTrigger>
          <TabsTrigger value="instagram">Instagram</TabsTrigger>
        </TabsList>
        
        {["facebook", "twitter", "linkedin", "instagram"].map((platform) => (
          <TabsContent key={platform} value={platform}>
            <Card className="p-6">
              {isGenerating ? (
                <div className="min-h-[200px] flex items-center justify-center">
                  <div className="animate-pulse text-center">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mx-auto mb-3"></div>
                    <div className="h-4 bg-gray-200 rounded w-full mb-3"></div>
                    <div className="h-4 bg-gray-200 rounded w-5/6 mx-auto mb-3"></div>
                    <div className="h-4 bg-gray-200 rounded w-4/6 mx-auto"></div>
                  </div>
                </div>
              ) : generatedContent && (
                <>
                  <div className="mb-6">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="font-medium text-lg">Generated Content</h3>
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleCopy(platform)}
                          className="flex items-center gap-1"
                        >
                          <Copy size={16} />
                          Copy
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handlePreview(platform)}
                          className="flex items-center gap-1"
                        >
                          <Eye size={16} />
                          Preview
                        </Button>
                      </div>
                    </div>
                    <Textarea 
                      className="min-h-[300px]" 
                      value={getConcatenatedContent(platform)}
                      onChange={(e) => handleFullContentChange(platform, e.target.value)}
                      placeholder="Your generated content will appear here..."
                    />
                  </div>
                  
                  <div className="border-t pt-4">
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="font-medium">Regenerate Sections</h4>
                      {credits <= 0 && (
                        <p className="text-sm text-red-600">
                          Credits required for regeneration
                        </p>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2 mb-4">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleRegenerateSection(platform, 'hook')}
                        disabled={regeneratingSection !== null || credits <= 0}
                      >
                        {regeneratingSection?.platform === platform && regeneratingSection?.section === 'hook'
                          ? "Regenerating..."
                          : "Regenerate Hook"
                        }
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleRegenerateSection(platform, 'body')}
                        disabled={regeneratingSection !== null || credits <= 0}
                      >
                        {regeneratingSection?.platform === platform && regeneratingSection?.section === 'body'
                          ? "Regenerating..."
                          : "Regenerate Body"
                        }
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleRegenerateSection(platform, 'cta')}
                        disabled={regeneratingSection !== null || credits <= 0}
                      >
                        {regeneratingSection?.platform === platform && regeneratingSection?.section === 'cta'
                          ? "Regenerating..."
                          : "Regenerate CTA"
                        }
                      </Button>
                    </div>
                  </div>
                  
                  <div className="flex gap-3">
                    <Button 
                      className="flex-1 bg-caregrowth-green"
                      onClick={() => onSavePost(platform)}
                    >
                      Save Post
                    </Button>
                  </div>
                </>
              )}
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{previewPlatform} Content Preview</DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <pre className="whitespace-pre-wrap text-sm">{previewContent}</pre>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default GeneratedContentTabs;
