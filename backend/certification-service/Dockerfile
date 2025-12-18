# Multi-stage build for NestJS application
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev dependencies for building)
RUN npm install

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm install --only=production && npm cache clean --force

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist
# Copy static uploads (logos, signatures, etc.)
COPY --from=builder /app/uploads ./uploads

# Expose the port the app runs on
EXPOSE 3000

# Start the application
CMD ["node", "dist/main"]