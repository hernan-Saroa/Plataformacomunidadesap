# RF-REC-002 · Asignar solicitud a analista con tablero de carga

> **Módulo:** Viáticos y Gastos de Viaje · ESAP
> **Historias relacionadas:** RF-REC-001 (radicación), RF-SOL-003 (checklist de soportes), RF-SIS-001 (auditoría y trazabilidad).
> **Rol ejecutor:** Secretario de Viáticos (permiso `travel_expenses:assign_analyst`); bypass para SUPER_ADMIN.
> **Destino:** Grupo de Viáticos (asignación y revisión).
> **Fecha:** 2026-09-07

---

## 1. Objetivo

Permitir al **Secretario de Viáticos** asignar una solicitud de comisión a un analista del Grupo de Viáticos, apoyado por un **tablero de carga** que muestra el volumen de trabajo actual de cada analista mediante un semáforo visual. El sistema debe:

1. **Calcular** la carga ponderada de cada analista según las solicitudes activas en estados `SOLICITADO`, `EN_VERIFICACION` y `VERIFICADA`, ponderadas por prioridad (ALTA=3, MEDIA=2, BAJA=1).
2. **Visualizar** el tablero de carga con semáforo: VERDE (0-5), AMARILLO (6-12), ROJO (>12).
3. **Asignar** la solicitud al analista seleccionado, transicionando el estado a `EN_VERIFICACION` y registrando la novedad en el historial de estados.
4. **Garantizar** consistencia transaccional con bloqueo pesimista de la fila para evitar condiciones de carrera.

---

## 2. Notas de diseño / decisiones

| Tema                           | Decisión                                                | Justificación                                                                                                                                                                 |
| ------------------------------ | ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Algoritmo de carga              | Ponderación por prioridad (ALTA=3, MEDIA=2, BAJA=1)    | Prioriza la asignación a analistas con menor carga ajustada al peso real de las solicitudes.                                                                                   |
| Estados computables             | `SOLICITADO`, `EN_VERIFICACION`, `VERIFICADA`           | Solo estas etapas representan trabajo activo pendiente de cierre por el analista. Estados como `APROBADO_JEFE` ya pasaron a otro flujo.                                       |
| Límite de saturación            | Configurable en `parametros_globales` (`LIMITE_CARGA_SATURACION`) | Permite ajustar el umbral del semáforo sin deploy. Default: 12.                                                                                                              |
| Bypass SUPER_ADMIN              | Implementado en `PermissionsGuard`                      | El SUPER_ADMIN puede asignar analistas sin necesidad del permiso `travel_expenses:assign_analyst`, manteniendo flexibilidad operativa.                                        |
| Transacción                     | Bloqueo pesimista (`pessimistic_write`) + transacción    | Garantiza que dos secretarios no asignen la misma solicitud simultáneamente.                                                                                                  |
| Fuente de usuarios              | Tabla `analistas_viaticos` (migración 023)           | Centraliza los datos operativos y de carga laboral del analista, desacoplada de `auth.user` y lista para crecer sin tocar el esquema de autenticación. |

---

## 3. Base de datos

### Migración `backend/travel-expenses-service/db/migrations/021_permiso_asignacion_analistas.sql`

Crea el permiso `travel_expenses:assign_analyst` y lo asigna al rol `SECRETARIO`.

| Permiso                     | Rol         | Descripción                                                      |
| --------------------------- | ----------- | ---------------------------------------------------------------- |
| `travel_expenses:assign_analyst` | `SECRETARIO` | Permite asignar solicitudes a analistas del Grupo de Viáticos.   |

### Migración `backend/travel-expenses-service/db/migrations/022_ajustes_modulo_viaticos.sql`

#### 3.1 Tabla `parametros_globales`

