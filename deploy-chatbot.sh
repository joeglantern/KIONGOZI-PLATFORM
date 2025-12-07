#!/bin/bash

# Kiongozi Chatbot Deployment Script


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
log_info "  Kiongozi Chatbot Deployment Script"
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

# Step 2: Create Environment File (Properly!)
log_info "Step 2: Creating environment file..."

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

# Create .env for chatbot
create_env_file "$DEPLOY_DIR"

# Step 3: Fix tsconfig for production
log_info "Step 3: Fixing tsconfig for production..."
cd "$DEPLOY_DIR"

# Remove the extends line completely (handles it being at any position in the file)
grep -v '"extends":' tsconfig.json > tsconfig.json.tmp && mv tsconfig.json.tmp tsconfig.json
log_success "tsconfig.json fixed"

# Step 4: Install Dependencies and Build
log_info "Step 4: Installing dependencies and building..."
npm install --production=false --legacy-peer-deps
CI=true npm run build
log_success "Chatbot built successfully"

# Step 5: Create PM2 Ecosystem Config
log_info "Step 5: Creating PM2 ecosystem config..."
cat > "$DEPLOY_DIR/ecosystem.config.js" << 'PM2_EOF'
module.exports = {
  apps: [
    {
      name: 'kiongozi-chatbot',
      cwd: '/root/KIONGOZI-PLATFORM',
      script: 'npm',
      args: 'start -- -p 3003',
      env: {
        NODE_ENV: 'production',
        PORT: 3003
      },
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      error_file: '/root/.pm2/logs/kiongozi-chatbot-error.log',
      out_file: '/root/.pm2/logs/kiongozi-chatbot-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true
    }
  ]
};
PM2_EOF

log_success "PM2 ecosystem config created"

# Step 6: Configure PM2
log_info "Step 6: Configuring PM2..."

# Stop and delete existing chatbot process
log_info "Stopping existing chatbot process..."
pm2 stop kiongozi-chatbot 2>/dev/null || true
pm2 delete kiongozi-chatbot 2>/dev/null || true

# Start chatbot using ecosystem file
log_info "Starting chatbot with PM2..."
pm2 start "$DEPLOY_DIR/ecosystem.config.js"
pm2 save

log_success "PM2 configured and chatbot started"

# Step 7: Configure Nginx
log_info "Step 7: Configuring Nginx..."

# Create Nginx config for chatbot (port 8080)
log_info "Creating Nginx config for chatbot (port 8080)..."
cat > /etc/nginx/sites-available/chatbot << 'NGINX_CHATBOT_EOF'
server {
    listen 8080;
    server_name _;

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
NGINX_CHATBOT_EOF

# Enable chatbot site
log_info "Enabling Nginx site..."
ln -sf /etc/nginx/sites-available/chatbot /etc/nginx/sites-enabled/chatbot

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

# Step 8: Verify Deployment
log_info "Step 8: Verifying deployment..."
sleep 3  # Give app time to start

# Check PM2 status
log_info "PM2 Status:"
pm2 status

# Check if app is responding
log_info "Checking chatbot (localhost:3003)..."
if curl -f -s http://localhost:3003 > /dev/null; then
    log_success "Chatbot is responding"
else
    log_warning "Chatbot may not be ready yet, check logs: pm2 logs kiongozi-chatbot"
fi

# Final Summary
echo ""
log_success "========================================="
log_success "  Deployment Completed Successfully!"
log_success "========================================="
echo ""
echo "🤖 Access your chatbot:"
echo "   Chatbot: http://156.67.25.84:8080"
echo ""
echo "📊 Useful commands:"
echo "   View logs:       pm2 logs kiongozi-chatbot"
echo "   Restart chatbot: pm2 restart kiongozi-chatbot"
echo "   Stop chatbot:    pm2 stop kiongozi-chatbot"
echo "   PM2 status:      pm2 status"
echo ""
log_info "Environment file created at:"
echo "   - $DEPLOY_DIR/.env"
echo ""
log_warning "Note: If login fails, verify .env file has correct keys on single lines"
echo ""
