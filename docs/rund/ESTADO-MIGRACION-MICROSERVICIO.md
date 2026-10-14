# Estado de la migración del RUND a microservicio

> Rama: `feat/agregar_modulo_rund` · Actualizado: 2026-10-14
> Documento de contexto para retomar la migración. Describe qué se decidió, qué está hecho,
> qué falta y qué trampas hay. Complementa `PENDIENTES_RUND_PTA.md` (historias de usuario) y
> los `REQ-RUND-*` de esta carpeta.

## Resumen de avance para seguimiento (2026-10-14)

- **11 pasos principales completados en código/revisión y validación local:** pasos
  1–11, documentados en las secciones 11–21. No equivale a despliegue completado.
- **1 paso principal en curso:** el 12, integración de Carpeta Digital y preparación
  de activación. Tiene 13 subhitos terminados en repositorio/validación local (12.1,
  12.2, 12.3a, 12.3b.1–4, 12.4, revisión offline 12.5, 12.5a–c y 12.5d.1).
  El subpaso actual **12.5d.2 sigue abierto**, con las lecturas reales de la sección 35.
- **Primer corte para push de la rama:** alcance, manifiesto y validaciones consolidados
  en [PRIMER-PUSH.md](PRIMER-PUSH.md) y la sección 36. Es publicación para revisión,
  con límites globales del shell documentados; no cierra activación o despliegue.
- No se suman padres e hijos como si fueran pasos equivalentes ni se calcula un
  porcentaje de independencia a partir del número de pruebas o secciones.

Para dar una idea del trabajo restante, se agrupa en **5 frentes, incluido el actual**:

1. Cerrar el paso 12: configuración/conexión de RUND, migraciones, artefactos y aceptación
   de sus integraciones en local/DEV/QA/PRE/PROD, antes de habilitar las funciones.
2. Completar los consumidores de dashboard/reportes y los accesos documentales históricos
   de Auth todavía ligados a PTA, según la sección 9.2.
3. Conectar los consumidores de PTA, Programación Académica y contrato-programación
   preservando sus reglas y registros históricos.
4. Resolver las dependencias SQL directas entre propietarios que aún impiden el
   aislamiento del servicio; no basta con cambiar URLs de frontend.
5. Hacer la aceptación integral y el cierre operativo; retirar el RUND embebido de PTA
   únicamente al final y con la confirmación explícita exigida en 9.3.

Estos frentes agrupan el alcance conocido; tienen tamaños distintos y pueden requerir
subpasos al revisar cada consumidor. Al cerrar el punto actual, actualizar este resumen
con el conteo y los pendientes efectivos, sin presentar las instalaciones como verificadas
si solo pasaron fixtures o revisiones del repositorio.

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
  004_rund_docente_identificadores_text.sql # referencias a Docente.id alineadas a TEXT
  005_rund_tarjeta_numero_secuencia.sql # numeración de tarjeta del CRUD base, sin renumerar
  006_rund_catalogo_permisos_compatibles.sql # completar permisos, preservar códigos y grants previos
  007_rund_carpeta_auth_proyeccion.sql # estados generales Auth separados de decisiones nativas
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

Validación inicial: sintaxis con el parser de PostgreSQL (`libpg-query`), y coherencia columna a columna
entre el DDL, las entidades y el SQL del código. El 2026-10-09 se aplicaron `001`–`003` y se probó
el servicio completo contra PostgreSQL 15.14 en un cluster temporal con datos ficticios (sección 12).
La validación se amplió después a `004`, conservación de datos y coherencia de tipos (sección 14).
Esto no implica que las migraciones estén aplicadas en la base de trabajo, QA o producción.

## 5. Frontend `apps/mfe-rund`

- `RundModulePremium` renderiza `components/pta/banco-docentes/BancoDocentesPTA` (copia de `mfe-pta`).
- Las operaciones activas del banco apuntan a `/rund/api/v1/...` (`BD_BASE` en `services/api/rundApi.ts`).
- Se eliminó la carpeta duplicada y sin uso `src/components/banco-docentes/`.
- Se agregó `vitest.config.ts` (copiado de `mfe-pta`).
- **Limpieza completada el 2026-10-13 (sección 17):** TypeScript sin errores; retiradas las
  pantallas sin montar y el cliente obsoleto `rundService` con `/api/rund`.
- El transporte HTTP, la conectividad y el logo son locales al MFE; no importa fuentes del shell,
  `mfe-pta` ni del backend PTA. Conserva cookies HttpOnly, refresh, Blob y cargas XHR con progreso.
- Los catálogos de territoriales y periodos mantienen sus consultas HTTP a PTA. Tener esta
  dependencia de datos no implica importar sus componentes ni sus servicios frontend.
- Los tres endpoints de compatibilidad `rund/docente`, `sync-documents` y `resumen` siguen en el
  backend independiente; las funciones sin consumidor de la copia de `ptaApi.ts` se retiraron.
- **Conectado al shell el 2026-10-13 (sección 20):** menú histórico y `rund` cargan `rund/Module`;
  el remote también expone `rund/Autogestion` para `/rund/autogestion/docentes`. La ruta pública
  anterior conserva el formulario de PTA para sus invitaciones/borradores.

## 6. Gateway

- `proxy.config.ts` ya registra `rund` y `rund-service` (`RUND_SERVICE_URL`, puerto 3016).
- `auth/jwt-auth.guard.ts`: se agregaron rutas **públicas** `/rund/api/v1/...` (OTP, borradores,
  `autogestion/me`, `submit`, `soportes/autogestion`, `macro-docente/externo`). Hay spec
  `jwt-auth.guard.rund.spec.ts`.
- `audit/rund-audit-redaction.ts` cubre ahora el namespace propio RUND, rutas históricas
  PTA y Carpeta Digital Auth/portal, incluidos originales. Validación local en 12.5b
  (sección 32); pendiente comprobar su publicación/ejecución en cada instalación.

## 7. Configuración y despliegue

- `.env.example` auditado contra el código. `RUND_DOCUMENT_ALLOW_LOCAL` y
  `RUND_DOCUMENT_MAX_SIZE_BYTES` quedan **comentadas** a propósito: definirlas pisa los valores por
  defecto del código (almacenamiento local en producción / límite por categoría).
  `DB_SCHEMA` y `API_GATEWAY_URL` aparecen en el ejemplo pero el código no las lee.
- En producción (`NODE_ENV=production`) el servicio **no arranca** sin `JWT_SECRET` ni `DB_PASS`
  (`src/common/require-env.ts`).
- `Dockerfile`: usuario no root, carpeta `uploads` y `HEALTHCHECK`.
- `docker-compose.yml` y `docker-compose.backend.yml` conservan el bind mount de `uploads`
  (ruta configurable mediante `RUND_UPLOADS_HOST_PATH`). DEV, QA, PRE, PROD y LOCAL tienen
  volúmenes `esap-rund-uploads-<ambiente>` separados; los overlays GHCR/MFE los heredan.
  La configuración de variables y las composiciones se validaron en la sección 13.
- **Corregido en 12.5c (sección 33):** `cmd_db_migrate` usa `psql -X -v ON_ERROR_STOP=1`,
  detiene el primer fallo y propaga error al despliegue; anuncia éxito después de guardar
  el historial. Conserva alias de ruta/nombre. No garantiza rollback de todo un SQL ni
  corrige registros erróneos de ejecuciones anteriores.
- `package-lock.json` está en `.gitignore` del repo.
- **Corregido en 12.5a (sección 31):** los cuatro workflows de construcción backend incluyen
  `rund-service`, con nombre/tag alineados a sus overlays GHCR. Construcción/publicación
  efectiva en GitHub pendiente; no se consultó el registro ni se ejecutó un despliegue.

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

Prerrequisito de metadatos de arranque corregido el 2026-10-09: registro de `FacultadEntity`
para la relación de `ProgramaEntity`. Validación sin conexión a PostgreSQL; ver sección 11.
El arranque y las migraciones ya se validaron en un entorno temporal (sección 12).
Los seis puntos de esta etapa ya tienen validación local (secciones 12–17).
Quedan el despliegue controlado y las conexiones de la sección 9.2.

1. **Validado localmente el 2026-10-09:** levantar `rund-service` contra PostgreSQL real,
   aplicar `001`–`003` y probar endpoints, incluida la carga masiva. Se usó un cluster nuevo
   y datos ficticios; no se aplicaron migraciones en la instalación existente.
2. **Configurado y validado el 2026-10-09:** volúmenes `uploads` y variables de RUND en los
   Compose, incluyendo herencia LOCAL y overlays GHCR/MFE (sección 13). No desplegado.
3. **Corregido y validado el 2026-10-09:** entidades y referencias a `"Docente".id` coherentes
   como `TEXT`, conservando los IDs existentes. Requiere aplicar la nueva migración `004`
   en cada instalación antes de desplegar el ajuste (sección 14); no aplicada en bases de trabajo.
4. **Corregido y validado el 2026-10-09:** tarjeta del CRUD base generada por secuencia,
   conservando números anteriores y sin reutilizar reservas. Requiere migración `005`
   antes del despliegue (sección 15); no aplicada en bases de trabajo.
5. **Ajustado y validado el 2026-10-10:** catálogo y resolución compartidos para permisos
   activos, manteniendo códigos y capacidades independientes. `006` completa los permisos
   ausentes sin modificar los existentes (sección 16); no aplicada en bases de trabajo.
6. **Completado y validado el 2026-10-13:** limpieza de `mfe-rund`, transporte local,
   retirada de componentes huérfanos y `rundService`, TypeScript limpio y contratos frontend
   probados (paso 7, sección 17). El shell todavía conserva sus entradas actuales a PTA.

### 9.2 Conexiones (después)
El prerrequisito de enlaces/diagnóstico/reparación del servicio propio se completó en el
paso 8 (sección 18). La sincronización de usuarios del backend RUND con auth se corrigió y
validó en el paso 9 (sección 19); requiere configurar la credencial interna antes de usarla.
Las entradas del banco y la nueva autogestión del shell se conectaron en el paso 10 (sección 20).
Los consumidores enumerados a continuación mantienen dependencias con la implementación PTA.

Estos módulos aún leen el RUND de `academic_work_plan` / endpoints de PTA:

- **Shell**: la ruta pública anterior `/autogestion/docentes` conserva la implementación PTA
  por compatibilidad; las métricas del dashboard siguen pendientes. Carpeta Digital tiene
  consulta, contadores y panel por propietario implementados localmente (secciones 22–28),
  con integración deshabilitada. La validación conjunta local y la preparación de activación
  están en la sección 29; sigue pendiente validar/activar en el ambiente destino. El banco del menú
  y `/rund/autogestion/docentes` ya usan los remotes RUND.
- **Reportes**: `PlantaDocenteReportView` y `MacroDocenteReportView` (`/pta/api/v1/pta/...`).
- **Gestión de Personas**: `sync-from-auth` ya usa RUND (sección 21). El adaptador documental
  ya no envía snapshots locales a `sync-documents` (sección 23). Historial general Auth:
  implementado en 12.3a, deshabilitado por defecto (sección 24).
  Las decisiones de las interfaces ya conservan la revisión vista y Auth reinicia la
  aprobación al reclasificar (12.3b.1, sección 25). La convergencia automática de estados
  generales Auth → RUND está implementada y validada localmente en 12.3b.2 (sección 26),
  deshabilitada por defecto. Los contadores agregados están implementados y validados en
  12.3b.3 (sección 27). El panel inline por propietario/periodo está implementado y validado
  localmente en 12.3b.4 (sección 28). La validación conjunta local incluye ahora también el
  portal (12.4, sección 29). Quedan verificación del ambiente destino y activación; el paso
  12 sigue abierto.
- **Carpeta Digital (auth-service)**: SQL cross-schema a `academic_work_plan."RundSoporteCampo"` y
  `"RundAccesoDatosLog"` (`carpeta-digital.service.ts`, `rund-document-access.ts`) y el
  middleware estático de originales RUND.
- **PTA**: `getRUNDDocente` en `PTAForm`, bolsa de horas, bloqueo por perfil `INACTIVO`, soportes
  críticos y la prioridad por `idRund` en la selección de docente.
- **Programación Académica** y `contrato-programacion/v1`: leen `academic_work_plan."Docente"`.
- **Gateway**: redacción de auditoría ampliada y validada localmente en 12.5b (sección 32).
  La publicación y validación del gateway en cada ambiente siguen pendientes.

### 9.3 Al final de todo
Eliminar el RUND embebido en PTA (`pta/banco-docentes`, `pta/macro-docente`, entidades `Rund*`,
endpoints `rund/*` del controlador PTA y `mfe-pta/.../banco-docentes`) **solo con confirmación explícita**.

## 10. Trampas conocidas

- La carga masiva y las sincronizaciones acceden a `auth.personas` / `auth."user"` con SQL directo.
  El alta también crea/actualiza personas, usuarios y asignaciones de roles en `auth`.
- **Corregido en la sección 18:** las cargas técnicas y la reparación de RUND generan
  `/rund/api/v1/uploads/...`. Las referencias anteriores permanecen en BD y se reconocen
  para el diagnóstico/almacenamiento; el transporte de `mfe-rund` descarga sus originales
  desde RUND sin cambiar la identidad usada para revisar una versión documental.
- **Resuelto en la sección 17:** las funciones sin consumidor `exportBancoDocentes` y
  `downloadBancoDocentesTemplate` del cliente API copiado se retiraron. La plantilla activa
  se sigue generando en el navegador mediante `utils/bancoDocentesExcel.ts`.
- En entornos Windows, `git` normaliza fin de línea (aviso `LF will be replaced by CRLF`).

## 11. Paso 1: registro de entidades de arranque (2026-10-09)

- **Problema:** `ProgramaEntity.facultadRel` referencia `FacultadEntity`, pero esta entidad
  no estaba registrada en la conexión de RUND. Tener el archivo y usar `autoLoadEntities`
  no incluye por sí solo las entidades referenciadas únicamente por relaciones.
- **Cambio:** `MacroDocenteModule` registra `FacultadEntity` junto a `ProgramaEntity` en
  `TypeOrmModule.forFeature`. Se conserva su tabla `academic_work_plan.facultad`.
- **Regresión:** `src/app.module.spec.ts` construye los metadatos con las opciones reales de
  `AppModule` y las entidades registradas por los módulos. Comprueba que todas las relaciones
  se resuelvan y que `facultadRel` apunte a la entidad y tabla esperadas. No inicia una conexión
  a PostgreSQL; `synchronize` sigue desactivado.
- **Antes/después:** excluir `FacultadEntity` en una comprobación en memoria reproduce
  `Entity metadata for ProgramaEntity#facultadRel was not found`. El registro corregido
  construye todos los metadatos correctamente.
- **Validación:** `rund-service`: **36 suites / 380 tests** pasan; `npm run build` OK.
  Las dependencias locales se instalaron desde el `package.json` existente, sin scripts de
  instalación y sin generar `package-lock.json` ni modificar el manifiesto.
- **Alcance:** este paso corrige el registro de entidades. No aplica migraciones, no modifica
  datos y no cambia rutas, permisos ni la implementación embebida en PTA.
- **Continuación:** la validación de arranque y migraciones en un entorno de pruebas se completó
  en la sección 12. La prueba de metadatos de este paso, por sí sola, no acredita conectividad
  ni funcionamiento de endpoints con datos reales.

## 12. Paso 2: arranque y migraciones en PostgreSQL real (2026-10-09)

Se agregó `scripts/verify-rund-service-integration.cjs`. Crea un cluster PostgreSQL nuevo en
un directorio temporal, con contraseña aleatoria, puertos disponibles y escucha en `127.0.0.1`.
No lee `.env`, no acepta una base existente y no copia registros de docentes.
Ejecuta el `dist/main.js` real de RUND desde otro directorio temporal, incluidos sus guards,
validaciones y hooks de arranque. La aplicación conserva `synchronize: false`.

### Correcciones encontradas durante la validación

- `RundDocumentosService` devolvía enlaces `/pta/api/v1/pta/banco-docentes/.../contenido`,
  aunque el archivo y el registro estaban en RUND. Ahora genera
  `/rund/api/v1/pta/banco-docentes/.../contenido`, que el cliente API consulta bajo `/services`.
  También se usa ese enlace al vincular el soporte documental nuevo.
- El correo de acceso externo del Macro Docente apuntaba a PTA. Ahora usa
  `/services/rund/api/v1/pta/macro-docente/externo/:token`: Nginx retira `/services` y el gateway
  retira `/rund/api/v1`. La URL se construye sobre `PUBLIC_APP_URL` / `FRONTEND_URL`.
- Las pruebas existentes de creación de documentos y correo externo comprueban el destino RUND.
  El spec del gateway cubre además el enlace público con `/services`.

### Resultado y alcance

- **22 comprobaciones iniciales de integración** pasaron en PostgreSQL **15.14**.
  El verificador y `docs/rund/validacion-servicio-postgres-local.json` se ampliaron a
  **27 comprobaciones** en la sección 14.
- Las tres migraciones se aplican en transacciones; cualquier error revierte el archivo completo.
  Se verifican 24 tablas nuevas vacías, las 7 categorías documentales y la repetición de las
  migraciones sin duplicar columnas, categorías ni permisos.
- Se validan `health/ready`, JWT y permisos, CRUD base, carga XLSX definitiva y previsualización
  con rollback, reimportación, perfil, cabezote, interoperabilidad y perfiles de dos periodos
  que comparten una sola persona/usuario.
- Se prueban PDF con soporte vinculado, descarga de los bytes originales, protección por rol,
  reemplazo con historial, `sync-documents`, consulta de Macro Docente, acceso externo público
  y su revocación, además de los triggers de inmutabilidad de auditoría y soportes fuente.
- **Backend:** 36 suites / 380 tests pasan y `npm run build` OK.
  **Gateway:** las pruebas de rutas públicas y redacción de auditoría pasan (19 tests).
- Al terminar se detienen RUND y PostgreSQL y se elimina el directorio temporal. Los correos
  solo llegan a un receptor HTTP ficticio local; los PDF se guardan en el directorio temporal.

Los prerrequisitos externos se preparan exclusivamente en ese cluster: `auth` usa el DDL del
repositorio más la migración 158; las seis entidades externas de `academic_work_plan` se crean
como fixtures ORM, con un periodo ficticio. El enrutamiento `/services/rund/api/v1` se prueba
con un proxy HTTP local; **no se levantan los procesos reales de Nginx ni del gateway**.
No se validan aquí PostgreSQL 16 del despliegue, permisos del usuario real de base de datos,
OpenKM, OCR ni los contratos HTTP con los otros microservicios.

### Repetir la validación

Desde la raíz, con las dependencias de RUND instaladas y PostgreSQL local disponible:

```powershell
npm --prefix backend/rund-service run build
$env:PG_BIN_DIR = 'C:\Program Files\PostgreSQL\15\bin'
node scripts/verify-rund-service-integration.cjs
```

`PG_BIN_DIR` solo selecciona los binarios de PostgreSQL. El script siempre crea su propio
cluster; nunca usa las credenciales ni la base de una instalación existente.

**Continuación:** los volúmenes y variables de RUND se completaron en la sección 13.
Siguen pendientes las URLs antiguas de `uploads` de la sincronización, la coherencia de tipos,
los permisos, la limpieza del frontend y las conexiones de la sección 9.2. La implementación
embebida en PTA sigue conservada.

## 13. Paso 3: persistencia y variables de despliegue (2026-10-09)

Los cambios de Compose se limitaron a `rund-service` y a su recurso de almacenamiento.
No se levantaron ni recrearon contenedores, no se crearon volúmenes reales y no se modificaron
bases de datos, credenciales ni archivos `.env` de trabajo.

### Almacenamiento por ambiente

| Composición | Montaje en `/app/uploads` |
|---|---|
| Base / backend | Bind mount existente `./backend/rund-service/uploads`; puede definirse `RUND_UPLOADS_HOST_PATH` explícitamente |
| DEV | Volumen `esap-rund-uploads-dev` |
| QA | Volumen `esap-rund-uploads-qa` |
| PRE | Volumen `esap-rund-uploads-pre` |
| PROD | Volumen `esap-rund-uploads-prod` |
| LOCAL | Volumen `esap-rund-uploads-local`, declarado localmente para la herencia de DEV |
| GHCR / MFE | Heredan el montaje de su Compose base; no necesitan duplicarlo |

