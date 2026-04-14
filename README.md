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

**Nota**: Se recomienda usar el script `deploy.local.sh` para un despliegue completo y automatizado.

1. Clona el repositorio.
2. Asegúrate de tener los archivos `.env` configurados (copia de `.env.example` si es necesario).
   - **Importante**: Configura las variables de autenticación Microsoft (`VITE_MICROSOFT_TENANT_ID` y `VITE_MICROSOFT_CLIENT_ID`) si usas autenticación OAuth. Sin estas variables, aparecerán advertencias pero la plataforma funcionará.
3. Ejecuta `./deploy.local.sh up` para iniciar todos los servicios (incluyendo los 13 microfrontends).
4. Verifica el estado con `docker-compose -f docker-compose.local.yml ps`.
5. Accede al frontend enhttp://localhost:5173 y al API en http://localhost:3000.

**Verificación del despliegue**:
- Frontend: http://localhost:5173 (debería cargar la aplicación shell completa)
- API Gateway: http://localhost:3000 (endpoint principal)

### Comandos Útiles
- `./deploy.local.sh up`: Inicia todos los servicios.
- `./deploy.local.sh down`: Detiene todos los servicios.
- `./deploy.local.sh logs <servicio>`: Ve logs de un servicio.
- `./deploy.local.sh restart`: Reinicia todos los servicios.
- `./deploy.local.sh status`: Ver estado de servicios.
- `./deploy.local.sh health`: Valida conectividad de servicios.
- `./deploy.local.sh rebuild-mfe <mfe-name>`: Reconstruye un microfrontend específico.

## Despliegue sin Docker (Desarrollo Local)

### Requisitos
- Node.js v22+ (requerido para `npm run dev:all`)
- PostgreSQL (puerto 5432)
- Redis (puerto 6379)

### Pasos de Despliegue

1. Instala dependencias: `npm install`
2. Configura la base de datos PostgreSQL con usuario `postgres` y contraseña `password`
3. Inicia PostgreSQL y Redis localmente
4. Inicia servicios backend:
   - Ve a cada directorio en `backend/` y ejecuta `npm run start:dev`
   - O usa un script personalizado para iniciar todos los servicios backend

5. **Opción A: Despliegue completo de frontend (Recomendado)**
   - Ejecuta `npm run dev:all` - inicia automáticamente todos los MFEs en puertos separados (3101-3112) y el shell en puerto 3000
   - En equipos con menos RAM puedes iniciar solo un subconjunto: `npm run dev:all -- --apps=shell,mfe-control-interno,mfe-control-disciplinario`
   - Para ver los nombres válidos: `npm run dev:all -- --list-apps`
   - Accede al frontend en http://localhost:3000

6. **Opción B: Solo shell (Limitado)**
   - Ejecuta `npm run dev` - inicia solo el shell en puerto 3000
   - Los MFEs no estarán disponibles (solo funciona con despliegue Docker completo)

### Arquitectura de Desarrollo vs Producción

- **Desarrollo Local**: Cada MFE corre en su propio servidor de desarrollo (puertos 3101-3112). El shell carga los MFEs remotamente via Module Federation.
- **Docker/Producción**: Todos los MFEs se construyen estáticamente y se sirven a través de nginx gateway en el puerto principal.

### Puertos de Desarrollo
- Shell: 3000
- MFE Estructura Org: 3101
- MFE Gestión Profesoral: 3102
- MFE Programas Académicos: 3103
- MFE Gestión Personas: 3104
- MFE Auditoría: 3105
- MFE Reportes: 3106
- MFE Registro Académico: 3107
- MFE Certificados Laborales: 3108
- MFE Firma Electrónica: 3109
- MFE Control Interno: 3110
- MFE Control Disciplinario: 3111
- MFE Gestión Legal: 3112

## Scripts Disponibles

### Frontend
- `npm run dev`: Inicia solo el shell del frontend (puerto 3000). MFEs no disponibles.
- `npm run dev:all`: Inicia todos los MFEs + shell. **Requiere Node.js v22+**.
- `npm run dev:all -- --apps=<lista>`: Inicia solo los MFEs indicados, útil en Windows o equipos con poca memoria.
- `npm run dev:all -- --list-apps`: Lista los nombres válidos para `--apps`.
- `npm run build`: Construye todos los MFEs y el shell para producción.
- `npm run build:shell`: Construye solo el shell.
- `npm run build:app`: Construye una app específica (usa `-- <app-name>`).

### Backend
- En cada directorio `backend/<servicio>/`: `npm run start:dev` para desarrollo

## Deploy rápido por ambiente

DEV:

```bash
./deploy.dev.sh rebuild-all-mfe
./deploy.dev.sh rebuild-mfe auditoria
```

PRE:

```bash
./deploy.pre.sh rebuild
./deploy.pre.sh rebuild-mfe reportes
```

QA:

```bash
./deploy.qa.sh rebuild
./deploy.qa.sh rebuild-mfe shell
```

PROD:

```bash
./deploy.prod.sh rebuild
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

### Docker Deployment
- Asegúrate de que los puertos no estén ocupados (frontend: 80/5173, API: 3000, DB: 8080/5432, Redis: 6379).
- Verifica variables de entorno en archivos `.env`.
- Si hay errores de BD, reinicia PostgreSQL: `docker-compose -f docker-compose.local.yml restart superapp-db`.
- **Advertencias sobre VITE_MICROSOFT_TENANT_ID y VITE_MICROSOFT_CLIENT_ID**: Opcionales para desarrollo local.

### Native Development
- **Node.js versión**: `npm run dev:all` requiere Node.js v22+. Si tienes versión anterior, actualiza o usa Docker.
- **Windows / poca RAM**: Si aparece `fatal error: out of memory`, usa `npm run dev:all -- --apps=...` para cargar solo los MFEs necesarios.
- **MFEs no cargan**: Asegúrate de usar `npm run dev:all`, no solo `npm run dev`. Los MFEs necesitan correr en puertos separados.
- **Errores de Module Federation**: Verifica que todos los MFEs estén corriendo (puertos 3101-3112) antes de acceder al shell.
- **Puertos ocupados**: Los MFEs usan puertos 3101-3112. Libera estos puertos si es necesario.
- **Dependencias**: Ejecuta `npm install` en la raíz y en cada directorio de MFE si hay errores de importación.

## Guías

- [DEPLOY_DEV.md](DEPLOY_DEV.md)
- [DEPLOY_LOCAL.md](/Plataformacomunidadesap/DEPLOY_LOCAL.md)
- [DEPLOY_PRE.md](DEPLOY_PRE.md)
- [DEPLOY_QA.md](DEPLOY_QA.md)
- [DEPLOY_PROD.md](DEPLOY_PROD.md)
- [DEPLOY_MFE.md](DEPLOY_MFE.md)
