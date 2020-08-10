FROM node:14-alpine

WORKDIR /app

RUN apk update
RUN apk add alsa-utils alsa-lib alsaconf

COPY package*.json ./

RUN npm install --production

COPY . /app

ENV NODE_ENV production
EXPOSE 4000

RUN npm run build

CMD ["npm", "start"]