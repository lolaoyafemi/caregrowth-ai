import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Activity, Zap, Database, AlertTriangle, Wifi, WifiOff } from 'lucide-react';

interface PerformanceMetrics {
  averageResponseTime: number;
  totalRequests: number;
  cacheHitRate: number;
  errorRate: number;
}

interface PerformanceMonitorProps {
  metrics: PerformanceMetrics;
  connectionStatus: 'connected' | 'disconnected' | 'reconnecting';
  cacheSize: number;
  isStreaming?: boolean;
  className?: string;
}

const PerformanceMonitor: React.FC<PerformanceMonitorProps> = ({
  metrics,
  connectionStatus,
  cacheSize,
  isStreaming = false,
  className = ''
}) => {
  const getConnectionIcon = () => {
    switch (connectionStatus) {
      case 'connected':
        return <Wifi className="h-4 w-4 text-green-500" />;
      case 'disconnected':
        return <WifiOff className="h-4 w-4 text-red-500" />;
      case 'reconnecting':
        return <Wifi className="h-4 w-4 text-yellow-500 animate-pulse" />;
    }
  };

  const getConnectionStatus = () => {
    switch (connectionStatus) {
      case 'connected':
        return <Badge variant="secondary" className="text-green-700 bg-green-100">Connected</Badge>;
      case 'disconnected':
        return <Badge variant="destructive">Disconnected</Badge>;
      case 'reconnecting':
        return <Badge variant="secondary" className="text-yellow-700 bg-yellow-100">Reconnecting...</Badge>;
    }
  };

  const formatTime = (ms: number) => {
    if (ms < 1000) return `${Math.round(ms)}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const getPerformanceColor = (value: number, thresholds: [number, number]) => {
    if (value <= thresholds[0]) return 'text-green-600';
    if (value <= thresholds[1]) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <Card className={`p-4 ${className}`}>
      <div className="space-y-4">
        {/* Connection Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getConnectionIcon()}
            <span className="text-sm font-medium">Connection</span>
          </div>
          {getConnectionStatus()}
        </div>

        {/* Streaming Indicator */}
        {isStreaming && (
          <div className="flex items-center gap-2 text-sm text-blue-600">
            <div className="flex gap-1">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
            <span>Streaming response...</span>
          </div>
        )}

        {/* Performance Metrics */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs font-medium">Avg Response</span>
            </div>
            <div className={`text-lg font-semibold ${getPerformanceColor(metrics.averageResponseTime, [2000, 5000])}`}>
              {formatTime(metrics.averageResponseTime)}
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs font-medium">Total Requests</span>
            </div>
            <div className="text-lg font-semibold">
              {metrics.totalRequests}
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs font-medium">Cache Hit Rate</span>
            </div>
            <div className="space-y-1">
              <div className={`text-lg font-semibold ${metrics.cacheHitRate > 0.3 ? 'text-green-600' : 'text-yellow-600'}`}>
                {(metrics.cacheHitRate * 100).toFixed(1)}%
              </div>
              <Progress value={metrics.cacheHitRate * 100} className="h-1" />
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs font-medium">Error Rate</span>
            </div>
            <div className="space-y-1">
              <div className={`text-lg font-semibold ${getPerformanceColor(metrics.errorRate * 100, [5, 15])}`}>
                {(metrics.errorRate * 100).toFixed(1)}%
              </div>
              <Progress value={metrics.errorRate * 100} className="h-1" />
            </div>
          </div>
        </div>

        {/* Cache Info */}
        <div className="pt-2 border-t">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Cached responses: {cacheSize}</span>
            <span>Performance data resets on page reload</span>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default PerformanceMonitor;