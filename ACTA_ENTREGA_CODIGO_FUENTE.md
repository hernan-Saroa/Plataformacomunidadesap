# ACTA DE ENTREGA DE CÓDIGO FUENTE
## PLATAFORMA COMUNIDADES ESAP

---

**Fecha de Entrega:** 26 de enero de 2026
**Versión:** 1.0
**Proyecto:** Plataforma Comunidades ESAP
**Tecnología Base:** React + TypeScript + Vite

---

## 1. RESUMEN EJECUTIVO

El presente documento describe la estructura, organización y contenido del código fuente entregado para la **Plataforma Comunidades ESAP**. El sistema está desarrollado con tecnologías modernas de frontend (React 18, TypeScript, Vite) siguiendo patrones de arquitectura modular y escalable.

### Estadísticas Generales del Proyecto

| Categoría | Cantidad |
|-----------|----------|
| **Total de archivos TypeScript/TSX** | 684 |
| **Componentes React** | 561+ |
| **Servicios de API** | 29 |
| **Hooks personalizados** | 29 |
| **Definiciones de tipos** | 13 |
| **Utilidades** | 12 |

---

## 2. ESTRUCTURA GENERAL DEL PROYECTO

```
/Plataformacomunidadesap
├── /src                          # Código fuente principal
│   ├── /assets                   # Recursos estáticos
│   ├── /components               # Componentes React (561 archivos)
│   ├── /config                   # Configuración de la aplicación
│   ├── /context                  # Contextos globales
│   ├── /contexts                 # Contextos React adicionales
│   ├── /data                     # Datos mock y constantes
│   ├── /hooks                    # Custom React hooks
│   ├── /lib                      # Librerías y utilidades
│   ├── /modules                  # Módulos principales
│   ├── /services                 # Servicios de API
│   ├── /styles                   # Estilos globales
│   ├── /types                    # Definiciones TypeScript
│   ├── /utils                    # Funciones utilitarias
│   ├── App.tsx                   # Componente raíz
│   ├── main.tsx                  # Punto de entrada
│   └── index.css                 # Estilos compilados
├── package.json                  # Dependencias del proyecto
├── vite.config.ts                # Configuración de Vite
├── tsconfig.json                 # Configuración TypeScript
└── index.html                    # HTML principal
```

---

## 3. MÓDULOS DEL SISTEMA

### 3.1 MÓDULO DE GESTIÓN DE PERSONAS (USUARIOS)

**Ubicación:** `/src/components/esap/`
**Archivo Principal:** `UsersPersonsModulePremium.tsx`

#### Descripción
Sistema completo para la gestión de usuarios y personas de la ESAP, con funcionalidades avanzadas de permisos granulares, auditoría y asignación de roles simultáneos.

#### Componentes del Módulo

| Archivo | Descripción |
|---------|-------------|
| `UsersPersonsModulePremium.tsx` | Módulo principal de gestión de usuarios |
| `CreatePersonModal.tsx` | Modal para crear nuevas personas |
| `EditUserModal.tsx` | Modal para editar usuarios existentes |
| `PersonDetailsModalV2.tsx` | Vista detallada de información de persona |
| `UserExpandedView.tsx` | Vista expandida con información completa |
| `ExportUsersBySede.tsx` | Exportación de usuarios filtrados por sede |
| `UserEnrollmentSection.tsx` | Sección de inscripción/enrolamiento |
| `EnrollmentConfigModal.tsx` | Configuración de métodos de enrolamiento |
| `AssignAccessModal.tsx` | Asignación de accesos y permisos |
| `DashboardSedesMetrics.tsx` | Dashboard de métricas por sede |
| `DigitalFolderSection.tsx` | Carpeta digital del usuario |
| `RolesYPermisosActualizado.tsx` | Gestión de roles y permisos (RF015) |
| `EstadisticasDocentesESAP.tsx` | Estadísticas específicas de docentes |
| `UserMenu.tsx` | Menú contextual de usuario |

#### Componentes de Administración

| Archivo | Ubicación | Descripción |
|---------|-----------|-------------|
| `GestionUsuariosPasswordTracking.tsx` | `/admin/` | Seguimiento de contraseñas |
| `ModalCambiarContrasena.tsx` | `/admin/` | Modal de cambio de contraseña |
| `PasswordStrengthInput.tsx` | `/admin/` | Validación de fortaleza de contraseña |

#### Componentes de Autenticación

| Archivo | Ubicación | Descripción |
|---------|-----------|-------------|
| `EjemploPasswordSegura.tsx` | `/auth/` | Ejemplo de contraseña segura |
| `PasswordStrengthInput.tsx` | `/auth/` | Input con validación de seguridad |
| `PoliticaPasswordESAP.tsx` | `/auth/` | Políticas de contraseña ESAP |

#### Funcionalidades Implementadas

