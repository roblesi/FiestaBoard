# GitHub Codespaces Setup

This guide explains how to use GitHub Codespaces secrets with your Vestaboard Display Service.

## Overview

GitHub Codespaces allows you to store sensitive information (like API keys) as secrets, which are then available as environment variables in your Codespace. This keeps your credentials secure and out of your repository.

## Prerequisites

- GitHub repository with Codespaces enabled
- Vestaboard Read/Write API key
- Weather API key

## Step 1: Add Codespaces Secrets

1. **Go to your GitHub repository**

2. **Navigate to Settings**:
   - Click on **Settings** tab
   - Go to **Secrets and variables** → **Codespaces**

3. **Add the required secrets**:

   Click **New repository secret** and add:

   **Secret 1: VB_READ_WRITE_KEY**
   - Name: `VB_READ_WRITE_KEY`
   - Value: Your Vestaboard Read/Write API key
   - Example: `1a801a86-c1f1-4007-bec9-7ea92443d3cd`

   **Secret 2: WEATHER_API_KEY**
   - Name: `WEATHER_API_KEY`
   - Value: Your Weather API key
   - Example: `bd6af5858e41468396d25331252312`

4. **Save each secret**

## Step 2: Optional Secrets

You can also add these optional secrets for additional features:

### Home Assistant
- `HOME_ASSISTANT_ACCESS_TOKEN`: Your Home Assistant long-lived access token

### Guest WiFi
- `GUEST_WIFI_SSID`: Your guest WiFi network name
- `GUEST_WIFI_PASSWORD`: Your guest WiFi password

### Apple Music
- `APPLE_MUSIC_SERVICE_URL`: URL to your macOS helper service

## Step 3: Launch Codespace

1. **Open your repository on GitHub**

2. **Click the Code button** → **Codespaces** tab

3. **Create or open a Codespace**

## Step 4: Run Setup Script

Once your Codespace is running:

```bash
# Run the setup script
./scripts/codespaces_setup.sh
```

This script will:
- ✅ Verify you're in a Codespace
- ✅ Check for required secrets
- ✅ Generate `.env` file from secrets and defaults
- ✅ Show configuration summary

## Step 5: Verify Configuration

Check the generated `.env` file:

```bash
cat .env
```

You should see your API keys populated from Codespaces secrets.

## Step 6: Run the Service

### Using Docker (Recommended)

```bash
# Build and run
docker-compose -f docker-compose.dev.yml up -d

# View logs
docker-compose -f docker-compose.dev.yml logs -f
```

## Configuration Options

### Environment Variables

Beyond the required secrets, you can configure additional features using environment variables in your Codespace:

```bash
# Set in Codespace terminal or add as Codespace secrets
export WEATHER_LOCATION="New York, NY"
export TIMEZONE="America/New_York"
export STAR_TREK_QUOTES_ENABLED="true"

# Then re-run setup
./scripts/codespaces_setup.sh
```

### Adding More Secrets

To add additional secrets:

1. Go to repository **Settings** → **Secrets and variables** → **Codespaces**
2. Click **New repository secret**
3. Add the secret name and value
4. Restart your Codespace or run setup script again

## How It Works

### Codespaces Secrets → Environment Variables

GitHub Codespaces automatically exposes repository secrets as environment variables in your Codespace environment.

```
GitHub Secret: VB_READ_WRITE_KEY
    ↓
Codespace Environment Variable: $VB_READ_WRITE_KEY
    ↓
Setup Script: Generates .env file
    ↓
Python Application: Reads from .env or environment variables
```

### Dev Container Configuration

The `.devcontainer/devcontainer.json` file maps secrets to the container:

```json
{
  "remoteEnv": {
    "VB_READ_WRITE_KEY": "${localEnv:VB_READ_WRITE_KEY}",
    "WEATHER_API_KEY": "${localEnv:WEATHER_API_KEY}"
  }
}
```

### Python Configuration

The Python code (`src/config.py`) reads from environment variables using `os.getenv()`:

