# Plan de Implementación — Módulo de Gestión de Contratación

**Rama:** `feature/EFDS-1244_Habilitar_modulo_contratacion`
**Servicio:** `hiring-service` (puerto 3012) · **MFE:** `mfe-contratacion` (puerto 3114) · **Schema:** `hiring`
**Fecha:** 2026-08-03

---

## 0. Principio rector

El módulo NO debe hardcodear etapas, modalidades ni actividades. Todo es **configuración en base de datos**.

Razón: la ESAP maneja 10 etapas × 11 modalidades × N subactividades, con una matriz que cruza qué aplica y qué no. Si eso vive en `if/switch`, cada cambio normativo es un despliegue. Si vive en tablas, es una pantalla de administración.

**Regla:** si un abogado de la Dirección de Contratación puede describir el cambio en una frase, no debe requerir un desarrollador.

---

## 1. Estado actual (auditado)

### Lo que la rama ya trae — infraestructura completa

| Área | Estado |
|---|---|
| `backend/hiring-service` | NestJS + TypeORM + Swagger + Dockerfile. Arranca. |
| `apps/mfe-contratacion` | Vite + React + Module Federation. Compila. |
| Despliegue | 9 docker-compose, 5 deploy.sh, 3 migrate.*, 4 workflows CI |
| Gateway | Entrada `hiring` en `proxy.config.ts:105` |
| Schema BD | `CREATE SCHEMA hiring` |
| Registro en `auth.module` | Sí, con `is_active` |

### Lo que NO trae — toda la lógica

| Área | Estado |
|---|---|
| Entidades TypeORM | `entities: []` — vacío |
| Tablas de negocio | Cero |
| Endpoints | Uno: `GET /status` |
| UI | Una pantalla que imprime un JSON |
| Auth / guards | **Ausente — ver riesgo R1** |

---

## 2. Riesgos detectados en la rama actual

### R1 — CRÍTICO: el servicio no tiene autenticación

`backend/hiring-service/src/app.module.ts` no importa ningún módulo de auth. No hay `JwtAuthGuard`, no hay `JwtStrategy`, no hay carpeta `auth/`. Comparado con `legal-management-service/src/auth/` (guard + strategy + decorador `@Public` + control de acceso), aquí no hay nada.

Hoy no importa porque el único endpoint devuelve un JSON estático. En el momento en que exista un endpoint que lea o escriba datos de contratación, queda expuesto sin autenticar.

**Acción: copiar el patrón de auth de `legal-management-service` ANTES del primer endpoint con datos.** Es el punto 3.1 del plan y no es negociable.

### R2 — Almacenamiento de archivos: el proyecto YA tiene el patrón correcto

**Auditado en el código.** El proyecto usa **dos** mecanismos distintos:

**A) Documentos operativos → disco + ruta en BD (patrón correcto, mayoritario)**

```ts
// legal-management-service/src/controllers/expediente.controller.ts:54
@UseInterceptors(FilesInterceptor('files', 5, {
  storage: diskStorage({
    destination: './uploads',
    filename: (req, file, cb) => { /* nombre aleatorio 32 hex + extensión */ }
  })
}))
// La BD guarda solo la ruta:
data.documentosInicialesUrls = files.map(f => `/legal/files/${f.filename}`);
```

Las entidades guardan metadatos, no bytes:
- `documento.entity.ts` → `archivo_url`, `archivo_nombre_original`, `archivo_tamano`, `archivo_mime_type`
- `evidencia.entity.ts` → `archivo_nombre`, `archivo_url`, `archivo_tamano`

Volúmenes ya montados en `docker-compose.prod.yml`:
```yaml
DISCIPLINARY_STORAGE_PATH: ${DISCIPLINARY_STORAGE_PATH:-/app/uploads}
- ${DISCIPLINARY_STORAGE_HOST_PATH:-./backend/.../uploads}:/app/uploads
- ./backend/internal-institutional-control-service/uploads:/app/uploads
```

