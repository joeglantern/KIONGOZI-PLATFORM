# 🚀 Deployment Guide - Kiongozi LMS Platform

This comprehensive guide covers deploying the Kiongozi Learning Management System to production environments with best practices for security, performance, and scalability.

## 🏗️ Architecture Overview

### System Components
- **Frontend**: Next.js application (User Interface)
- **Admin Panel**: Next.js application (Administration Interface)
- **API Server**: Node.js/Express backend (Core API)
- **Database**: Supabase (PostgreSQL + Auth + Realtime)
- **WebSocket**: Socket.IO for real-time features
- **File Storage**: Supabase Storage or AWS S3

### Deployment Options
1. **Netlify + Railway** (Recommended for quick deployment)
2. **Vercel + Railway** (Alternative for Next.js optimization)
3. **Docker + Cloud Provider** (For containerized deployments)
4. **Traditional VPS** (For full control)

---

## ⚡ Quick Deployment (Netlify + Railway)

### Prerequisites
- GitHub account
- Netlify account
- Railway account
- Supabase account

### Step 1: Database Setup (Supabase)

1. **Create Supabase Project**
   ```bash
   # Visit https://supabase.com/dashboard
   # Click "New Project"
   # Choose organization and set project name
   # Set database password
   # Choose region closest to your users
   ```

2. **Run Database Migrations**
   ```bash
   # Install Supabase CLI
   npm install -g @supabase/cli
   
   # Link to your project
   supabase link --project-ref your-project-ref
   
   # Run migrations
   supabase db push
   ```

3. **Set Up Authentication**
   ```sql
   -- Create profiles table
   CREATE TABLE profiles (
     id UUID REFERENCES auth.users(id) PRIMARY KEY,
     email TEXT UNIQUE NOT NULL,
     name TEXT,
     role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin')),
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
     updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
   );
   
   -- Enable RLS
   ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
   
   -- Create policies
   CREATE POLICY "Users can view own profile" ON profiles
     FOR SELECT USING (auth.uid() = id);
   
   CREATE POLICY "Users can update own profile" ON profiles
     FOR UPDATE USING (auth.uid() = id);
   ```

### Step 2: API Server Deployment (Railway)

1. **Connect Repository**
   ```bash
   # Visit https://railway.app
   # Click "Deploy from GitHub"
   # Select your repository
   # Choose the api-server directory
   ```

2. **Set Environment Variables**
   ```bash
   # In Railway dashboard, go to Variables tab
   NODE_ENV=production
   PORT=3001
   
   # Supabase Configuration
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   SUPABASE_ANON_KEY=your-anon-key
   
   # JWT Configuration
   JWT_SECRET=your-very-secure-jwt-secret-key
   
   # CORS Configuration
   ALLOWED_ORIGINS=https://your-frontend-domain.netlify.app,https://your-admin-domain.netlify.app
   
   # Rate Limiting
   RATE_LIMIT_WINDOW_MS=900000
   RATE_LIMIT_MAX_REQUESTS=200
   
   # Google AI (if using)
   GOOGLE_API_KEY=your-google-ai-api-key
   ```

3. **Custom Start Command**
   ```json
   // In package.json, ensure:
   {
     "scripts": {
       "start": "node dist/index.js",
       "build": "tsc",
       "dev": "nodemon"
     }
   }
   ```

### Step 3: Frontend Deployment (Netlify)

1. **Main Frontend App**
   ```bash
   # In Netlify dashboard:
   # 1. Connect to GitHub repository
   # 2. Set build command: "npm run build"
   # 3. Set publish directory: ".next"
   # 4. Set base directory: "app"
   ```

2. **Environment Variables**
   ```bash
   # In Netlify dashboard, go to Environment Variables
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   NEXT_PUBLIC_API_BASE=https://your-railway-api.railway.app/api/v1
   ```

3. **Admin Panel Deployment**
   ```bash
   # Deploy admin panel separately or as subdomain
   # Follow same steps but use "admin" as base directory
   # Set different environment variables if needed
   ```

### Step 4: Domain Configuration

1. **Custom Domains**
   ```bash
   # Main app: yourdomain.com
   # Admin panel: admin.yourdomain.com
   # API: api.yourdomain.com
   ```

