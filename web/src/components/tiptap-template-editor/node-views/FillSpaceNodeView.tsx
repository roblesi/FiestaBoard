/**
 * React NodeView for FillSpace nodes
 * Displays {{fill_space}} as an expandable ruler with estimated expansion
 */
import React from 'react';
import { NodeViewWrapper } from '@tiptap/react';
import { X, ChevronsLeftRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FillSpaceNodeViewProps {
  node: {
    attrs: {
      id: string;
    };
  };
  deleteNode: () => void;
  selected: boolean;
}

export function FillSpaceNodeView({ node, deleteNode, selected }: FillSpaceNodeViewProps) {
  return (
    <NodeViewWrapper
      as="span"
      className={cn(
        'group inline-flex items-center relative',
        'border border-dashed border-sky-400 dark:border-sky-300 rounded',
        'bg-sky-50 dark:bg-sky-950/30',
        'text-xs text-sky-700 dark:text-sky-300',
        'cursor-grab select-none',
        'transition-all duration-150',
        'mx-0.5 px-2 py-0.5',
        'min-w-[4rem] w-full max-w-full',
        'max-h-[1.2rem] h-[1.2rem]',
        selected && 'ring-2 ring-sky-400 ring-offset-1',
      )}
      contentEditable={false}
      draggable
      data-drag-handle
      title="Fill space - expands to fill remaining line width"
      style={{
        // Make it expand to fill available space in the line
        display: 'inline-flex',
        flex: '1 1 auto',
      }}
    >
      {/* Expansion indicator - animated dots that show it's filling space */}
      <div className="absolute inset-0 flex items-center justify-center gap-1.5 opacity-20">
        <span className="w-1 h-1 rounded-full bg-current animate-pulse" style={{ animationDelay: '0s' }}></span>
        <span className="w-1 h-1 rounded-full bg-current animate-pulse" style={{ animationDelay: '0.2s' }}></span>
        <span className="w-1 h-1 rounded-full bg-current animate-pulse" style={{ animationDelay: '0.4s' }}></span>
        <span className="w-1 h-1 rounded-full bg-current animate-pulse" style={{ animationDelay: '0.6s' }}></span>
      </div>

      {/* Content */}
      <div className="relative z-10 flex items-center gap-1.5 flex-shrink-0">
        {/* Icon */}
        <ChevronsLeftRight className="w-3.5 h-3.5 flex-shrink-0" />
        
        {/* Label */}
        <span className="font-mono text-[10px] uppercase tracking-wider whitespace-nowrap">
          FILL SPACE
        </span>
      </div>
      
      {/* Expanding visual indicator - shows it's filling space */}
      <div className="absolute inset-y-0 right-0 left-0 flex items-center justify-end pr-2 opacity-10">
        <div className="flex gap-0.5">
          <span className="w-0.5 h-full bg-current"></span>
          <span className="w-0.5 h-full bg-current"></span>
          <span className="w-0.5 h-full bg-current"></span>
        </div>
      </div>

      {/* Delete button - show on hover */}
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          deleteNode();
        }}
        className="absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 rounded-full bg-background border border-border shadow-sm hover:bg-destructive hover:text-destructive-foreground p-0.5 transition-all z-20"
        tabIndex={-1}
        aria-label="Remove fill space"
      >
        <X className="w-3 h-3" />
      </button>
    </NodeViewWrapper>
  );
}
