# 📋 Resumen Módulos ESAP - Control Interno

## ✅ Estructura Creada

Se ha creado la carpeta `esap/` dentro de `internal-institutional-control-service` con todos los microservicios necesarios para el módulo de Control Interno de ESAP.

## 🗂️ Microservicios Implementados

### 1. ✅ Plan Anual 5 Roles (`plan-anual-5-roles/`)
**Ruta:** `/esap/plan-anual-5-roles`

**Entidades:**
- `PlanAnual5Roles` - Plan anual basado en 5 roles
- `RolPlanAnual5` - Los 5 roles del Decreto 648
- `ActividadPlanAnual5` - Actividades por rol

**Endpoints:**
- `GET /esap/plan-anual-5-roles` - Listar planes
- `GET /esap/plan-anual-5-roles/:id` - Obtener plan
- `GET /esap/plan-anual-5-roles/year/:year` - Buscar por año
- `POST /esap/plan-anual-5-roles` - Crear plan
- `GET /esap/plan-anual-5-roles/:planId/roles` - Obtener roles
- `POST /esap/plan-anual-5-roles/:rolId/actividades` - Agregar actividad
- `PUT /esap/plan-anual-5-roles/actividades/:actividadId` - Actualizar actividad
- `DELETE /esap/plan-anual-5-roles/actividades/:actividadId` - Eliminar actividad

**Características:**
- ✅ Cálculo automático de cumplimiento por rol y general
- ✅ 5 roles predefinidos del Decreto 648
- ✅ Estados: pendiente, en-progreso, completada, retrasada
- ✅ Prioridades: Alta, Media, Baja

---

### 2. ✅ Gestión de Auditorías (`auditorias/`)
**Ruta:** `/esap/auditorias`

**Entidades:**
- `AuditoriaGestion` - Auditorías con fases y seguimiento

**Endpoints:**
- `GET /esap/auditorias` - Listar auditorías (filtros: fase, tipo)
- `GET /esap/auditorias/:id` - Obtener auditoría
- `GET /esap/auditorias/codigo/:codigo` - Buscar por código
- `POST /esap/auditorias` - Crear auditoría
- `PUT /esap/auditorias/:id` - Actualizar auditoría
- `PUT /esap/auditorias/:id/progreso` - Actualizar progreso
- `PUT /esap/auditorias/:id/fase` - Cambiar fase
- `DELETE /esap/auditorias/:id` - Eliminar auditoría

**Características:**
- ✅ Generación automática de códigos (AUD-YYYY-XXX)
- ✅ Fases: planeacion, en-curso, revision, completada
- ✅ Seguimiento de progreso y hallazgos

---

### 3. ✅ Aprobaciones (`aprobaciones/`)
**Ruta:** `/esap/aprobaciones`

**Entidades:**
- `Aprobacion` - Solicitudes de aprobación
- `DocumentoAprobacion` - Documentos adjuntos

**Endpoints:**
- `GET /esap/aprobaciones` - Listar (filtros: estado, tipo)
- `GET /esap/aprobaciones/pendientes` - Solo pendientes
- `GET /esap/aprobaciones/:id` - Obtener aprobación
- `POST /esap/aprobaciones` - Crear solicitud
- `PUT /esap/aprobaciones/:id/aprobar` - Aprobar
- `PUT /esap/aprobaciones/:id/rechazar` - Rechazar

**Características:**
- ✅ Tipos: plan-auditoria, plan-mejora, informe, documento
- ✅ Prioridades: Alta, Media, Baja
- ✅ Estados: pendiente, aprobado, rechazado, en-revision
- ✅ Historial de aprobaciones/rechazos

---

### 4. ✅ Planes de Mejoramiento (`planes-mejoramiento/`)
**Ruta:** `/esap/planes-mejoramiento`

**Entidades:**
- `SeguimientoPlanMejoramiento` - Seguimientos trimestrales

**Endpoints:**
- `GET /esap/planes-mejoramiento` - Listar planes
- `GET /esap/planes-mejoramiento/:id` - Obtener plan
- `GET /esap/planes-mejoramiento/:id/seguimientos` - Obtener seguimientos
- `POST /esap/planes-mejoramiento/:id/seguimientos` - Crear seguimiento

