#!/bin/bash

# Kiongozi LMS Deployment Script


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
REPO_URL="https://github.com/joeglantern/Kiongozi-LMS.git"
DEPLOY_DIR="/root/Kiongozi-LMS"
SUPABASE_URL="https://jdncfyagppohtksogzkx.supabase.co"
SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpkbmNmeWFncHBvaHRrc29nemt4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ2ODg3NzgsImV4cCI6MjA3MDI2NDc3OH0.mQwRTAu2UYwsF_cmlIQLVVVuCTDMHjsBrxWdWPMQMFQ"
API_URL="https://kiongozi-api.onrender.com/api/v1"

echo ""
log_info "========================================="
log_info "  Kiongozi LMS Deployment Script"
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

# Step 2: Create Environment Files (Properly!)
log_info "Step 2: Creating environment files..."

# Function to create .env file without line break issues
create_env_file() {
    local target_dir=$1
    local env_file="$target_dir/.env"

    log_info "Creating $env_file..."

    # Remove existing file
    rm -f "$env_file"

    # Create new file line by line (avoids heredoc issues)
    printf "NEXT_PUBLIC_SUPABASE_URL=%s\n" "$SUPABASE_URL" > "$env_file"
    printf "NEXT_PUBLIC_SUPABASE_ANON_KEY=%s\n" "$SUPABASE_ANON_KEY" >> "$env_file"
    printf "NEXT_PUBLIC_API_URL=%s\n" "$API_URL" >> "$env_file"

    # Verify the file was created correctly
    if [ ! -f "$env_file" ]; then
        log_error "Failed to create $env_file"
        exit 1
    fi

    # Check line count (should be exactly 3)
    local line_count=$(wc -l < "$env_file")
    if [ "$line_count" -ne 3 ]; then
        log_error "$env_file has incorrect line count: $line_count (expected 3)"
        cat "$env_file"
        exit 1
    fi

    log_success "Created $env_file (3 lines)"
}

# Create .env for LMS only
create_env_file "$DEPLOY_DIR"

# Step 3: Install Dependencies and Build
log_info "Step 3: Installing dependencies and building..."

# Build LMS
log_info "Building LMS..."
cd "$DEPLOY_DIR"
npm install --production=false

# Export env vars for build process
export NEXT_PUBLIC_SUPABASE_URL="$SUPABASE_URL"
export NEXT_PUBLIC_SUPABASE_ANON_KEY="$SUPABASE_ANON_KEY"
export NEXT_PUBLIC_API_URL="$API_URL"

CI=true npm run build
log_success "LMS built successfully"

# Step 4: Configure PM2
log_info "Step 4: Configuring PM2..."
cd "$DEPLOY_DIR"

# Stop and delete existing LMS process
log_info "Stopping existing LMS process..."
pm2 stop kiongozi-lms 2>/dev/null || true
pm2 delete kiongozi-lms 2>/dev/null || true

# Start LMS only using ecosystem file
log_info "Starting LMS with PM2..."
pm2 start ecosystem.config.js --only kiongozi-lms
pm2 save

log_success "PM2 configured and LMS started"

# Step 5: Configure Nginx
log_info "Step 5: Configuring Nginx..."

# Create Nginx config for LMS (port 80)
log_info "Creating Nginx config for LMS (port 80)..."
cat > /etc/nginx/sites-available/lms << 'NGINX_LMS_EOF'
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
NGINX_LMS_EOF

# Enable LMS site
log_info "Enabling Nginx site..."
ln -sf /etc/nginx/sites-available/lms /etc/nginx/sites-enabled/lms

# Remove old/conflicting configs
rm -f /etc/nginx/sites-enabled/default
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
sleep 3  # Give apps time to start

# Check PM2 status
log_info "PM2 Status:"
pm2 status

# Check if apps are responding
log_info "Checking LMS (localhost:3002)..."
if curl -f -s http://localhost:3002 > /dev/null; then
    log_success "LMS is responding"
else
    log_warning "LMS may not be ready yet, check logs: pm2 logs kiongozi-lms"
fi

# Final Summary
echo ""
log_success "========================================="
log_success "  Deployment Completed Successfully!"
log_success "========================================="
echo ""
echo "📱 Access your LMS:"
echo "   LMS: http://156.67.25.84"
echo ""
echo "📊 Useful commands:"
echo "   View logs:    pm2 logs kiongozi-lms"
echo "   Restart LMS:  pm2 restart kiongozi-lms"
echo "   Stop LMS:     pm2 stop kiongozi-lms"
echo "   PM2 status:   pm2 status"
echo ""
log_info "Environment file created at:"
echo "   - $DEPLOY_DIR/.env"
echo ""
log_warning "Note: If login fails, verify .env files have correct keys on single lines"
echo ""
