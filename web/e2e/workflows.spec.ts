import { test, expect } from '@playwright/test';

/**
 * End-to-end workflow tests
 * These tests simulate complete user journeys through the application
 */

test.describe('Complete User Workflows', () => {
  test('should complete full page management workflow', async ({ page }) => {
    // Step 1: Start at dashboard
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();

    // Step 2: Navigate to Pages
    await page.goto('/pages');
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { name: 'Pages' })).toBeVisible();

    // Step 3: Check that we can see the New button
    const newButton = page.getByRole('button', { name: /new/i });
    await expect(newButton).toBeVisible();

    // Step 4: Navigate to new page form
    await page.goto('/pages/new');
    await page.waitForLoadState('networkidle');
    expect(page.url()).toContain('/pages/new');

    // Step 5: Go back to pages list
    await page.goto('/pages');
    await page.waitForLoadState('networkidle');
    expect(page.url()).toMatch(/\/pages\/?$/);
  });

  test('should navigate through all main sections', async ({ page }) => {
    // Dashboard
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();

    // Pages
    await page.goto('/pages');
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { name: 'Pages' })).toBeVisible();

    // Integrations
    await page.goto('/integrations');
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { name: /integrations/i })).toBeVisible();

    // Settings
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { name: 'Settings', exact: true }).first()).toBeVisible();

    // Schedule
    await page.goto('/schedule');
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { name: /schedule/i })).toBeVisible();
  });

  test('should maintain state when navigating between pages', async ({ page }) => {
    // Visit pages in sequence
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    await page.goto('/pages');
    await page.waitForLoadState('networkidle');
    
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');
    
    // Go back to dashboard
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Verify we're back at the dashboard
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  });

  test('should handle page refreshes correctly', async ({ page }) => {
    // Navigate to pages
    await page.goto('/pages');
    await page.waitForLoadState('networkidle');
    
    // Reload the page
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Content should still be there
    await expect(page.getByRole('heading', { name: 'Pages' })).toBeVisible();
    await expect(page.getByText('Saved Pages')).toBeVisible();
  });

  test('should be accessible on different viewport sizes', async ({ page }) => {
    const viewports = [
      { width: 1920, height: 1080, name: 'Desktop' },
      { width: 768, height: 1024, name: 'Tablet' },
      { width: 375, height: 667, name: 'Mobile' },
    ];

    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      // Check that the main heading is visible on all viewports
      await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
      
      // Navigate to pages
      await page.goto('/pages');
      await page.waitForLoadState('networkidle');
      await expect(page.getByRole('heading', { name: 'Pages' })).toBeVisible();
    }
  });
});
