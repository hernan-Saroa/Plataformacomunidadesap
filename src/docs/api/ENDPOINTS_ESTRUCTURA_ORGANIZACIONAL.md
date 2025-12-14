# API Endpoints - Estructura Organizacional ESAP

## 📋 Descripción General

Sistema completo de gestión de estructura territorial jerárquica de ESAP. Permite administrar sedes, territoriales, centros regionales y puntos de atención, así como la asignación de usuarios a múltiples unidades organizacionales.

**Versión**: 1.0.0  
**Base URL**: `/api/estructura-organizacional`  
**Autenticación**: Bearer Token (JWT)

---

## 🏢 Gestión de Unidades Organizacionales

### 1. Listar Unidades (con paginación y filtros)

```http
GET /api/estructura-organizacional/unidades
```

**Query Parameters:**
```typescript
{
  busqueda?: string;              // Búsqueda por código o nombre
  nivel?: NivelEstructura;        // Filtrar por nivel jerárquico
  estado?: EstadoEstructura;      // Filtrar por estado
  padreId?: string;               // Filtrar por unidad padre
  departamento?: string;
  ciudad?: string;
  page?: number;                  // Default: 1
  pageSize?: number;              // Default: 20
  sortBy?: string;                // 'nombre' | 'codigo' | 'nivel' | 'createdAt'
  sortOrder?: 'asc' | 'desc';     // Default: 'asc'
}
```

**Response:**
```typescript
{
  success: true,
  data: UnidadOrganizacional[],
  pagination: {
    page: 1,
    pageSize: 20,
    totalPages: 5,
    totalItems: 87,
    hasNext: true,
    hasPrev: false
  },
  timestamp: "2024-11-30T15:30:00Z"
}
```

---

### 2. Obtener Unidad por ID

```http
GET /api/estructura-organizacional/unidades/:id
```

**Response:**
```typescript
{
  success: true,
  data: {
    id: "1",
    codigo: "SEDE-NAL",
    nombre: "Sede Nacional",
    nombreCorto: "Nacional",
    nivel: "nacional",
    padreId: null,
    ruta: ["1"],
    rutaNombres: ["Sede Nacional"],
    departamento: "Cundinamarca",
    ciudad: "Bogotá D.C.",
    direccion: "Calle 44 No. 53-37",
    telefono: "+57 (1) 220 5555",
    email: "nacional@esap.edu.co",
    capacidadEstudiantes: 10000,
    capacidadDocentes: 500,
    estado: "activa",
    permiteInscripciones: true,
    permiteMatriculas: true,
    visiblePortal: true,
    descripcion: "Sede principal...",
    createdAt: "2020-01-15T08:00:00Z",
    updatedAt: "2024-11-30T10:30:00Z",
    createdBy: "admin"
  },
  timestamp: "2024-11-30T15:30:00Z"
}
```

---

### 3. Crear Unidad Organizacional

```http
POST /api/estructura-organizacional/unidades
```

**Request Body:**
```typescript
{
  codigo: "DIR-CAU",              // REQUIRED - Código único
  nombre: "Dirección Territorial Cauca",  // REQUIRED
  nombreCorto: "Cauca",
  nivel: "territorial",           // REQUIRED
  padreId: "1",                   // REQUIRED (null para Nacional)
  
  departamento: "Cauca",
  ciudad: "Popayán",
  direccion: "Calle 5 No. 4-70",
  telefono: "+57 (2) 824 5555",
  email: "cauca@esap.edu.co",
  
  capacidadEstudiantes: 1500,
  capacidadDocentes: 80,
  
  estado: "activa",               // Default: "activa"
  fechaApertura: "2024-02-01",
  
  permiteInscripciones: true,     // Default: true
  permiteMatriculas: true,        // Default: true
  visiblePortal: true,            // Default: true
  
  descripcion: "Dirección territorial...",
  observaciones: "Notas internas..."
}
```

**Response:**
```typescript
{
  success: true,
  data: UnidadOrganizacional,
  message: "Unidad organizacional creada exitosamente",
  timestamp: "2024-11-30T15:30:00Z"
}
```

**Validaciones:**
- `codigo` debe ser único en el sistema
- `padreId` debe existir (excepto para nivel "nacional")
- `nivel` debe ser coherente con jerarquía (nacional > territorial > regional > punto_atencion)
- Si `padreId` es null, `nivel` debe ser "nacional" y solo puede haber una unidad nacional

---

### 4. Actualizar Unidad Organizacional

```http
PUT /api/estructura-organizacional/unidades/:id
PATCH /api/estructura-organizacional/unidades/:id
```

