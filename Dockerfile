# Multi-stage
FROM node:22-alpine AS dependencies
WORKDIR /usr/app
COPY package*.json yarn.lock ./
RUN yarn install --frozen-lockfile

# Build stage
FROM node:22-alpine AS builder
WORKDIR /usr/app
COPY --from=dependencies /usr/app/node_modules ./node_modules
COPY package*.json yarn.lock ./
COPY . .
RUN yarn build

# Production stage
FROM node:22-alpine AS production
ENV NODE_ENV=production
ENV TZ=Asia/Ho_Chi_Minh
ARG PORT
ENV PORT=$PORT
WORKDIR /usr/app

# KHÔNG TẠO USER MỚI - Dùng node user có sẵn (UID 1000)
# node:22-alpine đã có sẵn user 'node' với UID/GID 1000

RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    tzdata \
    && ln -snf /usr/share/zoneinfo/$TZ /etc/localtime \
    && echo $TZ > /etc/timezone \
    && rm -rf /var/cache/apk/* \
    && rm -rf /tmp/*

# Copy package files với owner là node user
COPY --from=builder --chown=node:node /usr/app/package*.json ./

# Install production dependencies
RUN yarn install --production --frozen-lockfile \
    && yarn cache clean \
    && rm -rf /tmp/* \
    && rm -rf ~/.npm

# Copy built application với owner là node user
COPY --from=builder --chown=node:node /usr/app/dist ./dist

# Puppeteer config
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Tạo thư mục với quyền cho node user
RUN mkdir -p /usr/app/logs /usr/app/storage \
    && chown -R node:node /usr/app/logs /usr/app/storage \
    && chmod -R 775 /usr/app/storage

# Switch to node user (UID 1000)
USER node

EXPOSE $PORT

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:${PORT}/health', (r) => {r.statusCode === 200 ? process.exit(0) : process.exit(1)})" || exit 1

CMD ["node", "dist/main"]