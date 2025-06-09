FROM node:21 AS development

WORKDIR /usr/app


COPY package*.json ./

RUN yarn install

COPY . .

RUN yarn build

FROM node:21 AS production

ENV NODE_ENV=production
ARG PORT
ENV PORT=$PORT

WORKDIR /usr/app

COPY --from=development /usr/app/package*.json ./

RUN yarn install --only=production

COPY --from=development /usr/app/dist ./dist

EXPOSE $PORT

CMD [ "node", "dist/main" ]