# Build stage
FROM node:20-alpine AS build

# Install OpenSSL and other required libraries for Prisma
RUN apk add --no-cache openssl openssl-dev libc6-compat

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm ci

# Generate Prisma client
RUN npx prisma generate

# Copy source code
COPY src ./src

# Build TypeScript
RUN npm run build

# Production stage
FROM node:20-alpine

# Install OpenSSL and other required libraries for Prisma
RUN apk add --no-cache openssl openssl-dev libc6-compat

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install production dependencies only
RUN npm ci --only=production

# Generate Prisma client for production
RUN npx prisma generate

# Copy built application from build stage
COPY --from=build /app/dist ./dist

# Expose port
EXPOSE 8080

# Run database migrations and start server
# Log migration status for better debugging
CMD ["sh", "-c", "echo '🚀 Starting VerdeGO backend...' && echo '📦 Running database migrations...' && npx prisma migrate deploy && echo '✅ Migrations completed successfully' && echo '🌐 Starting server...' && node dist/server.js"]


