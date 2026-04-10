# Plataforma Comunidad ESAP

Esta es una plataforma de gestión para la comunidad ESAP, construida con una arquitectura de microservicios en el backend y microfrontends en el frontend. Utiliza NestJS para los servicios backend, React y Vite para los microfrontends, PostgreSQL como base de datos, y Redis para caché.

## Arquitectura

### Backend
- **Microservicios**: 12 servicios independientes en `backend/`, incluyendo api-gateway, auth-service, academic-registration-service, academic-work-plan-service, certification-service, internal-disciplinary-control-service, interoperability-service, internal-institutional-control-service, legal-management-service, notifications-service, travel-expenses-service y audit-service.
- **Tecnologías**: NestJS, TypeORM, PostgreSQL, Redis.

### Frontend
- **Microfrontends**: 13 MFEs en `apps/`, coordinados por una aplicación shell: shell, mfe-auditoria, mfe-certificados-laborales, mfe-control-disciplinario, mfe-control-interno, mfe-estructura-org, mfe-firma-electronica, mfe-gestion-legal, mfe-gestion-personas, mfe-gestion-profesoral, mfe-programas-academicos, mfe-registro-academico y mfe-reportes.
- **Tecnologías**: React, Vite, Module Federation.

### Infraestructura
- **Docker**: Contenerización completa con docker-compose.
- **Monorepo**: Gestionado con npm workspaces.

## Requisitos

- Docker y docker-compose instalados.
- Node.js (v18+) si se despliega sin Docker.
- PostgreSQL y Redis si se despliega sin Docker.

## Instalación y Despliegue con Docker

1. Clona el repositorio.
2. Asegúrate de tener los archivos `.env` configurados (copia de `.env.example` si es necesario).
3. Ejecuta `docker-compose up -d` para iniciar todos los servicios.
4. Accede al frontend en http://localhost:5173 y al API en http://localhost:3000.

### Comandos Útiles
- `docker-compose up -d`: Inicia servicios.
- `docker-compose down`: Detiene servicios.
- `docker-compose logs <servicio>`: Ve logs de un servicio.
- `docker-compose restart <servicio>`: Reinicia un servicio.

## Despliegue sin Docker (Desarrollo Local)

1. Instala Node.js, PostgreSQL (puerto 5432) y Redis (puerto 6379).
2. Crea la base de datos `esap_db` con usuario `postgres` y contraseña `password`.
3. Ejecuta migraciones si es necesario.
4. Instala dependencias: `npm install`.
5. Construye paquetes compartidos: `npm run build` en `packages/shared-ui` y `packages/shared-types`.
6. Inicia servicios backend: Para cada servicio en `backend/`, ve al directorio y ejecuta `npm run start:dev`.
7. Inicia frontend: `npm run dev` (shell) o `npm run dev:all` (todos los MFEs).
8. Accede al frontend en http://localhost:5173 y al API en http://localhost:3000.

## Scripts Disponibles

- `npm run dev`: Inicia el shell del frontend.
- `npm run dev:all`: Inicia todos los MFEs.
- `npm run build`: Construye la aplicación completa.
- `npm run build:app -- <app>`: Construye una app específica.

## Deploy rápido por ambiente

DEV:

```bash
./deploy.dev.sh up
./deploy.dev.sh up-mfe
./deploy.dev.sh rebuild-mfe auditoria
```

PRE:

```bash
./deploy.pre.sh up
./deploy.pre.sh up-mfe
./deploy.pre.sh rebuild-mfe reportes
```

QA:

```bash
./deploy.qa.sh up
./deploy.qa.sh up-mfe
./deploy.qa.sh rebuild-mfe shell
```

PROD:

```bash
./deploy.prod.sh up
./deploy.prod.sh up-mfe
./deploy.prod.sh rebuild-mfe auditoria
```

## Comandos MFE

Los scripts `deploy.*.sh` soportan:

```bash
up-mfe
down-mfe
restart-mfe
status-mfe
logs-mfe
rebuild-mfe shell
rebuild-mfe gateway
rebuild-mfe auditoria
rebuild-mfe reportes
rebuild-mfe-select
```

## Contribución

1. Clona el repositorio.
2. Crea una rama para tu feature.
3. Realiza cambios y prueba con Docker o local.
4. Envía un PR con descripción detallada.

## Problemas Comunes

- Asegúrate de que los puertos no estén ocupados.
- Verifica variables de entorno en `.env` files.
- Si hay errores de BD, reinicia el contenedor de PostgreSQL.

## Guías

- [DEPLOY_DEV.md](DEPLOY_DEV.md)
- [DEPLOY_PRE.md](DEPLOY_PRE.md)
- [DEPLOY_QA.md](DEPLOY_QA.md)
- [DEPLOY_PROD.md](DEPLOY_PROD.md)
- [DEPLOY_MFE.md](DEPLOY_MFE.md)
