# Estado de la migración del RUND a microservicio

> Rama: `feat/agregar_modulo_rund` · Actualizado: 2026-10-06
> Documento de contexto para retomar la migración. Describe qué se decidió, qué está hecho,
> qué falta y qué trampas hay. Complementa `PENDIENTES_RUND_PTA.md` (historias de usuario) y
> los `REQ-RUND-*` de esta carpeta.

## 1. Objetivo y alcance

El RUND (Registro Único Nacional Docente / Banco de Docentes) vivía **dentro de PTA**:

- Backend: `backend/academic-work-plan-service/src/pta/banco-docentes/` y `pta/macro-docente/`,
  más 3 endpoints en `pta.controller.ts` (`rund/docente/:id`, `rund/docente/:id/sync-documents`,
  `rund/resumen`).
- Frontend: `apps/mfe-pta/src/components/pta/banco-docentes/`.

Se está migrando a su propio microservicio y micro-frontend:

- Backend: `backend/rund-service` (puerto 3016, esquema Postgres `rund`).
- Frontend: `apps/mfe-rund` (remote de Module Federation `rund`, expone `./Module`).

## 2. Decisiones acordadas con el usuario

1. **Primero el servicio completo, después las conexiones.** Primero `rund-service` y `mfe-rund`
   con toda la funcionalidad del RUND; recién después se hace que PTA y los demás módulos lo llamen.
2. **Esquema nuevo `rund`, solo las tablas.** No se copian datos: los registros de docentes se
   cargan después (carga masiva u otro medio). Se descartó una migración de copia de datos.
3. **Mismos nombres de tabla y columna que en PTA** (`"Docente"`, `"RundSoporteCampo"`, …) para que
   el código portado funcione sin reescribir las consultas.
4. **No borrar el RUND que está dentro de PTA** (ni el backend ni `mfe-pta`) hasta el final absoluto,
   y solo con confirmación explícita. Es el respaldo mientras todo se valida.
5. **Probar cada pieza al terminarla** (tests + build).
6. Sin carpetas ni nombres "legacy" en el código nuevo: los archivos portados son el módulo real.

## 3. Estructura actual de `backend/rund-service`

```
src/
  modules/
    banco-docentes/      # portado de PTA: controlador, servicio, OCR/extracción, documentos,
                         # autogestión (OTP/borradores), carga masiva, roles, datos sensibles
    macro-docente/       # portado de PTA: historial nacional y accesos externos temporales
    docentes/ trayectoria/ situaciones-admin/ soportes/ tarjeta-digital/ estadisticas/
                         # CRUD base que ya existía en el servicio nuevo (esquema rund, minúsculas)
  entities/              # BancoDocenteEntity = tabla rund."Docente" (banco, mayúscula)
                         # DocenteEntity      = tabla rund.docente   (CRUD base, minúscula)
                         # + Rund*Entity, Persona/Usuario/Programa/Facultad/PlanTrabajoAcademico/
                         #   ConfiguracionSistema (estas 6 son de PTA y siguen en academic_work_plan)
  auth/                  # JWT (Bearer + cookie esap_access_token), guards, roles, permisos PTA
  notifications/         # pta-notifications.service (correo del acceso externo del Macro Docente)
  common/                # text-sanitizer, require-env, catálogos territoriales/CETAP
db/migrations/
  001_create_rund_schema.sql      # tablas del CRUD base (rund.docente, formación, etc.)
  002_seed_rund_auth_module.sql   # permisos rund.view/create/edit/validate/admin/export
  003_legacy_rund_tables.sql      # 16 tablas del RUND de PTA recreadas en el esquema rund
```

**Atención con los nombres:** `rund."Docente"` (banco de docentes, usado por el código portado) y
`rund.docente` (CRUD base) son tablas **distintas**. Unificarlas es trabajo futuro.

### Endpoints expuestos (el gateway quita `/rund/api/v1`)

| Origen | Rutas en rund-service |
|---|---|
| Banco de docentes | `banco-docentes/*` y `pta/banco-docentes/*` (listado, ficha, estados, bloques aprobar/devolver, soportes, documentos, validación por lote, carga masiva, invitaciones, OTP, borradores, autogestión, extracciones OCR, cabezote, tarjeta, auditoría) |
| Macro Docente | `macro-docente/*` y `pta/macro-docente/*` (historial, consulta, accesos externos, `externo/:token` público) |
| Interoperabilidad | `rund/interoperabilidad/perfiles/:cedula` |
| Validación documental (antes en PTA) | `rund/docente/:id`, `rund/docente/:id/sync-documents`, `rund/resumen` (y `pta/rund/...`) |
| CRUD base | `docentes`, `trayectoria`, `situaciones-admin`, `soportes`, `tarjeta-digital`, `estadisticas/dashboard` |
| Salud | `health`, `health/ready` (con `SELECT 1` a la BD) |