- **CRUD Completo de Usuarios**: Crear, leer, actualizar, eliminar
- **Roles Múltiples Simultáneos**: Una persona puede tener varios roles
- **Filtros Avanzados**: Por sede, programa, estado, rol
- **Sistema de Enrolamiento**: QR, manual, masivo
- **Exportación de Datos**: Excel, CSV por sede/programa
- **Auditoría de Cambios**: Tracking completo de modificaciones
- **Control de Acceso Granular**: Permisos por módulo y acción
- **Carpeta Digital**: Documentos asociados al usuario
- **Métricas por Sede**: Dashboard con estadísticas territoriales

---

### 3.2 MÓDULO DE GESTIÓN ACADÉMICA (PROGRAMAS)

**Ubicación:** `/src/components/esap/`
**Archivo Principal:** `ProgramasAcademicosModule.tsx`

#### Descripción
Gestión integral de programas académicos de la ESAP, incluyendo información de acreditación, modalidades, registro calificado y estadísticas.

#### Componentes del Módulo

| Archivo | Descripción |
|---------|-------------|
| `ProgramasAcademicosModule.tsx` | Módulo principal de programas académicos |
| `CreateProgramaModal.tsx` | Modal para crear nuevos programas |
| `GestionAsignacionesProgramas.tsx` | Asignación de programas a sedes |

#### Estructura de Datos - Programa Académico

```typescript
interface ProgramaAcademico {
  id: number;
  codigo: string;
  nombre: string;
  nivelFormacion: 'Pregrado' | 'Especialización' | 'Maestría' | 'Doctorado';
  modalidad: 'Presencial' | 'Virtual' | 'Distancia' | 'Dual';
  jornada: 'Diurna' | 'Nocturna' | 'Mixta' | 'Flexible';
  duracionSemestres: number;
  creditos: number;
  sede: string;
  facultad: string;
  estado: 'Activo' | 'Inactivo' | 'En Trámite' | 'Suspendido';
  registroCalificado: {
    numero: string;
    fechaEmision: string;
    vigencia: string;
  };
  acreditacion?: {
    tipo: 'Alta Calidad' | 'Internacional';
    vigencia: string;
  };
  descripcion: string;
  perfilEgresado: string;
  requisitosIngreso: string[];
  costoMatricula: number;
  estudiantesActivos: number;
  graduados: number;
  docentesAsignados: number;
}
```

#### Funcionalidades Implementadas

- **Gestión de Programas**: CRUD completo
- **Niveles de Formación**: Pregrado, Especialización, Maestría, Doctorado
- **Modalidades**: Presencial, Virtual, Distancia, Dual
- **Jornadas**: Diurna, Nocturna, Mixta, Flexible
- **Registro Calificado**: Número, fecha, vigencia
- **Acreditación**: Alta Calidad, Internacional
- **Gestión de Sedes**: Asignación de programas por sede
- **Estadísticas**: Estudiantes activos, graduados, docentes

---

### 3.3 MÓDULO DE GESTIÓN PROFESORAL (PTA)

**Ubicación:** `/src/components/gestion-profesoral/`
**Cantidad de Archivos:** 16 componentes

#### Descripción
Sistema de gestión del Plan de Trabajo Anual (PTA) para docentes, incluyendo actividades de docencia, investigación, extensión y actividades complementarias.

#### Componentes del Módulo

| Archivo | Descripción |
|---------|-------------|
| `GestionProfesoralApp.tsx` | Aplicación principal del módulo |
| `DashboardDocente.tsx` | Dashboard para docentes |
| `DashboardDocenteIntegrado.tsx` | Dashboard integrado con sistema |
| `DashboardAprobador.tsx` | Dashboard para aprobadores |
| `DashboardAprobadorIntegrado.tsx` | Dashboard de aprobación integrado |
| `FormularioDocencia.tsx` | Formulario de actividades de docencia |
| `FormularioInvestigacion.tsx` | Formulario de actividades de investigación |
| `FormularioExtension.tsx` | Formulario de actividades de extensión |
| `FormularioComplementarias.tsx` | Formulario de actividades complementarias |
| `WizardCrearPTA.tsx` | Wizard paso a paso para crear PTA |
| `WizardCrearPTAIntegrado.tsx` | Wizard integrado con validaciones |
| `VistaDetallePTA.tsx` | Vista detallada del PTA |
| `VisualizadorPTAAjustes.tsx` | Visualizador con ajustes |
| `ModalAprobacion.tsx` | Modal de aprobación de PTA |
| `ModalProrrateo.tsx` | Modal de prorrateo de horas |
| `PanelRevision.tsx` | Panel de revisión de actividades |

#### Portal de Gestión Profesoral
**Ubicación:** `/src/components/portal/gestion-profesoral/`

