# 📦 MÓDULOS - Arquitectura Micro-Frontends ESAP

## 🎯 Estructura de Módulos

Esta carpeta contiene todos los módulos independientes del sistema ESAP, siguiendo una arquitectura de micro-frontends.

```
modules/
├── portal-transaccional/      # Portal Unificado (usuarios @esap.edu.co)
├── portal-publico/             # Portal Público (sin autenticación)
├── gestion-profesoral/         # Gestión de PTAs
├── control-interno/            # Control Interno de Gestión
├── firma-electronica/          # Firma Electrónica
├── certificados-laborales/     # Certificados Laborales
└── ... (más módulos)
```

---

## 🏗️ Estructura Interna de un Módulo

Cada módulo sigue la siguiente estructura:

```
módulo/
├── components/
│   ├── admin/              # Componentes BACKOFFICE (administradores)
│   │   ├── Dashboard.tsx   # Vista completa para administradores
│   │   └── Gestion.tsx     # Gestión administrativa
│   │
│   └── portal/             # Componentes PORTAL (usuarios finales) ⭐
│       ├── MiVista.tsx     # Vista personal del usuario
│       └── MisAcciones.tsx # Acciones del usuario
│
├── hooks/                  # Custom hooks del módulo
│   ├── useModulo.ts
│   └── useModuloQueries.ts
│
├── services/               # Servicios API del módulo
│   ├── moduloAPI.ts
│   └── moduloService.ts
│
├── types/                  # Tipos TypeScript del módulo
│   └── modulo.types.ts
│
└── index.ts               # Exportaciones públicas del módulo
```

---

## 🔐 Portal Transaccional Unificado

### Concepto Clave

**UN SOLO PORTAL** para todos los usuarios autenticados con `@esap.edu.co`.

El dashboard se personaliza dinámicamente según los roles del usuario:

```typescript
// Ejemplo: Usuario con múltiples roles
{
  email: "juan.perez@esap.edu.co",
  roles: ['DOCENTE', 'JEFE_AREA', 'FIRMANTE']
}

// El Portal mostrará:
✅ Mi PTA (porque es DOCENTE)
✅ Mis Auditorías (porque es JEFE_AREA)
✅ Documentos para Firmar (porque es FIRMANTE)
✅ Mis Certificados (todos los usuarios)
✅ Mi Perfil (todos los usuarios)
```

### Hook Principal: `useUserServices`

```typescript
import { useUserServices } from '@modules/portal-transaccional';

function PortalDashboard({ user }) {
  const { servicios } = useUserServices(user);
  
  return (
    <div>
      {servicios.map(servicio => (
        <ServiceCard key={servicio.id} {...servicio} />
      ))}
    </div>
  );
}
```

---

## 📂 Diferencia: `/admin` vs `/portal`

### Componentes `/admin` (Backoffice)
- **Para:** Administradores del sistema
- **Características:**
  - Vista global de todos los datos
  - Gestión masiva
  - Configuraciones del sistema
  - Reportería completa
- **Ejemplo:** `GestionProfesoralApp.tsx` - Ve TODOS los PTAs

### Componentes `/portal` (Portal Transaccional)
- **Para:** Usuarios finales autenticados
- **Características:**
  - Vista personal ("Mis...")
  - Solo datos del usuario
  - Interfaz simplificada
  - Auto-servicio
- **Ejemplo:** `MiPTA.tsx` - Ve solo SU PTA

---

## 🚀 Cómo Crear un Nuevo Módulo

### 1. Crear Estructura

```bash
mkdir -p modules/mi-modulo/components/{admin,portal}
mkdir -p modules/mi-modulo/{hooks,services,types}
```

### 2. Crear Componente Admin

```typescript
// modules/mi-modulo/components/admin/MiModuloAdmin.tsx
export function MiModuloAdmin() {
  // Vista completa para administradores
  // Ven TODOS los datos
  return <div>Admin View</div>;
}
```

### 3. Crear Componente Portal

```typescript
// modules/mi-modulo/components/portal/MiModuloPortal.tsx
export function MiModuloPortal() {
  // Vista personal para usuario final
  // Solo ve SUS datos
  return <div>User View</div>;
}
```

### 4. Crear Hook de Servicios

Si tu módulo debe aparecer en el Portal Transaccional, agrégalo en:

```typescript
// modules/portal-transaccional/hooks/useUserServices.ts

if (hasRole(user, 'MI_ROL')) {
  serviciosDisponibles.push({
    id: 'mi-servicio',
    titulo: 'Mi Servicio',
    descripcion: 'Descripción del servicio',
    icono: <MiIcono />,
    ruta: '/portal/mi-servicio',
    modulo: 'mi-modulo'
  });
}
```

### 5. Crear Ruta en App

```typescript
// App.microfrontends.tsx

<Route path="mi-servicio" element={
  <PortalRoute user={user} requiredRole="MI_ROL">
    <Suspense fallback={<LoadingFallback />}>
      <MiModuloPortal />
    </Suspense>
  </PortalRoute>
} />
```

---

