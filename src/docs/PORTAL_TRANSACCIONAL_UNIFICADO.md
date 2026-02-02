# 🌐 PORTAL TRANSACCIONAL UNIFICADO - ESAP

## 🎯 Visión General

El Backoffice ESAP debe tener **DOS puntos de entrada principales**:

### 1. 🌍 **Portal Público** (Sin autenticación)
- Validación de certificados
- Verificación de títulos
- Información institucional
- Enrolamiento inicial

### 2. 🔐 **Portal Transaccional Unificado** (Con autenticación `@esap.edu.co`)
- **UN SOLO PORTAL** para todos los usuarios autenticados
- Dashboard personalizado según ROL
- Funcionalidades dinámicas según PERMISOS
- Experiencia unificada y consistente

---

## 🏗️ Arquitectura Correcta

```
┌─────────────────────────────────────────────────────────────┐
│                    PUNTO DE ENTRADA                         │
│                    Login ESAP                               │
│                                                             │
│         Usuario: funcionario@esap.edu.co                    │
│         Contraseña: ********                                │
│                                                             │
└────────────────────────┬────────────────────────────────────┘
                         │
                         │ Autenticación
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│         🔐 PORTAL TRANSACCIONAL UNIFICADO                   │
│                                                             │
│  ┌───────────────────────────────────────────────────┐     │
│  │  TopBar                                           │     │
│  │  👤 Juan Pérez - Docente | Sede Bogotá           │     │
│  │  [Notificaciones: 3] [Perfil] [Salir]           │     │
│  └───────────────────────────────────────────────────┘     │
│                                                             │
│  ┌───────────────────────────────────────────────────┐     │
│  │  Dashboard Personalizado                          │     │
│  │                                                   │     │
│  │  Mis Servicios (según rol y permisos):           │     │
│  │                                                   │     │
│  │  ✅ Mi PTA (porque es DOCENTE)                   │     │
│  │  ✅ Mis Auditorías (porque es JEFE DE ÁREA)      │     │
│  │  ✅ Firmas Pendientes (porque es FIRMANTE)       │     │
│  │  ✅ Mis Certificados                             │     │
│  │  ✅ Mi Perfil                                    │     │
│  │  ✅ Mis Notificaciones                           │     │
│  │                                                   │     │
│  └───────────────────────────────────────────────────┘     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 👤 Concepto "Usuario Persona"

Cada usuario autenticado tiene:

```typescript
interface UsuarioPersona {
  // Datos básicos
  id: string;
  email: string;              // funcionario@esap.edu.co
  nombres: string;
  apellidos: string;
  documento: string;
  
  // Roles (puede tener varios)
  roles: Rol[];               
  // Ejemplo: ['DOCENTE', 'JEFE_AREA', 'FIRMANTE']
  
  // Permisos derivados de roles
  permisos: string[];         
  // Ejemplo: ['pta:create', 'control-interno:view', 'firma:sign']
  
  // Contexto organizacional
  sede: Sede;
  territorial: Territorial;
  area?: Area;                // Si es jefe de área
  
  // Rol activo actual (si tiene múltiples)
  rolActivo: Rol;
}
```

---

## 📱 Dashboard Dinámico por Rol

### Ejemplo 1: Juan Pérez - Docente

```typescript
// Usuario logueado
const usuario = {
  nombres: "Juan",
  apellidos: "Pérez",
  roles: ['DOCENTE'],
  permisos: [
    'pta:view',
    'pta:create',
    'pta:edit',
    'certificados:request'
  ]
};

// Dashboard muestra:
✅ Mi PTA
   - Crear nuevo PTA
   - Ver mis PTAs
   - Estado: Pendiente de aprobación
   
✅ Mis Certificados
   - Solicitar certificado laboral
   - Ver historial de certificados
   
✅ Mi Perfil
   - Actualizar datos
   - Cambiar contraseña
