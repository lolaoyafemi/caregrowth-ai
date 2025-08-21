
import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from "sonner";
import { Pencil, Trash2, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Prompt {
  id: string;
  name: string;
  platform: string;
  category: string;
  prompt: string;
  created_at: string;
  updated_at: string;
}

const PromptsPage = () => {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateMode, setIsCreateMode] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState<Prompt | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  
  // Form states
  const [formData, setFormData] = useState({
    name: '',
    platform: '',
    category: '',
    template: '' // Single template field instead of hook, body, cta
  });

  // Check if user is super admin
  const checkSuperAdminStatus = async () => {
    try {
      const { data } = await supabase.auth.getUser();
      if (data?.user) {
        const { data: userData, error } = await supabase
          .from('users')
          .select('role')
          .eq('id', data.user.id)
          .single();
        
        if (!error && userData?.role === 'super_admin') {
          setIsSuperAdmin(true);
        }
      }
    } catch (error) {
      console.error('Error checking admin status:', error);
    }
  };

  // Fetch prompts from Supabase
  const fetchPrompts = async () => {
    try {
      const { data, error } = await supabase
        .from('prompts_modified' as any)
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPrompts((data || []) as unknown as Prompt[]);
    } catch (error) {
      console.error('Error fetching prompts:', error);
      toast.error('Failed to load prompts');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkSuperAdminStatus();
    fetchPrompts();
  }, []);

  const resetForm = () => {
    setFormData({
      name: '',
      platform: '',
      category: '',
      template: ''
    });
    setIsCreateMode(false);
    setEditingPrompt(null);
  };

  const handleSavePrompt = async () => {
    if (!isSuperAdmin) {
      toast.error('Only super admins can create/edit prompts');
      return;
    }

    if (!formData.name || !formData.platform || !formData.category || !formData.template) {
      toast.error('Please fill in all fields');
      return;
    }

    try {
      const { data } = await supabase.auth.getUser();
      if (!data?.user) {
        toast.error('User not authenticated');
        return;
      }

      const promptData = {
        name: formData.name,
        platform: formData.platform,
        category: formData.category,
        prompt: formData.template,
        updated_at: new Date().toISOString()
      };

      if (editingPrompt) {
        // Update existing prompt
        const { error } = await supabase
          .from('prompts_modified' as any)
          .update(promptData)
          .eq('id', editingPrompt.id);

        if (error) throw error;
        toast.success('Prompt updated successfully!');
      } else {
        // Create new prompt
        const { error } = await supabase
          .from('prompts_modified' as any)
          .insert([{
            ...promptData,
            user_id: data.user.id
          }]);

        if (error) throw error;
        toast.success('Prompt created successfully!');
      }

      resetForm();
      fetchPrompts();
    } catch (error) {
      console.error('Error saving prompt:', error);
      toast.error('Failed to save prompt');
    }
  };

  const handleEditPrompt = (prompt: Prompt) => {
    if (!isSuperAdmin) {
      toast.error('Only super admins can edit prompts');
      return;
    }

    setFormData({
      name: prompt.name,
      platform: prompt.platform,
      category: prompt.category,
      template: prompt.prompt
    });
    setEditingPrompt(prompt);
    setIsCreateMode(true);
  };

  const handleDeletePrompt = async (promptId: string) => {
    if (!isSuperAdmin) {
      toast.error('Only super admins can delete prompts');
      return;
    }

    if (!confirm('Are you sure you want to delete this prompt?')) return;

    try {
      const { error } = await supabase
        .from('prompts_modified' as any)
        .delete()
        .eq('id', promptId);

      if (error) throw error;
      
      toast.success('Prompt deleted successfully!');
      fetchPrompts();
    } catch (error) {
      console.error('Error deleting prompt:', error);
      toast.error('Failed to delete prompt');
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Prompt Templates</h1>
          <p className="text-gray-600 mt-2">Manage prompt templates for social media content generation.</p>
        </div>
        {isSuperAdmin && (
          <Button 
            onClick={() => setIsCreateMode(true)}
            className="flex items-center gap-2 bg-caregrowth-blue text-white"
          >
            <Plus size={16} />
            Create New Prompt
          </Button>
        )}
      </div>

      {/* Create/Edit Form */}
      {isCreateMode && (
        <Card className="p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">
            {editingPrompt ? 'Edit Prompt Template' : 'Create New Prompt Template'}
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="mb-4">
                <Label htmlFor="name">Template Name</Label>
                <Input
                  id="name"
                  placeholder="e.g., Authority Building Post"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                />
              </div>
              
              <div className="mb-4">
                <Label htmlFor="platform">Platform</Label>
                <Select value={formData.platform} onValueChange={(value) => setFormData({...formData, platform: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select platform" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="facebook">Facebook</SelectItem>
                    <SelectItem value="twitter">Twitter</SelectItem>
                    <SelectItem value="linkedin">LinkedIn</SelectItem>
                    <SelectItem value="instagram">Instagram</SelectItem>
                    <SelectItem value="all">All Platforms</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="mb-4">
                <Label htmlFor="category">Category</Label>
                <Select value={formData.category} onValueChange={(value) => setFormData({...formData, category: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="attract">Trust & Authority</SelectItem>
                    <SelectItem value="connect">Heartfelt & Relatable</SelectItem>
                    <SelectItem value="transact">Educational & Helpful</SelectItem>
                    <SelectItem value="results-offers">Results & Offers</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div>
              <div className="mb-4">
                <Label htmlFor="template">Complete Template</Label>
                <Textarea
                  id="template"
                  placeholder="Enter your complete template here..."
                  value={formData.template}
                  onChange={(e) => setFormData({...formData, template: e.target.value})}
                  className="min-h-[200px]"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Enter your complete template content. You can include hooks, body text, and call-to-actions all in one field.
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex gap-3 mt-6">
            <Button onClick={handleSavePrompt} className="bg-caregrowth-green text-white">
              {editingPrompt ? 'Update Template' : 'Create Template'}
            </Button>
            <Button variant="outline" onClick={resetForm}>
              Cancel
            </Button>
          </div>
        </Card>
      )}

      {/* Prompts List */}
      <div className="space-y-4">
        {prompts.length === 0 ? (
          <Card className="p-8 text-center">
            <h3 className="text-lg font-medium text-gray-900 mb-2">No prompt templates yet</h3>
            <p className="text-gray-600 mb-4">Create your first prompt template to get started.</p>
            {isSuperAdmin && (
              <Button 
                onClick={() => setIsCreateMode(true)}
                className="bg-caregrowth-blue text-white"
              >
                Create First Template
              </Button>
            )}
          </Card>
        ) : (
          prompts.map((prompt) => (
            <Card key={prompt.id} className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{prompt.name}</h3>
                  <div className="flex gap-2 mt-1">
                    <span className="inline-block px-2 py-1 text-xs font-medium rounded bg-caregrowth-lightblue text-caregrowth-blue capitalize">
                      {prompt.platform}
                    </span>
                    <span className="inline-block px-2 py-1 text-xs font-medium rounded bg-green-100 text-green-800 capitalize">
                      {prompt.category.replace('-', ' & ')}
                    </span>
                  </div>
                </div>
                {isSuperAdmin && (
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditPrompt(prompt)}
                      className="text-gray-600 hover:text-gray-900"
                    >
                      <Pencil size={16} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeletePrompt(prompt.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>
                )}
              </div>
              
              <div className="space-y-3">
                <div>
                  <h4 className="font-medium text-sm text-gray-700 mb-1">Template Content:</h4>
                  <div className="text-sm text-gray-600 whitespace-pre-wrap max-h-40 overflow-y-auto">
                    {prompt.prompt || 'No template content'}
                  </div>
                </div>
              </div>
              
              <div className="mt-4 text-xs text-gray-500">
                Created: {new Date(prompt.created_at).toLocaleDateString()}
                {prompt.updated_at !== prompt.created_at && (
                  <span> • Updated: {new Date(prompt.updated_at).toLocaleDateString()}</span>
                )}
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default PromptsPage;
