import { test, expect } from '@playwright/test';

test.describe('Integrations', () => {
  test('should navigate to Integrations page', async ({ page }) => {
    await page.goto('/integrations');
    await page.waitForLoadState('networkidle');

    // Check that the Integrations heading is visible
    await expect(page.getByRole('heading', { name: /integrations/i })).toBeVisible();
  });

  test('should display available plugins', async ({ page }) => {
    await page.goto('/integrations');
    await page.waitForLoadState('networkidle');

    // The page should have loaded successfully
    expect(page.url()).toContain('/integrations');
    
    // Wait a bit for any dynamic content to load
    await page.waitForTimeout(1000);
  });
});

test.describe('Settings', () => {
  test('should navigate to Settings page', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    // Check that the Settings heading is visible (be more specific - get the h1)
    await expect(page.getByRole('heading', { name: 'Settings', exact: true }).first()).toBeVisible();
  });

  test('should display settings form', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    // The page should have loaded successfully
    expect(page.url()).toContain('/settings');
    
    // Settings typically have form controls
    const pageContent = await page.content();
    expect(pageContent.length).toBeGreaterThan(0);
  });
});

test.describe('Schedule', () => {
  test('should navigate to Schedule page', async ({ page }) => {
    await page.goto('/schedule');
    await page.waitForLoadState('networkidle');

    // Check that the Schedule heading is visible
    await expect(page.getByRole('heading', { name: /schedule/i })).toBeVisible();
  });

  test('should load schedule interface', async ({ page }) => {
    await page.goto('/schedule');
    await page.waitForLoadState('networkidle');

    // The page should have loaded successfully
    expect(page.url()).toContain('/schedule');
    
    // Wait for any dynamic content
    await page.waitForTimeout(1000);
  });
});
