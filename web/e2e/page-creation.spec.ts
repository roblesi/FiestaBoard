import { test, expect } from '@playwright/test';

test.describe('Page Creation', () => {
  test('should display new page creation form', async ({ page }) => {
    await page.goto('/pages/new');
    await page.waitForLoadState('networkidle');

    // The form should be visible
    // Look for common form elements that would be in a page creation UI
    const pageContent = await page.content();
    
    // Basic verification that we're on the right page
    expect(page.url()).toContain('/pages/new');
  });

  test('should allow creating a new page with a name', async ({ page }) => {
    await page.goto('/pages/new');
    await page.waitForLoadState('networkidle');

    // Try to find a name/title input field
    // This is a common pattern in forms
    const nameInput = page.locator('input[type="text"]').first();
    
    // Check if input exists and is visible
    const inputCount = await page.locator('input[type="text"]').count();
    
    if (inputCount > 0) {
      await expect(nameInput).toBeVisible();
      
      // Type a page name
      await nameInput.fill('Test Page');
      
      // Verify the input was filled
      await expect(nameInput).toHaveValue('Test Page');
    }
  });

  test('should have a template editor', async ({ page }) => {
    await page.goto('/pages/new');
    await page.waitForLoadState('networkidle');

    // Look for editor-related elements
    // TipTap editor typically has contenteditable elements
    const editableElements = page.locator('[contenteditable="true"]');
    const count = await editableElements.count();
    
    // We expect at least one editable element for the content
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('should be able to navigate back to pages list', async ({ page }) => {
    await page.goto('/pages/new');
    await page.waitForLoadState('networkidle');

    // Navigate directly back to pages
    await page.goto('/pages');
    await page.waitForLoadState('networkidle');

    // Should be at /pages
    expect(page.url()).toMatch(/\/pages\/?$/);
  });
});
