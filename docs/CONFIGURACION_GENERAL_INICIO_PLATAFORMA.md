# Configuracion General e Inicio de la Plataforma Comunidad ESAP

## 1. Objetivo

Este documento describe la configuracion tecnica general de la plataforma, su
distribucion por capas y los procedimientos para iniciar la aplicacion.

Alcance:

- Infraestructura y base de datos.
- Backend basado en microservicios.
- Frontend basado en micro-frontends.
- Inicio integral con Docker.
- Inicio para desarrollo local con Node.js.
- Variables de entorno, verificacion y hallazgos actuales.

Fecha de revision del repositorio: `2026-05-25`.

## 2. Resumen de Arquitectura

La solucion esta organizada como un monorepo con tres grupos principales:

| Capa | Ubicacion | Tecnologia verificada | Funcion |
| --- | --- | --- | --- |
| Frontend | `apps/` | React 18, TypeScript, Vite 6, Module Federation | Shell y micro-frontends funcionales |
| Backend | `backend/` | NestJS 11, servicios HTTP independientes | API Gateway y dominios de negocio |
| Datos | `db/` y PostgreSQL | PostgreSQL 16, TypeORM, SQL de inicializacion/migracion | Persistencia por esquemas |
| Infraestructura auxiliar | Docker Compose | Redis 7, OnlyOffice, Nginx, SonarQube en DEV | Servicios complementarios |
| Compartidos frontend | `packages/` | TypeScript | Tipos, hooks y componentes compartidos |

### Flujo de comunicacion

En despliegue Docker, el navegador consume el gateway frontend Nginx y este
expone el backend mediante `/services`. El API Gateway enruta solicitudes con
el patron:

```text
/{servicio}/api/v1/{ruta}
```

Ejemplos:

```text
/auth/api/v1/users           -> auth-service:3001/users
/certificados/api/v1/...     -> certification-service:3004/...
/legal/api/v1/...            -> legal-management-service:3008/...
```

En desarrollo frontend sobre `localhost`, el codigo tambien soporta modo
directo: el cliente transforma rutas versionadas para consultar cada
microservicio en su puerto, sin pasar por el API Gateway.

## 3. Distribucion del Proyecto

