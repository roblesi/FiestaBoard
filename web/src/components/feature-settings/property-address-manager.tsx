"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Plus, Trash2, Check, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";

interface PropertyAddress {
  address: string;
  display_name: string;
}

interface PropertyAddressManagerProps {
  value: PropertyAddress[];
  onChange: (addresses: PropertyAddress[]) => void;
}

export function PropertyAddressManager({ value, onChange }: PropertyAddressManagerProps) {
  const [addresses, setAddresses] = useState<PropertyAddress[]>(value || []);
  const [newAddress, setNewAddress] = useState("");
  const [newDisplayName, setNewDisplayName] = useState("");
  const [isValidating, setIsValidating] = useState(false);

  const handleAddProperty = async () => {
    if (!newAddress.trim()) {
      toast.error("Please enter a property address");
      return;
    }

    if (!newDisplayName.trim()) {
      toast.error("Please enter a display name");
      return;
    }

    if (addresses.length >= 3) {
      toast.error("Maximum 3 properties allowed");
      return;
    }

    // Check for duplicate display names
    if (addresses.some(addr => addr.display_name.toLowerCase() === newDisplayName.trim().toLowerCase())) {
      toast.error("Display name already exists");
      return;
    }

    // Check for duplicate addresses
    if (addresses.some(addr => addr.address.toLowerCase() === newAddress.trim().toLowerCase())) {
      toast.error("This property address is already being tracked");
      return;
    }

    // Validate address with backend
    setIsValidating(true);
    try {
      const validation = await api.validatePropertyAddress(newAddress.trim());
      
      if (!validation.valid) {
        toast.error(validation.error || "Could not validate property address. Please check the address format.");
        setIsValidating(false);
        return;
      }

      // Add the new property
      const updatedAddresses = [
        ...addresses,
        {
          address: newAddress.trim(),
          display_name: newDisplayName.trim().toUpperCase(),
        },
      ];

      setAddresses(updatedAddresses);
      onChange(updatedAddresses);
      
      // Clear inputs
      setNewAddress("");
      setNewDisplayName("");
      
      const valueInfo = validation.formatted_value ? ` (${validation.formatted_value})` : "";
      toast.success(`Added property: ${newDisplayName.trim().toUpperCase()}${valueInfo}`);
    } catch (error) {
      console.error("Property validation error:", error);
      toast.error("Failed to validate property address. Please try again.");
    } finally {
      setIsValidating(false);
    }
  };

  const handleRemoveProperty = (index: number) => {
    const updatedAddresses = addresses.filter((_, i) => i !== index);
    setAddresses(updatedAddresses);
    onChange(updatedAddresses);
    toast.success("Property removed");
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleAddProperty();
    }
  };

  return (
    <div className="space-y-4">
      {/* Existing Properties List */}
      {addresses.length > 0 && (
        <div className="space-y-2">
          {addresses.map((property, index) => (
            <Card key={index} className="p-3 flex items-start justify-between gap-3 bg-muted/50">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-sm font-semibold text-primary">
                    {property.display_name}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground truncate" title={property.address}>
                  {property.address}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => handleRemoveProperty(index)}
                className="shrink-0 h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </Card>
          ))}
        </div>
      )}

      {/* Add New Property Form */}
      {addresses.length < 3 && (
        <Card className="p-4 space-y-3 bg-muted/30 border-dashed">
          <div className="space-y-2">
            <Label htmlFor="property-address" className="text-sm font-medium">
              Property Address
            </Label>
            <Input
              id="property-address"
              type="text"
              placeholder="123 Main St, San Francisco, CA 94102"
              value={newAddress}
              onChange={(e) => setNewAddress(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={isValidating}
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Full street address including city, state, and zip code
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="display-name" className="text-sm font-medium">
              Display Name
            </Label>
            <Input
              id="display-name"
              type="text"
              placeholder="HOME"
              value={newDisplayName}
              onChange={(e) => setNewDisplayName(e.target.value.toUpperCase())}
              onKeyPress={handleKeyPress}
              disabled={isValidating}
              maxLength={10}
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Short name for display on Vestaboard (max 10 chars, e.g., "HOME", "RENTAL", "CABIN")
            </p>
          </div>

          <Button
            type="button"
            onClick={handleAddProperty}
            disabled={isValidating || !newAddress.trim() || !newDisplayName.trim()}
            className="w-full"
            variant="secondary"
          >
            {isValidating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Validating address...
              </>
            ) : (
              <>
                <Plus className="mr-2 h-4 w-4" />
                Add Property ({addresses.length}/3)
              </>
            )}
          </Button>
        </Card>
      )}

      {addresses.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">
          No properties added yet. Add up to 3 properties to track their estimated values.
        </p>
      )}

      {addresses.length >= 3 && (
        <p className="text-sm text-muted-foreground text-center py-2">
          Maximum of 3 properties reached
        </p>
      )}
    </div>
  );
}