| Archivo | Descripción |
|---------|-------------|
| `GestionProfesoralApp.tsx` | App del portal |
| `MiPTADashboardV3.tsx` | Dashboard personal de PTA |
| `DocentesPTAPortal.tsx` | Portal de docentes |
| `BandejaAprobadores.tsx` | Bandeja de entrada para aprobadores |
| `PTAAppWithSearch.tsx` | App con búsqueda integrada |
| `PTAWizardProgress.tsx` | Progreso del wizard |
| `PTAOnboarding.tsx` | Tour de bienvenida |
| `ModalAgregarAsignatura.tsx` | Agregar asignaturas |
| `ModalAprobacionRechazo.tsx` | Aprobar/rechazar PTA |
| `ModalEnviarAprobacion.tsx` | Enviar a aprobación |
| `ModalShortcuts.tsx` | Atajos de teclado |
| `CommandPalette.tsx` | Paleta de comandos |

#### Funcionalidades Implementadas

- **Plan de Trabajo Anual (PTA)**: Creación y gestión
- **Tipos de Actividades**: Docencia, Investigación, Extensión, Complementarias
- **Flujo de Aprobación**: Envío, revisión, aprobación/rechazo
- **Prorrateo de Horas**: Distribución automática
- **Dashboard Docente**: Métricas personales
- **Dashboard Aprobador**: Cola de aprobaciones
- **Integración con Personas**: Vinculación con módulo de usuarios

---

### 3.4 MÓDULO DE CERTIFICADOS LABORALES

**Ubicación:** `/src/components/certificados-laborales/`
**Cantidad de Archivos:** 19 componentes

#### Componentes del Módulo

| Archivo | Descripción |
|---------|-------------|
| `CertificadosLaboralesDashboard.tsx` | Dashboard principal |
| `CertificadosLaboralesRouter.tsx` | Enrutador del módulo |
| `GenerarCertificadoModal.tsx` | Generación de certificados |
| `SolicitarCertificadoForm.tsx` | Formulario de solicitud |
| `CertificadoDetalleModal.tsx` | Detalle de certificado |
| `CertificadoDetallePanel.tsx` | Panel de detalle |
| `ValidarCertificadoPublico.tsx` | Validación pública |
| `ValidarCertificadoQR.tsx` | Validación por código QR |
| `QRScannerModal.tsx` | Lector de códigos QR |
| `ModalCodigoQR.tsx` | Visualización de QR |
| `PDFViewerModal.tsx` | Visor de PDF |
| `VisorPDFCertificado.tsx` | Visor específico de certificados |
| `HistorialVerificacionesQR.tsx` | Historial de verificaciones |
| `HistoricoValidaciones.tsx` | Histórico de validaciones |
| `NotificacionesValidacion.tsx` | Notificaciones de validación |
| `ConfiguracionPlantilla.tsx` | Configuración de plantillas |
| `GeneradorReportes.tsx` | Generador de reportes |
| `AnalyticsDashboard.tsx` | Dashboard de analíticas |
| `APIDocumentacion.tsx` | Documentación de API |

#### Funcionalidades Implementadas

- **Generación de Certificados**: Automática con plantillas
- **Validación con QR**: Verificación mediante código QR
- **Portal de Validación Pública**: Acceso externo para validar
- **Plantillas Configurables**: Personalización de formatos
- **Historial de Verificaciones**: Trazabilidad completa
- **Reportes y Analíticas**: Dashboard de métricas
- **API Documentada**: Integración con sistemas externos

---

### 3.5 MÓDULO DE CONTROL INTERNO (CIG)

**Ubicación:** `/src/components/esap/control-interno/`
**Cantidad de Archivos:** 93 componentes

#### Descripción
Sistema completo para la gestión de Control Interno de Gestión, incluyendo auditorías, hallazgos, planes de mejoramiento y listas de chequeo.

#### Componentes Principales

| Archivo | Descripción |
|---------|-------------|
| `ControlInternoFull.tsx` | Aplicación completa del módulo |
| `DashboardEjecutivoCIG.tsx` | Dashboard ejecutivo |
| `ControlInternoContext.tsx` | Contexto global del módulo |

#### Módulos de Auditoría

| Archivo | Descripción |
|---------|-------------|
| `PlaneacionAuditoriaModule.tsx` | Planeación de auditorías |
| `EjecucionAuditoriaModule.tsx` | Ejecución de auditorías |
| `ProcesoAuditoriaModule.tsx` | Proceso completo de auditoría |
| `GestionAuditoriasKanbanSimple.tsx` | Vista Kanban de auditorías |
| `ConfiguracionAuditoriasModule.tsx` | Configuración de auditorías |
| `PlanAnualModule.tsx` | Plan anual de auditorías |
| `UniversoAuditorias.tsx` | Universo auditable |

#### Módulos de Hallazgos y Mejoramiento

| Archivo | Descripción |
|---------|-------------|
| `HallazgosYMejoramientoCompleto.tsx` | Gestión integral de hallazgos |
| `HallazgosContext.tsx` | Contexto de hallazgos |
| `FormulacionPlanMejoramientoModule.tsx` | Formulación de planes |
| `SeguimientoPlanMejoramientoModule.tsx` | Seguimiento de planes |
| `PlanesMejoramientoModuleRediseno.tsx` | Módulo rediseñado |

#### Wizards y Formularios

