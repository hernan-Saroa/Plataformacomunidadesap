# Módulo de Auditorías

Módulo completo para la gestión de auditorías del sistema ESAP, compatible con el frontend de gestión de auditorías (Kanban, Lista, Calendario).

## 📋 Descripción

Este módulo proporciona un CRUD completo para gestionar auditorías con las siguientes características:

- **Generación automática de códigos** en formato `AUD-YYYY-###`
- **Gestión de fases**: Planeación, En Curso, Revisión, Completada
- **Tipos de auditoría**: Gestión, Control Interno, Académica, RRHH, Financiera, TI, Cumplimiento, Operacional
- **Prioridades**: Alta, Media, Baja
- **Seguimiento de progreso** (0-100%)
- **Contador de hallazgos**
- **Filtros avanzados** por tipo, fase, prioridad, territorial, búsqueda, fechas

## 🗂️ Estructura

```
auditorias/
├── entities/
│   └── auditoria.entity.ts      # Entidad TypeORM
├── dto/
│   ├── create-auditoria.dto.ts   # DTO para crear
│   └── update-auditoria.dto.ts   # DTO para actualizar
├── auditorias.controller.ts      # Controlador REST
├── auditorias.service.ts         # Lógica de negocio
├── auditorias.module.ts          # Módulo NestJS
└── README.md                      # Esta documentación
```

## 🚀 Endpoints

### CRUD Básico

- `GET /esap/auditorias` - Obtener todas las auditorías (con filtros opcionales)
- `GET /esap/auditorias/:id` - Obtener una auditoría por ID
- `GET /esap/auditorias/codigo/:codigo` - Buscar por código
- `POST /esap/auditorias` - Crear nueva auditoría
- `PATCH /esap/auditorias/:id` - Actualizar auditoría
- `DELETE /esap/auditorias/:id` - Eliminar auditoría

### Endpoints Especiales

- `GET /esap/auditorias/estadisticas` - Obtener estadísticas generales
- `GET /esap/auditorias/fase/:fase` - Obtener auditorías por fase (útil para Kanban)
- `PATCH /esap/auditorias/:id/progreso` - Actualizar progreso (0-100)
- `PATCH /esap/auditorias/:id/fase` - Cambiar fase
- `POST /esap/auditorias/:id/hallazgos/incrementar` - Incrementar contador de hallazgos
- `POST /esap/auditorias/:id/hallazgos/decrementar` - Decrementar contador de hallazgos

## 📝 Ejemplos de Uso

### Crear una Auditoría

```json
POST /esap/auditorias
{
  "nombre": "Auditoría de Gestión Financiera",
  "tipo": "Gestión",
  "territorial": "Cundinamarca",
  "sede": "Bogotá - Sede Central",
  "responsable": "María González",
  "fechaInicio": "2024-11-15",
  "fechaFin": "2024-12-15",
  "prioridad": "Alta",
  "fase": "planeacion"
}
```

### Obtener Auditorías con Filtros

```
GET /esap/auditorias?fase=en-curso&prioridad=Alta&search=financiera
```

### Actualizar Progreso

```json
PATCH /esap/auditorias/{id}/progreso
{
  "progreso": 65
}
```

### Cambiar Fase

```json
PATCH /esap/auditorias/{id}/fase
{
  "fase": "en-curso"
}
```

## 📊 Modelo de Datos

### Auditoria Entity

```typescript
{
  id: string (UUID)
  codigo: string (AUD-YYYY-###) - Generado automáticamente
  nombre: string
  tipo: TipoAuditoria (enum)
  fase: FaseAuditoria (enum)
  territorial: string
  sede: string
  responsable: string
  fechaInicio: Date
  fechaFin: Date
  progreso: number (0-100)
  prioridad: PrioridadAuditoria (enum)
  hallazgos: number
  createdAt: Date
  updatedAt: Date
}
```

### Enums

**TipoAuditoria:**
- Gestión
- Control Interno
- Académica
- RRHH
- Financiera
- TI
- Cumplimiento
- Operacional

**FaseAuditoria:**
- `planeacion` - Planeación
- `en-curso` - En Curso
- `revision` - Revisión
- `completada` - Completada

**PrioridadAuditoria:**
- Alta
- Media
- Baja

## 🔍 Filtros Disponibles

- `tipo` - Filtrar por tipo de auditoría
- `fase` - Filtrar por fase
- `prioridad` - Filtrar por prioridad
- `territorial` - Filtrar por territorial
- `search` - Búsqueda en nombre, código o responsable
- `fechaDesde` - Fecha de inicio mínima
- `fechaHasta` - Fecha de fin máxima

## 📈 Estadísticas

El endpoint `/esap/auditorias/estadisticas` retorna:

```json
{
  "totalAuditorias": 10,
  "enCurso": 3,
  "completadas": 5,
  "hallazgosTotal": 12,
  "porFase": [
    { "fase": "planeacion", "cantidad": 2 },
    { "fase": "en-curso", "cantidad": 3 },
    { "fase": "revision", "cantidad": 1 },
    { "fase": "completada", "cantidad": 4 }
  ],
  "porTipo": [...],
  "porPrioridad": [...]
}
```

## 🗄️ Base de Datos

La tabla se crea automáticamente con TypeORM o puedes ejecutar el schema SQL:

```sql
CREATE TABLE control_interno.auditoria (
    id UUID PRIMARY KEY,
    codigo VARCHAR(255) UNIQUE NOT NULL,
    nombre VARCHAR(500) NOT NULL,
    tipo VARCHAR(50) NOT NULL,
    fase VARCHAR(50) NOT NULL,
    territorial VARCHAR(255) NOT NULL,
    sede VARCHAR(255) NOT NULL,
    responsable VARCHAR(255) NOT NULL,
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE NOT NULL,
    progreso INTEGER DEFAULT 0,
    prioridad VARCHAR(20) NOT NULL,
    hallazgos INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## ✅ Validaciones

- El código se genera automáticamente y es único
- La fecha de fin debe ser posterior a la fecha de inicio
- El progreso debe estar entre 0 y 100
- Los hallazgos no pueden ser negativos
- Al completar una auditoría (fase = completada), el progreso se establece automáticamente en 100%

## 🔗 Integración con Frontend

Este módulo está diseñado para trabajar directamente con el componente `GestionAuditorias.tsx` del frontend, proporcionando todos los endpoints necesarios para:

- Dashboard con métricas
- Vista Kanban por fases
- Vista de lista con filtros
- Vista de calendario (preparado)
- CRUD completo de auditorías












