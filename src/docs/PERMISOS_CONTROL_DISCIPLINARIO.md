# GUÍA COMPLETA DE PERMISOS - CONTROL INTERNO DISCIPLINARIO

**Sistema de Backoffice Administrativo ESAP**  
**Módulo:** Control Interno Disciplinario  
**Fecha de Creación:** 19 de Diciembre, 2025  
**Total de Permisos:** 106 permisos granulares

---

## 📋 ÍNDICE

1. [Resumen Ejecutivo](#resumen-ejecutivo)
2. [Arquitectura de Permisos](#arquitectura-de-permisos)
3. [Módulos de Permisos](#módulos-de-permisos)
4. [Roles Sugeridos](#roles-sugeridos)
5. [Matriz de Asignación](#matriz-de-asignación)
6. [Casos de Uso](#casos-de-uso)
7. [Integración con Roles y Permisos](#integración)

---

## 🎯 RESUMEN EJECUTIVO

El módulo de **Control Interno Disciplinario** cuenta con un sistema de permisos granulares de **106 permisos** distribuidos en **8 submódulos** que permiten un control preciso de acceso según el rol y las responsabilidades de cada profesional.

### Características Principales

- ✅ **106 permisos granulares** para control fino de acceso
- ✅ **8 submódulos** especializados por funcionalidad
- ✅ **Integración completa** con el módulo de Roles y Permisos
- ✅ **Trazabilidad total** de todas las acciones
- ✅ **Compatible** con modelo Usuario Persona de ESAP
- ✅ **Sincronización perfecta** con Administración de Personas

---

## 🏗️ ARQUITECTURA DE PERMISOS

### Estructura Jerárquica

```
Control Interno Disciplinario (106 permisos)
│
├── 1. Procesos Disciplinarios (20 permisos)
├── 2. Noticias Disciplinarias (16 permisos)
├── 3. Expediente Electrónico (14 permisos)
├── 4. Revisión y Aprobación (12 permisos)
├── 5. Términos y Alertas (10 permisos)
├── 6. Profesionales (12 permisos)
├── 7. Configuración del Sistema (10 permisos)
└── 8. Dashboard y Reportes (12 permisos)
```

### Nomenclatura de Permisos

Todos los permisos siguen el patrón:
```
disciplinario.<submódulo>.<acción>
```

**Ejemplo:**
```javascript
disciplinario.procesos.view          // Ver procesos
disciplinario.noticias.create        // Crear noticia
disciplinario.expediente.upload      // Subir documento
```

---

## 📦 MÓDULOS DE PERMISOS

### 1️⃣ PROCESOS DISCIPLINARIOS (20 permisos)

**ID del Módulo:** `disciplinario_procesos`  
**Icono:** ⚖️ (Scale)  
**Color:** Azul (#003DA5)

| ID del Permiso | Nombre | Descripción | Uso Común |
|---|---|---|---|
| `disciplinario.procesos.view` | Ver Procesos | Consultar lista de procesos | Todos los usuarios |
| `disciplinario.procesos.view_assigned` | Ver Procesos Asignados | Ver solo procesos propios | Abogados |
| `disciplinario.procesos.view_all` | Ver Todos los Procesos | Acceso total a procesos | Jefe, Supervisor |
| `disciplinario.procesos.create` | Crear Proceso | Iniciar nuevo proceso | Abogados, Secretarios |
| `disciplinario.procesos.edit` | Editar Proceso | Modificar datos del proceso | Abogado asignado |
| `disciplinario.procesos.delete` | Eliminar Proceso | Eliminar proceso (con justificación) | Solo Jefe |
| `disciplinario.procesos.assign` | Asignar Proceso | Asignar a profesional | Jefe, Coordinador |
| `disciplinario.procesos.reassign` | Reasignar Proceso | Cambiar asignación | Jefe |
| `disciplinario.procesos.change_stage` | Cambiar Etapa | Avanzar/retroceder etapa | Abogado asignado |
| `disciplinario.procesos.archive` | Archivar Proceso | Archivar proceso finalizado | Abogado, Secretario |
| `disciplinario.procesos.unarchive` | Desarchivar Proceso | Restaurar proceso archivado | Jefe |
| `disciplinario.procesos.export` | Exportar Procesos | Descargar datos | Todos con acceso |
| `disciplinario.procesos.view_details` | Ver Detalles Completos | Información detallada | Abogados, Jefe |
| `disciplinario.procesos.view_timeline` | Ver Línea de Tiempo | Historial de actuaciones | Todos con acceso |
| `disciplinario.procesos.add_observation` | Agregar Observación | Registrar observaciones | Abogado asignado |
| `disciplinario.procesos.view_parties` | Ver Partes del Proceso | Datos de denunciante/denunciado | Abogados, Jefe |
| `disciplinario.procesos.manage_terms` | Gestionar Términos | Administrar plazos | Abogado asignado |
| `disciplinario.procesos.extend_term` | Prorrogar Términos | Extender plazos | Jefe, Coordinador |
| `disciplinario.procesos.close` | Cerrar Proceso | Finalizar con resolución | Jefe (aprobación final) |
| `disciplinario.procesos.remit` | Remitir por Competencia | Enviar a otra entidad | Jefe, Abogado |

**Casos de Uso:**
- Un **Abogado** debe tener: `view_assigned`, `create`, `edit`, `change_stage`, `add_observation`, `view_details`, `view_timeline`, `view_parties`, `manage_terms`
- El **Jefe de Oficina** debe tener: `view_all`, `assign`, `reassign`, `extend_term`, `close`, `delete`

---

### 2️⃣ NOTICIAS DISCIPLINARIAS (16 permisos)

**ID del Módulo:** `disciplinario_noticias`  
**Icono:** 📋 (FileText)  
**Color:** Púrpura (#6B21A8)

| ID del Permiso | Nombre | Descripción | Uso Común |
|---|---|---|---|
| `disciplinario.noticias.view` | Ver Noticias | Consultar noticias | Todos |
| `disciplinario.noticias.view_all` | Ver Todas las Noticias | Acceso completo | Jefe, Supervisor |
| `disciplinario.noticias.create` | Crear Noticia | Registrar nueva noticia | Secretario, Abogado |
| `disciplinario.noticias.edit` | Editar Noticia | Modificar noticia | Quien la creó |
| `disciplinario.noticias.delete` | Eliminar Noticia | Eliminar noticia | Solo Jefe |
| `disciplinario.noticias.archive` | Archivar Noticia | Archivar sin proceso | Abogado, Jefe |
| `disciplinario.noticias.convert_to_process` | Convertir a Proceso | Iniciar proceso formal | Abogado valorador |
| `disciplinario.noticias.assign` | Asignar Noticia | Asignar para valoración | Jefe, Coordinador |
| `disciplinario.noticias.reassign` | Reasignar Noticia | Cambiar asignación | Jefe |
| `disciplinario.noticias.change_status` | Cambiar Estado | Actualizar estado | Abogado asignado |
| `disciplinario.noticias.add_comment` | Agregar Comentario | Registrar comentarios | Abogado, Jefe |
| `disciplinario.noticias.view_details` | Ver Detalles | Información completa | Todos con acceso |
| `disciplinario.noticias.export` | Exportar Noticias | Descargar datos | Jefe, Secretario |
| `disciplinario.noticias.remit` | Remitir por Competencia | Enviar a otra entidad | Jefe, Abogado |
| `disciplinario.noticias.view_timeline` | Ver Historial | Consultar historial | Todos con acceso |
| `disciplinario.noticias.attach_evidence` | Adjuntar Evidencia | Cargar documentos | Secretario, Abogado |

**Flujo de Trabajo:**
1. **Secretario** recibe queja → `create` noticia
2. **Jefe** asigna a abogado → `assign`
3. **Abogado** valora → `view_details`, `add_comment`, `attach_evidence`
4. **Abogado** decide → `convert_to_process` o `archive`

---

### 3️⃣ EXPEDIENTE ELECTRÓNICO (14 permisos)

**ID del Módulo:** `disciplinario_expediente`  
**Icono:** 📁 (FolderOpen)  
**Color:** Ámbar (#D97706)

| ID del Permiso | Nombre | Descripción | Uso Común |
|---|---|---|---|
| `disciplinario.expediente.view` | Ver Expediente | Acceso al expediente | Todos |
| `disciplinario.expediente.view_documents` | Ver Documentos | Consultar documentos | Todos |
| `disciplinario.expediente.upload_document` | Subir Documento | Cargar documentos | Secretario, Abogado |
| `disciplinario.expediente.download_document` | Descargar Documento | Descargar archivos | Todos con acceso |
| `disciplinario.expediente.delete_document` | Eliminar Documento | Eliminar documentos | Solo Jefe |
| `disciplinario.expediente.edit_metadata` | Editar Metadatos | Modificar información | Secretario |
| `disciplinario.expediente.organize` | Organizar Expediente | Ordenar documentos | Secretario |
| `disciplinario.expediente.search` | Buscar en Expediente | Búsqueda avanzada | Todos |
| `disciplinario.expediente.export` | Exportar Expediente | Descargar expediente completo | Jefe, Abogado |
| `disciplinario.expediente.version_control` | Control de Versiones | Gestionar versiones | Secretario |
| `disciplinario.expediente.view_history` | Ver Historial | Historial de cambios | Todos |
| `disciplinario.expediente.stamp_document` | Sellar Documento | Sello digital | Secretario, Jefe |
| `disciplinario.expediente.share` | Compartir Expediente | Compartir acceso | Jefe |
| `disciplinario.expediente.lock` | Bloquear Expediente | Proteger contra cambios | Jefe |

**Características Especiales:**
- Control de versiones de documentos
- Sello digital para documentos oficiales
- Bloqueo de expedientes finalizados
- Trazabilidad completa de cambios

---

### 4️⃣ REVISIÓN Y APROBACIÓN (12 permisos)

**ID del Módulo:** `disciplinario_revision`  
**Icono:** ✓ (CheckCircle)  
**Color:** Verde (#059669)

| ID del Permiso | Nombre | Descripción | Uso Común |
|---|---|---|---|
| `disciplinario.revision.view_pending` | Ver Pendientes | Documentos pendientes | Jefe |
| `disciplinario.revision.approve_document` | Aprobar Documento | Aprobar documentos | Jefe |
| `disciplinario.revision.reject_document` | Rechazar Documento | Rechazar con observaciones | Jefe |
| `disciplinario.revision.request_corrections` | Solicitar Correcciones | Pedir ajustes | Jefe |
| `disciplinario.revision.add_observations` | Agregar Observaciones | Comentarios de revisión | Jefe |
| `disciplinario.revision.view_history` | Ver Historial de Revisiones | Historial de aprobaciones | Todos |
| `disciplinario.revision.delegate` | Delegar Revisión | Asignar a otro profesional | Jefe |
| `disciplinario.revision.priority` | Establecer Prioridad | Marcar como urgente | Jefe |
| `disciplinario.revision.view_metrics` | Ver Métricas | Tiempos de revisión | Jefe, Coordinador |
| `disciplinario.revision.batch_approve` | Aprobación Masiva | Aprobar múltiples | Jefe |
| `disciplinario.revision.final_approval` | Aprobación Final | Aprobación definitiva | Solo Jefe |
| `disciplinario.revision.export` | Exportar Revisiones | Descargar datos | Jefe |

**Flujo de Aprobación:**
1. Abogado termina documento → Envía a revisión
2. Jefe recibe notificación → `view_pending`
3. Jefe revisa → `approve_document` o `reject_document`
4. Si rechaza → `request_corrections` + `add_observations`
5. Aprobación final → `final_approval`

---

### 5️⃣ TÉRMINOS Y ALERTAS (10 permisos)

**ID del Módulo:** `disciplinario_terminos`  
**Icono:** ⏰ (Clock)  
**Color:** Rojo (#DC2626)

| ID del Permiso | Nombre | Descripción | Uso Común |
|---|---|---|---|
| `disciplinario.terminos.view` | Ver Términos | Consultar términos y plazos | Todos |
| `disciplinario.terminos.view_alerts` | Ver Alertas | Notificaciones de vencimientos | Todos |
| `disciplinario.terminos.configure` | Configurar Términos | Establecer plazos por etapa | Solo Jefe |
| `disciplinario.terminos.extend` | Prorrogar Términos | Extender plazos | Jefe, Coordinador |
| `disciplinario.terminos.suspend` | Suspender Términos | Pausar conteo | Abogado, Jefe |
| `disciplinario.terminos.resume` | Reanudar Términos | Reactivar conteo | Abogado, Jefe |
| `disciplinario.terminos.view_dashboard` | Ver Dashboard de Términos | Semáforo de plazos | Todos |
| `disciplinario.terminos.export` | Exportar Términos | Reporte de vencimientos | Jefe, Secretario |
| `disciplinario.terminos.configure_notifications` | Configurar Notificaciones | Ajustar alertas | Jefe |
| `disciplinario.terminos.view_history` | Ver Historial | Historial de prórrogas | Todos |

**Sistema de Semáforo:**
- 🟢 **Verde:** Más del 30% del tiempo restante
- 🟡 **Amarillo:** Entre 10% y 30% del tiempo
- 🔴 **Rojo:** Menos del 10% o vencido

---

### 6️⃣ PROFESIONALES (12 permisos)

**ID del Módulo:** `disciplinario_profesionales`  
**Icono:** 👨‍⚖️ (Users)  
**Color:** Índigo (#4338CA)

| ID del Permiso | Nombre | Descripción | Uso Común |
|---|---|---|---|
| `disciplinario.profesionales.view` | Ver Profesionales | Consultar equipo | Todos |
| `disciplinario.profesionales.create` | Crear Profesional | Registrar nuevo profesional | Jefe |
| `disciplinario.profesionales.edit` | Editar Profesional | Modificar datos | Jefe |
| `disciplinario.profesionales.delete` | Eliminar Profesional | Dar de baja | Jefe |
| `disciplinario.profesionales.assign_capacity` | Asignar Capacidad | Capacidad máxima de casos | Jefe |
| `disciplinario.profesionales.view_workload` | Ver Carga Laboral | Casos asignados | Jefe, Coordinador |
| `disciplinario.profesionales.view_performance` | Ver Desempeño | Métricas de rendimiento | Jefe |
| `disciplinario.profesionales.assign_role` | Asignar Rol | Configurar rol | Jefe |
| `disciplinario.profesionales.activate_deactivate` | Activar/Desactivar | Cambiar estado | Jefe |
| `disciplinario.profesionales.export` | Exportar Profesionales | Descargar datos | Jefe |
| `disciplinario.profesionales.view_statistics` | Ver Estadísticas | Métricas del equipo | Jefe |
| `disciplinario.profesionales.manage_permissions` | Gestionar Permisos | Administrar accesos | Jefe + Admin Personas |

**Importante:** 
Los profesionales SOLO se crean desde el módulo de **Administración de Personas**. Estos permisos permiten **vincular** usuarios existentes al módulo disciplinario y gestionar su capacidad de trabajo.

---

### 7️⃣ CONFIGURACIÓN DEL SISTEMA (10 permisos)

**ID del Módulo:** `disciplinario_config`  
**Icono:** ⚙️ (Settings)  
**Color:** Gris (#4B5563)

| ID del Permiso | Nombre | Descripción | Uso Común |
|---|---|---|---|
| `disciplinario.config.view` | Ver Configuración | Acceso a configuración | Jefe, Admin |
| `disciplinario.config.edit_stages` | Configurar Etapas | Tiempos por etapa procesal | Solo Jefe |
| `disciplinario.config.edit_capacity` | Configurar Capacidad | Capacidad máxima por cargo | Solo Jefe |
| `disciplinario.config.edit_workflows` | Configurar Flujos | Modificar flujos de trabajo | Solo Jefe |
| `disciplinario.config.edit_templates` | Gestionar Plantillas | Plantillas de documentos | Jefe, Secretario |
| `disciplinario.config.edit_notifications` | Configurar Notificaciones | Ajustar alertas | Jefe |
| `disciplinario.config.backup` | Respaldar Configuración | Crear backup | Admin Sistema |
| `disciplinario.config.restore` | Restaurar Configuración | Recuperar configuración | Admin Sistema |
| `disciplinario.config.export` | Exportar Configuración | Descargar configuración | Jefe |
| `disciplinario.config.audit` | Auditar Cambios | Historial de cambios | Jefe, Auditoría |

**Configuraciones Disponibles:**

1. **Tiempos por Etapa:**
   - Recepción: X días
   - Valoración: X días
   - Indagación: X días
   - Investigación: X días
   - Juzgamiento: X días
   - Fallo: X días

2. **Capacidad por Cargo:**
   - Jefe: X casos
   - Abogado: X casos
   - Auxiliar: X casos

---

### 8️⃣ DASHBOARD Y REPORTES (12 permisos)

**ID del Módulo:** `disciplinario_dashboard`  
**Icono:** 📊 (BarChart3)  
**Color:** Teal (#0D9488)

| ID del Permiso | Nombre | Descripción | Uso Común |
|---|---|---|---|
| `disciplinario.dashboard.view` | Ver Dashboard | Dashboard principal | Todos |
| `disciplinario.dashboard.view_kanban` | Ver Kanban Operativo | Tablero Kanban | Todos |
| `disciplinario.dashboard.view_ejecutivo` | Dashboard Ejecutivo | KPIs ejecutivos | Jefe, Dirección |
| `disciplinario.dashboard.view_metrics` | Ver Métricas | Indicadores del sistema | Todos |
| `disciplinario.dashboard.view_charts` | Ver Gráficos | Visualizaciones | Todos |
| `disciplinario.dashboard.export_reports` | Exportar Reportes | Descargar reportes | Jefe, Secretario |
| `disciplinario.dashboard.create_report` | Crear Reporte | Reportes personalizados | Jefe |
| `disciplinario.dashboard.schedule_report` | Programar Reportes | Automatizar reportes | Jefe |
| `disciplinario.dashboard.view_by_sede` | Filtrar por Sede | Métricas por sede | Coordinador Sede |
| `disciplinario.dashboard.view_by_territorial` | Filtrar por Territorial | Métricas por territorial | Director Territorial |
| `disciplinario.dashboard.real_time` | Datos en Tiempo Real | Actualización automática | Jefe |
| `disciplinario.dashboard.analytics` | Analíticas Avanzadas | Análisis predictivo | Jefe, Dirección |

---

## 👥 ROLES SUGERIDOS

### 1. JEFE DE CONTROL INTERNO DISCIPLINARIO

**Descripción:** Responsable total del módulo. Aprueba, supervisa y toma decisiones finales.

**Permisos Recomendados:** (Total: 80+ permisos)

✅ **Procesos:** TODOS (20/20)
✅ **Noticias:** TODOS (16/16)
✅ **Expediente:** TODOS (14/14)
✅ **Revisión:** TODOS (12/12)
✅ **Términos:** TODOS (10/10)
✅ **Profesionales:** TODOS (12/12)
✅ **Configuración:** TODOS (10/10)
✅ **Dashboard:** TODOS (12/12)

**Acciones Exclusivas:**
- Aprobación final de documentos
- Cierre de procesos
- Configuración de tiempos y capacidades
- Eliminación de registros
- Gestión de profesionales

---

### 2. ABOGADO PROFESIONAL ESPECIALIZADO

**Descripción:** Gestiona procesos asignados, elabora documentos, lleva expedientes.

**Permisos Recomendados:** (Total: 45-50 permisos)

✅ **Procesos:**
- `view_assigned`, `create`, `edit`, `change_stage`, `add_observation`
- `view_details`, `view_timeline`, `view_parties`, `manage_terms`
- `archive`, `export`

✅ **Noticias:**
- `view`, `create`, `edit`, `change_status`, `add_comment`
- `view_details`, `view_timeline`, `attach_evidence`
- `convert_to_process`, `archive`

✅ **Expediente:**
- `view`, `view_documents`, `upload_document`, `download_document`
- `edit_metadata`, `organize`, `search`, `export`, `view_history`

✅ **Revisión:**
- `view_pending` (solo para consulta)

✅ **Términos:**
- `view`, `view_alerts`, `view_dashboard`, `view_history`
- `suspend`, `resume`

✅ **Profesionales:**
- `view`, `view_workload`

✅ **Dashboard:**
- `view`, `view_kanban`, `view_metrics`, `view_charts`, `export_reports`

**NO Tiene:**
- ❌ Aprobar documentos
- ❌ Cerrar procesos
- ❌ Eliminar registros
- ❌ Configurar sistema
- ❌ Gestionar profesionales

---

### 3. COORDINADOR / SUPERVISOR

**Descripción:** Asigna casos, supervisa tiempos, genera reportes.

**Permisos Recomendados:** (Total: 40-45 permisos)

✅ **Procesos:**
- `view_all`, `assign`, `reassign`, `extend_term`
- `view_details`, `view_timeline`, `export`

✅ **Noticias:**
- `view_all`, `assign`, `reassign`, `export`

✅ **Expediente:**
- `view`, `view_documents`, `search`, `export`

✅ **Revisión:**
- `view_history`, `view_metrics`, `export`

✅ **Términos:**
- `view`, `view_alerts`, `extend`, `view_dashboard`, `export`, `view_history`

✅ **Profesionales:**
- `view`, `assign_capacity`, `view_workload`, `view_performance`
- `view_statistics`, `export`

✅ **Dashboard:**
- TODOS (12/12)

---

### 4. SECRETARIO / AUXILIAR ADMINISTRATIVO

**Descripción:** Recibe quejas, organiza expedientes, carga documentos, genera reportes.

**Permisos Recomendados:** (Total: 30-35 permisos)

✅ **Procesos:**
- `view`, `create`, `view_details`, `view_timeline`, `export`

✅ **Noticias:**
- `view`, `create`, `edit`, `view_details`, `attach_evidence`, `export`

✅ **Expediente:**
- `view`, `view_documents`, `upload_document`, `download_document`
- `edit_metadata`, `organize`, `search`, `version_control`, `stamp_document`

✅ **Términos:**
- `view`, `view_alerts`, `view_dashboard`, `export`

✅ **Profesionales:**
- `view`

✅ **Dashboard:**
- `view`, `view_kanban`, `view_metrics`, `view_charts`, `export_reports`

**NO Tiene:**
- ❌ Aprobar documentos
- ❌ Cerrar procesos
- ❌ Asignar casos
- ❌ Configurar sistema

---

### 5. CONSULTA / AUDITOR EXTERNO

**Descripción:** Solo visualización de información para auditoría o consulta.

**Permisos Recomendados:** (Total: 15-20 permisos)

✅ **Procesos:**
- `view`, `view_details`, `view_timeline`, `export`

✅ **Noticias:**
- `view`, `view_details`, `view_timeline`, `export`

✅ **Expediente:**
- `view`, `view_documents`, `search`, `view_history`

✅ **Términos:**
- `view`, `view_dashboard`

✅ **Dashboard:**
- `view`, `view_metrics`, `view_charts`, `export_reports`

**NO Tiene:**
- ❌ Crear, editar o eliminar
- ❌ Aprobar documentos
- ❌ Subir documentos
- ❌ Configurar sistema

---

## 📊 MATRIZ DE ASIGNACIÓN DE PERMISOS

### Tabla Resumen por Rol

| Submódulo | Jefe | Abogado | Coordinador | Secretario | Consulta |
|---|:---:|:---:|:---:|:---:|:---:|
| **Procesos** | 20/20 | 11/20 | 7/20 | 5/20 | 4/20 |
| **Noticias** | 16/16 | 9/16 | 4/16 | 6/16 | 4/16 |
| **Expediente** | 14/14 | 9/14 | 4/14 | 10/14 | 4/14 |
| **Revisión** | 12/12 | 1/12 | 3/12 | 0/12 | 0/12 |
| **Términos** | 10/10 | 4/10 | 6/10 | 4/10 | 2/10 |
| **Profesionales** | 12/12 | 2/12 | 6/12 | 1/12 | 0/12 |
| **Configuración** | 10/10 | 0/10 | 0/10 | 0/10 | 0/10 |
| **Dashboard** | 12/12 | 6/12 | 12/12 | 6/12 | 4/12 |
| **TOTAL** | **106** | **42** | **42** | **32** | **18** |

---

## 💼 CASOS DE USO

### Caso 1: Recepción de Queja

**Actor:** Secretario  
**Flujo:**
1. `disciplinario.noticias.create` → Crea noticia disciplinaria
2. `disciplinario.noticias.attach_evidence` → Adjunta documentos
3. `disciplinario.expediente.upload_document` → Carga en expediente

**Actor:** Jefe  
**Flujo:**
4. `disciplinario.noticias.assign` → Asigna a abogado para valoración

---

### Caso 2: Valoración de Noticia

**Actor:** Abogado  
**Flujo:**
1. `disciplinario.noticias.view_assigned` → Ve noticias asignadas
2. `disciplinario.noticias.view_details` → Analiza la noticia
3. `disciplinario.expediente.view_documents` → Revisa evidencia
4. `disciplinario.noticias.add_comment` → Agrega análisis jurídico

**Decisión A:** Convertir a proceso
5. `disciplinario.noticias.convert_to_process` → Inicia proceso formal
6. `disciplinario.procesos.create` → Crea proceso disciplinario

**Decisión B:** Archivar
5. `disciplinario.noticias.archive` → Archiva sin proceso

---

### Caso 3: Gestión de Proceso Disciplinario

**Actor:** Abogado  
**Flujo:**
1. `disciplinario.procesos.view_assigned` → Ve procesos asignados
2. `disciplinario.procesos.view_details` → Revisa detalles
3. `disciplinario.procesos.view_parties` → Consulta partes
4. `disciplinario.expediente.upload_document` → Sube auto, citación, etc.
5. `disciplinario.procesos.add_observation` → Registra actuaciones
6. `disciplinario.procesos.change_stage` → Avanza a siguiente etapa
7. `disciplinario.terminos.suspend` → Suspende términos si es necesario

---

### Caso 4: Revisión y Aprobación de Documento

**Actor:** Abogado  
**Flujo:**
1. Elabora documento (auto, resolución, etc.)
2. `disciplinario.expediente.upload_document` → Sube a expediente
3. Envía a revisión (notificación al Jefe)

**Actor:** Jefe  
**Flujo:**
4. `disciplinario.revision.view_pending` → Ve documentos pendientes
5. `disciplinario.revision.view_details` → Revisa documento
6. **Si aprueba:** `disciplinario.revision.approve_document`
7. **Si rechaza:** 
   - `disciplinario.revision.reject_document`
   - `disciplinario.revision.add_observations` → Observaciones
   - `disciplinario.revision.request_corrections` → Solicita ajustes
8. **Aprobación final:** `disciplinario.revision.final_approval`

---

### Caso 5: Configuración de Tiempos por Etapa

**Actor:** Jefe de Control Disciplinario  
**Flujo:**
1. `disciplinario.config.view` → Accede a configuración
2. `disciplinario.config.edit_stages` → Modifica tiempos:
   - Recepción: 3 días
   - Valoración: 10 días
   - Indagación: 40 días
   - Investigación: 60 días
   - Juzgamiento: 30 días
   - Fallo: 10 días
3. `disciplinario.config.backup` → Crea respaldo de configuración
4. `disciplinario.config.audit` → Registra cambio en auditoría

**Resultado:** Todos los procesos nuevos usan los nuevos tiempos automáticamente.

---

## 🔗 INTEGRACIÓN CON ROLES Y PERMISOS

### Cómo Crear Roles desde el Módulo de Roles y Permisos

1. **Acceder al Módulo:**
   ```
   Backoffice → Administración de Personas → Roles y Permisos
   ```

2. **Crear Nuevo Rol:**
   - Clic en "Crear Rol"
   - Nombre: "Abogado Disciplinario"
   - Descripción: "Profesional especializado en procesos disciplinarios"
   - Tipo: "Personalizado" o "Sistema"

3. **Asignar Permisos:**
   - Expandir sección: "⚖️ Disciplinario: Procesos"
   - Seleccionar permisos necesarios (ver matriz arriba)
   - Repetir para cada submódulo

4. **Guardar y Asignar:**
   - Guardar rol
   - Asignar a usuarios desde "Gestión de Personas"

### Permisos Especiales Requeridos

Para gestionar permisos de Control Disciplinario, el usuario debe tener:

```javascript
// En el módulo de Roles y Permisos
roles.assign_permissions  // Asignar permisos
roles.create             // Crear roles
roles.edit               // Editar roles

// En el módulo de Disciplinario
disciplinario.profesionales.manage_permissions  // Gestionar accesos
```

---

## 🎯 RECOMENDACIONES FINALES

### ✅ Mejores Prácticas

1. **Principio de Mínimo Privilegio:**
   - Otorgar SOLO los permisos necesarios para el trabajo diario
   - No dar permisos de "eliminar" o "configurar" a usuarios operativos

2. **Separación de Funciones:**
   - El que crea NO debe aprobar (Abogado vs Jefe)
   - El que ejecuta NO debe auditar
   - El que configura NO debe operar casos

3. **Auditoría y Trazabilidad:**
   - Todos los permisos críticos se registran en auditoría
   - Revisar periódicamente el uso de permisos

4. **Roles Predefinidos:**
   - Usar roles del sistema antes de crear personalizados
   - Crear roles personalizados solo cuando sea necesario

5. **Revisión Periódica:**
   - Revisar permisos cada 3-6 meses
   - Revocar accesos de usuarios inactivos
   - Actualizar permisos según cambios de cargo

### 🔐 Seguridad

1. **Permisos Críticos:**
   - `delete`, `close`, `final_approval` → SOLO Jefe
   - `config.*` → SOLO Jefe o Admin Sistema
   - `manage_permissions` → Jefe + Admin Personas

2. **Permisos Sensibles:**
   - `view_all` → Limitar a supervisores
   - `assign` / `reassign` → Solo coordinadores
   - `extend_term` → Requiere justificación

3. **Acceso a Datos:**
   - `view_parties` → Solo quienes realmente necesitan ver datos personales
   - `export` → Controlar exportación de datos sensibles

---

## 📞 SOPORTE Y ACTUALIZACIONES

**Documento:** PERMISOS_CONTROL_DISCIPLINARIO.md  
**Versión:** 1.0  
**Fecha:** 19 de Diciembre, 2025  
**Autor:** Sistema de Backoffice ESAP  

### Historial de Cambios

| Fecha | Versión | Descripción |
|---|---|---|
| 2025-12-19 | 1.0 | Creación inicial del documento con 106 permisos |

---

**FIN DEL DOCUMENTO**