| Archivo | Descripción |
|---------|-------------|
| `InicioAuditoriaWizard.tsx` | Wizard de inicio |
| `InicioAuditoriaWizardWorldClass.tsx` | Wizard mejorado |
| `WizardAuditoriaEspecial.tsx` | Auditorías especiales |
| `WizardAuditoriaTerritorial.tsx` | Auditorías territoriales |
| `FormularioAuditoriaUnificado.tsx` | Formulario unificado |
| `FormularioNuevaAuditoria.tsx` | Nueva auditoría |

#### Expedientes y Documentación

| Archivo | Descripción |
|---------|-------------|
| `ExpedienteAuditoriaCompleto.tsx` | Expediente completo |
| `ExpedientesModulePremium.tsx` | Módulo de expedientes |
| `GestionDocumentalModule.tsx` | Gestión documental |
| `InformesYDocumentalCompleto.tsx` | Informes y documentos |
| `SistemaEvidencias.tsx` | Sistema de evidencias |

#### Listas de Chequeo
**Ubicación:** `/src/components/esap/control-interno/listas-chequeo/`

| Archivo | Descripción |
|---------|-------------|
| `ListasChequeoModuleComplete.tsx` | Módulo completo |
| `ListasChequeoContext.tsx` | Contexto de listas |
| `ModalCrearPlantilla.tsx` | Crear plantillas |
| `ModalAplicarLista.tsx` | Aplicar listas |
| `LlenarListaChequeo.tsx` | Completar listas |
| `ModalGenerarHallazgo.tsx` | Generar hallazgos |
| `ModalFirmaDigital.tsx` | Firma digital |
| `DashboardReportes.tsx` | Reportes de listas |
| `VisualizadorPDF.tsx` | Visor PDF |

#### Modales y Componentes de UI (30+ archivos)

- Modales de aprobación, asignación, cambio de estado
- Modales de expediente, historial, notas
- Componentes de comunicación y notificaciones
- Componentes de workflow y semáforos

---

### 3.6 MÓDULO DE GESTIÓN LEGAL (SIGL)

**Ubicación:** `/src/components/esap/gestion-legal/`
**Cantidad de Archivos:** 90+ componentes

#### Estructura del Módulo

```
/gestion-legal
├── /core                    # Componentes principales
├── /design-system           # Sistema de diseño SIGL
├── /modulos                 # Módulos funcionales
├── /procesos-coactivos      # Procesos coactivos
├── /config                  # Configuración
└── /utils                   # Utilidades
```

#### Componentes Core

| Archivo | Descripción |
|---------|-------------|
| `GestionLegalFull.tsx` | Aplicación principal |
| `DashboardEjecutivoSIGL.tsx` | Dashboard ejecutivo |
| `SidebarSIGL.tsx` | Navegación lateral |

#### Design System SIGL (17 archivos)

| Archivo | Descripción |
|---------|-------------|
| `BadgeSIGL.tsx` | Badges personalizados |
| `ButtonSIGL.tsx` | Botones SIGL |
| `CardSIGL.tsx` | Tarjetas |
| `InputSIGL.tsx` | Campos de entrada |
| `ModalSIGL.tsx` | Modales |
| `ModuleFilters.tsx` | Filtros de módulo |
| `ModuleHeader.tsx` | Encabezados |
| `ModuleMetrics.tsx` | Métricas |
| `GuidedTour.tsx` | Tour guiado |
| `TourContext.tsx` | Contexto del tour |

#### Módulos Funcionales

| Archivo | Descripción |
|---------|-------------|
| `ModuloDefensaJudicialV3.tsx` | Defensa judicial |
| `ModuloJuzgamientoDisciplinarioV3.tsx` | Juzgamiento disciplinario |
| `ModuloAsesoriaJuridicaV3.tsx` | Asesoría jurídica |
| `ModuloBuzonNotificacionesV3.tsx` | Buzón de notificaciones |
| `ModuloTerminosInformesV3.tsx` | Términos e informes |
| `PlanesMejoramientoV4.tsx` | Planes de mejoramiento |
| `PlanAccionV4.tsx` | Plan de acción |
| `ExpedientesModuloSIGL.tsx` | Expedientes legales |
| `OrganosControl.tsx` | Órganos de control |
| `Riesgos.tsx` | Gestión de riesgos |

#### Procesos Coactivos

| Archivo | Descripción |
|---------|-------------|
| `ProcesosCoactivosV3.tsx` | Vista principal |
| `ModalCrearProcesoCoactivo.tsx` | Crear proceso |
| `ModalCambiarEtapaCoactivo.tsx` | Cambiar etapa |
| `ModalGestionarPagos.tsx` | Gestionar pagos |
| `ModalGenerarActoAdministrativo.tsx` | Generar acto |
| `ModalVerExpedienteCoactivo.tsx` | Ver expediente |

#### Modales Funcionales (40+ archivos)

- Gestión de demandas, consultas, comunicaciones
- Expedientes, documentos, evidencias
- Autos, oficios, actas
- Notificaciones, compartir, reasignar
- Indicadores, riesgos, tareas

