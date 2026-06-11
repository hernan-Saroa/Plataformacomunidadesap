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
ARG ESAP_BUILD_DATE=

ENV VITE_API_URL=${VITE_API_URL}
ENV VITE_ONLYOFFICE_URL=${VITE_ONLYOFFICE_URL}
ENV VITE_MICROSOFT_TENANT_ID=${VITE_MICROSOFT_TENANT_ID}
ENV VITE_MICROSOFT_CLIENT_ID=${VITE_MICROSOFT_CLIENT_ID}
ENV VITE_LOGIN_OPTIONS=${VITE_LOGIN_OPTIONS}
ENV ESAP_BUILD_DATE=${ESAP_BUILD_DATE}

RUN test -n "${FRONTEND_APP_DIR}"
RUN node scripts/build-frontend-app.mjs "${FRONTEND_APP_DIR}"

FROM nginx:alpine AS production

RUN mkdir -p /opt/esap-nginx
COPY nginx.frontend.static.conf /opt/esap-nginx/http.conf
COPY nginx.frontend.static.tls.conf.template /opt/esap-nginx/tls.conf.template
COPY docker/nginx/40-esap-select-config.sh /docker-entrypoint.d/40-esap-select-config.sh
RUN chmod +x /docker-entrypoint.d/40-esap-select-config.sh

ARG FRONTEND_DIST_DIR
COPY --from=builder ${FRONTEND_DIST_DIR} /usr/share/nginx/html

EXPOSE 80 443

CMD ["nginx", "-g", "daemon off;"]
