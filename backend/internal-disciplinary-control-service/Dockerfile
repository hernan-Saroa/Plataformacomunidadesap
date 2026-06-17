# syntax=docker/dockerfile:1.4
# Multi-stage build for NestJS application
FROM node:20-alpine AS builder

WORKDIR /app

# Prevent Puppeteer from downloading Chrome/Chromium during build.
ENV PUPPETEER_SKIP_DOWNLOAD=1 \
    PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev dependencies for building)
RUN --mount=type=cache,target=/root/.npm npm install --legacy-peer-deps --prefer-offline --no-audit

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM node:20-alpine AS production

# Install Chromium and dependencies for Puppeteer
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    freetype-dev \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    && if [ ! -e /usr/bin/chromium-browser ] && [ -e /usr/bin/chromium ]; then ln -s /usr/bin/chromium /usr/bin/chromium-browser; fi

# Set Puppeteer to skip downloading Chromium
ENV PUPPETEER_SKIP_DOWNLOAD=1 \
    PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN --mount=type=cache,target=/root/.npm npm install --legacy-peer-deps --omit=dev --prefer-offline --no-audit

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist

# Expose the port the app runs on
EXPOSE 3000

# Start the application
CMD ["node", "dist/src/main"]
