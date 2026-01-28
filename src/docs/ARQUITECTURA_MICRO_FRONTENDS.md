# 🏗️ ARQUITECTURA DE MICRO-FRONTENDS - BACKOFFICE ESAP

## 📋 Tabla de Contenidos
1. [Visión General](#visión-general)
2. [Principios de Diseño](#principios-de-diseño)
3. [Estructura de Módulos](#estructura-de-módulos)
4. [Guía de Implementación](#guía-de-implementación)
5. [Patrones de Comunicación](#patrones-de-comunicación)
6. [Despliegue y CI/CD](#despliegue-y-cicd)
7. [Seguridad](#seguridad)
8. [Monitoreo y Observabilidad](#monitoreo-y-observabilidad)

---

## 🎯 Visión General

### ¿Qué son Micro Frontends?

Los **Micro Frontends** son una arquitectura que aplica los principios de los microservicios al frontend, dividiendo la aplicación en piezas más pequeñas, autónomas y desplegables de forma independiente.

### Beneficios para ESAP

✅ **Escalabilidad**: Cada módulo puede crecer independientemente  
✅ **Equipos Autónomos**: Diferentes equipos pueden trabajar en diferentes módulos  
✅ **Despliegue Independiente**: Actualizar un módulo sin afectar otros  
✅ **Tecnología Flexible**: Cada módulo puede usar diferentes versiones de librerías  
✅ **Rendimiento**: Carga lazy de módulos bajo demanda  
✅ **Seguridad**: Aislamiento de módulos y permisos granulares  
✅ **Mantenibilidad**: Código más organizado y fácil de mantener  

---

## 🏛️ Principios de Diseño

### 1. Autonomía de Módulos
Cada módulo debe ser **completamente autónomo** y contener:
- ✅ Componentes UI propios
- ✅ Lógica de negocio específica
- ✅ Servicios API dedicados
- ✅ Estado local
- ✅ Tipos TypeScript
- ✅ Utilidades propias

### 2. Acoplamiento Bajo
- ❌ **NUNCA** importar componentes directamente entre módulos
- ✅ Comunicación a través de **eventos** o **contextos compartidos**
- ✅ Interfaces bien definidas

### 3. Cohesión Alta
- Todo lo relacionado con un módulo debe estar **dentro de su carpeta**
- Evitar dependencias cruzadas

### 4. Responsabilidad Única
- Cada módulo tiene una **responsabilidad clara** del negocio

---

## 📂 Estructura de Módulos

### Estructura General del Proyecto

```
/
├── modules/                          # 🎯 MÓDULOS INDEPENDIENTES
│   ├── core/                         # 🏢 Módulo CORE (Shell Application)
│   │   ├── components/
│   │   │   ├── BackofficeApp.tsx     # App principal
│   │   │   ├── LoginPage.tsx
│   │   │   ├── TopBar.tsx
│   │   │   ├── SidebarPremium.tsx
│   │   │   └── ErrorBoundary.tsx
│   │   ├── hooks/
│   │   │   ├── useAuth.ts
│   │   │   ├── useRoles.ts
│   │   │   └── useNotifications.ts
│   │   ├── services/
│   │   │   ├── auth.service.ts
│   │   │   └── client.ts
│   │   ├── contexts/
│   │   │   └── NotificacionesContext.tsx
│   │   ├── types/
│   │   │   └── core.types.ts
│   │   └── index.ts                  # Exportación pública
│   │
│   ├── personas/                     # 👥 MÓDULO 1: GESTIÓN DE PERSONAS
│   │   ├── components/
│   │   │   ├── UsersPersonsModulePremium.tsx
│   │   │   ├── CreatePersonModal.tsx
│   │   │   ├── PersonDetailsModalV2.tsx
│   │   │   ├── EditUserModal.tsx
│   │   │   └── PersonTimeline.tsx
│   │   ├── hooks/
│   │   │   ├── usePersonasQueries.ts
│   │   │   └── useUserQueries.ts
│   │   ├── services/
│   │   │   ├── personas.service.ts
│   │   │   └── usuarios.service.ts
│   │   ├── types/
│   │   │   └── personas.types.ts
│   │   ├── utils/
│   │   │   └── validaciones.ts
│   │   └── index.ts
│   │
│   ├── estructura-organizacional/    # 🏛️ MÓDULO 2: ESTRUCTURA ORGANIZACIONAL
│   │   ├── components/
│   │   │   ├── EstructuraOrganizacionalModule.tsx
│   │   │   ├── CreateUnidadModal.tsx
│   │   │   ├── GestionAsignacionesSedes.tsx
│   │   │   ├── SelectorTerritorialYSede.tsx
│   │   │   └── VisualizadorTerritorialesCetap.tsx
│   │   ├── hooks/
│   │   │   └── useEstructura.ts
│   │   ├── services/
│   │   │   └── estructura.service.ts
│   │   ├── types/
│   │   │   └── estructura-organizacional.types.ts
│   │   ├── data/
│   │   │   ├── estructura-organizacional-completa.ts
│   │   │   └── territoriales-cetap-completo.ts
│   │   └── index.ts
│   │
│   ├── roles-permisos/               # 🔐 MÓDULO 3: ROLES Y PERMISOS
│   │   ├── components/
│   │   │   ├── RolesAdministrationModulePremium.tsx
│   │   │   ├── CreateRoleModal.tsx
│   │   │   ├── EditRoleModal.tsx
│   │   │   ├── RolePermissionsEditor.tsx
│   │   │   └── AssignAccessModal.tsx
│   │   ├── hooks/
│   │   │   └── useRoles.ts
│   │   ├── services/
│   │   │   ├── rolesService.ts
│   │   │   └── roles-permissions-api.service.ts
│   │   ├── types/
│   │   │   ├── roles-permissions.types.ts
│   │   │   └── roles-sistema.types.ts
│   │   ├── utils/
│   │   │   └── rolesPermisosSync.ts
│   │   └── index.ts
│   │
│   ├── certificados-laborales/       # 📜 MÓDULO 4: CERTIFICADOS LABORALES
│   │   ├── components/
│   │   │   ├── admin/                            # Vista ADMINISTRATIVA
│   │   │   │   ├── CertificadosLaboralesDashboard.tsx
│   │   │   │   ├── GenerarCertificadoModal.tsx
│   │   │   │   ├── ConfiguracionPlantilla.tsx
│   │   │   │   ├── HistorialVerificacionesQR.tsx
│   │   │   │   └── AnalyticsDashboard.tsx
│   │   │   └── portal/                           # Para PORTAL TRANSACCIONAL ⭐
│   │   │       ├── SolicitarCertificado.tsx      # Vista usuario
│   │   │       └── MisCertificados.tsx
│   │   ├── hooks/
│   │   │   └── useCertificados.ts
│   │   ├── services/
│   │   │   └── certificados.service.ts
│   │   ├── types/
│   │   │   └── certificados.ts
│   │   ├── data/
│   │   │   └── empleadosElegiblesCertificados.ts
│   │   └── index.ts
│   │
│   ├── gestion-profesoral/           # 👨‍🏫 MÓDULO 5: GESTIÓN PROFESORAL (PTA)
│   │   ├── components/
│   │   │   ├── admin/                            # Vista ADMINISTRATIVA
│   │   │   │   ├── GestionProfesoralApp.tsx
│   │   │   │   ├── DashboardAprobador.tsx
│   │   │   │   └── ReporteriaPTA.tsx
│   │   │   └── portal/                           # Para PORTAL TRANSACCIONAL ⭐
│   │   │       ├── MiPTA.tsx                     # Vista docente
│   │   │       ├── CrearPTA.tsx
│   │   │       ├── BandejaAprobaciones.tsx       # Vista aprobador
│   │   │       ├── FormularioDocencia.tsx
│   │   │       ├── FormularioInvestigacion.tsx
│   │   │       └── FormularioExtension.tsx
│   │   ├── hooks/
│   │   │   ├── usePTA.ts
│   │   │   ├── usePTAAPI.ts
│   │   │   └── useProrrateoAutomatico.ts
│   │   ├── services/
│   │   │   ├── gestionProfesoralService.ts
│   │   │   ├── ptaAPI.ts
│   │   │   └── ptaPersonasService.ts
│   │   ├── contexts/
│   │   │   └── PTAContext.tsx
│   │   ├── types/
│   │   │   ├── gestion-profesoral.ts
│   │   │   └── pta.types.ts
│   │   ├── lib/
│   │   │   ├── calculoHoras.ts
│   │   │   ├── prorrateo.ts
│   │   │   └── reglasNegocio.ts
│   │   ├── data/
│   │   │   └── docentesGestionProfesoral.ts
│   │   └── index.ts
│   │
│   ├── control-interno/              # 🔍 MÓDULO 6: CONTROL INTERNO DE GESTIÓN
│   │   ├── components/
│   │   │   ├── admin/                            # Vista ADMINISTRATIVA
│   │   │   │   ├── ControlInternoFull.tsx
│   │   │   │   ├── DashboardEjecutivoCIG.tsx
│   │   │   │   ├── ProgramaAnualCIG.tsx
│   │   │   │   ├── GestionAuditoriasKanbanSimple.tsx
│   │   │   │   ├── PlanesMejoramientoModuleRediseno.tsx
│   │   │   │   ├── ExpedientesModulePremium.tsx
│   │   │   │   ├── listas-chequeo/
│   │   │   │   │   ├── ListasChequeoModuleComplete.tsx
│   │   │   │   │   └── ModalCrearPlantilla.tsx
│   │   │   │   └── modals/
│   │   │   │       ├── ModalFormularioAuditoriaWorldClass.tsx
│   │   │   │       └── ModalExpedienteAuditoriaWorldClass.tsx
│   │   │   └── portal/                           # Para PORTAL TRANSACCIONAL ⭐
│   │   │       ├── MisAuditorias.tsx             # Vista usuario auditado
│   │   │       ├── MisPlanesM mejoramiento.tsx
│   │   │       └── CargarEvidencias.tsx
│   │   ├── hooks/
│   │   │   └── useAuditLog.ts
│   │   ├── services/
│   │   │   ├── api.ts
│   │   │   ├── auditLogService.ts
│   │   │   └── controlInternoService.ts
│   │   ├── contexts/
│   │   │   ├── ControlInternoContext.tsx
│   │   │   ├── HallazgosContext.tsx
│   │   │   └── TareasContext.tsx
│   │   ├── types/
│   │   │   └── control-interno.ts
│   │   ├── utils/
│   │   │   ├── constantes.ts
│   │   │   ├── exportadores.ts
│   │   │   ├── helpers.ts
│   │   │   └── validaciones.ts
│   │   ├── data/
│   │   │   └── DatosEjemploAuditorias.ts
│   │   └── index.ts
│   │
│   ├── gestion-legal/                # ⚖️ MÓDULO 7: GESTIÓN LEGAL (SIGL)
│   │   ├── core/
│   │   │   ├── GestionLegalFull.tsx
│   │   │   ├── DashboardEjecutivoSIGL.tsx
│   │   │   ├── SidebarSIGL.tsx
│   │   │   └── types.ts
│   │   ├── modulos/
│   │   │   ├── ModuloDefensaJudicialV3.tsx
│   │   │   ├── ModuloJuzgamientoDisciplinarioV3.tsx
│   │   │   ├── ModuloAsesoriaJuridicaV3.tsx
│   │   │   ├── ProcesosCoactivosV3.tsx
│   │   │   ├── OrganosControl.tsx
│   │   │   └── BuzonOficinaJuridicaV3.tsx
│   │   ├── design-system/
│   │   │   ├── ModalSIGL.tsx
│   │   │   ├── ButtonSIGL.tsx
│   │   │   ├── CardSIGL.tsx
│   │   │   └── tokens.ts
│   │   ├── services/
│   │   │   └── sincronizacionTerminos.ts
│   │   ├── data/
│   │   │   ├── datosExpedientesJudicialesExpandido.ts
│   │   │   ├── datosProcesoDisciplinarios.ts
│   │   │   └── datosConsultasJuridicas.ts
│   │   ├── config/
│   │   │   ├── terminosLegales.ts
│   │   │   └── ConfiguracionesSIGLContext.tsx
│   │   └── index.ts
│   │
│   ├── arquitectura-empresarial/     # 🏢 MÓDULO 8: ARQUITECTURA EMPRESARIAL
│   │   ├── components/
│   │   │   ├── ArquitecturaEmpresarialModule.tsx
│   │   │   ├── DashboardEjecutivoAE.tsx
│   │   │   ├── GestionProyectosAE.tsx
│   │   │   ├── ComplianceMinTIC.tsx
│   │   │   ├── SistemaIndicadores.tsx
│   │   │   └── dominios/
│   │   │       ├── DominioEstrategiaTI.tsx
│   │   │       ├── DominioGobiernoTI.tsx
│   │   │       └── DominioSeguridadPrivacidad.tsx
│   │   ├── services/
│   │   │   └── arquitectura.service.ts
│   │   ├── types/
│   │   │   └── arquitectura.types.ts
│   │   ├── data/
│   │   │   ├── consolidado-lineamientos.ts
│   │   │   ├── lineamientos-mggti.ts
│   │   │   └── lineamientos-mgpti.ts
│   │   └── index.ts
│   │
│   ├── firma-electronica/            # ✍️ MÓDULO 9: FIRMA ELECTRÓNICA
│   │   ├── components/
│   │   │   ├── admin/                            # Vista ADMINISTRATIVA
│   │   │   │   ├── ModuloFirmaElectronicaWorldClass.tsx
│   │   │   │   ├── GestionFlujosFirma.tsx
│   │   │   │   └── DashboardEstadisticas.tsx
│   │   │   └── portal/                           # Para PORTAL TRANSACCIONAL ⭐
│   │   │       ├── MisFirmasPendientes.tsx       # Vista firmante
│   │   │       ├── FirmarDocumento.tsx
│   │   │       ├── VisorDocumentoOTP.tsx
│   │   │       └── HistorialFirmas.tsx
│   │   ├── services/
│   │   │   └── firma.service.ts
│   │   ├── types/
│   │   │   └── firma.types.ts
│   │   └── index.ts
│   │
│   ├── registro-academico/           # 🎓 MÓDULO 10: REGISTRO ACADÉMICO
│   │   ├── components/
│   │   │   ├── GraduatesManagementModule.tsx
│   │   │   ├── ProgramasAcademicosModule.tsx
│   │   │   ├── ValidarCertificadoGrado.tsx
│   │   │   └── VerificarCertificadoTitulo.tsx
│   │   ├── services/
│   │   │   └── registro.service.ts
│   │   ├── types/
│   │   │   └── registro.types.ts
│   │   ├── data/
│   │   │   └── oferta-academica-esap.ts
│   │   └── index.ts
│   │
│   ├── enrolamiento/                 # 📱 MÓDULO 11: ENROLAMIENTO QR
│   │   ├── components/
│   │   │   ├── EnrollmentManagementModule.tsx
│   │   │   ├── GenerateEnrollmentQRModal.tsx
│   │   │   ├── MassEnrollmentModal.tsx
│   │   │   └── EnrollmentConfigModal.tsx
│   │   ├── hooks/
│   │   │   └── useEnrollment.ts
│   │   ├── services/
│   │   │   └── enrollmentService.ts
│   │   └── index.ts
│   │
│   ├── auditoria-sistema/            # 🔎 MÓDULO 12: AUDITORÍA DE SISTEMA
│   │   ├── components/
│   │   │   ├── AuditModulePremium.tsx
│   │   │   ├── AuditLogTable.tsx
│   │   │   ├── AuditTimeline.tsx
│   │   │   └── AuditAnalytics.tsx
│   │   ├── hooks/
│   │   │   └── useAuditQueries.ts
│   │   ├── services/
│   │   │   └── audit.service.ts
│   │   └── index.ts
│   │
│   ├── portal-publico/               # 🌍 MÓDULO 13: PORTAL PÚBLICO
│   │   ├── components/
│   │   │   ├── LandingPage.tsx
│   │   │   ├── PublicCertificateValidation.tsx
│   │   │   ├── PublicTitleVerification.tsx
│   │   │   └── EnrollmentQRLandingUnified.tsx
│   │   ├── services/
│   │   │   └── publico.service.ts
│   │   └── index.ts
│   │
│   └── portal-transaccional/         # 🔐 MÓDULO 14: PORTAL TRANSACCIONAL UNIFICADO ⭐
│       ├── components/
│       │   ├── PortalDashboard.tsx        # Dashboard principal
│       │   ├── PortalNavbar.tsx           # Navbar unificado
│       │   ├── PortalRoute.tsx            # Guard con roles/permisos
│       │   ├── ServiceCard.tsx            # Card de servicio
│       │   ├── NotificationsPanel.tsx     # Panel notificaciones
│       │   ├── PerfilUsuario.tsx          # Perfil editable
│       │   └── widgets/                   # Widgets por servicio
│       │       ├── WidgetPTA.tsx          # Widget Mi PTA
│       │       ├── WidgetAuditorias.tsx   # Widget Auditorías
│       │       ├── WidgetFirmas.tsx       # Widget Firmas
│       │       └── WidgetCertificados.tsx # Widget Certificados
│       ├── hooks/
│       │   ├── useUserServices.ts         # Hook servicios dinámicos ⭐
│       │   └── usePortalNotifications.ts  # Hook notificaciones
│       ├── services/
│       │   └── portal.service.ts
│       ├── types/
│       │   └── portal.types.ts
│       └── index.ts
│
├── shared/                           # 🔧 CÓDIGO COMPARTIDO
│   ├── components/                   # Componentes UI reutilizables
│   │   ├── ui/                       # Shadcn UI Components
│   │   │   ├── button.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── input.tsx
│   │   │   └── ...
│   │   ├── design-system/            # Design System ESAP
│   │   │   └── ModalHeaderClean.tsx
│   │   ├── shared/                   # Componentes compartidos
│   │   │   ├── DataTablePremium.tsx
│   │   │   ├── CommandPalettePremium.tsx
│   │   │   ├── ExportadorReportes.tsx
│   │   │   └── KeyboardShortcutsPanel.tsx
│   │   └── figma/
│   │       └── ImageWithFallback.tsx
│   │
│   ├── hooks/                        # Hooks compartidos
│   │   ├── useAuth.ts
│   │   ├── useNotifications.ts
│   │   ├── useKeyboardShortcuts.ts
│   │   └── useResponsive.ts
│   │
│   ├── services/                     # Servicios compartidos
│   │   ├── client.ts                 # API Client base
│   │   └── config.ts
│   │
│   ├── types/                        # Tipos compartidos
│   │   └── index.ts
│   │
│   ├── utils/                        # Utilidades compartidas
│   │   ├── validation.ts
│   │   ├── toast.ts
│   │   ├── clipboard.ts
│   │   └── reportExport.ts
│   │
│   └── contexts/                     # Contextos globales
│       └── NotificacionesContext.tsx
│
├── config/                           # ⚙️ CONFIGURACIÓN
│   ├── environment.ts
│   └── module-loader.ts              # Cargador de módulos
│
├── App.tsx                           # 🚀 PUNTO DE ENTRADA
└── index.html
```

---

## 🔧 Guía de Implementación

### Paso 1: Configurar el Shell Application (Core)

El **Shell** es el contenedor principal que:
- Gestiona la autenticación
- Carga módulos dinámicamente
- Maneja el enrutamiento principal
- Proporciona el layout base (TopBar, Sidebar)

```typescript
// App.tsx (Shell Application)
import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { BackofficeApp } from './modules/core/components/BackofficeApp';
import { LoginPage } from './modules/core/components/LoginPage';
import { LoadingSpinner } from './shared/components/ui/loading-spinner';

// Lazy loading de módulos
const PersonasModule = lazy(() => import('./modules/personas'));
const ControlInternoModule = lazy(() => import('./modules/control-interno'));
const CertificadosModule = lazy(() => import('./modules/certificados-laborales'));
// ... otros módulos

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<BackofficeApp />}>
          <Route 
            path="personas/*" 
            element={
              <Suspense fallback={<LoadingSpinner />}>
                <PersonasModule />
              </Suspense>
            } 
          />
          <Route 
            path="control-interno/*" 
            element={
              <Suspense fallback={<LoadingSpinner />}>
                <ControlInternoModule />
              </Suspense>
            } 
          />
          {/* Más rutas... */}
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
```

### Paso 2: Estructura de un Módulo (Ejemplo: Control Interno)

```typescript
// modules/control-interno/index.ts
import { lazy } from 'react';

// Exportación principal del módulo
export default lazy(() => import('./components/ControlInternoFull'));

// Exportaciones secundarias (si son necesarias para otros módulos)
export { ControlInternoContext } from './contexts/ControlInternoContext';
export type { Auditoria, PlanMejoramiento } from './types/control-interno';
```

```typescript
// modules/control-interno/components/ControlInternoFull.tsx
import { Routes, Route } from 'react-router-dom';
import { ControlInternoContext } from '../contexts/ControlInternoContext';
import { DashboardEjecutivoCIG } from './DashboardEjecutivoCIG';
import { ProgramaAnualCIG } from './ProgramaAnualCIG';
import { GestionAuditoriasKanbanSimple } from './GestionAuditoriasKanbanSimple';

export default function ControlInternoModule() {
  return (
    <ControlInternoContext.Provider>
      <Routes>
        <Route index element={<DashboardEjecutivoCIG />} />
        <Route path="programa-anual" element={<ProgramaAnualCIG />} />
        <Route path="auditorias" element={<GestionAuditoriasKanbanSimple />} />
        {/* Más rutas... */}
      </Routes>
    </ControlInternoContext.Provider>
  );
}
```

### Paso 3: Comunicación entre Módulos

#### ❌ INCORRECTO (Acoplamiento fuerte)
```typescript
// modules/certificados/components/SomeComponent.tsx
import { PersonDetailsModal } from '../../personas/components/PersonDetailsModal'; // ❌ NO HACER
```

#### ✅ CORRECTO (Comunicación mediante eventos)
```typescript
// shared/utils/events.ts
export const ModuleEvents = {
  OPEN_PERSON_DETAILS: 'module:open-person-details',
  REFRESH_CERTIFICATES: 'module:refresh-certificates',
} as const;

export function emitModuleEvent(eventName: string, data: any) {
  window.dispatchEvent(new CustomEvent(eventName, { detail: data }));
}

export function listenModuleEvent(eventName: string, callback: (data: any) => void) {
  const handler = (e: Event) => callback((e as CustomEvent).detail);
  window.addEventListener(eventName, handler);
  return () => window.removeEventListener(eventName, handler);
}
```

```typescript
// modules/certificados/components/SomeComponent.tsx
import { emitModuleEvent, ModuleEvents } from '@/shared/utils/events';

function handleViewPerson(personId: string) {
  // Emitir evento para que el módulo de personas lo maneje
  emitModuleEvent(ModuleEvents.OPEN_PERSON_DETAILS, { personId });
}
```

```typescript
// modules/personas/components/PersonasModule.tsx
import { useEffect } from 'react';
import { listenModuleEvent, ModuleEvents } from '@/shared/utils/events';

export default function PersonasModule() {
  useEffect(() => {
    const cleanup = listenModuleEvent(ModuleEvents.OPEN_PERSON_DETAILS, ({ personId }) => {
      // Abrir modal de detalles
      openPersonDetails(personId);
    });
    return cleanup;
  }, []);
  
  // ...
}
```

### Paso 4: Estado Compartido (Context API)

```typescript
// shared/contexts/GlobalContext.tsx
import { createContext, useContext, ReactNode } from 'react';

interface GlobalContextType {
  user: User | null;
  permissions: string[];
  sedes: Sede[];
  // ... otros datos globales
}

const GlobalContext = createContext<GlobalContextType | undefined>(undefined);

export function GlobalProvider({ children }: { children: ReactNode }) {
  // Lógica del contexto
  
  return (
    <GlobalContext.Provider value={value}>
      {children}
    </GlobalContext.Provider>
  );
}

export function useGlobalContext() {
  const context = useContext(GlobalContext);
  if (!context) throw new Error('useGlobalContext must be used within GlobalProvider');
  return context;
}
```

---

## 📡 Patrones de Comunicación

### 1. Event Bus (Recomendado para acciones puntuales)
```typescript
// Emisor (Módulo A)
emitModuleEvent('user:updated', { userId: '123' });

// Receptor (Módulo B)
listenModuleEvent('user:updated', ({ userId }) => {
  refreshData(userId);
});
```

### 2. Contextos Globales (Para estado compartido)
```typescript
// En el Shell
<GlobalProvider>
  <NotificacionesProvider>
    <App />
  </NotificacionesProvider>
</GlobalProvider>
```

### 3. Props Drilling (Para componentes padres/hijos)
```typescript
<ParentComponent>
  <ChildComponent onAction={handleAction} />
</ParentComponent>
```

### 4. URL State (Para navegación)
```typescript
// Módulo A redirige a Módulo B con parámetros
navigate('/personas/123?tab=documentos');
```

---

## 🚀 Despliegue y CI/CD

### Estrategia de Despliegue

#### 1. Build por Módulo (Despliegue Independiente)

```yaml
# .github/workflows/deploy-control-interno.yml
name: Deploy Control Interno Module

on:
  push:
    paths:
      - 'modules/control-interno/**'
      - 'shared/**'
    branches:
      - main

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Build Control Interno Module
        run: |
          npm install
          npm run build:module:control-interno
      - name: Deploy to CDN
        run: |
          aws s3 sync dist/modules/control-interno s3://esap-modules/control-interno/
```

#### 2. Versionado de Módulos

```json
// modules/control-interno/package.json
{
  "name": "@esap/control-interno",
  "version": "2.5.1",
  "description": "Módulo de Control Interno de Gestión"
}
```

#### 3. Module Federation (Webpack 5) - AVANZADO

```javascript
// webpack.config.js
const ModuleFederationPlugin = require('webpack/lib/container/ModuleFederationPlugin');

module.exports = {
  plugins: [
    new ModuleFederationPlugin({
      name: 'controlInterno',
      filename: 'remoteEntry.js',
      exposes: {
        './ControlInternoModule': './modules/control-interno/index.ts',
      },
      shared: {
        react: { singleton: true },
        'react-dom': { singleton: true },
      },
    }),
  ],
};
```

---

## 🔒 Seguridad

### 1. Aislamiento de Permisos por Módulo

```typescript
// shared/hooks/useModuleAccess.ts
export function useModuleAccess(moduleName: string) {
  const { permissions } = useAuth();
  
  const canAccess = permissions.some(p => 
    p.startsWith(`${moduleName}:`) || p === 'admin:all'
  );
  
  return { canAccess };
}

// modules/control-interno/index.ts
export default function ControlInternoModule() {
  const { canAccess } = useModuleAccess('control-interno');
  
  if (!canAccess) {
    return <AccessDenied />;
  }
  
  return <ControlInternoFull />;
}
```

### 2. CSP (Content Security Policy)

```html
<!-- index.html -->
<meta http-equiv="Content-Security-Policy" 
      content="default-src 'self'; script-src 'self' https://cdn.esap.edu.co;">
```

### 3. Variables de Entorno por Módulo

```typescript
// modules/control-interno/config/environment.ts
export const CONTROL_INTERNO_CONFIG = {
  API_URL: import.meta.env.VITE_CONTROL_INTERNO_API_URL || 'https://api.esap.edu.co/control-interno',
  FEATURE_FLAGS: {
    HALLAZGOS_AUTOMATICOS: import.meta.env.VITE_CI_HALLAZGOS_AUTO === 'true',
  }
};
```

---

## 📊 Monitoreo y Observabilidad

### 1. Métricas por Módulo

```typescript
// shared/utils/analytics.ts
export function trackModuleLoad(moduleName: string, loadTime: number) {
  console.log(`[Analytics] ${moduleName} cargado en ${loadTime}ms`);
  
  // Enviar a servicio de analytics
  analytics.track('module_load', {
    module: moduleName,
    loadTime,
    timestamp: Date.now(),
  });
}

// modules/control-interno/index.ts
const startTime = performance.now();
export default lazy(() => {
  return import('./components/ControlInternoFull').then(module => {
    const loadTime = performance.now() - startTime;
    trackModuleLoad('control-interno', loadTime);
    return module;
  });
});
```

### 2. Error Boundaries por Módulo

```typescript
// modules/control-interno/components/ControlInternoErrorBoundary.tsx
export class ControlInternoErrorBoundary extends React.Component {
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[Control Interno] Error:', error);
    
    // Enviar a servicio de logging
    logger.error({
      module: 'control-interno',
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
    });
  }
  
  render() {
    if (this.state.hasError) {
      return <ModuleErrorFallback moduleName="Control Interno" />;
    }
    return this.props.children;
  }
}
```

---

## 🎓 Mejores Prácticas

### ✅ DO (Hacer)

1. **Mantener módulos pequeños y enfocados** (< 50 componentes)
2. **Usar lazy loading** para todos los módulos
3. **Documentar las interfaces públicas** de cada módulo
4. **Versionar módulos independientemente**
5. **Escribir tests unitarios** por módulo
6. **Usar TypeScript estricto** (`strict: true`)
7. **Implementar Error Boundaries** en cada módulo
8. **Cachear módulos** en el navegador

### ❌ DON'T (No Hacer)

1. **NO importar componentes** entre módulos directamente
2. **NO compartir estado** a través de variables globales
3. **NO mezclar lógica de negocio** entre módulos
4. **NO usar rutas absolutas** que acoplen módulos
5. **NO deployar todos los módulos** juntos siempre
6. **NO ignorar los límites** de los módulos

---

## 🔍 Herramientas Recomendadas

### Desarrollo
- **Vite**: Build tool rápido con HMR
- **TypeScript**: Tipado estático
- **ESLint**: Linting de código
- **Prettier**: Formateo de código
- **Husky**: Git hooks

### Testing
- **Vitest**: Testing unitario rápido
- **Testing Library**: Testing de componentes
- **Cypress**: Testing E2E

### Monitoreo
- **Sentry**: Error tracking
- **LogRocket**: Session replay
- **Google Analytics**: Métricas de uso

### CI/CD
- **GitHub Actions**: Pipelines de despliegue
- **AWS S3 + CloudFront**: Hosting estático
- **Docker**: Containerización

---

## 📚 Referencias

- [Micro Frontends - Martin Fowler](https://martinfowler.com/articles/micro-frontends.html)
- [Module Federation - Webpack](https://webpack.js.org/concepts/module-federation/)
- [React Lazy Loading](https://react.dev/reference/react/lazy)
- [Vite - Module Federation](https://github.com/originjs/vite-plugin-federation)

---

## 📞 Soporte

Para preguntas sobre la arquitectura de micro-frontends:
- 📧 Email: arquitectura@esap.edu.co
- 💬 Slack: #arquitectura-frontend
- 📖 Wiki: https://wiki.esap.edu.co/micro-frontends

---

**Documento Técnico v3.0 - Enero 2026**  
**ESAP - Backoffice Administrativo ComUNIdad**