/**
 * Template Editor Toolbar - Toolbar for TipTap template editor
 * Provides quick access to variables, colors, formatting, and alignment
 */
"use client";

import { Editor } from '@tiptap/react';
import { useQuery } from '@tanstack/react-query';
import { AlignLeft, AlignCenter, AlignRight, Code2, Palette, Type, WrapText, Undo2, Redo2 } from 'lucide-react';
import { api } from '@/lib/api';
import { insertTemplateContent } from '../utils/insertion';
import { ToolbarDropdown } from './ToolbarDropdown';
import { VariablePickerContent } from './VariablePickerContent';
import { ColorPickerContent } from './ColorPickerContent';
import { FormattingPickerContent } from './FormattingPickerContent';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { LineAlignment } from '../extensions/template-paragraph';
import { useState, useEffect } from 'react';

interface TemplateEditorToolbarProps {
  editor: Editor | null;
  currentAlignment?: LineAlignment;
  currentWrapEnabled?: boolean;
  onAlignmentChange?: (alignment: LineAlignment) => void;
  onWrapToggle?: () => void;
  className?: string;
}

export function TemplateEditorToolbar({
  editor,
  currentAlignment = 'left',
  currentWrapEnabled = false,
  onAlignmentChange,
  onWrapToggle,
  className,
}: TemplateEditorToolbarProps) {
  const { data: templateVars } = useQuery({
    queryKey: ["template-variables"],
    queryFn: api.getTemplateVariables,
  });

  const handleInsert = (templateString: string) => {
    if (editor) {
      insertTemplateContent(editor, templateString);
    }
  };

  const handleAlignmentClick = (alignment: LineAlignment) => {
    if (onAlignmentChange) {
      onAlignmentChange(alignment);
    }
  };

  // Check if variables are available
  const hasVariables = templateVars?.variables && Object.keys(templateVars.variables).length > 0;
  const hasColors = templateVars?.colors && Object.keys(templateVars.colors).length > 0;
  const hasFormatting = templateVars?.formatting && Object.keys(templateVars.formatting).length > 0;

  // Track undo/redo availability - update on editor state changes
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  useEffect(() => {
    if (!editor) {
      setCanUndo(false);
      setCanRedo(false);
      return;
    }

    const updateHistoryState = () => {
      setCanUndo(editor.can().undo());
      setCanRedo(editor.can().redo());
    };

    // Initial state
    updateHistoryState();

    // Update on editor state changes
    editor.on('update', updateHistoryState);
    editor.on('selectionUpdate', updateHistoryState);

    return () => {
      editor.off('update', updateHistoryState);
      editor.off('selectionUpdate', updateHistoryState);
    };
  }, [editor]);

  const handleUndo = () => {
    if (editor && canUndo) {
      editor.chain().focus().undo().run();
    }
  };

  const handleRedo = () => {
    if (editor && canRedo) {
      editor.chain().focus().redo().run();
    }
  };

  return (
    <TooltipProvider>
      <div
        className={cn(
          "flex items-center gap-1 p-2 border rounded-t-md bg-background",
          "flex-wrap",
          className
        )}
      >
        {/* Variables Dropdown */}
        {hasVariables ? (
          <ToolbarDropdown
            label="Variables"
            icon={<Code2 className="w-4 h-4" />}
          >
            {(close) => (
              <VariablePickerContent
                onInsert={(variable) => {
                  handleInsert(variable);
                  close();
                }}
              />
            )}
          </ToolbarDropdown>
        ) : (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                disabled
                className={cn(
                  "flex items-center justify-center p-1.5 rounded-md",
                  "text-muted-foreground cursor-not-allowed opacity-40",
                  "border border-transparent"
                )}
                aria-label="Variables (no variables available)"
              >
                <Code2 className="w-4 h-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent>
              <p>No template variables available. Configure plugins in Settings.</p>
            </TooltipContent>
          </Tooltip>
        )}

        {/* Colors Dropdown */}
        {hasColors && (
          <ToolbarDropdown
            label="Colors"
            icon={<Palette className="w-4 h-4" />}
          >
            {(close) => (
              <ColorPickerContent 
                onInsert={(color) => {
                  handleInsert(color);
                  close();
                }} 
              />
            )}
          </ToolbarDropdown>
        )}

        {/* Formatting Dropdown */}
        {hasFormatting && (
          <ToolbarDropdown
            label="Formatting"
            icon={<Type className="w-4 h-4" />}
          >
            {(close) => (
              <FormattingPickerContent
                formatting={templateVars.formatting}
                onInsert={(formatting) => {
                  handleInsert(formatting);
                  close();
                }}
              />
            )}
          </ToolbarDropdown>
        )}

        {/* Wrap Toggle Button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={onWrapToggle}
              className={cn(
                "flex items-center justify-center p-1.5 rounded-md",
                "hover:bg-muted/50 transition-colors",
                "border border-transparent",
                currentWrapEnabled && "bg-muted/70 border-border/50"
              )}
              aria-label="Toggle wrap for current line"
            >
              <WrapText className={cn("w-4 h-4", currentWrapEnabled && "text-primary")} />
            </button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{currentWrapEnabled ? "Disable wrap for this line" : "Enable wrap for this line"}</p>
          </TooltipContent>
        </Tooltip>

        {/* Divider */}
        {(hasVariables || hasColors || hasFormatting) && (
          <div className="h-6 w-px bg-border mx-1" />
        )}

        {/* Alignment Controls */}
        <div className="flex items-center gap-0.5 rounded-md border border-border/50 overflow-hidden bg-background">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => handleAlignmentClick('left')}
                className="px-2 py-1.5 transition-colors hover:bg-muted/50"
                aria-label="Align left"
              >
                <AlignLeft className="w-4 h-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent>Align left</TooltipContent>
          </Tooltip>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => handleAlignmentClick('center')}
                className="px-2 py-1.5 border-x border-border/50 transition-colors hover:bg-muted/50"
                aria-label="Align center"
              >
                <AlignCenter className="w-4 h-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent>Align center</TooltipContent>
          </Tooltip>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => handleAlignmentClick('right')}
                className="px-2 py-1.5 transition-colors hover:bg-muted/50"
                aria-label="Align right"
              >
                <AlignRight className="w-4 h-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent>Align right</TooltipContent>
          </Tooltip>
        </div>

        {/* Divider before undo/redo */}
        <div className="h-6 w-px bg-border mx-1" />

        {/* Undo/Redo Controls */}
        <div className="flex items-center gap-0.5 rounded-md border border-border/50 overflow-hidden bg-background">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={handleUndo}
                disabled={!canUndo}
                className={cn(
                  "px-2 py-1.5 transition-colors",
                  canUndo
                    ? "hover:bg-muted/50"
                    : "opacity-40 cursor-not-allowed",
                  "border-r border-border/50"
                )}
                aria-label="Undo"
              >
                <Undo2 className="w-4 h-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Undo (Ctrl+Z)</p>
            </TooltipContent>
          </Tooltip>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={handleRedo}
                disabled={!canRedo}
                className={cn(
                  "px-2 py-1.5 transition-colors",
                  canRedo
                    ? "hover:bg-muted/50"
                    : "opacity-40 cursor-not-allowed"
                )}
                aria-label="Redo"
              >
                <Redo2 className="w-4 h-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Redo (Ctrl+Shift+Z)</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    </TooltipProvider>
  );
}
