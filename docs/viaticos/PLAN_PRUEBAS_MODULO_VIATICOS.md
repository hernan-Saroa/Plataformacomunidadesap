# Plan de Pruebas — Módulo de Viáticos y Gastos de Viaje

> **Estado:** Parcial — 45/45 pruebas frontend en verde; backend ampliado con suite RF-REC-002
> **Frontend:** 29 pruebas (Vitest) · **Backend:** 16 pruebas base (Jest) + 20 pruebas RF-REC-002 (Jest)
> **Última ejecución:** 2026-09-07

---

## 1. Cómo ejecutar

### Frontend (MFE `mfe-viaticos`)

```bash
cd apps/mfe-viaticos
npm run test:run              # ejecución única
npm run test:coverage         # con cobertura (v8)
```

### Backend (`travel-expenses-service`)

```bash
cd backend/travel-expenses-service
npm install                   # primera vez (proyecto npm independiente)
npm test
```

---

## 2. Casos de prueba — Frontend

Suite: [`ViaticosModulePremium.test.tsx`](../../apps/mfe-viaticos/src/components/ViaticosModulePremium.test.tsx)

| #   | Caso                           | Resultado esperado                                                                                                                                                                               |
| --- | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| F01 | Render del módulo              | Título "VIÁTICOS Y GASTOS DE VIAJE" y descripción visibles                                                                                                                                       |
| F02 | Resumen estadístico al cargar  | KPI total = 1; se invocan `obtenerSolicitudes` y `obtenerResumenEstadistico`                                                                                                                     |
| F03 | Tabla de solicitudes           | Código, nombre, ciudad destino visibles                                                                                                                                                          |
| F04 | Búsqueda por funcionario       | Coincidencias filtradas correctamente                                                                                                                                                            |
| F05 | Búsqueda sin coincidencias     | Se muestra mensaje de vacío                                                                                                                                                                      |
| F06 | Filtro por estado              | Se ocultan las filas no coincidentes                                                                                                                                                             |
| F07 | Apertura del modal             | Título y "Paso 1 de 3" visibles                                                                                                                                                                  |
| F08 | Consulta de comisionado        | `consultarComisionado('1019283746')` llamado; nombre mostrado                                                                                                                                    |
| F09 | Comisionado no encontrado      | Mensaje de error claro                                                                                                                                                                           |
| F10 | Habeas Data sin autorización   | Se muestra el modal "Autorización de Tratamiento de Datos"                                                                                                                                       |
| F11 | Aceptación de Habeas Data      | Se cierra el modal y habilita "Siguiente"                                                                                                                                                        |
| F12 | Avance al paso 2 (autorizado)  | "Paso 2 de 3" y "Objeto y Destino de la Comisión"                                                                                                                                                |
| F13 | Regreso con "Atrás"            | Vuelve a "Paso 1 de 3"                                                                                                                                                                           |
| F14 | Normalización de tildes        | `Comisión de gestión` → `Comision de gestion`                                                                                                                                                    |
| F15 | Eliminación de especiales      | `A@B#C$D%` → `ABCD`                                                                                                                                                                              |
| F16 | Fecha fin anterior a inicio    | Error "Debe ser posterior o igual a fecha inicio"                                                                                                                                                |
| F17 | Fechas ausentes                | Error "Debe indicar las fechas de inicio y fin"                                                                                                                                                  |
| F18 | Envío exitoso                  | `crearSolicitudComision` invocado                                                                                                                                                                |
| F19 | Payload alineado al DTO        | Payload camelCase con montos y días correctos                                                                                                                                                    |
| F20 | Reinicio del formulario        | Al reabrir, el documento está vacío                                                                                                                                                              |
| F21 | Cierre del modal               | El modal desaparece al cancelar                                                                                                                                                                  |
| F22 | Detalle de solicitud           | Se muestra "Ver Detalle" con justificación                                                                                                                                                       |
| F23 | Navegación de secciones        | Sección "Reserva y Emisión de Pasajes" al navegar                                                                                                                                                |
| F24 | Aviso SIIF en la descripción   | Se muestra la restricción SIIF                                                                                                                                                                   |
| F25 | Documento solo números         | `abc101928` → `101928`                                                                                                                                                                           |
| F26 | Geopolítica desde auth-service | Departamentos/ciudades se consultan de `auth.geopolitica`; las ciudades se traen por `codDepartamento` (código DANE, p. ej. Risaralda = 66), no por `idGeopolitica` (catálogo local de respaldo) |
| F27 | Monetarios y numéricos         | Viáticos se formatean `$560.000`; días rechaza texto                                                                                                                                             |
| F28 | Fecha anterior a hoy           | Error "La fecha de inicio no puede ser anterior a hoy"                                                                                                                                           |
| F29 | Comisión extemporánea          | Aviso "Comisión Extemporánea" (< 14 días hábiles de anticipación)                                                                                                                                |

