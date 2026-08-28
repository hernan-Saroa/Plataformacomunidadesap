# Plan de Pruebas — Módulo de Viáticos y Gastos de Viaje

> **Estado:** Ejecutado — 41/41 pruebas en verde
> **Frontend:** 27 pruebas (Vitest) · **Backend:** 14 pruebas (Jest)
> **Última ejecución:** 2026-08-28

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

| #   | Caso                          | Resultado esperado                                                           |
| --- | ----------------------------- | ---------------------------------------------------------------------------- |
| F01 | Render del módulo             | Título "VIÁTICOS Y GASTOS DE VIAJE" y descripción visibles                   |
| F02 | Resumen estadístico al cargar | KPI total = 1; se invocan `obtenerSolicitudes` y `obtenerResumenEstadistico` |
| F03 | Tabla de solicitudes          | Código, nombre, ciudad destino visibles                                      |
| F04 | Búsqueda por funcionario      | Coincidencias filtradas correctamente                                        |
| F05 | Búsqueda sin coincidencias    | Se muestra mensaje de vacío                                                  |
| F06 | Filtro por estado             | Se ocultan las filas no coincidentes                                         |
| F07 | Apertura del modal            | Título y "Paso 1 de 3" visibles                                              |
| F08 | Consulta de comisionado       | `consultarComisionado('1019283746')` llamado; nombre mostrado                |
| F09 | Comisionado no encontrado     | Mensaje de error claro                                                       |
| F10 | Habeas Data sin autorización  | Se muestra el modal "Autorización de Tratamiento de Datos"                   |
| F11 | Aceptación de Habeas Data     | Se cierra el modal y habilita "Siguiente"                                    |
| F12 | Avance al paso 2 (autorizado) | "Paso 2 de 3" y "Objeto y Destino de la Comisión"                            |
| F13 | Regreso con "Atrás"           | Vuelve a "Paso 1 de 3"                                                       |
| F14 | Normalización de tildes       | `Comisión de gestión` → `Comision de gestion`                                |
| F15 | Eliminación de especiales     | `A@B#C$D%` → `ABCD`                                                          |
| F16 | Fecha fin anterior a inicio   | Error "Debe ser posterior o igual a fecha inicio"                            |
| F17 | Fechas ausentes               | Error "Debe indicar las fechas de inicio y fin"                              |
| F18 | Envío exitoso                 | `crearSolicitudComision` invocado                                            |
| F19 | Payload alineado al DTO       | Payload camelCase con montos y días correctos                                |
| F20 | Reinicio del formulario       | Al reabrir, el documento está vacío                                          |
| F21 | Cierre del modal              | El modal desaparece al cancelar                                              |
| F22 | Detalle de solicitud          | Se muestra "Ver Detalle" con justificación                                   |
| F23 | Navegación de secciones       | Sección "Reserva y Emisión de Pasajes" al navegar                            |
| F24 | Aviso SIIF en la descripción  | Se muestra la restricción SIIF                                               |
| F25 | Documento solo números        | `abc101928` → `101928`                                                       |
| F26 | Ciudades en cascada           | Departamento habilita y filtra las ciudades                                  |
| F27 | Monetarios y numéricos        | Viáticos se formatean `$560.000`; días rechaza texto                         |

---

## 3. Casos de prueba — Backend

Suites:

- [`travel-expenses.service.spec.ts`](../../backend/travel-expenses-service/src/modules/travel-expenses/__tests__/travel-expenses.service.spec.ts)
- [`app.controller.spec.ts`](../../backend/travel-expenses-service/src/app.controller.spec.ts)

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

---

## 4. Resultado de la última ejecución

```
Frontend (Vitest)
  Test Files  1 passed (1)
  Tests       27 passed (27)

Backend (Jest)
  Test Suites 2 passed (2)
  Tests       14 passed (14)
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
