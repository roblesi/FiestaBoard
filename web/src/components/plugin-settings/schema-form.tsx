"use client";

import { useState, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Plus, Trash2, Eye, EyeOff } from "lucide-react";

// JSON Schema types (simplified for our use case)
interface SchemaProperty {
  type: "string" | "number" | "integer" | "boolean" | "array" | "object";
  title?: string;
  description?: string;
  default?: unknown;
  enum?: string[];
  minimum?: number;
  maximum?: number;
  minItems?: number;
  maxItems?: number;
  items?: SchemaProperty;
  properties?: Record<string, SchemaProperty>;
  required?: string[];
  "ui:widget"?: string;
  "ui:placeholder"?: string;
}

interface JSONSchema {
  type: "object";
  properties: Record<string, SchemaProperty>;
  required?: string[];
}

interface SchemaFormProps {
  schema: JSONSchema;
  values: Record<string, unknown>;
  onChange: (values: Record<string, unknown>) => void;
  disabled?: boolean;
  className?: string;
}

// Individual field components
interface FieldProps {
  name: string;
  property: SchemaProperty;
  value: unknown;
  onChange: (value: unknown) => void;
  required?: boolean;
  disabled?: boolean;
}

function StringField({ name, property, value, onChange, required, disabled }: FieldProps) {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = property["ui:widget"] === "password";
  const isTextarea = property["ui:widget"] === "textarea";
  
  if (property.enum && property.enum.length > 0) {
    return (
      <Select
        value={String(value || "")}
        onValueChange={onChange}
        disabled={disabled}
      >
        <SelectTrigger id={name}>
          <SelectValue placeholder={property["ui:placeholder"] || `Select ${property.title || name}`} />
        </SelectTrigger>
        <SelectContent>
          {property.enum.map((option) => (
            <SelectItem key={option} value={option}>
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  if (isTextarea) {
    return (
      <textarea
        id={name}
        value={String(value || "")}
        onChange={(e) => onChange(e.target.value)}
        placeholder={property["ui:placeholder"] || property.description}
        disabled={disabled}
        required={required}
        className={cn(
          "flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2",
          "text-sm ring-offset-background placeholder:text-muted-foreground",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          "disabled:cursor-not-allowed disabled:opacity-50"
        )}
      />
    );
  }

  return (
    <div className="relative">
      <Input
        id={name}
        type={isPassword && !showPassword ? "password" : "text"}
        value={String(value || "")}
        onChange={(e) => onChange(e.target.value)}
        placeholder={property["ui:placeholder"] || property.description}
        disabled={disabled}
        required={required}
        className={isPassword ? "pr-10" : undefined}
      />
      {isPassword && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
          onClick={() => setShowPassword(!showPassword)}
          tabIndex={-1}
        >
          {showPassword ? (
            <EyeOff className="h-4 w-4 text-muted-foreground" />
          ) : (
            <Eye className="h-4 w-4 text-muted-foreground" />
          )}
        </Button>
      )}
    </div>
  );
}

function NumberField({ name, property, value, onChange, required, disabled }: FieldProps) {
  return (
    <Input
      id={name}
      type="number"
      value={value !== undefined && value !== null ? String(value) : ""}
      onChange={(e) => {
        const val = e.target.value;
        if (val === "") {
          onChange(undefined);
        } else {
          onChange(property.type === "integer" ? parseInt(val, 10) : parseFloat(val));
        }
      }}
      placeholder={property["ui:placeholder"] || property.description}
      min={property.minimum}
      max={property.maximum}
      disabled={disabled}
      required={required}
    />
  );
}

function BooleanField({ name, value, onChange, disabled }: FieldProps) {
  return (
    <Switch
      id={name}
      checked={Boolean(value)}
      onCheckedChange={onChange}
      disabled={disabled}
    />
  );
}

interface ArrayFieldProps extends FieldProps {
  itemSchema: SchemaProperty;
}

function ArrayField({ name, property, value, onChange, disabled, itemSchema }: ArrayFieldProps) {
  const items = Array.isArray(value) ? value : [];
  
  const handleAdd = () => {
    let defaultValue: unknown;
    if (itemSchema.type === "object") {
      defaultValue = {};
    } else if (itemSchema.type === "string") {
      defaultValue = "";
    } else if (itemSchema.type === "number" || itemSchema.type === "integer") {
      defaultValue = 0;
    } else if (itemSchema.type === "boolean") {
      defaultValue = false;
    } else {
      defaultValue = null;
    }
    onChange([...items, defaultValue]);
  };

  const handleRemove = (index: number) => {
    const newItems = items.filter((_, i) => i !== index);
    onChange(newItems);
  };

  const handleItemChange = (index: number, newValue: unknown) => {
    const newItems = [...items];
    newItems[index] = newValue;
    onChange(newItems);
  };

  const canAdd = !property.maxItems || items.length < property.maxItems;
  const canRemove = !property.minItems || items.length > property.minItems;

  return (
    <div className="space-y-3">
      {items.map((item, index) => (
        <div key={index} className="flex gap-2">
          <div className="flex-1">
            {itemSchema.type === "object" && itemSchema.properties ? (
              <div className="grid gap-3 p-3 border rounded-lg bg-muted/30">
                {Object.entries(itemSchema.properties).map(([key, propSchema]) => (
                  <div key={key} className="grid gap-1.5">
                    <Label htmlFor={`${name}-${index}-${key}`} className="text-xs">
                      {propSchema.title || key}
                    </Label>
                    <FormField
                      name={`${name}-${index}-${key}`}
                      property={propSchema}
                      value={(item as Record<string, unknown>)?.[key]}
                      onChange={(val) => {
                        const newItem = { ...(item as Record<string, unknown>), [key]: val };
                        handleItemChange(index, newItem);
                      }}
                      disabled={disabled}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <FormField
                name={`${name}-${index}`}
                property={itemSchema}
                value={item}
                onChange={(val) => handleItemChange(index, val)}
                disabled={disabled}
              />
            )}
          </div>
          {canRemove && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => handleRemove(index)}
              disabled={disabled}
              className="h-9 w-9 text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      ))}
      
      {canAdd && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleAdd}
          disabled={disabled}
          className="w-full"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add {property.title || name}
        </Button>
      )}
    </div>
  );
}

function FormField({ name, property, value, onChange, required, disabled }: FieldProps) {
  switch (property.type) {
    case "string":
      return (
        <StringField
          name={name}
          property={property}
          value={value}
          onChange={onChange}
          required={required}
          disabled={disabled}
        />
      );
    case "number":
    case "integer":
      return (
        <NumberField
          name={name}
          property={property}
          value={value}
          onChange={onChange}
          required={required}
          disabled={disabled}
        />
      );
    case "boolean":
      return (
        <BooleanField
          name={name}
          property={property}
          value={value}
          onChange={onChange}
          required={required}
          disabled={disabled}
        />
      );
    case "array":
      if (property.items) {
        return (
          <ArrayField
            name={name}
            property={property}
            value={value}
            onChange={onChange}
            required={required}
            disabled={disabled}
            itemSchema={property.items}
          />
        );
      }
      return <div className="text-sm text-muted-foreground">Array type without items schema</div>;
    case "object":
      if (property.properties) {
        return (
          <div className="grid gap-4 p-4 border rounded-lg">
            {Object.entries(property.properties).map(([key, propSchema]) => (
              <div key={key} className="grid gap-1.5">
                <Label htmlFor={`${name}-${key}`}>
                  {propSchema.title || key}
                  {property.required?.includes(key) && (
                    <span className="text-destructive ml-1">*</span>
                  )}
                </Label>
                <FormField
                  name={`${name}-${key}`}
                  property={propSchema}
                  value={(value as Record<string, unknown>)?.[key]}
                  onChange={(val) => {
                    const newValue = { ...(value as Record<string, unknown>), [key]: val };
                    onChange(newValue);
                  }}
                  required={property.required?.includes(key)}
                  disabled={disabled}
                />
                {propSchema.description && (
                  <p className="text-xs text-muted-foreground">{propSchema.description}</p>
                )}
              </div>
            ))}
          </div>
        );
      }
      return <div className="text-sm text-muted-foreground">Object type without properties schema</div>;
    default:
      return <div className="text-sm text-muted-foreground">Unknown type: {property.type}</div>;
  }
}

/**
 * SchemaForm - Renders a form from a JSON Schema
 * 
 * This component takes a JSON Schema and renders appropriate form fields
 * for each property. It supports:
 * - String fields (text, password, select, textarea)
 * - Number/Integer fields
 * - Boolean fields (switches)
 * - Array fields (add/remove items)
 * - Nested object fields
 */
export function SchemaForm({ schema, values, onChange, disabled, className }: SchemaFormProps) {
  const handleFieldChange = useCallback(
    (fieldName: string, fieldValue: unknown) => {
      onChange({ ...values, [fieldName]: fieldValue });
    },
    [values, onChange]
  );

  if (!schema.properties) {
    return (
      <div className="text-sm text-muted-foreground">
        No schema properties defined
      </div>
    );
  }

  return (
    <div className={cn("grid gap-4", className)}>
      {Object.entries(schema.properties).map(([name, property]) => {
        // Skip the 'enabled' field as it's handled separately
        if (name === "enabled") return null;
        
        const isRequired = schema.required?.includes(name);
        
        return (
          <div key={name} className="grid gap-1.5">
            <Label htmlFor={name} className="flex items-center gap-1">
              {property.title || name}
              {isRequired && <span className="text-destructive">*</span>}
            </Label>
            <FormField
              name={name}
              property={property}
              value={values[name]}
              onChange={(val) => handleFieldChange(name, val)}
              required={isRequired}
              disabled={disabled}
            />
            {property.description && (
              <p className="text-xs text-muted-foreground">{property.description}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}

export type { JSONSchema, SchemaProperty };