### 2.1 Casos RF-REC-002

Suites:

- [`TableroCargaAnalistas.test.tsx`](../../apps/mfe-viaticos/src/components/TableroCargaAnalistas.test.tsx)
- [`SolicitudesAsignadasAnalista.test.tsx`](../../apps/mfe-viaticos/src/components/SolicitudesAsignadasAnalista.test.tsx)
- [`viaticosService.test.ts`](../../apps/mfe-viaticos/src/services/api/viaticosService.test.ts)

| #   | Caso                                             | Resultado esperado                                                                                                                                                                                                 |
| --- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| F30 | `TableroCargaAnalistas` muestra loading           | Estado de carga visible                                                                                                                                                                                            |
| F31 | `TableroCargaAnalistas` renderiza lista           | Analistas con semáforo, nombre y tooltip visibles                                                                                                                                                                  |
| F32 | `TableroCargaAnalistas` filtra por búsqueda       | Coincidencias por nombre, username o identificación                                                                                                                                                                |
| F33 | `SolicitudesAsignadasAnalista` muestra loading    | Estado de carga visible                                                                                                                                                                                            |
| F34 | `SolicitudesAsignadasAnalista` mensaje vacío      | Texto "No hay solicitudes asignadas."                                                                                                                                                                              |
| F35 | `SolicitudesAsignadasAnalista` renderiza lista    | Tabla con estado, comisionado, destino y fechas visibles                                                                                                                                                           |
| F36 | `SolicitudesAsignadasAnalista` filtra por búsqueda | Coincidencias por texto                                                                                                                                                                                            |
| F37 | `viaticosService.obtenerCargaAnalistas` sin ID    | GET a `/viaticos/api/v1/assignments/workload`                                                                                                                                                                      |
| F38 | `viaticosService.obtenerCargaAnalistas` con ID    | GET a `/viaticos/api/v1/assignments/workload?solicitudId=...`                                                                                                                                                      |
| F39 | `viaticosService.obtenerCargaAnalistas` error     | Retorna `{ data: [], total: 0 }`                                                                                                                                                                                   |
| F40 | `viaticosService.asignarAnalista` exitoso         | POST a `/viaticos/api/v1/assignments/assign` con body correcto                                                                                                                                                     |
| F41 | `viaticosService.asignarAnalista` error           | Propaga el error                                                                                                                                                                                                   |
| F42 | `viaticosService.obtenerSolicitudesAsignadas`     | GET a `/viaticos/api/v1/assignments/my-requests`                                                                                                                                                                   |
| F43 | `viaticosService.obtenerSolicitudesAsignadas` error | Retorna `[]`                                                                                                                                                                                                       |

---

## 3. Casos de prueba — Backend

Suites base:

- [`travel-expenses.service.spec.ts`](../../backend/travel-expenses-service/src/modules/travel-expenses/__tests__/travel-expenses.service.spec.ts)
- [`app.controller.spec.ts`](../../backend/travel-expenses-service/src/app.controller.spec.ts)

### 3.1 Casos base

| #   | Caso                                             | Resultado esperado                         |
| --- | ------------------------------------------------ | ------------------------------------------ |
| B01 | `consultarComisionado` con documento existente   | Retorna el comisionado                     |
| B02 | `consultarComisionado` con documento inexistente | Retorna `null`                             |
| B03 | `crearSolicitud` con comisionado inexistente     | `400 BadRequest`                           |
| B04 | `crearSolicitud` sin aceptación de Habeas Data   | `400 BadRequest`                           |
| B05 | `crearSolicitud` con aceptación de Habeas Data   | Guarda la autorización (IP incluida)       |
| B06 | `crearSolicitud` con solapamiento de fechas      | `409 Conflict`                             |
| B07 | `crearSolicitud` exitosa                         | Consecutivo único `COM-2026-XXXX` generado |
| B08 | `crearSolicitud` con fecha fin anterior a inicio | `400 BadRequest`                           |
| B09 | `subirDocumento` con solicitud inexistente       | `400 BadRequest`                           |
| B10 | `subirDocumento` exitoso                         | Documento guardado                         |
| B11 | `AppController.getHello()`                       | Mensaje de estado del microservicio        |
| B12 | `AppController` (suite)                          | Compila y ejecuta correctamente            |
| B13 | `obtenerSolicitudes` con datos                   | Retorna lista con datos del comisionado    |
| B14 | `obtenerSolicitudes` sin datos                   | Retorna `[]`                               |
| B15 | Fecha de inicio anterior a hoy                   | `400 BadRequest`                           |
| B16 | Anticipación < 14 días hábiles                   | Solicitud marcada `EXTEMPORANEA`           |

