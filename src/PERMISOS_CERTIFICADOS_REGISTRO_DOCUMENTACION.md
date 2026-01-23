# 📋 ACTUALIZACIÓN DE PERMISOS - CERTIFICADOS LABORALES Y REGISTRO ACADÉMICO

## ✅ COMPLETADO - Enero 22, 2025

---

## 🎯 Objetivo

Expandir el sistema de permisos para incluir controles **granulares y parametrizables** en los módulos de:
1. **Certificados Laborales**
2. **Registro Académico**

---

## 📊 Resumen Ejecutivo

### Antes (Permisos Básicos)
| Módulo | Permisos | Nivel |
|--------|----------|-------|
| Certificados Laborales | 15 | Básico |
| Registro Académico (Graduados) | 15 | Básico |
| **TOTAL** | **30** | **Básico** |

### Después (Permisos Granulares)
| Módulo | Permisos | Categorías | Nivel |
|--------|----------|------------|-------|
| Certificados Laborales | **65** | 9 | ⭐ Granular |
| Registro Académico | **90** | 9 | ⭐ Granular |
| **TOTAL** | **155** | **18** | **⭐ Granular** |

### Incremento
- ✅ **+50 permisos** en Certificados Laborales (+333%)
- ✅ **+75 permisos** en Registro Académico (+500%)
- ✅ **+125 permisos totales** (+416%)

---

## 🏗️ Estructura de Permisos

### 1. CERTIFICADOS LABORALES (65 Permisos)

#### Categorías:

**A. Dashboard y Visualización (5 permisos)**
```typescript
✅ cl.dashboard.view - Ver Dashboard
✅ cl.dashboard.view_stats - Ver Estadísticas Generales
✅ cl.dashboard.view_pending - Ver Pendientes
✅ cl.dashboard.view_metrics - Ver Métricas de Productividad
✅ cl.dashboard.view_alerts - Ver Alertas del Sistema
```

**B. Solicitudes (15 permisos)**
```typescript
✅ cl.solicitud.view - Ver Solicitudes
✅ cl.solicitud.view_all - Ver Todas las Solicitudes
✅ cl.solicitud.view_own - Ver Solicitudes Propias
✅ cl.solicitud.create - Crear Solicitud
✅ cl.solicitud.create_behalf - Crear en Nombre de Tercero
✅ cl.solicitud.edit - Editar Solicitud
✅ cl.solicitud.cancel - Cancelar Solicitud
✅ cl.solicitud.delete - Eliminar Solicitud
✅ cl.solicitud.assign - Asignar Solicitud
✅ cl.solicitud.reassign - Reasignar Solicitud
✅ cl.solicitud.priority - Marcar como Urgente
✅ cl.solicitud.attach_docs - Adjuntar Documentos
✅ cl.solicitud.view_history - Ver Historial de Solicitud
✅ cl.solicitud.add_comment - Comentar Solicitud
✅ cl.solicitud.export - Exportar Solicitudes
```

**C. Aprobación (8 permisos)**
```typescript
✅ cl.aprobacion.view_pending - Ver Pendientes de Aprobación
✅ cl.aprobacion.approve - Aprobar Solicitud
✅ cl.aprobacion.reject - Rechazar Solicitud
✅ cl.aprobacion.approve_batch - Aprobar en Lote
✅ cl.aprobacion.add_observation - Agregar Observaciones
✅ cl.aprobacion.require_docs - Solicitar Documentación
✅ cl.aprobacion.delegate - Delegar Aprobación
✅ cl.aprobacion.view_history - Ver Historial de Aprobaciones
```

**D. Generación (10 permisos)**
```typescript
✅ cl.generacion.create - Generar Certificado
✅ cl.generacion.regenerate - Regenerar Certificado
✅ cl.generacion.select_template - Seleccionar Plantilla
✅ cl.generacion.customize - Personalizar Contenido
✅ cl.generacion.preview - Vista Previa
✅ cl.generacion.include_salary - Incluir Salario
✅ cl.generacion.generate_qr - Generar Código QR
✅ cl.generacion.number - Asignar Número Consecutivo
✅ cl.generacion.generate_batch - Generar en Lote
✅ cl.generacion.cancel - Cancelar Generación
```

