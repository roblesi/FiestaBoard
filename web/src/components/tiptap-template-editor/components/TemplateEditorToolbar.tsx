/**
 * Template Editor Toolbar - Toolbar for TipTap template editor
 * Provides quick access to variables, colors, formatting, filters, and alignment
 */
"use client";

import { Editor } from '@tiptap/react';
import { useQuery } from '@tanstack/react-query';
import { AlignLeft, AlignCenter, AlignRight, Code2, Palette, Type, Filter } from 'lucide-react';
import { api } from '@/lib/api';
import { insertTemplateContent } from '../utils/insertion';
import { ToolbarDropdown } from './ToolbarDropdown';
import { VariablePickerContent } from './VariablePickerContent';
import { ColorPickerContent } from './ColorPickerContent';
import { FormattingPickerContent } from './FormattingPickerContent';
import { FilterPickerContent } from './FilterPickerContent';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { LineAlignment } from '../extensions/template-paragraph';

interface TemplateEditorToolbarProps {
  editor: Editor | null;
  currentAlignment?: LineAlignment;
  onAlignmentChange?: (alignment: LineAlignment) => void;
  className?: string;
}

export function TemplateEditorToolbar({
  editor,
  currentAlignment = 'left',
  onAlignmentChange,
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
  const hasFilters = templateVars?.filters && templateVars.filters.length > 0;

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

        {/* Filters Dropdown */}
        {hasFilters && (
          <ToolbarDropdown
            label="Filters"
            icon={<Filter className="w-4 h-4" />}
          >
            {(close) => (
              <FilterPickerContent
                filters={templateVars.filters}
                onInsert={(filter) => {
                  handleInsert(filter);
                  close();
                }}
              />
            )}
          </ToolbarDropdown>
        )}

        {/* Divider */}
        {(hasVariables || hasColors || hasFormatting || hasFilters) && (
          <div className="h-6 w-px bg-border mx-1" />
        )}

        {/* Alignment Controls */}
        <div className="flex items-center gap-0.5 rounded-md border border-border/50 overflow-hidden bg-background">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => handleAlignmentClick('left')}
                className={cn(
                  'px-2 py-1.5 transition-colors',
                  currentAlignment === 'left'
                    ? 'bg-muted/70 text-foreground'
                    : 'hover:bg-muted/50 text-muted-foreground'
                )}
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
                className={cn(
                  'px-2 py-1.5 border-x border-border/50 transition-colors',
                  currentAlignment === 'center'
                    ? 'bg-muted/70 text-foreground'
                    : 'hover:bg-muted/50 text-muted-foreground'
                )}
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
                className={cn(
                  'px-2 py-1.5 transition-colors',
                  currentAlignment === 'right'
                    ? 'bg-muted/70 text-foreground'
                    : 'hover:bg-muted/50 text-muted-foreground'
                )}
                aria-label="Align right"
              >
                <AlignRight className="w-4 h-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent>Align right</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </TooltipProvider>
  );
}
