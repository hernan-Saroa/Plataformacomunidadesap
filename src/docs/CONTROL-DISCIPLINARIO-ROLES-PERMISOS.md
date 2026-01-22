# 📋 Integración Control Disciplinario con Roles y Permisos

## 🎯 Resumen Ejecutivo

El módulo de **Control Interno Disciplinario** está completamente integrado con el sistema de **Roles y Permisos** del backoffice administrativo ESAP, permitiendo una administración granular y parametrizable de cada función del módulo disciplinario.

---

## 📊 Estructura de Integración

### 1. **Sistema de Permisos Granulares (95+ permisos)**

El módulo disciplinario cuenta con **95+ permisos** específicos organizados en **12 categorías funcionales**:

#### 🔹 Dashboard y Visualización (4 permisos)
- `cd.dashboard.view` - Ver Dashboard
- `cd.dashboard.view_stats` - Ver Estadísticas Generales
- `cd.dashboard.view_kanban` - Ver Vista Kanban
- `cd.dashboard.view_executive` - Ver Dashboard Ejecutivo

#### 🔹 Noticias/Quejas (11 permisos)
- `cd.noticia.view` - Ver Noticias/Quejas
- `cd.noticia.view_all` - Ver Todas las Noticias (sin filtro territorial)
- `cd.noticia.view_own` - Ver Noticias Propias
- `cd.noticia.create` - Crear Noticia
- `cd.noticia.edit` - Editar Noticia
- `cd.noticia.delete` - Eliminar Noticia
- `cd.noticia.classify` - Clasificar Noticia
- `cd.noticia.archive` - Archivar Noticia
- `cd.noticia.assign` - Asignar Noticia
- `cd.noticia.convert_to_process` - Convertir a Proceso
- `cd.noticia.remit_competence` - Remitir por Competencia

#### 🔹 Procesos Disciplinarios (12 permisos)
- `cd.process.view` - Ver Procesos
- `cd.process.view_all` - Ver Todos los Procesos
- `cd.process.view_own` - Ver Procesos Propios
- `cd.process.view_details` - Ver Detalles Completos
- `cd.process.create` - Iniciar Proceso
- `cd.process.edit` - Editar Proceso
- `cd.process.delete` - Eliminar Proceso
- `cd.process.assign` - Asignar Profesional
- `cd.process.change_stage` - Cambiar Etapa
- `cd.process.close` - Cerrar Proceso
- `cd.process.archive` - Archivar Proceso
- `cd.process.reopen` - Reabrir Proceso

#### 🔹 Etapas Procesales (5 permisos)
- `cd.stage.valoracion` - Gestionar Valoración
- `cd.stage.indagacion` - Gestionar Indagación
- `cd.stage.investigacion` - Gestionar Investigación
- `cd.stage.juzgamiento` - Gestionar Juzgamiento
- `cd.stage.fallo` - Gestionar Fallo

#### 🔹 Autos y Providencias (7 permisos)
- `cd.auto.view` - Ver Autos
- `cd.auto.create` - Crear Auto
- `cd.auto.edit` - Editar Auto
- `cd.auto.delete` - Eliminar Auto
- `cd.auto.sign` - Firmar Auto
- `cd.auto.notify` - Notificar Auto
- `cd.auto.download` - Descargar Auto

#### 🔹 Resoluciones y Fallos (7 permisos)
- `cd.resolution.view` - Ver Resoluciones
- `cd.resolution.create` - Crear Resolución
- `cd.resolution.edit` - Editar Resolución
- `cd.resolution.sign` - Firmar Resolución
- `cd.resolution.notify` - Notificar Resolución
- `cd.fallo.sancionatorio` - Emitir Fallo Sancionatorio
- `cd.fallo.absolutorio` - Emitir Fallo Absolutorio

#### 🔹 Sanciones (5 permisos)
- `cd.sanction.view` - Ver Sanciones
- `cd.sanction.apply` - Aplicar Sanción
- `cd.sanction.modify` - Modificar Sanción
- `cd.sanction.track` - Hacer Seguimiento
- `cd.sanction.close` - Cerrar Sanción

#### 🔹 Expediente Electrónico (6 permisos)
- `cd.expediente.view` - Ver Expediente
- `cd.expediente.upload` - Cargar Documentos
- `cd.expediente.download` - Descargar Documentos
- `cd.expediente.delete` - Eliminar Documentos
- `cd.expediente.organize` - Organizar Expediente
- `cd.expediente.export` - Exportar Expediente

