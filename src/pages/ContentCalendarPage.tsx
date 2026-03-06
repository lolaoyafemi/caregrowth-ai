import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { 
  CalendarDays, ChevronLeft, ChevronRight, Plus, Clock, 
  Edit2, RotateCcw, Facebook, Instagram, Linkedin, Twitter,
  Loader2, Link2, AlertCircle, GripVertical, FileText, CheckCircle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useUserCredits } from '@/hooks/useUserCredits';
import { cn } from '@/lib/utils';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, addDays, addMonths, subMonths, isSameDay, isSameMonth, isToday, isTomorrow, addWeeks, subWeeks } from 'date-fns';
import ConnectAccountsPanel from '@/components/calendar/ConnectAccountsPanel';
import EditPostDialog from '@/components/calendar/EditPostDialog';
import CalendarAnalytics from '@/components/calendar/CalendarAnalytics';
import PlatformPreview from '@/components/calendar/PlatformPreview';
import StartEngineWizard from '@/components/calendar/StartEngineWizard';
import BusinessDetailsForm from '@/components/business/BusinessDetailsForm';
import { Building2 } from 'lucide-react';

const PLATFORM_CONFIG = {
  facebook: { icon: Facebook, label: 'Facebook', color: 'bg-blue-600' },
  instagram: { icon: Instagram, label: 'Instagram', color: 'bg-gradient-to-br from-purple-500 to-pink-500' },
  linkedin: { icon: Linkedin, label: 'LinkedIn', color: 'bg-blue-700' },
  x: { icon: Twitter, label: 'X', color: 'bg-black' },
};