```python
VB_READ_WRITE_KEY = os.getenv("VB_READ_WRITE_KEY")
WEATHER_API_KEY = os.getenv("WEATHER_API_KEY")
```

This means your application works with:
1. ✅ Codespaces secrets (as environment variables)
2. ✅ `.env` file (loaded by python-dotenv)
3. ✅ System environment variables

## Troubleshooting

### "Missing required Codespaces secrets"

**Problem:** Setup script reports missing secrets.

**Solution:**
1. Go to repository Settings → Secrets and variables → Codespaces
2. Verify secrets are added with correct names:
   - `VB_READ_WRITE_KEY`
   - `WEATHER_API_KEY`
3. Restart your Codespace
4. Run setup script again

### "Not running in GitHub Codespaces"

**Problem:** Script detects you're not in a Codespace.

**Solution:**
- This script is only for GitHub Codespaces
- For local development, manually create `.env` from `env.example`
- The script checks for `$CODESPACES` environment variable

### Secrets Not Available

**Problem:** Secrets aren't showing up as environment variables.

**Solution:**
1. Verify secrets are added to the **repository** (not organization or user)
2. Make sure you're using **Codespaces secrets**, not Actions secrets
3. Restart the Codespace completely
4. Check with: `echo $VB_READ_WRITE_KEY`

### .env File Not Generated

**Problem:** Setup script runs but .env is empty or missing.

**Solution:**
1. Check script has execute permissions: `chmod +x codespaces_setup.sh`
2. Run with bash explicitly: `bash codespaces_setup.sh`
3. Check for error messages in script output

## Security Best Practices

### ✅ Do's

- **Store sensitive data in Codespaces secrets**
- **Use different secrets for development and production**
- **Review .env file before committing** (it's in .gitignore)
- **Rotate API keys periodically**
- **Limit Codespace access to trusted collaborators**

### ❌ Don'ts

- **Don't commit .env files with real credentials**
- **Don't share your Codespace with untrusted users**
- **Don't hardcode API keys in source code**
- **Don't use production keys in Codespaces**

## Manual Configuration

If you prefer not to use the setup script, you can manually create `.env`:

```bash
# Copy example
cp env.example .env

# Edit with your values
nano .env

# Update the required keys
VB_READ_WRITE_KEY=$VB_READ_WRITE_KEY
WEATHER_API_KEY=$WEATHER_API_KEY
```

## Repository vs User vs Organization Secrets

GitHub offers three levels of Codespaces secrets:

- **Repository secrets** (recommended): Available only in this repo's Codespaces
- **User secrets**: Available in all your Codespaces
- **Organization secrets**: Available across organization Codespaces

For this project, use **repository secrets** for best security.

## Updating Secrets

To update a secret:

1. Go to repository **Settings** → **Secrets and variables** → **Codespaces**
2. Find the secret
3. Click **Update**
4. Enter new value
5. Save
6. Restart Codespace or re-run setup script

## Testing the Setup

After running the setup script:

```bash
# Verify .env exists
ls -la .env

# Check API keys are set (first 10 chars only)
grep VB_READ_WRITE_KEY .env
grep WEATHER_API_KEY .env

# Test the configuration
python -c "from src.config import Config; print('✅ Config loaded successfully')"
```

## Alternative: Direct Environment Variables

You can also skip the `.env` file entirely and use environment variables directly:

```bash
# Export in your Codespace terminal
export VB_READ_WRITE_KEY="your-key"
export WEATHER_API_KEY="your-key"
export STAR_TREK_QUOTES_ENABLED="true"

# Run with Docker (env vars will be passed through)
docker-compose -f docker-compose.dev.yml up -d
```

The application checks environment variables first, then falls back to `.env` file.

## Summary

1. **Add secrets** to GitHub repository (Settings → Codespaces)
2. **Launch Codespace** from GitHub
3. **Run setup script**: `./scripts/codespaces_setup.sh`
4. **Verify configuration**: `cat .env`
5. **Run the service**: `docker-compose -f docker-compose.dev.yml up -d`

Your API keys are now secure and automatically available in Codespaces!

