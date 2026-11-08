FROM node:26-alpine

WORKDIR /code

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

EXPOSE 5000

CMD ["node", "--env-file=.env", "dist/server.js"]
