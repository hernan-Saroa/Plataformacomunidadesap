# Módulos ESAP - Control Interno

Esta carpeta contiene todos los microservicios específicos para el módulo de Control Interno de ESAP.

## Estructura

```
esap/
├── plan-anual-5-roles/     # Plan Anual basado en 5 roles (Decreto 648)
├── auditorias/              # Gestión de auditorías con fases
├── hallazgos/               # Gestión de hallazgos (mejorado)
├── planes-mejoramiento/     # Planes de mejoramiento con seguimiento
├── aprobaciones/            # Sistema de aprobaciones centralizado
├── listas-chequeo/          # Listas de chequeo con versionamiento
├── informes-ley/            # Informes de ley con entregas
├── documentos-reportes/     # Documentos y generación de reportes
├── configuracion/           # Configuración del sistema
└── etapas-auditoria/        # Etapas de auditoría (mejorado)
```

## Base de Datos

Todos los módulos están completamente integrados con PostgreSQL. El schema se encuentra en:
- `schema.sql` (schema base)
- `schema-esap.sql` (extensiones ESAP)

## Características

- ✅ Todo en base de datos (sin mock data)
- ✅ TypeORM entities
- ✅ DTOs con validación
- ✅ Controllers RESTful
- ✅ Services con lógica de negocio
- ✅ Relaciones entre entidades
- ✅ Índices optimizados

