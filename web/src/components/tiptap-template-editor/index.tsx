"use client";

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { useEffect } from 'react';
import { cn } from '@/lib/utils';
import { TemplateParagraph } from './extensions/template-paragraph';
import { VariableNode } from './extensions/variable-node';
import { ColorTileNode } from './extensions/color-tile-node';
import { FillSpaceNode } from './extensions/fill-space-node';
import { SymbolNode } from './extensions/symbol-node';
import { parseTemplate, serializeTemplate } from './utils/serialization';
import { BOARD_LINES } from './utils/constants';

interface TipTapTemplateEditorProps {
  value: string;
  onChange: (value: string) => void;
  onFocus?: () => void;
  placeholder?: string;
  isActive?: boolean;
  hasWarning?: boolean;
  className?: string;
}

/**
 * TipTap-based template editor with hardware constraints
 * - Fixed 6 lines (matching FiestaBoard display)
 * - Custom nodes for variables, colors, symbols, fill_space
 * - WYSIWYG rendering of actual board characters
 */
export function TipTapTemplateEditor({
  value,
  onChange,
  onFocus,
  placeholder = "Type text or insert variables...",
  isActive,
  hasWarning,
  className,
}: TipTapTemplateEditorProps) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        // Disable features we don't need
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
        // Keep only essential features
        history: true,
        document: true,
        text: true,
        hardBreak: false,
        paragraph: false, // We'll use our custom one
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
          'w-full min-h-[2.25rem] sm:min-h-[2rem] px-2 sm:px-3 py-1.5',
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
      // Serialize TipTap document back to template string
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
    <div className={cn('relative', className)}>
      <EditorContent editor={editor} />
      
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
  );
}
