import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { 
  CalendarDays, ChevronLeft, ChevronRight, Plus, Clock, 
  Edit2, RotateCcw, Facebook, Instagram, Linkedin,
  Loader2, Link2, AlertCircle, FileText, CheckCircle,
  Trash2, CheckSquare, Square, CalendarClock
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useUserCredits } from '@/hooks/useUserCredits';
import { cn } from '@/lib/utils';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, addDays, addMonths, subMonths, isSameDay, isSameMonth, isToday, isTomorrow, addWeeks, subWeeks } from 'date-fns';
import ConnectAccountsPanel from '@/components/calendar/ConnectAccountsPanel';
import EditPostDialog from '@/components/calendar/EditPostDialog';
import CalendarAnalytics from '@/components/calendar/CalendarAnalytics';
import EvidencePanel from '@/components/calendar/EvidencePanel';
import ProactiveNudge from '@/components/calendar/ProactiveNudge';
import PlatformPreview from '@/components/calendar/PlatformPreview';
import StartEngineWizard from '@/components/calendar/StartEngineWizard';
import BusinessDetailsForm from '@/components/business/BusinessDetailsForm';
import BrandStyleSetup from '@/components/calendar/BrandStyleSetup';
import ConversationsTab from '@/components/conversations/ConversationsTab';
import InsightsTab from '@/components/conversations/InsightsTab';
import { useBrandStyle } from '@/hooks/useBrandStyle';
import { Building2, Palette, MessageCircle, BarChart3 } from 'lucide-react';

const PLATFORM_CONFIG = {
  facebook: { icon: Facebook, label: 'Facebook', color: 'bg-[hsl(220,46%,48%)]' },
  instagram: { icon: Instagram, label: 'Instagram', color: 'bg-[hsl(330,60%,52%)]' },
  linkedin: { icon: Linkedin, label: 'LinkedIn', color: 'bg-[hsl(210,60%,42%)]' },
};

const STATUS_CONFIG = {
  scheduled: { label: 'Scheduled', className: 'bg-status-scheduled-bg text-status-scheduled border-transparent' },
  published: { label: 'Published', className: 'bg-status-published-bg text-status-published border-transparent' },
  failed: { label: 'Failed', className: 'bg-status-failed-bg text-status-failed border-transparent' },
  skipped: { label: 'Skipped', className: 'bg-status-failed-bg text-status-failed border-transparent' },
  draft: { label: 'Draft', className: 'bg-status-draft-bg text-status-draft border-transparent' },
  needs_approval: { label: 'Needs Approval', className: 'bg-status-approval-bg text-status-approval border-transparent' },
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
  post_format?: string;
  core_message?: string | null;
  caption_instagram?: string | null;
  caption_linkedin?: string | null;
  caption_facebook?: string | null;
  caption_x?: string | null;
  subline?: string | null;
  content_anchor?: string | null;
  demand_moment_type?: string | null;
  engagement_hook?: string | null;
  hook?: string | null;
  post_type?: string | null;
  topic_keywords?: string[] | null;
  template_style?: string | null;
  carousel_image_urls?: string[] | null;
  publish_skipped_reason?: string | null;
}

// 60% single, 40% carousel distribution
function assignPostFormats(count: number): ('single' | 'carousel')[] {
  const carouselCount = Math.round(count * 0.4);
  const formats: ('single' | 'carousel')[] = [];
  for (let i = 0; i < count; i++) {
    formats.push(i < (count - carouselCount) ? 'single' : 'carousel');
  }
  for (let i = formats.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [formats[i], formats[j]] = [formats[j], formats[i]];
  }
  return formats;
}

// Visual rhythm rotation: rotate templates so the feed looks intentional
// Pattern: Bold → Carousel → Minimalist → Carousel → Dark → Carousel → repeat with variation
type TemplateName = 'quote_card' | 'minimalist' | 'dark_mode';

