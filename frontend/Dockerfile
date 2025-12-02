# Build stage
FROM node:20-alpine AS build

WORKDIR /app

# --- Build-time args coming from docker-compose ---
ARG VITE_API_URL
ARG VITE_GOOGLE_MAPS_API_KEY

# Expose them as env so Vite can see import.meta.env.VITE_*
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_GOOGLE_MAPS_API_KEY=$VITE_GOOGLE_MAPS_API_KEY

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./
COPY vite.config.ts ./
COPY index.html ./

# Install dependencies
RUN npm ci

# Copy source code
COPY src ./src

# Build application (Vite reads VITE_* env vars here)
RUN npm run build

# -------------------------------------------------------------------
# Production stage
FROM nginx:alpine

# Copy built files to nginx
COPY --from=build /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
