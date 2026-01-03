#!/bin/bash

# FiestaBoard GHCR Deployment Script
# This script deploys FiestaBoard to Synology NAS using pre-built images from GitHub Container Registry

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
    print_info "Please create a .env file with your configuration"
    exit 1
fi

# Load Synology-specific variables from .env
load_env_var() {
    local var_name=$1
    local default_value=$2
    local value=$(grep "^${var_name}=" .env 2>/dev/null | cut -d '=' -f 2- | tr -d '\r')
    echo "${value:-$default_value}"
}

# Synology configuration
SYNOLOGY_HOST=$(load_env_var "SYNOLOGY_HOST" "192.168.0.2")
SYNOLOGY_USER=$(load_env_var "SYNOLOGY_USER" "jeffredod")
SYNOLOGY_SSH_PORT=$(load_env_var "SYNOLOGY_SSH_PORT" "22")
SYNOLOGY_DEPLOY_DIR=$(load_env_var "SYNOLOGY_DEPLOY_DIR" "~/fiestaboard")

# GitHub Container Registry
GITHUB_USER="roblesi"
GITHUB_TOKEN=$(load_env_var "GITHUB_TOKEN" "")

# Ports
API_PORT=6969
UI_PORT=4420

print_header "FiestaBoard GHCR Deployment to Synology"

echo "Configuration:"
echo "  Synology Host: $SYNOLOGY_HOST"
echo "  Synology User: $SYNOLOGY_USER"
echo "  SSH Port: $SYNOLOGY_SSH_PORT"
echo "  Deploy Directory: $SYNOLOGY_DEPLOY_DIR"
echo "  API Port: $API_PORT"
echo "  UI Port: $UI_PORT"
echo ""

# Check if GitHub token is set
if [ -z "$GITHUB_TOKEN" ]; then
    print_error "GITHUB_TOKEN not found in .env file"
    print_info "Please add GITHUB_TOKEN to your .env file"
    print_info "Create a token at: https://github.com/settings/tokens"
    print_info "Token needs 'read:packages' permission"
    exit 1
fi

# Ask for confirmation
read -p "Proceed with deployment? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    print_info "Deployment cancelled."
    exit 0
fi

# Load Synology password for sudo commands
SYNOLOGY_PASSWORD=$(load_env_var "SYNOLOGY_PASSWORD" "")

# Docker paths on Synology
DOCKER_BIN="/usr/local/bin/docker"
DOCKER_COMPOSE_BIN="/usr/local/bin/docker-compose"

# Helper function to run SSH commands
ssh_exec() {
    local cmd="$1"
    ssh -o StrictHostKeyChecking=no -p "$SYNOLOGY_SSH_PORT" "$SYNOLOGY_USER@$SYNOLOGY_HOST" "$cmd"
}

# Helper function to run SSH commands with sudo
ssh_sudo_exec() {
    local cmd="$1"
    if [ -n "$SYNOLOGY_PASSWORD" ]; then
        ssh -o StrictHostKeyChecking=no -p "$SYNOLOGY_SSH_PORT" "$SYNOLOGY_USER@$SYNOLOGY_HOST" "echo '$SYNOLOGY_PASSWORD' | sudo -S sh -c '$cmd' 2>&1"
    else
        ssh -o StrictHostKeyChecking=no -p "$SYNOLOGY_SSH_PORT" "$SYNOLOGY_USER@$SYNOLOGY_HOST" "sudo sh -c '$cmd' 2>&1"
    fi
}

# Helper function to run SCP
scp_exec() {
    local source="$1"
    local dest="$2"
    scp -O -P "$SYNOLOGY_SSH_PORT" -o StrictHostKeyChecking=no "$source" "$SYNOLOGY_USER@$SYNOLOGY_HOST:$dest"
}

# Step 1: Check SSH connectivity
print_header "Step 1: Checking SSH Connectivity"

if ssh -o BatchMode=yes -o ConnectTimeout=5 -p "$SYNOLOGY_SSH_PORT" "$SYNOLOGY_USER@$SYNOLOGY_HOST" "echo 'Connected'" > /dev/null 2>&1; then
    print_success "SSH connection successful"
else
    print_error "SSH connection failed"
    print_info "Please ensure SSH keys are set up or use ssh-copy-id"
    exit 1
fi

# Step 2: Create deployment directory
print_header "Step 2: Setting Up Deployment Directory"

ssh_exec "mkdir -p $SYNOLOGY_DEPLOY_DIR/data"
print_success "Deployment directory ready"

# Step 3: Transfer configuration files
print_header "Step 3: Transferring Configuration Files"

print_info "Transferring docker-compose.ghcr.yml..."
scp_exec "docker-compose.ghcr.yml" "$SYNOLOGY_DEPLOY_DIR/docker-compose.yml"
print_success "docker-compose.yml transferred"

