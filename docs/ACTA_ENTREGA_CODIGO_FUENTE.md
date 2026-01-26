# ACTA DE ENTREGA DE CÓDIGO FUENTE

## Plataforma Comunidades ESAP

---

**Fecha de Entrega:** Enero 2026
**Versión:** 0.1.0
**Tipo de Entrega:** Código Fuente Completo

---

## TABLA DE CONTENIDO

1. [Información General del Proyecto](#1-información-general-del-proyecto)
2. [Resumen de la Entrega](#2-resumen-de-la-entrega)
3. [Estructura General del Proyecto](#3-estructura-general-del-proyecto)
4. [Módulos Funcionales Entregados](#4-módulos-funcionales-entregados)
5. [Componentes de Interfaz de Usuario](#5-componentes-de-interfaz-de-usuario)
6. [Servicios y APIs](#6-servicios-y-apis)
7. [Configuración y Dependencias](#7-configuración-y-dependencias)
8. [Documentación Incluida](#8-documentación-incluida)
9. [Inventario Detallado de Archivos](#9-inventario-detallado-de-archivos)
10. [Instrucciones de Instalación](#10-instrucciones-de-instalación)
11. [Firmas y Aceptación](#11-firmas-y-aceptación)

---

## 1. INFORMACIÓN GENERAL DEL PROYECTO

### 1.1 Datos del Proyecto

| Campo | Valor |
|-------|-------|
| **Nombre del Proyecto** | PlataformaComUNIdadESAP |
| **Versión** | 0.1.0 |
| **Tipo de Aplicación** | Aplicación Web Empresarial |
| **Framework Principal** | React 18.3.1 |
| **Lenguaje** | TypeScript |
| **Herramienta de Construcción** | Vite 6.3.5 |
| **Ubicación del Repositorio** | /home/user/Plataformacomunidadesap |

### 1.2 Alcance Funcional

La plataforma comprende los siguientes sistemas integrados:

1. **Portal Público** - Página de inicio con servicios públicos
2. **Portal Transaccional** - Servicios para usuarios autenticados
3. **Backoffice Administrativo** - Panel de administración
4. **Módulos Especializados** - Control Interno, Disciplinario, Legal, etc.

### 1.3 Usuarios Objetivo

- Estudiantes de la ESAP
- Graduados y egresados
- Docentes y catedráticos
- Funcionarios administrativos
- Público general (para validación de certificados)

---

## 2. RESUMEN DE LA ENTREGA

### 2.1 Estadísticas Generales

| Concepto | Cantidad |
|----------|----------|
| **Total de Archivos Fuente** | 710 |
| **Archivos TypeScript (.ts)** | 147 |
| **Archivos React/TypeScript (.tsx)** | 537 |
| **Archivos de Estilos (.css)** | 3 |
| **Archivos de Documentación (.md)** | 24 |
| **Tamaño Total del Directorio /src** | 38 MB |

### 2.2 Distribución por Tipo de Archivo

```
TypeScript/TSX (código)     ████████████████████████  684 archivos (96.3%)
Documentación (.md)         ██                         24 archivos (3.4%)
Estilos (.css)              ░                           3 archivos (0.3%)
```

### 2.3 Componentes Principales

| Categoría | Archivos | Descripción |
|-----------|----------|-------------|
| Componentes React | 561 | Interfaces de usuario |
| Hooks Personalizados | 29 | Lógica reutilizable |
| Servicios API | 29 | Conexión con backend |
| Tipos TypeScript | 13 | Definiciones de datos |
| Utilidades | 12 | Funciones auxiliares |
| Librerías internas | 11 | Código especializado |

---

## 3. ESTRUCTURA GENERAL DEL PROYECTO

### 3.1 Árbol de Directorios Principal

```
PlataformaComUNIdadESAP/
│
├── 📁 docs/                          # Documentación para usuarios
│   ├── MANUAL_DE_USUARIO.md
│   └── ACTA_ENTREGA_CODIGO_FUENTE.md
│
├── 📁 src/                           # Código fuente principal
│   │
│   ├── 📄 main.tsx                   # Punto de entrada
│   ├── 📄 App.tsx                    # Componente raíz
│   ├── 📄 index.css                  # Estilos globales
│   │
│   ├── 📁 components/                # Componentes React (561 archivos)
│   │   ├── 📁 esap/                  # Módulo Backoffice (421 archivos)
│   │   │   │
│   │   │   ├── 📁 gestion-personas/      # GESTIÓN DE PERSONAS
│   │   │   │   ├── personas/                 # Gestión de personas y usuarios
│   │   │   │   ├── estructura-organizacional/# Estructura organizacional
│   │   │   │   ├── programas-academicos/     # Programas académicos
│   │   │   │   ├── roles-permisos/           # Roles y permisos
│   │   │   │   ├── auditoria/                # Auditoría del sistema
│   │   │   │   └── reportes/                 # Módulo de reportes
│   │   │   │
│   │   │   ├── 📁 control-interno/       # Control Interno CIG (108 archivos)
│   │   │   ├── 📁 gestion-legal/         # Gestión Legal (96 archivos)
│   │   │   ├── 📁 disciplinario/         # Control Disciplinario (30 archivos)
│   │   │   ├── 📁 firma-electronica/     # Firma Electrónica (18 archivos)
│   │   │   ├── 📁 registro-academico/    # Registro Académico
│   │   │   ├── 📁 certificados-laborales/# Certificados Laborales (20 archivos)
│   │   │   ├── 📁 arquitectura-empresarial/ # Arquitectura Empresarial (31 archivos)
│   │   │   ├── 📁 gestion-profesoral/    # Gestión Profesoral PTA (17 archivos)
│   │   │   └── ... (componentes raíz del backoffice)
│   │   │
│   │   ├── 📁 ui/                    # Design system (52 archivos)
│   │   ├── 📁 portal/                # Portal transaccional (43 archivos)
│   │   └── 📁 shared/                # Componentes compartidos (26 archivos)
│   │
│   ├── 📁 hooks/                     # Hooks personalizados (29 archivos)
│   ├── 📁 services/                  # Servicios API (29 archivos)
│   ├── 📁 types/                     # Tipos TypeScript (13 archivos)
│   ├── 📁 utils/                     # Utilidades (12 archivos)
│   ├── 📁 lib/                       # Librerías internas (11 archivos)
│   ├── 📁 data/                      # Datos y mocks (7 archivos)
│   ├── 📁 modules/                   # Módulos independientes (15 archivos)
│   ├── 📁 contexts/                  # Context API (3 archivos)
│   ├── 📁 config/                    # Configuración (1 archivo)
│   ├── 📁 assets/                    # Imágenes y recursos (5 archivos)
│   ├── 📁 styles/                    # Estilos adicionales (2 archivos)
│   ├── 📁 public/                    # Archivos públicos PWA (4 archivos)
│   ├── 📁 docs/                      # Documentación técnica (9 archivos)
│   └── 📁 scripts/                   # Scripts de automatización (1 archivo)
│
├── 📄 package.json                   # Configuración de dependencias
├── 📄 vite.config.ts                 # Configuración de Vite
├── 📄 index.html                     # HTML principal
└── 📄 README.md                      # Documentación básica
```

### 3.2 Descripción de Carpetas Principales

| Carpeta | Propósito | Contenido Principal |
|---------|-----------|---------------------|
| `/docs` | Documentación de usuario | Manuales y guías |
| `/src/components` | Interfaces de usuario | Componentes React organizados por módulo |
| `/src/hooks` | Lógica reutilizable | Hooks personalizados de React |
| `/src/services` | Comunicación backend | Servicios de API y lógica de negocio |
| `/src/types` | Tipado de datos | Definiciones TypeScript |
| `/src/utils` | Funciones auxiliares | Utilidades compartidas |
| `/src/lib` | Código especializado | Cálculos, PDF, autenticación |
| `/src/data` | Datos de prueba | Mocks y datos de ejemplo |
| `/src/config` | Configuración | Variables de entorno |
| `/src/contexts` | Estado global | Context API de React |

---

## 4. MÓDULOS FUNCIONALES ENTREGADOS

### 4.1 Módulo ESAP - Backoffice Administrativo

**Ubicación:** `/src/components/esap/`
**Archivos:** 421
**Porcentaje del proyecto:** 75.0%

Este es el módulo principal que contiene toda la funcionalidad administrativa de la plataforma, incluyendo todos los submódulos especializados.

#### 4.1.1 Componentes en la Raíz (92 archivos)

| Componente | Descripción |
|------------|-------------|
| `BackofficeApp.tsx` | Componente principal del backoffice |
| `LoginPage.tsx` | Pantalla de inicio de sesión |
| `CommandPalette.tsx` | Paleta de comandos rápidos |
| `UsersPersonsModulePremium.tsx` | Gestión de usuarios y personas |
| `RolesAdministrationModulePremium.tsx` | Administración de roles y permisos |
| `GraduatesManagementModule.tsx` | Gestión de graduados |
| `JobBoardManagementModulePremium.tsx` | Bolsa de empleo |
| `AuditModulePremium.tsx` | Auditoría del sistema |
| `CommunityManagementModulePremium.tsx` | Gestión de comunidad |
| `EnrollmentManagementModule.tsx` | Gestión de enrolamiento |
| `ReportsModuleV2.tsx` | Módulo de reportes |
| `CarpetaDigitalModule.tsx` | Carpeta digital de documentos |
| `EstructuraOrganizacionalModule.tsx` | Estructura organizacional |
| `ProgramasAcademicosModule.tsx` | Programas académicos |
| `HelpCenter.tsx` | Centro de ayuda |
| `KeyboardShortcuts.tsx` | Atajos de teclado |

#### 4.1.2 Submódulos Especializados

**a) Gestión de Personas (`/esap/gestion-personas/`)**

Módulo integrado para la administración de personas, estructura organizacional y configuración del sistema:

| Submódulo | Componentes | Descripción |
|-----------|-------------|-------------|
| **Personas** | `UsersPersonsModulePremium.tsx` | Gestión completa de usuarios y personas |
| | `PersonasDataTable.tsx` | Tabla de datos de personas |
| | `PersonaDetalleModal.tsx` | Modal de detalle de persona |
| | `PersonaFormulario.tsx` | Formulario de creación/edición |
| | `CarpetaDigitalModule.tsx` | Carpeta digital de documentos |
| | `EnrollmentManagementModule.tsx` | Gestión de enrolamiento |
| | `GraduatesManagementModule.tsx` | Gestión de graduados |

| Submódulo | Componentes | Descripción |
|-----------|-------------|-------------|
| **Estructura Organizacional** | `EstructuraOrganizacionalModule.tsx` | Módulo principal de estructura |
| | `OrganizacionCompleta.tsx` | Vista completa de organización |
| | `ComponenteArbolOrganigrama.tsx` | Árbol del organigrama |
| | `GestionSedes.tsx` | Gestión de sedes |
| | `GestionAreas.tsx` | Gestión de áreas |
| | `GestionTerritoriales.tsx` | Gestión de territoriales |
| | `GestionCETAP.tsx` | Gestión de CETAP |

| Submódulo | Componentes | Descripción |
|-----------|-------------|-------------|
| **Programas Académicos** | `ProgramasAcademicosModule.tsx` | Módulo principal |
| | `GestionProgramas.tsx` | Gestión de programas |
| | `AsignacionDocentes.tsx` | Asignación de docentes |
| | `PlanesEstudio.tsx` | Planes de estudio |
| | `OfertaAcademica.tsx` | Oferta académica |

| Submódulo | Componentes | Descripción |
|-----------|-------------|-------------|
| **Roles y Permisos** | `RolesAdministrationModulePremium.tsx` | Administración de roles |
| | `PermisosGranulares.tsx` | Permisos granulares |
| | `AsignacionRoles.tsx` | Asignación de roles a usuarios |
| | `MatrizPermisos.tsx` | Matriz de permisos |
| | `GestionAccesos.tsx` | Control de accesos |

| Submódulo | Componentes | Descripción |
|-----------|-------------|-------------|
| **Auditoría del Sistema** | `AuditModulePremium.tsx` | Módulo de auditoría |
| | `AuditLogTable.tsx` | Tabla de logs de auditoría |
| | `AuditFilters.tsx` | Filtros de auditoría |
| | `AuditDetailModal.tsx` | Detalle de registro |
| | `AuditExport.tsx` | Exportación de auditoría |
| | `AnomaliesDetection.tsx` | Detección de anomalías |

| Submódulo | Componentes | Descripción |
|-----------|-------------|-------------|
| **Reportes** | `ReportsModuleV2.tsx` | Módulo de reportes |
| | `ReportBuilder.tsx` | Constructor de reportes |
| | `ReportScheduler.tsx` | Programación de reportes |
| | `ReportTemplates.tsx` | Plantillas de reportes |
| | `ExportPDF.tsx` | Exportación a PDF |
| | `ExportExcel.tsx` | Exportación a Excel |
| | `DashboardReports.tsx` | Dashboard de reportes |

---

**b) Control Interno CIG (`/esap/control-interno/`) - 108 archivos**

Sistema completo para gestión de auditorías internas según Decreto 648:

| Subcarpeta | Contenido |
|------------|-----------|
| `/auditorias/` | Gestión de auditorías |
| `/listas-chequeo/` | Listas de verificación |
| `/hooks/` | Hooks de control interno |
| `/services/` | Servicios API |
| `/utils/` | Utilidades especializadas |

Componentes principales:
- `PlanAnualModule.tsx` - Plan anual de auditorías
- `UniversoAuditorias.tsx` - Catálogo de auditorías
- `GestionAuditoriasKanbanSimple.tsx` - Vista Kanban
- `EjecucionAuditoriaModule.tsx` - Ejecución de auditorías
- `HallazgosYMejoramientoCompleto.tsx` - Hallazgos y mejoras
- `SeguimientoPlanMejoramientoModule.tsx` - Seguimiento
- `DashboardEjecutivoCIG.tsx` - Dashboard ejecutivo

**c) Gestión Legal (`/esap/gestion-legal/`) - 96 archivos**

Sistema para procesos legales y coactivos:

| Subcarpeta | Contenido |
|------------|-----------|
| `/modulos/` | Módulos funcionales |
| `/procesos-coactivos/` | Gestión de procesos |
| `/design-system/` | Componentes UI |
| `/services/` | Servicios API |
| `/core/` | Núcleo del sistema |
| `/config/` | Configuración |
| `/data/` | Datos mock |
| `/utils/` | Utilidades |

**d) Control Disciplinario (`/esap/disciplinario/`) - 30 archivos**

Gestión de procesos disciplinarios:

- `DashboardKanbanOperativo.tsx` - Vista Kanban de procesos
- `GestionProcesos.tsx` - Gestión de procesos
- `GestionProfesionales.tsx` - Gestión de involucrados
- `GestionTerminosAlertas.tsx` - Términos y alertas
- Modales y componentes auxiliares

**e) Firma Electrónica (`/esap/firma-electronica/`) - 18 archivos**

Sistema de firma digital:

- `ModuloFirmaElectronicaWorldClass.tsx` - Módulo principal
- `PortalTransaccionalFirmaCompleto.tsx` - Portal de firmas
- `VisorDocumentoFirmaOTP.tsx` - Visor con OTP
- `ModalHistorialFirmas.tsx` - Historial de firmas
- `ModalTrazabilidadDocumento.tsx` - Trazabilidad

**f) Registro Académico (`/esap/registro-academico/`)**

Sistema para gestión de registros académicos:

| Componente | Descripción |
|------------|-------------|
| `RegistroAcademicoModule.tsx` | Módulo principal de registro académico |
| `GestionMatriculas.tsx` | Gestión de matrículas estudiantiles |
| `HistorialAcademico.tsx` | Consulta de historial académico |
| `CertificacionesTitulos.tsx` | Certificaciones de títulos |
| `GestionNotas.tsx` | Administración de calificaciones |
| `ConsultaEstudiantes.tsx` | Consulta de información estudiantil |
| Componentes auxiliares | Modales, formularios y utilidades |

**g) Certificados Laborales (`/esap/certificados-laborales/`) - 20 archivos**

Sistema completo de certificados laborales con QR:

| Componente | Descripción |
|------------|-------------|
| `CertificadosLaboralesDashboard.tsx` | Dashboard principal |
| `CertificadosLaboralesRouter.tsx` | Enrutador del módulo |
| `GenerarCertificadoModal.tsx` | Generación de certificados |
| `SolicitarCertificadoForm.tsx` | Formulario de solicitud |
| `CertificadoDetalleModal.tsx` | Detalle del certificado |
| `CertificadoDetallePanel.tsx` | Panel de detalles |
| `ConfiguracionPlantilla.tsx` | Configuración de plantillas |
| `ModalCodigoQR.tsx` | Modal de código QR |
| `QRScannerModal.tsx` | Escáner de QR |
| `ValidarCertificadoQR.tsx` | Validador de QR |
| `HistorialVerificacionesQR.tsx` | Historial de verificaciones |
| `HistoricoValidaciones.tsx` | Histórico de validaciones |
| `PDFViewerModal.tsx` | Visor de PDF |
| `NotificacionesValidacion.tsx` | Notificaciones |
| `APIDocumentacion.tsx` | Documentación API |
| `AnalyticsDashboard.tsx` | Dashboard de analíticas |
| `GeneradorReportes.tsx` | Generador de reportes |

**h) Arquitectura Empresarial (`/esap/arquitectura-empresarial/`) - 31 archivos**

Gestión de arquitectura empresarial y cumplimiento MinTIC:

| Componente | Descripción |
|------------|-------------|
| `ArquitecturaEmpresarialModule.tsx` | Módulo principal |
| `DashboardEjecutivoAE.tsx` | Dashboard ejecutivo |
| `GestionProyectosAE.tsx` | Gestión de proyectos |
| `MatrizMadurezCompleta.tsx` | Matriz de madurez |
| `MatrizCumplimientoGlobal.tsx` | Cumplimiento global |
| `RoadmapEstrategico.tsx` | Roadmap estratégico |
| `SeguimientoMinTIC.tsx` | Seguimiento MinTIC |
| `DominioEstrategiaTI.tsx` | Dominio estrategia TI |
| `DominioGobiernoTI.tsx` | Dominio gobierno TI |
| `DominioSeguridadPrivacidad.tsx` | Dominio seguridad |
| `GestionRiesgosTI.tsx` | Gestión de riesgos TI |
| `BibliotecaConocimiento.tsx` | Biblioteca de conocimiento |
| `SeguimientoTerritorial.tsx` | Seguimiento territorial |
| `Indicadores.tsx` | Sistema de indicadores |
| Y componentes adicionales | |

**i) Gestión Profesoral PTA (`/esap/gestion-profesoral/`) - 17 archivos**

Gestión de docentes y Plan de Trabajo Anual (PTA):

| Componente | Descripción |
|------------|-------------|
| `GestionProfesoralApp.tsx` | Aplicación principal |
| `GestionProfesoralDashboard.tsx` | Dashboard general |
| `DashboardDocente.tsx` | Dashboard del docente |
| `DashboardAprobador.tsx` | Dashboard del aprobador |
| `WizardCrearPTA.tsx` | Asistente de creación PTA |
| `VistaDetallePTA.tsx` | Vista detalle del PTA |
| `FormularioDocencia.tsx` | Formulario de docencia |
| `FormularioInvestigacion.tsx` | Formulario de investigación |
| `FormularioExtension.tsx` | Formulario de extensión |
| `FormularioActividadesComplementarias.tsx` | Actividades complementarias |
| `ModalProrrateo.tsx` | Modal de prorrateo automático |
| `PanelRevision.tsx` | Panel de revisión |
| `PlanTrabajoAcademicoModule.tsx` | Módulo PTA |
| `DocenteExpedientePanel.tsx` | Expediente del docente |
| `HistoricoDesarrolloComponent.tsx` | Histórico de desarrollo |

**j) Otras Subcarpetas**

| Subcarpeta | Archivos | Descripción |
|------------|----------|-------------|
| `/admin/` | 3 | Componentes de administración |
| `/alertas/` | - | Sistema de notificaciones |
| `/auth/` | - | Componentes de autenticación |
| `/shared/` | - | Componentes compartidos del backoffice |

---

### 4.2 Módulo UI - Design System

**Ubicación:** `/src/components/ui/`
**Archivos:** 52
**Porcentaje del proyecto:** 9.3%

Biblioteca de componentes reutilizables basada en Radix UI.

#### Componentes Base

| Categoría | Componentes |
|-----------|-------------|
| **Botones y Entradas** | button.tsx, input.tsx, label.tsx, textarea.tsx |
| **Formularios** | form.tsx, checkbox.tsx, radio-group.tsx, switch.tsx, select.tsx |
| **Diálogos** | dialog.tsx, alert-dialog.tsx, confirmation-dialog.tsx |
| **Navegación** | breadcrumb.tsx, navigation-menu.tsx, menubar.tsx, tabs.tsx |
| **Menús** | dropdown-menu.tsx, command.tsx, popover.tsx, context-menu.tsx |
| **Datos** | table.tsx, pagination.tsx |
| **Avisos** | alert.tsx, sonner.tsx (toast) |
| **Layout** | card.tsx, separator.tsx, scroll-area.tsx, resizable.tsx |
| **Feedback** | progress.tsx, skeleton.tsx, badge.tsx, avatar.tsx |
| **Multimedia** | carousel.tsx, chart.tsx |
| **Otros** | sidebar.tsx, accordion.tsx, collapsible.tsx, tooltip.tsx |

---

### 4.3 Landing Page - Página de Inicio Pública

**Ubicación:** `/src/components/portal/LandingPage.tsx`
**Acceso:** Público (sin autenticación)

Página principal de la plataforma accesible para cualquier visitante sin necesidad de iniciar sesión.

#### Secciones del Landing Page

| Sección | Descripción |
|---------|-------------|
| **Header/Navegación** | Menú principal con acceso a servicios públicos y botón de login |
| **Hero Section** | Presentación institucional de la ESAP con estadísticas |
| **Servicios Públicos** | Accesos directos a validación de certificados |
| **Estadísticas** | Indicadores de la comunidad (17K+ estudiantes, programas) |
| **Noticias Destacadas** | Información relevante de la institución |
| **Newsletter** | Suscripción al boletín informativo |
| **Footer** | Información de contacto y enlaces legales |

#### Servicios Públicos Disponibles (Sin Login)

| Servicio | Componente | Funcionalidad |
|----------|------------|---------------|
| **Validar Certificados** | `ValidadorCertificadosPublico.tsx` | Verificación de autenticidad por código QR |
| **Certificación de Títulos** | `PublicTitleVerification.tsx` | Validación de títulos académicos |
| **Certificados Laborales** | `PublicCertificateValidation.tsx` | Solicitud de certificados laborales |
| **Enrolamiento** | `ModalEnrolamiento.tsx` | Registro de nuevos usuarios |

#### Componentes del Landing Page

| Componente | Descripción |
|------------|-------------|
| `LandingPage.tsx` | Componente principal de la página de inicio |
| `HeroSection.tsx` | Sección principal con mensaje institucional |
| `ServiciosPublicos.tsx` | Grid de servicios públicos disponibles |
| `EstadisticasComunidad.tsx` | Contadores de estudiantes, graduados, programas |
| `NoticiasDestacadas.tsx` | Carrusel de noticias recientes |
| `NewsletterForm.tsx` | Formulario de suscripción |
| `FooterInstitucional.tsx` | Pie de página con información legal |
| `ModalEnrolamiento.tsx` | Modal para registro de nuevos usuarios |

---

### 4.4 Portal Transaccional - Servicios para Usuarios Autenticados

**Ubicación:** `/src/components/portal/`
**Archivos:** 43
**Porcentaje del proyecto:** 7.7%
**Acceso:** Usuarios autenticados con correo @esap.edu.co

Portal unificado que presenta servicios personalizados según el rol del usuario autenticado.

#### Diseño del Portal

El Portal Transaccional implementa un diseño híbrido inspirado en Microsoft Dynamics y LinkedIn Professional:

| Elemento | Descripción |
|----------|-------------|
| **Command Bar** | Barra de búsqueda rápida y acciones frecuentes |
| **KPIs Dashboard** | Indicadores numéricos personalizados por rol |
| **Service Cards** | Tarjetas de acceso a servicios según permisos |
| **Feed de Actividad** | Noticias, eventos y anuncios de la comunidad |
| **Perfil Profesional** | Información del usuario con red de contactos |
| **Notificaciones** | Sistema de alertas y mensajes |

#### Servicios Disponibles por Rol

| Servicio | Rol Requerido | Componente | Descripción |
|----------|--------------|------------|-------------|
| **Mi Perfil** | Todos | `PerfilUsuarioEditable.tsx` | Edición de datos personales y foto |
| **Certificados Académicos** | Todos | `CertificadosAcademicosPortal.tsx` | Solicitud de certificaciones |
| **Certificados Laborales** | Todos | `CertificadosLaboralesPortal.tsx` | Solicitud de certificados laborales |
| **Mis Auditorías** | Jefes de Área | `DashboardAreaAuditada.tsx` | Seguimiento de auditorías del área |
| **Firmas Pendientes** | Firmantes | `PortalTransaccionalFirmaCompleto.tsx` | Documentos para firma electrónica |
| **Expedientes Legales** | Usuarios con casos | `MisExpedientesLegalesV2.tsx` | Seguimiento de procesos legales |

#### Componentes Principales del Portal

| Componente | Descripción |
|------------|-------------|
| `UnifiedPortalViewV5.tsx` | Vista principal unificada del portal |
| `PortalDashboard.tsx` | Dashboard con KPIs y servicios |
| `ProfilePage.tsx` | Página completa de perfil |
| `PerfilUsuarioEditable.tsx` | Editor de perfil con validaciones |
| `CertificadosLaboralesPortal.tsx` | Solicitud de certificados |
| `MisExpedientesLegalesV2.tsx` | Expedientes legales del usuario |
| `DashboardAreaAuditada.tsx` | Dashboard de auditorías para jefes |
| `PortalTransaccionalFirmaCompleto.tsx` | Portal de firma electrónica |

#### Componentes de Validación Pública

| Componente | Descripción |
|------------|-------------|
| `PublicCertificateValidation.tsx` | Validación de certificados por QR |
| `PublicTitleVerification.tsx` | Verificación de títulos académicos |
| `ValidadorCertificadosPublico.tsx` | Validador público de documentos |

#### Características del Portal Transaccional

| Característica | Implementación |
|----------------|----------------|
| **Autenticación** | Login con correo @esap.edu.co |
| **Sesión Segura** | Auto-logout por inactividad (15 min) |
| **Alerta de Sesión** | Aviso 1 minuto antes del cierre |
| **Persistencia** | LocalStorage con máximo 24 horas |
| **Roles Dinámicos** | Servicios según permisos del usuario |
| **Notificaciones** | Sistema de alertas en tiempo real |
| **Responsive** | Adaptable a móviles y tablets |

---

### 4.5 Módulo Componentes Compartidos

**Ubicación:** `/src/components/shared/`
**Archivos:** 26
**Porcentaje del proyecto:** 4.6%

Componentes reutilizados en toda la aplicación.

| Categoría | Componentes |
|-----------|-------------|
| **Datos** | DataTablePremium.tsx, BulkActionsBar.tsx |
| **Búsqueda** | GlobalSearch.tsx, CommandPalettePremium.tsx |
| **Carga de Archivos** | FileUploadDragDrop.tsx |
| **Filtros** | FiltrosSedePrograma.tsx, SedeFilterSelect.tsx |
| **Exportación** | ExportadorReportes.tsx |
| **Onboarding** | OnboardingTour.tsx |
| **Atajos** | KeyboardShortcutsPanel.tsx |
| **Notificaciones** | PanelNotificaciones.tsx, NotificacionesArquitectura.tsx |
| **Accesibilidad** | SkipLinks.tsx, LiveRegion.tsx, FocusManager.tsx |
| **Estados** | LoadingErrorUI.tsx, ErrorFallbackUI.tsx, EmptyStatesPremium.tsx |
| **Badges** | SedeBadge.tsx |
| **Providers** | UXPremiumProvider.tsx |

---

## 5. COMPONENTES DE INTERFAZ DE USUARIO

### 5.1 Design System Completo

El proyecto incluye un design system completo basado en **Radix UI** con 52 componentes accesibles (WCAG compliant).

### 5.2 Características del Design System

| Característica | Implementación |
|----------------|----------------|
| **Accesibilidad** | Componentes Radix UI (WCAG 2.1) |
| **Tema Oscuro/Claro** | DarkModeToggle integrado |
| **Responsividad** | Tailwind CSS con breakpoints |
| **Iconografía** | Lucide React (487+ iconos) |
| **Tipografía** | Sistema tipográfico consistente |
| **Colores** | Paleta corporativa ESAP |
| **Animaciones** | Motion (Framer Motion) |

### 5.3 Paleta de Colores ESAP

| Color | Código | Uso |
|-------|--------|-----|
| Azul Principal | #003DA5 | Color primario institucional |
| Azul Secundario | #2962FF | Acentos y enlaces |
| Naranja | #F57C00 | Alertas y destacados |

---

## 6. SERVICIOS Y APIs

### 6.1 Servicios de API (`/src/services/`)

**Total de archivos:** 29

#### Servicios en `/services/api/` (19 archivos)

| Servicio | Descripción |
|----------|-------------|
| `client.ts` | Cliente HTTP base (Axios) |
| `config.ts` | Configuración de API |
| `auth.service.ts` | Autenticación |
| `usuarios.service.ts` | Gestión de usuarios |
| `roles.service.ts` | Gestión de roles |
| `roles-permissions-api.service.ts` | Permisos granulares |
| `certificados.service.ts` | Certificados laborales |
| `enrollmentService.ts` | Enrolamiento |
| `estructura.service.ts` | Estructura organizacional |
| `gestionProfesoralService.ts` | Gestión profesoral |
| `portal.service.ts` | Portal transaccional |
| `ptaAPI.ts` | API de PTA |
| `dashboard.service.ts` | Dashboard |
| `notificationsService.ts` | Notificaciones |
| `publico.service.ts` | Servicios públicos |
| `controlInternoService.ts` | Control interno |
| `types.ts` | Tipos compartidos |
| `index.ts` | Barrel export |

#### Servicios Especializados (10 archivos)

| Servicio | Descripción |
|----------|-------------|
| `notificacionesPersonasPTA.ts` | Notificaciones PTA |
| `notificationService.ts` | Servicio de notificaciones |
| `periodParametersService.ts` | Parámetros de período |
| `personasPTAIntegrationService.ts` | Integración personas-PTA |
| `ptaPersonasService.ts` | Personas en PTA |
| `situacionesAdministrativasService.ts` | Situaciones administrativas |
| `sincronizacionSituaciones.ts` | Sincronización |
| `/notifications/ptaNotificationsService.ts` | Notificaciones PTA |
| `/pta/ptaAprobacionGranularService.ts` | Aprobación granular |
| `/pta/ptaEnFirmeService.ts` | PTA en firme |

---

### 6.2 Hooks Personalizados (`/src/hooks/`)

**Total de archivos:** 29

| Categoría | Hooks |
|-----------|-------|
| **Autenticación** | useAuth, useRoles, useUserRoles, useUserQueries, useEnrollment |
| **PTA** | usePTA, usePTAAPI, usePTAAprobacionGranular, usePTAConPersonas, usePTAEnFirme, usePTANotifications |
| **Datos** | useDashboardQueries, useAuditQueries, useReportsQueries, usePersonasQueries, useQueryClient |
| **UI** | useResponsive, useKeyboardNavigation, useKeyboardShortcuts, useMicrointeractions, useCommandPaletteState |
| **Otros** | useNotifications, useAccessibility, useIntegracionControlInterno, useProrrateoAutomatico, usePWA, useFirstVisit |

---

### 6.3 Tipos TypeScript (`/src/types/`)

**Total de archivos:** 13

| Archivo | Descripción |
|---------|-------------|
| `index.ts` | Barrel export |
| `pta.types.ts` | Tipos de PTA |
| `roles-permissions.types.ts` | Roles y permisos |
| `roles-sistema.types.ts` | Roles del sistema |
| `certificados.ts` | Tipos de certificados |
| `gestion-profesoral.ts` | Gestión profesoral |
| `control-interno.ts` | Control interno |
| `estructura-organizacional.types.ts` | Estructura |
| `community.types.ts` | Comunidad |
| `calendario-academico.types.ts` | Calendario |
| `integracion-personas-pta.ts` | Integración |
| `periodParameters.ts` | Parámetros de período |
| `situacionesAdministrativas.ts` | Situaciones |

---

## 7. CONFIGURACIÓN Y DEPENDENCIAS

### 7.1 Archivo package.json

**Ubicación:** `/package.json`

```json
{
  "name": "PlataformaComUNIdadESAP",
  "version": "0.1.0",
  "private": true
}
```

### 7.2 Dependencias de Producción (47 librerías)

#### Framework y Core

| Dependencia | Versión | Propósito |
|-------------|---------|-----------|
| react | 18.3.1 | Framework principal |
| react-dom | 18.3.1 | Renderizado DOM |
| react-router-dom | - | Enrutamiento |
| typescript | - | Lenguaje tipado |

#### Componentes UI (Radix UI - 30 componentes)

| Componente | Descripción |
|------------|-------------|
| @radix-ui/react-accordion | Acordeones |
| @radix-ui/react-avatar | Avatares |
| @radix-ui/react-checkbox | Checkboxes |
| @radix-ui/react-dialog | Diálogos |
| @radix-ui/react-dropdown-menu | Menús desplegables |
| @radix-ui/react-popover | Popovers |
| @radix-ui/react-select | Selects |
| @radix-ui/react-tabs | Pestañas |
| Y 22 componentes más... | |

#### Estilos y Diseño

| Dependencia | Propósito |
|-------------|-----------|
| tailwind-merge | Merge de clases Tailwind |
| class-variance-authority | Variantes CSS |
| clsx | Utilidades de clases |
| lucide-react | Iconos (487+) |

#### Datos y Estado

| Dependencia | Propósito |
|-------------|-----------|
| @tanstack/react-query | Data fetching y cache |
| @tanstack/react-query-devtools | DevTools |
| axios | Cliente HTTP |

#### Formularios

| Dependencia | Propósito |
|-------------|-----------|
| react-hook-form | Gestión de formularios |
| input-otp | Entrada OTP |

#### Drag & Drop

| Dependencia | Propósito |
|-------------|-----------|
| @dnd-kit/core | Drag & Drop core |
| @dnd-kit/sortable | Ordenamiento |
| @dnd-kit/utilities | Utilidades |
| react-dnd | DnD alternativo |
| react-dnd-html5-backend | Backend HTML5 |
| react-dnd-touch-backend | Backend táctil |

#### Visualización

| Dependencia | Propósito |
|-------------|-----------|
| recharts | Gráficos |
| embla-carousel-react | Carruseles |

#### Exportación y Documentos

| Dependencia | Propósito |
|-------------|-----------|
| jspdf | Generación PDF |
| jspdf-autotable | Tablas en PDF |
| xlsx | Archivos Excel |
| qrcode.react | Generador QR |
| jsqr | Lector QR |

#### Notificaciones y UI

| Dependencia | Propósito |
|-------------|-----------|
| sonner | Toast notifications |
| react-toastify | Notificaciones |
| motion | Animaciones |
| cmdk | Command palette |

### 7.3 Dependencias de Desarrollo (3 librerías)

| Dependencia | Versión | Propósito |
|-------------|---------|-----------|
| vite | 6.3.5 | Build tool |
| @vitejs/plugin-react-swc | 3.10.2 | Plugin React |
| @types/node | 20.10.0 | Tipos Node.js |

### 7.4 Configuración de Vite

**Ubicación:** `/vite.config.ts`

Características configuradas:
- Plugin React con SWC
- Build output: `./build`
- Dev server: puerto 3000, auto-open
- Alias para imports (@components, @ui, @assets)
- Resolución de extensiones: .js, .jsx, .ts, .tsx, .json

### 7.5 Configuración de Entorno

**Ubicación:** `/src/config/environment.ts` (223 líneas)

| Configuración | Descripción |
|---------------|-------------|
| URLs API | Desarrollo, staging, producción |
| Endpoints | Estructurados por módulo |
| Autenticación | Bearer tokens |
| LocalStorage keys | Claves de almacenamiento |
| Feature flags | Banderas de características |
| CORS | Configuración de seguridad |
| Timeouts | Tiempos de espera API |

---

## 8. DOCUMENTACIÓN INCLUIDA

### 8.1 Documentación de Usuario

| Documento | Ubicación | Descripción |
|-----------|-----------|-------------|
| Manual de Usuario | `/docs/MANUAL_DE_USUARIO.md` | Guía completa para usuarios no técnicos |
| Acta de Entrega | `/docs/ACTA_ENTREGA_CODIGO_FUENTE.md` | Este documento |

### 8.2 Documentación Técnica en `/src/docs/` (9 archivos)

| Documento | Descripción |
|-----------|-------------|
| README.md | Índice de documentación |
| ARQUITECTURA_MICRO_FRONTENDS.md | Arquitectura técnica |
| DIAGRAMA_ARQUITECTURA_MICROFRONTENDS.md | Diagramas de arquitectura |
| GUIA_INICIO_RAPIDO_MICROFRONTENDS.md | Guía de inicio rápido |
| PORTALES_TRANSACCIONALES.md | Documentación de portales |
| PORTAL_TRANSACCIONAL_UNIFICADO.md | Portal unificado |
| RESUMEN_EJECUTIVO_MICROFRONTENDS.md | Resumen ejecutivo |
| SEGURIDAD.md | Guía de seguridad |

### 8.3 Documentación de Implementación en `/src/` (13 archivos)

| Documento | Descripción |
|-----------|-------------|
| VERIFICACION_RF_001_A_RF_020.md | Verificación de requisitos funcionales |
| ANALISIS_CUMPLIMIENTO_CIG.md | Análisis de cumplimiento CIG |
| SEGURIDAD_IMPLEMENTADA.md | Seguridad implementada |
| CIG_DOCUMENTO_MAESTRO_CONDENSADO.md | Documento maestro CIG |
| CHECKLIST_CIG_VISUAL.md | Checklist visual |
| EXPLICACION_HALLAZGOS_Y_TAREAS.md | Explicación de hallazgos |
| IMPLEMENTACION_HALLAZGOS_TAREAS_COMPLETA.md | Implementación completa |
| MIGRACION_IMPLEMENTADA.md | Documentación de migración |
| LIMPIEZA_PROYECTO_COMPLETADA.md | Limpieza realizada |
| PRIORIDAD_1_COMPLETADA.md | Prioridades completadas |
| CORRECCION_DUPLICACION_COMPLETADA.md | Correcciones realizadas |
| Attributions.md | Atribuciones |

---

## 9. INVENTARIO DETALLADO DE ARCHIVOS

### 9.1 Resumen por Tipo de Archivo

| Extensión | Cantidad | Descripción |
|-----------|----------|-------------|
| `.tsx` | 537 | Componentes React |
| `.ts` | 147 | TypeScript puro |
| `.css` | 3 | Hojas de estilo |
| `.md` | 24 | Documentación |
| `.json` | 2 | Configuración |
| `.html` | 2 | HTML |
| `.js` | 1 | Service Worker |
| `.sh` | 1 | Script de migración |
| `.png` | 5 | Imágenes |
| **TOTAL** | **722** | |

### 9.2 Distribución de Componentes

| Módulo | Archivos | % Total |
|--------|----------|---------|
| **ESAP (Backoffice)** | **430** | **76.6%** |
| ↳ **Gestión de Personas** | - | - |
|   • Personas y Usuarios | 25 | - |
|   • Estructura Organizacional | 9 | - |
|   • Programas Académicos | 8 | - |
|   • Roles y Permisos | 12 | - |
|   • Auditoría del Sistema | 10 | - |
|   • Reportes | 15 | - |
| ↳ Control Interno CIG | 108 | - |
| ↳ Gestión Legal | 96 | - |
| ↳ Arquitectura Empresarial | 31 | - |
| ↳ Control Disciplinario | 30 | - |
| ↳ Certificados Laborales | 20 | - |
| ↳ Firma Electrónica | 18 | - |
| ↳ Gestión Profesoral PTA | 17 | - |
| ↳ Registro Académico | 9 | - |
| ↳ Componentes raíz | 22 | - |
| UI (Design System) | 52 | 9.3% |
| Portal (Transaccional) | 43 | 7.7% |
| Shared (Compartidos) | 26 | 4.6% |
| Otros módulos | 10 | 1.8% |
| **TOTAL COMPONENTES** | **561** | **100%** |

### 9.3 Distribución de Código de Soporte

| Tipo | Archivos |
|------|----------|
| Hooks | 29 |
| Servicios API | 29 |
| Tipos TypeScript | 13 |
| Utilidades | 12 |
| Librerías internas | 11 |
| Datos/Mocks | 7 |
| Módulos independientes | 15 |
| Contextos | 3 |
| Configuración | 1 |
| **TOTAL** | **120** |

---

## 10. INSTRUCCIONES DE INSTALACIÓN

### 10.1 Requisitos Previos

| Requisito | Versión Mínima |
|-----------|----------------|
| Node.js | 18.x o superior |
| npm | 9.x o superior |
| Git | 2.x o superior |

### 10.2 Pasos de Instalación

```bash
# 1. Clonar el repositorio
git clone [URL_REPOSITORIO]
cd PlataformaComUNIdadESAP

# 2. Instalar dependencias
npm install

# 3. Iniciar en modo desarrollo
npm run dev

# 4. Construir para producción
npm run build
```

### 10.3 Scripts Disponibles

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Inicia servidor de desarrollo (puerto 3000) |
| `npm run build` | Genera build de producción |
| `npm run preview` | Previsualiza build de producción |
| `npm run lint` | Ejecuta linter |

### 10.4 Estructura de Build

```
/build/
├── index.html
├── assets/
│   ├── *.js       # JavaScript compilado
│   └── *.css      # CSS compilado
└── ...
```

---

## 11. FIRMAS Y ACEPTACIÓN

### 11.1 Declaración de Entrega

Se hace entrega formal del código fuente de la **Plataforma Comunidades ESAP** en las condiciones descritas en este documento.

El código entregado:
- Está completo y funcional
- Incluye toda la documentación técnica y de usuario
- Está versionado en Git
- Incluye todas las dependencias documentadas

### 11.2 Contenido Verificado

| Elemento | Estado |
|----------|--------|
| Código fuente completo | Entregado |
| Dependencias documentadas | Incluidas |
| Documentación técnica | Incluida |
| Manual de usuario | Incluido |
| Configuración de desarrollo | Incluida |
| Datos de prueba/mocks | Incluidos |

### 11.3 Responsabilidades Post-Entrega

| Aspecto | Responsable |
|---------|-------------|
| Mantenimiento del código | Por definir |
| Soporte técnico | Por definir |
| Actualizaciones de seguridad | Por definir |
| Documentación de cambios | Por definir |

---

### Firmas

| Rol | Nombre | Fecha | Firma |
|-----|--------|-------|-------|
| **Entrega** | | | |
| **Recibe** | | | |
| **Testigo** | | | |

---

**Documento generado el:** Enero 2026
**Versión del documento:** 1.0

---

*Este documento constituye el acta formal de entrega del código fuente de la Plataforma Comunidades ESAP. Cualquier modificación posterior deberá ser documentada y anexada a este documento.*
