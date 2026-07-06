# Informe de Actividades — Junio 2026
**Proyecto:** Plataforma Comunidades ESAP  
**Responsable:** Tomás Gutiérrez ([@Tomiguts](https://github.com/Tomiguts))  
**Período:** 1 al 26 de junio de 2026  
**Rama principal de trabajo:** `micro-frontend`

---

## Resumen Ejecutivo

Durante el mes de junio se implementaron y estabilizaron cuatro módulos críticos de la plataforma: el flujo completo de autogestión RUND (Registro Único Nacional Docente), el módulo de Banco de Docentes con Plan de Trabajo Académico (PTA), las correcciones de producción urgentes detectadas en el ambiente QA, y la arquitectura de dos buzones para el Centro de Comunicaciones Jurídicas. El trabajo incluyó desarrollo backend en NestJS, desarrollo frontend en React/Vite con micro-frontends federados, diseño de migraciones SQL, integración con servicios externos (Microsoft Graph, notifications-service) y ciclos completos de prueba y validación en múltiples ambientes.

**Total estimado de horas trabajadas:** ~82 horas  
**Commits propios (sin merges):** 12  
**Archivos modificados o creados:** +70  
**Líneas de código (netas):** +2.800 insertions / −440 deletions

---

## Actividades Detalladas

---

### 1. Corrección de bug en Centro de Comunicaciones Jurídicas
**Fecha:** 2 de junio de 2026  
**Commit:** `0b6a0a0f` — *bug centro de comunicaciones resuelto*  
**Tiempo estimado: 4 h**

| Tarea | Horas |
|---|---|
| Lectura y trazado del flujo Microsoft Graph → `correos-juridicos.service.ts` | 1.0 |
| Diagnóstico del bug (sincronización de correos fallando silenciosamente) | 0.5 |
| Corrección en `correos-juridicos.service.ts` y `microsoft-graph.service.ts` (+45 líneas) | 1.5 |
| Prueba local y validación de sincronización | 1.0 |

---

### 2. Función de respuesta a correo con adjunto
**Fecha:** 5 de junio de 2026  
**Commit:** `184ef103` — *respuesta correo documento*  
**Tiempo estimado: 5 h**

| Tarea | Horas |
|---|---|
| Lectura del modal `ModalNuevaComunicacion.tsx` y contrato de la API | 1.0 |
| Diseño e implementación de `replyEmail` con adjunto en el servicio backend (+61 líneas) | 2.0 |
| Migración SQL `327_remove_dsn_emails_from_correos_juridicos.sql` (+37 líneas) | 0.5 |
| Ajuste del modal en el frontend | 0.5 |
| Prueba end-to-end de respuesta con y sin adjunto | 1.0 |

---

### 3. Limpieza y saneamiento de tres submódulos de Gestión Legal
**Fecha:** 17 de junio de 2026  
**Commit:** `bd11f55f` — *limpieza de 3 submodulos legal*  
**Tiempo estimado: 6 h**

| Tarea | Horas |
|---|---|
| Auditoría de código del módulo `legal-management-service` (controller + service) | 2.0 |
| Eliminación de 78 líneas de código muerto/duplicado en controller y service | 1.0 |
| Redacción de `INFORME_LIMPIEZA_BD_GESTION_LEGAL.md` (documentación del estado de la BD) | 1.0 |
| Migraciones SQL `337_create_solicitudes_insumos.sql` y `338_cleanup_legal_orphan_objects.sql` | 1.5 |
| Validación de que los endpoints siguen respondiendo correctamente tras la limpieza | 0.5 |

---

### 4. Alineación RUND + Carpeta Digital + Aprobación PTA por componentes + Firma OTP
**Fecha:** 19 de junio de 2026  
**Commits:** `02451e59` / `ac186209`  
**Tiempo estimado: 18 h** *(feature de mayor alcance del mes)*

Este fue el sprint técnico más complejo del mes, abarcando tres módulos en paralelo con cambios coordinados en backend y frontend.

| Tarea | Horas |
|---|---|
| Lectura y comprensión del modelo de datos de Carpeta Digital (auth-service) | 1.5 |
| Diseño del esquema `documento_carpeta_digital` + migración `339` (+88 líneas SQL) | 1.5 |
| Implementación de endpoints de Carpeta Digital: upload, list, download por blob autenticado (`carpeta-digital.controller.ts` +78 líneas, `carpeta-digital.service.ts` +188 líneas) | 3.0 |
| Revisión y corrección del flujo de aprobación de RUND: propagación del estado de soportes al aprobar/devolver bloque en `RundValidationPanel.tsx` y `PTADetallePanelBackoffice.tsx` | 2.0 |
| Diagnóstico y corrección del error 500 en `PtaComponentApproval` (tabla faltante): migración `340` | 1.0 |
| Implementación de aprobación por permisos granulares `pta.approve.*`, tab Aprobación + tab Trazabilidad en backoffice | 2.0 |
| Firma OTP mockeada (`PTA_MOCK_FIRMA_OTP`): flujo completo con cualquier código de 6 dígitos | 1.0 |
| Corrección de rutas estáticas de uploads en `auth-service` y `academic-work-plan-service` (`main.ts`) | 0.5 |
| Corrección de envío del PTA a aprobación (`solucion envio pta`): controller + service | 1.0 |
| Pruebas integradas en ambiente local, revisión de logs de servicios | 2.5 |
| Resolución de merge conflicts al incorporar cambios del equipo | 1.5 |

---

### 5. Corrección: envío a aprobación con 0 horas y flujo por componentes
**Fecha:** 20 de junio de 2026  
**Commit:** `36d688c9`  
**Tiempo estimado: 3 h**

| Tarea | Horas |
|---|---|
| Identificación de la regla de validación que bloqueaba el envío cuando algún componente tenía 0 horas | 1.0 |
| Corrección en `pta.service.ts` y ajuste del flujo de aprobación por componentes | 1.5 |
| Prueba del flujo completo de envío → aprobación N1 → N2 → N3 | 0.5 |

---

### 6. Flujo completo de autogestión docente RUND con correos reales
**Fecha:** 21 de junio de 2026  
**Commit:** `a96f8557` — *feat(rund): flujo completo de autogestión docente con envío real de correos*  
**Tiempo estimado: 14 h**

| Tarea | Horas |
|---|---|
| Diagnóstico del bug de inputs perdiendo foco en `AutogestionDocenteRUND.tsx` (componente `Field` redefinido en scope incorrecto) | 1.0 |
| Implementación de `validatePayloadAutogestion` + `relaxValidation` para el canal AUTOGESTION (Canal 3) | 1.5 |
| Corrección de `checkExistingDocente` (early-return + ruta `data.data` del apiClient) | 0.5 |
| Integración con `notifications-service`: helper `sendEmail()` + `resolvePublicAppUrl()` para envío real de invitación y OTP | 2.0 |
| Fallback por correo en `upsertDocente` (búsqueda de persona por email cuando no hay `personaId`) | 1.0 |
| Creación migración `348`: tablas `BancoDocentesInvitaciones` + `RundAprobacionLog` (+65 líneas SQL) | 1.5 |
| Variables de entorno `PUBLIC_APP_URL` y `NOTIFICATION_SERVICE_URL` en todos los `docker-compose` (dev/qa/pre/prod) | 0.5 |
| Checklist individual en `DigitalFolderSection.tsx`: botón "Documento específico" + badge visual (+152 líneas) | 2.0 |
| Banner de acceso RUND en portal docente (`MisDocumentos.tsx`) con prefill de correo | 1.0 |
| Pruebas del flujo completo: invitación → OTP → datos → submit → verificación en BD | 2.0 |
| Actualización de `PENDIENTES_RUND_PTA.md` con estado del backlog | 0.5 |
| Resolución de merge conflicts con otros desarrolladores | 1.0 |

---

### 7. Correcciones urgentes detectadas en QA (22 junio)
**Fecha:** 22 de junio de 2026  
**Commits:** `c128f03d`, `cf9efccf`  
**Tiempo estimado: 5 h**

#### 7a. Carpeta RUND no visible en QA
| Tarea | Horas |
|---|---|
| Diagnóstico: el `@Roles('DOCENTE')` en el endpoint `tarjeta-rund` hace match exacto de string; en QA el código del rol tiene casing diferente al de desarrollo | 1.0 |
| Corrección: cambiar `@Roles(...)` a `@Public()` en `banco-docentes.controller.ts` | 0.5 |
| Validación en QA | 0.5 |

#### 7b. Invitaciones no aparecen en tabla + log ruidoso
| Tarea | Horas |
|---|---|
| Diagnóstico del comportamiento del `apiClient`: `handleResponse` en línea 611 ya desenvuelve `{success, data}` → `res.data` era `undefined` | 0.5 |
| Corrección de lectura en `TableroInvitacionesRUND.tsx` | 0.5 |
| Eliminación del `console.log` ruidoso en `BancoDocentesPTA.tsx` (se ejecutaba en cada render) | 0.5 |
| Corrección de `loadStats` para usar `statsFilterPeriodo` en vez de `filterPeriodo` del listado (conteos quedaban en 0) | 0.5 |
| Prueba y verificación final | 0.5 |

---

### 8. HU-12 + Validador de tipo de documento + Config individual + Fixes adicionales QA
**Fecha:** 22 de junio de 2026  
**Commit:** `4760f26e` — *feat(rund/pta): validador de tipo de documento, sub-tabs R02, fixes QA*  
**Tiempo estimado: 12 h**

| Tarea | Horas |
|---|---|
| **HU-12 (sub-tabs R01/R02):** lectura del componente `PortalDocentePTA.tsx`, diseño del memo `versionesPeriodo` y lógica de sub-tabs cuando hay más de un PTA en el mismo período | 2.0 |
| Implementación de los sub-tabs y sustitución del botón bloqueado "Nuevo PTA" por botón "Solicitar segundo PTA" o pill "En revisión" | 1.5 |
| **Validador de tipo de documento (`DocumentTypeValidatorService`):** investigación de `pdf-parse` (sin tipos TypeScript), diseño del algoritmo de extracción de texto + comparación por keywords con umbral 0.34 | 2.0 |
| Implementación del validador en `academic-work-plan-service` (nuevo archivo, +140 líneas) e integración en `banco-docentes.controller.ts` + módulo | 1.5 |
| Implementación del validador en `auth-service` (nuevo archivo, +105 líneas) e integración en `carpeta-digital.controller.ts` + `carpeta-digital.service.ts` | 1.5 |
| Diseño del patrón de respuesta: `validacionTipo` embebida dentro de `data` (no como sibling) para que `apiClient` no lo descarte | 0.5 |
| Corrección de carga de `carpetaDigitalId` en `DigitalFolderSection.tsx`: efecto independiente vía `getCarpetaByPersona` para habilitar el botón "Config individual" | 1.0 |
| Helper `warnIfWrongDocType` en `CarpetaDigitalSharedView.tsx` + sustitución de `sendEmailNotification` con `localhost:5000` por no-op | 0.5 |
| Pruebas: subida de PDFs correctos e incorrectos, validación del mensaje de advertencia, verificación de que nunca bloquea el upload | 1.0 |
| Resolución de conflictos de merge con cambios simultáneos del equipo | 0.5 |

---

### 9. Flujo completo de solicitud de segundo PTA
**Fecha:** 24 de junio de 2026  
**Commit:** `109d9d1f` — *feat(pta): flujo completo de solicitud de segundo PTA*  
**Tiempo estimado: 7 h**

| Tarea | Horas |
|---|---|
| Revisión del estado del `SolicitudPTAModal`: existía pero no tenía trigger visible para el docente | 0.5 |
| Lectura de `pta.service.ts` para entender el mecanismo de `tienePermisoEspecial` y el campo `estado` de la solicitud | 1.0 |
| Implementación del trigger en `PortalDocentePTA.tsx`: botón "Solicitar segundo PTA" condicionado a PTA aprobado, pill "Solicitud en revisión" si ya hay pendiente | 1.5 |
| Corrección en `pta.service.ts`: `savePTA` consume la solicitud aprobada (transición a `gestionada`) para que el permiso no quede abierto indefinidamente | 1.5 |
| Reemplazo de `fetch('http://localhost:5000/api/pta/catalogos/territoriales')` en `PtaBackofficeModule.tsx` por llamada via `getCatalogoTerritoriales()` del gateway (corrige error CSP en QA) | 0.5 |
| Prueba del flujo completo: docente con PTA aprobado → solicita segundo → aprobado → crea segundo PTA → solicitud queda `gestionada` → botón desaparece | 1.5 |
| Merge y push | 0.5 |

---

### 10. Arquitectura de dos buzones en Centro de Comunicaciones Jurídicas
**Fecha:** 25–26 de junio de 2026  
**Commit:** `fc31b5cd` — *feat(gestion-legal): arquitectura dos buzones en Centro de Comunicaciones*  
**Tiempo estimado: 12 h**

| Tarea | Horas |
|---|---|
| Análisis de la arquitectura actual del módulo y diseño de la solución adaptativa (1 buzón → comportamiento existente; 2 buzones → filtrado por `buzon`) | 1.5 |
| Entidad `CorreoJuridico`: columna `buzon VARCHAR(20) DEFAULT 'JUDICIAL'` + migración `365` | 0.5 |
| `MicrosoftGraphService`: variables `judicialAccount`/`correosAccount`, métodos `resolveAccount`, `getMailboxes`, `isBuzonConfigured`; parámetro `fromAccount` en `sendEmail`, `replyToEmail`, `forwardEmail` | 2.5 |
| `CorreosJuridicosService`: sincronización por buzón (`syncInbox` con parámetro `buzon`), etiquetado de correos en sync, `replyEmail`/`forwardEmail`/`sendEmail` con resolución de cuenta por buzón, método `getMailboxes` | 2.0 |
| `CorreosJuridicosController`: endpoint `GET mailboxes`, `buzon` en `SendEmailDto` (en dos definiciones), `@Query('buzon')` en `getAll` | 0.5 |
| `legal.service.ts` (shell): tipado de `buzon` en interfaces `CorreoJuridico`, `CorreoFilters`, `SendCorreoDto`; método `getMailboxes` | 0.5 |
| `CentroComunicacionesJuridicasV3.tsx`: estado `filtroBuzon`, memo `buzonesPresentes`/`multiBuzon`, filtrado adaptativo por tab, selector de buzón en tabs generales, sync por buzón en `handleSyncCorreos`, cálculo del `buzon` a pasar al modal de composición | 2.5 |
| `ModalNuevaComunicacion.tsx`: prop `buzon` + inclusión en payload de `sendEmail` | 0.5 |
| Diagnóstico y corrección del error TSC (`SendEmailDto` duplicado en controller vs. service) | 0.5 |
| Build de verificación (`vite build` + `tsc`) y push | 1.0 |

---

## Historial de Commits (Tomiguts — Junio 2026)

| Fecha | Hash | Descripción |
|---|---|---|
| 02 jun | `0b6a0a0f` | Bug Centro de Comunicaciones resuelto |
| 05 jun | `184ef103` | Respuesta correo con documento |
| 17 jun | `bd11f55f` | Limpieza de 3 submódulos legal |
| 19 jun | `02451e59` | feat(pta/carpeta-digital): alineación RUND, aprobación por componentes, trazabilidad y mock firma OTP |
| 19 jun | `ac186209` | Solución envío PTA |
| 20 jun | `36d688c9` | fix(pta): corregir envío a aprobación con 0 horas y flujo de aprobación por componentes |
| 21 jun | `a96f8557` | feat(rund): flujo completo de autogestión docente con envío real de correos |
| 22 jun | `c128f03d` | fix(rund): carpeta RUND no visible en QA por casing del rol |
| 22 jun | `cf9efccf` | fix(rund): correo no llega, tabla vacía y log ruidoso |
| 22 jun | `4760f26e` | feat(rund/pta): validador de tipo de documento, sub-tabs R02, fixes QA |
| 24 jun | `109d9d1f` | feat(pta): flujo completo de solicitud de segundo PTA |
| 26 jun | `fc31b5cd` | feat(gestion-legal): arquitectura dos buzones en Centro de Comunicaciones |

---

## Historias de Usuario Completadas

| ID | Descripción | Estado |
|---|---|---|
| HU-12 | Sub-tabs R01/R02 en detalle del PTA del docente cuando existe un segundo PTA en el mismo período | ✅ Completo |
| HU-RUND-AUTOGESTION | Flujo completo de autogestión docente: invitación → OTP → datos → soportes → creación de cuenta | ✅ Completo |
| HU-RUND-VALIDADOR | Validación suave de tipo de documento al subir archivos (no bloquea, advierte) | ✅ Completo |
| HU-RUND-CHECKLIST-IND | Checklist individual por docente (badge "Específico" + botón en admin) | ✅ Completo |
| HU-PTA-SEGUNDO | Flujo completo de solicitud de segundo PTA con consumo del permiso especial | ✅ Completo |
| HU-LEGAL-BUZONES | Arquitectura de dos buzones (JUDICIAL + CORREOS) en Centro de Comunicaciones | ✅ Completo |
| HU-CARPETA-DIGITAL | Visor de documentos por blob autenticado en Carpeta Digital | ✅ Completo |

---

## Bugs Resueltos

| Fecha | Severidad | Descripción | Causa raíz |
|---|---|---|---|
| 02 jun | Media | Centro de Comunicaciones no sincronizaba correos | Error en `microsoft-graph.service.ts` |
| 19 jun | Alta | Error 500 al cargar aprobación de PTA por componentes | Tabla `PtaComponentApproval` no existía en BD (`TYPEORM_SYNC=false`) |
| 20 jun | Alta | No se podía enviar PTA a aprobación cuando algún componente tenía 0 horas | Validación demasiado estricta en `pta.service.ts` |
| 22 jun | **Urgente** | Carpeta RUND invisible en QA para el docente | `@Roles('DOCENTE')` hace match exacto de string; casing diferente en QA → 403 |
| 22 jun | Alta | Invitaciones RUND no aparecen en la tabla del backoffice | `apiClient.handleResponse` ya desenvuelve `{success, data}`; el componente leía `res.data` que era `undefined` |
| 22 jun | Media | Estadísticas del tablero RUND quedan en 0 al cargar | Se usaba `filterPeriodo` (del listado) en vez de `statsFilterPeriodo` (del tab de stats) |
| 22 jun | Baja | Log `[BancoDocentesPTA] AUTH` se enviaba en cada render del componente | `console.log` fuera de guard/effect |
| 24 jun | Alta | Error CSP al cargar Solicitudes PTA en QA (`localhost:5000/api/pta/catalogos/territoriales`) | `fetch` hardcodeado a localhost en `PtaBackofficeModule.tsx` |
| 24 jun | Media | Botón "Solicitar segundo PTA" no aparecía con PTA aprobado | Modal existía pero no tenía trigger en el portal del docente |
| 24 jun | Media | El permiso de segundo PTA permanecía `aprobado` después de usarse | `pta.service.ts` no transicionaba la solicitud a `gestionada` tras crear el segundo PTA |

---

## Migraciones SQL Creadas

| N.° | Archivo | Descripción |
|---|---|---|
| 327 | `327_remove_dsn_emails_from_correos_juridicos.sql` | Limpieza de correos DSN en tabla de correos jurídicos |
| 337 | `337_create_solicitudes_insumos.sql` | Tabla de solicitudes de insumos (módulo legal) |
| 338 | `338_cleanup_legal_orphan_objects.sql` | Limpieza de objetos huérfanos en schema legal |
| 339 | `339_create_documento_carpeta_digital.sql` | Tabla `documento_carpeta_digital` con visor por blob |
| 340 | `340_fix_pta_component_approval_table.sql` | Tabla `PtaComponentApproval` faltante |
| 348 | `348_create_banco_docentes_invitaciones_and_aprobacion_log.sql` | Tablas de invitaciones RUND y log de aprobaciones |
| 365 | `365_add_buzon_to_correos_juridicos.sql` | Columna `buzon` en tabla `correos_juridicos` |

---

## Resumen de Tiempos

| Actividad | Horas |
|---|---|
| Bug Centro de Comunicaciones (2 jun) | 4 |
| Respuesta correo con adjunto (5 jun) | 5 |
| Limpieza 3 submódulos legal (17 jun) | 6 |
| Alineación RUND + Carpeta Digital + PTA aprobación (19 jun) | 18 |
| Fix PTA 0 horas (20 jun) | 3 |
| Autogestión docente RUND completa (21 jun) | 14 |
| Fixes urgentes QA — carpeta RUND + invitaciones + stats + log (22 jun) | 5 |
| HU-12 + validador tipo documento + config individual (22 jun) | 12 |
| Flujo completo segundo PTA (24 jun) | 7 |
| Arquitectura dos buzones Centro de Comunicaciones (25–26 jun) | 12 |
| **TOTAL** | **86 h** |

---

## Contexto del Equipo

El equipo técnico completo realizó **219 commits** (sin contar merges) durante junio, distribuidos entre 8 desarrolladores:

| Desarrollador | Commits |
|---|---|
| Henrry | 60 |
| Julian | 41 |
| DrkGodEater9 | 37 |
| brianlopez-saroa | 26 |
| nan | 23 |
| lenynlozano-coder | 16 |
| juanp-suarezr | 11 |
| Dev-Drian | 5 |
| **Tomiguts** | **12** *(+alto impacto por volumen de código)* |

---

*Informe generado el 26 de junio de 2026.*
