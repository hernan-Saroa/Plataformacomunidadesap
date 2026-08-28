# Documentación del Módulo de Viáticos y Gastos de Viaje (HU-SOL-001)

> **Estado:** Implementado y probado
> **Última actualización:** 2026-08-27
> **Alcance:** Frontend MFE `mfe-viaticos` + Backend microservicio `travel-expenses-service`

---

## 1. Resumen

El módulo de **Viáticos y Gastos de Viaje** permite gestionar las comisiones de
servicios oficiales de la ESAP: radicación de solicitudes de comisión, consulta de
funcionarios comisionables, autorización de tratamiento de datos (Habeas Data),
validación de fechas y generación del payload alineado al DTO backend
`CreateSolicitudDto`.

| Capa           | Ubicación                                                                                                                                        | Tecnología                                       |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------ |
| Frontend (MFE) | [`apps/mfe-viaticos`](../../apps/mfe-viaticos)                                                                                                   | React 18 + TypeScript + Vite + Module Federation |
| Backend        | [`backend/travel-expenses-service`](../../backend/travel-expenses-service)                                                                       | NestJS 11 + TypeORM + PostgreSQL                 |
| Pruebas FE     | [`ViaticosModulePremium.test.tsx`](../../apps/mfe-viaticos/src/components/ViaticosModulePremium.test.tsx)                                        | Vitest + Testing Library                         |
| Pruebas BE     | [`travel-expenses.service.spec.ts`](../../backend/travel-expenses-service/src/modules/travel-expenses/__tests__/travel-expenses.service.spec.ts) | Jest                                             |

---

## 2. Arquitectura

```
┌──────────────────────────────────────────────────────────────┐
│  Shell (apps/shell)                                          │
│  └─ BackofficeApp.tsx ── lazyRemote('viaticos/Module')        │
└───────────────┬──────────────────────────────────────────────┘
                │ Module Federation
┌───────────────▼──────────────────────────────────────────────┐
│  MFE mfe-viaticos                                            │
│  ├─ components/ViaticosModulePremium.tsx  (lista + KPIs)     │
│  ├─ components/NuevaSolicitudModal.tsx    (wizard 3 pasos)   │
│  ├─ utils/viaticosUtils.ts                (lógica pura)      │
│  ├─ services/api/viaticosService.ts       (cliente HTTP)     │
│  └─ types/viaticos.ts                     (tipos / contrato) │
└───────────────┬──────────────────────────────────────────────┘
                │ GET/POST /api/v1/* (api-gateway)
┌───────────────▼──────────────────────────────────────────────┐
│  travel-expenses-service (NestJS)                            │
│  ├─ TravelExpensesController / Service                       │
│  ├─ DTOs: CreateSolicitudDto, UploadDocumentoDto             │
│  ├─ Entities: Comisionado, SolicitudComision, DocSoporte     │
│  └─ Auth: JwtAuthGuard + PermissionsGuard (RBAC)             │
└──────────────────────────────────────────────────────────────┘
```

### 2.1 Integración con el Shell

El shell carga el módulo de forma remota mediante Module Federation:

- [`vite.config.ts`](../../apps/mfe-viaticos/vite.config.ts) expone `./Module` → [`ViaticosModulePremium.tsx`](../../apps/mfe-viaticos/src/components/ViaticosModulePremium.tsx).
- [`BackofficeApp.tsx`](../../apps/shell/src/components/esap/BackofficeApp.tsx) lo referencia como `viaticos/Module`.

---

## 3. Backend (travel-expenses-service)

### 3.1 Endpoints

| Método | Ruta                              | Permiso                          | Descripción                           |
| ------ | --------------------------------- | -------------------------------- | ------------------------------------- |
| `GET`  | `/api/v1/comisionados/:documento` | Autenticación                    | Consulta un comisionado por documento |
| `POST` | `/api/v1/requests`                | `travel_expenses:create_request` | Crea una solicitud de comisión        |
| `POST` | `/api/v1/requests/:id/documentos` | `travel_expenses:create_request` | Sube un documento soporte             |

Referencia: [`travel-expenses.controller.ts`](../../backend/travel-expenses-service/src/modules/travel-expenses/travel-expenses.controller.ts)

### 3.2 Reglas de negocio del servicio

Implementadas en [`travel-expenses.service.ts`](../../backend/travel-expenses-service/src/modules/travel-expenses/travel-expenses.service.ts):

1. **Comisionado obligatorio**: si `comisionadoId` no existe → `400 BadRequest`.
2. **Habeas Data (Ley 1581/2012 y Sentencia T-254 de 2024)**: si el comisionado
   no tiene `autorizacionHabeasData` y el DTO no trae `aceptaHabeasData` → `400`.
   Si se acepta, se persiste la autorización y la IP de registro.
3. **Sanitización del objeto**: se aplica [`sanitizeObjetoComision`](../../backend/travel-expenses-service/src/common/sanitize.util.ts)
   (solo ASCII, espacios y guiones, máx. 250). Si queda vacío → `400`.