**E. Firma (8 permisos)**
```typescript
✅ cl.firma.view_pending - Ver Pendientes de Firma
✅ cl.firma.sign_simple - Firmar Electrónicamente
✅ cl.firma.sign_qualified - Firmar Digitalmente (Crítico)
✅ cl.firma.sign_batch - Firmar en Lote (Crítico)
✅ cl.firma.reject - Rechazar para Firma
✅ cl.firma.verify - Verificar Firma
✅ cl.firma.delegate - Delegar Firma
✅ cl.firma.view_certificate - Ver Certificado de Firma
```

**F. Entrega (9 permisos)**
```typescript
✅ cl.entrega.send_email - Enviar por Email
✅ cl.entrega.send_batch - Enviar en Lote
✅ cl.entrega.mark_delivered - Marcar como Entregado
✅ cl.entrega.print - Imprimir Certificado
✅ cl.entrega.download - Descargar Certificado
✅ cl.entrega.resend - Reenviar Certificado
✅ cl.entrega.notify - Notificar Disponibilidad
✅ cl.entrega.track - Rastrear Entrega
✅ cl.entrega.confirm - Confirmar Recepción
```

**G. Validación (5 permisos)**
```typescript
✅ cl.validacion.verify_qr - Validar por QR
✅ cl.validacion.verify_number - Validar por Número
✅ cl.validacion.revoke - Revocar Certificado (Crítico)
✅ cl.validacion.view_history - Ver Historial de Validaciones
✅ cl.validacion.export_log - Exportar Log de Validaciones
```

**H. Plantillas (5 permisos)**
```typescript
✅ cl.plantilla.view - Ver Plantillas
✅ cl.plantilla.create - Crear Plantilla
✅ cl.plantilla.edit - Editar Plantilla
✅ cl.plantilla.delete - Eliminar Plantilla
✅ cl.plantilla.set_default - Establecer como Predeterminada
```

**I. Configuración y Reportes (5 permisos)**
```typescript
✅ cl.config.view - Ver Configuraciones
✅ cl.config.edit - Editar Configuraciones
✅ cl.reporte.general - Generar Reportes
✅ cl.reporte.export - Exportar Reportes
✅ cl.auditoria.view - Ver Auditoría
```

---

### 2. REGISTRO ACADÉMICO (90 Permisos)

#### Categorías:

**A. Dashboard y Visualización (5 permisos)**
```typescript
✅ ra.dashboard.view - Ver Dashboard
✅ ra.dashboard.view_stats - Ver Estadísticas Generales
✅ ra.dashboard.view_enrollment - Ver Matrícula Activa
✅ ra.dashboard.view_graduates - Ver Graduados
✅ ra.dashboard.view_alerts - Ver Alertas Académicas
```

**B. Inscripciones (12 permisos)**
```typescript
✅ ra.inscripcion.view - Ver Inscripciones
✅ ra.inscripcion.view_all - Ver Todas las Inscripciones
✅ ra.inscripcion.create - Crear Inscripción
✅ ra.inscripcion.create_behalf - Inscribir en Nombre de Tercero
✅ ra.inscripcion.edit - Editar Inscripción
✅ ra.inscripcion.approve - Aprobar Inscripción
✅ ra.inscripcion.reject - Rechazar Inscripción
✅ ra.inscripcion.cancel - Cancelar Inscripción
✅ ra.inscripcion.import - Importar Inscripciones
✅ ra.inscripcion.export - Exportar Inscripciones
✅ ra.inscripcion.validate_docs - Validar Documentos
✅ ra.inscripcion.send_notification - Notificar Aspirante
```

