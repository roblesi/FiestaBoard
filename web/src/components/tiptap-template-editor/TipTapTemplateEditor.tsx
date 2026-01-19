/**
 * Single 6-line TipTap Template Editor
 * Replaces 6 separate line editors with one unified editor
 * - 6 lines, 22 characters wide each
 * - Per-line alignment support
 * - Visual rendering of custom nodes (variables, colors, symbols, fill_space)
 */
"use client";

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { TemplateParagraph } from './extensions/template-paragraph';
import { VariableNode } from './extensions/variable-node';
import { ColorTileNode } from './extensions/color-tile-node';
import { FillSpaceNode } from './extensions/fill-space-node';
import { SymbolNode } from './extensions/symbol-node';
import { parseTemplate, serializeTemplate } from './utils/serialization';
import { BOARD_LINES, BOARD_WIDTH } from './utils/constants';
import { AlignLeft, AlignCenter, AlignRight } from 'lucide-react';
import type { LineAlignment } from './extensions/template-paragraph';
import { TemplateEditorToolbar } from './components/TemplateEditorToolbar';

interface TipTapTemplateEditorProps {
  value: string; // Template string with 6 lines separated by \n
  onChange: (value: string) => void;
  onFocus?: () => void;
  placeholder?: string;
  className?: string;
  showAlignmentControls?: boolean;
  onLineAlignmentChange?: (lineIndex: number, alignment: LineAlignment) => void;
  lineAlignments?: LineAlignment[]; // Array of 6 alignments
  showToolbar?: boolean; // Show toolbar at top (default: true)
}

/**
 * Single TipTap editor for all 6 template lines
 */
