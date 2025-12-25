/**
 * Vestaboard Official Color Palette
 *
 * These are the 8 official colors supported by Vestaboard hardware.
 * All UI components should use these colors for consistency between
 * the preview display and status indicators.
 *
 * Reference: docs/reference/COLOR_GUIDE.md
 *
 * Color Codes:
 * - 63: Red    - Alerts, hot temperatures, errors
 * - 64: Orange - Warm temperatures, warnings
 * - 65: Yellow - Comfortable temperatures, cautions
 * - 66: Green  - Good status, success, cool temperatures
 * - 67: Blue   - Information, cold temperatures
 * - 68: Violet - Very cold, secondary info
 * - 69: White  - Reserved
 * - 70: Black  - Reserved (same as tile background)
 */

// Vestaboard's official color hex values
export const VESTABOARD_COLORS = {
  red: "#eb4034",
  orange: "#f5a623",
  yellow: "#f8e71c",
  green: "#7ed321",
  blue: "#4a90d9",
  violet: "#9b59b6",
  white: "#ffffff",
  black: "#1a1a1a",
} as const;

// Type for Vestaboard color names
export type VestaboardColorName = keyof typeof VESTABOARD_COLORS;

// Numeric code to color mapping (for Vestaboard API)
export const COLOR_CODE_MAP: Record<string, string> = {
  "63": VESTABOARD_COLORS.red,
  "64": VESTABOARD_COLORS.orange,
  "65": VESTABOARD_COLORS.yellow,
  "66": VESTABOARD_COLORS.green,
  "67": VESTABOARD_COLORS.blue,
  "68": VESTABOARD_COLORS.violet,
  "69": VESTABOARD_COLORS.white,
  "70": VESTABOARD_COLORS.black,
};

// Combined mapping for both numeric codes and named colors
export const ALL_COLOR_CODES: Record<string, string> = {
  // Numeric codes
  ...COLOR_CODE_MAP,
  // Named aliases
  red: VESTABOARD_COLORS.red,
  orange: VESTABOARD_COLORS.orange,
  yellow: VESTABOARD_COLORS.yellow,
  green: VESTABOARD_COLORS.green,
  blue: VESTABOARD_COLORS.blue,
  violet: VESTABOARD_COLORS.violet,
  purple: VESTABOARD_COLORS.violet, // alias
  white: VESTABOARD_COLORS.white,
  black: VESTABOARD_COLORS.black,
};

// List of available color names for pickers/selectors
export const AVAILABLE_COLORS: VestaboardColorName[] = [
  "red",
  "orange",
  "yellow",
  "green",
  "blue",
  "violet",
  "white",
  "black",
];

// Color display configuration for UI elements (backgrounds, text colors)
export const COLOR_DISPLAY: Record<VestaboardColorName, { bg: string; text: string }> = {
  red: { bg: `bg-[${VESTABOARD_COLORS.red}]`, text: "text-white" },
  orange: { bg: `bg-[${VESTABOARD_COLORS.orange}]`, text: "text-white" },
  yellow: { bg: `bg-[${VESTABOARD_COLORS.yellow}]`, text: "text-black" },
  green: { bg: `bg-[${VESTABOARD_COLORS.green}]`, text: "text-white" },
  blue: { bg: `bg-[${VESTABOARD_COLORS.blue}]`, text: "text-white" },
  violet: { bg: `bg-[${VESTABOARD_COLORS.violet}]`, text: "text-white" },
  white: { bg: "bg-white border", text: "text-black" },
  black: { bg: `bg-[${VESTABOARD_COLORS.black}]`, text: "text-white" },
};

// Helper function to get color by name or code
export function getVestaboardColor(nameOrCode: string): string {
  const lowerKey = nameOrCode.toLowerCase();
  return ALL_COLOR_CODES[nameOrCode] || ALL_COLOR_CODES[lowerKey] || VESTABOARD_COLORS.black;
}

// Helper function to check if a string is a valid color
export function isValidVestaboardColor(value: string): boolean {
  const lowerKey = value.toLowerCase();
  return value in ALL_COLOR_CODES || lowerKey in ALL_COLOR_CODES;
}

