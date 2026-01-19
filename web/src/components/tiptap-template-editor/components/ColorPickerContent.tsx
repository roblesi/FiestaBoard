/**
 * Color Picker Content - Compact color grid for toolbar
 */
"use client";

import { FIESTABOARD_COLORS } from "@/lib/board-colors";
import { cn } from "@/lib/utils";

interface ColorPickerContentProps {
  onInsert: (colorValue: string) => void;
}

const COLOR_MAP: Record<string, { bg: string; needsDarkText: boolean }> = {
  red: { bg: FIESTABOARD_COLORS.red, needsDarkText: false },
  orange: { bg: FIESTABOARD_COLORS.orange, needsDarkText: false },
  yellow: { bg: FIESTABOARD_COLORS.yellow, needsDarkText: true },
  green: { bg: FIESTABOARD_COLORS.green, needsDarkText: true },
  blue: { bg: FIESTABOARD_COLORS.blue, needsDarkText: false },
  violet: { bg: FIESTABOARD_COLORS.violet, needsDarkText: false },
  white: { bg: FIESTABOARD_COLORS.white, needsDarkText: true },
  black: { bg: FIESTABOARD_COLORS.black, needsDarkText: false },
};

const COLOR_ORDER = ['red', 'orange', 'yellow', 'green', 'blue', 'violet', 'white', 'black'] as const;

export function ColorPickerContent({ onInsert }: ColorPickerContentProps) {
  return (
    <div className="p-2">
      <div className="grid grid-cols-4 gap-2 w-64">
        {COLOR_ORDER.map((colorName) => {
          const colorInfo = COLOR_MAP[colorName];
          if (!colorInfo) return null;

          return (
            <button
              key={colorName}
              type="button"
              onClick={() => onInsert(`{${colorName}}`)}
              style={{ backgroundColor: colorInfo.bg }}
              className={cn(
                "h-10 rounded-md text-xs font-medium transition-all hover:scale-105 hover:shadow-md",
                "flex items-center justify-center",
                colorInfo.needsDarkText ? "text-black/80" : "text-white/90"
              )}
              aria-label={`${colorName} color`}
              title={colorName}
            >
              {colorName}
            </button>
          );
        })}
      </div>
    </div>
  );
}
