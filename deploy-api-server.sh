#!/bin/bash

# Kiongozi API Server Deployment (Safe Multi-Site Version)
# Deploys to user home directory, uses unique port 3001

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }

# Configuration
REPO_URL="https://github.com/joeglantern/KIONGOZI-PLATFORM.git"
DEPLOY_DIR="$HOME/kiongozi-api"
API_PORT=3001
APP_NAME="kiongozi-api"

echo ""
log_info "========================================="
log_info "  Kiongozi API Server Deployment"
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
    git clone "$REPO_URL" kiongozi-api
    cd "$DEPLOY_DIR"
    log_success "Code cloned"
fi

# Step 2: Navigate to api-server directory
cd "$DEPLOY_DIR/api-server"
log_info "Working in: $(pwd)"

# Step 3: Create .env file
log_info "Step 2: Creating environment file..."

# Check if .env already exists
if [ -f ".env" ]; then
    log_warning ".env file already exists"
    log_info "Backing up to .env.backup"
    cp .env .env.backup
fi

# Create .env file (you'll need to fill in your actual keys)
cat > .env << 'ENVEOF'
# Server Configuration
PORT=3001
NODE_ENV=production

# Supabase Configuration
SUPABASE_URL=https://jdncfyagppohtksogzkx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpkbmNmeWFncHBvaHRrc29nemt4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ2ODg3NzgsImV4cCI6MjA3MDI2NDc3OH0.mQwRTAu2UYwsF_cmlIQLVVVuCTDMHjsBrxWdWPMQMFQ
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY_HERE

# OpenAI Configuration
OPENAI_API_KEY=YOUR_OPENAI_API_KEY_HERE

# JWT Secret
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Allowed Origins (CORS)
ALLOWED_ORIGINS=http://156.67.25.84,http://localhost:3000,http://localhost:3003

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=200

# Security Settings
ENABLE_IP_BLOCKING=true
ENABLE_USER_AGENT_BLOCKING=true
ENABLE_CONTENT_FILTERING=true
ENVEOF

log_success "Environment file created"
log_warning "IMPORTANT: You need to update the following in .env:"
echo "  - SUPABASE_SERVICE_ROLE_KEY"
echo "  - OPENAI_API_KEY"
echo "  - JWT_SECRET"
echo ""
read -p "Press Enter after you've updated the .env file, or Ctrl+C to exit and update manually..."

# Step 4: Install dependencies
log_info "Step 3: Installing dependencies..."
npm install --production=false

log_success "Dependencies installed"

# Step 5: Build TypeScript
log_info "Step 4: Building TypeScript..."
npm run build

log_success "Build complete"

# Step 6: Start with PM2
log_info "Step 5: Starting API server with PM2..."

# Stop existing
pm2 stop $APP_NAME 2>/dev/null || true
pm2 delete $APP_NAME 2>/dev/null || true

# Start new
cd "$DEPLOY_DIR/api-server"
pm2 start npm --name "$APP_NAME" -- start
pm2 save

log_success "API server started on port $API_PORT"

# Step 7: Show status
echo ""
log_info "========================================="
log_success "Deployment Complete!"
log_info "========================================="
echo ""
echo "📊 API Server Status:"
pm2 list | grep $APP_NAME || pm2 list
echo ""
echo "🌐 API Endpoints:"
echo "   Local: http://localhost:$API_PORT"
echo "   Health: http://localhost:$API_PORT/health"
echo "   Chat: http://localhost:$API_PORT/api/v1/chat"
echo ""
echo "📊 Useful commands:"
echo "   View logs:    pm2 logs $APP_NAME"
echo "   Restart API:  pm2 restart $APP_NAME"
echo "   Stop API:     pm2 stop $APP_NAME"
echo "   PM2 status:   pm2 list"
echo ""
log_info "Environment file location:"
echo "   $DEPLOY_DIR/api-server/.env"
echo ""
log_warning "To make API accessible from internet (optional):"
echo "Update your web app's NEXT_PUBLIC_API_URL to:"
echo "   http://156.67.25.84:3001/api/v1"
echo ""
log_info "Or set up Nginx reverse proxy on a subdomain"
echo ""