#### 🔹 Editor de Documentos (5 permisos)
- `cd.editor.access` - Acceder a Editor
- `cd.editor.create` - Crear Documento
- `cd.editor.edit` - Editar Documento
- `cd.editor.use_templates` - Usar Plantillas
- `cd.editor.save_template` - Guardar como Plantilla

#### 🔹 Gestión de Profesionales (5 permisos)
- `cd.professional.view` - Ver Profesionales
- `cd.professional.add` - Agregar Profesional
- `cd.professional.remove` - Remover Profesional
- `cd.professional.edit_capacity` - Editar Capacidad
- `cd.professional.view_load` - Ver Carga de Trabajo

#### 🔹 Términos y Alertas (6 permisos)
- `cd.terms.view` - Ver Términos
- `cd.terms.create` - Crear Término
- `cd.terms.edit` - Editar Término
- `cd.terms.delete` - Eliminar Término
- `cd.alerts.view` - Ver Alertas
- `cd.alerts.configure` - Configurar Alertas

#### 🔹 Revisión y Aprobación (4 permisos)
- `cd.review.access` - Acceder a Revisión
- `cd.review.approve` - Aprobar Documento
- `cd.review.reject` - Rechazar Documento
- `cd.review.add_comments` - Agregar Comentarios

#### 🔹 Reportes y Exportación (6 permisos)
- `cd.export.general` - Exportar Reportes Generales
- `cd.export.statistics` - Exportar Estadísticas
- `cd.export.processes` - Exportar Procesos
- `cd.export.advanced` - Reportes Avanzados
- `cd.stats.view` - Ver Estadísticas
- `cd.stats.executive` - Estadísticas Ejecutivas

#### 🔹 Auditoría y Trazabilidad (3 permisos)
- `cd.audit.view` - Ver Auditoría
- `cd.audit.export` - Exportar Auditoría
- `cd.tracking.view` - Ver Trazabilidad

#### 🔹 Configuración del Módulo (6 permisos)
- `cd.config.view` - Ver Configuraciones
- `cd.config.edit` - Editar Configuraciones
- `cd.config.stages` - Configurar Etapas
- `cd.config.capacity` - Configurar Capacidades
- `cd.config.notifications` - Configurar Notificaciones
- `cd.config.templates` - Gestionar Plantillas

---

## 👥 Roles Predefinidos para Control Disciplinario

### 🔴 1. **Profesional Especializado Disciplinario**
**Capacidad:** 12 procesos
**Permisos:** 75 permisos
**Descripción:** Profesional especializado del equipo disciplinario con capacidad de gestión completa de procesos

**Permisos típicos incluyen:**
- ✅ Ver y gestionar noticias propias y asignadas
- ✅ Crear, editar y cerrar procesos
- ✅ Gestionar todas las etapas procesales
- ✅ Crear y firmar autos
- ✅ Gestionar expediente electrónico completo
- ✅ Usar editor de documentos con plantillas
- ✅ Ver y exportar reportes operativos
- ❌ NO puede aprobar documentos (requiere senior)
- ❌ NO puede configurar parámetros del sistema

---

### 🔵 2. **Profesional Universitario Disciplinario**
**Capacidad:** 10 procesos
**Permisos:** 60 permisos
**Descripción:** Profesional universitario del equipo disciplinario con permisos de gestión operativa

**Permisos típicos incluyen:**
- ✅ Ver noticias propias
- ✅ Crear y editar procesos asignados
- ✅ Gestionar etapas básicas (indagación, investigación)
- ✅ Crear autos (sin firmar)
- ✅ Gestionar expediente (cargar/descargar documentos)
- ✅ Usar plantillas predefinidas
- ❌ NO puede eliminar procesos
- ❌ NO puede firmar documentos
- ❌ NO puede ver estadísticas ejecutivas

---

### 🟢 3. **Profesional Senior Disciplinario**
**Capacidad:** 15 procesos
**Permisos:** 85 permisos
**Descripción:** Profesional senior con permisos avanzados incluyendo revisión y aprobación

