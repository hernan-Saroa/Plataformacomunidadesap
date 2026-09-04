# RF-LIQ-004 · Consolidación y Cierre de Expediente de Comisión (Etapa 3)

> **Módulo:** Viáticos y Gastos de Viaje · ESAP
> **Historias relacionadas:** RF-LIQ-003 (tiquetes y presupuesto), RF-SOL-003
> (checklist de soportes), RF-SIS-001 (auditoría y trazabilidad).
> **Rol ejecutor:** Enlace de Dependencia (permisos `travel_expenses:create_request`).
> **Destino:** Grupo de Viáticos (revisión).
> **Fecha:** 2026-09-04

---

## 1. Objetivo

Consolidar el **expediente digital transaccional** de una comisión antes de
enviarlo al Grupo de Viáticos. El sistema debe:

1. **Validar** que el expediente esté completo: Formato 023, autoliquidación
   financiera, decisión de tiquetes/reserva y soportes PDF exigidos por rol.
2. **Congelar** el expediente (modo solo lectura) y transicionarlo a
   **SOLICITADO** si las validaciones pasan.
3. **Rechazar** el envío (HTTP 422) con el detalle estructurado de los
   elementos faltantes si está incompleto.
4. **Auditar** cada transición de estado para Control Interno y contratación
   pública (`solicitudes_historial_estados`).

---

## 2. Notas de diseño / decisiones

| Tema                           | Decisión                                                | Justificación                                                                                                                                                                 |
| ------------------------------ | ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Estado objetivo                | Se usa **`SOLICITADO`** (canónico en el modelo)         | La regla de negocio habla de `SOLICITADA`; en el esquema existente el estado ya definido es `SOLICITADO` (lo consumen el seed, la lista "En Aprobación" y los tipos del MFE). |
| Estados de entrada             | `RADICADA`, `EXTEMPORANEA`, `DEVUELTA`                  | Se agrega `DEVUELTA` al enum (devolución por analista para subsanar).                                                                                                         |
| Numeración de migración        | `016_historial_estados_trazabilidad.sql`                | El correlativo `015` ya existe (`015_gestion_tiquetes_y_presupuesto.sql`).                                                                                                    |
| Fuente de verdad del checklist | **Backend** (`GET /requests/:id/consolidacion/preview`) | Evita duplicar reglas de negocio en el frontend; el cliente solo pinta el estado devuelto.                                                                                    |

---

## 3. Base de datos

### Migración `backend/travel-expenses-service/db/migrations/016_historial_estados_trazabilidad.sql`

Crea la tabla de auditoría append-only (solo inserción) de transiciones de estado:

| Columna           | Tipo                   | Descripción                                                       |
| ----------------- | ---------------------- | ----------------------------------------------------------------- |
| `id`              | `UUID PK`              | `gen_random_uuid()`.                                              |
| `solicitud_id`    | `UUID FK`              | → `travel_expenses.solicitudes_comision(id)` `ON DELETE CASCADE`. |
| `estado_anterior` | `VARCHAR(50)`          | Estado previo (ej. `RADICADA`).                                   |
| `estado_nuevo`    | `VARCHAR(50) NOT NULL` | Estado posterior (ej. `SOLICITADO`).                              |
| `usuario_id`      | `UUID NOT NULL`        | Enlace de Dependencia / Analista que ejecuta la acción.           |
| `comentarios`     | `VARCHAR(255)`         | Observación opcional.                                             |
| `creado_en`       | `TIMESTAMP`            | `CURRENT_TIMESTAMP`.                                              |

Índices: `idx_historial_solicitud (solicitud_id)` y `idx_historial_creado_en (creado_en)`.

### Entidad TypeORM

[`SolicitudHistorialEstadoEntity`](../../backend/travel-expenses-service/src/entities/solicitud-historial-estado.entity.ts) registrada en
[`app.module.ts`](../../backend/travel-expenses-service/src/app.module.ts).

### Estados (enum)

[`EstadoSolicitud`](../../backend/travel-expenses-service/src/entities/estado-solicitud.enum.ts)
ahora incluye `DEVUELTA` y dos constantes de máquina de estados:

- `ESTADOS_CONSOLIDABLES = { RADICADA, EXTEMPORANEA, DEVUELTA }`
- `ESTADOS_SOLO_LECTURA = { SOLICITADO, APROBADO_JEFE, … , RECHAZADO }`

---

## 4. Backend

### 4.1 API Contract

| Método | Endpoint                              | Descripción                                                |
| ------ | ------------------------------------- | ---------------------------------------------------------- |
| `GET`  | `/requests/:id/consolidacion/preview` | Previsualiza la integridad (no muta).                      |
| `POST` | `/requests/:id/submit`                | Consolida, congela y envía a revisión (HTTP 201 en éxito). |