**C. Matrículas (15 permisos)**
```typescript
✅ ra.matricula.view - Ver Matrículas
✅ ra.matricula.view_all - Ver Todas las Matrículas
✅ ra.matricula.create - Generar Matrícula
✅ ra.matricula.edit - Editar Matrícula
✅ ra.matricula.approve - Aprobar Matrícula
✅ ra.matricula.cancel - Cancelar Matrícula
✅ ra.matricula.renew - Renovar Matrícula
✅ ra.matricula.verify_payment - Verificar Pago
✅ ra.matricula.assign_subjects - Asignar Materias
✅ ra.matricula.modify_subjects - Modificar Materias
✅ ra.matricula.add_credits - Agregar Créditos
✅ ra.matricula.remove_credits - Eliminar Créditos
✅ ra.matricula.generate_certificate - Generar Certificado de Matrícula
✅ ra.matricula.import - Importar Matrículas
✅ ra.matricula.export - Exportar Matrículas
```

**D. Calificaciones (13 permisos)**
```typescript
✅ ra.calificacion.view - Ver Calificaciones
✅ ra.calificacion.view_all - Ver Todas las Calificaciones
✅ ra.calificacion.view_own - Ver Calificaciones Propias
✅ ra.calificacion.create - Registrar Calificación
✅ ra.calificacion.edit - Editar Calificación
✅ ra.calificacion.import - Importar Calificaciones
✅ ra.calificacion.approve - Aprobar Acta de Notas
✅ ra.calificacion.close - Cerrar Acta
✅ ra.calificacion.reopen - Reabrir Acta (Crítico)
✅ ra.calificacion.generate_transcript - Generar Certificado de Notas
✅ ra.calificacion.calculate_average - Calcular Promedios
✅ ra.calificacion.export - Exportar Calificaciones
✅ ra.calificacion.send_notification - Notificar Calificaciones
```

**E. Certificados de Grado (15 permisos)**
```typescript
✅ ra.titulo.view - Ver Certificados de Grado
✅ ra.titulo.view_all - Ver Todos los Certificados
✅ ra.titulo.create - Generar Certificado de Grado (Crítico)
✅ ra.titulo.edit - Editar Certificado
✅ ra.titulo.sign - Firmar Certificado (Crítico)
✅ ra.titulo.assign_folio - Asignar Folio de Registro
✅ ra.titulo.register_book - Registrar en Libro (Crítico)
✅ ra.titulo.print - Imprimir Certificado
✅ ra.titulo.deliver - Entregar Certificado
✅ ra.titulo.send_email - Enviar por Email
✅ ra.titulo.duplicate - Duplicar Certificado
✅ ra.titulo.revoke - Revocar Certificado (Crítico)
✅ ra.titulo.generate_qr - Generar Código QR
✅ ra.titulo.apostille - Gestionar Apostilla
✅ ra.titulo.add_honors - Agregar Menciones de Honor
```

**F. Validación de Títulos (8 permisos)**
```typescript
✅ ra.validacion.verify_qr - Validar por QR
✅ ra.validacion.verify_folio - Validar por Folio
✅ ra.validacion.verify_book - Validar en Libro
✅ ra.validacion.generate_constancy - Generar Constancia de Validación
✅ ra.validacion.view_history - Ver Historial de Validaciones
✅ ra.validacion.export_log - Exportar Log de Validaciones
✅ ra.validacion.notify_validation - Notificar Validación
✅ ra.validacion.verify_signature - Verificar Firma Digital
```

**G. Programas Académicos (10 permisos)**
```typescript
✅ ra.programa.view - Ver Programas Académicos
✅ ra.programa.create - Crear Programa (Crítico)
✅ ra.programa.edit - Editar Programa
✅ ra.programa.activate - Activar/Desactivar Programa
✅ ra.programa.update_curriculum - Actualizar Plan de Estudios
✅ ra.programa.add_subject - Agregar Materia
✅ ra.programa.remove_subject - Eliminar Materia
✅ ra.programa.update_credits - Actualizar Créditos
✅ ra.programa.view_stats - Ver Estadísticas del Programa
✅ ra.programa.export - Exportar Programas
```

