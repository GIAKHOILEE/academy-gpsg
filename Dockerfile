# Multi-stage
FROM node:21-alpine AS dependencies
WORKDIR /usr/app
COPY package*.json yarn.lock ./
RUN yarn install --frozen-lockfile

# Build stage
FROM node:21-alpine AS builder
WORKDIR /usr/app
# Copy dependencies từ stage trước
COPY --from=dependencies /usr/app/node_modules ./node_modules
COPY package*.json yarn.lock ./
COPY . .
# Build application
RUN yarn build

# Production stage
FROM node:21-alpine AS production
ENV NODE_ENV=production
# SET TIMEZONE
ENV TZ=Asia/Ho_Chi_Minh
ARG PORT
ENV PORT=$PORT
WORKDIR /usr/app

# FIX: Tạo user với UID 1000 (standard) thay vì 1001
RUN addgroup -g 1000 -S nodejs \
    && adduser -S nextjs -u 1000 -G nodejs

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

# Copy package files
COPY --from=builder --chown=nextjs:nodejs /usr/app/package*.json ./

# Install chỉ production dependencies
RUN yarn install --production --frozen-lockfile \
    && yarn cache clean \
    && rm -rf /tmp/* \
    && rm -rf ~/.npm

# Copy built application
COPY --from=builder --chown=nextjs:nodejs /usr/app/dist ./dist

# Puppeteer config
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# FIX: Tạo thư mục logs VÀ storage với quyền
RUN mkdir -p /usr/app/logs /usr/app/storage \
    && chown -R nextjs:nodejs /usr/app/logs /usr/app/storage \
    && chmod -R 775 /usr/app/storage

USER nextjs

EXPOSE $PORT

# Optional: Add health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:${PORT}/health', (r) => {r.statusCode === 200 ? process.exit(0) : process.exit(1)})" || exit 1

CMD ["node", "dist/main"]