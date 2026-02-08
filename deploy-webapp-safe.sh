#!/bin/bash

# Kiongozi Platform Web App Deployment Script (Safe Multi-Site Version)
# Runs as afosi user, deploys to home directory, uses unique port

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
DEPLOY_DIR="$HOME/KIONGOZI-PLATFORM"  # Deploy to home directory
APP_PORT=3003  # Unique port to avoid conflicts
APP_NAME="kiongozi-webapp"
SUPABASE_URL="https://jdncfyagppohtksogzkx.supabase.co"
SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpkbmNmeWFncHBvaHRrc29nemt4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ2ODg3NzgsImV4cCI6MjA3MDI2NDc3OH0.mQwRTAu2UYwsF_cmlIQLVVVuCTDMHjsBrxWdWPMQMFQ"
API_URL="https://kiongozi-api.onrender.com/api/v1"

echo ""
log_info "========================================="
log_info "  Kiongozi Platform Web App Deployment"
log_info "  (Safe Multi-Site Configuration)"
log_info "========================================="
echo ""

# Check if we're running as the correct user
if [ "$USER" != "afosi" ]; then
    log_warning "This script should be run as 'afosi' user"
    log_info "Current user: $USER"
fi

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
    cd "$HOME"
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

# Step 4: Configure PM2 (User-level, won't affect other apps)
log_info "Step 4: Configuring PM2..."

# Check if PM2 is installed for this user
if ! command -v pm2 &> /dev/null; then
    log_warning "PM2 not found for user $USER, installing..."
    npm install -g pm2
fi

# Stop and delete existing process (only this app)
log_info "Stopping existing $APP_NAME process..."
pm2 stop $APP_NAME 2>/dev/null || true
pm2 delete $APP_NAME 2>/dev/null || true

# Start web app with PM2 on unique port
log_info "Starting web app with PM2 on port $APP_PORT..."
cd "$DEPLOY_DIR"
pm2 start npm --name "$APP_NAME" -- start -- -p $APP_PORT
pm2 save

log_success "PM2 configured and web app started on port $APP_PORT"

# Step 5: Nginx Configuration (Optional - requires sudo)
log_info "Step 5: Nginx configuration..."
log_warning "Nginx configuration requires sudo access"

# Create nginx config file content
NGINX_CONFIG="/tmp/kiongozi-webapp.conf"
cat > "$NGINX_CONFIG" << 'NGINX_EOF'
# Kiongozi Web App - Privacy Policy Site
# This configuration serves ONLY the privacy policy on a subdomain
# It does NOT interfere with other sites

server {
    listen 80;
    server_name privacy.kiongozi.afosi.org kiongozi.afosi.org;

    location / {
        proxy_pass http://localhost:3003;
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

log_info "Nginx config created at: $NGINX_CONFIG"
echo ""
log_warning "To complete Nginx setup, run these commands with sudo:"
echo ""
echo "  sudo cp $NGINX_CONFIG /etc/nginx/sites-available/kiongozi-webapp"
echo "  sudo ln -sf /etc/nginx/sites-available/kiongozi-webapp /etc/nginx/sites-enabled/kiongozi-webapp"
echo "  sudo nginx -t"
echo "  sudo systemctl reload nginx"
echo ""
log_info "Or if you want to use the main IP (156.67.25.84), run:"
echo ""
echo "  sudo rm -f /etc/nginx/sites-enabled/default"
echo "  sudo ln -sf /etc/nginx/sites-available/kiongozi-webapp /etc/nginx/sites-enabled/default"
echo "  sudo nginx -t"
echo "  sudo systemctl reload nginx"
echo ""

# Step 6: Verify Deployment
log_info "Step 6: Verifying deployment..."
sleep 3  # Give app time to start

# Check PM2 status
log_info "PM2 Status:"
pm2 list

# Check if app is responding
log_info "Checking web app (localhost:$APP_PORT)..."
if curl -f -s http://localhost:$APP_PORT > /dev/null; then
    log_success "Web app is responding on port $APP_PORT"
else
    log_warning "Web app may not be ready yet, check logs: pm2 logs $APP_NAME"
fi

# Final Summary
echo ""
log_success "========================================="
log_success "  Deployment Completed Successfully!"
log_success "========================================="
echo ""
echo "📊 App Status:"
echo "   Name: $APP_NAME"
echo "   Port: $APP_PORT"
echo "   Directory: $DEPLOY_DIR"
echo ""
echo "🌐 Access your web app:"
echo "   Local: http://localhost:$APP_PORT"
echo "   Privacy Policy: http://localhost:$APP_PORT/privacy-policy"
echo "   Terms of Service: http://localhost:$APP_PORT/terms-of-service"
echo ""
echo "📊 Useful commands:"
echo "   View logs:    pm2 logs $APP_NAME"
echo "   Restart app:  pm2 restart $APP_NAME"
echo "   Stop app:     pm2 stop $APP_NAME"
echo "   PM2 status:   pm2 list"
echo ""
log_info "Environment file created at:"
echo "   - $DEPLOY_DIR/.env.local"
echo ""
log_warning "IMPORTANT: To make this accessible from the internet:"
echo "1. Set up Nginx using the commands shown above"
echo "2. Or configure your domain DNS to point to this server"
echo "3. The app is currently only accessible on localhost:$APP_PORT"
echo ""
log_success "Privacy Policy URL (after Nginx setup):"
echo "   http://156.67.25.84/privacy-policy"
echo "   OR"
echo "   http://your-domain.com/privacy-policy"
echo ""
