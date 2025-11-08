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

# Install required packages
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

# Copy package files with node ownership
COPY --from=builder --chown=node:node /usr/app/package*.json ./

# Install production dependencies
RUN yarn install --production --frozen-lockfile \
    && yarn cache clean \
    && rm -rf /tmp/* \
    && rm -rf ~/.npm

# Copy built application with node ownership
COPY --from=builder --chown=node:node /usr/app/dist ./dist

# Puppeteer config
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Create directories with correct ownership
RUN mkdir -p /usr/app/logs /usr/app/storage \
    && chown -R node:node /usr/app/logs /usr/app/storage \
    && chmod -R 775 /usr/app/logs /usr/app/storage

# Switch to node user
USER node

EXPOSE $PORT

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:${PORT}/health', (r) => {r.statusCode === 200 ? process.exit(0) : process.exit(1)})" || exit 1

CMD ["node", "dist/main"]