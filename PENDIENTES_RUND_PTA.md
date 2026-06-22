# Pendientes — RUND / Carpeta Digital / PTA

> Estado a **2026-06-21**, **verificado contra el código** (no solo contra la tabla original).
> Varias HU cambiaron de estado tras auditar el código real. Cada punto incluye evidencia (archivo + líneas).

## Tablero general

| HU | Épica | Tipo | Prioridad | Estado original | **Estado real (código)** |
|----|-------|------|-----------|-----------------|--------------------------|
| HU-01 | Gestión Documental | Historia | Alta | ✅ Resuelto | ✅ Resuelto |
| HU-02 | Gestión Documental | Bug | Alta | ✅ Resuelto | ✅ Resuelto |
| HU-03 | Gestión Documental | Historia | Alta | 🟡 Pendiente | 🔵 **En proceso (~35%)** |
| HU-04 | Gestión Documental | Historia | Alta | 🟡 Pendiente | 🔵 **En proceso (~60%)** |
| HU-05 | Autogestión Docente | Historia | Media | 🔵 En proceso | ✅ **Resuelto** (con matiz) |
| HU-06 | Autogestión Docente | Historia | Media | 🔵 En proceso | 🟡 **Pendiente (CRÍTICO)** |
| HU-07 | Autogestión Docente | Historia | Media | 🟡 Pendiente | 🔵 **En proceso** |
| HU-08 | Autogestión Docente | Historia | Media | 🟡 Pendiente | 🔵 **En proceso** |
| HU-09 | PTA Creación | Bug | Alta | ✅ Resuelto | ✅ Resuelto |
| HU-10 | PTA Creación | Historia | Media | ✅ Resuelto | ✅ Resuelto |
| HU-11 | PTA Aprobación | Historia | Alta | 🔵 En proceso | 🔵 En proceso (5/8 criterios) |
| HU-12 | PTA Modificación | Historia | Media | 🟡 Pendiente | 🟡 Pendiente (~0%, base genérica existe) |
| HU-13 | Carga Masiva | Historia | Baja | 🟡 Pendiente | 🔵 **En proceso (~60%)** |
| HU-14 | Carga Masiva / Estructura | Historia | Baja | 🟡 Pendiente | 🟡 Pendiente (~5%) |

**Resumen:** 5 resueltas · 6 en proceso · 3 pendientes.
**Más cerca de lo pensado:** HU-13 (mucha carga masiva ya existe), HU-05 (carga implementada), HU-03/04/07 (base sólida).
**Crítico:** HU-06 (sin validación de archivos en backend — riesgo de seguridad).

---

## 🔵 En proceso

### HU-03 — Checklist documental por rol · Alta · ~35%
**Existe:**
- Modal "Configuración documental" con tabs "Tipos de Documentos" y "Listas de Chequeo" — [ConfiguracionTiposDocumentos.tsx](apps/shell/src/components/esap/ConfiguracionTiposDocumentos.tsx) (tab listas ~líneas 486-488, `ChecklistTab` ~752-979).
- Agregar ítems al checklist seleccionando tipos existentes (`addItem` ~859-889).
- El select de documentos consume tipos del API (`availableTypes` ~949-968, `fetchTiposDocumentos` ~220-223) — **sin listas quemadas** ✅.
- "Agregar documento" individual por docente funciona y guarda — [DigitalFolderSection.tsx](apps/shell/src/components/esap/DigitalFolderSection.tsx) `handleCreateTipoIndividual` ~230-258.

**Falta:**
- [ ] **Asignación por ROL no implementada.** La interfaz TS define `asignacion_tipo: 'todos'|'rol'|...` pero el backend solo soporta `territorial`/`sede`/`persona` — [carpeta-digital.service.ts](backend/auth-service/src/carpeta-digital/carpeta-digital.service.ts) `tipoAplicaAlaPersona` ~385-426. El front ofrece territorial/cetap/programa/persona, **no rol**.
- [ ] Que el checklist se exija filtrando por el **rol** del usuario (hoy es por territorial/sede/persona).
- [ ] Correlación firme con tipos del RUND (hoy es mapeo manual por prefijo `rund_`, ver HU-04).

