# Estado de la migración del RUND a microservicio

> Rama: `feat/agregar_modulo_rund` · Actualizado: 2026-10-16
> Documento de contexto para retomar la migración. Describe qué se decidió, qué está hecho,
> qué falta y qué trampas hay. Complementa `PENDIENTES_RUND_PTA.md` (historias de usuario) y
> los `REQ-RUND-*` de esta carpeta.

> **Guardado para retomar:** el último punto técnico terminado es el **80**.
> Instrucciones de commit/push, validaciones y siguiente trabajo en
> [PUSH-CORTE-80.md](PUSH-CORTE-80.md). Preparar este corte no activa el flujo nuevo
> ni incrementa el conteo de pasos.

## Resumen de avance para seguimiento (2026-10-16)

- **11 pasos principales completados en código/revisión y validación local:** pasos
  1–11, documentados en las secciones 11–21. No equivale a despliegue completado.
- **1 paso principal en curso:** el 12, integración de Carpeta Digital y preparación
  de activación. Tiene 13 subhitos terminados en repositorio/validación local (12.1,
  12.2, 12.3a, 12.3b.1–4, 12.4, revisión offline 12.5, 12.5a–c y 12.5d.1).
  **12.5d.2 sigue abierto por aceptación/configuración de las instalaciones**, con las
  lecturas de la sección 35; no equivale al estado de cada ajuste de código.
- **43 cortes técnicos terminados localmente desde la revisión posterior al merge:**
  secciones 38–80. Incluyen contratos e independencia de consultas; tienen tamaños
  distintos y no se suman al conteo de pasos principales.
- **Trabajo técnico actual: frente 4, aislamiento SQL.** Quedan completados el perfil
  público de interoperabilidad PTA (45) y la identidad del listado/ficha/estadísticas del
  banco (46), las lecturas de tarjeta/autogestión y resolución de alias (47),
  la identidad confiable de edición/envío OTP (48), unicidad/duplicados (49),
  vencimientos, diagnóstico y reparación de soportes (50), expediente/evidencias (51),
  contexto de identidad del proceso OCR (52), destinatario de sus avisos (53)
  rol/revalidación de la sincronización Auth → RUND (54) y permisos efectivos
  de las rutas RUND (55), correo propio de acceso externo Macro Docente (56)
  identidad histórica del historial por API PTA (57), programas de respaldo (58),
  planes firmes por API PTA (59), preparación transaccional de escrituras Auth (60)
  prevalidación propietaria de identidad (61), registro de intenciones Auth (62)
  aplicación transaccional de identidad en Auth, deshabilitada por defecto (63)
  registro durable/reconciliación de sus recibos en RUND (64) y contexto de negocio
  con confirmación transaccional del commit nativo (65), ejecución reanudable y
  decisión irreversible de aborto (66), cancelación de abortos no aplicados y
  prueba interna preparatoria de aborto (67), captura de efectos y compensación
  propietaria Auth de ediciones existentes (68) y conciliación durable de su
  resolución en RUND (69), casos durables y asignación de revisiones (70), sin
  activar escritura remota. El punto 71 agrega el vínculo durable por solicitud
  manual de creación y sus reglas actuales, todavía sin conectar la entrada activa.
  El 72 prepara la frontera HTTP con sesión/roles/permisos, captura recuperable,
  catálogo y prevalidación Auth, en un módulo que continúa fuera de AppModule.
  El 73 añade ejecución manual con controles vigentes y cliente de ID estable,
  sin montar el helper en el formulario o activar el módulo.
  El 74 agrega la conexión opcional al formulario con preparación, confirmación y
  recuperación; el llamador activo sigue sin proporcionarla y el módulo sigue inactivo.
  El 75 añade revisión autorizada de la captura con protección sensible actual y
  confirmación visual explícita, sin activar la conexión o modificar el escritor.
  El 76 agrega abandono durable previo a reservar el journal y bloquea capturas o
  reservas tardías; las solicitudes que ya avanzaron conservan su ID y operación.
  El 77 prepara su cierre autenticado con aborto, cancelación/compensación propietaria
  y revisión durable cuando corresponda; solo un cierre confirmado libera el ID.
  El 78 prepara el principal de cuenta verificado por Auth y la conexión opcional del
  shell/MFE, con invalidación por sesión; el formulario manual continúa sin activar.
  El 79 prepara el aviso durable de bienvenida en el commit nativo y un consumidor
  opcional sin reenvío automático ante incertidumbre; todavía no se activa correo.
  El 80 agrega consulta de correo por actor y su estado en el formulario opcional,
  sin envíos por GET o polling y sin confundir confirmación del perfil con correo.
  Siguen otras consultas y escrituras entre propietarios.
  La aceptación por ambiente es otro pendiente.
- **Primer corte para push de la rama:** alcance, manifiesto y validaciones consolidados
  en [PRIMER-PUSH.md](PRIMER-PUSH.md) y la sección 36. Es publicación para revisión,
  con límites globales del shell documentados; no cierra activación o despliegue.
- No se suman padres e hijos como si fueran pasos equivalentes ni se calcula un
  porcentaje de independencia a partir del número de pruebas o secciones.

Para que el avance de código no quede oculto bajo el rótulo del paso 12:

| Corte técnico | Estado local |
|---|---|
| 38: contrato documental Auth → RUND | Terminado |
| 39: contratos PTA/Programación y copias | Terminado |
| 40: período exacto y catálogo documental del proveedor | Terminado |
| 41: dos consultas de identidad por API Auth | Terminado |
| 42: catálogos del perfil interno y cobertura | Terminado |
| 43: catálogo del banco, rollback y precisión de IDs | Terminado |
| 44: período activo por API PTA | Terminado |
| 45: identidad del perfil público para PTA | Terminado |
| 46: identidad del listado, ficha y estadísticas del banco | Terminado |
| 47: lecturas de tarjeta/autogestión y resolución de alias | Terminado |
| 48: cédula confiable y pertenencia en edición/envío OTP | Terminado |
| 49: unicidad y detección de posibles duplicados | Terminado |
| 50: identidad de vencimientos, diagnóstico y reparación de soportes | Terminado |
| 51: identidad del expediente documental y datos de evidencias | Terminado |
| 52: contexto de identidad del proceso OCR por API Auth | Terminado |
| 53: destinatario de avisos OCR por API Auth | Terminado |
| 54: rol y revalidación de sincronización por API Auth | Terminado |
| 55: permisos efectivos de rutas RUND por API Auth | Terminado |
| 56: correo propio de acceso externo Macro Docente | Terminado |
| 57: identidad histórica de Macro Docente por API PTA | Terminado |
| 58: programas de respaldo de Macro Docente por API PTA | Terminado |
| 59: planes firmes de Macro Docente por API PTA | Terminado |
| 60: frontera local de escritura Auth y rollback | Preparación terminada; sustitución del escritor pendiente |
| 61: contrato de prevalidación de identidad en Auth | Terminado; conexión al escritor pendiente |
| 62: registro/consulta/cancelación de intenciones en Auth | Terminado; extendido por el punto 63 |
| 63: aplicación idempotente de identidad y resultado en Auth | Terminado; base de coordinación en 64, activación pendiente |
| 64: intención durable y reconciliación de recibos Auth desde RUND | Terminado; contexto/commit nativo en 65, activación pendiente |
| 65: contexto durable y confirmación del commit nativo RUND | Terminado; ejecución reanudable en 66, compensación/activación pendientes |
| 66: ejecución reanudable y exclusión aborto/commit nativo | Terminado; cancelación no aplicada en 67, compensación/activación pendientes |
| 67: resolución de abortos no aplicados y prueba interna | Terminado; compensación Auth de ediciones en 68, conciliación RUND/altas pendientes |
| 68: efectos privados y compensación Auth de ediciones existentes | Terminado; conciliación RUND en 69, altas/revisiones explícitas pendientes; sin activación |
| 69: conciliación durable de compensación propietaria en RUND | Terminado; bandeja/asignación en 70, cierre humano y entradas reales pendientes; sin activación |
| 70: casos durables, bandeja y asignación de revisiones | Terminado; política/cierre de altas y conexión a entradas reales pendientes; sin activación |
| 71: intención estable por actor/solicitud de creación manual | Preparación terminada; conexión autenticada/prevalidación y otros canales pendientes; sin activación |
| 72: entrada manual protegida con captura durable y prevalidación Auth | Preparación terminada; cliente/ejecución y otros canales pendientes; sin activación |
| 73: ejecución manual autorizada y cliente con solicitud estable | Preparación terminada; montaje del cliente, correo/cierre de revisiones y otros canales pendientes; sin activación |
| 74: conexión opcional del formulario y ciclo visual recuperable | Preparación terminada; principal de sesión, revisión de captura, abandono seguro y requisitos de activación pendientes; flujo activo conservado |
| 75: revisión autorizada de captura y confirmación visual | Preparación terminada; corrección/abandono seguros, principal del shell y demás requisitos de activación pendientes; sin activación |
| 76: abandono previo al journal y corrección con nuevo UUID | Preparación terminada; cierre de operaciones ya reservadas y demás requisitos de activación pendientes; sin activación |
| 77: cierre autenticado de solicitudes reservadas | Preparación terminada; principal del shell, correo/política de altas y demás requisitos de activación pendientes; sin activación |
| 78: principal autenticado del operador shell/MFE | Preparación terminada y probada sin caché offline ni suplencia de persona; cliente manual y módulo backend sin activar |
| 79: aviso de correo durable e intento controlado | Preparación local del outbox y consumidor opcional; consulta por actor, conciliación, política de credenciales y activación pendientes |
| 80: consulta de correo por actor y estado visual | Preparación local de lectura autorizada y formulario opcional; destinatario/credenciales, conciliación y activación pendientes |
| Otras lecturas/escrituras de identidad y permisos | Pendiente de aislamiento |
| Aceptación de configuración/datos/despliegues por ambiente | Pendiente operativo |

Cada corte terminado tiene su evidencia y alcance en la sección correspondiente.
La validación local no certifica que esté desplegado; la dependencia funcional entre
servicios por API se conserva cuando cada uno consulta datos de su propietario.

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

Mapa concreto de lo que falta y criterios de cierre:
[PENDIENTES-CIERRE-INDEPENDENCIA.md](PENDIENTES-CIERRE-INDEPENDENCIA.md).

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
  common/                # text-sanitizer, require-env, catálogos territoriales/CETAP, cliente de identidad Auth
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
`facultad`) se sigue leyendo de `academic_work_plan`. Persisten dependencias con `auth.*`;
dos lecturas de identidad pasan a la API de Auth en la sección 41. Esto no aísla todavía
las altas, la carga masiva, los permisos ni todos los catálogos.
La sección 42 retira los JOIN de catálogos de `InternalRundService`; sus consultas SQL
quedan en `rund`. Otros servicios del banco todavía acceden a los esquemas externos.

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

En la sección 41 se sustituyen por API dos lecturas directas de identidad de RUND sobre
Auth (documento y alias de usuario/persona). La selección de perfiles y sus estados
permanece en RUND. Las demás lecturas/escrituras y catálogos entre esquemas siguen pendientes.
La sección 42 separa además el nombre territorial del perfil y la cobertura del backoffice,
conservando código PTA e ID Auth como claves diferentes. No cambia los catálogos públicos de PTA.

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

## 38. Paso 12.5d.2: confirmación de originales y auditoría Auth → RUND (2026-10-14)

Se retoma desde el merge `63b9fc07a`. Antes de la aceptación operativa se revisa el
contrato del cliente interno incorporado por el remoto: la comprobación de originales
convertía una respuesta incompleta en `false`, y el registro de acceso aceptaba un
HTTP exitoso sin confirmar que RUND hubiera guardado la marca permanente.

### Ajuste y conservación de funcionalidad

`auth-service/.../carpeta-digital/rund-client.ts` exige ahora un booleano explícito
en `esOriginalRund` y `registrado: true` en la confirmación de auditoría. Un cuerpo
vacío, un campo ausente, `data: null`, tipos incorrectos, JSON inválido o una envoltura
con `success: false` producen `ServiceUnavailableException`. El detalle privado del
error de parseo no se incluye en la respuesta.

En el acceso HTTP, una verificación incompleta retorna 503 sin llegar al servidor de
archivos. Al retirar un documento, una auditoría sin confirmación interrumpe la
operación antes del DELETE; no se intenta registrar el acceso en PTA como alternativa.
El cliente hace una sola petición en estos casos.

Se conservan las respuestas válidas directas o envueltas en `data`. Un `false` real
permite el adjunto general; un `true` conserva la comprobación de sesión/rol y auditoría
previa al original. No cambian rutas, banderas, selección de propietario/período,
persistencia, SQL ni credenciales. Las comprobaciones históricas de originales y sus
marcas permanentes continúan vigentes.

### Comprobaciones y siguiente punto

- Se añadieron **20 pruebas de regresión** sobre contrato y recorrido documental.
  Antes de corregir el cliente, **18 fallaron**, reproduciendo la aceptación indebida
  y el error JSON sin normalizar; después pasan las **13 suites / 135 tests** de Auth.
- Compilación de Auth correcta. Se repite la integración completa RUND/Auth con
  PostgreSQL temporal y los clientes compilados de Auth, PTA y Programación: **127
  comprobaciones correctas**, conservando historial, concurrencia, permisos y originales.
- Evidencia de este ajuste: [validacion-contrato-auth-rund.json](validacion-contrato-auth-rund.json).
  Los reportes del primer corte y del merge son evidencia histórica de sus respectivos
  estados, no se regeneran como si describieran las fuentes posteriores.

No se accedió a bases existentes, archivos `.env` reales ni ambientes remotos; no se
ejecutaron migraciones operativas, copias de datos, despliegues o push. Este ajuste
cierra una condición de aceptación del cliente, **no la aceptación del ambiente**.

Continúa **12.5d.2**: comprobar configuración/red/token, esquema/datos y recorridos en
las instalaciones cuando se disponga de sus accesos. El próximo ajuste de código que
puede revisarse sin esos accesos es la validación de respuestas de los nuevos clientes
PTA/Programación, para que datos incompletos no se interpreten como identidad, situación
o cupos válidos. El conteo se mantiene en **11 pasos principales completados localmente,
paso 12 en curso y 5 frentes restantes incluyendo el actual**.

## 39. Paso 12.5d.2: contratos PTA/Programación y conservación de copias (2026-10-14)

Se continúa después de la confirmación documental de Auth de la sección 38. Los
clientes de PTA y Programación incorporados por el merge aceptaban cualquier JSON
con HTTP exitoso. Una respuesta incompleta podía tratarse como un perfil confirmado;
además, `jsonb_populate_record` convierte columnas ausentes en NULL al actualizar
la copia PTA, con riesgo de perder valores locales.

### Contratos y compatibilidad

- Los dos clientes comprueban ID textual del perfil, UUID de persona canónica,
  correspondencia con el documento solicitado y presencia/tipo de los campos que
  consumen. Exigen horas numéricas finitas y no negativas y fechas válidas o nulas.
  Se mantienen horas numéricas como texto, cero, nulos explícitos y respuestas
  directas o envueltas en `data`. No cambian topes ni clasificadores de situación.
- Un JSON inválido, `data: null`, un error de negocio con HTTP 200, otro documento
  o campos esenciales ausentes producen 503 sin repetir la llamada ni consultar
  el SQL de otro propietario. Los detalles privados de parseo no salen al consumidor.
- PTA valida estructura y límite de páginas, identidad de filas, duplicados y
  coherencia del cursor. Un ciclo de cursores detiene el worker y libera su bloqueo.
  No se impone orden lexicográfico de JavaScript a IDs ordenados por PostgreSQL.
- Al resolver una copia puntual, se comprueba la identidad y, si se pidió período,
  su coincidencia exacta. Si el servidor responde otro período como preferencia
  alternativa, el cliente falla con 503 en lugar de copiarlo al período solicitado.
  El 404 real conserva su significado de ausencia (`null` solo en `resolver`).
- La consulta de validación documental exige identidad, completitud y estados con
  sus campos identificados; un listado ausente/vacío o campos duplicados no se
  anuncia como validación confirmada. Esta comprobación no cambia las reglas de
  aprobación de PTA ante indisponibilidad ni certifica que estén todos los requisitos
  documentales posibles; esa revisión del proveedor sigue pendiente.
- Antes del INSERT/UPDATE de la copia, se exige que la fila traiga todas las columnas
  locales. Si divergen los esquemas o falta un valor, se informa el fallo y se conserva
  la fila; no se rellenan columnas con NULL. Los NULL explícitos siguen siendo válidos
  según las restricciones de la tabla. Se conserva el ID local cuando una fila de la
  misma persona/período ya existe y tiene planes que la referencian.

El campo de investigación conserva su texto del propietario; aquí no se reinterpreta
como horas ni se cambia su regla de negocio. La sincronización programada mantiene
su activación explícita, apagada por defecto. Un fallo en una página posterior no
revierte páginas válidas ya copiadas: el worker conserva su comportamiento incremental.

### Verificación y alcance

- PTA: **87 suites / 830 tests** correctos; Programación: **14 / 112** correctos.
  Se añaden **66 pruebas** respecto al merge: respuestas incompletas, identidad,
  situación, horas, fechas, páginas, períodos, copias y compatibilidad de valores.
  Los canarios que dependen de bases instaladas se ejecutan con conexión dirigida
  a un puerto local cerrado; su omisión prevista no certifica datos de los ambientes.
- Compilaciones de ambos servicios correctas.
- **131 comprobaciones** de integración RUND/Auth correctas con PostgreSQL temporal,
  incluidos los clientes compilados de Auth/PTA/Programación. Cuatro nuevas comprueban
  HTTP y SQL reales de la copia PTA: preservación del ID local, rechazo de respuesta
  parcial sin borrar columnas, rechazo de período/página incorrectos y NULL explícito.
  Se conserva la protección de originales/historial del paso anterior.
- `scripts/verify-rund-consumer-copies.cjs` se invoca desde el verificador temporal;
  crea una base ficticia separada dentro del mismo clúster, que se elimina al terminar.
  No carga `.env` ni migra una base instalada. Evidencia:
  [validacion-contratos-consumidores-rund.json](validacion-contratos-consumidores-rund.json).

Los cambios anteriores de Auth permanecen intactos. No se ejecutaron copias operativas,
activaciones, despliegues ni push. Este punto valida contratos locales y conservación
de datos ficticios; no cierra la aceptación de las instalaciones.

Continúa **12.5d.2** y la revisión de dependencias de 9.2. El siguiente punto de código
es revisar en RUND la resolución por período y la integridad de los estados documentales
que publica a estos consumidores; las dependencias SQL con Auth/PTA y la aceptación
operativa siguen abiertas. Se mantienen **11 pasos principales completados localmente,
paso 12 en curso y 5 frentes restantes incluido el actual**.

## 40. Paso 12.5d.2: período exacto y catálogo documental del proveedor RUND (2026-10-14)

Se continúa desde los contratos de consumidores de la sección 39. Se corrigen dos
causas en el proveedor: la resolución interna usaba el período como preferencia,
permitiendo devolver otro, y la consulta documental solo inicializaba requisitos
si la tabla estaba vacía. Un perfil con pocos campos aceptados podía anunciar 100%.

### Resolución y compatibilidad de identidad

`InternalRundService.docentePorClave` filtra por el período solicitado: si no existe
una fila correspondiente, responde **404**; no sustituye otro semestre. Sin período
se conserva la selección anterior. Los clientes PTA existentes interpretan ese 404
como ausencia explícita y no copian una fila ajena al período pedido.

Para consultar estados, un ID de perfil explícito tiene prioridad. Se mantienen
los alias de persona/usuario cuando identifican un solo perfil; con varios perfiles
responden **409**, antes de leer/inicializar estados, para exigir el ID concreto.
Se conservan IDs textuales y UUID de persona en sus formatos admitidos por PostgreSQL.
Un fallo SQL al resolver la identidad en Auth produce 503, no un 404 engañoso.

### Catálogo único y decisiones persistidas

La integración real confirmó una divergencia previa: la carga de docentes usaba
**36 campos**, pero la consulta documental y las altas desde Auth usaban un catálogo
antiguo de 24. Se centraliza el catálogo en `rund-document-fields.ts`, compartido por
los tres recorridos. Sus **36 nombres, tipos y orden coinciden exactamente** con los
que ya inicializaba la carga del banco; no se cambia el catálogo del RUND embebido PTA.

La consulta de estados añade únicamente los requisitos faltantes, en una sola
sentencia con `ON CONFLICT DO NOTHING`. Conserva IDs, aprobaciones, `No aplica`,
observaciones, fechas, actores y campos adicionales históricos. Si falla la sentencia,
no deja una parte de los campos nuevos insertada. Una consulta con catálogo completo
no escribe. Si no puede confirmar todos los campos o encuentra estados duplicados/
inválidos, falla explícitamente en lugar de publicar una completitud engañosa.

El porcentaje usa los 36 requisitos conocidos: un catálogo histórico de 24 aceptados
se completa con 12 `Sin cargar` y muestra **67%**, conservando sus decisiones; un único
requisito aceptado muestra **3%**. Los campos adicionales se devuelven, pero no inflan
ese porcentaje. `No aplica` conserva la regla previa: no equivale a `Aceptado` en este
cálculo. La completitud no sustituye las reglas de aprobación por bloque ni las de PTA.

La inicialización de faltantes sucede al consultar estados. No se ejecuta un barrido
ni una migración sobre registros instalados desde este equipo. La sincronización desde
Auth sigue creando exclusivamente perfiles nuevos y no altera los estados ya existentes.

### Verificación y pendientes

- RUND: **44 suites / 540 tests** correctos, nueve regresiones nuevas; build correcto.
  La prueba de sincronización Auth vuelve a pasar por separado (**26 tests**).
- **138 comprobaciones** correctas con PostgreSQL temporal y HTTP real: siete nuevas
  cubren período ausente, alias ambiguos, perfiles exactos, fallo atómico, catálogo
  parcial, inicialización concurrente e idempotencia con conservación de metadatos.
- Se mantienen las verificaciones de los clientes compilados de Auth/PTA/Programación,
  originales, copias e historial. El fixture de proyección parte del catálogo completo
  y conserva la igualdad estricta de todas las filas nativas antes/después de sincronizar;
  ya no considera un único requisito aceptado como 100%.
- Los archivos TypeScript de los ajustes previos de Auth/PTA/Programación conservan
  sus hashes. Evidencia: [validacion-proveedor-rund.json](validacion-proveedor-rund.json),
  junto con los reportes temporales de integración regenerados.

No se consultaron bases instaladas, `.env` reales ni destinos remotos; no se aplicaron
migraciones operativas, copias de datos, activaciones, despliegues ni push. Las pruebas
temporales no certifican las instalaciones de local/DEV/QA/PRE/PROD.

Continúan **12.5d.2** y las dependencias de 9.2: aceptación por ambiente, configuración/
datos y aislamiento de las consultas de identidad y catálogos con Auth/PTA. El conteo
permanece en **11 pasos principales completados localmente, paso 12 en curso y 5 frentes
restantes contando el actual**. No se retira el RUND original de PTA.

## 41. Paso 12.5d.2: dos lecturas de identidad RUND → Auth por API (2026-10-14)

Se continúa el aislamiento de propietarios después de revisar los contratos y el
catálogo documental de las secciones 38–40. Se sustituyen **dos lecturas directas**:
la búsqueda de persona por documento del perfil interno y la resolución del alias
de usuario/persona de la consulta de estados documentales. Auth consulta sus tablas;
RUND conserva la selección y los datos de sus perfiles. Este punto no elimina todavía
todas las dependencias SQL de RUND.

### Contrato y conservación de flujos

Auth publica dos GET internos, protegidos por `INTERNAL_SERVICE_TOKEN`:

- `/internal/rund/v1/personas/por-documento/:documento`: devuelve únicamente
  `personaId`, `documento` y `nombreCompleto` (nullable, como en la consulta anterior).
- `/internal/rund/v1/personas/resolver/:clave`: devuelve únicamente `personaId`,
  al resolver el ID de persona o de usuario persistido en Auth.

No se exige usuario activo ni rol para identificar a una persona histórica; no se
modifican personas, usuarios ni perfiles. Las consultas son parametrizadas. Una
identidad ausente devuelve 404; un documento duplicado devuelve conflicto y no elige
una persona arbitraria. Se envía `Cache-Control: private, no-store`.

`@Public` omite exclusivamente el JWT global de Auth: el guard propio exige el token
interno. Sin credencial configurada falla cerrado; no acepta `JWT_SECRET` como reemplazo.
El gateway bloquea ambas rutas internas incluso cuando recibe JWT y token de servicio.

RUND usa `AuthIdentityClient`, con plazo de 10 segundos, sin seguir redirecciones ni
reenviar cookies/JWT. Valida UUID, documento solicitado, nombre y sobre de respuesta.
Una respuesta parcial, un error de transporte o un rechazo de Auth producen **503**;
no ejecuta una consulta SQL alternativa sobre tablas de Auth. El 404 conserva ausencia.

La búsqueda por documento conserva el DTO para PTA/Programación y el criterio anterior
por `updatedAt` para seleccionar el perfil. Se mantiene la consulta territorial existente.
Los ID de perfil explícitos y los alias de persona que se resuelven dentro de RUND no
necesitan esta llamada a Auth. Los alias ambiguos entre períodos siguen devolviendo 409;
la resolución por período y el catálogo de 36 requisitos de la sección 40 se conservan.

### Despliegue y configuración

Para publicar este corte en cada ambiente, desplegar **primero Auth con esta API** y
comprobar su contrato interno; después desplegar RUND. RUND requiere `AUTH_SERVICE_URL`
con la URL interna directa de Auth y `AUTH_INTERNAL_SERVICE_TOKEN` coincidente con
`INTERNAL_SERVICE_TOKEN` de Auth. Si no se define el token específico de RUND, usa su
`INTERNAL_SERVICE_TOKEN` explícito, que debe coincidir. Nunca deriva el token del JWT.
Se aclara en los `.env.example`; no se modifican archivos `.env` reales.

Esta dependencia HTTP se utiliza al consultar esos dos recorridos: no está ligada a
las banderas de proyección de Carpeta Digital. Un Auth antiguo sin estas rutas no es
compatible con el nuevo RUND para esas consultas. Antes de reemplazar Auth por una
versión anterior, restaurar primero una versión compatible de RUND. Las demás
integraciones mantienen sus banderas y configuración actuales.

### Verificación y pendientes

- Auth: **14 suites / 152 tests**; RUND: **45 / 570**, todos correctos; builds de ambos
  correctos. Se agregan **47 pruebas** respecto al punto anterior: 17 de Auth y 30 de RUND.
- **144 comprobaciones** correctas con PostgreSQL temporal: seis nuevas verifican
  token obligatorio, DTO mínimo/sin caché, resolución/ausencia de alias, identidad sin
  cuenta activa ni rol, fallo de Auth sin modificar estados y disponibilidad del perfil
  explícito durante la caída/recuperación. Se mantienen los clientes compilados de
  Auth/PTA/Programación, originales, versiones, auditoría y copias PTA.
- El fixture ejecuta controlador, guard, servicio e interceptor compilados de Auth,
  con su guard JWT global y una conexión PostgreSQL en modo de solo lectura. No arranca
  el AppModule completo de Auth. RUND sí arranca desde su `dist/main.js` real.
- Gateway: **10 comprobaciones HTTP** correctas; se amplía el bloqueo existente a
  las rutas de identidad, incluida una variante con `internal` codificado.
- Evidencia: [validacion-identidad-auth-rund.json](validacion-identidad-auth-rund.json),
  junto a los reportes temporales de integración regenerados. Se verifican los hashes
  de los diez archivos TypeScript de los contratos previos de consumidores sin cambios.

No se aplican migraciones ni copias en bases instaladas, no se activan funciones,
no se despliega ni se hace push. La validación temporal no certifica local/DEV/QA/PRE/PROD.

Continúa **12.5d.2**, con **11 pasos principales completados localmente, paso 12 en curso
y 5 frentes restantes incluido el actual**. El siguiente corte de aislamiento es revisar
los catálogos territoriales y sus consultas en el perfil/estadísticas. También siguen
pendientes las altas/carga masiva sobre Auth, los permisos, otras dependencias de PTA
y la aceptación por ambiente. El RUND embebido en PTA permanece disponible.

## 42. Paso 12.5d.2: catálogos del perfil y cobertura territorial por API (2026-10-14)

Se sustituyen los dos JOIN de catálogos que quedaban en `InternalRundService`:
`academic_work_plan.direccion_territorial` para el perfil y `auth.seccionales` para
la cobertura del backoffice. Este servicio consulta ahora únicamente tablas RUND
por SQL; los propietarios publican sus catálogos mediante API interna de solo lectura.
Persisten dependencias externas en otros servicios de RUND.

### Claves y comportamiento conservados

Son catálogos distintos; no se unifican ni se sustituyen entre sí:

- **PTA**: `GET /internal/rund/v1/catalogos/territoriales`, con filas `{ codigo, nombre }`.
  El perfil conserva la búsqueda por código exacto, incluidos ceros iniciales y texto
  original. Incluye registros inactivos o con baja lógica, como el JOIN anterior.
  Si el catálogo confirmado no contiene el código, `territorialNombre` sigue siendo null.
- **Auth**: `GET /internal/rund/v1/catalogos/seccionales`, con filas `{ id, nombre }`.
  El ID bigint se transmite como texto, sin convertirlo a Number. La cobertura sigue
  enlazando el `territorialId` con este ID, no con el código de PTA o `cod_seccional`.
  RUND agrupa en PostgreSQL usando parámetros `unnest`, preservando nombres homónimos,
  totales y distribución con/sin CETAP del SQL anterior. No persiste una copia del catálogo.

Ambos endpoints devuelven `{ items, total }` completo, sin paginación, y
`Cache-Control: private, no-store` (Auth conserva su sobre global de respuesta).
Los guards exigen `INTERNAL_SERVICE_TOKEN`; `@Public` omite solo el JWT global,
no esa credencial. El gateway bloquea las rutas normales y codificadas de catálogo.
No se modifican las rutas públicas de catálogos, sus filtros por período/actividad,
el RUND embebido ni sus reglas de carga o permisos.

El cliente RUND verifica filas, tipos, claves duplicadas y total completo. Tiene
plazo de 10 segundos, no sigue redirecciones ni reenvía cookies/JWT. Catálogo vacío
confirmado es válido; HTTP 404 significa API ausente, no catálogo vacío. Un fallo,
respuesta parcial o rechazo del propietario devuelve **503** desde el endpoint RUND,
sin consultar SQL del otro propietario. Para cobertura esto sustituye el anterior
silencio ante error de la consulta externa, que podía anunciar un listado vacío.
La tolerancia existente de los agregados SQL nativos no se modifica.

### Configuración y publicación

Publicar primero **Auth y PTA con sus APIs de catálogo** y comprobar los contratos
internos; después RUND. El orden entre Auth y PTA es indistinto para este corte.
Mantenerlos disponibles mientras RUND use estas APIs. Para volver a versiones de los
propietarios sin las rutas nuevas, restaurar primero un RUND compatible.

RUND utiliza `AUTH_SERVICE_URL` y `AUTH_INTERNAL_SERVICE_TOKEN` como en la sección 41.
Para PTA añade `ACADEMIC_WORK_PLAN_SERVICE_URL` (URL interna directa, no gateway)
y `PTA_INTERNAL_SERVICE_TOKEN`, que debe coincidir con `INTERNAL_SERVICE_TOKEN` de PTA.
Si se omite el token específico, utiliza su `INTERNAL_SERVICE_TOKEN` explícito;
no utiliza `JWT_SECRET`. No depende de las banderas de proyección de Carpeta Digital.

Se añaden URL/token PTA en los seis Compose base de backend, general, DEV, QA, PRE
y PROD; local los hereda de DEV. Se comprueba estáticamente la herencia de local y los
cuatro overlays GHCR: **11 combinaciones**. Esta revisión solo valida los valores y la
herencia de URL/token del catálogo; no ejecuta ni certifica Docker Compose completo.
Se aclaran los tres `.env.example`; no se leen ni modifican `.env` reales.

### Verificación y siguiente corte

- Builds de Auth, PTA y RUND correctos. Auth: **15 suites / 154 tests**; PTA:
  **88 / 841**; RUND: **46 / 609**, todos correctos. Se agregan **52 pruebas** respecto
  al punto anterior: 2 en Auth, 11 en PTA y 39 en RUND. Los canarios de PTA que dependen
  de bases instaladas se dirigen a un puerto local cerrado y toman su salida prevista;
  no certifican los datos de las instalaciones.
- **151 comprobaciones** correctas con PostgreSQL temporal: siete nuevas comprueban
  credenciales, DTO completo/sin caché, código PTA histórico con ceros, IDs bigint Auth,
  nombres homónimos y conteos CETAP comparados con el SQL anterior, indisponibilidad,
  respuesta parcial y recuperación. Perfiles ficticios se comparan antes/después de
  los fallos. Se conserva el NOT NULL territorial del esquema; no se relaja para pruebas.
