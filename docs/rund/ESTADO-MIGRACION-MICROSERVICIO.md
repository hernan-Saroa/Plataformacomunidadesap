# Estado de la migración del RUND a microservicio

> Rama: `feat/agregar_modulo_rund` · Actualizado: 2026-10-13
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
2. **Esquema nuevo `rund`.** Las tablas las crea la migración 003 y los datos se copian con la
   migración 004 (idempotente, ver sección 4). Decisión revisada el 2026-10-13: se copian los datos.
   Los microservicios son independientes y se comunican por API (sección 12), no por tablas compartidas.
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

Validación hecha: sintaxis con el parser de PostgreSQL (`libpg-query`), coherencia columna a columna
entre el DDL, las entidades y el SQL del código, y **aplicación real** de 001–004 en el Postgres local
(2026-10-13).

**Migración 004** (`004_copy_rund_data_from_pta.sql`): copia las 16 tablas desde `academic_work_plan`
columna a columna (casteo al tipo destino, `ON CONFLICT DO NOTHING`, un bloque por tabla que avisa y
continúa si falla) y ajusta `rund.docente_id_rund_seq` a partir de `"idRund"` (texto `RUND-0003`). No
toca `academic_work_plan`. El deploy la corre una sola vez: en el corte final volver a ejecutarla a
mano y revisar los conteos origen/destino del último bloque. Verificado: 274 docentes copiados.

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

## 8. Estado de las pruebas (2026-10-13)

| Componente | Resultado |
|---|---|
| `backend/rund-service` | `tsc` limpio, `nest build` OK, **37 suites / 398 tests** pasan |
| `backend/academic-work-plan-service` (PTA) | **86 suites / 783 tests** pasan |
| `backend/api-gateway` | **5 suites / 40 tests** pasan |
| `backend/auth-service` | **5 suites / 28 tests** pasan |
| `backend/academic-schedule-service` | sin `node_modules` local: `rund-client.spec.ts` (4 tests) corrido con el jest de rund-service |
| `apps/mfe-rund` | **16 archivos / 165 tests** pasan, `vite build` OK (2026-10-06) |
| `apps/shell`, `mfe-reportes`, `mfe-gestion-personas` | tests de lo tocado pasan; `disciplinary.service.spec.ts` ya fallaba antes (usa `jest` en vitest) |
| Arranque real contra Postgres | **Hecho** (2026-10-13): servicio, API interna, PTA ↔ RUND, carga masiva |

Los tests del servicio incluyen los specs portados de PTA (RBAC por HTTP, datos sensibles, extracción,
documentos, etc.) y specs nuevos de docentes, soportes, guard de permisos y validación documental.

## 9. Avance por fases (actualizado 2026-10-13)

| Fase | Estado |
|---|---|
| Servicio completo (`rund-service`) contra Postgres real, migraciones 001–004 | **Hecho** |
| Carga masiva, documentos, bloques, invitaciones, OTP, macro docente, interoperabilidad | **Hecho y probado en vivo** |
| Frontends (shell, Carpeta Digital, Gestión de Personas, reportes) a `/rund/api/v1` | **Hecho** |
| Gateway (redacción de auditoría, rutas públicas, bloqueo de `/internal/*`) | **Hecho** |
| Programación Académica y contrato PROG↔PTA consumen RUND por API | **Hecho** |
| Carpeta Digital y tablero del backoffice (auth-service) consumen RUND por API | **Hecho** |
| PTA con copia de solo lectura sincronizada desde RUND | **Hecho** |
| Compose: `RUND_SERVICE_URL` e `INTERNAL_SERVICE_TOKEN` | **Hecho** |
| Compose: volumen `uploads` de rund-service en dev/qa/pre/prod/local | Pendiente |
| Eliminar el RUND embebido en PTA | Pendiente (solo con confirmación explícita) |

Pendientes abiertos de la fase de servicio (ver también la sección 16):

1. Tipos: `"RundCampoEstado".docente_id` es `VARCHAR(255)` en la migración y `uuid` en la entidad;
   `"Docente".id` es `text` mientras otros `docente_id` son `uuid` sin FK (hay que comparar con `::text`).