> Diferencia clave: ya existe "documento específico por persona/carpeta", **falta** el "checklist general por ROL docente".

### HU-04 — Tipos de documento configurables y correlacionados · Alta · ~60%
**Existe:**
- Mantenedor CRUD completo de tipos de documento (crear/editar/eliminar nombre + descripción) — [ConfiguracionTiposDocumentos.tsx](apps/shell/src/components/esap/ConfiguracionTiposDocumentos.tsx) tab "Tipos" ~525-671; backend [carpeta-digital.service.ts](backend/auth-service/src/carpeta-digital/carpeta-digital.service.ts) `createTipoDocumento` ~78-100.
- El select del checklist consume estos tipos dinámicamente ✅ (~950-957).

**Falta:**
- [ ] **Correlación tipo ↔ RUND sin tabla puente.** El mapeo es manual por string/prefijo: `RundSoporteCampo.tipoSoporte` (ej. `"diploma_pregrado"`) → `rund_diploma_pregrado` en [carpeta-digital.service.ts](backend/auth-service/src/carpeta-digital/carpeta-digital.service.ts) ~150. No hay FK ni tabla de mapeo; el identificador RUND ≠ `tipo_documento.id`.
- [ ] **Catálogo RUND quemado en código** — [rund-soporte-campo.entity.ts](backend/academic-work-plan-service/src/pta/entities/rund-soporte-campo.entity.ts) ~24-33 (tipos por bloque fijos en comentario/lógica, no en BD).
- [ ] Mover ese catálogo a configuración / tabla de mapeo explícita.

### HU-07 — Flujo completo del formulario público del docente · Media
**Existe:**
- OTP de 6 dígitos (genera, valida, máx 5 intentos, expira 10 min) — [banco-docentes.service.ts](backend/academic-work-plan-service/src/pta/banco-docentes/banco-docentes.service.ts) `requestOtpByEmail` ~1658, `verifyOtpForEmail` ~1712.
- Bloqueo de correos no elegibles ("El correo no está dentro de la lista de elegibles del RUND") ✅.
- Precarga de datos si el docente ya existe (`getAutogestionInfo` + `checkExistingDocente`, ~30 campos) ✅.
- Sin duplicación: `submitFromToken` → `upsertDocente` con `rejectExisting:false` (upsert por `num_identificacion`) ✅ *(corregido recientemente)*.

**Falta:**
- [ ] **Envío de correo es un STUB.** `createInvitacion` solo loguea el token; comentario explícito *"En un caso real enviaríamos correo usando notifications-service"* (~1648). El OTP solo se loguea/expone como `devOtp`. **Sin notifications-service, el docente no recibe ni invitación ni OTP por correo.**
- [ ] Workflow de **envío masivo** de invitaciones a docentes nuevos.

### HU-08 — Sincronización perfil docente ↔ RUND · Media
**Existe:**
- Lectura sincronizada vía `authDocentesBaseSql()` que une `auth.personas` + `auth."user"` + `Docente` (LEFT JOIN) — [banco-docentes.service.ts](backend/academic-work-plan-service/src/pta/banco-docentes/banco-docentes.service.ts).
- Al iniciar PTA los datos vienen del RUND (si existe), si no de `auth.personas` ✅.
- Escritura docente→ambas tablas (`upsertDocente` actualiza `Docente` + `auth.personas`).

**Falta:**
- [ ] **No hay fuente única real:** `Docente` (academic-work-plan) y `auth.personas` (auth) pueden divergir si se editan por separado; no hay transacción que garantice consistencia entre servicios.
- [ ] Propagación **RUND → perfil del docente** en tiempo real (si GGP edita en backoffice, el docente no se entera — sin polling/websocket).
- [ ] Definir y documentar la fuente de verdad (propuesta: `auth.personas` primaria, `Docente` como extensión RUND).