```

### Ejemplo 2: María González - Jefa de Área + Firmante

```typescript
const usuario = {
  nombres: "María",
  apellidos: "González",
  roles: ['JEFE_AREA', 'FIRMANTE'],
  area: { id: 'A-001', nombre: 'Planeación' },
  permisos: [
    'control-interno:view',
    'control-interno:update-evidencias',
    'firma:sign',
    'certificados:request'
  ]
};

// Dashboard muestra:
✅ Mis Auditorías (Control Interno)
   - Ver auditorías de mi área
   - Cargar evidencias
   - Ver hallazgos: 2 pendientes
   
✅ Planes de Mejoramiento
   - Plan PM-2024-001: En progreso
   - Tareas asignadas: 3
   - Próximo vencimiento: 15 días
   
✅ Documentos para Firmar
   - Pendientes: 2 documentos
   - Resolución 2024-005
   - Oficio 2024-123
   
✅ Mis Certificados
   - Solicitar certificado laboral
   
✅ Mi Perfil
```

### Ejemplo 3: Carlos Ramírez - Docente + Aprobador PTA

```typescript
const usuario = {
  nombres: "Carlos",
  apellidos: "Ramírez",
  roles: ['DOCENTE', 'APROBADOR_PTA'],
  permisos: [
    'pta:view',
    'pta:create',
    'pta:approve',
    'certificados:request'
  ]
};

// Dashboard muestra:
✅ Mi PTA
   - Ver mi PTA actual
   - Estado: Aprobado
   
✅ PTAs Pendientes de Aprobación (Aprobador)
   - 5 PTAs pendientes de revisar
   - Juan López - PTA 2024-1
   - Ana Martínez - PTA 2024-1
   
✅ Mis Certificados

✅ Mi Perfil
```

---

## 🏗️ Estructura de Módulos (Corregida)

```
modules/
├── portal-transaccional/              # 🌐 PORTAL ÚNICO ⭐
│   ├── components/
│   │   ├── PortalDashboard.tsx        # Dashboard principal
│   │   ├── PortalNavbar.tsx           # Navbar unificado
│   │   ├── ServiceCard.tsx            # Card de servicio
│   │   ├── NotificationsPanel.tsx     # Panel notificaciones
│   │   └── widgets/                   # Widgets por servicio
│   │       ├── WidgetPTA.tsx          # Widget Mi PTA
│   │       ├── WidgetAuditorias.tsx   # Widget Auditorías
│   │       ├── WidgetFirmas.tsx       # Widget Firmas
│   │       └── WidgetCertificados.tsx # Widget Certificados
│   │
│   ├── services/
│   │   └── portal.service.ts          # Servicios del portal
│   │
│   ├── hooks/
│   │   ├── useUserServices.ts         # Hook servicios del usuario
│   │   └── usePortalNotifications.ts  # Hook notificaciones
│   │
│   ├── types/
│   │   └── portal.types.ts
│   │
│   └── index.ts
│
├── portal-publico/                    # 🌍 PORTAL PÚBLICO
│   ├── components/
│   │   ├── LandingPage.tsx
│   │   ├── PublicCertificateValidation.tsx
│   │   ├── PublicTitleVerification.tsx
│   │   └── EnrollmentQRLanding.tsx
│   └── index.ts
│
├── control-interno/                   # 🔍 MÓDULO (Backend)
│   ├── components/
│   │   ├── admin/                     # Vista ADMINISTRATIVA
│   │   │   ├── ControlInternoFull.tsx
│   │   │   ├── DashboardEjecutivoCIG.tsx
│   │   │   └── GestionAuditoriasKanban.tsx
│   │   └── portal/                    # Componentes para PORTAL ⭐
│   │       ├── MisAuditorias.tsx      # Vista de usuario
│   │       ├── MisPlanesM mejoramiento.tsx
│   │       └── CargarEvidencias.tsx
│   ├── services/
│   │   ├── controlInterno.service.ts
│   │   └── api.ts
│   └── index.ts
│
├── gestion-profesoral/                # 👨‍🏫 MÓDULO (Backend)
│   ├── components/
│   │   ├── admin/                     # Vista ADMINISTRATIVA
│   │   │   ├── GestionProfesoralApp.tsx
│   │   │   └── DashboardAprobador.tsx
│   │   └── portal/                    # Componentes para PORTAL ⭐
│   │       ├── MiPTA.tsx              # Vista docente
│   │       ├── CrearPTA.tsx
│   │       └── BandejaAprobaciones.tsx
│   └── index.ts
│
├── firma-electronica/                 # ✍️ MÓDULO (Backend)
│   ├── components/
│   │   ├── admin/                     # Vista ADMINISTRATIVA
│   │   │   └── ModuloFirmaElectronica.tsx
│   │   └── portal/                    # Componentes para PORTAL ⭐
│   │       ├── MisFirmasPendientes.tsx
│   │       ├── FirmarDocumento.tsx
│   │       └── HistorialFirmas.tsx
│   └── index.ts
│
└── certificados-laborales/            # 📜 MÓDULO (Backend)
    ├── components/
    │   ├── admin/                     # Vista ADMINISTRATIVA
    │   │   └── CertificadosLaboralesDashboard.tsx
    │   └── portal/                    # Componentes para PORTAL ⭐
    │       ├── SolicitarCertificado.tsx
    │       └── MisCertificados.tsx
    └── index.ts