**Request Body:**
```typescript
{
  nombre?: "Nuevo nombre",
  nombreCorto?: "Nuevo corto",
  departamento?: string,
  ciudad?: string,
  direccion?: string,
  telefono?: string,
  email?: string,
  capacidadEstudiantes?: number,
  capacidadDocentes?: number,
  estado?: EstadoEstructura,
  fechaApertura?: string,
  fechaCierre?: string,
  permiteInscripciones?: boolean,
  permiteMatriculas?: boolean,
  visiblePortal?: boolean,
  descripcion?: string,
  observaciones?: string
}
```

**Nota:** No se puede cambiar `codigo`, `nivel` ni `padreId` después de creación.

---

### 5. Eliminar Unidad Organizacional

```http
DELETE /api/estructura-organizacional/unidades/:id
```

**Validaciones:**
- No se puede eliminar si tiene unidades subordinadas (hijos)
- No se puede eliminar si tiene usuarios asignados
- No se puede eliminar la sede nacional

**Response:**
```typescript
{
  success: true,
  message: "Unidad organizacional eliminada exitosamente",
  timestamp: "2024-11-30T15:30:00Z"
}
```

---

### 6. Obtener Árbol Jerárquico Completo

```http
GET /api/estructura-organizacional/arbol
```

**Query Parameters:**
```typescript
{
  raiz?: string;                  // ID de la raíz (default: sede nacional)
  incluirEstadisticas?: boolean;  // Incluir estadísticas de cada unidad
  maxDepth?: number;              // Profundidad máxima del árbol
}
```

**Response:**
```typescript
{
  success: true,
  data: ArbolEstructura[],
  timestamp: "2024-11-30T15:30:00Z"
}

// ArbolEstructura
{
  unidad: UnidadOrganizacional,
  hijos: ArbolEstructura[],
  estadisticas?: EstadisticasUnidad,
  nivel: 0  // Nivel de profundidad
}
```

---

### 7. Obtener Estadísticas de Unidad

```http
GET /api/estructura-organizacional/unidades/:id/estadisticas
```

**Response:**
```typescript
{
  success: true,
  data: {
    unidadId: "2",
    unidadNombre: "Dirección Territorial Bogotá",
    nivel: "territorial",
    
    totalUsuarios: 150,
    usuariosActivos: 145,
    usuariosPorRol: {
      "admin": 5,
      "docente": 80,
      "estudiante": 50,
      "administrativo": 15
    },
    
    totalEstudiantes: 3500,
    estudiantesActivos: 3200,
    capacidadEstudiantes: 5000,
    porcentajeOcupacion: 64,
    
    totalDocentes: 180,
    docentesActivos: 175,
    capacidadDocentes: 200,
    
    totalSubordinados: 3,
    subordinadosPorNivel: {
      "regional": 2,
      "punto_atencion": 1
    },
    
    ultimaActividad: "2024-11-30T14:20:00Z",
    actividadReciente: {
      mes: 11,
      usuarios: 145,
      estudiantes: 3200
    }
  },
  timestamp: "2024-11-30T15:30:00Z"
}
```

---

## 👥 Asignación de Usuarios a Sedes

### 8. Asignar Usuario a Sede

```http
POST /api/estructura-organizacional/asignaciones
```

**Request Body:**
```typescript
{
  usuarioId: "user123",           // REQUIRED
  unidadId: "2",                  // REQUIRED
  rolId?: "role456",              // Rol específico en esta sede
  ambitoAcceso: "territorial",    // REQUIRED
  esPrincipal: false,             // Default: false
  fechaInicio: "2024-01-01",      // Default: hoy
  fechaFin?: "2024-12-31",        // Opcional
  observaciones?: "Notas..."
}
```

**Response:**
```typescript
{
  success: true,
  data: UsuarioEstructura,
  message: "Usuario asignado a sede exitosamente",
  timestamp: "2024-11-30T15:30:00Z"
}
```

**Validaciones:**
- `usuarioId` debe existir
- `unidadId` debe existir y estar activa
- No puede haber asignación duplicada (mismo usuario + unidad)
- Solo puede haber una sede marcada como principal por usuario

---

### 9. Listar Asignaciones de Usuario

```http
GET /api/estructura-organizacional/usuarios/:usuarioId/asignaciones
```

**Query Parameters:**
```typescript
{
  estado?: 'activa' | 'inactiva';
  soloActivas?: boolean;          // Default: true
}
```