**Características:**
- ✅ Seguimientos trimestrales automatizados
- ✅ Cálculo de cumplimiento y efectividad
- ✅ Próximo seguimiento calculado automáticamente

---

### 5. ✅ Listas de Chequeo (`listas-chequeo/`)
**Ruta:** `/esap/listas-chequeo`

**Entidades:**
- `VersionListaChequeo` - Historial de versiones
- `SeccionListaChequeo` - Secciones organizadas

**Endpoints:**
- `GET /esap/listas-chequeo` - Listar listas
- `GET /esap/listas-chequeo/:id` - Obtener lista
- `GET /esap/listas-chequeo/:id/versiones` - Historial de versiones
- `POST /esap/listas-chequeo/:id/versiones` - Crear nueva versión
- `GET /esap/listas-chequeo/:id/secciones` - Obtener secciones

**Características:**
- ✅ Control de versiones completo
- ✅ Secciones organizadas
- ✅ Historial de cambios con motivo

---

### 6. ✅ Informes de Ley (`informes-ley/`)
**Ruta:** `/esap/informes-ley`

**Entidades:**
- `EntregaInformeLey` - Entregas por periodo

**Endpoints:**
- `GET /esap/informes-ley` - Listar informes
- `GET /esap/informes-ley/:id` - Obtener informe
- `GET /esap/informes-ley/:id/entregas` - Obtener entregas
- `POST /esap/informes-ley/:id/entregas` - Crear entrega
- `PUT /esap/informes-ley/entregas/:id/registrar` - Registrar entrega

**Características:**
- ✅ Gestión de entregas por periodo
- ✅ Estados: pendiente, en-proceso, entregado, vencido, rechazado
- ✅ Seguimiento de radicados

---

## 🗄️ Base de Datos

### Schema SQL
- **Archivo base:** `schema.sql` (schema original)
- **Archivo ESAP:** `schema-esap.sql` (extensiones para módulos ESAP)

### Tablas Creadas/Modificadas

#### Nuevas Tablas:
1. `plan_anual_5_roles` - Plan anual con 5 roles
2. `rol_plan_anual_5` - Roles del plan
3. `actividad_plan_anual_5` - Actividades por rol
4. `auditoria_gestion` - Gestión de auditorías
5. `aprobacion` - Sistema de aprobaciones
6. `documento_aprobacion` - Documentos de aprobaciones
7. `seguimiento_plan_mejoramiento` - Seguimientos trimestrales
8. `version_lista_chequeo` - Versiones de listas
9. `seccion_lista_chequeo` - Secciones de listas
10. `entrega_informe_ley` - Entregas de informes

#### Tablas Modificadas:
- `hallazgo` - Agregados campos: titulo, gravedad, fecha_compromiso, progreso_cumplimiento
- `plan_mejoramiento` - Agregados campos: codigo_auditoria, porcentaje_efectividad, seguimientos_realizados, proximo_seguimiento
- `lista_chequeo` - Agregados campos: proceso, subproceso, categoria, normativa_aplicable, objetivo, version_base, permite_no_aplica, requiere_evidencias, genera_hallazgos_automaticos, auditoria_id, nombre_auditoria, auditor_responsable, fecha_aplicacion, fecha_diligenciamiento, items_completados, cumplimiento, no_cumplimientos, no_aplica, hallazgos_generados
- `item_lista_chequeo` - Agregados campos: seccion_id, es_critico, respuesta, observaciones, genera_hallazgo
- `informe_ley` - Agregados campos: codigo_corto, categoria, dia_presentacion, entidad_destino, area_responsable, tiene_plantilla, url_plantilla, requiere_aprobacion, dias_anticipacion_alerta, activo
- `etapa_auditoria` - Agregados campos: porcentaje_avance, fecha_limite
- `documento` - Agregado campo: tipo_reporte

#### Tablas Nuevas Adicionales:
- `actividad_etapa_auditoria` - Actividades dentro de etapas
- `plantilla_reporte` - Plantillas para generación de reportes

