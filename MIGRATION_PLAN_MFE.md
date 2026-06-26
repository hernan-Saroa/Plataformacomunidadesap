# Plan de Migración a Microfrontends (Granular) - Plataforma ComUNIdad ESAP

Este documento detalla la estrategia y los pasos técnicos para migrar el frontend actual (monolito) a una arquitectura de **Microfrontends (MFE)** basada en **Vite Module Federation**, donde cada módulo de negocio es un microfrontend independiente.

## 1. Objetivos del Microfrontend Granular
- **Independencia de Despliegue**: Cada uno de los 12 módulos puede desplegarse sin afectar a los demás.
- **Aislamiento de Errores**: Un error en "Reportes" no afecta a "Firma Electrónica".
- **Desarrollo Paralelo**: Equipos diferentes pueden tomar la propiedad total de cada MFE.
- **Optimización de Recursos**: Solo se carga el código del módulo en el que el usuario está trabajando.

## 2. Arquitectura Propuesta (12 Remotos independientes)

Utilizaremos un modelo de **Host (Shell)** y **12 Remotos** mediante el plugin `@originjs/vite-plugin-federation`.

### A. Shell (Host App)
- **Responsabilidades**: Autenticación centralizada, Layout global (Sidebar, TopBar), Enrutamiento dinámico entre los 12 remotos y Contextos globales.

### B. Módulos Remotos (Remote Apps)
Cada uno será un proyecto independiente dentro de un Monorepo:

1.  **MFE-01: Gestión Personas (Roles/Permisos)**
2.  **MFE-02: Estructura Organizacional**
3.  **MFE-03: Programas Académicos**
4.  **MFE-04: Auditoría**
5.  **MFE-05: Reportes**
6.  **MFE-06: Verificación de títulos**
7.  **MFE-07: Gestión Profesoral**
8.  **MFE-08: Certificados Laborales**
9.  **MFE-09: Firma Electrónica**
10. **MFE-10: Control Interno Gestión**
11. **MFE-11: Control Interno Disciplinario**
12. **MFE-12: Gestión Legal**

## 3. Estructura de Carpetas del Monorepo

```text
/
├── apps/
│   ├── shell/                       (Host principal)
│   ├── mfe-gestion-personas/        (MFE-01)
│   ├── mfe-estructura-org/          (MFE-02)
│   ├── mfe-programas/               (MFE-03)
│   ├── mfe-auditoria/               (MFE-04)
│   ├── mfe-reportes/                (MFE-05)
│   ├── mfe-registro-academico/      (MFE-06)
│   ├── mfe-gestion-profesoral/      (MFE-07)
│   ├── mfe-certificados-lab/        (MFE-08)
│   ├── mfe-firma-electronica/       (MFE-09)
│   ├── mfe-control-interno-gestion/ (MFE-10)
│   ├── mfe-control-inter-discipli/  (MFE-11)
│   └── mfe-gestion-legal/           (MFE-12)
├── packages/
│   ├── shared-ui/                   (Componentes visuales comunes)
│   └── shared-services/             (Auth, API Client, Contexts)
└── package.json                     (Configuración de Workspaces)
```

## 4. Mapeo de Fuentes Actuales a Nuevos MFEs

| MFE | Directorio/Archivo actual en `src/` |
| :--- | :--- |
| **01: Gestión Personas** | `components/esap/RolesAdministrationModulePremium.tsx`, `UsersPersonsModulePremium.tsx` |
| **02: Estructura Org** | `components/estructura-organizacional/` |
| **03: Programas Académicos** | `components/esap/ProgramasAcademicosModule.tsx` |
| **04: Auditoría** | `components/esap/audit/`, `components/esap/plan-anual-auditoria/` |
| **05: Reportes** | `components/esap/ReportsModuleV2.tsx`, `ReportBuilderModal.tsx` |
| **06: Verificación de títulos** | `components/esap/registro-academico/` |
| **07: Gestión Profesoral** | `components/gestion-profesoral/`, `modules/gestion-profesoral/` |
| **08: Certificados Lab** | `components/esap/CertificateRequestsModule.tsx` |
| **09: Firma Electrónica** | `components/esap/firma-electronica/` |
| **10: Control Int Gestión** | `components/esap/control-interno/` |
| **11: Control Int Discipl.** | `components/esap/disciplinario/` |
| **12: Gestión Legal** | `components/esap/gestion-legal/` |

## 5. Próximos Pasos (Fase 1: Infraestructura)

1. **Definir la "Shared UI"**: Este es el paso más crítico. Debemos mover los componentes de `src/components/ui` a un paquete compartido para reutilizarlos en los 12 MFEs sin duplicar código.
2. **Configurar el Shell como Host**: El Shell debe ser el único que maneje el login y la sesión de usuario.
3. **Migración Progresiva**: Empezar extrayendo un MFE a la vez para validar el flujo de navegación.
