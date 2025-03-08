FROM node:22-slim

WORKDIR /usr/src/app

# Node.js App
ENV NODE_ENV development
COPY package*.json ./
RUN npm install

## Bundle app source
COPY . .
RUN npm run build

# Run app
CMD [ "npm", "run", "start"]
