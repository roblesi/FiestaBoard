"use client";

import { useState } from "react";
import { Navigation, Loader2, CheckCircle2, AlertCircle, Car, X, Plus, Bike, TrainFront, Footprints } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";

interface TrafficRoute {
  origin: string;
  destination: string;
  destination_name: string;
  travel_mode?: string;
}

interface RouteValidation {
  valid: boolean;
  distance_km?: number;
  static_duration_minutes?: number;
  error?: string;
}

interface TrafficRoutePlannerProps {
  selectedRoutes: TrafficRoute[];
  onRoutesSelected: (routes: TrafficRoute[]) => void;
  maxRoutes?: number;
}

const TRAVEL_MODES = [
  { value: "DRIVE", label: "Drive", icon: Car },
  { value: "BICYCLE", label: "Bicycle", icon: Bike },
  { value: "TRANSIT", label: "Transit", icon: TrainFront },
  { value: "WALK", label: "Walk", icon: Footprints },
];

export function TrafficRoutePlanner({
  selectedRoutes,
  onRoutesSelected,
  maxRoutes = 20,
}: TrafficRoutePlannerProps) {
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [destinationName, setDestinationName] = useState("");
  const [travelMode, setTravelMode] = useState("DRIVE");
  const [validating, setValidating] = useState(false);
  const [validation, setValidation] = useState<RouteValidation | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = `${position.coords.latitude},${position.coords.longitude}`;
        setOrigin(coords);
        setError(null);
      },
      (err) => {
        setError(`Geolocation error: ${err.message}`);
      }
    );
  };

  const handleValidate = async () => {
    if (!origin.trim() || !destination.trim()) {
      setError("Please enter both origin and destination");
      return;
    }

    setValidating(true);
    setError(null);
    setValidation(null);

    try {
      const data = await api.validateTrafficRoute(
        origin.trim(),
        destination.trim(),
        destinationName.trim() || "DESTINATION",
        travelMode
      );

      setValidation(data);

      if (!data.valid) {
        setError(data.error || "Route validation failed");
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Failed to validate route";
      setError(errorMsg);
      setValidation({ valid: false, error: errorMsg });
    } finally {
      setValidating(false);
    }
  };

  const handleAddRoute = () => {
    if (!validation || !validation.valid) {
      setError("Please validate the route first");
      return;
    }

    if (selectedRoutes.length >= maxRoutes) {
      setError(`Maximum ${maxRoutes} routes allowed`);
      return;
    }

    const newRoute: TrafficRoute = {
      origin: origin.trim(),
      destination: destination.trim(),
      destination_name: destinationName.trim() || "DESTINATION",
      travel_mode: travelMode,
    };

    onRoutesSelected([...selectedRoutes, newRoute]);

    // Clear form
    setOrigin("");
    setDestination("");
    setDestinationName("");
    setTravelMode("DRIVE");
    setValidation(null);
    setError(null);
  };

  const handleRemoveRoute = (index: number) => {
    const newRoutes = selectedRoutes.filter((_, i) => i !== index);
    onRoutesSelected(newRoutes);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Add Route</CardTitle>
          <CardDescription>
            Configure traffic routes to monitor. Add up to {maxRoutes} routes.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Origin */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="origin">Origin</Label>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleUseCurrentLocation}
                className="h-7 text-xs"
              >
                <Navigation className="h-3 w-3 mr-1" />
                Use My Location
              </Button>
            </div>
            <Input
              id="origin"
              placeholder="e.g., 123 Main St, SF, CA or 37.7749,-122.4194"
              value={origin}
              onChange={(e) => {
                setOrigin(e.target.value);
                setValidation(null);
              }}
            />
            <p className="text-xs text-muted-foreground">
              Address or coordinates (lat,lng)
            </p>
          </div>

          {/* Destination */}
          <div className="space-y-2">
            <Label htmlFor="destination">Destination</Label>
            <Input
              id="destination"
              placeholder="e.g., 456 Market St, SF, CA or 37.7899,-122.4001"
              value={destination}
              onChange={(e) => {
                setDestination(e.target.value);
                setValidation(null);
              }}
            />
            <p className="text-xs text-muted-foreground">
              Address or coordinates (lat,lng)
            </p>
          </div>

          {/* Destination Name */}
          <div className="space-y-2">
            <Label htmlFor="destinationName">Display Name</Label>
            <Input
              id="destinationName"
              placeholder="e.g., WORK, AIRPORT, DOWNTOWN"
              value={destinationName}
              onChange={(e) => setDestinationName(e.target.value.toUpperCase())}
              maxLength={10}
            />
            <p className="text-xs text-muted-foreground">
              Short name for display (max 10 chars)
            </p>
          </div>

          {/* Travel Mode */}
          <div className="space-y-2">
            <Label htmlFor="travelMode">Travel Mode</Label>
            <Select value={travelMode} onValueChange={(value: string) => {
              setTravelMode(value);
              setValidation(null);
            }}>
              <SelectTrigger id="travelMode">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TRAVEL_MODES.map((mode) => {
                  const Icon = mode.icon;
                  return (
                    <SelectItem key={mode.value} value={mode.value}>
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4" />
                        <span>{mode.label}</span>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Compare different transportation modes (e.g., train vs bike)
            </p>
          </div>

          {/* Validate Button */}
          <Button
            onClick={handleValidate}
            disabled={validating || !origin.trim() || !destination.trim()}
            className="w-full"
            variant="outline"
          >
            {validating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Validating...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Validate Route
              </>
            )}
          </Button>

          {/* Validation Result */}
          {validation && validation.valid && (
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-1">
                  <p className="font-medium">Route is valid!</p>
                  {validation.static_duration_minutes && (
                    <p className="text-xs">
                      Estimated drive time: ~{validation.static_duration_minutes} minutes
                    </p>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Error Message */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2">
                  <p className="font-medium">{error}</p>
                  <p className="text-xs">
                    💡 Tips: Use full addresses with city/state, or try coordinates (lat,lng). 
                    If you see 403 errors, check that Google Routes API is enabled and billing is set up.
                  </p>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Add Route Button */}
          {validation && validation.valid && (
            <Button
              onClick={handleAddRoute}
              disabled={selectedRoutes.length >= maxRoutes}
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Route
            </Button>
          )}

          {/* Selected Routes Count */}
          {selectedRoutes.length > 0 && (
            <Alert>
              <Car className="h-4 w-4" />
              <AlertDescription>
                {selectedRoutes.length} of {maxRoutes} routes configured
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Selected Routes */}
      {selectedRoutes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Configured Routes ({selectedRoutes.length})</CardTitle>
            <CardDescription>
              These routes will be monitored for traffic conditions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {selectedRoutes.map((route, index) => {
                const modeInfo = TRAVEL_MODES.find(m => m.value === route.travel_mode) || TRAVEL_MODES[0];
                const ModeIcon = modeInfo.icon;
                
                return (
                  <div
                    key={index}
                    className="p-3 border rounded-lg"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-xs font-mono">
                            [{index}]
                          </Badge>
                          <span className="font-medium">{route.destination_name}</span>
                          <Badge variant="outline" className="text-xs">
                            <ModeIcon className="h-3 w-3 mr-1" />
                            {modeInfo.label}
                          </Badge>
                        </div>
                        <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                          <p>
                            <span className="font-medium">From:</span> {route.origin}
                          </p>
                          <p>
                            <span className="font-medium">To:</span> {route.destination}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveRoute(index)}
                        className="text-destructive hover:text-destructive"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground mt-4">
              Use <code className="bg-muted px-1 rounded">traffic.routes.{`{index}`}.duration_minutes</code> in templates (e.g., routes.0, routes.1)
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

