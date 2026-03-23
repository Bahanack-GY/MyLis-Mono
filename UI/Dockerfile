# ── Build stage ──────────────────────────────────────
FROM node:22-alpine AS build

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

COPY . .

# Build with relative API URL so nginx can proxy
ENV VITE_API_URL=/
RUN npm run build

# Development stage
FROM node:22-alpine AS development
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install
COPY . .
EXPOSE 5173
ENTRYPOINT ["npm", "run", "dev", "--", "--host", "0.0.0.0"]

#  Runtime stage 
FROM nginx:1.27-alpine AS production

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