const STATUS_CONFIG = {
  scheduled: { label: 'Scheduled', className: 'bg-amber-100 text-amber-800 border-amber-200' },
  published: { label: 'Published', className: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  failed: { label: 'Failed', className: 'bg-red-100 text-red-800 border-red-200' },
  skipped: { label: 'Skipped', className: 'bg-orange-100 text-orange-800 border-orange-200' },
  draft: { label: 'Draft', className: 'bg-gray-100 text-gray-800 border-gray-200' },
};

interface ContentPost {
  id: string;
  platform: string;
  content: string;
  image_url: string | null;
  scheduled_at: string;
  status: string;
  error_message?: string | null;
  batch_id?: string | null;
}

const ContentCalendarPage = () => {
  const [posts, setPosts] = useState<ContentPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [calendarView, setCalendarView] = useState<'week' | 'month'>('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date>(new Date());
  const [generateOpen, setGenerateOpen] = useState(false);
  const [connectOpen, setConnectOpen] = useState(false);
  const [editPost, setEditPost] = useState<ContentPost | null>(null);
  const [drawerPost, setDrawerPost] = useState<ContentPost | null>(null);
  const [previewPost, setPreviewPost] = useState<ContentPost | null>(null);
  const [generating, setGenerating] = useState(false);
  const [generationMessage, setGenerationMessage] = useState('');
  const [connectedPlatforms, setConnectedPlatforms] = useState<string[]>([]);
  const [dragOverDay, setDragOverDay] = useState<string | null>(null);
  const [businessName, setBusinessName] = useState('Your Business');
  const [showBusinessForm, setShowBusinessForm] = useState(false);
  const [profileInitial, setProfileInitial] = useState('B');
  const { credits, refetch: refetchCredits } = useUserCredits();

  const fetchConnectedAccounts = useCallback(async () => {
    try {
      const { data } = await supabase
        .from('connected_accounts')
        .select('platform, is_connected')
        .eq('is_connected', true);
      setConnectedPlatforms((data || []).map((a: any) => a.platform));
    } catch {}
  }, []);

  const fetchUserProfile = useCallback(async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user?.id) return;
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('business_name, full_name')
        .eq('user_id', userData.user.id)
        .maybeSingle();
      if (profile) {
        const name = profile.business_name || profile.full_name || 'Your Business';
        setBusinessName(name);
        setProfileInitial(name.charAt(0).toUpperCase());
      }
    } catch {}
  }, []);

  const fetchPosts = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('content_posts')
        .select('*')
        .order('scheduled_at', { ascending: true });

      if (error) throw error;

      const mapped: ContentPost[] = (data || []).map((p: any) => ({
        id: p.id,
        platform: p.platform,
        content: p.post_body,
        image_url: p.image_url || null,
        scheduled_at: p.scheduled_at,
        status: p.status,
        error_message: p.error_message || null,
        batch_id: p.batch_id,
      }));

      setPosts(mapped);
    } catch (err: any) {
      console.error('Error fetching posts:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPosts();
    fetchConnectedAccounts();
    fetchUserProfile();
  }, [fetchPosts, fetchConnectedAccounts, fetchUserProfile]);

  const handleGenerate = async (wizardResult: { mode: string; days: number; platforms: string[]; frequency: number; campaignName?: string; campaignGoal?: string }) => {
    const { days, platforms: wizPlatforms, frequency } = wizardResult;
    const totalPosts = days * wizPlatforms.length * frequency;
    
    if (credits < totalPosts) {
      toast.error(`You need ${totalPosts} credits. You have ${credits}.`);
      return;
    }

    setGenerateOpen(false);
    setGenerating(true);
    const messages = [
      "All set… I'm lining everything up.",
      "Crafting your content with care…",
      "Almost there — putting the finishing touches on your posts…",
      "Your calendar is filling up nicely…",
      "Generating branded images for each post…",
    ];
    let msgIndex = 0;
    setGenerationMessage(messages[0]);
    const msgInterval = setInterval(() => {
      msgIndex = (msgIndex + 1) % messages.length;
      setGenerationMessage(messages[msgIndex]);
    }, 3000);

    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;
      if (!userId) throw new Error('Not authenticated');

      const { data: profileData } = await supabase
        .from('user_profiles')
        .select('preferred_post_time, timezone, reschedule_count, business_name')
        .eq('user_id', userId)
        .maybeSingle();

      const preferredTime = profileData?.preferred_post_time || '09:00:00';
      const [prefHour, prefMin] = preferredTime.split(':').map(Number);
      const userBusinessName = profileData?.business_name || businessName;

      const { data: batchData, error: batchError } = await supabase
        .from('content_batches')
        .insert({
          user_id: userId,
          days,
          platforms: wizPlatforms,
          created_by: userId,
        })
        .select()
        .single();

      if (batchError) throw batchError;
      const batchId = batchData.id;

      const categories = ['attract', 'connect', 'transact'];
      const tones = ['professional', 'conversational', 'enthusiastic', 'authoritative', 'humorous'];

      // Build all generation requests upfront
      const generationRequests: { platform: string; category: string; tone: string; scheduledDate: Date }[] = [];

      for (let day = 0; day < days; day++) {
        for (let freq = 0; freq < frequency; freq++) {
          const scheduledDate = addDays(new Date(), day + 1);
          const hourOffset = freq * 4;
          scheduledDate.setHours(prefHour + hourOffset, prefMin, 0, 0);

          for (const platform of wizPlatforms) {
            const category = categories[(day * frequency + freq) % categories.length];
            const tone = tones[(day * frequency + freq) % tones.length];
            generationRequests.push({ platform, category, tone, scheduledDate: new Date(scheduledDate) });
          }
        }
      }

      // Generate posts in parallel batches of 5
      const BATCH_SIZE = 5;
      const postsToInsert: any[] = [];

      for (let i = 0; i < generationRequests.length; i += BATCH_SIZE) {
        const batch = generationRequests.slice(i, i + BATCH_SIZE);
        const results = await Promise.allSettled(
          batch.map(async (req) => {
            const { data, error } = await supabase.functions.invoke('generate-post', {
              body: { userId, postType: req.category, tone: req.tone, platform: req.platform, audience: '', subject: '' }
            });
            if (error) throw error;
            return { req, data };
          })
        );

        for (const result of results) {
          if (result.status === 'fulfilled') {
            const { req, data } = result.value;
            const postBody = data?.post || `${data?.hook || ''}\n\n${data?.body || ''}\n\n${data?.cta || ''}`.trim();
            postsToInsert.push({
              user_id: userId,
              batch_id: batchId,
              platform: req.platform,
              post_body: postBody,
              scheduled_at: req.scheduledDate.toISOString(),
              status: 'scheduled',
              hook_line: data?.hook || postBody.split('\n')[0]?.substring(0, 100) || '',
              headline: data?.headline || '',
              subheadline: data?.subheadline || '',
            });
          } else {
            const req = batch[results.indexOf(result)];
            console.error(`Failed to generate for ${req.platform}:`, result.reason);
            postsToInsert.push({
              user_id: userId,
              batch_id: batchId,
              platform: req.platform,
              post_body: `[Content pending — generation will retry]`,
              scheduled_at: req.scheduledDate.toISOString(),
              status: 'draft',
              hook_line: '',
            });
          }
        }
      }

      if (postsToInsert.length > 0) {
        const dbPosts = postsToInsert.map(({ hook_line, ...rest }) => rest);
        const { data: inserted, error: insertError } = await supabase
          .from('content_posts')
          .insert(dbPosts)
          .select();

        if (insertError) throw insertError;

        if (inserted) {
          const newPosts: ContentPost[] = inserted.map((p: any) => ({
            id: p.id,
            platform: p.platform,
            content: p.post_body,
            image_url: p.image_url || null,
            scheduled_at: p.scheduled_at,
            status: p.status,
            error_message: null,
            batch_id: p.batch_id,
          }));

          setPosts(prev => [...prev, ...newPosts].sort(
            (a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()
          ));

          for (let i = 0; i < inserted.length; i++) {
            const p = inserted[i];
            const hookLine = postsToInsert[i]?.hook_line || p.post_body.split('\n')[0]?.substring(0, 100) || 'Your Post';

            supabase.functions.invoke('generate-post-image', {
              body: {
                hook_line: hookLine,
                business_name: userBusinessName,
                post_id: p.id,
                platform: p.platform,
              },
            }).then(({ data: imgData }) => {
              if (imgData?.image_url) {
                setPosts(prev => prev.map(post =>
                  post.id === p.id ? { ...post, image_url: imgData.image_url } : post
                ));
              }
            }).catch(err => {
              console.error(`Image gen failed for post ${p.id}:`, err);
            });
          }
        }
      }

      await supabase.rpc('deduct_credits_fifo', {
        p_user_id: userId,
        p_credits_to_deduct: postsToInsert.filter(p => p.status === 'scheduled').length,
      });

      refetchCredits();
      toast.success(`All set. Your next ${days} days are ready.`);
    } catch (err: any) {
      console.error('Generation error:', err);
      toast.error(`Something went wrong: ${err.message}`);
    } finally {
      clearInterval(msgInterval);
      setGenerating(false);
      setGenerationMessage('');
    }
  };

  const handleRetry = async (post: ContentPost) => {
    try {
      const { error } = await supabase
        .from('content_posts')
        .update({ status: 'scheduled' })
        .eq('id', post.id);

      if (error) throw error;
      toast.success('Post rescheduled for publishing.');
      fetchPosts();
    } catch (err: any) {
      toast.error('Failed to retry: ' + err.message);
    }
  };


  const handleDragStart = (e: React.DragEvent, postId: string) => {
    e.dataTransfer.setData('text/plain', postId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, dayKey: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverDay(dayKey);
  };

  const handleDragLeave = () => {
    setDragOverDay(null);
  };

  const handleDrop = async (e: React.DragEvent, targetDay: Date) => {
    e.preventDefault();
    setDragOverDay(null);
    const postId = e.dataTransfer.getData('text/plain');
    if (!postId) return;

    const post = posts.find(p => p.id === postId);
    if (!post) return;

    const originalDate = new Date(post.scheduled_at);
    const newDate = new Date(targetDay);
    newDate.setHours(originalDate.getHours(), originalDate.getMinutes(), 0, 0);

    setPosts(prev => prev.map(p =>
      p.id === postId ? { ...p, scheduled_at: newDate.toISOString() } : p
    ).sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()));

    try {
      const { error } = await supabase
        .from('content_posts')
        .update({ scheduled_at: newDate.toISOString() })
        .eq('id', postId);

      if (error) throw error;

      try {
        const { data: userData } = await supabase.auth.getUser();
        if (userData?.user?.id) {
          const { data: profile } = await supabase
            .from('user_profiles')
            .select('reschedule_count')
            .eq('user_id', userData.user.id)
            .single();

          const newCount = (profile?.reschedule_count || 0) + 1;
          if (newCount >= 3) {
            await supabase
              .from('user_profiles')
              .update({
                reschedule_count: newCount,
                preferred_post_time: format(newDate, 'HH:mm:ss'),
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
              })
              .eq('user_id', userData.user.id);
          } else {
            await supabase
              .from('user_profiles')
              .update({ reschedule_count: newCount })
              .eq('user_id', userData.user.id);
          }
        }
      } catch {}

      toast.success(`Post moved to ${format(newDate, 'MMM d')}.`);
    } catch (err: any) {
      fetchPosts();
      toast.error('Could not reschedule: ' + err.message);
    }
  };

  const getPostsForDay = (date: Date) => posts.filter(p => isSameDay(new Date(p.scheduled_at), date));
  
  const getWeekDays = () => {
    const start = startOfWeek(currentDate, { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end: addDays(start, 6) });
  };

  const getMonthDays = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: calStart, end: calEnd });
  };

  const navigateCalendar = (dir: 'prev' | 'next') => {
    if (calendarView === 'week') {
      setCurrentDate(prev => dir === 'next' ? addWeeks(prev, 1) : subWeeks(prev, 1));
    } else {
      setCurrentDate(prev => dir === 'next' ? addMonths(prev, 1) : subMonths(prev, 1));
    }
  };

  const selectedDayPosts = posts.filter(p => isSameDay(new Date(p.scheduled_at), selectedDay));
  const nextDayPosts = posts.filter(p => isSameDay(new Date(p.scheduled_at), addDays(selectedDay, 1)));
  const restOfWeekPosts = posts.filter(p => {
    const d = new Date(p.scheduled_at);
    const weekStart = startOfWeek(selectedDay, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(selectedDay, { weekStartsOn: 1 });
    return d >= weekStart && d <= weekEnd && !isSameDay(d, selectedDay) && !isSameDay(d, addDays(selectedDay, 1));
  });

  // Stats
  const drafts = posts.filter(p => p.status === 'draft').length;
  const scheduled = posts.filter(p => p.status === 'scheduled').length;
  const published = posts.filter(p => p.status === 'published').length;

  const PlatformIcon = ({ platform, size = 14 }: { platform: string; size?: number }) => {
    const config = PLATFORM_CONFIG[platform as keyof typeof PLATFORM_CONFIG];
    if (!config) return null;
    const Icon = config.icon;
    return <Icon size={size} />;
  };

  const QueuePostCard = ({ post }: { post: ContentPost }) => {
    const statusConfig = STATUS_CONFIG[post.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.draft;
    return (
      <div
        className="border rounded-lg p-2.5 bg-card hover:shadow-sm transition-shadow cursor-pointer"
        onClick={() => setEditPost(post)}
      >
        <div className="flex items-center gap-2 mb-1.5">
          <div className={cn("w-5 h-5 rounded flex items-center justify-center text-white shrink-0", PLATFORM_CONFIG[post.platform as keyof typeof PLATFORM_CONFIG]?.color || 'bg-gray-500')}>
            <PlatformIcon platform={post.platform} size={12} />
          </div>
          <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", statusConfig.className)}>
            {statusConfig.label}
          </Badge>
          {(post.status === 'failed' || post.status === 'skipped') && (
            <Button variant="ghost" size="sm" className="h-5 w-5 p-0 ml-auto" onClick={(e) => { e.stopPropagation(); handleRetry(post); }} title="Retry publishing">
              <RotateCcw size={11} />
            </Button>
          )}
        </div>
        {post.image_url && (
          <img src={post.image_url} alt="" className="w-full h-16 object-cover rounded mb-1.5" />
        )}
        <p className="text-xs text-foreground line-clamp-2 leading-relaxed">
          {post.content}
        </p>
        <div className="flex items-center gap-1 mt-1.5 text-[10px] text-muted-foreground">
          <Clock size={10} />
          {format(new Date(post.scheduled_at), 'MMM d, h:mm a')}
        </div>
        {post.status === 'failed' && post.error_message && (
          <p className="text-[10px] text-destructive mt-1 flex items-center gap-1">
            <AlertCircle size={10} /> {post.error_message}
          </p>
        )}
        {post.status === 'skipped' && post.error_message && (
          <p className="text-[10px] text-orange-600 mt-1 flex items-center gap-1">
            <AlertCircle size={10} /> {post.error_message}
          </p>
        )}
      </div>
    );
  };

  const calDays = calendarView === 'week' ? getWeekDays() : getMonthDays();

  const selectedDayLabel = isToday(selectedDay) ? 'Today' : isTomorrow(selectedDay) ? 'Tomorrow' : format(selectedDay, 'EEE, MMM d');
  const nextDayLabel = isToday(addDays(selectedDay, 1)) ? 'Today' : isTomorrow(addDays(selectedDay, 1)) ? 'Tomorrow' : format(addDays(selectedDay, 1), 'EEE, MMM d');

  const businessHandle = businessName.toLowerCase().replace(/[^a-z0-9]/g, '_');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      {/* Header — matches reference project */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
            Onboarding
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Plan, schedule, and auto-publish your social media content across platforms.
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <Button
            onClick={() => setGenerateOpen(true)}
            className="bg-primary hover:bg-primary/90 gap-2 font-semibold tracking-wide"
          >
            <Plus size={16} /> Start Posting
          </Button>

          <StartEngineWizard
            open={generateOpen}
            onOpenChange={setGenerateOpen}
            credits={credits}
            onDeploy={handleGenerate}
          />

          {/* Generating overlay dialog */}
          {generating && (
            <Dialog open={generating}>
              <DialogContent className="sm:max-w-md">
                <div className="py-12 text-center space-y-4">
                  <div className="space-y-3">
                    <div className="h-3 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full animate-pulse" style={{ width: '70%' }} />
                    </div>
                    <div className="h-2 bg-muted rounded w-3/4 mx-auto animate-pulse" />
                    <div className="h-2 bg-muted rounded w-1/2 mx-auto animate-pulse" />
                  </div>
                  <p className="text-sm text-muted-foreground mt-4">{generationMessage}</p>
                </div>
              </DialogContent>
            </Dialog>
          )}

          <Button
            variant="outline"
            onClick={() => setShowBusinessForm(true)}
            className="gap-2"
          >
            <Building2 size={16} /> Business Details
          </Button>

          <Dialog open={connectOpen} onOpenChange={(open) => { setConnectOpen(open); if (!open) fetchConnectedAccounts(); }}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Link2 size={16} /> Connect Accounts
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Connect Your Social Accounts</DialogTitle>
              </DialogHeader>
              <ConnectAccountsPanel />
            </DialogContent>
          </Dialog>
        </div>
      </div>


      <CalendarAnalytics posts={posts} />

      {/* Calendar + Queue Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* Calendar */}
        <div className="xl:col-span-3">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Button variant="ghost" size="sm" onClick={() => navigateCalendar('prev')}>
                    <ChevronLeft size={16} />
                  </Button>
                  <h3 className="text-lg font-semibold">
                    {calendarView === 'week'
                      ? `${format(getWeekDays()[0], 'MMM d')} – ${format(getWeekDays()[6], 'MMM d, yyyy')}`
                      : format(currentDate, 'MMMM yyyy')
                    }
                  </h3>
                  <Button variant="ghost" size="sm" onClick={() => navigateCalendar('next')}>
                    <ChevronRight size={16} />
                  </Button>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs h-7"
                    onClick={() => { setCurrentDate(new Date()); setSelectedDay(new Date()); }}
                  >
                    Today
                  </Button>
                  <Tabs value={calendarView} onValueChange={(v) => setCalendarView(v as 'week' | 'month')}>
                    <TabsList className="h-8">
                      <TabsTrigger value="week" className="text-xs px-3 h-7">Week</TabsTrigger>
                      <TabsTrigger value="month" className="text-xs px-3 h-7">Month</TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-1 mb-1">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                  <div key={day} className="text-center text-xs font-medium text-muted-foreground py-2">
                    {day}
                  </div>
                ))}
              </div>
              <div className={cn(
                "grid grid-cols-7 gap-1",
                calendarView === 'week' ? 'grid-rows-1' : ''
              )}>
                {calDays.map((day, i) => {
                  const dayPosts = getPostsForDay(day);
                  const isCurrentMonth = isSameMonth(day, currentDate);
                  const dayKey = format(day, 'yyyy-MM-dd');
                  const isSelected = isSameDay(day, selectedDay);
                  const isDragOver = dragOverDay === dayKey;

                  return (
                    <div
                      key={i}
                      className={cn(
                        "border rounded-lg p-1.5 transition-all cursor-pointer relative",
                        calendarView === 'week' ? 'min-h-[120px]' : 'min-h-[80px]',
                        isSelected
                          ? 'border-primary ring-2 ring-primary/30 bg-primary/5'
                          : isToday(day)
                            ? 'border-primary/50 bg-primary/5'
                            : 'border-border hover:border-muted-foreground/30',
                        !isCurrentMonth && calendarView === 'month' && 'opacity-40',
                        isDragOver && 'ring-2 ring-primary/50 bg-primary/5 border-primary'
                      )}
                      onClick={() => setSelectedDay(day)}
                      onDragOver={(e) => handleDragOver(e, dayKey)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, day)}
                    >
                      <div className={cn(
                        "text-xs font-medium mb-1 px-0.5 flex items-center gap-1",
                        isSelected ? 'text-primary font-bold' : isToday(day) ? 'text-primary' : 'text-muted-foreground'
                      )}>
                        <span className={cn(
                          "w-5 h-5 flex items-center justify-center rounded-full text-[11px]",
                          (isToday(day) || isSelected) && 'bg-primary text-primary-foreground'
                        )}>
                          {format(day, 'd')}
                        </span>
                        {dayPosts.length > 0 && (
                          <span className="ml-0.5 text-[9px] text-muted-foreground/60">{dayPosts.length}</span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-1 mt-0.5">
                        {dayPosts.map((post) => {
                          const config = PLATFORM_CONFIG[post.platform as keyof typeof PLATFORM_CONFIG];
                          if (!config) return null;
                          const Icon = config.icon;
                          return (
                            <div
                              key={post.id}
                              draggable
                              onDragStart={(e) => handleDragStart(e, post.id)}
                              className={cn(
                                "w-5 h-5 rounded flex items-center justify-center text-white cursor-grab active:cursor-grabbing hover:scale-110 transition-transform",
                                config.color
                              )}
                              title={`${config.label} — drag to reschedule`}
                              onClick={(e) => {
                                e.stopPropagation();
                                setPreviewPost(post);
                              }}
                            >
                              <Icon size={11} />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="text-[10px] text-muted-foreground mt-2 flex items-center gap-1">
                <GripVertical size={10} /> Drag icons between days to reschedule · Click a day to view its queue
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Queue Panel */}
        <div className="xl:col-span-1">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <CalendarDays size={16} /> Queue
              </CardTitle>
              <p className="text-[10px] text-muted-foreground">
                {format(selectedDay, 'MMM d, yyyy')}
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{selectedDayLabel}</h4>
                {selectedDayPosts.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">Nothing scheduled</p>
                ) : (
                  <div className="space-y-2">
                    {selectedDayPosts.map(post => <QueuePostCard key={post.id} post={post} />)}
                  </div>
                )}
              </div>
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{nextDayLabel}</h4>
                {nextDayPosts.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">Nothing scheduled</p>
                ) : (
                  <div className="space-y-2">
                    {nextDayPosts.map(post => <QueuePostCard key={post.id} post={post} />)}
                  </div>
                )}
              </div>
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Rest of Week</h4>
                {restOfWeekPosts.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">Nothing else this week</p>
                ) : (
                  <div className="space-y-2">
                    {restOfWeekPosts.slice(0, 5).map(post => <QueuePostCard key={post.id} post={post} />)}
                    {restOfWeekPosts.length > 5 && (
                      <p className="text-xs text-muted-foreground text-center">+{restOfWeekPosts.length - 5} more</p>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Side Drawer */}
      <Sheet open={!!drawerPost} onOpenChange={(open) => !open && setDrawerPost(null)}>
        <SheetContent className="sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>
              {drawerPost && format(new Date(drawerPost.scheduled_at), 'EEEE, MMMM d')}
            </SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-3">
            {drawerPost && getPostsForDay(new Date(drawerPost.scheduled_at)).map(post => {
              const statusCfg = STATUS_CONFIG[post.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.draft;
              return (
                <div key={post.id} className="border rounded-lg p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className={cn("w-6 h-6 rounded flex items-center justify-center text-white", PLATFORM_CONFIG[post.platform as keyof typeof PLATFORM_CONFIG]?.color || 'bg-gray-500')}>
                      <PlatformIcon platform={post.platform} size={14} />
                    </div>
                    <span className="text-sm font-medium capitalize">{post.platform}</span>
                    <Badge variant="outline" className={cn("text-xs ml-auto", statusCfg.className)}>
                      {statusCfg.label}
                    </Badge>
                  </div>
                  {post.image_url && (
                    <img src={post.image_url} alt="" className="w-full max-h-40 object-cover rounded-lg" />
                  )}
                  <p className="text-sm text-foreground whitespace-pre-wrap">{post.content}</p>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Clock size={12} /> {format(new Date(post.scheduled_at), 'h:mm a')}</span>
                    <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => { setDrawerPost(null); setEditPost(post); }}>
                      <Edit2 size={12} /> Edit
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </SheetContent>
      </Sheet>

      {editPost && (
        <EditPostDialog
          post={{
            id: editPost.id,
            platform: editPost.platform,
            content: editPost.content,
            scheduled_at: editPost.scheduled_at,
            status: editPost.status,
            error_message: editPost.error_message || null,
            image_url: editPost.image_url,
          }}
          open={!!editPost}
          onOpenChange={(open) => !open && setEditPost(null)}
          onSaved={() => { setEditPost(null); fetchPosts(); }}
        />
      )}

      <PlatformPreview
        post={previewPost}
        open={!!previewPost}
        onOpenChange={(open) => !open && setPreviewPost(null)}
        onEdit={() => { const p = previewPost; setPreviewPost(null); setEditPost(p); }}
        businessName={businessName}
        businessHandle={businessHandle}
        profileInitial={profileInitial}
      />

      {showBusinessForm && (
        <BusinessDetailsForm 
          onClose={() => {
            setShowBusinessForm(false);
            fetchUserProfile();
          }} 
        />
      )}
    </div>
  );
};

export default ContentCalendarPage;
