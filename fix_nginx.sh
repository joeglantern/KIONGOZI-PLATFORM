#!/bin/bash
# Colors
GREEN='\033[0;32m'
NC='\033[0m'

echo -e "${GREEN}Backing up existing config to /etc/nginx/sites-available/kiongozi.bak...${NC}"
sudo cp /etc/nginx/sites-available/kiongozi /etc/nginx/sites-available/kiongozi.bak

echo -e "${GREEN}Writing clean config (Chat & Admin only)...${NC}"
sudo bash -c "cat > /etc/nginx/sites-available/kiongozi" <<'EOF'
# Chatbot (from KIONGOZI-PLATFORM repo)
server {
    server_name chat.kiongozi.org;

    location / {
        proxy_pass http://localhost:3004;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    listen 443 ssl; # managed by Certbot
    ssl_certificate /etc/letsencrypt/live/learn.kiongozi.org/fullchain.pem; # managed by Certbot
    ssl_certificate_key /etc/letsencrypt/live/learn.kiongozi.org/privkey.pem; # managed by Certbot
    include /etc/letsencrypt/options-ssl-nginx.conf; # managed by Certbot
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem; # managed by Certbot
}

# Admin Dashboard
server {
    server_name admin.kiongozi.org moderator.kiongozi.org;

    location / {
        proxy_pass http://localhost:3005;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    listen 443 ssl; # managed by Certbot
    ssl_certificate /etc/letsencrypt/live/learn.kiongozi.org/fullchain.pem; # managed by Certbot
    ssl_certificate_key /etc/letsencrypt/live/learn.kiongozi.org/privkey.pem; # managed by Certbot
    include /etc/letsencrypt/options-ssl-nginx.conf; # managed by Certbot
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem; # managed by Certbot
}

server {
    if ($host = chat.kiongozi.org) {
        return 301 https://$host$request_uri;
    } # managed by Certbot

    listen 80;
    server_name chat.kiongozi.org;
    return 404; # managed by Certbot
}

server {
    if ($host = moderator.kiongozi.org) {
        return 301 https://$host$request_uri;
    } # managed by Certbot

    if ($host = admin.kiongozi.org) {
        return 301 https://$host$request_uri;
    } # managed by Certbot

    listen 80;
    server_name admin.kiongozi.org moderator.kiongozi.org;
    return 404; # managed by Certbot
}
EOF

echo -e "${GREEN}Config updated. Reloading Nginx...${NC}"
sudo nginx -t && sudo systemctl reload nginx
echo -e "${GREEN}Done! You can now run deploy.sh${NC}"
