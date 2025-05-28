
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from "sonner";
import { Edit, Trash2, Plus, Copy, Eye } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from '@/contexts/UserContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface Prompt {
  id: string;
  name: string;
  platform: string;
  category: string;
  hook: string;
  body: string;
  cta: string;
  created_at: string;
  user_id: string;
}

const PromptsPage = () => {
  const { user } = useUser();
  const queryClient = useQueryClient();
  const isSuperAdmin = user?.role === 'super_admin';

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState<Prompt | null>(null);
  const [viewingPrompt, setViewingPrompt] = useState<Prompt | null>(null);
  const [filterPlatform, setFilterPlatform] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    platform: 'all',
    category: 'trust-authority',
    hook: '',
    body: '',
    cta: ''
  });

  // Fetch prompts from Supabase
  const { data: prompts = [], isLoading } = useQuery({
    queryKey: ['prompts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('prompts')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching prompts:', error);
        throw error;
      }
      
      return data || [];
    },
  });

  // Create prompt mutation
  const createPromptMutation = useMutation({
    mutationFn: async (promptData: typeof formData) => {
      if (!user?.id) throw new Error('User not authenticated');
      
      const { data, error } = await supabase
        .from('prompts')
        .insert([{
          ...promptData,
          user_id: user.id
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prompts'] });
      setFormData({
        name: '',
        platform: 'all',
        category: 'trust-authority',
        hook: '',
        body: '',
        cta: ''
      });
      setIsCreateDialogOpen(false);
      toast.success("Prompt created successfully!");
    },
    onError: (error) => {
      console.error('Error creating prompt:', error);
      toast.error("Failed to create prompt. Please try again.");
    }
  });

  // Update prompt mutation
  const updatePromptMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: typeof formData }) => {
      const { data, error } = await supabase
        .from('prompts')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prompts'] });
      setEditingPrompt(null);
      setFormData({
        name: '',
        platform: 'all',
        category: 'trust-authority',
        hook: '',
        body: '',
        cta: ''
      });
      toast.success("Prompt updated successfully!");
    },
    onError: (error) => {
      console.error('Error updating prompt:', error);
      toast.error("Failed to update prompt. Please try again.");
    }
  });

  // Delete prompt mutation
  const deletePromptMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('prompts')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prompts'] });
      toast.success("Prompt deleted successfully!");
    },
    onError: (error) => {
      console.error('Error deleting prompt:', error);
      toast.error("Failed to delete prompt. Please try again.");
    }
  });

  const handleCreatePrompt = () => {
    if (!isSuperAdmin) {
      toast.error("Only super admins can create prompts.");
      return;
    }

    if (!formData.name || !formData.hook || !formData.body || !formData.cta) {
      toast.error("Please fill in all required fields.");
      return;
    }

    createPromptMutation.mutate(formData);
  };

  const handleEditPrompt = (prompt: Prompt) => {
    if (!isSuperAdmin) {
      toast.error("Only super admins can edit prompts.");
      return;
    }

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

    updatePromptMutation.mutate({
      id: editingPrompt.id,
      updates: formData
    });
  };

  const handleDeletePrompt = (id: string) => {
    if (!isSuperAdmin) {
      toast.error("Only super admins can delete prompts.");
      return;
    }

    deletePromptMutation.mutate(id);
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

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'trust-authority':
        return 'Trust & Authority';
      case 'heartfelt-relatable':
        return 'Heartfelt & Relatable';
      case 'educational-helpful':
        return 'Educational & Helpful';
      case 'results-offers':
        return 'Results & Offers';
      default:
        return category;
    }
  };

  const truncateText = (text: string, maxLength: number) => {
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <p className="text-gray-500">Loading prompts...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Prompt Library</h1>
        <p className="text-gray-600 mt-2">Manage and organize your social media content prompts.</p>
        {!isSuperAdmin && (
          <p className="text-amber-600 mt-2 text-sm">
            You can view and copy prompts, but only super admins can create, edit, or delete them.
          </p>
        )}
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
              <SelectItem value="trust-authority">Trust & Authority</SelectItem>
              <SelectItem value="heartfelt-relatable">Heartfelt & Relatable</SelectItem>
              <SelectItem value="educational-helpful">Educational & Helpful</SelectItem>
              <SelectItem value="results-offers">Results & Offers</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isSuperAdmin && (
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
                      <SelectItem value="trust-authority">Trust & Authority</SelectItem>
                      <SelectItem value="heartfelt-relatable">Heartfelt & Relatable</SelectItem>
                      <SelectItem value="educational-helpful">Educational & Helpful</SelectItem>
                      <SelectItem value="results-offers">Results & Offers</SelectItem>
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
                  <Button 
                    onClick={handleCreatePrompt} 
                    className="bg-caregrowth-blue"
                    disabled={createPromptMutation.isPending}
                  >
                    {createPromptMutation.isPending ? 'Creating...' : 'Create Prompt'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Prompts Table */}
      <Card>
        <CardHeader>
          <CardTitle>Prompt Templates</CardTitle>
          <CardDescription>
            Manage your collection of reusable prompt templates
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Platform</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Hook Preview</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPrompts.map((prompt) => (
                <TableRow key={prompt.id}>
                  <TableCell className="font-medium">{prompt.name}</TableCell>
                  <TableCell>
                    <span className="inline-block px-2 py-1 text-xs font-medium rounded bg-caregrowth-lightblue text-caregrowth-blue capitalize">
                      {prompt.platform}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="inline-block px-2 py-1 text-xs font-medium rounded bg-gray-100 text-gray-700">
                      {getCategoryLabel(prompt.category)}
                    </span>
                  </TableCell>
                  <TableCell className="max-w-xs">
                    <p className="text-sm text-gray-600 truncate">
                      {truncateText(prompt.hook, 60)}
                    </p>
                  </TableCell>
                  <TableCell className="text-sm text-gray-500">
                    {formatDate(prompt.created_at)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => setViewingPrompt(prompt)}
                        className="h-8 w-8 p-0"
                      >
                        <Eye size={14} />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleCopyPrompt(prompt)}
                        className="h-8 w-8 p-0"
                      >
                        <Copy size={14} />
                      </Button>
                      {isSuperAdmin && (
                        <>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleEditPrompt(prompt)}
                            className="h-8 w-8 p-0"
                          >
                            <Edit size={14} />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleDeletePrompt(prompt.id)}
                            className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                            disabled={deletePromptMutation.isPending}
                          >
                            <Trash2 size={14} />
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          
          {filteredPrompts.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">No prompts found matching your filters.</p>
              {isSuperAdmin && prompts.length === 0 && (
                <p className="text-gray-400 mt-2">Create your first prompt template to get started.</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* View Prompt Dialog */}
      {viewingPrompt && (
        <Dialog open={!!viewingPrompt} onOpenChange={() => setViewingPrompt(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{viewingPrompt.name}</DialogTitle>
              <DialogDescription>
                Preview of the prompt template
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium text-gray-700">Hook:</Label>
                <p className="mt-1 p-3 bg-gray-50 rounded text-sm">{viewingPrompt.hook}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-700">Body:</Label>
                <p className="mt-1 p-3 bg-gray-50 rounded text-sm whitespace-pre-wrap">{viewingPrompt.body}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-700">Call to Action:</Label>
                <p className="mt-1 p-3 bg-gray-50 rounded text-sm">{viewingPrompt.cta}</p>
              </div>
              
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setViewingPrompt(null)}>
                  Close
                </Button>
                <Button onClick={() => handleCopyPrompt(viewingPrompt)} className="bg-caregrowth-blue">
                  Copy to Clipboard
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Edit Dialog */}
      {editingPrompt && isSuperAdmin && (
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
                    <SelectItem value="trust-authority">Trust & Authority</SelectItem>
                    <SelectItem value="heartfelt-relatable">Heartfelt & Relatable</SelectItem>
                    <SelectItem value="educational-helpful">Educational & Helpful</SelectItem>
                    <SelectItem value="results-offers">Results & Offers</SelectItem>
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
                <Button 
                  onClick={handleUpdatePrompt} 
                  className="bg-caregrowth-blue"
                  disabled={updatePromptMutation.isPending}
                >
                  {updatePromptMutation.isPending ? 'Updating...' : 'Update Prompt'}
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
