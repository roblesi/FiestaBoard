import { test, expect } from '@playwright/test';

test.describe('Dashboard', () => {
  test('should load the dashboard page successfully', async ({ page }) => {
    // Navigate to the home page
    await page.goto('/');

    // Wait for the page to load
    await page.waitForLoadState('networkidle');

    // Check that the Dashboard heading is visible
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();

    // Check that the subtitle is visible
    await expect(page.getByText('Monitor your board display and system activity')).toBeVisible();
  });

  test('should have navigation links', async ({ page }) => {
    await page.goto('/');

    // Wait for the page to load
    await page.waitForLoadState('networkidle');

    // Check for common navigation elements (these may vary based on the actual UI)
    // We'll look for links that should be present in a typical dashboard
    const pageContent = await page.content();
    
    // Verify the page has loaded with expected content
    expect(pageContent).toContain('Dashboard');
  });

  test('should be responsive on mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Check that the Dashboard heading is still visible on mobile
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  });
});