4. **Rango de fechas**: `fechaFin < fechaInicio` → `400`.
5. **Solapamiento**: si el comisionado ya tiene una solicitud activa en el rango → `409 Conflict`.
6. **Consecutivo único**: `COM-2026-XXXX` calculado en transacción.
7. **Radicado fuera de jornada**: si es fin de semana o después de las 16:30, se
   marca `radicadoFueraJornada` y se retorna `warningMessage`.

### 3.3 DTO `CreateSolicitudDto`

Referencia: [`create-solicitud.dto.ts`](../../backend/travel-expenses-service/src/dto/create-solicitud.dto.ts)

| Campo                   | Tipo    | Validación            |
| ----------------------- | ------- | --------------------- |
| `objetoComision`        | string  | 1–250                 |
| `destinoCiudad`         | string  | 1–100                 |
| `destinoDepartamento`   | string  | 1–100                 |
| `fechaInicio`           | string  | ISO                   |
| `fechaFin`              | string  | ISO                   |
| `rubroPresupuestal`     | string  | 1–100                 |
| `prioridad`             | string  | `ALTA`/`MEDIA`/`BAJA` |
| `requiereTiquetes`      | boolean | —                     |
| `comisionadoId`         | string  | —                     |
| `creadoPorUsuarioId`    | string  | —                     |
| `aceptaHabeasData?`     | boolean | opcional              |
| `ipRegistroHabeasData?` | string  | opcional              |
| `documentos?`           | array   | opcional              |

> **Nota sobre nomenclatura:** el backend recibe el cuerpo en **camelCase**
> (`destinoCiudad`, `fechaInicio`, …) tal como lo define `CreateSolicitudDto`
> con `ValidationPipe`. El frontend trabaja internamente con `snake_case`
> (`destino_ciudad`, `fecha_inicio`, …) para **persistencia y consulta** vía
> `CreateSolicitudRequest`, y el mapeo entre ambos se documenta en la sección 5.

### 3.4 Autenticación y permisos

- `JwtAuthGuard` protege todos los endpoints.
- `PermissionsGuard` + decorador `@Permissions('travel_expenses:create_request')`
  exige el permiso RBAC para crear solicitudes.
- Referencias: [`auth/jwt-auth.guard.ts`](../../backend/travel-expenses-service/src/auth/jwt-auth.guard.ts),
  [`common/permissions.guard.ts`](../../backend/travel-expenses-service/src/common/permissions.guard.ts).

---

## 4. Frontend (mfe-viaticos)

### 4.1 Archivos

| Archivo                                                                                         | Responsabilidad                                                                         |
| ----------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| [`ViaticosModulePremium.tsx`](../../apps/mfe-viaticos/src/components/ViaticosModulePremium.tsx) | Contenedor principal: KPIs, tabla de solicitudes, filtros, secciones y detalle.         |
| [`NuevaSolicitudModal.tsx`](../../apps/mfe-viaticos/src/components/NuevaSolicitudModal.tsx)     | Wizard de 3 pasos para radicar una solicitud de comisión.                               |
| [`viaticosUtils.ts`](../../apps/mfe-viaticos/src/utils/viaticosUtils.ts)                        | Lógica pura: sanitización, validación de fechas, mapeo al DTO, helpers de presentación. |
| [`viaticosService.ts`](../../apps/mfe-viaticos/src/services/api/viaticosService.ts)             | Cliente HTTP del módulo.                                                                |
| [`viaticos.ts`](../../apps/mfe-viaticos/src/types/viaticos.ts)                                  | Tipos y contrato del módulo.                                                            |
| [`ModuleLayout.tsx`](../../apps/mfe-viaticos/src/shared/ModuleLayout.tsx)                       | Layout común del MFE (menú lateral, cabecera).                                          |

### 4.2 Flujo del wizard de nueva solicitud

```
Paso 1: Datos del Funcionario Comisionado
  ├─ Ingresar documento (placeholder "Ej. 1019283746")
  ├─ "Consultar" → viaticosService.consultarComisionado(documento)
  ├─ Si no existe        → mensaje de error
  ├─ Si NO autorizado    → modal "Autorización de Tratamiento de Datos"
  │                        (checkbox + "Aceptar y Continuar")
  └─ Si autorizado       → tarjeta con datos del comisionado → "Siguiente"

Paso 2: Objeto y Destino de la Comisión
  ├─ objetoComision (sanitizado en vivo: ASCII + espacios)
  ├─ destinoCiudad, destinoDepartamento
  ├─ fechaInicio, fechaFin  (validadas: fin >= inicio)
  ├─ rubroPresupuestal, prioridad (ALTA/MEDIA/BAJA), requiereTiquetes
  └─ "Siguiente" / "Enviar Solicitud" (valida fechas)

Paso 3: Confirmación y envío
  └─ Resumen → "Enviar Solicitud" → crearSolicitudComision(payload)
```

### 4.3 Alineación del payload con el DTO backend