**Permisos típicos incluyen:**
- ✅ Todos los permisos de Especializado
- ✅ Acceder al módulo de revisión y aprobación de jefe
- ✅ Aprobar o rechazar documentos
- ✅ Firmar autos y resoluciones
- ✅ Gestionar etapa de juzgamiento y fallo
- ✅ Ver estadísticas ejecutivas
- ✅ Exportar reportes avanzados
- ✅ Ver auditoría y trazabilidad
- ❌ NO puede configurar parámetros del sistema

---

### 🟡 4. **Coordinador Disciplinario**
**Capacidad:** 8 procesos (más supervisión)
**Permisos:** 95 permisos
**Descripción:** Coordinador del equipo disciplinario con permisos ejecutivos y de supervisión

**Permisos típicos incluyen:**
- ✅ Todos los permisos de Senior
- ✅ Ver TODOS los procesos del equipo (sin filtro)
- ✅ Asignar y reasignar procesos entre profesionales
- ✅ Gestionar equipo de profesionales
- ✅ Editar capacidades de carga de trabajo
- ✅ Configurar términos y alertas
- ✅ Exportar estadísticas ejecutivas completas
- ✅ Ver auditoría completa del módulo
- ❌ NO puede editar configuraciones críticas del sistema

---

### 🟤 5. **Jefe Control Disciplinario**
**Capacidad:** Supervisión general (sin límite)
**Permisos:** 95 permisos (todos)
**Descripción:** Jefe de Control Disciplinario con acceso completo incluyendo configuración y administración

**Permisos incluyen:**
- ✅ **ACCESO TOTAL** a todas las funcionalidades
- ✅ Configurar etapas procesales y tiempos
- ✅ Configurar capacidades por cargo
- ✅ Gestionar plantillas de documentos
- ✅ Configurar notificaciones del sistema
- ✅ Acceso a configuraciones críticas
- ✅ Ver y exportar auditoría completa
- ✅ Dashboard ejecutivo integrado con métricas de alta gerencia

---

### ⚪ 6. **Consultor Disciplinario**
**Capacidad:** N/A (solo lectura)
**Permisos:** 15 permisos (solo visualización)
**Descripción:** Rol de solo lectura para consulta de procesos disciplinarios sin permisos de modificación

**Permisos típicos incluyen:**
- ✅ Ver dashboard
- ✅ Ver noticias y procesos (solo lectura)
- ✅ Ver expedientes electrónicos
- ✅ Descargar documentos
- ✅ Ver estadísticas básicas
- ✅ Exportar reportes de consulta
- ❌ NO puede crear, editar ni eliminar
- ❌ NO puede firmar ni aprobar documentos
- ❌ NO puede acceder a configuraciones

---

## 🔗 Flujo de Integración con Roles y Permisos

### Paso 1: Crear Roles desde Administración de Personas
```
Administración de Personas → Roles y Permisos → Crear Rol
```

1. **Nombre del Rol:** Ejemplo: "Profesional Especializado Disciplinario"
2. **Descripción:** Detalle de las responsabilidades
3. **Icono y Color:** Identificación visual (usar `Scale` para roles disciplinarios)
4. **Tipo:** Personalizado
5. **Requiere 2FA:** Sí (recomendado para roles disciplinarios)

### Paso 2: Asignar Permisos Granulares
```
Roles y Permisos → [Rol Creado] → Gestionar Permisos → Control Disciplinario
```

En el editor de permisos, seleccionar los permisos específicos del módulo `Control Disciplinario`:
- Se muestran organizados en 12 categorías
- Se puede marcar/desmarcar individualmente cada permiso
- Se puede marcar toda una categoría completa
- Barra de progreso muestra X/95 permisos asignados

### Paso 3: Vincular Usuarios desde Gestión de Personas
```
Administración de Personas → Usuarios y Personas → [Usuario] → Asignar Rol
```

1. Buscar el usuario en el sistema
2. Ir a sección "Roles Asignados"
3. Agregar el rol disciplinario creado
4. El usuario puede tener **múltiples roles** (modelo Usuario Persona)

### Paso 4: Agregar Profesionales al Equipo Disciplinario
```
Control Interno Disciplinario → Profesionales → Agregar Profesional
```

**IMPORTANTE:** Solo se pueden agregar usuarios que:
- ✅ Ya existen en Administración de Personas
- ✅ Tienen asignado un rol disciplinario
- ✅ Están activos en el sistema

En la sección de Profesionales:
1. **Buscar usuario existente** en el sistema
2. **Seleccionar cargo/perfil** (debe coincidir con rol asignado)
3. **Asignar capacidad** (máximo de procesos según configuración)
4. El profesional aparece en el equipo y puede recibir asignaciones

