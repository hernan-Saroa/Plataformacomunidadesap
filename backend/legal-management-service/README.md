# Legal Management Service

<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

## 📋 Descripción

**Legal Management Service** es el microservicio encargado de la gestión jurídica de la ESAP, que incluye:

1. **Gestión de Expedientes Jurídicos** - Procesos judiciales (Civil, Penal, Administrativo, Laboral)
2. **Actuaciones Procesales** - Seguimiento de actuaciones en expedientes
3. **Calendario de Audiencias** - Gestión de calendario jurídico
4. **Abogados Sustanciadores** - Asignación y gestión de abogados
5. **Órganos de Control (Nuevo)** - Gestión de requerimientos de organismos de control

---

## 🏗️ Arquitectura

### Puerto del Servicio
- **Puerto:** `3006`
- **Base URL:** `http://localhost:3006`

### Tecnologías
- **Framework:** NestJS
- **ORM:** TypeORM
- **Base de Datos:** PostgreSQL
- **Schemas:**
  - `legal_management` - Expedientes y actuaciones
  - `requerimientos_oc` - Órganos de Control

---

## 🚀 Inicio Rápido

### 1. Instalación
```bash
npm install
```

### 2. Configuración de Base de Datos
Asegúrate de que PostgreSQL esté corriendo y ejecuta las migraciones:

```bash
# Windows
cd ../../db
.\ejecutar_migraciones.bat

# Linux/Mac
cd ../../db
psql -U postgres -d esap_db -f init/01_legal_schema_init.sql
psql -U postgres -d esap_db -f init/02_actuaciones_schema.sql
psql -U postgres -d esap_db -f init/04_abogados_calendario_schema.sql
psql -U postgres -d esap_db -f init/011_schema_organos_control.sql
psql -U postgres -d esap_db -f init/012_seed_organos_control.sql
```

### 3. Ejecutar el Servicio
```bash
# Modo desarrollo
npm run start:dev

# Modo producción
npm run start:prod
```

El servicio estará disponible en `http://localhost:3006`

---

## 📚 Módulos Implementados

### 1️⃣ Expedientes Jurídicos

#### Endpoints
- `GET /api/expedientes` - Listar expedientes
- `GET /api/expedientes/:id` - Obtener expediente por ID
- `POST /api/expedientes` - Crear nuevo expediente
- `PATCH /api/expedientes/:id` - Actualizar expediente
- `DELETE /api/expedientes/:id` - Eliminar expediente
- `GET /api/expedientes/:id/con-actuaciones` - Expediente con actuaciones

#### Entidad: `Expediente`
```typescript
{
  id: UUID
  radicado: string (23 caracteres)
  jurisdiccion: 'CIVIL' | 'PENAL' | 'ADMINISTRATIVO' | 'LABORAL'
  tipoProce: string
  demandante: string
  demandado: string (default: 'ESAP')
  estado: 'RADICADO' | 'EN_TRAMITE' | 'FALLO' | 'TRASLADO_DESCARGOS'
  fechaRadicacion: Date
  cuantia: number
  abogadoSustanciador: string
  fechaPrescripcion: Date
  riesgoPrescripcion: boolean
  terminoProcesalDias: number
  ultimaActuacion: string
  ubicacionFisica: string
}
```

---

### 2️⃣ Actuaciones Procesales

#### Endpoints
- `GET /api/actuaciones` - Listar actuaciones
- `GET /api/actuaciones/:id` - Obtener actuación por ID
- `POST /api/actuaciones` - Registrar nueva actuación
- `PATCH /api/actuaciones/:id` - Actualizar actuación
- `DELETE /api/actuaciones/:id` - Eliminar actuación

#### Entidad: `Actuacion`
```typescript
{
  id: UUID
  expedienteId: UUID (FK → Expediente)
  fechaActuacion: Date
  tipoActuacion: string
  descripcion: string
  documentoAdjunto: string
  proximaFecha: Date
}
```

---

### 3️⃣ Calendario de Audiencias

#### Endpoints
- `GET /api/audiencias` - Listar audiencias
- `GET /api/audiencias/:id` - Obtener audiencia por ID
- `POST /api/audiencias` - Programar nueva audiencia
- `PATCH /api/audiencias/:id` - Actualizar audiencia
- `DELETE /api/audiencias/:id` - Cancelar audiencia

#### Entidad: `Audiencia`
```typescript
{
  id: UUID
  expedienteId: UUID (FK → Expediente)
  fechaHora: Date
  tipo: 'CONCILIACION' | 'ALEGATOS' | 'PRUEBAS' | 'FALLO'
  ubicacion: string
  asistentes: string
  resultado: string
  observaciones: string
}
```

---

### 4️⃣ Abogados Sustanciadores

#### Endpoints
- `GET /api/abogados` - Listar abogados
- `GET /api/abogados/:id` - Obtener abogado por ID
- `POST /api/abogados` - Registrar nuevo abogado
- `PATCH /api/abogados/:id` - Actualizar abogado
- `DELETE /api/abogados/:id` - Eliminar abogado
- `GET /api/abogados/stats` - Estadísticas de abogados