## 🎨 Guía de Estilos

### Colores Corporativos ESAP

```css
/* Azul Principal */
#003DA5 - Azul Oscuro
#2962FF - Azul Claro

/* Naranja */
#F57C00 - Naranja Principal

/* Fondos */
#E0EDFF - Azul Claro (Fondos)
#FFF8E1 - Amarillo Claro (Fondos)
```

### Componentes Estandarizados

```typescript
// Header de Módulo
<div className="bg-gradient-to-r from-[#003DA5] to-[#2962FF] text-white px-6 py-8">
  <h1 className="text-3xl font-light">Título</h1>
</div>

// Card de Contenido
<div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
  Contenido
</div>

// Botón Primario
<button className="px-4 py-2 bg-[#2962FF] text-white rounded-lg hover:bg-[#003DA5] transition-colors">
  Acción
</button>
```

---

## 📊 Ejemplos de Módulos

### 1. Gestión Profesoral

```
modules/gestion-profesoral/
├── components/
│   ├── admin/
│   │   ├── GestionProfesoralApp.tsx    # Ve TODOS los PTAs
│   │   └── ReporteriaPTA.tsx
│   └── portal/
│       ├── MiPTA.tsx                    # Ve solo SU PTA
│       ├── CrearPTA.tsx
│       └── BandejaAprobaciones.tsx      # Si es aprobador
```

### 2. Control Interno

```
modules/control-interno/
├── components/
│   ├── admin/
│   │   ├── ControlInternoFull.tsx       # Ve TODAS las auditorías
│   │   ├── DashboardEjecutivoCIG.tsx
│   │   └── GestionAuditoriasKanban.tsx
│   └── portal/
│       ├── MisAuditorias.tsx            # Ve auditorías de SU área
│       ├── MisPlanesM mejoramiento.tsx
│       └── CargarEvidencias.tsx
```

### 3. Firma Electrónica

```
modules/firma-electronica/
├── components/
│   ├── admin/
│   │   ├── ModuloFirmaElectronica.tsx   # Gestiona TODO el flujo
│   │   └── DashboardEstadisticas.tsx
│   └── portal/
│       ├── MisFirmasPendientes.tsx      # Ve documentos asignados a ÉL
│       ├── FirmarDocumento.tsx
│       └── HistorialFirmas.tsx
```

---

## 🔒 Control de Acceso

### PortalRoute

Componente guard para proteger rutas:

```typescript
<PortalRoute 
  user={user}
  requiredRole="DOCENTE"           // Rol requerido
  requiredPermission="pta:create"  // Permiso requerido
>
  <MiPTA />
</PortalRoute>
```

### Verificación Manual

```typescript
import { useUserServices } from '@modules/portal-transaccional';

function MiComponente() {
  const { user } = useAuth();
  
  // Verificar rol
  if (!user.roles.includes('DOCENTE')) {
    return <AccessDenied />;
  }
  
  // Verificar permiso
  if (!user.permisos.includes('pta:create')) {
    return <NoPermissions />;
  }
  
  return <MiVista />;
}
```

---

## 📝 Checklist para Nuevo Módulo

- [ ] Crear carpeta del módulo en `/modules`
- [ ] Crear estructura `/components/admin` y `/components/portal`
- [ ] Implementar componentes admin (vista completa)
- [ ] Implementar componentes portal (vista personal)
- [ ] Crear hooks personalizados
- [ ] Crear servicios API
- [ ] Crear tipos TypeScript
- [ ] Agregar servicio en `useUserServices` (si aplica)
- [ ] Crear rutas en `App.microfrontends.tsx`
- [ ] Crear `index.ts` con exportaciones
- [ ] Documentar en este README

---

## 🚀 Migración desde Monolito

### Paso 1: Identificar Componentes

```bash
# Componentes de backoffice → /admin
components/gestion-profesoral/GestionProfesoralApp.tsx 
  → modules/gestion-profesoral/components/admin/GestionProfesoralApp.tsx

# Componentes de portal → /portal
components/portal/gestion-profesoral/MiPTADashboard.tsx 
  → modules/gestion-profesoral/components/portal/MiPTA.tsx
```

### Paso 2: Mover Archivos

```bash
# Usar el script de migración
./scripts/migrate-to-microfrontends.sh
```

### Paso 3: Actualizar Imports

```typescript
// Antes
import { GestionProfesoralApp } from './components/gestion-profesoral/GestionProfesoralApp';

// Después
import { GestionProfesoralApp } from '@modules/gestion-profesoral/components/admin';
```

---

## 📚 Recursos

- **Documentación completa:** `/docs/ARQUITECTURA_MICRO_FRONTENDS.md`
- **Portal Unificado:** `/docs/PORTAL_TRANSACCIONAL_UNIFICADO.md`
- **Guía de inicio:** `/docs/GUIA_INICIO_RAPIDO_MICROFRONTENDS.md`
- **Script de migración:** `/scripts/migrate-to-microfrontends.sh`

---

**Última actualización:** Enero 2026  
**ESAP - Backoffice Administrativo ComUNIdad**
