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
  Loader2, Link2, AlertCircle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useUserCredits } from '@/hooks/useUserCredits';
import { cn } from '@/lib/utils';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, addDays, addMonths, subMonths, isSameDay, isSameMonth, isToday, isTomorrow, isThisWeek, addWeeks, subWeeks } from 'date-fns';
import ConnectAccountsPanel from '@/components/calendar/ConnectAccountsPanel';
import EditPostDialog from '@/components/calendar/EditPostDialog';
import CalendarAnalytics from '@/components/calendar/CalendarAnalytics';

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
  draft: { label: 'Draft', className: 'bg-gray-100 text-gray-800 border-gray-200' },
};

interface ScheduledPost {
  id: string;
  platform: string;
  content: string;
  hook: string | null;
  body: string | null;
  cta: string | null;
  scheduled_at: string;
  status: string;
  error_message: string | null;
  prompt_category: string | null;
  tone: string | null;
  audience: string | null;
  published_at: string | null;
}

const ContentCalendarPage = () => {
  const [posts, setPosts] = useState<ScheduledPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [calendarView, setCalendarView] = useState<'week' | 'month'>('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [generateOpen, setGenerateOpen] = useState(false);
  const [connectOpen, setConnectOpen] = useState(false);
  const [editPost, setEditPost] = useState<ScheduledPost | null>(null);
  const [drawerPost, setDrawerPost] = useState<ScheduledPost | null>(null);
  const [generating, setGenerating] = useState(false);
  const [selectedDays, setSelectedDays] = useState<string>('7');
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [generationMessage, setGenerationMessage] = useState('');
  const [connectedPlatforms, setConnectedPlatforms] = useState<string[]>([]);
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

  const fetchPosts = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('scheduled_posts')
        .select('*')
        .order('scheduled_at', { ascending: true });

      if (error) throw error;
      setPosts((data as ScheduledPost[]) || []);
    } catch (err: any) {
      console.error('Error fetching posts:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPosts();
    fetchConnectedAccounts();
  }, [fetchPosts, fetchConnectedAccounts]);

  const handleGenerate = async () => {
    if (selectedPlatforms.length === 0) {
      toast.error('Please select at least one platform.');
      return;
    }

    const days = parseInt(selectedDays);
    const totalPosts = days * selectedPlatforms.length;
    
    if (credits < totalPosts) {
      toast.error(`You need ${totalPosts} credits to generate ${totalPosts} posts. You have ${credits}.`);
      return;
    }

    setGenerating(true);
    const messages = [
      "All set… I'm lining everything up.",
      "Crafting your content with care…",
      "Almost there — putting the finishing touches on your posts…",
      "Your calendar is filling up nicely…",
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

      const categories = ['attract', 'connect', 'transact'];
      const tones = ['professional', 'conversational', 'enthusiastic', 'authoritative', 'humorous'];

      const postsToCreate: any[] = [];

      for (let day = 0; day < days; day++) {
        const scheduledDate = addDays(new Date(), day + 1);
        scheduledDate.setHours(10, 0, 0, 0);

        for (const platform of selectedPlatforms) {
          const category = categories[day % categories.length];
          const tone = tones[day % tones.length];

          try {
            const { data, error } = await supabase.functions.invoke('generate-post', {
              body: { userId, postType: category, tone, platform, audience: '', subject: '' }
            });

            if (error) throw error;

            postsToCreate.push({
              user_id: userId,
              platform,
              content: data?.post || `${data?.hook || ''} ${data?.body || ''} ${data?.cta || ''}`,
              hook: data?.hook || null,
              body: data?.body || null,
              cta: data?.cta || null,
              scheduled_at: scheduledDate.toISOString(),
              status: 'scheduled',
              prompt_category: category,
              tone,
            });
          } catch (genErr) {
            console.error(`Failed to generate for ${platform} day ${day + 1}:`, genErr);
            postsToCreate.push({
              user_id: userId,
              platform,
              content: `[Content pending — generation will retry]`,
              scheduled_at: scheduledDate.toISOString(),
              status: 'draft',
              prompt_category: category,
              tone,
            });
          }
        }
      }

      // Batch insert and get inserted rows back
      if (postsToCreate.length > 0) {
        const { data: inserted, error: insertError } = await supabase
          .from('scheduled_posts')
          .insert(postsToCreate)
          .select();

        if (insertError) throw insertError;

        // Immediately add to local state
        if (inserted) {
          setPosts(prev => [...prev, ...(inserted as ScheduledPost[])].sort(
            (a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()
          ));
        }
      }

      // Deduct credits
      await supabase.rpc('deduct_credits_fifo', {
        p_user_id: userId,
        p_credits_to_deduct: postsToCreate.filter(p => p.status === 'scheduled').length,
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

  const handleRetry = async (post: ScheduledPost) => {
    try {
      const { error } = await supabase
        .from('scheduled_posts')
        .update({ status: 'scheduled', error_message: null })
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

  // Calendar helpers
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

  // Queue data
  const todayPosts = posts.filter(p => isToday(new Date(p.scheduled_at)));
  const tomorrowPosts = posts.filter(p => isTomorrow(new Date(p.scheduled_at)));
  const thisWeekPosts = posts.filter(p => isThisWeek(new Date(p.scheduled_at), { weekStartsOn: 1 }) && !isToday(new Date(p.scheduled_at)) && !isTomorrow(new Date(p.scheduled_at)));

  const PlatformIcon = ({ platform, size = 14 }: { platform: string; size?: number }) => {
    const config = PLATFORM_CONFIG[platform as keyof typeof PLATFORM_CONFIG];
    if (!config) return null;
    const Icon = config.icon;
    return <Icon size={size} />;
  };

  // Queue PostCard: icon + date/time + first 1-2 lines truncated
  const QueuePostCard = ({ post }: { post: ScheduledPost }) => {
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
        </div>
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
      </div>
    );
  };

  const calDays = calendarView === 'week' ? getWeekDays() : getMonthDays();

  // Filter calendar icons to only connected platforms
  const getConnectedPostsForDay = (date: Date) => {
    const dayPosts = getPostsForDay(date);
    return dayPosts.filter(p => connectedPlatforms.includes(p.platform));
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6 bg-gradient-to-r from-indigo-50 to-blue-50 p-6 rounded-lg border border-indigo-100">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Content Calendar</h2>
        <p className="text-gray-700">
          Plan, schedule, and auto-publish your social media content across platforms. Let's keep your audience engaged consistently.
        </p>
      </div>

      {/* Analytics */}
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
                <Tabs value={calendarView} onValueChange={(v) => setCalendarView(v as 'week' | 'month')}>
                  <TabsList className="h-8">
                    <TabsTrigger value="week" className="text-xs px-3 h-7">Week</TabsTrigger>
                    <TabsTrigger value="month" className="text-xs px-3 h-7">Month</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </CardHeader>
            <CardContent>
              {/* Day Headers */}
              <div className="grid grid-cols-7 gap-1 mb-1">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                  <div key={day} className="text-center text-xs font-medium text-muted-foreground py-2">
                    {day}
                  </div>
                ))}
              </div>
              {/* Calendar Grid — icons only */}
              <div className={cn(
                "grid grid-cols-7 gap-1",
                calendarView === 'week' ? 'grid-rows-1' : ''
              )}>
                {calDays.map((day, i) => {
                  const dayPosts = getConnectedPostsForDay(day);
                  const isCurrentMonth = isSameMonth(day, currentDate);
                  // Group unique platforms for icon display
                  const platformCounts = dayPosts.reduce<Record<string, number>>((acc, p) => {
                    acc[p.platform] = (acc[p.platform] || 0) + 1;
                    return acc;
                  }, {});

                  return (
                    <div
                      key={i}
                      className={cn(
                        "border rounded-lg p-1.5 transition-colors cursor-pointer",
                        calendarView === 'week' ? 'min-h-[120px]' : 'min-h-[80px]',
                        isToday(day) ? 'border-caregrowth-blue bg-blue-50/50' : 'border-border',
                        !isCurrentMonth && calendarView === 'month' && 'opacity-40'
                      )}
                      onClick={() => {
                        if (dayPosts.length > 0) {
                          setDrawerPost(dayPosts[0]);
                        }
                      }}
                    >
                      <div className={cn(
                        "text-xs font-medium mb-1 px-0.5",
                        isToday(day) ? 'text-caregrowth-blue' : 'text-muted-foreground'
                      )}>
                        {format(day, 'd')}
                      </div>
                      {/* Platform icons only */}
                      <div className="flex flex-wrap gap-1 mt-0.5">
                        {Object.entries(platformCounts).map(([platform, count]) => {
                          const config = PLATFORM_CONFIG[platform as keyof typeof PLATFORM_CONFIG];
                          if (!config) return null;
                          const Icon = config.icon;
                          return (
                            <div
                              key={platform}
                              className={cn("w-5 h-5 rounded flex items-center justify-center text-white", config.color)}
                              title={`${config.label} (${count})`}
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
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Today */}
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Today</h4>
                {todayPosts.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">Nothing scheduled</p>
                ) : (
                  <div className="space-y-2">
                    {todayPosts.map(post => <QueuePostCard key={post.id} post={post} />)}
                  </div>
                )}
              </div>
              {/* Tomorrow */}
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Tomorrow</h4>
                {tomorrowPosts.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">Nothing scheduled</p>
                ) : (
                  <div className="space-y-2">
                    {tomorrowPosts.map(post => <QueuePostCard key={post.id} post={post} />)}
                  </div>
                )}
              </div>
              {/* This Week */}
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">This Week</h4>
                {thisWeekPosts.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">Nothing else this week</p>
                ) : (
                  <div className="space-y-2">
                    {thisWeekPosts.slice(0, 5).map(post => <QueuePostCard key={post.id} post={post} />)}
                    {thisWeekPosts.length > 5 && (
                      <p className="text-xs text-muted-foreground text-center">+{thisWeekPosts.length - 5} more</p>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Side Drawer for calendar tile click — shows all posts for that day */}
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
                  <p className="text-sm text-foreground whitespace-pre-wrap">{post.content}</p>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Clock size={12} /> {format(new Date(post.scheduled_at), 'h:mm a')}</span>
                    <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => { setDrawerPost(null); setEditPost(post); }}>
                      <Edit2 size={12} /> Edit
                    </Button>
                  </div>
                  {post.status === 'failed' && post.error_message && (
                    <p className="text-xs text-destructive flex items-center gap-1">
                      <AlertCircle size={12} /> {post.error_message}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </SheetContent>
      </Sheet>

      {/* Edit Post Dialog */}
      {editPost && (
        <EditPostDialog
          post={editPost}
          open={!!editPost}
          onOpenChange={(open) => !open && setEditPost(null)}
          onSaved={() => { setEditPost(null); fetchPosts(); }}
        />
      )}
    </div>
  );
};

export default ContentCalendarPage;