`mapearARequestCreacion` ([`viaticosUtils.ts`](../../apps/mfe-viaticos/src/utils/viaticosUtils.ts))
convierte el formulario en `CreateSolicitudRequest` (snake_case), que
`crearSolicitudComision` envía al backend:

| Campo formulario (FE)         | Payload `CreateSolicitudRequest` | DTO backend (camelCase) |
| ----------------------------- | -------------------------------- | ----------------------- |
| `comisionadoId`               | `comisionado_id`                 | `comisionadoId`         |
| `objetoComision` (sanitizado) | `objeto_comision`                | `objetoComision`        |
| `destinoCiudad`               | `destino_ciudad`                 | `destinoCiudad`         |
| `destinoDepartamento`         | `destino_departamento`           | `destinoDepartamento`   |
| `fechaInicio`                 | `fecha_inicio`                   | `fechaInicio`           |
| `fechaFin`                    | `fecha_fin`                      | `fechaFin`              |
| `rubroPresupuestal`           | `rubro_presupuestal`             | `rubroPresupuestal`     |
| `prioridad`                   | `prioridad`                      | `prioridad`             |
| `requiereTiquetes`            | `requiere_tiquetes`              | `requiereTiquetes`      |
| `USUARIO_ACTUAL_ID`           | `creado_por_usuario_id`          | `creadoPorUsuarioId`    |
| `aceptaHabeasData`            | `acepta_habeas_data`             | `aceptaHabeasData`      |
| —                             | `ip_registro_habeas_data`        | `ipRegistroHabeasData`  |
| —                             | `documentos`                     | `documentos`            |

### 4.4 Sanitización del objeto de comisión

El frontend replica la política del backend:

- Se **normalizan las tildes** conservando la letra base (`ó` → `o`):
  `gestión` → `gestion`.
- Se reemplaza `ñ` → `n`.
- Se eliminan caracteres especiales (`@ # $ % …`).
- Se conservan letras, números y espacios simples.
- El recorte final de espacios se aplica al construir el payload.

Ejemplo: `Comisión de gestión institucional` → `Comision de gestion institucional`.

---

## 5. Pruebas

### 5.1 Frontend (Vitest) — 23 pruebas

Suite: [`ViaticosModulePremium.test.tsx`](../../apps/mfe-viaticos/src/components/ViaticosModulePremium.test.tsx)

Cobertura destacada:

- Render del módulo, título y descripción.
- Resumen estadístico al cargar (KPIs).
- Tabla de solicitudes, búsqueda y filtro por estado.
- Apertura/cierre del modal y reinicio del formulario.
- Consulta de comisionado por documento (éxito y no encontrado).
- Modal de Habeas Data y aceptación para avanzar.
- Navegación entre pasos (Siguiente / Atrás).
- Sanitización del objeto (conservación de palabras y eliminación de especiales).
- Validación de fechas (fin anterior a inicio, fechas ausentes).
- Envío exitoso y **payload alineado al DTO** (snake_case).
- Detalle de solicitud y navegación de secciones.

Comando:

```bash
cd apps/mfe-viaticos
npm run test:run
```

### 5.2 Backend (Jest) — 12 pruebas

Suite: [`travel-expenses.service.spec.ts`](../../backend/travel-expenses-service/src/modules/travel-expenses/__tests__/travel-expenses.service.spec.ts)
y [`app.controller.spec.ts`](../../backend/travel-expenses-service/src/app.controller.spec.ts).

Cobertura:

- `consultarComisionado` (existe / no existe).
- `crearSolicitud` (comisionado inexistente, falta Habeas Data, aceptación de
  Habeas Data, solapamiento de fechas, creación exitosa con consecutivo, fecha
  fin anterior a inicio).
- `subirDocumento` (solicitud inexistente / éxito).
- `AppController` (mensaje de estado del microservicio).

Comando:

```bash
cd backend/travel-expenses-service
npm install   # solo la primera vez (el servicio no está en workspaces del root)
npm test
```

---

## 6. Configuración y despliegue

- El MFE usa [`vite.config.ts`](../../apps/mfe-viaticos/vite.config.ts) con base y
  salida gestionadas por `scripts/mfe.config.mjs`.
- La URL del API Gateway se obtiene de
  [`config/environment.ts`](../../apps/mfe-viaticos/config/environment.ts).
- Variables de entorno del servicio: [`backend/travel-expenses-service/.env`](../../backend/travel-expenses-service/.env).
- Migraciones de base de datos: [`db/migrations/travel-expenses-service`](../../db/migrations/travel-expenses-service).

---

## 7. Pendientes / siguientes pasos

- [ ] Conectar `creado_por_usuario_id` con el id de sesión real del portal
      (actualmente usa `USUARIO_NO_AUTENTICADO`).
- [ ] Definir el flujo completo de aprobación (jefe → talento humano → resolución).
- [ ] Integrar la gestión de tiquetes y legalización de gastos con datos reales.
- [ ] Persistir documentos soporte desde el frontend (`subirDocumento`).
- [ ] Ajustar la IP real del cliente para `ip_registro_habeas_data`.
