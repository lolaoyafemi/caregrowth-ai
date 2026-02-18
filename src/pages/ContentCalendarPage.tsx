import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { 
  CalendarDays, ChevronLeft, ChevronRight, Plus, Clock, 
  Edit2, RotateCcw, Facebook, Instagram, Linkedin, Twitter,
  Loader2, Link2, AlertCircle, GripVertical
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useUserCredits } from '@/hooks/useUserCredits';
import { cn } from '@/lib/utils';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, addDays, addMonths, subMonths, isSameDay, isSameMonth, isToday, isTomorrow, addWeeks, subWeeks } from 'date-fns';
import ConnectAccountsPanel from '@/components/calendar/ConnectAccountsPanel';
import EditPostDialog from '@/components/calendar/EditPostDialog';
import CalendarAnalytics from '@/components/calendar/CalendarAnalytics';
import PlatformPreview from '@/components/calendar/PlatformPreview';

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
  const [selectedDays, setSelectedDays] = useState<string>('7');
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [generationMessage, setGenerationMessage] = useState('');
  const [connectedPlatforms, setConnectedPlatforms] = useState<string[]>([]);
  const [dragOverDay, setDragOverDay] = useState<string | null>(null);
  const [businessName, setBusinessName] = useState('Your Business');
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

  // SINGLE SOURCE OF TRUTH: Only read from content_posts
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

  const handleGenerate = async () => {
    if (selectedPlatforms.length === 0) {
      toast.error('Please select at least one platform.');
      return;
    }

    const days = parseInt(selectedDays);
    const totalPosts = days * selectedPlatforms.length;
    
    if (credits < totalPosts) {
      toast.error(`You need ${totalPosts} credits. You have ${credits}.`);
      return;
    }

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

      // Get user's preferred time
      const { data: profileData } = await supabase
        .from('user_profiles')
        .select('preferred_post_time, timezone, reschedule_count, business_name')
        .eq('user_id', userId)
        .maybeSingle();

      const preferredTime = profileData?.preferred_post_time || '09:00:00';
      const [prefHour, prefMin] = preferredTime.split(':').map(Number);
      const userBusinessName = profileData?.business_name || businessName;

      // 1. Create content_batch record
      const { data: batchData, error: batchError } = await supabase
        .from('content_batches')
        .insert({
          user_id: userId,
          days,
          platforms: selectedPlatforms,
          created_by: userId,
        })
        .select()
        .single();

      if (batchError) throw batchError;
      const batchId = batchData.id;

      const categories = ['attract', 'connect', 'transact'];
      const tones = ['professional', 'conversational', 'enthusiastic', 'authoritative', 'humorous'];

      const postsToInsert: any[] = [];

      for (let day = 0; day < days; day++) {
        const scheduledDate = addDays(new Date(), day + 1);
        scheduledDate.setHours(prefHour, prefMin, 0, 0);

        for (const platform of selectedPlatforms) {
          const category = categories[day % categories.length];
          const tone = tones[day % tones.length];

          try {
            const { data, error } = await supabase.functions.invoke('generate-post', {
              body: { userId, postType: category, tone, platform, audience: '', subject: '' }
            });

            if (error) throw error;

            const postBody = data?.post || `${data?.hook || ''}\n\n${data?.body || ''}\n\n${data?.cta || ''}`.trim();

            postsToInsert.push({
              user_id: userId,
              batch_id: batchId,
              platform,
              post_body: postBody,
              scheduled_at: scheduledDate.toISOString(),
              status: 'scheduled',
              hook_line: data?.hook || postBody.split('\n')[0]?.substring(0, 100) || '',
            });
          } catch (genErr) {
            console.error(`Failed to generate for ${platform} day ${day + 1}:`, genErr);
            postsToInsert.push({
              user_id: userId,
              batch_id: batchId,
              platform,
              post_body: `[Content pending — generation will retry]`,
              scheduled_at: scheduledDate.toISOString(),
              status: 'draft',
              hook_line: '',
            });
          }
        }
      }

      if (postsToInsert.length > 0) {
        // Insert posts (strip hook_line before insert since it's not a DB column)
        const dbPosts = postsToInsert.map(({ hook_line, ...rest }) => rest);
        const { data: inserted, error: insertError } = await supabase
          .from('content_posts')
          .insert(dbPosts)
          .select();

        if (insertError) throw insertError;

        // Generate images for each post in background
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

          // Fire-and-forget image generation for each post
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
      setGenerateOpen(false);
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

  const togglePlatform = (platform: string) => {
    setSelectedPlatforms(prev =>
      prev.includes(platform) ? prev.filter(p => p !== platform) : [...prev, platform]
    );
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

    // Optimistic update
    setPosts(prev => prev.map(p =>
      p.id === postId ? { ...p, scheduled_at: newDate.toISOString() } : p
    ).sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()));

    try {
      const { error } = await supabase
        .from('content_posts')
        .update({ scheduled_at: newDate.toISOString() })
        .eq('id', postId);

      if (error) throw error;

      // Track reschedule for smart scheduling
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
            // Learn preferred time after 3+ reschedules
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
          {post.status === 'failed' && (
            <Button variant="ghost" size="sm" className="h-5 w-5 p-0 ml-auto" onClick={(e) => { e.stopPropagation(); handleRetry(post); }}>
              <RotateCcw size={11} />
            </Button>
          )}
          {post.status === 'skipped' && (
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
    <div className="p-6">
      {/* Header */}
      <div className="mb-6 bg-gradient-to-r from-indigo-50 to-blue-50 p-6 rounded-lg border border-indigo-100">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Content Calendar</h2>
        <p className="text-gray-700">
          Plan, schedule, and auto-publish your social media content across platforms. Let's keep your audience engaged consistently.
        </p>
      </div>

      <CalendarAnalytics posts={posts} />

      <div className="flex flex-wrap gap-3 mb-6">
        <Dialog open={generateOpen} onOpenChange={setGenerateOpen}>
          <DialogTrigger asChild>
            <Button className="bg-caregrowth-blue hover:bg-caregrowth-blue/90 gap-2">
              <Plus size={16} /> Generate Posts
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Generate Your Content Plan</DialogTitle>
            </DialogHeader>
            {generating ? (
              <div className="py-12 text-center space-y-4">
                <div className="space-y-3">
                  <div className="h-3 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-caregrowth-blue rounded-full animate-pulse" style={{ width: '70%' }} />
                  </div>
                  <div className="h-2 bg-muted rounded w-3/4 mx-auto animate-pulse" />
                  <div className="h-2 bg-muted rounded w-1/2 mx-auto animate-pulse" />
                </div>
                <p className="text-sm text-muted-foreground mt-4">{generationMessage}</p>
              </div>
            ) : (
              <div className="space-y-6 py-4">
                <div>
                  <Label className="text-sm font-medium mb-3 block">How many days of content?</Label>
                  <RadioGroup value={selectedDays} onValueChange={setSelectedDays} className="flex gap-4">
                    {['7', '14', '30'].map(d => (
                      <div key={d} className="flex items-center space-x-2">
                        <RadioGroupItem value={d} id={`days-${d}`} />
                        <Label htmlFor={`days-${d}`} className="cursor-pointer">{d} days</Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>
                <div>
                  <Label className="text-sm font-medium mb-3 block">Which platforms?</Label>
                  <div className="grid grid-cols-2 gap-3">
                    {Object.entries(PLATFORM_CONFIG).map(([key, config]) => (
                      <label key={key} className={cn(
                        "flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-all",
                        selectedPlatforms.includes(key) ? "border-caregrowth-blue bg-caregrowth-lightblue" : "hover:border-gray-300"
                      )}>
                        <Checkbox
                          checked={selectedPlatforms.includes(key)}
                          onCheckedChange={() => togglePlatform(key)}
                        />
                        <config.icon size={18} />
                        <span className="text-sm">{config.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">
                  This will generate {parseInt(selectedDays) * selectedPlatforms.length} posts using {parseInt(selectedDays) * selectedPlatforms.length} credits.
                  You have <span className="font-medium">{credits}</span> credits available.
                </div>
                <Button
                  onClick={handleGenerate}
                  disabled={selectedPlatforms.length === 0 || credits < parseInt(selectedDays) * selectedPlatforms.length}
                  className="w-full bg-caregrowth-blue hover:bg-caregrowth-blue/90"
                >
                  Generate {parseInt(selectedDays) * selectedPlatforms.length} Posts
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>

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
                          ? 'border-caregrowth-blue ring-2 ring-caregrowth-blue/30 bg-blue-50/70'
                          : isToday(day)
                            ? 'border-caregrowth-blue/50 bg-blue-50/30'
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
                        isSelected ? 'text-caregrowth-blue font-bold' : isToday(day) ? 'text-caregrowth-blue' : 'text-muted-foreground'
                      )}>
                        <span className={cn(
                          "w-5 h-5 flex items-center justify-center rounded-full text-[11px]",
                          isToday(day) && !isSelected && 'bg-caregrowth-blue text-white',
                          isSelected && 'bg-caregrowth-blue text-white'
                        )}>
                          {format(day, 'd')}
                        </span>
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
        <div className="xl:col-span-1 space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <CalendarDays size={16} /> Queue
              </CardTitle>
              <p className="text-[10px] text-muted-foreground">
                Showing posts for {format(selectedDay, 'MMM d, yyyy')}
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">{selectedDayLabel}</h4>
                {selectedDayPosts.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">Nothing scheduled</p>
                ) : (
                  <div className="space-y-2">
                    {selectedDayPosts.map(post => <QueuePostCard key={post.id} post={post} />)}
                  </div>
                )}
              </div>
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">{nextDayLabel}</h4>
                {nextDayPosts.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">Nothing scheduled</p>
                ) : (
                  <div className="space-y-2">
                    {nextDayPosts.map(post => <QueuePostCard key={post.id} post={post} />)}
                  </div>
                )}
              </div>
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Rest of Week</h4>
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
    </div>
  );
};

export default ContentCalendarPage;
