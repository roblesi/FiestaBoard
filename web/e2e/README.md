# End-to-End Tests with Playwright

This directory contains end-to-end tests for the FiestaBoard web application using [Playwright](https://playwright.dev/).

## Prerequisites

- Node.js installed
- Playwright browsers installed (done automatically on first run)

## Running Tests

### All Tests

Run all e2e tests:

```bash
npm run test:e2e
```

### Interactive UI Mode

Run tests in interactive UI mode for debugging:

```bash
npm run test:e2e:ui
```

### Debug Mode

Run tests in debug mode with step-by-step execution:

```bash
npm run test:e2e:debug
```

### View Last Test Report

View the HTML report from the last test run:

```bash
npm run test:e2e:report
```

## Test Structure

The e2e tests are organized by feature:

- `dashboard.spec.ts` - Dashboard page tests
- `pages-navigation.spec.ts` - Pages list and navigation tests
- `page-creation.spec.ts` - New page creation workflow tests
- `integrations-settings.spec.ts` - Integrations, Settings, and Schedule page tests

## Writing Tests

Playwright tests follow the Arrange-Act-Assert pattern:

```typescript
test('should do something', async ({ page }) => {
  // Arrange: Navigate to the page
  await page.goto('/');
  
  // Act: Perform actions
  await page.click('button');
  
  // Assert: Verify results
  await expect(page.getByText('Success')).toBeVisible();
});
```

## Configuration

The Playwright configuration is in `playwright.config.ts` at the root of the web directory.

Key settings:
- Base URL: `http://localhost:3000`
- Browsers: Chromium, Firefox, WebKit
- Auto-starts dev server before tests
- Retries on CI: 2 times
- Traces on first retry

## CI/CD

The tests are configured to run in CI with:
- `forbidOnly: true` - Fails if `.only` is left in code
- `retries: 2` - Retries failed tests twice
- `workers: 1` - Runs tests sequentially to avoid conflicts

## Coverage

These tests cover the main user workflows:

1. **Initial Setup & Navigation**
   - Dashboard loads correctly
   - Navigation between pages works
   - Responsive design on mobile

2. **Page Management**
   - Viewing the pages list
   - Creating new pages
   - Page editor functionality
   - Navigating back from creation

3. **Configuration**
   - Accessing Integrations
   - Accessing Settings
   - Accessing Schedule

## Future Tests

Additional tests to consider:
- Service start/stop functionality
- Page activation and preview
- Plugin configuration
- API integration tests
- Visual regression tests
- Performance tests

## Troubleshooting

### Tests fail with "page.goto: timeout"

The dev server may need more time to start. Increase the `timeout` in `playwright.config.ts`:

```typescript
webServer: {
  timeout: 180 * 1000, // 3 minutes
}
```

### Browsers not installed

Install Playwright browsers:

```bash
npx playwright install
```

### Port already in use

If port 3000 is in use, stop other processes or configure a different port in `playwright.config.ts`.

## Resources

- [Playwright Documentation](https://playwright.dev/docs/intro)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [Playwright Test API](https://playwright.dev/docs/api/class-test)
