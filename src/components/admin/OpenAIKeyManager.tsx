
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Plus, Eye, EyeOff, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface OpenAIKey {
  id: string;
  key_name: string;
  secret_key: string;
  active: boolean;
  created_at: string;
}

const OpenAIKeyManager = () => {
  const [openaiKeys, setOpenaiKeys] = useState<OpenAIKey[]>([]);
  const [showSecrets, setShowSecrets] = useState<{[key: string]: boolean}>({});
  const [newKeyName, setNewKeyName] = useState('');
  const [newSecretKey, setNewSecretKey] = useState('');

  useEffect(() => {
    fetchOpenAIKeys();
  }, []);

  const fetchOpenAIKeys = async () => {
    const { data, error } = await supabase
      .from('openai_keys')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching OpenAI keys:', error);
      return;
    }

    setOpenaiKeys(data || []);
  };

  const addOpenAIKey = async () => {
    if (!newKeyName.trim() || !newSecretKey.trim()) {
      toast.error('Please fill in both key name and secret key');
      return;
    }

    const { error } = await supabase
      .from('openai_keys')
      .insert([{
        key_name: newKeyName.trim(),
        secret_key: newSecretKey.trim(),
        active: true
      }]);

    if (error) {
      console.error('Error adding OpenAI key:', error);
      toast.error('Failed to add OpenAI key');
      return;
    }

    toast.success('OpenAI key added successfully');
    setNewKeyName('');
    setNewSecretKey('');
    fetchOpenAIKeys();
  };

  const toggleKeyStatus = async (id: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from('openai_keys')
      .update({ active: !currentStatus })
      .eq('id', id);

    if (error) {
      console.error('Error updating key status:', error);
      toast.error('Failed to update key status');
      return;
    }

    toast.success(`Key ${!currentStatus ? 'activated' : 'deactivated'} successfully`);
    fetchOpenAIKeys();
  };

  const deleteKey = async (id: string) => {
    const { error } = await supabase
      .from('openai_keys')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting key:', error);
      toast.error('Failed to delete key');
      return;
    }

    toast.success('Key deleted successfully');
    fetchOpenAIKeys();
  };

  const maskSecretKey = (key: string) => {
    if (key.length <= 4) return key;
    return '•'.repeat(key.length - 4) + key.slice(-4);
  };

  const toggleSecretVisibility = (keyId: string) => {
    setShowSecrets(prev => ({
      ...prev,
      [keyId]: !prev[keyId]
    }));
  };

  return (
    <Card className="border-green-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-green-800">
          🔐 OpenAI API Key Manager
        </CardTitle>
        <CardDescription>
          Manage OpenAI API keys for the platform
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Add New Key Form */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-green-50 rounded-lg">
          <div>
            <Label htmlFor="keyName">Key Name</Label>
            <Input
              id="keyName"
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              placeholder="Production Key"
            />
          </div>
          <div>
            <Label htmlFor="secretKey">Secret Key</Label>
            <Input
              id="secretKey"
              type="password"
              value={newSecretKey}
              onChange={(e) => setNewSecretKey(e.target.value)}
              placeholder="sk-..."
            />
          </div>
          <div className="flex items-end">
            <Button onClick={addOpenAIKey} className="w-full bg-green-600 hover:bg-green-700">
              <Plus className="h-4 w-4 mr-2" />
              Add Key
            </Button>
          </div>
        </div>

        {/* Keys Table */}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Key Name</TableHead>
              <TableHead>Secret Key</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {openaiKeys.map((key) => (
              <TableRow key={key.id}>
                <TableCell className="font-medium">{key.key_name}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm">
                      {showSecrets[key.id] ? key.secret_key : maskSecretKey(key.secret_key)}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleSecretVisibility(key.id)}
                    >
                      {showSecrets[key.id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={key.active}
                      onCheckedChange={() => toggleKeyStatus(key.id, key.active)}
                    />
                    <span className={key.active ? 'text-green-600' : 'text-gray-400'}>
                      {key.active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </TableCell>
                <TableCell>{new Date(key.created_at).toLocaleDateString()}</TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteKey(key.id)}
                    className="text-red-600 hover:text-red-800"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default OpenAIKeyManager;
