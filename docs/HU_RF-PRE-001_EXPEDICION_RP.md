# Documentación Técnica: Historia de Usuario RF-PRE-001
# Etapa 7 — Expedir Registro Presupuestal (RP) en SIIF Nación (COMPROMETIDA)

## 1. Resumen Ejecutivo y Alcance
La **Etapa 7** del Módulo de Viáticos y Comisiones de Servicio de la ESAP permite al **Grupo de Presupuesto** recibir solicitudes de comisión previamente autorizadas (`AUTORIZADA` / `EN_PRESUPUESTO`), verificar su disponibilidad presupuestal, registrar la expedición del **Registro Presupuestal (RP)** generado en el sistema **SIIF Nación** conforme a la nomenclatura estandarizada `Fecha_RP_Número`, y transicionar la comisión al estado irreversible **`COMPROMETIDA`**.

---

## 2. Base de Datos y Modelo Relacional (DDL)

### 2.1. Archivo de Migración
- **Ruta:** `backend/travel-expenses-service/db/migrations/432_expedicion_rp_presupuesto_etapa7.sql`
- **Ruta alternativa/espejo:** `travel-expenses-service/db/migrations/432_expedicion_rp_presupuesto_etapa7.sql`

### 2.2. Campos del Registro Presupuestal en `travel_expenses.solicitudes_comision`
| Columna | Tipo de Dato | Nulable | Descripción |
| :--- | :--- | :--- | :--- |
| `numero_rp` | `VARCHAR(50)` | SÍ | Número oficial del RP expedido en SIIF Nación. |
| `fecha_rp` | `DATE` | SÍ | Fecha de expedición del RP (formato YYYY-MM-DD). |
| `valor_comprometido` | `NUMERIC(14, 2)` | SÍ | Monto total comprometido en moneda local. |
| `rubro_presupuestal_rp` | `VARCHAR(100)` | SÍ | Cadena presupuestal institucional oficial. |
| `soporte_rp_path` | `VARCHAR(255)` | SÍ | Ruta o nombre del documento PDF adjunto. |
| `codigo_rp` | `VARCHAR(150)` | SÍ | Código normalizado con nomenclatura `Fecha_RP_Número`. |
| `fecha_registro_rp` | `TIMESTAMP WITH TIME ZONE` | SÍ | Marca de tiempo exacta del registro en la plataforma. |
| `usuario_presupuesto_id` | `UUID` | SÍ | FK al usuario del Grupo de Presupuesto que registró el RP. |
| `enviado_presupuesto` | `BOOLEAN` | NO (default false) | Bandera indicando si fue remitido por el analista. |
| `fecha_envio_presupuesto`| `TIMESTAMP WITH TIME ZONE` | SÍ | Marca de tiempo del envío al Grupo de Presupuesto. |

### 2.3. Estructura de Seguridad RBAC
- **Rol:** `GRUPO_PRESUPUESTO` (alias `PRESUPUESTO`)
- **Permisos Semillados:**
  - `travel_expenses:read_authorized`: Permite consultar la bandeja de comisiones autorizadas y pendientes de RP.
  - `travel_expenses:issue_rp`: Permite registrar individual y masivamente los RPs en SIIF Nación.
  - `travel_expenses:read_budget` y `travel_expenses:register_rp` (compatibilidad hacia atrás).

---

## 3. Backend: Arquitectura y API REST (NestJS / TypeORM)

### 3.1. Entidad y Mapeo TypeORM
- **Archivo:** `backend/travel-expenses-service/src/entities/solicitud-comision.entity.ts`
- **Mapeo:**
  - `numeroRp`, `fechaRp`, `valorComprometido`, `rubroPresupuestalRp`, `rubroRp`, `soporteRpPath`, `codigoRp`, `usuarioPresupuestoId`, `fechaRegistroRp`.
  - Enum `EstadoSolicitud.COMPROMETIDA` agregado.

### 3.2. DTOs de Validación con `class-validator`
- `IssueRpDto` (`backend/travel-expenses-service/src/dto/issue-rp.dto.ts`):
  - Valida `numeroRp` (requerido, máx. 50 caracteres).
  - Valida `fechaRp` (formato ISO YYYY-MM-DD).
  - Valida `valorComprometido` (número positivo > 0).
  - Valida `rubroPresupuestal` / `rubro` (cadena requerida).
  - Valida `soporteRpPath` con expresión regular para el formato `Fecha_RP_Número` (`YYYYMMDD_RP_Numero.pdf`).