### HU-11 — Trazabilidad de aprobación por componente · Alta · 5/8 criterios
**Existe:**
- Nombre completo del responsable por componente — [pta-component-approval.entity.ts](backend/academic-work-plan-service/src/pta/entities/pta-component-approval.entity.ts) `aprobadorNombre` ~31; visible en [PTADetallePanelBackoffice.tsx](apps/mfe-pta/src/components/pta/PTADetallePanelBackoffice.tsx) ~1180, 1238 ✅.
- Distinción visual aprobado/devuelto/pendiente (`ApprovalTracker` ~325-460, colores ~398-418) ✅.
- Sin orden fijo entre aprobaciones ✅.
- Permisos granulares por componente (`COMPONENT_PERMISSION` ~107-117) ✅.
- Flujo E2E básico funciona (endpoints `componentes-aprobacion` / `aprobar-componente`) ✅.

**Falta:**
- [ ] **Componente no configurado en GRIS:** hoy se auto-aprueba si no tiene horas ([pta.service.ts](backend/academic-work-plan-service/src/pta/pta.service.ts) ~1999-2016); no existe estado `no_configurado` ni su visualización.
- [ ] **Docencia requiere mínimo 1 materia:** la validación fue removida de `getComponentesAprobacion`; no hay bloqueo en `aprobarComponente`.
- [ ] **Validación por territorial:** se guardan `scope`/`scopeId` (~2048-2049) pero `aprobarComponente` **no valida** que la territorial del aprobador coincida.
- [ ] **Plazo de 4 semanas:** no existe lógica de deadline.

### HU-13 — Plantillas de importación masiva · Baja · ~60%
**Existe (más de lo esperado):**
- Carga masiva **estructura geográfica** (Direcciones Territoriales + CETAPs) con plantilla, validaciones G1-G7 y dry-run — [estructura-import/](backend/auth-service/src/estructura-import/), [ImportEstructuraModal.tsx](apps/mfe-estructura-org/src/components/estructura-organizacional/ImportEstructuraModal.tsx).
- Carga masiva **asignaturas/catálogo** con validaciones R1-R6 + Circular 003 — [asignaturas-import/](backend/academic-work-plan-service/src/pta/asignaturas-import/).
- Carga masiva **banco de docentes** — [BancoDocentesBulkUpload.tsx](apps/mfe-pta/src/components/pta/banco-docentes/BancoDocentesBulkUpload.tsx).
- Carga masiva **graduados** (`POST /graduates/bulk`).
- Creación uno a uno como alternativa (modales de seccional/sede/programa) ✅.

**Falta:**
- [ ] Carga masiva de **programas académicos**, **núcleos temáticos** y **facultades** (hoy solo uno a uno o derivados).
- [ ] **Módulo central unificado** de importaciones (hoy están dispersos por MFE).
- [ ] **Historial/auditoría** de importaciones (solo hay `getLastImport` básico en asignaturas).
- [ ] Documentar el **orden de carga** (estructura→programas→asignaturas→docentes) y rollback por dependencias.

---

## 🟡 Pendiente

### HU-06 — Validación de tipo de archivo al cargar · Media · ⚠️ CRÍTICO
**Existe:** solo `accept=".pdf,.jpg,.jpeg,.png"` en el input HTML — [AutogestionDocenteRUND.tsx](apps/mfe-pta/src/components/pta/banco-docentes/AutogestionDocenteRUND.tsx) ~871 (es UX, no validación real).

**Falta:**
- [ ] **`fileFilter` en Multer ausente** — [banco-docentes.controller.ts](backend/academic-work-plan-service/src/pta/banco-docentes/banco-docentes.controller.ts) ~342-358 acepta **cualquier archivo** (riesgo de seguridad: ejecutable renombrado como PDF).
- [ ] Validar MIME real + extensión + **tamaño máximo** en backend; rechazar con 400 y notificar.
- [ ] (Avanzado) Validación de contenido / OCR (que una cédula sea cédula, etc.).
- [ ] **Decisión de negocio:** ¿alcance solo formato o también contenido (OCR)?

### HU-12 — Segundo PTA / versionamiento (R01 → R02) · Media · ~0%
**Existe (base genérica, NO versionamiento):**
- Entidad `SolicitudPtaEntity` + [SolicitudPTAModal.tsx](apps/mfe-pta/src/components/portal/pta/SolicitudPTAModal.tsx) con justificación (mín. 50 palabras) + carga de PDFs (máx. 5) + endpoint `resolver` (aprobar/denegar).
- Campo `version: number` en `PlanTrabajoAcademicoEntity` que se incrementa, pero **no se usa como R01/R02**.

