# 🔐 **MATRIZ COMPLETA DE PERMISOS - BACKOFFICE ESAP 2025**

**Actualizado:** 30 de Noviembre, 2025  
**Sistema:** Super App Universitaria ESAP - Backoffice Administrativo  
**Total Módulos:** 16  
**Total Permisos:** 120+

---

## 📊 **ÍNDICE DE MÓDULOS**

| # | Módulo | Permisos | Icono | Estado |
|---|--------|----------|-------|--------|
| 1 | Usuarios y Personas | 8 | 👥 | ✅ Actualizado |
| 2 | Estructura Organizacional | 7 | 🏢 | ✅ NUEVO Nov 2025 |
| 3 | Estudiantes | 6 | 🎓 | ✅ Actualizado |
| 4 | Graduados | 5 | 🏆 | ✅ Actualizado |
| 5 | Gestión Profesoral | 6 | 👨‍🏫 | ✅ NUEVO Nov 2025 |
| 6 | Calendario Académico ESAP 2026 | 6 | 📅 | ✅ NUEVO Nov 2025 |
| 7 | Certificados Laborales | 6 | 📄 | ✅ Actualizado |
| 8 | Comunidad ESAP | 7 | 💬 | ✅ Actualizado |
| 9 | Bolsa de Trabajo | 5 | 💼 | ✅ Actualizado |
| 10 | Matrículas | 5 | 📋 | ✅ Actualizado |
| 11 | Carpeta Digital | 5 | 📁 | ✅ Actualizado |
| 12 | Dashboard Ejecutivo | 6 | 📈 | ✅ Actualizado |
| 13 | Reportes | 5 | 📊 | ✅ Actualizado |
| 14 | Auditoría | 5 | 📜 | ✅ Actualizado |
| 15 | Roles y Permisos | 6 | 🛡️ | ✅ Actualizado |
| 16 | Administración | 6 | ⚙️ | ✅ Actualizado |

---

## 🔍 **DETALLE POR MÓDULO**

### **1️⃣ USUARIOS Y PERSONAS** 👥

**Total Permisos:** 8  
**Código Módulo:** `users`

| ID Permiso | Nombre | Descripción |
|------------|--------|-------------|
| `users.view` | Ver Usuarios | Consultar lista de usuarios del sistema |
| `users.create` | Crear Usuarios | Registrar nuevos usuarios en el sistema |
| `users.edit` | Editar Usuarios | Modificar datos de usuarios existentes |
| `users.delete` | Eliminar Usuarios | Dar de baja usuarios del sistema |
| `users.export` | Exportar Usuarios | Descargar datos de usuarios en Excel/CSV |
| `users.assign_roles` | Asignar Roles | Gestionar roles de usuarios (modelo Usuario Persona) |
| `users.manage_access` | Gestionar Accesos | Configurar permisos y accesos de usuarios |
| `users.view_enrollment` | Ver Vinculaciones | Consultar información de vinculaciones académicas |

---

### **2️⃣ ESTRUCTURA ORGANIZACIONAL** 🏢

**Total Permisos:** 7  
**Código Módulo:** `organization`  
**✨ NUEVO - Noviembre 2025**

| ID Permiso | Nombre | Descripción |
|------------|--------|-------------|
| `org.view_territorial` | Ver Territoriales | Consultar direcciones territoriales (17 en Colombia) |
| `org.view_sedes` | Ver Sedes | Consultar sedes y puntos de atención (71+) |
| `org.manage_sedes` | Gestionar Sedes | Crear, editar y gestionar sedes |
| `org.assign_users` | Asignar Usuarios a Sedes | Vincular usuarios a territoriales y sedes |
| `org.view_hierarchy` | Ver Jerarquía | Consultar estructura Nacional > Territorial > Sede |
| `org.export_structure` | Exportar Estructura | Descargar datos de estructura organizacional |
| `org.manage_territorial` | Gestionar Territoriales | Administrar direcciones territoriales |

**Jerarquía:**
```
Nacional (1)
  └── Territorial (17)
        └── Sede (71+)
```

---

### **3️⃣ ESTUDIANTES** 🎓

