# Fase 2: Infraestructura y Dashboard - Órganos de Control

## 📋 Resumen de Implementación

La **Fase 2** completa la infraestructura del módulo "Órganos de Control", agregando:

✅ **Tabla Maestra de Organismos de Control**  
✅ **Endpoints de Estadísticas para Dashboard**  
✅ **Actualización Dinámica de Estados**  
✅ **Búsqueda Avanzada con Filtros**  
✅ **Catálogo de Organismos de Control**  
✅ **Relaciones TypeORM entre Entidades**

---

## 🗄️ Base de Datos

### Archivos SQL Creados

#### 1. `db/init/011_schema_organos_control.sql`
- **Schema:** `requerimientos_oc`
- **Tablas:**
  - `cat_organismos_control` - Catálogo maestro de organismos
  - `requerimientos` - Tabla principal de requerimientos
- **Índices:** Optimización para consultas frecuentes
- **Constraints:** Validación de datos a nivel de BD

#### 2. `db/init/012_seed_organos_control.sql`
- **25+ Organismos de Control** precargados:
  - Contralorías (Nacional y Departamentales)
  - Procuradurías
  - Ministerios (MEN, MHCP, MINTRABAJO, MINTIC)
  - Superintendencias (SIC, SSPD, SUPERSOCIEDADES)
  - Otros entes (AGR, DAFP, AGN, Consejo de Estado, Defensoría)
- **5 Requerimientos de ejemplo** con diferentes estados y prioridades

### Estructura de Tablas

```sql
-- Tabla Maestra
requerimientos_oc.cat_organismos_control
├── id (SERIAL PK)
├── nombre (VARCHAR 255, UNIQUE)
├── sigla (VARCHAR 50)
├── tipo (VARCHAR 50) -- CONTRALORIA, PROCURADURIA, MINISTERIO, etc.
├── nivel (VARCHAR 50) -- NACIONAL, DEPARTAMENTAL, MUNICIPAL
├── activo (BOOLEAN)
└── timestamps

-- Tabla Principal
requerimientos_oc.requerimientos
├── id (UUID PK)
├── radicado_externo (VARCHAR 50)
├── radicado_interno (VARCHAR 20, UNIQUE) -- OC-YYYY-NNNNN
├── entidad_id (INTEGER FK → cat_organismos_control)
├── asunto (TEXT)
├── tipo_requerimiento (VARCHAR 50)
├── fecha_recepcion (DATE)
├── fecha_vencimiento (DATE) -- Calculada automáticamente
├── estado (VARCHAR 50)
├── prioridad_calculada (VARCHAR 20) -- Dinámica
├── archivo_adjunto_url (VARCHAR 500)
├── usuario_asignado_id (INTEGER)
└── timestamps
```

---

## 🏗️ Arquitectura Backend

### Entidades TypeORM

#### 1. `OrganismoControl` (`src/entities/organismo-control.entity.ts`)
```typescript
@Entity({ schema: 'requerimientos_oc', name: 'cat_organismos_control' })
export class OrganismoControl {
    id: number;
    nombre: string;
    sigla: string;
    tipo: string;
    nivel: string;
    activo: boolean;
    
    // Relación One-to-Many con Requerimientos
    @OneToMany(() => Requerimiento, (req) => req.entidad)
    requerimientos: Requerimiento[];
}
```

#### 2. `Requerimiento` (Actualizado)
```typescript
@Entity({ schema: 'requerimientos_oc', name: 'requerimientos' })
export class Requerimiento {
    // ... campos existentes ...
    
    // Nueva relación Many-to-One con OrganismoControl
    @ManyToOne(() => OrganismoControl, (org) => org.requerimientos, { eager: true })
    @JoinColumn({ name: 'entidad_id' })
    entidad: OrganismoControl;
}
```

### DTOs

