FROM node:20-alpine
# Install Docker CLI inside the container so it can trigger sibling containers
RUN apk add --no-cache docker-cli
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
CMD ["npm", "start"]