**Total Permisos:** 6  
**Código Módulo:** `students`

| ID Permiso | Nombre | Descripción |
|------------|--------|-------------|
| `students.view` | Ver Estudiantes | Consultar información estudiantil |
| `students.enroll` | Matricular | Gestionar matrículas de estudiantes |
| `students.grades` | Calificaciones | Gestionar calificaciones y notas |
| `students.attendance` | Asistencia | Registrar y consultar asistencia |
| `students.export` | Exportar Estudiantes | Descargar datos de estudiantes |
| `students.academic_programs` | Ver Programas Académicos | Consultar programas académicos vinculados |

---

### **4️⃣ GRADUADOS** 🏆

**Total Permisos:** 5  
**Código Módulo:** `graduates`

| ID Permiso | Nombre | Descripción |
|------------|--------|-------------|
| `graduates.view` | Ver Graduados | Consultar base de datos de graduados |
| `graduates.manage` | Gestionar Graduados | Administrar registros de graduados |
| `graduates.verify` | Verificar Títulos | Generar certificados de verificación de títulos |
| `graduates.export` | Exportar Graduados | Descargar datos de graduados |
| `graduates.certificates` | Certificados de Título | Emitir certificados de graduación |

---

### **5️⃣ GESTIÓN PROFESORAL** 👨‍🏫

**Total Permisos:** 6  
**Código Módulo:** `professors`  
**✨ NUEVO - Noviembre 2025**

| ID Permiso | Nombre | Descripción |
|------------|--------|-------------|
| `professors.view` | Ver Profesores | Consultar información de docentes |
| `professors.create` | Crear Profesores | Registrar nuevos docentes en el sistema |
| `professors.edit` | Editar Profesores | Modificar información de docentes |
| `professors.assign_load` | Asignar Carga Académica | Gestionar carga académica de docentes |
| `professors.view_schedule` | Ver Horarios | Consultar horarios de profesores |
| `professors.export` | Exportar Profesores | Descargar datos de docentes |

---

### **6️⃣ CALENDARIO ACADÉMICO ESAP 2026** 📅

**Total Permisos:** 6  
**Código Módulo:** `calendar`  
**✨ NUEVO - Noviembre 2025**

| ID Permiso | Nombre | Descripción |
|------------|--------|-------------|
| `calendar.view` | Ver Calendario | Consultar calendario académico ESAP 2026 |
| `calendar.edit` | Editar Calendario | Modificar eventos del calendario académico |
| `calendar.create_events` | Crear Eventos | Agregar nuevos eventos académicos |
| `calendar.manage_periods` | Gestionar Periodos | Administrar periodos académicos (2026-1, 2026-2, 2026-3) |
| `calendar.export` | Exportar Calendario | Descargar calendario en diferentes formatos |
| `calendar.notifications` | Gestionar Notificaciones | Configurar alertas y recordatorios |

**Periodos 2026:**
- 2026-1: Enero - Abril
- 2026-2: Mayo - Agosto
- 2026-3: Septiembre - Diciembre

---

### **7️⃣ CERTIFICADOS LABORALES** 📄

**Total Permisos:** 6  
**Código Módulo:** `certificates`

| ID Permiso | Nombre | Descripción |
|------------|--------|-------------|
| `certificates.view` | Ver Solicitudes | Consultar solicitudes de certificados laborales |
| `certificates.generate` | Generar Certificados | Emitir certificados laborales |
| `certificates.approve` | Aprobar Solicitudes | Aprobar/rechazar solicitudes de certificados |
| `certificates.verify` | Verificar Certificados | Validar autenticidad de certificados |
| `certificates.export` | Exportar Certificados | Descargar registros de certificados |
| `certificates.manage_templates` | Gestionar Plantillas | Administrar plantillas de certificados |

**Usuario Especial:** `cerlaboral@esap.edu.co`  
**Acceso Restringido:** ÚNICAMENTE certificados laborales y dashboard filtrado

---

### **8️⃣ COMUNIDAD ESAP** 💬

**Total Permisos:** 7  
**Código Módulo:** `community`