```

---

## 🔄 Flujo de Carga del Portal

```typescript
// modules/portal-transaccional/components/PortalDashboard.tsx

export function PortalDashboard() {
  const { user } = useAuth();
  const { servicios } = useUserServices(user); // ⭐ Dinámico según usuario
  
  return (
    <div className="portal-transaccional">
      <PortalNavbar user={user} />
      
      <div className="dashboard">
        {/* Métricas generales */}
        <MetricsRow>
          <MetricCard 
            titulo="Tareas Pendientes" 
            valor={user.tareasPendientes} 
          />
          <MetricCard 
            titulo="Notificaciones" 
            valor={user.notificacionesNoLeidas} 
          />
        </MetricsRow>
        
        {/* Servicios dinámicos según rol */}
        <ServicesGrid>
          {servicios.map(servicio => (
            <ServiceCard
              key={servicio.id}
              titulo={servicio.titulo}
              descripcion={servicio.descripcion}
              badge={servicio.badge}
              onClick={() => navigate(servicio.ruta)}
            />
          ))}
        </ServicesGrid>
      </div>
    </div>
  );
}
```

```typescript
// modules/portal-transaccional/hooks/useUserServices.ts

export function useUserServices(user: UsuarioPersona) {
  const servicios: Servicio[] = [];
  
  // Si es DOCENTE → agregar PTA
  if (user.roles.includes('DOCENTE')) {
    servicios.push({
      id: 'mi-pta',
      titulo: 'Mi PTA',
      descripcion: 'Plan de Trabajo Académico',
      icono: <BookOpen />,
      ruta: '/portal/pta',
      badge: getPTAPendiente(user),
      modulo: 'gestion-profesoral'
    });
  }
  
  // Si es JEFE_AREA → agregar Control Interno
  if (user.roles.includes('JEFE_AREA')) {
    servicios.push({
      id: 'mis-auditorias',
      titulo: 'Mis Auditorías',
      descripcion: 'Auditorías de mi área',
      icono: <ClipboardCheck />,
      ruta: '/portal/auditorias',
      badge: getAuditoriasPendientes(user.area.id),
      modulo: 'control-interno'
    });
    
    servicios.push({
      id: 'planes-mejoramiento',
      titulo: 'Planes de Mejoramiento',
      descripcion: 'Seguimiento a planes',
      icono: <Target />,
      ruta: '/portal/planes-mejoramiento',
      badge: getPlanesPendientes(user.area.id),
      modulo: 'control-interno'
    });
  }
  
  // Si es FIRMANTE → agregar Firma Electrónica
  if (user.roles.includes('FIRMANTE')) {
    servicios.push({
      id: 'mis-firmas',
      titulo: 'Documentos para Firmar',
      descripcion: 'Pendientes de mi firma',
      icono: <FileSignature />,
      ruta: '/portal/firmas',
      badge: getFirmasPendientes(user.id),
      modulo: 'firma-electronica'
    });
  }
  
  // Si es APROBADOR_PTA → agregar Aprobaciones
  if (user.roles.includes('APROBADOR_PTA')) {
    servicios.push({
      id: 'aprobar-ptas',
      titulo: 'PTAs por Aprobar',
      descripcion: 'Pendientes de aprobación',
      icono: <CheckCircle />,
      ruta: '/portal/aprobar-ptas',
      badge: getPTAsPorAprobar(user.id),
      modulo: 'gestion-profesoral'
    });
  }
  
  // Servicios para TODOS los usuarios autenticados
  servicios.push({
    id: 'mis-certificados',
    titulo: 'Mis Certificados',
    descripcion: 'Solicitar y consultar',
    icono: <Award />,
    ruta: '/portal/certificados',
    modulo: 'certificados-laborales'
  });
  
  servicios.push({
    id: 'mi-perfil',
    titulo: 'Mi Perfil',
    descripcion: 'Datos personales',
    icono: <User />,
    ruta: '/portal/perfil',
    modulo: 'core'
  });
  
  return { servicios };
}
```

---

## 🎯 Enrutamiento del Portal

```typescript
// App.tsx

