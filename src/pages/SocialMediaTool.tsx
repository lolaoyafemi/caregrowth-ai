
import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { toast } from "sonner";

const SocialMediaTool = () => {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState({
    facebook: '',
    twitter: '',
    linkedin: '',
    instagram: ''
  });

  const handleGenerate = () => {
    if (!prompt.trim()) {
      toast.error("Please enter a topic or idea to generate content.");
      return;
    }
    
    setIsGenerating(true);
    
    // Simulate API call with setTimeout
    setTimeout(() => {
      setGeneratedContent({
        facebook: `📣 ${prompt}\n\nWe're excited to share our insights on this topic! Our team has been working hard to bring you the best solutions for your business needs. Check out our latest article for more details and let us know your thoughts in the comments below!\n\n#BusinessGrowth #AgencyTips`,
        twitter: `Just published: "${prompt}" 🚀\n\nOur take on this important topic for agencies. Learn how this approach can transform your client results!\n\n#AgencyGrowth #Marketing`,
        linkedin: `🔍 New Insights: ${prompt}\n\nOur agency has been exploring innovative approaches to this challenge, and we've discovered some powerful strategies that are delivering significant results for our clients.\n\nIn our experience, focusing on data-driven decision making has been key to success in this area.\n\nWhat strategies have worked for your organization? Share in the comments!\n\n#ProfessionalDevelopment #AgencyInnovation #BusinessStrategy`,
        instagram: `✨ ${prompt} ✨\n\nSwipe up to read our full breakdown of this game-changing approach!\n\nDrop a 💙 if you're implementing this in your agency already.\n\n.\n.\n.\n#AgencyLife #DigitalMarketing #GrowthStrategy`
      });
      setIsGenerating(false);
      toast.success("Content generated successfully!");
    }, 2000);
  };

  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content);
    toast.success("Copied to clipboard!");
  };

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Social Media Content Generator</h1>
        <p className="text-gray-600 mt-2">Generate engaging social media content for multiple platforms with AI assistance.</p>
      </div>

      <Card className="p-6 mb-8">
        <div className="mb-6">
          <label className="block text-lg font-medium mb-2">What would you like to post about?</label>
          <Textarea 
            placeholder="Enter a topic, promotion, or news you want to share..."
            className="min-h-[120px]"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
          />
        </div>
        <Button 
          className="w-full bg-caregrowth-blue text-white"
          onClick={handleGenerate}
          disabled={isGenerating}
        >
          {isGenerating ? "Generating Content..." : "Generate Content"}
        </Button>
      </Card>

      {(generatedContent.facebook || isGenerating) && (
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-4">Generated Content</h2>
          <Tabs defaultValue="facebook">
            <TabsList className="mb-6 w-full justify-start">
              <TabsTrigger value="facebook">Facebook</TabsTrigger>
              <TabsTrigger value="twitter">Twitter</TabsTrigger>
              <TabsTrigger value="linkedin">LinkedIn</TabsTrigger>
              <TabsTrigger value="instagram">Instagram</TabsTrigger>
            </TabsList>
            
            <TabsContent value="facebook">
              <Card className="p-6 relative">
                {isGenerating ? (
                  <div className="min-h-[200px] flex items-center justify-center">
                    <div className="animate-pulse text-center">
                      <div className="h-4 bg-gray-200 rounded w-3/4 mx-auto mb-3"></div>
                      <div className="h-4 bg-gray-200 rounded w-full mb-3"></div>
                      <div className="h-4 bg-gray-200 rounded w-5/6 mx-auto mb-3"></div>
                      <div className="h-4 bg-gray-200 rounded w-4/6 mx-auto"></div>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="whitespace-pre-line mb-4">
                      {generatedContent.facebook}
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        className="w-full"
                        onClick={() => handleCopy(generatedContent.facebook)}
                      >
                        Copy to Clipboard
                      </Button>
                      <Button className="bg-caregrowth-blue w-full">
                        Regenerate
                      </Button>
                    </div>
                  </>
                )}
              </Card>
            </TabsContent>
            
            <TabsContent value="twitter">
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
                ) : (
                  <>
                    <div className="whitespace-pre-line mb-4">
                      {generatedContent.twitter}
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        className="w-full"
                        onClick={() => handleCopy(generatedContent.twitter)}
                      >
                        Copy to Clipboard
                      </Button>
                      <Button className="bg-caregrowth-blue w-full">
                        Regenerate
                      </Button>
                    </div>
                  </>
                )}
              </Card>
            </TabsContent>
            
            <TabsContent value="linkedin">
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
                ) : (
                  <>
                    <div className="whitespace-pre-line mb-4">
                      {generatedContent.linkedin}
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        className="w-full"
                        onClick={() => handleCopy(generatedContent.linkedin)}
                      >
                        Copy to Clipboard
                      </Button>
                      <Button className="bg-caregrowth-blue w-full">
                        Regenerate
                      </Button>
                    </div>
                  </>
                )}
              </Card>
            </TabsContent>
            
            <TabsContent value="instagram">
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
                ) : (
                  <>
                    <div className="whitespace-pre-line mb-4">
                      {generatedContent.instagram}
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        className="w-full"
                        onClick={() => handleCopy(generatedContent.instagram)}
                      >
                        Copy to Clipboard
                      </Button>
                      <Button className="bg-caregrowth-blue w-full">
                        Regenerate
                      </Button>
                    </div>
                  </>
                )}
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  );
};

export default SocialMediaTool;
