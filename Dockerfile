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

# Tạo user trước khi install packages
RUN addgroup -g 1001 -S nodejs \
    && adduser -S nextjs -u 1001

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

# Tạo thư mục logs với quyền
RUN mkdir -p /usr/app/logs && chown -R nextjs:nodejs /usr/app/logs

USER nextjs

EXPOSE $PORT

CMD ["node", "dist/main"]