- Controladores, guards y servicios compilados de Auth/PTA se ejecutan por HTTP con
  conexión de solo lectura sobre datos temporales; no se arrancan sus AppModules.
  RUND se ejecuta desde su main real. Se mantienen las verificaciones anteriores
  de identidad, versiones, proyecciones, originales, auditoría, copias y clientes compilados.
- Gateway: **10 comprobaciones HTTP** correctas, ampliando las rutas internas bloqueadas.
  Configuración: `node scripts/verify-rund-catalogos-config.cjs`, **11 combinaciones**.
- Evidencias: [validacion-catalogos-rund.json](validacion-catalogos-rund.json) y
  [validacion-configuracion-catalogos-rund.json](validacion-configuracion-catalogos-rund.json),
  más los reportes temporales regenerados. Se conservan los diez archivos TypeScript
  de contratos previos de consumidores y los seis del núcleo de identidad/validación
  de la sección 41, verificados por hash.

No se aplican migraciones ni copias operativas, no se activan integraciones ni se
despliega o hace push. Las validaciones locales no certifican local/DEV/QA/PRE/PROD.

Continúa **12.5d.2**: **11 pasos principales completados localmente, paso 12 en curso
y 5 frentes pendientes contando el actual**. El siguiente corte es revisar el catálogo
que usa `BancoDocentesService.getTerritoriales` para carga/edición, preservando sus IDs,
reglas de búsqueda y tratamiento de históricos. Siguen pendientes altas/sincronización,
permisos, otros accesos SQL entre propietarios y aceptación operativa por ambiente.

## 43. Paso 12.5d.2: catálogo de carga/edición del banco y rollback de bloques (2026-10-14)

`BancoDocentesService.getTerritoriales` deja de consultar `auth.seccionales` por SQL.
Auth publica `GET /internal/rund/v1/catalogos/territoriales-banco`, con las tres
columnas que usaba el banco: `{ id, nombre, codigo }`, en `ORDER BY nom_seccional ASC`.
Se conserva el ID bigint como texto, el código nullable y el orden del propietario;
no se filtran históricos. Los endpoints anteriores de seccionales y territoriales
mantienen sus contratos. La API nueva usa el guard interno de Auth y cabecera sin caché;
el gateway impide publicarla aun con JWT y token de servicio.

### Carga, edición y autogestión

El cliente comprueba las tres columnas, total completo e IDs únicos; un código ausente
no se interpreta como null. Permite códigos o nombres compartidos por IDs distintos,
igual que la tabla original. Conserva el plazo de 10 segundos, sin redirecciones ni
credenciales de usuario. Ante fallo/contrato parcial devuelve 503, sin SQL alternativo.

La carga obtiene **un solo snapshot por lote no vacío**, antes de guardar el soporte
o abrir transacciones. Las filas usan ese snapshot interno, sin caché entre peticiones
ni aceptar un catálogo del body. Una caída de Auth detiene la operación completa antes
de escribir; ya no se presenta como errores de datos fila por fila con un soporte guardado.
Las reglas de errores reales de filas, duplicados, previsualización y carga incremental
se mantienen. La edición obtiene el catálogo antes de bloquear sugerencias/abrir su
transacción y conserva la segunda comprobación del soporte dentro del guardado.

Se mantienen las reglas de resolución existentes:

- Nombre exacto normalizado, alias y coincidencia parcial; `NORTESANTANDER` conserva
  su caso específico y no selecciona Santander.
- Manual: territorial desconocida se rechaza. Masivo: conserva el texto original y
  la asignación previa si existe; no inventa Sede Central para un nombre desconocido.
- Autogestión: mantiene su preferencia por Sede Central, o la primera territorial del
  catálogo, solo cuando el propietario confirmó ese catálogo. Un fallo no activa ese reemplazo.
- Editar otros campos conserva la territorial operativa cuando no cambia la reportada.
  La tarjeta mantiene la prioridad del texto reportado y su degradación anterior a null
  si falla la consulta del nombre informativo; no intenta un SQL alternativo.

### Dos defectos previos detectados con integración ampliada

La comparación completa de la previsualización detectó que `inicializarBloques` usaba
la conexión global, fuera de la transacción del perfil. Podía dejar `RundCampoEstado`
guardados aunque se revirtieran la persona y el docente. El alta pasa ahora su manager
a la inicialización: los seis bloques se confirman/revierten junto al perfil, también
ante error y rollback por fila. `getBloques` conserva su inicialización predeterminada.
La auditoría de lectura del resultado de previsualización sigue registrándose como antes;
no es parte del rollback de datos. Las secuencias pueden avanzar durante previsualizaciones.
No se ejecuta limpieza de posibles registros anteriores en bases instaladas.

La carga real con ID `9007199254740993` detectó otra conversión previa: `Number(id)`
redondeaba el ID antes de escribir la FK de la persona. Se transmite como texto a
PostgreSQL, tanto en persona como en perfil. Los códigos como `001` no sustituyen al ID.

### Verificación y publicación

- Builds de Auth y RUND correctos. Auth: **15 suites / 156 tests**; RUND:
  **47 / 637**, correctos. Se agregan **30 pruebas** respecto al punto anterior:
  2 de Auth y 28 de RUND, además de adaptar los fixtures a la dependencia inyectada.
- **159 comprobaciones** correctas con PostgreSQL temporal y HTTP real: ocho nuevas
  verifican contrato/credencial/orden, snapshot único multirregistro, igualdad de datos
  antes/después de previsualizar, fallos de Auth y edición, fallo forzado al inicializar
  bloques, vacío confirmado, carga real con alias/ID bigint y reimportación conservando
  asignación y decisiones documentales. Se mantienen las verificaciones anteriores
  de Auth/PTA/Programación, versiones, proyecciones, permisos y auditoría.
- Gateway: **10 comprobaciones HTTP** correctas, incluyendo la nueva ruta bloqueada.
  Las configuraciones del corte anterior siguen sin cambios funcionales; no se añaden
  variables, migraciones ni banderas de activación.
- Evidencia: [validacion-catalogo-banco-rund.json](validacion-catalogo-banco-rund.json)
  y reportes temporales regenerados. Los diez archivos TypeScript de contratos de
  consumidores y los seis del núcleo de identidad/validación conservan sus hashes.

Desplegar primero Auth con el endpoint nuevo y comprobar el contrato antes de publicar
este RUND. Se reutilizan `AUTH_SERVICE_URL` y `AUTH_INTERNAL_SERVICE_TOKEN` (o el token
interno explícito común), coincidente con `INTERNAL_SERVICE_TOKEN` de Auth. También
siguen vigentes las APIs de PTA y el orden de publicación de la sección 42. Para retirar
esta API de Auth, restaurar antes un RUND compatible. No se cambian `.env` reales.

Continúa **12.5d.2**: **11 pasos principales completados localmente, paso 12 en curso
y 5 frentes pendientes incluido el actual**. El siguiente corte es revisar la consulta
del período activo que la carga masiva todavía hace directamente a PTA. Siguen abiertas
las altas/actualizaciones de identidad, permisos y demás lecturas SQL entre propietarios,
así como la aceptación por ambiente. El RUND embebido en PTA sigue disponible.

No se consultan ni modifican bases instaladas, no se copian datos operativos ni se
activa, despliega o hace push. Las pruebas temporales no certifican local/DEV/QA/PRE/PROD.

## 44. Paso 12.5d.2: período activo de carga masiva por API PTA (2026-10-14)

`BancoDocentesService.bulkUpsert` deja de leer directamente
`academic_work_plan.periodo_academico`. PTA publica
`GET /internal/rund/v1/catalogos/periodo-activo`, de solo lectura, protegido con
`INTERNAL_SERVICE_TOKEN` y `Cache-Control: private, no-store`. Devuelve
`{ items: [{ codigo, estado: 'en_curso' }], total: 1 }`, o lista vacía y total 0
si no existe un período en curso. No crea un período por defecto, no elige uno
por fecha y no utiliza la ruta pública de períodos, que puede inicializar datos.
La ruta pública y las reglas de administración de períodos de PTA se conservan.

### Prioridad de períodos y dependencia necesaria

Se mantiene la prioridad que ya tenía la carga:

1. El período que trae la fila en `PERIODO_CARGA`, `periodoCarga` o `periodo_carga`.
2. El período general de la operación, que solo completa las filas sin período.
3. El período activo de PTA, únicamente si todavía faltan períodos y no hay valor general.

El controlador mantiene la lectura actual del período general desde la consulta o
el archivo XLSX; no se cambia la interpretación de encabezados ni sus alias. No se
fuerza que un período explícito sea el activo ni que exista en el catálogo de PTA;
se conservan los períodos históricos y la validación previa de las filas. Tampoco se
modifica el formato estricto de período que exige el canal manual.

RUND pide el activo **una sola vez por lote que lo necesite**, antes de consultar el
catálogo Auth, guardar el soporte o iniciar transacciones. Si todas las filas tienen
período, o se indica un valor general, no necesita esta API de PTA. Un lote vacío
tampoco la consulta. Se trabaja sobre copias y no se modifica el objeto de filas recibido.
La exigencia del soporte de carga definitiva se valida antes de solicitar datos externos.

La ausencia confirmada conserva el comportamiento anterior: no rellena un período y
la validación informa `PERIODO_CARGA` en las filas que lo necesiten. Un error HTTP,
404 de ruta ausente, respuesta incompleta, código inválido o estado distinto de
`en_curso` producen **503** antes de escribir; no se convierten en ausencia ni habilitan
SQL alternativo. El cliente admite códigos históricos de hasta 10 caracteres, según
la columna de PTA, sin reinterpretarlos como fechas; mantiene plazo de 10 segundos,
token interno explícito y prohibición de redirecciones/cookies/JWT de usuario.

PTA exige un único período en curso en su administración. La consulta anterior con
`LIMIT 1` ocultaba una eventual inconsistencia eligiendo cualquiera. La API interna
comprueba hasta dos: si hay varios devuelve **409** y RUND informa **503** cuando
necesita ese valor. Una carga con períodos explícitos sigue sin depender de esta consulta.
No se modifica ni corrige automáticamente la configuración inconsistente del propietario.

### Verificación y publicación

- Builds de PTA y RUND correctos. PTA: **88 suites / 845 tests**; RUND:
  **48 / 661**, correctos. Se agregan **28 pruebas**: 4 de PTA y 24 de RUND.
  Los canarios PTA dependientes de bases instaladas se dirigen a un puerto local cerrado
  y toman la salida prevista de indisponibilidad; no certifican datos de instalaciones.
- **166 comprobaciones** correctas con PostgreSQL temporal y HTTP real. Siete nuevas
  cubren protección y DTO de lectura, persistencia de un lote JSON con períodos distintos,
  previsualización XLSX sin período con rollback de identidad/perfiles/bloques/soportes,
  una sola consulta por lote, caída/ruta ausente/respuesta parcial/estado incorrecto,
  carga con períodos explícitos durante indisponibilidad, ausencia sin sembrar defaults
  y múltiples períodos en curso sin escrituras. Los fixtures de períodos se restauran.
- Gateway: **10 comprobaciones HTTP** correctas; la ruta interna del período se bloquea
  tanto normal como codificada. Se mantienen todos los recorridos anteriores de Auth,
  PTA, Programación, carga/edición, originales, historial, proyecciones y auditoría.
- Se ejecutan el controlador/guard/servicio compilados de PTA con su guard JWT global
  y conexión de solo lectura sobre el clúster temporal; RUND arranca desde su main real.
  El AppModule completo de PTA no se inicia. Auth y los Compose del corte anterior no
  cambian; no se añaden variables ni migraciones.
- Evidencia: [validacion-periodo-activo-rund.json](validacion-periodo-activo-rund.json)
  y reportes temporales regenerados. Se comprueban los hashes sin cambios de los diez
  archivos TypeScript de contratos de consumidores, seis del núcleo de identidad/validación
  y las piezas Auth/configuración del corte anterior.

Desplegar primero **PTA con la nueva API**, comprobar el contrato y después este RUND.
Se reutilizan `ACADEMIC_WORK_PLAN_SERVICE_URL` y `PTA_INTERNAL_SERVICE_TOKEN`, o el
token interno común explícito, coincidente con `INTERNAL_SERVICE_TOKEN` de PTA.
También siguen vigentes las APIs Auth de las secciones 41–43. Antes de retirar esta
API de PTA, restaurar un RUND compatible. No se cambian archivos `.env` reales.

Seguimos en **12.5d.2**, con **11 pasos principales completados localmente, paso 12 en
curso y 5 frentes pendientes incluido el actual**. El siguiente corte es revisar los
JOIN de identidad/seccional de `RundPtaConsultaService`, preservando su contrato público
de consulta del perfil. Siguen pendientes las altas/actualizaciones de identidad,
permisos, otras dependencias SQL y la aceptación operativa por ambiente. El RUND
embebido en PTA permanece disponible.

No se consultan ni modifican bases instaladas, no se copian datos operativos ni se
activa, despliega o hace push. Las pruebas temporales no certifican local/DEV/QA/PRE/PROD.

## 45. Frente 4: identidad del perfil público para PTA por API Auth (2026-10-14)

**Corte técnico terminado localmente.** Se separan los JOIN de `auth.personas` y
`auth.seccionales` de `RundPtaConsultaService`. La selección de perfiles y el registro
de acceso usan únicamente tablas RUND en ese servicio. Los guards de permisos y otros
servicios todavía tienen dependencias SQL con Auth; no se presenta como aislamiento total.

El número histórico del paso 12 agrupaba contratos, aislamiento y aceptación por
ambiente y no reflejaba bien el avance. El resumen ahora distingue **8 cortes técnicos
terminados desde el merge (38–45)**, el trabajo de aislamiento del frente 4 y la
aceptación operativa pendiente de **12.5d.2**. Se mantienen **11 pasos principales
completados localmente, paso 12 operativo abierto y 5 frentes por cerrar**; no se suman
los cortes a los pasos principales ni se estima un porcentaje con ellos.

### Identidad y compatibilidad

Auth añade `GET /internal/rund/v1/personas/perfil-pta/:cedula`, con el mismo guard de
token interno y cabecera `private, no-store`. Devuelve una proyección limitada:
`encontrada`, documento normalizado, UUID de persona, nombre compuesto e ID de su
seccional como texto o null. No consulta ni exige una cuenta de usuario, roles o actividad.
Se mantienen los contratos anteriores `por-documento` y `resolver`.

La normalización conserva la consulta anterior: `BTRIM` y eliminación de puntos en
el documento almacenado, manteniendo ceros iniciales y comparación textual. El nombre
usa `nom_largo` sin espacios externos cuando existe; si está vacío, conserva la misma
composición `CONCAT_WS` de nombres/apellidos. No se agregan datos de contacto o salario.
La cédula de entrada sigue exigiendo entre 1 y 20 dígitos, sin separadores.

La ausencia real se confirma con HTTP 200 y `{ encontrada: false, documento }`.
Así, un 404 porque un Auth anterior no tiene la ruta produce **503 en RUND**, en vez
de sugerir crear un docente duplicado. Un resultado parcial, documento ajeno, UUID/ID
inválido, rechazo o caída de Auth también producen 503, sin SQL alternativo. El cliente
mantiene token explícito, plazo de 10 segundos y prohibición de redirecciones y JWT/cookies
de usuario. Si varias personas comparten el documento normalizado, Auth devuelve **409**
y RUND informa **503**, sin elegir una identidad arbitraria ni corregir registros.

### Contrato público, períodos y auditoría

La ruta pública de interoperabilidad conserva su DTO limitado y sus guards JWT/permisos.
RUND selecciona el perfil con el mismo orden: período solicitado, presencia de `idRund`,
presencia de período, fecha de actualización e ID. Sin período se mantiene esa prioridad;
no se añade filtro por estado, usuario activo o rol del docente. Cero horas e inactivos
se conservan. La ausencia de docente mantiene `RUND_DOCENTE_NO_ENCONTRADO`/`FLUJO_1`;
la falta de registro para el período mantiene `RUND_DOCENTE_SIN_PERIODO`/`flujo_alta: null`.

La territorial del perfil conserva prioridad sobre la seccional de la persona. Solo
una territorial vacía o null usa la de Auth; un ID no vacío desconocido no se sustituye.
El nombre/código se obtienen del catálogo Auth ya separado en la sección 43, no del
código territorial PTA. Los IDs bigint siguen como texto; sin ambas referencias se
devuelven null sin necesitar catálogo. Un catálogo no confirmado bloquea la respuesta.

Se mantiene el registro `RUND_PTA_CONSULTA_PERFIL_V1` como `ENMASCARADO`, incluso para
administradores, y la auditoría de ausencia/período inexistente. No guarda cédula ni
salario. Si no puede auditar, conserva el **503 anterior** e impide entregar datos.
Las consultas del perfil no escriben decisiones, perfiles ni identidades.

### Verificación y publicación

- Builds de Auth y RUND correctos. Auth: **15 suites / 163 tests**; RUND:
  **48 / 681**, correctos. Se agregan **27 pruebas**: 7 de Auth, 15 del cliente de
  identidad y 5 HTTP del perfil, manteniendo las regresiones de los contratos previos.
- **174 comprobaciones** correctas con PostgreSQL temporal y HTTP real: ocho nuevas
  comprueban API protegida sin cuenta de usuario, documento con puntos/ceros, nombre
  compuesto, igualdad del DTO completo con el SQL anterior por período/sin período,
  IDs bigint y territoriales históricas/desconocidas/nulas, errores 404 diferenciados,
  caída/ruta ausente/respuesta parcial, identidad ambigua, recuperación y auditoría
  indisponible. Las filas nativas se comparan antes/después; las escrituras permitidas
  de estas consultas son exclusivamente registros de acceso. Se eliminan los fixtures
  del perfil y el clúster temporal al terminar.
- Gateway: **10 comprobaciones HTTP** correctas; la API Auth nueva se bloquea tanto
  normal como codificada. No se cambia el código del gateway ni el RUND embebido de PTA.
- Se conservan por hash los diez archivos TypeScript de contratos de consumidores,
  la validación documental, el código de carga/período del corte anterior, PTA y Compose.
  Evidencia: [validacion-identidad-perfil-pta-rund.json](validacion-identidad-perfil-pta-rund.json)
  y reportes temporales regenerados.

Publicar primero **Auth con el endpoint nuevo**, comprobar su contrato interno y después
RUND. Se reutilizan `AUTH_SERVICE_URL` y el token interno de Auth; no hay variables ni
migraciones nuevas. Siguen vigentes las dependencias PTA de los cortes anteriores.
Para retirar esta API de Auth, restaurar antes un RUND compatible.

El siguiente corte técnico es revisar la identidad que usa el listado/ficha del banco
(`authDocentesBaseSql`), separando consultas de las escrituras de alta/edición y de la
resolución de permisos. Estas últimas requieren conservar transacciones, roles y
auditoría; siguen pendientes junto con los consumidores/aceptación de los cinco frentes.
No se consultan o modifican bases instaladas ni `.env` reales; no se despliega, activa,
copia información operativa o hace push. La validación temporal no certifica los ambientes.

## 46. Frente 4: identidad del listado, ficha y estadísticas del banco por API Auth (2026-10-14)

Se completa el corte anunciado en 45: `authDocentesBaseSql` y el filtro territorial
del banco dejan de leer tablas de Auth desde RUND. El listado, `getById` y `getStats`
combinan una proyección interna del propietario con `rund."Docente"`. Las escrituras
de alta/edición, la carga masiva, sincronización y el mapeador público se conservan.
No cambia el controlador público ni los guards.

**Contrato y ejecución**

- Auth incorpora `GET /internal/rund/v1/banco/proyeccion`, protegido por
  `RundIdentityGuard`, token interno obligatorio y `Cache-Control: private, no-store`.
  `@Public` omite únicamente el JWT de usuario; no permite omitir el token de servicio.
  Se registra el controlador/servicio en `UsersModule`.
- Una sentencia de solo lectura obtiene `version: 1`, docentes, seccionales y sedes,
  con el conteo de cada colección. Devuelve únicamente las columnas de identidad,
  contacto, estado de usuario, fechas, roles y catálogos que utilizaba la consulta;
  excluye contraseñas, tokens, dirección, identificadores auxiliares y campos RUND.
- Conserva elegibilidad por rol activo cuyo código **o nombre** sea DOCENTE,
  asignación activa y semántica `COALESCE(flag,true)`. No exige usuario activo:
  una cuenta inactiva con rol vigente conserva sus perfiles históricos. Los usuarios
  docentes sin perfil RUND siguen presentes; una persona sin usuario queda fuera de
  este banco, como antes. El perfil público PTA de 45 tiene su contrato independiente.
- RUND incorpora `AuthBancoClient`/módulo, reutilizando `AUTH_SERVICE_URL` y los tokens
  específicos/común existentes. Tiene plazo de 10 segundos, no sigue redirecciones,
  no envía credenciales de usuario y valida versión, campos explícitos, tipos,
  IDs bigint textuales, conteos y claves duplicadas antes del SQL.
- Ausencia explícita de las tres colecciones produce listado/estadísticas vacíos y
  ficha 404. Un Auth anterior sin ruta, caída, credencial inválida o respuesta parcial
  produce **503**, sin interpretar el fallo como banco vacío ni consultar Auth por SQL.
- La proyección vive únicamente en la operación: `jsonb_to_recordset($1::jsonb)` la
  convierte en CTEs tipados y la combina con los perfiles nativos. No crea tablas,
  replica identidades ni guarda caché. Los IDs se transportan como texto y se tipan
  como bigint en PostgreSQL, evitando redondeo de JavaScript.
- Se preservan filtros, búsqueda parametrizada, equivalencias territoriales, prioridad
  de texto reportado/catálogos, sedes, estados efectivos, período exacto, alias de
  usuario/persona/documento/ID docente y orden de selección. La paginación se aplica
  después de combinar y filtrar. Conteo y datos usan la misma proyección; las diez
  consultas de estadísticas (resumen y nueve grupos) también la reutilizan.
- Se pasa una copia de los parámetros al conteo para que agregar limit/offset no
  modifique el arreglo de esa consulta. La forma de respuesta, enmascaramiento,
  propiedad y auditoría siguen en el controlador existente. Una escritura fallida
  en `RundAprobacionLog` sigue bloqueando listado/ficha con el error **500** anterior;
  no se entrega la respuesta. Es distinto de la auditoría del perfil PTA de 45.

**Validación local**

- Builds de Auth y RUND correctos. Auth: **16 suites / 166 tests**; RUND:
  **50 / 721**, todos correctos. Se agregan **43 pruebas** (3 Auth y 40 RUND).
  Los fixtures unitarios existentes solo incorporan la nueva dependencia inyectada.
- **186 comprobaciones** correctas con PostgreSQL temporal y HTTP real: doce nuevas
  del banco. Se compara el DTO completo del listado/ficha y los nueve grupos de
  estadísticas contra el CTE anterior congelado en
  `scripts/fixtures/rund-banco-before-api.sql`, junto con expectativas explícitas.
  Esa consulta es referencia exclusiva del verificador, sin uso en ejecución del servicio.
- Incluye documentos con puntos/ceros, fechas y zona horaria, nombres compuestos,
  usuarios inactivos, rol por nombre, exclusiones por rol/asignación, docente sin
  perfil, períodos históricos, IDs territoriales/sedes mayores que `MAX_SAFE_INTEGER`,
  fallos/recuperación de Auth, vacío explícito, ausencia de caché, permisos, propiedad
  y fallos de auditoría. Los escenarios ficticios respetan las restricciones vigentes.
- Prueba específica de aislamiento: un rol temporal con SELECT solo sobre
  `rund."Docente"` no puede consultar `auth.personas`, pero ejecuta listado, ficha
  y estadísticas con resultados iguales a la referencia. La API Auth usa su propia
  conexión de solo lectura. No se afirma que los guards ni el servicio completo
  estén aislados: conservan otras consultas entre esquemas todavía pendientes.
- Gateway: **10 comprobaciones HTTP**, incluyendo el bloqueo de la nueva ruta
  interna normal y codificada. Los contratos de consumidores, validación documental,
  perfil PTA, catálogos y configuración anteriores se verifican por hashes; las
  secciones de escritura, edición, carga masiva y sincronización del banco permanecen
  idénticas al inicio del corte. Evidencia:
  [validacion-identidad-banco-rund.json](validacion-identidad-banco-rund.json).

**Despliegue y límites**

Publicar primero **Auth con la proyección del banco**, verificar su contrato interno y
después RUND. No hay variables ni migraciones nuevas; siguen vigentes los requisitos
Auth/PTA anteriores. Si se retira esta API, restaurar primero un RUND compatible.

La proyección contiene el conjunto completo de identidades docentes necesario para
filtrar por columnas de distintos propietarios; no se pagina en Auth antes de aplicar
los filtros de RUND. Queda pendiente comprobar volumen, latencia y memoria con los
datos de cada instalación. El snapshot de Auth es consistente en su sentencia; las
consultas nativas de conteo/página siguen siendo independientes y no hay transacción
distribuida entre propietarios. Las pruebas ficticias no certifican carga operativa.

Quedan **9 cortes técnicos locales desde el merge**, **11 pasos principales locales**
y **5 frentes abiertos**, incluido aislamiento SQL. El paso 12 conserva la aceptación
operativa pendiente; no se reabre cada corte ya terminado bajo ese rótulo. El siguiente
corte aborda las lecturas puntuales de identidad de autogestión/tarjeta RUND; después
siguen escrituras y permisos. No se tocan bases existentes ni `.env` reales, no se
despliega, hace push o retira el RUND embebido de PTA.

## 47. Frente 4: lecturas de tarjeta/autogestión y resolución de alias por API Auth (2026-10-14)

Se sustituyen cinco lecturas entre propietarios: identidad complementaria del respaldo
de `getAutogestionInfo`, datos personales de `getTarjetaRUND`, dos consultas de
`getTarjetaRUNDByPersona` y el JOIN de resolución de alias de `resolveDocenteId`.
Auth sigue siendo propietario de identidad; los perfiles, períodos, bloques, soportes
y decisiones permanecen en RUND. Las escrituras y la implementación de envío OTP
no se modifican en este corte.

**Contrato y compatibilidad**

- Se agregan tres rutas internas en el controlador de identidad existente:
  `GET /internal/rund/v1/personas/ficha/por-persona/:personaId`,
  `GET /internal/rund/v1/personas/ficha/por-documento/:documento` y
  `GET /internal/rund/v1/personas/por-alias/:clave`. Reutilizan guard, token interno
  obligatorio y `Cache-Control: private, no-store`; no requieren usuario o rol activo
  para una identidad histórica ni se exponen por gateway.
- La ficha incluye exclusivamente UUID, identificación/tipo, nombre completo y sus
  columnas canónicas, género, fecha civil de nacimiento, correo y teléfono. Responde
  `{consulta,encontrada,persona}`: ausencia confirmada es HTTP 200 con `false/null`.
  Por documento mantiene comparación **exacta**, incluidos puntos, ceros y espacios;
  ambigüedad devuelve 409 en Auth y 503 en RUND, sin elegir otra identidad.
- Alias responde `{clave,personaIds,total}` con todas las personas candidatas de la
  consulta anterior (UUID persona/usuario o documento normalizado con BTRIM, sin puntos
  y sin distinción de mayúsculas). No filtra rol ni usuario activo. El período y orden
  por fecha se siguen resolviendo contra `rund."Docente"`, sin JOIN con Auth. Las dos
  rutas rápidas UUID de `resolveDocenteId` conservan prioridad y no requieren la API.
- `AuthIdentityClient` valida estructura, campos explícitos, consulta solicitada,
  correspondencia de documento/UUID, conteos y duplicados. Conserva plazo de 10 segundos,
  rechazo de redirecciones y token de servicio. Un 404 de ruta antigua, caída, error
  de credencial o respuesta parcial produce 503; no confirma ausencia ni usa SQL alternativo.
- Se corrige un defecto del respaldo de autogestión: consultaba `primer_nombre`,
  `segundo_nombre`, `email` y `celular`, inexistentes en el DDL de Auth. Ahora usa
  `nom_tercero`, `pri_apellido`, `seg_apellido`, `dir_email` y `tel_celular` del propietario.
  `nom_tercero` se conserva completo; `segundo_nombre` queda null porque no existe una
  columna separada. Se mantienen la prioridad del nombre completo, correo alternativo,
  vínculo por invitación, sesión OTP, enmascaramiento, auditoría y evidencias.
- El mapeador de tarjeta y selección nativa por período permanecen idénticos. La ausencia
  confirmada de persona conserva los campos nulos/fallback anteriores. **Cambio explícito
  ante fallo:** la tarjeta deja de presentar identidad vacía como resultado válido cuando
  falla Auth; ambas rutas propagan 503. No se confunde la caída con «No es docente RUND».
- Tarjeta por persona conserva la rama de aprovisionamiento y su payload, validación,
  auditoría y llamada a `upsertDocente`, usando identidad confirmada por API. Esto no
  independiza las escrituras de `upsertDocente` ni certifica de nuevo el alta automática.
  También se conservan la inicialización nativa de bloques faltantes y el comportamiento
  previo de errores no relacionados con identidad/auditoría de cada ruta.

**Validación local**

- Builds de Auth y RUND correctos. Auth: **16 suites / 174 tests**; RUND:
  **51 / 759**, todos correctos. Se agregan **46 pruebas** (8 Auth y 38 RUND).
- **197 comprobaciones** correctas con PostgreSQL temporal y HTTP real, once nuevas
  de tarjeta/identidad. Comparan el DTO completo de tarjeta contra las columnas de
  la lectura anterior y la resolución contra
  `scripts/fixtures/rund-resolve-docente-before-api.sql`. Incluyen períodos históricos,
  personas sin usuario, usuarios inactivos, documentos con puntos/ceros/espacios,
  fecha civil, puntaje cero, identidad ausente, documentos ambiguos y alias con varias
  personas candidatas, sin perder la selección del perfil actualizado.
- Autogestión prueba el respaldo corregido sobre el DDL real, sesión válida, enlace
  insuficiente, sesión vencida, contactos, documento/puntaje enmascarados y evidencias.
  Se prueban fallos de ficha/alias, ruta ausente, respuesta parcial, recuperación y
  auditoría fallida sin entregar datos. La auditoría de tarjeta por ID conserva su
  sobre de error previo; la indisponibilidad de identidad sí se propaga como 503.
- Un rol temporal sin SELECT sobre Auth ejecuta tarjeta, autogestión y resolución de
  alias con SQL exclusivo de RUND y APIs del propietario. Esa prueba de lectura omite
  la escritura de auditoría; la auditoría real se prueba por HTTP en otro escenario.
  No certifica los guards ni el servicio completo como independientes de Auth SQL.
- Gateway: **10 comprobaciones HTTP**, incluyendo las tres rutas nuevas normales y
  codificadas. Hashes confirman preservación del bloque de listado/ficha/estadísticas,
  altas/edición/carga masiva, envío OTP, bloques/workflow, sincronización/reparación y
  mapeador de tarjeta, además de consumidores, catálogos y configuración anteriores.
  Los fixtures existentes incorporan la dependencia de identidad; se adapta la expectativa
  de SQL del resolver a la consulta nativa y a los alias obtenidos por API.
- Evidencia: [validacion-identidad-tarjeta-autogestion-rund.json](validacion-identidad-tarjeta-autogestion-rund.json).
  Auth usa el controlador/guard/servicio compilados en conexión de solo lectura, sin
  cargar su AppModule completo. RUND arranca desde su `main` real; se elimina el clúster.

Publicar **Auth con las tres rutas primero y después RUND**. No hay variables ni
migraciones nuevas; se conservan los requisitos Auth/PTA previos. La reversión de
Auth requiere restaurar primero un RUND compatible con las APIs disponibles.

Quedan **10 cortes técnicos locales desde el merge**, **11 pasos principales locales**
y **5 frentes abiertos**, incluido el actual. El próximo corte revisa las lecturas de
cédula confiable/pertenencia de edición y envío OTP, que aún acceden a Auth SQL. También
quedan unicidad/duplicados, vencimientos/reparación, escrituras, permisos y aceptación
operativa por ambiente/volumen. No se ejecutan cambios en bases existentes ni `.env`
reales; no se despliega, hace push o elimina el RUND embebido de PTA.

## 48. Frente 4: cédula confiable y pertenencia en edición/envío OTP por API Auth (2026-10-14)

Se sustituyen tres lecturas SQL de Auth en `updateDocente` y `submitFromToken`,
reutilizando `AuthIdentityClient.fichaPorPersona` y `fichaPorDocumento` del corte 47.
No se agregan rutas, variables, migraciones ni cambios en Auth, gateway, controladores
públicos o clientes. El alcance es la confirmación de identidad y las validaciones
previas a persistir; `upsertDocente` todavía conserva escrituras en Auth.