---

### 3.7 MÓDULO DISCIPLINARIO

**Ubicación:** `/src/components/esap/disciplinario/`
**Cantidad de Archivos:** 27 componentes

#### Componentes del Módulo

| Archivo | Descripción |
|---------|-------------|
| `ControlDisciplinarioFull.tsx` | Aplicación completa |
| `DashboardEjecutivoIntegrado.tsx` | Dashboard ejecutivo |
| `DashboardEjecutivoActualizado.tsx` | Dashboard actualizado |
| `DashboardKanbanOperativo.tsx` | Vista Kanban |
| `GestionNoticiasActualizado.tsx` | Gestión de noticias disciplinarias |
| `GestionProcesos.tsx` | Gestión de procesos |
| `GestionProcesosProfesionalesCompleto.tsx` | Procesos profesionales |
| `GestionProfesionales.tsx` | Profesionales |
| `GestionTerminosAlertas.tsx` | Términos y alertas |
| `ExpedienteElectronico.tsx` | Expediente electrónico |
| `ExpedientesElectronicos.tsx` | Lista de expedientes |
| `FlujoNoticiasDisciplinarias.tsx` | Flujo de noticias |
| `FlujoProcesoDisciplinario.tsx` | Flujo del proceso |
| `FlujoRevisionAprobacion.tsx` | Flujo de revisión |
| `FlujoTerminosAlertas.tsx` | Flujo de alertas |
| `EditorDocumentos.tsx` | Editor de documentos |
| `SistemaComentarios.tsx` | Sistema de comentarios |
| `RevisionAprobacionJefe.tsx` | Revisión del jefe |
| `ModuloConfiguracion.tsx` | Configuración |
| `ModelosSoporteDisciplinario.tsx` | Modelos de soporte |

#### Modales

| Archivo | Descripción |
|---------|-------------|
| `ModalDetallesNoticia.tsx` | Detalles de noticia |
| `ModalArchivarNoticia.tsx` | Archivar noticia |
| `ModalEliminarNoticia.tsx` | Eliminar noticia |
| `ModalArchivarProceso.tsx` | Archivar proceso |
| `ModalRemitirCompetencia.tsx` | Remitir competencia |
| `ModalSubirDocumento.tsx` | Subir documento |
| `ModalesGestionDocumental.tsx` | Gestión documental |

---

### 3.8 MÓDULO DE FIRMA ELECTRÓNICA

**Ubicación:** `/src/components/esap/firma-electronica/`
**Cantidad de Archivos:** 18 componentes

#### Componentes del Módulo

| Archivo | Descripción |
|---------|-------------|
| `ModuloFirmaElectronicaWorldClass.tsx` | Módulo principal |
| `PortalTransaccionalFirma.tsx` | Portal transaccional |
| `ModalHistorialFirmas.tsx` | Historial de firmas |
| `VisorDocumentoFirma.tsx` | Visor de documentos |
| `ModalTrazabilidadDocumento.tsx` | Trazabilidad |

#### Funcionalidades

- Firma electrónica de documentos
- Validación OTP
- Trazabilidad completa
- Historial de firmas
- Integración con expedientes

---

### 3.9 MÓDULO DE ALERTAS AUTOMÁTICAS

**Ubicación:** `/src/components/esap/alertas/`
**Cantidad de Archivos:** 7 componentes

| Archivo | Descripción |
|---------|-------------|
| `MotorAlertasAutomaticas.tsx` | Motor de alertas |
| `CentroConfiguracionAlertas.tsx` | Centro de configuración |
| `PlantillasMensajes.tsx` | Plantillas de mensajes |
| `HistorialAlertas.tsx` | Historial |
| `EstadisticasAlertas.tsx` | Estadísticas |

---

### 3.10 MÓDULO DE ESTRUCTURA ORGANIZACIONAL

**Ubicación:** `/src/components/estructura-organizacional/`
**Cantidad de Archivos:** 8 componentes

| Archivo | Descripción |
|---------|-------------|
| `EstructuraOrganizacionalModule.tsx` | Módulo principal |
| `CreateUnidadModal.tsx` | Crear unidades |
| `GestionAsignacionesSedes.tsx` | Asignación de sedes |
| `SelectorEstructura.tsx` | Selector de estructura |
| `SelectorTerritorialYSede.tsx` | Selector territorial |
| `FiltroEstructuraOrganizacional.tsx` | Filtros |
| `VisualizadorTerritorialesCetap.tsx` | Visualización territorial |
| `BadgesSedesUsuario.tsx` | Badges de sedes |

---

### 3.11 MÓDULO DE SITUACIONES ADMINISTRATIVAS

**Ubicación:** `/src/components/situaciones-administrativas/`
**Cantidad de Archivos:** 2 componentes

| Archivo | Descripción |
|---------|-------------|
| `GestionSituacionesAdministrativas.tsx` | Gestión principal |
| `ModalSituacionAdministrativa.tsx` | Modal de situaciones |