```text
Plataformacomunidadesap/
|-- apps/                         # Shell y micro-frontends React/Vite
|   |-- shell/
|   |-- mfe-estructura-org/
|   |-- mfe-gestion-profesoral/
|   |-- mfe-programas-academicos/
|   |-- mfe-gestion-personas/
|   |-- mfe-auditoria/
|   |-- mfe-reportes/
|   |-- mfe-registro-academico/
|   |-- mfe-certificados-laborales/
|   |-- mfe-firma-electronica/
|   |-- mfe-control-interno/
|   |-- mfe-control-disciplinario/
|   |-- mfe-gestion-legal/
|   `-- mfe-pta/
|-- backend/                      # API Gateway y microservicios NestJS
|-- db/
|   |-- init/                     # DDL/datos iniciales cargados por PostgreSQL
|   `-- migrations/               # Migraciones SQL incrementales
|-- packages/                     # shared-types, shared-ui, shared-hooks
|-- scripts/                      # Arranque y build de frontend/backend
|-- docker-compose.dev.yml        # Stack DEV con PostgreSQL y Redis
|-- docker-compose.local.yml      # Intencion de stack local con BD externa
|-- docker-compose.frontend-mfe.yml # Overlay de shell + remotos MFE
|-- deploy.dev.sh                 # Administracion del entorno DEV
`-- deploy.local.sh               # Administracion local, con incidencia vigente
```

## 4. Base de Datos e Infraestructura

### 4.1 PostgreSQL

La base principal configurada para el stack DEV es:

| Elemento | Configuracion verificada |
| --- | --- |
| Motor | PostgreSQL |
| Imagen Docker DEV | `postgres:16` |
| Base | `esap_db` |
| Puerto publicado | `5432` |
| Inicializacion | Archivos de `db/init/` |
| Evolucion | Archivos SQL de `db/migrations/` |
| ORM backend | TypeORM en servicios con persistencia |

El modelo utiliza una misma base logica con separacion por esquemas:

| Servicio/dominio | Esquema configurado o usado |
| --- | --- |
| Autenticacion, usuarios, roles y permisos | `auth` |
| Registro academico y certificados de graduados | `academic_registration` |
| Plan de trabajo academico (PTA) | `academic_work_plan` |
| Certificados laborales | `certification` |
| Control disciplinario interno | `internal_disciplinary_control` |
| Control institucional interno | `control_interno` en entidades; el compose declara `internal_institutional_control` |
| Gestion legal | `legal_management` y tablas asociadas de requerimientos |
| Notificaciones | `notifications` |
| Auditoria de solicitudes | `audit` |

Los servicios persistentes tienen `synchronize: false` o sincronizacion
desactivada por defecto. La actualizacion de estructura debe hacerse mediante
scripts SQL y migraciones controladas, no dejando que TypeORM altere tablas
automaticamente.

### 4.2 Redis

El stack DEV declara `redis:7-alpine`, publica el puerto `6379` y conserva sus
datos con volumen y `appendonly yes`. Varios servicios reciben:

```env
REDIS_URL=redis://redis:6379
```

Estado verificado: Redis esta provisionado y configurado a nivel Docker, pero
en la revision del codigo backend no se identifico un cliente Redis,
`CacheModule`, `cache-manager`, `ioredis` o colas Bull consumiendo esa
configuracion. Por tanto, no debe afirmarse que exista cache Redis activa
hasta implementar o localizar su integracion aplicativa.

### 4.3 Servicios auxiliares

| Servicio | Uso | Puerto/configuracion DEV |
| --- | --- | --- |
| OnlyOffice Document Server | Edicion o visualizacion documental | `9000:80` |
| Nginx frontend gateway | Publicacion del shell y remotos MFE | `80:80` |
| SonarQube | Analisis de calidad incluido en compose DEV | `9090:9000` |
| Base SonarQube | Persistencia exclusiva de SonarQube | PostgreSQL 15 interno |

## 5. Backend: Microservicios

El backend esta construido con NestJS. El API Gateway recibe solicitudes del
frontend y redirige a los servicios de dominio mediante `proxy.config.ts`.

| Servicio | Puerto | Responsabilidad principal | Persistencia TypeORM verificada |
| --- | ---: | --- | --- |
| `api-gateway` | 3000 | Enrutamiento, autenticacion transversal y auditoria de llamadas | No |
| `auth-service` | 3001 | Login, personas, usuarios, roles, permisos y estructura | Si, `auth` |
| `academic-registration-service` | 3002 | Registro academico y certificados de graduados | Si, `academic_registration` |
| `academic-work-plan-service` | 3003 | PTA y gestion academica asociada | Si, `academic_work_plan` |
| `certification-service` | 3004 | Certificados laborales y plantillas | Si, `certification` |
| `internal-disciplinary-control-service` | 3005 | Procesos y configuracion disciplinaria | Si, `internal_disciplinary_control` |
| `interoperability-service` | 3006 | Integraciones externas | No identificada en codigo actual |
| `internal-institutional-control-service` | 3007 | Control interno institucional/OCIG | Si, `control_interno` |
| `legal-management-service` | 3008 | Gestion legal, requerimientos y comunicaciones | Si, `legal_management` |
| `notifications-service` | 3009 | Notificaciones y correo | Si, `notifications` |
| `travel-expenses-service` | 3010 | Viaticos | No identificada en codigo actual |
| `audit-service` | 3011 | Registro de auditoria HTTP | Si, `audit` |

Observacion: `docker-compose.dev.yml` asigna variables de base de datos a
`interoperability-service` y `travel-expenses-service`, pero sus fuentes
revisadas son servicios base sin configuracion TypeORM identificada. La
persistencia para esos modulos no se encuentra implementada o no esta
incorporada en el codigo revisado.

## 6. Frontend: Shell y Micro-frontends

El frontend usa React, TypeScript y Vite. El shell carga los modulos remotos
con `@originjs/vite-plugin-federation`.

| Aplicacion | Funcion | Puerto en desarrollo nativo |
| --- | --- | ---: |
| `shell` | Host principal y navegacion | 3000 |
| `mfe-estructura-org` | Estructura organizacional | 3101 |
| `mfe-gestion-profesoral` | Gestion profesoral | 3102 |
| `mfe-programas-academicos` | Programas academicos | 3103 |
| `mfe-gestion-personas` | Personas, usuarios y RBAC | 3104 |
| `mfe-auditoria` | Auditoria | 3105 |
| `mfe-reportes` | Reportes | 3106 |
| `mfe-registro-academico` | Registro academico | 3107 |
| `mfe-certificados-laborales` | Certificados laborales | 3108 |
| `mfe-firma-electronica` | Firma electronica | 3109 |
| `mfe-control-interno` | Control institucional | 3110 |
| `mfe-control-disciplinario` | Control disciplinario | 3111 |
| `mfe-gestion-legal` | Gestion legal | 3112 |
| `mfe-pta` | Plan de trabajo academico | 3113 |

En Docker MFE, el usuario no navega directamente a esos puertos: Nginx
publica el shell y los remotos bajo rutas `/remotes/<mfe>/`.

## 7. Variables de Entorno

### 7.1 Reglas de manejo

- No versionar credenciales reales, secretos JWT, claves Microsoft, claves
  SMTP ni cadenas Oracle/MySQL.
- Usar `.env.example` solamente como plantilla.
- Sustituir todos los valores de ejemplo antes de desplegar.
- Mantener un mismo `JWT_SECRET` y `JWT_REFRESH_SECRET` entre gateway y
  servicios que validen tokens.
- Mantener las URLs frontend alineadas con el gateway del ambiente.

Se verifico que `.env.dev`, `.env.local`, `apps/shell/.env` y los `.env` de
backend estan ignorados por Git. Aun asi, pueden contener secretos locales:
deben protegerse y rotarse si han sido expuestos fuera del entorno autorizado.

### 7.2 Variables principales para DEV con Docker

El flujo `deploy.dev.sh` carga `.env.dev`. Como minimo se deben definir:

```env
DB_PASSWORD=<clave_postgresql>
JWT_SECRET=<secreto_jwt>
JWT_REFRESH_SECRET=<secreto_refresh>
VITE_LOGIN_OPTIONS=both
VITE_MICROSOFT_TENANT_ID=<tenant_si_aplica>
VITE_MICROSOFT_CLIENT_ID=<client_si_aplica>
```

Variables opcionales segun integracion habilitada:

```env
EMAIL_PROVIDER=<microsoft_graph_o_smtp>
AZURE_TENANT_ID=<valor>
AZURE_CLIENT_ID=<valor>
AZURE_CLIENT_SECRET=<valor>
NOTIFICATIONS_EMAIL_ACCOUNT=<cuenta>
LEGAL_EMAIL_ACCOUNT=<cuenta>

