# Multi-stage build tối ưu
FROM node:21-alpine AS dependencies

WORKDIR /usr/app
COPY package*.json yarn.lock ./
RUN yarn install --frozen-lockfile --production=false

# Build stage
FROM node:21-alpine AS builder

WORKDIR /usr/app
# Copy dependencies từ stage trước
COPY --from=dependencies /usr/app/node_modules ./node_modules
COPY package*.json yarn.lock ./
COPY . .

# Build application
RUN yarn build

# Production stage - Alpine với Chromium
FROM node:21-alpine AS production

ENV NODE_ENV=production
ARG PORT
ENV PORT=$PORT

WORKDIR /usr/app

# Tạo user trước khi install packages
RUN addgroup -g 1001 -S nodejs \
    && adduser -S nextjs -u 1001

# Install Chromium và dependencies tối thiểu
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    ttf-dejavu \
    font-noto-emoji \
    && rm -rf /var/cache/apk/* \
    && rm -rf /tmp/*

# Copy package files từ builder
COPY --from=builder --chown=nextjs:nodejs /usr/app/package*.json ./

RUN yarn install --only=production

COPY --from=development /usr/app/dist ./dist

EXPOSE $PORT

CMD ["node", "dist/main"]