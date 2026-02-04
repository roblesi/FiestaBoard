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

### View Test Coverage

View a detailed coverage analysis of what UI features are tested:

```bash
npm run test:e2e:coverage
```

This displays:
- Coverage percentage by feature
- What's tested vs. not tested
- Interaction type coverage
- Pages covered
- Recommendations for improving coverage

For a detailed written analysis, see [COVERAGE.md](./COVERAGE.md).

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

### Current Coverage: ~50%

The test suite currently covers approximately **50% of UI functionality** across 22 tests in 5 test files.

**View detailed coverage analysis:**
```bash
npm run test:e2e:coverage
```

**Read the full coverage report:** [COVERAGE.md](./COVERAGE.md)

### What's Covered

**High Coverage (60-90%)**
- ✅ Navigation and routing (90%)
- ✅ Page loads and rendering (80%)
- ✅ Responsive design testing (70%)
- ✅ Pages management workflows (70%)

**Medium Coverage (40-60%)**
- ⚠️ Button visibility (60%)
- ⚠️ Form display (50%)
- ⚠️ Dashboard features (60%)
- ⚠️ Configuration pages (40%)

**Low Coverage (<40%)**
- ❌ Form submissions (10%)
- ❌ Data CRUD operations (20%)
- ❌ Service lifecycle (0%)
- ❌ Error handling (0%)
- ❌ Real-time updates (0%)

### Test Distribution

1. **Initial Setup & Navigation** (3 tests)
   - Dashboard loads correctly
   - Navigation between pages works
   - Responsive design on mobile

2. **Page Management** (8 tests)
   - Viewing the pages list
   - Creating new pages
   - Page editor functionality
   - Navigating back from creation

3. **Configuration** (6 tests)
   - Accessing Integrations
   - Accessing Settings
   - Accessing Schedule

4. **Complete Workflows** (5 tests)
   - End-to-end user journeys
   - State persistence
   - Multi-viewport testing

## Future Tests

Additional tests recommended to reach 80%+ coverage:
- **High Priority**: Service start/stop functionality
- **High Priority**: Complete page creation (save)
- **High Priority**: Page activation workflow
- **High Priority**: Settings save functionality
- **High Priority**: Plugin enable/disable
- Page editing (existing pages)
- Page deletion
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
