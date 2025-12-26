#!/bin/bash

# Vesta Synology Deployment Script
# This script builds Docker images locally, transfers them to Synology NAS,
# and deploys the containers with production configuration.

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Print functions
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

# Load environment variables from .env
if [ ! -f .env ]; then
    print_error ".env file not found!"
    exit 1
fi

# Load Synology-specific variables from .env
load_env_var() {
    local var_name=$1
    local default_value=$2
    local value=$(grep "^${var_name}=" .env 2>/dev/null | cut -d '=' -f 2- | tr -d '\r')
    echo "${value:-$default_value}"
}

# Synology configuration - read from .env or use defaults
SYNOLOGY_HOST=$(load_env_var "SYNOLOGY_HOST" "192.168.0.2")
SYNOLOGY_USER=$(load_env_var "SYNOLOGY_USER" "jeffredod")
SYNOLOGY_PASSWORD=$(load_env_var "SYNOLOGY_PASSWORD" "4Bwi8UgAo7CA*FB.")
SYNOLOGY_SSH_PORT=$(load_env_var "SYNOLOGY_SSH_PORT" "22")
SYNOLOGY_DEPLOY_DIR=$(load_env_var "SYNOLOGY_DEPLOY_DIR" "~/vestaboard")

# Docker image names
API_IMAGE="vestaboard-api"
UI_IMAGE="vestaboard-ui"
API_TAR="vestaboard-api.tar"
UI_TAR="vestaboard-ui.tar"

# Ports for Synology deployment
API_PORT=6969
UI_PORT=4420

print_header "Vesta Synology Deployment"

echo "Configuration:"
echo "  Synology Host: $SYNOLOGY_HOST"
echo "  Synology User: $SYNOLOGY_USER"
echo "  SSH Port: $SYNOLOGY_SSH_PORT"
echo "  Deploy Directory: $SYNOLOGY_DEPLOY_DIR"
echo "  API Port: $API_PORT"
echo "  UI Port: $UI_PORT"
echo ""

# Ask for confirmation
read -p "Proceed with deployment? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    print_info "Deployment cancelled."
    exit 0
fi

# Helper function to run SSH commands (using SSH keys)
ssh_exec() {
    local cmd="$1"
    ssh -o StrictHostKeyChecking=no -p "$SYNOLOGY_SSH_PORT" "$SYNOLOGY_USER@$SYNOLOGY_HOST" "$cmd"
}

# Helper function to run SCP (using SSH keys and legacy protocol)
scp_exec() {
    local source="$1"
    local dest="$2"
    scp -O -P "$SYNOLOGY_SSH_PORT" -o StrictHostKeyChecking=no "$source" "$SYNOLOGY_USER@$SYNOLOGY_HOST:$dest"
}

# Step 1: Check prerequisites
print_header "Step 1: Checking Prerequisites"

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    print_error "Docker is not running. Please start Docker and try again."
    exit 1
fi
print_success "Docker is running"

# Check if SSH keys are set up, if not, set them up
print_info "Checking SSH key authentication..."
if ssh -o BatchMode=yes -o ConnectTimeout=5 -p "$SYNOLOGY_SSH_PORT" "$SYNOLOGY_USER@$SYNOLOGY_HOST" "echo 'SSH key works'" > /dev/null 2>&1; then
    print_success "SSH key authentication is set up"
    USE_SSH_KEYS=true
else
    print_info "SSH keys not configured. Setting up SSH key authentication..."
    
    # Generate SSH key if it doesn't exist
    if [ ! -f ~/.ssh/id_rsa ]; then
        print_info "Generating SSH key..."
        ssh-keygen -t rsa -b 4096 -f ~/.ssh/id_rsa -N "" -q
        print_success "SSH key generated"
    fi
    
    # Copy SSH key to Synology
    print_info "Copying SSH key to Synology (you'll need to enter your password once)..."
    if ! command -v expect &> /dev/null; then
        print_error "expect is not installed. Please run: brew install expect"
        exit 1
    fi
    
    # Use expect to automate ssh-copy-id
    expect << KEYSETUP
        set timeout 30
        spawn ssh-copy-id -p $SYNOLOGY_SSH_PORT $SYNOLOGY_USER@$SYNOLOGY_HOST
        expect {
            "*password:*" {
                send "$SYNOLOGY_PASSWORD\r"
                exp_continue
            }
            "*Now try logging into*" {
                puts "SSH key copied successfully"
            }
            "ERROR*" {
                puts "Failed to copy SSH key"
                exit 1
            }
            timeout {
                puts "Timeout waiting for ssh-copy-id"
                exit 1
            }
        }
        expect eof
