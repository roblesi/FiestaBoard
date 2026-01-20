/**
 * React NodeView for TemplateParagraph
 * Shows alignment and wrap indicators as badges at the end of the line
 */
import React from 'react';
import { NodeViewWrapper, NodeViewContent } from '@tiptap/react';
import { CornerDownLeft, AlignLeft, AlignCenter, AlignRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TemplateParagraphViewProps {
  node: {
    attrs: {
      alignment: 'left' | 'center' | 'right';
      wrapEnabled: boolean;
    };
  };
  updateAttributes: (attrs: Record<string, any>) => void;
}

export function TemplateParagraphView({ node, updateAttributes }: TemplateParagraphViewProps) {
  const { alignment, wrapEnabled } = node.attrs;
  
  // Alignment display mapping
  const alignmentDisplay = {
    left: { icon: AlignLeft, label: 'LEFT' },
    center: { icon: AlignCenter, label: 'CENTER' },
    right: { icon: AlignRight, label: 'RIGHT' },
  };
  
  const currentAlignment = alignment || 'left';
  const AlignmentIcon = alignmentDisplay[currentAlignment as keyof typeof alignmentDisplay].icon;
  const alignmentLabel = alignmentDisplay[currentAlignment as keyof typeof alignmentDisplay].label;

  return (
    <NodeViewWrapper
      as="div"
      className={cn(
        'my-0 leading-relaxed flex items-center gap-2 flex-nowrap',
        alignment === 'center' && 'justify-center',
        alignment === 'right' && 'justify-end',
      )}
      style={{
        textAlign: alignment || 'left',
      }}
      data-alignment={alignment}
      data-wrap-enabled={wrapEnabled ? 'true' : undefined}
    >
      {/* Editable content - use span to avoid div nesting */}
      <NodeViewContent as="span" className="flex-1 min-w-0" />
      
      {/* Wrap indicator badge - shown first for consistency */}
      {wrapEnabled && (
        <span
          contentEditable={false}
          className={cn(
            'inline-flex items-center gap-1 px-1.5 py-0.5 ml-1',
            'border border-dashed border-emerald-400 dark:border-emerald-300 rounded',
            'bg-emerald-50 dark:bg-emerald-950/30',
            'text-[10px] text-emerald-700 dark:text-emerald-300 font-medium',
            'cursor-pointer select-none shrink-0',
            'transition-all duration-150 hover:bg-emerald-100 dark:hover:bg-emerald-900/40',
          )}
          onClick={() => {
            // Toggle wrap when clicked
            updateAttributes({ wrapEnabled: false });
          }}
          title="Text wrapping enabled - content flows to next lines (click to disable)"
        >
          <CornerDownLeft className="w-2.5 h-2.5" />
          <span className="uppercase tracking-wider">WRAP</span>
        </span>
      )}
      
      {/* Alignment indicator badge - shown after wrap */}
      <span
        contentEditable={false}
        className={cn(
          'inline-flex items-center gap-1 px-1.5 py-0.5 ml-1',
          'border border-dashed border-blue-400 dark:border-blue-300 rounded',
          'bg-blue-50 dark:bg-blue-950/30',
          'text-[10px] text-blue-700 dark:text-blue-300 font-medium',
          'select-none shrink-0',
        )}
        title={`Text aligned ${alignmentLabel.toLowerCase()}`}
      >
        <AlignmentIcon className="w-2.5 h-2.5" />
        <span className="uppercase tracking-wider">{alignmentLabel}</span>
      </span>
    </NodeViewWrapper>
  );
}
