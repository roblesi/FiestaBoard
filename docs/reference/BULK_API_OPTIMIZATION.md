# Bulk API Optimization

Reference document for the bulk API endpoints implementation that reduced API calls by ~85%.

## Overview

Bulk API endpoints eliminate N+1 query patterns across the FiestaBoard web application.

## Key Endpoints

- **Page previews:** `previewPagesBatch` (1 call instead of N)
- **Display raw data:** `/displays/raw/batch` (1 call instead of 7+)
- **Settings:** `/settings/all` (1 call instead of 4)

## Performance Impact

- Page grid: 10x faster
- Variable picker: 7x faster
- ~85–90% fewer API calls per user
- Settings page: 4x fewer requests

## Testing

- `tests/test_displays_batch.py` – display batch endpoint
- `tests/test_settings_all.py` – settings consolidation
- `web/src/__tests__/page-grid-selector.test.tsx` – page preview batching

See git history for implementation commits (feat(api,web): bulk endpoints, perf(web): remove polling).