export function TipTapTemplateEditor({
  value,
  onChange,
  onFocus,
  placeholder = "Type text or insert variables...",
  className,
  showAlignmentControls = true,
  onLineAlignmentChange,
  lineAlignments = ['left', 'left', 'left', 'left', 'left', 'left'],
  showToolbar = true,
}: TipTapTemplateEditorProps) {
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
        paragraph: false, // We use TemplateParagraph instead
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
          'w-full font-mono text-sm',
          'prose prose-sm max-w-none',
          '[&_.ProseMirror]:outline-none',
          '[&_.ProseMirror]:font-mono',
          '[&_.ProseMirror]:text-sm',
          '[&_.ProseMirror_p]:my-0 [&_.ProseMirror_p]:leading-tight',
          '[&_.ProseMirror_p]:min-h-[1.5rem]',
          // Constrain each paragraph to 22 characters visually
          '[&_.ProseMirror_p]:max-w-[22ch]',
          '[&_.ProseMirror_p]:overflow-hidden',
          className
        ),
        'data-placeholder': placeholder,
      },
      handleKeyDown: (view, event) => {
        // Let the extension handle Enter key logic
        // The extension's addKeyboardShortcuts will handle all Enter behavior
        if (event.key === 'Enter') {
          return false; // Let it propagate to extension
        }
        
        // Convert lowercase letters to uppercase
        if (event.key.length === 1 && /[a-z]/.test(event.key) && !event.ctrlKey && !event.metaKey) {
          event.preventDefault();
          const { state, dispatch } = view;
          const { selection } = state;
          const uppercaseChar = event.key.toUpperCase();
          
          // Insert uppercase character
          const tr = state.tr.insertText(uppercaseChar, selection.from, selection.to);
          dispatch(tr);
          return true;
        }
        
        return false;
      },
      transformPastedText: (text) => {
        // Convert pasted text to uppercase
        return text.toUpperCase();
      },
      handleDrop: (view, event, slice, moved) => {
        // Enable drag and drop for nodes with data-drag-handle
        if (moved) {
          return false; // Let TipTap handle moved nodes
        }
        return false; // Let TipTap handle regular drops
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

  // Ensure editor always has exactly 6 paragraphs
  useEffect(() => {
    if (editor) {
      const { doc } = editor.state;
      const paragraphCount = doc.content.childCount;
      
      if (paragraphCount < BOARD_LINES) {
        // Add missing paragraphs
        const tr = editor.state.tr;
        for (let i = paragraphCount; i < BOARD_LINES; i++) {
          tr.insert(tr.doc.content.size, editor.schema.nodes.templateParagraph.create({ alignment: 'left' }));
        }
        editor.view.dispatch(tr);
      } else if (paragraphCount > BOARD_LINES) {
        // Remove extra paragraphs (shouldn't happen, but handle it)
        const currentValue = serializeTemplate(editor.getJSON());
        editor.commands.setContent(parseTemplate(currentValue));
      }
    }
  }, [editor]);

  // Update alignments when they change externally
  useEffect(() => {
    if (editor && lineAlignments) {
      const { doc } = editor.state;
      const tr = editor.state.tr;
      let modified = false;
      
      doc.descendants((node, pos) => {
        if (node.type.name === 'templateParagraph') {
          // Get paragraph index by counting previous paragraphs
          let paragraphIndex = 0;
          doc.nodesBetween(0, pos, (n) => {
            if (n.type.name === 'templateParagraph') {
              paragraphIndex++;
            }
          });
          
          if (paragraphIndex < BOARD_LINES) {
            const currentAlignment = node.attrs.alignment || 'left';
            const newAlignment = lineAlignments[paragraphIndex] || 'left';
            
            if (currentAlignment !== newAlignment) {
              tr.setNodeMarkup(pos, undefined, {
                ...node.attrs,
                alignment: newAlignment,
              });
              modified = true;
            }
          }
        }
      });
      
      if (modified) {
        editor.view.dispatch(tr);
      }
    }
  }, [editor, lineAlignments]);

  // Get current line index from cursor position
  const getCurrentLineIndex = useCallback((): number | null => {
    if (!editor) return null;
    const { state } = editor;
    const { selection } = state;
    const { $from } = selection;
    
    // Count paragraphs before the current position
    let paragraphIndex = 0;
    state.doc.nodesBetween(0, $from.pos, (node) => {
      if (node.type.name === 'templateParagraph') {
        paragraphIndex++;
      }
    });
    
    // If we're inside a paragraph, return its index (0-based)
    // Otherwise return null
    const currentParagraph = $from.node($from.depth);
    if (currentParagraph.type.name === 'templateParagraph') {
      return paragraphIndex - 1; // -1 because we counted the current paragraph
    }
    
    return null;
  }, [editor]);

  // Handle alignment button clicks
  const handleAlignmentClick = useCallback((alignment: LineAlignment) => {
    if (!editor) return;
    
    const lineIndex = getCurrentLineIndex();
    if (lineIndex === null || lineIndex < 0 || lineIndex >= BOARD_LINES) {
      return; // Can't apply alignment if no line is selected
    }

    // Apply to specific line
    const { state } = editor;
    const { doc } = state;
    let paragraphCount = 0;
    
    doc.descendants((node, pos) => {
      if (node.type.name === 'templateParagraph') {
        if (paragraphCount === lineIndex) {
          const tr = state.tr;
          tr.setNodeMarkup(pos, undefined, {
            ...node.attrs,
            alignment,
          });
          editor.view.dispatch(tr);
          
          // Notify parent of alignment change
          if (onLineAlignmentChange) {
            onLineAlignmentChange(lineIndex, alignment);
          }
        }
        paragraphCount++;
      }
    });
  }, [editor, getCurrentLineIndex, onLineAlignmentChange]);

  if (!editor) {
    return (
      <div className={cn('min-h-[9rem] border rounded-md p-2 bg-muted/30', className)}>
        <div className="space-y-1">
          {Array.from({ length: BOARD_LINES }).map((_, i) => (
            <div key={i} className="h-6 bg-background/50 rounded" />
          ))}
        </div>
      </div>
    );
  }

  const currentLineIndex = getCurrentLineIndex();
  const currentAlignment = currentLineIndex !== null && currentLineIndex >= 0 && currentLineIndex < BOARD_LINES
    ? lineAlignments[currentLineIndex] || 'left'
    : 'left';

  return (
    <div className={cn('relative', className)}>
      {/* Toolbar */}
      {showToolbar && (
        <TemplateEditorToolbar
          editor={editor}
          currentAlignment={currentAlignment}
          onAlignmentChange={(alignment) => {
            handleAlignmentClick(alignment);
          }}
        />
      )}
      
      {/* Editor container */}
      <div className="flex-1">
        <div className={cn(
          "border bg-background relative",
          showToolbar ? "rounded-b-md border-t-0" : "rounded-md"
        )} style={{ padding: '0.5rem', paddingLeft: '2.5rem', overflow: 'visible' }}>
            {/* Grid overlay - 22 columns × 6 rows matching board display */}
            <div 
              className="absolute pointer-events-none z-0"
              style={{
                top: '0.5rem',
                left: '2.5rem',
                right: '0.5rem',
                bottom: '0.5rem',
                backgroundImage: `
                  repeating-linear-gradient(
                    to right,
                    transparent 0,
                    transparent calc(1ch - 0.5px),
                    hsl(var(--border) / 0.2) calc(1ch - 0.5px),
                    hsl(var(--border) / 0.2) calc(1ch + 0.5px),
                    transparent calc(1ch + 0.5px)
                  ),
                  repeating-linear-gradient(
                    to bottom,
                    transparent 0,
                    transparent calc(1.5rem - 0.5px),
                    hsl(var(--border) / 0.2) calc(1.5rem - 0.5px),
                    hsl(var(--border) / 0.2) calc(1.5rem + 0.5px),
                    transparent calc(1.5rem + 0.5px)
                  )
                `,
              }}
            />
          <div className="relative z-10">
            <EditorContent editor={editor} />
          </div>
        </div>

        {/* Alignment controls - only show if toolbar is hidden */}
        {!showToolbar && showAlignmentControls && (
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs text-muted-foreground">Alignment:</span>
              <div className="flex rounded-md border overflow-hidden">
                <button
                  type="button"
                  onClick={() => handleAlignmentClick('left')}
                  className={cn(
                    'px-3 py-1.5 text-xs transition-colors',
                    currentAlignment === 'left'
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-muted text-muted-foreground'
                  )}
                  title="Align left"
                >
                  <AlignLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleAlignmentClick('center')}
                  className={cn(
                    'px-3 py-1.5 text-xs border-x transition-colors',
                    currentAlignment === 'center'
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'hover:bg-muted text-muted-foreground'
                  )}
                  title="Align center"
                >
                  <AlignCenter className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleAlignmentClick('right')}
                  className={cn(
                    'px-3 py-1.5 text-xs transition-colors',
                    currentAlignment === 'right'
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-muted text-muted-foreground'
                  )}
                  title="Align right"
                >
                  <AlignRight className="w-4 h-4" />
                </button>
              </div>
              {currentLineIndex !== null && (
                <span className="text-xs text-muted-foreground">
                  (Line {currentLineIndex + 1})
                </span>
              )}
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

        /* Ensure each paragraph is treated as a line with FIXED height */
        .ProseMirror > p {
          display: flex;
          flex-wrap: nowrap;
          align-items: center;
          width: 100%;
          max-width: ${BOARD_WIDTH}ch;
          min-height: 1.5rem;
          max-height: 1.5rem;
          height: 1.5rem;
          line-height: 1.5rem;
          margin: 0;
          padding: 0;
          padding-left: 6px; /* Space for cursor at position 0 */
          text-transform: uppercase;
          gap: 0;
          font-family: 'Courier New', 'Courier', monospace;
          font-size: 0.875rem;
          letter-spacing: 0;
          position: relative;
          overflow: visible;
          counter-increment: line-number;
        }
        
        /* Add line numbers using CSS counter */
        .ProseMirror > p::before {
          content: counter(line-number);
          position: absolute;
          left: -2.5rem;
          width: 2rem;
          text-align: right;
          font-size: 0.75rem;
          color: hsl(var(--muted-foreground));
          line-height: 1.5rem;
          height: 1.5rem;
          display: flex;
          align-items: center;
          justify-content: flex-end;
          pointer-events: none;
          padding-right: 0.5rem; /* Space between line number and content */
        }
        
        /* Initialize counter */
        .ProseMirror {
          counter-reset: line-number;
        }
        
        /* Ensure empty paragraphs are visible and maintain height */
        .ProseMirror > p:empty::after {
          content: '';
          display: inline-block;
          width: 1ch;
          height: 1.4rem;
        }
        
        .ProseMirror > p:empty {
          min-height: 1.5rem !important;
          height: 1.5rem !important;
          position: relative;
        }
        
        /* Show a visible cursor placeholder on empty lines when editor is focused */
        .ProseMirror-focused > p:empty::before,
        .ProseMirror:focus-within > p:empty::before {
          content: '';
          position: absolute;
          left: 6px;
          top: 0;
          width: 2px;
          height: 1.4rem;
          background-color: hsl(var(--primary));
          animation: blink 1s step-end infinite;
          pointer-events: none;
        }
        
        /* Make it a block cursor on the currently selected empty line */
        .ProseMirror-focused > p:empty:has(+ *):first-of-type::before,
        .ProseMirror > p:empty:focus-within::before {
          width: 1ch;
          background-color: hsl(var(--primary) / 0.3);
          border: 2px solid hsl(var(--primary));
        }
        
        /* Block-style blinking cursor (dogbone) */
        .ProseMirror-focused .ProseMirror-gapcursor {
          display: block !important;
        }
        
        .ProseMirror .ProseMirror-cursor {
          position: relative;
          display: inline-block;
          width: 1ch;
          height: 1.4rem;
          background-color: hsl(var(--primary) / 0.5);
          border: 2px solid hsl(var(--primary));
          animation: blink 1s step-end infinite;
          pointer-events: none;
        }
        
        @keyframes blink {
          0%, 50% {
            opacity: 1;
          }
          50.1%, 100% {
            opacity: 0;
          }
        }
        
        /* Force caret to always be visible */
        .ProseMirror {
          caret-shape: block;
        }
        
        /* Ensure paragraphs can receive cursor even when empty */
        .ProseMirror > p {
          min-width: 1ch;
        }
        
        .ProseMirror > p br {
          display: none;
        }
        
        /* Make caret a visible block */
        .ProseMirror {
          caret-color: hsl(var(--primary));
        }
        
        .ProseMirror:focus {
          caret-color: hsl(var(--primary));
        }
        
        /* Override default caret with a block style using a pseudo-element trick */
        @supports (caret-shape: block) {
          .ProseMirror {
            caret-shape: block;
          }
        }
        
        /* Reduce or remove focus ring on the container */
        .ProseMirror:focus-visible {
          outline: none;
        }
        
        /* Ensure text nodes have proper spacing */
        .ProseMirror > p > .text {
          padding-left: 0;
        }
        
        /* Make each character/node appear in a grid cell with FIXED height */
        .ProseMirror > p > * {
          display: inline-flex;
          align-items: center;
          vertical-align: middle;
          max-height: 1.4rem;
          height: auto;
        }
        
        /* All inline nodes must not exceed line height */
        .ProseMirror [data-type="variable"],
        .ProseMirror [data-type="color-tile"],
        .ProseMirror [data-type="symbol"],
        .ProseMirror [data-type="fill-space"] {
          max-height: 1.4rem !important;
          height: auto !important;
          line-height: 1.4rem;
          vertical-align: middle;
        }
        
        /* Text should be monospace and equal width - each character is exactly 1ch */
        .ProseMirror {
          font-family: 'Courier New', 'Courier', monospace;
          font-variant-numeric: tabular-nums;
        }
        
        /* Subtle cell background for each character position */
        .ProseMirror > p {
          background-image: repeating-linear-gradient(
            to right,
            transparent 0,
            transparent calc(1ch - 0.5px),
            hsl(var(--muted) / 0.05) calc(1ch - 0.5px),
            hsl(var(--muted) / 0.05) calc(1ch + 0.5px),
            transparent calc(1ch + 0.5px)
          );
        }
        
        /* Make fill-space nodes expand to fill available space */
        .ProseMirror > p [data-type="fill-space"] {
          flex: 1 1 auto;
          min-width: 3rem;
        }
        
        /* Don't transform node views (they handle their own display) */
        .ProseMirror [data-type="variable"],
        .ProseMirror [data-type="color-tile"],
        .ProseMirror [data-type="symbol"],
        .ProseMirror [data-type="fill-space"] {
          text-transform: none;
        }
        
        /* Enable dragging for nodes with data-drag-handle */
        .ProseMirror [data-drag-handle] {
          cursor: grab;
        }
        
        .ProseMirror [data-drag-handle]:active {
          cursor: grabbing;
        }

        /* Apply text alignment based on data-alignment attribute */
        .ProseMirror p[data-alignment="center"] {
          text-align: center;
        }
        .ProseMirror p[data-alignment="right"] {
          text-align: right;
        }
        .ProseMirror p[data-alignment="left"] {
          text-align: left;
        }
        
        /* Visual alignment indicators using pseudo-elements */
        .ProseMirror > p::before {
          content: '';
          position: absolute;
          left: 2px;
          top: 50%;
          transform: translateY(-50%);
          width: 3px;
          height: 12px;
          border-radius: 2px;
          opacity: 0.5;
          transition: opacity 0.2s, width 0.2s;
          pointer-events: none;
          z-index: 1;
        }
        
        /* Left alignment: vertical bar on the left */
        .ProseMirror > p[data-alignment="left"]::before {
          background-color: hsl(var(--primary));
          left: 2px;
          width: 3px;
        }
        
        /* Center alignment: centered dot */
        .ProseMirror > p[data-alignment="center"]::before {
          background-color: hsl(var(--primary));
          left: 50%;
          transform: translate(-50%, -50%);
          width: 6px;
          height: 6px;
          border-radius: 50%;
        }
        
        /* Right alignment: vertical bar on the right */
        .ProseMirror > p[data-alignment="right"]::before {
          background-color: hsl(var(--primary));
          right: 2px;
          left: auto;
          width: 3px;
        }
        
        /* Increase opacity on hover for better visibility */
        .ProseMirror > p:hover::before {
          opacity: 0.8;
        }
        
        /* Add subtle background tint for non-left alignments */
        .ProseMirror > p[data-alignment="center"] {
          background: linear-gradient(to right, 
            transparent 0%, 
            hsl(var(--primary) / 0.03) 48%, 
            hsl(var(--primary) / 0.03) 52%, 
            transparent 100%);
        }
        
        .ProseMirror > p[data-alignment="right"] {
          background: linear-gradient(to right, 
            transparent 0%, 
            hsl(var(--primary) / 0.03) 85%, 
            hsl(var(--primary) / 0.03) 100%);
        }
      `}</style>
    </div>
  );
}
