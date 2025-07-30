# Multi-stage build
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

# Production stage - Ubuntu thay vì Alpine
FROM node:21-slim AS production

ENV NODE_ENV=production
ARG PORT
ENV PORT=$PORT

WORKDIR /usr/app

RUN groupadd -r nodejs && useradd -r -g nodejs nextjs

# Install minimal dependencies cho Chrome
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        ca-certificates \
        fonts-liberation \
        libappindicator3-1 \
        libasound2 \
        libatk-bridge2.0-0 \
        libdrm2 \
        libgtk-3-0 \
        libnspr4 \
        libnss3 \
        libxss1 \
        libxtst6 \
        xdg-utils \
        libxrandr2 \
        libgbm1 \
        libpangocairo-1.0-0 \
        libatk1.0-0 \
        libcairo2 \
        libgdk-pixbuf2.0-0 \
        libxcomposite1 \
        libxcursor1 \
        libxdamage1 \
        libxi6 \
        libxfixes3 \
    && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY --from=builder --chown=nextjs:nodejs /usr/app/package*.json ./

RUN yarn install --production --frozen-lockfile \
    && yarn cache clean \
    && rm -rf /tmp/*

# Copy built application
COPY --from=builder --chown=nextjs:nodejs /usr/app/dist ./dist

# Puppeteer config
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome

USER nextjs
EXPOSE $PORT
CMD ["node", "dist/main"]