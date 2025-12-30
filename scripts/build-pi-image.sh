#!/bin/bash

# Vesta Raspberry Pi Image Builder
# Creates bootable Raspberry Pi images with Vesta pre-installed

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_header() {
    echo -e "\n${BLUE}===================================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}===================================================${NC}\n"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}→ $1${NC}"
}

# Check arguments
if [ $# -ne 2 ]; then
    print_error "Usage: $0 <arch> <version>"
    print_info "  arch: arm32 or arm64"
    print_info "  version: version number (e.g., 1.2.3)"
    exit 1
fi

ARCH=$1
VERSION=$2

# Validate architecture
if [ "$ARCH" != "arm32" ] && [ "$ARCH" != "arm64" ]; then
    print_error "Invalid architecture: $ARCH (must be arm32 or arm64)"
    exit 1
fi

print_header "Building Vesta Raspberry Pi Image - ${ARCH} - v${VERSION}"

# Determine base image URL
if [ "$ARCH" == "arm32" ]; then
    BASE_IMAGE_URL="https://downloads.raspberrypi.org/raspios_lite_armhf/images/raspios_lite_armhf-2024-11-19/2024-11-19-raspios-bookworm-armhf-lite.img.xz"
    OUTPUT_IMAGE="vesta-pi-arm32-v${VERSION}.img"
else
    BASE_IMAGE_URL="https://downloads.raspberrypi.org/raspios_lite_arm64/images/raspios_lite_arm64-2024-11-19/2024-11-19-raspios-bookworm-arm64-lite.img.xz"
    OUTPUT_IMAGE="vesta-pi-arm64-v${VERSION}.img"
fi

WORK_DIR="/tmp/vesta-pi-build-${ARCH}"
BASE_IMAGE_XZ="${WORK_DIR}/base-image.img.xz"
BASE_IMAGE="${WORK_DIR}/base-image.img"

# Create working directory
print_info "Creating working directory..."
mkdir -p "$WORK_DIR"
cd "$WORK_DIR"

# Download base image
print_info "Downloading Raspberry Pi OS base image..."
if [ ! -f "$BASE_IMAGE_XZ" ]; then
    wget -q --show-progress "$BASE_IMAGE_URL" -O "$BASE_IMAGE_XZ"
    print_success "Base image downloaded"
else
    print_success "Using cached base image"
fi

# Extract base image
print_info "Extracting base image..."
if [ ! -f "$BASE_IMAGE" ]; then
    xz -d -k "$BASE_IMAGE_XZ"
    print_success "Base image extracted"
else
    print_success "Base image already extracted"
fi

# Resize image to add space for Docker and Vesta
print_info "Resizing image to add space for Vesta..."
truncate -s +2G "$BASE_IMAGE"
print_success "Image resized"

# Set up loop device
print_info "Setting up loop device..."
LOOP_DEVICE=$(sudo losetup -f --show -P "$BASE_IMAGE")
print_success "Loop device: $LOOP_DEVICE"

# Resize the partition
print_info "Resizing root partition..."
sudo parted -s "$LOOP_DEVICE" resizepart 2 100%
sudo e2fsck -f -y "${LOOP_DEVICE}p2" || true
sudo resize2fs "${LOOP_DEVICE}p2"
print_success "Root partition resized"

# Mount partitions
BOOT_MOUNT="/mnt/vesta-pi-boot-${ARCH}"
ROOT_MOUNT="/mnt/vesta-pi-root-${ARCH}"

print_info "Creating mount points..."
sudo mkdir -p "$BOOT_MOUNT"
sudo mkdir -p "$ROOT_MOUNT"

print_info "Mounting partitions..."
sudo mount "${LOOP_DEVICE}p2" "$ROOT_MOUNT"
sudo mount "${LOOP_DEVICE}p1" "$BOOT_MOUNT"
print_success "Partitions mounted"

# Create Vesta directory structure
print_info "Creating Vesta directory structure..."
sudo mkdir -p "${ROOT_MOUNT}/opt/vesta"
sudo mkdir -p "${ROOT_MOUNT}/opt/vesta/data"
print_success "Directory structure created"

# Copy configuration files
print_info "Copying Vesta configuration files..."

# Copy docker-compose file (optimized for Pi)
sudo tee "${ROOT_MOUNT}/opt/vesta/docker-compose.yml" > /dev/null << 'EOF'
version: '3.8'

services:
  vestaboard-api:
    image: ghcr.io/roblesi/vesta-api:latest
    container_name: vestaboard-api
    restart: unless-stopped
    ports:
      - "6969:8000"
    volumes:
      - /opt/vesta/data:/app/data
    env_file:
      - /opt/vesta/.env
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

# Copy example config
sudo tee "${ROOT_MOUNT}/opt/vesta/config.example.json" > /dev/null << 'EOF'
{
  "vestaboard": {
    "readWriteKey": "YOUR_READ_WRITE_KEY_HERE"
  }
}
EOF

# Create systemd service
print_info "Creating systemd service..."
sudo tee "${ROOT_MOUNT}/etc/systemd/system/vesta.service" > /dev/null << 'EOF'
[Unit]
Description=Vesta Vestaboard Display Service
Requires=docker.service
After=docker.service network-online.target
Wants=network-online.target

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/opt/vesta
ExecStartPre=/usr/bin/docker-compose -f /opt/vesta/docker-compose.yml pull
ExecStart=/usr/bin/docker-compose -f /opt/vesta/docker-compose.yml up -d
ExecStop=/usr/bin/docker-compose -f /opt/vesta/docker-compose.yml down
Restart=on-failure
RestartSec=10s

[Install]
WantedBy=multi-user.target
EOF
print_success "Systemd service created"

# Create first-boot setup script
print_info "Creating first-boot setup script..."
sudo tee "${ROOT_MOUNT}/opt/vesta/first-boot-setup.sh" > /dev/null << 'EOFSCRIPT'
#!/bin/bash

# Vesta First-Boot Setup Wizard
# This script runs on the first boot to configure Vesta

CONFIG_FILE="/opt/vesta/.env"
SETUP_COMPLETE="/opt/vesta/.setup-complete"

# Check if setup already completed
if [ -f "$SETUP_COMPLETE" ]; then
    exit 0
fi

echo "==============================================="
echo "   Vesta First-Boot Setup Wizard"
echo "==============================================="
echo ""
echo "Welcome to Vesta for Raspberry Pi!"
echo "This wizard will help you configure your Vestaboard display."
echo ""

# Check if config file exists
if [ -f "$CONFIG_FILE" ]; then
    echo "Configuration file already exists at $CONFIG_FILE"
    echo "Skipping setup wizard..."
    touch "$SETUP_COMPLETE"
    exit 0
fi

echo "Please enter your Vestaboard Read/Write Key:"
echo "(You can find this at https://web.vestaboard.com/)"
read -r VB_KEY

echo ""
echo "Please enter your Weather API key (optional, press Enter to skip):"
echo "(Get a free key at https://www.weatherapi.com/)"
read -r WEATHER_KEY

echo ""
echo "Creating configuration file..."

cat > "$CONFIG_FILE" << EOF
# Vesta Configuration for Raspberry Pi

# Vestaboard API Key (Required)
VB_READ_WRITE_KEY=${VB_KEY}

# Weather API Key (Optional)
WEATHER_API_KEY=${WEATHER_KEY}

# Additional configuration
TZ=America/Los_Angeles
EOF

echo "✓ Configuration saved to $CONFIG_FILE"
echo ""
echo "Starting Vesta services..."

cd /opt/vesta
sudo systemctl start vesta

echo ""
echo "==============================================="
echo "   Setup Complete!"
echo "==============================================="
echo ""
echo "Vesta is now running on your Raspberry Pi."
echo ""
echo "Access the web interface at:"
echo "  http://raspberrypi.local:4420"
echo "  or"
echo "  http://$(hostname -I | awk '{print $1}'):4420"
echo ""
echo "You can edit the configuration at any time:"
echo "  sudo nano /opt/vesta/.env"
echo ""
echo "Restart Vesta after configuration changes:"
echo "  sudo systemctl restart vesta"
echo ""

touch "$SETUP_COMPLETE"
EOFSCRIPT

sudo chmod +x "${ROOT_MOUNT}/opt/vesta/first-boot-setup.sh"
print_success "First-boot setup script created"

# Create a README on the boot partition
print_info "Creating README on boot partition..."
sudo tee "${BOOT_MOUNT}/VESTA_README.txt" > /dev/null << 'EOF'
===============================================
   Vesta for Raspberry Pi
===============================================

Thank you for using Vesta!

QUICK START:
1. Boot your Raspberry Pi with this SD card
2. Log in with:
   Username: pi
   Password: raspberry (default - you'll be prompted to change it)

3. Run the setup wizard:
   sudo /opt/vesta/first-boot-setup.sh

4. Access the web interface:
   http://raspberrypi.local:4420

ADVANCED CONFIGURATION:
- Configuration file: /opt/vesta/.env
- Docker Compose file: /opt/vesta/docker-compose.yml
- Service management:
  sudo systemctl status vesta
  sudo systemctl restart vesta
  sudo systemctl stop vesta

DOCUMENTATION:
https://github.com/roblesi/vesta

SUPPORT:
If you need help, please open an issue on GitHub.

===============================================
EOF
print_success "README created"

# Install Docker installation script
print_info "Creating Docker installation script..."
sudo tee "${ROOT_MOUNT}/opt/vesta/install-docker.sh" > /dev/null << 'EOFDOCKER'
#!/bin/bash

# Install Docker and Docker Compose on Raspberry Pi

set -e

echo "Installing Docker..."

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Add pi user to docker group
usermod -aG docker pi

# Install Docker Compose
apt-get update
apt-get install -y docker-compose-plugin

echo "✓ Docker installation complete"

# Enable and start Docker
systemctl enable docker
systemctl start docker

echo "✓ Docker is running"
EOFDOCKER

sudo chmod +x "${ROOT_MOUNT}/opt/vesta/install-docker.sh"
print_success "Docker installation script created"

# Modify /etc/rc.local to run Docker install and first-boot setup on first boot
print_info "Setting up first-boot automation..."
sudo tee -a "${ROOT_MOUNT}/etc/rc.local" > /dev/null << 'EOFRC'

# Vesta first-boot setup
if [ ! -f /opt/vesta/.docker-installed ]; then
    /opt/vesta/install-docker.sh && touch /opt/vesta/.docker-installed
fi

EOFRC
print_success "First-boot automation configured"

# Enable Vesta systemd service (will start after Docker is installed)
print_info "Enabling Vesta service..."
sudo chroot "$ROOT_MOUNT" systemctl enable vesta || true
print_success "Vesta service enabled"

# Clean up and unmount
print_info "Cleaning up..."
sudo sync
sudo umount "$BOOT_MOUNT"
sudo umount "$ROOT_MOUNT"
sudo losetup -d "$LOOP_DEVICE"
sudo rm -rf "$BOOT_MOUNT"
sudo rm -rf "$ROOT_MOUNT"
print_success "Cleanup complete"

# Copy final image to output location
print_info "Copying final image..."
cp "$BASE_IMAGE" "${OUTPUT_IMAGE}"
print_success "Image copied to ${OUTPUT_IMAGE}"

# Compress image
print_info "Compressing image..."
gzip -9 "${OUTPUT_IMAGE}"
print_success "Image compressed to ${OUTPUT_IMAGE}.gz"

# Move to workspace root
mv "${OUTPUT_IMAGE}.gz" "/github/workspace/${OUTPUT_IMAGE}.gz" 2>/dev/null || \
mv "${OUTPUT_IMAGE}.gz" "${OLDPWD}/${OUTPUT_IMAGE}.gz" 2>/dev/null || \
mv "${OUTPUT_IMAGE}.gz" "$(pwd)/../${OUTPUT_IMAGE}.gz"

print_header "✓ Build Complete!"
echo ""
echo "Output: ${OUTPUT_IMAGE}.gz"
echo "Size: $(du -h "${OUTPUT_IMAGE}.gz" 2>/dev/null | cut -f1 || echo 'N/A')"
echo ""
echo "Flash this image to an SD card using:"
echo "  - Raspberry Pi Imager: https://www.raspberrypi.com/software/"
echo "  - Balena Etcher: https://etcher.balena.io/"
echo ""

