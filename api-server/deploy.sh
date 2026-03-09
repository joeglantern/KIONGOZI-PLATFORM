#!/bin/bash

# Kiongozi API Server — Docker Deployment Script
# Deploys to Contabo VPS using Docker Compose (replaces PM2)

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info()    { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_error()   { echo -e "${RED}[ERROR]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }

REPO_URL="https://github.com/joeglantern/KIONGOZI-PLATFORM.git"
DEPLOY_DIR="$HOME/kiongozi-api"
API_DIR="$DEPLOY_DIR/api-server"

echo ""
log_info "========================================="
log_info "  Kiongozi API Server — Docker Deploy"
log_info "========================================="
echo ""

# ── Step 1: System prereqs ───────────────────────────────────────────────────
log_info "Step 1: Checking prerequisites..."
if ! command -v docker &>/dev/null; then
    log_info "Installing Docker..."
    curl -fsSL https://get.docker.com | sh
fi
if ! command -v git &>/dev/null; then
    apt-get install -y git
fi
log_success "Prerequisites OK"

# ── Step 2: Clone or update repo ─────────────────────────────────────────────
log_info "Step 2: Getting latest code..."
if [ -d "$DEPLOY_DIR" ]; then
    cd "$DEPLOY_DIR"
    git pull origin main
    log_success "Code updated"
else
    cd "$HOME"
    git clone "$REPO_URL" kiongozi-api
    log_success "Code cloned"
fi

cd "$API_DIR"
log_info "Working in: $(pwd)"

# ── Step 3: Verify .env exists ───────────────────────────────────────────────
log_info "Step 3: Checking environment file..."
if [ ! -f ".env" ]; then
    log_warning ".env not found — creating template"
    cat > .env << 'ENVEOF'
# Server
PORT=3001
NODE_ENV=production

# Supabase
SUPABASE_URL=https://jdncfyagppohtksogzkx.supabase.co
SUPABASE_ANON_KEY=FILL_IN
SUPABASE_SERVICE_ROLE_KEY=FILL_IN

# OpenAI
OPENAI_API_KEY=FILL_IN

# Bot (@kiongozi)
BOT_USER_ID=00000000-0000-0000-0000-000000000001

# JWT
JWT_SECRET=FILL_IN_STRONG_SECRET

# CORS — add your app domain
ALLOWED_ORIGINS=https://app.kiongozi.co.ke,http://localhost:3000

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=200
ENVEOF

    log_error "Please fill in the .env file and re-run deploy.sh"
    echo "  nano $API_DIR/.env"
    exit 1
fi
log_success "Environment file found"

# ── Step 4: Docker Compose deploy ────────────────────────────────────────────
log_info "Step 4: Building and starting Docker containers..."

docker compose pull --ignore-pull-failures 2>/dev/null || true
docker compose up -d --build

log_success "Containers started"

# ── Step 5: Verify ───────────────────────────────────────────────────────────
log_info "Step 5: Verifying deployment..."
sleep 8
docker compose ps

echo ""
log_info "========================================="
log_success "Deployment Complete!"
log_info "========================================="
echo ""
echo "🌐 Endpoints:"
echo "   Health:    https://api.yourdomain.com/api/v1/health"
echo "   Social:    https://api.yourdomain.com/api/v1/social"
echo "   DMs:       https://api.yourdomain.com/api/v1/dm"
echo ""
echo "📊 Useful commands:"
echo "   Logs:      docker compose logs -f api"
echo "   Restart:   docker compose restart api"
echo "   Stop:      docker compose down"
echo "   Status:    docker compose ps"
echo ""