Los nombres separan los archivos de RUND entre ambientes aunque compartan host. El Dockerfile
conserva `USER node` y el directorio `/app/uploads` preparado para ese usuario. No se usa
`volume-nocopy`; un volumen vacío conserva la inicialización del directorio de la imagen.
Los volúmenes sobreviven a la recreación del contenedor, como documenta
[Docker](https://docs.docker.com/engine/storage/volumes/).

### Variables y construcción de imagen

- Se pasan `PUBLIC_APP_URL` / `FRONTEND_URL` con los valores por defecto que ya usan los otros
  módulos del ambiente. LOCAL tiene su propio fallback `http://localhost`.
- Se agregan las variables OpenKM y OCR/Ollama del servicio. La URL de notificaciones conserva
  el destino existente y se expone también como `NOTIFICATIONS_SERVICE_URL`.
- `RUND_OCR_ENABLED` y `RUND_ENABLE_DEV_OTP` quedan desactivadas por defecto.
  Los límites documentales y el permiso de almacenamiento local quedan vacíos si no se
  configuraron: así el código mantiene sus límites por categoría y su política por ambiente.
  En producción, vacío **no** habilita el almacenamiento local; requiere OpenKM.
- Los ejemplos de entorno explican las variables de Compose y la persistencia. En Compose,
  `environment` prevalece sobre el `env_file` del servicio: OpenKM/OCR y las URLs públicas deben
  configurarse en el `.env` elegido para el ambiente. No se editó ningún `.env` real.
- El Dockerfile usa `npm ci` si hay lockfile; si falta, genera uno en la etapa de construcción.
  Producción copia ese mismo manifiesto/lock y ejecuta `npm ci --omit=dev`. Las versiones de
  ambas etapas quedan alineadas; un build limpio sin lock versionado sigue resolviendo los
  rangos del `package.json`.
- `.dockerignore` de RUND excluye `node_modules`, `dist`, `uploads`, `.env` privados y logs.
  Esto evita incorporar dependencias del host, credenciales o documentos en la imagen.

### Validación realizada

`scripts/verify-rund-compose.cjs` ejecuta el **Compose real 2.40.2** en modo `config`, sin daemon.
Se validaron **19 composiciones**: base, backend, local y DEV/QA/PRE/PROD con sus combinaciones
GHCR/MFE. También se verificó que OpenKM, URLs, límites y OCR admiten valores explícitos ficticios.

Antes de editar se guardaron hashes de la configuración ajena a RUND. Después de editar,
los 19 hashes coincidieron. La evidencia está en `docs/rund/validacion-compose.json`.
El verificador usa un entorno controlado y un overlay temporal que omite los `env_file`
obligatorios de los servicios; no lee archivos de entorno reales ni necesita crearlos.
Se comprobó además la sintaxis shell del Dockerfile y pasaron los **9 tests** existentes de
almacenamiento OpenKM y validación documental.

El daemon Docker no está disponible en esta sesión: **no se ejecutó un build Docker ni una
prueba real de escritura en esos volúmenes**. Eso se verifica en el servidor antes de activar
el despliegue; los permisos de un volumen que ya exista dependen de su estado actual.

Para repetir la revisión estructural desde la raíz:

```powershell
node scripts/verify-rund-compose.cjs
```

Para comparar un cambio futuro, antes de editar ejecutar `--capture tmp/rund-compose-before.json`
y después `--compare tmp/rund-compose-before.json`. `COMPOSE_BIN` permite elegir el ejecutable
de Compose; en Linux se usa `docker compose` por defecto.

### Preservar archivos antes del primer despliegue con el montaje nuevo

Si un contenedor RUND existente tiene documentos en su capa escribible, agregar el volumen no
migra esos documentos automáticamente. Antes de recrearlo hay que respaldar `/app/uploads`
del contenedor anterior y restaurarlo en el volumen del mismo ambiente. No se debe copiar
`uploads` de PTA a RUND ni mezclar archivos entre ambientes.

Ejemplo de respaldo de un RUND PROD existente, **antes de detenerlo/recrearlo**:

Usar una carpeta nueva, con `/ruta/respaldos` ya preparado, y conservar el nombre generado:

```bash
rund_backup_dir=$(mktemp -d /ruta/respaldos/rund-prod.XXXXXX)
docker cp rund-service-prod:/app/uploads/. "$rund_backup_dir/"
```

Tras verificar el respaldo, puede prepararse el volumen PROD y copiarlo sin borrar el origen:

```bash
docker volume create esap-rund-uploads-prod
docker run --rm --user 0 \
  --mount "type=bind,source=$rund_backup_dir,target=/backup,readonly" \
  --mount type=volume,source=esap-rund-uploads-prod,target=/restore \
  node:20-alpine sh -c 'if [ -n "$(ls -A /restore)" ]; then echo "Volumen no vacio: se cancela la restauracion" >&2; exit 1; fi; cp -a /backup/. /restore/ && chown -R node:node /restore'
```

Estos comandos son un procedimiento para el operador; **no se ejecutaron en esta sesión**.
La restauración debe usar el respaldo y el volumen correctos, verificarse antes de recrear
RUND y conservar el respaldo. Si el volumen ya contiene archivos, el ejemplo cancela la copia;
no debe sobrescribirse ni borrarse para forzarla. El respaldo requiere una ventana sin nuevas
cargas para que coincidan los archivos y su estado. En base/backend, el bind mount sigue en
su ubicación anterior.
Después de desplegar se comprueba `test -w /app/uploads` como usuario del contenedor y una
carga/descarga controlada en el entorno de pruebas.

**Continuación:** la coherencia de tipos e identificadores se ajustó en la sección 14.
Siguen pendientes la numeración de tarjeta del CRUD base, permisos, limpieza del frontend,
URLs antiguas de sincronización y las conexiones de la sección 9.2.

## 14. Paso 4: tipos e identificadores coherentes (2026-10-09)

### Última revisión del paso 3

Se repitieron las 19 composiciones contra el baseline anterior al cambio. Todas pasaron y
los hashes de la configuración ajena a RUND siguen idénticos. También pasó la revisión de
sintaxis shell del Dockerfile. Se mantienen los límites de la sección 13: el daemon Docker
no está disponible, así que no se ejecutaron un build de imagen ni escrituras en volúmenes.

### Problema y ajuste

La auditoría contra PostgreSQL encontró que `rund."Docente".id` es `TEXT` pero la entidad lo
declaraba UUID. `RundCampoEstado.docente_id` era `VARCHAR(255)` en SQL y UUID en la entidad,
y cuatro tablas adicionales tenían referencias UUID hacia esa clave textual.
También había diferencias en VARCHAR de estados/actores y en timestamps de Macro Docente.

- `BancoDocenteEntity.id` ahora declara la clave primaria `TEXT` con el mismo default SQL
  `gen_random_uuid()::text`. Los nuevos registros **siguen recibiendo UUID v4 como cadenas**;
  no se regeneran ni reformatean identificadores existentes.
- La nueva migración `004_rund_docente_identificadores_text.sql` convierte a `TEXT`
  `docente_id` de `RundCampoEstado`, `RundSoporteCampo`, `RundAprobacionLog`,
  `RundDocumentoPerfil` y `RundExtraccionTrabajo`, mediante `USING docente_id::text`.
  Las otras referencias ya textuales conservan su tipo.
- Se alinearon las entidades correspondientes, los VARCHAR con las longitudes ya establecidas
  por `003` y los `createdAt` de acceso/consulta de Macro Docente con sus columnas `TIMESTAMPTZ`.
- `RundValidacionService` evita comparar un ID textual del banco con la columna UUID
  `personaId`. Conserva la resolución por docente/persona/usuario y admite los formatos UUID
  que antes podía interpretar PostgreSQL, incluidos valores sin guiones o con llaves.

La migración es repetible y usa un solo bloque `DO`. Requiere `Docente.id TEXT` y solo admite
los tipos de origen esperados; ante otra estructura falla y revierte el bloque completo.
No introduce FKs nuevas, no borra filas ni modifica `auth`, `academic_work_plan` o el CRUD
base `rund.docente`. Los IDs de personas, usuarios, documentos, soportes y trabajos conservan
sus tipos UUID cuando son claves propias; únicamente las referencias al perfil se alinean.

### Validación y conservación

El verificador aislado ahora aplica `001`–`004`, contrasta todos los tipos de columnas mapeadas
(incluidos arrays) con el catálogo de PostgreSQL y comprueba las nueve referencias `docente_id`
del banco como texto.

En otra base del mismo cluster temporal se aplicaron `001`–`003` y se crearon registros
ficticios previos: perfil, bloque, soporte, auditoría, documento y trabajo OCR. Se verificó:

- La migración `004` conserva todas las filas, valores e índices, además de los datos de
  `auth`, un registro testigo de PTA y el registro del CRUD base. La auditoría sigue inmutable.
- La repetición de `004` conserva el mismo estado.
- Un tipo inesperado en la última tabla hace que el `DO` revierta también los cambios de
  las anteriores, incluso sin una transacción externa.
- Un perfil con ID textual puede consultar validación por ID/persona/usuario, bloques,
  documentos y auditoría. Los joins entre perfil y referencias funcionan sin casts UUID.
  Un ID textual inexistente responde 404, evitando el error SQL de conversión a UUID.
- Continúan pasando los flujos anteriores: CRUD, XLSX y rollback, reimportación, documentos
  y reemplazo, interoperabilidad por periodo, Macro Docente, acceso externo y revocación.

**Resultados de este paso:** 27 comprobaciones de integración en PostgreSQL 15.14;
**36 suites / 384 tests** del backend; `npm run build` correcto. La sección 15 amplía la
validación a 36 comprobaciones y 391 tests. El reporte actualizado está en
`docs/rund/validacion-servicio-postgres-local.json`. Los procesos se detuvieron y el cluster
temporal, con sus dos bases, se eliminó al terminar; no se aplicó `004` en la base de trabajo,
QA o PROD.

### Aplicación posterior

`003` conserva su contenido histórico para instalaciones que ya la registraron. El ajuste
se distribuye como archivo nuevo `004`; debe aplicarse antes de desplegar esta versión de RUND,
en una ventana controlada y con respaldo. Convierte columnas de tablas propias de RUND y puede
tomar locks/recrear sus índices físicos durante la operación, aunque sus definiciones y datos
se conservan.

Verificar el éxito explícitamente: el ejecutor actual de despliegue sigue usando `psql` sin
`ON_ERROR_STOP` (sección 7). Para aplicar manualmente este archivo debe usarse
`psql -v ON_ERROR_STOP=1 ... -f backend/rund-service/db/migrations/004_rund_docente_identificadores_text.sql`.
No se modificó ese ejecutor ni se ejecutó el procedimiento en una instalación existente.

**Continuación:** la numeración de tarjeta del CRUD base se ajustó en la sección 15.

## 15. Paso 5: numeración secuencial de tarjetas del CRUD base (2026-10-09)

Corresponde al punto **9.1.4** del plan. `DocentesService.create` generaba seis dígitos
aleatorios para `numeroTarjetaRund`, sobre una columna `UNIQUE`; dos altas podían elegir
el mismo número. El ajuste usa una secuencia propia del CRUD base.

### Cambio y compatibilidad

- Nueva migración `005_rund_tarjeta_numero_secuencia.sql`: crea
  `rund.numero_tarjeta_rund_seq` como BIGINT, incremento 1, `CACHE 1`, sin ciclo, asociada a
  `rund.docente.numero_tarjeta_rund`. No modifica tarjetas ni filas existentes.
- El punto inicial queda por encima del mayor sufijo numérico de las tarjetas
  `RUND-AAAA-<dígitos>` ya emitidas, considerando todos los años y también docentes inactivos.
  Números con otros formatos y tarjetas nulas se conservan sin reinterpretarlos ni rellenarlos.
- Repetir la migración nunca retrocede el contador: considera tanto las tarjetas guardadas
  como las reservas ya consumidas por la secuencia. La operación se protege con locks y
  un bloque `DO`; `ALTER SEQUENCE ... RESTART` permite un ajuste transaccional, a diferencia
  de `setval`. [Referencia PostgreSQL](https://www.postgresql.org/docs/15/sql-altersequence.html).
- `DocentesService.create` reserva el número con `nextval` y mantiene
  `RUND-<año vigente>-<correlativo>`, con un mínimo de seis dígitos. Conserva el cálculo de año
  y la fecha de expedición existentes. Los valores mayores de 999999 no se truncan, y se
  manejan como texto para evitar pérdida de precisión de JavaScript.
- La columna conserva su restricción UNIQUE. Si una carga manual posterior ocupó una reserva,
  el servicio vuelve a reservar, hasta cinco intentos, sin actualizar el registro previo.
  Los conflictos de documento y otros errores se propagan sin tratarlos como colisión de tarjeta.
- Editar, cambiar estado, desactivar o emitir/verificar QR no consume un nuevo número ni
  cambia la tarjeta ya asignada. Los registros sin tarjeta conservan el comportamiento anterior.
- La secuencia del banco `rund.docente_id_rund_seq` y su campo `idRund` no se modifican ni se
  comparten con esta numeración. No se unifican los dos modelos de docente en este paso.

Las reservas pueden dejar huecos por errores o rollbacks; no se promete una numeración
sin saltos. No se recuperan valores consumidos, como establece
[PostgreSQL para `nextval`](https://www.postgresql.org/docs/15/functions-sequence.html).

### Validación

Se amplió el verificador de PostgreSQL temporal a `001`–`005` y **36 comprobaciones**:

- Conservación de todas las filas y tarjetas históricas al aplicar `005`, incluidos nulos y
  formatos especiales; la secuencia del banco permanece intacta.
- Inicio por encima del máximo existente, repetición sin reutilizar reservas y manejo exacto
  de valores mayores de seis dígitos y del entero seguro de JavaScript.
- Un correlativo agotado provoca un error sin renumerar registros ni mover el estado previo
  de la secuencia.
- 20 altas HTTP simultáneas junto con la repetición de `005` obtienen tarjetas distintas.
- Colisión provocada contra una tarjeta existente: se obtiene otro número y el registro
  anterior permanece idéntico. Cinco colisiones responden 409 sin dejar un docente parcial.
- Alta HTTP con contador superior a `Number.MAX_SAFE_INTEGER` conserva todos sus dígitos.
- Edición, emisión/verificación real de QR, cambio de estado y borrado lógico conservan una
  tarjeta anterior, sin consumir secuencia.
- Siguen pasando los flujos ya cubiertos de XLSX, documentos, validación, periodos,
  interoperabilidad, Macro Docente, permisos y auditoría.

**Resultados de este paso:** PostgreSQL 15.14 temporal, 36 comprobaciones;
**36 suites / 391 tests** del backend y compilación correcta. La sección 16 amplía la validación
a 43 comprobaciones y 394 tests. Evidencia en `docs/rund/validacion-servicio-postgres-local.json`.
Los procesos y el cluster temporal se limpiaron al terminar. No se aplicó `005` en la base
de trabajo, QA o PROD ni se modificaron los módulos consumidores.

### Aplicación posterior

Aplicar `005` antes de desplegar el nuevo `DocentesService`. Mantener el respaldo y una ventana
controlada: el archivo bloquea temporalmente las escrituras de `rund.docente` y las reservas
de su secuencia mientras calcula el punto inicial. Verificar el éxito con `ON_ERROR_STOP=1`;
el ejecutor general de despliegue sigue teniendo la limitación descrita en la sección 7.

Si la aplicación usa un rol PostgreSQL distinto del propietario, necesita `USAGE` sobre
`rund.numero_tarjeta_rund_seq` además de los permisos previos de tabla/esquema. El archivo no
amplía automáticamente permisos de otros roles. Si detecta una configuración inesperada de
la secuencia o un máximo fuera de su rango disponible, falla sin cambiar tarjetas.

**Continuación:** los permisos del paso 6 / punto 9.1.5 se ajustaron en la sección 16.
Después siguen limpieza del frontend, URLs antiguas de sincronización y conexiones con los
otros módulos, antes de retirar la implementación embebida en PTA.

## 16. Paso 6: catálogo y resolución de permisos compatibles (2026-10-10)

Corresponde al punto **9.1.5**. Se conservaron los códigos existentes y las operaciones
independientes: dar `rund.admin` no implica `banco-docentes.rund.manage`, ni consultar
Macro Docente implica administrar sus accesos externos. No se renombraron permisos,
no se cambiaron sus UUID ni se movieron los ya existentes entre módulos.

### Correcciones del servicio

- `auth/rund-permission-catalog.ts` reúne 16 códigos: seis del CRUD base, ocho del banco y
  dos de Macro Docente. Los exports anteriores se conservan para los controladores y clientes.
- El login real de auth emite JWT con roles, sin permisos. El `PermissionsGuard` del CRUD base
  buscaba los permisos en ese JWT, por lo que bloqueaba roles con grants válidos en la base.
  Ahora consulta las asignaciones efectivas por los roles firmados del token.
- `auth/rund-effective-permissions.ts` resuelve códigos exactos desde `auth.role_permissions`,
  `auth.role` y `auth.permission`, exigiendo sus flags activos. Los permisos declarados en
  el JWT/body y los comodines no sustituyen esas asignaciones.
- La consulta se comparte dentro de una misma petición (guard global + guard del controlador),
  pero no hay cache entre peticiones. Cambios en los grants o desactivación de permisos/roles
  se comprueban en la siguiente solicitud que requiere autorización por permiso.
- Banco y Macro Docente usan el mismo resolver. La autorización activa de Macro Docente ya
  no instancia `PtaPermissionsService` ni carga el contexto de aprobación de PTA.
- Si falla la consulta de permisos se deniega el acceso por permiso. Se conservan las
  excepciones históricas declaradas: el CRUD base permite SUPER_ADMIN/SUPERADMIN/ADMIN_SISTEMA;
  el banco mantiene los roles explícitos de cada ruta y SUPER_ADMIN; Macro conserva SUPER_ADMIN.
  No se hicieron equivalentes esos bypass ni se amplió la lista de roles para datos sensibles.

Las rutas públicas OTP/autogestión/acceso externo mantienen sus tokens y sus controles
anteriores. Los endpoints de compatibilidad `rund/docente`, `sync-documents` y `resumen`
conservan su contrato JWT previo. La identidad por roles sigue proviniendo del JWT firmado;
esta revisión no implementa revocación de tokens ni consulta la membresía usuario/rol en cada
petición. Los guards nuevos sí revalidan las asignaciones rol/permiso y sus flags activos.

### Migración 006

`006_rund_catalogo_permisos_compatibles.sql` completa los diez códigos del banco/Macro que
faltaban en las migraciones del servicio independiente. Usa `ON CONFLICT DO NOTHING`:
conserva íntegramente entradas previas, nombres personalizados, módulos, IDs, flags inactivos
y grants revocados. Los permisos ausentes se registran bajo el módulo `rund` de `002`.

Solo para permisos recién creados replica los defaults funcionales de `423` y `418`:
GGP recibe los del banco y Macro; RECTOR los de Macro; las variantes de Control Interno y
Disciplinario reciben consulta Macro. No crea roles ni concede esos defaults para permisos
que ya existían. Tampoco reactiva roles inactivos ni asignaciones revocadas.

Las instalaciones que ya tenían los permisos bajo `gestion-profesoral` / `pta` conservan
esa asociación para no afectar Roles y Permisos ni los módulos actuales. Su traslado o un
eventual cambio de códigos se debe coordinar con la migración de los consumidores; este paso
unifica catálogo/resolución del servicio, no convierte permisos distintos en alias.

### Verificación

El verificador temporal aplica `001`–`006` y comprueba que todos los códigos exigidos por los
decoradores estén registrados. En otra base ficticia se verificó que `006` conserve permisos
personalizados, sus módulos/UUID, grants inactivos y todas las filas ajenas al catálogo,
incluso al repetirla. Una asignación ausente sobre un permiso ya existente no se recrea.

Las pruebas HTTP del `main` real incluyen:

- JWT solo con roles y permiso `rund.view` activo: consulta permitida; creación, banco y Macro
  denegados. Revocar la asignación bloquea la siguiente consulta con el mismo token.
- Permiso de consulta del banco: datos enmascarados, puntaje nulo; edición, originales y CRUD
  base denegados. Desactivar el permiso bloquea el acceso por permiso en la siguiente petición.
- Consulta Macro: historial permitido; administración de accesos y banco denegados.
  Desactivar el rol bloquea nuevas consultas por permiso.
- Permisos falsos/comodines en el JWT no conceden acceso; fallo de consulta de permisos se
  deniega. Los roles explícitos históricos mantienen su comportamiento.
- Continúan pasando documentos, cargas XLSX, periodos, validaciones, tarjetas/QR, concurrencia,
  auditoría y revocación de accesos externos.

**Resultados:** 43 comprobaciones en PostgreSQL 15.14 temporal; **36 suites / 394 tests** del
backend; compilación correcta. Evidencia en `docs/rund/validacion-servicio-postgres-local.json`.
Se limpiaron los procesos y el cluster temporal. No se modificaron auth-service, PTA,
frontend/shell ni las migraciones globales, y no se aplicó `006` en bases de trabajo, QA o PROD.

Aplicar `006` antes de desplegar estos ajustes, verificando errores con `ON_ERROR_STOP=1`.
El resolver necesita lectura de las tablas de permisos de auth, ya requeridas por banco y Macro.
La configuración real del rol PostgreSQL y el despliegue siguen requiriendo validación en el
servidor; los límites del entorno de pruebas se mantienen.

**Continuación:** el paso 7 / punto 9.1.6 se completó en la sección 17.
Después siguen las URLs antiguas de sincronización y las conexiones de la sección 9.2.

## 17. Paso 7: frontend RUND limpio y transporte local (2026-10-13)

Se cerró el punto **9.1.6**. La revisión inicial de esta sesión produjo **140 diagnósticos
TypeScript**; la cifra aproximada de 250 del estado inicial era anterior. No se redujo el
chequeo a una lista de archivos ni se excluyeron componentes activos para esconder errores:
`tsconfig.json` sigue incluyendo todo `src`.

### Limpieza y contratos conservados

- Se revisaron imports estáticos y dinámicos desde `main.tsx`, `RundModulePremium`, la copia
  de autogestión y las pruebas; también se buscaron referencias externas en el repositorio.
  Se retiraron **126 archivos TypeScript sin uso funcional** dentro de `mfe-rund`, incluidas
  las dos copias de servicios ajenos, pantallas de gestión profesoral, tipos generales, seis
  pantallas nuevas sin montar y `rundService`. La eliminación no incluye el RUND original de PTA.
- Tres pares utilidad/test eran exclusivos de PTA (pensum, autor de historial y presentación
  institucional), sin consumidor en RUND. Sus **35 tests** se retiraron de esta copia; las
  utilidades y pruebas originales permanecen en `mfe-pta`. Todas las pruebas propias del banco,
  perfiles, datos originales, validación, documentos, extracción y teléfonos se conservaron.
- `services/api/rundApi.ts` reemplaza la copia completa de `ptaApi.ts` y conserva las diez
  funciones utilizadas, sus URLs, flags, periodo seleccionado, errores y paginación. Se mantiene
  la generación local de la plantilla XLSX; no se crearon endpoints de exportación ficticios.
- El cliente HTTP se adaptó del transporte vigente del shell, conservando cookies HttpOnly,
  un refresh por intento y renovación compartida entre peticiones de este MFE. Conserva JSON,
  Blob, multipart/XHR, progreso, cancelación y los cinco minutos de timeout de carga masiva.
  No lee tokens desde localStorage/sessionStorage. No persiste respuestas ni encola cambios;
  las operaciones sin conexión fallan y no devuelven un éxito de sincronización local.
- `config/environment.ts` conserva los criterios de gateway, `/services`, túneles y frontend
  público. En modo directo agrega el servicio RUND en 3016, con `VITE_RUND_URL` opcional;
  auth y PTA conservan sus puertos, con overrides opcionales `VITE_AUTH_URL` y `VITE_PTA_URL`.
  `VITE_API_URL`, `VITE_API_MODE` y `VITE_PUBLIC_FRONTEND_URL` mantienen su significado.
- Conectividad y logo institucional se copiaron localmente. Se resolvieron los errores de
  resultados API, tipos React, estadísticos, encabezados XLSX y mocks sin cambiar el formulario,
  la protección por permisos ni los datos mostrados. El test telefónico usa resultados explícitos
  y ya no importa el backend PTA. Se declararon `sonner` y `xlsx` y el comando `typecheck`.

### Verificación

- `tsc --noEmit --pretty false`: **0 errores**, con las pantallas y todos los tests incluidos.
- Suite completa: **17 archivos / 163 tests** pasan. Respecto de 165 iniciales, se retiraron
  los 35 exclusivos de PTA y se añadieron **33** de transporte, configuración, API y autogestión.
  Tras sustituir el import del test telefónico, sus **19 casos** se volvieron a validar.
- Pruebas nuevas: gateway/directo, cookies, renovación concurrente y sesión expirada, 403,
  Blob, multipart, progreso/cancelación/timeout, flags de carga XLSX, soportes públicos,
  OTP, borradores enmascarados y reintento de archivos fallidos sin repetir el alta.
- `vite build`: correcto. El artefacto sigue exponiendo `rund/Module` con `RundModulePremium`.
- `node scripts/verify-rund-frontend.cjs`: **47 archivos fuente**, 46 alcanzables más la
  declaración de Vite; cero imports de fuentes de otros módulos y cero TypeScript huérfano.
  Comprueba además la existencia del chunk y el export del remote generado.

Evidencia: `docs/rund/validacion-frontend-local.json`. Las pruebas/build usaron las dependencias
ya instaladas; Vitest local es 0.34.6 y Vite 6.3.5. No se ejecutó una instalación limpia ni se
regeneró el lock global. Vite/Vitest requirieron ejecución fuera del sandbox por la restricción
de resolución de dependencias de esbuild en Windows. Esto acredita validación local y artefacto;
no sustituye una prueba en navegador del shell desplegado con su gateway y cookies reales.

Este paso no cambió el shell, `mfe-pta`, auth-service ni el backend PTA. El menú de banco y la
ruta pública de autogestión del shell siguen usando su implementación anterior. Tampoco se
aplicaron migraciones ni se modificaron datos existentes.

**Siguiente paso (paso 8 / sección 9.2):** revisar los enlaces antiguos de archivos y las
sincronizaciones antes de cambiar las entradas del shell hacia RUND. Después migrar reportes,
Gestión de Personas/Carpeta Digital, PTA y Programación Académica, conservando contratos y
alcances por rol. La retirada definitiva del RUND embebido sigue reservada a la sección 9.3.

Este prerrequisito de enlaces y reparación se completó en la sección 18; los consumidores
externos y el contrato HTTP de usuarios de auth continúan pendientes.

## 18. Paso 8: enlaces propios y compatibilidad de soportes históricos (2026-10-13)

La carga de soportes técnicos (`soporte_edicion_perfil` / `soporte_cambio_estado_perfil`)
escribía el archivo en RUND y registraba una URL de PTA. El diagnóstico reconocía únicamente
ese prefijo, trataba enlaces de documentos versionados como rutas de disco y la reparación
comparaba URLs literalmente. Esto podía producir descargas al servicio equivocado,
diagnósticos falsos de archivo ausente y duplicados al convivir referencias anteriores/nuevas.

### Correcciones

- `rund-upload-paths.ts` centraliza los enlaces de uploads y su resolución local. Reconoce
  `/pta/api/v1/uploads`, `/rund/api/v1/uploads`, sus variantes con `/services` y `/uploads`.
  Decodifica segmentos de URL, conserva espacios y rechaza recorridos fuera de uploads,
  drives Windows, separadores alternativos y referencias ajenas. Un UUID de Carpeta Digital,
  un enlace de auth o una URL absoluta no se interpreta como archivo local.
- La carga genera `/rund/api/v1/uploads/...` a partir de **`file.path` real de Multer**. Un campo
  `docenteNombre` recibido después del archivo ya no produce una URL hacia otra carpeta.
  El directorio de destino se valida antes de crearlo; se conservan límites, MIME y limpieza
  de las cargas temporales del flujo existente.
- `sync-check` consulta el proveedor y `almacenamiento_ruta` del documento versionado,
  enlazándolo por ID y docente. Para LOCAL/LEGACY_LOCAL comprueba el archivo físico; para
  OpenKM conserva `existsOnDisk: false` porque el diagnóstico es de disco, no una consulta
  de disponibilidad remota. No sobrescribe referencias ni consulta volúmenes de PTA/auth.
- La reparación compara la ruta local de cada soporte con el archivo encontrado: una URL
  anterior de PTA y la nueva de RUND no representan dos soportes distintos. Solo enlaza
  registros sin referencia **y sin documento versionado**; las referencias nuevas usan RUND.
  Se conserva el algoritmo administrativo anterior para archivos sin registro. Repetirla
  secuencialmente no vuelve a crear/enlazar esos archivos. No se añadió bloqueo entre dos
  ejecuciones administrativas simultáneas; esa operación conserva su carácter controlado.
- `RundDocumentStorageService` reconoce los prefijos anteriores y nuevos de LEGACY_LOCAL
  para lectura/eliminación de una copia local. Mantiene las claves relativas existentes y
  el contrato OpenKM. Rechaza referencias externas o que salgan de uploads antes de acceder.
- `mfe-rund/services/api/rundUploadEndpoint.ts` adapta exclusivamente el **destino HTTP** de
  originales RUND históricos (uploads y `documentos/:id/contenido`). Mantiene los parámetros
  e IDs y funciona en gateway/directo. Las rutas de auth, catálogos y adjuntos ajenos siguen
  su destino anterior. La referencia almacenada y `documentoVersionId` no se modifican:
  revisiones vigentes, estados y auditoría continúan usando la misma identidad de versión.

### Verificación y alcance

- **Backend:** `npm run build` correcto; **38 suites / 435 tests** pasan. Se añadieron 41
  casos de rutas, diagnóstico, repetición de reparación, conservación de referencias/versiones,
  carga técnica y LEGACY_LOCAL con archivos temporales reales.
- **PostgreSQL 15.14:** **46 comprobaciones** pasan con el `main` real y migraciones `001`–`006`.
  Los tres casos nuevos verifican carga técnica, descarga de los bytes originales mediante
  `/services/rund/api/v1`, 401/403 y auditoría, diagnóstico de la versión vigente, conservación
  íntegra de filas con URLs PTA/RUND y repetición de reparación sin duplicados.
- **Frontend:** TypeScript sin errores, **18 archivos / 178 tests** pasan y `vite build` correcto.
  Se añadieron 15 casos de transporte de enlaces históricos y destinos ajenos. El verificador
  del remote sigue pasando, con 49 fuentes y cero imports de otros módulos o archivos huérfanos.
- Evidencia: `validacion-servicio-postgres-local.json` se amplió a 46 comprobaciones;
  `validacion-enlaces-sincronizacion-local.json` reúne los resultados de este paso. Las pruebas
  solo usaron datos ficticios, receptor local y archivos temporales; se detuvieron los procesos
  y se eliminó el cluster. No se aplicaron migraciones ni reparaciones a instalaciones existentes.

No se movieron ni copiaron archivos de otros servicios ni se reescribieron referencias históricas
en bases de trabajo. El shell, `mfe-pta`, auth-service y el backend PTA siguen intactos en este
paso. La verificación del prefijo público usa un proxy de prueba; no levanta Nginx/gateway reales
ni sustituye la prueba en navegador del despliegue. Se usaron las dependencias locales existentes.

### Hallazgo detectado en el paso 8 (resuelto en la sección 19)

`sync-from-auth` todavía consulta `${AUTH_SERVICE_URL}/api/v1/users` sin sesión ni credencial
interna y corta el bucle ante una respuesta no exitosa, devolviendo un resumen vacío. Auth
publica **`/users`**, acepta `x-internal-service-token` en esta ruta mediante
`@InternalServiceAccess()` y devuelve `{ data: PersonResponseDto[], meta }`. La lectura y
el mapeo de identidades/paginación deben adaptarse juntos y probar fallos antes de redirigir
el botón de Gestión de Personas. `sync-auth` conserva su no-op porque el banco ya usa
`auth.personas`/`auth.user`; `sync-documents` mantiene su contrato y pasa la integración.
No se cambió este contrato externo en el paso de archivos ni se dio por validado entonces.
La sección 19 registra su ajuste y sus comprobaciones posteriores.

**Siguiente paso (paso 9 / sección 9.2):** ajustar y validar la sincronización de usuarios con
auth, incluida la credencial de servicio, IDs, paginación, repetición y fallos. Luego conectar
el shell/autogestión y los demás consumidores con RUND. La implementación original de PTA
se conserva hasta el cierre explícito de la sección 9.3.

## 19. Paso 9: sincronización de usuarios auth → RUND (2026-10-13)

Se corrigió `POST .../banco-docentes/sync-from-auth` del servicio independiente. Se mantiene
el resultado `{ total, created, skipped, failed }` y los guards de la ruta. El body no puede
elegir usuarios, la URL de auth, una credencial ni el autor de la operación.

### Contrato HTTP y credencial

- `rund-auth-sync.ts` consulta **`/users`** sobre `AUTH_SERVICE_URL`, con
  `x-internal-service-token`, `status=active`, páginas de 100 y orden estable por usuario/ID.
  Auth filtra `role` por **UUID**, no por código: RUND resuelve el único rol DOCENTE activo
  antes de consultar. No crea/reactiva roles ni cambia sus asignaciones.
- La credencial sale de `AUTH_INTERNAL_SERVICE_TOKEN`, con `INTERNAL_SERVICE_TOKEN` como
  alternativa explícita. No usa automáticamente el secreto de firma JWT ni reenvía cookies,
  Bearer o datos del body del operador. Sin credencial o configuración válida responde **503**.
- Reconoce `{ data: PersonResponseDto[], meta }` y el wrapper del interceptor de auth.
  Usa `PersonResponseDto.id` como persona y `user.id_user` como usuario interno; no usa
  `public_id` para relacionar registros. Los UUID se verifican contra la identidad local de auth.
- Completa y valida **todas las páginas antes de escribir**. Comprueba totales, límites,
  número de página, consistencia y usuarios repetidos. Un error HTTP/contrato/red devuelve
  **502** y un timeout **504**, sin presentar una consulta incompleta como éxito vacío.
  No sigue redirecciones. Límites configurables: 15 s por página y 1000 páginas por defecto.

### Conservación de datos

El método anterior llamaba `upsertDocente`, que puede actualizar personas, nombres,
contacto, username y roles de auth. La sincronización ahora tiene una proyección específica
que **solo escribe en RUND**, sin reutilizar ese alta/edición general.

- Revalida usuario y asignación DOCENTE activos en `auth`; solo lee sus tablas. Conserva
  personas, cuentas, passwords, flags, roles y territoriales institucionales.
- Si existe cualquier perfil de la persona, incluso uno con periodo, lo omite íntegramente:
  conserva sus campos, estados, puntajes, versiones, bloques y auditoría. No lo reactiva ni
  crea un perfil adicional sin periodo. Un correo de otro perfil tampoco se reasigna.
- Los nuevos perfiles son mínimos, **INACTIVO / PENDIENTE_APROBACION**, sin periodo,
  horas cero, vinculación/dedicación sin definir y puntaje nulo. Conservan IDs y territorial/sede
  disponibles de la fuente. Una cuenta DOCENTE activa no demuestra una vinculación laboral;
  Gestión Profesoral debe completar y validar ese perfil mediante los flujos existentes.
- Se inicializan seis bloques y 24 validaciones `Sin cargar`. La auditoría CREAR/AUTH_SYNC
  usa el actor firmado del JWT e IP de la petición, con procedencia `auth-service`/`solo_creacion`.
- Una transacción incluye perfiles, bloques, validaciones y auditoría de toda la ejecución.
  Ante una falla de escritura se revierte y responde **503**. Los registros fuente incompletos
  o no resolubles se cuentan en `failed`; los no elegibles/existentes en `skipped`.
- Los locks de transacción por persona, tomados en orden estable, serializan invocaciones
  simultáneas entre instancias de RUND. Se mantiene también el índice único existente y
  `ON CONFLICT DO NOTHING`. Repetir una ejecución exitosa no crea ni actualiza filas ni
  consume otro número RUND. Un rollback puede dejar saltos de secuencia; no se retrocede.

`sync-auth` conserva su no-op de compatibilidad y `sync-documents` conserva su contrato.
Las altas manuales, XLSX, autogestión y ediciones siguen usando sus métodos anteriores.

### Configuración para el servidor

Se agregaron los ejemplos y variables de RUND en Compose base/backend/DEV/QA/PRE/PROD;
LOCAL las hereda. Los otros servicios conservaron su configuración efectiva.

- `AUTH_INTERNAL_SERVICE_TOKEN`: **el valor que auth acepta actualmente**. Si auth dispone
  de `INTERNAL_SERVICE_TOKEN`, usar ese valor; si sigue con su fallback a `JWT_SECRET`, su
  credencial aceptada es ese secreto y debe proporcionarse explícitamente a RUND.
  Este paso no cambia la credencial de auth ni rota claves de sus consumidores.
- `RUND_AUTH_SYNC_TIMEOUT_MS=15000` y `RUND_AUTH_SYNC_MAX_PAGES=1000`: positivos y acotados.
  El timeout puede llegar a 120000 ms y el máximo a 10000 páginas; valores inválidos fallan.

Los ejemplos no contienen una credencial real y no se editaron `.env` de instalaciones.
Configurar el valor vigente antes de usar esta operación en el despliegue. No se necesita
una migración SQL adicional: se utilizan las estructuras y secuencia existentes `001`–`006`.

### Verificación

- **Backend:** compilación correcta; **39 suites / 461 tests** pasan (26 casos nuevos).
- **PostgreSQL 15.14 temporal:** **52 comprobaciones** pasan. Se verificaron varias páginas,
  preservación completa de filas auth/perfiles previos, roles revocados/usuarios inactivos,
  repetición sin nuevas filas ni reserva de secuencia, rechazo 401/403, falla de página posterior,
  dos sincronizaciones simultáneas y rollback al fallar la auditoría de la **segunda alta**:
  también se revierte la primera. El reintento crea los dos perfiles una sola vez.
- **Compose:** 19 composiciones válidas, con comparación de hashes que confirma que todos
  los servicios/volúmenes ajenos a RUND siguen idénticos a los de antes de este paso. Se
  verifican defaults, override específico y alternativa de token compartido con valores ficticios.
- Evidencia: `validacion-servicio-postgres-local.json` ampliada a 52 comprobaciones,
  `validacion-compose.json` y `validacion-sync-auth-local.json`.

La integración ejecuta el `main` real de RUND y PostgreSQL real; **auth `/users` se representa
con una fixture HTTP local** basada en su contrato vigente, con credencial y paginación.
No se levantó auth-service/Nginx/gateway reales ni se probó el despliegue en navegador.
Se usaron solo datos ficticios y se limpiaron procesos/cluster. No se ejecutó la operación
sobre bases de trabajo ni se aplicaron migraciones en ellas. El frontend, auth-service, PTA
y el shell no cambiaron en este paso.

**Siguiente paso (paso 10 / sección 9.2):** conectar las entradas del shell y la autogestión
con el remote/servicio RUND conservando rutas, sesión, permisos y descargas. Luego redirigir
Gestión de Personas, sus botones de sincronización y el resto de consumidores. La retirada
de la implementación original de PTA sigue reservada al cierre explícito de la sección 9.3.

## 20. Paso 10: entradas del shell y autogestión federada (2026-10-13)

El menú histórico `banco-docentes-pta` montaba `PTAModule` con `initialView="banco_docentes"`,
mientras la entrada `rund` ya tenía un remote propio. Ahora ambas montan `RundShellModule`
y cargan **`rund/Module`**, conservando IDs de menú, permisos, sesión y rutas existentes.
`?module=banco-docentes` se normaliza al ID histórico; `?module=banco-docentes-pta` y
`?module=rund` también funcionan. La entrada de planes `pta` sigue montando `PTAModule`.

### Sesión y permisos

- `RundEntries.tsx` pasa persona, nombre, correo, roles y permisos del shell al remote,
  con `embedded=true`. No copia ni lee JWT desde storage para esta conexión.
- Remonta el banco al cambiar identidad/correo/roles/permisos: elimina formularios y datos
  de la sesión anterior. Un cambio del nombre visible mantiene la edición de la misma sesión.
  No modifica asignaciones de módulos, grants ni los guards del backend.
- Se añadieron las declaraciones de los dos remotes y el ambiente Vite del shell. La
  resolución admite exports nombrados, default y namespaces envueltos dentro de default.
  La comprobación real de navegador detectó el envoltorio del export público y permitió
  corregirlo; los mocks iniciales no reproducían ese caso de federación.
- El cliente del shell reconoce RUND en modo directo (3016 / `VITE_RUND_URL`). La política
  de caché excluye el namespace `/rund/api/v*`, el alias `rund-service`, las rutas de
  compatibilidad y el origen RUND configurado en modo directo. Continúa respetando la caché
  de catálogos, documentos generales y otros servicios; una URL RUND dentro de un query
  no convierte un catálogo en petición RUND.

### Invitaciones y rutas públicas

Se añadieron **`rund/Autogestion`** y la ruta pública **`/rund/autogestion/docentes`**, fuera del
login. Usa el formulario independiente, su cliente local y `/rund/api/v1/banco-docentes/...`.
Cambiar los parámetros de una invitación remonta el formulario, evitando reutilizar otro
borrador/sesión OTP del componente anterior.

El correo de invitación del backend RUND y los enlaces de su tablero ahora usan esta ruta.
El frontend respeta `VITE_PUBLIC_FRONTEND_URL` y codifica el token al construir el link.
El correo usa las URLs públicas configuradas en el backend. El token de invitación guardado
no se convierte en una sesión; OTP, propiedad, enmascaramiento y reintentos siguen intactos.

**`/autogestion/docentes` permanece en PTA**: sus invitaciones, tokens y borradores están en
otro esquema y no se copiaron a RUND. Cambiar esa ruta de forma incondicional rompería esos
enlaces. Las invitaciones propias de RUND creadas antes de este paso pueden abrirse desde
su tablero con la ruta nueva y el mismo token almacenado. No se agregó búsqueda pública de
tokens entre servicios ni fallback automático de datos cuando falla un remote.

### Verificación

- **RUND frontend:** TypeScript sin errores, **19 archivos / 180 tests**, `vite build` correcto.
  El verificador comprueba ambos exports/chunks; 51 fuentes, sin TypeScript huérfano ni
  imports de fuentes del shell/PTA/backend. Se conservaron los flujos de los tests anteriores.
- **Shell:** build antes/después correcto. **7 archivos / 65 tests** pasan, incluidos navegación
  histórica/nueva, sesión, cambio de permisos, resolución federada y política de caché.
  La suite completa además encuentra **una suite que no arranca**:
  `disciplinary.service.spec.ts` usa Jest dentro de Vitest (`jest is not defined`). Se reprodujo
  el mismo fallo con el `vitest.config.ts` original de HEAD, sin cambiar esa prueba/servicio.
  No se excluyó ni se dio por aprobada la suite completa.
- **Tipos del shell:** **617 → 591 diagnósticos**; ninguno nuevo al comparar archivo, código
  y mensaje. Se resolvieron declarations Vite y el remote RUND; los demás errores son previos
  y siguen pendientes. No se relajó `strict` ni se excluyeron archivos para aparentar un tsc limpio.
- **Backend:** build correcto, **39 suites / 462 tests**. PostgreSQL 15.14 temporal pasa
  **53 comprobaciones**, incluida la URL pública del correo y el token de invitación persistido.
- **Navegador:** `verify-rund-shell-browser.cjs` ejecuta shell y remotes compilados reales en
  Chrome headless con perfil nuevo y APIs ficticias interceptadas. Pasa **5 comprobaciones**:
  menú histórico, `module=rund`, alias `module=banco-docentes`, OTP público hacia RUND y
  OTP de la ruta anterior hacia PTA. Cero errores JavaScript; no usa cookies/perfiles reales.
  Esta prueba detecta fallos de carga/federación, pero no sustituye un E2E con servidores reales.

Se usaron Vitest **2.1.9** del shell y **0.34.6** instalado para RUND; no se mezclaron sus
runners/imports ni se reinstalaron dependencias. El resolver de remotes añadido a Vitest
solo proporciona fixtures para tests; el build y el navegador usan la federación real.

Evidencia: `validacion-conexion-shell-local.json`, `validacion-shell-navegador-local.json` y
`validacion-servicio-postgres-local.json`. Los procesos temporales se cerraron y PostgreSQL
se eliminó. No se tocaron datos existentes, auth-service, el backend PTA ni `mfe-pta`.
Tampoco se copió el contenido de las tablas PTA al esquema RUND: la entrada nueva consulta
la base independiente conforme a la decisión inicial, no garantiza continuidad de sus datos.

Para publicar estos cambios, preparar migraciones/configuración de RUND según las secciones
anteriores; publicar primero su remote con ambos exports, luego el shell y finalmente el cambio
de enlace del correo en el backend. Mantener disponibles los assets/servicios originales de PTA
mientras se preserva su ruta pública. Este paso no hizo despliegues ni editó `.env` reales.

**Siguiente paso (paso 11 / sección 9.2):** migrar los consumidores de Gestión de Personas
(`sync-from-auth`, `sync-documents`) y revisar su manejo de sesión/resultados. Después siguen
Carpeta Digital, reportes, PTA y Programación Académica. El cierre definitivo del RUND original
continúa requiriendo la confirmación explícita indicada en la sección 9.3.

## 21. Paso 11: consumidores de Gestión de Personas (2026-10-13)

Se migraron los disparadores activos de Gestión de Personas hacia el servicio independiente:

- **Asignar roles:** tras confirmar en auth un conjunto que incluye `DOCENTE`, llama a
  `/rund/api/v1/banco-docentes/sync-from-auth` mediante su cliente existente.
- **Crear usuario:** conserva la creación en auth y el mapeo de roles por ID/nombre/código;
  si incluye `DOCENTE`, ejecuta la misma sincronización después de confirmar la creación.
- **Documentos:** el adaptador activo `src/services/api/supabase.service.ts` llama ahora a
  `/rund/api/v1/rund/docente/:persona/sync-documents`. Codifica la clave en la URL y mantiene
  los campos del contrato vigente, categorías, estados y resultados de la operación primaria.

No se usan puertos PTA hardcodeados ni el `fetch` sin credenciales del disparador anterior.
El cliente conserva cookies HttpOnly, configuración gateway/direct y el refresh habitual.
En directo, RUND utiliza `VITE_RUND_URL` o el puerto 3016 del catálogo del shell; no tiene
prefijo global `/api/v1`. En gateway usa el namespace `/rund/api/v1`. No copia JWT a storage
ni agrega credenciales internas o identidades declaradas por el navegador al cuerpo.

### Confirmación de resultados y conservación del flujo de auth

`rundSync.service.ts` comprueba `total`, `created`, `skipped` y `failed`: enteros seguros,
no negativos y suma consistente. Admite la respuesta directa y los sobres del controlador
e interceptor; rechaza `success:false`, resúmenes inválidos y cuerpos vacíos/no JSON.
Un resultado con `failed > 0` se informa como **incompleto**, con sus contadores.
Los contadores corresponden al lote de auth: no garantizan que se haya creado precisamente
el usuario seleccionado, ni activan perfiles mínimos pendientes creados por el paso 9.

Se añadió `preserveResponse` optativo al cliente de Gestión de Personas: estas llamadas
conservan el sobre para comprobar sus indicadores. El comportamiento por defecto de los demás
servicios sigue desenvolviendo `data`; el refresh conserva también esta opción.
Las sincronizaciones usan `retries: 0` ante fallos HTTP/red; mantienen el único reintento
habitual tras refrescar una sesión que recibe 401. No duplican automáticamente mutaciones 5xx.

Un fallo de RUND no revierte ni vuelve a escribir los roles o crear al usuario. La UI confirma
la operación de auth y muestra un aviso separado con **Reintentar**, que solo llama a RUND.
El aviso distingue creación de usuario y asignación de roles; 403 explica falta de permiso
sin ampliar grants ni saltarse los guards del backend. La asignación tiene protección contra
dos eventos de guardado en el mismo render. Un rechazo de auth mantiene el modal abierto y
no inicia sincronización; otros roles tampoco la disparan.

El adaptador documental comprueba el recibo (`docenteId` y `validaciones`) y muestra un aviso
si el servicio no confirma la actualización. Mantiene el resultado/cambio primario ya realizado.
Su reintento envía el estado actual de esa carpeta sin volver a ejecutar la acción documental.
No modifica los archivos ni las validaciones del servicio PTA original.

### Verificación y límites

- **Gestión de Personas:** build antes/después correcto; **4 archivos / 50 tests** pasan:
  3 pruebas previas del formulario, 8 del flujo de creación/asignación, 27 del transporte y
  resultados de perfiles, y 12 del consumidor documental.
- Se probaron cookies, gateway/direct, configuración de URL, refresh de sesión, sobre
  rechazado con HTTP 200, contadores parciales, 403/404/500/503, pérdida de conexión,
  conservación de cambios primarios y reintento sin volver a crear/asignar.
- **TypeScript:** Gestión de Personas no tiene un tsconfig propio. Se comprobó su grafo
  con un proyecto temporal que extiende el tsconfig raíz, conserva `strict` y declara el
  ambiente Vite. **194 diagnósticos antes / 194 después; ninguna firma nueva** al comparar
  archivo, código y mensaje. Persisten fallos previos del módulo y dependencias importadas;
  el typecheck completo no se declara aprobado ni se relajaron checks para ocultarlos.
- **Navegador:** `verify-rund-personas-browser.cjs` monta el shell y el remote compilados
  reales en Chrome headless con perfil/contextos nuevos y APIs ficticias interceptadas.
  Pasa **5 comprobaciones**: asignación hacia auth seguida de RUND, 503 y reintento sin
  repetir auth, resultado parcial, otros roles sin sincronización y rechazo de auth.
  Cero errores JavaScript. Las pruebas unitarias también cubren el disparador de creación.

Evidencia reproducible:

- `docs/rund/validacion-personas-local.json` (resultados, alcance, hashes y límites).
- `docs/rund/validacion-personas-navegador-local.json` (5 checks del navegador).

**Pendiente documental, previo a este paso:** el adaptador de Gestión de Personas todavía
guarda documentos/metadatos en localStorage y utiliza URLs de objetos del navegador.
Este cambio migra su consumidor HTTP; no convierte ese almacenamiento en persistencia del
backend ni acredita una sincronización completa de Carpeta Digital. El contrato vigente
`sync-documents` actualiza por categoría y una lista vacía **no limpia** validaciones antiguas.
No se agregó limpieza destructiva basada en una caché que puede ser parcial. La integración
definitiva debe usar documentos persistidos, identidades resueltas por el servidor y reglas
explícitas para eliminación/reclasificación/versiones; corresponde al siguiente paso.

La copia documental del **shell** sigue apuntando a PTA y se atenderá junto a su integración
de Carpeta Digital. No se cambiaron el shell, auth-service, backend RUND ni PTA en este paso.
Se usaron exclusivamente fixtures: no se desplegó, no se ejecutaron sincronizaciones contra
servicios/bases reales, no se aplicaron migraciones ni se editaron `.env` reales.
La conexión requiere que RUND ya tenga la configuración/migraciones del paso 9; un faltante
se informa como pendiente, sin usar PTA como fallback.

**Siguiente paso (paso 12 / sección 9.2):** integrar Carpeta Digital (auth-service y shell)
con RUND: revisar lecturas SQL/soportes del esquema original, persistencia documental real,
permisos, identidad, versiones, descargas y sincronización de estados. Después siguen
reportes, PTA y Programación Académica. Retirar el RUND original sigue reservado al cierre
explícito de la sección 9.3.

## 22. Paso 12.1: consulta de Carpeta Digital entre servicios (2026-10-13)

El paso 12 se divide para separar dos cambios con responsabilidades distintas:
**12.1, consulta del propietario y seguridad entre backends**; **12.2, adaptadores de las
interfaces y persistencia/versionado documental**. Esta sección cierra 12.1, no todo el paso 12.
La inspección confirmó que las interfaces del shell/Personas todavía leen/modifican documentos
en localStorage y simulan parte del historial; reemplazar solo un endpoint no resolvería eso.

### API del propietario RUND

Se agregó `POST /internal/carpeta-digital/personas/:personaId/documentos` en RUND.
Es una consulta interna con HTTP 200 y `Cache-Control: private, no-store`:

- Exige `X-Rund-Carpeta-Token` incluso con JWT SUPER_ADMIN o excepciones JWT globales.
  Compara hashes con `timingSafeEqual`; configuración ausente devuelve 503 y credencial
  incorrecta/ausente, 401. Nunca adopta `JWT_SECRET` como token interno.
- El UUID corresponde a la persona resuelta por auth, no a una cédula/correo/nombre.
  RUND consulta sus propias tablas y admite todos los periodos de esa persona.
- Lista versiones **ACTIVO** de `rund."RundDocumentoPerfil"` y soportes sin vínculo a una
  versión. Un documento versionado no se duplica como soporte ni se muestran versiones
  reemplazadas como documentos vigentes. El historial y los IDs persistidos no cambian.
- Genera IDs de proyección `rund-service:documento:<uuid>` o `rund-service:soporte:<uuid>`.
  Expone propietario, IDs originales y versión real; un soporte sin versionado no recibe
  versiones inventadas. Los enlaces de contenido de versiones pertenecen al servicio RUND.
- Verifica opcionalmente el JWT firmado del usuario recibido en el cuerpo `userToken`.
  Solo GESTION_PROFESORAL/SUPER_ADMIN reciben nombres, observaciones y enlaces originales,
  siguiendo la matriz existente. El caller interno no puede elevar roles con JSON.
  Sesión ausente, inválida, vencida o firmada con otro secreto mantiene el enmascaramiento.
- Audita lecturas sensibles en **`rund."RundAccesoDatosLog"`**. Si no puede registrar el
  acceso, no devuelve documentos sensibles. La consulta no copia archivos, crea versiones
  ni modifica perfiles, soportes o validaciones.

### Consumidor en auth y compatibilidad histórica

`RundCarpetaClient` consulta la API interna sin redirects, con timeout de 15 segundos y
sin reintentos automáticos. Envía la credencial de servicio y exclusivamente el token
de sesión; no reenvía las demás cookies, objetos de usuario ni permisos declarados.
Comprueba respuesta, propietario, persona, namespace de IDs y restricción de contenido.
Un fallo/configuración incompleta/respuesta inválida no se convierte en una lista vacía
exitosa ni en datos de otro servicio.

El listado de `CarpetaDigitalService` combina los documentos genéricos de auth, los soportes
**históricos de PTA** y los del nuevo propietario cuando la conexión está habilitada.
Los namespaces evitan colisiones entre UUID iguales. Auth no eleva una proyección que RUND
ya restringió y rechaza modificaciones a IDs `rund-service:*` antes de consultar/escribir
su repositorio: indica que deben gestionarse desde RUND. Sus versiones, validación y retiro
no se delegan a los antiguos métodos de auth.

Las rutas documental y agregada del portal comunican `success:false` ante un fallo real
de listado, en vez de aparentar una carpeta vacía exitosa. No se amplió visibilidad ni se
retiraron rutas de documentos genéricos. Los originales históricos de PTA mantienen su
protección/auditoría actual; **esas lecturas SQL antiguas permanecen únicamente como
compatibilidad pendiente del cierre**, no se renombraron a `rund` dentro de auth.

### Configuración y publicación

- `RUND_CARPETA_ENABLED=false` por defecto en auth: no añade llamadas en una instalación
  existente. Se activa explícitamente con `true` cuando se publique la integración completa.
- `RUND_SERVICE_URL` apunta al servicio/puerto 3016 correcto en cada composición.
- `RUND_CARPETA_INTERNAL_TOKEN` debe tener el mismo valor en auth/RUND. Si no se define,
  admite `INTERNAL_SERVICE_TOKEN` explícito; nunca se utiliza JWT_SECRET ni variables VITE_.
- Se actualizaron los ejemplos de entorno y las seis composiciones base. Local hereda su
  base; GHCR y frontend-mfe conservan sus overlays. No se editaron `.env` reales.

Publicar primero la API RUND, después auth, terminar los adaptadores 12.2 y habilitar la
conexión con la credencial correspondiente. Mantener disponibles los servicios/archivos PTA
históricos. Este paso preparó código y configuración; **no activó ni desplegó la conexión**.

### Verificación

- **Backend RUND:** build correcto, **40 suites / 482 tests**.
- **Backend auth:** build correcto, **5 suites / 52 tests**, incluidas sus 23 pruebas previas.
  El Jest de auth de este checkout no resuelve su ts-jest instalado en RUND. Se ejecutó su
  configuración y grafo completos con el runner RUND y un transformador explícito, sin
  excluir pruebas ni desactivar diagnósticos; `scripts/jest-auth-carpeta.config.cjs` reproduce
  esa ejecución. No se declara corregido el comando Jest por defecto de auth.
- **PostgreSQL 15.14 temporal + main real de RUND:** **58 comprobaciones**, conservando las
  53 previas. Añade credencial obligatoria, versión vigente/historial intacto, protección
  frente a roles declarados, cliente compilado de auth → HTTP RUND → PostgreSQL, y fallo
  cerrado de auditoría. No arranca todo auth-service: su cliente es real; la combinación de
  repositorios auth y compatibilidad PTA se prueba con fixtures en Jest.
- **Compose:** **19 composiciones** validadas sin daemon, contenedores ni `.env` reales.
  Se compararon hashes antes/después de los módulos ajenos a auth/RUND; idénticos. Se
  verificaron activación/credenciales con valores ficticios y el fallback interno explícito.
- Sin migraciones nuevas, copia de datos reales, eliminación de archivos ni cambios en
  fuentes frontend/PTA. No se añadieron registros reales a bases existentes.

Evidencia: `docs/rund/validacion-carpeta-consulta-local.json`,
`docs/rund/validacion-carpeta-compose.json` y la actualización de
`docs/rund/validacion-servicio-postgres-local.json` (58 checks).

Comandos de comprobación, desde la raíz salvo donde se indica:

```powershell
# RUND: desde backend/rund-service
npm run build
./node_modules/.bin/jest.cmd --runInBand
# Auth: build desde backend/auth-service; pruebas desde la raíz
npm run build
./backend/rund-service/node_modules/.bin/jest.cmd --config scripts/jest-auth-carpeta.config.cjs --runInBand
# Integración local y configuración
node scripts/verify-rund-service-integration.cjs
node scripts/verify-rund-compose.cjs --carpeta
```

**Siguiente punto (paso 12.2 / sección 9.2):** conectar shell y Gestión de Personas con los
documentos persistidos, conservando registros locales existentes sin declararlos subidas
reales. Resolver identidad del usuario en el servidor, operaciones según propietario,
descargas, versiones reales y sincronización tras eliminación/reclasificación. Las interfaces
de este paso aún no cambian y la conexión permanece deshabilitada; el paso 12 completo sigue
abierto. Luego siguen reportes, PTA y Programación Académica.

## 23. Paso 12.2: interfaces con documentos persistidos y versiones RUND (2026-10-13)

Se conectaron los adaptadores activos del shell y Gestión de Personas con las APIs de
Carpeta Digital. Ambas aplicaciones utilizan `createCarpetaDigitalDocuments`, compartido
sin importar clientes del otro MFE: cada una conserva su transporte y cookies de sesión.

### Listado, identidad y subidas

- El listado se obtiene del servidor. Se resuelve primero la carpeta/persona canónica;
  auth acepta UUID de persona, usuario interno o usuario público y reutiliza la carpeta
  de esa persona. No resuelve por cédula, correo o nombre.
- Los registros locales anteriores se conservan intactos. Se proyectan con namespace
  `local-documento:*`, leyenda **pendiente de guardar**, sin original/historial simulado.
  No completan requisitos ni se mezclan con la confirmación de una subida real. La fila
  del servidor prevalece cuando tiene el mismo ID; los nombres/observaciones RUND locales
  siguen la capacidad de lectura de la sesión determinada por auth, sin alterar storage.
- Las subidas nuevas envían el archivo con FormData a auth. No escriben otro registro
  local ni almacenan URLs blob como archivos guardados. Solo confirman éxito después del
  recibo `persistido=true` del servidor; HTTP 200 con `success:false` también falla.
- El endpoint de auth limita la carga a 10 MB, resuelve la persona antes de escribir,
  usa nombre UUID y los formatos que admiten estas interfaces. Si falla guardar el registro,
  limpia exclusivamente el archivo recién creado; conserva los archivos anteriores.
- Los contadores de auth se obtienen de sus documentos persistidos y estados, no de la
  caché local. Todavía no equivalen al total agregado de todos los propietarios.

### Operaciones y versiones según propietario

Se agregó una consulta individual de documento en auth y su equivalente interno en RUND.
Cada operación vuelve a consultar metadatos autorizados; no reutiliza una URL privada de
otra sesión. RUND resuelve el ID en sus tablas, mantiene la credencial interna de 12.1 y
aplica el mismo enmascaramiento/auditoría. Las versiones reemplazadas no se presentan como
documentos vigentes al consultar ese identificador.

- **Auth:** validación/rechazo, reclasificación y retiro se confirman con su endpoint
  persistente. El validador se resuelve desde la identidad firmada, no desde un nombre/UUID
  declarado por el navegador. Los originales se descargan con el cliente autenticado.
- **RUND:** el historial se obtiene de su listado real, filtrado por documento lógico.
  Conserva IDs, números y fechas guardados. Descargar una versión usa precisamente su ID;
  no sustituye por la actual ni admite una versión de otro documento. Reemplazar/retirar
  usa los endpoints existentes del propietario RUND, con sus guards y transacciones.
- **Soportes históricos PTA:** se mantienen identificados; las operaciones que requieren
  su flujo propio no se mandan al repositorio de auth ni se convierten a otro propietario.
- **Registros locales:** no se anuncian aprobaciones, versiones o eliminaciones persistidas.
  Deben adjuntarse de nuevo para guardar sus bytes; este paso no hizo una importación automática.

Se retiraron los historiales/fechas fabricados del panel compartido. La vista carga versiones
reales y muestra errores; no inventa eventos cuando no existe historial. También se retiró
el contenido de archivos simulado en ZIP: si un original falla/está restringido, la descarga
no se presenta como un ZIP exitoso con contenido sustituto. Las descargas de enlaces del
gateway pasan por el cliente autenticado, evitando abrirlos contra el origen incorrecto.

**Límites explícitos:** auth todavía no tiene un backend de historial/restauración/etiquetas
de documentos generales. Esas operaciones y el borrado masivo devuelven un error claro y no
modifican datos. Los controles de versiones RUND sin soporte de restauración/etiquetas se
deshabilitan. Validar/reclasificar soportes RUND requiere su módulo y sus reglas de revisión;
esta vista no sustituye ese flujo por validaciones de auth. No se aplicó una limpieza de
validaciones a partir de una lista parcial ni se copiaron documentos de PTA.

### Sesión y caché

El shell conserva los sobres de respuesta solo cuando el adaptador lo solicita; los demás
clientes siguen su desenvolvimiento habitual. Las mutaciones documentales no se repiten
automáticamente ante 5xx. Cookies HttpOnly y refresh habitual se mantienen.

Carpeta Digital y sus originales se excluyen de la caché offline. Una mutación nueva sin
conexión no se confirma como encolada exitosamente. Las entradas documentales antiguas de
la cola se conservan sin reenviarlas/eliminarlas bajo otra sesión; los otros módulos mantienen
su sincronización existente. El adaptador ya no envía snapshots locales a `sync-documents`.

### Verificación

- **Personas:** **5 archivos / 63 tests**; build correcto. Los 23 casos documentales prueban
  su transporte real con cookies, subidas rechazadas, conservación local, propietarios,
  enmascaramiento y versiones. Se repitieron tras la revisión final de la proyección local.
- **Shell:** build correcto; **9 archivos / 90 tests** pasan. La suite completa todavía
  contiene la suite previa `disciplinary.service.spec.ts` que no arranca en Vitest
  (`jest is not defined`). No se excluyó ni se declaró aprobada la suite completa.
- **TypeScript:** shell **591 → 586**, Personas **194 → 192**, sin firmas nuevas de errores
  (archivo/código/mensaje). Persisten los diagnósticos heredados; no se relajaron checks.
- **Backend:** builds correctos; RUND **40 suites / 484 tests**, auth **6 suites / 59 tests**
  con el runner/config explícito documentado en 12.1. Las pruebas de auth incluyen HTTP
  multipart y bytes reales temporales, identidad canónica y rollback que conserva un archivo
  anterior. Los repositorios de ese fixture son dobles; no es un arranque completo de auth.
- **PostgreSQL temporal / main real RUND:** **59 checks**, conservando los 58 anteriores y
  añadiendo consulta por ID vigente, credencial obligatoria y enmascaramiento.
- **Navegador:** shell y remote compilados reales en Chrome, perfil nuevo y APIs ficticias:
  **6 checks**, incluidos los cinco flujos anteriores de roles y la carpeta que muestra un
  documento del servidor junto a un local pendiente, preservando su storage anterior.

Evidencia: `docs/rund/validacion-carpeta-interfaces-local.json`,
`docs/rund/validacion-carpeta-interfaz-navegador-local.json` y el reporte PostgreSQL actualizado.
El navegador se reproduce con `node scripts/verify-rund-personas-browser.cjs --documents`.

No se aplicaron migraciones en bases existentes, ni se hicieron despliegues, sincronizaciones
con datos reales o cambios en `.env` reales. `RUND_CARPETA_ENABLED` sigue deshabilitado por defecto.
**No publicar/habilitar la integración completa hasta cerrar el siguiente punto:** los
estados documentales generales necesitan convergencia entre propietarios, no snapshots
del navegador. Las fuentes de los planes PTA y su implementación original se conservan.

**Siguiente punto (paso 12.3 / sección 9.2):** persistir historial/restauración de documentos
generales de auth y completar la sincronización de estados desde documentos autoritativos,
incluyendo eliminación/reclasificación, contadores entre propietarios y el panel RUND inline
que aún usa rutas históricas PTA. Solo entonces cerrar el paso 12 y preparar su activación.

## 24. Paso 12.3a: historial persistido de documentos generales Auth (2026-10-13)

Se dividió 12.3 para completar primero el historial general sin modificar las reglas de
validación ni los datos del propietario RUND/PTA. **12.3a queda implementado y validado en
local; 12.3 y el paso 12 completo siguen abiertos.** La sincronización de estados,
contadores agregados y panel inline se mantienen pendientes para 12.3b.

### Persistencia y alcance

- Nueva migración `db/migrations/667_auth_carpeta_documento_versiones.sql`: tabla propia
  `auth.documento_carpeta_version`, FK al documento Auth, unicidad de número por documento,
  checksum SHA-256, fecha, actor firmado y referencia a la versión restaurada. Es repetible,
  no copia registros ni modifica tablas de PTA/RUND. **No se aplicó en bases existentes.**
- `CARPETA_DOCUMENT_VERSIONING_ENABLED=false` por defecto en ejemplos y las seis bases
  Compose; local y overlays heredan esa configuración. No se editaron `.env` reales ni se
  habilitaron servicios. Aplicar 667 antes de activar el historial en una futura entrega.
  Esta bandera no habilita `RUND_CARPETA_ENABLED`, que sigue deshabilitada por defecto.
- Solo versiona documentos generales propios de Auth con originales locales de nombre UUID
  bajo `/auth/api/v1/uploads/carpeta-digital/<persona-uuid>/<archivo-uuid>.<ext>`.
  No convierte soportes enlazados RUND, copias categorizadas RUND, URLs PTA/remotas ni
  registros locales del navegador. Los originales históricos con otra estructura requieren
  resolver su almacenamiento antes de habilitar versiones; no se renombraron ni importaron.
- El original existente se registra como primera versión al consultar explícitamente su
  historial, bajo bloqueo y leyendo sus bytes reales. Conserva su fecha guardada y deja
  el actor histórico en null cuando no existe; no inventa autor ni eventos anteriores.
  Una carpeta/listado ordinario no crea historial ni consulta la tabla nueva con la bandera
  apagada. Los metadatos anuncian disponibilidad; el número se obtiene del historial real.

### API, archivos y concurrencia

Los endpoints nuevos permanecen autenticados por el guard JWT de Auth, sin decorator público
ni bypass interno. El navegador no determina el actor:

```text
GET  /auth/api/v1/carpeta-digital/documentos/:id/versiones
GET  /auth/api/v1/carpeta-digital/documentos/:id/versiones/:versionId/contenido
POST /auth/api/v1/carpeta-digital/documentos/:id/versiones
POST /auth/api/v1/carpeta-digital/documentos/:id/versiones/:versionId/restaurar
```

- Reemplazar y restaurar requieren `version_actual` como precondición. Una transacción
  bloquea el documento; dos sesiones con igual versión producen un éxito y un conflicto
  409. El documento conserva su UUID y carpeta; historial y original actual se guardan
  juntos. Reclasificar, validar y retirar usan el mismo bloqueo cuando la bandera está
  habilitada, evitando guardar sobre una URL antigua durante un reemplazo.
- Restaurar agrega una versión con una copia nueva de los bytes elegidos; conserva la
  actual y todas las intermedias. Reemplazar/restaurar deja el documento **pendiente** y
  limpia validador/fecha previos. Esto no hereda una aprobación a contenido nuevo.
- Cada descarga/restauración verifica pertenencia al documento y checksum del original.
  Una versión ajena, archivo alterado, versión actual ya elegida o precondición obsoleta
  falla sin usar otra versión como sustituto. La descarga responde `private, no-store`.
- Almacenamiento UUID con apertura exclusiva `wx`, máximo 10 MB, formatos admitidos,
  identidad canónica y comprobación `realpath`. Directorios enlazados fuera de uploads se
  rechazan antes de escribir. Una escritura parcial o error de persistencia limpia solo
  el archivo nuevo; una colisión conserva el archivo que ya existía.
- No se admite convertir un documento con historial general a categoría RUND: eso exige
  el flujo del propietario, para no introducir originales anteriores fuera de su protección.
  Retirar un documento conserva archivos y elimina únicamente sus filas de historial mediante
  la FK existente; no borra archivos ni documentos ajenos.
- Etiquetas, eliminación individual de versiones y borrado masivo siguen sin habilitarse;
  sus controles no anuncian operaciones simuladas. La convergencia de validaciones entre
  propietarios y la protección de revisión frente a una versión vista anteriormente son
  parte del siguiente punto, no se declaran resueltas por este historial.

### Interfaces

El adaptador compartido utiliza las rutas Auth solo para su propietario y conserva las
rutas/documentos lógicos del historial RUND de 12.2. Valida el recibo persistido, documento,
número de versión y estado pendiente, sin reintentar automáticamente las mutaciones.

El shell y Personas muestran las versiones devueltas. El panel activo permite adjuntar
una nueva versión y confirmar la restauración cuando el servidor anuncia esa capacidad;
espera al servidor antes de refrescar. Fallos mantienen el archivo seleccionado y muestran
el error. Las versiones que no tienen estas capacidades conservan controles deshabilitados.
Se eliminó el fallback visual `v1` cuando el servidor no informa número, y la promesa de una
retención automática de 90 días que no tenía implementación. El modal anterior también
muestra el error de historial sin fabricar una versión inicial.

Los registros locales previos se mantienen pendientes y el adaptador sigue sin enviar
snapshots del navegador a `sync-documents`. Los planes PTA y el módulo original siguen
disponibles; no se modificaron sus fuentes ni se copiaron sus registros.

### Verificación

- **Auth:** build correcto y **7 suites / 62 tests**, con el runner/config explícito de 12.1.
  Incluye nuevos casos de escritura parcial, colisión y rutas inválidas, con archivos
  temporales reales. El comando Jest por defecto de Auth conserva la limitación anterior.
- **Personas:** build correcto; **5 archivos / 72 tests**. Incluye los 30 contratos documentales
  y cuatro pruebas del panel de historial, confirmación y error de subida.
- **Shell:** build correcto; **9 archivos / 97 tests** pasan. La suite completa sigue fallando
  al iniciar `disciplinary.service.spec.ts` por `jest is not defined`; no se excluyó esa suite.
- **TypeScript:** shell **586 → 586**, Personas **192 → 192**, sin firmas nuevas de errores.
  Siguen los diagnósticos heredados; se comparan firmas
  archivo/código/mensaje con 12.2, sin relajar checks. El reporte de este paso registra el
  resultado final y mantiene separada esa limitación de las compilaciones Vite exitosas.
- **PostgreSQL temporal:** **77 checks**, los 59 previos del main real de RUND y **18 nuevos**
  para Auth. Los nuevos ejecutan migraciones 309/339/667, servicio y repositorios Auth reales
  en otra base del mismo cluster, y un Nest de prueba con controller/guard/strategy JWT
  compilados reales. Prueban HTTP multipart, concurrencia, restauración, rollback, checksum,
  propietarios, enlaces de filesystem y retiro aislado. No arranca todo `Auth AppModule`.
- **Compose:** **19 composiciones**, sin daemon/contenedores ni archivos `.env` reales;
  hashes antes/después de módulos ajenos a Auth/RUND iguales. Se comprobaron ambas banderas
  apagadas por defecto y el override del historial con datos ficticios.
- **Navegador:** **7 checks** en Chrome con shell y remote reales compilados, perfil nuevo
  y APIs ficticias. Incluye los seis anteriores y la restauración seleccionada que recarga
  la versión vigente, sin modificar el storage local anterior. Los bytes y la base real
  se verifican en PostgreSQL; el navegador no contacta APIs reales.

Evidencia: `validacion-historial-auth-local.json`,
`validacion-historial-auth-postgres-local.json`, `validacion-historial-auth-navegador-local.json`
y los reportes actualizados `validacion-servicio-postgres-local.json` / `validacion-carpeta-compose.json`,
todos en `docs/rund`. Se reproducen con los comandos de 12.1 y
`node scripts/verify-rund-personas-browser.cjs --versions` tras compilar las interfaces.

**Siguiente punto: 12.3b.** Completar estados autoritativos y su sincronización entre
propietarios ante eliminación/reclasificación/reemplazo, revisar la aprobación contra la
versión realmente vista, agregar contadores de todos los propietarios y conectar el panel
inline según propietario sin romper soportes históricos PTA. Mantener la integración
completa deshabilitada hasta cerrar esas comprobaciones. Después siguen reportes,
consumidores PTA y Programación Académica; la independencia total aún no está terminada.

## 25. Paso 12.3b.1: decisiones sobre la revisión vista y transiciones Auth (2026-10-13)

Se corrigió el primer prerrequisito de la convergencia documental: una aprobación general
no puede trasladarse silenciosamente a un archivo o clasificación que cambió. **Este punto
queda implementado y validado en local; 12.3b y el paso 12 completo siguen abiertos.** No se
han conectado snapshots del navegador ni activado sincronizaciones con datos existentes.

### Revisión y operación atómica

- Auth genera `revision_documento` desde su registro persistido (identidad/carpeta, original,
  clasificación, estado, comentarios, validador, fechas y actualización). Es una precondición
  opaca SHA-256; no es permiso, identidad ni un número de versión inventado. No requiere
  nueva columna o migración. Consultar historial sin reemplazar bytes no cambia esa revisión.
- Los DTO propios incluyen la revisión. Las secciones activas del shell y Personas la
  conservan al mostrar el documento, abrir el modal y ejecutar sus hooks. Aprobar/rechazar,
  reclasificar, retirar y descargar con una revisión vista no la sustituyen por otra obtenida
  automáticamente al hacer clic. Los actores de las decisiones siguen siendo los de la sesión.
- El adaptador vuelve a comprobar metadatos autorizados. Si difieren de la revisión mostrada,
  rechaza antes de mutar/descargar. Auth vuelve a comparar la precondición dentro de una
  transacción con bloqueo de la misma fila que usa el reemplazo/restauración de 12.3a.
  Se evita así la carrera entre la consulta del navegador y la decisión en el servidor.
- Aprobar/rechazar y reclasificar envían `revision_documento` en JSON; retirar lo envía como
  query param al DELETE. Una revisión ausente cuando es obligatoria, malformada, ajena o antigua
  devuelve 409 sin guardar/borrar. Dos decisiones sobre un documento pendiente con la misma
  revisión producen una decisión persistida y un conflicto, no dos aprobaciones contradictorias.
- Una revisión general anterior tampoco sirve si otra sesión pasó el documento al flujo
  RUND. No se fabrican revisiones para soportes de RUND/PTA ni se reemplaza su revisión nativa
  `documentoVersionId`. Los namespaces RUND siguen fuera de las mutaciones de Auth.

### Clasificación y estados persistidos

Cambiar realmente el tipo o la categoría de un documento general lo deja **pendiente** y
limpia `validado_por` / `fecha_validacion`; conserva UUID, carpeta, original, historial y
comentarios. La aprobación anterior no cubre un requisito diferente. Volver a seleccionar
el mismo tipo/categoría es un no-op: conserva aprobación y revisión y no reescribe la fila.

La reclasificación exige un tipo activo general o propio de esa carpeta. Un tipo individual
de otra persona o inactivo no modifica el documento. Las copias históricas RUND conservan
su tratamiento anterior; la integración con su propietario sigue pendiente y no se deduce
a partir de categorías generales.

Los contadores propios de Auth continúan obteniéndose de estados persistidos. En PostgreSQL
se verificó que una reclasificación mueve un documento aprobado a pendiente sin crear/eliminar
documentos ni versiones. Esto **no es todavía el contador agregado Auth/PTA/RUND**.

### Interfaz y compatibilidad

Se corrigió la segunda búsqueda por nombre del checklist en ambas secciones: un registro
local pendiente sin tipo asignado ya no satisface un requisito por coincidencia de nombre.
El storage anterior se conserva. Las pruebas incluyen esta coincidencia con un archivo local
que todavía no está guardado, además del paso de la revisión por los callbacks reales.

Chrome detectó que Personas desmontaba su `Toaster` al entrar en Carpeta Digital. La petición
recibía 409, pero la vista no mostraba el aviso. Esa rama ahora mantiene el mismo componente
de avisos usado por el módulo; la prueba confirma el mensaje y ausencia de aprobación exitosa.
Las peticiones documentales siguen sin reintentos automáticos ni snapshots a `sync-documents`.

La revisión es obligatoria para documentos generales cuando
`CARPETA_DOCUMENT_VERSIONING_ENABLED=true`; Auth lo anuncia mediante
`requiere_revision_documento`. Con el historial apagado, los clientes previos sin revisión
conservan su contrato. Una revisión que sí se envía sigue siendo vinculante incluso con
la bandera apagada; las interfaces actualizadas envían la que recibieron en el listado.
Los consumidores antiguos que llamen solo por ID no ofrecen la misma protección de revisión
vista hasta migrarse: no se declara corregida la totalidad de interfaces históricas.

No se modificaron fuentes PTA, guards del gateway, configuración Compose, `.env` reales,
tablas de bases existentes ni asignaciones de roles. Ambas banderas siguen deshabilitadas
por defecto y no se hicieron despliegues.

### Verificación

- **Auth:** build correcto, **8 suites / 73 tests**, con el runner explícito de 12.1. Conserva
  las 62 pruebas de 12.3a y añade 11 casos de revisión, estados, tipo ajeno/no-op, compatibilidad
  y cambio al flujo RUND. El Jest por defecto mantiene su limitación previa de resolución.
- **Personas:** build correcto, **6 archivos / 81 tests**. Incluye los 36 contratos del adaptador,
  tres pruebas de la sección real y los casos previos de usuarios/roles/historial.
- **Shell:** build correcto, **10 archivos / 106 tests** pasan; la suite completa conserva
  el fallo heredado `disciplinary.service.spec.ts` (`jest is not defined`). No se excluyó.
- **TypeScript:** shell **586 → 586**, Personas **192 → 192**, sin nuevas firmas de diagnósticos;
  ambas verificaciones completas siguen fallando por esos errores previos.
- **PostgreSQL temporal:** **88 checks**: los 59 previos del main real de RUND, los 18 del
  historial Auth y **11 nuevos de estados**. Auth usa controller/guard/strategy/servicios y
  repositorios compilados reales en Nest de prueba, no todo su AppModule. Se probaron HTTP
  real, aprobación vigente/antigua, cambio de tipo, no-op, dos decisiones simultáneas, fallo
  de persistencia con rollback, tipos ajenos/inactivos y compatibilidad al apagar el historial.
  El estado cambió solo en la base ficticia del cluster temporal, eliminado al finalizar.
- **Navegador:** **8 checks** en Chrome con shell y remote compilados, perfil nuevo y APIs
  interceptadas. Mantiene los siete anteriores y añade la decisión de la revisión vista:
  el 409 se muestra, no se repite la petición y no se anuncia aprobación. No hay tráfico API
  real ni errores JavaScript; los bytes y SQL reales se verifican en el fixture PostgreSQL.

Evidencia en `docs/rund`: `validacion-estados-auth-local.json`,
`validacion-estados-auth-postgres-local.json`, `validacion-estados-auth-navegador-local.json`
y los reportes PostgreSQL/historial actualizados. Se reproduce con los comandos backend y
frontend de 12.1/12.3a y `node scripts/verify-rund-personas-browser.cjs --states` tras compilar.

**Siguiente punto: 12.3b.2, sincronización autoritativa Auth → RUND.** El endpoint del servicio
propio `rund/docente/:id/sync-documents` todavía acepta `body.documentos` y mapea categorías
generales a bloques; los adaptadores activos ya no lo llaman. Sustituir esa fuente por un
contrato interno completo y autenticado del propietario, con identificación de origen,
control de orden/concurrencia, transacciones y recuperación de fallos. Un retiro/reclasificación
no debe borrar decisiones o evidencias nativas RUND/PTA ajenas. No habilitar esa convergencia
a partir de un listado parcial ni de una consulta fallida. Después quedan contadores agregados
y el panel inline según propietario, antes de cerrar 12 y preparar la activación.

## 26. Paso 12.3b.2: sincronización autoritativa de estados Auth → RUND (2026-10-13)

**12.3b.2 implementado y validado en local. La integración permanece apagada por defecto;
12.3b y el paso 12 completo siguen abiertos.** No se desplegó, no se aplicaron migraciones
en bases existentes y no se modificaron `.env` reales, interfaces ni el RUND original de PTA.

### Propietario y contrato completo

Auth expone `GET /internal/carpeta-digital/personas/:personaId/estado-rund`, protegido siempre
por `x-rund-carpeta-sync-token`. La anotación `Public` solo evita pedir un JWT de usuario:
el guard interno exige `RUND_CARPETA_SYNC_TOKEN` o `INTERNAL_SERVICE_TOKEN` explícito, compara
digestos en tiempo constante y devuelve 503 si falta configuración / 401 si no coincide.
Ni `JWT_SECRET`, ni roles enviados por el navegador sirven como credencial interna.

La respuesta declara esquema 1, propietario Auth, alcance `documentos-generales`, UUID de
persona, revisión decimal bigint, `complete`, `deleted`, total, documentos ordenados y
fingerprint SHA-256. Incluye únicamente UUID/revisión opaca del documento, tipo/categoría,
estado y fechas. No devuelve nombres, originales/URLs, comentarios ni identidades de
validadores. Excluye soportes enlazados, categoría RUND y rutas originales PTA/RUND.

Persona ausente sin registro de baja devuelve **404**, nunca un éxito vacío. Una persona
existente sin documentos o una baja registrada sí entrega un vacío completo explícito.
Las consultas de persona, contador y documentos comparten una transacción `REPEATABLE READ`.
Más de 5000 documentos devuelve 503: no se convierte una página truncada en estado completo.

`db/migrations/668_auth_carpeta_revision_rund.sql` añade un contador por persona y triggers
de documentos, cambio de dueño/baja de carpeta e inserción/baja de persona. Las mutaciones
directas y las del historial avanzan la revisión en la misma transacción del documento.
`updated_at` también cuenta porque forma parte de `revision_documento`; la reclasificación
sin cambios de 12.3b.1 sigue sin guardar la fila. El contador no tiene FK a personas, conserva
la baja y avanza si se recrea el UUID. Es repetible, no rellena documentos y no reinicia
contadores existentes. Un estado previo a la migración empieza en revisión 0.

### Proyección y conservación de decisiones nativas

La migración RUND `007_rund_carpeta_auth_proyeccion.sql` crea tres tablas propias:
`carpeta_auth_sync`, `carpeta_auth_documento` y `carpeta_auth_sync_evento`. El esquema nuevo
tiene ahora **27 tablas**. Los estados Auth se identifican por persona y UUID documental,
en una proyección separada; varios perfiles/periodos de una persona comparten esa fuente.

El consumidor consulta `AUTH_SERVICE_URL` interno, sin reenviar JWT, cookies o roles del
usuario. Valida el contrato completo, origen, persona, tipos, estados, fechas, IDs únicos
y ordenados, total y fingerprint antes de escribir. Usa timeout de 15 segundos, rechaza
redirecciones y limita también respuestas chunked a 8 MiB. No realiza reintentos HTTP en
la petición manual ni utiliza un listado del navegador como alternativa.

Un bloqueo advisory PostgreSQL por persona se adquiere **antes** de consultar Auth.
Una revisión anterior, o la misma revisión con distinto fingerprint, produce conflicto
y conserva el estado persistido. Una revisión repetida es idempotente. Una revisión nueva
aplica altas/cambios/retiros, evento y checkpoint en una sola transacción: un fallo al
registrar el evento revierte también documentos y checkpoint. Los retiros se limitan
exclusivamente a las filas de la proyección Auth de esa persona.

No se actualizan `validacion_documental`, `RundCampoEstado`, `RundSoporteCampo`, originales,
historial ni decisiones PTA/RUND por coincidencia de categoría o UUID. Tampoco se convierten
las aprobaciones generales en aprobaciones automáticas de bloques. El GET documental
conserva validaciones/completitud nativas y añade `carpetaAuth` solo con la bandera activa;
esa sección declara revisión, última sincronización, error operativo y propietario.
Estado y documentos de la proyección se leen en una misma instantánea consistente.

### Endpoint manual y recuperación

En el servicio propio, `POST rund/docente/:id/sync-documents` y su alias aceptan únicamente
un objeto vacío y consultan al propietario. Un `body.documentos`, incluso vacío, o roles/
actores/otros campos recibidos se rechazan con 409 sin mutar. Exige JWT y permisos efectivos
`banco-docentes.rund.manage` o `banco-docentes.rund.documents.manage` (o SUPER_ADMIN).
Usa el ID exacto del banco; un UUID de persona no elige arbitrariamente uno de sus periodos.
Los adaptadores activos ya dejaron de llamar al contrato anterior en 12.2. El endpoint
original de PTA y sus consumidores históricos se conservan.

El worker consulta personas del banco propio en lotes de hasta 25, empezando por las nunca
intentadas y luego por el intento más antiguo. Arranca y repite cada 60 segundos únicamente
con `RUND_CARPETA_SYNC_ENABLED=true`, evita solapamientos locales, continúa con las personas
siguientes si una falla y comparte el bloqueo con los pulls manuales. Al apagar el proceso
detiene el intervalo y espera su trabajo en curso antes del cierre de conexiones.

Los fallos conservan datos/checkpoint y registran un código operativo sin contenido privado.
Un error anterior que se registra tarde no sobrescribe el estado de un intento posterior
exitoso: las marcas de intento provienen del reloj PostgreSQL y se comparan al guardar.
Una siguiente ronda recupera el estado sin repetir eventos de la revisión aplicada.
La convergencia es periódica, no inmediata; su demora depende de población, lotes y salud
de Auth. No se ha implementado ni se anuncia un outbox/ACK en este punto.

### Configuración y verificación

Auth y RUND requieren migraciones 668 / 007 antes de activar conjuntamente la bandera y
configurar una credencial interna compartida. `AUTH_SERVICE_URL` apunta al servicio Auth
directo, sin prefijo agregado por el gateway (en Compose, `http://auth-service:3001` y los
nombres propios de cada ambiente). Los ejemplos y las seis bases Compose incluyen
`RUND_CARPETA_SYNC_ENABLED=false` y la credencial vacía con fallback interno explícito.
Al apagar la bandera, el worker y endpoint de snapshot no consultan las tablas nuevas;
los documentos y eventos ya persistidos se conservan. No reiniciar ni borrar contadores
para resolver conflictos de revisión: investigar/restaurar coherentemente ambos estados.

- **Builds:** Auth y RUND correctos.
- **Auth:** 9 suites / **80 tests**, conservando las 73 pruebas anteriores.
- **RUND:** 41 suites / **509 tests**, incluyendo rechazo de snapshots del cliente, selección
  exacta de perfil, validación del contrato y ausencia de actividad con la bandera apagada.
- **PostgreSQL 15.14 temporal:** **105 checks**: los 88 anteriores (con el contrato inseguro
  de sync-documents sustituido), la migración 007 y **16 nuevos de sincronización**. Auth
  usa controller/guard/strategy/servicios/repositorios compilados; el consumidor/controller/
  guards RUND son reales dentro de Nest de prueba. El main completo RUND también conserva
  sus verificaciones anteriores; los fixtures nuevos no arrancan todo AppModule Auth.
- HTTP real verifica credenciales, JWT/permisos, perfiles por periodo, reemplazo de archivo,
  reclasificación/retiro, cambio de dueño de carpeta, fuentes excluidas, pulls simultáneos,
  idempotencia, revisión vieja/inconsistente, snapshot parcial, 401, timeout, error tardío,
  fallo de auditoría/rollback, recuperación por worker, límite de 5001 documentos y bajas/
  recreación. Un original ficticio PTA y un soporte nativo RUND comparten UUID con un
  documento Auth: sus filas permanecen intactas, al igual que las tablas nativas comparadas.
- **Compose:** 19 composiciones válidas; hashes de servicios ajenos a Auth/RUND idénticos
  antes/después; flags apagadas y credenciales/configuración explícitas verificadas.
- `git diff --check` correcto. No se cambiaron interfaces, por lo que no se repitieron sus
  builds/pruebas; las limitaciones frontend previas de la sección 25 siguen pendientes.

Evidencia: `validacion-sincronizacion-auth-postgres-local.json`,
`validacion-sincronizacion-auth-local.json`, `validacion-servicio-postgres-local.json` y
`validacion-carpeta-compose.json` en `docs/rund`. Comandos desde la raíz, tras compilar ambos
backends: `node scripts/verify-rund-service-integration.cjs`, el runner Auth de la sección 25
y Jest completo de RUND. El verificador crea datos/archivos ficticios, escucha solo en
loopback y elimina su cluster al finalizar; no acepta conexiones a una base existente.

**Siguiente punto: 12.3b.3, contadores agregados de Carpeta Digital según propietario.**
Revisar los contadores/totales Auth, PTA y RUND para que coincidan con los documentos
persistidos y visibles, sin deduplicar fuentes por nombres/categorías ni convertir fallos
del propietario en conteos vacíos exitosos. Después queda migrar el panel inline que aún
usa rutas PTA y validar las vistas antes de preparar la activación del paso 12. La
proyección Auth añadida aquí no reemplaza los contadores nativos ni cierra el aislamiento
completo de base de datos: las dependencias anteriores enumeradas en 9.2 siguen vigentes.

## 27. Paso 12.3b.3: contadores de archivos persistidos según propietario (2026-10-13)

**Implementado y validado localmente. El paso 12 sigue abierto y la integración continúa
apagada por defecto.** Este punto corrige los totales de carpetas y los contadores de
archivos de las vistas. No modifica aprobaciones, archivos, historial, tablas de bases
existentes, `.env` reales, configuraciones Compose ni el módulo original de PTA.

### Conteo agregado y alcance explícito

Con `RUND_CARPETA_ENABLED=true`, el listado global de carpetas y el GET de una carpeta
calculan totales y estados desde las mismas fuentes que su listado documental:

- **Auth:** registros persistidos de `documento_carpeta_digital`, con su estado guardado.
- **PTA histórico:** soportes persistidos con nombre de archivo o ruta, excluyendo únicamente
  aquellos ya enlazados explícitamente desde un registro Auth mediante `rund_soporte_id`,
  tal como hace el listado. Se conserva esa política previa de copias históricas: no se
  convierte su estado en una aprobación nativa ni se migran originales.
- **RUND:** versión ACTIVA de cada documento y soportes sin versionado que tengan archivo.
  Una versión reemplazada y los soportes asociados a documentos versionados no añaden
  otro archivo. Si varias referencias apuntan al mismo documento vigente, una selección
  lateral determinista elige su estado tanto en listado como en conteo y evita duplicarlo.

UUID o nombres iguales en propietarios distintos no eliminan registros entre fuentes.
Los soportes sin nombre/ruta no se convierten en archivos subidos. Los estados se normalizan
igual que en los listados, incluyendo `vencido`; no se inventa una aprobación por categoría,
fecha de vencimiento, nombre o existencia de un requisito.

Los DTO añaden `alcance_conteo`, `conteo_completo`, `propietarios_incluidos` y el desglose
`estadisticas_por_propietario`. Con la bandera apagada conservan sus conteos propios de
Auth, ahora identificados expresamente con alcance `auth`; **no se anuncian como agregados
PTA/RUND**. El checklist backend también devuelve conteos propios reales en su carpeta,
en vez de ceros iniciales. Su adaptador conserva los metadatos de la carpeta consultada.

La resolución interna de identidad/carpeta usada por una subida sigue siendo propia de
Auth. El controller del GET solicita agregación explícitamente; el método que usa upload
no depende del estado o disponibilidad de los otros propietarios. La prueba HTTP confirma
que se puede guardar un archivo Auth aun si la consulta documental PTA falla.

### Consulta por lotes y fallos

RUND expone `POST /internal/carpeta-digital/estadisticas`, bajo el mismo guard interno y
contrato de sesión de la consulta documental. Admite entre 1 y 200 UUID únicos, devuelve
`propietario: rund`, `complete: true` y una fila por cada persona solicitada, incluso con
cero documentos. Solo devuelve conteos, sin nombres, originales, rutas o revisiones privadas.
El actor se obtiene del JWT firmado; roles enviados en JSON no conceden visibilidad. La
lectura registra su auditoría y no anuncia éxito si no puede guardarla.

Auth consulta documentos propios y soportes históricos en una transacción `REPEATABLE READ`
y consume las estadísticas RUND en lotes de hasta 200 personas. Evita un HTTP por carpeta.
La sesión se transmite en el cuerpo del POST interno, no en URL/query ni cookies extra.
El cliente exige todas las personas, sin duplicados, estados enteros no negativos y suma
de estados igual al total; rechaza respuestas incompletas, de otro propietario o con errores.
Un fallo en un lote posterior no devuelve el primero como un resultado completo.

Con la integración activa, fallos de PTA/RUND o de auditoría devuelven un error explícito;
no se sustituyen por un listado parcial o un cero exitoso. Sin integración se conserva
la compatibilidad histórica previa. Las fuentes se consultan en momentos distintos:
no existe una transacción distribuida Auth/PTA/RUND y un cambio concurrente puede verse
en la siguiente consulta. El estado de la proyección periódica Auth → RUND de 12.3b.2
no se usa como alternativa a la lectura del propietario para estos totales.

### Archivos y requisitos en las vistas

Shell y Personas usan un contador compartido sobre el listado confirmado de documentos.
Identifica por propietario + ID, excluye repeticiones de esa identidad y borradores locales
pendientes de guardar. No cuenta como archivos los renglones del panel inline de requisitos.
Conserva los borradores y sus avisos; no borra ni importa storage local.

Las tarjetas **GUARDADOS / VALIDADOS / PENDIENTES / RECHAZADOS / VENCIDOS** muestran estados
de archivos persistidos, incluso cuando existen requisitos en el checklist. Ya no mezclan
un total de archivos con cantidades de tipos requeridos. El progreso de requisitos conserva
su sección propia; no cambia las aprobaciones de bloques. VENCIDOS tiene su filtro específico.
El panel inline sigue usando su flujo PTA anterior y se migra en el siguiente punto; este
paso no lo declara conectado al propietario nuevo.

### Validación y límites

- **Builds:** Auth, RUND, shell y Personas correctos.
- **Auth:** 10 suites / **92 tests**. Incluye respuesta completa vacía, sesión solo en cuerpo,
  errores de contrato/sumas, fallo de segundo lote y resolución de subida independiente.
- **RUND:** 41 suites / **509 tests** pasan. Se ajustó el fixture que identificaba una consulta
  de documentos por la aparición de su tabla de soportes: ahora distingue la subconsulta
  lateral de la consulta de soportes sin versionado. No se cambió una expectativa funcional.
- **Personas:** 7 archivos / **83 tests**, incluidos dos casos del contador/vista real.
- **Shell:** 11 archivos / **108 tests** pasan; la suite completa conserva el fallo previo de
  `disciplinary.service.spec.ts` (`jest is not defined`). Se ejecuta con su Vitest local
  2.1.9; el runner raíz 0.34.6 no corresponde a los imports de este proyecto.
- **TypeScript completo:** shell **586 → 586**, Personas **192 → 192**, sin nuevas firmas
  de error tras normalizar rutas y posiciones. Ambas verificaciones siguen fallando por
  esos diagnósticos previos; no se relajaron opciones ni se excluyeron archivos.
- **PostgreSQL 15.14 temporal:** **112 checks**, los 105 anteriores más **7 de contadores**.
  Comparan global/carpeta/listado por estado, UUID/nombres entre propietarios, copias
  explícitas, soportes sin archivo, referencias de versión repetidas, cambios/retiro Auth,
  credenciales/lotes inválidos, fallo PTA con upload Auth correcto, fallo de auditoría RUND
  y bandera apagada sin tráfico remoto. Las filas originales comparadas permanecen intactas.
- **Chrome:** **9 checks** con shell y remote compilados, APIs interceptadas y contexto nuevo.
  Un archivo guardado pendiente más un borrador local anteriormente validado dan GUARDADOS=1,
  PENDIENTES=1 y VALIDADOS=0. Se conservan los casos previos de roles, historial y revisión
  vista, sin tráfico API real ni errores JavaScript.
- `git diff --check` correcto. No se cambiaron dependencias ni Compose; su configuración
  validada en 12.3b.2 permanece igual y no se repitió esa comprobación.

El fixture de contadores usa el main real RUND, cliente/servicios/controller Auth compilados
y PostgreSQL temporal. Amplía solo esa base ficticia con las dos referencias opcionales
de catálogo `Person.id_dependencia/id_cargo`, ausentes del dump Auth de enero, y tablas
mínimas PTA para sus originales/auditoría. No es una prueba de todo AppModule Auth ni una
verificación de esas columnas en un ambiente existente. El cluster se eliminó al terminar.

Evidencias en `docs/rund`: `validacion-contadores-carpeta-local.json`,
`validacion-contadores-carpeta-postgres-local.json`, `validacion-contadores-carpeta-navegador-local.json`
y `validacion-servicio-postgres-local.json` actualizado. Para reproducir, compilar ambos
backends, ejecutar `node scripts/verify-rund-service-integration.cjs`, compilar shell/Personas
y ejecutar `node scripts/verify-rund-personas-browser.cjs --counts`; los tests de vistas
corren con el Vitest de cada proyecto y Auth con el runner explícito de las secciones previas.

**Siguiente punto: 12.3b.4, panel inline de RUND según propietario.** Revisar su resolución
de perfiles/periodos, soportes y acciones que todavía usan PTA, conservar fuentes históricas
y evitar duplicar el listado confirmado de documentos. Después corresponde validar vistas
y preparar la activación del paso 12. No retirar el RUND original de PTA ni sus accesos
históricos; las dependencias restantes de 9.2 siguen pendientes.

## 28. Paso 12.3b.4: panel RUND por propietario y periodo (2026-10-13)

**Implementado y validado localmente. El paso 12 sigue abierto y las banderas continúan
apagadas por defecto.** El panel de requisitos y cargas de Carpeta Digital, tanto en shell
como en Gestión de Personas, deja de resolver automáticamente una tarjeta del banco PTA
por persona. Conserva los archivos históricos y dirige cada carga al perfil seleccionado.
No se aplicaron migraciones ni se usaron bases existentes; tampoco se editaron `.env`
reales o Compose. El módulo original de PTA permanece intacto.

### Catálogo de perfiles sin aprovisionamiento

Auth expone `GET /carpeta-digital/persona/:personaId/perfiles-rund`, bajo la autenticación
existente y con la resolución canónica de persona/carpeta. Consulta los perfiles históricos
PTA y, únicamente cuando `RUND_CARPETA_ENABLED=true`, los perfiles propios mediante
`POST /internal/carpeta-digital/personas/:personaId/perfiles` de RUND. Este último conserva
el guard interno, la credencial y el actor extraído de la sesión firmada. El catálogo se
audita; no incluye originales ni cambia la política de acceso a contenido restringido.

Las consultas leen los perfiles existentes y sus periodos sin llamar a las operaciones
de tarjeta/bloques que aprovisionan docentes o crean bloques ausentes. La resolución de
carpeta Auth conserva su comportamiento previo. El límite de 200 perfiles por propietario
produce error explícito al excederse; no devuelve una página parcial como catálogo completo.
Los clientes rechazan respuestas incompletas, perfiles ajenos, propietarios inválidos,
claves repetidas y errores del propietario. Una caída RUND no selecciona PTA como alternativa.

La selección identifica **propietario + ID de perfil**. UUID iguales entre RUND y PTA son
perfiles distintos. Solo se elige automáticamente cuando existe exactamente un perfil del
propietario predeterminado por la bandera. Con varios periodos se exige selección explícita;
un catálogo RUND vacío no elige el histórico PTA. Este último sigue disponible por decisión
explícita del usuario. El selector se muestra también en la vista de listado y sin archivos.

### Archivos confirmados y cargas versionadas

El listado documental añade asociación explícita al perfil, propietario y periodo. Las
copias Auth enlazadas a soportes PTA conservan Auth como propietario de almacenamiento;
la asociación no les concede permiso para reemplazar originales PTA. El ID de asociación
permite mostrar requisitos por perfil, sin revelar contenido, identidad o salarios ocultos.

El panel usa únicamente los documentos que ya devuelve el listado persistido: no agrega
copias desde la tarjeta/bloques ni inventa archivos, fechas, URLs o versiones. Los requisitos
usan los archivos del perfil seleccionado; el listado general conserva los de otros perfiles.
Los contadores de archivos siguen separados de los requisitos, como en 12.3b.3.

Las cargas usan las APIs versionadas existentes del propietario elegido:

- Alta: `POST /{rund|pta}/api/v1/pta/banco-docentes/:perfilId/documentos`.
- Reemplazo: `POST .../:perfilId/documentos/:documentoIdVisto/reemplazo`.

El reemplazo conserva el ID de la versión vista y su documento lógico; no consulta la
última versión para sustituirla automáticamente. El servidor conserva sus controles de
concurrencia, permisos y revisión. Los originales sin versionado, restringidos, ambiguos
o almacenados en otro propietario requieren gestión desde su módulo; no se convierte una
copia Auth en un reemplazo PTA. Un alta duplicada queda sujeta a la validación existente.

El navegador no declara cargadores/aprobadores en el formulario. No reintenta ni reenvía
una carga fallida a otro servicio. Solo confirma éxito tras comprobar el recibo persistido:
perfil, bloque, tipo, estado ACTIVO, versión y documento lógico; en reemplazos también
comprueba nueva identidad, mismo documento lógico y versión siguiente.

La selección queda bloqueada durante la carga, se impiden envíos simultáneos y las
respuestas atrasadas de otra persona no sustituyen el catálogo actual. Un diálogo de
archivo abierto antes de cambiar de perfil se rechaza antes del envío. La actualización
espera el refresco real del listado en ambos padres antes de recargar los perfiles; si
cambia la persona durante la operación se indica que debe verificarse la carpeta original.
Las demás cargas Auth mantienen su flujo. Las decisiones de aprobación siguen en sus
interfaces y servicios propietarios; este panel no introduce una aprobación alternativa.

### Validación y límites

- **Builds:** Auth, RUND, shell y Personas correctos; los dos frontends se recompilaron
  después del ajuste final del refresco asíncrono.
- **Auth:** 11 suites / **101 tests**. **RUND:** 42 suites / **512 tests**.
- **Personas:** 8 archivos / **106 tests**. **Shell:** 12 archivos / **131 tests** pasan.
  La suite completa del shell mantiene el fallo previo de `disciplinary.service.spec.ts`
  (`jest is not defined`); no se declara completamente verde.
- Cada frontend ejecuta **23 casos nuevos** de catálogo, propietario/periodo, cargas,
  recibos, reemplazo visto, archivos ajenos/restringidos, fallo sin alternativa, selección,
  respuestas atrasadas, doble clic y vista real sin duplicación documental. Después del
  último ajuste se repitieron panel y sección de carpeta: **26 tests por frontend**.
- **TypeScript completo:** shell **586 → 586**, Personas **192 → 192**, sin nuevas firmas
  de error tras normalizar BOM y posiciones. Ambos checks conservan sus errores previos.
- **PostgreSQL 15.14 temporal:** **117 checks**, incluidos los 112 anteriores y **5 nuevos**
  de catálogo por propietario/periodo, asociación documental, consulta vacía sin creación,
  credenciales/fallos sin alternativa y bandera apagada sin tráfico RUND. La prueba compara
  filas de negocio antes/después de consultar; la auditoría de acceso sí se registra.
  El fixture temporal admite IDs históricos de texto y periodos; no modifica una base real.
  Se detuvieron la aplicación y el cluster temporal, que se eliminó al terminar.
- **Chrome:** **10 checks** con shell/remote compilados, contextos nuevos y APIs ficticias
  interceptadas. El panel real exige elegir entre dos periodos RUND, guarda en el primero,
  muestra un 503 del segundo sin POST a PTA/Auth y permite seleccionar el histórico
  explícitamente. Conserva los nueve casos previos y no registra errores JavaScript.
- Sin dependencias nuevas ni activación de banderas. Los límites del fixture Auth de la
  sección 27 siguen aplicando: no equivale a probar todo su AppModule en un entorno real.

Evidencias: `validacion-panel-rund-local.json`, `validacion-panel-rund-postgres-local.json`,
`validacion-panel-rund-navegador-local.json` y `validacion-servicio-postgres-local.json`.
Para reproducir, compilar Auth/RUND y ejecutar `node scripts/verify-rund-service-integration.cjs`;
compilar shell/Personas y ejecutar `node scripts/verify-rund-personas-browser.cjs --inline`.
Los casos del panel son `CarpetaRundInline.test.tsx` en ambos frontends y usan el Vitest
propio de cada proyecto; los runners backend son los documentados en las secciones previas.

**Siguiente punto: 12.4, validación conjunta de las vistas y preparación de activación
controlada del paso 12.** Revisar configuración y prerrequisitos, permisos, documentos
históricos, fallos y consistencia entre banco, shell y Personas antes de activar en un
ambiente existente. Esta validación local no completa el despliegue ni el aislamiento de
base de datos. Reportes, dashboard, consumidores PTA/Programación y las demás dependencias
enumeradas en 9.2 siguen pendientes. No retirar el RUND original de PTA ni sus accesos.

## 29. Paso 12.4: vistas conjuntas y preparación de activación (2026-10-13)

**Validado localmente y documentado; sin activar ni desplegar.** Se contrastaron banco,
autogestión, carpeta administrativa, Gestión de Personas y portal. El paso 12 permanece
abierto: falta verificar los prerrequisitos y el comportamiento en el ambiente destino.

### Hallazgo y ajuste del portal

`MisDocumentos` también consume `CarpetaDigitalSharedView`, pero su adaptador anterior
descartaba propietario, perfil, documento lógico, restricciones y revisión; sustituía una
versión ausente por 1, una fecha ausente por la actual y un estado ausente por “Vigente”.
Además, no conservaba correctamente categoría RUND, tamaño, tipo y URL canónicos. Esto
impedía aplicar consistentemente el panel por periodo del punto anterior en esa vista.

El adaptador conserva ahora el DTO completo y sus campos canónicos. Las ausencias no
inventan aprobación, versión o fecha; los formatos heredados conservan sus alias de lectura.
Una URL restringida queda nula incluso si llega un alias antiguo. Las descargas de archivos
con propietario pasan por el adaptador autenticado y conservan la revisión vista. El
reclasificado Auth también envía esa revisión; originales RUND/PTA o restringidos se
gestionan desde su módulo, y borradores no completan requisitos por coincidencia de nombre.

Un error del propietario ya no se convierte en una carpeta vacía exitosa en `portalApi`.
El componente muestra error y reintento, sin reemplazarlo por otra consulta documental.
Un listado vacío confirmado sigue siendo válido. Las respuestas atrasadas de otra persona
se descartan. El enlace “Ir a mi RUND” usa `/rund/autogestion/docentes`; la ruta pública
PTA anterior sigue intacta para sus invitaciones y borradores.

El resumen del controller portal solicita el mismo conteo agregado y conserva el actor,
la sesión y la identidad canónica que administración. Un fallo del resumen/listado se
anuncia con `success:false`. Las respuestas documentales portal y el catálogo de perfiles
incluyen `Cache-Control: private, no-store`. No se cambiaron los guards globales, permisos
ni rutas de OTP, y no se retiró código del módulo PTA original.

### Evidencia conjunta

- **Auth:** build correcto y **12 suites / 106 tests**, incluidos 5 nuevos del wrapper portal.
- **Shell:** build correcto y **14 archivos / 141 tests** pasan, incluidos 10 nuevos del
  portal y su transporte. La suite completa conserva exclusivamente el fallo previo de
  `disciplinary.service.spec.ts` (`jest is not defined`).
- **Frontend RUND:** build correcto, **19 archivos / 180 tests** y TypeScript sin errores.
  La auditoría de dependencias revisa 51 archivos TS, 50 fuentes alcanzadas, ambos exports
  federados y sus chunks; no encuentra imports de otros módulos ni fuentes sin uso.
- **TypeScript shell:** **586 → 586**, sin nuevas firmas de error normalizando BOM y
  posiciones. La verificación completa continúa fallando por esos diagnósticos anteriores.
- **PostgreSQL temporal:** **121 checks**, los 117 previos más 4 de vistas. El mismo servicio
  Auth real entrega a portal y administración documentos y totales iguales, con propietarios,
  perfiles y versiones; se comprueban enmascaramiento sin sesión, fallo de credencial RUND
  sin carpeta parcial exitosa y cabecera sin caché para perfiles. El fixture incorpora el
  controller portal compilado y su middleware de identidad documental; no sustituye una
  prueba de todo AppModule Auth. Aplicación detenida y cluster temporal eliminado.
- **Chrome, Personas/portal/carpeta administrativa:** **13 checks**. Conserva los diez del
  punto anterior y añade el portal real con original restringido y versión 4, la respuesta
  de error/reintento sin un falso listado vacío y la entrada administrativa del shell.
- **Chrome, banco/autogestión:** **5 checks**, incluidos los alias históricos del menú y
  ambas rutas públicas con su propietario correspondiente. Ambos runners usan builds
  reales, contextos nuevos, APIs ficticias interceptadas y cero errores JavaScript.
- **Compose:** **19 composiciones** correctas con valores ficticios, banderas apagadas por
  defecto y overrides explícitos. Comparación contra `tmp/rund-step12-3-compose-before.json`
  confirma hashes idénticos de los módulos ajenos a Auth/RUND. Sin daemon, contenedores,
  lectura de `.env` reales ni cambios de Compose en este punto.
- `git diff --check` correcto. Sin nuevas dependencias. El backend RUND y Personas no
  cambiaron en este punto: sus compilaciones y suites anteriores se conservan como evidencia
  previa (512 y 106 tests respectivamente); no se presentan como suites repetidas aquí.

El timeout inicial de la prueba nueva del portal se debió a buscar nombre/versión
del original en la tarjeta de requisito, que muestra el nombre del requisito. El runner
abre ahora el detalle real antes de comprobar esos datos y verifica que la vista previa
restringida muestra el aviso sin solicitar contenido. No se relajó la comprobación del
estado, versión, selección o acceso.

Evidencias en `docs/rund`: `validacion-vistas-carpeta-local.json`,
`validacion-vistas-carpeta-postgres-local.json`, `validacion-vistas-carpeta-navegador-local.json`,
`validacion-shell-navegador-local.json`, `validacion-carpeta-compose.json` y
`validacion-servicio-postgres-local.json`. Reproducir las pruebas conjuntas con Auth/RUND
compilados y `node scripts/verify-rund-service-integration.cjs`; con shell y remotes
compilados, ejecutar `node scripts/verify-rund-personas-browser.cjs --views` y
`node scripts/verify-rund-shell-browser.cjs`. Los runners unitarios son los de la sección 28;
RUND frontend usa el Vitest raíz con `--threads=false` en este checkout.

### Activación preparada, pendiente de ambiente

La guía [ACTIVACION-CARPETA-DIGITAL.md](ACTIVACION-CARPETA-DIGITAL.md) identifica las tres
banderas por servicio, migraciones/prerrequisitos, identidad y permisos, secretos internos,
JWT, OpenKM/persistencia, secuencia propuesta, matriz de aceptación y contención/reversión.
Incluye consultas de lectura para revisar relaciones y triggers posteriormente. No se han
ejecutado contra una base existente ni se aplicaron migraciones fuera del fixture temporal.

La bandera de lectura no revierte los enlaces del frontend ni importa datos PTA. Apagarla
retira RUND del agregado, conservando originales en su banco. La proyección e historial
tienen banderas propias. No debe borrarse evidencia, tablas o storage para revertir una
activación. Las pruebas locales no certifican gateway, cookies, JWT y OpenKM del destino.

**Siguiente punto: 12.5, verificación del ambiente destino antes de activar.** Identificar
ambiente/artefactos, comprobar esquema, identidad, permisos y almacenamiento con la guía,
y registrar resultados de la matriz allí antes de habilitar las funciones correspondientes.
El aislamiento total de BD, reportes, dashboard y consumidores PTA/Programación de 9.2
siguen pendientes; no retirar el RUND embebido de PTA ni sus accesos históricos.

## 30. Paso 12.5: revisión previa del repositorio (2026-10-14)

**Revisión offline terminada; verificación del ambiente destino pendiente. No se cierra
el paso 12.5 ni se habilita la integración.** Al cierre de esta revisión no se había identificado el ambiente concreto
para verificar esquema, identidades, JWT/cookies, OpenKM, imágenes y conectividad reales.
La revisión avanzó sobre fuentes y evidencias existentes, sin asumir DEV, QA, PRE o PROD.

### Qué conserva la evidencia anterior

Los seis archivos con hash registrados en `validacion-vistas-carpeta-local.json` conservan
su contenido: adaptador portal, transporte portal, controllers Auth/portal y runners de
vistas PostgreSQL/Chrome. Es una comprobación limitada a esos archivos, no una certificación
de todos los servicios ni de artefactos publicados. Los 121 checks PostgreSQL y 18 recorridos
de navegador siguen siendo evidencia local del paso 12.4; no se repitieron en esta revisión.

### Pendientes confirmados antes de activar

1. **Construcción de imagen RUND.** Las matrices de los cuatro workflows
   `.github/workflows/build-backend-{dev,qa,pre,prod}.yml` contienen 14 servicios y no
   incluyen `rund-service`. Los cuatro overlays GHCR sí referencian `esap-rund-service`
   con su tag por ambiente. Por tanto, esa configuración de CI no construye el artefacto
   que Compose espera. No se consultó GHCR: podría existir una imagen por otra vía, pero
   falta asegurar su construcción/versionado y compatibilidad con Auth/frontend.
2. **Tratamiento de fallos de migración.** `migrate.local.sh`, `migrate.service.local.sh`
   y los cuatro `deploy.*.sh` invocan `psql -f` sin `ON_ERROR_STOP` explícito. Los despliegues
   además ignoran errores de `cmd_db_migrate` mediante `|| true` o los convierten en
   advertencias. En `rebuild-changed` se arranca el backend antes de sus migraciones y
   las globales se ejecutan después del frontend. Estos comportamientos ya requieren
   atención según la sección 7: el despliegue puede anunciar finalización sin demostrar
   un esquema consistente. Revisar con pruebas específicas de fallo SQL y no aplicar
   cambios generales a los runners sin verificar los otros módulos afectados.
3. **Cobertura de auditoría del gateway.** La función real `isRundAuditUrl` reconoce el
   banco, pero devuelve `false` para rutas del CRUD base, interoperabilidad y Carpeta
   Digital. Se comprobó en memoria con rutas ficticias, sin peticiones HTTP. La política
   especial que omite cuerpos no se aplica allí; la sanitización general solo cubre
   determinadas claves superiores y no equivale a esa omisión. Ampliar la cobertura y
   las pruebas según la dependencia ya documentada en 6/9.2. Esto identifica una brecha
   de cobertura en el código, no demuestra que haya ocurrido una filtración en un ambiente.

### Comprobaciones ejecutadas

- **28 tests de selección de despliegue** pasan con las funciones reales extraídas y
  Docker/Git/operaciones simuladas. No se ejecuta el script de despliegue completo ni
  sus migraciones. Cubren selección/configuración, no la matriz de GitHub ni fallo SQL.
- **Gateway: 2 suites / 19 tests** pasan, de rutas públicas RUND y redacción histórica.
  No se cambiaron expectativas: esas pruebas no cubren las rutas ausentes identificadas.
- **Revisión offline reproducible:** `node scripts/review-rund-preactivation.cjs` genera
  `revision-preactivacion-repositorio.json` con 4 hallazgos (el manejo de migraciones se
  separa en fallo SQL y continuación del despliegue), imágenes/matrices, invocaciones,
  clasificación de rutas ficticias, hashes de fuentes y límites de la revisión.
- La sintaxis del runner se comprobó con `node --check`; `git diff --check` correcto.
- Sin cambios a servicios, guards, workflows, Compose, scripts de despliegue/migración,
  `.env` reales ni bases existentes. Solo se añadieron revisión, evidencia y documentación.

### Orden propuesto para continuar

**12.5a:** incorporar RUND en las matrices de construcción backend y comprobar que los
otros servicios/tags permanecen iguales, sin publicar imágenes desde esta revisión.
**12.5b:** completar la clasificación/redacción de auditoría y probar rutas nuevas,
cuerpos, tokens/identificadores y conservación de recorridos ajenos a RUND.
**12.5c:** preparar ejecución de migraciones que detecte fallos sin anunciar éxito ni
registrarlos como aplicados, con pruebas aisladas y revisión del impacto en otros módulos.
Después corresponde identificar y revisar el ambiente destino con la guía de activación,
sin usar las pruebas locales como sustituto de sus prerrequisitos.

Las dependencias funcionales de reportes, dashboard, PTA/Programación y las dependencias
SQL entre esquemas de 9.2 permanecen abiertas. El RUND original de PTA conserva sus rutas
y datos; su retirada sigue condicionada a la confirmación explícita de 9.3.

## 31. Paso 12.5a: construcción RUND en todos los ambientes (2026-10-14)

**Configuración corregida y validada localmente; sin publicar ni desplegar.** El usuario
confirmó que el alcance comprende **local, DEV, QA, PRE y PROD**. No se limita la revisión
a uno de ellos y no hace falta volver a solicitar esa preferencia. La ejecución real de
las verificaciones depende de la instalación/artefactos de cada ambiente.

### Cambio acotado de CI

Los cuatro workflows `.github/workflows/build-backend-{dev,qa,pre,prod}.yml` incorporan
`rund-service` una sola vez. Cada matriz pasa de 14 a 15 servicios y conserva los anteriores.
La configuración existente de metadata genera `esap-rund-service:<ambiente>-latest`, que
coincide con el overlay GHCR correspondiente. Contexto y Dockerfile apuntan a
`backend/rund-service`; no se usa el contexto PTA.

El cambio de cada workflow es una línea. La comparación estructural contra el contenido
capturado antes del ajuste confirma que triggers, permisos, otros servicios, pasos y tags
no cambiaron. Los hashes de los demás workflows también permanecen iguales. Las ramas
existentes `dev`, `qa`, `pre` y `prod` conservan sus disparadores; esta revisión no hace
push ni invoca GitHub Actions.

Local conserva la construcción desde fuente: `docker-compose.local.yml` hereda el servicio
de DEV y usa el mismo contexto/Dockerfile RUND. No se necesita introducir un quinto workflow
para ejecutar el servicio en este equipo. Las banderas de integración conservan sus valores
por defecto apagados en las composiciones revisadas.

### Comprobaciones y evidencia

- `node --test scripts/verify-rund-build-workflows.test.cjs`: **13 tests** pasan. Cruzan
  ramas/matrices sin duplicados, permisos y trabajos independientes, nombre/tag de metadata
  contra los overlays reales, contexto/Dockerfile y publicación del tag generado; también
  comprueban el contexto local/base/backend y los cuatro ambientes.
- `node scripts/verify-rund-compose.cjs --compare tmp/rund-step12-3-compose-before.json --carpeta`:
  **19 composiciones** correctas, incluidos local y los overlays GHCR/MFE por ambiente,
  sin daemon, contenedores ni lectura de `.env` reales. Los hashes de módulos ajenos a
  Auth/RUND coinciden con el baseline anterior.
- Comparación previa/posterior de workflows: **4 matrices con el único añadido RUND**;
  los otros 4 workflows del directorio permanecen idénticos.
- La revisión offline regenerada ya no informa `RUND_IMAGE_NOT_IN_BUILD_MATRIX`; conserva
  los **3 hallazgos pendientes** de fallo SQL, continuación del despliegue y auditoría.
  Identifica los cinco destinos, sin presentar su configuración como una verificación
  de sus instalaciones reales.
- `git diff --check` correcto. No se modificaron código de aplicación, dependencias,
  Dockerfiles, Compose, runners de migraciones/despliegue ni bases existentes.

Evidencias: `validacion-construccion-rund-local.json`, `revision-preactivacion-repositorio.json`
y `validacion-carpeta-compose.json`. Las verificaciones son de configuración: **no se
construyó una imagen Docker, no se publicó en GHCR y no se ejecutó el workflow remoto**.
Por tanto, no certifican la disponibilidad de una imagen/tag publicado ni el funcionamiento
del ambiente tras un despliegue. Las pruebas de aplicación anteriores no se repitieron
porque este ajuste solo cambia la selección de construcción en CI.

**Siguiente punto: 12.5b, completar auditoría del gateway** para rutas RUND/Carpeta Digital,
con pruebas de datos sensibles y conservación de los flujos ajenos. Después sigue 12.5c,
errores/registro de migraciones, y la verificación de cada instalación local/DEV/QA/PRE/PROD.
El paso 12 sigue abierto; no se han activado funciones ni retirado el RUND original de PTA.

## 32. Paso 12.5b: auditoría del gateway para RUND y Carpeta Digital (2026-10-14)

**Implementado y validado localmente; sin despliegue ni activación.** El alcance sigue
siendo local, DEV, QA, PRE y PROD. La protección pertenece al código compartido del gateway,
sin condicionarla a un host, puerto o bandera de un ambiente concreto.

### Cobertura y datos de los registros

La clasificación comprende `/rund` y `/rund-service`, rutas versionadas, el prefijo
`/services`, interoperabilidad histórica bajo PTA, banco/macro anteriores y Carpeta Digital
Auth/portal/interna. Incluye originales mediante `/auth/api/v1/uploads/carpeta-digital/...`,
su variante corta `/auth/uploads/...` y storage RUND. No clasifica como RUND el CRUD de
docentes/soportes/documentos de otros servicios por compartir esos nombres.

Las URLs registradas conservan los literales conocidos de operación y versión; ocultan
identificadores, tokens, archivos y segmentos desconocidos, y eliminan consultas/fragmentos.
Los parámetros de identidad/sesión se ocultan también si coinciden con un literal de ruta.
La autoridad de una URL protegida no conserva usuario/contraseña. La heurística histórica
que ya omitía cuerpos al referenciar autogestión en una consulta se mantiene, conservando
el nombre de la operación ajena cuando solo la consulta activaba esa heurística.

El proxy transmite explícitamente el contexto protegido al redactar destinos internos:
`/docentes/:id` deja de perder la protección al desaparecer el prefijo `/rund/api/v1`.
Lo aplica tanto al diagnóstico normal como a errores Axios. La URL real de transporte,
credenciales y cuerpo del request no se modifican para conseguir esa redacción.

Para las operaciones protegidas, la auditoría general omite cuerpos de petición/respuesta,
consulta y referer. El proxy no deja una copia de la respuesta protegida en
`res.locals.auditResponseBody`. Los errores mantienen código HTTP sin copiar mensaje/stack
privados en el registro general. Se conservan método, operación, actor, IP, resultado y
duración. No se modifica la auditoría de negocio/accesos de los servicios propietarios.

Los demás módulos conservan su política anterior de cuerpos/consultas y detalle de errores.
GET conserva la política previa del interceptor general, que audita escrituras; este punto
no presenta las lecturas como nuevos eventos generales ni reemplaza su auditoría propietaria.

### Validación y compatibilidad

- **Gateway:** build correcto y suite completa **6 suites / 67 tests**. Comprueban rutas
  nuevas, variantes cortas/codificadas, destinos internos, credenciales de URL, cuerpos
  anidados, referer, errores y conservación de rutas/política ajenas. Los tests del guard
  y los controllers existentes también pasan.
- **HTTP real con AppModule compilado:** **9 checks**. Prueban JSON y alias v2, Auth/portal
  con cookie y revisión documental, conflicto 409, caída del upstream, bytes/cabeceras PDF,
  multipart con boundary original, rechazo 401 sin sesión, OTP público y auditoría de un
  módulo ajeno. Se observa el registro recibido por un servidor de auditoría ficticio y
  los diagnósticos del proxy; no contienen los marcadores privados ni el JWT del fixture.
- El fixture reemplaza **todos** los destinos del mapa de servicios por un upstream
  ficticio en `127.0.0.1` y usa un receptor local de auditoría. No importa `main`/dotenv,
  no lee `.env`, no usa bases existentes ni prueba servicios reales Auth/RUND/OpenKM.
  Usa la estrategia JWT y el guard reales del gateway, con sesión ficticia firmada.
- Comparación de hashes: guard JWT, destinos del proxy, mapeos de auditoría y los cuatro
  workflows de construcción permanecen idénticos al inicio de este punto. No cambian
  rutas públicas, permisos, selección de servicios ni datos de PTA.
- La revisión offline ya no informa `NEW_ROUTES_OUTSIDE_RUND_AUDIT_POLICY`. Quedan **2
  hallazgos**, ambos de migraciones: detección de fallo SQL y continuación del despliegue.
- `git diff --check` y sintaxis del runner correctos. Sin nuevas dependencias, cambios de
  Compose, migraciones, frontend, banderas o instalaciones existentes. No se repitieron
  suites ajenas al gateway porque no cambió su código.

Evidencias: `validacion-auditoria-gateway-local.json`,
`validacion-auditoria-gateway-http-local.json` y `revision-preactivacion-repositorio.json`.
Para reproducir, compilar `backend/api-gateway`, ejecutar su Jest con `--runInBand` y
`node scripts/verify-rund-gateway-audit.cjs`. No hace falta iniciar contenedores ni servicios
del sistema; la prueba HTTP cierra el gateway y sus dos servidores ficticios al terminar.

**Siguiente punto: 12.5c, tratamiento de errores y registro de migraciones.** Verificar
que un fallo SQL no se marque como aplicado ni termine anunciado como despliegue correcto,
con pruebas aisladas y revisión del impacto compartido. Después sigue la verificación de
las instalaciones y artefactos de local/DEV/QA/PRE/PROD. El paso 12 continúa abierto y el
RUND embebido de PTA conserva sus rutas y datos.

## 33. Paso 12.5c: detener fallos SQL y registrar migraciones correctamente (2026-10-14)

**Implementado y validado con PostgreSQL temporal y despliegues simulados.** Alcance:
`migrate.local.sh`, `migrate.service.local.sh` y `deploy.{dev,qa,pre,prod}.sh`.
Sin despliegue, migraciones sobre bases existentes, lectura de `.env` reales ni activación.

### Comportamiento corregido

- Todas las invocaciones SQL de esos runners usan `-X -v ON_ERROR_STOP=1`: no cargan
  personalizaciones de `psqlrc` y un error SQL detiene el archivo con código de fallo.
- Un error al preparar la tabla de control o leer su historial detiene el proceso antes
  de aplicar archivos. Los runners Docker también comprueban preparación, copia y listado;
  la ordenación del listado ya no oculta un error del contenedor con una tubería.
- El primer error SQL detiene la secuencia y no registra esa migración como aplicada.
  Tampoco ejecuta los archivos siguientes. El resumen conserva el fallo y retorna error.
- La confirmación de éxito y su contador se producen después de persistir el historial.
  Si ese registro falla después del SQL, se detiene e indica que requiere revisión antes
  de reintentar. Los alias de ruta y basename se guardan juntos en una sentencia atómica;
  el runner local por servicio conserva su registro único anterior.
- Se conserva la omisión de migraciones ya aplicadas por ruta o basename. No se reparan
  registros históricos, se renombran migraciones ni se altera la selección de servicios.
- Los cuatro despliegues propagan el error en `up`, `rebuild`, `rebuild-fresh`,
  `rebuild-all-mfe`, `rebuild-service` y `rebuild-changed`. No anuncian la finalización
  exitosa después del fallo; QA/PRE/PROD ya no terminan con código cero en ese caso.
  Las comprobaciones son explícitas también cuando Bash deshabilita `set -e` dentro
  de una función invocada mediante `||`.

### Validación y límites

- **58 pruebas de runners con PostgreSQL real en un clúster nuevo temporal:** éxito,
  orden y segunda ejecución, errores intermedios, transacción propia con rollback,
  registro fallido sin alias parcial, errores de preparación/consulta, compatibilidad
  histórica y fallos de Docker simulados. Se prueba `CREATE INDEX CONCURRENTLY` y se
  verifica que un `psqlrc` ficticio no desactive la detección de errores.
- **88 pruebas de selección y comandos de despliegue:** conservan los casos RUND,
  Chatbot, OCR, PTA y configuración inválida; agregan propagación de error por servicio
  y global en todos los comandos afectados y sus recorridos correctos. Docker, Compose,
  limpieza, reinicios y esperas son funciones simuladas; no se ejecutan despliegues.
- Sintaxis Bash de los seis runners y `git diff --check` correctos. La comparación con
  las fuentes al inicio de este punto verifica que las otras funciones y configuración
  de los cuatro despliegues no cambian. No se modifican SQL, rutas, guards ni código
  funcional de Auth, RUND, PTA, Programación o Personas en este punto.
- La revisión offline actual tiene **0 hallazgos dentro de sus comprobaciones**. Esto
  no demuestra que las instalaciones local/DEV/QA/PRE/PROD estén listas ni sustituye
  comprobar sus artefactos, esquema, permisos, cookies/JWT, OpenKM y recorridos reales.

**Las migraciones completas y el despliegue no son atómicos.** Se mantienen las
transacciones de cada SQL: imponer una transacción universal rompería scripts históricos
con transacciones propias u operaciones incompatibles. Un archivo puede haber confirmado
cambios antes de fallar; también puede ejecutarse bien y fallar su registro. Revisar los
cambios y el historial antes de cualquier reintento; este ajuste no garantiza rollback
de todo el archivo ni repara migraciones marcadas erróneamente en ejecuciones anteriores.
Los servicios pueden haber arrancado antes de las migraciones: se conserva el orden
actual de publicación y no se añade reversión automática de contenedores.
`migrate.first.local.sh` no forma parte del alcance de este punto.

Evidencias: `validacion-migraciones-local.json`,
`validacion-migraciones-despliegue-local.json` y `revision-preactivacion-repositorio.json`.
Reproducir con `node --test scripts/verify-migration-runners.test.cjs` (binarios locales
PostgreSQL/Git Bash; configurar `PG_BIN_DIR`/`BASH_TEST_BINARY` si corresponde) y
`node --test scripts/verify-deploy-service-selection.test.cjs`. El primer fixture crea
su propia base, no acepta una conexión externa y detiene/elimina su clúster al finalizar.

**Siguiente punto: 12.5d, verificar prerrequisitos y artefactos por ambiente** con evidencia
del esquema/historial y de las rutas e integraciones desplegadas, empezando por las
comprobaciones de lectura que puedan realizarse sin activar funciones. La disponibilidad
de imágenes publicadas y el orden de arranque siguen requiriendo validación operativa.
El paso 12 permanece abierto; el retiro de RUND embebido en PTA sigue siendo posterior.

## 34. Paso 12.5d.1: inventario de artefactos y verificación de base de solo lectura (2026-10-14)

**Herramientas implementadas y probadas; instalaciones existentes aún sin verificar.**
El alcance comprende local, DEV, QA, PRE y PROD. Se añade una revisión reproducible
para distinguir los archivos del checkout de los artefactos publicados y comprobar
prerrequisitos sin aplicar migraciones ni activar integraciones.

### Resultado y herramientas

- `node scripts/review-rund-installation.cjs` genera el inventario offline de los cinco
  destinos: Compose/workflows, plantillas GHCR, presencia y SHA-256 de migraciones y
  archivos de compilación. En este PC se encontraron **12 migraciones y 11 archivos
  de compilación relevantes**. Su presencia no prueba correspondencia con las fuentes,
  disponibilidad de chunks/exports ni publicación. No se consulta GHCR ni Docker.
- `--database --environment local|dev|qa|pre|prod` agrega el diagnóstico de la conexión
  PG explícita del operador. No carga `.env`, infiere destinos ni usa una conexión por
  defecto. No se ejecutó ese modo contra bases existentes durante este punto.
- La conexión exige lectura por defecto y el diagnóstico abre `REPEATABLE READ READ ONLY`,
  con timeout por consulta/locks y cierre mediante `ROLLBACK`. Cada error de consulta
  queda sin verificar, aislado mediante savepoint; no se convierte en un vacío correcto.
- Revisa tablas, SELECT/USAGE del rol de revisión, tipos/nulabilidad críticos, tres
  triggers de la 668, restricciones seleccionadas de versiones, secuencia de tarjetas,
  los 16 permisos del catálogo activo RUND, evidencia de historial por ruta/basename
  y conteos de perfiles sin persona/periodo o con agrupaciones ambiguas. No modifica,
  fusiona, importa o enlaza perfiles, repara historial ni concede permisos.
- Los reportes omiten host/usuario/contraseña y filas de personas/documentos. Solo
  incluyen requisitos conocidos, resultados, conteos y SQLSTATE; los errores privados
  del driver no se imprimen. Las salidas se restringen a reportes JSON de revisión.
- El modo de base devuelve error si algo falla o queda pendiente. Un alcance correcto
  se expresa como `checked_scope_passed`; **`activationReadiness` siempre sigue en
  `not_verified`**. La etiqueta de ambiente la proporciona el operador, no certifica
  automáticamente qué instalación representa la conexión.

La ruta existente `/health/ready` solo prueba conectividad mediante `SELECT 1`.
Se conserva su contrato; no debe interpretarse como validación del esquema requerido.

### Evidencia y límites

**15 pruebas correctas** contra un clúster PostgreSQL nuevo con DDL Auth y migraciones
reales, personas ficticias y ejecución del CLI. Cubren tablas/tipos faltantes aunque el
historial diga aplicado, triggers deshabilitados o con eventos incorrectos, restricciones,
catálogo incompleto, vínculos de identidad, periodos ambiguos, errores de consulta,
historial ausente y rol sin acceso. PostgreSQL rechaza una escritura intentada durante
la revisión incluso con administrador; las instantáneas de datos/historial permanecen
idénticas y las transacciones se cierran. También se comprueba que el CLI no conecte
por defecto y rechace argumentos o salidas que apuntan a configuración/código.

El fixture cierra y elimina solo el clúster temporal creado por él. No lee `.env` reales,
inicia contenedores, despliega ni consulta servicios existentes. Los hashes de **15 archivos
registrados en las evidencias previas de 12.5b/c** siguen iguales. No se cambian servicios,
SQL, Compose, workflows, guards, rutas, banderas, frontend o scripts de despliegue en
este punto. No se repiten suites de aplicación sin cambios.

El diagnóstico inspecciona un alcance parcial de estructura: no compara todo el DDL,
cuerpos de funciones o grants de los usuarios de aplicación, ni demuestra el SQL que
realmente se aplicó a partir del historial. Tampoco certifica JWT/cookies, revocación,
OpenKM, originales, rutas internas, imágenes desplegadas ni los flujos completos.

Guía: [VERIFICACION-INSTALACION.md](VERIFICACION-INSTALACION.md).
Evidencias: `revision-artefactos-repositorio.json` y
`validacion-verificador-instalacion-local.json`. Reproducir con
`node --test scripts/verify-rund-installation.test.cjs`; requiere binarios locales
PostgreSQL (`PG_BIN_DIR` si corresponde), sin conexión a una base existente.

**Siguiente punto: 12.5d.2, comprobación operativa por instalación**, con revisión de
artefactos/digests publicados, esquema/historial, permisos de aplicación, orden de arranque
y recorridos reales de RUND y sus consumidores. Se empieza por lecturas con conexiones
explícitas del destino, sin activar banderas. El paso 12.5d permanece abierto hasta
tener esas evidencias; aún no corresponde retirar el RUND embebido de PTA.

## 35. Paso 12.5d.2: primera comprobación operativa y pendientes reales (2026-10-14)

**Revisión ejecutada; paso abierto por prerrequisitos locales y acceso remoto pendientes.**
Se pasa de fixtures a lecturas reales: conexión de Auth local bajo READ ONLY y GET
públicos a los cuatro orígenes de `DEPLOY_RUNBOOK.md`. No se activaron funciones,
aplicaron migraciones, iniciaron servicios ni modificaron `.env`, Compose o banderas.

### Evidencia local

- Se leyó `backend/auth-service/.env` sin imprimir ni guardar sus valores privados.
  Se comprobó que la conexión fuese de loopback antes de usarla. La conexión se abrió
  con lectura por defecto y el diagnóstico usó `REPEATABLE READ READ ONLY`, límites
  de consulta/locks y `ROLLBACK`. **No se ejecutó DDL/DML sobre esta base existente.**
- Resultado: **67 comprobaciones: 14 `pass`, 42 `fail` y 11 `not_verified`**. Las tablas
  base Auth del alcance existen, pero faltan `auth.documento_carpeta_version`,
  `auth.carpeta_revision_rund` y las tablas RUND comprobadas. No aparecen registros de
  001–007/667/668 en el historial examinado; el catálogo tampoco satisface los 16 permisos
  RUND activos. Los errores de identidad por tablas faltantes quedan sin verificar.
- Esta es **la conexión configurada por Auth local**, no una prueba de la configuración
  propia que deba usar RUND ni de otras bases que puedan existir. No se enumeraron otras
  bases ni se reutilizó esta conexión como sustituto de un ambiente remoto.
- No está `backend/rund-service/.env`. El candidato RUND local en `127.0.0.1:3016`
  no respondió a `/health/ready`. Esto no descarta configuración por otros mecanismos
  o puertos; requiere confirmar el modo y destino de ejecución.
- Docker no pudo acceder al endpoint del motor local, también en la lectura fuera
  de la sesión restringida. No se inició Docker ni se inspeccionaron imágenes/digests.

### Lecturas de orígenes remotos

Se añade `scripts/review-rund-public-endpoints.cjs`: exige ambiente y origen explícitos,
rechaza credenciales/consultas/rutas en el origen, usa solo GET sin cookies/tokens,
no sigue redirecciones y mantiene validación TLS. Consulta readiness mediante gateway
y los remotes RUND/Personas. Registra resultados/hashes sin guardar cuerpos, URLs de
redirección o mensajes privados. No trata HTML del SPA como JavaScript ni liveness de
otro servicio como readiness RUND. Impone cinco segundos y 2 MiB por respuesta.

- **DEV, QA y PRE documentados:** las tres consultas de cada origen terminaron en timeout
  sin recibir un código HTTP. Quedan sin verificar desde este equipo.
- **PROD documentado:** falló la resolución del nombre (`ENOTFOUND`), sin respuesta HTTP.
- No se verificó vigencia/propiedad de esos orígenes ni se obtuvo acceso a contenedores,
  imágenes, bases o secretos remotos. No están los `.env.dev/.qa/.pre/.prod` en este
  checkout. Se solicitó la ubicación del mecanismo de acceso de lectura vigente.

**Estos fallos de red no demuestran caídas ni regresiones de las aplicaciones remotas.**
Tampoco permiten afirmar qué commit/digest está desplegado. Los archivos locales y los
workflows siguen sin sustituir la evidencia de publicación efectiva.

### Validación, continuidad y siguiente trabajo

**14 pruebas del sondeador correctas**, usando respuestas ficticias y HTTP en loopback:
salud/JavaScript, HTML con 200 o MIME engañoso, sesión requerida, ausencia de recurso,
redirecciones, errores de red privados, tamaño/tiempo acotados y GET sin credenciales.
Los **30 archivos de fuentes/SQL** registrados en las evidencias previas 12.5b/c/d.1
conservan sus hashes. No se cambia código funcional de servicios, frontend, guard JWT,
scripts de despliegue o SQL. Se conservan los datos y recorridos existentes.

Evidencia: `revision-operativa-ambientes.json`, `revision-instalacion-local.json` y
`revision-endpoints-{dev,qa,pre,prod}.json`. La guía
[VERIFICACION-INSTALACION.md](VERIFICACION-INSTALACION.md) explica alcance y reproducción.
Los reportes reales indican lectura de configuración/base existente; los fixtures
anteriores mantienen su alcance temporal y no se presentan como pruebas del ambiente.

**Continúa 12.5d.2:** confirmar configuración/conexión y ejecución propias de RUND,
preparar la aplicación controlada de 001–007 y 667/668 al destino correcto con sus
prerrequisitos y recuperación, y repetir la aceptación tras esa preparación. El informe
lista los nueve SQL y sus hashes, sin ejecutarlos ni recomendar un barrido global de
migraciones para forzar el resultado. Para DEV/QA/PRE/PROD aún se necesitan red/accesos
vigentes de lectura para contrastar versiones/digests, esquema, permisos de aplicación,
sesión, rutas internas, persistencia y consumidores. **La activación y la independencia
completa continúan sin certificar; no corresponde retirar el RUND embebido de PTA.**

### Localización ampliada de accesos dentro del proyecto (2026-10-14)

El usuario indicó que no conoce la ubicación y pidió buscarla en el proyecto. Se revisaron
documentación, scripts, los ocho workflows y candidatos de configuración ocultos/ignorados.
`DEPLOY_RUNBOOK.md` ubica cada `.env.dev/.qa/.pre/.prod` en la copia del proyecto dentro
de su servidor; los scripts lo cargan allí y no implementan conexión SSH/contexto remoto.
Los cuatro archivos no están en este checkout y Git los excluye expresamente. Los ocho
workflows construyen/publican imágenes GHCR; no se encontraron pasos de despliegue remoto,
archivos SSH/SFTP/VPN ni credenciales de infraestructura utilizables en el alcance revisado.
No se imprimieron valores privados ni se reconstruyeron secretos del historial.

Se registran las ubicaciones y evidencia en `VERIFICACION-INSTALACION.md` y
`revision-localizacion-accesos.json`. No se afirma que no existan accesos externos al
proyecto o en la configuración privada remota de GitHub: esas fuentes no se consultaron.
El 12.5d.2 sigue abierto; el conteo permanece en **11 pasos principales completados
localmente, paso 12 en curso y 5 frentes restantes contando el actual**. La falta de acceso
operativo no impide continuar preparación y ajustes de código que no dependan de él.

## 36. Primer corte para push de la rama (2026-10-14)

Se establece un punto de corte para publicar el avance de `feat/agregar_modulo_rund`
para respaldo/revisión. **No se hizo stage, commit, push, despliegue ni activación.**
El estado de la independencia sigue siendo 11 pasos principales implementados/validados
localmente, paso 12 en curso y cinco frentes restantes contando el actual. Este corte
no añade un paso principal completado ni cierra 12.5d.2.

La guía [PRIMER-PUSH.md](PRIMER-PUSH.md) fija alcance, resultados, límites y comandos
propuestos para el usuario. `primer-push-rund.paths` recoge las rutas exactas a revisar,
incluidos los archivos nuevos, SQL y las eliminaciones de limpieza de `mfe-rund`.
`scripts/review-rund-push-checkpoint.cjs` genera manifiesto/huellas sin modificar Git,
revisa dependencias locales resolubles y firmas concretas de secretos sin imprimirlas.
Los JSON generados no se huellan recursivamente; las fuentes sí quedan identificadas.

### Comprobaciones repetidas para el corte

- **Seis builds correctos:** RUND, Auth y gateway backend; RUND, Personas y shell frontend.
  Las salidas frontend están aisladas bajo `tmp`, sin sustituir `build` existente.
- RUND backend **42 suites / 512 tests**; gateway **6 / 67**; Auth **12 / 106** en tres
  grupos que cubren todas sus suites; RUND frontend **19 archivos / 180 tests** y
  TypeScript correcto; Personas **8 / 106**; shell **14 archivos / 141 tests** correctos.
- La **suite completa del shell continúa fallando en 1 suite disciplinaria previa**:
  `jest is not defined`. Su chequeo TypeScript global conserva **586 diagnósticos**,
  con cero firmas nuevas/eliminadas respecto a la evidencia 12.4. No se tocó código
  disciplinario ni se relajaron los chequeos para ocultar esos resultados.
- **121 checks** RUND/Auth con PostgreSQL temporal y **9 HTTP** del gateway correctos;
  fixtures detenidos y eliminados, sin bases existentes ni servicios externos.
- **115 pruebas offline/simuladas** de workflows, selección de despliegue y sondeador;
  **19 composiciones** sin daemon ni `.env` reales, con comparación de módulos ajenos.
- Manifiesto y dependencias del paquete revisados; `git diff --check` correcto.
  No se construyeron imágenes Docker ni repitieron pruebas de navegador: la evidencia
  anterior de Chrome se conserva como previa, no como ejecución de este corte.

Evidencia: `revision-primer-push.json`, `validacion-primer-push-local.json` y los reportes
de integración/Compose regenerados. El primer push puede transportar este avance de
fuentes para revisión con sus límites explícitos; **no es certificación de una entrega
lista para integrar/desplegar en los ambientes**. La guía distingue la publicación de
la rama del cierre operativo y de la independencia completa.

Después del corte se retoma 12.5d.2: configuración y conexión propias de RUND, migraciones
controladas al destino correcto, accesos remotos y aceptación operativa. Luego siguen
los consumidores/dependencias de 9.2 y el retiro final condicionado por 9.3.

## 37. Integración del primer push con el avance remoto (2026-10-14)

El usuario realizó el push e inició un merge de `origin/feat/agregar_modulo_rund`.
Se integran el corte local `bbedccebb1b74150e3b75ba65a2fcc479702f9c6` y el avance remoto
`c959f2fe387ef8c910f3e2bf0c050da43b38d38a`, que presentaban **17 archivos en conflicto**.
La documentación del remoto se conserva como [snapshot histórico](ESTADO-REMOTO-c959f2fe3.md);
sus afirmaciones de datos migrados no certifican la instalación local ni los ambientes.
`PRIMER-PUSH.md` y sus manifiestos siguen describiendo el corte anterior, no este merge.

### Decisiones de compatibilidad

- Se conservan la persistencia documental, historial, revisión/concurrencia, actor
  autenticado y separación de persona/perfil/período/propietario del corte local.
  Personas y shell mantienen los adaptadores compartidos; Backoffice mantiene la
  entrada federada con sesión y permisos. No se recuperan implementaciones obsoletas
  basadas en almacenamiento local ni selección implícita de un perfil.
- La ruta histórica de autogestión de PTA conserva su componente y API PTA: sus
  invitaciones y borradores no se convierten en invitaciones RUND por cambiar un import.
  RUND conserva su entrada pública federada independiente y sus enlaces propios.
- Se incorporan la API interna de RUND y los clientes de PTA, Programación y Auth,
  las consultas de Reportes, estadísticas del tablero y sincronización de docentes.
  Se mantiene la lógica de negocio de cada consumidor. El gateway bloquea `/internal`
  también con variantes codificadas/normalizadas; la redacción de auditoría conserva
  toda la protección documental del corte local, incluida la ruta completa de RUND.
- Auth conserva el contrato documental con propietario explícito y sesión. Si RUND
  habilitado no responde, no presenta una carpeta incompleta como vacía. La auditoría
  usa la API cuando está inyectada; la compatibilidad SQL de los consumidores antiguos
  sin cliente permanece explícita, sin reintento SQL ante una caída de la API.
- Las referencias y marcas permanentes históricas de originales siguen verificándose
  antes de consultar al propietario nuevo. Retirar un documento no publica su URL
  antigua; un fallo de auditoría impide entregar el original. Esa lectura histórica
  de PTA sigue siendo una dependencia pendiente de retirar de forma controlada.
- Se conserva la sincronización robusta desde Auth, con token, paginación y rollback,
  y la generación de rutas a partir del archivo realmente almacenado. Se corrigen
  imports duplicados y claves `RUND_SERVICE_URL` duplicadas en Compose.

### Operaciones que requieren preparación de ambiente

La copia recibida como `004_copy_rund_data_from_pta.sql` queda fuera del directorio
automático de migraciones, en
`backend/rund-service/db/manual/copy_rund_data_from_pta.sql`. **No se ejecutó**.
Se conserva como herramienta manual: su eventual uso requiere decisión operativa,
recuperación y verificación por tabla, pues admite resultados parciales con WARNING.
Se mantiene el acuerdo del corte de no copiar datos PTA automáticamente a RUND.

La sincronización programada RUND → PTA requiere `RUND_SYNC_ENABLED=true`; el valor
por defecto es `false` en código, ejemplos y Compose. Las operaciones explícitas bajo
demanda se conservan. `INTERNAL_SERVICE_TOKEN` se transmite a Auth/RUND/PTA/Programación
como credencial propia; Compose no lo sustituye por `JWT_SECRET` ni por un secreto de
ejemplo. Antes del despliegue hay que configurarlo igual en los servicios participantes.

**Los nuevos consumidores por API sí cambian sus dependencias de ejecución.** Desactivar
el worker no desactiva esas lecturas. Deben validarse URL/red/token, esquema, datos del
propietario y correspondencia de IDs/períodos antes de desplegar el conjunto. El SQL
interno recibido aún consulta identidad de Auth y catálogo territorial de PTA; conservar
esas consultas no equivale a independencia física completa de bases de datos.

### Validación del resultado integrado

- **Nueve builds correctos:** backends RUND, Auth, gateway, PTA y Programación;
  frontends RUND, Personas, shell y Reportes. Salidas frontend aisladas bajo `tmp`.
- Backend: RUND **44 suites / 531 tests**, gateway **6 / 83**, Auth **13 / 115**,
  PTA **86 / 786** y Programación **14 / 90**, todos correctos.
- Frontend: RUND **19 archivos / 180 tests** y TypeScript correcto; Personas **8 / 106**;
  Reportes **3 / 25**; shell **14 archivos / 143 tests** correctos. La suite completa
  del shell sigue reportando **una suite disciplinaria previa fallida** por
  `jest is not defined`; no se cambia ni se omite para anunciar un resultado global verde.
  El chequeo TypeScript global del shell no se repite en este merge; sus 586 diagnósticos
  documentados en el corte anterior siguen siendo una limitación previa.
- **127 comprobaciones con PostgreSQL temporal**, incluidas las API internas nuevas
  y los clientes compilados de Auth/PTA/Programación contra RUND real. Se comprueban
  originales, auditoría, perfil/período, IDs textuales, paginación y horas. Se usa un
  catálogo territorial ficticio mínimo con las columnas requeridas por la API.
- **10 comprobaciones HTTP del gateway** con upstream ficticio: las rutas internas
  no alcanzan al propietario incluso con JWT y cabecera de servicio.
- **19 composiciones Docker** sin daemon, contenedores ni `.env` reales. Se verifican
  credenciales explícitas y worker apagado por defecto; en este merge no se compara
  el hash de PTA/Programación con el corte anterior porque sus cambios son intencionales.

Evidencia consolidada: [validacion-merge-rund.json](validacion-merge-rund.json), junto
con los reportes PostgreSQL, HTTP y Compose regenerados. No se ejecutaron migraciones
en bases existentes, despliegues ni push durante la resolución. No se ejecutó navegador
ni se construyeron imágenes Docker en esta revisión.

El merge aporta implementación y validación local de consumidores, sin cerrar la
aceptación operativa. El conteo se mantiene en **11 pasos principales completados
localmente, paso 12 en curso y 5 frentes restantes contando el actual**. Continúa
12.5d.2 y la revisión de consumidores/dependencias de 9.2; no se retira RUND de PTA.