**Reglas conservadas y ajuste explícito**

- Edición obtiene la cédula desde la persona del perfil nativo mediante la API Auth.
  Conserva la verificación previa de soporte/justificación, las equivalencias de cédula
  con puntos/enmascarada, la prohibición de cambiar identidad/período/estado, el control
  GGP de sugerencias y el bloqueo/auditoría dentro de la transacción existente.
- Envío OTP con perfil existente obtiene su cédula de Auth por UUID; ignora los alias
  de documento recibidos, conserva el institucional cuando se invitó al alternativo,
  descarta puntaje salarial y mantiene canal, actor, soporte de invitación y respuesta
  enmascarada. El payload de entrada no se muta. La invitación solo se marca Gestionada
  después de terminar la persistencia, como antes.
- En una invitación sin perfil por correo, la búsqueda exacta del documento se delega
  a Auth. Si existe persona, RUND verifica pertenencia con `docenteRepo.findOne` por
  `personaId`, sin filtro de período: cualquier perfil histórico impide apropiarse del
  documento (403). Una ausencia confirmada de persona o de perfil nativo mantiene la
  ruta de alta anterior, su validación y sus escrituras.
- Se conserva la normalización de entrada anterior al lookup exacto (trim y eliminación
  de puntos). No se sustituye por la resolución amplia de alias de tarjeta.
- Auth caído, ruta ausente, ficha parcial o documento exacto ambiguo producen 503 antes
  de persistir. No se interpretan como ausencia ni se usa SQL alternativo. La ambigüedad
  de documento utiliza el 409 de Auth ya definido en 47 y se propaga como 503 en RUND.
- **Ajuste de seguridad explícito:** si un perfil existente de autogestión no tiene
  persona/cédula confirmable, el envío devuelve 404 y conserva la invitación sin gestionar.
  Antes ese caso omitía la sustitución del documento y podía continuar con el valor
  del body. No se admite ese reemplazo. En edición se conserva el 404 de cédula ausente.

**Validación local**

- Build de RUND correcto. Suite completa: **52 suites / 780 tests**, todos correctos;
  se agregan **21 pruebas**. Los fixtures de los controles existentes ahora suministran
  identidad mediante el cliente, y la prueba de apropiación comprueba el perfil nativo.
- **205 comprobaciones** correctas con HTTP real y PostgreSQL temporal: ocho nuevas
  verifican fallos/recuperación de Auth, ausencia de identidad, ambigüedad, soporte/cédula/
  período ajenos y documento ya ligado a otro perfil, sin cambios en identidad, perfiles,
  estados documentales, auditoría o invitaciones en las rutas bloqueadas.
- Edición y envío OTP exitosos se ejecutan por HTTP contra el servicio real, incluyendo
  el `upsertDocente` existente. Conservan el perfil histórico, cédula, institucional,
  puntaje previo y auditoría por soporte/invitación. El envío enmascara el documento y
  solo gestiona su invitación. Son datos ficticios que se eliminan con el clúster.
- Un rol temporal sin SELECT sobre Auth ejecuta las tres validaciones previas usando
  únicamente consultas RUND y API del propietario. En esa prueba se sustituye la
  persistencia final/guardado de invitación para delimitar el alcance; las escrituras
  reales se prueban por HTTP en los dos escenarios anteriores. No se afirma aislamiento
  de las escrituras ni de todo el servicio.
- Auth, su cliente y gateway permanecen idénticos por hashes: se reutiliza la evidencia
  anterior de **174 tests Auth y 10 comprobaciones gateway**, sin repetir esas suites
  en este corte. La integración completa sí vuelve a ejercitar las APIs reales de Auth
  compiladas, guard y conexión de solo lectura, además de todos los flujos anteriores.
- Hashes confirman preservación del resto de métodos del banco, mapeador de tarjeta,
  listado/ficha/estadísticas, carga masiva, workflow, consumidores y configuración.
  También se conservan la persistencia/auditoría y controles de edición posteriores a
  la lectura de cédula, y la persistencia/auditoría/gestión final del envío OTP.
- Evidencia: [validacion-identidad-edicion-envio-rund.json](validacion-identidad-edicion-envio-rund.json).

No se necesita una API Auth adicional: el RUND actualizado requiere las fichas internas
ya documentadas en 47. Antes de desplegar sigue siendo necesario tener ese contrato en
Auth y los requisitos de los cortes anteriores. No se certifican instalaciones ni volumen.

El siguiente corte técnico aborda `validarUnicidad` y `detectarPosibleDuplicado`, que
todavía consultan identidad por SQL. Continúan pendientes otras consultas, escrituras
entre propietarios, permisos, consumidores y aceptación operativa: **5 frentes abiertos**,
con **11 cortes técnicos locales desde el merge**, distintos de los **11 pasos principales
locales**. El paso 12 mantiene su aceptación operativa pendiente. No se modifican bases
existentes ni `.env` reales; no se hace push, despliega o retira el RUND embebido de PTA.

## 49. Frente 4: unicidad y detección de posibles duplicados por API Auth (2026-10-14)

`validarUnicidad` y `detectarPosibleDuplicado` dejan de unir `rund."Docente"` con
`auth.personas`. Auth obtiene las coincidencias de identidad y RUND conserva la
selección de perfiles activos, períodos, correo, exclusión y respuesta pública.
No se modifican los controladores públicos, frontend, guard ni escrituras del banco.

**Contrato y reglas conservadas**

- Se agrega `POST /internal/rund/v1/personas/coincidencias` en el controlador de
  identidad existente: token interno obligatorio, sin sustitución por JWT,
  `Cache-Control: private, no-store`, HTTP 200 para la consulta confirmada.
  Los criterios privados viajan en el body. No se agrega configuración ni migración.
- Acepta dos consultas: `{tipo:'unicidad',documento,personaIds}` y
  `{tipo:'nombre-fecha',nombre,fechaNacimiento}`. Devuelve `{consulta,items,total}`
  con UUID, documento y nombre; fecha de nacimiento solo en la segunda modalidad.
  Cada consulta usa una sentencia de solo lectura en Auth. No exige usuario/rol ni
  selecciona una sola persona si el documento está repetido: devuelve todas las
  candidatas, sin límite arbitrario ni truncamiento.
- El cliente valida modalidad y criterios devueltos, campos, tipos, UUID únicos y
  total antes de aceptar resultados, reutilizando URL, token y plazo de 10 segundos.
  El transporte admite este POST y conserva las llamadas GET anteriores. No sigue
  redirecciones ni guarda caché. Caída, ruta antigua 404, respuesta parcial o error
  del propietario producen 503; nunca se anuncian como «sin duplicados».
- Unicidad mantiene documento con BTRIM, sin puntos y sin distinción de mayúsculas;
  correo de entrada convertido a minúsculas y comparación exacta contra el valor
  almacenado; combinación documento **OR** correo; exclusión solo del ID solicitado.
  Conserva únicamente estado exactamente `ACTIVO` y todos los períodos, incluidos
  históricos. Un perfil sin persona en Auth sigue excluido como en el INNER JOIN anterior.
- Para el correo se obtienen primero los UUID de perfiles nativos candidatos. Auth
  devuelve esos registros y/o los del documento normalizado; PostgreSQL combina la
  proyección con RUND y repite las condiciones finales. Las dos lecturas nativas
  comparten transacción **REPEATABLE READ de solo lectura**, para que cambios de
  correo/estado durante la llamada a Auth no mezclen snapshots de RUND. Un correo sin
  perfiles activos locales y sin criterio de documento no requiere consultar Auth.
- Nombre/fecha conserva igualdad exacta `UPPER(TRIM(nombre))`, fecha por día UTC
  como antes y estado exactamente ACTIVO. No agrega aproximación, similitud o filtros
  de usuario. La fecha seleccionada conserva el tipo PostgreSQL `date` para mantener
  la serialización del DTO anterior. Entradas incompletas siguen devolviendo vacío.
  **Ajuste explícito:** fecha inválida devuelve 400 antes de consultar Auth, en lugar
  del error 500 por `toISOString()` sobre una fecha inválida.
- Enmascaramiento, permisos y auditoría permanecen en el controlador existente.
  La auditoría se guarda después de terminar la transacción de lectura; su fallo
  sigue bloqueando la respuesta. Los diagnósticos no crean ni modifican perfiles,
  identidad, soportes o decisiones documentales.

**Validación local**

- Builds de Auth y RUND correctos. Auth: **16 suites / 187 tests**; RUND:
  **53 / 808**, todos correctos. Se agregan **41 pruebas** (13 Auth y 28 RUND),
  incluyendo regresión de los GET anteriores y validación de contratos parciales.
- **214 comprobaciones** con PostgreSQL temporal y HTTP real: nueve nuevas comparan
  el DTO completo contra `scripts/fixtures/rund-duplicados-before-api.cjs`. La
  referencia del SQL anterior solo se usa en pruebas. Los escenarios incluyen
  documento repetido entre personas/períodos, puntos/ceros/espacios, OR, exclusión,
  correo almacenado en mayúsculas, estados exactos, huérfanos, personas sin usuario,
  identidad sin perfil, nombres con acentos, fecha con desplazamiento horario y nulos.
- Se comprueban JWT/permisos, enmascaramiento para ADMIN, token interno, proyección
  mínima, fecha inválida, ausencia confirmada, fallos/recuperación de Auth y auditoría
  fallida sin entregar filas. Los fallos de Auth no cambian datos nativos ni auditoría.
- Un rol temporal con SELECT solo sobre `rund."Docente"` no puede leer Auth, pero
  ejecuta ambos diagnósticos y conserva los resultados de la referencia. Otra prueba
  cambia un correo desde una conexión distinta durante la llamada al propietario y
  confirma que unicidad mantiene su snapshot nativo. La prueba restaura ese dato ficticio.
- Gateway: **10 comprobaciones HTTP**, incluyendo el bloqueo de la nueva ruta normal
  y codificada. RUND arranca desde su main real y Auth usa controlador/guard/servicio
  compilados con conexión de solo lectura, sin cargar su AppModule completo.
- Hashes confirman preservación del banco fuera de los dos métodos de diagnóstico:
  altas, cargas, edición, envío OTP, perfiles, tarjeta y workflow; además de consumidores,
  catálogos y configuración anteriores. Evidencia:
  [validacion-unicidad-duplicados-rund.json](validacion-unicidad-duplicados-rund.json).

Publicar primero **Auth con la API de coincidencias y después RUND**. No hay variables
ni migraciones nuevas; siguen vigentes los contratos de los cortes anteriores. Para
retirar la API, restaurar primero un RUND compatible.

El snapshot de lectura de RUND no constituye una transacción distribuida con Auth.
Siguen pendientes las pruebas de volumen, tamaño de payload, latencia y concurrencia
de cada instalación; un error de transporte falla explícitamente, sin resultados
truncados. No se certifican los ambientes a partir de fixtures.

Quedan **12 cortes técnicos locales desde el merge**, **11 pasos principales locales**
y **5 frentes abiertos**, incluido el aislamiento SQL. El siguiente corte revisa las
lecturas de identidad de vencimientos, diagnóstico y reparación histórica de soportes.
También continúan pendientes escrituras entre propietarios, permisos, consumidores
y aceptación operativa. No se modifican bases existentes ni `.env` reales, no se hace
push, despliega o elimina el RUND embebido de PTA.

## 50. Frente 4: identidad de vencimientos, diagnóstico y reparación de soportes (2026-10-14)

Los tres flujos dejan de leer identidad en tablas externas desde RUND. Vencimientos
y reparación consultan Auth; el diagnóstico consulta PTA para conservar exactamente
el nombre histórico de la carpeta. No se cambian los controladores públicos ni sus
reglas de permisos, enmascaramiento y auditoría.

**Contratos y compatibilidad**

- PTA publica `GET /internal/rund/v1/personas/:personaId/nombre-historico`, protegido
  con el token interno ya configurado y `Cache-Control: private, no-store`. Valida el
  UUID y devuelve `{items,total}` con `personaId`, `primer_nombre`, `segundo_nombre`,
  `primer_apellido` y `segundo_apellido`, conservando valores, nulos y espacios.
  La ausencia se confirma con lista vacía. Solo ejecuta SELECT en su propia `Persona`.
- RUND valida identidad, campos, tipos, total y duplicados de esa proyección. Conserva
  la composición de las cuatro partes, eliminación de caracteres y conversión a
  mayúsculas del diagnóstico anterior. **No sustituye los nombres históricos de PTA
  por `nom_largo` de Auth:** pueden conducir a carpetas diferentes.
- Para nombres de Auth se reutiliza `POST /internal/rund/v1/personas/coincidencias`
  con modalidad `unicidad`, documento null y UUID solicitados. No se agrega una API
  Auth. El consumidor utiliza únicamente UUID y nombre; el contrato existente también
  devuelve documento. Se deduplican UUID y consultan todos en lotes de hasta 500,
  sin truncar entradas ni emitir un resultado si falla algún lote. Se rechazan UUID
  ajenos al lote. No se realiza una llamada por cada docente ni se persisten identidades.
- Vencimientos conserva todas las columnas públicas, correo, orden por fecha, perfiles
  históricos/inactivos, vencidos y comparación exacta `estado != 'Rechazado'`. Excluye
  perfiles sin persona confirmada como el INNER JOIN anterior, conservando nombres
  vacíos o nulos si el propietario los admite. No expone el UUID auxiliar del ensamblado.
  El intervalo pasa por parámetro SQL; un umbral no entero válido produce 400. Se
  conservan el parseo del controlador y los umbrales cero y negativos.
- La reparación confirma todos los nombres de Auth **antes del primer enlace o INSERT**.
  Persona ausente o nombre vacío confirmado conserva la carpeta con ID nativo. Una
  caída, ruta ausente o respuesta inválida produce 503 y no usa esa carpeta como
  sustitución de una identidad desconocida. El diagnóstico tampoco inventa un nombre
  cuando PTA falla. Se mantienen plazo de 10 segundos y rechazo de redirecciones.
- Se conservan URLs PTA/RUND, rutas codificadas, versiones LOCAL/LEGACY_LOCAL/OpenKM,
  clasificación de archivos nuevos y repetición sin duplicados. No se mueven, renombran
  ni borran archivos de usuarios.
- **Corrección encontrada con PostgreSQL real:** el UPDATE que enlazaba un soporte
  histórico intentaba modificar `updatedAt`, columna ausente tanto en la migración
  nativa como en la entidad. Se elimina esa asignación; el enlace solo modifica URL y
  nombre si estaba null. Conserva ID, estado, revisiones, fechas, tipo y demás columnas.
  No se agrega columna ni migración para encubrir el error.

**Validación local**

- Builds de RUND y PTA correctos. RUND: **54 suites / 837 tests**; PTA: **88 / 847**,
  todos correctos. Se agregan 29 pruebas de RUND y dos de PTA. Incluyen nombres
  históricos con segundo nombre, espacios y acentos, ausencia confirmada, umbrales,
  contratos inválidos y fallo del último lote entre 1.001 UUID.
- **222 comprobaciones** con PostgreSQL temporal e integración HTTP, ocho nuevas para
  este corte. Vencimientos compara el DTO completo con el SELECT anterior congelado
  en `scripts/fixtures/rund-vencimientos-before-api.cjs`, solo usado en pruebas.
- La API real compilada de PTA verifica token, rechazo de JWT como sustituto, UUID,
  proyección mínima, ausencia y no caché. Las conexiones de los fixtures propietarios
  son de solo lectura; no se arrancan sus AppModule completos. RUND usa su main real.
- Fallos 503/404 y respuestas parciales de ambos propietarios conservan los datos; Auth
  caído bloquea las dos rutas de reparación antes de escribir. JWT, permisos, datos
  protegidos y fallo de auditoría siguen bloqueando las respuestas correspondientes.
- Un rol temporal sin acceso SQL a Auth/PTA ejecuta **los tres métodos de servicio**
  usando clientes HTTP reales. No representa el aislamiento de toda la aplicación:
  sus guards y otras operaciones aún tienen SQL externo. La reparación enlaza un
  archivo ficticio, conserva todas las demás columnas y su contenido, y al repetirse
  no vuelve a enlazar ni crear. Las pruebas previas de versiones y URLs siguen pasando.
- Gateway: **10 comprobaciones HTTP** correctas; incluye bloqueo de la nueva ruta PTA
  normal y codificada. El clúster temporal y la aplicación se eliminan al terminar.
- Hashes comprueban que el banco fuera de los tres métodos conserva altas, carga,
  edición, OTP, unicidad, tarjeta, listado y workflow. La evidencia encadena los hashes
  de los cortes previos y distingue la corrección del UPDATE. Registro:
  [validacion-identidad-soportes-rund.json](validacion-identidad-soportes-rund.json).

Publicar primero **PTA con la proyección de nombre histórico y después RUND**. Auth
requiere el contrato de coincidencias del corte 49. No hay variables ni migraciones
nuevas; siguen vigentes las URLs y credenciales específicas de los cortes anteriores.
Para retirar la API de PTA, restaurar primero un RUND compatible.

Los lotes de Auth no forman una transacción distribuida con RUND ni entre ellos. La
reparación conserva el mecanismo previo de escritura por soporte: un fallo SQL o de
disco posterior al preflight puede dejar avances parciales. Este corte evita escrituras
por identidad sin confirmar; no introduce atomicidad global ni certifica volumen,
concurrencia, instalaciones o despliegues.

Quedan **13 cortes técnicos locales desde el merge**, **11 pasos principales locales**
y **5 frentes abiertos**. El frente 4 y la aceptación operativa `12.5d.2` siguen abiertos.
El siguiente corte revisa las lecturas de identidad del expediente documental y la
validación de evidencias. Continúan pendientes otras consultas, permisos, notificaciones,
sincronización y escrituras entre propietarios. No se usan bases existentes ni `.env`
reales; no se hace push, despliegue o retiro del RUND embebido de PTA.

## 51. Frente 4: identidad del expediente documental y datos de evidencias (2026-10-15)

`RundDocumentosService` y `assertRundEvidenceData` dejan de leer `auth.personas`
desde RUND. Se reutilizan las APIs de coincidencias y ficha de Auth ya existentes;
no se agregan rutas, variables, migraciones o copias persistidas de identidad.

**Resolución del expediente y reglas conservadas**

- Conserva ID nativo de perfil **OR** UUID de persona **OR** documento exactamente
  igual, ordenado por `updatedAt DESC NULLS LAST`, sin filtro de estado/período. No
  sustituye esta regla por la resolución de alias de usuario o documento normalizado.
- Primero obtiene los UUID nativos candidatos y consulta Auth con la modalidad de
  unicidad existente, incluyendo esos UUID. La proyección puede contener documentos
  normalizados coincidentes: PostgreSQL vuelve a aplicar la comparación **exacta** al
  combinarla con los perfiles nativos. Conserva personas con documento repetido y la
  elección del perfil más reciente, aunque otro perfil coincida por ID nativo.
- Ambas lecturas nativas comparten `REPEATABLE READ` de solo lectura. El resultado
  conserva `{id,document_number}`; persona ausente o documento null confirmado usa el
  ID nativo, mientras documento vacío conserva el vacío como el COALESCE anterior.
  Ausencia de perfil sigue siendo 404; fallo, 404 de contrato o respuesta inválida del
  propietario produce 503. No hay consulta SQL alternativa ni caché de identidad.

**Validación de evidencias y transacciones**

- Cada fila consulta datos actuales de `rund."Docente"`. Documento, nombre, género y
  fecha de nacimiento se consultan en la ficha de Auth por el UUID del perfil. Ausencia
  confirmada conserva los nulos del LEFT JOIN previo; no se usan `datosCargaMasiva`,
  campos del body o copias nativas como sustitutos de esos campos.
- Se mantienen el sexo biológico nativo y las reglas de títulos, vinculación, puntaje
  cero y datos ausentes. Las filas exclusivamente nativas no requieren la ficha de Auth.
  Esto no implica que todo el CRUD documental funcione con Auth caído: la resolución
  del perfil y de su ruta documental sigue requiriendo coincidencias confirmadas.
- Se conserva la validación previa a almacenar una carga y la nueva consulta de datos
  dentro de la transacción, después del bloqueo nativo del perfil. Si la identidad
  desaparece o falla en esa segunda validación, se revierte la transacción y se retira
  el PDF recién almacenado. El reemplazo confirma los datos antes de guardar su nueva
  versión. No se reutiliza como autorización de escritura una ficha de la primera lectura.
- No cambian permisos, propiedad docente, metadatos protegidos, auditoría, categorías,
  versiones, retención del original ni decisiones por documento/campo. La vinculación
  manual usa el mismo validador con el cliente Auth inyectado.
- **Corrección relacionada:** la vinculación manual todavía asignaba `updatedAt` en
  `RundSoporteCampo`, la misma columna inexistente detectada en el corte 50 para la
  reparación. Se elimina esa asignación en el UPDATE manual. La prueba real comprueba
  creación y posterior actualización del mismo soporte, sin exigir una migración nueva.

**Validación local**

- Build de RUND correcto y **55 suites / 862 pruebas** correctas, 25 nuevas. Cubren
  resolución, ausencia, fallos del propietario, datos nativos, filas de identidad,
  descarte de datos históricos, fallo después de almacenar el PDF y rollback de reemplazo.
- **231 comprobaciones** de integración con PostgreSQL temporal y HTTP real, nueve
  nuevas. La resolución y la elegibilidad de filas se comparan con el SQL anterior de
  `scripts/fixtures/rund-documentos-before-api.cjs`, usado únicamente en pruebas.
- Incluye documentos repetidos entre personas/períodos, documento con puntos/espacios,
  mayúsculas diferentes, colisión entre documento e ID nativo, UUID de persona, perfil
  huérfano, documento vacío, perfiles inactivos/históricos y datos actuales frente a carga
  histórica. Un cambio concurrente del perfil seleccionado confirma el snapshot nativo.
- La carga HTTP conserva el directorio derivado del documento confiable. Caídas, ruta
  ausente o respuesta parcial en coincidencias bloquean listado/carga/reemplazo/borrado
  sin cambios en datos ni archivos; fallos de ficha bloquean las evidencias de identidad.
- Bajo un rol sin acceso SQL a Auth/PTA se ejecutan resolución, validación de filas,
  listado, contenido, reemplazo, historial, eliminación lógica y vinculación manual.
  Se usan el servicio, almacenamiento y repositorio de auditoría compilados reales.
  Los guards del main completo conservan sus dependencias pendientes de aislamiento.
- Se comprueban JWT, propiedad docente, protección de metadatos y originales, auditoría
  nativa, conservación de ambas versiones y rollback con eliminación del PDF cuando
  falla la auditoría de carga. Gateway: **10 comprobaciones HTTP** correctas.
- El main real de RUND y las APIs compiladas de Auth/PTA funcionan con fixtures de solo
  lectura de los propietarios, sin cargar sus AppModule completos. El clúster temporal
  y sus archivos se eliminan al terminar. Evidencia:
  [validacion-identidad-expediente-rund.json](validacion-identidad-expediente-rund.json).

Este corte requiere únicamente actualizar **RUND**, manteniendo en Auth las fichas del
corte 47 y coincidencias del 49, y los contratos previos de PTA. No se cambian servicios
propietarios, consumidores o configuración. Los hashes encadenan su preservación y
comprueban las dos modificaciones concretas del banco manual.

El snapshot nativo no constituye una transacción distribuida con Auth. Sus datos pueden
cambiar entre llamadas; se conserva la revalidación bajo el bloqueo nativo y se falla
explícitamente si no se confirma identidad. Las llamadas durante ese bloqueo, latencia,
volumen y concurrencia requieren aceptación en cada instalación. No se certifica el
aislamiento SQL de toda la aplicación ni ambientes desplegados.

Quedan **14 cortes técnicos locales desde el merge**, **11 pasos principales locales**
y **5 frentes abiertos**. Continúa el frente 4; la aceptación operativa `12.5d.2` sigue
pendiente. El siguiente corte revisa las dependencias de identidad de la extracción OCR,
distinguiendo sus lecturas de la aplicación confirmada de cambios. También quedan
permisos, sincronización, notificaciones, escrituras entre propietarios y aceptación.
No se usan bases existentes ni `.env` reales; no se hace push, despliegue o retiro del
RUND embebido de PTA.

## 52. Frente 4: contexto de identidad del proceso OCR por API Auth (2026-10-15)

El proceso que analiza un documento obtiene su contexto de identidad mediante la ficha
interna de Auth. La lectura previa de formación, vinculación y demás campos permanece
en RUND. No se activa OCR en la configuración ni se cambian motores o reglas de extracción.

**Separación de lectura y confirmación**

- `extractionProfile` recibe el cliente de identidad inyectado. Busca el UUID de persona
  en RUND, confirma su ficha en Auth y combina los cinco campos de identidad con los
  campos nativos. Ambas lecturas nativas comparten `REPEATABLE READ` de solo lectura,
  evitando mezclar cambios locales mientras espera la respuesta del propietario.
- Se reutiliza `GET /internal/rund/v1/personas/ficha/por-persona/:personaId`, con su
  token interno, validación de respuesta, plazo de 10 segundos y rechazo de redirecciones.
  No hay ruta, variable, migración, caché persistida o SQL alternativo nuevos.
- Se conserva el contexto completo y sus claves, recorte de espacios, ceros del documento,
  nulos como texto vacío, datos nativos y ausencia de sustitución por `datosCargaMasiva`.
  La fecha de Auth pasa como parámetro `date` a PostgreSQL: conserva el parser y la
  conversión UTC de `extractionValue` anterior, también en distintas zonas horarias.
- Perfil nativo o persona confirmada ausentes conservan el rechazo del INNER JOIN anterior.
  Ficha ausente como contrato HTTP, inválida o no disponible produce error del propietario.
  El proceso no interpreta esos fallos como un contexto vacío válido.
- La consulta de la **confirmación humana** se identifica como `lockedExtractionProfile`.
  Conserva el SELECT anterior dentro de la misma transacción que ya bloquea Auth/RUND
  y aplicará la edición. No usa la lectura HTTP del proceso OCR como autorización de
  escritura ni como sustituto de ese bloqueo. Es una dependencia SQL pendiente de
  aislar junto con las escrituras; no es un mecanismo de fallback del proceso OCR.
- `lockExtractionSuggestions`, confirmación directa, corrección manual de sugerencias,
  validación de formatos, duplicados de documento, auditoría y aplicación de cambios
  conservan sus reglas. Solo se cambia la llamada interna al nombre explícito de la
  lectura bloqueada; no se alteran la transacción ni sus condiciones de vigencia.

**Fallas y continuidad**

- Auth se confirma antes de leer el PDF o llamar los motores. Si falla, se conserva el
  esquema de reintentos acotados del trabajo y el mensaje genérico, sin registrar el
  texto del documento. No se crean sugerencias ni se modifican perfil o identidad.
- La recuperación puede continuar el mismo trabajo tras reiniciar el proceso. El
  resultado sigue siendo una sugerencia pendiente de revisión humana.
- Se mantienen la verificación del PDF/checksum, campos permitidos, evidencia literal,
  reserva del trabajo, descarte de resultados tardíos y comprobación de la versión
  activa antes de persistir. Las notificaciones OCR quedan intactas en este corte.

**Validación local**

- Build correcto y **56 suites / 871 pruebas de RUND** correctas, nueve nuevas. Incluyen
  perfil/persona ausente, propietario caído, contexto completo, datos históricos que no
  pueden sustituir identidad, ausencia de llamadas al PDF/motores y OCR desactivado.
- **240 comprobaciones** con PostgreSQL temporal e integración HTTP, nueve nuevas.
  El contexto completo se compara con el SQL anterior congelado en
  `scripts/fixtures/rund-extraction-context-before-api.cjs`, solo usado en pruebas,
  bajo UTC, America/Bogota y Asia/Tokyo. Incluye ID nativo textual y persona ausente.
- Un cambio concurrente de formación durante la consulta a Auth no altera el snapshot
  nativo del contexto. Un rol sin acceso SQL a Auth/PTA ejecuta encolado, análisis,
  generación de sugerencias y consulta usando el cliente Auth real y almacenamiento local.
- Los motores son servidores HTTP locales **simulados**, con PDF y texto ficticios;
  no se ejecutan motores instalados ni se mide la calidad real de reconocimiento.
  Se verifica la sugerencia pendiente y su valor previo, sin cambio automático de datos.
- Caída, 404 y ficha parcial reintentan tres veces, dejan el trabajo en ERROR y conservan
  los perfiles y archivos sin llamar los motores. También se comprueban recuperación,
  documento reemplazado y pérdida de reserva sin publicar sugerencias tardías.
- La confirmación humana se ejecuta por HTTP en el main real con la transacción anterior:
  un fallo de auditoría revierte perfil y decisión, una confirmación válida aplica solo
  el valor elegido y la revisión repetida o con dato previo obsoleto se rechaza.
  Esa ruta todavía requiere acceso SQL a Auth; no se presenta como aislada.
- Se verifican JWT/roles y que el main de prueba conserva OCR desactivado. Los procesos
  manuales de prueba no habilitan el worker del main ni envían avisos a servicios reales.
  Gateway: **10 comprobaciones HTTP** correctas.
- Hashes verifican preservación del motor/validadores, confirmación humana y banco manual,
  expediente, contratos propietarios y consumidores de los cortes previos. Evidencia:
  [validacion-identidad-contexto-ocr-rund.json](validacion-identidad-contexto-ocr-rund.json).

Se actualiza únicamente **RUND**, manteniendo los contratos existentes de Auth/PTA.
La conexión y transacción nativas esperan la lectura del propietario: volumen, pool,
latencia y concurrencia siguen requiriendo aceptación por instalación. No se crea una
transacción distribuida con Auth ni se certifican ambientes desplegados.

Quedan **15 cortes técnicos locales desde el merge**, **11 pasos principales locales**
y **5 frentes abiertos**. Continúa el frente 4 y la aceptación operativa `12.5d.2`.
El siguiente corte revisará la resolución del destinatario de los avisos OCR en Auth,
conservando su idempotencia y la independencia del análisis. Siguen pendientes las
escrituras/locks entre propietarios, permisos, sincronización y aceptación operativa.
No se usan bases existentes ni `.env` reales; no se hace push, despliegue o retiro del
RUND embebido de PTA.

## 53. Frente 4: destinatario de avisos OCR por API Auth (2026-10-15)

Los avisos OCR dejan de consultar `auth."user"` desde RUND. Auth confirma al
solicitante y RUND conserva la reserva, reintentos, payload y clave de idempotencia.
El análisis y su confirmación humana no cambian ni se vuelven a ejecutar por el aviso.

**Contrato y selección del destinatario**

- Auth agrega `POST /internal/rund/v1/personas/destinatario-aviso`, con token interno
  obligatorio, HTTP 200 y `Cache-Control: private, no-store`. La clave va en el body
  `{clave:string}`; no viaja en la URL. Devuelve únicamente
  `{consulta,encontrado,usuarioId}`, con UUID o null explícito.
- Se conserva literalmente el SELECT anterior: ID de usuario **OR** ID de persona
  **OR** username sin distinguir mayúsculas, `COALESCE(is_active,true)=true`, prioridad
  del ID de usuario exactamente igual y `LIMIT 1`. No se agregan filtros de rol,
  documento/public_id, joins con persona ni criterios nuevos de desempate.
- No se recorta la clave ni se normalizan UUID. Se preservan espacios del username,
  claves vacías históricas y el estado activo null admitido por la consulta anterior.
  El input se parametriza. Un body sin clave string se rechaza antes de consultar SQL.
- RUND valida la consulta devuelta, booleano, UUID y ausencia explícita. Una ruta 404,
  error HTTP, respuesta parcial o caída de Auth no se convierte en «sin destinatario».
  Se mantiene el plazo de 10 segundos y rechazo de redirecciones. No hay fallback SQL,
  caché persistida, reenvío de JWT/cookies ni uso de JWT_SECRET como credencial interna.
- El transporte de identidad admite este nuevo body POST y conserva sus GET y POST
  anteriores. La dependencia se inyecta mediante el módulo de identidad existente.
  No se cambia configuración real, schema ni migración; `.env.example` documenta la ruta.

**Reserva, aplazamiento e idempotencia conservados**

- La reserva de la cola sigue aplazando el aviso un minuto antes de consultar Auth.
  Si falla esa consulta, no se envía ni se marca notificado y se conserva el reintento
  corto. Solo una ausencia confirmada aplica el aplazamiento previo de un día.
- Se mantienen `notificacion_id`, URL del expediente, textos de COMPLETADO/ERROR/OBSOLETO,
  prioridad y `enviar_email:false`. No se incluyen texto OCR, evidencia ni perfil_base
  en el payload; el token interno de Auth tampoco se reenvía al receptor del aviso.
- La confirmación `notificado_en` sigue ocurriendo únicamente tras respuesta HTTP
  satisfactoria del receptor. Una respuesta perdida o fallo posterior en esa marca
  reintenta la misma clave. No se reinicia el trabajo OCR ni cambia su estado/intentos.
