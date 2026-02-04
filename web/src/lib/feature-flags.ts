/**
 * Feature flags for gradual rollout of new features
 */

/**
 * Check if TipTap editor should be used instead of legacy editor
 * Set NEXT_PUBLIC_USE_TIPTAP_EDITOR=true to enable
 */
export function useTipTapEditor(): boolean {
  // Check environment variable
  if (typeof window !== 'undefined') {
    // Client-side: check window env or localStorage override
    const override = localStorage.getItem('use_tiptap_editor');
    if (override === 'true') return true;
    if (override === 'false') return false;
  }
  
  // Default to environment variable
  return process.env.NEXT_PUBLIC_USE_TIPTAP_EDITOR === 'true';
}

/**
 * Enable TipTap editor for current session (localStorage override)
 */
export function enableTipTapEditor(): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('use_tiptap_editor', 'true');
    window.location.reload();
  }
}

/**
 * Disable TipTap editor for current session (localStorage override)
 */
export function disableTipTapEditor(): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('use_tiptap_editor', 'false');
    window.location.reload();
  }
}

/**
 * Clear TipTap editor override (use environment default)
 */
export function clearTipTapEditorOverride(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('use_tiptap_editor');
    window.location.reload();
  }
}