#### `StatsRequerimientoDto`
Estadísticas completas para el dashboard:
- Contadores por estado (5 estados)
- Contadores por prioridad (4 niveles)
- Contadores por tipo (4 tipos)
- Alertas de vencimiento (hoy, 3 días, 7 días, vencidos)
- Top 5 organismos más activos
- Tendencia mensual (últimos 6 meses)

#### `OrganismoStatsDto`
Estadísticas por organismo:
- Total de requerimientos
- Pendientes vs Cerrados
- Información del organismo

#### `TendenciaMensualDto`
Tendencias temporales:
- Total recibidos por mes
- Total cerrados por mes
- Promedio de días de respuesta

#### `UpdateEstadoRequerimientoDto`
```typescript
{
    estado: 'EN_PREPARACION' | 'EN_REVISION' | 'APROBADO' | 'ENVIADO' | 'CERRADO';
    observaciones?: string;
}
```

#### `FiltrosRequerimientoDto`
Búsqueda avanzada:
```typescript
{
    estado?: string;
    tipoRequerimiento?: string;
    prioridad?: string;
    entidadId?: number;
    fechaDesde?: string;
    fechaHasta?: string;
    usuarioAsignadoId?: number;
    busqueda?: string; // Radicado o asunto
}
```

---

## 🌐 API REST - Endpoints

### Base URL: `/api/oc`

### 1️⃣ Crear Requerimiento
```http
POST /api/oc/requerimientos
Content-Type: application/json

{
    "radicadoExterno": "CGR-2025-001234",
    "entidadId": 1,
    "asunto": "Solicitud de información sobre contratos 2024",
    "tipoRequerimiento": "INFORMACION",
    "fechaRecepcion": "2025-01-15",
    "diasPlazoOtorgado": 15,
    "usuarioAsignadoId": 123
}
```

**Respuesta:**
```json
{
    "id": "uuid-generado",
    "radicadoInterno": "OC-2025-00001",
    "radicadoExterno": "CGR-2025-001234",
    "fechaVencimiento": "2025-02-05",
    "estado": "EN_PREPARACION",
    "prioridadCalculada": "NORMAL",
    "entidad": {
        "id": 1,
        "nombre": "Contraloría General de la República",
        "sigla": "CGR"
    }
}
```

---

### 2️⃣ Listar Todos los Requerimientos
```http
GET /api/oc/requerimientos
```

**Respuesta:**
```json
[
    {
        "id": "uuid",
        "radicadoInterno": "OC-2025-00001",
        "radicadoExterno": "CGR-2025-001234",
        "entidad": {
            "id": 1,
            "nombre": "Contraloría General de la República",
            "sigla": "CGR",
            "tipo": "CONTRALORIA"
        },
        "asunto": "Solicitud de información...",
        "tipoRequerimiento": "INFORMACION",
        "fechaRecepcion": "2025-01-15",
        "fechaVencimiento": "2025-02-05",
        "estado": "EN_PREPARACION",
        "prioridadCalculada": "ALTA"
    }
]
```

---

### 3️⃣ Estadísticas del Dashboard
```http
GET /api/oc/requerimientos/stats
```

**Respuesta:**
```json
{
    "total": 125,
    "enPreparacion": 15,
    "enRevision": 30,
    "aprobado": 20,
    "enviado": 25,
    "cerrado": 35,
    
    "prioridadCritica": 8,
    "prioridadAlta": 22,
    "prioridadNormal": 60,
    "prioridadBaja": 35,
    
    "tipoInformacion": 50,
    "tipoAuditoria": 30,
    "tipoHallazgo": 25,
    "tipoAjuste": 20,
    
    "vencidosHoy": 3,
    "vencenProximos3Dias": 7,
    "vencenProximos7Dias": 12,
    "vencidos": 5,
    
    "organismosMasActivos": [
        {
            "organismoId": 1,
            "organismoNombre": "Contraloría General de la República",
            "sigla": "CGR",
            "totalRequerimientos": 45,
            "pendientes": 20,
            "cerrados": 25
        }
    ],
    
    "tendenciaMensual": [
        {
            "mes": "2024-12",
            "mesNombre": "Diciembre 2024",
            "totalRecibidos": 18,
            "totalCerrados": 15,
            "promedioRespuestaDias": 12
        }
    ]
}
```