Ejemplo: `/rund/api/v1/pta/banco-docentes/12/documentos` llega al servicio como
`/pta/banco-docentes/12/documentos`.

## 4. Esquema `rund` (migración 003)

16 tablas con los mismos nombres/columnas que `academic_work_plan`: `"Docente"`,
`validacion_documental`, `"RundCampoEstado"`, `"RundSoporteCampo"`, `"BancoDocentesInvitaciones"`,
`"RundAprobacionLog"`, `"RundInvitacionDocente"`, `"RundAccesoExterno"`,
`"RundMacroDocenteConsultaLog"`, `"RundDocumentoCategoria"` (con 7 semillas),
`"RundDocumentoPerfil"`, `"RundCargaMasiva"`, `"RundAccesoDatosLog"`, `"RundExtraccionInicio"`,
`"RundExtraccionTrabajo"`, `"RundExtraccionSugerencia"`. Incluye la secuencia
`rund.docente_id_rund_seq`, índices y 4 triggers de inmutabilidad (logs de auditoría).

En el código, esas 16 tablas apuntan a `rund`. Lo de PTA (`Persona`, `Programa`,
`PlanTrabajoAcademico`, `cetap`, `periodo_academico`, `ConfiguracionSistema`, `Usuario`,
`facultad`) se sigue leyendo de `academic_work_plan`, y las consultas a `auth.*` siguen igual.

Validación hecha: sintaxis con el parser de PostgreSQL (`libpg-query`), y coherencia columna a columna
entre el DDL, las entidades y el SQL del código. **No se aplicó contra un Postgres real.**

## 5. Frontend `apps/mfe-rund`

- `RundModulePremium` renderiza `components/pta/banco-docentes/BancoDocentesPTA` (copia de `mfe-pta`).
- Todas las URLs del RUND apuntan a `/rund/api/v1/...` (constante `BD_BASE` en `services/api/ptaApi.ts`).
- Se eliminó la carpeta duplicada y sin uso `src/components/banco-docentes/`.
- Se agregó `vitest.config.ts` (copiado de `mfe-pta`).
- `getRUNDDocente`, `sync-documents` y `resumen` ya llaman a `/rund/api/v1/rund/...`.
- Pendiente de limpieza: ~250 errores de tipos heredados del andamiaje (`gestion-profesoral`,
  mocks, etc.); no bloquean el build de Vite. Los componentes `Rund*.tsx` nuevos
  (`RundDashboard`, `RundDocentesList`, …) usan `rundService` con `API_BASE='/api/rund'`, que no
  coincide con el gateway, y nadie los monta.

## 6. Gateway

- `proxy.config.ts` ya registra `rund` y `rund-service` (`RUND_SERVICE_URL`, puerto 3016).
- `auth/jwt-auth.guard.ts`: se agregaron rutas **públicas** `/rund/api/v1/...` (OTP, borradores,
  `autogestion/me`, `submit`, `soportes/autogestion`, `macro-docente/externo`). Hay spec
  `jwt-auth.guard.rund.spec.ts`.
- `audit/rund-audit-redaction.ts` solo redacta URLs con `banco-docentes|macro-docente|…`; las rutas
  nuevas del CRUD base (`/docentes/...`, `/soportes/...`) **no** se redactan.

## 7. Configuración y despliegue

- `.env.example` auditado contra el código. `RUND_DOCUMENT_ALLOW_LOCAL` y
  `RUND_DOCUMENT_MAX_SIZE_BYTES` quedan **comentadas** a propósito: definirlas pisa los valores por
  defecto del código (almacenamiento local en producción / límite por categoría).
  `DB_SCHEMA` y `API_GATEWAY_URL` aparecen en el ejemplo pero el código no las lee.
- En producción (`NODE_ENV=production`) el servicio **no arranca** sin `JWT_SECRET` ni `DB_PASS`
  (`src/common/require-env.ts`).
- `Dockerfile`: usuario no root, carpeta `uploads` y `HEALTHCHECK`.
- Volumen `./backend/rund-service/uploads:/app/uploads` agregado **solo** en `docker-compose.yml` y
  `docker-compose.backend.yml`. **Faltan** `dev`, `qa`, `pre`, `prod`, `ghcr` y `local`.
