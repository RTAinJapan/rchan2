FROM node:22-slim

WORKDIR /usr/src/app

# Node.js App
ENV NODE_ENV production
COPY package*.json ./
RUN npm install
RUN npm run build

## Bundle app source
COPY . .

# Run app
CMD [ "npm", "run", "start"]
