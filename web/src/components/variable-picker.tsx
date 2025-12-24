"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { Copy, Info } from "lucide-react";
import { toast } from "sonner";

interface VariablePickerProps {
  onInsert?: (variable: string) => void;
  showColors?: boolean;
  showSymbols?: boolean;
}

export function VariablePicker({
  onInsert,
  showColors = true,
  showSymbols = true,
}: VariablePickerProps) {
  const { data: templateVars, isLoading } = useQuery({
    queryKey: ["template-variables"],
    queryFn: api.getTemplateVariables,
  });

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  const handleInsert = (variable: string) => {
    if (onInsert) {
      onInsert(variable);
    } else {
      handleCopy(variable);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Variables & Helpers</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-40 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!templateVars) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Template Variables</CardTitle>
        <CardDescription className="text-xs">
          Click to {onInsert ? "insert" : "copy"} into your template
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[500px] pr-4">
          <div className="space-y-6">
            {/* Variables */}
            <div>
              <h4 className="text-sm font-semibold mb-3">Data Variables</h4>
              <div className="space-y-3">
                {Object.entries(templateVars.variables).map(([category, vars]) => (
                  <div key={category}>
                    <p className="text-xs font-medium text-muted-foreground mb-2 capitalize">
                      {category.replace(/_/g, " ")}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {vars.map((variable) => (
                        <Button
                          key={variable}
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs font-mono"
                          onClick={() => handleInsert(`{{${variable}}}`)}
                        >
                          {variable}
                        </Button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Filters */}
            {templateVars.filters.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-3">Filters</h4>
                <div className="flex flex-wrap gap-1.5">
                  {templateVars.filters.map((filter) => (
                    <Badge
                      key={filter}
                      variant="secondary"
                      className="cursor-pointer text-xs"
                      onClick={() => handleCopy(`|${filter}`)}
                    >
                      |{filter}
                    </Badge>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Example: {"{{weather.temp|upper}}"}
                </p>
              </div>
            )}

            {/* Colors */}
            {showColors && Object.keys(templateVars.colors).length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-3">Colors</h4>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(templateVars.colors).map(([colorName, code]) => (
                    <Button
                      key={colorName}
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs justify-start"
                      onClick={() => handleInsert(`{${colorName}}`)}
                    >
                      <span
                        className="w-3 h-3 rounded-sm mr-2"
                        style={{
                          backgroundColor: getColorPreview(colorName),
                        }}
                      />
                      {colorName}
                    </Button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Use: {"{red}TEXT"} or {"{blue}MORE"}
                </p>
              </div>
            )}

            {/* Symbols */}
            {showSymbols && templateVars.symbols.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-3">Symbols</h4>
                <div className="flex flex-wrap gap-2">
                  {templateVars.symbols.map((symbol) => (
                    <Button
                      key={symbol}
                      variant="outline"
                      size="sm"
                      className="h-8 w-8 p-0 text-base"
                      onClick={() => handleInsert(symbol)}
                      title={symbol}
                    >
                      {symbol}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Syntax Examples */}
            {templateVars.syntax_examples && (
              <div>
                <h4 className="text-sm font-semibold mb-3 flex items-center gap-1">
                  <Info className="h-4 w-4" />
                  Syntax Examples
                </h4>
                <div className="space-y-2 text-xs">
                  {Object.entries(templateVars.syntax_examples).map(([label, example]) => (
                    <div key={label} className="bg-muted p-2 rounded-md">
                      <p className="font-medium text-muted-foreground mb-1">
                        {label.replace(/_/g, " ")}:
                      </p>
                      <code className="text-foreground font-mono">{example}</code>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 ml-2"
                        onClick={() => handleCopy(example)}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

// Helper to get color preview (basic approximation)
function getColorPreview(colorName: string): string {
  const colorMap: Record<string, string> = {
    red: "#e74c3c",
    orange: "#e67e22",
    yellow: "#f1c40f",
    green: "#2ecc71",
    blue: "#3498db",
    violet: "#9b59b6",
    white: "#ecf0f1",
    black: "#2c3e50",
  };
  return colorMap[colorName.toLowerCase()] || "#95a5a6";
}