`multer` con `diskStorage` aparece en 51 archivos del backend. Es el estándar de facto del proyecto.

**B) Plantillas → base64 en Postgres (excepción acotada)**

Solo `plantilla-documento.entity.ts` usa `contenido_base64: text`. Es aceptable ahí: las plantillas son pocas, pequeñas y de lectura frecuente.

**Conclusión: contratación sigue el patrón A, igual que los demás módulos.** No hace falta MinIO/S3 en Fase 1 — sería introducir una dependencia nueva donde el proyecto ya resolvió el problema.

**Lo que sí hay que añadir sobre el patrón existente:**

1. **Hash SHA-256** por documento — el expediente contractual es prueba ante entes de control (RF-SIS-08); hay que poder demostrar que un archivo no se alteró.
2. **Ruta configurable por variable de entorno** — `HIRING_STORAGE_PATH`, siguiendo `DISCIPLINARY_STORAGE_PATH`. No hardcodear `./uploads`.
3. **Validación de tipo y tamaño** — `fileFilter` de multer. Hoy varios controladores aceptan cualquier cosa.
4. **Backup del volumen** — el `pg_dump` no cubre `/app/uploads`. Si hoy no se respalda, el expediente contractual queda sin respaldo. **Verificar con infraestructura.**
5. **Ruta de descarga autenticada** — no servir `uploads/` como estático público.

### R3 — Falta `setGlobalPrefix`

Ningún servicio del backend usa `setGlobalPrefix`. `main.ts` de hiring registra Swagger en `api/docs` y loguea que corre en `/api/v1/hiring`, pero el controlador expone `@Controller()` en la raíz. El frontend llama a `/hiring/api/v1/status`.

Hay que verificar contra el gateway cuál es la ruta real y unificarla antes de multiplicar los endpoints, porque después son decenas.

### R4 — La migración 002 hace cosas ajenas a contratación

`002_seed_hiring_auth_module.sql` además de registrar el módulo:
- Renombra 13 módulos existentes (`gestion-profesoral` → "RUND", etc.)
- Inserta un módulo `dashboard` **sin guarda `IF NOT EXISTS`** → segunda corrida falla o duplica
- Lógica invertida: primera corrida deja `is_active = false`, segunda lo pone en `true`

**Acción:** separar en dos migraciones y añadir la guarda.

### R5 — Numeración duplicada en `db/migrations/`

Hay pares duplicados: `369_`, `370_`, `374_`, `375_`, `376_`, `377_`. Es deuda preexistente. `db/migrations/hiring/` usa numeración propia (001, 002...) y directorio propio — esa convención es la correcta, mantenerla.

### R6 — El MFE no reusa el design system

`ContratacionModulePremium.tsx` usa Tailwind crudo. El `vite.config.ts` **ya tiene los alias configurados** para `@esap-mfe/shared-ui` y `@esap-mfe/shared-types`, y `package.json` ya los declara como dependencias — pero el componente no los importa.

`packages/shared-ui` tiene 60+ componentes listos: `table`, `dialog`, `form`, `select`, `tabs`, `badge`, `card`, `responsive-table`, `confirmation-dialog`, `empty-state`, `loading-spinner`.

**Regla del módulo: cero componentes de UI nuevos si existe el equivalente en `shared-ui`.**

---

## 3. Arquitectura propuesta

### 3.1 Backend — estructura

Espejo de `legal-management-service`, que es el módulo más maduro:

```
backend/hiring-service/src/
├── auth/                          # R1 — copiar de legal-management
│   ├── auth.module.ts
│   ├── jwt-auth.guard.ts
│   ├── jwt.strategy.ts
│   ├── public.decorator.ts
│   └── hiring-access.ts           # control de acceso por rol
├── entities/
├── dto/
├── controllers/
├── services/
└── modules/
    ├── configuracion/             # motor de etapas/matriz
    ├── procesos/
    ├── expediente/
    ├── documentos/
    ├── contratos/
    └── supervision/
```

