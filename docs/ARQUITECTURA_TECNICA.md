# Documento de Arquitectura Técnica
## PlataformaComUNIdadESAP

**Versión:** 1.0
**Fecha:** Enero 2026
**Tipo:** Documento Técnico de Arquitectura

---

## Tabla de Contenidos

1. [Introducción](#1-introducción)
2. [Visión General del Sistema](#2-visión-general-del-sistema)
3. [Stack Tecnológico](#3-stack-tecnológico)
4. [Estructura del Proyecto](#4-estructura-del-proyecto)
5. [Arquitectura de la Aplicación](#5-arquitectura-de-la-aplicación)
6. [Sistema de Componentes](#6-sistema-de-componentes)
7. [Gestión de Estado](#7-gestión-de-estado)
8. [Servicios y APIs](#8-servicios-y-apis)
9. [Sistema de Autenticación y Seguridad](#9-sistema-de-autenticación-y-seguridad)
10. [Modelos de Datos](#10-modelos-de-datos)
11. [Flujos de la Aplicación](#11-flujos-de-la-aplicación)
12. [Integraciones Externas](#12-integraciones-externas)
13. [Patrones de Diseño](#13-patrones-de-diseño)
14. [Guía de Desarrollo](#14-guía-de-desarrollo)
15. [Diagramas de Arquitectura](#15-diagramas-de-arquitectura)

---

## 1. Introducción

### 1.1 Propósito del Documento

Este documento describe la arquitectura técnica de la **PlataformaComUNIdadESAP**, un sistema de gestión integral para la Escuela Superior de Administración Pública (ESAP). Está dirigido a desarrolladores, arquitectos de software y stakeholders técnicos que necesiten comprender la estructura, componentes y decisiones arquitectónicas del sistema.

### 1.2 Alcance

El documento cubre:
- Arquitectura frontend de la aplicación
- Patrones de diseño implementados
- Integración con servicios backend
- Flujos de datos y autenticación
- Guías de desarrollo y mejores prácticas

### 1.3 Definiciones y Acrónimos

| Término | Definición |
|---------|------------|
| **ESAP** | Escuela Superior de Administración Pública |
| **PTA** | Plan de Trabajo Académico |
| **CETAP** | Centro Territorial de Administración Pública |
| **RBAC** | Role-Based Access Control (Control de Acceso Basado en Roles) |
| **SPA** | Single Page Application |
| **JWT** | JSON Web Token |

---

## 2. Visión General del Sistema

### 2.1 Descripción del Sistema

PlataformaComUNIdadESAP es una **Single Page Application (SPA)** construida con React que proporciona:

- **Portal Transaccional:** Dashboard unificado para usuarios autenticados (docentes, administrativos, estudiantes)
- **Backoffice Administrativo:** Sistema de gestión para administradores
- **Módulos Especializados:** Gestión profesoral, control interno, certificados, comunidad

### 2.2 Objetivos Arquitectónicos

```
┌─────────────────────────────────────────────────────────────────┐
│                    OBJETIVOS DE ARQUITECTURA                     │
├─────────────────────────────────────────────────────────────────┤
│  ✓ Escalabilidad    → Micro-frontends modulares                 │
│  ✓ Mantenibilidad   → Separación de responsabilidades           │
│  ✓ Seguridad        → RBAC granular + JWT + protección XSS      │
│  ✓ Rendimiento      → Code splitting + lazy loading             │
│  ✓ Accesibilidad    → WCAG AA compliance                        │
│  ✓ Experiencia UX   → Responsive + PWA ready                    │
└─────────────────────────────────────────────────────────────────┘
```

### 2.3 Características Principales

| Módulo | Estado | Descripción |
|--------|--------|-------------|
| Autenticación | Completo | JWT con refresh token, recuperación de contraseña |
| Autorización | Completo | RBAC granular con permisos por sede/programa |
| Plan de Trabajo Académico | Completo | 4 componentes, 3 niveles de aprobación |
| Control Interno | Completo | Auditorías, planes de mejoramiento |
| Certificados | Completo | Laborales, verificación con QR |
| Reportería | Completo | PDF, Excel, dashboards interactivos |
| Portal Unificado | Completo | Dashboard dinámico según roles |
| Micro-Frontends | En Migración | 3 módulos activos, 14+ planeados |

---

## 3. Stack Tecnológico

### 3.1 Tecnologías Core

```
┌─────────────────────────────────────────────────────────────────┐
│                         STACK FRONTEND                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   ┌─────────────┐    ┌─────────────┐    ┌─────────────┐        │
│   │   React     │    │ TypeScript  │    │    Vite     │        │
│   │   18.3.1    │    │   Strict    │    │   6.3.5     │        │
│   └─────────────┘    └─────────────┘    └─────────────┘        │
│                                                                  │
│   ┌─────────────┐    ┌─────────────┐    ┌─────────────┐        │
│   │  Tailwind   │    │  Radix UI   │    │   Shadcn    │        │
│   │    CSS      │    │  Headless   │    │     /ui     │        │
│   └─────────────┘    └─────────────┘    └─────────────┘        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 Dependencias Principales

#### Framework y Build
| Paquete | Versión | Propósito |
|---------|---------|-----------|
| react | 18.3.1 | Framework UI |
| react-dom | 18.3.1 | Renderizado DOM |
| vite | 6.3.5 | Build tool y dev server |
| typescript | Latest | Type safety |

#### Componentes UI
| Paquete | Propósito |
|---------|-----------|
| @radix-ui/* | Suite completa de componentes headless accesibles |
| tailwindcss | Framework CSS utility-first |
| lucide-react | Librería de iconos (487+ iconos) |
| recharts | Visualización de datos y gráficos |
| embla-carousel-react | Carousels accesibles |

#### Gestión de Estado y Datos
| Paquete | Propósito |
|---------|-----------|
| @tanstack/react-query | Fetching, caching y sincronización de datos |
| react-hook-form | Gestión eficiente de formularios |
| React Context API | Estado global compartido |

#### Utilidades
| Paquete | Propósito |
|---------|-----------|
| react-router-dom | Enrutamiento cliente |
| axios | Cliente HTTP |
| jspdf + jspdf-autotable | Generación de PDFs |
| xlsx | Lectura/escritura de Excel |
| qrcode.react + jsqr | Generación y lectura de QR |
| sonner | Toast notifications |
| motion | Animaciones |

### 3.3 Configuración de Build

```typescript
// vite.config.ts - Configuración principal
export default defineConfig({
  plugins: [react()],  // Plugin React con SWC
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')  // Path alias
    }
  },
  build: {
    outDir: 'build',
    target: 'esnext'
  },
  server: {
    port: 3000,
    open: true
  }
})
```

---

## 4. Estructura del Proyecto

### 4.1 Organización de Directorios

```
/src
├── assets/              # Recursos estáticos (imágenes, iconos)
├── components/          # Componentes React
│   ├── esap/           # 322 componentes del backoffice
│   ├── portal/         # 43 componentes del portal
│   ├── design-system/  # Sistema de diseño unificado
│   └── ui/             # Componentes base (shadcn/ui)
├── config/             # Configuración de ambiente
├── contexts/           # Proveedores de contexto global
├── data/               # Mock data y estructuras estáticas
├── docs/               # Documentación técnica
├── hooks/              # 30+ Custom hooks
├── lib/                # Librerías internas
├── modules/            # Micro-frontends
│   ├── gestion-profesoral/
│   ├── control-interno/
│   └── portal-transaccional/
├── scripts/            # Scripts de migración
├── services/           # Servicios y APIs
│   └── api/           # Clientes API específicos
├── styles/             # Estilos globales
├── types/              # Definiciones TypeScript
├── utils/              # Utilidades y helpers
├── App.tsx             # Componente raíz con router
└── main.tsx            # Punto de entrada
```

### 4.2 Convenciones de Nomenclatura

```
Archivos de componentes:     PascalCase.tsx
Archivos de hooks:           camelCase.ts (useNombre.ts)
Archivos de servicios:       kebab-case.service.ts
Archivos de tipos:           kebab-case.types.ts
Archivos de utilidades:      camelCase.ts
```

### 4.3 Estructura de un Módulo (Micro-Frontend)

```
/src/modules/gestion-profesoral/
├── components/
│   ├── admin/          # Vista completa para administradores
│   │   └── GestionProfesoralApp.tsx
│   └── portal/         # Vista personal para usuarios
│       └── MiPTA.tsx
├── hooks/
│   └── usePTAModule.ts
├── services/
│   └── pta.service.ts
├── types/
│   └── pta.types.ts
└── index.ts            # Exportaciones públicas del módulo
```

---

## 5. Arquitectura de la Aplicación

### 5.1 Arquitectura de Alto Nivel

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              USUARIOS                                    │
│                    (Docentes, Admin, Estudiantes)                       │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         CAPA DE PRESENTACIÓN                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                  │
│  │   Landing    │  │    Portal    │  │  Backoffice  │                  │
│  │    Page      │  │Transaccional │  │    Admin     │                  │
│  └──────────────┘  └──────────────┘  └──────────────┘                  │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         CAPA DE ESTADO                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                  │
│  │   Context    │  │  TanStack    │  │  React Hook  │                  │
│  │    API       │  │    Query     │  │    Form      │                  │
│  └──────────────┘  └──────────────┘  └──────────────┘                  │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        CAPA DE SERVICIOS                                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                  │
│  │    Auth      │  │     API      │  │  Integration │                  │
│  │  Service     │  │   Client     │  │   Services   │                  │
│  └──────────────┘  └──────────────┘  └──────────────┘                  │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         BACKEND API                                     │
│                   (REST API + WebSockets)                               │
│                    localhost:3001 (dev)                                 │
│                   api.esap.edu.co (prod)                                │
└─────────────────────────────────────────────────────────────────────────┘
```

### 5.2 Arquitectura de Micro-Frontends

La aplicación está evolucionando hacia una arquitectura de micro-frontends:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        SHELL APPLICATION                                │
│                         (App.tsx + Router)                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │
│  │   Gestión   │  │   Control   │  │   Portal    │  │ Certificados│   │
│  │  Profesoral │  │   Interno   │  │Transaccional│  │             │   │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘   │
│                                                                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │
│  │  Usuarios   │  │   Roles y   │  │  Comunidad  │  │  Reportería │   │
│  │  Personas   │  │  Permisos   │  │             │  │             │   │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘   │
│                                                                         │
│                         ... 14+ módulos planeados                       │
└─────────────────────────────────────────────────────────────────────────┘
```

### 5.3 Vistas Principales

| Vista | Ruta | Descripción |
|-------|------|-------------|
| Landing Page | `/` | Página pública de inicio |
| Login | `/login` | Autenticación de usuarios |
| Portal Transaccional | `/portal/*` | Dashboard unificado para usuarios |
| Backoffice | `/admin/*` | Sistema administrativo |
| Demo PTA | `/demo/pta` | Demostración de gestión profesoral |
| Password Demo | `/demo/password` | Demostración de validación de contraseñas |

---

## 6. Sistema de Componentes

### 6.1 Jerarquía de Componentes

```
                          App.tsx
                             │
           ┌─────────────────┼─────────────────┐
           │                 │                 │
      LandingPage       LoginPage        PortalRouter
           │                 │                 │
      ┌────┴────┐      ┌────┴────┐      ┌────┴────────────┐
      │         │      │         │      │                 │
   Navbar    Hero   LoginForm  Modal  Dashboard    ModuleViews
      │         │      │         │      │                 │
    Links   Features Validation Toast  Cards        Components
```

### 6.2 Componentes ESAP Backoffice (322 componentes)

**Ubicación:** `/src/components/esap/`

| Categoría | Componentes | Descripción |
|-----------|-------------|-------------|
| Administración de Usuarios | `UsersPersonsModulePremium.tsx` | Gestión granular de usuarios y personas |
| Roles y Permisos | `RolesAdministrationModulePremium.tsx` | Sistema RBAC completo |
| Auditoría | `AuditModulePremium.tsx`, `AuditLogTable.tsx` | Logs y analytics |
| Gestión Profesoral | `GestionProfesoralApp.tsx` | PTA completo |
| Certificados | `CertificateRequestsModule.tsx` | Solicitudes y verificación |
| Reportería | `ReportsModuleV2.tsx` | Generación de reportes |
| Comunidad | `CommunityAnnouncementsModuleUnified.tsx` | Anuncios y eventos |

### 6.3 Componentes Portal (43 componentes)

**Ubicación:** `/src/components/portal/`

| Categoría | Componentes | Descripción |
|-----------|-------------|-------------|
| Landing | `LandingPage.tsx`, `PublicNavbar.tsx` | Página pública |
| Autenticación | `LoginPage.tsx`, `ModalRecuperarContrasena.tsx` | Login y recovery |
| Dashboard | `PortalDashboard.tsx`, `UnifiedPortalViewV5.tsx` | Vista unificada |
| PTA | `DocentesSection.tsx` | Vista personal del docente |
| Perfil | `ProfilePage.tsx`, `PerfilUsuarioEditable.tsx` | Gestión de perfil |

### 6.4 Componentes UI Base (Shadcn/ui + Radix)

```typescript
// Componentes disponibles en /src/components/ui/
Accordion      AlertDialog    Avatar         Badge
Button         Calendar       Card           Carousel
Checkbox       Collapsible    Command        ContextMenu
Dialog         Drawer         DropdownMenu   Form
HoverCard      Input          Label          Menubar
NavigationMenu Pagination     Popover        Progress
RadioGroup     ScrollArea     Select         Separator
Sheet          Skeleton       Slider         Sonner
Switch         Table          Tabs           Textarea
Toast          Toggle         ToggleGroup    Tooltip
```

---

## 7. Gestión de Estado

### 7.1 Estrategia de Estado

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     CAPAS DE ESTADO                                     │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │  ESTADO LOCAL (useState, useReducer)                              │ │
│  │  → Estado de UI, formularios, modales                             │ │
│  └───────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │  ESTADO GLOBAL (React Context)                                     │ │
│  │  → Autenticación, Notificaciones, PTA, Auditoría                  │ │
│  └───────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │  ESTADO DEL SERVIDOR (TanStack Query)                             │ │
│  │  → Datos remotos, caché, sincronización                           │ │
│  └───────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │  ESTADO DE FORMULARIOS (React Hook Form)                          │ │
│  │  → Validación, dirty state, errores                               │ │
│  └───────────────────────────────────────────────────────────────────┘ │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 7.2 Contextos Principales

```typescript
// /src/contexts/

// PTAContext - Estado global del Plan de Trabajo Académico
interface PTAContextValue {
  ptaActual: PlanTrabajoAcademico | null;
  setPTAActual: (pta: PlanTrabajoAcademico) => void;
  estadoPTA: EstadoPTA;
  actualizarEstado: (estado: EstadoPTA) => void;
}

// NotificacionesContext - Sistema de notificaciones
interface NotificacionesContextValue {
  notificaciones: Notificacion[];
  agregarNotificacion: (notif: Notificacion) => void;
  marcarLeida: (id: string) => void;
  limpiarTodas: () => void;
}

// AuditoriaGlobalContext - Contexto de auditoría
interface AuditoriaGlobalContextValue {
  auditoriaActiva: AuditoriaGlobal | null;
  planesImplementacion: PlanImplementacion[];
  actualizarEstado: (estado: EstadoAuditoria) => void;
}
```

### 7.3 Custom Hooks (30+)

| Hook | Ubicación | Propósito |
|------|-----------|-----------|
| `useAuth` | `/hooks/useAuth.ts` | Autenticación y sesión |
| `usePTA` | `/hooks/usePTA.ts` | Gestión de PTA con cálculos |
| `usePTAAPI` | `/hooks/usePTAAPI.ts` | API del PTA |
| `usePTAAprobacionGranular` | `/hooks/` | Flujo de aprobación |
| `usePTAConPersonas` | `/hooks/` | Integración Personas-PTA |
| `useNotifications` | `/hooks/` | Notificaciones globales |
| `useRoles` | `/hooks/` | Roles y permisos |
| `useAccessibility` | `/hooks/` | Funciones de accesibilidad |
| `useDashboardQueries` | `/hooks/` | Queries del dashboard |
| `useResponsive` | `/hooks/` | Breakpoints responsive |
| `useKeyboardNavigation` | `/hooks/` | Navegación por teclado |
| `usePWA` | `/hooks/` | Progressive Web App |
| `useDarkMode` | `/hooks/` | Modo oscuro |

### 7.4 TanStack Query - Configuración

```typescript
// Ejemplo de uso con TanStack Query
const { data, isLoading, error } = useQuery({
  queryKey: ['usuarios', filtros],
  queryFn: () => usuariosService.getUsuarios(filtros),
  staleTime: 5 * 60 * 1000,  // 5 minutos
  cacheTime: 10 * 60 * 1000, // 10 minutos
});

// Mutación con invalidación automática
const mutation = useMutation({
  mutationFn: usuariosService.crearUsuario,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['usuarios'] });
  },
});
```

---

## 8. Servicios y APIs

### 8.1 Arquitectura de Servicios

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        CAPA DE SERVICIOS                                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  /src/services/                                                         │
│  ├── api/                          # Clientes API específicos           │
│  │   ├── client.ts                 # APIClient singleton                │
│  │   ├── auth.service.ts           # Autenticación                      │
│  │   ├── usuarios.service.ts       # Gestión de usuarios                │
│  │   ├── rolesService.ts           # Roles y permisos                   │
│  │   ├── ptaAPI.ts                 # API del PTA                        │
│  │   ├── certificados.service.ts   # Certificados                       │
│  │   ├── dashboard.service.ts      # Dashboard                          │
│  │   └── ...                                                            │
│  │                                                                      │
│  ├── personasPTAIntegrationService.ts  # Integración Personas-PTA       │
│  ├── ptaPersonasService.ts             # Caché PTA-Personas             │
│  ├── notificacionesPersonasPTA.ts      # Notificaciones PTA             │
│  └── notificationService.ts            # Notificaciones globales        │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 8.2 APIClient - Cliente HTTP Centralizado

```typescript
// /src/services/api/client.ts

class APIClient {
  private static instance: APIClient;
  private baseURL: string;
  private isRefreshing: boolean = false;
  private refreshQueue: Array<() => void> = [];

  // Singleton pattern
  static getInstance(): APIClient {
    if (!APIClient.instance) {
      APIClient.instance = new APIClient();
    }
    return APIClient.instance;
  }

  // Métodos disponibles
  async get<T>(endpoint: string, config?: RequestConfig): Promise<T>
  async post<T>(endpoint: string, data: any, config?: RequestConfig): Promise<T>
  async put<T>(endpoint: string, data: any, config?: RequestConfig): Promise<T>
  async patch<T>(endpoint: string, data: any, config?: RequestConfig): Promise<T>
  async delete<T>(endpoint: string, config?: RequestConfig): Promise<T>
  async upload<T>(endpoint: string, file: File, config?: RequestConfig): Promise<T>

  // Auto-refresh de tokens
  private async handleTokenRefresh(): Promise<void>
}
```

### 8.3 Configuración de Ambiente

```typescript
// /src/config/environment.ts

export const config = {
  // URLs de API
  API_BASE_URL: import.meta.env.DEV
    ? 'http://localhost:3001/api'
    : 'https://api.esap.edu.co/api',
  API_VERSION: 'v1',
  API_TIMEOUT: 30000,      // 30 segundos
  API_RETRY_ATTEMPTS: 3,

  // Paginación
  DEFAULT_PAGE_SIZE: 20,

  // Caché
  CACHE_DURATION: 5 * 60 * 1000, // 5 minutos

  // Storage Keys
  STORAGE_KEYS: {
    AUTH_TOKEN: 'esap_auth_token',
    REFRESH_TOKEN: 'esap_refresh_token',
    USER_DATA: 'esap_user_data',
    PREFERENCES: 'esap_preferences',
  },

  // Feature Flags
  FEATURES: {
    enableWebSockets: true,
    enableCache: true,
    enableOfflineMode: false,
    enableAnalytics: import.meta.env.PROD,
  }
};
```

### 8.4 Servicios Principales

#### Auth Service
```typescript
// /src/services/api/auth.service.ts

const authService = {
  // Login con JWT
  login: async (email: string, password: string) => {
    const response = await apiClient.post('/auth/login', { email, password });
    return response; // { accessToken, refreshToken, user }
  },

  // Logout
  logout: async () => {
    await apiClient.post('/auth/logout');
    localStorage.clear();
  },

  // Refresh token
  refreshToken: async () => {
    const refreshToken = localStorage.getItem('esap_refresh_token');
    return apiClient.post('/auth/refresh', { refreshToken });
  },

  // Recuperación de contraseña
  solicitarRecuperacion: (email: string) =>
    apiClient.post('/auth/recuperar-password/solicitar', { email }),

  verificarCodigo: (email: string, codigo: string) =>
    apiClient.post('/auth/recuperar-password/verificar', { email, codigo }),

  cambiarPassword: (email: string, codigo: string, newPassword: string) =>
    apiClient.post('/auth/recuperar-password/cambiar', { email, codigo, newPassword }),
};
```

#### PTA Service
```typescript
// /src/services/api/ptaAPI.ts

const ptaService = {
  // CRUD de PTA
  getPTAs: (filtros: FiltrosPTA) => apiClient.get('/pta', { params: filtros }),
  getPTAById: (id: string) => apiClient.get(`/pta/${id}`),
  crearPTA: (pta: CreatePTADTO) => apiClient.post('/pta', pta),
  actualizarPTA: (id: string, pta: UpdatePTADTO) => apiClient.put(`/pta/${id}`, pta),

  // Flujo de aprobación
  enviarAprobacion: (id: string, nivel: number) =>
    apiClient.post(`/pta/${id}/aprobacion`, { nivel }),
  aprobar: (id: string, comentario: string) =>
    apiClient.post(`/pta/${id}/aprobar`, { comentario }),
  rechazar: (id: string, motivo: string) =>
    apiClient.post(`/pta/${id}/rechazar`, { motivo }),

  // PTA en firme
  radicar: (id: string) => apiClient.post(`/pta/${id}/radicar`),
};
```

---

## 9. Sistema de Autenticación y Seguridad

### 9.1 Flujo de Autenticación

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Usuario   │────▶│   Login     │────▶│   Backend   │────▶│    JWT      │
│  (Browser)  │     │   Form      │     │   /auth     │     │   Tokens    │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
                                                                   │
                    ┌──────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        TOKEN MANAGEMENT                                 │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Access Token                    Refresh Token                          │
│  ├── Corta duración (15-30min)   ├── Larga duración (7 días)           │
│  ├── Header: Authorization       ├── localStorage                       │
│  └── Cada request                └── Solo para refresh                  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 9.2 Discriminación por Dominio

```typescript
// Lógica en LoginPage.tsx
const determinarTipoUsuario = (email: string): TipoUsuario => {
  if (email.endsWith('@esap.edu.co')) {
    return 'interno';  // Empleado ESAP → Portal completo
  }
  return 'externo';    // Usuario externo → Portal limitado
};
```

### 9.3 Control de Acceso (RBAC)

```typescript
// Sistema de roles y permisos
interface User {
  id: string;
  roles: Role[];
  permissions: string[];
  asignacionesSedes: AsignacionSede[];      // Acceso por sede
  asignacionesProgramas: AsignacionPrograma[]; // Acceso por programa
}

// Roles principales
type Role =
  | 'ADMIN'
  | 'DOCENTE'
  | 'JEFE_AREA'
  | 'DIRECTOR_TERRITORIAL'
  | 'DIRECTOR_ACADEMICO'
  | 'APROBADOR_PTA'
  | 'FIRMANTE'
  | 'AUDITOR'
  | 'ESTUDIANTE';

// Verificación de permisos
const tienePermiso = (user: User, permiso: string): boolean => {
  return user.permissions.includes(permiso) ||
         user.roles.some(r => r.permissions.includes(permiso));
};
```

### 9.4 Gestión de Sesión

```typescript
// Control de inactividad
const SESSION_CONFIG = {
  INACTIVITY_TIMEOUT: 14 * 60 * 1000,  // 14 minutos
  WARNING_BEFORE: 1 * 60 * 1000,        // 1 minuto de aviso
  SESSION_DURATION: 24 * 60 * 60 * 1000 // 24 horas máximo
};

// Flujo de inactividad:
// 1. Usuario inactivo por 14 min → Toast warning
// 2. Modal: "¿Continuar sesión?"
// 3. Si no responde en 1 min → Auto-logout
```

### 9.5 Protecciones de Seguridad

| Protección | Implementación |
|------------|----------------|
| XSS | Sanitización de inputs, escape de HTML |
| CSRF | Headers de validación, tokens |
| Session Hijacking | Validación de timestamp, fingerprinting |
| Brute Force | Rate limiting en backend |
| Token Exposure | Refresh token rotation |

---

## 10. Modelos de Datos

### 10.1 Modelo de Usuario

```typescript
// /src/types/user.types.ts

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  documentType: 'CC' | 'CE' | 'TI' | 'PASAPORTE';
  documentNumber: string;
  phone?: string;
  address?: string;

  // Roles y permisos
  roles: Role[];
  permissions: string[];

  // Asignaciones
  asignacionesSedes: AsignacionSede[];
  asignacionesProgramas: AsignacionPrograma[];

  // Estado
  status: 'active' | 'inactive' | 'pending' | 'blocked';
  emailVerified: boolean;
  lastLogin?: Date;

  // Metadata
  createdAt: Date;
  updatedAt: Date;
}
```

### 10.2 Modelo de Plan de Trabajo Académico (PTA)

```typescript
// /src/types/gestion-profesoral.ts

interface PlanTrabajoAcademico {
  id: string;
  codigo: string;
  docenteId: string;
  docente: DocenteInfo;
  periodoId: string;
  periodo: PeriodoAcademico;

  // Estado del PTA
  estado: EstadoPTA;

  // Componentes (distribución de horas)
  componenteDocencia: ComponenteDocencia;
  componenteInvestigacion: ComponenteInvestigacion;
  componenteExtension: ComponenteExtension;
  componenteComplementarias: ComponenteComplementarias;

  // Totales
  totalHorasAsignadas: number;
  horasBase: number;

  // Aprobación
  historialAprobaciones: DecisionAprobacion[];
  nivelAprobacionActual: 1 | 2 | 3;

  // Radicación (PTA en firme)
  radicado?: string;
  fechaRadicacion?: Date;

  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

type EstadoPTA =
  | 'BORRADOR'
  | 'EN_REVISION'
  | 'APROBADO_NIVEL_1'
  | 'APROBADO_NIVEL_2'
  | 'APROBADO_NIVEL_3'
  | 'RECHAZADO'
  | 'EN_FIRME';
```

### 10.3 Modelo de Auditoría (Control Interno)

```typescript
// /src/types/control-interno.ts

interface AuditoriaGlobal {
  id: string;
  codigo: string;
  nombre: string;
  tipo: TipoAuditoria;
  estado: EstadoAuditoria;

  // Planificación
  planAnual: PlanAnualAuditoria;

  // Ejecución
  hallazgos: Hallazgo[];
  planesImplementacion: PlanImplementacion[];

  // Seguimiento
  indicadores: IndicadorAuditoria[];

  // Responsables
  auditorLider: User;
  equipoAuditoria: User[];

  // Fechas
  fechaInicio: Date;
  fechaPlanificada: Date;
  fechaReal?: Date;
}

type EstadoAuditoria =
  | 'PLANIFICADA'
  | 'EN_EJECUCION'
  | 'EN_REVISION'
  | 'FINALIZADA'
  | 'CANCELADA';
```

### 10.4 Estructura Organizacional

```typescript
// /src/types/estructura-organizacional.types.ts

interface Sede {
  id: string;
  codigo: string;
  nombre: string;
  tipo: 'PRINCIPAL' | 'TERRITORIAL' | 'CETAP';
  direccion: string;
  ciudad: string;
  departamento: string;

  // Jerarquía
  sedePadreId?: string;
  sedesHijas: Sede[];

  // Programas ofertados
  programas: Programa[];
}

interface Programa {
  id: string;
  codigo: string;
  nombre: string;
  nivel: 'PREGRADO' | 'POSGRADO' | 'EDUCACION_CONTINUA';
  modalidad: 'PRESENCIAL' | 'VIRTUAL' | 'HIBRIDO';
  estado: 'ACTIVO' | 'INACTIVO';
}
```

---

## 11. Flujos de la Aplicación

### 11.1 Flujo de Autenticación Completo

```
┌────────────────────────────────────────────────────────────────────────┐
│                    FLUJO DE AUTENTICACIÓN                              │
└────────────────────────────────────────────────────────────────────────┘

    ┌─────────┐
    │ Usuario │
    └────┬────┘
         │
         ▼
    ┌─────────────┐     ┌─────────────┐
    │   Landing   │────▶│   Login     │
    │    Page     │     │    Page     │
    └─────────────┘     └──────┬──────┘
                               │
                    ┌──────────┴──────────┐
                    │                     │
                    ▼                     ▼
              ┌───────────┐         ┌───────────┐
              │  @esap.co │         │  Externo  │
              │  interno  │         │           │
              └─────┬─────┘         └─────┬─────┘
                    │                     │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │   POST /auth/login  │
                    └──────────┬──────────┘
                               │
                    ┌──────────┴──────────┐
                    │                     │
                    ▼                     ▼
              ┌───────────┐         ┌───────────┐
              │  Success  │         │   Error   │
              │           │         │           │
              └─────┬─────┘         └─────┬─────┘
                    │                     │
                    ▼                     ▼
              ┌───────────┐         ┌───────────┐
              │  Guardar  │         │  Mostrar  │
              │  Tokens   │         │   Toast   │
              └─────┬─────┘         └───────────┘
                    │
                    ▼
              ┌───────────┐
              │  Redirect │
              │  Portal   │
              └───────────┘
```

### 11.2 Flujo del Plan de Trabajo Académico (PTA)

```
┌────────────────────────────────────────────────────────────────────────┐
│                      FLUJO DE APROBACIÓN PTA                           │
└────────────────────────────────────────────────────────────────────────┘

    ┌──────────────┐
    │   DOCENTE    │
    │  Crea PTA    │
    └──────┬───────┘
           │
           ▼
    ┌──────────────┐
    │   BORRADOR   │◀─────────────────────────────────┐
    └──────┬───────┘                                  │
           │ Envía                                    │
           ▼                                          │
    ┌──────────────┐     ┌──────────────┐            │
    │  EN_REVISION │────▶│  RECHAZADO   │────────────┘
    └──────┬───────┘     └──────────────┘   Devolver para
           │                                 corrección
           ▼
    ┌──────────────┐
    │   NIVEL 1    │     Programación Académica
    │  (Aprobado)  │
    └──────┬───────┘
           │
           ▼
    ┌──────────────┐
    │   NIVEL 2    │     Director Territorial
    │  (Aprobado)  │
    └──────┬───────┘
           │
           ▼
    ┌──────────────┐
    │   NIVEL 3    │     Director Académico
    │  (Aprobado)  │
    └──────┬───────┘
           │
           ▼
    ┌──────────────┐
    │   EN_FIRME   │     Radicado único generado
    │   Radicado   │     Carga de evidencias
    └──────────────┘
```

### 11.3 Flujo del Portal Transaccional

```
┌────────────────────────────────────────────────────────────────────────┐
│                   PORTAL TRANSACCIONAL - DASHBOARD DINÁMICO            │
└────────────────────────────────────────────────────────────────────────┘

    Usuario Autenticado
           │
           ▼
    ┌──────────────────┐
    │  Cargar Roles    │
    │   del Usuario    │
    └────────┬─────────┘
             │
             ▼
    ┌──────────────────────────────────────────────────────────────────┐
    │                    SERVICIOS DISPONIBLES                         │
    │                    (según roles del usuario)                     │
    ├──────────────────────────────────────────────────────────────────┤
    │                                                                  │
    │  Rol: DOCENTE           Rol: JEFE_AREA        Rol: FIRMANTE     │
    │  ┌─────────────────┐    ┌─────────────────┐   ┌──────────────┐  │
    │  │    Mi PTA       │    │ Mis Auditorías  │   │  Documentos  │  │
    │  │    (crear,      │    │ Planes Mejora   │   │  por Firmar  │  │
    │  │    editar)      │    │                 │   │              │  │
    │  └─────────────────┘    └─────────────────┘   └──────────────┘  │
    │                                                                  │
    │  Rol: APROBADOR_PTA     TODOS LOS USUARIOS                      │
    │  ┌─────────────────┐    ┌─────────────────┐                     │
    │  │    PTAs por     │    │ Mis Certificados│                     │
    │  │    Aprobar      │    │ Mi Perfil       │                     │
    │  │                 │    │ Notificaciones  │                     │
    │  └─────────────────┘    └─────────────────┘                     │
    │                                                                  │
    └──────────────────────────────────────────────────────────────────┘
```

---

## 12. Integraciones Externas

### 12.1 Integración con Figma

La aplicación fue diseñada y se sincroniza con Figma:

```
Figma Design
URL: https://www.figma.com/design/rSdlH0GnlD3kNg2iLZ4x0n/PlataformaComUNIdadESAP

     ┌──────────────┐
     │    Figma     │
     │   Design     │
     └──────┬───────┘
            │
            ▼
     ┌──────────────┐
     │  Figma Make  │  Plugin de sincronización
     └──────┬───────┘
            │
            ▼
     ┌──────────────┐
     │   Assets &   │  Imágenes, iconos
     │  Components  │  Componentes React
     └──────────────┘
```

**Configuración en vite.config.ts:**
```typescript
resolve: {
  alias: {
    'figma:asset/[id]': './src/assets/[archivo]'
  }
}
```

### 12.2 Integración con Backend

```
Frontend (React)                    Backend (Node.js/Express)
     │                                      │
     │  HTTP/REST                           │
     │  ────────────────────────────────▶   │
     │  Authorization: Bearer [JWT]         │
     │                                      │
     │  WebSocket (opcional)                │
     │  ◀────────────────────────────────   │
     │  Notificaciones tiempo real          │
     │                                      │

Endpoints principales:
├── /auth/*           # Autenticación
├── /usuarios/*       # Gestión de usuarios
├── /pta/*            # Plan de Trabajo Académico
├── /certificados/*   # Certificados
├── /auditorias/*     # Control interno
├── /notificaciones/* # Notificaciones
└── /reportes/*       # Generación de reportes
```

### 12.3 Generación de Documentos

```typescript
// PDF Generation (jsPDF)
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const generarPDF = (data: ReporteData) => {
  const doc = new jsPDF();
  doc.text('Reporte ESAP', 20, 20);
  autoTable(doc, { /* tabla de datos */ });
  doc.save('reporte.pdf');
};

// Excel Generation (XLSX)
import * as XLSX from 'xlsx';

const generarExcel = (data: any[]) => {
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Datos');
  XLSX.writeFile(wb, 'reporte.xlsx');
};

// QR Generation & Reading
import QRCode from 'qrcode.react';
import jsQR from 'jsqr';
```

---

## 13. Patrones de Diseño

### 13.1 Patrones de Componentes

| Patrón | Uso | Ejemplo |
|--------|-----|---------|
| **Compound Components** | Componentes relacionados | `<Tabs>`, `<TabsList>`, `<TabsContent>` |
| **Render Props** | Compartir lógica | Formularios dinámicos |
| **Higher-Order Components** | Envolver componentes | `withAuth()`, `withPermissions()` |
| **Custom Hooks** | Lógica reutilizable | `usePTA()`, `useAuth()` |
| **Provider Pattern** | Estado global | `PTAProvider`, `AuthProvider` |

### 13.2 Patrones de Estado

```typescript
// Patrón: Estado derivado
const usePTACalculado = (pta: PTA) => {
  const totalHoras = useMemo(() =>
    calcularTotalHoras(pta), [pta]
  );

  const esValido = useMemo(() =>
    validarDistribucion(pta), [pta]
  );

  return { totalHoras, esValido };
};

// Patrón: Reducer para estados complejos
const [estado, dispatch] = useReducer(ptaReducer, estadoInicial);

dispatch({ type: 'ACTUALIZAR_COMPONENTE', payload: { ... } });
```

### 13.3 Patrones de Servicios

```typescript
// Patrón: Singleton para APIClient
class APIClient {
  private static instance: APIClient;

  static getInstance(): APIClient {
    if (!APIClient.instance) {
      APIClient.instance = new APIClient();
    }
    return APIClient.instance;
  }
}

// Patrón: Service Layer
const usuariosService = {
  getAll: () => apiClient.get('/usuarios'),
  getById: (id: string) => apiClient.get(`/usuarios/${id}`),
  create: (data: CreateUserDTO) => apiClient.post('/usuarios', data),
  update: (id: string, data: UpdateUserDTO) => apiClient.put(`/usuarios/${id}`, data),
  delete: (id: string) => apiClient.delete(`/usuarios/${id}`),
};
```

### 13.4 Patrones de UI

```
Error Boundaries          → Aislamiento de errores por módulo
Loading Skeletons         → Feedback visual durante carga
Optimistic Updates        → UI inmediata, rollback si falla
Debounce/Throttle        → Optimización de búsquedas
Lazy Loading             → Carga diferida de módulos
Code Splitting           → División de bundles por ruta
```

---

## 14. Guía de Desarrollo

### 14.1 Configuración del Entorno

```bash
# Clonar repositorio
git clone <url-repositorio>
cd Plataformacomunidadesap

# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npm run dev

# Build de producción
npm run build

# Preview del build
npm run preview
```

### 14.2 Estructura de un Nuevo Componente

```typescript
// /src/components/esap/NuevoModulo.tsx

import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface NuevoModuloProps {
  titulo: string;
  onAccion?: () => void;
}

export function NuevoModulo({ titulo, onAccion }: NuevoModuloProps) {
  // Estado local
  const [estado, setEstado] = useState<string>('inicial');

  // Query para datos
  const { data, isLoading, error } = useQuery({
    queryKey: ['datos-modulo'],
    queryFn: () => servicioModulo.getDatos(),
  });

  // Mutación para acciones
  const mutation = useMutation({
    mutationFn: servicioModulo.ejecutarAccion,
    onSuccess: () => {
      toast.success('Acción completada');
      onAccion?.();
    },
    onError: (error) => {
      toast.error('Error al ejecutar acción');
    },
  });

  // Renderizado
  if (isLoading) return <Skeleton />;
  if (error) return <ErrorBoundary error={error} />;

  return (
    <Card>
      <CardHeader>
        <h2>{titulo}</h2>
      </CardHeader>
      <CardContent>
        {/* Contenido del módulo */}
        <Button onClick={() => mutation.mutate()}>
          Ejecutar Acción
        </Button>
      </CardContent>
    </Card>
  );
}
```

### 14.3 Creación de un Custom Hook

```typescript
// /src/hooks/useNuevoHook.ts

import { useState, useEffect, useCallback } from 'react';

interface UseNuevoHookOptions {
  valorInicial?: string;
  autoGuardar?: boolean;
}

interface UseNuevoHookReturn {
  valor: string;
  setValor: (v: string) => void;
  guardar: () => Promise<void>;
  isLoading: boolean;
  error: Error | null;
}

export function useNuevoHook(
  options: UseNuevoHookOptions = {}
): UseNuevoHookReturn {
  const { valorInicial = '', autoGuardar = false } = options;

  const [valor, setValor] = useState(valorInicial);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const guardar = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      await servicio.guardar(valor);
    } catch (e) {
      setError(e as Error);
    } finally {
      setIsLoading(false);
    }
  }, [valor]);

  // Auto-guardar si está habilitado
  useEffect(() => {
    if (autoGuardar && valor !== valorInicial) {
      const timer = setTimeout(guardar, 1000);
      return () => clearTimeout(timer);
    }
  }, [valor, autoGuardar, guardar, valorInicial]);

  return { valor, setValor, guardar, isLoading, error };
}
```

### 14.4 Creación de un Nuevo Servicio

```typescript
// /src/services/api/nuevoServicio.service.ts

import { apiClient } from './client';

export interface NuevoRecurso {
  id: string;
  nombre: string;
  estado: string;
}

export interface CreateNuevoRecursoDTO {
  nombre: string;
}

export interface UpdateNuevoRecursoDTO {
  nombre?: string;
  estado?: string;
}

export const nuevoServicioService = {
  // GET /nuevo-recurso
  getAll: async (filtros?: Record<string, any>): Promise<NuevoRecurso[]> => {
    return apiClient.get('/nuevo-recurso', { params: filtros });
  },

  // GET /nuevo-recurso/:id
  getById: async (id: string): Promise<NuevoRecurso> => {
    return apiClient.get(`/nuevo-recurso/${id}`);
  },

  // POST /nuevo-recurso
  create: async (data: CreateNuevoRecursoDTO): Promise<NuevoRecurso> => {
    return apiClient.post('/nuevo-recurso', data);
  },

  // PUT /nuevo-recurso/:id
  update: async (id: string, data: UpdateNuevoRecursoDTO): Promise<NuevoRecurso> => {
    return apiClient.put(`/nuevo-recurso/${id}`, data);
  },

  // DELETE /nuevo-recurso/:id
  delete: async (id: string): Promise<void> => {
    return apiClient.delete(`/nuevo-recurso/${id}`);
  },
};
```

### 14.5 Convenciones de Código

```typescript
// Nombres de archivos
ComponentePascalCase.tsx        // Componentes
useHookCamelCase.ts            // Hooks
servicio.service.ts            // Servicios
nombre.types.ts                // Tipos

// Nombres de variables y funciones
const variableCamelCase = '';
const funcionCamelCase = () => {};
const CONSTANTE_MAYUSCULAS = '';

// Nombres de tipos e interfaces
interface INombreInterface {}   // Con prefijo I (opcional)
type TipoNombre = {};          // Sin prefijo

// Imports organizados
import React from 'react';                    // 1. React
import { useState } from 'react';             // 2. React hooks
import { useQuery } from '@tanstack/react-query'; // 3. Librerías externas
import { Button } from '@/components/ui';     // 4. Componentes internos
import { useAuth } from '@/hooks';            // 5. Hooks internos
import { authService } from '@/services';     // 6. Servicios
import type { User } from '@/types';          // 7. Tipos
```

---

## 15. Diagramas de Arquitectura

### 15.1 Diagrama de Arquitectura General

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│                           PlataformaComUNIdadESAP                           │
│                          Arquitectura de Alto Nivel                         │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│    ┌─────────────────────────────────────────────────────────────────┐     │
│    │                      CAPA DE PRESENTACIÓN                        │     │
│    │  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐       │     │
│    │  │    Landing    │  │    Portal     │  │   Backoffice  │       │     │
│    │  │     Page      │  │ Transaccional │  │     Admin     │       │     │
│    │  └───────────────┘  └───────────────┘  └───────────────┘       │     │
│    └─────────────────────────────────────────────────────────────────┘     │
│                                     │                                       │
│                                     ▼                                       │
│    ┌─────────────────────────────────────────────────────────────────┐     │
│    │                    CAPA DE MICRO-FRONTENDS                       │     │
│    │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐  │     │
│    │  │ Gestión │ │ Control │ │Certific.│ │Comunidad│ │Reportes │  │     │
│    │  │Profesora│ │ Interno │ │         │ │         │ │         │  │     │
│    │  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘  │     │
│    └─────────────────────────────────────────────────────────────────┘     │
│                                     │                                       │
│                                     ▼                                       │
│    ┌─────────────────────────────────────────────────────────────────┐     │
│    │                      CAPA DE ESTADO                              │     │
│    │  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐       │     │
│    │  │    Context    │  │   TanStack    │  │  React Hook   │       │     │
│    │  │     API       │  │    Query      │  │     Form      │       │     │
│    │  └───────────────┘  └───────────────┘  └───────────────┘       │     │
│    └─────────────────────────────────────────────────────────────────┘     │
│                                     │                                       │
│                                     ▼                                       │
│    ┌─────────────────────────────────────────────────────────────────┐     │
│    │                     CAPA DE SERVICIOS                            │     │
│    │  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐       │     │
│    │  │   APIClient   │  │ Auth Service  │  │  Integration  │       │     │
│    │  │  (Singleton)  │  │   (JWT)       │  │   Services    │       │     │
│    │  └───────────────┘  └───────────────┘  └───────────────┘       │     │
│    └─────────────────────────────────────────────────────────────────┘     │
│                                     │                                       │
│                                     ▼                                       │
│    ┌─────────────────────────────────────────────────────────────────┐     │
│    │                        BACKEND API                               │     │
│    │              REST API + WebSockets (opcional)                    │     │
│    │                   api.esap.edu.co                                │     │
│    └─────────────────────────────────────────────────────────────────┘     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 15.2 Diagrama de Componentes UI

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│                        SISTEMA DE COMPONENTES                               │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│    NIVEL 1: Primitivos (Radix UI + Tailwind)                               │
│    ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐      │
│    │ Button │ │ Input  │ │ Select │ │ Dialog │ │ Table  │ │  Card  │      │
│    └────────┘ └────────┘ └────────┘ └────────┘ └────────┘ └────────┘      │
│                                                                             │
│    NIVEL 2: Compuestos (Shadcn/ui)                                         │
│    ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐    │
│    │   DataTable  │ │    Form      │ │   Calendar   │ │   Command    │    │
│    │  + Filters   │ │  + Fields    │ │  + Picker    │ │  + Palette   │    │
│    └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘    │
│                                                                             │
│    NIVEL 3: Features (Componentes de negocio)                              │
│    ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐    │
│    │  PTAEditor   │ │  UserAdmin   │ │  AuditLog    │ │ Certificate  │    │
│    │  Component   │ │   Module     │ │   Table      │ │  Generator   │    │
│    └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘    │
│                                                                             │
│    NIVEL 4: Páginas (Vistas completas)                                     │
│    ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐    │
│    │   Landing    │ │    Portal    │ │  Backoffice  │ │   Profile    │    │
│    │    Page      │ │  Dashboard   │ │     App      │ │    Page      │    │
│    └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 15.3 Diagrama de Flujo de Datos

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│                          FLUJO DE DATOS                                     │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│    ┌──────────┐                                                             │
│    │  Usuario │                                                             │
│    └────┬─────┘                                                             │
│         │ Interacción (click, input, etc.)                                  │
│         ▼                                                                   │
│    ┌──────────────┐                                                         │
│    │  Componente  │                                                         │
│    │     React    │                                                         │
│    └────┬─────────┘                                                         │
│         │ Trigger action                                                    │
│         ▼                                                                   │
│    ┌──────────────────────────────────────────────────────────────────┐    │
│    │                      GESTIÓN DE ESTADO                           │    │
│    │  ┌────────────┐   ┌────────────┐   ┌────────────┐               │    │
│    │  │  useState  │   │  Context   │   │  TanStack  │               │    │
│    │  │ (UI local) │   │  (global)  │   │   Query    │               │    │
│    │  └────────────┘   └────────────┘   └─────┬──────┘               │    │
│    └───────────────────────────────────────────┼──────────────────────┘    │
│                                                │                            │
│                                                ▼ API Call                   │
│    ┌──────────────────────────────────────────────────────────────────┐    │
│    │                         SERVICIOS                                │    │
│    │  ┌────────────────────────────────────────────────────────────┐ │    │
│    │  │                       APIClient                             │ │    │
│    │  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐          │ │    │
│    │  │  │   GET   │ │  POST   │ │   PUT   │ │ DELETE  │          │ │    │
│    │  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘          │ │    │
│    │  └────────────────────────────────────────────────────────────┘ │    │
│    └───────────────────────────────┬──────────────────────────────────┘    │
│                                    │ HTTP Request                          │
│                                    ▼                                       │
│    ┌──────────────────────────────────────────────────────────────────┐    │
│    │                         BACKEND API                              │    │
│    │                  (REST + autenticación JWT)                      │    │
│    └───────────────────────────────┬──────────────────────────────────┘    │
│                                    │ HTTP Response                         │
│                                    ▼                                       │
│    ┌──────────────────────────────────────────────────────────────────┐    │
│    │                       CACHE & UPDATE                             │    │
│    │  ┌────────────┐   ┌────────────┐   ┌────────────┐               │    │
│    │  │  Query     │──▶│  Invalidate│──▶│  Re-fetch  │               │    │
│    │  │   Cache    │   │   Queries  │   │    Data    │               │    │
│    │  └────────────┘   └────────────┘   └─────┬──────┘               │    │
│    └───────────────────────────────────────────┼──────────────────────┘    │
│                                                │                            │
│                                                ▼ Re-render                  │
│    ┌──────────────┐                                                         │
│    │  Componente  │ ◀── Datos actualizados                                 │
│    │   (updated)  │                                                         │
│    └──────────────┘                                                         │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Apéndice A: Glosario de Términos

| Término | Definición |
|---------|------------|
| **CETAP** | Centro Territorial de Administración Pública |
| **Componente Docencia** | Parte del PTA dedicada a actividades de enseñanza |
| **Componente Extensión** | Parte del PTA dedicada a proyectos de extensión |
| **Componente Investigación** | Parte del PTA dedicada a investigación |
| **En Firme** | Estado final del PTA donde queda radicado oficialmente |
| **Micro-Frontend** | Módulo independiente que puede desarrollarse y desplegarse por separado |
| **PTA** | Plan de Trabajo Académico - documento que define las actividades del docente |
| **RBAC** | Role-Based Access Control - sistema de permisos basado en roles |
| **Radicado** | Código único que identifica un documento oficial |
| **Territorial** | Sede regional de la ESAP |

---

## Apéndice B: Referencias

- [React Documentation](https://react.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Vite Guide](https://vitejs.dev/guide/)
- [TanStack Query](https://tanstack.com/query/latest)
- [Radix UI](https://www.radix-ui.com/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Shadcn/ui](https://ui.shadcn.com/)

---

## Historial de Cambios

| Versión | Fecha | Autor | Cambios |
|---------|-------|-------|---------|
| 1.0 | Enero 2026 | Equipo de Desarrollo | Documento inicial |

---

*Este documento debe mantenerse actualizado conforme evolucione la arquitectura de la plataforma.*
