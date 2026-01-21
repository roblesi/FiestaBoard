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
import { useEffect, useCallback, useRef } from 'react';
import { cn } from '@/lib/utils';
// No longer using custom paragraph extension
import { VariableNode } from './extensions/variable-node';
import { ColorTileNode } from './extensions/color-tile-node';
import { FillSpaceNode } from './extensions/fill-space-node';
import { SymbolNode } from './extensions/symbol-node';
import { WrappedTextNode } from './extensions/wrapped-text-node';
import { parseTemplateSimple, serializeTemplateSimple } from './utils/serialization';
import { BOARD_LINES, BOARD_WIDTH } from './utils/constants';
import { calculateLineLength } from './utils/length-calculator';
import { AlignLeft, AlignCenter, AlignRight } from 'lucide-react';
export type LineAlignment = 'left' | 'center' | 'right';
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
  onLineWrapChange?: (lineIndex: number, wrapEnabled: boolean) => void;
  lineWrapEnabled?: boolean[]; // Array of 6 wrap states
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
  onLineWrapChange,
  lineWrapEnabled = [false, false, false, false, false, false],
  showToolbar = true,
}: TipTapTemplateEditorProps) {
  // Track if we're manually updating wrap to prevent onChange from overwriting state
  const isUpdatingWrap = useRef(false);
  
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
        paragraph: true, // Use standard paragraphs
        hardBreak: true, // Enable hard breaks (Shift+Enter for line breaks within paragraph)
      }),
      VariableNode,
      ColorTileNode,
      FillSpaceNode,
      SymbolNode,
      WrappedTextNode,
    ],
    content: parseTemplateSimple(value || ''),
    editorProps: {
      attributes: {
        class: cn(
          'w-full font-mono text-sm',
          'prose prose-sm max-w-none',
          '[&_.ProseMirror]:outline-none',
          '[&_.ProseMirror]:font-mono',
          '[&_.ProseMirror]:text-sm',
          '[&_.ProseMirror]:resize-none',
          '[&_.ProseMirror_p]:my-0 [&_.ProseMirror_p]:leading-tight',
          '[&_.ProseMirror_p]:min-h-[1.5rem]',
          className
        ),
        'data-placeholder': placeholder,
        'role': 'textbox',
        'aria-label': 'Template editor',
        'aria-multiline': 'true',
      },
      handleKeyDown: (view, event) => {
        const { state } = view;
        const { selection } = state;
        const { $from } = selection;
        
        // Handle Enter key - insert hardBreak instead of new paragraph, limit to 6 lines
        if (event.key === 'Enter' && !event.shiftKey) {
          event.preventDefault();
          
          // Count existing hard breaks
          let hardBreakCount = 0;
          state.doc.descendants((node) => {
            if (node.type.name === 'hardBreak') {
              hardBreakCount++;
            }
          });
          
          // If we already have 5 or more hard breaks (6+ lines), prevent adding more
          if (hardBreakCount >= 5) {
            return true; // Block
          }
          
          // Insert a hardBreak instead of creating a new paragraph
          const tr = state.tr.replaceSelectionWith(state.schema.nodes.hardBreak.create());
          view.dispatch(tr);
          return true;
        }
        
        // Handle regular character input
        if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
          // Find current line boundaries (between hardBreaks)
          const paragraph = $from.node($from.depth);
          if (paragraph.type.name !== 'paragraph') {
            return false;
          }
          
          // Find current line by collecting nodes between hardBreaks
          const lineNodes: any[] = [];
          let foundStart = false;
          
          // Traverse paragraph content to find current line
          paragraph.content.forEach((node, offset) => {
            const nodePos = $from.start() + offset;
            
            // If this is a hardBreak after cursor, we're done with this line
            if (node.type.name === 'hardBreak' && nodePos >= $from.pos && foundStart) {
              return false; // Stop iteration
            }
            
            // If we've passed a hardBreak before cursor, start collecting
            if (node.type.name === 'hardBreak' && nodePos < $from.pos) {
              lineNodes.length = 0; // Reset - new line starts after this break
              foundStart = true;
              return;
            }
            
            // If this is a hardBreak after cursor position, we're done
            if (node.type.name === 'hardBreak' && nodePos >= $from.pos) {
              return false;
            }
            
            // Collect non-hardBreak nodes for current line
            if (node.type.name !== 'hardBreak') {
              lineNodes.push(node.toJSON());
              foundStart = true;
            }
          });
          
          // Calculate current line length using proper calculator
          const currentLineLength = calculateLineLength(lineNodes);
          
          // If typing would exceed 22 characters and we're not replacing a selection, block it
          const isReplacing = !selection.empty;
          if (!isReplacing && currentLineLength >= BOARD_WIDTH) {
            event.preventDefault();
            return true; // Block
          }
          
          // Convert lowercase to uppercase
          if (/[a-z]/.test(event.key)) {
            event.preventDefault();
            const uppercaseChar = event.key.toUpperCase();
            const tr = state.tr.insertText(uppercaseChar, selection.from, selection.to);
            view.dispatch(tr);
            return true;
          }
        }
        
        return false;
      },
      transformPastedText: (text) => {
        // Convert pasted text to uppercase
        return text.toUpperCase();
      },
      handlePaste: (view, event, slice) => {
        const { state } = view;
        const { selection } = state;
        const { $from } = selection;
        
        // Find the current paragraph (line)
        const currentParagraph = $from.node($from.depth);
        if (currentParagraph.type.name === 'templateParagraph') {
          // Get current line content
          const lineContent = currentParagraph.content.toJSON() || [];
          const currentLength = calculateLineLength(lineContent);
          
          // Calculate how many characters would be added from paste
          const pastedText = slice.content.textContent || '';
          const selectedText = state.doc.textBetween(selection.from, selection.to);
          const charsToAdd = pastedText.length;
          const charsToRemove = selectedText.length;
          const newLength = currentLength - charsToRemove + charsToAdd;
          
          // If paste would exceed limit, truncate it
          if (newLength > BOARD_WIDTH) {
            const maxChars = BOARD_WIDTH - currentLength + charsToRemove;
            if (maxChars > 0) {
              // Truncate pasted text to fit
              const truncatedText = pastedText.slice(0, maxChars);
              const tr = state.tr.replaceSelection(
                state.schema.text(truncatedText.toUpperCase())
              );
              view.dispatch(tr);
              return true; // Handled
            } else {
              // No room for any pasted content
              return true; // Block paste
            }
          }
        }
        
        return false; // Let TipTap handle normally
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
      // Skip onChange if we're manually updating wrap (to prevent state overwrite)
      if (isUpdatingWrap.current) {
        return;
      }
      const doc = editor.getJSON();
      const templateString = serializeTemplateSimple(doc);
      onChange(templateString);
    },
    onFocus: () => {
      onFocus?.();
    },
  });

  // Update editor content when value changes externally
  useEffect(() => {
    if (editor) {
      const currentSerialized = serializeTemplateSimple(editor.getJSON());
      if (value !== currentSerialized) {
        editor.commands.setContent(parseTemplateSimple(value || ''));
      }
    }
  }, [value, editor]);

  // No need to enforce paragraph count - we use line breaks now

  // Alignment is now handled at serialization level, not in editor

  // Wrap is now handled at serialization level, not in editor

  // Get current line index from cursor position (counting hardBreaks)
  const getCurrentLineIndex = useCallback((): number | null => {
    if (!editor) return null;
    const { state } = editor;
    const { selection } = state;
    const { $from } = selection;
    
    // Count hard breaks before cursor to determine line index
    let lineIndex = 0;
    state.doc.nodesBetween(0, $from.pos, (node) => {
      if (node.type.name === 'hardBreak') {
        lineIndex++;
      }
    });
    
    return lineIndex;
  }, [editor]);

  // Handle alignment button clicks
  const handleAlignmentClick = useCallback((alignment: LineAlignment) => {
    if (!editor) return;
    
    const lineIndex = getCurrentLineIndex();
    if (lineIndex === null || lineIndex < 0 || lineIndex >= BOARD_LINES) {
      return; // Can't apply alignment if no line is selected
    }

    // Notify parent of alignment change (parent handles state)
    if (onLineAlignmentChange) {
      onLineAlignmentChange(lineIndex, alignment);
    }
  }, [editor, getCurrentLineIndex, onLineAlignmentChange]);

  // Handle wrap toggle
  const handleWrapClick = useCallback(() => {
    if (!editor) return;
    
    const lineIndex = getCurrentLineIndex();
    if (lineIndex === null || lineIndex < 0 || lineIndex >= BOARD_LINES) {
      return; // Can't apply wrap if no line is selected
    }

    // Get current wrap state and toggle it
    const currentWrap = lineWrapEnabled[lineIndex] || false;
    const newWrap = !currentWrap;
    
    // Notify parent of wrap change (parent handles state)
    if (onLineWrapChange) {
      onLineWrapChange(lineIndex, newWrap);
    }
  }, [editor, getCurrentLineIndex, onLineWrapChange, lineWrapEnabled]);

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
  const currentWrapEnabled = currentLineIndex !== null && currentLineIndex >= 0 && currentLineIndex < BOARD_LINES
    ? lineWrapEnabled[currentLineIndex] || false
    : false;

  return (
    <div className={cn('relative', className)}>
      {/* Toolbar */}
      {showToolbar && (
        <TemplateEditorToolbar
          editor={editor}
          currentAlignment={currentAlignment}
          currentWrapEnabled={currentWrapEnabled}
          onAlignmentChange={(alignment) => {
            handleAlignmentClick(alignment);
          }}
          onWrapToggle={() => {
            handleWrapClick();
          }}
        />
      )}
      
      {/* Editor container - styled like a single textarea */}
      <div className="flex-1">
        <div className={cn(
          "border bg-background relative rounded-md",
          showToolbar ? "rounded-t-none" : ""
        )} style={{ 
          padding: '0.75rem', 
          overflow: 'hidden',
          minHeight: `${BOARD_LINES * 1.5 + 1.5}rem`, // 6 lines * 1.5rem + padding
        }}>
          <div className="relative" style={{ height: `${BOARD_LINES * 1.5}rem` }}>
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
        /* Ensure ProseMirror container looks like a single textarea */
        .ProseMirror {
          margin: 0;
          padding: 0;
          width: 100%;
          max-width: 100%;
          overflow: hidden;
          outline: none;
        }
        
        /* Placeholder for first empty line only - textarea-like */
        .ProseMirror[data-placeholder] > p:first-child:empty::before {
          content: attr(data-placeholder);
          color: hsl(var(--muted-foreground));
          pointer-events: none;
          position: absolute;
        }
        
        .ProseMirror:focus[data-placeholder] > p:first-child:empty::before {
          opacity: 0.5;
        }

        /* Standard paragraph - no wrapping, fixed line height */
        .ProseMirror > p {
          margin: 0;
          padding: 0;
          text-transform: uppercase;
          font-family: 'Courier New', 'Courier', monospace;
          font-size: 0.875rem;
          letter-spacing: 0;
          line-height: 1.5rem;
          white-space: nowrap;
          overflow: visible; /* Let content flow naturally, limit via input handling */
          display: block;
        }
        
        /* Hard breaks create line breaks naturally */
        .ProseMirror br {
          display: block;
          content: '';
          margin: 0;
          padding: 0;
          line-height: 0;
        }
        
        /* Prevent any extra spacing around hard breaks */
        .ProseMirror br::before,
        .ProseMirror br::after {
          content: none;
        }
        
        /* Empty paragraph minimum height */
        .ProseMirror > p:empty {
          min-height: 1.5rem;
        }
        
        /* Cursor styling */
        .ProseMirror {
          caret-color: hsl(var(--primary));
        }
        
        .ProseMirror:focus {
          outline: none;
        }
        
        /* Inline nodes - keep them truly inline, no wrapping */
        .ProseMirror [data-type="variable"],
        .ProseMirror [data-type="color-tile"],
        .ProseMirror [data-type="symbol"],
        .ProseMirror [data-type="fill-space"],
        .ProseMirror [data-type="wrapped-text"] {
          display: inline-block !important;
          vertical-align: middle;
          white-space: nowrap;
        }
        
        /* Node view wrappers - prevent wrapping */
        .ProseMirror [data-node-view-wrapper] {
          display: inline-block !important;
          vertical-align: middle;
          white-space: nowrap;
        }
        
        /* Ensure text nodes also don't wrap */
        .ProseMirror p > span {
          white-space: nowrap;
        }
        
        /* All inline nodes must not exceed line height */
        .ProseMirror [data-type="variable"],
        .ProseMirror [data-type="color-tile"],
        .ProseMirror [data-type="symbol"],
        .ProseMirror [data-type="fill-space"],
        .ProseMirror [data-type="wrapped-text"] {
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
        
        /* Don't transform node views (they handle their own display) */
        .ProseMirror [data-type="variable"],
        .ProseMirror [data-type="color-tile"],
        .ProseMirror [data-type="symbol"],
        .ProseMirror [data-type="fill-space"],
        .ProseMirror [data-type="wrapped-text"] {
          text-transform: none;
        }
        
        /* Enable dragging for nodes with data-drag-handle */
        .ProseMirror [data-drag-handle] {
          cursor: grab;
        }
        
        .ProseMirror [data-drag-handle]:active {
          cursor: grabbing;
        }
        
        /* Ensure no weird spacing around inline nodes */
        .ProseMirror [data-type="variable"]::before,
        .ProseMirror [data-type="variable"]::after,
        .ProseMirror [data-type="color-tile"]::before,
        .ProseMirror [data-type="color-tile"]::after {
          content: none;
        }
      `}</style>
    </div>
  );
}