---

### 3.12 MÓDULO DE COMUNIDADES

**Ubicación:** `/src/components/esap/`

| Archivo | Descripción |
|---------|-------------|
| `CommunityManagementModulePremium.tsx` | Gestión de comunidades |
| `CommunityAnnouncementsModuleUnified.tsx` | Anuncios |
| `CommunityEventsModuleUnified.tsx` | Eventos |
| `CommunityPostsModuleUnified.tsx` | Posts |

---

### 3.13 MÓDULO DE PORTAL TRANSACCIONAL

**Ubicación:** `/src/components/portal/`
**Cantidad de Archivos:** 30+ componentes

#### Componentes Principales

| Archivo | Descripción |
|---------|-------------|
| `UnifiedPortalViewV5.tsx` | Vista unificada del portal |
| `LandingPage.tsx` | Página de inicio |
| `LoginPage.tsx` | Página de login |
| `PortalDashboard.tsx` | Dashboard del portal |
| `ProfilePage.tsx` | Página de perfil |
| `PerfilUsuarioEditable.tsx` | Perfil editable |

#### Componentes de Navegación

| Archivo | Descripción |
|---------|-------------|
| `AuthenticatedPortalNavbar.tsx` | Navbar autenticado |
| `PublicNavbar.tsx` | Navbar público |
| `FooterGovCo.tsx` | Footer GOV.CO |
| `RoleSelector.tsx` | Selector de rol |
| `NotificacionesDropdown.tsx` | Dropdown de notificaciones |

#### Componentes Públicos

| Archivo | Descripción |
|---------|-------------|
| `PublicTitleVerification.tsx` | Verificación de títulos |
| `PublicCertificateValidation.tsx` | Validación de certificados |
| `ValidadorCertificadosPublico.tsx` | Validador público |
| `EnrollmentQRLandingUnified.tsx` | Landing de enrolamiento QR |

#### Componentes de Servicios

| Archivo | Descripción |
|---------|-------------|
| `CertificadosLaboralesPortal.tsx` | Certificados laborales |
| `JobBoardPortal.tsx` | Bolsa de empleo |
| `VinculacionForm.tsx` | Formulario de vinculación |
| `DocentesSection.tsx` | Sección de docentes |
| `CommunitySection.tsx` | Sección de comunidad |
| `CapacitacionesDisponibles.tsx` | Capacitaciones |

---

## 4. COMPONENTES COMPARTIDOS

### 4.1 Design System UI
**Ubicación:** `/src/components/ui/`
**Cantidad de Archivos:** 52 componentes

Componentes base de Shadcn/UI personalizados para ESAP:

- `accordion.tsx`, `alert.tsx`, `avatar.tsx`, `badge.tsx`
- `button.tsx`, `card.tsx`, `checkbox.tsx`, `dialog.tsx`
- `dropdown-menu.tsx`, `form.tsx`, `input.tsx`, `label.tsx`
- `modal.tsx`, `pagination.tsx`, `select.tsx`, `tabs.tsx`
- `table.tsx`, `textarea.tsx`, `toast/sonner.tsx`
- Y 25+ componentes adicionales

### 4.2 Componentes Shared
**Ubicación:** `/src/components/shared/`
**Cantidad de Archivos:** 25 componentes

| Archivo | Descripción |
|---------|-------------|
| `DataTable/DataTablePremium.tsx` | Tabla de datos avanzada |
| `PaginationPremium.tsx` | Paginación premium |
| `GlobalSearch.tsx` | Búsqueda global |
| `CommandPalettePremium.tsx` | Paleta de comandos |
| `KeyboardShortcutsPanel.tsx` | Panel de atajos |
| `ExportadorReportes.tsx` | Exportador de reportes |
| `FileUploadDragDrop.tsx` | Carga de archivos |
| `BulkActionsBar.tsx` | Acciones en lote |
| `SedeFilterSelect.tsx` | Filtro de sedes |
| `SedeBadge.tsx` | Badge de sede |
| `UserSedesYProgramasInfo.tsx` | Info sedes/programas |
| `HelpFloatingButton.tsx` | Botón de ayuda |
| `OnboardingTour.tsx` | Tour de bienvenida |
| `MicrointeractionWrapper.tsx` | Microinteracciones |

---

## 5. SERVICIOS DE API

**Ubicación:** `/src/services/`

### 5.1 Servicios Core
**Ubicación:** `/src/services/api/`

| Archivo | Descripción |
|---------|-------------|
| `auth.service.ts` | Autenticación y JWT |
| `usuarios.service.ts` | Gestión de usuarios |
| `certificados.service.ts` | Certificados laborales |
| `controlInternoService.ts` | Control interno |
| `gestionProfesoralService.ts` | Gestión profesoral |
| `enrollmentService.ts` | Inscripción/enrolamiento |
| `estructura.service.ts` | Estructura organizacional |
| `rolesService.ts` | Roles del sistema |
| `userRolesService.ts` | Roles de usuario |
| `portal.service.ts` | Portal transaccional |
| `notificationsService.ts` | Notificaciones |
| `publico.service.ts` | Servicios públicos |
| `dashboard.service.ts` | Dashboard |
| `ptaAPI.ts` | Plan de Trabajo Anual |
| `client.ts` | Cliente HTTP (Axios) |
| `config.ts` | Configuración de API |
| `types.ts` | Tipos de API |