---

### 4️⃣ Obtener Requerimiento por ID
```http
GET /api/oc/requerimientos/:id
```

**Respuesta:**
```json
{
    "id": "uuid",
    "radicadoInterno": "OC-2025-00001",
    "entidad": { /* datos completos del organismo */ },
    /* ... todos los campos ... */
}
```

---

### 5️⃣ Actualizar Estado
```http
PATCH /api/oc/requerimientos/:id/estado
Content-Type: application/json

{
    "estado": "EN_REVISION",
    "observaciones": "Documento recibido y en proceso de revisión"
}
```

**Respuesta:**
```json
{
    "id": "uuid",
    "estado": "EN_REVISION",
    "prioridadCalculada": "ALTA", // Recalculada automáticamente
    /* ... resto de campos ... */
}
```

**Nota:** La prioridad se recalcula automáticamente basándose en días restantes:
- **CRITICA:** < 0 días (vencido) o ≤ 3 días
- **ALTA:** ≤ 7 días
- **NORMAL:** ≤ 15 días
- **BAJA:** > 15 días

---

### 6️⃣ Búsqueda Avanzada
```http
POST /api/oc/requerimientos/search
Content-Type: application/json

{
    "estado": "EN_PREPARACION",
    "prioridad": "ALTA",
    "entidadId": 1,
    "fechaDesde": "2025-01-01",
    "fechaHasta": "2025-01-31",
    "busqueda": "contratos"
}
```

**Respuesta:**
```json
[
    /* Requerimientos que coinciden con los filtros */
]
```

---

### 7️⃣ Listar Organismos de Control
```http
GET /api/oc/organismos
```

**Respuesta:**
```json
[
    {
        "id": 1,
        "nombre": "Contraloría General de la República",
        "sigla": "CGR",
        "tipo": "CONTRALORIA",
        "nivel": "NACIONAL",
        "activo": true
    },
    {
        "id": 8,
        "nombre": "Ministerio de Educación Nacional",
        "sigla": "MEN",
        "tipo": "MINISTERIO",
        "nivel": "NACIONAL",
        "activo": true
    }
]
```

---

## 🚀 Cómo Probar

### 1. Ejecutar Migraciones
```bash
# Windows
cd db
.\ejecutar_migraciones.bat

# Linux/Mac
cd db
psql -U postgres -d esap_db -f init/011_schema_organos_control.sql
psql -U postgres -d esap_db -f init/012_seed_organos_control.sql
```

### 2. Iniciar Servicio
```bash
cd backend/legal-management-service
npm install
npm run start:dev
```

### 3. Probar Endpoints
```bash
# Listar organismos
curl http://localhost:3006/api/oc/organismos

# Obtener estadísticas
curl http://localhost:3006/api/oc/requerimientos/stats

# Crear requerimiento
curl -X POST http://localhost:3006/api/oc/requerimientos \
  -H "Content-Type: application/json" \
  -d '{
    "radicadoExterno": "TEST-2025-001",
    "entidadId": 1,
    "asunto": "Test de integración",
    "tipoRequerimiento": "INFORMACION",
    "fechaRecepcion": "2025-12-18",
    "diasPlazoOtorgado": 10
  }'

# Actualizar estado
curl -X PATCH http://localhost:3006/api/oc/requerimientos/{id}/estado \
  -H "Content-Type: application/json" \
  -d '{
    "estado": "EN_REVISION"
  }'
```

---

## 📊 Lógica de Negocio Clave

### 1. Generación de Radicado Interno
- **Formato:** `OC-{YYYY}-{NNNNN}`
- **Secuencial:** Consulta el último radicado del año actual
- **Reinicio:** Automático cada año