| Columna           | Tipo                   | Descripción                                                       |
| ----------------- | ---------------------- | ----------------------------------------------------------------- |
| `clave`           | `VARCHAR(100) PK`      | Identificador único del parámetro (ej. `LIMITE_CARGA_SATURACION`). |
| `valor`           | `VARCHAR(255) NOT NULL`| Valor del parámetro.                                              |
| `tipo`            | `VARCHAR(50)`          | Tipo de dato (`number`, `string`, `boolean`).                     |
| `descripcion`     | `TEXT`                 | Explicación del parámetro.                                        |
| `editable`        | `BOOLEAN`              | Indica si se puede modificar desde el frontend.                   |
| `creado_en`       | `TIMESTAMP`            | Fecha de creación.                                                |
| `actualizado_en`  | `TIMESTAMP`            | Fecha de última actualización.                                    |

#### 3.2 Alteración `solicitudes_comision`

| Columna           | Tipo                   | Descripción                                                       |
| ----------------- | ---------------------- | ----------------------------------------------------------------- |
| `analista_asignado_id` | `UUID`             | ID del usuario analista asignado (`auth.user.id_user`).           |



### Migración `backend/travel-expenses-service/db/migrations/023_analistas_viaticos.sql`

Crea la tabla de analistas del módulo de viáticos.

#### 3.4 Tabla `analistas_viaticos`

| Columna           | Tipo                   | Descripción                                                       |
| ----------------- | ---------------------- | ----------------------------------------------------------------- |
| `id`              | `UUID PK`              | Identificador único del analista.                                 |
| `usuario_id`      | `UUID NOT NULL`        | Referencia al usuario del sistema (`auth.user.id_user`).          |
| `id_persona`      | `UUID NULL`            | Referencia a la persona (`auth.personas.id_person`).              |
| `identificacion`  | `VARCHAR(50) NULL`     | Número de identificación del analista.                            |
| `nombre_completo` | `VARCHAR(255) NOT NULL`| Nombre completo del analista.                                     |
| `username`        | `VARCHAR(100) NOT NULL`| Usuario de acceso.                                                |
| `email`           | `VARCHAR(255) NULL`    | Correo electrónico.                                               |
| `telefono`        | `VARCHAR(50) NULL`     | Teléfono de contacto.                                             |
| `cargo`           | `VARCHAR(255) NULL`    | Cargo o rol dentro del Grupo de Viáticos.                         |
| `activo`          | `BOOLEAN DEFAULT true` | Indica si el analista está activo para recibir asignaciones.      |
| `created_at`      | `TIMESTAMP`            | Fecha de creación.                                                |
| `updated_at`      | `TIMESTAMP`            | Fecha de última actualización.                                    |

**Restricciones:**
- `fk_analista_usuario`: foreign key hacia `auth.user(id_user)`.
- `uq_analista_usuario`: único por `usuario_id`.
- `uq_analista_identificacion`: único por `identificacion`.

**Índices:**
- `idx_analistas_viaticos_usuario_id`
- `idx_analistas_viaticos_identificacion`
- `idx_analistas_viaticos_activo`

### Sincronización automática desde `auth-service`

La tabla `analistas_viaticos` se mantiene automáticamente desde el módulo de usuarios (`auth-service`):

- **Al crear un usuario** con rol `ANALISTA`: se inserta/actualiza el registro.
- **Al actualizar roles** de un usuario:
  - Si se asigna `ANALISTA`, se inserta/actualiza.
  - Si se remueve `ANALISTA`, se elimina el registro.
- **Al actualizar el estado** del usuario: se sincroniza el campo `activo`.

Implementado en [`UsersService.syncAnalistaViaticos`](../../backend/auth-service/src/users/users.service.ts) siguiendo el mismo patrón de `syncDisciplinaryProfessional`.

### Migración `backend/travel-expenses-service/db/migrations/024_rol_analista_permisos.sql`

Crea el rol `ANALISTA` y el permiso `travel_expenses:view_assigned_requests`.

