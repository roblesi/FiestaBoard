import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { BoardDisplay } from "@/components/board-display";
import { ConfigOverridesProvider } from "@/hooks/use-config-overrides";
import React, { useState } from "react";

// Test wrapper with providers
function TestWrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <ConfigOverridesProvider>
        <ThemeProvider attribute="class" defaultTheme="light">
          {children}
        </ThemeProvider>
      </ConfigOverridesProvider>
    </QueryClientProvider>
  );
}

// Helper component to control isLoading state
function TestBoardDisplay({ 
  initialLoading, 
  message 
}: { 
  initialLoading: boolean;
  message: string | null;
}) {
  const [isLoading, setIsLoading] = useState(initialLoading);
  
  return (
    <div>
      <BoardDisplay
        message={message}
        isLoading={isLoading}
        size="md"
        boardType="black"
      />
      <button 
        data-testid="toggle-loading"
        onClick={() => setIsLoading(false)}
      >
        Stop Loading
      </button>
    </div>
  );
}

describe("BoardDisplay Transition Out", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("continues cycling characters after isLoading becomes false until reaching target", async () => {
    // Simple message: "A" in first position
    const message = "A";
    
    const { rerender } = render(
      <TestBoardDisplay initialLoading={true} message={null} />,
      { wrapper: TestWrapper }
    );

    // Wait for initial render and let loading animation start
    await vi.advanceTimersByTimeAsync(100);
    
    // Now set the message and stop loading - this is the transition
    // This simulates: isLoading=true, message=null -> isLoading=false, message="A"
    rerender(
      <TestBoardDisplay initialLoading={false} message={message} />,
      { wrapper: TestWrapper }
    );
    
    // Advance a bit to let the transition state update
    await vi.advanceTimersByTimeAsync(20);

    // Get the first tile (position 0,0)
    const firstTile = screen.queryByTestId("char-tile-0-0");
    expect(firstTile).toBeTruthy();
    
    if (!firstTile) return;
    
    // Animation duration is ~70ms per character (5000ms / 71 chars)
    const animationDuration = Math.round(5000 / 71); // ~70ms
    
    // Track character changes
    const observedChars: string[] = [];
    let previousChar: string | null = null;
    let stoppedAtChar: string | null = null;
    let sawTransitioning = false;
    
    // Advance time and observe character changes
    // We should see characters cycling, then stop at "A"
    for (let i = 0; i < 100; i++) {
      await vi.advanceTimersByTimeAsync(animationDuration);
      
      const currentChar = firstTile.getAttribute('data-current-char');
      const isTransitioning = firstTile.getAttribute('data-is-transitioning') === 'true';
      const targetChar = firstTile.getAttribute('data-target-char');
      
      if (currentChar) {
        observedChars.push(currentChar);
        
        if (isTransitioning) {
          sawTransitioning = true;
        }
        
        // If we've reached target and stopped transitioning, we're done
        if (currentChar === targetChar && isTransitioning === false) {
          stoppedAtChar = currentChar;
          break;
        }
        
        previousChar = currentChar;
      }
    }
    
    // Verify we saw the transition happen
    expect(sawTransitioning).toBe(true);
    
    // Verify we eventually stopped at the target
    expect(stoppedAtChar).toBe("A");
    expect(observedChars.length).toBeGreaterThan(0);
    
    // Verify the tile is no longer transitioning
    const finalIsTransitioning = firstTile.getAttribute('data-is-transitioning');
    expect(finalIsTransitioning).toBe('false');
  });

  it("transitions smoothly from loading to loaded state without abrupt stop", async () => {
    const message2 = "WORLD";
    
    // Start with loading state
    const { rerender } = render(
      <TestBoardDisplay initialLoading={true} message={null} />,
      { wrapper: TestWrapper }
    );

    await vi.advanceTimersByTimeAsync(100);

    // Transition: set message and stop loading
    rerender(
      <TestBoardDisplay initialLoading={false} message={message2} />,
      { wrapper: TestWrapper }
    );

    const animationDuration = Math.round(5000 / 71);
    
    // Get first tile to observe
    const firstTile = screen.queryByTestId("char-tile-0-0");
    expect(firstTile).toBeTruthy();
    
    if (!firstTile) return;
    
    // Track if we see character changes (proving transition is happening)
    let sawCharacterChange = false;
    let previousChar: string | null = null;
    
    // Advance time and verify component continues to render and characters change
    for (let i = 0; i < 20; i++) {
      await vi.advanceTimersByTimeAsync(animationDuration);
      
      const currentChar = firstTile.getAttribute('data-current-char');
      const isTransitioning = firstTile.getAttribute('data-is-transitioning');
      
      // If character changed, transition is working
      if (previousChar !== null && currentChar !== previousChar) {
        sawCharacterChange = true;
      }
      
      // Component should still be transitioning (not abruptly stopped)
      if (i < 10) {
        // Early in transition, should still be transitioning
        expect(isTransitioning).toBe('true');
      }
      
      previousChar = currentChar;
    }
    
    // We should have seen at least one character change
    expect(sawCharacterChange).toBe(true);
  });

  it("each tile stops independently when reaching its target character", async () => {
    // Message with different characters: "A" (index 1) and "Z" (index 26)
    // They should stop at different times if they start from different positions
    const message = "AZ";
    
    const { rerender } = render(
      <TestBoardDisplay initialLoading={true} message={null} />,
      { wrapper: TestWrapper }
    );

    await vi.advanceTimersByTimeAsync(100);

    // Transition to loaded state
    rerender(
      <TestBoardDisplay initialLoading={false} message={message} />,
      { wrapper: TestWrapper }
    );

    const animationDuration = Math.round(5000 / 71);
    
    // Get both tiles
    const tileA = screen.queryByTestId("char-tile-0-0"); // First "A"
    const tileZ = screen.queryByTestId("char-tile-0-1"); // Second "Z"
    
    expect(tileA).toBeTruthy();
    expect(tileZ).toBeTruthy();
    
    if (!tileA || !tileZ) return;
    
    // Track when each tile stops
    let tileAStopped = false;
    let tileZStopped = false;
    let tileALastChar: string | null = null;
    let tileZLastChar: string | null = null;
    
    // Advance time and observe both tiles
    for (let i = 0; i < 100; i++) {
      await vi.advanceTimersByTimeAsync(animationDuration);
      
      const aChar = tileA.getAttribute('data-current-char');
      const aTransitioning = tileA.getAttribute('data-is-transitioning') === 'true';
      const aTarget = tileA.getAttribute('data-target-char');
      
      const zChar = tileZ.getAttribute('data-current-char');
      const zTransitioning = tileZ.getAttribute('data-is-transitioning') === 'true';
      const zTarget = tileZ.getAttribute('data-target-char');
      
      // Check if tile A stopped
      if (aChar === aTarget && !aTransitioning && !tileAStopped) {
        tileAStopped = true;
        tileALastChar = aChar;
      }
      
      // Check if tile Z stopped
      if (zChar === zTarget && !zTransitioning && !tileZStopped) {
        tileZStopped = true;
        tileZLastChar = zChar;
      }
      
      // If both stopped, we're done
      if (tileAStopped && tileZStopped) {
        break;
      }
    }
    
    // Both should eventually stop at their targets
    expect(tileAStopped).toBe(true);
    expect(tileZStopped).toBe(true);
    expect(tileALastChar).toBe("A");
    expect(tileZLastChar).toBe("Z");
    
    // They might stop at the same time or different times depending on starting position
    // But the key is they both eventually reach their targets
  });
});