function assignTemplateRotation(
  formats: ('single' | 'carousel')[],
  userDefault?: string
): TemplateName[] {
  const singleTemplates: TemplateName[] = ['quote_card', 'minimalist', 'dark_mode'];
  const templates: TemplateName[] = [];
  let singleIdx = 0;

  for (let i = 0; i < formats.length; i++) {
    if (formats[i] === 'carousel') {
      // Carousel inherits the previous single template for visual consistency
      const prev = templates.length > 0
        ? templates[templates.length - 1]
        : singleTemplates[0];
      templates.push(prev);
    } else {
      templates.push(singleTemplates[singleIdx % singleTemplates.length]);
      singleIdx++;
    }
  }

  // Safety: never allow same template 3+ times in a row
  for (let i = 2; i < templates.length; i++) {
    if (templates[i] === templates[i - 1] && templates[i] === templates[i - 2]) {
      const alternatives = singleTemplates.filter(t => t !== templates[i]);
      templates[i] = alternatives[i % alternatives.length];
    }
  }

  return templates;
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
  const [showBrandSetup, setShowBrandSetup] = useState(false);
  const [profileInitial, setProfileInitial] = useState('B');
  const [workflowMode, setWorkflowMode] = useState<'auto_post' | 'approve_before_posting'>('auto_post');
  const [selectedPostIds, setSelectedPostIds] = useState<Set<string>>(new Set());
  const [showBatchDeleteConfirm, setShowBatchDeleteConfirm] = useState(false);
  const { credits, refetch: refetchCredits } = useUserCredits();
  const { brandStyle, needsSetup: brandNeedsSetup, saveBrandStyle, loading: brandLoading } = useBrandStyle();

  const [activeTab, setActiveTab] = useState<'calendar' | 'conversations' | 'insights'>('calendar');
  const batchMode = selectedPostIds.size > 0;

  // Prompt brand setup on first visit if not configured
  useEffect(() => {
    if (!brandLoading && brandNeedsSetup) {
      const timer = setTimeout(() => setShowBrandSetup(true), 1500);
      return () => clearTimeout(timer);
    }
  }, [brandLoading, brandNeedsSetup]);

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

  const fetchWorkflowMode = useCallback(async () => {
    try {
      const { data } = await supabase
        .from('agency_profiles')
        .select('posting_workflow_mode')
        .limit(1)
        .maybeSingle();
      if (data?.posting_workflow_mode) {
        setWorkflowMode(data.posting_workflow_mode as 'auto_post' | 'approve_before_posting');
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
        post_format: p.post_format || 'single',
        core_message: p.core_message || null,
        caption_instagram: p.caption_instagram || null,
        caption_linkedin: p.caption_linkedin || null,
        caption_facebook: p.caption_facebook || null,
        caption_x: p.caption_x || null,
        subline: p.subline || null,
        content_anchor: p.content_anchor || null,
        demand_moment_type: p.demand_moment_type || null,
        engagement_hook: p.engagement_hook || null,
        hook: p.hook || null,
        post_type: p.post_type || null,
        topic_keywords: p.topic_keywords || null,
        template_style: p.template_style || null,
        carousel_image_urls: p.carousel_image_urls || null,
        publish_skipped_reason: p.publish_skipped_reason || null,
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
    fetchWorkflowMode();
  }, [fetchPosts, fetchConnectedAccounts, fetchUserProfile, fetchWorkflowMode]);

  const handleGenerate = async (wizardResult: { mode: string; days: number; platforms: string[]; frequency: number; campaignName?: string; campaignGoal?: string; storyLines?: string }) => {
    const { days, platforms: wizPlatforms, frequency, storyLines: wizStoryLines } = wizardResult;
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

      const batchInsertData: any = {
        user_id: userId,
        days,
        platforms: wizPlatforms,
        created_by: userId,
      };
      // Add story_lines if provided
      if (wizStoryLines) {
        batchInsertData.story_lines = wizStoryLines;
      }

      const { data: batchData, error: batchError } = await supabase
        .from('content_batches')
        .insert(batchInsertData)
        .select()
        .single();

      if (batchError) throw batchError;
      const batchId = batchData.id;

      const categories = ['attract', 'connect', 'transact'];
      const tones = ['professional', 'conversational', 'enthusiastic', 'authoritative', 'humorous'];

      // Build all generation requests upfront
      const generationRequests: { platform: string; category: string; tone: string; scheduledDate: Date; post_format: 'single' | 'carousel'; template: TemplateName }[] = [];

      // Calculate total posts per platform, assign formats + template rotation
      const postsPerPlatform = days * frequency;
      const platformFormats: Record<string, ('single' | 'carousel')[]> = {};
      const platformTemplates: Record<string, TemplateName[]> = {};
      for (const platform of wizPlatforms) {
        const formats = assignPostFormats(postsPerPlatform);
        platformFormats[platform] = formats;
        platformTemplates[platform] = assignTemplateRotation(formats, brandStyle?.selected_template_theme);
      }

      const platformCounters: Record<string, number> = {};
      for (const platform of wizPlatforms) {
        platformCounters[platform] = 0;
      }

      for (let day = 0; day < days; day++) {
        for (let freq = 0; freq < frequency; freq++) {
          const scheduledDate = addDays(new Date(), day + 1);
          const hourOffset = freq * 4;
          scheduledDate.setHours(prefHour + hourOffset, prefMin, 0, 0);

          for (const platform of wizPlatforms) {
            const category = categories[(day * frequency + freq) % categories.length];
            const tone = tones[(day * frequency + freq) % tones.length];
            const idx = platformCounters[platform]++;
            const fmt = platformFormats[platform][idx];
            const tmpl = platformTemplates[platform][idx];
            generationRequests.push({ platform, category, tone, scheduledDate: new Date(scheduledDate), post_format: fmt, template: tmpl });
          }
        }
      }

      // Generate posts in parallel batches of 5
      const BATCH_SIZE = 5;
      const postsToInsert: any[] = [];

      for (let i = 0; i < generationRequests.length; i += BATCH_SIZE) {
        const batch = generationRequests.slice(i, i + BATCH_SIZE);
        const results = await Promise.allSettled(
          batch.map(async (req, batchIdx) => {
            const globalIdx = i + batchIdx;
            const subjectWithStoryLines = wizStoryLines
              ? `Story lines to weave into this post (use naturally, do not repeat mechanically): ${wizStoryLines}`
              : '';
            const { data, error } = await supabase.functions.invoke('generate-post', {
              body: { userId, postType: req.category, tone: req.tone, platform: req.platform, audience: '', subject: subjectWithStoryLines, post_format: req.post_format, post_index: globalIdx }
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
              status: workflowMode === 'approve_before_posting' ? 'needs_approval' : 'scheduled',
              hook_line: data?.hook || postBody.split('\n')[0]?.substring(0, 100) || '',
              headline: data?.headline || '',
              subheadline: data?.subheadline || '',
              post_format: req.post_format,
              slide_texts: data?.slide_texts || null,
              content_anchor: data?.content_anchor || null,
              engagement_hook: data?.engagement_hook || null,
              demand_moment_type: data?.demand_moment_type || null,
              hook: data?.hook || null,
              post_type: data?.post_type || req.category || null,
              topic_keywords: data?.topic_keywords || null,
              _template: req.template,
              core_message: data?.core_message || null,
              subline: data?.subline || data?.subheadline || null,
              caption_instagram: data?.caption_instagram || null,
              caption_linkedin: data?.caption_linkedin || null,
              caption_facebook: data?.caption_facebook || null,
              caption_x: data?.caption_x || null,
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
              post_format: req.post_format,
            });
          }
        }
      }

      if (postsToInsert.length > 0) {
          const dbPosts = postsToInsert.map(({ hook_line, headline: hl, subheadline: shl, slide_texts: st, content_anchor: ca, engagement_hook: eh, demand_moment_type: dmt, hook: hk, post_type: pt, topic_keywords: tk, _template, core_message: cm, subline: sl, caption_instagram: ci, caption_linkedin: cl, caption_facebook: cf, caption_x: cx, ...rest }) => ({
            ...rest,
            headline: hl || null,
            subheadline: shl || null,
            slide_texts: st || null,
            content_anchor: ca || null,
            engagement_hook: eh || null,
            demand_moment_type: dmt || null,
            hook: hk || null,
            post_type: pt || null,
            template_style: _template || null,
            topic_keywords: tk || null,
            core_message: cm || null,
            subline: sl || null,
            caption_instagram: ci || null,
            caption_linkedin: cl || null,
            caption_facebook: cf || null,
            caption_x: cx || null,
          }));
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
            post_format: p.post_format || 'single',
            core_message: p.core_message || null,
            caption_instagram: p.caption_instagram || null,
            caption_linkedin: p.caption_linkedin || null,
            caption_facebook: p.caption_facebook || null,
            caption_x: p.caption_x || null,
            subline: p.subline || null,
            content_anchor: p.content_anchor || null,
            demand_moment_type: p.demand_moment_type || null,
            engagement_hook: p.engagement_hook || null,
            hook: p.hook || null,
            post_type: p.post_type || null,
            topic_keywords: p.topic_keywords || null,
            template_style: p.template_style || null,
          }));

          setPosts(prev => [...prev, ...newPosts].sort(
            (a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()
          ));

          for (let i = 0; i < inserted.length; i++) {
            const p = inserted[i];
            const postHeadline = postsToInsert[i]?.headline || postsToInsert[i]?.hook_line || p.post_body.split('\n')[0]?.substring(0, 60) || 'Your Post';
            const postSubheadline = postsToInsert[i]?.subheadline || '';
            const postFormat = postsToInsert[i]?.post_format || 'single';
            const postSlideTexts = postsToInsert[i]?.slide_texts || null;

            const postTemplate = postsToInsert[i]?._template || brandStyle?.selected_template_theme;
            supabase.functions.invoke('generate-post-image', {
              body: {
                headline: postHeadline,
                subheadline: postSubheadline,
                business_name: brandStyle?.brand_display_name || userBusinessName,
                post_id: p.id,
                platform: p.platform,
                template: postTemplate,
                brand_primary_color: brandStyle?.brand_primary_color,
                brand_accent_color: brandStyle?.brand_accent_color,
                brand_font_style: brandStyle?.brand_font_style,
                post_format: postFormat,
                slide_texts: postSlideTexts,
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
        p_credits_to_deduct: postsToInsert.filter(p => p.status === 'scheduled' || p.status === 'needs_approval').length,
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

  const handleApprove = async (post: ContentPost) => {
    try {
      const { error } = await supabase
        .from('content_posts')
        .update({ status: 'scheduled' })
        .eq('id', post.id);

      if (error) throw error;
      toast.success('Post approved and scheduled.');
      fetchPosts();
    } catch (err: any) {
      toast.error('Failed to approve: ' + err.message);
    }
  };

  const togglePostSelection = (postId: string) => {
    setSelectedPostIds(prev => {
      const next = new Set(prev);
      if (next.has(postId)) next.delete(postId);
      else next.add(postId);
      return next;
    });
  };

  const selectAllWeekPosts = () => {
    const weekStart = startOfWeek(selectedDay, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(selectedDay, { weekStartsOn: 1 });
    const weekPosts = posts.filter(p => {
      const d = new Date(p.scheduled_at);
      return d >= weekStart && d <= weekEnd && ['draft', 'needs_approval', 'scheduled'].includes(p.status);
    });
    setSelectedPostIds(new Set(weekPosts.map(p => p.id)));
  };

  const handleBatchDelete = async () => {
    try {
      const ids = Array.from(selectedPostIds);
      const deletable = posts.filter(p => ids.includes(p.id) && ['draft', 'needs_approval', 'scheduled'].includes(p.status));
      if (deletable.length === 0) return;
      const { error } = await supabase.from('content_posts').delete().in('id', deletable.map(p => p.id));
      if (error) throw error;
      toast.success(`${deletable.length} post${deletable.length > 1 ? 's' : ''} deleted.`);
      setSelectedPostIds(new Set());
      setShowBatchDeleteConfirm(false);
      fetchPosts();
    } catch (err: any) {
      toast.error('Batch delete failed: ' + err.message);
    }
  };

  const handleBatchApprove = async () => {
    try {
      const ids = Array.from(selectedPostIds);
      const approvable = posts.filter(p => ids.includes(p.id) && p.status === 'needs_approval');
      if (approvable.length === 0) { toast.info('No posts need approval in selection.'); return; }
      const { error } = await supabase.from('content_posts').update({ status: 'scheduled' }).in('id', approvable.map(p => p.id));
      if (error) throw error;
      toast.success(`${approvable.length} post${approvable.length > 1 ? 's' : ''} approved.`);
      setSelectedPostIds(new Set());
      fetchPosts();
    } catch (err: any) {
      toast.error('Batch approve failed: ' + err.message);
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
  const needsApproval = posts.filter(p => p.status === 'needs_approval').length;

  const PlatformIcon = ({ platform, size = 14 }: { platform: string; size?: number }) => {
    const config = PLATFORM_CONFIG[platform as keyof typeof PLATFORM_CONFIG];
    if (!config) return null;
    const Icon = config.icon;
    return <Icon size={size} />;
  };

  const QueuePostCard = ({ post }: { post: ContentPost }) => {
    const statusConfig = STATUS_CONFIG[post.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.draft;
    const isSelected = selectedPostIds.has(post.id);
    const isSelectable = ['draft', 'needs_approval', 'scheduled'].includes(post.status);
    return (
      <div
        className={cn(
          "group rounded-xl border border-cal-border bg-card p-3.5 transition-all duration-200 cursor-pointer",
          "hover:shadow-md hover:-translate-y-0.5",
          isSelected && "ring-2 ring-cal-border-selected border-cal-border-selected bg-cal-surface-selected"
        )}
        onClick={() => batchMode && isSelectable ? togglePostSelection(post.id) : setEditPost(post)}
      >
        <div className="flex items-center gap-2.5 mb-2.5">
          {batchMode && isSelectable && (
            <button onClick={(e) => { e.stopPropagation(); togglePostSelection(post.id); }} className="shrink-0">
              {isSelected ? <CheckSquare size={15} className="text-primary" /> : <Square size={15} className="text-muted-foreground/50" />}
            </button>
          )}
          <div className={cn("w-6 h-6 rounded-lg flex items-center justify-center text-white shrink-0", PLATFORM_CONFIG[post.platform as keyof typeof PLATFORM_CONFIG]?.color || 'bg-muted-foreground')}>
            <PlatformIcon platform={post.platform} size={13} />
          </div>
          <span className="text-xs font-medium text-foreground/70 capitalize">{post.platform}</span>
          <div className="ml-auto flex items-center gap-1.5">
            <Badge variant="outline" className={cn("text-[10px] font-medium px-2 py-0.5 rounded-full", statusConfig.className)}>
              {statusConfig.label}
            </Badge>
          </div>
        </div>
        {post.image_url && (
          <img src={post.image_url} alt="" className="w-full h-20 object-cover rounded-lg mb-2.5" />
        )}
        <p className="text-[13px] text-foreground/80 line-clamp-2 leading-relaxed">
          {post.content}
        </p>
        <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-cal-border">
          <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <Clock size={11} />
            {format(new Date(post.scheduled_at), 'MMM d · h:mm a')}
          </span>
          {post.status === 'needs_approval' && (
            <Button variant="ghost" size="sm" className="h-6 px-2 text-[11px] gap-1 text-status-approval hover:text-status-approval hover:bg-status-approval-bg rounded-full" onClick={(e) => { e.stopPropagation(); handleApprove(post); }}>
              <CheckCircle size={11} /> Approve
            </Button>
          )}
          {(post.status === 'failed' || post.status === 'skipped') && (
            <Button variant="ghost" size="sm" className="h-6 px-2 text-[11px] gap-1 text-status-failed hover:bg-status-failed-bg rounded-full" onClick={(e) => { e.stopPropagation(); handleRetry(post); }}>
              <RotateCcw size={11} /> Retry
            </Button>
          )}
        </div>
      </div>
    );
  };

  const calDays = calendarView === 'week' ? getWeekDays() : getMonthDays();

  const selectedDayLabel = isToday(selectedDay) ? 'Today' : isTomorrow(selectedDay) ? 'Tomorrow' : format(selectedDay, 'EEE, MMM d');

  const businessHandle = businessName.toLowerCase().replace(/[^a-z0-9]/g, '_');

  // Empty state component
  const EmptyState = ({ message, sub }: { message: string; sub?: string }) => (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="w-12 h-12 rounded-2xl bg-cal-surface flex items-center justify-center mb-4">
        <CalendarClock size={22} className="text-muted-foreground/40" />
      </div>
      <p className="text-sm font-medium text-foreground/60">{message}</p>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
            Content Calendar
          </h1>
          <p className="text-muted-foreground mt-1.5 text-sm">
            Plan, review, and manage your content across platforms.
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <Button
            onClick={() => setGenerateOpen(true)}
            className="bg-primary hover:bg-primary/90 gap-2 font-medium rounded-lg h-9 px-5 text-sm shadow-sm"
          >
            <Plus size={15} /> Plan Content
          </Button>

          <StartEngineWizard
            open={generateOpen}
            onOpenChange={setGenerateOpen}
            credits={credits}
            onDeploy={handleGenerate}
          />

          {generating && (
            <Dialog open={generating}>
              <DialogContent className="sm:max-w-md border-cal-border">
                <div className="py-14 text-center space-y-5">
                  <div className="space-y-3">
                    <div className="h-1.5 bg-cal-surface rounded-full overflow-hidden">
                      <div className="h-full bg-primary/60 rounded-full animate-pulse" style={{ width: '70%' }} />
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">{generationMessage}</p>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Top-level tabs */}
      <div className="mb-8">
        <div className="flex items-center gap-1 border-b border-cal-border">
          {[
            { key: 'calendar' as const, label: 'Calendar', icon: CalendarDays },
            { key: 'conversations' as const, label: 'Conversations', icon: MessageCircle },
            { key: 'insights' as const, label: 'Insights', icon: BarChart3 },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px",
                activeTab === tab.key
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-cal-border"
              )}
            >
              <tab.icon size={15} />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <BrandStyleSetup
        open={showBrandSetup}
        onOpenChange={setShowBrandSetup}
        onSave={saveBrandStyle}
        initialValues={brandStyle || undefined}
      />

      <Dialog open={connectOpen} onOpenChange={(open) => { setConnectOpen(open); if (!open) fetchConnectedAccounts(); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Connect Your Social Accounts</DialogTitle>
          </DialogHeader>
          <ConnectAccountsPanel />
        </DialogContent>
      </Dialog>

      {/* Conversations Tab */}
      {activeTab === 'conversations' && <ConversationsTab />}

      {/* Insights Tab */}
      {activeTab === 'insights' && <InsightsTab posts={posts} />}

      {/* Calendar Tab */}
      {activeTab === 'calendar' && (
      <>
      <ProactiveNudge
        onGenerate={() => setGenerateOpen(true)}
        onConnect={() => setConnectOpen(true)}
      />

      <EvidencePanel />

      {/* Batch action toolbar */}
      {batchMode && (
        <div className="mb-5 flex items-center gap-3 bg-cal-surface border border-cal-border rounded-xl px-5 py-3.5 shadow-sm">
          <span className="text-sm font-medium text-foreground">{selectedPostIds.size} selected</span>
          <div className="flex-1" />
          <Button variant="outline" size="sm" className="text-xs gap-1.5 rounded-lg border-cal-border" onClick={selectAllWeekPosts}>
            Select all this week
          </Button>
          {workflowMode === 'approve_before_posting' && (
            <Button variant="outline" size="sm" className="text-xs gap-1.5 rounded-lg text-status-scheduled border-status-scheduled/30 hover:bg-status-scheduled-bg" onClick={handleBatchApprove}>
              <CheckCircle size={13} /> Approve Selected
            </Button>
          )}
          <Button variant="outline" size="sm" className="text-xs gap-1.5 rounded-lg text-destructive border-destructive/30 hover:bg-status-failed-bg" onClick={() => setShowBatchDeleteConfirm(true)}>
            <Trash2 size={13} /> Delete Selected
          </Button>
          <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" onClick={() => setSelectedPostIds(new Set())}>
            Cancel
          </Button>
        </div>
      )}

      {/* Calendar */}
      <div className="mb-8">
        {!batchMode && posts.some(p => ['draft', 'needs_approval', 'scheduled'].includes(p.status)) && (
          <div className="mb-3 flex justify-end">
            <Button variant="ghost" size="sm" className="text-xs text-muted-foreground/60 gap-1.5 hover:text-muted-foreground" onClick={() => {
              const first = posts.find(p => ['draft', 'needs_approval', 'scheduled'].includes(p.status));
              if (first) togglePostSelection(first.id);
            }}>
              <CheckSquare size={12} /> Select posts
            </Button>
          </div>
        )}

        <div className="rounded-2xl border border-cal-border bg-card shadow-sm overflow-hidden">
          {/* Calendar header */}
          <div className="px-5 py-4 flex items-center justify-between border-b border-cal-border">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-lg" onClick={() => navigateCalendar('prev')}>
                <ChevronLeft size={16} className="text-muted-foreground" />
              </Button>
              <h3 className="text-base font-semibold text-foreground min-w-[180px] text-center">
                {calendarView === 'week'
                  ? `${format(getWeekDays()[0], 'MMM d')} – ${format(getWeekDays()[6], 'MMM d, yyyy')}`
                  : format(currentDate, 'MMMM yyyy')
                }
              </h3>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-lg" onClick={() => navigateCalendar('next')}>
                <ChevronRight size={16} className="text-muted-foreground" />
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="text-xs h-7 rounded-lg text-muted-foreground hover:text-foreground"
                onClick={() => { setCurrentDate(new Date()); setSelectedDay(new Date()); }}
              >
                Today
              </Button>
              <Tabs value={calendarView} onValueChange={(v) => setCalendarView(v as 'week' | 'month')}>
                <TabsList className="h-8 rounded-lg bg-cal-surface p-0.5">
                  <TabsTrigger value="week" className="text-xs px-3 h-7 rounded-md data-[state=active]:bg-card data-[state=active]:shadow-sm">Week</TabsTrigger>
                  <TabsTrigger value="month" className="text-xs px-3 h-7 rounded-md data-[state=active]:bg-card data-[state=active]:shadow-sm">Month</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 border-b border-cal-border">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
              <div key={day} className="text-center text-[11px] font-medium text-muted-foreground/60 py-2.5 tracking-wider uppercase">
                {day}
              </div>
            ))}
          </div>

          {/* Day cells */}
          <div className={cn(
            "grid grid-cols-7",
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
                    "border-r border-b border-cal-border transition-all duration-150 cursor-pointer relative",
                    calendarView === 'week' ? 'min-h-[140px] p-2.5' : 'min-h-[90px] p-2',
                    isSelected
                      ? 'bg-cal-surface-selected'
                      : 'hover:bg-cal-surface-hover',
                    !isCurrentMonth && calendarView === 'month' && 'opacity-30',
                    isDragOver && 'bg-cal-surface-selected',
                    i % 7 === 6 && 'border-r-0', // last column
                  )}
                  onClick={() => setSelectedDay(day)}
                  onDragOver={(e) => handleDragOver(e, dayKey)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, day)}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className={cn(
                      "text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full transition-colors",
                      isToday(day) && 'bg-primary text-primary-foreground font-semibold',
                      isSelected && !isToday(day) && 'bg-cal-border-selected/20 text-foreground font-semibold',
                      !isSelected && !isToday(day) && 'text-muted-foreground'
                    )}>
                      {format(day, 'd')}
                    </span>
                    {dayPosts.length > 0 && (
                      <span className="text-[10px] text-muted-foreground/50 font-medium">{dayPosts.length}</span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {dayPosts.slice(0, calendarView === 'week' ? 6 : 3).map((post) => {
                      const config = PLATFORM_CONFIG[post.platform as keyof typeof PLATFORM_CONFIG];
                      if (!config) return null;
                      const Icon = config.icon;
                      const statusCfg = STATUS_CONFIG[post.status as keyof typeof STATUS_CONFIG];
                      return (
                        <div
                          key={post.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, post.id)}
                          className={cn(
                            "w-6 h-6 rounded-lg flex items-center justify-center text-white cursor-grab active:cursor-grabbing",
                            "hover:scale-110 hover:shadow-md transition-all duration-150",
                            config.color,
                            post.status === 'needs_approval' && 'ring-2 ring-status-approval/40',
                          )}
                          title={`${config.label} · ${statusCfg?.label || post.status}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setPreviewPost(post);
                          }}
                        >
                          <Icon size={12} />
                        </div>
                      );
                    })}
                    {dayPosts.length > (calendarView === 'week' ? 6 : 3) && (
                      <span className="text-[9px] text-muted-foreground/50 self-center ml-0.5">
                        +{dayPosts.length - (calendarView === 'week' ? 6 : 3)}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <p className="text-[11px] text-muted-foreground/40 mt-2.5 ml-1">
          Drag posts between days to reschedule · Click a day to view its queue
        </p>
      </div>

      {/* Queue section */}
      {selectedDayPosts.length > 0 ? (
        <div className="mb-8">
          <h2 className="text-base font-semibold text-foreground mb-4">{selectedDayLabel}</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {selectedDayPosts.map(post => (
              <QueuePostCard key={post.id} post={post} />
            ))}
          </div>
        </div>
      ) : (
        <div className="mb-8">
          <h2 className="text-base font-semibold text-foreground mb-4">{selectedDayLabel}</h2>
          <EmptyState message="Your calendar is open and ready." sub="No posts scheduled for this day." />
        </div>
      )}

      {/* Side Drawer */}
      <Sheet open={!!drawerPost} onOpenChange={(open) => !open && setDrawerPost(null)}>
        <SheetContent className="sm:max-w-md overflow-y-auto border-l-cal-border">
          <SheetHeader>
            <SheetTitle className="text-lg font-semibold">
              {drawerPost && format(new Date(drawerPost.scheduled_at), 'EEEE, MMMM d')}
            </SheetTitle>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            {drawerPost && getPostsForDay(new Date(drawerPost.scheduled_at)).map(post => {
              const statusCfg = STATUS_CONFIG[post.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.draft;
              return (
                <div key={post.id} className="rounded-xl border border-cal-border p-5 space-y-3 hover:shadow-sm transition-shadow">
                  <div className="flex items-center gap-2.5">
                    <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center text-white", PLATFORM_CONFIG[post.platform as keyof typeof PLATFORM_CONFIG]?.color || 'bg-muted-foreground')}>
                      <PlatformIcon platform={post.platform} size={15} />
                    </div>
                    <span className="text-sm font-medium capitalize text-foreground">{post.platform}</span>
                    <Badge variant="outline" className={cn("text-[11px] ml-auto rounded-full px-2.5 py-0.5", statusCfg.className)}>
                      {statusCfg.label}
                    </Badge>
                  </div>
                  {post.image_url && (
                    <img src={post.image_url} alt="" className="w-full max-h-44 object-cover rounded-xl" />
                  )}
                  <p className="text-sm text-foreground/80 whitespace-pre-wrap leading-relaxed">{post.content}</p>
                  <div className="flex items-center justify-between pt-2 border-t border-cal-border">
                    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Clock size={12} /> {format(new Date(post.scheduled_at), 'h:mm a')}
                    </span>
                    <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5 rounded-lg border-cal-border" onClick={() => { setDrawerPost(null); setEditPost(post); }}>
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

      <AlertDialog open={showBatchDeleteConfirm} onOpenChange={setShowBatchDeleteConfirm}>
        <AlertDialogContent className="rounded-2xl border-cal-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedPostIds.size} post{selectedPostIds.size > 1 ? 's' : ''}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the selected posts from your calendar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-lg">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBatchDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-lg">
              Delete Posts
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ContentCalendarPage;