| Rol       | Permiso                                 | Descripción                                                      |
| --------- | --------------------------------------- | ---------------------------------------------------------------- |
| `ANALISTA` | `travel_expenses:view_assigned_requests` | Ver las solicitudes de comisión asignadas al analista autenticado. |

---

## 4. Backend

### 4.1 API Contract

Base path: `/api/v1/assignments`

| Método | Endpoint       | Permiso                          | Descripción                                                |
| ------ | -------------- | -------------------------------- | ---------------------------------------------------------- |
| `GET`  | `/workload`    | `travel_expenses:read_inbox`     | Obtiene el tablero de carga de todos los analistas.        |
| `POST` | `/assign`      | `travel_expenses:assign_analyst` | Asigna una solicitud a un analista y transiciona a `EN_VERIFICACION`. |
| `GET`  | `/my-requests` | `travel_expenses:view_assigned_requests` | Obtiene las solicitudes asignadas al analista autenticado. |

#### `GET /workload`

**Response 200:**
```json
{
  "data": [
    {
      "usuarioId": "uuid",
      "nombreCompleto": "Ana Gómez",
      "username": "ana.gomez",
      "asignacionesActivas": 2,
      "altas": 1,
      "medias": 1,
      "bajas": 0,
      "puntajeTotal": 5,
      "colorSemaforo": "VERDE"
    }
  ],
  "total": 1,
  "timestamp": "2026-09-07T14:00:00.000Z"
}
```

#### `POST /assign`

**Request:**
```json
{
  "solicitudId": "uuid",
  "analistaId": "uuid"
}
```

**Response 200:**
```json
{
  "success": true,
  "message": "Solicitud asignada exitosamente.",
  "data": {
    "solicitudId": "uuid",
    "estadoSolicitud": "EN_VERIFICACION",
    "analistaAsignadoId": "uuid",
    "historialId": "uuid"
  }
}
```

**Errores:**
- `400`: Solicitud no está en `SOLICITADO` o analista no existe/no está activo.
- `404`: Solicitud no encontrada.
- `401`: No autenticado.

#### `GET /my-requests`

**Response 200:**
```json
{
  "data": [
    {
      "id": "uuid",
      "consecutivoUnico": "COM-2026-0001",
      "estadoSolicitud": "EN_VERIFICACION",
      "analistaAsignadoId": "uuid",
      "comisionado": {
        "primerNombre": "Juan",
        "primerApellido": "Pérez"
      },
      "destinoCiudad": "Bogotá",
      "destinoDepartamento": "Cundinamarca",
      "fechaInicio": "2026-09-10",
      "fechaFin": "2026-09-15"
    }
  ],
  "total": 1,
  "timestamp": "2026-09-07T14:00:00.000Z"
}
```

### 4.2 Entidades

- [`UsuarioEntity`](../../backend/travel-expenses-service/src/entities/usuario.entity.ts): Mapea `auth.user` para consulta de analistas.
- [`SolicitudComisionEntity`](../../backend/travel-expenses-service/src/entities/solicitud-comision.entity.ts): Ahora incluye relación `analistaAsignado` y columna `analistaAsignadoId`.
- [`SolicitudHistorialEstadoEntity`](../../backend/travel-expenses-service/src/entities/solicitud-historial-estado.entity.ts): Registra la transición de estado.

### 4.3 Servicio

[`AssignmentsService`](../../backend/travel-expenses-service/src/modules/assignments/assignments.service.ts) expone:

- `obtenerCargaAnalistas()`: Calcula carga ponderada por analista.
- `asignarAnalista(solicitudId, analistaId, secretarioId)`: Asigna transaccionalmente.

### 4.4 Controlador

[`AssignmentsController`](../../backend/travel-expenses-service/src/modules/assignments/assignments.controller.ts) bajo tag Swagger `assignments`.

### 4.5 Módulo

[`AssignmentsModule`](../../backend/travel-expenses-service/src/modules/assignments/assignments.module.ts) registrado en [`TravelExpensesModule`](../../backend/travel-expenses-service/src/modules/travel-expenses/travel-expenses.module.ts).

