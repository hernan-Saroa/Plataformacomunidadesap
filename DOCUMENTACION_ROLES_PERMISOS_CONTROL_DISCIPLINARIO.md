# 📋 Guía de Roles y Permisos - Control Disciplinario

## 🎯 ¿Qué es el Control Disciplinario?

El **Control Disciplinario** es un módulo del sistema que permite gestionar procesos disciplinarios internos de la institución. Incluye la creación de noticias disciplinarias, procesos, expedientes electrónicos, términos y alertas, y configuraciones del sistema.

## 👥 Roles del Sistema

| Rol | Nombre | Descripción |
|-----|--------|-------------|
| **JEFE_DE_LA_OCID** | Jefe OCID | Jefe de la Oficina de Control Disciplinario Interno - Tiene acceso completo a todas las funcionalidades |
| **SECRETARIA_RADICADOR** | Radicador Disciplinario | Secretaría o Radicador - Gestiona la creación y radicación de procesos |
| **PROFESIONAL** | Profesional Disciplinario | Profesional a cargo de expedientes - Maneja procesos asignados |

---

## 📂 Estructura de Submódulos

### 🏠 **1. Procesos**
Gestión completa de procesos disciplinarios y noticias.

| Permiso | Descripción | Jefe OCID | Radicador | Profesional |
|---------|-------------|-----------|-----------|-------------|
| **Ver Submódulo Procesos** | Acceso al módulo de procesos | ✅ | ✅ | ✅ |
| **Generar Nueva Noticia** | Crear noticias disciplinarias | ✅ | ✅ | ❌ |
| **Ver Todos los Procesos** | Visualizar procesos activos | ✅ | ✅ | ❌ |
| **Ver Mis Procesos** | Solo procesos asignados | ❌ | ❌ | ✅ |
| **Editar Procesos** | Modificar información | ✅ | ✅ | ✅ |
| **Convertir Noticia** | Convertir noticia en proceso | ✅ | ❌ | ❌ |
| **Ver Expediente** | Acceso a expedientes | ✅ | ✅ | ✅ |
| **Ver Detalle** | Información completa | ✅ | ✅ | ✅ |
| **Ver Archivos** | Documentos del proceso | ✅ | ✅ | ✅ |
| **Descargar Documentos** | Archivos del proceso | ✅ | ✅ | ✅ |
| **Cargar Nuevo Auto** | Crear autos | ✅ | ❌ | ✅ |
| **Cargar Evidencias** | Subir evidencias | ✅ | ✅ | ✅ |
| **Cargar Oficio** | Crear oficios | ✅ | ✅ | ✅ |
| **Cargar Acta** | Crear actas | ✅ | ✅ | ✅ |
| **Ver Actuaciones** | Historial de actuaciones | ✅ | ✅ | ✅ |
| **Crear Actuación** | Nueva actuación | ✅ | ✅ | ✅ |
| **Ver Tareas** | Tareas asignadas | ✅ | ✅ | ✅ |
| **Nueva Tarea** | Crear tareas | ✅ | ✅ | ✅ |
| **Editar Tareas** | Modificar tareas | ✅ | ✅ | ✅ |
| **Ver Notas** | Comentarios del proceso | ✅ | ✅ | ✅ |
| **Guardar Nota** | Crear notas | ✅ | ✅ | ✅ |
| **Eliminar Nota** | Borrar notas | ✅ | ✅ | ✅ |
| **Asociar Procesos** | Vincular procesos | ✅ | ✅ | ✅ |
| **Solicitud de Reasignación** | Solicitud de reasignación | ✅ | ✅ | ✅ |
| **Movimiento Kanban** | Cambiar etapas | ✅ | ❌ | ✅ |
| **Ver Vista Lista** | Lista de procesos | ✅ | ✅ | ✅ |
| **Crear Pliego de Cargos** | Generar pliego | ✅ | ❌ | ✅ |
| **Enviar a Revisión** | Jefe revisa documentos | ❌ | ❌ | ✅ |
| **Remitir a Jurídica** | Enviar a jurídica | ✅ | ❌ | ✅ |
| **Cargar Archivos** | Subir archivos generales | ✅ | ✅ | ✅ |

### 🔍 **2. Noticias Disciplinarias**
Gestión de noticias antes de convertirse en procesos.

| Permiso | Descripción | Jefe OCID | Radicador | Profesional |
|---------|-------------|-----------|-----------|-------------|
| **Ver Noticias** | Visualizar noticias | ✅ | ✅ | ❌ |
| **Editar Noticias** | Modificar noticias | ✅ | ✅ | ❌ |
| **Asociar Noticia** | Vincular a proceso | ✅ | ✅ | ❌ |
| **Ver Detalle** | Información ampliada | ✅ | ✅ | ❌ |
| **Devolver Noticia** | Regresar al creador | ✅ | ❌ | ❌ |
| **Ver Devueltas** | Todas devueltas | ✅ | ❌ | ❌ |
| **Ver Mis Devueltas** | Solo las propias | ❌ | ✅ | ❌ |
| **Archivar Noticias** | Archivar noticias | ✅ | ❌ | ❌ |
| **Remitir por Competencia** | Enviar a otras entidades | ✅ | ❌ | ❌ |   