- `BulkIssueRpDto` (`backend/travel-expenses-service/src/dto/bulk-issue-rp.dto.ts`):
  - Arreglo de items con validación anidada `@ValidateNested()` para procesamiento en lote.

### 3.3. Lógica Transaccional ACID y Bloqueo Pesimista
El método `registrarRP` en `travel-expenses.service.ts`:
1. **Bloqueo Pesimista:** Ejecuta `findOne` con `lock: { mode: 'pessimistic_write' }` (`SELECT ... FOR UPDATE`), evitando concurrencia sucia en expediciones simultáneas.
2. **Validación de Estado:** Exige que la comisión se encuentre en estado `AUTORIZADA` o `EN_PRESUPUESTO`. Caso contrario arroja HTTP `400 Bad Request`.
3. **Validación Nomenclatura Soporte:** Comprueba que el archivo o código respete la expresión regular `^(\d{4}-?\d{2}-?\d{2})_RP_([A-Za-z0-9\-_]+)(\.pdf)?$`.
4. **Transición y Auditoría:** Actualiza los campos, asigna estado `COMPROMETIDA`, y guarda un registro inmutable en `solicitudes_historial_estados`.

### 3.4. Endpoints del Controlador
- **`GET /api/v1/requests/budget-inbox`** (alias: `/requests/budget-inbox`, `/requests/budget/inbox`):
  - Consulta comisiones autorizadas y comprometidas con KPIs consolidados.
  - Permiso: `travel_expenses:read_authorized`.
- **`POST /api/v1/requests/:id/issue-rp`** (alias: `/requests/:id/issue-rp`, `/requests/:id/register-rp`):
  - Registra el RP individual y transiciona a `COMPROMETIDA`.
  - Permiso: `travel_expenses:issue_rp`.
- **`POST /api/v1/requests/bulk-issue-rp`** (alias: `/requests/bulk-issue-rp`, `/requests/budget/batch-rp`):
  - Procesamiento masivo de plantilla CSV/Excel.
  - Permiso: `travel_expenses:issue_rp`.
- **Bypass Super Admin:**
  - El rol `SUPER_ADMIN` tiene inmunidad total a través de `PermissionsGuard` y `isSuperAdmin()`.

---

## 4. Frontend (React / Tailwind / TypeScript)

### 4.1. Configuración Visual y Badges
- En `apps/mfe-viaticos/src/utils/viaticosUtils.ts`:
  - Badge para `COMPROMETIDA`: `bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300`.

### 4.2. Bandeja de Presupuesto (`PresupuestoInbox.tsx`)
- Columnas: Consecutivo, Comisionado, Dependencia, Valor Total a Liquidar, Rubro, Estado, RP, Botón **"Registrar RP"**.
- Botón en encabezado: **"Carga Masiva de RPs"**.

### 4.3. Modales
1. **`RegistrarRPModal.tsx`**:
   - Formulario individual con Número de RP, Fecha de Expedición, Valor Comprometido y Rubro Presupuestal.
   - Uploader interactivo de PDF con validador en tiempo real de la nomenclatura `YYYYMMDD_RP_Numero.pdf`.
2. **`CargaMasivaRPModal.tsx`**:
   - Dropzone de plantilla CSV/Excel con previsualización de errores antes del envío.
   - Contenedor multi-archivo para adjuntar lote de soportes PDF o carpeta comprimida ZIP.

---

## 5. Pruebas Automatizadas y Criterios Gherkin

### 5.1. Backend (NestJS / Jest)
- Archivo: `src/modules/travel-expenses/__tests__/travel-expenses-presupuesto.spec.ts`
- **Resultados:** 13 pruebas ejecutadas, 13 aprobadas (100% PASS).
  - Criterio 1: Enrutamiento de comisión `AUTORIZADA` a `EN_PRESUPUESTO`.
  - Criterio 2: Expedición de RP con transición a `COMPROMETIDA` y auditoría.
  - Criterio 3: Validación estricta de nomenclatura `Fecha_RP_Número` y procesamiento de carga masiva.

### 5.2. Frontend (React / Vitest)
- Archivo: `src/components/RegistrarRPModal.test.tsx` (3 pruebas PASS).
- Archivo: `src/components/PresupuestoInbox.test.tsx` (4 pruebas PASS).
- **Resultados:** 7 pruebas ejecutadas, 7 aprobadas (100% PASS).
  - Valida registro exitoso con soporte `20260916_RP_12345.pdf`.
  - Valida bloqueo y alerta ante soporte inválido `documento_rp.pdf`.