**Falta (todo el versionamiento):**
- [ ] Conservar **R01 inmutable** y generar **R02** como versión separada (hoy solo incrementa `version` sobre el mismo registro).
- [ ] Estado específico "Solicitud segundo PTA" / acción "Solicitar modificación" (el modal actual es para *nuevo* PTA, no para modificar a R02).
- [ ] **PDF de resolución obligatorio** específico para el segundo PTA.
- [ ] Validación de **rol/permiso** en el endpoint resolver (hoy es `@Public()`).
- [ ] Tras aprobar: PTA editable → al cerrar guarda R02 conservando R01 → R02 pasa por flujo de aprobación normal.
- [ ] Trazabilidad que evidencie R01 y R02; R02 vigente.
- [ ] **Descartar** cualquier implementación previa de "segundo PTA como validación adicional".

### HU-14 — Plan de estudios y estructura por periodo · Baja · ~5%
> Marcada como "falta muchísimo"; excede el PTA pero lo condiciona. **Validar alcance antes de estimar.**

**Existe (cimientos):**
- `periodo_academico` (estados planeacion/concertacion/en_curso/cerrado) — [periodo-academico.entity.ts](backend/academic-work-plan-service/src/pta/entities/periodo-academico.entity.ts).
- `oferta_cetap_programa` (programa ofrecido en sede × periodo, con cupos) — [oferta-cetap-programa.entity.ts](backend/academic-work-plan-service/src/pta/entities/oferta-cetap-programa.entity.ts).
- `periodo_cetap` (activar/desactivar sede por periodo).
- Asignaturas derivan de programa vía núcleo temático.
- Integración Oracle para **lectura** de graduados — [graduate-oracle-integration.service.ts](backend/academic-registration-service/src/graduation-certificates/graduate-oracle-integration.service.ts).

**Falta:**
- [ ] **No existe tabla `plan_de_estudios`/malla curricular** que agrupe asignaturas por semestre y versione el plan (plan 2020 vs 2025).
- [ ] La estructura **no es realmente independiente por periodo**: `periodo_cetap` solo activa/desactiva; no permite configuraciones distintas por periodo.
- [ ] **Match/reconciliación con base externa**: existe lectura Oracle pero **no** el match contra setup local (programa/periodo/sede). No hay rastro de "Arca".
- [ ] Programa **versionado por periodo** y su UI de creación por periodo.

---

## Decisiones de negocio pendientes (bloqueantes)

1. **HU-06** — Alcance de validación de archivos: ¿solo formato/extensión/tamaño o también contenido (OCR)?
2. **HU-14** — Alcance de integración externa (Oracle/Arca) y estructura/plan de estudios por periodo.
3. **HU-03/04** — Confirmar modelo final: ¿asignación del checklist **por rol** + tabla de mapeo tipo↔RUND?
4. **HU-07** — ¿Habilitar notifications-service para correos reales (invitación + OTP)? Hoy es stub.

## Dependencias clave

- **HU-04 → HU-03 → HU-05**: los tipos configurables + correlación RUND alimentan el checklist por rol, que define qué carga el docente en autogestión. *(HU-05 ya carga, pero contra un catálogo fijo en el front en vez del checklist real).*
- **HU-07 ↔ HU-08**: formulario público y perfil deben compartir fuente única (RUND); HU-07 además depende de notifications-service.
- **HU-13 → HU-14**: la carga masiva de estructura/catálogo es prerequisito del modelo por periodo y plan de estudios.
- **HU-01/HU-02** (resueltas) son prerequisito de visualización/persistencia para HU-05 y HU-11.

---

## Notas de la auditoría

- Hecho con análisis directo del código (frontend `apps/*` + backend `backend/*`), no solo de la tabla original.
- Cambios de estado relevantes vs. tabla original: **HU-05** subió a Resuelto; **HU-03, HU-04, HU-07, HU-08, HU-13** subieron a En proceso (tenían base ya construida); **HU-06** bajó a Pendiente y se marcó CRÍTICO (sin validación backend de archivos).