### 3.2 Modelo de datos — el núcleo configurable

**Bloque A — Configuración (lo que hace el módulo parametrizable)**

```sql
hiring.modalidades
  id, codigo, nombre, marco_normativo, activo, orden

hiring.etapas
  id, numero (1..10), nombre, descripcion, activo, orden

hiring.actividades
  id, etapa_id, numeral ('3.1'), nombre, descripcion,
  es_transversal bool, requiere_documento bool,
  plantilla_id nullable, orden, activo

hiring.matriz_aplicabilidad          -- ★ EL CORAZÓN
  id, modalidad_id, actividad_id, aplica bool,
  obligatoria bool, dias_plazo int nullable,
  UNIQUE(modalidad_id, actividad_id)

hiring.campos_actividad              -- ★ formularios dinámicos
  id, actividad_id, codigo, etiqueta,
  tipo ('texto'|'numero'|'fecha'|'moneda'|'seleccion'|'archivo'|'tabla'),
  obligatorio bool, orden, opciones jsonb, validaciones jsonb,
  modalidad_id nullable   -- NULL = aplica a todas
```

`campos_actividad` resuelve el hueco del HU RF-EST-01: la lista de campos obligatorios del estudio previo no está en el documento fuente y el propio HU sugiere parametrizarla. Con esta tabla, el formulario y su validación salen de la BD.

**Bloque B — Operación**

```sql
hiring.procesos
  id, radicado UNIQUE, modalidad_id, etapa_actual_id,
  objeto text, valor_estimado numeric(18,2),
  area_solicitante, estado, fecha_radicacion,
  plan_anual_item_id nullable, created_by, updated_by

hiring.expedientes                   -- RF-SIS-04, 1:1 con proceso
  id, proceso_id UNIQUE, numero_expediente, estado, fecha_apertura

hiring.proceso_actividades           -- instancia de la matriz por proceso
  id, proceso_id, actividad_id, estado,
  fecha_inicio, fecha_limite, fecha_completado,
  responsable_id, datos jsonb          -- valores de campos_actividad
  -- estado: PENDIENTE|EN_CURSO|EN_REVISION|DEVUELTA|APROBADA|NO_APLICA

hiring.documentos
  id, expediente_id, proceso_actividad_id nullable,
  tipo, nombre,
  archivo_url,                         -- patrón del proyecto: /hiring/files/<hash>.ext
  archivo_nombre_original, archivo_mime_type, archivo_tamano,
  hash_sha256,                         -- ★ integridad probatoria (RF-SIS-08)
  codigo_unico,                        -- ★ RF-SIS-06
  consecutivo_active_document nullable,-- ★ radicación externa (3.3)
  version int, documento_padre_id nullable,
  estado, subido_por, created_at

hiring.plantillas
  id, codigo, nombre, actividad_id nullable, modalidad_id nullable,
  storage_key, version, vigente_desde, vigente_hasta, activo

hiring.trazabilidad
  id, proceso_id, entidad, entidad_id, accion,
  datos_antes jsonb, datos_despues jsonb,
  usuario_id, usuario_nombre, ip, created_at
```

**Catálogos confirmados en la matriz (A2) — seeds exactos**

| Catálogo | Cantidad | Fuente |
|---|---|---|
| Modalidades | 11 | A2, columnas E..O |
| Etapas | 10 | A2, columna A |
| Actividades/puntos de control | 63 | A2, filas R4..R66 |
| Tipos de modificación contractual | 8 | A2 R67-R75 |
| Tipologías contractuales | 16 | A2 R78-R94 |
| Estados de contrato (estadísticas) | 5 | A2 R95-R100 |
| Roles | 15 | A4 R18-R31 |
| Permisos base | 9 | A4 R7 |

