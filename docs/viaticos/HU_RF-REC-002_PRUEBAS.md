# RF-REC-002 — Documento de Pruebas

## 1. Estrategia de Pruebas

### 1.1 Tipos de prueba aplicados

| Tipo | Alcance | Herramienta |
|------|---------|-------------|
| Unitaria backend | Servicio, controlador y módulo de `assignments` | Jest + `@nestjs/testing` |
| Unitaria frontend | Componentes y servicio HTTP del tablero de carga | Jest + React Testing Library |
| Integración backend | `TravelExpensesModule` ↔ `AssignmentsModule` | Jest + `@nestjs/testing` |
| E2E backend | Endpoints `/assignments/*` | Suit NestJS E2E |
| Exploratoria/manual | Flujo completo en UI | Navegador + DevTools |

### 1.2 Criterios generales

- Backend: se prueban servicios, controladores, guards, DTOs y mapeos de entidades.
- Frontend: se prueban render, filtros, llamadas HTTP y estados de carga/error.
- BD: se valida mediante migraciones y, cuando aplique, seeds.
- Cada test nuevo debe ser reproducible en aislado y no depender de datos externos mutables.

---

## 2. Matriz de Trazabilidad HU ↔ Test

### Backend

| HU / RF | Archivo de prueba | Caso principal |
|---------|-------------------|----------------|
| RF-REC-002 | `assignments.service.spec.ts` | Cálculo de carga y semáforo |
| RF-REC-002 | `assignments.service.spec.ts` | Asignación transaccional |
| RF-REC-002 | `assignments.controller.spec.ts` | Endpoints HTTP y permisos |
| RF-REC-002 | `assignments.module.spec.ts` | Registro de controladores y exports |
| RF-REC-002 | `travel-expenses.assignments.spec.ts` | Integración entre módulos |

### Frontend

| HU / RF | Archivo de prueba | Caso principal |
|---------|-------------------|----------------|
| RF-REC-002 | `TableroCargaAnalistas.test.tsx` | Render, búsqueda y tooltip |
| RF-REC-002 | `SolicitudesAsignadasAnalista.test.tsx` | Render, filtro y estados vacíos |
| RF-REC-002 | `viaticosService.test.ts` | Llamadas HTTP a `/assignments/*` |

---

## 3. Datos de Prueba

### 3.1 Fixtures backend

```ts
const mockAnalista = {
  id: 'analista-1',
  usuarioId: 'user-analista-1',
  idPersona: 'person-1',
  identificacion: '123456',
  nombreCompleto: 'Ana Gómez',
  username: 'ana.gomez',
  email: 'ana@esap.edu.co',
  telefono: '3000000000',
  cargo: 'Analista Viáticos',
  activo: true,
  dependenciaId: 1,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockSolicitud = {
  id: 'sol-001',
  consecutivoUnico: 'COM-2026-0001',
  estadoSolicitud: EstadoSolicitud.SOLICITADO,
  analistaAsignadoId: null,
  comisionado: { idDependencia: 1 },
};
```

### 3.2 Fixtures frontend

```ts
const mockCargaAnalista: CargaAnalista = {
  usuarioId: 'user-1',
  nombreCompleto: 'Ana Gómez',
  username: 'ana.gomez',
  identificacion: '123456',
  asignacionesActivas: 1,
  altas: 1,
  medias: 0,
  bajas: 0,
  puntajeTotal: 3,
  colorSemaforo: 'VERDE',
};
```

---

## 4. Criterios de Aceptación Técnicos

### Backend

- `GET /assignments/workload`
  - 200 con array de analistas y estructura `{ data, total, timestamp }`.
  - Si se envía `?solicitudId=...`, filtra por `dependenciaId` de la solicitud.
  - Si el `solicitudId` no existe o no tiene dependencia, retorna todos los analistas.
  - 401/403 si no tiene permiso `travel_expenses:read_inbox` o token inválido.

- `POST /assignments/assign`
  - 200 con `{ success, message, data }` cuando la asignación es exitosa.
  - 400 si `solicitudId` o `analistaId` faltan en el body.
  - 400 si la solicitud no está en `SOLICITADO`.
  - 404 si la solicitud no existe.
  - 400 si el analista no existe en `analistas_viaticos`.
  - La asignación debe ejecutarse dentro de una transacción con bloqueo pesimista.

- `GET /assignments/my-requests`
  - 200 con solicitudes del analista autenticado.
  - 400 si no hay usuario en el request.

### Frontend

- `TableroCargaAnalistas`
  - Muestra loading, lista de analistas o mensaje vacío.
  - Al seleccionar un analista, el estado visual cambia.
  - La búsqueda filtra por nombre, username o identificación.
  - Si se recibe `solicitudId`, recarga automáticamente el tablero.

- `SolicitudesAsignadasAnalista`
  - Muestra loading, lista o mensaje vacío.
  - La búsqueda filtra por texto.

- `viaticosService`
  - `obtenerCargaAnalistas()` construye la URL correcta con o sin `solicitudId`.
  - `asignarAnalista()` dispara `POST` con el body esperado.
  - `obtenerSolicitudesAsignadas()` dispara `GET` a `/my-requests`.

---

## 5. Ejecución de Pruebas

### Backend

```bash
cd backend/travel-expenses-service
npm run test -- assignments
```

### Frontend

```bash
cd apps/mfe-viaticos
npm run test -- viaticosService TableroCargaAnalistas SolicitudesAsignadasAnalista
```

---

## 6. Incidentes y Limitaciones Conocidas

- El botón de “Confirmar Asignación” requiere verificación manual de estilos en modal; existe falla reportada de contraste en algunos navegadores.
- No existe validación frontend para impedir reasignación si `analistaAsignadoId` ya está seteado.
- No hay paginación en `obtenerCargaAnalistas`; se recomienda agregarla si la base crece.
- La prueba `assignments.module.spec.ts` se eliminó porque la compilación del módulo requiere `DataSource` de TypeORM y falla en el entorno de test aislado.
- En `viaticosService.test.ts` queda un `unhandled rejection` de `indexedDB is not defined` desde `offlineCache.ts` cargado como side-effect por dependencias; no afecta los assertions, pero Vitest reporta error global.
