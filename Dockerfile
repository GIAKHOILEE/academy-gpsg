# Multi-stage
FROM node:21-alpine AS dependencies
WORKDIR /usr/app
COPY package*.json yarn.lock ./
RUN yarn install --frozen-lockfile

# Build stage
FROM node:21-alpine AS builder
WORKDIR /usr/app
COPY --from=dependencies /usr/app/node_modules ./node_modules
COPY package*.json yarn.lock ./
COPY . .
RUN yarn build

# Production stage
FROM node:21-alpine AS production
ENV NODE_ENV=production
ENV TZ=Asia/Ho_Chi_Minh
ARG PORT
ENV PORT=$PORT
WORKDIR /usr/app

# Install required packages including su-exec
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    tzdata \
    su-exec \
    && ln -snf /usr/share/zoneinfo/$TZ /etc/localtime \
    && echo $TZ > /etc/timezone \
    && rm -rf /var/cache/apk/* \
    && rm -rf /tmp/*

# Copy package files - use root ownership first
COPY --from=builder /usr/app/package*.json ./

# Install production dependencies as root
RUN yarn install --production --frozen-lockfile \
    && yarn cache clean \
    && rm -rf /tmp/* \
    && rm -rf ~/.npm

# Copy built application
COPY --from=builder /usr/app/dist ./dist

# Puppeteer config
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Create entrypoint script that fixes ALL permissions
RUN cat > /entrypoint.sh << 'EOF'
#!/bin/sh
set -e

echo "🔧 Starting permission fix..."

# Fix logs directory permissions
if [ -d "/usr/app/logs" ]; then
    echo "📝 Fixing logs permissions..."
    chown -R node:node /usr/app/logs
    chmod -R 775 /usr/app/logs
    # Also fix existing log files if any
    find /usr/app/logs -type f -exec chmod 664 {} \;
    echo "✅ Logs permissions fixed"
fi

# Fix storage directory permissions  
if [ -d "/usr/app/storage" ]; then
    echo "📁 Fixing storage permissions..."
    chown -R node:node /usr/app/storage
    chmod -R 775 /usr/app/storage
    echo "✅ Storage permissions fixed"
fi

# Create required directories if not exist
DIRS="/usr/app/logs /usr/app/storage /usr/app/storage/images /usr/app/storage/documents /usr/app/storage/uploads"
for dir in $DIRS; do
    if [ ! -d "$dir" ]; then
        echo "Creating $dir..."
        mkdir -p "$dir"
        chown node:node "$dir"
        chmod 775 "$dir"
    fi
done

echo "🚀 Starting application as node user..."
exec su-exec node:node node dist/main
EOF

# Make entrypoint executable
RUN chmod +x /entrypoint.sh

# Create directories (will be properly owned by entrypoint)
RUN mkdir -p /usr/app/logs /usr/app/storage

# DO NOT switch user here - let entrypoint handle everything
# USER node

EXPOSE $PORT

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget -q --spider http://localhost:${PORT}/health || exit 1

# Use entrypoint to fix permissions then run as node user
ENTRYPOINT ["/entrypoint.sh"]