2. **SSL Certificates**
   ```bash
   # Netlify automatically provides SSL
   # Railway provides SSL for custom domains
   # Update ALLOWED_ORIGINS with new domains
   ```

---

## 🐳 Docker Deployment

### Dockerfile for API Server
```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --only=production

# Copy source code
COPY . .

# Build application
RUN npm run build

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3001/api/v1/health || exit 1

# Start application
CMD ["npm", "start"]
```

### Dockerfile for Frontend
```dockerfile
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:18-alpine AS runner
WORKDIR /app

ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000
ENV PORT 3000

CMD ["node", "server.js"]
```

### Docker Compose
```yaml
version: '3.8'

services:
  api:
    build:
      context: ./api-server
      dockerfile: Dockerfile
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - SUPABASE_URL=${SUPABASE_URL}
      - SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY}
      - JWT_SECRET=${JWT_SECRET}
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3001/api/v1/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    restart: unless-stopped

  frontend:
    build:
      context: ./app
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL}
      - NEXT_PUBLIC_SUPABASE_ANON_KEY=${NEXT_PUBLIC_SUPABASE_ANON_KEY}
      - NEXT_PUBLIC_API_BASE=${NEXT_PUBLIC_API_BASE}
    depends_on:
      - api
    restart: unless-stopped

  admin:
    build:
      context: ./admin
      dockerfile: Dockerfile
    ports:
      - "3002:3000"
    environment:
      - NEXT_PUBLIC_SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL}
      - NEXT_PUBLIC_SUPABASE_ANON_KEY=${NEXT_PUBLIC_SUPABASE_ANON_KEY}
      - NEXT_PUBLIC_API_BASE=${NEXT_PUBLIC_API_BASE}
    depends_on:
      - api
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
    depends_on:
      - frontend
      - admin
      - api
    restart: unless-stopped
```

---

## ☁️ Cloud Provider Deployment

### AWS Deployment

1. **ECS with Fargate**
   ```bash
   # Create ECS cluster
   aws ecs create-cluster --cluster-name kiongozi-cluster
   
   # Create task definition
   aws ecs register-task-definition --cli-input-json file://task-definition.json
   
   # Create service
   aws ecs create-service --cluster kiongozi-cluster --service-name kiongozi-api --task-definition kiongozi-task
   ```

2. **Application Load Balancer**
   ```bash
   # Create ALB for routing between services
   aws elbv2 create-load-balancer --name kiongozi-alb --subnets subnet-12345 subnet-67890
   
   # Create target groups for each service
   aws elbv2 create-target-group --name kiongozi-api-tg --protocol HTTP --port 3001 --vpc-id vpc-12345
   ```

3. **CloudFront Distribution**
   ```json
   {
     "CallerReference": "kiongozi-cdn",
     "Origins": {
       "Quantity": 1,
       "Items": [
         {
           "Id": "kiongozi-origin",
           "DomainName": "your-alb-domain.amazonaws.com",
           "CustomOriginConfig": {
             "HTTPPort": 80,
             "HTTPSPort": 443,
             "OriginProtocolPolicy": "https-only"
           }
         }
       ]
     }
   }
   ```

### Google Cloud Platform

1. **Cloud Run Deployment**
   ```bash
   # Build and push container
   gcloud builds submit --tag gcr.io/your-project/kiongozi-api ./api-server
   
   # Deploy to Cloud Run
   gcloud run deploy kiongozi-api \
     --image gcr.io/your-project/kiongozi-api \
     --platform managed \
     --region us-central1 \
     --allow-unauthenticated
   ```

2. **Load Balancer Setup**
   ```bash
   # Create global load balancer
   gcloud compute url-maps create kiongozi-lb \
     --default-service kiongozi-backend-service
   ```

---

## 🔧 Configuration

### Environment Variables

**Production API Server (.env):**
```bash
# Node.js Configuration
NODE_ENV=production
PORT=3001

# Database Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_ANON_KEY=your-anon-key

# Authentication
JWT_SECRET=your-super-secure-jwt-secret-minimum-32-characters
JWT_EXPIRES_IN=7d

# CORS Configuration
ALLOWED_ORIGINS=https://yourdomain.com,https://admin.yourdomain.com

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=200

# External APIs
GOOGLE_API_KEY=your-google-ai-api-key

# Monitoring
ENABLE_LOGGING=true
LOG_LEVEL=info

# Security
HELMET_CSP=true
TRUST_PROXY=true
```