ORACLE_FNC_ENABLED=false
ORACLE_GRAD_ENABLED=false
MYSQL_GRAD_ENABLED=false
```

Solo deben cambiarse los indicadores `*_ENABLED` a `true` cuando la
configuracion de acceso correspondiente se encuentre completa y aprobada.

### 7.3 Variables del modo local con base externa

`deploy.local.sh` fue disenado para consumir una PostgreSQL ya existente,
fuera de su compose:

```env
LOCAL_DB_HOST=host.docker.internal
LOCAL_DB_PORT=5432
LOCAL_DB_USER=postgres
LOCAL_DB_PASSWORD=<clave_local>
LOCAL_DB_NAME=esap_db
LOCAL_CORS_ORIGIN=http://localhost
FRONTEND_VITE_API_URL=http://localhost/services
FRONTEND_VITE_ONLYOFFICE_URL=http://localhost:9000
```

Este modo tiene actualmente un bloqueo descrito en la seccion 10 y no se debe
usar como instruccion de arranque integral hasta corregirlo.

## 8. Inicio Integral con Docker: Flujo DEV Verificado

Este es el flujo de configuracion que incluye PostgreSQL, Redis, API Gateway,
microservicios, OnlyOffice, shell y los trece remotos MFE, incluyendo
`mfe-pta`.

Importante: el perfil DEV esta configurado para la URL
`http://4.156.71.181`. Si se usa en otro servidor o en una estacion local, se
deben ajustar las URLs/CORS del ambiente y del script antes de publicarlo.

### 8.1 Prerrequisitos

- Docker Engine o Docker Desktop en ejecucion.
- Docker Compose v2 disponible mediante `docker compose`.
- Permisos para ejecutar scripts Bash.
- Archivo `.env.dev` configurado de forma segura.
- Puertos disponibles: `80`, `3000` a `3011`, `5432`, `6379`, `9000` y
  `9090` si se levanta SonarQube.

### 8.2 Configuracion inicial

Desde la raiz del repositorio:

```bash
cp .env.example .env.dev
chmod +x deploy.dev.sh
```

Editar `.env.dev` y reemplazar secretos, URLs y configuraciones opcionales.
No mantener contrasenas o claves de ejemplo en un ambiente compartido.

### 8.3 Construir e iniciar toda la aplicacion

Para una primera publicacion completa con micro-frontends, forzar el flujo
Docker tradicional del script:

