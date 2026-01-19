/**
 * React NodeView for Variable nodes
 * Displays {{plugin.field}} as an interactive badge with filters
 */
import React from 'react';
import { NodeViewWrapper } from '@tiptap/react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VariableNodeViewProps {
  node: {
    attrs: {
      pluginId: string;
      field: string;
      filters: Array<{ name: string; arg?: string }>;
      maxLength?: number;
    };
  };
  deleteNode: () => void;
  selected: boolean;
}

export function VariableNodeView({ node, deleteNode, selected }: VariableNodeViewProps) {
  const { pluginId, field, filters, maxLength } = node.attrs;

  return (
    <NodeViewWrapper
      as="span"
      className={cn(
        'inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-medium cursor-grab select-none',
        'border transition-all duration-150',
        'bg-indigo-500/15 border-indigo-500/30 text-indigo-700 dark:text-indigo-300',
        'hover:bg-indigo-500/20',
        'active:cursor-grabbing',
        'max-h-[1.2rem] h-auto',
        'mr-0.5', // Small space after the tag
        selected && 'ring-2 ring-indigo-500 ring-offset-1',
      )}
      contentEditable={false}
      draggable
      data-drag-handle
    >
      {/* Variable display */}
      <span className="font-mono text-[11px]">
        {pluginId}.{field}
      </span>

      {/* Filters */}
      {filters && filters.length > 0 && (
        <span className="flex items-center gap-0.5">
          {filters.map((filter, idx) => (
            <span
              key={idx}
              className="inline-flex items-center px-1 py-0.5 rounded text-[10px] bg-indigo-500/20"
              title={`Filter: ${filter.name}${filter.arg ? `:${filter.arg}` : ''}`}
            >
              {filter.name}
              {filter.arg && `:${filter.arg}`}
            </span>
          ))}
        </span>
      )}

      {/* Max length indicator (on hover) */}
      {maxLength && (
        <span
          className="text-[10px] opacity-0 group-hover:opacity-50 transition-opacity"
          title={`Max length: ${maxLength} characters`}
        >
          ~{maxLength}
        </span>
      )}

      {/* Delete button */}
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          deleteNode();
        }}
        className="rounded-full hover:bg-black/10 dark:hover:bg-white/10 p-0.5 -mr-1 ml-0 transition-colors"
        tabIndex={-1}
        aria-label={`Remove ${pluginId}.${field} variable`}
      >
        <X className="w-3 h-3" />
      </button>
    </NodeViewWrapper>
  );
}
