# Multi-stage build for NestJS application
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev dependencies for building) with cache mount
# sharing=locked previene conflictos cuando múltiples builds corren en paralelo
RUN --mount=type=cache,target=/root/.npm,sharing=locked \
    npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies with cache mount
# sharing=locked previene conflictos cuando múltiples builds corren en paralelo
RUN --mount=type=cache,target=/root/.npm,sharing=locked \
    npm ci --only=production

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist

# Expose the port the app runs on
EXPOSE 3009

# Start the application
CMD ["node", "dist/main"]