```bash
MFE_DOCKER_BUILD_ONLY=true ./deploy.dev.sh rebuild-all-mfe
```

Ese comando:

- Construye o actualiza backend y API Gateway.
- Construye el gateway frontend, shell y todos los remotos, incluido PTA.
- Inicia PostgreSQL, Redis, OnlyOffice y contenedores de aplicacion.
- Ejecuta las migraciones SQL pendientes en `db/migrations/`.

El comando sin la variable adicional:

```bash
./deploy.dev.sh rebuild-all-mfe
```

usa el camino rapido de build frontend en host y empaquetado Nginx. En el
codigo actual ese camino no inicia explicitamente backend e infraestructura
en una instalacion limpia; debe usarse sobre un stack base ya levantado o
despues de:

```bash
./deploy.dev.sh rebuild
```

Para iniciar contenedores ya construidos:

```bash
./deploy.dev.sh up
./deploy.dev.sh up-mfe
```

`up` inicia el stack base; `up-mfe` inicia la distribucion desacoplada de
gateway frontend, shell y remotos.

### 8.4 Verificacion y operacion

```bash
./deploy.dev.sh status
./deploy.dev.sh status-mfe
./deploy.dev.sh logs
./deploy.dev.sh logs-mfe
```

URLs del perfil DEV actual:

| Recurso | URL |
| --- | --- |
| Frontend | `http://4.156.71.181` |
| API Gateway a traves de Nginx | `http://4.156.71.181/services` |
| OnlyOffice | `http://4.156.71.181:9000` |

Operaciones de actualizacion:

```bash
./deploy.dev.sh rebuild
./deploy.dev.sh rebuild-service auth-service
./deploy.dev.sh rebuild-mfe shell
./deploy.dev.sh rebuild-mfe pta
./deploy.dev.sh db-migrate
```

## 9. Desarrollo Local con Node.js

Este modo facilita edicion y HMR del frontend, pero requiere configurar la
base, Redis y los archivos `.env` de cada backend que se ejecute.

### 9.1 Requisitos

- Node.js 22 o superior para `npm run dev:all`.
- npm.
- PostgreSQL accesible en `localhost:5432` o en el host configurado.
- Redis accesible en `localhost:6379` si los modulos futuros o integraciones
  lo requieren.
- Base `esap_db` con inicializacion y migraciones aplicadas.

### 9.2 Dependencias

El frontend se administra por workspaces desde la raiz:

```bash
npm install
```

Los microservicios backend poseen sus propios `package.json`; para ejecutar
servicios nativos se deben instalar sus dependencias en cada directorio
necesario:

```bash
cd backend/auth-service
npm install
```

Repetir para cada servicio que vaya a iniciarse.

### 9.3 Configuracion de backend

Crear `.env` a partir del `.env.example` de cada servicio que se use y ajustar
puerto, PostgreSQL, JWT y conectores. Por ejemplo:

```bash
cp backend/auth-service/.env.example backend/auth-service/.env
```

Para servicios con TypeORM deben apuntarse los campos de base a `esap_db` y
al esquema correspondiente. Las migraciones se aplican por scripts SQL, no
por `synchronize`.

### 9.4 Iniciar backend nativo

El script raiz detecta todos los servicios con `package.json`:

```bash
npm run dev:backend -- --list-services
npm run dev:backend
```

Sin embargo, no debe ejecutarse simultaneamente el `api-gateway` en puerto
`3000` con el shell Vite nativo, porque ambos intentan usar ese mismo puerto.

Para desarrollar frontend en modo directo sobre `localhost`, iniciar los
servicios de dominio sin gateway:

```bash
npm run dev:backend -- --services=auth-service,academic-registration-service,academic-work-plan-service,certification-service,internal-disciplinary-control-service,interoperability-service,internal-institutional-control-service,legal-management-service,notifications-service,travel-expenses-service,audit-service
```

El frontend detecta `localhost` como modo directo y dirige las solicitudes a
los puertos `3001` a `3011`.

### 9.5 Iniciar frontend nativo

Para iniciar el shell y todos los remotos configurados:

```bash
npm run dev:all
```

Opciones disponibles:

```bash
npm run dev:all -- --list-apps
npm run dev:all -- --no-remote-watch
npm run dev:all -- --watch-apps=mfe-gestion-personas,mfe-pta
npm run dev:all -- --apps=shell,mfe-gestion-personas,mfe-pta
```

Acceso local:

