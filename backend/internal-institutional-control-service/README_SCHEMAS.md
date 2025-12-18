# Schema de Base de Datos

## Schema Unificado

### `control_interno` (Schema Único)
**Archivo:** `schema.sql`

Contiene TODAS las tablas del sistema de control interno en un solo schema:
- Procesos auditables
- Auditorías programadas
- Hallazgos
- Planes de mejoramiento
- Listas de chequeo
- Informes de ley
- Documentos
- Notificaciones
- Configuración
- Plan Anual 5 Roles
- Aprobaciones
- Configuración ESAP
- Usuarios ESAP
- Sesiones
- Logs de auditoría
- Cache
- Plantillas de documentos
- Integraciones

**Ejecutar:**
```bash
psql -U postgres -d esap_db -f schema.sql
```

## Estructura del Schema

```
esap_db
└── control_interno (Schema único - todas las tablas)
    ├── proceso_auditable
    ├── auditoria_programada
    ├── auditoria
    ├── auditoria_gestion
    ├── hallazgo
    ├── plan_mejoramiento
    ├── seguimiento_plan_mejoramiento
    ├── accion_mejora
    ├── plan_individual
    ├── plan_anual
    ├── plan_anual_5_roles
    ├── rol_plan_anual_5
    ├── actividad_plan_anual_5
    ├── cronograma_auditoria
    ├── rol_plan_anual
    ├── lista_chequeo
    ├── version_lista_chequeo
    ├── seccion_lista_chequeo
    ├── item_lista_chequeo
    ├── lista_aplicada
    ├── etapa_auditoria
    ├── actividad_etapa_auditoria
    ├── documento
    ├── plantilla_reporte
    ├── notificacion
    ├── preferencia_notificacion
    ├── informe_ley
    ├── entrega_informe_ley
    ├── aprobacion
    ├── documento_aprobacion
    ├── rol_decreto_648
    ├── rol_decreto_648_template
    ├── actividad_rol
    ├── tipo_auditoria
    ├── parametro_sistema
    ├── plantilla_email
    ├── configuracion_esap
    ├── usuarios_esap
    ├── sesiones_esap
    ├── logs_auditoria_esap
    ├── cache_esap
    ├── plantillas_documentos_esap
    └── integraciones_esap
```

## Orden de Ejecución

1. **Primero:** Ejecutar `schema.sql` (schema completo unificado)
2. **Segundo:** Ejecutar `npm run seed` (datos iniciales)

## Comandos Completos

```bash
# 1. Crear base de datos
createdb -U postgres esap_db

# 2. Ejecutar schema unificado
psql -U postgres -d esap_db -f schema.sql

# 3. Ejecutar seed
cd backend/internal-institutional-control-service
npm run seed
```