| ID Permiso | Nombre | Descripción |
|------------|--------|-------------|
| `community.view` | Ver Comunidad | Acceso a la red social universitaria |
| `community.post` | Crear Publicaciones | Publicar contenido en la comunidad |
| `community.moderate` | Moderar Contenido | Moderar y eliminar publicaciones |
| `community.events` | Gestionar Eventos | Crear y administrar eventos comunitarios |
| `community.announcements` | Anuncios Oficiales | Publicar anuncios institucionales |
| `community.groups` | Gestionar Grupos | Crear y administrar grupos de interés |
| `community.analytics` | Ver Analíticas | Consultar métricas de engagement |

---

### **9️⃣ BOLSA DE TRABAJO** 💼

**Total Permisos:** 5  
**Código Módulo:** `jobs`

| ID Permiso | Nombre | Descripción |
|------------|--------|-------------|
| `jobs.view` | Ver Ofertas | Consultar ofertas laborales publicadas |
| `jobs.create` | Publicar Ofertas | Crear nuevas ofertas de empleo |
| `jobs.manage` | Gestionar Ofertas | Administrar bolsa de trabajo |
| `jobs.applications` | Ver Aplicaciones | Revisar postulaciones de candidatos |
| `jobs.analytics` | Analíticas de Empleo | Ver estadísticas de empleabilidad |

---

### **🔟 MATRÍCULAS** 📋

**Total Permisos:** 5  
**Código Módulo:** `enrollment`

| ID Permiso | Nombre | Descripción |
|------------|--------|-------------|
| `enrollment.view` | Ver Solicitudes | Consultar solicitudes de matrícula |
| `enrollment.approve` | Aprobar Matrículas | Aprobar/rechazar solicitudes de matrícula |
| `enrollment.manage` | Gestionar Proceso | Administrar proceso completo de matrícula |
| `enrollment.payments` | Gestionar Pagos | Administrar pagos y recibos de matrícula |
| `enrollment.export` | Exportar Matrículas | Descargar reportes de matrículas |

---

### **1️⃣1️⃣ CARPETA DIGITAL** 📁

**Total Permisos:** 5  
**Código Módulo:** `documents`

| ID Permiso | Nombre | Descripción |
|------------|--------|-------------|
| `documents.view` | Ver Documentos | Consultar documentos de estudiantes |
| `documents.upload` | Cargar Documentos | Subir archivos a carpeta digital |
| `documents.manage` | Gestionar Documentos | Administrar carpeta digital completa |
| `documents.validate` | Validar Documentos | Aprobar/rechazar documentos cargados |
| `documents.download` | Descargar Documentos | Descargar archivos de carpeta digital |

---

### **1️⃣2️⃣ DASHBOARD EJECUTIVO** 📈

**Total Permisos:** 6  
**Código Módulo:** `dashboard`

| ID Permiso | Nombre | Descripción |
|------------|--------|-------------|
| `dashboard.view_general` | Ver Dashboard General | Acceso a métricas generales del sistema |
| `dashboard.view_by_sede` | Métricas por Sede | Consultar KPIs por sede específica |
| `dashboard.view_by_territorial` | Métricas por Territorial | Consultar KPIs por dirección territorial |
| `dashboard.export_metrics` | Exportar Métricas | Descargar reportes ejecutivos |
| `dashboard.real_time` | Datos en Tiempo Real | Acceso a métricas en tiempo real |
| `dashboard.custom_reports` | Reportes Personalizados | Crear reportes ejecutivos personalizados |

---

### **1️⃣3️⃣ REPORTES** 📊

**Total Permisos:** 5  
**Código Módulo:** `reports`

| ID Permiso | Nombre | Descripción |
|------------|--------|-------------|
| `reports.view` | Ver Reportes | Consultar reportes del sistema |
| `reports.create` | Crear Reportes | Generar nuevos reportes |
| `reports.export` | Exportar Reportes | Descargar reportes en Excel/PDF |
| `reports.schedule` | Programar Reportes | Automatizar generación de reportes |
| `reports.analytics` | Analíticas Avanzadas | Acceso a herramientas de análisis |