```sql
hiring.tipos_modificacion    -- 8: Modificación, Adición, Prórroga, Cesión,
                             --    Aclaratorio, Suspensión, Reanudación, Terminación anticipada
hiring.tipologias_contrato   -- 16: Prestación de servicios, Suministro, Compraventa,
                             --    PSP y apoyo a la gestión, Interadministrativo (contrato),
                             --    Interadministrativo (convenio), Comodato, Mandato,
                             --    Convenio Marco, Consultoría/Interventoría, Obra pública,
                             --    Concesión, APP, Arrendamiento, Convenio Asociación DL 092/2017,
                             --    Otros
                             -- ★ campos: requiere_liquidacion bool, aplica_persona ('NATURAL'|'JURIDICA'|'AMBAS')
```

**Dato clave de la matriz:** las tipologías traen reglas embebidas —
"Prestación de servicios: aplica para personas jurídicas", "PSP y apoyo a la gestión: aplica para personas naturales únicamente".
Y la nota de R78: *"que se generen alertas en cuanto a los plazos de los amparos de las pólizas para efectos de liquidación y/o cierre"*.

**Bloque C — Contrato y post-adjudicación**

```sql
hiring.contratos
  id, proceso_id, numero_contrato UNIQUE, contratista_id,
  valor, fecha_inicio, fecha_terminacion, estado,
  supervisor_id, fecha_designacion, fecha_aceptacion_supervision

hiring.polizas
  id, contrato_id, tipo, aseguradora, numero_poliza,
  valor_asegurado, vigencia_desde, vigencia_hasta, estado

hiring.obligaciones_supervision       -- ★ ataca el problema real
  id, contrato_id, descripcion, periodicidad,
  fecha_limite, estado, evidencia_documento_id nullable

hiring.pagos
  id, contrato_id, numero_pago, valor, estado,
  fecha_solicitud, fecha_pago, cdp_documento_id

hiring.modificaciones_contractuales   -- otrosí
  id, contrato_id, tipo ('ADICION'|'PRORROGA'|'MODIFICACION'|'SUSPENSION'),
  valor_adicional, nueva_fecha_terminacion, justificacion,
  documento_id, estado, created_at
```

**Nota sobre pólizas:** mencionaste el caso del contrato que vence el 13 pero la póliza debe cubrir hasta el 31 de enero, y más allá de la finalización. Por eso `vigencia_hasta` de la póliza es independiente de `fecha_terminacion` del contrato, y la alerta compara ambas — no asume que coinciden.

### 3.3 Motor de flujo — cómo funciona

Al crear un proceso:

1. Se lee su `modalidad_id`
2. Se consulta `matriz_aplicabilidad WHERE modalidad_id = X AND aplica = true`
3. Se instancian filas en `proceso_actividades` **solo para las actividades que aplican**
4. Las que no aplican quedan como `NO_APLICA` (visibles en la trazabilidad, no ejecutables)
5. `dias_plazo` de la matriz calcula `fecha_limite` desde la fecha de radicación

Un cambio normativo = un `UPDATE` en `matriz_aplicabilidad`. Cero despliegues.

**Avance de etapa:** un proceso avanza cuando todas sus `proceso_actividades` obligatorias de la etapa actual están en `APROBADA`. Esta regla se lee de datos, no se codifica por etapa.

### 3.4 Frontend — estructura

```
apps/mfe-contratacion/src/
├── components/
│   ├── ContratacionModulePremium.tsx    # shell + tabs
│   ├── procesos/
│   ├── expediente/
│   ├── actividades/
│   │   └── FormularioDinamico.tsx       # ★ render desde campos_actividad
│   ├── configuracion/
│   │   └── MatrizAplicabilidad.tsx      # ★ editor de la matriz
│   ├── contratos/
│   ├── supervision/
│   └── shared/
├── hooks/
│   ├── useAuth.ts                       # copiar de mfe-control-interno
│   └── usePermissions.ts
├── services/
└── types/
```

