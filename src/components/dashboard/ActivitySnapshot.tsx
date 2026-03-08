import React from 'react';
import { CalendarCheck, Send, Plug, FileText } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface Props {
  postsScheduled: number;
  postsPublished: number;
  platformsConnected: number;
  documentsUploaded: number;
  loading: boolean;
}

const stats = (p: Props) => [
  { label: 'Scheduled', value: p.postsScheduled, icon: CalendarCheck, color: 'text-primary' },
  { label: 'Published', value: p.postsPublished, icon: Send, color: 'text-chart-2' },
  { label: 'Platforms', value: p.platformsConnected, icon: Plug, color: 'text-chart-4' },
  { label: 'Documents', value: p.documentsUploaded, icon: FileText, color: 'text-chart-1' },
];

const ActivitySnapshot: React.FC<Props> = (props) => {
  if (props.loading) {
    return (
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-foreground mb-4">Activity</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="mb-8">
      <h2 className="text-lg font-semibold text-foreground mb-4">Activity</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats(props).map(({ label, value, icon: Icon, color }) => (
          <div
            key={label}
            className="flex items-center gap-4 rounded-xl border border-border/60 bg-card p-5 transition-shadow hover:shadow-sm"
          >
            <div className={`shrink-0 rounded-lg bg-secondary p-2.5 ${color}`}>
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground tabular-nums">{value}</p>
              <p className="text-sm text-muted-foreground">{label}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ActivitySnapshot;
