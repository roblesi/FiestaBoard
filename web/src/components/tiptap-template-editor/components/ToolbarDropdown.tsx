/**
 * Simple dropdown component for toolbar
 */
"use client";

import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface ToolbarDropdownProps {
  label: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function ToolbarDropdown({ label, icon, children, className }: ToolbarDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  return (
    <TooltipProvider>
      <div ref={dropdownRef} className="relative">
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={() => setIsOpen(!isOpen)}
              className={cn(
                "flex items-center justify-center p-1.5 rounded-md",
                "hover:bg-accent hover:text-accent-foreground transition-colors",
                "border border-transparent",
                isOpen && "bg-accent text-accent-foreground border-border",
                className
              )}
              aria-expanded={isOpen}
              aria-haspopup="true"
              aria-label={label || "Menu"}
            >
              {icon && <span className="w-4 h-4">{icon}</span>}
              {label && <span className="sr-only">{label}</span>}
            </button>
          </TooltipTrigger>
          {label && (
            <TooltipContent>
              <p>{label}</p>
            </TooltipContent>
          )}
        </Tooltip>
        
        {isOpen && (
          <div className="absolute top-full left-0 mt-1 z-50 bg-popover border border-border rounded-md shadow-lg">
            {children}
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