**`FormularioDinamico` es la pieza clave del front.** Un solo componente que lee `campos_actividad` y renderiza el formulario. Sirve para el estudio previo, para el análisis del sector y para las 10 etapas. Sin él, son ~40 formularios escritos a mano.

### 3.5 Reuso obligatorio

| Necesidad | Reusar de | No hacer |
|---|---|---|
| Tablas, modales, forms, tabs, badges | `packages/shared-ui` (60+ componentes) | Componentes nuevos |
| Auth backend | `legal-management-service/src/auth/` | Guard propio |
| Auth frontend | `mfe-control-interno/src/hooks/useAuth.ts` | Hook nuevo |
| Permisos | `packages/shared-types/src/permissions.ts` | Enum paralelo |
| Alertas de vencimiento | `alertas-vencimiento.service.ts` (cron `0 7 * * *`, `America/Bogota`) | Scheduler nuevo |
| Expediente | Modelo de `expediente.entity.ts` | Diseño desde cero |
| Responsive | `packages/shared-hooks` (`useResponsive`, `useIsMobile`) | Media queries manuales |

---

## 4. Fases de entrega

### Fase 0 — Saneamiento (1-2 días) · BLOQUEANTE

- [ ] Merge de `origin/dev` (verificado: **cero archivos solapados**, entra limpio)
- [ ] **Auth en hiring-service** (R1) — copiar `auth/` de legal-management
- [ ] Servicio de archivos: `diskStorage` + `HIRING_STORAGE_PATH` + `fileFilter` + SHA-256
- [ ] Verificar con infraestructura si `/app/uploads` entra en el backup
- [ ] Corregir migración 002 (R4): guarda `IF NOT EXISTS` + separar renombres
- [ ] Unificar prefijo de rutas (R3)

### Fase 1 — Configuración (1 semana)

- [ ] Migración `003_hiring_configuracion.sql` — bloque A
- [ ] Seed: 11 modalidades, 10 etapas, actividades por numeral
- [ ] Seed: matriz de aplicabilidad desde el Excel
- [ ] Entidades + CRUD de configuración
- [ ] Pantalla `MatrizAplicabilidad.tsx`

**Entregable demostrable:** un administrador cambia qué actividad aplica a qué modalidad, sin desarrollador.

### Fase 2 — Proceso y expediente (1-2 semanas)

- [ ] Migración `004_hiring_procesos.sql` — bloque B
- [ ] Radicación + apertura automática de expediente
- [ ] Instanciación de actividades desde la matriz
- [ ] Servicio de almacenamiento de archivos
- [ ] Versionamiento documental
- [ ] Trazabilidad automática (interceptor)
- [ ] `FormularioDinamico.tsx`

### Fase 3 — HU RF-EST-01, estudio previo (3-5 días)

Con las fases 1 y 2 hechas, el HU es configuración + una pantalla:

- [ ] Seed de `campos_actividad` para el numeral 3.1
- [ ] `GET/POST /procesos/:id/actividades/3.1`
- [ ] `POST .../enviar` → 422 con lista de campos faltantes
- [ ] Descarga de plantilla desde biblioteca
- [ ] Adjuntos
- [ ] Flujo borrador → en revisión → devuelto → aprobado

**Los criterios Gherkin del HU se cumplen aquí. Sin fases 1-2, no hay dónde guardar el estudio previo.**

### Fase 4 — Etapas 4 a 8 (2-3 semanas)

Comité, CDP (carga manual desde KLIC), estudios de mercado, apertura, evaluación, adjudicación. Evidencia de publicación SECOP II — **sin integración, solo soporte documental**.

### Fase 5 — Contrato y supervisión (2-3 semanas)

