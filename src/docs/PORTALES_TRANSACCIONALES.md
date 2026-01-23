# 🌐 PORTALES TRANSACCIONALES - ARQUITECTURA ESAP

## 📋 Contenido

1. [Visión General](#visión-general)
2. [Portales Identificados](#portales-identificados)
3. [Arquitectura de Portales](#arquitectura-de-portales)
4. [Integración con Módulos](#integración-con-módulos)
5. [Flujos de Usuario](#flujos-de-usuario)

---

## 🎯 Visión General

Los **Portales Transaccionales** son interfaces especializadas diseñadas para usuarios finales que necesitan:

✅ **Acceso autoservicio** a funcionalidades específicas  
✅ **Experiencia simplificada** sin complejidad administrativa  
✅ **Operaciones transaccionales** (consultas, solicitudes, firmas)  
✅ **Responsive y mobile-first** para acceso desde cualquier dispositivo  
✅ **Seguridad** con autenticación y permisos específicos  

---

## 🏛️ Portales Identificados en el Proyecto

### 1. 🌐 **Portal Público** 
**Ubicación:** `/components/portal/`

**Usuarios:** Ciudadanía, aspirantes, público general  
**Sin autenticación requerida**

#### Componentes Principales:
```
components/portal/
├── UnifiedPortalViewV5.tsx          # Vista principal unificada
├── LandingPage.tsx                  # Landing page institucional
├── LoginPage.tsx                    # Inicio de sesión
├── EnrollmentQRLandingUnified.tsx   # Landing de enrolamiento QR
├── PublicCertificateValidation.tsx  # Validación pública de certificados
├── PublicTitleVerification.tsx      # Verificación pública de títulos
├── ValidadorCertificadosPublico.tsx # Validador general
└── PublicNavbar.tsx                 # Navegación pública
```

#### Funcionalidades:
- ✅ Consulta de información institucional
- ✅ Validación de certificados laborales (QR)
- ✅ Verificación de títulos de grado
- ✅ Enrolamiento con QR para nuevos usuarios
- ✅ Solicitud de información
- ✅ Acceso a contenido público

---

### 2. 👤 **Portal Transaccional de Usuario Autenticado**
**Ubicación:** `/components/portal/`

**Usuarios:** Estudiantes, docentes, administrativos, egresados  
**Requiere autenticación**

#### Componentes Principales:
```
components/portal/
├── PortalDashboard.tsx              # Dashboard principal autenticado
├── AuthenticatedPortalNavbar.tsx    # Navbar autenticado
├── PerfilUsuarioEditable.tsx        # Perfil editable
├── ProfilePage.tsx                  # Página de perfil
├── RoleSelector.tsx                 # Selector de rol activo
├── NotificacionesDropdown.tsx       # Notificaciones del usuario
├── SolicitarCertificadoLaboral.tsx  # Solicitud de certificado laboral
├── SolicitarCertificadoVerificacion.tsx  # Solicitud de verificación
├── CertificadosLaboralesPortal.tsx  # Mis certificados
├── JobBoardPortal.tsx               # Bolsa de empleo
├── CapacitacionesDisponibles.tsx    # Capacitaciones
└── DocentesSection.tsx              # Sección docentes
```

#### Funcionalidades:
- ✅ Dashboard personalizado por rol
- ✅ Gestión de perfil personal
- ✅ Solicitud de certificados laborales
- ✅ Consulta de mis certificados
- ✅ Acceso a bolsa de empleo
- ✅ Inscripción a capacitaciones
- ✅ Consulta de noticias y eventos
- ✅ Gestión de notificaciones

---

### 3. 🔍 **Portal Transaccional de Control Interno** (Usuario Auditado)
**Ubicación:** `/components/esap/control-interno/`

**Usuarios:** Jefes de área, responsables de procesos auditados  
**Requiere autenticación + rol de área auditada**

#### Componentes Principales:
```
components/esap/control-interno/
├── PortalTransaccionalUsuarioMD3.tsx    # Portal Material Design 3 ⭐
├── PortalUsuarioAuditado.tsx            # Portal usuario auditado
└── portal/control-interno/
    └── DashboardAreaAuditada.tsx        # Dashboard área auditada
```

#### Funcionalidades:
- ✅ **Mis Auditorías Asignadas**
  - Ver auditorías donde mi área es auditada
  - Consultar estado de auditorías
  - Ver hallazgos identificados
  
- ✅ **Mis Planes de Mejoramiento**
  - Consultar planes asignados a mi área
  - Cargar evidencias de cumplimiento
  - Actualizar estado de avance
  - Agregar comentarios y notas
  
- ✅ **Mis Tareas**
  - Ver tareas asignadas de planes de mejoramiento
  - Marcar tareas como completadas
  - Adjuntar documentos de soporte
  
- ✅ **Comunicaciones**
  - Recibir notificaciones de auditorías
  - Responder solicitudes de información
  - Chat con auditores
  
- ✅ **Dashboard de Cumplimiento**
  - Semáforo de estado de mis procesos
  - Indicadores de cumplimiento
  - Alertas de vencimientos

#### Servicios Disponibles:
```typescript
interface ServicioPortal {
  id: string;
  titulo: string;
  descripcion: string;
  icono: ReactNode;
  ruta: string;
  badge?: string | number;
  color: string;
}

const SERVICIOS_PORTAL = [
  {
    id: 'auditorias',
    titulo: 'Mis Auditorías',
    descripcion: 'Auditorías donde mi área es auditada',
    ruta: '/auditorias',
    badge: auditoriasPendientes,
  },
  {
    id: 'planes-mejoramiento',
    titulo: 'Planes de Mejoramiento',
    descripcion: 'Planes asignados y seguimiento',
    ruta: '/planes',
    badge: planesPendientes,
  },
  // ... más servicios
];
```

---

### 4. ✍️ **Portal Transaccional de Firma Electrónica**
**Ubicación:** `/components/esap/firma-electronica/`

**Usuarios:** Firmantes autorizados (directores, jefes, coordinadores)  
**Requiere autenticación + permiso de firma**

#### Componentes Principales:
```
components/esap/firma-electronica/
├── PortalTransaccionalFirmaCompleto.tsx  # Portal completo de firma ⭐
├── PortalTransaccionalFirma.tsx          # Portal simplificado
├── VisorDocumentoFirmaOTP.tsx            # Visor con OTP
└── TabsDocumentosConHistorial.tsx        # Tabs pendientes/historial
```

#### Funcionalidades:
- ✅ **Documentos Pendientes de Firma**
  - Listado de documentos asignados para mi firma
  - Vista previa de documentos PDF
  - Información del flujo de firmas
  - Semáforo de tiempo de respuesta
  
- ✅ **Firmar Documento**
  - Visualización completa del documento
  - Validación con OTP enviado al correo
  - Firma electrónica con certificado digital
  - Metadata de trazabilidad
  
- ✅ **Devolver Documento**
  - Rechazar documento con justificación
  - Solicitar correcciones
  - Agregar comentarios
  
- ✅ **Historial de Firmas**
  - Documentos que he firmado
  - Certificados de firma descargables
  - Trazabilidad completa
  - Búsqueda y filtros
  
- ✅ **Estadísticas Personales**
  - Documentos firmados este mes
  - Tiempo promedio de respuesta
  - Documentos pendientes
  - Histórico de firmas

#### Flujo de Firma con OTP:
```typescript
// Flujo de firma electrónica
const pasosFirma = [
  'documento',    // 1. Ver documento completo
  'firma',        // 2. Ingresar datos de firma
  'otp',          // 3. Validar código OTP
  'completado'    // 4. Firma exitosa
];

// Validación OTP
const validarOTP = async (codigo: string) => {
  // Enviar código al backend para validación
  const response = await api.post('/firma/validar-otp', { codigo });
  
  if (response.ok) {
    // Aplicar firma electrónica
    await aplicarFirma(documento);
  }
};
```

---

### 5. 👨‍🏫 **Portal Transaccional de Gestión Profesoral** (PTA)
**Ubicación:** `/components/portal/gestion-profesoral/`

**Usuarios:** Docentes para crear/gestionar su PTA  
**Requiere autenticación + rol docente**

#### Componentes Principales:
```
components/portal/gestion-profesoral/
├── DocentesPTAPortal.tsx             # Portal principal docentes
├── MiPTADashboardV3.tsx              # Dashboard Mi PTA
├── PTAAppWithSearch.tsx              # App con búsqueda
├── BandejaAprobadores.tsx            # Bandeja aprobadores
├── ModalAgregarAsignatura.tsx        # Agregar asignatura
├── ModalEnviarAprobacion.tsx         # Enviar a aprobación
└── PTAWizardProgress.tsx             # Wizard de progreso
```

#### Funcionalidades:
- ✅ **Mi PTA**
  - Crear nuevo PTA (Plan de Trabajo Académico)
  - Editar PTA en borrador
  - Ver estado de aprobación
  - Consultar historial de PTAs
  
- ✅ **Actividades Docencia**
  - Agregar asignaturas y grupos
  - Calcular horas de docencia directa
  - Prorrateo automático de horas
  
- ✅ **Actividades Investigación**
  - Registrar proyectos de investigación
  - Asignar horas semanales
  
- ✅ **Actividades Extensión**
  - Registrar actividades de proyección social
  - Distribución de horas
  
- ✅ **Actividades Complementarias**
  - Comités, tutorías, asesorías
  - Gestión administrativa
  
- ✅ **Enviar a Aprobación**
  - Validación de 40 horas semanales
  - Selección de aprobador
  - Envío con notificación
  
- ✅ **Dashboard de Aprobadores**
  - Ver PTAs pendientes de aprobar
  - Aprobar o rechazar PTAs
  - Solicitar correcciones
  - Historial de aprobaciones

---

### 6. 🏢 **Portal de Integración - Arquitectura Empresarial**
**Ubicación:** `/components/arquitectura-empresarial/`

**Usuarios:** Líderes de proyectos TI, coordinadores  
**Requiere autenticación + rol en proyectos AE**

#### Componentes Principales:
```
components/arquitectura-empresarial/
└── IntegracionPortalTransaccional.tsx  # Portal de tareas AE
```

#### Funcionalidades:
- ✅ **Mis Tareas de AE**
  - Tareas asignadas en proyectos de Arquitectura Empresarial
  - Actualización de estado de tareas
  - Carga de entregables
  - Comentarios y colaboración

---

## 🏗️ Arquitectura de Portales

### Patrón de Diseño

Todos los portales transaccionales siguen el mismo patrón:

```
┌─────────────────────────────────────────────────────────┐
│  Portal Transaccional                                   │
│                                                         │
│  ┌───────────────────────────────────────────────┐     │
│  │  Navbar Personalizado                         │     │
│  │  • Logo ESAP                                  │     │
│  │  • Nombre del usuario                         │     │
│  │  • Notificaciones                             │     │
│  │  • Selector de rol (si aplica)                │     │
│  └───────────────────────────────────────────────┘     │
│                                                         │
│  ┌───────────────────────────────────────────────┐     │
│  │  Dashboard / Vista Principal                  │     │
│  │                                               │     │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐      │     │
│  │  │ Card 1  │  │ Card 2  │  │ Card 3  │      │     │
│  │  │ Métrica │  │ Métrica │  │ Métrica │      │     │
│  │  └─────────┘  └─────────┘  └─────────┘      │     │
│  │                                               │     │
│  │  ┌──────────────────────────────────┐        │     │
│  │  │  Listado de Servicios/Tareas     │        │     │
│  │  │  • Servicio 1    [Badge: 3]      │        │     │
│  │  │  • Servicio 2    [Badge: 1]      │        │     │
│  │  │  • Servicio 3                    │        │     │
│  │  └──────────────────────────────────┘        │     │
│  │                                               │     │
│  └───────────────────────────────────────────────┘     │
│                                                         │
│  ┌───────────────────────────────────────────────┐     │
│  │  Footer                                       │     │
│  └───────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────┘
```

### Características Comunes

Todos los portales transaccionales comparten:

1. **Autenticación Simplificada**
   ```typescript
   const { user, permissions } = useAuth();
   
   if (!user) {
     return <Redirect to="/login" />;
   }
   ```

2. **Navegación Minimalista**
   - Sin sidebar complejo
   - Navbar con opciones esenciales
   - Breadcrumbs para ubicación

3. **Dashboard con Métricas**
   ```typescript
   <MetricCard
     titulo="Documentos Pendientes"
     valor={documentosPendientes}
     icono={<FileText />}
     color="warning"
   />
   ```

4. **Listado de Servicios/Tareas**
   ```typescript
   {servicios.map(servicio => (
     <ServiceCard
       key={servicio.id}
       titulo={servicio.titulo}
       descripcion={servicio.descripcion}
       badge={servicio.badge}
       onClick={() => navigate(servicio.ruta)}
     />
   ))}
   ```

5. **Notificaciones en Tiempo Real**
   ```typescript
   const { notificaciones } = useNotifications();
   
   useEffect(() => {
     const unsubscribe = subscribeToNotifications(user.id);
     return unsubscribe;
   }, [user.id]);
   ```

6. **Responsive y Mobile-First**
   - Grid adaptativo
   - Touch-friendly
   - Optimizado para móviles

---

## 🔄 Integración con Módulos

### Relación Portal ↔ Módulo

```
┌──────────────────────────────────────────────────────────┐
│  MÓDULO ADMINISTRATIVO (Backoffice)                      │
│  • Vista completa de gestión                             │
│  • Todas las funcionalidades                             │
│  • Permisos de administrador/auditor                     │
└────────────────────┬─────────────────────────────────────┘
                     │
                     │ Datos compartidos
                     │ API común
                     │
┌────────────────────▼─────────────────────────────────────┐
│  PORTAL TRANSACCIONAL (Usuario Final)                    │
│  • Vista simplificada                                    │
│  • Funcionalidades específicas del usuario               │
│  • Autoservicio                                          │
└──────────────────────────────────────────────────────────┘
```

### Ejemplo: Control Interno

**Módulo Administrativo:**
- Ver TODAS las auditorías del sistema
- Crear programa anual de auditorías
- Asignar auditores
- Gestión completa de hallazgos
- Reportería avanzada

**Portal Transaccional:**
- Ver SOLO auditorías de MI área
- Consultar hallazgos de mi área
- Subir evidencias de cumplimiento
- Actualizar estado de mis tareas
- Ver mi semáforo de cumplimiento

### Compartir Servicios

```typescript
// shared/services/control-interno.service.ts
export class ControlInternoService {
  // Método usado por el módulo administrativo
  async getAllAuditorias() {
    return api.get('/auditorias');
  }
  
  // Método usado por el portal transaccional
  async getAuditoriasByArea(areaId: string) {
    return api.get(`/auditorias/area/${areaId}`);
  }
  
  // Método compartido
  async getAuditoriaById(id: string) {
    return api.get(`/auditorias/${id}`);
  }
}
```

---

## 👥 Flujos de Usuario

### Flujo 1: Usuario Auditado consulta su Plan de Mejoramiento

```
1. Login al sistema
   ↓
2. Sistema detecta rol "usuario-area-auditada"
   ↓
3. Redirige a PortalTransaccionalUsuarioMD3
   ↓
4. Dashboard muestra: 
   - 2 auditorías activas en mi área
   - 1 plan de mejoramiento pendiente
   - 5 tareas asignadas a mí
   ↓
5. Usuario hace click en "Planes de Mejoramiento"
   ↓
6. Ve el detalle del plan:
   - Hallazgos identificados
   - Acciones correctivas
   - Fechas de vencimiento
   - Estado actual
   ↓
7. Carga evidencias de cumplimiento
   ↓
8. Actualiza estado a "Completado"
   ↓
9. Notificación enviada al auditor
```

### Flujo 2: Docente crea su PTA

```
1. Login al sistema
   ↓
2. Selecciona rol "Docente"
   ↓
3. Accede a "Mi PTA"
   ↓
4. Click en "Crear Nuevo PTA"
   ↓
5. Wizard paso a paso:
   - Datos generales (período, sede)
   - Actividades de docencia (asignaturas)
   - Actividades de investigación
   - Actividades de extensión
   - Actividades complementarias
   ↓
6. Sistema valida 40 horas semanales
   ↓
7. Vista previa del PTA completo
   ↓
8. Envía a aprobación (selecciona aprobador)
   ↓
9. Notificación enviada al aprobador
   ↓
10. Estado del PTA: "En revisión"
```

### Flujo 3: Firmante firma documento electrónicamente

```
1. Login al sistema
   ↓
2. Accede a "Firma Electrónica"
   ↓
3. Ve 3 documentos pendientes de firma
   ↓
4. Abre documento "Resolución 2024-001"
   ↓
5. Vista previa del PDF completo
   ↓
6. Click en "Firmar Documento"
   ↓
7. Sistema envía OTP a su correo
   ↓
8. Ingresa código OTP recibido
   ↓
9. Sistema valida código
   ↓
10. Aplicación de firma electrónica
   ↓
11. Generación de certificado de firma
   ↓
12. Documento firmado y enviado al siguiente firmante
   ↓
13. Notificación de firma exitosa
```

---

## 🔐 Seguridad en Portales

### Control de Acceso

```typescript
// Portal Transaccional con guard
export function PortalTransaccionalControlInterno() {
  const { user, hasRole } = useAuth();
  
  // Verificar que el usuario tiene el rol correcto
  if (!hasRole('AREA_AUDITADA')) {
    return <AccessDenied message="Este portal es solo para usuarios de áreas auditadas" />;
  }
  
  // Obtener el área del usuario
  const areaId = user.areaId;
  
  // Solo mostrar datos del área del usuario
  const { auditorias } = useAuditoriasByArea(areaId);
  
  return (
    <div>
      {/* Portal content */}
    </div>
  );
}
```

### Filtrado de Datos

```typescript
// Backend API con filtrado automático
app.get('/api/auditorias/mis-auditorias', authenticate, async (req, res) => {
  const userId = req.user.id;
  const areaId = req.user.areaId;
  
  // Solo retornar auditorías del área del usuario
  const auditorias = await db.auditorias.findMany({
    where: {
      areaAuditadaId: areaId
    }
  });
  
  res.json(auditorias);
});
```

---

## 📊 Métricas de Portales

### KPIs por Portal

| Portal | Usuarios Activos | Transacciones/mes | Tiempo Promedio |
|--------|------------------|-------------------|-----------------|
| Público | ~50,000 | ~15,000 | 2 min |
| Usuario Autenticado | ~5,000 | ~25,000 | 8 min |
| Control Interno | ~150 | ~800 | 12 min |
| Firma Electrónica | ~80 | ~1,200 | 5 min |
| Gestión Profesoral | ~300 | ~1,800 | 25 min |

---

## 🚀 Próximos Pasos

### Migración a Micro-Frontends

Los portales transaccionales serán migrados como **submódulos** de sus módulos padre:

```
modules/
├── control-interno/
│   ├── components/
│   │   ├── admin/              # Backoffice administrativo
│   │   └── portal/             # Portal transaccional ⭐
│   │       └── PortalUsuarioAuditado.tsx
│   └── index.ts
```

### Mejoras Futuras

1. **PWA (Progressive Web App)**
   - Instalación en dispositivos móviles
   - Modo offline
   - Notificaciones push

2. **Notificaciones en Tiempo Real**
   - WebSockets
   - Server-Sent Events
   - Push notifications

3. **Personalización**
   - Temas por usuario
   - Dashboard configurable
   - Widgets personalizados

---

**Documento Técnico - Portales Transaccionales v1.0**  
**ESAP - Backoffice Administrativo ComUNIdad - Enero 2026**