---

## ⚙️ Configuración de Capacidades por Cargo

### En Módulo de Configuración
```
Control Interno Disciplinario → Configuración → Capacidad por Cargo
```

Los cargos configurados aquí deben coincidir con los roles creados en Roles y Permisos:

| Cargo/Perfil | Capacidad Máxima | Rol Sugerido |
|---|---|---|
| Profesional Especializado | 12 procesos | Profesional Especializado Disciplinario |
| Profesional Universitario | 10 procesos | Profesional Universitario Disciplinario |
| Profesional Senior | 15 procesos | Profesional Senior Disciplinario |
| Coordinador | 8 procesos | Coordinador Disciplinario |

**Configuración dinámica:**
- Se pueden agregar nuevos cargos desde Configuración
- Se puede modificar la capacidad máxima por cargo
- Los cargos personalizados deben tener un rol equivalente en Roles y Permisos

---

## 🔐 Niveles de Criticidad de Permisos

Cada permiso tiene un nivel de criticidad que indica su impacto:

| Criticidad | Descripción | Ejemplos |
|---|---|---|
| 🟢 **Baja** | Permisos de visualización y consulta | Ver dashboard, Ver noticias, Descargar documentos |
| 🟡 **Media** | Permisos de gestión operativa | Editar proceso, Cargar documentos, Asignar profesional |
| 🟠 **Alta** | Permisos que afectan el flujo procesal | Crear proceso, Cambiar etapa, Aprobar documento |
| 🔴 **Crítica** | Permisos con impacto legal o de seguridad | Firmar documento, Cerrar proceso, Configurar sistema |

**Recomendaciones de asignación:**
- **Roles operativos:** Baja + Media + Alta seleccionada
- **Roles de supervisión:** Baja + Media + Alta + Crítica seleccionada
- **Jefaturas:** Todos los niveles (95 permisos)

---

## 📝 Ejemplo de Asignación de Permisos por Rol

### Profesional Universitario (60 permisos)
```javascript
{
  // Dashboard (3/4)
  "cd.dashboard.view": true,
  "cd.dashboard.view_stats": true,
  "cd.dashboard.view_kanban": true,
  "cd.dashboard.view_executive": false, // ❌ Solo supervisión
  
  // Noticias (6/11)
  "cd.noticia.view": true,
  "cd.noticia.view_own": true, // Solo propias
  "cd.noticia.view_all": false, // ❌ Solo coordinación
  "cd.noticia.create": true,
  "cd.noticia.edit": true,
  "cd.noticia.classify": true,
  "cd.noticia.delete": false, // ❌ Solo senior+
  "cd.noticia.archive": false, // ❌ Solo senior+
  
  // Procesos (8/12)
  "cd.process.view": true,
  "cd.process.view_own": true,
  "cd.process.view_all": false, // ❌ Solo coordinación
  "cd.process.create": true,
  "cd.process.edit": true,
  "cd.process.assign": false, // ❌ Solo coordinación
  "cd.process.change_stage": true,
  "cd.process.close": false, // ❌ Solo senior+
  "cd.process.delete": false, // ❌ Crítico
  
  // Autos (5/7)
  "cd.auto.view": true,
  "cd.auto.create": true,
  "cd.auto.edit": true,
  "cd.auto.sign": false, // ❌ Solo especializado+
  "cd.auto.notify": false, // ❌ Solo especializado+
  "cd.auto.download": true,
  
  // Expediente (5/6)
  "cd.expediente.view": true,
  "cd.expediente.upload": true,
  "cd.expediente.download": true,
  "cd.expediente.organize": true,
  "cd.expediente.export": true,
  "cd.expediente.delete": false, // ❌ Crítico
  
  // ... resto de permisos operativos básicos
}
```

---

## 🚀 Mejores Prácticas

### 1. **Separación de Responsabilidades**
- Crear roles específicos por nivel de responsabilidad
- No otorgar permisos innecesarios
- Revisar periódicamente los permisos asignados

### 2. **Principio de Menor Privilegio**
- Asignar solo los permisos necesarios para la función
- Usar roles progresivos (Universitario → Especializado → Senior)
- Privilegios críticos solo para niveles superiores

