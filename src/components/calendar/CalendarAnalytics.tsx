import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from 'recharts';
import { format, subDays, isSameDay } from 'date-fns';
import { CheckCircle2, Clock, XCircle, TrendingUp } from 'lucide-react';

interface ScheduledPost {
  id: string;
  platform: string;
  content: string;
  scheduled_at: string;
  status: string;
}

interface CalendarAnalyticsProps {
  posts: ScheduledPost[];
}

const STATUS_COLORS = {
  published: '#10b981',
  scheduled: '#f59e0b',
  failed: '#ef4444',
  draft: '#9ca3af',
};

const CalendarAnalytics: React.FC<CalendarAnalyticsProps> = ({ posts }) => {
  const counts = useMemo(() => ({
    published: posts.filter(p => p.status === 'published').length,
    scheduled: posts.filter(p => p.status === 'scheduled').length,
    failed: posts.filter(p => p.status === 'failed').length,
    draft: posts.filter(p => p.status === 'draft').length,
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
    { name: 'Failed', value: counts.failed, color: STATUS_COLORS.failed },
    { name: 'Draft', value: counts.draft, color: STATUS_COLORS.draft },
  ].filter(d => d.value > 0), [counts]);

  const total = posts.length;

  return (
    <div className="space-y-4 mb-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-emerald-200 bg-emerald-50/50">
          <CardContent className="p-4 flex items-center gap-3">
            <CheckCircle2 className="h-8 w-8 text-emerald-600" />
            <div>
              <p className="text-2xl font-bold text-emerald-700">{counts.published}</p>
              <p className="text-xs text-emerald-600">Published</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-amber-200 bg-amber-50/50">
          <CardContent className="p-4 flex items-center gap-3">
            <Clock className="h-8 w-8 text-amber-600" />
            <div>
              <p className="text-2xl font-bold text-amber-700">{counts.scheduled}</p>
              <p className="text-xs text-amber-600">Scheduled</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-red-200 bg-red-50/50">
          <CardContent className="p-4 flex items-center gap-3">
            <XCircle className="h-8 w-8 text-red-600" />
            <div>
              <p className="text-2xl font-bold text-red-700">{counts.failed}</p>
              <p className="text-xs text-red-600">Failed</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-blue-200 bg-blue-50/50">
          <CardContent className="p-4 flex items-center gap-3">
            <TrendingUp className="h-8 w-8 text-blue-600" />
            <div>
              <p className="text-2xl font-bold text-blue-700">{total}</p>
              <p className="text-xs text-blue-600">Total Posts</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Posts Over Time (Last 14 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ fontSize: 12 }} />
                <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="Published" fill={STATUS_COLORS.published} radius={[2, 2, 0, 0]} />
                <Bar dataKey="Scheduled" fill={STATUS_COLORS.scheduled} radius={[2, 2, 0, 0]} />
                <Bar dataKey="Failed" fill={STATUS_COLORS.failed} radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Status Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-center">
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                    labelLine={false}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
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
    </div>
  );
};

export default CalendarAnalytics;
