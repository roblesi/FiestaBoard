/**
 * TipTap Line Editor - Single line template editing
 * Provides basic single-line template editing with variables/colors
 */
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
import { WrappedTextNode } from './extensions/wrapped-text-node';
import { parseTemplate, serializeTemplate } from './utils/serialization';

interface TipTapLineEditorProps {
  value: string;
  onChange: (value: string) => void;
  onFocus?: () => void;
  placeholder?: string;
  isActive?: boolean;
  hasWarning?: boolean;
  className?: string;
}

/**
 * TipTap-based single line editor
 */
export function TipTapLineEditor({
  value,
  onChange,
  onFocus,
  placeholder = "Type text or insert variables...",
  isActive,
  hasWarning,
  className,
}: TipTapLineEditorProps) {
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
      WrappedTextNode,
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
    return <div className={cn('min-h-[2.25rem] sm:min-h-[2rem]', className)} />;
  }

  return (
    <>
      <EditorContent
        editor={editor}
        className={className}
      />
      
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
    </>
  );
}