---

### **1️⃣4️⃣ AUDITORÍA** 📜

**Total Permisos:** 5  
**Código Módulo:** `audit`

| ID Permiso | Nombre | Descripción |
|------------|--------|-------------|
| `audit.view` | Ver Logs | Consultar logs de auditoría del sistema |
| `audit.export` | Exportar Logs | Descargar registros de auditoría |
| `audit.analyze` | Analizar Actividad | Análisis de seguridad y comportamiento |
| `audit.security` | Gestión de Seguridad | Administrar políticas de seguridad |
| `audit.compliance` | Cumplimiento Normativo | Verificar cumplimiento de normativas |

---

### **1️⃣5️⃣ ROLES Y PERMISOS** 🛡️

**Total Permisos:** 6  
**Código Módulo:** `roles`

| ID Permiso | Nombre | Descripción |
|------------|--------|-------------|
| `roles.view` | Ver Roles | Consultar roles del sistema |
| `roles.create` | Crear Roles | Crear nuevos roles personalizados |
| `roles.edit` | Editar Roles | Modificar roles existentes |
| `roles.delete` | Eliminar Roles | Eliminar roles del sistema |
| `roles.assign_permissions` | Asignar Permisos | Configurar permisos de roles |
| `roles.manage_access` | Gestionar Accesos | Administrar control de acceso |

---

### **1️⃣6️⃣ ADMINISTRACIÓN** ⚙️

**Total Permisos:** 6  
**Código Módulo:** `admin`

| ID Permiso | Nombre | Descripción |
|------------|--------|-------------|
| `admin.settings` | Configuración General | Ajustes generales del sistema |
| `admin.backup` | Respaldos | Gestionar backups del sistema |
| `admin.maintenance` | Mantenimiento | Modo de mantenimiento y actualizaciones |
| `admin.integrations` | Integraciones | Configurar integraciones externas |
| `admin.notifications` | Notificaciones Sistema | Gestionar notificaciones globales |
| `admin.database` | Gestión de Base de Datos | Administración avanzada de BD |

---

## 👤 **PERMISOS POR ROL**

### **🎓 ESTUDIANTE**

**Total Permisos:** 11

```typescript
- users.view
- students.view
- students.grades
- calendar.view
- community.view
- community.post
- community.groups
- jobs.view
- documents.view
- documents.upload
- certificates.view
- org.view_sedes
```

---

### **👨‍🏫 DOCENTE**

**Total Permisos:** 17

```typescript
- users.view
- students.view
- students.grades
- students.attendance
- calendar.view
- calendar.create_events
- professors.view
- professors.view_schedule
- community.view
- community.post
- community.events
- community.announcements
- documents.view
- documents.validate
- reports.view
- org.view_sedes
- org.view_territorial
```

---

### **🏆 GRADUADO**

**Total Permisos:** 8

```typescript
- users.view
- graduates.view
- graduates.certificates
- community.view
- community.post
- community.groups
- jobs.view
- certificates.view
- org.view_sedes
```

---

### **📝 ASPIRANTE**

**Total Permisos:** 7

```typescript
- calendar.view
- org.view_sedes
- org.view_territorial
- enrollment.view
- documents.view
- documents.upload
- community.view
```

---

### **💼 ADMINISTRATIVO**

**Total Permisos:** 60+ (Gestión operativa completa)

**Incluye:**
- ✅ Todos los permisos de Usuarios
- ✅ Todos los permisos de Estructura Organizacional
- ✅ Todos los permisos de Estudiantes
- ✅ Todos los permisos de Graduados
- ✅ Todos los permisos de Profesores
- ✅ Todos los permisos de Calendario
- ✅ Todos los permisos de Certificados
- ✅ Todos los permisos de Comunidad
- ✅ Todos los permisos de Bolsa de Trabajo
- ✅ Todos los permisos de Matrículas
- ✅ Todos los permisos de Documentos
- ✅ Todos los permisos de Dashboard
- ✅ Mayoría de permisos de Reportes
- ✅ Permisos básicos de Auditoría

---