- Cómo corre las migraciones el despliegue (`cmd_db_migrate` en `deploy.*.sh`): cada archivo una sola
  vez, registrado por nombre en `auth.migrations_db_log`, y `psql` **sin** `ON_ERROR_STOP`: un fallo
  parcial igual queda marcado como aplicado. Tenerlo en cuenta al escribir migraciones nuevas.
- `package-lock.json` está en `.gitignore` del repo.

## 8. Estado de las pruebas (2026-10-06)

| Componente | Resultado |
|---|---|
| `backend/rund-service` | `tsc` limpio, `nest build` OK, **35 suites / 379 tests** pasan |
| `backend/api-gateway` | spec de rutas públicas RUND y de redacción de auditoría pasan |
| `apps/mfe-rund` | **16 archivos / 165 tests** pasan, `vite build` OK |
| Arranque real contra Postgres | **NO hecho** (el Postgres local rechazó `postgres/password`) |

Los tests del servicio incluyen los specs portados de PTA (RBAC por HTTP, datos sensibles, extracción,
documentos, etc.) y specs nuevos de docentes, soportes, guard de permisos y validación documental.

## 9. Pendiente, en orden

### 9.1 Cerrar el servicio (antes de las conexiones)
1. Levantar `rund-service` contra Postgres real, aplicar `001`–`003` y probar endpoints
   (incluida la carga masiva para poblar docentes).
2. Agregar volumen `uploads` y variables nuevas a los compose que faltan.
3. Confirmar tipos: en `"RundCampoEstado"`, `docente_id` es `VARCHAR(255)` en la migración pero
   `uuid` en la entidad; `"Docente".id` es `text` mientras otros `docente_id` son `uuid` sin FK.
4. Número de tarjeta RUND del CRUD base (`DocentesService.create`): se genera con 6 dígitos
   aleatorios sobre una columna `UNIQUE`; cambiar por una secuencia.
5. Permisos: el código portado usa `banco-docentes.rund.*`; el CRUD base usa `rund.*` (migración 002).
   Decidir si se unifican.
6. Limpiar `mfe-rund` (errores de tipos, componentes huérfanos, `rundService`).

### 9.2 Conexiones (después)
Estos módulos aún leen el RUND de `academic_work_plan` / endpoints de PTA:

- **Shell**: menú `banco-docentes-pta` (abre `PTAModule`), import de `AutogestionDocenteRUND`
  desde `mfe-pta` (`apps/shell/src/App.tsx:81`), `isRundRequest` en `rundCachePolicy`.
- **Reportes**: `PlantaDocenteReportView` y `MacroDocenteReportView` (`/pta/api/v1/pta/...`).
- **Gestión de Personas**: `sync-documents` y `sync-from-auth`.
- **Carpeta Digital (auth-service)**: SQL cross-schema a `academic_work_plan."RundSoporteCampo"` y
  `"RundAccesoDatosLog"` (`carpeta-digital.service.ts`, `rund-document-access.ts`) y el
  middleware estático de originales RUND.
- **PTA**: `getRUNDDocente` en `PTAForm`, bolsa de horas, bloqueo por perfil `INACTIVO`, soportes
  críticos y la prioridad por `idRund` en la selección de docente.
- **Programación Académica** y `contrato-programacion/v1`: leen `academic_work_plan."Docente"`.
- **Gateway**: ampliar la redacción de auditoría a las rutas nuevas.

### 9.3 Al final de todo
Eliminar el RUND embebido en PTA (`pta/banco-docentes`, `pta/macro-docente`, entidades `Rund*`,
endpoints `rund/*` del controlador PTA y `mfe-pta/.../banco-docentes`) **solo con confirmación explícita**.

## 10. Trampas conocidas

- La carga masiva y `sync-from-auth` leen `auth.personas` / `auth."user"` con SQL directo.
- Los `uploads` siguen guardando URLs `/pta/api/v1/uploads/...` en BD y en el código portado
  (`banco-docentes.service.ts`); con servicios separados esas URLs pasan por el prefijo `pta`
  del gateway, no por `rund`.
- `ptaApi.ts` de `mfe-rund` conserva `exportBancoDocentes` y `downloadBancoDocentesTemplate`
  sin ruta en el backend (tampoco existían en PTA; la plantilla se genera en el navegador).
- En entornos Windows, `git` normaliza fin de línea (aviso `LF will be replaced by CRLF`).