- Se conserva la selección con `FOR UPDATE SKIP LOCKED` y la exclusión local `busy`.
  La consulta nueva vuelve a resolver la cuenta en cada intento: no retiene una cuenta
  obsoleta. La protección existente del receptor contra reutilizar la clave para otro
  destinatario/tipo sigue siendo necesaria.

**Validación local**

- Builds de Auth y RUND correctos. Auth: **16 suites / 199 pruebas**; RUND:
  **56 / 891**, todas correctas. Se agregan 12 pruebas de Auth y 20 de RUND.
- **250 comprobaciones** con PostgreSQL temporal e HTTP real, diez nuevas. La selección
  se compara con `scripts/fixtures/rund-ocr-recipient-before-api.cjs` y se compara el
  payload completo de los tres resultados con la referencia anterior.
- La API compilada de Auth exige token incluso con JWT, valida el body, conserva
  proyección mínima/no caché y ejecuta su SELECT con conexión de solo lectura. Se
  comprueban ID exacto frente a username coincidente, persona, username con espacios,
  mayúsculas, cuenta inactiva, estado null, cuenta sin persona, clave vacía y ausencia.
- Dos conexiones independientes con permisos **solo SELECT/UPDATE de la cola RUND**
  ejecutan los avisos sin poder leer Auth, PTA ni `rund."Docente"`. En concurrencia
  reservan y envían una sola vez el aviso elegible.
- Caída/404/contrato parcial de Auth no envía, mantiene el reintento corto y recupera
  el mismo evento. Ausencia/inactivo aplaza un día; reactivar la cuenta permite resolverla
  otra vez. El estado, motor, intentos, contexto y datos del perfil permanecen intactos.
- Un receptor HTTP **ficticio** comprueba rechazo temporal, acuse perdido, fallo de la
  marca SQL tras aceptar, reintento con la misma clave y conflicto por cambio de cuenta.
  Su deduplicación reproduce el alcance clave+destinatario+tipo de notifications-service;
  no se inicia ese servicio real ni se crean avisos para usuarios reales.
- OCR apagado y trabajos PENDIENTES no consultan Auth ni envían. El main real de RUND
  conserva su flag desactivado y las 240 comprobaciones anteriores siguen pasando.
- Gateway: **11 comprobaciones HTTP** correctas; la nueva verifica bloqueo del POST
  interno normal y codificado, incluso con JWT y token. Se espera la auditoría asíncrona
  de esos rechazos antes de verificar el módulo ajeno; no se cambia código del gateway.
- Hashes verifican que solo cambia la resolución de usuario en el worker: reserva,
  payload, envío, confirmación y manejo de fallos se conservan. Los contratos de identidad
  previos, extracción, confirmación humana, expediente y consumidores quedan preservados.
  Evidencia: [validacion-destinatario-avisos-ocr-rund.json](validacion-destinatario-avisos-ocr-rund.json).

Publicar primero **Auth con la nueva ruta y después RUND**. No hay variables ni
migraciones nuevas. Un RUND actualizado frente a un Auth antiguo conserva el aviso
pendiente para reintentar, sin dar por confirmada una ausencia de cuenta. Para retirar
la ruta, restaurar primero un RUND compatible.

La prueba usa un receptor ficticio y no certifica entrega exactamente una vez ni
instalaciones desplegadas. Siguen pendientes aceptación de notifications-service,
latencia, volumen y despliegues. Las lecturas y escrituras entre propietarios de otros
flujos permanecen fuera de este corte; la confirmación humana OCR sigue con SQL Auth.

Quedan **16 cortes técnicos locales desde el merge**, **11 pasos principales locales**
y **5 frentes abiertos**. Continúa el frente 4 y la aceptación operativa `12.5d.2`.
El siguiente corte revisará la resolución del rol DOCENTE y la revalidación de cuentas
que todavía hace SQL directo durante la sincronización Auth → RUND, preservando sus
criterios de elegibilidad y los perfiles existentes. No se usan bases existentes ni
`.env` reales; no se hace push, despliegue o retiro del RUND embebido de PTA.

## 54. Frente 4: rol y revalidación de sincronización por API Auth (2026-10-15)

La sincronización Auth → RUND deja de leer `auth.role`, `auth.personas`, `auth."user"`,
`auth.user_roles` y `auth.seccionales` desde su conexión nativa. Auth resuelve el rol
y revalida la cuenta por API; RUND conserva la paginación y la transacción de alta.

**Contrato y criterios conservados**

- Auth agrega `GET /internal/rund/v1/personas/sincronizacion/rol-docente` y
  `POST /internal/rund/v1/personas/sincronizacion/revalidar`, con token interno
  obligatorio y `Cache-Control: private, no-store`. El POST recibe únicamente
  `{personaId,usuarioId,rolId}` y devuelve `{consulta,encontrada,identidad}` (HTTP 200).
- Los dos SELECT se trasladan literalmente al propietario. El rol debe ser único,
  con `UPPER(code)='DOCENTE'` e `is_active=true`; no se recortan sus espacios.
  La cuenta debe pertenecer a la persona por su ID interno, sin usar `public_id`.
  La asignación y el rol se revalidan con sus estados exactamente true.
- Se conserva la proyección mínima de documento, correo, territorial, nombre de
  territorial, sede y estados. IDs bigint viajan como texto y los null son explícitos.
  La API no crea ni modifica cuentas, personas o roles y no consulta tablas de RUND.
- El nuevo cliente usa la misma base HTTP, token y `RUND_AUTH_SYNC_TIMEOUT_MS` que
  `/users`, sin configuración adicional. Valida UUID, consulta devuelta, estados,
  columnas completas y ausencia explícita. No reenvía JWT/cookies ni admite redirects.
  Una ruta 404, fallo HTTP o contrato parcial devuelve 503, sin fallback SQL ni caché.

**Transacción y altas preservadas**

- Se completan todas las páginas de `/users` antes de abrir la transacción. Se conserva
  su validación, límite de páginas y orden estable de locks por persona. La revalidación
  HTTP se hace dentro de la transacción nativa, después del advisory lock de esa persona,
  también si tuvo que esperar a otra conexión. No se reutiliza una revalidación anterior.
- Ausencia confirmada cuenta como `failed`; cuenta/asignación/rol revocados cuentan
  como `skipped`. Si Auth falla al revalidar, se aborta la transacción completa y se
  revierten perfiles, bloques, validaciones y auditoría creados en ese intento.
- Cualquier perfil existente, de cualquier período o estado, se conserva. El alta sigue
  siendo mínima: INACTIVO, PENDIENTE_APROBACION, cero horas, seis bloques, 36 campos de
  validación y auditoría con el actor firmado. Documento/correo válidos y exclusividad
  del correo siguen siendo obligatorios; los datos de contacto vienen de la revalidación.
- No cambian el SQL de alta nativa, secuencia, bloques, validación ni auditoría.
  PostgreSQL puede dejar huecos de secuencia al abortar, igual que antes. La auditoría
  continúa inmutable; el fixture la conserva hasta eliminar su cluster temporal.

**Validación local**

- Builds de Auth/RUND correctos. RUND: **57 suites / 923 pruebas**; Auth:
  **16 / 212**, todas correctas. Se agregan 32 pruebas de RUND y 13 de Auth.
- **260 comprobaciones** con PostgreSQL temporal e HTTP real, diez nuevas. Los
  resultados del propietario se comparan con los SELECT anteriores guardados en
  `scripts/fixtures/rund-auth-sync-before-api.cjs`. Auth ejecuta sus consultas con la
  conexión de solo lectura del fixture y sus controlador, guard e interceptor compilados.
- Dos conexiones independientes con permisos solo en tablas/secuencias de RUND
  completan altas y sincronizaciones concurrentes sin poder leer Auth ni PTA.
  Se verifica una sola alta, repetición sin cambios, precisión bigint y protección
  del ID interno frente a `public_id` y cuentas de otras personas.
- Se comprueban rol ausente/ambiguo, minúsculas/espacios y estados false/null de cuenta,
  asignación y rol. Una cuenta revocada mientras la sincronización espera un advisory
  lock real no se crea al liberar el bloqueo. Un fallo de Auth tras la primera alta
  revierte todas las filas del intento; restablecer Auth permite repetirlo correctamente.
- Caída, ruta 404 y contrato parcial de ambas rutas devuelven error sin éxito vacío
  ni mutaciones. Se mantienen las 250 comprobaciones anteriores y sus flujos documentales.
- Gateway: **12 comprobaciones HTTP** correctas, incluida la nueva sobre bloqueo de
  ambas rutas internas, normales/codificadas, con JWT y token. Su código no cambia.
- Hashes verifican que el resto de la sincronización y de Auth no cambia y que se
  preservan los archivos de los cortes anteriores fuera del alcance de este ajuste.
  Evidencia: [validacion-sincronizacion-propietario-auth-rund.json](validacion-sincronizacion-propietario-auth-rund.json).

Publicar primero **Auth con ambas rutas y después RUND**. No hay variables ni
migraciones nuevas. Frente a un Auth antiguo, RUND devuelve 503 y no inicia las altas
si falta la ruta de rol; si falla la revalidación, revierte la transacción nativa.
Para retirar las rutas, restaurar primero un RUND compatible.

La revalidación HTTP no constituye una transacción distribuida: Auth puede cambiar
después de responder, igual que podía cambiar después del SELECT anterior. Esta prueba
mantiene `/users` como fixture de su contrato existente; no inicia Auth AppModule ni
certifica sus instalaciones, volumen o latencia. Siguen pendientes permisos, otras
lecturas, escrituras/locks entre propietarios y aceptación operativa por ambiente.

Quedan **17 cortes técnicos locales desde el merge**, **11 pasos principales locales**
y **5 frentes abiertos**. Continúa el frente 4 y la aceptación operativa `12.5d.2`.
El siguiente corte revisará la resolución de permisos efectivos de las rutas RUND que
todavía consulta directamente roles/permisos de Auth, preservando autorizaciones y
revocaciones. No se usan bases existentes ni `.env` reales; no se hace push, despliegue
o retiro del RUND embebido de PTA.

## 55. Frente 4: permisos efectivos de rutas RUND por API Auth (2026-10-15)

Los guards generales de RUND, Banco de Docentes y Macro Docente dejan de consultar
`auth.role_permissions`, `auth.role` y `auth.permission` desde RUND. Comparten la
consulta al propietario Auth y mantienen sus reglas de autorización y excepciones.

**Contrato y política conservada**

- Auth agrega `POST /internal/rund/v1/personas/permisos-roles`, HTTP 200, token interno
  obligatorio y `Cache-Control: private, no-store`. Recibe `{roles,codigos}` y devuelve
  `{consulta,items:[{code}],total}`. Los candidatos los construye RUND con los roles de
  la sesión autenticada y los 16 códigos del catálogo del servidor; no vienen del body
  del usuario, query params ni de sus claims `permissions`.
- Se conserva literalmente el SELECT anterior: unión DISTINCT de permisos de los
  roles solicitados, `UPPER(r.code)`, coincidencia exacta del código de permiso y
  `COALESCE(is_active,true)=true` para rol, permiso y asignación de permiso al rol.
  No se agregan implicaciones entre consulta, edición, administración, banco o Macro.
- El servicio propietario parametriza arrays, valida su estructura y confirma también
  el conjunto vacío. No cambia códigos persistidos ni recorta espacios de roles en SQL.
  La normalización/deduplicación de roles de la sesión sigue haciéndola RUND como antes.
- El cliente valida la consulta completa devuelta, catálogo, total y códigos únicos.
  Un 404, caída, timeout o contrato parcial no se interpreta como conjunto vacío
  confirmado. Se reutiliza el transporte interno existente: 10 segundos, sin redirects,
  sin JWT/cookies y sin fallback a JWT_SECRET, SQL alternativo o caché persistida.

**Guards y fallos**

- Los tres guards reciben AuthIdentityClient por inyección, sin DataSource. AuthModule
  importa/exporta su módulo y MacroDocenteModule lo importa; Banco ya lo importaba.
  Se conserva el WeakMap de promesas por request: consultas concurrentes de una misma
  solicitud comparten un snapshot, incluido el fallo; una solicitud nueva consulta otra vez.
- Se conserva el rechazo por permiso al fallar la fuente: el resolver registra el aviso
  genérico y devuelve un conjunto vacío; las rutas protegidas solo por permiso responden
  403. No se amplían permisos ni se devuelve un éxito vacío del endpoint de negocio.
- Las rutas públicas/sin requisito, excepciones administrativas de cada guard y acceso
  por rol explícito conservan sus condiciones previas. En particular, el banco conserva
  acceso por rol explícito aunque falle la consulta de permisos. Los alias administrativos
  del guard general no se extienden al banco ni a Macro Docente.
- La revocación de un grant, permiso o rol se refleja en la siguiente solicitud, sin
  cerrar la sesión. Se conserva la política anterior de usar los roles firmados de la
  sesión: no se agrega aquí revalidación de cuenta/pertenencia en `auth.user_roles`.
  Cambiar esa política o las excepciones por rol requiere un ajuste separado.

**Validación local**

- Builds de Auth/RUND correctos. RUND: **58 suites / 950 pruebas**; Auth:
  **16 / 221**, todas correctas. Se agregan 27 pruebas de RUND y nueve de Auth.
  Los fixtures de guards, enmascaramiento, contrato PTA y sincronización documental
  usan la dependencia API nueva; sus expectativas funcionales se mantienen.
- **270 comprobaciones** con PostgreSQL temporal e HTTP real, diez nuevas. Auth usa
  su controlador, servicio, guard e interceptor compilados en conexión de solo lectura.
  El resultado coincide con `scripts/fixtures/rund-effective-permissions-before-api.cjs`
  para unión de roles, espacios, mayúsculas, ausencia, códigos exactos y las 27
  combinaciones true/false/null de rol, permiso y grant.
- Un módulo HTTP con AuthModule y los tres guards compilados, JWT real y sin DataSource
  autoriza los permisos correspondientes. Se comprueba que los tres guards comparten
  una sola consulta por request y que el token/cookie del usuario no llega a Auth.
- Permisos declarados en JWT/body/query no conceden acceso. Se prueban revocaciones
  y recuperación con el mismo JWT, caída/404/respuesta parcial, excepciones explícitas
  y protección contra convertir consulta en administración u otros ámbitos.
- El main real de RUND conserva las consultas granulares, enmascaramiento y rechazos
  de edición/administración; Auth caído deniega acceso por permiso y la recuperación
  no altera perfiles, bloques, validaciones ni auditoría de aprobación. Las 260
  comprobaciones anteriores, incluida la sincronización del punto 54, siguen pasando.
- Gateway: **13 comprobaciones HTTP**, incluida la nueva que bloquea el POST interno
  normal/codificado aun con JWT y token. No se cambia su código de producción.
- Se verifica por comparación y hashes que no cambian las ramas de decisión de los
  guards ni los contratos Auth anteriores fuera de la API nueva. Evidencia:
  [validacion-permisos-propietario-auth-rund.json](validacion-permisos-propietario-auth-rund.json).

Publicar primero **Auth con la ruta de permisos y después RUND**. No hay variables
ni migraciones nuevas. Un Auth anterior provoca denegación por permiso (403), como
el fallo SQL anterior; no permite consultar por SQL alternativo. Las excepciones por
rol conservan su comportamiento. Para retirar la ruta, restaurar primero RUND compatible.

La validación usa PostgreSQL y HTTP locales con datos ficticios; no inicia Auth AppModule
ni certifica ambientes desplegados, latencia o volumen. Siguen pendientes otras lecturas,
escrituras/locks entre propietarios y aceptación operativa de las integraciones.

Quedan **18 cortes técnicos locales desde el merge**, **11 pasos principales locales**
y **5 frentes abiertos**. Continúa el frente 4 y la aceptación operativa `12.5d.2`.
El siguiente corte revisará los destinatarios de notificaciones de Macro Docente que
todavía consultan cuentas/permisos en Auth, conservando la selección y el transporte.
No se usan bases existentes ni `.env` reales; no se hace push, despliegue o retiro
del RUND embebido de PTA.

## 56. Frente 4: correo propio de acceso externo Macro Docente (2026-10-15)

La revisión de destinatarios prevista en 55 confirmó que Macro Docente solo utiliza
`notifyAccesoExternoOtorgado`: el contacto viene del acceso externo guardado. Las
consultas `getUsersByPermission` y `resolveUser` pertenecían a una copia del servicio
PTA cuyos avisos de aprobación no tienen consumidores en RUND. El corte separa el
correo realmente usado y retira esa copia; no crea una API innecesaria de destinatarios.

**Cambio y preservación funcional**

- RUND incorpora `MacroDocenteNotificationsService`, sin DataSource ni cliente Auth.
  MacroDocenteService y su módulo reciben el nuevo provider. La creación, auditoría,
  consulta y revocación del acceso mantienen su implementación anterior.
- Se elimina únicamente `backend/rund-service/src/notifications/pta-notifications.service.ts`.
  El servicio original de PTA, PtaService, PtaModule y el Macro Docente embebido de PTA
  permanecen intactos, comprobados por hashes. No se retira el RUND embebido de PTA.
- El análisis de referencias confirmó un único consumidor del provider en RUND y una
  sola llamada de negocio: enviar el enlace al contacto externo. Los avisos de revisión,
  aprobación, devolución y edición de PTA continúan en su servicio propietario original.
- Los helpers de URL/HTML/transporte y el método de correo se conservan literalmente.
  Se mantienen contacto recortado con `@`, fechas es-CO, asunto, texto, HTML, path RUND,
  payload `{to,subject,text,html}` y POST `/api/v1/emails/send`, sin JWT/cookies/token Auth.
  La copia retirada contenía dos lecturas SQL ajenas; no se presentan como consultas
  activas migradas, porque el envío externo nunca las utilizaba.
- Se conservan las variables y alternativas existentes para receptor y URL pública,
  así como sus defaults. No cambian rutas públicas, guards, migraciones ni configuración
  real. Este corte no añade requisitos de despliegue en Auth/PTA.

**Fallos y límites del envío conservados**

- El aviso sigue siendo best-effort. Un rechazo HTTP o error de red no impide guardar
  el acceso y disponer del enlace para copiarlo. La llamada del caso de negocio sigue
  sin esperar el correo y conserva su manejo de rechazo.
- El retorno true mantiene su significado anterior: se intentó el envío para un contacto
  admitido; no certifica recepción del correo. Sin contacto/con `@` ausente devuelve false
  y no envía. No se agregan reintentos, cola, deduplicación ni garantía de entrega.
- No se amplía la validación histórica de email en este ajuste. La consulta externa
  sigue limitada al docente del acceso y conserva vigencia, auditoría y revocación.

**Validación local**

- Build de RUND correcto: **59 suites / 966 pruebas**, todas correctas, con 16 nuevas.
  Se comprueba inyección del provider sin base de datos, payload, HTML, fallos HTTP/red,
  configuración alternativa/defaults y funcionamiento sin credenciales de Auth.
- **278 comprobaciones** con PostgreSQL temporal e HTTP real, ocho nuevas. El main real
  conserva las 270 anteriores, incluidas permisos, sincronización, documentos y acceso externo.
- Se compara el request completo del nuevo provider con el envío anterior extraído en
  `scripts/fixtures/rund-macro-email-before-decoupling.cjs`, incluyendo cabeceras, destino,
  ruta, textos y HTML. La referencia contiene únicamente el correo/helpers y no consulta SQL.
- Un módulo con el provider compilado, sin DataSource y con Auth sin configurar, envía
  al receptor HTTP ficticio. HTTP 503 y conexión perdida conservan el resultado anterior
  y no disparan reintentos automáticos; restablecer el receptor permite otro intento.
- El main envía el payload anterior al contacto guardado. Aunque el receptor rechace el
  correo, el acceso se guarda, consulta sin JWT y se revoca; sin email también se guarda
  sin intentar envío. No cambian personas, cuentas, roles, permisos, planes o perfiles.
- El build limpia la copia compilada anterior. Se verifican por comparación el cuerpo
  del correo/helpers y los cambios exclusivos de import/provider en Macro Docente.
  Auth/gateway no cambian ni requieren repetir sus suites independientes en este corte;
  sus integraciones previas siguen cubiertas por el verificador completo.
  Evidencia: [validacion-correo-propio-macro-docente-rund.json](validacion-correo-propio-macro-docente-rund.json).

La prueba usa un receptor ficticio; no certifica envío SMTP, entrega real, ambientes
desplegados o latencia/volumen. Siguen pendientes otras lecturas y escrituras entre
propietarios y la aceptación operativa de las integraciones por ambiente.

Avance acumulado: **19 cortes técnicos locales desde el merge**, **11 pasos principales
locales** y **5 frentes abiertos**. Continúa el frente 4 y la aceptación `12.5d.2`.
El siguiente corte revisará el historial Macro Docente que todavía lee datos de PTA,
empezando por la identidad histórica en `academic_work_plan."Persona"`, preservando
la fuente histórica y los filtros de consulta. No se usan bases existentes ni `.env`
reales; no se hace push, despliegue o retiro del RUND embebido de PTA.

## 57. Frente 4: identidad histórica de Macro Docente por API PTA (2026-10-15)

El historial y la consulta puntual de Macro Docente dejan de leer directamente
`academic_work_plan."Persona"` desde RUND. Conservan la identidad histórica de PTA:
no sustituyen sus nombres/documentos por la ficha actual de Auth.

**Contrato y lectura histórica**

- PTA agrega `POST /internal/rund/v1/personas/identidades-historicas`, HTTP 200,
  `Cache-Control: private, no-store` y token interno obligatorio incluso con JWT.
  Recibe `{personaIds:string[]}` (UUID únicos, hasta 500 por lote) y devuelve
  `{consulta,items,total}`. Cada item contiene personaId, cuatro partes del nombre
  y `identificacion`, con los textos/null guardados en Persona, sin transformarlos.
- La consulta parametrizada usa solo `academic_work_plan."Persona"`; no exige cuenta
  activa, rol ni existencia de una identidad en Auth. Una persona ausente no devuelve
  fila, como el repositorio anterior. No se leen documentos, contacto ni otras columnas.
- RUND deriva los IDs de los perfiles nativos que ya consultaba. El cliente deduplica
  UUID y consulta secuencialmente en lotes de 500, sin truncar el total ni devolver un
  resultado parcial si falla un lote posterior. Valida consulta, total, columnas,
  unicidad y pertenencia de cada fila al lote. No guarda caché entre solicitudes.
- Se reutilizan ACADEMIC_WORK_PLAN_SERVICE_URL y PTA_INTERNAL_SERVICE_TOKEN (alternativa
  INTERNAL_SERVICE_TOKEN), plazo de diez segundos y rechazo de redirecciones. No hay
  reenvío de JWT/cookies, fallback a JWT_SECRET, Auth actual ni SELECT alternativo.
  Una ruta 404, caída o respuesta incompatible provoca 503, sin historial vacío exitoso.

**Historial y acceso conservados**

- MacroDocenteService recibe RundCatalogosClient en lugar del repositorio Persona.
  Su módulo importa el cliente existente. La composición de nombres, recorte de campos,
  valores null, documento con puntos/ceros, estados firmes, orden y lectura de asignaturas
  permanecen iguales. La ausencia histórica mantiene filas con nombre/documento null.
- Se mantienen filtros de período/docente/territorial/CETAP/programa/núcleo, paginación,
  prioridad del programa embebido y respaldo legacy. Las consultas vacías o sin perfiles
  nativos no agregan dependencia de la API de identidad.
- Los controllers, guards, enmascaramiento, auditoría, correo y reglas del enlace externo
  no cambian. Un fallo de la fuente o de auditoría impide entregar datos. La consulta
  externa sigue limitada al docente del acceso y respeta su revocación.

**Validación local**

- Builds de PTA/RUND correctos. RUND: **59 suites / 989 pruebas**, todas correctas
  (23 nuevas). Módulo interno de catálogos PTA: **1 suite / 27 pruebas**, diez nuevas;
  no se presenta como ejecución de todas las pruebas de negocio de PTA.
- **288 comprobaciones** con PostgreSQL temporal e HTTP real, diez nuevas. Se comparan
  el DTO y el historial completo con la operación anterior de Repository<Persona>.find
  sobre los mismos datos. Hay nombres históricos distintos de Auth, personas sin cuenta
  activa, ausencia histórica, documento con ceros/puntos y registros de varias fuentes.
- Un consumidor compilado con repositorios reales y permisos limitados consulta historial
  y detalle sin poder hacer SELECT sobre Persona ni Auth. Conserva filtros/paginación,
  programa legacy, prioridad del JSON y exclusión de borradores.
- Se prueban más de 500 IDs sin truncamiento, fallo del segundo lote, echo/total mínimos,
  cambios del propietario reflejados en la siguiente solicitud y ausencia confirmada.
  Caída/404/contrato parcial producen 503 sin mutar personas, cuentas, planes o perfiles.
- El main de RUND conserva permisos y enmascaramiento de un lector granular y del enlace
  externo. Se verifica que manipular docenteId no cambia su alcance, que la auditoría
  fallida bloquea la entrega y que revocar el acceso sigue impidiendo la consulta.
- Gateway: **14 comprobaciones HTTP**, incluida la nueva sobre bloqueo del POST interno
  normal/codificado, aun con JWT y token. El código de producción del gateway no cambia.
- Las 278 comprobaciones anteriores siguen pasando, incluido el correo del punto 56.
  Hashes/comparaciones verifican que el algoritmo del historial solo cambia su lectura
  de Persona y que los GET anteriores de PTA y del cliente conservan sus contratos.
  Evidencia: [validacion-identidad-historica-macro-docente-rund.json](validacion-identidad-historica-macro-docente-rund.json).

Publicar primero **PTA con la nueva ruta y después RUND**. No hay variables nuevas ni
migraciones. Ante un PTA antiguo, las consultas que necesitan identidad histórica fallan
con 503; no entregan datos parciales ni vuelven al SELECT cruzado. Para retirar la ruta,
restaurar primero un RUND compatible. Siguen aplicando los requisitos de cortes anteriores.

La validación usa datos ficticios y la API compilada de PTA con conexión de solo lectura;
no inicia PTA AppModule ni certifica despliegues, volumen o latencia. Los lotes no forman
un snapshot distribuido: PTA puede cambiar entre consultas. RUND todavía lee directamente
planes y catálogo de programas de PTA; este corte aísla específicamente Persona y no
certifica separación completa de la base ni retiro de sus entidades/flujo embebido.

Avance acumulado: **20 cortes técnicos locales desde el merge**, **11 pasos principales
locales** y **5 frentes abiertos**. Continúa el frente 4 y la aceptación `12.5d.2`.
El siguiente corte revisará el catálogo de programas usado como respaldo histórico
en Macro Docente, conservando la prioridad del nombre embebido y los filtros de registros
retirados del repositorio actual. No se usan bases existentes ni `.env` reales; no se
hace push, despliegue o retiro del RUND embebido de PTA.

## 58. Frente 4: programas de respaldo del historial por API PTA (2026-10-15)

Macro Docente deja de consultar `academic_work_plan.programa` mediante un repositorio
de RUND. PTA publica el catálogo mínimo necesario para los nombres ausentes en el JSON
histórico, preservando las reglas del repositorio anterior.

**Contrato y selección conservados**

- PTA agrega `POST /internal/rund/v1/catalogos/programas-historicos`, HTTP 200, token
  interno obligatorio y `Cache-Control: private, no-store`. Recibe `{programaIds:string[]}`
  (hasta 500 candidatos únicos por lote) y devuelve `{consulta,items:[{id,nombre}],total}`.
- El SELECT parametrizado usa `id=ANY($1::bigint[]) AND deleted_at IS NULL`. Conserva
  programas inactivos y excluye cualquier fecha de soft delete, igual que find() sin
  withDeleted. No añade filtro por activo, facultad, período, rol o identidad de Auth.
- IDs int8 viajan como texto, sin Number/parseInt: se conservan extremos y valores por
  encima del entero seguro de JavaScript. El nombre vuelve literalmente, incluidos
  espacios y vacíos. La ausencia o retiro confirmado no devuelve fila.
- Se conservan los alias numéricos aceptados por PostgreSQL (signo/ceros iniciales),
  pero la salida mantiene el ID canónico del repositorio. El historial sigue usando
  String(programa.id) como clave: no se corrigen ni reasignan aliases del JSON que antes
  no coincidían con esa clave. Los IDs numéricos del JSON siguen siendo descartados por
  coalesceString, sin convertirlos a texto ni inventar una consulta nueva.

**Cliente e historial**

- El cliente interno de catálogos admite el nuevo body y conserva GET/POST anteriores.
  Valida tipo/rango int8, echo, total, unicidad y pertenencia de cada resultado al lote.
  Consulta en lotes de 500 sin truncar; si falla uno posterior no devuelve resultados
  anteriores. Mantiene URL/token de PTA, plazo de diez segundos, rechazo de redirects
  y ausencia de JWT/cookies, fallback SQL, credencial JWT_SECRET o caché persistida.
- MacroDocenteService elimina la inyección de ProgramaEntity y usa el cliente existente.
  MacroDocenteModule deja de registrar Programa/Facultad; la prueba de metadatos verifica
  que no se cargan y que las demás relaciones y entidades nativas se resuelven.
- Se conserva exactamente el algoritmo: nombre completo embebido, nombre embebido y
  nombre anidado tienen prioridad; solo se consulta un ID si no hay nombre. Se mantienen
  deduplicación, filas con programa null, campos históricos, filtros, orden y paginación.
  Un nombre embebido sigue disponible aunque falle el catálogo de programas.
- Fallo HTTP, ruta 404 o contrato incompatible devuelve 503 si hace falta el catálogo,
  sin historial parcial o vacío exitoso. Los IDs incompatibles que requieren lookup se
  rechazan sin consultas SQL cruzadas; no se convierten silenciosamente en ausencia.
  Controllers, permisos, enmascaramiento, auditoría y acceso externo no cambian.

**Validación local**

- Builds de PTA/RUND correctos. RUND: **59 suites / 1.021 pruebas**, todas correctas,
  con 32 nuevas. Catálogos internos de PTA: **1 suite / 39 pruebas**, doce nuevas;
  no equivale a ejecutar todas las pruebas de negocio de PTA.
- **298 comprobaciones** con PostgreSQL temporal e HTTP real, diez nuevas. El consumidor
  usa repositorios reales con permisos que impiden SELECT sobre Programa, Persona y Auth.
  La referencia usa el find(In(ids)) anterior de Programa, incluido su soft delete.
- Historial, detalle, filtros y paginación coinciden con el repositorio anterior. Se
  comprueban programa inactivo, retirado, ausente, nombres con espacios, ID canónico frente
  a alias, ID numérico del JSON, extremos int8 y precisión mayor que 2^53.
- Se prueban más de 500 candidatos, fallo del segundo lote, cambios de nombre,
  retiro/restauración y falta de caché entre solicitudes. Caída/404/contrato parcial
  produce 503; el período con solo nombres embebidos no llama al catálogo.
- El main conserva permisos, documento protegido y alcance del enlace externo. Fallos
  del propietario y de auditoría bloquean la entrega; revocar el acceso sigue impidiendo
  consultarlo. Consultas y fallos no modifican personas, programas, planes o perfiles.
- Las 288 comprobaciones anteriores siguen pasando. El fixture del punto 57 adapta su
  constructor y referencia al nuevo cliente y reduce sus permisos: tampoco puede leer
  directamente Programa. No se debilitan las comprobaciones del historial anterior.
- Gateway: **15 comprobaciones HTTP**, incluida la nueva sobre bloqueo del POST interno
  normal/codificado aun con JWT y token; su código de producción no cambia.
- Comparaciones/hashes verifican que solo cambia la lectura de respaldo y su registro
  de dependencia; las reglas de composición, acceso y contratos anteriores se conservan.
  Evidencia: [validacion-programas-historicos-macro-docente-rund.json](validacion-programas-historicos-macro-docente-rund.json).

Publicar primero **PTA con la nueva ruta y después RUND**. No hay variables nuevas ni
migraciones. Un PTA anterior provoca 503 cuando se necesita resolver el nombre del
programa, sin volver al SELECT cruzado. Para retirar la ruta, restaurar primero RUND
compatible. Siguen aplicando los requisitos de los cortes anteriores.

La validación usa datos ficticios y API PTA compilada en conexión de solo lectura;
no inicia PTA AppModule ni certifica despliegues, volumen o latencia. Los lotes no
constituyen un snapshot distribuido. La consulta de planes de PTA sigue siendo SQL
directo; este punto no certifica separación completa de bases ni retiro del RUND de PTA.