- [ ] Bloque C
- [ ] Designación de supervisor + aceptación explícita
- [ ] Obligaciones calendarizadas
- [ ] Alertas de vencimiento de pólizas (cron)
- [ ] Trámite de pago **bloqueado sin evidencias** ← ataca "los supervisores son deficientes en cargar"
- [ ] Modificaciones contractuales

---

## 4-bis. Reglas de negocio duras (validaciones que el sistema DEBE imponer)

Extraídas de A1 y A2. Estas son bloqueos, no advertencias:

| # | Regla | Fuente | Dónde se implementa |
|---|---|---|---|
| RN-01 | **Sin CDP expedido no se abre el proceso** | RF-EST-05 | Guard en transición a etapa 5 |
| RN-02 | **En contratación directa, el CDP va ANTES de los demás documentos** | RF-EST-06 | Orden de actividades por modalidad |
| RN-03 | **Si supera el umbral → Licitación Pública automática** | RF-EST-03 | Cálculo en `procesos`; umbral parametrizable |
| RN-04 | **El RP sustituye al CDP en etapa contractual** | RF-LEG-02 | Estado del proceso |
| RN-05 | **El objeto del contrato NO puede modificarse jamás** | RF-MOD-04 | Validación en modificaciones |
| RN-06 | **Adición requiere nuevo CDP y RP; prórroga no toca presupuesto** | RF-MOD-01/02 | Por tipo de modificación |
| RN-07 | **Liquidación: 4 meses bilateral + 2 adicionales unilateral** | RF-LIQ-02 | Cálculo de plazos + alertas |
| RN-08 | **Comité en directa solo si supera 1.000 SMMLV** | RF-DOC-05 | ★ Único umbral numérico explícito |
| RN-09 | **Proyecto de pliego: 10 días hábiles en licitación** | RF-PUB-01 | Cronograma. Días **hábiles**, no calendario |
| RN-10 | **Módulo de incumplimiento con acceso restringido por reserva legal** | RF-INC-03, RNF-SEG-03 | RBAC reforzado |
| RN-11 | **ARL obligatorio para personas naturales en directa** | A2 R54 (8.5) | Campo condicional |
| RN-12 | **Sin ofertas habilitadas → proceso desierto** | RF-ADJ-02 | Transición automática |
| RN-13 | **Póliza puede vencer después del contrato** | A2 R78 | Fechas independientes |

**Nota sobre RN-09:** el proyecto ya tuvo un bug de este tipo — commit `9dbe524a` *"dias restantes de etapa/noticia mostraban dias calendario en vez de dias habiles"*. Los plazos de contratación son en días hábiles. Reusar la utilidad ya corregida, no reimplementarla.

---

## 5. Decisiones pendientes

**Resueltas con los anexos:**
- ~~Almacenamiento~~ → disco + ruta en BD, patrón existente del proyecto (R2)
- ~~Modalidades y etapas~~ → A2 tiene las 11 y las 10, con aplicabilidad completa
- ~~Roles~~ → A4 tiene los 15 y los 9 permisos base

**Abiertas — el propio requerimiento las marca como "a validar" (sección 6 de A1):**

1. **Umbrales exactos por modalidad** — A1 solo dice "según cuantía/umbral". El único número explícito es 1.000 SMMLV para comité en directa (RF-DOC-05). → tabla `hiring.umbrales` parametrizable, con el valor del SMMLV por vigencia.
2. **Plazos de publicación y traslado por modalidad** — solo consta "10 días hábiles en licitación" (RF-PUB-01). → `matriz_aplicabilidad.dias_plazo`.
3. **Campos obligatorios del estudio previo** — sigue sin definirse. → `campos_actividad`.
4. **Ponderaciones de evaluación por modalidad** — sin definir.
5. **Detalle técnico de integraciones** — A1 dice "cuando aplique". Fase 1 = interacción documental, no integración.
6. **Solución de firma electrónica** — A1 la pide explícitamente ("Implementación de firma electrónica"). ¿Se reusa `mfe-firma-electronica`?
7. **Responsable funcional y correos** — A1 los deja "por definir".
8. **Backup del volumen de uploads** — ¿está cubierto hoy? (ver R2, punto 4)

