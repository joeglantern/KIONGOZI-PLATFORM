#!/bin/bash

# Kiongozi Web App Deployment (Web App Only - No Mobile Dependencies)

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Config
REPO_URL="https://github.com/joeglantern/KIONGOZI-PLATFORM.git"
DEPLOY_DIR="$HOME/kiongozi-web"
APP_PORT=3003
APP_NAME="kiongozi-chat"

echo ""
log_info "========================================="
log_info "  Kiongozi Web App Deployment"
log_info "========================================="
echo ""

# Step 1: Clone or update repo
log_info "Step 1: Getting latest code..."
if [ -d "$DEPLOY_DIR" ]; then
    cd "$DEPLOY_DIR"
    git pull origin main
    log_success "Code updated"
else
    cd "$HOME"
    git clone "$REPO_URL" kiongozi-web
    cd "$DEPLOY_DIR"
    log_success "Code cloned"
fi

# Step 2: Create .env.local (web app only)
log_info "Step 2: Creating environment file..."
cat > .env.local << 'ENVEOF'
NEXT_PUBLIC_SUPABASE_URL=https://jdncfyagppohtksogzkx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpkbmNmeWFncHBvaHRrc29nemt4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ2ODg3NzgsImV4cCI6MjA3MDI2NDc3OH0.mQwRTAu2UYwsF_cmlIQLVVVuCTDMHjsBrxWdWPMQMFQ
NEXT_PUBLIC_API_URL=http://156.67.25.84:3001/api/v1
ENVEOF
log_success "Environment file created"

# Step 3: Install ONLY web app dependencies (exclude mobile workspaces)
log_info "Step 3: Installing web app dependencies..."

# Create temporary package.json without mobile workspaces
if [ -f "package.json" ]; then
    # Remove workspace references to avoid mobile app dependencies
    npm install --legacy-peer-deps --workspace-root=false 2>/dev/null || npm install --legacy-peer-deps
fi

log_success "Dependencies installed"

# Step 4: Build Next.js app
log_info "Step 4: Building Next.js app..."
export NEXT_PUBLIC_SUPABASE_URL="https://jdncfyagppohtksogzkx.supabase.co"
export NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpkbmNmeWFncHBvaHRrc29nemt4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ2ODg3NzgsImV4cCI6MjA3MDI2NDc3OH0.mQwRTAu2UYwsF_cmlIQLVVVuCTDMHjsBrxWdWPMQMFQ"
export NEXT_PUBLIC_API_URL="http://156.67.25.84:3001/api/v1"

npm run build
log_success "Build complete"

# Step 5: Start with PM2
log_info "Step 5: Starting app with PM2..."

# Stop existing
pm2 stop $APP_NAME 2>/dev/null || true
pm2 delete $APP_NAME 2>/dev/null || true

# Start new
pm2 start npm --name "$APP_NAME" -- start -- -p $APP_PORT
pm2 save

log_success "App started on port $APP_PORT"

# Step 6: Show Nginx setup
echo ""
log_info "========================================="
log_success "Deployment Complete!"
log_info "========================================="
echo ""
echo "App is running on port $APP_PORT"
echo ""
echo "To make it accessible from the internet, run:"
echo ""
echo "sudo bash -c 'cat > /etc/nginx/sites-available/kiongozi << \"NGINXEOF\"
server {
    listen 80;
    server_name _;
    location / {
        proxy_pass http://localhost:3003;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
    }
}
NGINXEOF'"
echo ""
echo "sudo rm -f /etc/nginx/sites-enabled/default"
echo "sudo ln -s /etc/nginx/sites-available/kiongozi /etc/nginx/sites-enabled/kiongozi"
echo "sudo nginx -t && sudo systemctl reload nginx"
echo ""
log_success "Privacy Policy URL: http://156.67.25.84/privacy-policy"
echo ""