import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

// Portal Transaccional
const PortalTransaccional = lazy(() => import('./modules/portal-transaccional'));

// Componentes de portal de cada módulo
const MiPTA = lazy(() => import('./modules/gestion-profesoral/components/portal/MiPTA'));
const MisAuditorias = lazy(() => import('./modules/control-interno/components/portal/MisAuditorias'));
const MisFirmas = lazy(() => import('./modules/firma-electronica/components/portal/MisFirmasPendientes'));
const MisCertificados = lazy(() => import('./modules/certificados-laborales/components/portal/MisCertificados'));

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Portal Público */}
        <Route path="/publico/*" element={<PortalPublico />} />
        
        {/* Login */}
        <Route path="/login" element={<LoginPage />} />
        
        {/* Portal Transaccional Unificado */}
        <Route path="/portal" element={<PortalTransaccional />}>
          <Route index element={<PortalDashboard />} />
          
          {/* Rutas de servicios */}
          <Route path="pta/*" element={<MiPTA />} />
          <Route path="auditorias/*" element={<MisAuditorias />} />
          <Route path="firmas/*" element={<MisFirmas />} />
          <Route path="certificados/*" element={<MisCertificados />} />
          <Route path="perfil" element={<MiPerfil />} />
        </Route>
        
        {/* Backoffice Administrativo (para admins) */}
        <Route path="/admin/*" element={<BackofficeApp />} />
      </Routes>
    </BrowserRouter>
  );
}
```

---

## 🔐 Control de Acceso

```typescript
// modules/portal-transaccional/components/PortalRoute.tsx

interface PortalRouteProps {
  children: ReactNode;
  requiredRole?: string;
  requiredPermission?: string;
}

export function PortalRoute({ 
  children, 
  requiredRole, 
  requiredPermission 
}: PortalRouteProps) {
  const { user, hasRole, hasPermission } = useAuth();
  
  // Verificar autenticación
  if (!user) {
    return <Navigate to="/login" />;
  }
  
  // Verificar rol si se especifica
  if (requiredRole && !hasRole(requiredRole)) {
    return (
      <AccessDenied 
        message={`Este servicio requiere el rol: ${requiredRole}`} 
      />
    );
  }
  
  // Verificar permiso si se especifica
  if (requiredPermission && !hasPermission(requiredPermission)) {
    return (
      <AccessDenied 
        message="No tienes permisos para acceder a este servicio" 
      />
    );
  }
  
  return <>{children}</>;
}

// Uso:
<Route 
  path="pta/*" 
  element={
    <PortalRoute requiredRole="DOCENTE">
      <MiPTA />
    </PortalRoute>
  } 
/>

<Route 
  path="firmas/*" 
  element={
    <PortalRoute requiredPermission="firma:sign">
      <MisFirmas />
    </PortalRoute>
  } 
