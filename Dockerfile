FROM node:14

WORKDIR /usr/src/app

# Node.js App
ENV NODE_ENV production
COPY package*.json ./
RUN npm install

## Bundle app source
COPY . .

# Run app
CMD [ "npm", "run", "start"]
