# syntax=docker/dockerfile:1.4
# Multi-stage build for NestJS RUND Service
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --prefer-offline --no-audit

COPY . .
RUN npm run build

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

COPY package*.json ./
RUN --mount=type=cache,target=/root/.npm npm install --omit=dev --prefer-offline --no-audit

COPY --from=builder /app/dist ./dist

# Soportes documentales: carpeta escribible por el usuario no root (montar volumen aquí).
RUN mkdir -p /app/uploads && chown -R node:node /app/uploads
USER node

EXPOSE 3016

HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3016/health || exit 1

CMD ["node", "dist/main"]