### **📄 GESTOR CERTIFICADOS LABORALES**

**Total Permisos:** 16 (Acceso especializado)

**Usuario:** `cerlaboral@esap.edu.co`

```typescript
// Certificados (COMPLETO)
- certificates.view
- certificates.generate
- certificates.approve
- certificates.verify
- certificates.export
- certificates.manage_templates

// Dashboard (SOLO CERTIFICADOS)
- dashboard.view_general
- dashboard.export_metrics

// Auditoría (SOLO CERTIFICADOS)
- audit.view
- audit.export

// Reportes (SOLO CERTIFICADOS)
- reports.view
- reports.export

// Estructura (VISTA LIMITADA)
- org.view_sedes
- org.view_territorial
```

---

### **👔 DIRECTOR TERRITORIAL**

**Total Permisos:** 40+

**Incluye:**
- ✅ Gestión completa de su territorial
- ✅ Gestión de todas las sedes de su territorial
- ✅ Ver y exportar usuarios de su territorial
- ✅ Dashboard con métricas de su territorial
- ✅ Reportes y analíticas de su territorial
- ✅ Gestión académica completa
- ✅ Aprobación de certificados
- ✅ Auditoría de su territorial

---

### **🏛️ RECTOR / DIRECTOR NACIONAL**

**Total Permisos:** TODOS (120+)

```typescript
✅ ACCESO TOTAL AL SISTEMA
- Todos los módulos
- Todos los permisos
- Gestión a nivel nacional
```

---

## 🔐 **MATRIZ DE ACCESO POR NIVEL**

### **Nacional**
- Puede ver TODAS las territoriales y sedes
- Acceso total a todos los módulos
- Dashboard con métricas nacionales

### **Territorial**
- Puede ver su territorial y TODAS sus sedes
- Gestión completa de su territorial
- Dashboard con métricas de su territorial

### **Sede**
- Solo puede ver su sede específica
- Gestión limitada a su sede
- Dashboard con métricas de su sede

### **Local**
- Acceso solo a información propia
- Sin capacidad de gestión
- Vista limitada de datos

---

## 📈 **ESTADÍSTICAS DEL SISTEMA**

| Métrica | Valor |
|---------|-------|
| **Total Módulos** | 16 |
| **Total Permisos** | 120+ |
| **Roles Predefinidos** | 8 |
| **Nuevos Módulos Nov 2025** | 3 |
| **Módulos Actualizados** | 13 |
| **Territoriales en Colombia** | 17 |
| **Sedes en Colombia** | 71+ |

---

## ✅ **CHANGELOG - NOVIEMBRE 2025**

### **✨ NUEVOS MÓDULOS**
1. **Estructura Organizacional** (7 permisos)
   - Gestión de territoriales y sedes
   - Jerarquía Nacional > Territorial > Sede

2. **Gestión Profesoral** (6 permisos)
   - Administración de docentes
   - Carga académica

3. **Calendario Académico ESAP 2026** (6 permisos)
   - Periodos 2026-1, 2026-2, 2026-3
   - Gestión de eventos académicos

### **🔄 MÓDULOS ACTUALIZADOS**
1. **Usuarios y Personas** - Agregado modelo Usuario Persona
2. **Certificados Laborales** - Acceso especializado cerlaboral@
3. **Dashboard Ejecutivo** - Métricas por sede y territorial
4. **Comunidad ESAP** - Nuevas funcionalidades sociales
5. **Todos los módulos** - Integración con estructura organizacional

---

## 📚 **DOCUMENTOS RELACIONADOS**

- ✅ `/components/esap/RolesPermissionsModuleComplete.tsx` - Código del módulo
- ✅ `/docs/DIFERENCIA_TERRITORIAL_VS_SEDE.md` - Guía de estructura
- ✅ `/docs/ESTRUCTURA_ORGANIZACIONAL_GUIA.md` - Documentación completa
- ✅ `/types/index.ts` - Definiciones TypeScript

---

**Última Actualización:** 30 de Noviembre, 2025  
**Responsable:** Sistema de Gestión de Permisos ESAP  
**Versión:** 2.0.0