> En el gateway el prefijo real es `/viaticos/api/v1/...`.

### 4.2 Lógica interna (`ConsolidacionService.consolidarExpediente`)

Todo se ejecuta dentro de una **transacción ACID** (`dataSource.transaction`):

1. **Recuperar y bloquear** la fila con `SELECT ... FOR UPDATE`
   (`setLock('pessimistic_write')`) para evitar colisiones de estado.
2. **Validar estado de entrada**: si ya está en `ESTADOS_SOLO_LECTURA` → `400`;
   si no está en `ESTADOS_CONSOLIDABLES` → `400`.
3. **Validator de integridad** (`validarIntegridad`), **100 % parametrizable
   por tipo de comisionado** (NO hay listas fijas en código):
   - **Formato 023 (campos)**: los obligatorios se derivan dinámicamente de
     `config_tipo_comisionado.campos_obligatorios` (restando
     `camposOpcionales` y `camposOcultos`), replicando
     `TravelExpensesService.validarCamposObligatorios`. Incluye la regla del
     objeto sanitizado (1..250 caracteres) cuando el objeto es obligatorio.
   - **Autoliquidación**: `montoViaticos > 0` y `diasComision > 0`.
   - **Tiquetes y presupuesto** (si `requiereTiquetes`):
     - Ruta corta restringida (p. ej. Bogotá–Ibagué) → exige excepción
       `RUTA_CORTA` con `numeroDocumentoSoporte` y PDF
       (`documentoSoporteUrl`).
     - Exige registro de saldo presupuestal (`saldos_tiquetes`) o excepción de
       presupuesto (`PRESUPUESTO_AGOTADO`).
   - **Checklist por rol** (`config_tipo_comisionado_documentos`): obligatorios
     dinámicos según el rol del comisionado (p. ej. Funcionario/Docente `CDP` +
     `CERT_BANCARIA`; Contratista/Estudiante además `RUT`, `SEGURIDAD_SOCIAL`,
     `CONTRATO_SECOP`; internacional / acto administrativo `PASAPORTE`,
     `CARTA_INVITACION`, `RESOLUCION_ACTO`, etc.). Todo se lee de la
     parametrización, de modo que cambios administrativos se reflejan sin tocar
     código.
4. **Si falla** → `HttpException 422` con cuerpo `{ success: false, errors: [...] }`
   (rollback automático: el estado no cambia).
5. **Si pasa** → `estado = SOLICITADO` + registro en
   `solicitudes_historial_estados` (append-only) + respuesta `201`.

### 4.3 Inmutabilidad (solo lectura)

En [`TravelExpensesService`](../../backend/travel-expenses-service/src/modules/travel-expenses/travel-expenses.service.ts)
se agregó `verificarExpedienteModificable`, que **bloquea** la subida y
eliminación de documentos cuando el expediente está en `ESTADOS_SOLO_LECTURA`
(los campos ya solo eran editables en `PENDIENTE`).

### 4.4 Swagger

Endpoints documentados con `@ApiTags('consolidacion')`, `@ApiOperation`,
`@ApiResponse` y `@ApiBearerAuth` en
[`ConsolidacionController`](../../backend/travel-expenses-service/src/modules/consolidacion/consolidacion.controller.ts).
Docs interactivos: `http://localhost:3010/docs`.

---

## 5. Frontend (MFE `apps/mfe-viaticos`)

### 5.1 "Paso 4: Resumen de Expediente y Envío"

[`ConsolidacionExpediente.tsx`](../../apps/mfe-viaticos/src/components/ConsolidacionExpediente.tsx)
renderiza:

1. **Expediente Digital** — demográficos, itinerario y objeto sanitizado.
2. **Tarjeta financiera** — desglose del Autoliquidador (viáticos, gastos,
   total).
3. **Tarjeta de transporte** — decisión de tiquetes + estado (semáforo) de la
   validación de saldo.
4. **Checklist visual** — `✓` cargado / `✗` faltante, con carga inline de PDF.
5. **Validación en cliente** — si hay pendientes, el botón **"Radicar y Enviar a
   Revisión"** queda deshabilitado y se lista lo faltante.
6. **Confirmación** — `POST /requests/:id/submit`; en éxito (201) pantalla con
   **confeti**: "¡Expediente Consolidado con éxito! … COM-2026-XXXX …".

### 5.2 Integración

- [`NuevaSolicitudModal.tsx`](../../apps/mfe-viaticos/src/components/NuevaSolicitudModal.tsx)
  abre el modo **consolidación** cuando recibe `solicitudAResumir` en estado
  `RADICADA` / `EXTEMPORANEA` / `DEVUELTA` (nuevo prop `onSolicitudConsolidada`).
