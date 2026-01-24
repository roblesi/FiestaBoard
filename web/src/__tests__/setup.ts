import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, beforeAll, afterAll, vi } from "vitest";
import React from "react";
import { server } from "./mocks/server";

// Filter out jsdom localStorage file warnings
// These are internal to jsdom and don't affect our tests
const originalEmitWarning = process.emitWarning;
process.emitWarning = (warning: string | Error, ...args: unknown[]) => {
  const warningString = typeof warning === 'string' ? warning : warning.message;
  if (warningString.includes('--localstorage-file')) {
    return; // Suppress this specific warning
  }
  return originalEmitWarning.call(process, warning, ...args as [never, never]);
};

// Mock localStorage to avoid jsdom warnings
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    get length() {
      return Object.keys(store).length;
    },
    key: (index: number) => {
      const keys = Object.keys(store);
      return keys[index] || null;
    },
  };
})();

Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
  writable: true,
});

// Mock matchMedia for next-themes
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock next/dynamic to return components synchronously in tests
vi.mock("next/dynamic", () => ({
  default: (loader: () => Promise<any>, options?: any) => {
    // In tests, immediately resolve and return the component
    return (props: any) => {
      const [Component, setComponent] = React.useState<any>(null);
      React.useEffect(() => {
        loader().then((mod) => {
          setComponent(() => mod.default || mod);
        });
      }, []);
      if (!Component) {
        // Return loading state if provided
        return options?.loading ? React.createElement(options.loading) : null;
      }
      return React.createElement(Component, props);
    };
  },
}));

// Mock DOM APIs needed by ProseMirror/TipTap
if (typeof document !== 'undefined') {
  // Mock elementFromPoint for ProseMirror position calculations
  document.elementFromPoint = vi.fn(() => null);
  document.elementsFromPoint = vi.fn(() => []);
  
  // Mock caretPositionFromPoint (alternative to caretRangeFromPoint)
  (document as any).caretPositionFromPoint = vi.fn(() => null);
  
  // Mock caretRangeFromPoint for position calculations
  if (!document.caretRangeFromPoint) {
    (document as any).caretRangeFromPoint = vi.fn(() => null);
  }
}

// Mock getClientRects and getBoundingClientRect for all elements
const mockRect = {
  x: 0,
  y: 0,
  width: 100,
  height: 20,
  top: 0,
  right: 100,
  bottom: 20,
  left: 0,
  toJSON: () => ({}),
};

const mockDOMRect = () => mockRect;

if (typeof Element !== 'undefined') {
  Element.prototype.getClientRects = vi.fn(() => [mockRect] as any);
  Element.prototype.getBoundingClientRect = vi.fn(mockDOMRect);
}

if (typeof Range !== 'undefined') {
  Range.prototype.getClientRects = vi.fn(() => [mockRect] as any);
  Range.prototype.getBoundingClientRect = vi.fn(mockDOMRect);
}

// Mock scrollIntoView
if (typeof Element !== 'undefined') {
  Element.prototype.scrollIntoView = vi.fn();
}

// Mock ResizeObserver for components that use it (e.g., ScrollArea)
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Setup MSW
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterAll(() => server.close());
afterEach(() => {
  cleanup();
  server.resetHandlers();
});