**Punto de atención sobre RF-EJE-04:** el requerimiento menciona "integración con Click para evitar la carga triple (factura, seguridad social, RUT)". Esto contradice el resto del documento, que trata KLIC como interacción y no integración. **Hay que confirmar el alcance real con la Dirección de Contratación** — es la diferencia entre subir un PDF y construir un conector.

---

## 5-bis. Roles y permisos (A4)

15 roles × 9 permisos base (`Editar`, `Adjuntar`, `Visualizar todos los procesos`, `Asignar/Reasignar`, `Aprobar`, `Archivar`, `Borrar`, `Generar informes`, `Configurar`).

Patrón de permiso, consistente con `shared-types/permissions.ts`:
```
contratacion.<area>.<accion>
contratacion.estudios-previos.edit
contratacion.comite.aprobar
contratacion.supervision.evidencia.upload
contratacion.configuracion.manage
contratacion.incumplimiento.view      ← ★ reserva legal, RN-10
```

**Roles con matices que la matriz de permisos plana no captura:**

| Rol | Restricción real (A4 Hoja2) |
|---|---|
| Estructurador Financiero | "Editor **solo en los numerales 1**" — alcance limitado por etapa |
| Direccionamiento Estratégico | "Editor **solo en los numerales 1**" |
| Archivo de Gestión DC | Solo "renombrar, consecutivo, mover" — no edita contenido |
| Comité Evaluador | "Consulta y **cargue** de archivos" — no edita el proceso |
| Organismos de control | Consulta pura, **externo** a la ESAP |
| Gestor de Contratación | Contratistas: **acceso limitado a la vigencia de su contrato** |

Los dos últimos son los sensibles:
- **Organismos de control son usuarios externos** → segmentación de red y datos, no solo un rol.
- **Los contratistas pierden acceso al vencer su contrato** → el permiso necesita vigencia temporal, no es un booleano. Esto **no está en el modelo RBAC actual del proyecto** y hay que verificarlo antes de la Fase 1.

---

## 6. Anexos convertidos

Fuentes en `docs/contratacion/`:

| Archivo | Origen | Contenido |
|---|---|---|
| `A1_REQUERIMIENTO.md` | ESAP-TD-FO-019 (.docx) | 55 RF + 10 RNF, alcance, reglas |
| `A2_MATRIZ_FLUJO.md` | Matriz Flujo v2 (.xlsx) | **Fuente única de verdad**: 63 actividades × 11 modalidades |
| `A3_FLUJO_PRESENTACION.md` | Flujo 09/07/2026 (.pptx) | Diagramas y puntos de decisión |
| `A4_ROLES_PERMISOS.md` | Formato roles Jun2026 (.xlsx) | 15 roles, 9 permisos, atributos |

Regla: **A2 manda.** Si A1 y A2 discrepan, gana la matriz (así lo declara A1: *"la matriz constituye la fuente única de verdad funcional"*).

---

## 7. Convenciones del módulo

- Migraciones en `db/migrations/hiring/` con numeración propia, nunca en la raíz
- Toda escritura pasa por trazabilidad
- Todo endpoint autenticado salvo `@Public` explícito
- Cero UI nueva si existe en `shared-ui`
- Permisos en `shared-types/permissions.ts`, patrón `contratacion.<area>.<accion>`
- Nada de etapas, modalidades ni actividades en código

---

## 8. Motor de aplicabilidad y reglas (HU futura, no EFDS-1146)

La matriz tiene una columna por modalidad y marca cada actividad. Eso significa
que **la modalidad decide qué recorre el proceso**, no solo qué formato usa.
Enajenación de bienes por subasta, por ejemplo, dice `NO` en 1.1, 1.3, 1.4, toda
la etapa 2 (PAA) y toda la 4 (CDP): se salta unas 8 actividades.

