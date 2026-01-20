/**
 * Line Metrics - Real-time character count and overflow warnings
 */
import React from 'react';
import { Editor } from '@tiptap/react';
import { AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { calculateAllLineMetrics, LineMetrics as MetricsData } from '../utils/length-calculator';

interface LineMetricsProps {
  editor: Editor | null;
  className?: string;
}

export function LineMetrics({ editor, className }: LineMetricsProps) {
  if (!editor) {
    return null;
  }

  const doc = editor.getJSON();
  const metrics = calculateAllLineMetrics(doc);

  return (
    <div className={cn('space-y-1 p-2 text-xs', className)}>
      <div className="font-medium text-muted-foreground mb-2">Line Lengths</div>
      
      {metrics.map((metric, idx) => (
        <LineMetricRow key={idx} lineNumber={idx + 1} metric={metric} />
      ))}
    </div>
  );
}

interface LineMetricRowProps {
  lineNumber: number;
  metric: MetricsData;
}

function LineMetricRow({ lineNumber, metric }: LineMetricRowProps) {
  const { length, maxLength, overflow, overflowAmount, fillPercentage } = metric;

  return (
    <div className="flex items-center gap-2">
      {/* Line number */}
      <span className="text-muted-foreground font-mono w-4">
        {lineNumber}:
      </span>

      {/* Visual bar */}
      <div className="flex-1 h-4 bg-muted rounded-sm overflow-hidden relative">
        <div
          className={cn(
            'h-full transition-all duration-200',
            overflow ? 'bg-red-500' : 'bg-green-500/70'
          )}
          style={{ width: `${Math.min(100, fillPercentage)}%` }}
        />
        
        {/* Overflow indicator */}
        {overflow && (
          <div
            className="absolute top-0 right-0 h-full bg-red-500/40 border-l-2 border-red-600"
            style={{ width: `${(overflowAmount / maxLength) * 100}%` }}
          />
        )}
      </div>

      {/* Character count */}
      <span
        className={cn(
          'font-mono tabular-nums text-right w-12',
          overflow ? 'text-red-600 dark:text-red-400 font-medium' : 'text-muted-foreground'
        )}
      >
        {length}/{maxLength}
      </span>

      {/* Warning icon */}
      {overflow && (
        <AlertTriangle
          className="w-3.5 h-3.5 text-red-600 dark:text-red-400"
          title={`Overflow by ${overflowAmount} characters`}
        />
      )}
    </div>
  );
}