#### Entidad: `Abogado`
```typescript
{
  id: UUID
  nombre: string
  cedula: string (unique)
  tarjetaProfesional: string (unique)
  especialidad: string
  telefono: string
  email: string
  activo: boolean
}
```

---

### 5️⃣ Órganos de Control ⭐ NUEVO

#### Endpoints Principales

##### Requerimientos
- `POST /api/oc/requerimientos` - Crear requerimiento
- `GET /api/oc/requerimientos` - Listar requerimientos
- `GET /api/oc/requerimientos/stats` - Estadísticas del dashboard
- `GET /api/oc/requerimientos/:id` - Obtener por ID
- `PATCH /api/oc/requerimientos/:id/estado` - Actualizar estado
- `POST /api/oc/requerimientos/search` - Búsqueda avanzada

##### Organismos
- `GET /api/oc/organismos` - Listar organismos de control

#### Entidad: `Requerimiento`
```typescript
{
  id: UUID
  radicadoExterno: string
  radicadoInterno: string (formato: OC-YYYY-NNNNN)
  entidadId: number (FK → OrganismoControl)
  entidad: OrganismoControl
  asunto: string
  tipoRequerimiento: 'INFORMACION' | 'AUDITORIA' | 'HALLAZGO' | 'AJUSTE'
  fechaRecepcion: Date
  fechaVencimiento: Date (calculada con días hábiles)
  estado: 'EN_PREPARACION' | 'EN_REVISION' | 'APROBADO' | 'ENVIADO' | 'CERRADO'
  prioridadCalculada: 'CRITICA' | 'ALTA' | 'NORMAL' | 'BAJA'
  archivoAdjuntoUrl: string
  usuarioAsignadoId: number
}
```

#### Entidad: `OrganismoControl`
```typescript
{
  id: number
  nombre: string
  sigla: string
  tipo: 'CONTRALORIA' | 'PROCURADURIA' | 'MINISTERIO' | 'SUPERINTENDENCIA' | 'OTROS'
  nivel: 'NACIONAL' | 'DEPARTAMENTAL' | 'MUNICIPAL'
  activo: boolean
}
```

#### 📊 Estadísticas del Dashboard

El endpoint `GET /api/oc/requerimientos/stats` retorna:
- Contadores por estado (5 estados)
- Contadores por prioridad (4 niveles)
- Contadores por tipo (4 tipos)
- Alertas de vencimiento (hoy, 3 días, 7 días, vencidos)
- Top 5 organismos más activos
- Tendencia mensual (últimos 6 meses con promedio de días de respuesta)

#### 🔍 Búsqueda Avanzada

Filtros disponibles:
- `estado` - Estado del requerimiento
- `tipoRequerimiento` - Tipo de requerimiento
- `prioridad` - Prioridad calculada
- `entidadId` - ID del organismo de control
- `fechaDesde` / `fechaHasta` - Rango de fechas
- `usuarioAsignadoId` - Usuario asignado
- `busqueda` - Búsqueda de texto libre (radicado o asunto)

---

## 🧪 Testing

### Usando Postman
Importa la colección: `Organos_Control_Postman_Collection.json`

Variables de entorno:
- `base_url`: `http://localhost:3006`
- `requerimiento_id`: (se llenará después de crear requerimientos)

### Ejemplos de Uso

#### Crear un Requerimiento
```bash
curl -X POST http://localhost:3006/api/oc/requerimientos \
  -H "Content-Type: application/json" \
  -d '{
    "radicadoExterno": "CGR-2025-001234",
    "entidadId": 1,
    "asunto": "Solicitud de información sobre contratos 2024",
    "tipoRequerimiento": "INFORMACION",
    "fechaRecepcion": "2025-01-15",
    "diasPlazoOtorgado": 15
  }'
```

#### Obtener Estadísticas
```bash
curl http://localhost:3006/api/oc/requerimientos/stats
```

#### Listar Organismos
```bash
curl http://localhost:3006/api/oc/organismos
```

#### Actualizar Estado
```bash
curl -X PATCH http://localhost:3006/api/oc/requerimientos/{id}/estado \
  -H "Content-Type: application/json" \
  -d '{
    "estado": "EN_REVISION"
  }'
```

---

## 📖 Documentación Extendida

### Módulo Órganos de Control
Para documentación completa de la Fase 2, ver:
- **[FASE2_INFRAESTRUCTURA_DASHBOARD.md](./FASE2_INFRAESTRUCTURA_DASHBOARD.md)** - Documentación técnica completa
- **[OrganosControl.md](./OrganosControl.md)** - Historia de Usuario y Fase 1

### Lógica de Negocio Clave

#### 1. Radicado Interno Secuencial
- **Formato:** `OC-YYYY-NNNNN`
- **Método:** `generarRadicadoInterno()`
- **Lógica:** Consulta el último radicado del año y genera el siguiente consecutivo