### 3.2 Casos RF-REC-002

Suites:

- [`assignments.service.spec.ts`](../../backend/travel-expenses-service/src/modules/assignments/__tests__/assignments.service.spec.ts)
- [`assignments.controller.spec.ts`](../../backend/travel-expenses-service/src/modules/assignments/__tests__/assignments.controller.spec.ts)
- [`assignments.module.spec.ts`](../../backend/travel-expenses-service/src/modules/assignments/__tests__/assignments.module.spec.ts)
- [`travel-expenses.assignments.spec.ts`](../../backend/travel-expenses-service/src/modules/travel-expenses/__tests__/travel-expenses.assignments.spec.ts)

| #   | Caso                                             | Resultado esperado                                                                 |
| --- | ------------------------------------------------ | ---------------------------------------------------------------------------------- |
| A01 | `obtenerCargaAnalistas` sin `solicitudId`         | Retorna todos los analistas con puntaje y color del semáforo                       |
| A02 | `obtenerCargaAnalistas` con `solicitudId`         | Filtra analistas por la dependencia de la solicitud                                |
| A03 | Semáforo VERDE sin asignaciones                   | `puntajeTotal = 0`, `colorSemaforo = VERDE`                                        |
| A04 | Semáforo ROJO con puntaje > 12                    | `puntajeTotal = 15`, `colorSemaforo = ROJO`                                        |
| A05 | `asignarAnalista` exitoso                         | Transición a `EN_VERIFICACION`, guarda historial                                   |
| A06 | `asignarAnalista` 400 si solicitud no en `SOLICITADO` | `BadRequestException`                                                        |
| A07 | `asignarAnalista` 404 si solicitud no existe      | `NotFoundException`                                                                |
| A08 | `asignarAnalista` 400 si analista no existe       | `BadRequestException`                                                              |
| A09 | `obtenerSolicitudesAsignadas` por analista         | Retorna solicitudes en estados activos                                             |
| A10 | `obtenerSolicitudesAsignadas` 400 si `analistaId` vacío | `BadRequestException`                                                      |
| A11 | Controller `GET /workload` sin `solicitudId`       | 200, estructura `{ data, total, timestamp }`                                       |
| A12 | Controller `GET /workload` con `solicitudId`       | 200, llama al servicio con el filtro                                               |
| A13 | Controller `GET /my-requests`                      | 200, usa `req.user.userId`                                                         |
| A14 | Controller `GET /my-requests` sin usuario          | 400                                                                                |
| A15 | Controller `POST /assign`                          | 200, delega en servicio y arma respuesta                                           |
| A16 | Controller `POST /assign` body vacío               | 400                                                                                |
| A17 | Controller `POST /assign` sin usuario              | 400                                                                                |
| A18 | Módulo compila                                    | Sin errores                                                                        |
| A19 | Módulo exporta `AssignmentsService`                | Servicio disponible                                                                |
| A20 | Módulo registra `AssignmentsController`            | Controlador disponible                                                             |
| A21 | Integración `TravelExpensesModule` + `AssignmentsModule` | Ambos servicios y controladores disponibles                                   |

---

## 4. Resultado de la última ejecución

```
Frontend (Vitest)
  Test Files  1 passed (1)
  Tests       29 passed (29)

Backend (Jest)
  Test Suites 2 passed (2)
  Tests       16 passed (16)

Backend RF-REC-002 (Jest)
  Test Suites 2 passed (2)
  Tests       18 passed (18)

Frontend RF-REC-002 (Vitest)
  Test Files  1 passed (1)
  Tests       7 passed (7)
```

---

## 5. Notas

- **Contrato de API:** el frontend usa **camelCase** (idéntico al DTO backend
  `CreateSolicitudDto` y a la serialización de las entidades). Las rutas pasan
  por el API Gateway con el prefijo `/viaticos/api/v1/...`.
- **Sanitización / SIIF:** el frontend replica la política del backend
  ([`sanitize.util.ts`](../../backend/travel-expenses-service/src/common/sanitize.util.ts)):
  **normaliza las tildes conservando la letra base** (`gestión` → `gestion`),
  reemplaza `ñ` → `n`, elimina caracteres especiales y limita a 250 caracteres.
  Bajo el campo se muestra el aviso de restricción SIIF.
- **Selectores y campos:** departamento → ciudad en cascada; campos monetarios
  con formato `$`; campos numéricos que rechazan texto (`soloNumeros`).
- **Validación de fechas:** se valida tanto en el frontend (feedback inmediato)
  como en el backend (defensa en profundidad).
- **Habeas Data:** el flujo exige autorización previa (Ley 1581/2012, Sentencia
  T-254/2024) antes de permitir la radicación.
