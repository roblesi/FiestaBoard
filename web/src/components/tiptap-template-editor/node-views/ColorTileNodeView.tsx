/**
 * React NodeView for Color Tile nodes
 * Displays {{red}}, {{blue}}, etc. as solid colored tiles
 */
import React from 'react';
import { NodeViewWrapper } from '@tiptap/react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FIESTABOARD_COLORS } from '@/lib/board-colors';

interface ColorTileNodeViewProps {
  node: {
    attrs: {
      color: string;
      code: number;
    };
  };
  deleteNode: () => void;
  selected: boolean;
}

export function ColorTileNodeView({ node, deleteNode, selected }: ColorTileNodeViewProps) {
  const { color, code } = node.attrs;
  const colorKey = color.toLowerCase() as keyof typeof FIESTABOARD_COLORS;
  const bgColor = FIESTABOARD_COLORS[colorKey] || FIESTABOARD_COLORS.red;

  // Match board display styling with 3D effect
  const boxShadow = `
    0 2px 4px rgba(0,0,0,0.3),
    inset 0 1px 1px rgba(255,255,255,0.15),
    inset 0 -1px 1px rgba(0,0,0,0.25),
    inset 1px 0 1px rgba(255,255,255,0.1),
    inset -1px 0 1px rgba(0,0,0,0.2)
  `;

  return (
    <NodeViewWrapper
      as="span"
      className={cn(
        'group inline-flex items-center justify-center relative rounded-[3px] cursor-grab select-none',
        'transition-all duration-150',
        'hover:scale-105',
        'active:cursor-grabbing active:scale-100',
        selected && 'ring-2 ring-offset-1 ring-primary',
      )}
      contentEditable={false}
      draggable
      data-drag-handle
      style={{ 
        backgroundColor: bgColor,
        width: '1ch',
        height: '1.4rem',
        maxHeight: '1.4rem',
        minHeight: '1.4rem',
        boxShadow,
        flexShrink: 0,
        display: 'inline-block',
        verticalAlign: 'middle',
      }}
      title={`${color} tile (code ${code})`}
    >
      {/* Subtle split flip effect - horizontal line in middle */}
      <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-black/10" />
      
      {/* Subtle gradient for curvature */}
      <div 
        className="absolute inset-0 pointer-events-none rounded-[3px]"
        style={{
          background: 'linear-gradient(180deg, rgba(255,255,255,0.15) 0%, transparent 50%, rgba(0,0,0,0.2) 100%)'
        }}
      />
      
      {/* Delete button - only show on hover */}
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          deleteNode();
        }}
        className={cn(
          'absolute -top-1 -right-1 rounded-full p-0.5 transition-all opacity-0 group-hover:opacity-100',
          'bg-background border border-border shadow-sm',
          'hover:bg-destructive hover:text-destructive-foreground',
          'z-10'
        )}
        tabIndex={-1}
        aria-label={`Remove ${color} color tile`}
      >
        <X className="w-3 h-3" />
      </button>
      
      {/* Hidden text for screen readers */}
      <span className="sr-only">{color} color tile</span>
    </NodeViewWrapper>
  );
}
