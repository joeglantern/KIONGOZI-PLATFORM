#!/bin/bash

# Kiongozi API Server Deployment Script
# Run this on your Contabo VPS

set -e

echo "=========================================="
echo "  Kiongozi API Server Deployment"
echo "=========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
APP_NAME="kiongozi-api"
APP_DIR="/var/www/kiongozi-api"
REPO_URL="https://github.com/joeglantern/KIONGOZI-PLATFORM.git"
NODE_VERSION="22"

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}Please run as root (use sudo)${NC}"
    exit 1
fi

echo -e "${YELLOW}Step 1: Updating system packages...${NC}"
apt update && apt upgrade -y

echo -e "${YELLOW}Step 2: Installing dependencies...${NC}"
apt install -y curl git nginx certbot python3-certbot-nginx

echo -e "${YELLOW}Step 3: Installing Node.js ${NODE_VERSION}...${NC}"
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash -
    apt install -y nodejs
fi
echo "Node.js version: $(node -v)"
echo "npm version: $(npm -v)"

echo -e "${YELLOW}Step 4: Installing PM2...${NC}"
npm install -g pm2

echo -e "${YELLOW}Step 5: Creating app directory...${NC}"
mkdir -p $APP_DIR
cd $APP_DIR

echo -e "${YELLOW}Step 6: Cloning/updating repository...${NC}"
if [ -d ".git" ]; then
    git pull origin main
else
    git clone $REPO_URL .
fi

echo -e "${YELLOW}Step 7: Installing API server dependencies...${NC}"
cd api-server
npm install --legacy-peer-deps

echo -e "${YELLOW}Step 8: Building TypeScript...${NC}"
npm run build

echo -e "${YELLOW}Step 9: Setting up environment variables...${NC}"
if [ ! -f ".env" ]; then
    echo -e "${RED}No .env file found!${NC}"
    echo "Creating template .env file..."
    cat > .env << 'EOF'
# Server Configuration
PORT=3002
NODE_ENV=production

# Supabase Configuration
SUPABASE_URL=your_supabase_url_here
SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here

# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here

# JWT Secret (generate a random string)
JWT_SECRET=your_jwt_secret_here

# Allowed Origins (your frontend URLs)
ALLOWED_ORIGINS=https://kiongozi.vercel.app,https://your-domain.com

# Rate Limiting (optional)
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=200

# Security (optional)
ENABLE_IP_BLOCKING=true
ENABLE_USER_AGENT_BLOCKING=true
ENABLE_CONTENT_FILTERING=true
EOF
    echo -e "${RED}Please edit .env file with your actual values!${NC}"
    echo "Run: nano $APP_DIR/api-server/.env"
    exit 1
else
    echo -e "${GREEN}.env file exists${NC}"
fi

echo -e "${YELLOW}Step 10: Starting/Restarting PM2...${NC}"
pm2 delete $APP_NAME 2>/dev/null || true
pm2 start dist/index.js --name $APP_NAME
pm2 save
pm2 startup

echo -e "${GREEN}=========================================="
echo "  Deployment Complete!"
echo "==========================================${NC}"
echo ""
echo "API server running on port 3002"
echo ""
echo "Next steps:"
echo "1. Configure nginx (run: sudo nano /etc/nginx/sites-available/kiongozi-api)"
echo "2. Get SSL certificate (run: sudo certbot --nginx -d your-api-domain.com)"
echo "3. Update your frontend to use the new API URL"
echo ""
echo "Useful commands:"
echo "  pm2 logs $APP_NAME      - View logs"
echo "  pm2 restart $APP_NAME   - Restart server"
echo "  pm2 status              - Check status"
