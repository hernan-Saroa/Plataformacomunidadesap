# syntax=docker/dockerfile:1.4
# Multi-stage build for NestJS RUND Service
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
# El lock no está versionado: si falta, resolverlo una vez para ambas etapas.
RUN --mount=type=cache,target=/root/.npm \
    if [ -f package-lock.json ]; then \
      npm ci --prefer-offline --no-audit; \
    else \
      npm install --package-lock=true --prefer-offline --no-audit; \
    fi

COPY . .
RUN npm run build

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

# Producción usa exactamente las versiones resueltas para compilar.
COPY --from=builder /app/package*.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --omit=dev --prefer-offline --no-audit

COPY --from=builder /app/dist ./dist

# Soportes documentales: carpeta escribible por el usuario no root (montar volumen aquí).
RUN mkdir -p /app/uploads && chown -R node:node /app/uploads
USER node

EXPOSE 3016

HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3016/health || exit 1

CMD ["node", "dist/main"]