### ✅ **3. Revisión y Aprobación**
Sistema de aprobación de documentos.

| Permiso | Descripción | Jefe OCID | Radicador | Profesional |
|---------|-------------|-----------|-----------|-------------|
| **Ver Submódulo** | Acceso al módulo | ✅ | ❌ | ❌ |
| **Ver Documentos** | Pendientes de aprobación | ✅ | ❌ | ❌ |
| **Devolver** | Rechazar documento | ✅ | ❌ | ❌ |
| **Aprobar** | Firmar y aprobar | ✅ | ❌ | ❌ |

### 📁 **4. Expediente Electrónico**
Gestión documental digital.

| Permiso | Descripción | Jefe OCID | Radicador | Profesional |
|---------|-------------|-----------|-----------|-------------|
| **Ver Submódulo** | Acceso al expediente | ✅ | ✅ | ✅ |
| **Ver Todos** | Todos los expedientes | ✅ | ✅ | ✅ |
| **Ver Documento** | Contenido del documento | ✅ | ✅ | ✅ |
| **Descargar Documento** | Guardar documento | ✅ | ✅ | ✅ |
| **Descargar Hoja Control** | Hoja de control | ✅ | ✅ | ✅ |
| **Ver Hoja Control** | Visualizar hoja | ✅ | ✅ | ✅ |

### ⏰ **5. Términos y Alertas**
Gestión de términos procesales y notificaciones.

| Permiso | Descripción | Jefe OCID | Radicador | Profesional |
|---------|-------------|-----------|-----------|-------------|
| **Ver Submódulo** | Acceso a términos | ✅ | ✅ | ✅ |
| **Ver Términos** | Todos los términos | ✅ | ✅ | ❌ |
| **Ver Mis Términos** | Solo asignados | ❌ | ❌ | ✅ |
| **Crear Término** | Nuevo término | ✅ | ✅ | ❌ |
| **Marcar Cumplido** | Completar término | ✅ | ✅ | ✅ | //debe ser el que se le asigno el termino.
| **Ver Historial** | Cambios en términos | ✅ | ✅ | ❌ |
| **Exportar Excel** | Reporte en Excel | ✅ | ✅ | ❌ |
| **Exportar PDF** | Reporte en PDF | ✅ | ✅ | ❌ |

### 👥 **6. Profesionales**
Gestión del equipo de trabajo.

| Permiso | Descripción | Jefe OCID | Radicador | Profesional |
|---------|-------------|-----------|-----------|-------------|
| **Ver Submódulo** | Acceso a profesionales | ✅ | ✅ | ❌ |
| **Ver Profesionales** | Información del equipo | ✅ | ✅ | ❌ |
| **Ver Procesos** | Procesos por profesional | ✅ | ✅ | ❌ |

### ⚙️ **7. Configuraciones**
Configuración del sistema y plantillas.

| Permiso | Descripción | Jefe OCID | Radicador | Profesional |
|---------|-------------|-----------|-----------|-------------|
| **Ver Submódulo** | Acceso a configuraciones | ✅ | ❌ | ❌ |
| **Estados Kanban** | Configurar etapas | ✅ | ❌ | ❌ |
| **Cargos y Capacidad** | Gestionar roles | ✅ | ❌ | ❌ |
| **Plantillas de Autos** | Configurar autos | ✅ | ❌ | ❌ |
| **Plantillas de Oficios** | Configurar oficios | ✅ | ❌ | ❌ |
| **Entidades de Remisión** | Gestionar entidades | ✅ | ❌ | ❌ |
| **Notificaciones** | Configurar alertas | ✅ | ❌ | ❌ |
| **Prescripción** | Configurar plazos | ✅ | ❌ | ❌ |

---

## 🔄 **Permisos de Restauración** (Adicionales)

Estos permisos permiten recuperar elementos archivados:

| Permiso | Descripción | Jefe OCID | Radicador | Profesional |
|---------|-------------|-----------|-----------|-------------|
| **Restaurar Procesos** | Recuperar procesos | ✅ | ❌ | ❌ |
| **Restaurar Noticias** | Recuperar noticias | ✅ | ❌ | ❌ |
| **Restaurar Mis Noticias** | Solo propias | ❌ | ✅ | ❌ |

---

## 📈 **Resumen de Accesos**

| Rol | Total de Permisos | Nivel de Acceso |
|-----|-------------------|-----------------|
| **Jefe OCID** | ~100+ permisos | **Completo** - Todas las funcionalidades |
| **Radicador** | ~50+ permisos | **Intermedio** - Creación y gestión básica |
| **Profesional** | ~30+ permisos | **Limitado** - Procesos asignados |

---

## 💡 **Notas Importantes**

- ✅ **Acceso completo** - El Jefe OCID tiene acceso a TODAS las funcionalidades
- 🎯 **Especialización** - Cada rol tiene permisos específicos según su función
- 🔒 **Seguridad** - Los permisos están diseñados para mantener la integridad del proceso disciplinario
- 📱 **Interfaz unificada** - Todos los roles acceden al mismo sistema pero ven diferentes opciones según sus permisos

---

*Esta documentación se basa en la migración de roles y permisos del Control Disciplinario. Los permisos pueden ser ajustados según las necesidades específicas de la institución*