### 5.2 Servicios Adicionales

| Archivo | Descripción |
|---------|-------------|
| `notificationService.ts` | Notificaciones generales |
| `notificacionesPersonasPTA.ts` | Notificaciones PTA |
| `situacionesAdministrativasService.ts` | Situaciones administrativas |
| `personasPTAIntegrationService.ts` | Integración personas-PTA |
| `periodParametersService.ts` | Parámetros de período |
| `sincronizacionSituaciones.ts` | Sincronización |

### 5.3 Servicios PTA
**Ubicación:** `/src/services/pta/`

| Archivo | Descripción |
|---------|-------------|
| `ptaAprobacionGranularService.ts` | Aprobación granular |
| `ptaEnFirmeService.ts` | PTA en firme |

---

## 6. TIPOS Y MODELOS

**Ubicación:** `/src/types/`

| Archivo | Descripción |
|---------|-------------|
| `index.ts` | Exportaciones principales |
| `pta.types.ts` | Tipos de PTA |
| `gestion-profesoral.ts` | Tipos gestión profesoral |
| `control-interno.ts` | Tipos control interno |
| `certificados.ts` | Tipos certificados |
| `estructura-organizacional.types.ts` | Estructura |
| `roles-permissions.types.ts` | Roles y permisos |
| `roles-sistema.types.ts` | Roles del sistema |
| `calendario-academico.types.ts` | Calendario académico |
| `community.types.ts` | Comunidades |
| `integracion-personas-pta.ts` | Integración |
| `periodParameters.ts` | Parámetros período |
| `situacionesAdministrativas.ts` | Situaciones |

---

## 7. HOOKS PERSONALIZADOS

**Ubicación:** `/src/hooks/`
**Cantidad de Archivos:** 29 hooks

### Hooks de Autenticación y Usuarios

| Archivo | Descripción |
|---------|-------------|
| `useAuth.ts` | Autenticación |
| `useRoles.ts` | Roles del sistema |
| `useUserRoles.ts` | Roles de usuario |
| `usePersonasQueries.ts` | Consultas de personas |
| `useUserQueries.ts` | Consultas de usuarios |

### Hooks de PTA

| Archivo | Descripción |
|---------|-------------|
| `usePTA.ts` | Plan de Trabajo Anual |
| `useProrrateoAutomatico.ts` | Prorrateo automático |
| `usePTAEnFirme.ts` | PTA en firme |
| `usePTAAprobacionGranular.ts` | Aprobación granular |

### Hooks de Datos

| Archivo | Descripción |
|---------|-------------|
| `useEnrollment.ts` | Inscripción |
| `useDashboardQueries.ts` | Dashboard |
| `useAuditQueries.ts` | Auditoría |
| `useReportsQueries.ts` | Reportes |
| `useNotifications.ts` | Notificaciones |

### Hooks de UI/UX

| Archivo | Descripción |
|---------|-------------|
| `useKeyboardShortcuts.ts` | Atajos de teclado |
| `useKeyboardNavigation.ts` | Navegación por teclado |
| `useAccessibility.ts` | Accesibilidad |

---

## 8. UTILIDADES

**Ubicación:** `/src/utils/`

| Archivo | Descripción |
|---------|-------------|
| `validaciones.ts` | Validaciones generales |
| `validation.ts` | Validación adicional |
| `validacionesTransicionesEstado.ts` | Transiciones de estado |
| `validacion-sede-programa.ts` | Validación sede-programa |
| `reportExport.ts` | Exportación de reportes |
| `toast.ts` | Notificaciones toast |
| `microinteractions.ts` | Microinteracciones |
| `accessibility.ts` | Accesibilidad |
| `clipboard.ts` | Portapapeles |
| `emailTemplates.ts` | Plantillas de email |
| `rolesPermisosSync.ts` | Sincronización roles |
| `browser.ts` | Utilidades del navegador |

---

## 9. LIBRERÍAS INTERNAS

**Ubicación:** `/src/lib/`

### 9.1 Lógica PTA
**Ubicación:** `/src/lib/pta/`

| Archivo | Descripción |
|---------|-------------|
| `calculoHoras.ts` | Cálculo de horas |
| `prorrateo.ts` | Prorrateo de actividades |
| `reglasNegocio.ts` | Reglas de negocio |

### 9.2 Otros

| Archivo | Descripción |
|---------|-------------|
| `/api/certificadosAPI.ts` | API de certificados |
| `/auth/jwtAuth.ts` | Autenticación JWT |
| `/pdf/reportesPDF.ts` | Generación de PDFs |
| `/services/communityService.ts` | Servicio de comunidades |

