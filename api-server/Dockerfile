FROM node:22-alpine

WORKDIR /app

# Install dependencies first (cache layer)
COPY package*.json ./
RUN npm ci --only=production=false

# Copy source and build
COPY . .
RUN npm run build

# Remove dev dependencies after build
RUN npm prune --production

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
  CMD wget -qO- http://localhost:3001/api/v1/health || exit 1

CMD ["node", "dist/index.js"]
