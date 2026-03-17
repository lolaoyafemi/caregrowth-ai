import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from 'recharts';
import { format, subDays, isSameDay, startOfWeek, endOfWeek, isWithinInterval } from 'date-fns';
import {
  TrendingUp, Flame, MessageCircle, Lightbulb,
  BarChart3, Target, Zap, ArrowUpRight
} from 'lucide-react';

interface Post {
  id: string;
  platform: string;
  content: string;
  scheduled_at: string;
  status: string;
  likes?: number | null;
  comments?: number | null;
  shares?: number | null;
  impressions?: number | null;
  engagement_hook?: string | null;
  content_anchor?: string | null;
  topic_keywords?: string[] | null;
}

interface InsightsTabProps {
  posts: Post[];
}

const STATUS_COLORS = {
  published: 'hsl(var(--status-published))',
  scheduled: 'hsl(var(--status-scheduled))',
  failed: 'hsl(var(--status-failed))',
  draft: 'hsl(var(--muted-foreground))',
  needs_approval: 'hsl(var(--status-approval))',
};

const InsightsTab: React.FC<InsightsTabProps> = ({ posts }) => {
  const counts = useMemo(() => ({
    published: posts.filter(p => p.status === 'published').length,
    scheduled: posts.filter(p => p.status === 'scheduled').length,
    failed: posts.filter(p => p.status === 'failed').length,
    draft: posts.filter(p => p.status === 'draft').length,
    needs_approval: posts.filter(p => p.status === 'needs_approval').length,
  }), [posts]);

  const dailyData = useMemo(() => {
    const last14 = Array.from({ length: 14 }, (_, i) => subDays(new Date(), 13 - i));
    return last14.map(day => {
      const dayPosts = posts.filter(p => isSameDay(new Date(p.scheduled_at), day));
      return {
        date: format(day, 'MMM d'),
        Published: dayPosts.filter(p => p.status === 'published').length,
        Scheduled: dayPosts.filter(p => p.status === 'scheduled').length,
        Failed: dayPosts.filter(p => p.status === 'failed').length,
      };
    });
  }, [posts]);

  const pieData = useMemo(() => [
    { name: 'Published', value: counts.published, color: STATUS_COLORS.published },
    { name: 'Scheduled', value: counts.scheduled, color: STATUS_COLORS.scheduled },
    { name: 'Needs Approval', value: counts.needs_approval, color: STATUS_COLORS.needs_approval },
    { name: 'Failed', value: counts.failed, color: STATUS_COLORS.failed },
    { name: 'Draft', value: counts.draft, color: STATUS_COLORS.draft },
  ].filter(d => d.value > 0), [counts]);

  // Most engaging post this week
  const mostEngagingPost = useMemo(() => {
    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
    const thisWeekPosts = posts.filter(p =>
      p.status === 'published' &&
      isWithinInterval(new Date(p.scheduled_at), { start: weekStart, end: weekEnd })
    );
    if (thisWeekPosts.length === 0) return null;
    return thisWeekPosts.reduce((best, p) => {
      const engagement = (p.likes || 0) + (p.comments || 0) + (p.shares || 0);
      const bestEngagement = (best.likes || 0) + (best.comments || 0) + (best.shares || 0);
      return engagement > bestEngagement ? p : best;
    }, thisWeekPosts[0]);
  }, [posts]);

  // Top content themes from topic_keywords
  const topThemes = useMemo(() => {
    const themeCounts: Record<string, number> = {};
    posts.forEach(p => {
      (p.topic_keywords || []).forEach(kw => {
        const normalized = kw.toLowerCase().trim();
        if (normalized) themeCounts[normalized] = (themeCounts[normalized] || 0) + 1;
      });
    });
    return Object.entries(themeCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([theme, count]) => ({ theme, count }));
  }, [posts]);

  // Platform distribution
  const platformData = useMemo(() => {
    const platformCounts: Record<string, number> = {};
    posts.forEach(p => {
      platformCounts[p.platform] = (platformCounts[p.platform] || 0) + 1;
    });
    return Object.entries(platformCounts).map(([platform, count]) => ({
      platform: platform.charAt(0).toUpperCase() + platform.slice(1),
      count,
    }));
  }, [posts]);

  // Suggested topics based on content anchors
  const suggestedTopics = useMemo(() => {
    const anchors: Record<string, number> = {};
    posts.filter(p => p.content_anchor).forEach(p => {
      const a = p.content_anchor!.toLowerCase().trim();
      anchors[a] = (anchors[a] || 0) + 1;
    });
    const sorted = Object.entries(anchors).sort(([, a], [, b]) => b - a);
    // Suggest less-used anchors as opportunities
    return sorted.slice(-3).map(([anchor]) => anchor).filter(Boolean);
  }, [posts]);

  const total = posts.length;

  return (
    <div className="space-y-6">
      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Posts', value: total, icon: BarChart3, accent: 'text-foreground' },
          { label: 'Published', value: counts.published, icon: TrendingUp, accent: 'text-status-published' },
          { label: 'Scheduled', value: counts.scheduled, icon: Target, accent: 'text-status-scheduled' },
          { label: 'Needs Review', value: counts.needs_approval, icon: Zap, accent: 'text-status-approval' },
        ].map(stat => (
          <Card key={stat.label} className="border-cal-border rounded-xl">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <stat.icon size={14} className={cn("shrink-0", stat.accent)} />
                <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">{stat.label}</span>
              </div>
              <p className={cn("text-2xl font-semibold", stat.accent)}>{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 border-cal-border rounded-xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Activity — Last 14 Days</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-20" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="Published" fill={STATUS_COLORS.published} radius={[3, 3, 0, 0]} />
                <Bar dataKey="Scheduled" fill={STATUS_COLORS.scheduled} radius={[3, 3, 0, 0]} />
                <Bar dataKey="Failed" fill={STATUS_COLORS.failed} radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-cal-border rounded-xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Status Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-center">
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`} labelLine={false}>
                    {pieData.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground italic">No posts yet</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Insight cards row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Most Engaging Post */}
        <Card className="border-cal-border rounded-xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Flame size={14} className="text-status-approval" />
              Top Post This Week
            </CardTitle>
          </CardHeader>
          <CardContent>
            {mostEngagingPost ? (
              <div className="space-y-2">
                <p className="text-[13px] text-foreground/80 line-clamp-3 leading-relaxed">
                  {mostEngagingPost.content}
                </p>
                <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                  <span>{mostEngagingPost.likes || 0} likes</span>
                  <span>{mostEngagingPost.comments || 0} comments</span>
                  <span>{mostEngagingPost.shares || 0} shares</span>
                </div>
                <Badge variant="outline" className="text-[10px] rounded-full capitalize">{mostEngagingPost.platform}</Badge>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground/60 italic py-4">No published posts this week yet.</p>
            )}
          </CardContent>
        </Card>

        {/* Trending Themes */}
        <Card className="border-cal-border rounded-xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <MessageCircle size={14} className="text-primary" />
              Trending Themes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topThemes.length > 0 ? (
              <div className="space-y-2">
                {topThemes.map(({ theme, count }) => (
                  <div key={theme} className="flex items-center justify-between">
                    <span className="text-[13px] text-foreground/80 capitalize truncate">{theme}</span>
                    <Badge variant="outline" className="text-[10px] rounded-full border-cal-border shrink-0 ml-2">
                      {count} posts
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground/60 italic py-4">Generate more content to see theme patterns.</p>
            )}
          </CardContent>
        </Card>

        {/* Suggested Topics */}
        <Card className="border-cal-border rounded-xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Lightbulb size={14} className="text-status-scheduled" />
              Suggested Topics
            </CardTitle>
          </CardHeader>
          <CardContent>
            {suggestedTopics.length > 0 ? (
              <div className="space-y-2.5">
                <p className="text-[11px] text-muted-foreground">Topics you haven't explored much yet:</p>
                {suggestedTopics.map(topic => (
                  <div key={topic} className="flex items-center gap-2 text-[13px] text-foreground/80">
                    <ArrowUpRight size={12} className="text-status-scheduled shrink-0" />
                    <span className="capitalize">{topic}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground/60 italic py-4">Content suggestions will appear as your library grows.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Platform Distribution */}
      {platformData.length > 0 && (
        <Card className="border-cal-border rounded-xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Platform Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 flex-wrap">
              {platformData.map(({ platform, count }) => (
                <div key={platform} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-primary/60" />
                  <span className="text-sm text-foreground/80">{platform}</span>
                  <span className="text-sm font-medium text-foreground">{count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default InsightsTab;
