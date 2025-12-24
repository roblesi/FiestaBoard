import { describe, it, expect } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useStatus, usePreview, useConfig } from "@/hooks/use-vestaboard";
import { ConfigOverridesProvider } from "@/hooks/use-config-overrides";
import { mockStatus, mockPreview, mockConfig } from "./mocks/handlers";
import React from "react";

// Wrapper for react-query (without config overrides)
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

// Wrapper with config overrides provider (required for usePreview)
function createWrapperWithOverrides() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(
      QueryClientProvider,
      { client: queryClient },
      React.createElement(ConfigOverridesProvider, null, children)
    );
  };
}

describe("useStatus", () => {
  it("fetches status from API", async () => {
    const { result } = renderHook(() => useStatus(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockStatus);
    expect(result.current.data?.running).toBe(true);
    expect(result.current.data?.config_summary.dev_mode).toBe(true);
  });
});

describe("usePreview", () => {
  it("fetches preview message from API", async () => {
    const { result } = renderHook(() => usePreview(), {
      wrapper: createWrapperWithOverrides(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockPreview);
    expect(result.current.data?.message).toContain("START WHERE YOU ARE");
    expect(result.current.data?.display_type).toBe("star_trek");
  });

  it("can be disabled", () => {
    const { result } = renderHook(() => usePreview(false), {
      wrapper: createWrapperWithOverrides(),
    });

    expect(result.current.isFetching).toBe(false);
  });
});

describe("useConfig", () => {
  it("fetches config from API", async () => {
    const { result } = renderHook(() => useConfig(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockConfig);
    expect(result.current.data?.weather_enabled).toBe(true);
    expect(result.current.data?.home_assistant_enabled).toBe(false);
  });
});