2. Número de tarjeta RUND del CRUD base (`DocentesService.create`): 6 dígitos aleatorios sobre una columna
   `UNIQUE`; cambiar por una secuencia.
3. Permisos: el código portado usa `banco-docentes.rund.*`; el CRUD base usa `rund.*` (migración 002).
4. `rund."Docente"` (banco) y `rund.docente` (CRUD base) son tablas distintas; el tablero
   `estadisticas/dashboard` lee la del CRUD base y por eso muestra ceros.
5. Limpiar `mfe-rund` (errores de tipos heredados, componentes huérfanos, `rundService`).

## 10. Trampas conocidas

- La carga masiva y `sync-from-auth` leen `auth.personas` / `auth."user"` con SQL directo.
- Crear un docente también crea su persona, usuario y rol en `auth`; necesita el rol `DOCENTE` y al menos una
  seccional/territorial cargadas (una BD vacía rechaza la creación).
- `"Docente".id` es `text` y `docente_id` de otras tablas es `uuid`: los JOIN deben comparar como texto.
- Las filas copiadas entre servicios deben serializarse en Postgres (`to_jsonb`), no en Node (desplaza 5 h las
  columnas `timestamp` sin zona).
- `sync-from-auth` llama a auth-service sin credenciales y a una ruta directa; sin auth-service responde 503.
- El PTA con docentes de planta ve `situacionAdministrativa` vacía si la semilla no la trae: el clasificador falla
  cerrado (no asignable).
- `ptaApi.ts` de `mfe-rund` conserva `exportBancoDocentes` y `downloadBancoDocentesTemplate` sin ruta en el
  backend (tampoco existían en PTA; la plantilla se genera en el navegador).
- En Windows, `git` normaliza fin de línea (aviso `LF will be replaced by CRLF`).

## 11. Lo hecho el 2026-10-13

- Aplicadas 001–004 en `esap_db`. Bug real corregido: `FacultadEntity` no estaba registrada y el
  servicio no arrancaba (los tests usan mocks y no lo detectaban).
- Datos base que faltaban en la BD local: `auth.seccionales` ('Sede Central') y el rol `DOCENTE`.
  Se crearon 3 docentes de prueba (cédulas 90000001–3).
- Frontends repuntados a `/rund/api/v1`: shell (menú Banco Docente y autogestión), Carpeta Digital,
  Gestión de Personas, reportes Macro/Planta Docente. Gateway y `rundCachePolicy` cubren las rutas nuevas.

## 12. Comunicación entre servicios

rund-service es dueño del dato y expone `/internal/rund/v1/*` (token de servicio
`INTERNAL_SERVICE_TOKEN` en la cabecera `x-internal-service-token`, comparación en tiempo constante;
obligatorio en producción). El gateway **bloquea** cualquier ruta `/internal/*` (404).

| Endpoint | Consumidor |
|---|---|
| `GET docentes/por-documento/:documento` | programación académica y contrato PROG↔PTA |
| `GET soportes/por-persona/:personaId`, `POST originales/verificar`, `POST accesos-documentos` | Carpeta Digital (auth-service) |
| `GET estadisticas/backoffice` | tablero del backoffice (auth-service) |

Clientes: `academic-schedule-service/src/asignaciones/rund-client.ts`,
`academic-work-plan-service/src/contrato-programacion/v1/rund-docentes.client.ts`,
`auth-service/src/carpeta-digital/rund-client.ts`. Fallan cerrado ante caída o error. La lógica propia
de cada consumidor (clasificador de situación administrativa) se queda en el consumidor.

Variables: `RUND_SERVICE_URL` e `INTERNAL_SERVICE_TOKEN` agregadas a los compose (dev/qa/local/raíz/
backend/pre/prod; los `*.ghcr.yml` heredan de su base). En pre/prod, si falta el token se usa
`JWT_SECRET`; se recomienda definir un token propio.

