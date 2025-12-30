# Raspberry Pi Quick Start Guide

This guide will help you get Vesta running on your Raspberry Pi in under 15 minutes.

## What You'll Need

### Hardware
- **Raspberry Pi** (one of the following):
  - Raspberry Pi 3 Model B+ (1GB RAM) - *Minimum*
  - Raspberry Pi 4 (2GB+ RAM) - *Recommended*
  - Raspberry Pi 5 (4GB+ RAM) - *Best performance*
  - Raspberry Pi Zero 2 W (512MB RAM) - *Budget option, limited performance*
- **MicroSD Card** - 8GB minimum, 16GB+ recommended
- **Power Supply** - Official Raspberry Pi power supply recommended
- **Network Connection** - Ethernet cable or WiFi

### Software
- **Raspberry Pi Imager** (download from [raspberrypi.com/software](https://www.raspberrypi.com/software/))
  - Or **Balena Etcher** (download from [etcher.balena.io](https://etcher.balena.io/))

### API Keys
- **Vestaboard Read/Write Key** - Get from [web.vestaboard.com](https://web.vestaboard.com/)
- **Weather API Key** (optional) - Get from [weatherapi.com](https://www.weatherapi.com/)

---

## Method 1: Pre-Built Image (Recommended)

The easiest way to get started - just flash and boot!

### Step 1: Download the Image

1. Go to the [Vesta Releases page](https://github.com/roblesi/vesta/releases/latest)
2. Download the appropriate image for your Pi model:
   - **Raspberry Pi 3B+, Zero 2W**: `vesta-pi-arm32-vX.X.X.img.gz`
   - **Raspberry Pi 4, Pi 5**: `vesta-pi-arm64-vX.X.X.img.gz`

### Step 2: Flash the Image

**Using Raspberry Pi Imager (Recommended):**

1. Open Raspberry Pi Imager
2. Click **"Choose Device"** → Select your Pi model
3. Click **"Choose OS"** → **"Use custom"** → Select the downloaded `.img.gz` file
4. Click **"Choose Storage"** → Select your SD card
5. Click **"Next"** 
6. When asked about OS customisation, click **"No"** (we'll configure later)
7. Click **"Yes"** to write the image
8. Wait for the write and verification to complete

**Using Balena Etcher:**

1. Open Balena Etcher
2. Click **"Flash from file"** → Select the downloaded `.img.gz` file
3. Click **"Select target"** → Select your SD card
4. Click **"Flash!"**
5. Wait for the write and verification to complete

### Step 3: Boot Your Raspberry Pi

1. Insert the SD card into your Raspberry Pi
2. Connect Ethernet cable (or have WiFi credentials ready)
3. Connect power supply
4. Wait 2-3 minutes for first boot (Docker installation happens automatically)

### Step 4: Access and Configure

**Find your Pi's IP address:**

```bash
# From your computer, try accessing via hostname:
ping raspberrypi.local

# Or use your router's admin panel to find the Pi's IP address
```

**SSH into your Pi:**

```bash
ssh pi@raspberrypi.local
# Default password: raspberry
```

**Run the setup wizard:**

```bash
sudo /opt/vesta/first-boot-setup.sh
```

Follow the prompts to enter:
- Your Vestaboard Read/Write Key
- Weather API Key (optional)

**Access the Web UI:**

Open your browser and go to:
- `http://raspberrypi.local:4420`
- Or `http://YOUR_PI_IP_ADDRESS:4420`

---

## Method 2: Docker Installation (Manual)

If you already have Raspberry Pi OS running, you can install Vesta using Docker.

### Prerequisites

1. Raspberry Pi running Raspberry Pi OS (Lite or Desktop)
2. Docker and Docker Compose installed
3. Internet connection

### Install Docker (if not installed)

```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add your user to the docker group
sudo usermod -aG docker $USER

# Install Docker Compose plugin
sudo apt-get update
sudo apt-get install -y docker-compose-plugin

# Log out and back in for group changes to take effect
```

### Install Vesta

```bash
# Create Vesta directory
sudo mkdir -p /opt/vesta
cd /opt/vesta

# Create docker-compose.yml
sudo tee docker-compose.yml > /dev/null << 'EOF'
version: '3.8'

services:
  vestaboard-api:
    image: ghcr.io/roblesi/vesta-api:latest
    container_name: vestaboard-api
    restart: unless-stopped
    ports:
      - "6969:8000"
    volumes:
      - ./data:/app/data
    env_file:
      - .env
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

  vestaboard-ui:
    image: ghcr.io/roblesi/vesta-ui:latest
    container_name: vestaboard-ui
    restart: unless-stopped
    ports:
      - "4420:3000"
    environment:
      - VESTA_API_URL=http://localhost:6969
    depends_on:
      - vestaboard-api
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
EOF

# Create .env file with your configuration
sudo nano .env
```

Add to `.env`:

```bash
# Vestaboard API Key (Required)
VB_READ_WRITE_KEY=your_key_here

# Weather API Key (Optional)
WEATHER_API_KEY=your_key_here

# Timezone
TZ=America/Los_Angeles
```

Save and exit (`Ctrl+X`, then `Y`, then `Enter`).

### Start Vesta

```bash
# Pull images
sudo docker-compose pull

# Start services
sudo docker-compose up -d

# Check status
sudo docker-compose ps

# View logs
sudo docker-compose logs -f
```

### Set Up Auto-Start on Boot

```bash
# Create systemd service
sudo tee /etc/systemd/system/vesta.service > /dev/null << 'EOF'
[Unit]
Description=Vesta Vestaboard Display Service
Requires=docker.service
After=docker.service network-online.target
Wants=network-online.target

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/opt/vesta
ExecStart=/usr/bin/docker-compose -f /opt/vesta/docker-compose.yml up -d
ExecStop=/usr/bin/docker-compose -f /opt/vesta/docker-compose.yml down
Restart=on-failure

[Install]
WantedBy=multi-user.target
EOF

# Enable the service
sudo systemctl enable vesta
sudo systemctl start vesta
```

---

## Configuration

### Accessing Configuration Files

```bash
# Main configuration
sudo nano /opt/vesta/.env

# Docker Compose configuration
sudo nano /opt/vesta/docker-compose.yml

# Vesta page configuration
sudo nano /opt/vesta/data/config.json
```

### Restarting After Configuration Changes

```bash
sudo systemctl restart vesta

# Or using docker-compose directly:
cd /opt/vesta
sudo docker-compose restart
```

### Updating to Latest Version

```bash
cd /opt/vesta
sudo docker-compose pull
sudo docker-compose down
sudo docker-compose up -d
```

---

## Troubleshooting

### Can't Access Web UI

**Check if containers are running:**

```bash
sudo docker-compose ps
```

All containers should show "Up" status.

**Check container logs:**

```bash
# API logs
sudo docker-compose logs vestaboard-api

# UI logs
sudo docker-compose logs vestaboard-ui
```

**Check network connectivity:**

```bash
# Test API from Pi itself
curl http://localhost:6969/health

# Check what's listening on port 4420
sudo netstat -tlnp | grep 4420
```

### Containers Keep Restarting

**Check API configuration:**

```bash
# View API logs
sudo docker-compose logs vestaboard-api

# Common issues:
# - Invalid VB_READ_WRITE_KEY
# - Missing required configuration
```

**Verify .env file:**

```bash
cat /opt/vesta/.env
```

Make sure `VB_READ_WRITE_KEY` is set correctly.

### Performance Issues on Pi 3B+

The Pi 3B+ has limited RAM (1GB). To improve performance:

**Increase swap space:**

```bash
sudo dphys-swapfile swapoff
sudo nano /etc/dphys-swapfile
# Change CONF_SWAPSIZE=100 to CONF_SWAPSIZE=2048
sudo dphys-swapfile setup
sudo dphys-swapfile swapon
```

**Reduce refresh frequency:**

Edit your page configuration to update less frequently:

```bash
sudo nano /opt/vesta/data/config.json
```

**Consider upgrading to Pi 4:**

Pi 4 with 2GB+ RAM provides significantly better performance.

### SD Card Full

**Check disk usage:**

```bash
df -h
du -sh /opt/vesta/data/*
```

**Clean up Docker:**

```bash
# Remove old images
sudo docker image prune -a

# Remove unused volumes
sudo docker volume prune

# Clean logs
sudo rm -f /opt/vesta/data/logs/*.log
```

### Unable to Connect to Vestaboard

**Test API key:**

```bash
# From your Pi, test the API connection
curl -X POST https://rw.vestaboard.com/ \
  -H "X-Vestaboard-Read-Write-Key: YOUR_KEY_HERE" \
  -H "Content-Type: application/json" \
  -d '[[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]]'
```

If this fails, check your API key at [web.vestaboard.com](https://web.vestaboard.com/).

---

## Performance Recommendations

### By Model

| Model | RAM | Performance | Recommendation |
|-------|-----|-------------|----------------|
| Pi Zero 2W | 512MB | Basic | OK for simple displays, may struggle with multiple features |
| Pi 3B+ | 1GB | Good | Works well for most use cases, increase swap if needed |
| Pi 4 (2GB) | 2GB | Great | Recommended for reliable performance |
| Pi 4 (4GB+) | 4GB+ | Excellent | Best experience, handles all features smoothly |
| Pi 5 (4GB+) | 4GB+ | Excellent | Fastest performance, future-proof |

### Optimization Tips

1. **Use Ethernet** instead of WiFi for better reliability
2. **Use high-quality SD card** (Class 10, UHS-1 or better)
3. **Keep system updated**: `sudo apt-get update && sudo apt-get upgrade`
4. **Monitor temperature**: Install `vcgencmd` and check with `vcgencmd measure_temp`
5. **Use proper cooling** - Heat sinks and/or fan recommended for Pi 4/5

---

## Next Steps

- **Configure your pages**: Use the web UI to set up your display pages
- **Add features**: Weather, transit, calendar, etc. - see [Feature Setup Guides](../features/)
- **Customize**: Edit templates, adjust refresh rates, set up schedules
- **Join the community**: Check out [GitHub Discussions](https://github.com/roblesi/vesta/discussions)

---

## Additional Resources

- [Main README](../../README.md) - Project overview and features
- [GitHub Registry Setup](GITHUB_REGISTRY_SETUP.md) - Advanced deployment options
- [Feature Setup Guides](../features/) - Configure specific features
- [API Documentation](../reference/API_RESEARCH.md) - API integration details

---

## Support

If you encounter issues not covered in this guide:

1. Check [GitHub Issues](https://github.com/roblesi/vesta/issues)
2. Search [GitHub Discussions](https://github.com/roblesi/vesta/discussions)
3. Open a new issue with:
   - Your Pi model
   - Raspberry Pi OS version (`cat /etc/os-release`)
   - Docker version (`docker --version`)
   - Relevant logs (`sudo docker-compose logs`)