KEYSETUP
    
    if [ $? -eq 0 ]; then
        print_success "SSH key authentication set up successfully"
        USE_SSH_KEYS=true
    else
        print_error "Failed to set up SSH keys. Please check your password and try again."
        exit 1
    fi
fi

# Step 2: Build Docker images
print_header "Step 2: Building Docker Images"

print_info "Building API image for linux/amd64..."
docker build --platform linux/amd64 --progress=plain -f Dockerfile.api -t $API_IMAGE .
print_success "API image built"

print_info "Building UI image for linux/amd64 (this may take several minutes)..."
docker build --platform linux/amd64 --build-arg NEXT_PUBLIC_API_URL=http://$SYNOLOGY_HOST:$API_PORT --progress=plain -f Dockerfile.ui -t $UI_IMAGE .
print_success "UI image built"

# Step 3: Save images as tar files
print_header "Step 3: Saving Images as TAR Files"

print_info "Saving API image to $API_TAR..."
docker save -o $API_TAR $API_IMAGE
print_success "API image saved"

print_info "Saving UI image to $UI_TAR..."
docker save -o $UI_TAR $UI_IMAGE
print_success "UI image saved"

# Step 4: Create production docker-compose file with custom ports
print_header "Step 4: Creating Production Docker Compose File"

cat > docker-compose.prod.yml << 'COMPOSE_EOF'
version: '3.8'

