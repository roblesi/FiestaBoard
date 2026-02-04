import { test, expect } from '@playwright/test';

test.describe('Pages Management', () => {
  test('should navigate to Pages view', async ({ page }) => {
    // Start from home
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Navigate directly to the pages route
    await page.goto('/pages');
    await page.waitForLoadState('networkidle');

    // Check that the Pages heading is visible
    await expect(page.getByRole('heading', { name: 'Pages' })).toBeVisible();

    // Check that the subtitle is visible
    await expect(page.getByText('Create and manage content for your board')).toBeVisible();

    // Check that "Saved Pages" section exists
    await expect(page.getByText('Saved Pages')).toBeVisible();
  });

  test('should have a "New" button to create pages', async ({ page }) => {
    await page.goto('/pages');
    await page.waitForLoadState('networkidle');

    // Look for the New button
    const newButton = page.getByRole('button', { name: /new/i });
    await expect(newButton).toBeVisible();
  });

  test('should navigate to new page creation form', async ({ page }) => {
    await page.goto('/pages');
    await page.waitForLoadState('networkidle');

    // Click the New button
    const newButton = page.getByRole('button', { name: /new/i });
    await newButton.click();

    // Wait for navigation
    await page.waitForLoadState('networkidle');

    // Check that we're on the new page creation page
    // The URL should be /pages/new
    expect(page.url()).toContain('/pages/new');
  });

  test('should display pages grid when pages exist', async ({ page }) => {
    await page.goto('/pages');
    await page.waitForLoadState('networkidle');

    // The PageGridSelector component should be present
    // We can check if the card content area exists
    const cardContent = page.locator('[class*="CardContent"]').first();
    await expect(cardContent).toBeVisible();
  });
});
