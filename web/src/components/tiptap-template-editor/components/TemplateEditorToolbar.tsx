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
import type { LineAlignment } from '../extensions/template-paragraph';

interface TemplateEditorToolbarProps {
  editor: Editor | null;
  currentAlignment?: LineAlignment;
  onAlignmentChange?: (alignment: LineAlignment) => void;
  onOpenFullPicker?: () => void;
  className?: string;
}

export function TemplateEditorToolbar({
  editor,
  currentAlignment = 'left',
  onAlignmentChange,
  onOpenFullPicker,
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

  return (
    <div
      className={cn(
        "flex items-center gap-2 p-2 border-b bg-muted/30",
        "flex-wrap",
        className
      )}
    >
      {/* Variables Dropdown */}
      <ToolbarDropdown
        label="Variables"
        icon={<Code2 className="w-4 h-4" />}
      >
        <VariablePickerContent
          onInsert={handleInsert}
          onOpenFullPicker={onOpenFullPicker}
        />
      </ToolbarDropdown>

      {/* Colors Dropdown */}
      {templateVars?.colors && Object.keys(templateVars.colors).length > 0 && (
        <ToolbarDropdown
          label="Colors"
          icon={<Palette className="w-4 h-4" />}
        >
          <ColorPickerContent onInsert={handleInsert} />
        </ToolbarDropdown>
      )}

      {/* Formatting Dropdown */}
      {templateVars?.formatting && Object.keys(templateVars.formatting).length > 0 && (
        <ToolbarDropdown
          label="Formatting"
          icon={<Type className="w-4 h-4" />}
        >
          <FormattingPickerContent
            formatting={templateVars.formatting}
            onInsert={handleInsert}
          />
        </ToolbarDropdown>
      )}

      {/* Filters Dropdown */}
      {templateVars?.filters && templateVars.filters.length > 0 && (
        <ToolbarDropdown
          label="Filters"
          icon={<Filter className="w-4 h-4" />}
        >
          <FilterPickerContent
            filters={templateVars.filters}
            onInsert={handleInsert}
          />
        </ToolbarDropdown>
      )}

      {/* Divider */}
      <div className="h-6 w-px bg-border mx-1" />

      {/* Alignment Controls */}
      <div className="flex items-center gap-0.5 rounded-md border overflow-hidden">
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
          aria-label="Align left"
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
          aria-label="Align center"
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
          aria-label="Align right"
        >
          <AlignRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