print_info "Transferring .env file..."
scp_exec ".env" "$SYNOLOGY_DEPLOY_DIR/"
print_success ".env file transferred"

# Check if user data already exists on NAS
print_info "Checking for existing user data on NAS..."
REMOTE_PAGES_EXISTS=$(ssh_exec "[ -f $SYNOLOGY_DEPLOY_DIR/data/pages.json ] && echo 'yes' || echo 'no'")
REMOTE_CONFIG_EXISTS=$(ssh_exec "[ -f $SYNOLOGY_DEPLOY_DIR/data/config.json ] && echo 'yes' || echo 'no'")
REMOTE_SETTINGS_EXISTS=$(ssh_exec "[ -f $SYNOLOGY_DEPLOY_DIR/data/settings.json ] && echo 'yes' || echo 'no'")

# Transfer config.json only if it doesn't exist on NAS (first-time setup)
if [ "$REMOTE_CONFIG_EXISTS" = "no" ]; then
    if [ -f data/config.json ]; then
        print_info "Transferring initial config.json..."
        scp_exec "data/config.json" "$SYNOLOGY_DEPLOY_DIR/data/"
        print_success "Initial config.json transferred"
    fi
else
    print_info "Preserving existing config.json on NAS"
fi

# NEVER transfer pages.json from local - it contains dev data
# Production pages are managed through the Web UI on NAS
if [ "$REMOTE_PAGES_EXISTS" = "no" ]; then
    print_info "No pages.json found on NAS - will be created automatically on first run"
else
    print_info "Preserving existing pages.json on NAS (your custom pages)"
fi

# Create production settings.json ONLY if it doesn't exist (first-time setup)
if [ "$REMOTE_SETTINGS_EXISTS" = "no" ]; then
    print_info "Creating initial production settings.json..."
    ssh_exec "cat > $SYNOLOGY_DEPLOY_DIR/data/settings.json << 'EOF'
{
  \"transitions\": {
    \"strategy\": null,
    \"step_interval_ms\": null,
    \"step_size\": null
  },
  \"output\": {
    \"target\": \"board\"
  },
  \"active_page\": {
    \"page_id\": null
  },
  \"polling\": {
    \"interval_seconds\": 60
  },
  \"board\": {
    \"board_type\": \"black\"
  }
}
EOF"
    print_success "Initial production settings.json created"
else
    print_info "Preserving existing settings.json on NAS (your active page selection)"
fi

# Step 4: Login to GitHub Container Registry
print_header "Step 4: Authenticating with GitHub Container Registry"

ssh_sudo_exec "echo '$GITHUB_TOKEN' | $DOCKER_BIN login ghcr.io -u '$GITHUB_USER' --password-stdin"
print_success "Authenticated with GHCR"

# Step 5: Deploy containers
print_header "Step 5: Deploying Containers"

print_info "Pulling latest images from GHCR..."
ssh_sudo_exec "cd $SYNOLOGY_DEPLOY_DIR && $DOCKER_COMPOSE_BIN pull"
print_success "Images pulled"

print_info "Stopping existing containers..."
ssh_sudo_exec "cd $SYNOLOGY_DEPLOY_DIR && $DOCKER_COMPOSE_BIN down 2>/dev/null || true"
print_success "Existing containers stopped"

print_info "Starting containers..."
ssh_sudo_exec "cd $SYNOLOGY_DEPLOY_DIR && $DOCKER_COMPOSE_BIN up -d"
print_success "Containers started"

# Step 6: Verify deployment
print_header "Step 6: Verifying Deployment"

sleep 5  # Give containers time to start

print_info "Checking container status..."
ssh_sudo_exec "cd $SYNOLOGY_DEPLOY_DIR && $DOCKER_COMPOSE_BIN ps"

# Final summary
print_header "Deployment Complete!"

echo -e "${GREEN}Your FiestaBoard application is now running on Synology!${NC}"
echo ""
echo "Access URLs:"
echo -e "  ${BLUE}Web UI:${NC}  http://$SYNOLOGY_HOST:$UI_PORT"
echo -e "  ${BLUE}API:${NC}     http://$SYNOLOGY_HOST:$API_PORT"
echo ""
echo "To update to latest version:"
echo "  1. Go to Synology Container Manager"
echo "  2. Select the containers"
echo "  3. Click 'Action' → 'Update'"
echo ""
echo "Or run this script again to pull and restart with latest images."
echo ""
echo -e "${YELLOW}Note: The output target is set to 'board' (production mode).${NC}"
echo -e "${YELLOW}Your Vestaboard should start receiving updates automatically.${NC}"
echo ""
echo -e "${GREEN}✓ User data preserved:${NC} Your custom pages and settings were not modified."