**Response:**
```typescript
{
  success: true,
  data: UsuarioEstructura[],
  timestamp: "2024-11-30T15:30:00Z"
}
```

---

### 10. Listar Usuarios de Sede

```http
GET /api/estructura-organizacional/unidades/:unidadId/usuarios
```

**Query Parameters:**
```typescript
{
  incluirSubordinados?: boolean;  // Incluir usuarios de sedes subordinadas
  estado?: 'activa' | 'inactiva';
  page?: number;
  pageSize?: number;
}
```

**Response:**
```typescript
{
  success: true,
  data: UsuarioConEstructura[],
  pagination: {...},
  timestamp: "2024-11-30T15:30:00Z"
}
```

---

### 11. Actualizar Asignación

```http
PUT /api/estructura-organizacional/asignaciones/:id
```

**Request Body:**
```typescript
{
  rolId?: string,
  ambitoAcceso?: AmbitoAcceso,
  esPrincipal?: boolean,
  estado?: 'activa' | 'inactiva',
  fechaFin?: string,
  observaciones?: string
}
```

---

### 12. Eliminar Asignación

```http
DELETE /api/estructura-organizacional/asignaciones/:id
```

**Validaciones:**
- Si es la única asignación del usuario, debe rechazarse
- Si es la sede principal, debe primero asignarse otra como principal

---

### 13. Cambiar Sede Principal de Usuario

```http
POST /api/estructura-organizacional/usuarios/:usuarioId/sede-principal
```

**Request Body:**
```typescript
{
  unidadId: "3"  // Debe ser una sede ya asignada al usuario
}
```

---

## 📊 Reportes y Analytics

### 14. Dashboard de Estructura Organizacional

```http
GET /api/estructura-organizacional/dashboard
```

**Response:**
```typescript
{
  success: true,
  data: {
    totalUnidades: 87,
    unidadesPorNivel: {
      "nacional": 1,
      "territorial": 12,
      "regional": 45,
      "punto_atencion": 29
    },
    unidadesPorEstado: {
      "activa": 85,
      "inactiva": 2
    },
    
    totalUsuariosAsignados: 5420,
    usuariosConMultiplesSedes: 230,
    
    capacidadTotal: {
      estudiantes: 45000,
      docentes: 2500,
      ocupacionEstudiantes: 68,
      ocupacionDocentes: 82
    },
    
    coberturaGeografica: {
      departamentos: 32,
      ciudades: 87
    },
    
    actividadReciente: [...],
    
    alertas: [
      {
        tipo: "capacidad",
        unidadId: "5",
        unidadNombre: "DIR-VAL",
        mensaje: "Capacidad de estudiantes al 95%",
        severidad: "warning"
      }
    ]
  },
  timestamp: "2024-11-30T15:30:00Z"
}
```

---

### 15. Exportar Estructura

```http
GET /api/estructura-organizacional/export
```

**Query Parameters:**
```typescript
{
  formato: 'excel' | 'csv' | 'json';  // REQUIRED
  incluirEstadisticas?: boolean;
  incluirAsignaciones?: boolean;
}
```

**Response:** Archivo descargable

---

### 16. Importar Estructura (Carga Masiva)

```http
POST /api/estructura-organizacional/import
Content-Type: multipart/form-data
```

**Request Body:**
```typescript
{
  file: File  // Excel o CSV con estructura predefinida
}
```

**Response:**
```typescript
{
  success: true,
  data: {
    procesadas: 50,
    exitosas: 48,
    fallidas: 2,
    errores: [
      {
        fila: 15,
        error: "Código duplicado: DIR-BOG",
        datos: {...}
      }
    ]
  },
  timestamp: "2024-11-30T15:30:00Z"
}
```

---

## 🔍 Búsqueda y Filtros Avanzados

### 17. Búsqueda Global de Unidades

```http
GET /api/estructura-organizacional/buscar
```

**Query Parameters:**
```typescript
{
  q: string;                      // REQUIRED - Término de búsqueda
  campos?: string[];              // Campos a buscar ['nombre', 'codigo', 'ciudad']
  limite?: number;                // Default: 10
}
```

---

### 18. Validar Código de Unidad

```http
GET /api/estructura-organizacional/validar-codigo/:codigo
```

**Response:**
```typescript
{
  success: true,
  data: {
    disponible: true,
    sugerencias: ["DIR-CAU-001", "DIR-CAU-02"]
  }
}
```

---

## 📝 Auditoría y Logs

### 19. Log de Cambios de Estructura

```http
GET /api/estructura-organizacional/logs
```

