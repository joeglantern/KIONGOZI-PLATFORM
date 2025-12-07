#!/bin/bash

# Deployment script for Kiongozi Moderator Dashboard


set -e  # Exit on error

echo "🚀 Starting Kiongozi Moderator Dashboard Deployment..."

# 1. Clone or update repository
if [ -d "/root/Kiongozi-LMS" ]; then
    echo "📦 Repository exists, pulling latest changes..."
    cd /root/Kiongozi-LMS
    git pull origin main
else
    echo "📦 Cloning repository..."
    cd /root
    git clone https://github.com/joeglantern/Kiongozi-LMS.git
    cd Kiongozi-LMS
fi

# 2. Navigate to moderator dashboard
cd /root/Kiongozi-LMS/moderator-dashboard

# 3. Create .env file
echo "🔐 Setting up environment variables..."
cat > .env << 'EOF'
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://jdncfyagppohtksogzkx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpkbmNmeWFncHBvaHRrc29nemt4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ2ODg3NzgsImV4cCI6MjA3MDI2NDc3OH0.mQwRTAu2UYwsF_cmlIQLVVVuCTDMHjsBrxWdWPMQMFQ

# API Configuration
NEXT_PUBLIC_API_URL=https://kiongozi-api.onrender.com/api/v1
EOF

echo "✅ Environment variables configured"

# 4. Install dependencies
echo "📥 Installing dependencies..."
npm install

# 5. Build the application
echo "🔨 Building application..."
CI=true npm run build

# 6. Stop existing PM2 process if running
echo "🛑 Stopping existing PM2 process..."
pm2 stop moderator-dashboard 2>/dev/null || echo "No existing process to stop"
pm2 delete moderator-dashboard 2>/dev/null || echo "No existing process to delete"

# 7. Start with PM2
echo "🚀 Starting application with PM2..."
pm2 start npm --name "moderator-dashboard" -- start -- -p 3001
pm2 save

# 8. Configure Nginx
echo "⚙️ Configuring Nginx..."
cat > /etc/nginx/sites-available/moderator-dashboard << 'NGINX_EOF'
server {
    listen 80;
    server_name _;  # Replace with your domain if you have one

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
NGINX_EOF

# Create symlink if it doesn't exist
if [ ! -L "/etc/nginx/sites-enabled/moderator-dashboard" ]; then
    ln -s /etc/nginx/sites-available/moderator-dashboard /etc/nginx/sites-enabled/
fi

# Test Nginx configuration
echo "🧪 Testing Nginx configuration..."
nginx -t

# Reload Nginx
echo "🔄 Reloading Nginx..."
systemctl reload nginx

echo ""
echo "✅ Deployment completed successfully!"
echo ""
echo "📊 Application Status:"
pm2 status
echo ""
echo "🌐 Access your dashboard at: http://156.67.25.84"
echo ""
echo "💡 Useful commands:"
echo "  - View logs: pm2 logs moderator-dashboard"
echo "  - Restart app: pm2 restart moderator-dashboard"
echo "  - Stop app: pm2 stop moderator-dashboard"
echo ""
