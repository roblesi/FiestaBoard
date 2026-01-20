/**
 * Editor Toolbar - Alignment controls and other actions
 */
import React from 'react';
import { Editor } from '@tiptap/react';
import { AlignLeft, AlignCenter, AlignRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EditorToolbarProps {
  editor: Editor | null;
}

export function EditorToolbar({ editor }: EditorToolbarProps) {
  if (!editor) {
    return null;
  }

  const currentAlignment = editor.getAttributes('templateParagraph').alignment || 'left';

  const setAlignment = (alignment: 'left' | 'center' | 'right') => {
    editor.chain().focus().updateAttributes('templateParagraph', { alignment }).run();
  };

  return (
    <div className="flex items-center gap-1 p-1 border-b border-border/50 bg-muted/30">
      {/* Alignment buttons */}
      <div className="flex items-center gap-0.5 px-1">
        <button
          type="button"
          onClick={() => setAlignment('left')}
          className={cn(
            'p-1.5 rounded hover:bg-accent transition-colors',
            currentAlignment === 'left' && 'bg-accent text-accent-foreground'
          )}
          title="Align left"
          aria-label="Align left"
        >
          <AlignLeft className="w-4 h-4" />
        </button>
        
        <button
          type="button"
          onClick={() => setAlignment('center')}
          className={cn(
            'p-1.5 rounded hover:bg-accent transition-colors',
            currentAlignment === 'center' && 'bg-accent text-accent-foreground'
          )}
          title="Align center"
          aria-label="Align center"
        >
          <AlignCenter className="w-4 h-4" />
        </button>
        
        <button
          type="button"
          onClick={() => setAlignment('right')}
          className={cn(
            'p-1.5 rounded hover:bg-accent transition-colors',
            currentAlignment === 'right' && 'bg-accent text-accent-foreground'
          )}
          title="Align right"
          aria-label="Align right"
        >
          <AlignRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
