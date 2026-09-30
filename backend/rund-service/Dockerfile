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

EXPOSE 3016

CMD ["node", "dist/main"]