services:
  # API Service - REST API for controlling the Vestaboard display
  vestaboard-api:
    image: vestaboard-api
    container_name: vestaboard-api
    env_file:
      - .env
    restart: unless-stopped
    ports:
      - "API_PORT_PLACEHOLDER:8000"
    volumes:
      # Persist data (including config) to local filesystem
      - ./data:/app/data
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
    healthcheck:
      test: ["CMD", "python", "-c", "import requests; requests.get('http://localhost:8000/health', timeout=5)"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 5s

  # Web UI - Monitoring and control interface
  vestaboard-ui:
    image: vestaboard-ui
    container_name: vestaboard-ui
    restart: unless-stopped
    ports:
      - "UI_PORT_PLACEHOLDER:3000"
    environment:
      - NEXT_PUBLIC_API_URL=http://SYNOLOGY_HOST_PLACEHOLDER:API_PORT_PLACEHOLDER
    depends_on:
      - vestaboard-api
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:3000/"]
      interval: 30s
      timeout: 3s
      retries: 3
      start_period: 5s
COMPOSE_EOF

# Replace placeholders with actual values
sed -i '' "s/API_PORT_PLACEHOLDER/$API_PORT/g" docker-compose.prod.yml
sed -i '' "s/UI_PORT_PLACEHOLDER/$UI_PORT/g" docker-compose.prod.yml
sed -i '' "s/SYNOLOGY_HOST_PLACEHOLDER/$SYNOLOGY_HOST/g" docker-compose.prod.yml

print_success "Production docker-compose file created"

# Step 5: Create production settings.json with board output
print_header "Step 5: Creating Production Settings"

mkdir -p data
cat > data/settings.prod.json << EOF
{
  "transitions": {
    "strategy": null,
    "step_interval_ms": null,
    "step_size": null
  },
  "output": {
    "target": "board"
  },
  "active_page": {
    "page_id": "f5f9d20b-9d97-4c82-aa37-a7169399cee5"
  }
}
EOF

print_success "Production settings.json created"

# Step 6: Transfer files to Synology
print_header "Step 6: Transferring Files to Synology"

# Create deployment directory on Synology (if it doesn't exist)
print_info "Ensuring deployment directory exists on Synology..."
ssh_exec "mkdir -p $SYNOLOGY_DEPLOY_DIR/data"
print_success "Deployment directory ready"

# Transfer Docker images
print_info "Transferring API image (this may take a few minutes)..."
scp_exec "$API_TAR" "$SYNOLOGY_DEPLOY_DIR/"
print_success "API image transferred"

print_info "Transferring UI image (this may take a few minutes)..."
scp_exec "$UI_TAR" "$SYNOLOGY_DEPLOY_DIR/"
print_success "UI image transferred"

# Transfer docker-compose file
print_info "Transferring docker-compose file..."
scp_exec "docker-compose.prod.yml" "$SYNOLOGY_DEPLOY_DIR/docker-compose.yml"
print_success "docker-compose file transferred"

# Transfer .env file
print_info "Transferring .env file..."
scp_exec ".env" "$SYNOLOGY_DEPLOY_DIR/"
print_success ".env file transferred"

# Transfer config files
print_info "Transferring config files..."
scp_exec "data/config.json" "$SYNOLOGY_DEPLOY_DIR/data/"
scp_exec "data/settings.prod.json" "$SYNOLOGY_DEPLOY_DIR/data/settings.json"

# Transfer pages.json if it exists
if [ -f data/pages.json ]; then
    scp_exec "data/pages.json" "$SYNOLOGY_DEPLOY_DIR/data/"
fi
print_success "Config files transferred"

# Step 7: Deploy on Synology
print_header "Step 7: Deploying Containers on Synology"

print_info "Loading Docker images on Synology..."
print_info "Loading API image..."
ssh_exec "cd $SYNOLOGY_DEPLOY_DIR && sudo /usr/local/bin/docker load -i $API_TAR"
print_info "Loading UI image..."
ssh_exec "cd $SYNOLOGY_DEPLOY_DIR && sudo /usr/local/bin/docker load -i $UI_TAR"
ssh_exec "cd $SYNOLOGY_DEPLOY_DIR && rm -f $API_TAR $UI_TAR"
print_success "Docker images loaded"

print_info "Stopping existing containers (if any)..."
ssh_exec "cd $SYNOLOGY_DEPLOY_DIR && sudo /usr/local/bin/docker-compose down 2>/dev/null || true"
print_success "Existing containers stopped"

print_info "Starting containers..."
ssh_exec "cd $SYNOLOGY_DEPLOY_DIR && sudo /usr/local/bin/docker-compose up -d"
print_success "Containers started"

# Step 8: Verify deployment
print_header "Step 8: Verifying Deployment"

sleep 5  # Give containers time to start

print_info "Checking container status..."
ssh_exec "cd $SYNOLOGY_DEPLOY_DIR && sudo /usr/local/bin/docker-compose ps"

# Clean up local tar files
print_info "Cleaning up local tar files..."
rm -f $API_TAR $UI_TAR docker-compose.prod.yml data/settings.prod.json
print_success "Local cleanup complete"

# Final summary
print_header "Deployment Complete!"

echo -e "${GREEN}Your Vesta application is now running on Synology!${NC}"
echo ""
echo "Access URLs:"
echo -e "  ${BLUE}Web UI:${NC}  http://$SYNOLOGY_HOST:$UI_PORT"
echo -e "  ${BLUE}API:${NC}     http://$SYNOLOGY_HOST:$API_PORT"
echo ""
echo "Useful commands:"
echo "  View logs:     ssh $SYNOLOGY_USER@$SYNOLOGY_HOST 'cd $SYNOLOGY_DEPLOY_DIR && sudo /usr/local/bin/docker-compose logs -f'"
echo "  Restart:       ssh $SYNOLOGY_USER@$SYNOLOGY_HOST 'cd $SYNOLOGY_DEPLOY_DIR && sudo /usr/local/bin/docker-compose restart'"
echo "  Stop:          ssh $SYNOLOGY_USER@$SYNOLOGY_HOST 'cd $SYNOLOGY_DEPLOY_DIR && sudo /usr/local/bin/docker-compose down'"
echo ""
echo -e "${YELLOW}Note: The output target is set to 'board' (production mode).${NC}"
echo -e "${YELLOW}Your Vestaboard should start receiving updates automatically.${NC}"

