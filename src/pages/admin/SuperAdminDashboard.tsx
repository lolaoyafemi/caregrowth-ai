import React, { useState, useEffect } from 'react';
import { useUser } from '../../contexts/UserContext';
import { Navigate } from 'react-router-dom';
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
import { Plus, Eye, EyeOff, Trash2, Shield, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { useAdminData } from '@/hooks/useAdminData';
import SystemMetrics from '@/components/admin/SystemMetrics';
import RealtimeActivity from '@/components/admin/RealtimeActivity';

interface OpenAIKey {
  id: string;
  key_name: string;
  secret_key: string;
  active: boolean;
  created_at: string;
}

interface CreditInventory {
  id: string;
  total_purchased: number;
  sold_to_agencies: number;
  available_balance: number;
  updated_at: string;
}

interface CreditPricing {
  id: string;
  price_per_credit: number;
  last_updated: string;
}

const SuperAdminDashboard = () => {
  const { user, hasPermission } = useUser();
  const { metrics, refetch: refetchAdminData } = useAdminData();
  const [openaiKeys, setOpenaiKeys] = useState<OpenAIKey[]>([]);
  const [creditInventory, setCreditInventory] = useState<CreditInventory | null>(null);
  const [creditPricing, setCreditPricing] = useState<CreditPricing | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSecrets, setShowSecrets] = useState<{[key: string]: boolean}>({});

  // Form states
  const [newKeyName, setNewKeyName] = useState('');
  const [newSecretKey, setNewSecretKey] = useState('');
  const [totalPurchased, setTotalPurchased] = useState(0);
  const [newPricePerCredit, setNewPricePerCredit] = useState(0);

  // Check if user is super admin
  if (!hasPermission(['super_admin'])) {
    return <Navigate to="/dashboard" replace />;
  }

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchOpenAIKeys(),
        fetchCreditInventory(),
        fetchCreditPricing(),
        refetchAdminData()
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

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

  const fetchCreditInventory = async () => {
    const { data, error } = await supabase
      .from('credit_inventory')
      .select('*')
      .single();

    if (error) {
      console.error('Error fetching credit inventory:', error);
      return;
    }

    setCreditInventory(data);
    setTotalPurchased(data?.total_purchased || 0);
  };

  const fetchCreditPricing = async () => {
    const { data, error } = await supabase
      .from('credit_pricing')
      .select('*')
      .single();

    if (error) {
      console.error('Error fetching credit pricing:', error);
      return;
    }

    setCreditPricing(data);
    setNewPricePerCredit(data?.price_per_credit || 0);
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

  const updateCreditInventory = async () => {
    if (!creditInventory) return;

    const { error } = await supabase
      .from('credit_inventory')
      .update({ 
        total_purchased: totalPurchased,
        updated_at: new Date().toISOString()
      })
      .eq('id', creditInventory.id);

    if (error) {
      console.error('Error updating credit inventory:', error);
      toast.error('Failed to update credit inventory');
      return;
    }

    toast.success('Credit inventory updated successfully');
    fetchCreditInventory();
  };

  const updateCreditPricing = async () => {
    if (!creditPricing) return;

    const { error } = await supabase
      .from('credit_pricing')
      .update({ 
        price_per_credit: newPricePerCredit,
        last_updated: new Date().toISOString()
      })
      .eq('id', creditPricing.id);

    if (error) {
      console.error('Error updating credit pricing:', error);
      toast.error('Failed to update credit pricing');
      return;
    }

    toast.success('Credit pricing updated successfully');
    fetchCreditPricing();
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

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-green-50/30">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading Super Admin Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-green-50/30 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Shield className="h-8 w-8 text-green-700" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Super Admin Dashboard</h1>
              <p className="text-gray-600">Credit Management & System Administration</p>
            </div>
          </div>
          <Button onClick={fetchAllData} variant="outline" className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Refresh All
          </Button>
        </div>

        {/* System Metrics */}
        <SystemMetrics metrics={metrics} />

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Management Sections */}
          <div className="lg:col-span-2 space-y-6">
            {/* OpenAI API Key Manager */}
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

            {/* Credit Inventory Summary */}
            <Card className="border-green-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-800">
                  📦 Credit Inventory Summary
                </CardTitle>
                <CardDescription>
                  Monitor and manage platform credit inventory
                </CardDescription>
              </CardHeader>
              <CardContent>
                {creditInventory && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="bg-blue-50 p-4 rounded-lg">
                        <h3 className="text-sm font-medium text-blue-800">Total Purchased</h3>
                        <p className="text-2xl font-bold text-blue-900">
                          {creditInventory.total_purchased.toLocaleString()}
                        </p>
                      </div>
                      <div className="bg-orange-50 p-4 rounded-lg">
                        <h3 className="text-sm font-medium text-orange-800">Sold to Agencies</h3>
                        <p className="text-2xl font-bold text-orange-900">
                          {creditInventory.sold_to_agencies.toLocaleString()}
                        </p>
                      </div>
                      <div className="bg-green-50 p-4 rounded-lg">
                        <h3 className="text-sm font-medium text-green-800">Available Balance</h3>
                        <p className="text-2xl font-bold text-green-900">
                          {creditInventory.available_balance.toLocaleString()}
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-4 items-end">
                      <div className="flex-1">
                        <Label htmlFor="totalPurchased">Adjust Total Purchased</Label>
                        <Input
                          id="totalPurchased"
                          type="number"
                          value={totalPurchased}
                          onChange={(e) => setTotalPurchased(parseInt(e.target.value) || 0)}
                        />
                      </div>
                      <Button onClick={updateCreditInventory} className="bg-green-600 hover:bg-green-700">
                        Update Inventory
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Credit Pricing Control */}
            <Card className="border-green-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-800">
                  🏷️ Credit Pricing Control
                </CardTitle>
                <CardDescription>
                  Set and manage credit pricing for the platform
                </CardDescription>
              </CardHeader>
              <CardContent>
                {creditPricing && (
                  <div className="space-y-6">
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h3 className="text-sm font-medium text-gray-700">Current Price Per Credit</h3>
                      <p className="text-2xl font-bold text-gray-900">
                        ${creditPricing.price_per_credit.toFixed(4)} USD
                      </p>
                      <p className="text-sm text-gray-500">
                        Last updated: {new Date(creditPricing.last_updated).toLocaleString()}
                      </p>
                    </div>

                    <div className="flex gap-4 items-end">
                      <div className="flex-1">
                        <Label htmlFor="pricePerCredit">New Price Per Credit (USD)</Label>
                        <Input
                          id="pricePerCredit"
                          type="number"
                          step="0.0001"
                          value={newPricePerCredit}
                          onChange={(e) => setNewPricePerCredit(parseFloat(e.target.value) || 0)}
                        />
                      </div>
                      <Button onClick={updateCreditPricing} className="bg-green-600 hover:bg-green-700">
                        Update Pricing
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Real-time Activity */}
          <div>
            <RealtimeActivity />
          </div>
        </div>
      </div>
    </div>
  );
};

export default SuperAdminDashboard;