Avance acumulado: **21 cortes técnicos locales desde el merge**, **11 pasos principales
locales** y **5 frentes abiertos**. Continúa el frente 4 y la aceptación `12.5d.2`.
El siguiente corte revisará la lectura de planes firmes de PTA para Macro Docente,
preservando estados, período/docente y datos históricos de las asignaturas. No se usan
bases existentes ni `.env` reales; no se hace push, despliegue o retiro del RUND embebido.

## 59. Frente 4: planes firmes de Macro Docente por API PTA (2026-10-15)

Macro Docente deja de leer `academic_work_plan."PlanTrabajoAcademico"` mediante un
repositorio de RUND. PTA selecciona sus planes y publica únicamente los campos que
necesita el historial. RUND conserva la composición de filas y sus controles de acceso.

**Contrato y compatibilidad**

- Nueva ruta `POST /internal/rund/v1/planes/historial-firme`, HTTP 200, token interno
  obligatorio y `Cache-Control: private, no-store`, registrada en el módulo interno
  existente de PTA. No modifica el Macro Docente embebido ni su flujo de aprobación.
- Recibe docenteId y/o periodo como texto exacto. Rechaza consultas sin docente ni período,
  valores incompatibles y claves adicionales. No exige UUID de docente, período numérico
  ni recorta espacios: conserva los identificadores y períodos históricos de tipo text.
- Mantiene exactamente los siete estados: APROBADO, APROBADO_DEF, EN_FIRME, RADICADO,
  EN_EJECUCION, FINALIZADO y TERMINADO. No incluye borradores, estados parecidos o CERRADO
  por reinterpretación de estadoAntesCierrePeriodo. Usa SQL parametrizado y los mismos
  criterios de igualdad por docente/período y `ORDER BY periodo DESC`.
- Devuelve `{consulta,items,total}`; cada plan contiene id, docenteId, periodo, estado y
  datosEstructurados con solo asignaturas. No expone el resto del JSON del plan ni datos
  de aprobación, observaciones, dedicación u otras columnas que Macro no consume.
  La extracción JSON conserva asignaturas heterogéneas, valores crudos y nulos; JSON
  sin asignaturas sigue sin generar filas. No modifica el JSON almacenado.
- No añade LIMIT/OFFSET ni trunca a 500 planes. La selección completa se procesa antes
  de paginar asignaturas, igual que antes. El orden entre planes del mismo período
  sigue sin desempate definido; este corte no introduce un orden secundario nuevo.

**Consumidor y seguridad**

- PtaPlanesClient usa URL/credencial de PTA existentes, con token común como alternativa
  ya admitida. No usa secretos JWT o credenciales de Auth. No envía JWT/cookies y rechaza
  redirects; aplica plazo de diez segundos y consulta nuevamente en cada solicitud.
- Valida echo exacto, total, IDs únicos y campos requeridos, estados firmes y pertenencia
  al docente/período solicitado. Un 404, caída, error de red/JSON o contrato parcial
  produce 503. No devuelve historial vacío como sustituto de un fallo, ni consulta SQL
  alternativo. Incluso la ausencia de planes requiere confirmación del propietario.
- MacroDocenteService sustituye únicamente la selección de planes. Conserva exactamente
  la composición posterior: perfil nativo, identidad histórica, prioridad de programas,
  territorial/CETAP, horas, normalización, filtros, orden recibido y paginación.
  Controllers, permisos, auditoría, máscaras y alcance del enlace externo no cambian.
- MacroDocenteModule retira el registro PlanTrabajoAcademico y agrega el cliente. La
  prueba de metadatos confirma que RUND no carga esa entidad y que las demás relaciones
  registradas se resuelven con synchronize=false. El archivo de entidad se mantiene
  para fixtures/referencias; no se eliminan tablas, datos, índices o migraciones.

**Validación local**

- Builds de PTA y RUND correctos. RUND: **60 suites / 1.063 pruebas**, todas correctas,
  42 nuevas. Módulo interno PTA: **1 suite / 53 pruebas**, catorce nuevas; no equivale
  a ejecutar toda la suite de negocio de PTA.
- **309 comprobaciones** con PostgreSQL temporal y HTTP real, once nuevas. Consumidor
  con repositorios reales y permisos que impiden leer PlanTrabajoAcademico, Persona,
  Programa y Auth. La referencia conserva el QueryBuilder original para los planes.
- Se comparan los siete estados, exclusión de borradores y similares, docente/período,
  filtros posteriores, páginas y consulta puntual. Se verifican JSON histórico irregular,
  más de 500 planes sin truncado, precisión/valores crudos y cambios de estado/asignaturas
  reflejados en la siguiente consulta. Los 298 controles anteriores siguen pasando.
- Ausencia confirmada, caída, 404 y contrato parcial conservan su diferencia. Sesión,
  enmascaramiento, alcance externo, fallo de auditoría y revocación se comprueban desde
  el main real. Consultas y fallos conservan las filas de planes, personas y perfiles.
- Gateway: **16 comprobaciones HTTP**, incluida la nueva sobre bloqueo del POST interno
  normal y codificado aun con JWT/token. Su código de producción no cambia.
- Comparaciones de código y hashes conservan el cuerpo de composición del historial y
  los contratos/clientes anteriores. Evidencia:
  [validacion-planes-firmes-macro-docente-rund.json](validacion-planes-firmes-macro-docente-rund.json).

Desplegar primero **PTA con la nueva ruta y después RUND**. No hay variables nuevas ni
migraciones. Con PTA anterior, toda consulta de historial que necesite seleccionar planes
devuelve 503; no recupera el SELECT cruzado. Para retirar la ruta, restaurar primero un
RUND compatible. Siguen aplicando los requisitos de los cortes anteriores.

Las pruebas usan datos ficticios y la API PTA compilada con conexión de solo lectura;
no inician PTA AppModule ni certifican instalaciones existentes. Las llamadas de planes,
identidades y programas no constituyen un snapshot distribuido. El transporte completo
conserva el comportamiento anterior, pero el volumen/latencia y el plazo de diez segundos
deben comprobarse en aceptación por ambiente. Continúan otras escrituras y bloqueos entre
propietarios: este punto no certifica aislamiento SQL global ni independencia completa.

Avance: **22 cortes técnicos locales desde el merge**, **11 pasos principales locales**
y **5 frentes abiertos**. Sigue el frente 4 y la aceptación `12.5d.2`. El siguiente corte
revisará las escrituras de identidad/cuenta en Auth y su transacción con el perfil nativo
de RUND, para definir la separación sin perder validaciones, unicidad ni rollback.
No se usan bases existentes o `.env` reales ni se hace push, despliegue o retiro del
RUND embebido en PTA.

## 60. Frente 4: frontera de escritura Auth y conservación de la transacción RUND (2026-10-15)

Se revisa la creación/actualización de persona, cuenta y rol realizada por
`BancoDocentesService.upsertDocente`. Se extrae ese bloque a
`rund-auth-identity-write.ts`, con entrada y resultado explícitos, conservando el manager
de la operación. Es preparación del traslado al propietario: **este corte no elimina
el SQL de Auth ni activa una API de escritura remota**.

**Dependencias comprobadas**

| Flujo | Unidad actual que debe conservarse al separar servicios |
|---|---|
| Alta o actualización individual | Persona, cuenta, rol, perfil, bloques, validaciones, invalidación de evidencias y auditoría comparten transacción. |
| Carga masiva definitiva | Soporte del lote fuera de las transacciones de filas; cada fila conserva su transacción y el tratamiento existente de errores parciales. |
| Previsualización XLSX | Transacción exterior, savepoint por fila y rollback final; una fila fallida no impide probar la siguiente. |
| Edición con soporte | El soporte vuelve a comprobarse al final de la misma transacción; si dejó de estar disponible se revierten también persona y username. |
| Edición con sugerencias OCR | El manager exterior coordina bloqueo de sugerencias, cambios y confirmación. No puede sustituirse por un commit independiente en Auth. |
| Autogestión | La resolución por email depende de la opción interna relaxValidation y del flujo OTP anterior; no se habilita desde un nuevo body HTTP. |
| Correo de bienvenida | Solo después del commit propio y cuando se creó cuenta. El manager exterior conserva su comportamiento sin envío desde upsert. |

**Cambio delimitado**

- La función `upsertRundAuthIdentityWithManager` recibe solo el manager, los datos ya
  normalizados, las dos opciones internas relevantes y las mismas funciones de formato
  de fecha/nombre/comparación. No obtiene su propio DataSource, abre transacciones,
  crea conexiones, envía correo, hace HTTP ni controla commit/rollback/savepoints.
- Devuelve persona, usuario, indicador de cuenta creada, campos de identidad cambiados
  y sus valores anteriores/nuevos. El mismo mapa de cambios continúa en la auditoría
  nativa; no se modifica ni se vuelve a construir con reglas distintas.
- Se conserva el bloque SQL y su orden: búsqueda por documento normalizado; fallback
  por email solo en autogestión; conflicto de correo/persona/username; creación o cambio
  de persona; creación o cambio de username; selección y asignación del rol DOCENTE.
- Se conservan cuentas nuevas inactivas, password_temp=true, bcrypt con coste 10,
  contraseña temporal derivada del documento, contraseñas existentes intactas, fechas,
  datos previos y campos que determinan si debe actualizarse una fila.
- La selección del rol sigue siendo por code o name con la prioridad anterior. No se
  sustituye por el contrato de sincronización, que exige rol activo y tiene otra regla.
- El id_tercero conserva las tres variantes anteriores: columna ausente, secuencia
  configurada o LOCK TABLE con MAX+1. El bloqueo y la reserva usan el mismo manager;
  los bigint siguen como texto. Las secuencias PostgreSQL no son transaccionales: pueden
  avanzar aunque se reviertan filas; no se reinician ni se promete recuperar correlativos.
- El código completo posterior a la identidad —perfil, aprobaciones, validaciones,
  soporte, auditoría, commit, bienvenida, bulk, OCR y autogestión— se conserva idéntico.
  Controllers, rutas, proveedores, variables, módulos de Auth/PTA y migraciones no cambian.

**Validación local**

- RUND: **61 suites / 1.073 pruebas**, todas correctas, diez nuevas. Build correcto.
  No se repiten suites/builds de Auth o PTA porque su código no cambia en este corte.
- **317 comprobaciones** con PostgreSQL temporal y el main real, ocho nuevas; las 309
  anteriores siguen pasando. La prueba adicional usa el servicio compilado, repositorios
  y transacciones TypeORM reales; los correos se capturan en una función ficticia.
- Rollback real tras crear persona/cuenta/rol; fallos inducidos en perfil, asignación de
  rol y auditoría; rechazo de existente y comprobación tardía de soporte; cada escenario
  revierte las filas Auth/RUND y evita el correo de bienvenida de la operación fallida.
- Una previsualización XLSX falla en la primera fila, procesa la segunda mediante su
  savepoint y revierte finalmente los datos. La bitácora de lectura de la previsualización
  se conserva intencionalmente, como en el comportamiento anterior.
- La conexión independiente de la prueba solo observa persona/cuenta/perfil cuando el
  commit propio ya ocurrió; entonces se registra la bienvenida ficticia. Reimportar
  conserva IDs, contraseña y un único rol/perfil, sin repetir bienvenida. No se exige
  action=unchanged: el algoritmo previo puede reportar update al releer claves JSONB.
- Comparaciones de código verifican el bloque extraído y el resto del servicio; hashes
  encadenados comprueban los demás clientes, contratos y flujos anteriores sin cambios.
  Evidencia: [validacion-frontera-escritura-auth-rund.json](validacion-frontera-escritura-auth-rund.json).

**Condición para el traslado efectivo a Auth**

Una llamada HTTP que confirme Auth antes de guardar el perfil no conserva este rollback.
El siguiente corte debe preparar el contrato propietario de validación y la coordinación
de operaciones: identificador estable del servidor, reintentos consultables/idempotentes,
recuperación ante respuesta perdida, y reglas de confirmación o reversión que no deshagan
cambios ajenos/concurrentes. La previsualización requiere validación sin persistencia
remota. Los fallos tardíos de soporte, auditoría y OCR deben seguir impidiendo entregar
un éxito parcial. Esta sección fija requisitos; no afirma que ese protocolo ya exista.

No hay nuevo orden de despliegue en este corte ni variables/migraciones. Permanecen las
dependencias y requisitos de los cortes anteriores, incluido PTA antes de RUND para sus
nuevas lecturas. No se lee ningún `.env` ni se usan bases existentes; solo datos ficticios
y clúster temporal, eliminado al terminar. Las altas confirmadas de prueba y su auditoría
inmutable se eliminan con ese clúster; no se borran bitácoras de una instalación.

Avance: **23 cortes técnicos locales desde el merge**, **11 pasos principales locales**
y **5 frentes abiertos**. Continúan el frente 4 y la aceptación `12.5d.2`. Este punto deja
delimitada y probada la escritura actual; su traslado por API y el aislamiento SQL global
siguen pendientes. No se hace push, despliegue o retiro del RUND embebido en PTA.

## 61. Frente 4: prevalidación propietaria de identidad en Auth (2026-10-15)

Auth incorpora `POST /internal/rund/v1/personas/escritura/validar`, contrato v1 de solo
lectura para preparar el traslado de escrituras. Se registra en UsersModule con el
guard interno existente; no modifica rutas o servicios actuales de usuarios/identidad.

- Solicitud con versión, UUID de operación, documento textual, correo ya normalizado y
  opción interna resolverPorCorreo. Rechaza claves adicionales y tipos incompatibles.
- Devuelve echo, persona/cuenta/rol, origen de coincidencia, conflicto de correo, huella
  SHA-256 del comando de consulta/resultado y reserva=false. No devuelve credenciales,
  passwords, nombres o filas completas ni presenta la prevalidación como autorización.
- Una sola sentencia SELECT/CTEs comparte snapshot. Conserva documento con BTRIM/puntos/
  UPPER, prioridad por documento, email solo cuando lo habilita el contexto interno,
  conflicto de otra persona/username/propietario null y rol por code/name con prioridad
  por code. Se conservan cuentas/roles inactivos y LIMIT 1 sin nuevo desempate.
- No reserva identidad/correo, IDs o rol; no consume secuencias, solicita bloqueos explícitos, escribe
  recibos, crea cuentas ni cambia permisos. Repetir ID vuelve a consultar el estado actual.
  La huella permite comprobar correspondencia, no garantiza concurrencia/idempotencia
  de escrituras ni sirve para recuperar el resultado de una escritura remota perdida.
- Cliente preparatorio de RUND con URL/token Auth existentes, timeout de diez segundos,
  rechazo de redirects, sin JWT/cookies, credenciales PTA/JWT o caché/SQL alternativo.
  Valida echo, tipos, UUID, campos mínimos, consistencia y huella. Caída, 404, JSON parcial
  o alterado produce 503; ausencia/conflicto/rol no encontrado requieren respuesta válida.
- El cliente todavía no se importa en módulos activos de RUND ni sustituye la escritura
  local. Normalización, transacción, rollback, soporte, OCR, auditoría y correos del punto
  60 permanecen idénticos; no hay nueva dependencia de disponibilidad para esos flujos.

Contrato y requisitos de recuperación:
[CONTRATO-PREVALIDACION-IDENTIDAD-AUTH.md](CONTRATO-PREVALIDACION-IDENTIDAD-AUTH.md).
Especifica qué confirma cada campo, cómo se calcula la huella y qué sigue pendiente para
coordinar escrituras: recibo persistido, consulta de estado, reintentos, respuesta perdida,
confirmación/recuperación, cambios concurrentes y previsualización sin persistencia remota.

**Validación local**

- Builds Auth/RUND correctos. RUND: **62 suites / 1.108 pruebas**, 35 nuevas. Auth:
  **2 suites de identidad / 98 pruebas**, 19 nuevas; no equivale a toda la suite Auth.
- **326 comprobaciones** con PostgreSQL temporal e HTTP real, nueve nuevas; se conservan
  las 317 anteriores, incluidas las de rollback y previsualización del punto 60.
- Controlador, servicio, guard e interceptor compilados de Auth, con conexiones de solo
  lectura. El cliente compilado consulta esa API; no se inicia Auth AppModule.
- Se comparan las selecciones previas a escritura para documento/email/conflictos/cuenta/
  rol, incluyendo persona sin cuenta, usuario sin persona, inactivos, prioridad code/name
  y rol ausente. Token obligatorio, body inválido, proyección mínima y no-store verificados.
- Reintentos y solicitudes simultáneas no generan filas ni avanzan secuencias; cambios de
  cuenta del propietario se reflejan en la siguiente llamada. Caída/404/contrato parcial
  no confirman ausencia ni modifican Auth/RUND. No se reenvían JWT/cookies.
- Gateway: **17 comprobaciones HTTP**, incluida la nueva para bloqueo del POST interno
  normal/codificado aun con JWT/token. Su código de producción se conserva.
- Hashes verifican que la escritura local, los flujos activos y contratos anteriores
  siguen intactos. UsersModule solo incorpora el nuevo controlador/proveedor y su import.
  Evidencia: [validacion-prevalidacion-identidad-auth-rund.json](validacion-prevalidacion-identidad-auth-rund.json).

Sin variables o migraciones nuevas. Auth puede publicar la ruta sin cambiar consumidores;
antes de conectar RUND, se requiere Auth compatible. Se mantienen los requisitos previos
de despliegue. No se usan bases existentes ni `.env` reales: datos ficticios, PostgreSQL
temporal eliminado al terminar, sin push, despliegue ni retiro del RUND embebido en PTA.

Avance: **24 cortes técnicos locales desde el merge**, **11 pasos principales locales**
y **5 frentes abiertos**. Sigue el frente 4 y la aceptación `12.5d.2`. Este corte prepara
el contrato propietario; la escritura SQL actual sigue local. El siguiente punto debe
implementar el registro/consulta idempotente de operaciones y su recuperación antes de
conectar una escritura remota a los flujos de RUND.

## 62. Frente 4: registro persistente de intenciones en Auth (2026-10-15)

Se retoma la rama limpia desde `a5332853b` y se implementa el registro, consulta y
cancelación de intenciones, previo al traslado de la escritura de identidad.
Contrato: [CONTRATO-OPERACIONES-IDENTIDAD-AUTH.md](CONTRATO-OPERACIONES-IDENTIDAD-AUTH.md).

**Persistencia y API interna**

- Nueva migración `669_auth_rund_identidad_operacion.sql`, para la base de Auth. Crea
  solamente auth.rund_identidad_operacion, con UUID, versión 1, huella, estado y fechas.
  No persiste comando, documento, correo, nombre, contraseña o JWT; no copia identidades.
- Constraints y trigger conservan clave/versión/huella/fecha inicial, impiden borrar o
  reactivar recibos y admiten solo REGISTRADA → CANCELADA. No hay purga/TTL automático.
- `POST /internal/rund/v1/personas/escritura/operaciones` registra ID/huella. Repeticiones
  iguales devuelven el recibo sin cambiar fechas; otro hash devuelve 409 sin sobrescribir.
  INSERT ON CONFLICT DO NOTHING y la clave primaria resuelven concurrencia sin duplicados.
- `GET .../operaciones/:id` confirma encontrada=true/false con echo y operación/null.
  HTTP 404 de esa ruta no acredita ausencia. Permite recuperar el registro si se perdió
  la respuesta después del commit, consultando y reutilizando el mismo ID del servidor.
- `POST .../operaciones/:id/cancelar` exige la huella, actualiza solo el estado registrado
  y conserva la fecha en repeticiones. Inexistente devuelve 404, huella distinta 409.
  Una cancelación no confirmada no acredita que una solicitud en vuelo haya terminado.
- Respuestas con no-store y guard/token interno existente. DTO mínimo incluye
  identidadAplicada=false en ambos estados; ningún recibo afirma un alta aplicada.

La huella se registra como valor opaco proporcionado por el servidor consumidor. No
equivale a la huella de prevalidación del punto 61. El futuro ejecutor debe definir y
validar el comando completo, recalcular su huella y compararla con el registro. Aún no
existe aplicación de persona/cuenta/rol, resultado de alta persistido ni coordinador RUND.

**Consumidor y compatibilidad**

- Nuevo cliente preparatorio para registrar/consultar/cancelar con URL/token Auth
  existentes, timeout de diez segundos y sin forwarding de JWT/cookies, redirects,
  caché, SQL alternativo o reintentos automáticos. Conserva 409 como conflicto; otros
  fallos de HTTP/red/JSON/contrato producen 503, nunca ausencia o cancelación exitosa.
- Comprueba UUID, huella esperada, versión, fechas, estado y DTO mínimo. Rechaza datos
  ajenos o que afirmen identidad aplicada. Registrar un recibo cancelado no lo reactiva.
- El cliente no se importa en módulos activos ni sustituye la escritura local. El
  bloque de escritura, transacción, rollback, preview, soporte, auditoría, OCR y correos
  permanecen idénticos. Auth solo agrega controlador/proveedor al UsersModule.
- La tabla no es una reserva de documento/correo ni una transacción distribuida. Recuperar
  una intención no confirma una escritura de identidad. La compensación y coordinación
  con el commit nativo siguen pendientes antes de conectar los flujos actuales.

**Validación local**

- Builds Auth/RUND correctos. RUND: **63 suites / 1.141 pruebas**, 33 nuevas. Auth:
  **3 suites de identidad / 118 pruebas**, veinte nuevas; no toda la suite de Auth.
- **338 comprobaciones** de integración con main real y PostgreSQL temporal: migración
  669 y once controles nuevos; las 326 anteriores siguen pasando.
- API Auth compilada con conexión de un rol efímero que solo puede SELECT/INSERT/UPDATE
  en el registro. Se verifica que no tiene permisos para leer personas ni insertar
  cuentas/roles. Las API previas de consulta conservan sus conexiones de solo lectura.
- Solicitudes simultáneas iguales y con hashes distintos; consulta desde otro cliente;
  pérdida real de respuesta después del commit; reintento sin duplicados; cancelación
  concurrente/repetida; rechazo de reactivación, borrado o cambio de huella/versión.
- Migración repetida conserva recibos; fallo SQL no fabrica registro; tabla/ruta ausente,
  caída o contrato parcial no se convierten en ausencia. Filas de personas, cuentas,
  roles, perfiles, evidencias y secuencias permanecen iguales durante estas operaciones.
- Gateway: **18 comprobaciones HTTP**, incluida la nueva para registrar, consultar y
  cancelar por rutas normales/codificadas aun con JWT/token; código de producción intacto.
- Se corrige únicamente el restablecimiento de TZ del verificador OCR: Windows podía
  conservar Tokio al borrar TZ, causando discrepancia en la comparación posterior del
  correo. Se restaura primero la zona efectiva original; servicios de producción y
  las comparaciones del correo no se alteran ni se debilitan.
- Hashes encadenados comprueban los demás clientes, contratos y flujos anteriores.
  Evidencia: [validacion-operaciones-identidad-auth-rund.json](validacion-operaciones-identidad-auth-rund.json).

Antes de utilizar las rutas: aplicar **669 en Auth**, publicar Auth compatible y verificar
su token/URL; luego habilitar un futuro consumidor validado. No se aplica la migración a
bases existentes ni al arrancar Auth. Sin 669, los flujos previos no consultan el registro
y conservan su comportamiento; las rutas nuevas fallan sin declarar un resultado vacío.
No hay variables nuevas. El revisor de push incluye 669 en futuros manifiestos; el corte
61 ya publicado conserva su documentación/evidencia histórica y no se regenera.

Avance: **25 cortes técnicos locales desde el merge**, **11 pasos principales locales**
y **5 frentes abiertos**. Continúan frente 4 y aceptación `12.5d.2`. El siguiente punto
es la aplicación del comando en Auth con verificación de huella/resultado persistido y
su coordinación con RUND, incluidos fallos tardíos, compensación y preview sin escritura
remota. Este corte no elimina el SQL actual de identidad ni certifica independencia
completa. Solo se usan datos ficticios/clúster temporal eliminado; sin `.env` reales,
push, despliegue o retiro del RUND embebido en PTA.

## 63. Frente 4: aplicación transaccional de identidad en Auth (2026-10-15)

Se extiende el registro del punto 62 con un ejecutor propietario deshabilitado por
defecto. Contrato: [CONTRATO-APLICACION-IDENTIDAD-AUTH.md](CONTRATO-APLICACION-IDENTIDAD-AUTH.md).
El escritor activo de RUND conserva su SQL, transacción, rollback, preview, correos,
soporte, auditoría y validación documental. No se conecta todavía al ejecutor remoto.

**Aplicación y recuperación**

- Nueva ruta interna POST `.../operaciones/:operacionId/aplicar`, con el mismo guard
  y token interno, bloqueo en gateway y no-store. La nueva bandera Auth
  `RUND_IDENTITY_APPLY_ENABLED` vale false por defecto. El ejemplo queda apagado;
  no se modifican `.env` reales ni se activa en Compose o ambientes.
- Contrato versión 1 con actor, payload, opciones de validación/territorial y datos
  finales normalizados. Fechas civiles válidas, bigint territorial textual, claves
  y tipos estrictos. Canonicalización explícita idéntica en Auth/RUND; Auth recalcula
  la huella y la exige igual al comando y al registro antes de escribir identidad.
- Migración 670, posterior a 669 en Auth: agrega resultado/aplicada_en y APLICADA.
  El recibo se bloquea FOR UPDATE; identidad y resultado se confirman en una sola
  transacción. Fallos al persistir el recibo revierten persona, cuenta y rol.
- El adaptador propietario conserva el SQL y normalización del escritor local,
  usando bcrypt ya instalado en Auth en lugar de bcryptjs. Cuenta nueva inactiva,
  contraseña temporal costo 10 compatible; cuenta existente conserva contraseña,
  activación y condición temporal. No escribe RUND ni envía correos.
- Repetir el mismo ID/comando aplicado devuelve el resultado original sin volver a
  ejecutar el adaptador. GET y registro repetido recuperan ese recibo aun tras perder
  la respuesta después del commit. APLICADA y CANCELADA permanecen inmutables;
  cancelación y aplicación concurrentes admiten un solo estado final.
- El resultado conserva IDs y diferencias originales para auditoría. Esas diferencias
  pueden contener datos personales: solo API interna, sin caché, contraseña, hash o
  JWT. No se guarda el comando completo ni se publica el resultado en rutas de usuario.
- El cliente exige resultado completo y consistente; no confirma datos ajenos o
  parciales. Sin reintentos automáticos, forwarding de credenciales de usuario,
  caché o alternativa SQL. No se importa en módulos activos de RUND.

**Corrección de compatibilidad detectada al validar**

TypeORM/PostgreSQL devuelve UPDATE directo como `[rows,count]`. El verificador previo
del registro usaba pg.rows, ocultando esa diferencia en cancelación. Se usa ahora CTE
con SELECT externo tanto al cancelar como al aplicar. La fixture de ambas API usa
DataSource TypeORM real con roles efímeros separados: registro solo accede a su tabla;
ejecutor accede a identidad Auth sin permisos sobre el esquema RUND. Las lecturas
anteriores siguen con conexiones de solo lectura.

**Validación local**

- Builds Auth/RUND correctos; RUND **63 suites / 1.148 pruebas**, siete nuevas;
  Auth **4 suites de identidad / 136 pruebas**, dieciocho nuevas. No toda la suite Auth.
- **352 comprobaciones** HTTP/PostgreSQL temporal: se conservan las 338 anteriores y
  se agregan migración 670 y trece controles del ejecutor. Se comprueban alta concurrente
  del mismo ID, operaciones diferentes para igual documento, reintentos, recuperación
  desde otro cliente y pérdida real de respuesta posterior al commit.
- Actualización existente comparada con la ejecución del adaptador local dentro de una
  transacción revertida: persona, IDs y diferencias de auditoría coinciden. Verificados
  bigint exacto, preservación territorial, fallback confiable por correo, reactivación
  del rol, fechas civiles y preservación de contraseña/activación.
- Guard, bandera apagada, comando/hash incompatible, ausencia, cancelación, conflicto
  de correo y fallo del recibo no dejan cambios parciales. Migración 670 repetida
  conserva recibos; SQL impide editar/borrar el resultado final o aplicar uno vacío.
- Las tablas nativas RUND permanecen idénticas durante todas las llamadas del ejecutor.
  Gateway: **18 controles HTTP**, ampliados para bloquear también aplicación normal y
  codificada; su código de producción permanece intacto.
- Evidencia y hashes encadenados:
  [validacion-aplicacion-identidad-auth-rund.json](validacion-aplicacion-identidad-auth-rund.json).

**Límite y siguiente punto**

El bloqueo asesor serializa únicamente estos ejecutores remotos, con lock_timeout de
cinco segundos. No coordina otros escritores locales/externos de Auth; las secuencias
PostgreSQL pueden avanzar aun con rollback. El commit Auth no confirma el perfil,
soporte, auditoría o validación documental nativos. No hay aún transacción distribuida
ni compensación segura, y el SQL de identidad activo de RUND sigue pendiente de retiro.

Sigue diseñar e implementar la coordinación durable RUND/Auth: intención local estable,
reconciliación ante respuestas perdidas, tratamiento de fallos tardíos, compensación
segura y preview sin escritura remota. Conservar envío de correo posterior al commit.
No habilitar el ejecutor ni sustituir el escritor hasta validar esas condiciones.

Avance: **26 cortes técnicos locales desde el merge**, **11 pasos principales locales**
y **5 frentes abiertos**. Continúan frente 4 y aceptación `12.5d.2`. Migraciones solo
en clúster temporal ficticio eliminado; sin bases existentes, `.env` reales, push,
despliegue o retiro del RUND embebido en PTA.

## 64. Frente 4: intención durable y reconciliación de recibos Auth en RUND (2026-10-15)

Se agrega el registro local de coordinación y la recuperación de recibos del propietario,
antes de conectar la escritura remota a los flujos activos. Contrato:
[CONTRATO-COORDINACION-IDENTIDAD-RUND.md](CONTRATO-COORDINACION-IDENTIDAD-RUND.md).

**Intención estable y recuperación**

- Nueva migración propia RUND `008_rund_identidad_operacion.sql`: tabla, índice de
  pendientes, constraints y trigger; sin FK, acceso SQL o permisos sobre Auth.
  Conserva UUID de intención servidor, UUID Auth generado por servidor, versión,
  huella, fecha, estado y recibo conocido. No guarda el comando, contraseña o JWT.
- `preparar` confirma la intención local antes de HTTP, sin aceptar outerManager.
  Reintentos y preparaciones simultáneas conservan ID Auth/fecha; mismo ID con otro
  comando devuelve 409. El proceso servidor futuro debe vincular ese ID estable a
  su operación de negocio; no deduplicar por documento o número de fila XLSX.
- `registrarEnAuth` usa exclusivamente el ID/huella ya guardados y conserva el recibo
  propietario. Solo registra metadatos; no llama a aplicar o cancelar identidad.
- `reconciliar` consulta al propietario por HTTP, sin registrar/aplicar/cancelar
  automáticamente. Recupera REGISTRADA, APLICADA y CANCELADA aun después de cerrar
  las conexiones o perder la respuesta del commit remoto. No necesita el comando
  para recuperar una aplicación que Auth ya confirmó.
- Una ausencia explícita conserva PREPARADA y devuelve observación NO_ENCONTRADA,
  nunca cancelación ni autorización para generar otro UUID. Si ya había un recibo
  conocido, ausencia posterior devuelve 503 sin cambiarlo. Caída, 404 y DTO parcial
  tampoco confirman ausencia o éxito ni usan sustitución por SQL/caché.
- HTTP termina antes de adquirir el bloqueo local. La persistencia usa TypeORM,
  FOR UPDATE y CTE/SELECT externo. No sobrescribe un estado final con respuestas
  REGISTRADA atrasadas; recibos iguales no actualizan filas. Huella/ID ajenos,
  metadatos originales alterados o resultados finales contradictorios se rechazan.
- Estados locales PREPARADA, AUTH_REGISTRADA, AUTH_APLICADA y CANCELADA. El recibo
  aplicado puede contener diferencias personales para auditoría, de acceso servidor.
  AUTH_APLICADA confirma solamente Auth; no confirma el perfil o commit nativo RUND.

**Validación local**

- Builds Auth/RUND correctos. RUND: **64 suites / 1.167 pruebas**, diecinueve nuevas;
  Auth: **4 suites de identidad / 136 pruebas**, sin cambios y sin afirmar toda su suite.
- **367 comprobaciones** de integración: conserva los controles anteriores y agrega
  migración 008 y catorce casos de coordinación. El control de esquema inicial pasa
  de 27 a **28 tablas**, incluyendo explícitamente el journal; siguen siete categorías
  y ninguna copia de docentes. No se debilita la comprobación de esquema vacío.
- Código compilado y cliente HTTP Auth real. Segunda base ficticia con schema RUND y
  sin schema Auth; rol efímero limitado al journal, sin permisos sobre negocio ficticio.
  Pruebas de concurrencia, fallo después del commit remoto y recuperación tras cerrar/
  reabrir todas las conexiones locales, conservando UUID, recibo y contraseña.
