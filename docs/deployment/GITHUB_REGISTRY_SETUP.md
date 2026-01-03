# GitHub Container Registry Deployment Guide

This guide explains how to deploy FiestaBoard using GitHub Container Registry (GHCR) for automated, one-click updates on your Synology NAS.

## Overview

With GHCR deployment:
- ✅ **No local building** - GitHub Actions builds images automatically
- ✅ **Portable images** - No hardcoded IPs, works anywhere
- ✅ **One-click updates** - Use Synology Container Manager's Update button
- ✅ **Version control** - Tagged images allow easy rollbacks
- ✅ **Faster deployments** - No tar file transfers needed

## Architecture

```
Push to main → GitHub Actions Build → GHCR → Synology NAS → Update Button
```

## Prerequisites

1. **GitHub Account** with this repository
2. **Synology NAS** with:
   - Container Manager package installed
   - SSH access enabled
   - Docker installed
3. **GitHub Personal Access Token** (for pulling private images)

---

## Part 1: Initial Setup (One-Time)

### Step 1: Create GitHub Personal Access Token

1. Go to GitHub → **Settings** → **Developer settings** → **Personal access tokens** → **Tokens (classic)**
2. Click **"Generate new token (classic)"**
3. Set:
   - **Note:** `Synology FiestaBoard Deployment`
   - **Expiration:** 90 days (or your preference)
   - **Scopes:** Check `read:packages`
4. Click **"Generate token"**
5. **Copy the token** - you won't see it again!

### Step 2: Configure Your .env File

Add the GitHub token to your `.env` file:

```bash
# GitHub Container Registry
GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Synology Configuration
SYNOLOGY_HOST=192.168.x.x
SYNOLOGY_USER=your-username
SYNOLOGY_SSH_PORT=22
SYNOLOGY_DEPLOY_DIR=~/fiestaboard

# Optional: Runtime API URL (if accessing from different network)
FIESTA_API_URL=http://192.168.x.x:6969
```

### Step 3: Set Up SSH Keys (if not already done)

From your local machine:

```bash
# Generate SSH key if you don't have one
ssh-keygen -t rsa -b 4096

# Copy SSH key to Synology
ssh-copy-id -p 22 your-username@synology-ip
```

### Step 4: Initial Deployment

Run the deployment script:

```bash
./deploy.sh
```

This will:
1. Transfer configuration files to Synology
2. Authenticate with GHCR
3. Pull the latest images
4. Start the containers

---

## Part 2: Updating to Latest Version

### Method 1: Synology Container Manager UI (Recommended)

This is the easiest way to update after the initial deployment:

1. Open **Container Manager** on your Synology
2. Go to **Container** tab
3. Select both `fiestaboard-api` and `fiestaboard-ui` containers
4. Click **Action** → **Stop**
5. After stopped, click **Action** → **Update**
6. Wait for images to download
7. Click **Action** → **Start**

Done! Your containers are now running the latest version.

### Method 2: SSH Command

SSH into your Synology and run:

```bash
cd ~/fiestaboard
sudo docker-compose pull
sudo docker-compose down
sudo docker-compose up -d
```

### Method 3: Re-run Deploy Script

From your local machine:

```bash
./deploy.sh
```

This pulls the latest images and restarts containers.

---

## Part 3: Understanding the System

### Image Locations

After merging to `main`, GitHub Actions automatically builds and publishes:
- **API:** `ghcr.io/roblesi/fiestaboard-api:latest`
- **UI:** `ghcr.io/roblesi/fiestaboard-ui:latest`

### Configuration Files

The system uses three key files on Synology:

1. **docker-compose.yml** - Container configuration (from `docker-compose.ghcr.yml`)
2. **.env** - Environment variables and secrets
3. **data/config.json** - FiestaBoard feature configuration

### Runtime API URL Configuration

