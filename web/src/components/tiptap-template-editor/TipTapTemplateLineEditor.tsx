/**
 * TipTap Template Line Editor - Complete wrapper with toolbar and metrics
 * Drop-in replacement for template-line-editor.tsx
 */
"use client";

import { TipTapTemplateEditor } from './index';
import { EditorToolbar } from './components/EditorToolbar';
import { LineMetrics } from './components/LineMetrics';
import { useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { TemplateParagraph } from './extensions/template-paragraph';
import { VariableNode } from './extensions/variable-node';
import { ColorTileNode } from './extensions/color-tile-node';
import { FillSpaceNode } from './extensions/fill-space-node';
import { SymbolNode } from './extensions/symbol-node';
import { parseTemplate, serializeTemplate } from './utils/serialization';
import { useEffect } from 'react';
import { cn } from '@/lib/utils';

interface TipTapTemplateLineEditorProps {
  value: string;
  onChange: (value: string) => void;
  onFocus?: () => void;
  placeholder?: string;
  isActive?: boolean;
  hasWarning?: boolean;
  className?: string;
  showToolbar?: boolean;
  showMetrics?: boolean;
}

/**
 * Complete TipTap template line editor with toolbar and metrics
 * Compatible with existing template-line-editor interface
 */
export function TipTapTemplateLineEditor({
  value,
  onChange,
  onFocus,
  placeholder = "Type text or insert variables...",
  isActive,
  hasWarning,
  className,
  showToolbar = false,
  showMetrics = false,
}: TipTapTemplateLineEditorProps) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: false,
        blockquote: false,
        codeBlock: false,
        horizontalRule: false,
        bulletList: false,
        orderedList: false,
        listItem: false,
        code: false,
        bold: false,
        italic: false,
        strike: false,
        history: true,
        document: true,
        text: true,
        hardBreak: false,
        paragraph: false,
      }),
      TemplateParagraph,
      VariableNode,
      ColorTileNode,
      FillSpaceNode,
      SymbolNode,
    ],
    content: parseTemplate(value || ''),
    editorProps: {
      attributes: {
        class: cn(
          'w-full min-w-0 min-h-[2.25rem] sm:min-h-[2rem] px-2 sm:px-3 py-1.5',
          'text-sm font-mono rounded-l border-y border-l bg-background',
          'focus:outline-none focus-visible:outline-none',
          'prose prose-sm max-w-none',
          '[&_p]:my-0 [&_p]:leading-relaxed',
          isActive && 'border-primary ring-1 ring-primary',
          hasWarning && 'border-yellow-500',
          className
        ),
        'data-placeholder': placeholder,
      },
    },
    onUpdate: ({ editor }) => {
      const doc = editor.getJSON();
      const templateString = serializeTemplate(doc);
      onChange(templateString);
    },
    onFocus: () => {
      onFocus?.();
    },
  });

  // Update editor content when value changes externally
  useEffect(() => {
    if (editor) {
      const currentSerialized = serializeTemplate(editor.getJSON());
      if (value !== currentSerialized) {
        editor.commands.setContent(parseTemplate(value || ''));
      }
    }
  }, [value, editor]);

  if (!editor) {
    return null;
  }

  return (
    <div className="flex flex-col w-full">
      {/* Toolbar (optional) */}
      {showToolbar && <EditorToolbar editor={editor} />}
      
      {/* Editor */}
      <div className="relative">
        <div className={cn('tiptap-editor-wrapper', className)}>
          {editor && (
            <div
              className={cn(
                'w-full min-w-0 min-h-[2.25rem] sm:min-h-[2rem] px-2 sm:px-3 py-1.5',
                'text-sm font-mono rounded-l border-y border-l bg-background',
                'focus-within:outline-none',
                '[&_.ProseMirror]:outline-none [&_.ProseMirror]:min-h-[1.5rem]',
                '[&_.ProseMirror_p]:my-0 [&_.ProseMirror_p]:leading-relaxed',
                isActive && 'border-primary ring-1 ring-primary',
                hasWarning && 'border-yellow-500',
              )}
            >
              {editor.view && <div dangerouslySetInnerHTML={{ __html: editor.view.dom.outerHTML }} />}
            </div>
          )}
        </div>

        {/* Placeholder styling */}
        <style jsx global>{`
          .ProseMirror[data-placeholder]:empty::before {
            content: attr(data-placeholder);
            color: hsl(var(--muted-foreground));
            float: left;
            height: 0;
            pointer-events: none;
          }
          
          .ProseMirror:focus[data-placeholder]:empty::before {
            opacity: 0.5;
          }
        `}</style>
      </div>

      {/* Line Metrics (optional) */}
      {showMetrics && (
        <div className="mt-2 p-2 bg-muted/30 rounded border border-border/50">
          <LineMetrics editor={editor} />
        </div>
      )}
    </div>
  );
}