---

## 🚀 Instalación y Uso

### 1. Ejecutar Schema SQL

```bash
# Ejecutar schema base
psql -U postgres -d esap_db -f schema.sql

# Ejecutar extensiones ESAP
psql -U postgres -d esap_db -f schema-esap.sql
```

### 2. El módulo ya está integrado

El `EsapModule` ya está importado en `app.module.ts`, por lo que todos los endpoints están disponibles automáticamente.

### 3. Endpoints Base

Todos los endpoints ESAP están bajo el prefijo `/api/v1/esap/`:

```
http://localhost:3007/api/v1/esap/plan-anual-5-roles
http://localhost:3007/api/v1/esap/auditorias
http://localhost:3007/api/v1/esap/aprobaciones
http://localhost:3007/api/v1/esap/planes-mejoramiento
http://localhost:3007/api/v1/esap/listas-chequeo
http://localhost:3007/api/v1/esap/informes-ley
```

---

## 📊 Estado de Implementación

| Módulo | Entidades | DTOs | Controller | Service | Estado |
|--------|-----------|-----|------------|---------|--------|
| Plan Anual 5 Roles | ✅ | ✅ | ✅ | ✅ | ✅ Completo |
| Auditorías | ✅ | ✅ | ✅ | ✅ | ✅ Completo |
| Aprobaciones | ✅ | ✅ | ✅ | ✅ | ✅ Completo |
| Planes Mejoramiento | ✅ | ✅ | ✅ | ✅ | ✅ Completo |
| Listas Chequeo | ✅ | ✅ | ✅ | ✅ | ✅ Completo |
| Informes Ley | ✅ | ✅ | ✅ | ✅ | ✅ Completo |

---

## 🔗 Relaciones entre Entidades

```
PlanAnual5Roles
  └── RolPlanAnual5 (1:N)
      └── ActividadPlanAnual5 (1:N)

AuditoriaGestion
  └── AuditoriaProgramada (N:1, opcional)

Aprobacion
  └── DocumentoAprobacion (1:N)
      └── Documento (N:1, opcional)

PlanMejoramiento
  └── SeguimientoPlanMejoramiento (1:N)

ListaChequeo
  ├── VersionListaChequeo (1:N)
  ├── SeccionListaChequeo (1:N)
  │   └── ItemListaChequeo (1:N)
  └── ItemListaChequeo (1:N)

InformeLey
  └── EntregaInformeLey (1:N)
```

---

## ✅ Características Implementadas

- ✅ **Todo en Base de Datos** - Sin mock data, todo persiste
- ✅ **TypeORM Entities** - Entidades completas con relaciones
- ✅ **Validación de DTOs** - class-validator en todos los DTOs
- ✅ **Códigos Automáticos** - Generación automática de códigos
- ✅ **Cálculos Automáticos** - Cumplimiento, progreso, estadísticas
- ✅ **Índices Optimizados** - Índices en campos de búsqueda frecuente
- ✅ **Relaciones Foreign Keys** - Integridad referencial
- ✅ **Cascade Deletes** - Eliminación en cascada donde aplica
- ✅ **Timestamps** - created_at y updated_at automáticos

---

## 📝 Notas Importantes

1. **Schema SQL:** Ejecutar primero `schema.sql` y luego `schema-esap.sql`
2. **Migración:** Los servicios antiguos siguen funcionando, los nuevos están en `/esap/`
3. **Compatibilidad:** Las entidades nuevas extienden las existentes sin romper compatibilidad
4. **Endpoints:** Todos los endpoints ESAP están bajo `/api/v1/esap/`

---

## 🎯 Próximos Pasos

1. ✅ Ejecutar `schema-esap.sql` en la base de datos
2. ✅ Probar endpoints con Postman
3. ✅ Integrar con el frontend (ya está preparado)
4. ⏳ Agregar más validaciones si es necesario
5. ⏳ Implementar tests unitarios

---

**Fecha de Creación:** Enero 2025  
**Estado:** ✅ Todos los microservicios implementados y listos para usar

