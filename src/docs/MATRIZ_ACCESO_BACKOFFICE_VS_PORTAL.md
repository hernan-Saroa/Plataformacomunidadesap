# 🔐 **MATRIZ DE ACCESO: BACKOFFICE vs PORTAL TRANSACCIONAL**

**Fecha:** 30 de Noviembre, 2025  
**Versión:** 2.0.0

---

## 📋 **TABLA DE CONTENIDO**

1. [Diferencias entre Sistemas](#diferencias-entre-sistemas)
2. [Permisos del Dashboard Ejecutivo](#permisos-del-dashboard-ejecutivo)
3. [Matriz de Acceso por Rol](#matriz-de-acceso-por-rol)
4. [Permisos Backoffice](#permisos-backoffice)
5. [Permisos Portal Transaccional](#permisos-portal-transaccional)

---

## 🎯 **1. DIFERENCIAS ENTRE SISTEMAS**

### **BACKOFFICE ADMINISTRATIVO** 🏢
```
┌────────────────────────────────────────────────┐
│  SISTEMA ADMINISTRATIVO ESAP                   │
│  Desktop-First, Gestión Interna                │
├────────────────────────────────────────────────┤
│  👤 USUARIOS:                                  │
│  • Administrativos                             │
│  • Directivos                                  │
│  • Personal autorizado                         │
│                                                 │
│  🎯 PROPÓSITO:                                 │
│  • Gestión de usuarios                         │
│  • Administración académica                    │
│  • Reportes y analíticas                       │
│  • Control interno                             │
│  • Dashboard ejecutivo                         │
│  • Auditoría                                   │
│                                                 │
│  💻 ACCESO:                                    │
│  • URL: /backoffice                            │
│  • Requiere permisos administrativos           │
│  • Login discriminado por dominio @esap.edu.co │
└────────────────────────────────────────────────┘
```

### **PORTAL TRANSACCIONAL** 📱
```
┌────────────────────────────────────────────────┐
│  RED SOCIAL UNIVERSITARIA ESAP                 │
│  Mobile-First, Comunidad                       │
├────────────────────────────────────────────────┤
│  👤 USUARIOS:                                  │
│  • Estudiantes                                 │
│  • Docentes                                    │
│  • Graduados                                   │
│  • Aspirantes                                  │
│  • Comunidad ESAP                              │
│                                                 │
│  🎯 PROPÓSITO:                                 │
│  • Red social universitaria                    │
│  • Publicaciones y contenido                   │
│  • Eventos académicos                          │
│  • Bolsa de empleo                             │
│  • Servicios estudiantiles                     │
│  • Comunidad y networking                      │
│                                                 │
│  📱 ACCESO:                                    │
│  • URL: /portal                                │
│  • Abierto a comunidad ESAP                    │
│  • Login con cualquier email                   │
└────────────────────────────────────────────────┘
```

---

## 📊 **2. PERMISOS DEL DASHBOARD EJECUTIVO**

### **Dashboard Ejecutivo - Permisos Granulares (25 permisos)**

| ID Permiso | Nombre | Descripción | Categoría |
|------------|--------|-------------|-----------|
| **VISTAS GENERALES** ||||
| `dashboard.view` | Ver Dashboard | Acceso al dashboard ejecutivo | General |
| `dashboard.view_kpis` | Ver KPIs | Consultar indicadores clave | General |
| `dashboard.export` | Exportar Dashboard | Descargar reportes ejecutivos | General |
| **MÉTRICAS DE USUARIOS** ||||
| `dashboard.users_total` | Total Usuarios | Ver cantidad total de usuarios | Usuarios |
| `dashboard.users_active` | Usuarios Activos | Ver usuarios activos | Usuarios |
| `dashboard.users_growth` | Crecimiento Usuarios | Ver tendencia de crecimiento | Usuarios |
| `dashboard.users_retention` | Retención Usuarios | Ver tasa de retención | Usuarios |
| `dashboard.users_by_role` | Usuarios por Rol | Ver distribución por roles | Usuarios |
| `dashboard.users_by_location` | Usuarios por Ubicación | Ver usuarios por ciudad | Usuarios |
| `dashboard.users_by_device` | Usuarios por Dispositivo | Ver dispositivos usados | Usuarios |
| **MÉTRICAS DE SEDE/TERRITORIAL** ||||
| `dashboard.view_by_sede` | Métricas por Sede | Filtrar dashboard por sede | Organización |
| `dashboard.view_by_territorial` | Métricas por Territorial | Filtrar por dirección territorial | Organización |
| `dashboard.view_by_nacional` | Métricas Nacionales | Ver consolidado nacional | Organización |
| **MÉTRICAS ACADÉMICAS** ||||
| `dashboard.academic_programs` | Programas Académicos | Ver métricas de programas | Académico |
| `dashboard.students_metrics` | Métricas Estudiantes | Ver estadísticas de estudiantes | Académico |
| `dashboard.professors_metrics` | Métricas Profesores | Ver estadísticas de docentes | Académico |
| `dashboard.enrollment_metrics` | Métricas Matrículas | Ver datos de matrículas | Académico |
| **MÉTRICAS DE SISTEMA** ||||
| `dashboard.system_health` | Salud del Sistema | Ver uptime y performance | Sistema |
| `dashboard.api_metrics` | Métricas API | Ver llamadas API y errores | Sistema |
| `dashboard.security_metrics` | Métricas Seguridad | Ver alertas de seguridad | Sistema |
| **MÉTRICAS DE CERTIFICADOS** ||||
| `dashboard.certificates_labor` | Certificados Laborales | Ver métricas de cert. laborales | Certificados |
| `dashboard.certificates_academic` | Certificados Académicos | Ver métricas de cert. académicos | Certificados |
| `dashboard.certificates_graduates` | Certificados Graduados | Ver verificación de títulos | Certificados |
| **ANÁLISIS AVANZADO** ||||
| `dashboard.real_time` | Datos Tiempo Real | Acceso a métricas en vivo | Avanzado |
| `dashboard.custom_reports` | Reportes Personalizados | Crear reportes customizados | Avanzado |

---

## 👥 **3. MATRIZ DE ACCESO POR ROL**

### **TABLA RESUMEN**

| Rol | Backoffice | Portal | Dashboard | Total Permisos |
|-----|------------|--------|-----------|----------------|
| **Super Admin** | ✅ TOTAL | ✅ TOTAL | ✅ TOTAL | 175+ |
| **Rector/Director Nacional** | ✅ TOTAL | ✅ TOTAL | ✅ TOTAL | 175+ |
| **Director Territorial** | ✅ LIMITADO | ✅ SI | ✅ FILTRADO | 60+ |
| **Administrativo** | ✅ TOTAL | ❌ NO | ✅ COMPLETO | 130+ |
| **Gestor Cert. Laborales** | ✅ RESTRINGIDO | ❌ NO | ✅ FILTRADO | 18 |
| **Docente** | ⚠️ CONSULTA | ✅ SI | ⚠️ LIMITADO | 25+ |
| **Estudiante** | ❌ NO | ✅ SI | ❌ NO | 20+ |
| **Graduado** | ❌ NO | ✅ SI | ❌ NO | 15+ |
| **Aspirante** | ❌ NO | ⚠️ LIMITADO | ❌ NO | 10+ |

---

## 🏢 **4. PERMISOS BACKOFFICE (Solo Administrativos)**

### **ROL: SUPER ADMIN**

#### **Acceso a Sistemas:**
```
✅ Backoffice: TOTAL (todos los módulos)
✅ Portal Transaccional: TOTAL (moderación)
✅ Dashboard Ejecutivo: TOTAL (todos los KPIs)
```

#### **Permisos Backoffice (175+ permisos):**

**1. Usuarios y Personas (12):**
```typescript
✅ users.view
✅ users.create
✅ users.edit
✅ users.delete
✅ users.export
✅ users.assign_roles
✅ users.assign_territorial
✅ users.assign_sede
✅ users.manage_persona
✅ users.view_enrollment
✅ users.activate_deactivate
✅ users.import
```

**2. Estructura Organizacional (10):**
```typescript
✅ org.view_territorial
✅ org.view_sedes
✅ org.create_sede
✅ org.edit_sede
✅ org.delete_sede
✅ org.assign_users
✅ org.view_hierarchy
✅ org.export_structure
✅ org.manage_territorial
✅ org.view_map
```

**3-19. Todos los demás módulos...**

#### **Permisos Portal (Moderación Total):**
```typescript
✅ portal.moderate_all
✅ portal.delete_content
✅ portal.ban_users
✅ portal.manage_reports
✅ portal.view_analytics
```

#### **Permisos Dashboard (25):**
```typescript
✅ dashboard.* (TODOS)
```

---

### **ROL: RECTOR / DIRECTOR NACIONAL**

#### **Acceso a Sistemas:**
```
✅ Backoffice: TOTAL
✅ Portal Transaccional: TOTAL
✅ Dashboard Ejecutivo: TOTAL (nivel nacional)
```

#### **Permisos:**
- **Backoffice:** TODOS (igual que Super Admin)
- **Portal:** TODOS (moderación completa)
- **Dashboard:** TODOS (vista nacional consolidada)

---

### **ROL: DIRECTOR TERRITORIAL**

#### **Acceso a Sistemas:**
```
✅ Backoffice: LIMITADO (solo su territorial)
✅ Portal Transaccional: SI (su territorial)
✅ Dashboard Ejecutivo: FILTRADO (solo su territorial)
```

#### **Permisos Backoffice (60+):**

**Filtros Automáticos:**
- Solo puede ver/gestionar usuarios de SU territorial
- Solo puede ver/gestionar sedes de SU territorial
- Dashboard filtrado por SU territorial

**Permisos Específicos:**
```typescript
// Usuarios (filtrados)
✅ users.view                    // Solo su territorial
✅ users.create                  // Solo su territorial
✅ users.edit                    // Solo su territorial
✅ users.assign_sede            // Solo sedes de su territorial
✅ users.export                 // Solo su territorial

// Estructura (su territorial)
✅ org.view_territorial         // Solo SU territorial
✅ org.view_sedes              // Solo sedes de SU territorial
✅ org.manage_sedes            // Solo sedes de SU territorial

// Académico (filtrado)
✅ students.view               // Solo su territorial
✅ students.export             // Solo su territorial
✅ professors.view             // Solo su territorial

// Dashboard (filtrado)
✅ dashboard.view_by_territorial  // SOLO SU TERRITORIAL
✅ dashboard.view_by_sede         // Solo sedes de SU territorial
✅ dashboard.export               // Reportes de SU territorial
```

---

### **ROL: ADMINISTRATIVO**

#### **Acceso a Sistemas:**
```
✅ Backoffice: TOTAL (gestión operativa)
❌ Portal Transaccional: NO (no es usuario final)
✅ Dashboard Ejecutivo: COMPLETO
```

#### **Permisos Backoffice (130+):**

**Módulos con Acceso TOTAL:**
- ✅ Usuarios y Personas (12)
- ✅ Estructura Organizacional (10)
- ✅ Programas Académicos (10)
- ✅ Estudiantes (8)
- ✅ Graduados (7)
- ✅ Profesores (12)
- ✅ Calendario Académico (8)
- ✅ Certificados Laborales (10)
- ✅ Aspirantes (9)
- ✅ Control Interno (11)
- ✅ Comunidad (moderación) (9)
- ✅ Bolsa de Empleo (7)
- ✅ Certificados Académicos (6)
- ✅ Documentos (5)
- ✅ Reportes (7)

**Módulos con Acceso LIMITADO:**
- ⚠️ Auditoría (solo lectura)
- ⚠️ Roles (solo consulta)
- ⚠️ Administración (sin acceso)

#### **Permisos Dashboard (20):**
```typescript
✅ dashboard.view
✅ dashboard.view_kpis
✅ dashboard.users_*           // Todos los de usuarios
✅ dashboard.academic_*        // Todos los académicos
✅ dashboard.certificates_*    // Todos los de certificados
✅ dashboard.view_by_sede
✅ dashboard.view_by_territorial
✅ dashboard.export
```

---

### **ROL: GESTOR CERTIFICADOS LABORALES**

**Usuario Especial:** `cerlaboral@esap.edu.co`

#### **Acceso a Sistemas:**
```
✅ Backoffice: SOLO Certificados Laborales
❌ Portal Transaccional: NO
✅ Dashboard Ejecutivo: SOLO métricas de certificados
```

#### **Permisos Backoffice (18 permisos):**

```typescript
// SOLO Certificados Laborales (10)
✅ cert_labor.view
✅ cert_labor.create
✅ cert_labor.generate
✅ cert_labor.approve
✅ cert_labor.verify
✅ cert_labor.export
✅ cert_labor.manage_templates
✅ cert_labor.view_stats
✅ cert_labor.send_notification
✅ cert_labor.download_pdf

// Dashboard (FILTRADO - 3)
✅ dashboard.view
✅ dashboard.certificates_labor      // SOLO certificados laborales
✅ dashboard.export                  // SOLO reportes de cert. laborales

// Auditoría (FILTRADO - 2)
✅ audit.view                        // SOLO logs de certificados
✅ audit.export                      // SOLO logs de certificados

// Reportes (FILTRADO - 2)
✅ reports.view                      // SOLO reportes de certificados
✅ reports.export                    // SOLO reportes de certificados

// Estructura (SOLO VISTA - 2)
✅ org.view_sedes
✅ org.view_territorial
```

**Restricciones Importantes:**
- ❌ NO puede acceder a otros módulos
- ❌ NO puede ver dashboard general
- ❌ NO puede gestionar usuarios
- ❌ NO puede acceder a portal transaccional
- ✅ Dashboard muestra SOLO métricas de certificados laborales

---

### **ROL: DOCENTE**

#### **Acceso a Sistemas:**
```
⚠️ Backoffice: SOLO CONSULTA (académico)
✅ Portal Transaccional: TOTAL
⚠️ Dashboard Ejecutivo: LIMITADO (académico)
```

#### **Permisos Backoffice (15 permisos):**

```typescript
// Estudiantes (SOLO CONSULTA)
✅ students.view
✅ students.grades              // Puede gestionar calificaciones
✅ students.attendance          // Puede registrar asistencia

// Profesores (SOLO CONSULTA)
✅ students.view
✅ professors.view_schedule     // Solo su horario

// Calendario
✅ calendar.view
✅ calendar.create_events       // Solo eventos académicos

// Comunidad (MODERACIÓN)
✅ community.view
✅ community.post
✅ community.moderate          // Moderar contenido de estudiantes

// Reportes (LIMITADO)
✅ reports.view               // Solo reportes académicos

// Documentos
✅ documents.view
✅ documents.validate

// Estructura
✅ org.view_sedes
✅ org.view_territorial
```

#### **Permisos Portal Transaccional (20+):**
```typescript
✅ portal.view
✅ portal.create_post
✅ portal.create_event
✅ portal.moderate_content      // Moderación académica
✅ portal.view_students
✅ portal.messaging
✅ portal.groups
✅ portal.announcements        // Anuncios de clase
```

#### **Permisos Dashboard (5):**
```typescript
✅ dashboard.view
✅ dashboard.students_metrics   // Solo sus estudiantes
✅ dashboard.academic_programs  // Solo sus materias
✅ dashboard.professors_metrics // Solo su desempeño
✅ dashboard.export            // Solo sus reportes
```

---

## 📱 **5. PERMISOS PORTAL TRANSACCIONAL (Solo Usuarios Finales)**

### **ROL: ESTUDIANTE**

#### **Acceso a Sistemas:**
```
❌ Backoffice: NO
✅ Portal Transaccional: TOTAL
❌ Dashboard Ejecutivo: NO
```

#### **Permisos Portal (20+):**

```typescript
// PERFIL Y USUARIO
✅ portal.view_profile
✅ portal.edit_profile
✅ portal.view_users

// RED SOCIAL
✅ portal.view_feed
✅ portal.create_post
✅ portal.like_post
✅ portal.comment_post
✅ portal.share_post

// GRUPOS Y COMUNIDAD
✅ portal.join_groups
✅ portal.view_groups
✅ portal.participate_groups

// EVENTOS
✅ portal.view_events
✅ portal.register_event
✅ portal.create_event           // Eventos estudiantiles

// ACADÉMICO
✅ portal.view_grades
✅ portal.view_schedule
✅ portal.view_calendar
✅ portal.view_program

// SERVICIOS
✅ portal.view_jobs              // Bolsa de empleo
✅ portal.apply_job
✅ portal.request_certificate    // Certificados académicos
✅ portal.view_documents         // Carpeta digital
✅ portal.upload_documents

// MENSAJERÍA
✅ portal.send_messages
✅ portal.view_messages

// NOTIFICACIONES
✅ portal.view_notifications
✅ portal.configure_notifications
```

---

### **ROL: GRADUADO**

#### **Acceso a Sistemas:**
```
❌ Backoffice: NO
✅ Portal Transaccional: SI
❌ Dashboard Ejecutivo: NO
```

#### **Permisos Portal (15+):**

```typescript
// RED SOCIAL (Limitado)
✅ portal.view_feed
✅ portal.create_post
✅ portal.view_groups
✅ portal.join_groups           // Grupos de egresados

// SERVICIOS GRADUADOS
✅ portal.view_jobs             // Bolsa de empleo
✅ portal.apply_job
✅ portal.post_job              // Puede publicar ofertas
✅ portal.request_certificate   // Certificados de título
✅ portal.verify_degree         // Verificar título

// EVENTOS
✅ portal.view_events
✅ portal.register_event        // Eventos para egresados

// PERFIL
✅ portal.view_profile
✅ portal.edit_profile
✅ portal.alumni_network        // Red de egresados

// MENSAJERÍA
✅ portal.send_messages
✅ portal.view_messages
```

---

### **ROL: ASPIRANTE**

#### **Acceso a Sistemas:**
```
❌ Backoffice: NO
⚠️ Portal Transaccional: LIMITADO
❌ Dashboard Ejecutivo: NO
```

#### **Permisos Portal (10+):**

```typescript
// INFORMACIÓN GENERAL
✅ portal.view_programs         // Ver programas académicos
✅ portal.view_calendar         // Calendario académico
✅ portal.view_sedes            // Ver sedes

// PROCESO DE ADMISIÓN
✅ portal.view_admission
✅ portal.upload_documents      // Documentos de inscripción
✅ portal.view_application_status

// LIMITADO - NO PUEDE:
❌ portal.create_post          // No puede publicar
❌ portal.join_groups          // No puede unirse a grupos
❌ portal.view_feed            // No ve feed social
❌ portal.send_messages        // No puede enviar mensajes

// PUEDE VER (solo lectura)
✅ portal.view_events          // Solo información
✅ portal.view_public_info     // Info pública

// PERFIL BÁSICO
✅ portal.view_profile
✅ portal.edit_profile         // Solo datos básicos
```

---

## 🔒 **REGLAS DE SEGURIDAD**

### **1. Segregación de Sistemas**

```typescript
// BACKOFFICE
if (userEmail.endsWith('@esap.edu.co')) {
  // Puede acceder a Backoffice SI tiene rol administrativo
  if (hasAdminRole) {
    grantBackofficeAccess();
  }
}

// PORTAL TRANSACCIONAL
if (hasValidESAPRole) {
  // Estudiantes, Docentes, Graduados, Aspirantes
  grantPortalAccess();
}
```

### **2. Filtrado por Jerarquía**

```typescript
// Director Territorial
if (role === 'Director Territorial') {
  filterBy: {
    territorial: user.territorial,  // Solo SU territorial
    sedes: user.territorial.sedes   // Solo sedes de SU territorial
  }
}

// Administrativo
if (role === 'Administrativo') {
  filterBy: {
    // Sin filtros, ve TODO
  }
}

// Gestor Certificados Laborales
if (role === 'Gestor Certificados Laborales') {
  filterBy: {
    module: 'certificados_laborales',  // SOLO certificados
    dashboardKPIs: ['certificates_labor'] // SOLO KPI de certificados
  }
}
```

### **3. Restricción de Dashboard**

```typescript
// Dashboard por Rol
const dashboardAccess = {
  'Super Admin': {
    kpis: 'ALL',
    filters: ['nacional', 'territorial', 'sede'],
    realTime: true
  },
  'Director Territorial': {
    kpis: 'ALL',
    filters: ['territorial', 'sede'],  // Solo SU territorial
    realTime: true,
    autoFilter: user.territorial
  },
  'Administrativo': {
    kpis: ['users_*', 'academic_*', 'certificates_*'],
    filters: ['nacional', 'territorial', 'sede'],
    realTime: false
  },
  'Gestor Certificados Laborales': {
    kpis: ['certificates_labor'],  // SOLO certificados laborales
    filters: [],
    realTime: false,
    restrictedModule: 'certificados_laborales'
  },
  'Docente': {
    kpis: ['students_metrics', 'academic_programs'],
    filters: [],
    realTime: false
  }
};
```

---

## 📊 **RESUMEN ESTADÍSTICO**

| Sistema | Total Permisos | Roles con Acceso |
|---------|----------------|------------------|
| **Backoffice** | 150+ | 5 (Admin, Rector, Director, Gestor Cert, Docente*) |
| **Portal Transaccional** | 40+ | 4 (Estudiante, Graduado, Docente, Aspirante) |
| **Dashboard Ejecutivo** | 25 | 5 (Admin, Rector, Director, Gestor Cert*, Docente*) |

**Notas:**
- (*) Acceso limitado o filtrado
- Director Territorial: acceso filtrado por su territorial
- Gestor Cert. Laborales: solo certificados laborales
- Docente: solo consulta académica

---

## ✅ **VALIDACIÓN DE ACCESO**

### **Checklist por Rol:**

**✅ Super Admin:**
- [x] Backoffice TOTAL
- [x] Portal TOTAL (moderación)
- [x] Dashboard TOTAL (25 KPIs)
- [x] 175+ permisos

**✅ Rector/Director Nacional:**
- [x] Backoffice TOTAL
- [x] Portal TOTAL
- [x] Dashboard Nacional (25 KPIs)
- [x] 175+ permisos

**✅ Director Territorial:**
- [x] Backoffice FILTRADO (solo su territorial)
- [x] Portal SI
- [x] Dashboard FILTRADO (solo su territorial)
- [x] 60+ permisos

**✅ Administrativo:**
- [x] Backoffice TOTAL (gestión)
- [ ] Portal NO
- [x] Dashboard COMPLETO (20 KPIs)
- [x] 130+ permisos

**✅ Gestor Certificados Laborales:**
- [x] Backoffice SOLO certificados laborales
- [ ] Portal NO
- [x] Dashboard SOLO certificados (3 KPIs)
- [x] 18 permisos

**✅ Docente:**
- [x] Backoffice CONSULTA (académico)
- [x] Portal SI
- [x] Dashboard LIMITADO (5 KPIs)
- [x] 15 permisos Backoffice + 20 permisos Portal

**✅ Estudiante:**
- [ ] Backoffice NO
- [x] Portal SI
- [ ] Dashboard NO
- [x] 20+ permisos Portal

**✅ Graduado:**
- [ ] Backoffice NO
- [x] Portal SI
- [ ] Dashboard NO
- [x] 15+ permisos Portal

**✅ Aspirante:**
- [ ] Backoffice NO
- [x] Portal LIMITADO
- [ ] Dashboard NO
- [x] 10+ permisos Portal

---

**Elaborado por:** Sistema de Seguridad ESAP  
**Versión:** 2.0.0  
**Estado:** ✅ COMPLETO
