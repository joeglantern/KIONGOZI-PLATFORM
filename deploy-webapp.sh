#!/bin/bash

# Kiongozi Platform Web App Deployment Script for Contabo

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Configuration
REPO_URL="https://github.com/joeglantern/KIONGOZI-PLATFORM.git"
DEPLOY_DIR="/root/KIONGOZI-PLATFORM"
SUPABASE_URL="https://jdncfyagppohtksogzkx.supabase.co"
SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpkbmNmeWFncHBvaHRrc29nemt4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ2ODg3NzgsImV4cCI6MjA3MDI2NDc3OH0.mQwRTAu2UYwsF_cmlIQLVVVuCTDMHjsBrxWdWPMQMFQ"
API_URL="https://kiongozi-api.onrender.com/api/v1"

echo ""
log_info "========================================="
log_info "  Kiongozi Platform Web App Deployment"
log_info "========================================="
echo ""

# Step 1: Clone or Update Repository
log_info "Step 1: Cloning/Updating repository..."
if [ -d "$DEPLOY_DIR" ]; then
    log_info "Repository exists, pulling latest changes..."
    cd "$DEPLOY_DIR"
    git fetch origin
    git reset --hard origin/main
    git pull origin main
    log_success "Repository updated"
else
    log_info "Cloning repository..."
    cd /root
    git clone "$REPO_URL"
    cd "$DEPLOY_DIR"
    log_success "Repository cloned"
fi

# Step 2: Create Environment File
log_info "Step 2: Creating environment file..."

ENV_FILE="$DEPLOY_DIR/.env.local"
log_info "Creating $ENV_FILE..."

# Remove existing file
rm -f "$ENV_FILE"

# Create new file
printf "NEXT_PUBLIC_SUPABASE_URL=%s\n" "$SUPABASE_URL" > "$ENV_FILE"
printf "NEXT_PUBLIC_SUPABASE_ANON_KEY=%s\n" "$SUPABASE_ANON_KEY" >> "$ENV_FILE"
printf "NEXT_PUBLIC_API_URL=%s\n" "$API_URL" >> "$ENV_FILE"

# Verify the file was created correctly
if [ ! -f "$ENV_FILE" ]; then
    log_error "Failed to create $ENV_FILE"
    exit 1
fi

log_success "Created $ENV_FILE"

# Step 3: Install Dependencies and Build
log_info "Step 3: Installing dependencies and building..."

cd "$DEPLOY_DIR"
npm install --production=false

# Export env vars for build process
export NEXT_PUBLIC_SUPABASE_URL="$SUPABASE_URL"
export NEXT_PUBLIC_SUPABASE_ANON_KEY="$SUPABASE_ANON_KEY"
export NEXT_PUBLIC_API_URL="$API_URL"

CI=true npm run build
log_success "Web app built successfully"

# Step 4: Configure PM2
log_info "Step 4: Configuring PM2..."

# Stop and delete existing process
log_info "Stopping existing web app process..."
pm2 stop kiongozi-webapp 2>/dev/null || true
pm2 delete kiongozi-webapp 2>/dev/null || true

# Start web app with PM2
log_info "Starting web app with PM2..."
pm2 start npm --name "kiongozi-webapp" -- start -- -p 3002
pm2 save

log_success "PM2 configured and web app started on port 3002"

# Step 5: Configure Nginx
log_info "Step 5: Configuring Nginx..."

# Create Nginx config for web app (port 80)
log_info "Creating Nginx config for web app (port 80)..."
cat > /etc/nginx/sites-available/kiongozi-webapp << 'NGINX_EOF'
server {
    listen 80;
    server_name _;

    location / {
        proxy_pass http://localhost:3002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
NGINX_EOF

# Enable site
log_info "Enabling Nginx site..."
ln -sf /etc/nginx/sites-available/kiongozi-webapp /etc/nginx/sites-enabled/kiongozi-webapp

# Remove old/conflicting configs
rm -f /etc/nginx/sites-enabled/default
rm -f /etc/nginx/sites-enabled/lms
rm -f /etc/nginx/sites-enabled/kiongozi.org
rm -f /etc/nginx/sites-enabled/moderator-dashboard

# Test Nginx configuration
log_info "Testing Nginx configuration..."
if nginx -t; then
    log_success "Nginx configuration is valid"
    systemctl reload nginx
    log_success "Nginx reloaded"
else
    log_error "Nginx configuration test failed"
    exit 1
fi

# Step 6: Verify Deployment
log_info "Step 6: Verifying deployment..."
sleep 3  # Give app time to start

# Check PM2 status
log_info "PM2 Status:"
pm2 status

# Check if app is responding
log_info "Checking web app (localhost:3002)..."
if curl -f -s http://localhost:3002 > /dev/null; then
    log_success "Web app is responding"
else
    log_warning "Web app may not be ready yet, check logs: pm2 logs kiongozi-webapp"
fi

# Final Summary
echo ""
log_success "========================================="
log_success "  Deployment Completed Successfully!"
log_success "========================================="
echo ""
echo "🌐 Access your web app:"
echo "   URL: http://156.67.25.84"
echo "   Privacy Policy: http://156.67.25.84/privacy-policy"
echo "   Terms of Service: http://156.67.25.84/terms-of-service"
echo ""
echo "📊 Useful commands:"
echo "   View logs:    pm2 logs kiongozi-webapp"
echo "   Restart app:  pm2 restart kiongozi-webapp"
echo "   Stop app:     pm2 stop kiongozi-webapp"
echo "   PM2 status:   pm2 status"
echo ""
log_info "Environment file created at:"
echo "   - $DEPLOY_DIR/.env.local"
echo ""
log_success "Privacy Policy URL for app stores:"
echo "   http://156.67.25.84/privacy-policy"
echo ""