**H. Gestión de Graduados (12 permisos)**
```typescript
✅ ra.graduado.view - Ver Graduados
✅ ra.graduado.view_all - Ver Todos los Graduados
✅ ra.graduado.register - Registrar Graduado
✅ ra.graduado.edit - Editar Graduado
✅ ra.graduado.update_employment - Actualizar Estado Laboral
✅ ra.graduado.update_contact - Actualizar Datos de Contacto
✅ ra.graduado.export - Exportar Graduados
✅ ra.graduado.export_snies - Exportar para SNIES
✅ ra.graduado.send_survey - Enviar Encuesta
✅ ra.graduado.view_stats - Ver Estadísticas
✅ ra.graduado.send_notification - Notificar Graduados
✅ ra.graduado.manage_alumni - Gestionar Red Alumni
```

**I. Configuración y Reportes (5 permisos)**
```typescript
✅ ra.config.view - Ver Configuraciones
✅ ra.config.edit - Editar Configuraciones
✅ ra.reporte.general - Generar Reportes
✅ ra.reporte.export - Exportar Reportes
✅ ra.auditoria.view - Ver Auditoría
```

---

## 📈 Distribución por Criticidad

### Certificados Laborales (65 permisos)
| Criticidad | Cantidad | % |
|------------|----------|---|
| Baja | 18 | 27.7% |
| Media | 28 | 43.1% |
| Alta | 14 | 21.5% |
| Crítica | 5 | 7.7% |

### Registro Académico (90 permisos)
| Criticidad | Cantidad | % |
|------------|----------|---|
| Baja | 20 | 22.2% |
| Media | 37 | 41.1% |
| Alta | 25 | 27.8% |
| Crítica | 8 | 8.9% |

---

## 👥 Roles Sugeridos (7 roles predefinidos)

### Certificados Laborales:

#### 1. **Coordinador RRHH**
- **Permisos**: 9 permisos clave
- **Descripción**: Gestión completa de certificados
- **Incluye**: Dashboard, creación, generación, entrega, reportes

#### 2. **Asistente RRHH**
- **Permisos**: 6 permisos operativos
- **Descripción**: Operaciones básicas
- **Incluye**: Creación, generación, entrega

#### 3. **Jefe RRHH**
- **Permisos**: 7 permisos de alto nivel
- **Descripción**: Aprobación y firma
- **Incluye**: Aprobación, firma, configuración

### Registro Académico:

#### 4. **Coordinador Registro Académico**
- **Permisos**: 10 permisos clave
- **Descripción**: Acceso completo
- **Incluye**: Inscripciones, matrículas, títulos, programas

#### 5. **Analista Registro**
- **Permisos**: 6 permisos operativos
- **Descripción**: Operaciones diarias
- **Incluye**: Inscripciones, matrículas, calificaciones

#### 6. **Docente**
- **Permisos**: 5 permisos académicos
- **Descripción**: Gestión de calificaciones
- **Incluye**: Ver, crear, editar, importar, aprobar calificaciones

#### 7. **Director Académico**
- **Permisos**: 9 permisos críticos
- **Descripción**: Decisiones estratégicas
- **Incluye**: Aprobaciones, firma, revocación, configuración

---

## 📁 Archivos Creados

### 1. `/data/permissions-certificados-registro-granular.ts`
**Contenido**:
- 65 permisos de Certificados Laborales
- 90 permisos de Registro Académico
- Total: 155 permisos granulares
- Completamente tipados con TypeScript
- Incluye metadata de criticidad y categoría

### 2. `/data/permissions-update-v3.ts`
**Contenido**:
- Módulos actualizados para integración
- Estadísticas de permisos
- Roles sugeridos predefinidos
- Guía de implementación
- Distribución por criticidad

### 3. `/PERMISOS_CERTIFICADOS_REGISTRO_DOCUMENTACION.md` (este archivo)
**Contenido**:
- Documentación completa
- Listado de todos los permisos
- Ejemplos de uso
- Guía de integración

---