---

## 10. CONTEXTOS GLOBALES

**Ubicación:** `/src/contexts/` y `/src/context/`

| Archivo | Descripción |
|---------|-------------|
| `PTAContext.tsx` | Contexto de PTA |
| `NotificacionesContext.tsx` | Contexto de notificaciones |
| `AuditoriaGlobalContext.tsx` | Contexto de auditoría global |

---

## 11. DATOS Y CONFIGURACIÓN

### 11.1 Datos Mock
**Ubicación:** `/src/data/`

| Archivo | Descripción |
|---------|-------------|
| `oferta-academica-esap.ts` | Oferta académica completa |
| `estructura-organizacional-completa.ts` | Estructura organizacional |
| `territoriales-cetap-completo.ts` | Territoriales y CETAP |
| `empleadosElegiblesCertificados.ts` | Empleados elegibles |
| `docentesGestionProfesoral.ts` | Docentes |
| `mockUsersWithSedes.ts` | Usuarios con sedes |
| `permissions-certificados-registro-granular.ts` | Permisos granulares |

### 11.2 Configuración
**Ubicación:** `/src/config/`

| Archivo | Descripción |
|---------|-------------|
| `environment.ts` | Variables de entorno |

---

## 12. ESTILOS

**Ubicación:** `/src/styles/`

| Archivo | Descripción |
|---------|-------------|
| `globals.css` | Estilos globales |
| `esap-theme.css` | Tema ESAP |
| `../index.css` | Estilos compilados (330KB) |

### Paleta de Colores ESAP
- **Primario:** `#003DA5` (Azul ESAP)
- **Secundario:** `#1E40AF`
- **Éxito:** `#10B981`
- **Advertencia:** `#F59E0B`
- **Error:** `#EF4444`

---

## 13. ARCHIVOS DE CONFIGURACIÓN DEL PROYECTO

| Archivo | Descripción |
|---------|-------------|
| `package.json` | Dependencias y scripts |
| `vite.config.ts` | Configuración de Vite |
| `tsconfig.json` | Configuración TypeScript |
| `tailwind.config.js` | Configuración Tailwind CSS |
| `index.html` | HTML principal |
| `README.md` | Documentación del proyecto |

---

## 14. DEPENDENCIAS PRINCIPALES

### Framework y UI
- React 18
- TypeScript 5
- Vite (bundler)
- Tailwind CSS
- Shadcn/UI
- Framer Motion / Motion React

### Estado y Datos
- React Query (TanStack Query)
- React Context API
- Axios (HTTP client)

### Utilidades
- Lucide React (iconos)
- Sonner (notificaciones toast)
- Date-fns (manejo de fechas)
- Zod (validación)

---

## 15. RESUMEN DE ENTREGABLES POR MÓDULO

| Módulo | Componentes | Estado |
|--------|-------------|--------|
| **Gestión de Personas** | 17+ | Completo |
| **Gestión Académica** | 3+ | Completo |
| **Gestión Profesoral (PTA)** | 28+ | Completo |
| **Certificados Laborales** | 19 | Completo |
| **Control Interno (CIG)** | 93 | Completo |
| **Gestión Legal (SIGL)** | 90+ | Completo |
| **Disciplinario** | 27 | Completo |
| **Firma Electrónica** | 18 | Completo |
| **Alertas Automáticas** | 7 | Completo |
| **Estructura Organizacional** | 8 | Completo |
| **Situaciones Administrativas** | 2 | Completo |
| **Comunidades** | 4 | Completo |
| **Portal Transaccional** | 30+ | Completo |
| **Design System UI** | 52 | Completo |
| **Componentes Shared** | 25 | Completo |
| **Servicios API** | 29 | Completo |
| **Hooks** | 29 | Completo |
| **Tipos/Modelos** | 13 | Completo |
| **Utilidades** | 12 | Completo |

---

## 16. NOTAS TÉCNICAS

### Patrones de Arquitectura
- **Arquitectura Modular**: Cada módulo es independiente y escalable
- **Component Composition**: Composición de componentes React
- **Context API**: Estado global compartido por módulos
- **Custom Hooks**: Lógica reutilizable encapsulada
- **Service Layer**: Servicios API centralizados
- **Type Safety**: TypeScript estricto en todo el proyecto

### Buenas Prácticas Implementadas
- Separación de responsabilidades (SRP)
- Componentes reutilizables
- Hooks personalizados para lógica compartida
- Tipado fuerte con TypeScript
- Estilos consistentes con Design System
- Validación de formularios con Zod
- Manejo de estado con React Query

---

## 17. FIRMA DE ENTREGA

Este documento certifica la entrega del código fuente de la Plataforma Comunidades ESAP en las condiciones descritas anteriormente.

**Entregado por:** Equipo de Desarrollo
**Fecha:** 26 de enero de 2026
**Versión del Código:** 1.0

---

*Documento generado automáticamente - Plataforma Comunidades ESAP*