- Pérdida real de respuesta de registro y aplicación; fallo de guardado local deja
  intención recuperable, sin confirmar éxito local. Respuestas REGISTRADA demoradas
  compiten con APLICADA/CANCELADA reales y no hacen retroceder el estado persistido.
- Recibos contradictorios o metadatos originales alterados no reemplazan lo conocido.
  Migración 008 repetida conserva registros; SQL impide borrado, cambio de metadatos,
  retroceso y recibo vacío. El negocio ficticio permanece intacto.
- La tabla del journal en la base usada por el main real permanece vacía durante todos
  los flujos activos. Gateway mantiene sus **18 comprobaciones HTTP**. No se agregan
  rutas públicas, workers, tareas programadas ni configuración.
- Evidencia y hashes encadenados:
  [validacion-coordinacion-identidad-auth-rund.json](validacion-coordinacion-identidad-auth-rund.json).

**Alcance y siguiente punto**

El nuevo módulo sigue sin importarse desde AppModule o módulos activos. El escritor
local y su rollback, preview, soporte, OCR, auditoría y correos permanecen intactos.
La bandera de aplicación Auth sigue apagada. La migración nueva solo se aplicó a
clúster temporal ficticio, retirado al terminar; no a instalaciones existentes.

Esta base durable recupera el recibo Auth, pero aún no conserva ni confirma el contexto
nativo completo de negocio. Sigue vincular la intención a ese contexto y al commit
nativo, conservar permisos/OTP/período/soporte, resolver fallos tardíos y compensación
segura, preview sin escritura remota y correo posterior al commit. Solo después se
podrá sustituir el SQL de identidad activo y aceptar la activación por ambiente.

Avance: **27 cortes técnicos locales desde el merge**, **11 pasos principales locales**
y **5 frentes abiertos**. Continúan frente 4 y aceptación `12.5d.2`. Sin `.env` reales,
bases existentes, push, despliegue o retiro del RUND embebido de PTA.

## 65. Frente 4: contexto de negocio durable y confirmación del commit nativo (2026-10-15)

Se vincula la intención al contexto de escritura y se implementa la confirmación
transaccional del resultado nativo, todavía sin activar el ejecutor remoto.
Contrato: [CONTRATO-COMMIT-NATIVO-IDENTIDAD-RUND.md](CONTRATO-COMMIT-NATIVO-IDENTIDAD-RUND.md).

**Separación del escritor nativo y compatibilidad**

- Se extraen las 190 líneas nativas de upsertDocente a `rund-native-profile-write.ts`.
  Conservan SQL, valores, condiciones, orden y resultado; solo las dos llamadas a
  métodos del servicio se pasan como callbacks con el mismo manager.
- upsertDocente mantiene sus validaciones, normalización, catálogo territorial,
  escritura Auth local, outerManager, transacción, rollback, savepoints y correo
  posterior al commit. Delega el mismo bloque nativo en un método servidor interno.
- El bloque extraído no hace SQL de identidad, HTTP, commit o correo. Conserva
  selección por persona/período, rejectExisting, correlativo, datos originales,
  bloques, validación documental, evidencias, auditoría y segunda revisión del soporte.
- Una comprobación adicional, usada solamente por el coordinador nuevo, impide
  confirmar un alta sin sus bloques si un fallo JavaScript fue tolerado por el
  inicializador heredado. El flujo activo y las ediciones históricas no cambian de regla.

**Contexto y confirmación durable**

- Migración propia RUND 009, posterior a 008: contexto, huella, estado, fechas,
  docente y resultado nativo, con FK únicamente al journal local. No agrega FK
  permanente al perfil ni dependencias SQL/FK de Auth.
- El contexto congela comando Auth, payload normalizado, columnas originales
  reconocidas y metadatos de fila/canal/cargador, territorial, opciones y auditoría/
  soporte. Documento, valores finales, actor, canal y opciones deben corresponder
  al comando Auth. Exige período y auditoría; no acredita permisos u OTP por sí mismo.
- Canonicalización ordenada y SHA-256 incluyen período, soporte y auditoría. Fechas
  ISO se restauran como Date para conservar el contrato de TypeORM. Se rechazan
  credenciales, binarios, funciones, ciclos, valores no finitos y exceso de tamaño/
  profundidad. Esta tabla sí persiste el comando y datos personales de negocio;
  solo acceso servidor, sin endpoint nuevo o logging del contexto.
- La preparación ocurre antes de HTTP. Primero queda el journal; luego se vincula
  el contexto bajo bloqueo y solo si la intención sigue PREPARADA. Si falla esa
  segunda transacción, el mismo ID permite completarla sin haber publicado desde
  este servicio. Reintento igual conserva el contexto; otro contexto devuelve 409.
- `confirmarNativo` exige AUTH_APLICADA y contexto íntegro con el mismo comando.
  Usa el recibo Auth original, copia sus diferencias de auditoría y ejecuta el
  escritor nativo con el mismo manager que guarda el marcador CONFIRMADA.
- Perfil, evidencias, auditoría, revisión del soporte y marcador comparten commit.
  El trigger comprueba el recibo aplicado y el perfil/persona/período esperados,
  y protege contexto y resultado finales. Un reintento recupera el resultado sin
  ejecutar el escritor, incluso después de perder la respuesta del commit.
- El commit nuevo no hace HTTP ni envía correo. Un fallo nativo revierte solamente
  RUND: Auth aplicado permanece pendiente de coordinación/compensación, sin afirmar
  éxito global. Las secuencias pueden avanzar aun con rollback, como antes.

**Validación local**

- Builds Auth/RUND correctos. RUND: **66 suites / 1.188 pruebas**, veintiuna nuevas;
  Auth: **4 suites de identidad / 136 pruebas**, sin cambios y sin afirmar toda su suite.
- **381 comprobaciones** HTTP/PostgreSQL temporal: controles anteriores conservados,
  migración 009 y trece casos del commit nativo. El esquema vacío pasa de 28 a
  **29 tablas**, con contexto explícito, siete categorías y ninguna copia de docentes.
- Escritor y servicio compilados con TypeORM, en otra base ficticia que
  contiene tablas reales RUND y carece de schema Auth. La identidad se confirma
  previamente por HTTP al propietario; el commit nativo no hace nuevas llamadas.
- Preparación/confirmación simultáneas conservan un perfil, bloques, auditoría y
  recibo; contexto distinto o publicación previa impiden vincular otra intención.
- Fallos reales de auditoría, persistencia del marcador, bloques y soporte rechazado
  revierten perfil, evidencias y resultado. rejectExisting posterior a Auth no fabrica
  confirmación. La identidad Auth y su contraseña no cambian durante el commit nativo.
- Pérdida real de respuesta HTTP después del commit y recuperación al cerrar/reabrir
  conexiones; reintento sin duplicar efectos. Migración 009 repetida conserva datos,
  contexto y resultado finales son inmutables. Los flujos activos, incluido preview,
  dejan vacía la tabla nueva. Gateway conserva **18 controles HTTP**.
- Hashes verifican las líneas extraídas y el servicio fuera del cambio, además de
  contratos y módulos previos. Evidencia:
  [validacion-commit-nativo-identidad-rund.json](validacion-commit-nativo-identidad-rund.json).

**Activación y siguiente punto**

El coordinador nuevo sigue fuera de AppModule/módulos activos, sin ruta, worker,
bandera nueva o cambios de ambiente. La bandera de aplicación Auth continúa apagada.
No se sustituye todavía el SQL de identidad activo; las migraciones solo se ejecutan
en bases ficticias temporales retiradas al terminar.

Sigue el ejecutor completo: vincular solicitud real e ID estable, conservar controles
de permisos/OTP/prevalidación y soporte, reconciliar fallos tardíos, compensar de forma
segura si no se confirma RUND, resolver preview sin escritura remota y correo durable
posterior al commit. CONFIRMADA acredita el commit nativo, no el correo o éxito de una
compensación. La activación por ambiente permanece pendiente de esas condiciones.

Avance: **28 cortes técnicos locales desde el merge**, **11 pasos principales locales**
y **5 frentes abiertos**. Continúan frente 4 y aceptación `12.5d.2`. Sin `.env` reales,
bases existentes, push, despliegue o retiro del RUND embebido de PTA.

## 66. Frente 4: ejecución reanudable y exclusión entre aborto y commit nativo (2026-10-15)

Se incorpora el ejecutor servidor que retoma la intención/contexto de los puntos
64–65, y una decisión irreversible que establece la exclusión entre abortar y
confirmar el perfil antes de añadir la compensación. Contrato:
[CONTRATO-EJECUCION-IDENTIDAD-RUND.md](CONTRATO-EJECUCION-IDENTIDAD-RUND.md).

**Ejecución y recuperación**

- `AuthIdentityExecutionService` prepara y consulta la intención/contexto, concilia
  Auth, registra/aplica con el UUID ya guardado y confirma el commit nativo. ejecutar
  recibe solo el ID; no acepta otro payload para reemplazar el contexto congelado.
- Usa HTTP fuera de las transacciones locales. Revisa huellas y decisión antes
  de mutaciones; el commit nativo vuelve a comprobar la decisión bajo bloqueo.
  Si Auth ya está aplicado, no repite la aplicación de identidad.
- Un resultado nativo CONFIRMADA se recupera sin HTTP o una segunda escritura. La
  recuperación explícita solo consulta Auth y actualiza el journal; no aplica identidad
  ni escribe perfiles. Fallos nativos se propagan manteniendo Auth aplicado pendiente,
  sin inventar éxito, cancelar o compensar automáticamente.
- Solicitudes concurrentes conservan IDs y recibos. Una ausencia que quedó obsoleta
  puede producir 503, conservando el estado; reanudar después del commit devuelve el
  mismo resultado. No hay bucle de reintentos, caché o SQL alternativo contra Auth.

**Decisión durable y carrera de aborto**

- Nueva migración propia RUND 010, posterior a 009. Tabla `rund.identidad_ejecucion`,
  con FK local al contexto, huella, fecha y decisión EN_CURSO/ABORTADA. La preparación
  del contexto crea también su decisión en la misma transacción. No almacena datos
  personales nuevos, comando, contraseñas o tokens.
- La migración incorpora los contextos anteriores, incluidos los confirmados, sin
  modificar su contenido. Repetirla no reactiva abortos ni cambia fechas o resultados.
- abortar bloquea journal, contexto y decisión en el mismo orden que confirmarNativo.
  Solo admite EN_CURSO → ABORTADA si el commit no ocurrió. Un commit confirmado
  devuelve 409; un aborto confirmado prohíbe futuras confirmaciones para esa intención.
- Motivos cerrados FALLO_NEGOCIO/CANCELACION_SOLICITUD. Repetir el mismo aborto conserva
  fecha/motivo; otro motivo devuelve 409. Repetir preparación no lo reactiva.
- Triggers protegen ambos lados: no se puede abortar un contexto confirmado ni
  confirmar un contexto cuya decisión está abortada. La barrera adicional permanece
  al repetir 009 e impide el bypass por SQL, aun con perfil y recibo Auth coincidentes.
- Un HTTP en vuelo puede completar Auth después del aborto local. Se conserva ese
  hecho aplicado, pero se impide el perfil. resolucionAuthPendiente queda explícito;
  el aborto no acredita cancelación o compensación de la identidad Auth.

**Validación local**

- Builds Auth/RUND correctos. RUND: **67 suites / 1.198 pruebas**, diez nuevas;
  Auth: **4 suites de identidad / 136 pruebas**, sin cambios y sin afirmar toda su suite.
- **394 comprobaciones** de integración: conserva las 381 anteriores y agrega 010
  más doce casos del ejecutor. El esquema vacío pasa de 29 a **30 tablas**, con la
  decisión explícita, siete categorías y ninguna copia de docentes.
- Contexto y ejecutor compilados con TypeORM en base RUND separada sin schema Auth,
  con llamadas HTTP reales al propietario. Camino completo Auth → commit RUND,
  preparación/ejecución concurrentes, recibos estables y resultado recuperable por
  otra instancia; un perfil y auditoría por intención.
- Fallo nativo conserva Auth aplicado y permite recuperación GET sin nueva aplicación.
  Pérdida real de respuesta Auth se recupera antes de confirmar RUND. Pérdida de
  respuesta posterior al commit nativo no genera HTTP o segunda escritura al reanudar.
- Aborto previo impide aplicación/commit, carreras aborto/commit con un solo ganador,
  y respuesta Auth retenida después del commit remoto para abortar mientras está
  en vuelo. El perfil no se guarda y Auth queda aplicado pendiente de resolución.
- SQL rechaza un marcador nativo después del aborto, incluso cuando sus datos de
  perfil y recibo coinciden; rechaza reactivación, borrado y cambio de metadatos.
  Migración 010 repetida conserva abortos/confirmaciones. Fallos 404, caída y DTO parcial
  no aplican identidad ni alteran decisiones o fabrican resultados vacíos.
- Flujos activos y preview dejan vacía la tabla de decisión en la base del main real.
  Gateway conserva sus **18 comprobaciones HTTP**. El único cambio del fixture Auth
  permite retener una respuesta ya confirmada; no modifica el servicio Auth productivo.
- Evidencia y hashes encadenados:
  [validacion-ejecucion-identidad-rund.json](validacion-ejecucion-identidad-rund.json).

**Alcance y siguiente punto**

El ejecutor nuevo sigue fuera de AppModule/módulos activos, sin ruta pública, worker,
bandera o configuración nueva. El escritor activo, sus permisos, validaciones,
OTP, preview, soporte, auditoría y correo mantienen el comportamiento del punto 65.
La bandera Auth permanece apagada; solo se usan bases temporales ficticias retiradas
al terminar, sin migraciones en instalaciones existentes.

Este corte cierra el camino reanudable y la exclusión local antes de una compensación;
no implementa todavía la cancelación/compensación propietaria Auth. Sigue esa resolución
con prueba durable de aborto y protección frente a cambios posteriores, sin inferir
un rollback distribuido. Después faltan la conexión a las entradas reales con sus
controles de permisos/OTP/prevalidación/soporte, preview sin escritura remota, correo
durable posterior al commit y aceptación de activación por ambiente.

Avance: **29 cortes técnicos locales desde el merge**, **11 pasos principales locales**
y **5 frentes abiertos**. Continúan frente 4 y aceptación `12.5d.2`. Sin `.env` reales,
bases existentes, push, despliegue o retiro del RUND embebido de PTA.

## 67. Frente 4: resolución de abortos no aplicados y prueba interna durable (2026-10-15)

Se cierra la cancelación propietaria de las intenciones abortadas cuya identidad
Auth todavía no se aplicó. Se prepara además la consulta interna del aborto como
hecho irreversible RUND. Contrato:
[CONTRATO-RESOLUCION-ABORTO-IDENTIDAD-RUND.md](CONTRATO-RESOLUCION-ABORTO-IDENTIDAD-RUND.md).

**Resolución explícita y reanudable**

- `resolverAborto(id)` exige aborto confirmado, fecha/motivo válidos y contexto
  nativo sin commit. No aborta una ejecución abierta. Una cancelación ya guardada
  se devuelve sin HTTP o nuevas escrituras.
- Consulta Auth usando el mismo UUID/huella. Si existe ausencia explícita válida,
  registra esos metadatos y cancela la intención; no envía el comando ni aplica
  identidad. Así queda un recibo durable que un registro tardío no reactiva.
- Para una registrada, solicita cancelación a la API propietaria y confirma su
  recibo por GET antes de guardarlo en el journal local. No hay HTTP dentro de
  transacciones RUND, bucles de reintento, otro UUID o SQL sobre Auth.
- Aplicar y cancelar compiten por la misma fila Auth. Un 409 al cancelar exige
  reconciliar un recibo terminal; el error por sí solo no acredita cancelación.
  404 de ruta, caída, DTO parcial o huella ajena no fabrican ausencia o éxito.
- Respuestas perdidas de registro/cancelación y fallos locales al persistir el
  recibo se recuperan desde Auth. Reanudar tras confirmar CANCELADA no repite el
  POST. Las respuestas REGISTRADA anteriores no reemplazan un recibo terminal.
- Si Auth ya aplicó, conserva AUTH_APLICADA y resolucionAuthPendiente=true. No
  borra o modifica persona, cuenta, contraseña o roles; no lo presenta como una
  identidad compensada. CANCELADA con pendiente=false acredita solo una intención
  que no aplicó identidad.

**Prueba preparatoria de aborto**

- `pruebaAborto(id)` consulta exclusivamente RUND y devuelve nueve campos:
  versión, intención/operación, huellas de comando/contexto, decisión ABORTADA,
  estado nativo PREPARADA, fecha y motivo. No incluye comando, identidad,
  resultado de perfil o recibo Auth.
- Controlador GET `internal/rund/v1/identidad/intenciones/:intencionId/aborto`,
  protegido por InternalServiceGuard y Cache-Control private/no-store. Un JWT
  no sustituye la credencial interna. ID inválido/ausente devuelve 400/404;
  ejecución abierta o confirmada, 409. Auth caído no impide consultar el hecho local.
- El controlador se declara en AuthIdentityExecutionModule, que permanece fuera
  de AppModule. No se publica en el servicio activo ni por el gateway; no hay
  ruta de mutación, worker o bandera nueva. Los triggers existentes mantienen
  la exclusión irreversible aborto/commit después de devolver la prueba.
- La prueba todavía no es consumida por Auth para revertir identidad aplicada.
  No acredita cancelación remota ni constituye permiso de borrado transportable.

**Validación local**

- Builds Auth/RUND correctos. RUND: **68 suites / 1.218 pruebas**, veinte nuevas;
  Auth: **4 suites de identidad / 136 pruebas**, sin afirmar ejecución de toda Auth.
- **410 comprobaciones** de integración, con las 394 anteriores y dieciséis nuevas.
  TypeORM y HTTP reales sobre bases temporales ficticias separadas; la base RUND
  carece de schema Auth. El rol Auth que cancela solo tiene permisos sobre el
  registro de operaciones, sin acceso a persona/usuario/roles.
- Cancelación desde ausencia y registro existente; concurrencia con un UUID;
  respuesta perdida tras commits remotos y fallo al guardar el recibo local;
  recuperación por otra instancia sin repetir escrituras confirmadas.
- Registro remoto retenido después del commit y liberado tras cancelar: no
  reactiva la intención. Aplicación retenida después del commit remoto: la
  resolución identifica el aplicado pendiente y no confirma perfil RUND.
- Carrera aplicar/cancelar con un único estado terminal y caso determinista de
  aplicación entre GET y POST cancelar, con 409 real conciliado correctamente.
- GET interno con token obligatorio, DTO mínimo/no-store, 400/404/409 y sin
  escrituras. Huella ajena, 404, caída y DTO parcial conservan estado y datos.
- Los flujos activos dejan vacías las tres tablas preparatorias. Gateway:
  **19 controles HTTP**, uno nuevo para la prueba normal/codificada, sin cambios
  productivos en gateway, escritor Auth activo o entradas de negocio RUND.
- Evidencia y hashes encadenados:
  [validacion-resolucion-aborto-identidad-rund.json](validacion-resolucion-aborto-identidad-rund.json).

**Alcance y siguiente punto**

Este corte cierra la cancelación de intenciones no aplicadas; continúa pendiente
la compensación de identidad **ya aplicada**. Antes de revertirla, Auth debe
capturar atómicamente la preimagen y todos los efectos propios, verificar el
aborto durable y proteger cambios/reutilizaciones posteriores. El recibo actual
no cubre todos esos datos; invertir sus campos o borrar cuentas sería insuficiente.

Después continúan la conexión a entradas reales con permisos/OTP/prevalidación y
soporte, preview sin escritura remota, correo durable posterior al commit y
aceptación por instalación. No se activó escritura remota ni se agregaron o
ejecutaron migraciones en instalaciones existentes. Las bases ficticias se
eliminan al terminar las comprobaciones; no se leen `.env` reales.

Avance: **30 cortes técnicos locales desde el merge**, **11 pasos principales locales**
y **5 frentes abiertos**. Continúan frente 4 y aceptación `12.5d.2`. Sin push,
despliegue o retiro del RUND embebido de PTA.

## 68. Frente 4: efectos privados y compensación propietaria Auth de ediciones existentes (2026-10-15)

Auth captura los efectos de su aplicación y puede restaurar una edición existente
si verifica el aborto irreversible en RUND y demuestra que no hubo cambios o
reutilización conocida posteriores. Las altas nuevas quedan para revisión sin
eliminar personas/cuentas. Contrato:
[CONTRATO-COMPENSACION-IDENTIDAD-AUTH.md](CONTRATO-COMPENSACION-IDENTIDAD-AUTH.md).

**Captura y resolución propietarias**

- Nueva migración Auth 671, posterior a 669/670. Crea dos tablas privadas:
  rund_identidad_efecto y rund_identidad_compensacion. No cambia las tablas RUND
  ni el recibo histórico APLICADA. No se ejecuta automáticamente al arrancar.
- El aplicador remoto ahora requiere 671 antes de habilitarse. Conserva la
  bandera apagada por defecto, sin SQL/HTTP de ese aplicador mientras esté apagada.
  El escritor activo RUND permanece igual y no usa las tablas nuevas.
- Preimagen/postimagen, persona/cuenta/rol y recibo aplicado se confirman en una
  transacción. Si falla la captura se revierten todos los efectos, incluido APLICADA.
  El adaptador de identidad conserva sus reglas anteriores; una selección ambigua
  por duplicados se rechaza antes de aplicar.
- Captura solo columnas restaurables y revisiones xmin; no guarda contraseñas,
  hashes de contraseña, tokens o comando completo. Incluye todas las cuentas y
  asignaciones de la persona, fechas UTC con microsegundos y seccional bigint textual.
- Bloqueo asesor compartido y bloqueo EXCLUSIVE de personas/user/user_roles durante
  captura/restauración, con lock_timeout de cinco segundos. Excluye también
  escritores que no usan advisory; su contención se debe aceptar antes de activar.

**Compensación y límites seguros**

- API interna POST operaciones/:id/compensar y GET operaciones/:id/compensacion,
  token de servicio obligatorio, no-store y bloqueo por gateway normal/codificado.
  Nueva bandera RUND_IDENTITY_COMPENSATION_ENABLED=false en el ejemplo; no se
  cambia ningún .env real o Compose, ni se activa el mecanismo.
- Body exacto intención/huella. Auth consulta por HTTP al RUND para obtener el
  aborto; no admite una prueba, preimagen o valores antiguos del solicitante.
  Valida los nueve campos, IDs/huellas, decisión y ausencia de commit. Sin JWT,
  cookies, redirects o reintento automático. HTTP termina antes de los bloqueos Auth.
- Solo restaura con preimagen compatible, persona/cuenta anteriores, todas las
  revisiones/valores coincidentes, sin otra aplicación posterior de la misma persona
  y sin correo anterior reclamado por otra identidad. La revisión detecta ABA y
  cambios sensibles sin almacenar las credenciales. El orden detecta reutilización
  remota conocida incluso cuando una aplicación posterior no modificó filas.
- Restaura perfil/username y estado/fechas de asignaciones; retira solo las
  asignaciones creadas por la edición. No escribe contraseña, activación o condición
  temporal. No elimina personas o usuarios. Verifica los valores restaurados antes
  de guardar COMPENSADA, todo en la misma transacción.
- Cuando no se demuestra seguridad, conserva identidad intacta y registra
  REVISION_REQUERIDA con código cerrado: SIN_PREIMAGEN, PREIMAGEN_INCOMPATIBLE,
  ALTA_IDENTIDAD, CAMBIOS_POSTERIORES, OTRA_OPERACION_POSTERIOR o CORREO_REUTILIZADO.
  HTTP 200 no acredita reversión: exige COMPENSADA e identidadRevertida=true.
- Recibos finales inmutables/idempotentes. Respuesta perdida se recupera por GET;
  reintento devuelve el mismo recibo sin consultar RUND/restaurar otra vez. Una
  operación COMPENSADA no se vuelve a aplicar: POST aplicar devuelve 409. El GET
  original mantiene APLICADA como hecho histórico; su resolución se consulta aparte.

**Validación local**

- Compilaciones Auth/RUND correctas. Auth: **6 suites de identidad / 194 pruebas**,
  58 adicionales; no se afirma ejecución de toda Auth. RUND conserva **68 suites /
  1.218 pruebas**. Gateway mantiene **19 controles HTTP**, ampliados a compensar y
  consultar compensación por rutas normales/codificadas, sin cambios productivos.
- **434 comprobaciones de integración**: las 410 anteriores, migración 671 y
  23 casos nuevos, con Auth/TypeORM y prueba RUND HTTP reales sobre bases ficticias
  separadas. RUND carece de schema Auth y el escritor/compensador Auth no tiene
  privilegios sobre RUND.
- Captura/restauración exactas de perfil/username/roles, conservando todas las
  columnas de contraseña/activación. Rol reactivado vuelve a su estado/fechas;
  rol añadido se retira sin borrar otra asignación. Bigint superior al entero seguro,
  timestamp con microsegundos y lectura desde otra zona horaria sin diferencias.
- Seis solicitudes simultáneas con un recibo; respuesta perdida después del commit;
  fallos reales de captura, retiro de rol o persistencia de resolución revierten todo
  y permiten reanudar sin recibos falsos o dobles restauraciones.
- Altas de persona/cuenta e históricos sin preimagen requieren revisión. ABA,
  contraseña/rol posteriores, reutilización sin cambios y correo reclamado bloquean
  reversión conservando datos. Aborto abierto/confirmado, intención ajena, caída,
  404, redirect y DTO parcial/inválido no crean resolución o restauración falsas.
- 671 repetida no cambia datos; triggers rechazan modificación/borrado de imágenes
  y resoluciones; prueba con campos nulos no supera constraints. Migración ausente
  falla sin efectos si se intenta aplicar; banderas apagadas no la consultan.
- Los flujos activos dejan vacías las tablas preparatorias RUND. Evidencia y hashes:
  [validacion-compensacion-identidad-auth-rund.json](validacion-compensacion-identidad-auth-rund.json).

**Alcance y siguiente punto**

Se completa la compensación propietaria Auth para ediciones existentes demostrables.
Falta consumir y guardar duraderamente su recibo en RUND, con recuperación y trato
explícito de REVISION_REQUERIDA/altas. RUND mantiene AUTH_APLICADA y pendiente=true
hasta conciliar ese contrato, aunque Auth ya haya compensado: no se inventa cierre
distribuido. Un consumo externo sin escritura Auth ni registro de operación no se
detecta por xmin; la aceptación debe validar los consumidores y la política de altas.

Continúan entradas reales con permisos/OTP/prevalidación/soporte, preview sin
escritura remota, correo durable y aceptación por instalación. La prueba RUND sigue
en módulo desconectado, publicada solo en el fixture. Ambas banderas permanecen
apagadas. Sin bases existentes, .env reales, push o despliegue; el clúster temporal
ficticio se elimina al terminar.

Avance: **31 cortes técnicos locales desde el merge**, **11 pasos principales locales**
y **5 frentes abiertos**. Continúan frente 4 y aceptación `12.5d.2`; no se retira el
RUND embebido de PTA.

## 69. Frente 4: conciliación durable de compensación propietaria en RUND (2026-10-15)

RUND guarda y recupera el recibo mínimo de la resolución Auth del punto 68. Solo
COMPENSADA confirmada localmente cierra su pendiente; REVISION_REQUERIDA conserva
el pendiente con un indicador explícito. Contrato:
[CONTRATO-CONCILIACION-COMPENSACION-RUND.md](CONTRATO-CONCILIACION-COMPENSACION-RUND.md).

**Registro propio separado del historial aplicado**

- Nueva migración RUND 011, posterior a 008–010. Tabla identidad_resolucion_auth,
  con FK local a la ejecución, IDs/huellas de comando/contexto, estado/motivo,
  recibo mínimo de ocho campos y fecha de persistencia. No copia identidad,
  preimagen/postimagen, contraseñas o tokens ni hace SQL sobre Auth.
- Conserva AUTH_APLICADA y su recibo original como hechos históricos. No modifica
  perfiles, bloques, evidencias, auditoría de negocio o resultado nativo. No confirma
  un perfil por haber compensado su identidad ni envía correo.
- Inserción exige aborto irreversible, contexto sin commit e identidad aplicada,
  con IDs/huellas coincidentes. Bloquea journal/contexto/decisión en el orden existente.
  Constraints vinculan las ocho claves y sus estados/booleanos/motivos; no admiten
  claves adicionales. Triggers impiden UPDATE/DELETE. Repetir 011 conserva registros
  y no fabrica resoluciones para las ejecuciones anteriores.

**Cliente y coordinación explícita**

- AuthIdentityCompensationClient usa HTTP al propietario con UUID original,
  intención y huella. Valida DTO exacto, metadatos, fecha ISO canónica, motivo cerrado
  y booleano coherente. Solo encontrada=false/resolucion=null con consulta exacta
  acredita ausencia. 404, caída y DTO parcial/ajeno producen 503; 409 POST conserva
  conflicto, sin fabricar cancelación, compensación o revisión.
- Token de servicio exclusivamente, sin JWT/cookies, redirects, caché o reintento
  automático; timeout de diez segundos. No envía el comando, datos anteriores o
  una prueba de aborto aportada por el llamante.
- AuthIdentityCompensationService ofrece consultar local, reconciliar por GET sin
  compensación remota, y resolver que concilia antes de solicitar compensación si
  todavía falta su recibo. Exige AUTH_APLICADA y ABORTADA sin commit antes de HTTP
  y lo verifica de nuevo al guardar bajo bloqueo; HTTP fuera de transacciones RUND.
- Un recibo terminal local se recupera sin HTTP o escritura. Ausencia GET retenida
  no borra la resolución que otra solicitud ya guardó. Recibo idéntico se reutiliza;
  contradictorio no reemplaza el ya confirmado. No genera otro UUID para reintentar.
- resolverAborto del ejecutor conserva la cancelación no aplicada del punto 67;
  recuperar conserva su consulta del recibo aplicado. La compensación aplicada y
  su recuperación se solicitan explícitamente al servicio nuevo, sin activación
  automática de ese comportamiento en los métodos previos.

**Estado, revisión y fallos**

- consultar del ejecutor agrega resolucionAuth y revisionAuthRequerida. Una
  COMPENSADA guardada localmente deja pendiente=false; una REVISION_REQUERIDA deja
  pendiente=true/revision=true. Conserva AUTH_APLICADA como historial y PREPARADA
  nativa como ausencia de commit. La decisión ABORTADA sigue impidiendo reanudar.
- Una revisión es terminal para este recibo: reintentar la devuelve sin pedir otra
  restauración. Pendiente=true requiere tratar explícitamente el caso; no autoriza
  repetir escrituras automáticamente. Las altas siguen sin borrarse.
- Si Auth confirma pero se pierde su respuesta o falla la persistencia local,
  RUND conserva el pendiente hasta recuperar y guardar el recibo por GET. No vuelve
  a pedir compensación cuando GET ya confirma el resultado. Si se pierde respuesta
  tras guardar localmente, otra instancia recupera el hecho sin HTTP o nuevos efectos.

**Validación local**

- Compilaciones Auth/RUND correctas. RUND: **70 suites / 1.278 pruebas**, sesenta
  nuevas; Auth conserva **6 suites de identidad / 194 pruebas**, sin afirmar toda
  su batería. Gateway conserva **19 controles HTTP**, sin cambios productivos.
- **452 comprobaciones de integración**: conserva las 434 anteriores, actualizando
  la expectativa del esquema vacío, y agrega migración 011 más diecisiete casos.
  Esquema RUND vacío: **31 tablas**, siete categorías, ninguna copia de docentes.
- Auth/RUND y TypeORM por HTTP reales, en bases ficticias separadas. RUND carece
  de schema Auth; el propietario Auth conserva la ausencia de privilegios RUND.
  Camino completo aborto → compensación propietaria → recibo local, sin alterar
  el journal aplicado original, contexto, perfil o demás tablas nativas.
- Concurrencia con un recibo/fecha, recuperación por otra instancia, respuesta Auth
  perdida después del commit y fallo local de inserción; GET recupera el resultado
  sin otro POST/restauración. Un servidor HTTP ficticio pierde la respuesta tras
  persistir localmente; reanudar tampoco consulta Auth o duplica efectos.
- GET de ausencia retenido mientras otra solicitud confirma resolución; no borra
  el hecho. Altas/cambios posteriores producen revisión explícita y conservan los
  datos. Una cancelación no aplicada conserva su camino sin solicitar compensación.
- Caída/404/DTO parcial/bandera apagada no inventan ausencia o recibo; resolución
  ajena/contradictoria no sustituye la final. SQL rechaza estados/contextos no
  admitidos y DTO nulo/adicional/incoherente; 011 repetida y registros inmutables
  conservan fechas/contenido. Los flujos activos dejan vacías las cuatro tablas
  preparatorias RUND.