Sobre la 3.1 no aplica: la matriz la marca `SI` en las once modalidades, así que
el estudio previo se elabora igual en todas. Por eso esta HU no necesita el
motor, solo capturar la modalidad.

### La matriz no es un SI/NO

Al convertirla aparecen cinco tipos de regla distintos, no uno:

| Fila | Celda | Tipo de regla |
|---|---|---|
| 1.1 | `NO` en Enajenación | Aplica / no aplica |
| 2.3 | `TVEC` en vez de `SI` | Aplica **con variante** |
| 3.2 | `si*` en Concurso precalificación | Aplica **con condición** |
| 144 | "filtro según la modalidad" | Regla **derivada** de otro dato |
| 4.3 | "Sin CDP no se puede continuar" | **Bloquea** el avance |

Y falta un sexto, que no está en las celdas sino en la normativa: **umbrales que
cambian por modalidad** (el tope de Mínima Cuantía, los plazos mínimos de
publicación en Licitación).

Una tabla `(numeral, modalidad, aplica)` no alcanza para eso.

### Esquema propuesto

```sql
-- Las 63 actividades, sin depender de modalidad
hiring.actividades_catalogo (numeral, etapa, nombre, descripcion, orden)

-- La matriz: aplicabilidad y variantes
hiring.actividad_modalidad (numeral, modalidad, aplica, variante, nota)

-- Qué se valida en cada actividad, por modalidad
hiring.reglas_actividad (numeral, modalidad, tipo, config jsonb)
```

`tipo` como enum corto: `CAMPO_OBLIGATORIO`, `DOCUMENTO_REQUERIDO`,
`RANGO_VALOR`, `PLAZO_MINIMO`, `BLOQUEA_AVANCE`. El detalle en `config`:

```json
{ "campo": "valor_estimado", "max": 172000000,
  "mensaje": "Excede el tope de Mínima Cuantía" }
```

Así el validador es genérico: lee las reglas de la actividad, las evalúa contra
los datos, devuelve faltantes. Cambiar un tope es un `UPDATE`, no un despliegue.

### Por qué no se construye todavía

Hay 63 actividades y una implementada. Un motor diseñado sobre una muestra de
uno queda corto: se descubre a la tercera o cuarta actividad que faltaba un tipo
de regla, y para entonces ya hay 693 filas seedeadas y código dependiendo del
esquema.

Y la matriz aún no está validada por la Dirección de Contratación. Los `si*`,
la fila "144" —que no es un numeral sino ruido de la hoja— y los
`2.2000000000000002` de Excel delatan un documento en borrador. Codificarla
entera ahora garantiza reseedeo.

### Lo que sí quedó hecho (migración 007)

Lo barato que no se pierde después:

- `hiring.modalidades`: catálogo en tabla, no en un `CHECK`. La normativa cambia
  (el régimen especial 092 es de 2017); agregar una modalidad no debe migrar.
- `procesos.modalidad` con FK al catálogo, exigida al crear. Sin esto habría que
  migrar a mano los procesos existentes cuando llegue el motor.
- La modalidad en la traza de creación: si el catálogo cambia, el expediente
  sigue mostrando con cuál nació el proceso.
- La validación de la 3.1 leyendo `campos_formulario` desde base de datos, no
  hardcodeada. Es el germen del motor: `CAMPO_OBLIGATORIO` ya es exactamente lo
  que hace hoy.

### Cómo se ve una actividad que no aplica

`ListaActividades` ya tiene el estado `no_aplica`. Se muestran **tachadas, no
ocultas**: el gestor ve que la actividad existe y que su proceso no la requiere,
en vez de preguntarse por qué faltan pasos. Y para auditoría queda constancia de
qué se omitió.
