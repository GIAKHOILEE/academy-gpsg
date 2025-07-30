FROM node:21-alpine AS development

WORKDIR /usr/app

COPY package*.json ./

RUN yarn install

COPY . .

RUN yarn build

FROM node:21-alpine AS production

ENV NODE_ENV=production
ARG PORT
ENV PORT=$PORT

WORKDIR /usr/app

# Tạo user trước khi install packages
RUN addgroup -g 1001 -S nodejs \
    && adduser -S nextjs -u 1001

# Cài dependencies cần thiết cho Alpine + Chrome mount
RUN apk add --no-cache \
    nss \
    freetype \
    freetype-dev \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    libstdc++ \
    gcompat \
    && rm -rf /var/cache/apk/* \
    && rm -rf /tmp/*

RUN addgroup -g 1001 -S nodejs \
    && adduser -S nextjs -u 1001

COPY --from=development --chown=nextjs:nodejs /usr/app/package*.json ./

RUN yarn install --only=production && yarn cache clean

COPY --from=development --chown=nextjs:nodejs /usr/app/dist ./dist

# Puppeteer config - sẽ dùng Chrome từ host
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome

USER nextjs

EXPOSE $PORT

CMD [ "node", "dist/main" ]