- [`ViaticosModulePremium.tsx`](../../apps/mfe-viaticos/src/components/ViaticosModulePremium.tsx)
  expone la acción **"Consolidar y enviar a revisión"** (icono ✈/enviar) en la
  tabla para los estados consolidables.
- [`viaticosService`](../../apps/mfe-viaticos/src/services/api/viaticosService.ts):
  `obtenerResumenConsolidacion` y `consolidarSolicitud` (propaga los `errors`
  del 422).
- Tipos nuevos en [`types/viaticos.ts`](../../apps/mfe-viaticos/src/types/viaticos.ts):
  `ResumenConsolidacion`, `ResultadoConsolidacion`, `ESTADOS_CONSOLIDABLES` y el
  estado `DEVUELTA` (+ badge en `viaticosUtils`).

---

## 6. Pruebas

### Backend (Jest)

| Archivo                                                                                                                                                    | Cobertura                                                                |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| [`consolidacion.service.spec.ts`](../../backend/travel-expenses-service/src/modules/consolidacion/__tests__/consolidacion.service.spec.ts)                 | Escenarios Gherkin 1-3 + bloqueos 400/404 + preview.                     |
| [`travel-expenses-immutability.spec.ts`](../../backend/travel-expenses-service/src/modules/travel-expenses/__tests__/travel-expenses-immutability.spec.ts) | Subida/eliminación bloqueadas en `SOLICITADO`; permitidas en `RADICADA`. |

#### Escenario 1 — Consolidación exitosa

> Dado una comisión en estado `RADICADA` con autoliquidación, decisión de
> tiquetes aprobada y soportes PDF del rol cargados  
> Cuando el enlace confirma el envío  
> Entonces el sistema cambia a `SOLICITADO`, registra el log en
> `solicitudes_historial_estados` y bloquea edición/subida.

#### Escenario 2 — Rechazo por checklist incompleto

> Dado una comisión tipo `CONTRATISTA` en `RADICADA`  
> Cuando se intenta enviar sin el `RUT` en PDF  
> Entonces la transacción se detiene, se mantiene `RADICADA` y se retorna 422
> con el detalle "Falta documento obligatorio: RUT".

#### Escenario 3 — Excepción aérea en ruta corta

> Dado que se requieren tiquetes para la ruta restringida Bogotá–Ibagué  
> Cuando se envía sin excepción en `excepciones_autorizadas_tiquetes`  
> Entonces el sistema emite error de validación y bloquea el envío hasta
> adjuntar el PDF firmado.

### Frontend (Vitest)

Correr `npm run test:run` en `apps/mfe-viaticos` (suites existentes de
`ViaticosModulePremium`, `TicketBudgetWidget` y `viaticosService`).

---

## 7. Cómo probar manualmente

1. Crear y radicar una solicitud (pasos 1-4 del modal) → queda `RADICADA`.
2. En la bandeja, pulsar la acción **Consolidar y enviar a revisión**.
3. Verificar el "Paso 4": si faltan soportes, el botón está deshabilitado y se
   listan los pendientes; se pueden subir PDFs inline.
4. Una vez completo, "Radicar y Enviar a Revisión" → pantalla de éxito con
   confeti y el consecutivo `COM-2026-XXXX`.
5. Comprobar que la solicitud aparece como `SOLICITADO` y que ya **no** se
   pueden subir/eliminar documentos (solo lectura).
6. Revisar en BD `travel_expenses.solicitudes_historial_estados` la transición
   `RADICADA → SOLICITADO` con `usuario_id` del enlace.

## 8. Archivos modificados/creados

**Backend**

- `db/migrations/016_historial_estados_trazabilidad.sql` (nuevo)
- `src/entities/solicitud-historial-estado.entity.ts` (nuevo)
- `src/entities/estado-solicitud.enum.ts`
- `src/app.module.ts`
- `src/modules/consolidacion/consolidacion.module.ts` (nuevo)
- `src/modules/consolidacion/consolidacion.service.ts` (nuevo)
- `src/modules/consolidacion/consolidacion.controller.ts` (nuevo)
- `src/modules/travel-expenses/travel-expenses.service.ts` (guard de solo lectura)
- `src/modules/consolidacion/__tests__/consolidacion.service.spec.ts` (nuevo)
- `src/modules/travel-expenses/__tests__/travel-expenses-immutability.spec.ts` (nuevo)

**Frontend (MFE viáticos)**

- `src/types/viaticos.ts`
- `src/utils/viaticosUtils.ts`
- `src/services/api/viaticosService.ts`
- `src/components/ConsolidacionExpediente.tsx` (nuevo)
- `src/components/NuevaSolicitudModal.tsx`
- `src/components/ViaticosModulePremium.tsx`