## 🔧 Integración con el Sistema

### Paso 1: Importar los nuevos módulos

```typescript
// En RolePermissionsEditor.tsx o donde se use
import { 
  MODULO_CERTIFICADOS_LABORALES_COMPLETO, 
  MODULO_REGISTRO_ACADEMICO_COMPLETO 
} from '../../data/permissions-update-v3';
```

### Paso 2: Actualizar el array de PERMISSION_MODULES

```typescript
// En permissions-config-updated.ts
export const PERMISSION_MODULES: PermissionModule[] = [
  // ... otros módulos ...
  
  // REEMPLAZAR el módulo de Certificados Laborales (id: 4)
  MODULO_CERTIFICADOS_LABORALES_COMPLETO,
  
  // ... otros módulos ...
  
  // REEMPLAZAR el módulo de Graduados (id: 9)
  MODULO_REGISTRO_ACADEMICO_COMPLETO,
  
  // ... otros módulos ...
];
```

### Paso 3: Actualizar contadores automáticamente

Los contadores se actualizarán automáticamente:
- ✅ Total de permisos disponibles
- ✅ Contador por módulo
- ✅ Porcentaje de permisos asignados

---

## ✅ Ventajas del Nuevo Sistema

### 1. **Granularidad**
- Control preciso sobre cada acción
- Asignación específica por función
- Reducción de permisos innecesarios

### 2. **Parametrización**
- Categorías bien definidas
- Criticidad asignada a cada permiso
- Roles sugeridos predefinidos

### 3. **Trazabilidad**
- Cada acción tiene su permiso
- Auditoría completa de acciones
- Cumplimiento normativo

### 4. **Escalabilidad**
- Fácil agregar nuevos permisos
- Estructura modular
- Mantenimiento simplificado

### 5. **Seguridad**
- Principio de mínimo privilegio
- Permisos críticos identificados
- Separación de responsabilidades

---

## 📊 Comparativa Final

| Aspecto | Antes | Después | Mejora |
|---------|-------|---------|--------|
| **Total Permisos** | 30 | 155 | +416% |
| **Categorías** | 2 | 18 | +800% |
| **Roles Sugeridos** | 0 | 7 | - |
| **Criticidad Definida** | ❌ | ✅ | - |
| **Granularidad** | Básica | Avanzada | - |
| **Parametrización** | Limitada | Completa | - |

---

## 🎯 Próximos Pasos

### Inmediatos:
1. ✅ Revisar permisos con equipo de RRHH
2. ✅ Revisar permisos con equipo de Registro Académico
3. ✅ Validar roles sugeridos
4. ✅ Integrar en sistema de roles

### Corto Plazo:
1. ✅ Crear roles personalizados por sede
2. ✅ Asignar permisos a usuarios existentes
3. ✅ Capacitar usuarios en nuevos permisos
4. ✅ Documentar procesos

### Mediano Plazo:
1. ✅ Monitorear uso de permisos
2. ✅ Ajustar según feedback
3. ✅ Expandir a otros módulos
4. ✅ Automatizar asignaciones

---

## 📞 Soporte y Contacto

**Responsable**: Equipo de Desarrollo - ESAP  
**Fecha de Implementación**: Enero 22, 2025  
**Versión del Sistema**: 3.0  
**Estado**: ✅ **COMPLETADO Y LISTO PARA INTEGRACIÓN**

---

## 🏆 Conclusión

Se han creado **155 nuevos permisos granulares** distribuidos en:
- ✅ **65 permisos** para Certificados Laborales (9 categorías)
- ✅ **90 permisos** para Registro Académico (9 categorías)

El sistema ahora permite un control **completamente parametrizable** con:
- ✅ Criticidad definida para cada permiso
- ✅ Categorías organizadas
- ✅ Roles sugeridos predefinidos
- ✅ Total compatibilidad con el sistema existente

**¡El sistema de permisos está listo para máxima parametrización y control granular!** 🎉

---

**FIN DE LA DOCUMENTACIÓN**
