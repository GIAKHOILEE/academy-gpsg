# Multi-stage build
FROM node:21-alpine AS dependencies

WORKDIR /usr/app

# Copy package files including yarn.lock
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
ARG PORT
ENV PORT=$PORT

WORKDIR /usr/app

# Tạo user CHỈ 1 LẦN
RUN addgroup -g 1001 -S nodejs \
    && adduser -S nextjs -u 1001

# Cài dependencies cần thiết cho Alpine + Chrome mount
RUN apk add --no-cache \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    libstdc++ \
    gcompat \
    && rm -rf /var/cache/apk/* \
    && rm -rf /tmp/*

# Copy package files từ builder stage
COPY --from=builder --chown=nextjs:nodejs /usr/app/package*.json ./

# Install chỉ production dependencies
RUN yarn install --production --frozen-lockfile \
    && yarn cache clean \
    && rm -rf /tmp/* \
    && rm -rf ~/.npm

# Copy built application từ builder stage
COPY --from=builder --chown=nextjs:nodejs /usr/app/dist ./dist

# Puppeteer config - sẽ dùng Chrome từ host
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome

USER nextjs

EXPOSE $PORT

CMD ["node", "dist/main"]