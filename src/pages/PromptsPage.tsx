
import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from "sonner";
import { Edit, Trash2, Plus, Copy } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface Prompt {
  id: number;
  name: string;
  platform: string;
  category: string;
  hook: string;
  body: string;
  cta: string;
  dateCreated: string;
}

const PromptsPage = () => {
  const [prompts, setPrompts] = useState<Prompt[]>([
    {
      id: 1,
      name: "Problem-Solution Hook",
      platform: "all",
      category: "business",
      hook: "🔥 Attention {audience}! Struggling with your daily challenges?",
      body: "We understand the unique needs of {audience} and have developed solutions that can help you achieve remarkable results. With our proven approach, you'll be able to overcome challenges and reach your goals faster than ever.\n\nOne of our clients recently reported a 40% increase in productivity after implementing our solutions!",
      cta: "Ready to transform your business? Click the link in bio to learn more or DM us for a free consultation! ⏰ Limited spots available.",
      dateCreated: "2024-01-15"
    },
    {
      id: 2,
      name: "Announcement Style",
      platform: "linkedin",
      category: "professional",
      hook: "I'm excited to announce our newest solution for {audience} looking to maximize efficiency.",
      body: "After months of research and development, our team has created a solution specifically designed for {audience}.\n\nThe results?\n\n✅ 35% reduction in operational costs\n✅ 50% less time spent on administrative tasks\n✅ Improved team satisfaction and retention\n\nIn today's competitive landscape, businesses can't afford to fall behind on innovation.",
      cta: "If you're interested in learning how our solution can benefit your organization, let's connect. I'm offering 5 free strategy sessions this week to qualified professionals.",
      dateCreated: "2024-01-10"
    }
  ]);

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState<Prompt | null>(null);
  const [filterPlatform, setFilterPlatform] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    platform: 'all',
    category: 'business',
    hook: '',
    body: '',
    cta: ''
  });

  const handleCreatePrompt = () => {
    if (!formData.name || !formData.hook || !formData.body || !formData.cta) {
      toast.error("Please fill in all required fields.");
      return;
    }

    const newPrompt: Prompt = {
      id: Date.now(),
      ...formData,
      dateCreated: new Date().toISOString().split('T')[0]
    };

    setPrompts([newPrompt, ...prompts]);
    setFormData({
      name: '',
      platform: 'all',
      category: 'business',
      hook: '',
      body: '',
      cta: ''
    });
    setIsCreateDialogOpen(false);
    toast.success("Prompt created successfully!");
  };

  const handleEditPrompt = (prompt: Prompt) => {
    setEditingPrompt(prompt);
    setFormData({
      name: prompt.name,
      platform: prompt.platform,
      category: prompt.category,
      hook: prompt.hook,
      body: prompt.body,
      cta: prompt.cta
    });
  };

  const handleUpdatePrompt = () => {
    if (!editingPrompt) return;

    const updatedPrompts = prompts.map(p => 
      p.id === editingPrompt.id 
        ? { ...editingPrompt, ...formData }
        : p
    );

    setPrompts(updatedPrompts);
    setEditingPrompt(null);
    setFormData({
      name: '',
      platform: 'all',
      category: 'business',
      hook: '',
      body: '',
      cta: ''
    });
    toast.success("Prompt updated successfully!");
  };

  const handleDeletePrompt = (id: number) => {
    setPrompts(prompts.filter(p => p.id !== id));
    toast.success("Prompt deleted successfully!");
  };

  const handleCopyPrompt = (prompt: Prompt) => {
    const promptText = `Hook: ${prompt.hook}\n\nBody: ${prompt.body}\n\nCTA: ${prompt.cta}`;
    navigator.clipboard.writeText(promptText);
    toast.success("Prompt copied to clipboard!");
  };

  const filteredPrompts = prompts.filter(prompt => {
    const platformMatch = filterPlatform === 'all' || prompt.platform === filterPlatform || prompt.platform === 'all';
    const categoryMatch = filterCategory === 'all' || prompt.category === filterCategory;
    return platformMatch && categoryMatch;
  });

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Prompt Library</h1>
        <p className="text-gray-600 mt-2">Manage and organize your social media content prompts.</p>
      </div>

      {/* Header Actions */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex gap-4">
          <Select value={filterPlatform} onValueChange={setFilterPlatform}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by platform" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Platforms</SelectItem>
              <SelectItem value="facebook">Facebook</SelectItem>
              <SelectItem value="twitter">Twitter</SelectItem>
              <SelectItem value="linkedin">LinkedIn</SelectItem>
              <SelectItem value="instagram">Instagram</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="business">Business</SelectItem>
              <SelectItem value="professional">Professional</SelectItem>
              <SelectItem value="casual">Casual</SelectItem>
              <SelectItem value="promotional">Promotional</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-caregrowth-blue">
              <Plus size={16} className="mr-2" />
              Create Prompt
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Prompt</DialogTitle>
              <DialogDescription>
                Create a reusable prompt template for social media content generation.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Prompt Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="e.g., Problem-Solution Hook"
                  />
                </div>
                <div>
                  <Label htmlFor="platform">Platform</Label>
                  <Select value={formData.platform} onValueChange={(value) => setFormData({...formData, platform: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Platforms</SelectItem>
                      <SelectItem value="facebook">Facebook</SelectItem>
                      <SelectItem value="twitter">Twitter</SelectItem>
                      <SelectItem value="linkedin">LinkedIn</SelectItem>
                      <SelectItem value="instagram">Instagram</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="category">Category</Label>
                <Select value={formData.category} onValueChange={(value) => setFormData({...formData, category: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="business">Business</SelectItem>
                    <SelectItem value="professional">Professional</SelectItem>
                    <SelectItem value="casual">Casual</SelectItem>
                    <SelectItem value="promotional">Promotional</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="hook">Hook Template</Label>
                <Textarea
                  id="hook"
                  value={formData.hook}
                  onChange={(e) => setFormData({...formData, hook: e.target.value})}
                  placeholder="Use {audience} as a placeholder for dynamic content"
                  className="min-h-[80px]"
                />
              </div>

              <div>
                <Label htmlFor="body">Body Template</Label>
                <Textarea
                  id="body"
                  value={formData.body}
                  onChange={(e) => setFormData({...formData, body: e.target.value})}
                  placeholder="Use {audience} as a placeholder for dynamic content"
                  className="min-h-[120px]"
                />
              </div>

              <div>
                <Label htmlFor="cta">Call to Action Template</Label>
                <Textarea
                  id="cta"
                  value={formData.cta}
                  onChange={(e) => setFormData({...formData, cta: e.target.value})}
                  placeholder="Use {audience} as a placeholder for dynamic content"
                  className="min-h-[80px]"
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreatePrompt} className="bg-caregrowth-blue">
                  Create Prompt
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Prompts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredPrompts.map((prompt) => (
          <Card key={prompt.id} className="p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="font-semibold text-lg">{prompt.name}</h3>
                <div className="flex gap-2 mt-1">
                  <span className="inline-block px-2 py-1 text-xs font-medium rounded bg-caregrowth-lightblue text-caregrowth-blue capitalize">
                    {prompt.platform}
                  </span>
                  <span className="inline-block px-2 py-1 text-xs font-medium rounded bg-gray-100 text-gray-700 capitalize">
                    {prompt.category}
                  </span>
                </div>
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" onClick={() => handleCopyPrompt(prompt)}>
                  <Copy size={14} />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => handleEditPrompt(prompt)}>
                  <Edit size={14} />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => handleDeletePrompt(prompt.id)}>
                  <Trash2 size={14} />
                </Button>
              </div>
            </div>

            <div className="space-y-3 text-sm">
              <div>
                <p className="font-medium text-gray-700">Hook:</p>
                <p className="text-gray-600 line-clamp-2">{prompt.hook}</p>
              </div>
              <div>
                <p className="font-medium text-gray-700">Body:</p>
                <p className="text-gray-600 line-clamp-3">{prompt.body}</p>
              </div>
              <div>
                <p className="font-medium text-gray-700">CTA:</p>
                <p className="text-gray-600 line-clamp-2">{prompt.cta}</p>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t text-xs text-gray-500">
              Created: {prompt.dateCreated}
            </div>
          </Card>
        ))}
      </div>

      {filteredPrompts.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">No prompts found matching your filters.</p>
        </div>
      )}

      {/* Edit Dialog */}
      {editingPrompt && (
        <Dialog open={!!editingPrompt} onOpenChange={() => setEditingPrompt(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Prompt</DialogTitle>
              <DialogDescription>
                Update your prompt template.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-name">Prompt Name</Label>
                  <Input
                    id="edit-name"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-platform">Platform</Label>
                  <Select value={formData.platform} onValueChange={(value) => setFormData({...formData, platform: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Platforms</SelectItem>
                      <SelectItem value="facebook">Facebook</SelectItem>
                      <SelectItem value="twitter">Twitter</SelectItem>
                      <SelectItem value="linkedin">LinkedIn</SelectItem>
                      <SelectItem value="instagram">Instagram</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="edit-category">Category</Label>
                <Select value={formData.category} onValueChange={(value) => setFormData({...formData, category: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="business">Business</SelectItem>
                    <SelectItem value="professional">Professional</SelectItem>
                    <SelectItem value="casual">Casual</SelectItem>
                    <SelectItem value="promotional">Promotional</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="edit-hook">Hook Template</Label>
                <Textarea
                  id="edit-hook"
                  value={formData.hook}
                  onChange={(e) => setFormData({...formData, hook: e.target.value})}
                  className="min-h-[80px]"
                />
              </div>

              <div>
                <Label htmlFor="edit-body">Body Template</Label>
                <Textarea
                  id="edit-body"
                  value={formData.body}
                  onChange={(e) => setFormData({...formData, body: e.target.value})}
                  className="min-h-[120px]"
                />
              </div>

              <div>
                <Label htmlFor="edit-cta">Call to Action Template</Label>
                <Textarea
                  id="edit-cta"
                  value={formData.cta}
                  onChange={(e) => setFormData({...formData, cta: e.target.value})}
                  className="min-h-[80px]"
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditingPrompt(null)}>
                  Cancel
                </Button>
                <Button onClick={handleUpdatePrompt} className="bg-caregrowth-blue">
                  Update Prompt
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default PromptsPage;