```text
http://localhost:3000
```

## 10. Hallazgos y Configuracion Pendiente

### 10.1 Bloqueo del despliegue Docker local

`deploy.local.sh` indica que `./deploy.local.sh up` inicia toda la aplicacion
local con base externa. No obstante, la validacion actual de la composicion
falla:

```text
service "frontend" depends on undefined service "frontend-mfe-pta"
```

Causa verificada:

- `docker-compose.frontend-mfe.yml` incluye `frontend-mfe-pta` y el gateway
  depende de ese servicio.
- `scripts/mfe.config.mjs` tambien incluye `mfe-pta` en puerto `3113`.
- `docker-compose.local.yml` no extiende/declara `frontend-mfe-pta`.
- `deploy.local.sh` tampoco incorpora `pta` en sus operaciones MFE.

Accion necesaria: agregar `frontend-mfe-pta` al compose y al script local,
y validar nuevamente `./deploy.local.sh up`, `status`, `health` y
`rebuild-mfe pta`.

### 10.2 Inconsistencias documentales y de verificacion

| Elemento | Estado observado | Accion recomendada |
| --- | --- | --- |
| `README.md` | Describe doce remotos hasta puerto `3112`, sin PTA | Actualizar lista y puerto `3113` |
| `scripts/check-services.mjs` | Comprueba remotos hasta `mfe-gestion-legal` | Agregar verificacion de `mfe-pta` |
| Perfil LOCAL | Usa PostgreSQL externa, no contenedor PostgreSQL real | Mantenerlo explicitamente documentado como BD externa |
| Perfil DEV | Incluye PostgreSQL, Redis y MFE PTA | Usarlo como referencia de stack completo |
| Esquema de control institucional | El compose inyecta `internal_institutional_control`, pero las entidades TypeORM usan `control_interno` | Alinear `DB_SCHEMA` y migraciones antes del despliegue |
| `rebuild-all-mfe` rapido DEV | No inicia explicitamente backend/infraestructura en una instalacion limpia | Usar `MFE_DOCKER_BUILD_ONLY=true` en primer arranque o levantar antes el stack base |
| Docker Compose DEV | Compose v2 informa que el atributo superior `version` esta obsoleto | Retirar `version` en una actualizacion controlada |

### 10.3 Integraciones externas

| Integracion | Estado de configuracion |
| --- | --- |
| Oracle para certificados laborales | Parametrizable mediante `ORACLE_FNC_ENABLED`; no asumir activa en todos los ambientes |
| Oracle para graduados | Parametrizable mediante `ORACLE_GRAD_ENABLED`; no asumir activa en todos los ambientes |
| MySQL para graduados | Parametrizable mediante `MYSQL_GRAD_ENABLED`; desactivada por defecto en plantilla |
| Microsoft/SMTP para correo | Requiere credenciales del ambiente; no documentar secretos |
| Redis cache | Infraestructura declarada, consumo aplicativo de cache no confirmado |

## 11. Diagnostico Rapido

### Docker DEV

```bash
./deploy.dev.sh status
./deploy.dev.sh status-mfe
./deploy.dev.sh logs
./deploy.dev.sh logs-mfe shell
./deploy.dev.sh logs-mfe pta
```

### Desarrollo nativo

```bash
npm run dev:backend -- --list-services
npm run dev:all -- --list-apps
```

Validar puertos:

| Recurso | Puerto esperado |
| --- | ---: |
| Shell nativo o API Gateway, segun modo elegido | 3000 |
| Servicios de dominio backend | 3001 - 3011 |
| Remotos MFE nativos | 3101 - 3113 |
| PostgreSQL | 5432 |
| Redis | 6379 |

## 12. Referencias del Repositorio Revisadas

- `package.json`
- `README.md`
- `DEPLOY_LOCAL.md`
- `DEPLOY_DEV.md`
- `DEPLOY_MFE.md`
- `deploy.local.sh`
- `deploy.dev.sh`
- `docker-compose.local.yml`
- `docker-compose.dev.yml`
- `docker-compose.frontend-mfe.yml`
- `scripts/dev-all.mjs`
- `scripts/dev-backend-all.mjs`
- `scripts/mfe.config.mjs`
- `scripts/check-services.mjs`
- `apps/shell/src/config/environment.ts`
- `apps/shell/src/services/api/apiClient.ts`
- `backend/api-gateway/src/gateway/proxy.config.ts`
- `backend/*/src/app.module.ts`
- `db/init/`
- `db/migrations/`