---

## 5. Frontend

### 5.1 Componente

[`TableroCargaAnalistas`](../../apps/mfe-viaticos/src/components/TableroCargaAnalistas.tsx)

**Props:**
- `analistaSeleccionadoId: string | null`
- `onSeleccionarAnalista: (analistaId: string) => void`
- `analistaAsignadoId?: string | null`

**Características:**
- Indicador de carga mientras se consulta el API.
- Lista de analistas con semáforo visual (VERDE/AMARILLO/ROJO).
- Tooltip de detalle de carga por analista (desglose por prioridad).
- Búsqueda por nombre o usuario.
- Integrado en [`ViaticosModulePremium`](../../apps/mfe-viaticos/src/components/ViaticosModulePremium.tsx) en la sección "Asignar Solicitud".

### 5.2 Servicio frontend

[`viaticosService`](../../apps/mfe-viaticos/src/services/api/viaticosService.ts) actualizado con:
- `obtenerCargaAnalistas()`: `GET /api/v1/assignments/workload`
- `asignarAnalista(body)`: `POST /api/v1/assignments/assign`

### 5.3 Tipos

[`types/viaticos.ts`](../../apps/mfe-viaticos/src/types/viaticos.ts) incluye:
- `CargaAnalista`
- `ColorSemaforoAnalista` (`'VERDE' | 'AMARILLO' | 'ROJO'`)
- `SolicitudListaResponse` (reutilizado para `obtenerSolicitudesAsignadas`)

---

## 6. Pruebas

### Backend

**Archivo:** [`assignments.service.spec.ts`](../../backend/travel-expenses-service/src/modules/assignments/__tests__/assignments.service.spec.ts)

| Test | Resultado |
| ---- | --------- |
| Servicio definido | PASS |
| Obtener carga analistas | PASS |
| Semáforo VERDE sin asignaciones | PASS |
| Semáforo ROJO con puntaje > 12 | PASS |
| Asignar solicitud y transicionar a EN_VERIFICACION | PASS |
| Error 400 si solicitud no está en SOLICITADO | PASS |
| Error 404 si solicitud no existe | PASS |
| Error 400 si analista no existe/no activo | PASS |

### Frontend

**Archivo:** [`TableroCargaAnalistas.test.tsx`](../../apps/mfe-viaticos/src/components/TableroCargaAnalistas.test.tsx)

| Test | Resultado |
| ---- | --------- |
| Mostrar estado de carga | PASS |
| Renderizar lista de analistas | PASS |
| Filtrar analistas por búsqueda | PASS |

---

## 7. Despliegue

1. Ejecutar migración `021_permiso_asignacion_analistas.sql` en la base de datos `travel_expenses` (requiere esquema `auth`).
2. Ejecutar migración `022_ajustes_modulo_viaticos.sql` en la base de datos `travel_expenses`.
3. Ejecutar migración `023_analistas_viaticos.sql` en la base de datos `travel_expenses`.
4. Ejecutar migración `024_rol_analista_permisos.sql` en la base de datos `travel_expenses` (requiere esquema `auth`).
5. Verificar que el rol `SECRETARIO` exista en `auth.role` y que el permiso `travel_expenses:assign_analyst` esté vinculado.
6. Verificar que el rol `ANALISTA` exista en `auth.role` y que el permiso `travel_expenses:view_assigned_requests` esté vinculado.
7. Asegurar que el bypass de `SUPER_ADMIN` esté activo en [`permissions.guard.ts`](../../backend/travel-expenses-service/src/common/permissions.guard.ts).
8. Reiniciar el servicio backend de `auth-service` para cargar la sincronización automática de analistas.
9. Reiniciar el servicio backend de `travel-expenses-service` para cargar el nuevo módulo `AssignmentsModule`.
10. El frontend consume los nuevos endpoints automáticamente a través de `viaticosService`.
