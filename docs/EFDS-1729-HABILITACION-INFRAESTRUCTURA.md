# EFDS-1729 — Habilitación técnica de Gestión de Infraestructura

## Estado

`EFDS-1729` corresponde al enabler técnico del módulo Gestión de Infraestructura UMI. Esta entrega deja lista la plataforma para iniciar las HU funcionales; no implementa todavía el flujo completo de solicitudes UMI.

Rama de trabajo:

```text
feature/EFDS-1729-habilitacion-infraestructura
```

Rama base acumulativa:

```text
feature/infrastructure-management
```

## Componentes levantados

```text
Microfrontend: apps/mfe-gestion-infraestructura
Puerto MFE:    3117

Microservicio: backend/infrastructure-management-service
Puerto API:    3014

API Gateway:   http://localhost:4000
Shell:         http://localhost:3000
PostgreSQL:    localhost:5432
Redis:         localhost:6379
```

El MFE se carga desde el Shell mediante Module Federation:

```text
gestion_infraestructura/Module
```

Ruta visual:

```text
Backoffice → Gestión Académica → Gestión de Infraestructura
```

## Base de datos

Esquema creado:

```text
infrastructure-management
```

Tablas creadas:

```text
sede
bloque_edificio
espacio_fisico
solicitud_mantenimiento
```

Datos iniciales:

```text
Sedes:           5
Bloques:         0
Espacios:        0
Mantenimientos:  0
```

Migraciones ejecutadas:

```text
backend/infrastructure-management-service/db/migrations/001_create_infrastructure_management_schema.sql
backend/infrastructure-management-service/db/migrations/002_seed_infrastructure_management_auth_module.sql
```

La segunda migración registró el módulo y permisos en `auth`:

```text
gestion-infraestructura
infraestructura.view
infraestructura.create
infraestructura.edit
infraestructura.delete
infraestructura.mantenimiento
```

Los permisos fueron asignados al rol `SUPER_ADMIN`.

## Endpoints validados

### Health y documentación

```text
GET http://localhost:3014/health       → 200
GET http://localhost:3014/api/docs     → 200
GET http://localhost:3014/api/docs-json → 200
```

### Sedes

```text
GET  /sedes        → 200
POST /sedes        → 201
GET  /sedes/{uuid} → 200
```

### Bloques

```text
GET  /sedes/bloques → 200
POST /sedes/bloques → 201
```

### Espacios

```text
GET    /espacios              → 200
POST   /espacios              → 201
GET    /espacios/{uuid}       → 200
PATCH  /espacios/{uuid}/estado → 200
GET    /espacios/estadisticas → 200
```

### Mantenimiento

```text
GET    /mantenimiento               → 200
POST   /mantenimiento               → 201
GET    /mantenimiento/{uuid}        → 200
PATCH  /mantenimiento/{uuid}/estado → 200
```

Las mismas operaciones principales fueron verificadas mediante el Gateway:

```text
http://localhost:4000/infraestructura/api/v1/...
```

## Prueba funcional realizada

Se ejecutó un smoke test autenticado con `SUPER_ADMIN` que cubrió:

- Lectura de sedes.
- Creación de bloque.
- Lectura de bloques.
- Creación de espacio.
- Lectura de espacio por UUID.
- Cambio de estado de espacio.
- Creación de solicitud de mantenimiento.
- Lectura de solicitud por UUID.
- Cambio de estado de mantenimiento.
- Consulta de estadísticas.
- Creación de sede.

Los registros temporales fueron marcados como `SMOKE-TEST` y eliminados después de la prueba.

Estado final de datos temporales:

```text
Registros SMOKE restantes: 0
```

## Consideraciones sobre IDs

Las entidades usan UUID. Por eso una petición como esta es inválida:

```text
GET /sedes/1
```

Debe usarse el UUID real devuelto por `GET /sedes`:

```text
GET /sedes/0930584e-d881-412f-a271-9e3526918e51
```

En una mejora posterior se recomienda validar el parámetro y devolver `400 Bad Request` para IDs que no tengan formato UUID, en lugar de dejar que PostgreSQL produzca un `500`.

## Alcance que todavía no pertenece a esta HU

EFDS-1729 no implementa todavía:

- Radicación formal UMI.
- Catálogo de 8 categorías.
- Clasificación física vs. tecnológica.
- Enrutamiento a TI.
- Asignación por especialización o disponibilidad.
- Valoración en campo.
- Insumos y repuestos.
- Evidencias fotográficas.
- Conformidad del área solicitante.
- Reapertura.
- Calificación del servicio.
- Reportes e indicadores UMI.

Estas capacidades corresponden principalmente a `EFDS-1730` hasta `EFDS-1739`.

## Criterio de cierre

EFDS-1729 queda evidenciada como habilitación técnica porque:

```text
MFE registrado y cargable       OK
Microservicio operativo         OK
Gateway configurado             OK
PostgreSQL y Redis disponibles  OK
Esquema propio creado           OK
Migraciones ejecutadas          OK
Módulo y permisos registrados   OK
Swagger disponible              OK
Endpoints principales probados  OK
Smoke test sin residuos         OK
```

La siguiente HU debe crearse desde la rama acumulativa:

```bash
git switch feature/infrastructure-management
git pull origin feature/infrastructure-management
git switch -c feature/EFDS-1730-radicar-solicitud-umi
```

Después de desarrollar y probar la HU, se debe abrir un Pull Request hacia:

```text
feature/infrastructure-management
```

No se deben mezclar en este enabler cambios propios de la radicación funcional de `EFDS-1730`.