/>
```

---

## 📊 Diferencia: Portal vs Backoffice

### Portal Transaccional (Usuario Final)
```
Características:
✅ Vista personal ("Mis...")
✅ Solo datos del usuario autenticado
✅ Interfaz simplificada
✅ Acciones autoservicio
✅ Mobile-first
✅ Sin sidebar complejo

Ejemplos:
- "Mi PTA" → Solo veo MI PTA
- "Mis Auditorías" → Solo auditorías de MI ÁREA
- "Mis Firmas" → Solo documentos asignados a MÍ
```

### Backoffice Administrativo (Administrador)
```
Características:
✅ Vista global ("Gestión de...")
✅ Todos los datos del sistema
✅ Interfaz completa con múltiples opciones
✅ Acciones de gestión masiva
✅ Desktop-first
✅ Sidebar con todos los módulos

Ejemplos:
- "Gestión de PTAs" → Veo TODOS los PTAs
- "Control Interno" → Veo TODAS las auditorías
- "Firma Electrónica" → Administro TODO el flujo
```

---

## ✅ Ventajas de UN SOLO Portal

1. **Experiencia de Usuario Unificada**
   - Un solo punto de entrada
   - Navegación consistente
   - Mismo look & feel

2. **Mantenibilidad**
   - Un solo código de portal
   - Más fácil de mantener
   - Menos duplicación

3. **Seguridad**
   - Control de acceso centralizado
   - Más fácil de auditar
   - Menos superficie de ataque

4. **Performance**
   - Carga una sola vez
   - Reutiliza componentes
   - Mejor caching

5. **Escalabilidad**
   - Agregar nuevos servicios es fácil
   - Solo actualizar el hook `useUserServices`
   - Sin crear nuevos portales

---

## 🚀 Migración Recomendada

### Paso 1: Consolidar Portales

```bash
# Crear módulo portal-transaccional
mkdir -p modules/portal-transaccional/components

# Mover componentes base
mv components/portal/PortalDashboard.tsx modules/portal-transaccional/components/
mv components/portal/AuthenticatedPortalNavbar.tsx modules/portal-transaccional/components/PortalNavbar.tsx
mv components/portal/PerfilUsuarioEditable.tsx modules/portal-transaccional/components/
```

### Paso 2: Reorganizar Componentes de Módulos

```bash
# En cada módulo, crear carpeta portal/
mkdir -p modules/control-interno/components/portal
mkdir -p modules/gestion-profesoral/components/portal
mkdir -p modules/firma-electronica/components/portal

# Mover componentes específicos de portal
mv components/esap/control-interno/PortalTransaccionalUsuarioMD3.tsx \
   modules/control-interno/components/portal/MisAuditorias.tsx

mv components/portal/gestion-profesoral/MiPTADashboardV3.tsx \
   modules/gestion-profesoral/components/portal/MiPTA.tsx

mv components/esap/firma-electronica/PortalTransaccionalFirmaCompleto.tsx \
   modules/firma-electronica/components/portal/MisFirmas.tsx
```

### Paso 3: Crear Hook Unificado

```typescript
// modules/portal-transaccional/hooks/useUserServices.ts
// (código mostrado arriba)
```

### Paso 4: Actualizar Enrutamiento

```typescript
// App.tsx
// (código mostrado arriba)
```

---

## 📋 Checklist de Implementación

- [ ] Crear módulo `portal-transaccional`
- [ ] Mover componentes base del portal
- [ ] Crear hook `useUserServices`
- [ ] Reorganizar componentes de módulos en `/portal`
- [ ] Actualizar enrutamiento en App.tsx
- [ ] Implementar `PortalRoute` con guards
- [ ] Migrar datos de sesión
- [ ] Testing de roles y permisos
- [ ] Documentar flujos de usuario
- [ ] Deploy gradual

---

**Documento Técnico - Portal Transaccional Unificado v2.0**  
**ESAP - Backoffice Administrativo ComUNIdad - Enero 2026**