### 3. **Trazabilidad y Auditoría**
- Todos los cambios de permisos quedan registrados
- Auditoría muestra quién hizo qué y cuándo
- Revisar logs de acciones críticas

### 4. **Autenticación de Dos Factores (2FA)**
- **Obligatorio** para roles disciplinarios
- Protege permisos críticos y firmas
- Requisito para roles con permisos de configuración

### 5. **Actualización de Roles**
- Revisar roles trimestralmente
- Ajustar permisos según cambios en procesos
- Eliminar roles sin usuarios asignados

---

## 📊 Matriz de Permisos por Rol (Resumen)

| Categoría | Consultivo | Universitario | Especializado | Senior | Coordinador | Jefe |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| Dashboard | Ver básico | Ver estadísticas | Ver Kanban | Ver ejecutivo | Ver todo | Ver todo |
| Noticias | Solo lectura | Crear/Editar propias | Gestión completa | Gestión + Archivo | Gestión + Asignación | Control total |
| Procesos | Solo lectura | Crear/Editar propios | Gestión completa | Gestión + Cierre | Gestión + Reasignación | Control total |
| Autos | Ver/Descargar | Crear (sin firmar) | Crear + Firmar | Crear + Firmar | Firma + Notificación | Control total |
| Resoluciones | Solo lectura | Ver | Crear | Crear + Firmar | Crear + Firmar | Control total |
| Sanciones | Solo lectura | Ver | Aplicar | Aplicar + Seguimiento | Modificar | Control total |
| Expediente | Ver/Descargar | Cargar/Organizar | Gestión completa | Gestión completa | Gestión completa | Control total |
| Editor | No acceso | Usar plantillas | Crear documentos | Crear + Guardar plantillas | Gestionar plantillas | Control total |
| Profesionales | Ver lista | Ver lista | Ver carga | Ver + Agregar | Gestionar equipo | Control total |
| Términos | Ver | Ver | Crear/Editar | Crear/Editar | Gestionar | Configurar |
| Revisión | No acceso | No acceso | No acceso | Aprobar/Rechazar | Aprobar/Rechazar | Control total |
| Reportes | Básicos | Operativos | Operativos + Exportar | Avanzados | Ejecutivos | Control total |
| Auditoría | No acceso | No acceso | Ver propia | Ver módulo | Ver todo | Exportar todo |
| Configuración | No acceso | No acceso | No acceso | Ver | Ver + Ajustar | Control total |

**Leyenda:**
- ✅ Control total = Todos los permisos de la categoría
- ⚠️ Gestión completa = Todos menos críticos
- 📊 Ver todo = Todos los de visualización

---

## 🔄 Flujo de Trabajo Típico

### Escenario: Nuevo Profesional del Equipo Disciplinario

1. **Administración de Personas crea el usuario:**
   - Registro de datos personales
   - Asignación de credenciales
   - Vinculación a dirección territorial

2. **Se asigna el rol desde Roles y Permisos:**
   - Selección del rol "Profesional Especializado Disciplinario"
   - Verificación de permisos asignados (75 permisos)
   - Activación de 2FA obligatorio

3. **Configuración de capacidades:**
   - En módulo de Configuración se establece capacidad de 12 procesos
   - Se configura perfil "Especializado" con parámetros específicos

4. **Vinculación al equipo disciplinario:**
   - Desde módulo Profesionales se agrega al equipo
   - Se asigna capacidad individual (puede ser menor a 12)
   - Se verifica disponibilidad para recibir asignaciones

5. **Asignación de procesos:**
   - El coordinador o jefe asigna procesos al profesional
   - Sistema valida que no exceda su capacidad
   - Alertas automáticas cuando alcanza 90% de capacidad

6. **Trabajo operativo:**
   - Profesional gestiona sus procesos asignados
   - Tiene acceso solo a las funciones permitidas por su rol
   - Sistema registra todas las acciones en auditoría

---

## 📞 Contacto y Soporte

**Documentación técnica:** `/data/permissions-config-updated.ts`  
**Configuración de roles:** `/components/esap/RolesAdministrationModulePremium.tsx`  
**Editor de permisos:** `/components/esap/RolePermissionsEditor.tsx`

Para ajustes o creación de nuevos roles disciplinarios, contactar al equipo de desarrollo o administración del sistema.

---

**Última actualización:** 21 de Enero de 2026  
**Versión:** 1.0  
**Módulo:** Control Interno Disciplinario v2.5
