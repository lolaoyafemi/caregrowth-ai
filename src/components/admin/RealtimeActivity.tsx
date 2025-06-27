
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { Activity, CreditCard, User, FileText } from 'lucide-react';

interface ActivityItem {
  id: string;
  type: 'credit_usage' | 'user_signup' | 'document_upload' | 'post_generation';
  description: string;
  timestamp: string;
  user_email?: string;
  metadata?: any;
}

const RealtimeActivity = () => {
  const [activities, setActivities] = useState<ActivityItem[]>([]);

  useEffect(() => {
    // Load initial activities
    loadRecentActivities();

    // Set up real-time subscriptions
    const creditUsageChannel = supabase
      .channel('credit-usage-activity')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'credit_usage_log'
        },
        (payload) => {
          const newActivity: ActivityItem = {
            id: payload.new.id,
            type: 'credit_usage',
            description: `${payload.new.credits_used} credits used for ${payload.new.tool}`,
            timestamp: payload.new.used_at,
            user_email: payload.new.email,
            metadata: payload.new
          };
          setActivities(prev => [newActivity, ...prev.slice(0, 49)]);
        }
      )
      .subscribe();

    const userSignupChannel = supabase
      .channel('user-signup-activity')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'users'
        },
        (payload) => {
          const newActivity: ActivityItem = {
            id: payload.new.id,
            type: 'user_signup',
            description: `New user registered`,
            timestamp: payload.new.created_at,
            user_email: payload.new.email,
            metadata: payload.new
          };
          setActivities(prev => [newActivity, ...prev.slice(0, 49)]);
        }
      )
      .subscribe();

    const documentUploadChannel = supabase
      .channel('document-upload-activity')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'google_documents'
        },
        (payload) => {
          const newActivity: ActivityItem = {
            id: payload.new.id,
            type: 'document_upload',
            description: `Document uploaded: ${payload.new.doc_title || 'Untitled'}`,
            timestamp: payload.new.created_at,
            metadata: payload.new
          };
          setActivities(prev => [newActivity, ...prev.slice(0, 49)]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(creditUsageChannel);
      supabase.removeChannel(userSignupChannel);
      supabase.removeChannel(documentUploadChannel);
    };
  }, []);

  const loadRecentActivities = async () => {
    try {
      // Load recent credit usage
      const { data: creditUsage } = await supabase
        .from('credit_usage_log')
        .select('*')
        .order('used_at', { ascending: false })
        .limit(20);

      // Load recent user signups
      const { data: userSignups } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      // Load recent document uploads
      const { data: documentUploads } = await supabase
        .from('google_documents')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      const allActivities: ActivityItem[] = [];

      // Add credit usage activities
      creditUsage?.forEach(item => {
        allActivities.push({
          id: item.id,
          type: 'credit_usage',
          description: `${item.credits_used} credits used for ${item.tool}`,
          timestamp: item.used_at,
          user_email: item.email,
          metadata: item
        });
      });

      // Add user signup activities
      userSignups?.forEach(item => {
        allActivities.push({
          id: item.id,
          type: 'user_signup',
          description: `New user registered`,
          timestamp: item.created_at,
          user_email: item.email,
          metadata: item
        });
      });

      // Add document upload activities
      documentUploads?.forEach(item => {
        allActivities.push({
          id: item.id,
          type: 'document_upload',
          description: `Document uploaded: ${item.doc_title || 'Untitled'}`,
          timestamp: item.created_at,
          metadata: item
        });
      });

      // Sort by timestamp and take the most recent 50
      const sortedActivities = allActivities
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 50);

      setActivities(sortedActivities);
    } catch (error) {
      console.error('Error loading activities:', error);
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'credit_usage':
        return <CreditCard className="h-4 w-4" />;
      case 'user_signup':
        return <User className="h-4 w-4" />;
      case 'document_upload':
        return <FileText className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  const getActivityBadge = (type: string) => {
    const configs = {
      credit_usage: { variant: 'default' as const, className: 'bg-blue-100 text-blue-800' },
      user_signup: { variant: 'default' as const, className: 'bg-green-100 text-green-800' },
      document_upload: { variant: 'default' as const, className: 'bg-purple-100 text-purple-800' },
      post_generation: { variant: 'default' as const, className: 'bg-orange-100 text-orange-800' }
    };
    
    const config = configs[type as keyof typeof configs] || configs.credit_usage;
    return <Badge variant={config.variant} className={config.className}>{type.replace('_', ' ')}</Badge>;
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInMinutes = Math.floor((now.getTime() - time.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  return (
    <Card className="border-green-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-green-800">
          <Activity className="h-5 w-5" />
          Real-time Activity Feed
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-96">
          <div className="space-y-3">
            {activities.map((activity) => (
              <div key={activity.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="mt-1">
                  {getActivityIcon(activity.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {getActivityBadge(activity.type)}
                    <span className="text-sm text-gray-500">
                      {formatTimeAgo(activity.timestamp)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-900">{activity.description}</p>
                  {activity.user_email && (
                    <p className="text-xs text-gray-500 mt-1">{activity.user_email}</p>
                  )}
                </div>
              </div>
            ))}
            {activities.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No recent activity
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default RealtimeActivity;
