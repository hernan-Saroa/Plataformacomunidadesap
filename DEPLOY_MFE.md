# Deploy de Microfrontends Independientes

Este flujo separa el frontend en:

- `frontend`: gateway Nginx público
- `frontend-shell`: shell principal
- `frontend-mfe-*`: un contenedor por microfrontend

El gateway mantiene URLs estables para que el shell siempre cargue los remotos desde el mismo host:

- `/` -> shell
- `/remotes/mfe-auditoria/` -> MFE Auditoría
- `/remotes/mfe-reportes/` -> MFE Reportes
- etc.

## Archivos clave

- `docker-compose.prod.yml`: stack base de producción
- `docker-compose.frontend-mfe.yml`: overlay del frontend desacoplado
- `Dockerfile.frontend.gateway`: imagen del gateway
- `Dockerfile.frontend.app`: imagen genérica para shell o un remoto
- `nginx.frontend.gateway.conf`: ruteo entre shell, remotos y backend

## Levantar todo el frontend desacoplado en PROD

```bash
docker compose -f docker-compose.prod.yml -f docker-compose.frontend-mfe.yml up -d --build frontend frontend-shell frontend-mfe-estructura-org frontend-mfe-gestion-profesoral frontend-mfe-programas-academicos frontend-mfe-gestion-personas frontend-mfe-auditoria frontend-mfe-reportes frontend-mfe-registro-academico frontend-mfe-certificados-laborales frontend-mfe-firma-electronica frontend-mfe-control-interno frontend-mfe-control-disciplinario frontend-mfe-gestion-legal frontend-mfe-pta
```

Si también quieres levantar backend y base de datos en el mismo comando:

```bash
docker compose -f docker-compose.prod.yml -f docker-compose.frontend-mfe.yml up -d --build
```

## Redeploy sólo un microfrontend

Ejemplo para Auditoría:

```bash
docker compose -f docker-compose.prod.yml -f docker-compose.frontend-mfe.yml up -d --build frontend-mfe-auditoria
```

Ejemplo para Reportes:

```bash
docker compose -f docker-compose.prod.yml -f docker-compose.frontend-mfe.yml up -d --build frontend-mfe-reportes
```

El gateway `frontend` no necesita rebuild mientras las rutas no cambien.

## Redeploy sólo el shell

```bash
docker compose -f docker-compose.prod.yml -f docker-compose.frontend-mfe.yml up -d --build frontend-shell
```

## Variables útiles del overlay

Por defecto el overlay apunta a PROD. Si quieres reutilizarlo en otro entorno, puedes exportar:

```bash
export FRONTEND_NETWORK_KEY=superapp-net-prod
export FRONTEND_CONTAINER_SUFFIX=-prod
export FRONTEND_VITE_API_URL=https://comunidadesap.esap.edu.co/services
export FRONTEND_VITE_ONLYOFFICE_URL=https://comunidadesap.esap.edu.co:9000
```

Para PRE, QA o DEV debes cambiar esos valores para que coincidan con la red y URLs del compose base correspondiente.

## Build local por app

```bash
npm run build:app -- mfe-auditoria
npm run build:app -- shell
```
