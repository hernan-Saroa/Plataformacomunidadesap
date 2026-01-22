# Multi-stage build for NestJS application
FROM node:20-alpine AS builder

WORKDIR /app

# Prevent Puppeteer from downloading Chromium during build.
ENV PUPPETEER_SKIP_DOWNLOAD=1

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev dependencies for building) with cache mount
RUN --mount=type=cache,target=/root/.npm \
    npm ci --legacy-peer-deps

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

# Install Chromium for Puppeteer.
RUN apk add --no-cache chromium nss freetype harfbuzz ca-certificates ttf-freefont \
  && if [ ! -e /usr/bin/chromium-browser ] && [ -e /usr/bin/chromium ]; then ln -s /usr/bin/chromium /usr/bin/chromium-browser; fi

# Prevent Puppeteer from downloading Chromium during install.
ENV PUPPETEER_SKIP_DOWNLOAD=1
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Copy package files
COPY package*.json ./

# Install only production dependencies with cache mount
RUN --mount=type=cache,target=/root/.npm \
    npm ci --legacy-peer-deps --omit=dev && \
    npm cache clean --force

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist

# Expose the port the app runs on
EXPOSE 3000

# Start the application
CMD ["node", "dist/main"]