**Frontend (.env.local):**
```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_API_BASE=https://api.yourdomain.com/api/v1
NEXT_PUBLIC_APP_URL=https://yourdomain.com
NEXT_PUBLIC_ADMIN_URL=https://admin.yourdomain.com
```

### Nginx Configuration
```nginx
upstream api {
    server api:3001;
}

upstream frontend {
    server frontend:3000;
}

upstream admin {
    server admin:3000;
}

server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN";
    add_header X-Content-Type-Options "nosniff";
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains";

    location / {
        proxy_pass http://frontend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # WebSocket support
    location /socket.io/ {
        proxy_pass http://api;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}

server {
    listen 443 ssl http2;
    server_name admin.yourdomain.com;

    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;

    location / {
        proxy_pass http://admin;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

server {
    listen 443 ssl http2;
    server_name api.yourdomain.com;

    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;

    location / {
        proxy_pass http://api;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # CORS headers
        add_header Access-Control-Allow-Origin "https://yourdomain.com, https://admin.yourdomain.com";
        add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS";
        add_header Access-Control-Allow-Headers "Authorization, Content-Type";
    }
}
```

---

## 🔐 Security Configuration

### SSL/TLS Setup
```bash
# Using Let's Encrypt with Certbot
sudo apt install certbot python3-certbot-nginx

# Generate certificates
sudo certbot --nginx -d yourdomain.com -d admin.yourdomain.com -d api.yourdomain.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

### Security Headers
```javascript
// In your Express app
import helmet from 'helmet';

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "wss:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));
```

### Environment Security
```bash
# Use secrets management
# AWS Secrets Manager
aws secretsmanager create-secret --name kiongozi/jwt-secret --secret-string "your-jwt-secret"

# Azure Key Vault
az keyvault secret set --vault-name kiongozi-vault --name jwt-secret --value "your-jwt-secret"

# Google Secret Manager
gcloud secrets create jwt-secret --data-file=jwt-secret.txt
```

---

## 📊 Monitoring & Logging

### Health Checks
```javascript
// Health check endpoint
app.get('/api/v1/health', (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: process.env.npm_package_version,
    environment: process.env.NODE_ENV,
    checks: {
      database: 'checking...',
      redis: 'checking...'
    }
  };

  // Perform actual health checks
  Promise.all([
    checkDatabase(),
    checkRedis()
  ]).then(([db, redis]) => {
    health.checks.database = db ? 'healthy' : 'unhealthy';
    health.checks.redis = redis ? 'healthy' : 'unhealthy';
    
    const status = (db && redis) ? 200 : 503;
    res.status(status).json(health);
  });
});
```

### Logging Setup
```javascript
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});
```

### Monitoring Services
```yaml
# Docker Compose with monitoring
version: '3.8'
services:
  prometheus:
    image: prom/prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml

  grafana:
    image: grafana/grafana
    ports:
      - "3001:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    volumes:
      - grafana-storage:/var/lib/grafana

volumes:
  grafana-storage:
```

---

## 🚀 Performance Optimization

### Caching Strategy
```javascript
import Redis from 'redis';
const redis = Redis.createClient();

// Cache middleware
const cache = (duration = 300) => {
  return async (req, res, next) => {
    const key = `cache:${req.originalUrl}`;
    const cached = await redis.get(key);
    
    if (cached) {
      return res.json(JSON.parse(cached));
    }
    
    res.sendResponse = res.json;
    res.json = (body) => {
      redis.setex(key, duration, JSON.stringify(body));
      res.sendResponse(body);
    };
    
    next();
  };
};

// Use caching
app.get('/api/v1/analytics/overview', cache(300), getAnalyticsOverview);
```

### Database Optimization
```sql
-- Indexes for better performance
CREATE INDEX CONCURRENTLY idx_chat_sessions_user_id ON chat_sessions(user_id);
CREATE INDEX CONCURRENTLY idx_chat_messages_session_id ON chat_messages(session_id);
CREATE INDEX CONCURRENTLY idx_system_logs_created_at ON system_logs(created_at);
CREATE INDEX CONCURRENTLY idx_notifications_user_read ON notifications(user_id, read);

