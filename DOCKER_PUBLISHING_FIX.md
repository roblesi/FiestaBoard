# Docker Publishing Fix - Version-Only Tagging

## Problem
The Docker publishing workflow was creating both version-based tags AND commit-based tags:
- ✅ `1.1.0` (good - version number)
- ✅ `latest` (good - points to latest version)
- ❌ `main-262dac8` (bad - commit hash)
- ❌ `main-0cd348e` (bad - commit hash)

This happened because two workflows were running on every push to `main`:
1. `publish-images.yml` - Created commit-hash tags
2. `release.yml` - Created version tags

## Solution
**Deleted** `.github/workflows/publish-images.yml` entirely.

Now only `release.yml` runs on `main` branch, which:
- Automatically bumps version based on PR labels (major/minor/patch)
- Tags images with version number (e.g., `1.1.0`)
- Tags images with `latest`
- Creates GitHub releases with release notes

**Important:** Docker images are ONLY published from `main` on version bumps. No images are published from PRs or feature branches.

## Changes Made

### 1. Deleted `.github/workflows/publish-images.yml`
- Completely removed to prevent publishing images from PRs/feature branches
- Only `release.yml` publishes images (from `main` only)

### 2. Updated `docs/deployment/GITHUB_REGISTRY_SETUP.md`
- Removed references to commit-hash tags
- Updated rollback instructions to use version numbers
- Updated automatic build process documentation

## Result
Going forward, when you push to `main`:
- Only version-tagged images are created (e.g., `1.1.0`, `latest`)
- No more commit-hash tags (e.g., `main-262dac8`)
- Clean, predictable image versioning

## Cleaning Up Old Tags

The existing commit-hash tags in GHCR will remain until manually deleted. To clean them up:

### Option 1: GitHub UI (Easiest)
1. Go to https://github.com/roblesi?tab=packages
2. Click on `vesta-api` package
3. Find each commit-hash tag (e.g., `main-262dac8`)
4. Click the tag → Click "Delete"
5. Repeat for `vesta-ui` package

### Option 2: GitHub CLI
```bash
# Install GitHub CLI if needed
brew install gh

# Authenticate
gh auth login

# List all tags for vesta-api
gh api -X GET /user/packages/container/vesta-api/versions

# Delete a specific version (replace VERSION_ID with actual ID from list)
gh api -X DELETE /user/packages/container/vesta-api/versions/VERSION_ID

# Repeat for vesta-ui
gh api -X GET /user/packages/container/vesta-ui/versions
gh api -X DELETE /user/packages/container/vesta-ui/versions/VERSION_ID
```

### Option 3: Let Them Expire
Since commit-hash tags won't be created anymore, you can simply ignore the old ones. They won't be updated and will eventually be considered stale.

## Verification

After the next push to `main`, verify:
1. Check GitHub Actions - Only `release.yml` should run
2. Check GHCR packages - Should see new version tag (e.g., `1.1.1`) and updated `latest`
3. No new commit-hash tags should appear

## CI/CD Philosophy

We've optimized our CI/CD for **speed and cost efficiency**:

- ✅ **No Docker builds on PRs** - Too slow (~10 min), most issues caught by tests
- ✅ **Docker builds and publishing ONLY on main** - After merge, as part of release
- ✅ **Automatic rollback on failure** - If Docker builds fail on main, automatically revert merge and re-open PR

This approach:
- Saves ~50% CI time and costs
- Provides faster PR feedback (2-3 min vs 12-13 min)
- Maintains safety through automatic rollback
- No Docker images published from PRs or feature branches

## Testing Docker Builds Before Merge

If you need to test Docker builds before merging:

### Option 1: Local Testing (Recommended)
```bash
# Test API build
docker build -f Dockerfile.api -t vesta-api:test .

# Test UI build
docker build -f Dockerfile.ui -t vesta-ui:test .
```

### Option 2: Wait for Merge
- Merge to `main` and let `release.yml` build the images
- If builds fail, automatic rollback will revert and re-open PR

See [CI_CD_APPROACH.md](./CI_CD_APPROACH.md) for complete details.

