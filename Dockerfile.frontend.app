# syntax=docker/dockerfile:1.4

FROM node:20-alpine AS builder

WORKDIR /app

ENV PUPPETEER_SKIP_DOWNLOAD=1 \
    PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

COPY . .

RUN --mount=type=cache,target=/root/.npm npm install --legacy-peer-deps

ARG FRONTEND_APP_DIR
ARG VITE_API_URL=
ARG VITE_ONLYOFFICE_URL=
ARG VITE_MICROSOFT_TENANT_ID=
ARG VITE_MICROSOFT_CLIENT_ID=
ARG VITE_LOGIN_OPTIONS=both

ENV VITE_API_URL=${VITE_API_URL}
ENV VITE_ONLYOFFICE_URL=${VITE_ONLYOFFICE_URL}
ENV VITE_MICROSOFT_TENANT_ID=${VITE_MICROSOFT_TENANT_ID}
ENV VITE_MICROSOFT_CLIENT_ID=${VITE_MICROSOFT_CLIENT_ID}
ENV VITE_LOGIN_OPTIONS=${VITE_LOGIN_OPTIONS}

RUN test -n "${FRONTEND_APP_DIR}"
RUN node scripts/build-frontend-app.mjs "${FRONTEND_APP_DIR}"

FROM nginx:alpine AS production

COPY nginx.frontend.static.conf /etc/nginx/conf.d/default.conf

ARG FRONTEND_DIST_DIR
COPY --from=builder ${FRONTEND_DIST_DIR} /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