#### 2. Cálculo de Días Hábiles
- **Método:** `calcularVencimiento(fechaRecepcion, diasPlazo)`
- **Lógica:** Suma días hábiles excluyendo sábados y domingos
- **Base:** Fecha de recepción + días plazo otorgados

#### 3. Prioridad Dinámica
La prioridad se recalcula automáticamente basándose en días restantes:
- **CRITICA:** Vencido o ≤ 3 días
- **ALTA:** ≤ 7 días
- **NORMAL:** ≤ 15 días
- **BAJA:** > 15 días

---

## 🗂️ Estructura del Proyecto

```
legal-management-service/
├── src/
│   ├── controllers/
│   │   ├── expediente.controller.ts
│   │   ├── actuacion.controller.ts
│   │   ├── abogado.controller.ts
│   │   ├── audiencia.controller.ts
│   │   └── requerimiento.controller.ts ⭐
│   ├── entities/
│   │   ├── expediente.entity.ts
│   │   ├── actuacion.entity.ts
│   │   ├── abogado.entity.ts
│   │   ├── audiencia.entity.ts
│   │   ├── requerimiento.entity.ts ⭐
│   │   └── organismo-control.entity.ts ⭐
│   ├── services/
│   │   ├── expediente.service.ts
│   │   ├── actuacion.service.ts
│   │   ├── abogado.service.ts
│   │   ├── audiencia.service.ts
│   │   └── requerimiento.service.ts ⭐
│   ├── dtos/
│   │   ├── create-requerimiento.dto.ts ⭐
│   │   ├── stats-requerimiento.dto.ts ⭐
│   │   └── ...
│   ├── app.module.ts
│   ├── database.config.ts
│   └── main.ts
├── FASE2_INFRAESTRUCTURA_DASHBOARD.md ⭐
├── OrganosControl.md
├── Organos_Control_Postman_Collection.json ⭐
└── README.md (este archivo)
```

---

## 🔧 Configuración

### Variables de Entorno
```env
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=tu_password
DB_DATABASE=esap_db
PORT=3006
```

### Database Config (`src/database.config.ts`)
```typescript
export const databaseConfig: TypeOrmModuleOptions = {
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_DATABASE || 'esap_db',
  entities: [__dirname + '/**/*.entity{.ts,.js}'],
  synchronize: false, // ⚠️ Usar migraciones en producción
  logging: true
};
```

---

## 🐛 Debugging

### Logs de TypeORM
Para habilitar logs detallados de queries SQL:
```typescript
// database.config.ts
logging: ['query', 'error', 'schema']
```

### Verificar Conexión a BD
```bash
# Entrar a PostgreSQL
psql -U postgres -d esap_db

# Verificar schemas
\dn

# Verificar tablas
\dt legal_management.*
\dt requerimientos_oc.*

# Verificar datos
SELECT COUNT(*) FROM requerimientos_oc.requerimientos;
SELECT COUNT(*) FROM requerimientos_oc.cat_organismos_control;
```

---

## 📦 Dependencias Principales

```json
{
  "@nestjs/common": "^10.0.0",
  "@nestjs/core": "^10.0.0",
  "@nestjs/typeorm": "^10.0.0",
  "typeorm": "^0.3.17",
  "pg": "^8.11.3",
  "class-validator": "^0.14.0",
  "class-transformer": "^0.5.1"
}
```

---

## 🚀 Despliegue

### Docker
```bash
# Build
docker build -t esap-legal-management:latest .

# Run
docker run -p 3006:3006 \
  -e DB_HOST=postgres \
  -e DB_PORT=5432 \
  -e DB_USERNAME=postgres \
  -e DB_PASSWORD=password \
  -e DB_DATABASE=esap_db \
  esap-legal-management:latest
```

### Docker Compose
El servicio ya está incluido en `docker-compose.yml` del proyecto raíz.

---

## 📊 Estado del Proyecto

### Módulo Expedientes
- ✅ CRUD completo
- ✅ Relaciones con actuaciones
- ✅ Integración con abogados
- ✅ Calendario de audiencias

### Módulo Órganos de Control
- ✅ **Fase 1:** Core transaccional (Crear requerimientos)
- ✅ **Fase 2:** Infraestructura y Dashboard (Estadísticas, Búsqueda, Organismos)
- ⏳ **Fase 3 (Opcional):** Storage de archivos, Notificaciones, Reportes

---

## 🤝 Contribución

Para contribuir al proyecto:
1. Crear branch desde `develop`
2. Seguir convenciones de código (ESLint)
3. Agregar tests para nuevas funcionalidades
4. Crear Pull Request

---

## 📝 Licencia

Este proyecto es propiedad de la **Escuela Superior de Administración Pública (ESAP)**.

---

## 📞 Soporte

- **Email:** soporte@esap.edu.co
- **Documentación:** Ver archivos `.md` en este directorio
- **Issues:** Reportar en el sistema de gestión de proyectos

---

**Última actualización:** Diciembre 18, 2025  
**Versión:** 2.0.0  
**Mantenido por:** Equipo de Desarrollo Backend ESAP