- Evidencia y hashes encadenados:
  [validacion-conciliacion-compensacion-rund.json](validacion-conciliacion-compensacion-rund.json).

**Alcance y siguiente punto**

La conciliación de resolución Auth queda preparada y validada, incluida la
distinción entre compensación y revisión. Siguen la política/tratamiento de altas
y revisiones, y la conexión a entradas reales con intención estable y controles de
permisos/OTP/prevalidación/soporte. Continúan preview sin escritura remota, correo
durable y aceptación por instalación; no se certifica activación o cierre operativo.

El ejecutor ahora importa/exporta el módulo preparatorio de compensación, pero
ambos siguen fuera de AppModule. Su consulta ampliada requiere 011 antes de usar
el ejecutor preparatorio; los flujos activos no la consultan. Sin nuevas rutas,
workers, banderas o cambios de .env/Compose. Las banderas Auth siguen apagadas por
defecto. Solo se usó un clúster ficticio temporal eliminado al terminar, sin bases
existentes, push o despliegue.

Avance: **32 cortes técnicos locales desde el merge**, **11 pasos principales locales**
y **5 frentes abiertos**. Continúan frente 4 y aceptación `12.5d.2`; no se retira el
RUND embebido de PTA.

## 70. Frente 4: casos durables, bandeja y asignación de revisiones (2026-10-15)

Cada REVISION_REQUERIDA conciliada en RUND recibe un caso propio para seguimiento.
Un operador autorizado puede asumirlo sin alterar identidad o cerrar el pendiente.
Contrato: [CONTRATO-REVISION-IDENTIDAD-RUND.md](CONTRATO-REVISION-IDENTIDAD-RUND.md).

**Caso atómico y seguimiento**

- Migración RUND 012, posterior a 008–011. Tabla identidad_revision con FK propia
  a la resolución RUND, UUID estable de caso, intención, estado y fechas. No añade
  FK entre propietarios ni copia identidad, documentos, comandos o credenciales.
- Un trigger crea el caso en la misma transacción que el recibo REVISION_REQUERIDA.
  Si falla el caso, revierte también el recibo local; reconciliar por GET propietario
  recupera ambos sin compensar otra vez. COMPENSADA no genera un caso.
- Incorpora revisiones anteriores usando la fecha del recibo local. Repetir 012
  conserva UUID, fecha y asignaciones. SQL protege metadatos, impide DELETE y solo
  admite PENDIENTE → EN_REVISION con responsable y fecha de la transacción.
- consultar del ejecutor agrega casoRevision (UUID/estado o null). Una revisión
  asumida conserva resolucionAuthPendiente=true y revisionAuthRequerida=true.
  Se mantienen AUTH_APLICADA histórica, ABORTADA irreversible y PREPARADA nativa.

**Bandeja y asignación protegidas**

- AuthIdentityReviewModule ofrece GET de listado y caso, y POST /:casoId/asumir,
  bajo banco-docentes/identidad/revisiones. Solo se importa/exporta en el ejecutor
  desconectado; no se publica por AppModule ni modifica las rutas activas.
- JwtAuthGuard y PermissionsGuard exigen sesión y gestión RUND con el permiso
  existente banco-docentes.rund.manage y sus reglas de superadministración.
  Roles normales se resuelven por HTTP Auth; los permisos declarados por el
  solicitante no los conceden. Auth caído/parcial deniega con el 403 del guard
  existente. Un token interno no sustituye el JWT del operador.
- Responsable desde el subject firmado de la sesión, con sus alias existentes;
  body vacío, sin elegir otro actor, fecha o estado. Bloqueo de fila antes de
  asignar; mismo actor devuelve la asignación original, otro recibe 409. Fallo
  revierte actor/fecha juntos; respuesta perdida se recupera sin otro UPDATE.
- Bandeja con límite 25 por defecto/100 máximo, filtro PENDIENTE o EN_REVISION,
  cursor por fecha/UUID sin OFFSET. Conserva los seis decimales de PostgreSQL y
  valida versión, fecha y filtro. Es una bandeja viva; una asignación concurrente
  puede sacar casos del filtro pendiente. Todas las respuestas usan no-store.
- No existe cierre o reasignación en este corte. Asumir no compensa, borra cuentas,
  reactiva intenciones, confirma perfiles o envía correo. La política y resolución
  de negocio de altas/revisiones continúa pendiente.

**Validación local**

- Compilaciones Auth/RUND correctas. RUND: **72 suites / 1.309 pruebas**, 31 nuevas;
  Auth: **6 suites de identidad / 194 pruebas**. No se afirma toda la batería Auth.
  Gateway: **20 controles HTTP**, uno nuevo, sin cambios productivos del gateway.
- **469 comprobaciones de integración**: conserva las 452 anteriores actualizando
  la expectativa del esquema vacío, y agrega 012 más dieciséis casos de revisión.
  RUND vacío: **32 tablas**, siete categorías y ninguna copia de docentes.
- PostgreSQL/TypeORM, JWT/guards y permisos Auth HTTP reales en bases ficticias
  separadas. Creación atómica/rollback, recuperación por GET, backfill y repetición
  de 012 sin desasignar. El SQL rechaza cambio de IDs, borrado, reasignación,
  cierre, fecha falsa o caso para una COMPENSADA.
- Revocación del grant con el mismo JWT, permiso inventado en claims, token interno,
  sesión sin actor y Auth caído/ausente/parcial deniegan acceso sin asignar.
  Seis solicitudes del mismo actor convergen; dos actores obtienen 200/409.
- Precisión de microsegundos y empates de fecha: páginas sin duplicados/omisiones;
  cursor con otro filtro y parámetros inválidos fallan. Respuesta perdida después
  de asignar y fallo de UPDATE conservan idempotencia o rollback completo.
- Casos asumidos siguen pendientes, sin cambiar identidad, recibo propietario o
  perfil. RUND continúa sin schema Auth; el propietario Auth no recibe privilegios
  RUND. Los flujos activos dejan vacías las cinco tablas preparatorias propias.
- Evidencia y hashes de fuentes conservadas:
  [validacion-revision-identidad-rund.json](validacion-revision-identidad-rund.json).

**Alcance y siguiente punto**

Quedan preparados el registro, consulta y responsable de las revisiones; no se
declara resuelta la política de altas ni un cierre humano. Sigue vincular la
intención estable con las entradas reales y sus permisos/OTP/prevalidación/soportes,
y definir la resolución de revisiones antes de activar. Continúan preview sin
escritura remota, correo durable y aceptación por instalación.

La consulta del ejecutor preparatorio requiere ahora 012; el ejecutor y la bandeja
siguen fuera de AppModule. Las banderas Auth permanecen apagadas por defecto. Sin
cambios de .env/Compose, workers o migración automática. Solo clúster ficticio
temporal eliminado al terminar, sin bases existentes, push o despliegue.

Avance: **33 cortes técnicos locales desde el merge**, **11 pasos principales locales**
y **5 frentes abiertos**. Continúan frente 4 y aceptación `12.5d.2`; no se retira el
RUND embebido de PTA. Este conteo no equivale a un porcentaje de independencia.

## 71. Frente 4: intención estable por solicitud de creación manual (2026-10-15)

Se reserva el vínculo actor/solicitud → intención antes de preparar la ejecución.
Completa la base de idempotencia que faltaba entre el origen de una solicitud y
el ejecutor del punto 66, todavía sin conectar las rutas activas. Contrato:
[CONTRATO-SOLICITUD-IDENTIDAD-RUND.md](CONTRATO-SOLICITUD-IDENTIDAD-RUND.md).

**Reserva anterior a cualquier ejecución**

- RUND 013 crea identidad_solicitud: actor/solicitud UUID como clave, intención
  única generada por servidor, origen CREAR_MODAL, dos huellas y fecha. No usa
  documento, correo, hash del formulario o número de fila como identidad de operación.
  No copia formulario, credenciales, identidad o resultados Auth en esta tabla.
- La reserva persiste en autocommit antes de preparar journal/contexto/decisión.
  Si falla el contexto, el mismo actor/solicitud recupera el ID para completar la
  preparación. Seis solicitudes simultáneas convergen; otra solicitud explícita
  o actor recibe otra intención, aunque coincida el formulario/UUID del solicitante.
- Ambas huellas deben coincidir al reintentar; otro contenido devuelve 409 sin
  reemplazar el original. Reserva inmutable, sin UPDATE/DELETE, TTL o adopción de
  journals anteriores. Triggers verifican comando/contexto y actor/canal de los
  registros vinculados. Sin FK a 008 porque la reserva debe poder antecederlo.
- Repetir 013 conserva registros y no inventa solicitudes para el historial. Las
  intenciones anteriores sin vínculo siguen con su contrato original.

**Preparación manual con reglas existentes**

- AuthIdentityRequestService solo admite MODAL/CREAR, actor UUID coincidente,
  rejectExisting=true, territorial resuelta y validación estricta; rechaza edición,
  masivo, API, autogestión y opciones relajadas. Reutiliza las reglas obligatorias
  y manuales del banco. validatePayload solo se exporta, sin cambiar cuerpo/llamadas.
- Verifica formulario normalizado, contexto nativo y comando Auth, incluyendo
  nombres, género, fecha civil y datos de contacto. Captura datos independientes
  antes de esperar SQL: mutar el objeto original no cambia lo que se prepara.
- preparar reserva y llama al preparador existente con la intención guardada;
  no registra/aplica identidad, confirma perfil o envía correo. consultar acota
  la lectura al actor/solicitud y devuelve IDs/huellas/fecha y preparación.
- PENDIENTE indica contexto incompleto; LISTA acredita contexto/decisión persistidos,
  no permiso, prevalidación Auth, perfil creado o ejecución permitida. Un aborto
  irreversible no se reactiva por volver a preparar.
- El llamador debe autenticar y comprobar permisos en cada intento y aportar
  actor/catálogo confiables. El módulo nuevo no declara rutas y permanece fuera
  de AppModule. No se modifica el controlador activo, sus validaciones o JWT.
- El contexto incluye auditoría congelada; la futura entrada debe recuperar sus
  datos originales al reintentar, sin regenerar IP/fechas que cambiarían la huella.
  El servicio no sustituye el control de permisos, prevalidación, soportes u OTP.

**Validación local**

- Compilaciones Auth/RUND correctas. RUND: **73 suites / 1.339 pruebas**, treinta
  nuevas; Auth conserva **6 suites de identidad / 194 pruebas**. Gateway conserva
  **20 controles HTTP**; no se afirma toda la batería Auth.
- **482 comprobaciones de integración**: conserva las 469 anteriores con la nueva
  expectativa de tablas y agrega 013 más doce escenarios. RUND vacío: **33 tablas**,
  siete categorías y ninguna copia de docentes.
- TypeORM y PostgreSQL reales con bases ficticias separadas. Casos manuales
  inválidos o comando distinto no reservan. Clave por actor, conflicto de contenido,
  seis peticiones concurrentes y persistencia de UUID/fecha después de reintentar.
- Fallos de reserva y contexto, recuperación por otra instancia y pérdida real de
  respuesta HTTP tras preparar. Sin identidad/perfil/correo durante preparación;
  las reservas incompletas permanecen consultables y recuperables.
- Ejecución explícita del fixture con el ID reservado hasta commit Auth/nativo;
  preparar después recupera los mismos IDs sin reescribir identidad o perfil.
  Un aborto sigue impidiendo ejecutar. SQL rechaza comando/contexto ajenos,
  adopción de journal y cambios/borrados de reserva; 013 repetida conserva todo.
- Los flujos activos dejan vacías las seis tablas preparatorias RUND. Esa base
  carece de schema Auth y el propietario Auth conserva sus privilegios separados.
  Evidencia: [validacion-solicitud-identidad-rund.json](validacion-solicitud-identidad-rund.json).

**Alcance y siguiente punto**

Se completa el vínculo durable para una creación manual ya autorizada y normalizada.
Sigue conectar su entrada con la sesión/permisos, catálogo, prevalidación Auth y
recuperación del contexto original, conservando el ID desde el cliente. Edición,
lotes y autogestión requieren su propio origen y controles antes de activar.
También siguen el cierre de altas/revisiones, preview sin escritura remota, correo
durable y aceptación por instalación.

Ambas banderas Auth permanecen apagadas y el escritor actual conserva su transacción
y correo. Sin rutas activas nuevas, migración automática o cambios .env/Compose.
Solo clúster temporal ficticio eliminado al finalizar; sin bases existentes, push,
despliegue o retiro del RUND embebido de PTA.

Avance: **34 cortes técnicos locales desde el merge**, **11 pasos principales locales**
y **5 frentes abiertos**. Continúan frente 4 y aceptación `12.5d.2`; el conteo no es
un porcentaje de independencia ni certificación de ambientes.

## 72. Frente 4: entrada manual protegida, captura y prevalidación Auth (2026-10-15)

La preparación manual recibe formulario e ID estable desde una frontera HTTP con
sesión y reglas de rol/permiso del banco. Captura el origen de forma recuperable,
consulta el catálogo y prevalida Auth. Continúa desconectada de AppModule y del POST
activo; ninguna ruta ejecuta identidad o confirma perfiles. Contrato:
[CONTRATO-ENTRADA-MANUAL-IDENTIDAD-RUND.md](CONTRATO-ENTRADA-MANUAL-IDENTIDAD-RUND.md).

**Frontera protegida con reglas existentes**

- AuthIdentityManualEntryController declara POST preparar, POST reanudar-preparacion
  y GET por solicitud UUID bajo banco-docentes/identidad/solicitudes-manuales.
  JwtAuthGuard y BancoDocentesRolesGuard conservan la alternativa por roles de
  gestión o permiso banco-docentes.rund.manage del modal, consultado por HTTP Auth
  para roles normales. No se confían permisos declarados en JWT/body.
- Actor desde la sesión firmada y con UUID; fullAccess derivado de roles. El body
  solo aporta formulario plano de campos escalares; no actor, comando, contexto,
  opciones, IP de auditoría o credenciales. Recuperación con body vacío. GET/POST
  se autorizan cada vez y usan no-store; otro actor recibe 404.
- El gateway mantiene transporte y redacción de cuerpos RUND. La frontera nueva
  transforma errores de infraestructura a 503 genérico, sin propagar parámetros
  SQL privados al logger HTTP; conflictos/validaciones conservan sus códigos.

**Captura y recuperación originales**

- RUND 014 amplía identidad_solicitud con huella_formulario y entrada_manual
  nullable, sin agregar tablas. Las solicitudes de 71 conservan ambos null;
  no se reconstruyen formularios, auditorías o aprobaciones históricas.
- Para nuevas entradas se reutilizan validaciones manuales y catálogo Auth de
  territoriales, con el mismo findTerritorialMatch del modal. Solo se exporta la
  función; su cuerpo y llamadas permanecen iguales. Catálogo fallido/parcial o
  territorial desconocida no reserva una intención.
- ID, huellas, formulario original y contexto canónico se insertan juntos en la
  reserva. La auditoría y el catálogo quedan congelados antes de preparar 008–010.
  No hay HTTP dentro de esa transacción. La tabla ahora sí puede contener datos
  personales privados: no se devuelven en los DTO ni se registran en logs.
- Las dos columnas son coherentes/limitadas, con sobre versionado exacto y actor,
  canal/acción coincidentes. 013 también protege su inmutabilidad; 014 compara el
  contexto nuevo contra la captura original. Repetir la migración conserva todo.
- Otro formulario para la misma clave devuelve 409. El mismo formulario recupera
  la primera captura aunque cambie IP o roles de una sesión aún autorizada. Un
  fallo antes de guardar contexto deja captura/journal recuperables por otro
  proceso, sin reconstruir auditoría o requerir otro catálogo.
- Se conserva el formulario original para normalizar sus alias al reanudar.
  Los históricos null devuelven 409 y requieren recuperación explícita de servidor.

**Prevalidación fresca, sin ejecución**

- Usa el UUID de operación Auth persistido, documento/correo capturados y
  resolverPorCorreo=false mediante el cliente propietario del punto 61. Ruta
  ausente, caída o respuesta parcial dan 503, conservando captura/IDs para reintentar.
- Conflicto de correo confirmado: 409; rol docente sin configurar: 503; persona
  con perfil RUND existente en ese período: 409. No copia identidad ajena.
- Un POST compatible devuelve prevalidacion={estado:COMPATIBLE,reserva:false}.
  Cada preparación/recuperación vuelve a consultar Auth; no se guarda aprobación
  permanente. GET solo consulta metadatos. LISTA continúa significando contexto
  preparado, sin permiso de ejecución, perfil creado o reactivación de abortos.
- Preparar no registra/aplica/cancela/compensa identidad, confirma perfiles ni
  envía correo. Se conservan los recibos y barreras de ejecución de los puntos previos.

**Validación local**

- Compilaciones Auth/RUND correctas. RUND: **75 suites / 1.377 pruebas**, 38 nuevas;
  Auth: **6 suites de identidad / 194 pruebas**, sin afirmar toda su batería.
  Gateway: **21 controles HTTP**, uno nuevo; sin cambios productivos del gateway.
- **499 comprobaciones de integración**: conserva las 482 anteriores y agrega
  014 más dieciséis escenarios. Continúan **33 tablas**, siete categorías y cero
  docentes copiados. El fixture 71 contempla las dos columnas nullable nuevas sin
  inventar capturas para sus solicitudes.
- PostgreSQL/TypeORM, JWT, guards, permisos, catálogo y prevalidación Auth reales
  en bases ficticias separadas. Actor ajeno, claims falsos, token interno sin JWT,
  body/contexto falsificado y formularios inválidos no preparan entradas.
- Revocación del grant con el mismo JWT y permisos Auth caídos/parciales; catálogo
  fallido/vacío; prevalidación fallida, respuesta perdida, fallo de captura/contexto
  y recuperación por otra instancia, conservando formulario con alias/auditoría.
- Seis solicitudes iguales convergen; dos formularios simultáneos tienen un solo
  ganador. IP/roles nuevos no reemplazan la captura. Conflicto real de correo y
  perfil ya confirmado se detectan sin repetir identidad o alterar negocio.
- Constraints rechazan captura parcial/extra/actor ajeno; UPDATE y contexto distinto
  fallan. Repetir 014 conserva datos y null históricos. DTO sin formulario/identidad,
  servicios con token interno sin reenviar JWT/cookies y flujos activos sin capturas.
- Evidencia y hashes: [validacion-entrada-manual-identidad-rund.json](validacion-entrada-manual-identidad-rund.json).

**Alcance y siguiente punto**

La frontera de preparación queda validada y desconectada del arranque activo.
Sigue conectar el cliente manual para conservar ID/formulario y habilitar ejecución
con autorización/revalidación vigente; la prevalidación no es una reserva ni aprobación
permanente. Edición, lotes y autogestión requieren origen/soportes/sugerencias/OTP
propios. Continúan la política de altas/cierre de revisiones, preview sin escritura
remota, correo durable y aceptación por ambiente.

Ambas banderas Auth continúan false por defecto; escritor activo, transacción y correo
se conservan. Sin flags nuevos, .env/Compose, migración automática, bases existentes,
push o despliegue. El clúster ficticio temporal se elimina al finalizar.

Avance: **35 cortes técnicos locales desde el merge**, **11 pasos principales locales**
y **5 frentes abiertos**. Continúan frente 4 y aceptación `12.5d.2`; no se retira el
RUND embebido de PTA ni se calcula un porcentaje a partir de estas pruebas/cortes.

## 73. Frente 4: ejecución manual autorizada y cliente de solicitud estable (2026-10-15)

La entrada preparatoria del punto 72 incorpora ejecución explícita por solicitud y
actor, con comprobaciones vigentes entre fases y recibo mínimo recuperable. Se añade
un cliente aislado para conservar el ID frente a respuestas perdidas. Ambos siguen
sin activar el flujo nuevo en el formulario/arranque actuales. Contrato:
[CONTRATO-EJECUCION-MANUAL-IDENTIDAD-RUND.md](CONTRATO-EJECUCION-MANUAL-IDENTIDAD-RUND.md).

**Ejecución y controles actuales**

- POST :solicitudId/ejecutar con body vacío y GET :solicitudId/ejecucion bajo el
  prefijo manual existente. Conservan JWT, reglas de rol o manage del banco,
  no-store, actor de sesión, 404 para otro actor y errores de infraestructura
  genéricos. El body no puede elegir intención, contexto, actor o permisos.
- AuthIdentityManualExecutionService exige expiración JWT vigente para escribir,
  también si el token carece de exp. Resuelve la captura propia y la prevalidación
  del punto 72; ABORTADA no se reactiva. Un commit conocido devuelve su recibo
  sin prevalidar, aplicar identidad o escribir perfil de nuevo.
- ejecutarConControles del ejecutor invoca callbacks de servidor antes de registrar
  en Auth, aplicar identidad y confirmar RUND. Cada callback revalida sesión y
  permisos frescos para roles normales, sin caché del guard de esa petición.
  Se conservan las autorizaciones por rol de gestión. ejecutar mantiene su camino
  anterior al delegar sin callbacks; el método nuevo no acepta funciones del body.
- Después de una autorización asíncrona se comprueba de nuevo el aborto antes de
  la mutación Auth. El commit conserva los bloqueos/exclusión SQL de los puntos
  anteriores. No se mantiene una transacción SQL durante HTTP.
- Revocación/consulta de permiso fallida: 403; vencimiento de sesión: 401. Si Auth
  ya se aplicó, no se confirma perfil desde el checkpoint denegado. La nueva sesión
  autorizada recupera el mismo aplicado, sin repetir identidad. Fallos nativos
  revierten perfil/auditoría/marcador y conservan el pendiente sin aborto automático.
- Una revocación posterior al último control puede coincidir con una petición ya
  en vuelo: estos controles no son atomicidad distribuida de permisos. Se conserva
  el límite operativo que debe aceptarse antes de habilitar la integración.

**Recibo y cliente recuperables**

- El recibo tiene nueve campos, sin formulario, cuenta, persona o resultado nativo
  completo. PENDIENTE/ABORTADA no devuelven docente o fecha confirmados. CONFIRMADA
  conserva IDs/docente/fecha del commit. correo=PENDIENTE no acredita envío ni cola;
  el correo durable sigue pendiente de implementación antes de activar.
- Después de reautorizar se recupera un commit concurrente o una respuesta perdida.
  GET/repetir ejecución no genera otra intención o escritura. Una ausencia remota
  desactualizada puede devolver 503 mientras otro proceso avanza; recuperar/reintentar
  explícitamente con el mismo ID, sin bucles automáticos de POST.
- RundManualIdentityClient usa el transporte existente, aislado de rundApi y del
  modal activo. Guarda solo UUID por actor en sessionStorage antes de HTTP, sin
  formulario/JWT. Recarga permite reanudar desde la captura del servidor.
- Timeout/401/403/409/503/DTO parcial mantienen el ID. No genera otro para recuperar;
  storage inválido/bloqueado detiene HTTP. Desactiva retries, refresh automático,
  logs privados y toasts automáticos de ese transporte.
- Doble clic de ejecución comparte una petición. Valida recibo estricto, IDs,
  estados y fecha UTC con microsegundos. Solo cerrar con CONFIRMADA coherente y
  petición terminada retira la reserva del navegador; no presenta pendientes como éxito.

**Validación local**

- Auth/RUND compilados. RUND: **76 suites / 1.395 pruebas**, dieciocho nuevas;
  Auth conserva **6 suites de identidad / 194 pruebas**. Gateway: **22 controles
  HTTP**, uno nuevo, sin cambios productivos del gateway.
- MFE RUND: **20 archivos / 198 pruebas**, dieciocho nuevas; TypeScript completo
  y build Vite correctos. Build generado solo en tmp. El helper nuevo no aparece
  en los bundles del formulario activo y no cambia su POST.
- **512 comprobaciones de integración**: conserva las 499 anteriores y agrega
  trece escenarios. Sin migración nueva: continúan 33 tablas y siete categorías.
  Datos ficticios separados con PostgreSQL, TypeORM, JWT/guards y HTTP Auth reales.
- Creación con recibo mínimo, concurrencia y recuperación; revocación durante
  prevalidación, después del registro y después de aplicar Auth. JWT vencido
  durante HTTP impide commit nativo y permite recuperar con otra sesión válida.
- Fallo de auditoría nativa, respuesta perdida tras commit y contrato/bandera Auth
  no disponible no fabrican éxito. Reintentar conserva UUID y aplicado; no envía
  correo o compensa/aborta automáticamente. Aborto durante registro impide aplicar.
- Recibo conocido se recupera sin API de identidad disponible y continúa exigiendo
  permiso. Otro actor no lo consulta. Transporte de identidad sin JWT/cookies,
  base RUND sin schema Auth y propietario Auth sin privilegios RUND. Los flujos
  activos siguen sin usar los journals preparatorios.
- Evidencia: [validacion-ejecucion-manual-identidad-rund.json](validacion-ejecucion-manual-identidad-rund.json).

**Alcance y siguiente punto**

Quedan preparados y probados ejecución manual protegida, recuperación y cliente
de ID estable. Falta montar el cliente en el modal con su ciclo de confirmación/
recuperación y cerrar correo durable, política de altas/revisiones y preview sin
escritura remota antes de activar. Edición/lotes/autogestión necesitan origen y
controles propios de soporte, sugerencias y OTP; sigue aceptación por ambiente.

El módulo continúa fuera de AppModule y ambas banderas Auth false por defecto.
Sin cambios .env/Compose, migraciones nuevas, bases existentes, push o despliegue.
El clúster temporal ficticio se elimina al finalizar. El flujo activo conserva
su escritor, transacción y correo.

Avance: **36 cortes técnicos locales desde el merge**, **11 pasos principales locales**
y **5 frentes abiertos**. Continúan frente 4 y aceptación `12.5d.2`; no se retira el
RUND embebido de PTA ni se infiere porcentaje de independencia desde estas cifras.

## 74. Frente 4: conexión opcional del formulario y recuperación visual (2026-10-15)

El modal de creación incorpora una conexión explícita al cliente del punto 73,
con preparación, confirmación, consulta y finalización separadas. El llamador
activo no proporciona esa conexión; la creación actual continúa como predeterminada.
Contrato: [CONTRATO-FORMULARIO-MANUAL-IDENTIDAD-RUND.md](CONTRATO-FORMULARIO-MANUAL-IDENTIDAD-RUND.md).

**Comportamiento preparado**

- Se conservan validación y construcción del payload del formulario. La entrada
  opcional elimina auditoría/soportes/sugerencias del navegador; el servidor obtiene
  su contexto de sesión. No se transforma userPersonId en principal JWT.
- Preparar reserva el UUID antes de HTTP y sustituye el formulario por el diálogo
  de solicitud. Confirmar requiere preparación válida y una acción adicional.
  No se ejecuta por montar, consultar o recuperar la preparación.
- Consultar permite recuperar un commit cuya respuesta se perdió. Solo un recibo
  CONFIRMADA válido muestra éxito; Finalizar retira la reserva y avisa al listado.
  El correo continúa explícitamente pendiente, sin afirmar envío ni encolado.
- Recuperar reenvía la misma copia en memoria o usa la captura del servidor tras
  reabrir. Errores de sesión, permisos, conflicto, infraestructura o DTO parcial
  conservan el ID. No hay reintentos automáticos o fallback al escritor anterior.
- Petición en vuelo bloquea acciones/cierre y clics repetidos. Cambio de cliente
  invalida el diálogo y descarta respuestas tardías; desmontaje evita callbacks.
  Storage inválido impide HTTP y no abre el formulario anterior como alternativa.
- Ediciones por id/docente_id conservan su ruta, soporte obligatorio, justificación,
  sugerencias y protección de datos, incluso si existe una solicitud pendiente.

**Validación local**

- MFE RUND: **21 archivos / 217 pruebas**, diecinueve nuevas. TypeScript completo
  y compilación Vite correctos; salida únicamente en tmp. Aviso de deprecación de
  act de la infraestructura React existente, sin errores de pruebas o compilación.
- Se prueban formulario/cliente reales con transporte simulado: creación actual,
  preparación sin auditoría del navegador y edición con soporte/sugerencia. También
  confirmación explícita, recuperación al reabrir, copia de captura, 401/403/409/503,
  pendiente, aborto, recibo parcial, doble clic, storage y cambio de cliente.
- Fuentes de backend, gateway, SQL, cliente HTTP y configuración conservadas por
  huella. El formulario anterior se compara con HEAD excluyendo únicamente la
  conexión opcional, sus imports/tipos y el texto preparatorio del botón.
- Las **512 comprobaciones de integración**, **22 controles HTTP del gateway**,
  **1.395 pruebas RUND** y **194 pruebas Auth de identidad** son evidencia heredada
  del punto 73 sobre fuentes intactas. No se vuelven a ejecutar en este corte de UI;
  tampoco se presentan como una validación integral nueva de navegador y servidor.
- Evidencia: [validacion-formulario-manual-identidad-rund.json](validacion-formulario-manual-identidad-rund.json).
  Manifiesto y revisión: corte-74-rund.paths y revision-push-corte-74.json.

**Límites y siguiente punto**

La conexión sigue siendo preparatoria. Falta exponer de forma confiable el principal
de sesión al cliente del shell y revisar la captura recuperada antes de confirmarla
en operación. Un ID sin captura remota, o con captura incompatible, no se descarta
automáticamente: requiere definir corrección/abandono seguros del lado servidor.
Estos pendientes preceden a la activación junto con correo durable, política/cierre
de altas/revisiones, preview sin escritura remota, otros canales y aceptación por
instalación. El siguiente corte debe abordar la revisión autorizada de la captura
recuperada, conservando el mismo ID y sin exponer auditoría o secretos.

El módulo de servidor continúa fuera de AppModule y las dos banderas Auth false
por defecto. Sin cambios .env/Compose, SQL, bases existentes, push o despliegues.
No se retira RUND embebido de PTA. La independencia total sigue pendiente.

Avance: **37 cortes técnicos locales desde el merge**, **11 pasos principales locales**
y **5 frentes abiertos**. Continúan frente 4 y aceptación `12.5d.2`; el número de
cortes no representa un porcentaje de independencia o despliegue.

## 75. Frente 4: revisión autorizada de captura y confirmación visual (2026-10-15)

La conexión opcional del punto 74 permite revisar los datos efectivamente guardados
antes de confirmar, incluso tras reabrir. Contrato:
[CONTRATO-REVISION-CAPTURA-MANUAL-RUND.md](CONTRATO-REVISION-CAPTURA-MANUAL-RUND.md).
El llamador activo sigue sin proporcionar el cliente y el módulo continúa inactivo.

**Lectura privada sin efectos de escritura**

- GET :solicitudId/captura conserva JWT, reglas de rol o manage del banco y
  no-store. Actor, roles y expiración proceden de los claims firmados; query/body
  no pueden elegir otro actor, permiso o acceso sensible.
- AuthIdentityManualCaptureService exige UUID y exp vigente. Comprueba permisos
  frescos antes y después de leer para los roles normales; conserva autorización
  por rol GESTION_PROFESORAL/SUPER_ADMIN/ADMIN. Sesión vencida: 401; permiso ausente
  o consulta fallida: 403. No utiliza el permiso cacheado del guard del request.
- Busca por actor/solicitud y reutiliza la validación de captura, actor y huellas
  de formulario/comando/contexto de la preparación existente. Otro actor/ausencia:
  404; histórico sin captura: 409; incoherencia/infraestructura: 503 genérico.
- Devuelve cinco campos de DTO, con una lista blanca de **47 campos de perfil**
  escalares normalizados. No entrega envelope, formulario original, comando Auth,
  rawPayload, auditoría, IP, roles o IDs internos de cuenta/persona/territorial.
- Aplica la protección sensible vigente según los roles actuales, ignorando
  fullAccess afirmado o capturado anteriormente. Documento enmascarado y puntaje
  salarial null para acceso restringido, también ADMIN; acceso completo únicamente
  con GESTION_PROFESORAL/SUPER_ADMIN. No detecta datos sensibles en texto libre.
- Consultar no prepara, aplica, confirma perfil, cancela, compensa o envía correo.
  No consulta catálogo ni prevalidación de escritura. Tras un commit puede seguir
  revisándose la misma captura sin repetir efectos.

**Revisión visual antes de confirmar**

- El cliente usa el UUID existente, GET no-store, sin retries/refresh/logs privados
  ni almacenamiento de la captura en sessionStorage. Valida claves exactas, versión,
  IDs, campos escalares y coherencia de los datos protegidos antes de mostrarlos.
- Preparar/recuperar lee después la captura del servidor y exige la misma intención.
  Confirmar creación requiere marcar explícitamente que se revisaron esos datos.
  Repetir preparación o consultar reinicia la marca; un error retira los datos
  visibles y la posibilidad de confirmar. No sustituye la lectura con la copia local.
- Revisar datos guardados es una lectura independiente y no habilita ejecución por
  sí sola. Consultar resultado conserva la recuperación del recibo mínimo sin
  necesitar datos personales para finalizar un commit conocido.
