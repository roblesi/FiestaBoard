# Synology Deployment Guide

## Quick Start

Your Vesta application can now be deployed to your Synology NAS with a single command:

```bash
./deploy.sh
```

## What the Script Does

The `deploy.sh` script automates the entire deployment process:

1. **Prerequisites Check**
   - Verifies Docker is running locally
   - Installs `sshpass` if needed (for password-based SSH)
   - Tests SSH connection to your Synology NAS

2. **Build Docker Images**
   - Builds the API image (`vestaboard-api`)
   - Builds the Web UI image (`vestaboard-ui`)

3. **Save Images**
   - Exports images as tar files for transfer

4. **Create Production Configuration**
   - Generates `docker-compose.prod.yml` with custom ports:
     - API: Port **6969**
     - Web UI: Port **4420**
   - Creates production `settings.json` with `"target": "board"` (live mode)

5. **Transfer to Synology**
   - Creates deployment directory: `/volume1/docker/vestaboard`
   - Transfers Docker images
   - Transfers configuration files:
     - `docker-compose.yml`
     - `.env`
     - `data/config.json`
     - `data/settings.json` (production mode)
     - `data/pages.json` (if exists)

6. **Deploy on Synology**
   - Loads Docker images
   - Stops any existing containers
   - Starts new containers with `docker-compose up -d`
   - Cleans up temporary files

7. **Verify Deployment**
   - Checks container status
   - Displays access URLs

## Configuration

All deployment settings are stored in your `.env` file:

```bash
# Synology Deployment Configuration
SYNOLOGY_HOST=192.168.0.2
SYNOLOGY_USER=jeffredod
SYNOLOGY_PASSWORD=4Bwi8UgAo7CA*FB.
SYNOLOGY_SSH_PORT=22
SYNOLOGY_DEPLOY_DIR=/volume1/docker/vestaboard
```

## Access Your Application

After deployment, access your application at:

- **Web UI**: http://192.168.0.2:4420
- **API**: http://192.168.0.2:6969

## Production vs Development Mode

### Development Mode (Local)
- Output target: `"ui"` (simulator in web interface)
- Ports: 3000 (dev server), 8000 (API)
- Hot reload enabled
- Source code mounted

### Production Mode (Synology)
- Output target: `"board"` (actual Vestaboard)
- Ports: 4420 (web UI), 6969 (API)
- Optimized builds
- Data persisted to volumes

## Useful Commands

### View Logs
```bash
ssh jeffredod@192.168.0.2 'cd /volume1/docker/vestaboard && docker-compose logs -f'
```

### Restart Containers
```bash
ssh jeffredod@192.168.0.2 'cd /volume1/docker/vestaboard && docker-compose restart'
```

### Stop Containers
```bash
ssh jeffredod@192.168.0.2 'cd /volume1/docker/vestaboard && docker-compose down'
```

### Check Container Status
```bash
ssh jeffredod@192.168.0.2 'cd /volume1/docker/vestaboard && docker-compose ps'
```

### Redeploy (Full Update)
Just run the deploy script again:
```bash
./deploy.sh
```

## Troubleshooting

### SSH Connection Failed
- Verify SSH is enabled on Synology (Control Panel → Terminal & SNMP → Enable SSH service)
- Check that the IP address is correct: `192.168.0.2`
- Verify credentials in `.env` file

### Port Conflicts
If ports 4420 or 6969 are already in use on Synology:
1. Edit the `API_PORT` and `UI_PORT` variables in `deploy.sh`
2. Redeploy

### Containers Not Starting
```bash
# Check logs for errors
ssh jeffredod@192.168.0.2 'cd /volume1/docker/vestaboard && docker-compose logs'
```

### Vestaboard Not Updating
1. Check that `data/settings.json` has `"target": "board"`
2. Verify Vestaboard API credentials in `.env`
3. Check API logs for errors

## Security Notes

- SSH password is stored in `.env` (make sure `.env` is in `.gitignore`)
- For better security, consider setting up SSH key authentication
- The `.env` file contains sensitive credentials - never commit it to version control

## Next Steps

1. Run `./deploy.sh` to deploy
2. Access the Web UI at http://192.168.0.2:4420
3. Check that your Vestaboard is receiving updates
4. Monitor logs for any issues