Bug encontrado al probar en vivo: `"Docente".id` es `text` y `"RundSoporteCampo".docente_id` es `uuid`; el
JOIN original de Carpeta Digital fallaba siempre y lo ocultaba un `catch` silencioso (nunca listó soportes
RUND). Corregido comparando como texto.

## 13. PTA ↔ RUND

rund-service es el único escritor del dato. PTA conserva `academic_work_plan."Docente"` como **copia de solo
lectura** (sus planes, solicitudes y consultas hacen JOIN y clave foránea contra ella) y la mantiene así:

- `academic-work-plan-service/src/integracion-rund/` (`RundSyncService`, `RundDocentesClient`).
- Recorre todo el RUND al arrancar (a los 15 s) y cada `RUND_SYNC_INTERVAL_MINUTES` (10 por defecto);
  `RUND_SYNC_ENABLED=false` la apaga. También bajo demanda: si PTA necesita un docente sin copia local, lo trae
  de RUND antes de aprovisionar uno vacío. Manual: `POST /pta/api/v1/rund/sincronizar` (solo SUPER_ADMIN).
- Upsert con `jsonb_populate_record` sobre la propia tabla (sin listas de columnas a mano). Si choca con la
  única `(personaId, periodoCarga)` actualiza la fila existente conservando su id, para no romper las FK.
- Endpoints internos de rund-service para esto: `docentes/sincronizacion` (paginado por cursor),
  `docentes/resolver/:clave`, `docentes/:id/validacion`.
- `GET rund/docente/:id` de PTA es ahora una fachada que consulta a rund-service; la aprobación de un PTA
  consulta la validación documental a RUND (no bloqueante: si RUND no responde se omite y se avisa en el log).
- **Cuidado (corregido):** la fila debe serializarla Postgres (`to_jsonb`). Si la arma el driver de Node, las
  columnas `timestamp` sin zona horaria se desplazan 5 h (hora local → UTC) al copiarse.

## 14. Archivos y URLs

Los soportes se guardan en el disco de rund-service y su URL pública es `/rund/api/v1/uploads/...` y
`/rund/api/v1/pta/banco-docentes/<id>/documentos/<doc>/contenido` (`common/rund-public-paths.ts`). Los registros
históricos con prefijo `/pta/api/v1/...` se siguen reconociendo al vincular archivos, pero NO se reescriben:
sus archivos viven en el volumen de PTA. Al migrar producción hay que copiar `uploads/` de PTA al volumen de
rund-service y recién entonces reescribir esas URLs.

## 15. Verificado en vivo (2026-10-13)

Carga masiva por `.xlsx` (dry run, creación, actualización, fila inválida con error por fila), `idRund`
asignado por secuencia, alta de docentes, documentos, bloques (cargar, devolver; la aprobación exige revisor
distinto y soportes revisados), invitaciones, OTP y validación de autogestión, macro docente, interoperabilidad,
próximos a vencer. Sin servicios externos fallan de forma controlada (503) `sync-from-auth` y el correo.

`idRund` lo asigna el flujo de carga del RUND (`nextval` al crear o actualizar un docente). Los 274 docentes
de la planta entraron por la semilla SQL 219, que inserta directo y no pasa por ese flujo: quedan sin `idRund`
hasta que se les cargue/actualice por RUND (carga masiva o edición).

## 16. Pendiente

- **Borrar el RUND embebido en PTA** (`pta/banco-docentes`, `pta/macro-docente`, endpoints `rund/*`, entidades
  `Rund*` y `mfe-pta/.../banco-docentes`): solo con confirmación explícita. Antes, las rutas públicas que
  terceros usen (`/pta/api/v1/rund/interoperabilidad/...`, enlaces de macro docente ya enviados) necesitan un
  alias en el gateway hacia `/rund/api/v1/...`.
- Compose: volumen `uploads` de rund-service solo está en `docker-compose.yml` y `.backend.yml`.
- Asignar `idRund` a los 274 docentes (criterio de numeración por definir).
- Datos locales: la planta no trae situación administrativa; el clasificador la trata como no asignable.
- `pta.service.ts` conserva el aprovisionamiento "dummy" como último recurso cuando el docente no existe en RUND.