- Cambio de cliente oculta datos e invalida el diálogo; desmontaje descarta respuestas
  tardías. El formulario predeterminado y la edición con soporte/sugerencias conservan
  las fuentes del punto 74 sin cambios adicionales.
- La marca es un control visual; no es una aprobación durable o firma del servidor.
  Ejecutar conserva su body vacío, permisos y controles transaccionales anteriores.
  La captura/contexto inmutables vinculan la revisión con la misma solicitud.

**Validación local**

- RUND: **77 suites / 1.417 pruebas**, veintidós nuevas; compilación correcta.
  MFE: **22 archivos / 235 pruebas**, dieciocho nuevas; TypeScript y Vite correctos,
  con salida de compilación exclusivamente en tmp.
- **520 comprobaciones de integración** con PostgreSQL, TypeORM, JWT/guards y HTTP
  reales sobre datos ficticios: conserva las 512 anteriores y añade ocho escenarios.
  Gateway: **23 controles HTTP**, uno nuevo para JWT/no-store y GET sin cuerpo
  privado en auditoría. Sin cambios productivos en gateway.
- Se prueban alcance por actor, sesión sin exp, rol de consulta con claims falsos,
  protección sensible actual, revocación durante lectura, Auth no disponible,
  respuesta SQL genérica, histórico sin captura y revisión después del commit.
  GET repetido conserva captura/journals/identidad y no genera escritura adicional.
- Se comprueba igualdad de los 47 campos entre DTO backend y cliente, huellas de
  fuentes previas y conservación del código anterior de preparar/reanudar, rutas,
  cliente y fixtures fuera de las extensiones de este punto.
- Auth conserva la evidencia de **6 suites de identidad / 194 pruebas** del punto
  73 sobre fuentes intactas; no se repite esa suite unitaria en este corte. La nueva
  integración sí vuelve a comprobar el comportamiento HTTP de su propietario.
- Evidencia: [validacion-revision-captura-manual-rund.json](validacion-revision-captura-manual-rund.json).
  Manifiesto/revisión: corte-75-rund.paths y revision-push-corte-75.json.

**Límites y siguiente punto**

Queda preparada la revisión autorizada de la captura recuperada. Sigue pendiente
definir corrección o abandono seguro de una solicitud sin captura remota, o que deba
corregirse, evitando perder operaciones en vuelo. Ese es el siguiente corte técnico.
También continúan principal confiable del shell, correo durable, política/cierre
de altas/revisiones, preview sin escritura remota, otros canales y aceptación por
instalación. Los controles de permiso no aportan atomicidad distribuida.

El módulo continúa fuera de AppModule, el llamador activo sin cliente y ambas
banderas Auth false por defecto. Sin nuevas migraciones, cambios .env/Compose,
bases existentes, push o despliegues. El clúster ficticio temporal se elimina al
finalizar. No se retira RUND embebido de PTA ni se certifican ambientes.

Avance: **38 cortes técnicos locales desde el merge**, **11 pasos principales locales**
y **5 frentes abiertos**. Continúan frente 4 y aceptación `12.5d.2`; el número de
cortes no representa un porcentaje de independencia o despliegue.

## 76. Frente 4: abandono previo al journal y corrección con otro UUID (2026-10-15)

Una solicitud sin captura remota, o capturada sin haber reservado aún su journal,
puede cerrarse de manera durable antes de comenzar otra corrección. Contrato:
[CONTRATO-ABANDONO-MANUAL-RUND.md](CONTRATO-ABANDONO-MANUAL-RUND.md).
La integración continúa desactivada; el escritor activo conserva su funcionamiento.

**Frontera y garantías**

- Una operación reservada puede tener HTTP Auth en vuelo aunque su estado local sea
  PREPARADA. Por eso el abandono rechaza con 409 cualquier solicitud con journal,
  sin inferir una cancelación desde ausencia remota, aborto local o estado conocido.
  Su ID y sus datos permanecen disponibles para recuperación.
- Migración preparatoria **015_rund_identidad_abandono_manual.sql**: tabla inmutable
  con actor, solicitud y fecha, sin formulario/credenciales. Un bloqueo transaccional
  por actor/solicitud excluye abandono, captura inicial y reserva inicial del journal.
- Si gana el abandono, una captura/reserva tardía falla sin reactivar el ID. Si gana
  la captura sin journal, puede cerrarse conservando esa captura. Si gana la reserva
  del journal, el abandono falla y no modifica la operación. No se incorporan nuevos
  bloqueos a actualizaciones/commit nativo ni se mantiene una transacción durante HTTP.
- El servicio de entrada rechaza preparar/reanudar un abandono conocido. La captura
  privada se conserva para revisión autorizada; sus huellas y la preparación anterior
  permanecen intactas fuera de esta comprobación. No se borran datos ni perfiles.

**API y ciclo visual**

- POST :solicitudId/abandonar con body vacío y GET :solicitudId/abandono conservan
  JWT, rol o manage del banco, exp vigente, actor de sesión y no-store. Los permisos
  de roles normales se consultan antes y después del trabajo, sin caché del guard.
- El recibo tiene tres campos: solicitudId, estado=ABANDONADA y puedeIniciarOtra=true.
  Un 404 no acredita cierre. Repetir conserva marca/fecha; otro actor no la consulta.
  El servicio no aplica, cancela, compensa, aborta o confirma identidad/perfil ni correo.
- Abandonar requiere confirmación visual. Su POST no retira el UUID del navegador.
  Iniciar otro registro exige un GET válido del servidor y comprobar que el pendiente
  no cambió; entonces abre el formulario vacío y el siguiente preparar genera otro ID.
- Error, recibo parcial, respuesta perdida o consulta fallida conservan el ID; GET
  permite recuperar un abandono confirmado. Ejecución en vuelo impide liberar desde
  el cliente. No hay retries, refresh, logs privados o fallback al escritor anterior.
  Abandonar no llama onSaved ni anuncia que se creó un docente.

**Validación local**

- RUND: **78 suites / 1.437 pruebas**, veinte nuevas. MFE: **23 archivos / 253 pruebas**,
  dieciocho nuevas. Compilaciones y TypeScript correctos, salida del MFE solo en tmp.
- **532 comprobaciones de integración**: conserva las 520 anteriores, adapta su rótulo
  de 33 a 34 tablas y añade la instalación de 015 más once escenarios de abandono.
  Continúan siete categorías y cero docentes copiados. Gateway: **24 controles HTTP**,
  uno nuevo para sesión y redacción de auditoría, sin cambios productivos del gateway.
- PostgreSQL/TypeORM/HTTP reales, datos ficticios: ausencia, captura parcial, otra
  corrección con ID nuevo, journal PREPARADA/REGISTRADA/APLICADA y commit ya conocido.
  Se mantienen la operación y la recuperación cuando el abandono no corresponde.
- Tres carreras coordinadas mediante bloqueos PostgreSQL: captura antes de abandono,
  journal antes de abandono y abandono antes de journal tardío. Se verifican el
  resultado ganador y la ausencia de journal cuando gana el abandono.
- Respuesta perdida recuperable, permisos revocados/no disponibles, recibo inmutable
  y repetición de 015 sin reescribir fechas/capturas. Las pruebas anteriores de
  ejecución, aborto, compensación y revisión vuelven a pasar.
- Auth conserva **6 suites de identidad / 194 pruebas** de evidencia unitaria previa
  sobre fuentes intactas; no se repite esa suite en este corte. El propietario sí
  participa de nuevo en la integración HTTP ficticia.
- Evidencia: [validacion-abandono-manual-rund.json](validacion-abandono-manual-rund.json).
  Manifiesto/revisión: corte-76-rund.paths y revision-push-corte-76.json.

**Estado y lo que falta**

El siguiente punto es el cierre autenticado de solicitudes **con journal reservado**,
preservando las garantías de aborto/cancelación/compensación. Este corte no completa
ese circuito ni permite corregir una identidad aplicada mediante un ID nuevo.
También siguen principal confiable del shell, correo durable, política/cierre de
altas/revisiones, preview sin escritura remota, otros canales y SQL entre propietarios.

Siguen abiertos cinco bloques de trabajo: aislamiento SQL actual, consumidores
históricos, integración PTA/Programación, preparación/aceptación de instalaciones y
aceptación integral/retiro final. Su alcance y criterios concretos se registran en
[PENDIENTES-CIERRE-INDEPENDENCIA.md](PENDIENTES-CIERRE-INDEPENDENCIA.md). Queda trabajo
importante de implementación y aceptación; no es válido estimar el porcentaje o
las horas restantes a partir de los cortes o del número de pruebas.

015 se ejecutó solo en clústeres ficticios temporales, eliminados al terminar. Debe
instalarse antes de habilitar el módulo manual. Sin bases existentes, cambios .env/
Compose, push o despliegue. El llamador activo sigue sin cliente, el módulo fuera de
AppModule y las dos banderas Auth false por defecto. RUND embebido en PTA permanece.

Avance: **39 cortes técnicos locales desde el merge**, **11 pasos principales locales**
y **5 frentes abiertos**. Continúan frente 4, paso principal 12 y aceptación `12.5d.2`;
la independencia total y la validación de las instalaciones siguen pendientes.

## 77. Frente 4: cierre autenticado de solicitudes reservadas (2026-10-15)

El circuito manual prepara el cierre de las solicitudes que el abandono previo
del punto 76 no puede liberar por tener journal reservado. Contrato:
[CONTRATO-CIERRE-MANUAL-RUND.md](CONTRATO-CIERRE-MANUAL-RUND.md). El módulo y la
conexión opcional siguen sin activar; no se cambia el escritor productivo.

**Cierre y controles vigentes**

- POST :solicitudId/cerrar con body vacío y GET :solicitudId/cierre conservan JWT,
  rol o manage del banco, exp vigente, actor de sesión y no-store. Otro actor:
  404; falta de captura/journal: 409; errores de infraestructura: 503 genérico.
- AuthIdentityManualCloseService verifica la captura servidor y, ante journal
  PREPARADA parcial, completa solamente contexto/decisión desde esa captura.
  No vuelve a pedir catálogo o prevalidación Auth de escritura. Contexto ausente
  después de publicación remota conserva el error y requiere recuperación específica.
- Reutiliza aborto nativo irreversible y sus bloqueos; un aborto previo conserva
  el motivo. Si gana un commit nativo, el cierre no revierte o compensa el perfil.
- resolverAbortoConControles concilia y registra/cancela el mismo UUID propietario.
  Comprueba sesión y permiso antes de REGISTRAR_AUTH y CANCELAR_AUTH. Si Auth ganó
  aplicando, no se fabrica una cancelación a partir de un 409.
- resolverConControles concilia la resolución aplicada y controla otra vez antes
  del POST de compensación. El propietario conserva sus reglas: compensación segura
  de identidad existente o REVISION_REQUERIDA con caso durable para altas/cambios
  incompatibles. No se define eliminación de personas/cuentas o cierre humano.
- Los métodos anteriores resolverAborto y resolver delegan sin controles opcionales
  y mantienen su comportamiento. Callbacks de servidor, sin funciones del body,
  SQL Auth desde RUND o transacciones locales abiertas durante HTTP.
- Fallos, respuesta perdida, revocación o vencimiento conservan solicitud/intención/
  operación. Otra sesión autorizada retoma; GET propietario recupera recibos sin
  repetir efectos. La ejecución habitual no compensa automáticamente al fallar.

**Recibo y cliente**

- Nueve campos mínimos distinguen PENDIENTE, ABORTADA, CERRADA, REVISION_REQUERIDA y
  CONFIRMADA. Solo aborto sin commit con CANCELADA o COMPENSADA permite otra solicitud.
  Un caso de revisión o perfil confirmado nunca libera el ID por este circuito.
- GET solo consulta hechos locales. Cierre/revisión ya conocidos no vuelven a
  solicitar cambios a Auth y siguen exigiendo autorización vigente. No devuelve
  identidad, formulario, comando, hashes internos o auditoría.
- Cerrar operación exige confirmación visual específica. Consultar cierre recupera
  una respuesta perdida sin POST automático. Iniciar otro registro exige un GET
  CERRADA coherente y comprobar que el ID no cambió; revisiones conservan su caso/ID.
- Un CONFIRMADA consultado por cierre necesita el recibo de ejecución para finalizar
  por el circuito existente. Cerrar no llama onSaved ni anuncia un perfil creado.
  No hay retries, refresh, logs privados o fallback al escritor anterior.

**Validación local**

- RUND: **79 suites / 1.461 pruebas**, veinticuatro nuevas. MFE: **24 archivos / 271
  pruebas**, dieciocho nuevas. TypeScript y compilaciones correctos, salida MFE en tmp.
- **548 comprobaciones de integración** con PostgreSQL/TypeORM/JWT/HTTP reales sobre
  datos ficticios: conserva las 532 anteriores y agrega dieciséis escenarios.
  Gateway: **25 controles HTTP**, uno nuevo, sin cambios productivos del gateway.
- Cierre no publicado y concurrente, journal parcial sin prevalidación, compensación
  de identidad existente, revisión de altas, bandera de compensación apagada y
  carrera aplicar/cancelar. Un aborto pendiente no se presenta como cierre.
- Revocación después del registro y antes de compensar impide la siguiente mutación.
  Sesión vencida durante HTTP deja pendiente recuperable con otra sesión. Respuestas
  perdidas de cancelación, resolución y recibo final conservan el mismo UUID.
- Commit/cierre compiten conservando exclusión nativa; un perfil confirmado no se
  revierte. GET no escribe; otro actor no consulta. La prueba interna de aborto usa
  token de servicio sin reenviar JWT/cookies. RUND sigue sin schema Auth.
- Auth conserva **6 suites de identidad / 194 pruebas** de evidencia unitaria previa
  sobre fuentes intactas; no se repite esa suite en este corte. Su propietario sí
  participa de nuevo en la integración HTTP ficticia.
- Evidencia: [validacion-cierre-manual-rund.json](validacion-cierre-manual-rund.json).
  Manifiesto/revisión: corte-77-rund.paths y revision-push-corte-77.json.

**Estado y siguiente punto**

Quedan preparados abandono previo y cierre autenticado posterior al journal. Siguen
la política/cierre humano de revisiones y altas, contextos inconsistentes tras
publicación y la política entre dispositivos; este circuito no autoriza activar todo.
El siguiente corte es resolver el principal confiable del operador en el shell para
la conexión opcional del formulario, sin confundir userPersonId con el principal JWT.

También siguen correo durable, preview sin escritura remota, otros canales y SQL
restante entre propietarios, consumidores históricos, PTA/Programación y aceptación
por instalación. Los cinco frentes permanecen abiertos según
[PENDIENTES-CIERRE-INDEPENDENCIA.md](PENDIENTES-CIERRE-INDEPENDENCIA.md).

Sin migraciones nuevas, bases existentes, cambios .env/Compose, push o despliegue.
El clúster ficticio temporal se elimina al terminar. El módulo sigue fuera de
AppModule, el llamador activo sin cliente y las dos banderas Auth false por defecto.
Se conserva RUND embebido en PTA y no se certifican instalaciones.

Avance: **40 cortes técnicos locales desde el merge**, **11 pasos principales locales**,
paso principal **12 en curso** y **5 frentes abiertos**. La independencia total sigue
pendiente; estos conteos no representan un porcentaje de despliegue o aislamiento.

## 78. Frente 4: principal autenticado del operador shell/MFE (2026-10-16)

Se prepara la identidad de cuenta requerida por el cliente manual. Contrato:
[CONTRATO-SESION-OPERADOR-MANUAL-RUND.md](CONTRATO-SESION-OPERADOR-MANUAL-RUND.md).
El formulario vigente conserva su escritor; el banco activo todavía no monta el
hook ni proporciona el cliente manual al modal.

**Origen y aislamiento de la sesión**

- El shell consulta bajo demanda el endpoint existente Auth `/auth/api/v1/me`, o
  `/me` en modo directo, con cookie de sesión y configuración vigente del gateway.
  La cuenta procede de `userId`, derivado de `sub` por la estrategia JWT existente;
  nunca se reconstruye con `userPersonId`, email, id, evento o usuario cacheado.
- Proyección mínima `{version:1, actorId:UUID}`. HTTP/JSON/DTO inválido, error de red,
  vencimiento o cancelación no permiten continuar con un principal anterior.
  No lee JWT/credenciales en el navegador, guarda principal o hace refresh/retries.
- Petición específica sin interceptores offline: el cliente HTTP general puede
  servir caché incluso con no-store, por lo que no se utiliza para esta comprobación.
  Cookie HttpOnly, límite de espera, señal de cancelación y rechazo de redirecciones.
  `/me` mantiene guard/DTO y agrega únicamente `Cache-Control: private, no-store`.
- La proyección selecciona el espacio local por cuenta, sin conceder permisos.
  `/me` conserva su validación JWT y no agrega consulta de revocación a la base.
  Las acciones manuales siguen exigiendo controles efectivos del servidor.

**Conexión opcional y compatibilidad**

- `RundShellModule` ofrece resolve/subscribe, sin consultar al montar o recibir una
  notificación. Los cambios de persona/email/roles/permisos conservan el remount
  previo; solo cambiar el nombre mantiene el formulario habitual.
- El evento de autenticación existente solo invalida: ignora su contenido. Se
  abortan lecturas y se descartan generaciones anteriores tras cambio, invalidación,
  desmontaje o ciclos StrictMode, incluso ante respuestas tardías.
- La entrada federada y AuthProvider propagan una propiedad opcional, conservando
  autenticación, RBAC visual y consumidores anteriores. El hook sin montar en el
  banco crea cliente solo bajo demanda, conserva instancia para misma cuenta/conexión
  y retira el cliente visible durante revalidación o ante error/invalidación.
- Otra cuenta utiliza otro espacio de solicitud; invalidar no borra el UUID
  recuperable de la anterior. No prepara/ejecuta/cierra automáticamente. Autogestión
  pública, App/login, menú PTA, JWT del gateway y escritores previos sin cambios.

**Validación local**

- MFE completo: **26 archivos / 285 pruebas**, catorce nuevas; TypeScript y build
  correctos. Shell RUND/PTA/documentos: **7 archivos / 80 pruebas** correctos.
- Auth: **7 suites / 196 pruebas** correctas, incluidas las seis suites de identidad
  previas y dos nuevas comprobaciones de `/me`. Build Auth correcto.
- **9 comprobaciones HTTP nuevas** con controlador, guard y estrategia JWT reales
  de Auth y lector productivo del shell, solo loopback y cuentas ficticias: cookie,
  cuenta/persona distintas, parámetros sin autoridad, token interno, JWT vencido o
  falsificado, cuenta ausente/no UUID y sesión desactivada. Sin módulos de base de
  datos, main, dotenv o credenciales reales; aplicación detenida al terminar.
- Builds MFE y shell en `tmp`, sin reemplazar salidas frontend existentes. El cliente
  manual HTTP sigue fuera del bundle activo del MFE. El TypeScript global del shell
  conserva **586 diagnósticos anteriores**, mismas firmas, sin nuevas ni eliminadas;
  no se presenta ese chequeo como aprobado.
- La primera invocación de pruebas shell utilizó Vitest de la raíz y no recogió
  suites por incompatibilidad con la versión local. Se corrigió la invocación y las
  siete suites pasaron con el Vitest instalado en shell, sin modificar dependencias.
- RUND **79 suites / 1.461 pruebas**, integración PostgreSQL **548 comprobaciones**
  y gateway **25 controles HTTP** conservan evidencia del punto 77 sobre fuentes
  intactas; no se repiten ni se cuentan como ejecuciones nuevas en este corte.
- Evidencias: [validacion-sesion-operador-manual-rund.json](validacion-sesion-operador-manual-rund.json),
  [validacion-operador-sesion-http-local.json](validacion-operador-sesion-http-local.json).
  Manifiesto/revisión: corte-78-rund.paths y revision-push-corte-78.json.

**Estado y siguiente punto**

Queda preparada la conexión confiable de cuenta. El siguiente trabajo acotado es
el correo durable ligado al commit nativo confirmado, para recuperar fallos sin
repetir la creación. Todavía se debe conectar el hook al formulario al cerrar los
prerrequisitos; no se activa aquí. También siguen política/cierre humano de revisiones,
contextos inconsistentes tras publicación, preview y otros canales, SQL entre
propietarios, consumidores históricos, PTA/Programación y aceptación por instalación.

Sin nuevas migraciones, bases existentes, cambios .env/Compose, push o despliegue.
El módulo manual continúa fuera de AppModule y las banderas Auth false por defecto;
se conserva RUND embebido en PTA. Los límites por dispositivos, revocación durante
trabajo en vuelo y aceptación operacional siguen documentados.

Avance: **41 cortes técnicos locales desde el merge**, **11 pasos principales locales**,
paso principal **12 en curso** y **5 frentes abiertos**, detallados en
[PENDIENTES-CIERRE-INDEPENDENCIA.md](PENDIENTES-CIERRE-INDEPENDENCIA.md).
Estos conteos no representan porcentaje de independencia o despliegue.

## 79. Frente 4: correo durable e intento controlado (2026-10-16)

Se prepara un aviso transaccional de bienvenida y su consumidor servidor opcional.
Contrato: [CONTRATO-CORREO-DURABLE-IDENTIDAD-RUND.md](CONTRATO-CORREO-DURABLE-IDENTIDAD-RUND.md).
No se activa el consumidor, el módulo manual o el cliente del formulario.

**Aviso unido al commit nativo**

- La migración 016 crea `rund.identidad_correo`. Un trigger encola al confirmar
  contexto nativo dentro de la misma transacción del perfil, bloques, auditoría y
  recibo. Fallar el outbox revierte esa confirmación; Auth aplicado conserva IDs
  para recuperar el commit. No se envía correo o hace HTTP dentro de la transacción.
- Exige captura manual original coincidente, actor/huella/contexto, decisión EN_CURSO
  y cuenta nueva confirmada en los dos recibos. Las cuentas existentes, lotes,
  autogestión, abortos y el escritor anterior no crean este aviso.
- Clave única por intención, tipo versionado, estado, fechas e intento. No duplica
  destinatario, documento, contraseña o mensaje. El backfill solo recupera hechos
  elegibles confirmados; repetir 016 conserva fechas/estados y no envía mensajes.
  Se debe instalar antes de activar este circuito; aquí solo se usa en bases ficticias.

**Consumidor y resultado incierto**

- Reserva un intento UUID bajo bloqueo de fila y confirma ENVIANDO antes del HTTP.
  Instancias concurrentes recuperan ese estado sin repetir la entrega. El mensaje se
  deriva del contexto servidor inmutable y el HTML escapa sus valores.
- Conserva el endpoint y contenido de bienvenida existentes, incluyendo la política
  actual de contraseña temporal de Auth; no cambia cuentas o guarda una copia nueva
  de la contraseña. Usa la configuración actual de notificaciones, sin JWT/cookies
  del operador, retries, redirecciones o logs privados del adaptador.
- HTTP 201 con el recibo exacto de notificaciones permite ENVIADO. No acredita
  recepción o lectura del buzón. Error HTTP, JSON parcial, timeout o conexión perdida
  quedan INCIERTO, porque SMTP pudo haber aceptado el mensaje.
- Si falla la persistencia del recibo después del HTTP, queda ENVIANDO. Reiniciar,
  consultar o repetir la ejecución nativa nunca lo devuelve a PENDIENTE ni repite
  el correo. No hay lease o vencimiento que reclame el intento automáticamente.
- Los triggers impiden borrado, cambio de identidad, reintentos de estados iniciados
  o terminales y alteración de recibos. El consumidor devuelve únicamente intención,
  estado y marca de revisión del INCIERTO conocido; errores SQL/remotos son genéricos.

**Validación local**

- RUND completo: **81 suites / 1.492 pruebas**, 31 nuevas, y build correcto.
- **565 comprobaciones PostgreSQL/TypeORM/HTTP**: 548 escenarios previos conservados,
  dieciséis nuevos del circuito de correo y uno de instalación de la migración 016.
  Solo cambia el inventario inicial de 34 a **35 tablas**;
  conserva 7 categorías y cero docentes copiados en el esquema inicial.
- Atomicidad del aviso y perfil, cuenta existente/lotes/abortos excluidos,
  confirmaciones y consumidores concurrentes, consulta desde otra conexión,
  respuestas perdidas, HTTP/JSON inválido, rollback de reserva, fallo de recibo SQL,
  reinicio con ENVIANDO, inmutabilidad y backfill/repetición de 016.
- SMTP exclusivamente ficticio en loopback. El stub comprueba que el intento ya es
  visible desde otra conexión antes de responder al HTTP. No se repite creación,
  identidad, auditoría o bloques por consultar/reintentar el consumidor.
- La integración detectó la estructura especial de `UPDATE ... RETURNING` de
  TypeORM. El consumidor nuevo usa CTE con SELECT para recuperar filas; se repiten
  las suites y la integración completas. La simulación unitaria de filas JSON
  también se ajustó para representar la salida del driver, sin relajar validaciones.
- MFE **26 archivos / 285 pruebas**, shell RUND **7 / 80**, Auth **7 suites / 196**,
  gateway **25 controles** y sesión de operador **9 controles HTTP** conservan la
  evidencia del punto 78 sobre fuentes intactas; no se repiten en este corte.
  El shell conserva su límite previo de 586 diagnósticos de tipos, sin firmas nuevas.
- Evidencia: [validacion-correo-durable-identidad-rund.json](validacion-correo-durable-identidad-rund.json).
  Manifiesto/revisión: corte-79-rund.paths y revision-push-corte-79.json.

**Estado y siguiente punto**

Quedan preparados el aviso durable y el intento servidor controlado. El siguiente
trabajo acotado es consultar el estado del correo por actor y presentarlo en el
formulario opcional. Los DTO manuales conservan `correo:PENDIENTE` como marcador de
compatibilidad; el consumidor nuevo sigue sin conectarse a ese flujo.

La activación todavía exige conciliación de ENVIANDO/INCIERTO y política de
destinatario/credenciales cuando Auth cambió desde el alta. El endpoint actual de
emails no ofrece idempotencia remota: no se afirma entrega exactamente una vez ni
se habilita reenvío reseteando la fila. También siguen revisión humana de altas,
contextos inconsistentes, preview, otros canales y SQL entre propietarios,
consumidores históricos, PTA/Programación y aceptación por instalación.

Sin bases existentes, SMTP real, cambios .env/Compose, push o despliegue. Los
procesos y el clúster temporal se eliminan al terminar. AppModule, escritor activo,
Auth, frontend y correos previos sin cambios; banderas Auth false por defecto y RUND
embebido en PTA conservado.

Avance: **42 cortes técnicos locales desde el merge**, **11 pasos principales locales**,
paso principal **12 en curso** y **5 frentes abiertos**, según el
[mapa de pendientes](PENDIENTES-CIERRE-INDEPENDENCIA.md). No equivale a un porcentaje
de independencia o despliegue completado.

## 80. Frente 4: consulta de correo por actor y estado visual (2026-10-16)

Se agrega la lectura autenticada del aviso y su presentación explícita en el modal
opcional. Contrato: [CONTRATO-CONSULTA-CORREO-MANUAL-RUND.md](CONTRATO-CONSULTA-CORREO-MANUAL-RUND.md).
El consumidor de correo, el módulo manual y su llamador activo siguen sin activar.

**Lectura autenticada y sin efectos**

- GET `:solicitudId/correo` exige JWT, rol de gestión o manage, cuenta UUID y exp
  numérica vigente. La cuenta procede de sesión, nunca de persona, query, body o
  token interno. Mantiene `private, no-store`; no hay POST de envío en esa ruta.
- AuthIdentityManualMailStatusService revalida autorización antes y después de SQL.
  Grant revocado, propietario de permisos caído o sesión vencida durante I/O impiden
  devolver el recibo. Se conserva la alternativa por roles de gestión existente.
- SELECT por actor/solicitud de hechos locales, sin traer formulario, contexto,
  identidad, mensaje o credenciales. No importa el consumidor SMTP, reclama cola,
  prepara, aplica, confirma, repara, cierra o compensa. La lectura Auth de permisos
  no se sustituye por SQL de otro propietario desde RUND.
- Otra cuenta o solicitud desconocida: 404; histórico sin captura: 409; SQL/tabla
  ausente, aviso elegible perdido o datos incoherentes: 503 genérico, sin detalles
  de infraestructura o valores privados. GET no reconstruye el aviso faltante.

**Recibo y semántica**

- Seis campos: versión, solicitud, intención, estado, registroConfirmado y
  requiereRevision. SIN_CONFIRMAR no acredita creación ni encolado, incluso para
  operaciones abortadas. NO_APLICA exige commit y cuenta existente confirmados,
  sin aviso. Una cuenta nueva sin outbox no se presenta como NO_APLICA.
- PENDIENTE, ENVIANDO, ENVIADO e INCIERTO proceden del aviso durable, con contexto,
  recibos y flags de cuenta coherentes. Revisión true solo en el INCIERTO conocido.
  ENVIANDO puede estar en vuelo o requerir conciliación; no permite reenvío automático.
- ENVIADO indica confirmación del contrato del propietario tras SMTP; no acredita
  recepción o lectura del buzón. No se exponen destinatario, documento, contraseña,
  hashes o intento SMTP. El DTO de ejecución previo de nueve campos no cambia.

**Formulario y compatibilidad**

- Consultar estado del correo aparece al conocer un registro confirmado por ejecución
  o cierre. No hace HTTP al montar, recuperar el resultado o ejecutar; sin polling.
  La pantalla deja de afirmar que todo registro confirmado tiene correo pendiente.
- El cliente valida campos exactos, versión, IDs, estados y flags; exige UUID pendiente
  ya existente y que no cambie durante HTTP. El modal contrasta también la intención
  con el recibo confirmado. Una lectura no elimina el ID, prepara o envía correos.
- Otra consulta descarta el estado previo. Error de correo conserva la confirmación
  del registro y permite consultar de nuevo o finalizar explícitamente por el circuito
  anterior. Un recibo de correo nunca llama onSaved o finaliza por sí mismo.
- Doble clic comparte el bloqueo visual. Cambio de cliente oculta el estado previo y
  descarta respuestas tardías; desmontar no publica resultados. Se conservan edición,
  soportes, abandono, cierre y creación vigente sin el cliente opcional.

**Validación local**

- RUND: **82 suites / 1.519 pruebas**, 27 nuevas; build correcto.
- MFE completo: **28 archivos / 322 pruebas**, 37 nuevas; TypeScript y build correctos,
  salida frontend solo en tmp. El cliente HTTP manual sigue fuera del bundle activo.
- **579 comprobaciones PostgreSQL/TypeORM/HTTP**, catorce nuevas y las 565 anteriores
  conservadas. JWT, permisos, exp, captura propia, cuenta existente, todos los estados,
  lectura concurrente, query sin autoridad, revocación/vencimiento durante SQL,
  propietario de permisos caído, falta de aviso/tabla y aborto sin correo.
- Snapshots antes/después comprueban que GET no cambia perfil, auditoría, captura,
  cola o identidad, ni solicita prevalidación/aplicación Auth o SMTP. La parte de
  correo del punto 79 también se repite contra un servidor ficticio loopback.
- Gateway: **26 controles HTTP**, uno nuevo; JWT, no-store y GET sin cuerpos en
  auditoría. Código productivo del gateway sin cambios.
- Auth **7 suites / 196 pruebas**, shell RUND **7 / 80** y sesión de operador **9
  controles HTTP** conservan evidencia previa sobre fuentes intactas; no se repiten
  en este corte. El límite global del shell sigue siendo 586 diagnósticos previos.
- Evidencia: [validacion-consulta-correo-manual-rund.json](validacion-consulta-correo-manual-rund.json).
  Manifiesto/revisión: corte-80-rund.paths y revision-push-corte-80.json.

**Estado y siguiente punto**

Quedan preparadas la consulta por actor y su presentación opcional. El siguiente
trabajo acotado es validar destinatario y estado de credenciales con Auth antes de
autorizar un envío, para no suponer que el snapshot del alta sigue vigente.
Continúan conciliación de ENVIANDO/INCIERTO y aceptación antes de activar el consumidor.
SMTP no ofrece idempotencia remota; no se habilita un reenvío mediante esta lectura.

También siguen política de revisiones, contextos inconsistentes, preview, otros
canales y SQL entre propietarios, consumidores históricos, PTA/Programación y
aceptación por instalación. No hay nuevas migraciones, bases existentes, SMTP real,
cambios .env/Compose, push o despliegue. El clúster temporal se elimina al terminar;
se mantienen AppModule, banderas Auth false por defecto y RUND embebido en PTA.

Avance: **43 cortes técnicos locales desde el merge**, **11 pasos principales locales**,
paso principal **12 en curso** y **5 frentes abiertos**, según el
[mapa de pendientes](PENDIENTES-CIERRE-INDEPENDENCIA.md). Los cortes no miden porcentaje
de independencia o despliegue completado.