**Query Parameters:**
```typescript
{
  unidadId?: string;
  accion?: AccionEstructura;
  usuarioId?: string;
  fechaDesde?: string;
  fechaHasta?: string;
  page?: number;
  pageSize?: number;
}
```

**Response:**
```typescript
{
  success: true,
  data: LogEstructura[],
  pagination: {...}
}
```

---

## 🔒 Permisos Requeridos

### Por Endpoint

| Endpoint | Permiso Requerido | Descripción |
|----------|-------------------|-------------|
| GET /unidades | `estructura.view` | Ver unidades |
| POST /unidades | `estructura.create` | Crear unidades |
| PUT /unidades/:id | `estructura.edit` | Editar unidades |
| DELETE /unidades/:id | `estructura.delete` | Eliminar unidades |
| POST /asignaciones | `estructura.asignar_usuarios` | Asignar usuarios |
| GET /dashboard | `estructura.dashboard` | Ver dashboard |
| GET /export | `estructura.export` | Exportar datos |
| POST /import | `estructura.import` | Importar masivo |

---

## 🚨 Códigos de Error

| Código | Mensaje | Descripción |
|--------|---------|-------------|
| 400 | `CODIGO_DUPLICADO` | El código de unidad ya existe |
| 400 | `PADRE_INVALIDO` | La unidad padre no existe o es inválida |
| 400 | `NIVEL_INVALIDO` | El nivel no es coherente con la jerarquía |
| 400 | `ASIGNACION_DUPLICADA` | El usuario ya está asignado a esta sede |
| 403 | `SIN_PERMISO_SEDE` | No tiene permiso para esta sede |
| 404 | `UNIDAD_NO_ENCONTRADA` | La unidad no existe |
| 409 | `TIENE_SUBORDINADOS` | No se puede eliminar, tiene unidades subordinadas |
| 409 | `TIENE_USUARIOS` | No se puede eliminar, tiene usuarios asignados |

---

## 📚 Ejemplos de Uso

### Crear estructura completa (Nacional → Territorial → Regional)

```javascript
// 1. Crear Sede Nacional
const nacional = await fetch('/api/estructura-organizacional/unidades', {
  method: 'POST',
  body: JSON.stringify({
    codigo: 'SEDE-NAL',
    nombre: 'Sede Nacional',
    nivel: 'nacional',
    padreId: null,
    ciudad: 'Bogotá D.C.'
  })
});

// 2. Crear Territorial
const territorial = await fetch('/api/estructura-organizacional/unidades', {
  method: 'POST',
  body: JSON.stringify({
    codigo: 'DIR-BOG',
    nombre: 'Dirección Territorial Bogotá',
    nivel: 'territorial',
    padreId: nacional.data.id,
    ciudad: 'Bogotá D.C.'
  })
});

// 3. Crear Regional
const regional = await fetch('/api/estructura-organizacional/unidades', {
  method: 'POST',
  body: JSON.stringify({
    codigo: 'CRE-SUBA',
    nombre: 'Centro Regional Suba',
    nivel: 'regional',
    padreId: territorial.data.id,
    ciudad: 'Bogotá D.C.'
  })
});
```

### Asignar usuario a múltiples sedes

```javascript
// Asignar a Sede Nacional (principal)
await fetch('/api/estructura-organizacional/asignaciones', {
  method: 'POST',
  body: JSON.stringify({
    usuarioId: 'user123',
    unidadId: nacional.data.id,
    ambitoAcceso: 'nacional',
    esPrincipal: true
  })
});

// Asignar a Territorial Bogotá
await fetch('/api/estructura-organizacional/asignaciones', {
  method: 'POST',
  body: JSON.stringify({
    usuarioId: 'user123',
    unidadId: territorial.data.id,
    ambitoAcceso: 'territorial',
    esPrincipal: false
  })
});
```

---

## 🔄 Webhooks (Opcional)

Eventos que pueden disparar webhooks:

- `unidad.creada`
- `unidad.actualizada`
- `unidad.eliminada`
- `asignacion.creada`
- `asignacion.actualizada`
- `sede_principal.cambiada`

---

## 📋 Notas de Implementación

1. **Caché**: Implementar caché para árbol jerárquico (actualizar al modificar unidades)
2. **Transacciones**: Usar transacciones DB para operaciones de asignación múltiple
3. **Validación en Cascada**: Al cambiar estado de unidad, validar impacto en subordinados
4. **Soft Delete**: Implementar eliminación lógica para mantener historial
5. **Indexación**: Índices en `codigo`, `nivel`, `padreId` para optimizar consultas