The UI fetches its API URL at runtime from the `/api/runtime-config` endpoint. This means:
- Same Docker image works everywhere (local dev, Synology, cloud)
- No hardcoded IPs in the image
- Change API URL by setting `FIESTA_API_URL` environment variable

In `.env`:
```bash
# Leave empty for same-origin (if UI and API are on same host)
FIESTA_API_URL=

# Or set explicitly (if accessing from different network)
FIESTA_API_URL=http://192.168.1.100:6969
```

---

## Part 4: Troubleshooting

### Images Not Updating

**Problem:** Container Manager shows no updates available

**Solution:**
1. Check that changes were pushed to `main` branch
2. Verify GitHub Actions workflow completed successfully (check Actions tab)
3. Wait 5-10 minutes for build to complete
4. Try pulling manually: `sudo docker pull ghcr.io/roblesi/fiestaboard-api:latest`

### Authentication Failed

**Problem:** `Error: authentication failed`

**Solution:**
1. Verify your `GITHUB_TOKEN` in `.env` has `read:packages` permission
2. Re-login: `echo $GITHUB_TOKEN | sudo docker login ghcr.io -u roblesi --password-stdin`
3. Check token hasn't expired

### UI Can't Connect to API

**Problem:** UI shows "Failed to load runtime config"

**Solution:**
1. Check API container is running: `sudo docker-compose ps`
2. Verify `FIESTA_API_URL` is set correctly in `.env`
3. Check API logs: `sudo docker-compose logs fiestaboard-api`

### Container Won't Start

**Problem:** Container exits immediately after starting

**Solution:**
1. Check logs: `sudo docker-compose logs [container-name]`
2. Verify all required environment variables are set in `.env`
3. Ensure `data/config.json` exists and is valid JSON

---

## Part 5: Advanced Topics

### Rolling Back to Previous Version

If a new version has issues, you can rollback to a specific version:

```bash
cd ~/fiestaboard

# Stop current version
sudo docker-compose down

# Pull specific version by version number
sudo docker pull ghcr.io/roblesi/fiestaboard-api:1.0.1
sudo docker pull ghcr.io/roblesi/fiestaboard-ui:1.0.1

# Update docker-compose.yml to use specific version tags
# Change image tags from :latest to :1.0.1
# Then restart
sudo docker-compose up -d
```

### Viewing Container Logs

```bash
# View all logs
sudo docker-compose logs

# Follow logs in real-time
sudo docker-compose logs -f

# View specific container
sudo docker-compose logs fiestaboard-api

# Last 100 lines
sudo docker-compose logs --tail=100
```

### Checking Container Status

```bash
# List running containers
sudo docker-compose ps

# View container resource usage
sudo docker stats

# Inspect container details
sudo docker inspect fiestaboard-api
```

---

## Part 6: CI/CD Workflow

### Automatic Build Process

When you push to `main`:

1. **GitHub Actions Triggered** - `.github/workflows/release.yml` runs
2. **Version Bumped** - Automatically increments version based on PR labels (major/minor/patch)
3. **Images Built** - Both API and UI images are built for `linux/amd64`
4. **Images Tagged** - Tagged as `<version>` (e.g., `1.1.0`) and `latest`
5. **Images Pushed** - Uploaded to GitHub Container Registry
6. **Release Created** - GitHub release is automatically created with release notes
7. **Ready to Deploy** - Images available for Synology to pull

### Build Time

- API image: ~2-3 minutes
- UI image: ~5-7 minutes
- **Total:** ~10 minutes from push to ready

### Viewing Build Status

1. Go to your GitHub repository
2. Click **Actions** tab
3. Find the latest "Build and Publish Docker Images" workflow
4. Click to see detailed build logs

---

## Support

If you encounter issues:

1. Check container logs: `sudo docker-compose logs`
2. Verify GitHub Actions completed successfully
3. Ensure all environment variables are set correctly
4. Check Synology system logs in Control Panel → Log Center

For persistent issues, check:
- Network connectivity between Synology and GitHub
- Available disk space on Synology
- Docker version compatibility



