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

RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    freetype-dev \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    && rm -rf /var/cache/apk/*

RUN addgroup -g 1001 -S nodejs \
    && adduser -S nextjs -u 1001

COPY --from=development --chown=nextjs:nodejs /usr/app/package*.json ./

RUN yarn install --only=production && yarn cache clean

COPY --from=development --chown=nextjs:nodejs /usr/app/dist ./dist

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

USER nextjs

EXPOSE $PORT

CMD [ "node", "dist/main" ]