-- Partitioning for large tables
CREATE TABLE system_logs_y2024m01 PARTITION OF system_logs
    FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');
```

### CDN Configuration
```json
{
  "version": 2,
  "routes": [
    {
      "src": "/static/(.*)",
      "headers": { "cache-control": "s-maxage=31536000" }
    },
    {
      "src": "/(.*)",
      "headers": { "cache-control": "s-maxage=0" }
    }
  ]
}
```

---

## 🔄 CI/CD Pipeline

### GitHub Actions
```yaml
name: Deploy to Production

on:
  push:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm test

  deploy-api:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Deploy to Railway
        uses: railwayapp/cli@v2
        with:
          command: up --service api-server
        env:
          RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}

  deploy-frontend:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Deploy to Netlify
        uses: netlify/actions/cli@master
        with:
          args: deploy --prod --dir=app/.next
        env:
          NETLIFY_AUTH_TOKEN: ${{ secrets.NETLIFY_AUTH_TOKEN }}
          NETLIFY_SITE_ID: ${{ secrets.NETLIFY_SITE_ID }}
```

### Automated Testing
```javascript
// API tests
describe('API Health', () => {
  test('should return healthy status', async () => {
    const response = await request(app).get('/api/v1/health');
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('healthy');
  });
});

// E2E tests
describe('Chat Flow', () => {
  test('should create session and send message', async () => {
    // Test implementation
  });
});
```

---

## 🛠️ Maintenance

### Database Backups
```bash
# Automated backups
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
pg_dump $DATABASE_URL > "backup_$DATE.sql"
aws s3 cp "backup_$DATE.sql" s3://your-backup-bucket/
```

### Log Rotation
```bash
# Logrotate configuration
/var/log/kiongozi/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 0644 www-data www-data
    postrotate
        systemctl reload nginx
    endscript
}
```

### Updates and Patches
```bash
# Zero-downtime deployment script
#!/bin/bash
echo "Starting deployment..."

# Build new version
docker build -t kiongozi-api:latest ./api-server

# Update with rolling deployment
docker service update --image kiongozi-api:latest kiongozi_api

echo "Deployment complete!"
```

---

## 🆘 Troubleshooting

### Common Issues

**Database Connection Issues:**
```bash
# Check connection
psql $DATABASE_URL -c "SELECT 1;"

# Check connection pool
# Monitor active connections in logs
```

**Memory Issues:**
```bash
# Monitor memory usage
docker stats

# Increase memory limits
docker run -m 1g kiongozi-api
```

**SSL Certificate Issues:**
```bash
# Check certificate validity
openssl x509 -in cert.pem -text -noout

# Renew certificates
certbot renew --force-renewal
```

**Performance Issues:**
```bash
# Monitor API response times
curl -w "@curl-format.txt" -s -o /dev/null https://api.yourdomain.com/health

# Check database performance
EXPLAIN ANALYZE SELECT * FROM chat_sessions WHERE user_id = 'uuid';
```

---

## 📋 Deployment Checklist

### Pre-deployment
- [ ] All tests passing
- [ ] Environment variables configured
- [ ] SSL certificates installed
- [ ] Database migrations applied
- [ ] Security headers configured
- [ ] Rate limiting configured
- [ ] Monitoring setup
- [ ] Backup strategy implemented

### Post-deployment
- [ ] Health checks passing
- [ ] SSL certificates working
- [ ] WebSocket connections working
- [ ] Admin panel accessible
- [ ] Real-time notifications working
- [ ] Analytics data populating
- [ ] Security monitoring active
- [ ] Performance metrics baseline established

### Rollback Plan
- [ ] Previous version tagged
- [ ] Database rollback scripts ready
- [ ] Quick rollback procedure documented
- [ ] Monitoring alerts configured
- [ ] Team notification process defined

---

## 📞 Support

### Production Issues
1. Check health endpoints
2. Review error logs
3. Monitor system resources
4. Check external service status
5. Escalate if needed

### Performance Issues
1. Review analytics dashboard
2. Check database query performance
3. Monitor API response times
4. Review caching effectiveness
5. Scale resources if needed

---

**Deployment Version**: 1.0  
**Last Updated**: Current Date  
**Maintainer**: Your Team

*This deployment guide is regularly updated with new best practices and optimizations.*