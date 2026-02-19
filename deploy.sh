#!/bin/bash

# Configuration
APP_NAME="kiongozi-web-v2"
REPO_URL="https://github.com/joeglantern/KIONGOZI-PLATFORM.git"
BRANCH="kiongozi-web-platform-v2"
TARGET_DIR="/var/www/kiongozi-web-platform-v2"
DOMAIN="learn.kiongozi.org"
PORT=3010

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}Starting Deployment for $DOMAIN...${NC}"

# 1. Update System & Install Dependencies
echo -e "${GREEN}Updating system and checking dependencies...${NC}"
sudo apt-get update
sudo apt-get install -y nginx git certbot python3-certbot-nginx build-essential

# Verify Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}Node.js not found! Installing Node 20...${NC}"
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
else
    echo -e "${GREEN}Node.js $(node -v) detected.${NC}"
fi

# Verify PM2
if ! command -v pm2 &> /dev/null; then
    echo -e "${GREEN}Installing PM2...${NC}"
    sudo npm install -g pm2
fi

# 2. Setup Application Directory
echo -e "${GREEN}Setting up application at $TARGET_DIR...${NC}"
if [ -d "$TARGET_DIR" ]; then
    cd "$TARGET_DIR"
    echo "Directory exists. Pulling latest changes..."
    sudo git fetch origin
    sudo git checkout $BRANCH
    sudo git pull origin $BRANCH
else
    echo "Cloning repository..."
    sudo git clone -b $BRANCH $REPO_URL "$TARGET_DIR"
    cd "$TARGET_DIR"
fi

# Fix permissions
sudo chown -R $USER:$USER "$TARGET_DIR"

# 3. Environment Variables
ENV_FILE="$TARGET_DIR/.env.local"
if [ ! -f "$ENV_FILE" ]; then
    echo -e "${RED}Waiting for environment variables...${NC}"
    echo "Creating .env.local file. Please enter your Supabase credentials when prompted."
    
    read -p "Enter NEXT_PUBLIC_SUPABASE_URL: " SUPABASE_URL
    read -p "Enter NEXT_PUBLIC_SUPABASE_ANON_KEY: " SUPABASE_ANON_KEY
    read -p "Enter NEXT_PUBLIC_SITE_URL (default: https://$DOMAIN): " SITE_URL
    SITE_URL=${SITE_URL:-"https://$DOMAIN"}

    cat <<EOF > "$ENV_FILE"
NEXT_PUBLIC_SUPABASE_URL=$SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY
NEXT_PUBLIC_SITE_URL=$SITE_URL
EOF
    echo -e "${GREEN}.env.local created.${NC}"
fi

# 4. Install & Build
echo -e "${GREEN}Installing dependencies...${NC}"
npm install --no-audit

echo -e "${GREEN}Building application...${NC}"
npm run build

# 5. PM2 Setup
echo -e "${GREEN}Configuring PM2...${NC}"

# Optional: Check for old process and offer cleanup
if pm2 list | grep -q "kiongozi-lms"; then
    echo -e "${RED}Found old process 'kiongozi-lms' (ID 6).${NC}"
    read -p "Do you want to STOP and DELETE this old process to save memory? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        pm2 delete kiongozi-lms
        echo -e "${GREEN}Old process deleted.${NC}"
    else
        echo "Old process kept running."
    fi
fi

pm2 describe "$APP_NAME" > /dev/null
if [ $? -eq 0 ]; then
    echo "Reloading existing PM2 process..."
    pm2 reload "$APP_NAME"
else
    echo "Starting new PM2 process on port $PORT..."
    pm2 start npm --name "$APP_NAME" -- start -- -p $PORT
fi
pm2 save

# 6. Nginx Configuration
NGINX_CONF="/etc/nginx/sites-available/$DOMAIN"
echo -e "${GREEN}Configuring Nginx...${NC}"

# Safety Check: Inspect existing 'kiongozi' config
if [ -f "/etc/nginx/sites-enabled/kiongozi" ]; then
    if grep -q "server_name learn.kiongozi.org" "/etc/nginx/sites-enabled/kiongozi"; then
        echo -e "${RED}CRITICAL CONFLICT DETECTED!${NC}"
        echo -e "The file '/etc/nginx/sites-enabled/kiongozi' contains the config for learn.kiongozi.org BUT also other sites (chat, admin)."
        echo -e "I cannot safely delete this file without breaking your other sites."
        echo
        echo -e "${RED}ACTION REQUIRED:${NC}"
        echo -e "1. Run: sudo nano /etc/nginx/sites-enabled/kiongozi"
        echo -e "2. Manually DELETE the 'server { ... }' block for 'learn.kiongozi.org'."
        echo -e "3. Save and exit (Ctrl+O, Enter, Ctrl+X)."
        echo -e "4. Run this script again."
        exit 1
    fi
fi

# Clean up if it matches our dedicated filename
if [ -f "/etc/nginx/sites-enabled/$DOMAIN" ]; then
    echo "Removing old dedicated Nginx config..."
    sudo rm -f "/etc/nginx/sites-enabled/$DOMAIN"
    sudo rm -f "/etc/nginx/sites-available/$DOMAIN"
fi

sudo bash -c "cat > $NGINX_CONF" <<EOF
server {
    server_name $DOMAIN;

    location / {
        proxy_pass http://localhost:$PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

# Enable Site
if [ ! -f "/etc/nginx/sites-enabled/$DOMAIN" ]; then
    sudo ln -s "$NGINX_CONF" "/etc/nginx/sites-enabled/"
fi

# Test & Reload Nginx
sudo nginx -t
if [ $? -eq 0 ]; then
    sudo systemctl reload nginx
    echo -e "${GREEN}Nginx reloaded successfully.${NC}"
else
    echo -e "${RED}Nginx configuration failed! Check errors above.${NC}"
    exit 1
fi

# 7. SSL Certificate
echo -e "${GREEN}Setting up SSL with Certbot...${NC}"
if sudo certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos --email admin@$DOMAIN; then
    echo -e "${GREEN}SSL Certificate installed successfully.${NC}"
else
    echo -e "${RED}Certbot failed. You may need to run it manually: sudo certbot --nginx -d $DOMAIN${NC}"
fi

echo -e "${GREEN} Deployment Complete! Your app should be live at https://$DOMAIN ${NC}"
