# Build stage
FROM node:22-alpine AS build

WORKDIR /app

# bcrypt requires native compilation
RUN apk add --no-cache python3 make g++

COPY package.json package-lock.json* ./
RUN npm ci

COPY . .
RUN npm run build

# Development stage
FROM node:22-alpine AS development
WORKDIR /app
RUN apk add --no-cache python3 make g++ libstdc++
COPY package.json package-lock.json* ./
RUN npm install
COPY . .
ENTRYPOINT ["npm", "run", "start:dev"]

# Runtime stage 
FROM node:22-alpine AS production

WORKDIR /app

# bcrypt native addon needs these at runtime
RUN apk add --no-cache libstdc++

COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./

COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

RUN mkdir -p /app/uploads

EXPOSE 3025

ENTRYPOINT ["docker-entrypoint.sh"]