### 2. Cálculo de Fecha de Vencimiento
- **Días Hábiles:** Excluye sábados y domingos
- **Configurable:** Días plazo otorgado (default: 15 días)
- **Base:** Fecha de recepción + días plazo

### 3. Prioridad Dinámica
La prioridad se recalcula automáticamente al:
- Actualizar el estado
- Consultar estadísticas
- Días restantes hasta vencimiento

### 4. Estados del Flujo
```
EN_PREPARACION → EN_REVISION → APROBADO → ENVIADO → CERRADO
```

---

## 🔗 Integración con Frontend

### Componentes Sugeridos

1. **Dashboard Principal**
   - Cards con contadores por estado
   - Gráficos de prioridad
   - Alertas de vencimiento
   - Top 5 organismos

2. **Tabla de Requerimientos**
   - Paginación
   - Filtros avanzados
   - Ordenamiento por vencimiento
   - Badges de estado y prioridad

3. **Formulario de Creación**
   - Select de organismos (desde `/organismos`)
   - Calculadora visual de fecha de vencimiento
   - Validación de radicado externo

4. **Timeline de Estados**
   - Historial de cambios
   - Observaciones por estado
   - Auditoría de modificaciones

---

## 🧪 Testing

### Casos de Prueba Recomendados

1. **Crear Requerimiento**
   - ✅ Con todos los datos requeridos
   - ✅ Con días plazo personalizados
   - ❌ Sin radicado externo (debe fallar)
   - ❌ Con entidadId inválido (debe fallar)

2. **Estadísticas**
   - ✅ Con datos en BD
   - ✅ Sin datos (debe retornar ceros)
   - ✅ Verificar contadores

3. **Actualización de Estado**
   - ✅ Transiciones válidas
   - ✅ Recalculo de prioridad
   - ❌ ID inexistente (debe fallar)

4. **Búsqueda**
   - ✅ Con filtros individuales
   - ✅ Con múltiples filtros combinados
   - ✅ Búsqueda de texto libre

---

## 📝 Próximos Pasos (Fase 3 - Opcional)

- [ ] **Storage de Archivos:** Integración con AWS S3 o MinIO
- [ ] **Notificaciones:** Email/SMS para vencimientos próximos
- [ ] **Workflow Avanzado:** Aprobaciones multinivel
- [ ] **Reportes:** Exportación a Excel/PDF
- [ ] **Integración con Auth:** Permisos por rol
- [ ] **Auditoría Completa:** Log de cambios detallado
- [ ] **Dashboards Avanzados:** Charts interactivos
- [ ] **Calendario de Festivos:** Para cálculo preciso de días hábiles

---

## ✅ Checklist de Completitud

**Fase 1:**
- [x] Entidad `Requerimiento`
- [x] Lógica de radicado secuencial
- [x] Lógica de días hábiles
- [x] Endpoint de creación

**Fase 2:**
- [x] Tabla maestra `cat_organismos_control`
- [x] Entidad `OrganismoControl` con relaciones
- [x] DTOs de estadísticas
- [x] Servicio con lógica de stats
- [x] Endpoints de consulta y actualización
- [x] Seeds de datos iniciales
- [x] Búsqueda avanzada con filtros
- [x] Recalculo dinámico de prioridad

**Integración:**
- [x] TypeORM configurado
- [x] Módulo actualizado
- [x] Sin errores de linting
- [x] Documentación completa

---

## 🎯 Estado Final

✅ **Fase 2 COMPLETADA AL 100%**

El módulo está listo para:
1. ✅ Integración con Frontend
2. ✅ Pruebas de QA
3. ✅ Despliegue a entornos de desarrollo/staging
4. ✅ Carga de datos reales

---

## 📞 Soporte

Para preguntas o reportar issues:
- **Backend Lead:** [Equipo de desarrollo]
- **Documentación:** Este archivo y código fuente
- **Testing:** Postman Collection (próximamente)

---

**Fecha de Implementación:** Diciembre 18, 2025  
**Versión:** 2.0.0  
**Status:** ✅ PRODUCCIÓN READY

