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

---

##### **a) GESTIÓN DE PERSONAS**

**Ubicación:** `/esap/gestion-personas/`

Módulo integrado para la administración completa de personas, estructura organizacional, configuración del sistema, auditoría y reportes.

---

###### a.1) PERSONAS Y USUARIOS

**Propósito:** Gestión integral del ciclo de vida de usuarios en la plataforma.

| Componente | Descripción | Funcionalidades |
|------------|-------------|-----------------|
| `UsersPersonsModulePremium.tsx` | Módulo principal | Vista completa de gestión de usuarios |
| `PersonasDataTable.tsx` | Tabla de datos | Listado con filtros, ordenamiento, paginación |
| `PersonaDetalleModal.tsx` | Modal de detalle | Información completa de la persona |
| `PersonaFormulario.tsx` | Formulario CRUD | Crear, editar datos de persona |
| `BulkActionsPersonas.tsx` | Acciones masivas | Operaciones sobre múltiples registros |

**Funcionalidades de Personas:**

| Función | Descripción |
|---------|-------------|
| **Crear Usuario** | Registro de nuevo usuario con validación de documento |
| **Editar Usuario** | Modificación de datos personales y de contacto |
| **Desactivar/Activar** | Cambio de estado de cuenta |
| **Eliminar Usuario** | Eliminación permanente con confirmación |
| **Carga Masiva** | Importación desde archivo Excel (.xlsx) |
| **Exportar Listado** | Descarga en PDF o Excel |
| **Búsqueda Avanzada** | Por documento, nombre, correo, sede, rol |
| **Filtros Dinámicos** | Por estado, tipo, fecha de creación |

**Carpeta Digital:**

| Componente | Descripción |
|------------|-------------|
| `CarpetaDigitalModule.tsx` | Módulo de documentos personales |
| `DocumentosGrid.tsx` | Grid de documentos del usuario |
| `UploadDocumento.tsx` | Carga de nuevos documentos |
| `DocumentoViewer.tsx` | Visualizador de documentos |
| `CategoriasDocumentos.tsx` | Organización por categorías |

Tipos de documentos soportados: PDF, imágenes (JPG, PNG), documentos Office.

**Enrolamiento:**

| Componente | Descripción |
|------------|-------------|
| `EnrollmentManagementModule.tsx` | Gestión de enrolamiento |
| `SolicitudesPendientes.tsx` | Bandeja de solicitudes |
| `EnrollmentForm.tsx` | Formulario de registro |
| `QREnrollment.tsx` | Enrolamiento por código QR |
| `BulkEnrollment.tsx` | Enrolamiento masivo |

Flujo de enrolamiento:
```
Solicitud → Validación de datos → Verificación de correo → Creación de cuenta → Asignación de rol
```

**Gestión de Graduados:**

| Componente | Descripción |
|------------|-------------|
| `GraduatesManagementModule.tsx` | Módulo de graduados |
| `GraduadosDataTable.tsx` | Listado de egresados |
| `TitulosGraduado.tsx` | Gestión de títulos |
| `CertificacionGraduado.tsx` | Emisión de certificados |

---

###### a.2) ESTRUCTURA ORGANIZACIONAL

**Propósito:** Definición y gestión de la estructura jerárquica de la ESAP.

| Componente | Descripción | Funcionalidades |
|------------|-------------|-----------------|
| `EstructuraOrganizacionalModule.tsx` | Módulo principal | Vista general de estructura |
| `OrganizacionCompleta.tsx` | Vista completa | Organigrama interactivo |
| `ComponenteArbolOrganigrama.tsx` | Árbol jerárquico | Visualización en árbol |

**Entidades Organizacionales:**

| Entidad | Componente | Descripción |
|---------|------------|-------------|
| **Sedes** | `GestionSedes.tsx` | Ubicaciones físicas principales |
| **Territoriales** | `GestionTerritoriales.tsx` | 16 divisiones geográficas |
| **Áreas** | `GestionAreas.tsx` | Dependencias administrativas |
| **CETAP** | `GestionCETAP.tsx` | Centros Territoriales de Administración Pública |

**Funcionalidades por Entidad:**

| Función | Sedes | Territoriales | Áreas | CETAP |
|---------|-------|---------------|-------|-------|
| Crear | ✓ | ✓ | ✓ | ✓ |
| Editar | ✓ | ✓ | ✓ | ✓ |
| Eliminar | ✓ | ✓ | ✓ | ✓ |
| Asignar responsable | ✓ | ✓ | ✓ | ✓ |
| Ver dependencias | ✓ | ✓ | ✓ | - |
| Exportar | ✓ | ✓ | ✓ | ✓ |

**Jerarquía Organizacional:**
```
ESAP (Nacional)
├── Sede Central
│   ├── Áreas Administrativas
│   └── Áreas Académicas
└── Territoriales (16)
    ├── CETAP (múltiples por territorial)
    └── Áreas Territoriales
```

---

###### a.3) PROGRAMAS ACADÉMICOS

**Propósito:** Gestión de la oferta académica de la ESAP.

| Componente | Descripción |
|------------|-------------|
| `ProgramasAcademicosModule.tsx` | Módulo principal de programas |
| `GestionProgramas.tsx` | CRUD de programas académicos |
| `AsignacionDocentes.tsx` | Asignación de docentes a programas |
| `PlanesEstudio.tsx` | Gestión de planes de estudio |
| `OfertaAcademica.tsx` | Configuración de oferta por período |
| `MallaCurricular.tsx` | Visualización de malla curricular |

**Tipos de Programas:**

| Tipo | Descripción |
|------|-------------|
| **Pregrado** | Programas de formación profesional |
| **Especialización** | Programas de posgrado cortos |
| **Maestría** | Programas de posgrado avanzados |
| **Diplomado** | Programas de educación continua |
| **Curso Corto** | Capacitaciones específicas |

**Funcionalidades:**

| Función | Descripción |
|---------|-------------|
| Crear programa | Registro de nuevo programa con código SNIES |
| Editar programa | Modificación de información del programa |
| Activar/Desactivar | Control de disponibilidad |
| Asignar docentes | Vinculación de docentes al programa |
| Gestionar plan de estudios | Definición de asignaturas y créditos |
| Consultar histórico | Versiones anteriores del programa |

---

###### a.4) ROLES Y PERMISOS

**Propósito:** Sistema RBAC (Role-Based Access Control) para control de acceso granular.

| Componente | Descripción |
|------------|-------------|
| `RolesAdministrationModulePremium.tsx` | Administración de roles |
| `PermisosGranulares.tsx` | Gestión de permisos específicos |
| `AsignacionRoles.tsx` | Asignación de roles a usuarios |
| `MatrizPermisos.tsx` | Matriz visual de permisos por rol |
| `GestionAccesos.tsx` | Control de accesos al sistema |
| `AuditRoles.tsx` | Auditoría de cambios en roles |

**Roles Predefinidos del Sistema:**

| Rol | Nivel | Acceso |
|-----|-------|--------|
| `SUPER_ADMIN` | Máximo | Acceso total a todos los módulos |
| `ADMIN` | Alto | Gestión administrativa completa |
| `AUDITOR` | Especializado | Control interno y auditorías |
| `JEFE_AREA` | Medio | Gestión de su área/dependencia |
| `DOCENTE` | Usuario | Gestión de PTA y actividades académicas |
| `FIRMANTE` | Especializado | Firma electrónica de documentos |
| `ESTUDIANTE` | Básico | Consulta de información personal |
| `GRADUADO` | Básico | Acceso a bolsa de empleo y certificados |

**Permisos Granulares:**

| Categoría | Permisos Disponibles |
|-----------|---------------------|
| **Usuarios** | ver, crear, editar, eliminar, exportar |
| **Roles** | ver, crear, editar, asignar |
| **Reportes** | ver, generar, programar, exportar |
| **Auditorías** | ver, ejecutar, aprobar, cerrar |
| **Documentos** | ver, cargar, firmar, eliminar |
| **Configuración** | ver, modificar |

**Funcionalidades:**

| Función | Descripción |
|---------|-------------|
| Crear rol | Definición de nuevo rol con nombre y descripción |
| Clonar rol | Duplicar rol existente como base |
| Asignar permisos | Selección de permisos para el rol |
| Asignar usuarios | Vincular usuarios al rol |
| Auditar cambios | Registro de modificaciones en roles |
| Exportar matriz | Descarga de matriz de permisos |

---

###### a.5) AUDITORÍA DEL SISTEMA

**Propósito:** Registro y trazabilidad de todas las acciones realizadas en la plataforma.

| Componente | Descripción |
|------------|-------------|
| `AuditModulePremium.tsx` | Módulo principal de auditoría |
| `AuditLogTable.tsx` | Tabla de registros de auditoría |
| `AuditFilters.tsx` | Filtros avanzados de búsqueda |
| `AuditDetailModal.tsx` | Detalle completo del registro |
| `AuditExport.tsx` | Exportación de logs |
| `AnomaliesDetection.tsx` | Detección de comportamientos anómalos |
| `AuditDashboard.tsx` | Dashboard de métricas de auditoría |

**Información Registrada:**

| Campo | Descripción |
|-------|-------------|
| `timestamp` | Fecha y hora exacta de la acción |
| `usuario` | Usuario que realizó la acción |
| `accion` | Tipo de acción (crear, editar, eliminar, ver) |
| `modulo` | Módulo donde se realizó |
| `entidad` | Tipo de objeto afectado |
| `entidad_id` | Identificador del objeto |
| `datos_anteriores` | Estado antes del cambio (JSON) |
| `datos_nuevos` | Estado después del cambio (JSON) |
| `ip_address` | Dirección IP del usuario |
| `user_agent` | Navegador/dispositivo utilizado |

**Filtros Disponibles:**

| Filtro | Opciones |
|--------|----------|
| Fecha | Rango de fechas (desde/hasta) |
| Usuario | Selección de usuario específico |
| Módulo | Filtro por módulo del sistema |
| Acción | Crear, Editar, Eliminar, Ver, Login, Logout |
| Resultado | Exitoso, Fallido |

**Funcionalidades:**

| Función | Descripción |
|---------|-------------|
| Consultar logs | Búsqueda con filtros avanzados |
| Ver detalle | Información completa del registro |
| Exportar | Descarga en PDF o Excel |
| Detectar anomalías | Alertas de comportamientos inusuales |
| Generar reporte | Informe de auditoría por período |

---

###### a.6) REPORTES

**Propósito:** Generación, programación y exportación de reportes del sistema.

| Componente | Descripción |
|------------|-------------|
| `ReportsModuleV2.tsx` | Módulo principal de reportes |
| `ReportBuilder.tsx` | Constructor visual de reportes |
| `ReportScheduler.tsx` | Programación de reportes automáticos |
| `ReportTemplates.tsx` | Gestión de plantillas |
| `ReportViewer.tsx` | Visualizador de reportes |
| `ExportPDF.tsx` | Exportación a PDF |
| `ExportExcel.tsx` | Exportación a Excel |
| `DashboardReports.tsx` | Dashboard con KPIs |

**Tipos de Reportes:**

| Categoría | Reportes Disponibles |
|-----------|---------------------|
| **Usuarios** | Listado de usuarios, Usuarios por rol, Usuarios por sede |
| **Auditoría** | Log de actividades, Accesos al sistema, Cambios críticos |
| **Académico** | Estudiantes por programa, Graduados por período |
| **Operativo** | Certificados emitidos, Firmas realizadas |
| **Gerencial** | Dashboard ejecutivo, Indicadores de gestión |

**Constructor de Reportes (Report Builder):**

| Función | Descripción |
|---------|-------------|
| Seleccionar fuente de datos | Elegir tabla o vista de datos |
| Agregar columnas | Seleccionar campos a mostrar |
| Aplicar filtros | Condiciones de filtrado |
| Agrupar datos | Agrupación por campos |
| Ordenar resultados | Orden ascendente/descendente |
| Agregar cálculos | Sumas, promedios, conteos |
| Diseñar layout | Encabezados, logos, formato |

**Programación de Reportes:**

| Frecuencia | Descripción |
|------------|-------------|
| Diario | Generación automática cada día |
| Semanal | Cada semana en día específico |
| Mensual | Primer día de cada mes |
| Trimestral | Cada 3 meses |
| Personalizado | Cron expression personalizada |

**Formatos de Exportación:**

| Formato | Características |
|---------|-----------------|
| **PDF** | Formato imprimible con diseño, logos, firmas |
| **Excel** | Datos editables con fórmulas |
| **CSV** | Datos planos para importación |

---

##### **b) CONTROL INTERNO CIG**

**Ubicación:** `/esap/control-interno/`
**Archivos:** 108
**Normativa:** Decreto 648 de 2017

Sistema completo para la gestión de auditorías internas según los lineamientos del Departamento Administrativo de la Función Pública (DAFP).

---

###### b.1) ESTRUCTURA DEL MÓDULO

| Subcarpeta | Archivos | Descripción |
|------------|----------|-------------|
| `/auditorias/` | 25 | Gestión completa de auditorías |
| `/listas-chequeo/` | 18 | Listas de verificación digitales |
| `/hallazgos/` | 15 | Gestión de hallazgos |
| `/planes-mejora/` | 12 | Planes de mejoramiento |
| `/seguimiento/` | 10 | Seguimiento trimestral |
| `/reportes/` | 8 | Reportería especializada |
| `/hooks/` | 8 | Hooks personalizados |
| `/services/` | 7 | Servicios API |
| `/utils/` | 5 | Utilidades |

---

###### b.2) PLAN ANUAL DE AUDITORÍAS

| Componente | Descripción |
|------------|-------------|
| `PlanAnualModule.tsx` | Módulo de planificación anual |
| `CrearPlanAnual.tsx` | Formulario de creación del plan |
| `CalendarioAuditorias.tsx` | Vista calendario de auditorías |
| `AsignacionEquipos.tsx` | Asignación de equipos auditores |

**Elementos del Plan Anual:**

| Elemento | Descripción |
|----------|-------------|
| Año fiscal | Período del plan |
| Objetivos | Objetivos de auditoría del período |
| Alcance | Procesos y áreas a auditar |
| Recursos | Equipo auditor disponible |
| Cronograma | Fechas planificadas |
| Presupuesto | Recursos financieros asignados |

**Roles del Equipo Auditor (Decreto 648):**

| Rol | Responsabilidades |
|-----|-------------------|
| **Jefe OCIG** | Aprobación del plan, supervisión general |
| **Auditor Líder** | Coordinación de auditoría específica |
| **Auditor Senior** | Ejecución de procedimientos complejos |
| **Auditor Junior** | Apoyo en ejecución y documentación |
| **Profesional de Apoyo** | Soporte técnico especializado |

---

###### b.3) UNIVERSO DE AUDITORÍAS

| Componente | Descripción |
|------------|-------------|
| `UniversoAuditorias.tsx` | Catálogo de procesos auditables |
| `ProcesoAuditable.tsx` | Detalle de proceso |
| `ReferenciasDAFP.tsx` | Referencias normativas |
| `HistoricoAuditorias.tsx` | Histórico de auditorías por proceso |

**Procesos Auditables por Sede:**

| Proceso | Frecuencia Sugerida |
|---------|---------------------|
| Gestión Financiera | Anual |
| Gestión Documental | Anual |
| Gestión de Talento Humano | Anual |
| Gestión Contractual | Semestral |
| Gestión Académica | Anual |
| Gestión de TI | Anual |
| Gestión de Bienes | Anual |
| Atención al Ciudadano | Anual |
| Control Interno Contable | Semestral |

---

###### b.4) EJECUCIÓN DE AUDITORÍAS

**Flujo de Auditoría:**

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   INICIO    │───▶│ PLANEACIÓN  │───▶│  EJECUCIÓN  │───▶│COMUNICACIÓN │
│  (3-5 días) │    │ (5-10 días) │    │ (10-30 días)│    │  (5 días)   │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
```

**Etapa 1: INICIO**

| Componente | Descripción |
|------------|-------------|
| `InicioAuditoriaWizard.tsx` | Asistente de inicio |
| `GenerarOficioInicio.tsx` | Generación de oficio de inicio |
| `CartaPresentacion.tsx` | Carta de presentación del equipo |
| `NotificacionAreaAuditada.tsx` | Notificación automática |

Documentos generados:
- Oficio de comunicación de inicio
- Carta de presentación del equipo auditor
- Solicitud de información inicial

**Etapa 2: PLANEACIÓN**

| Componente | Descripción |
|------------|-------------|
| `PlaneacionAuditoria.tsx` | Módulo de planeación |
| `DefinirAlcance.tsx` | Definición de alcance y objetivos |
| `ProgramaTrabajo.tsx` | Programa de trabajo detallado |
| `CronogramaActividades.tsx` | Cronograma de ejecución |
| `MatrizRiesgos.tsx` | Matriz de riesgos del proceso |

Duración:
- Sede central: 5-10 días hábiles
- Territorial: 3 días hábiles

**Etapa 3: EJECUCIÓN**

| Componente | Descripción |
|------------|-------------|
| `EjecucionAuditoriaModule.tsx` | Módulo de ejecución |
| `ListasChequeoDigitales.tsx` | Listas de verificación |
| `RecoleccionEvidencias.tsx` | Carga de evidencias |
| `PapelesTrabajo.tsx` | Papeles de trabajo |
| `RegistroHallazgos.tsx` | Registro de hallazgos |

Duración:
- Sede central: 10-30 días hábiles
- Territorial: 4 días hábiles

**Listas de Chequeo Digitales:**

| Componente | Descripción |
|------------|-------------|
| `ListaChequeoViewer.tsx` | Visualizador de lista |
| `ChecklistItem.tsx` | Item individual de verificación |
| `EvidenciaAdjunta.tsx` | Adjuntar evidencia por item |
| `ObservacionItem.tsx` | Observaciones por item |
| `CalificacionCumplimiento.tsx` | Calificación de cumplimiento |

Estados de cumplimiento:
- ✅ Cumple totalmente
- ⚠️ Cumple parcialmente
- ❌ No cumple
- ➖ No aplica

**Etapa 4: COMUNICACIÓN**

| Componente | Descripción |
|------------|-------------|
| `ComunicacionResultados.tsx` | Módulo de comunicación |
| `InformePreliminar.tsx` | Generación de informe preliminar |
| `MesaTrabajoHallazgos.tsx` | Mesa de trabajo con auditados |
| `InformeFinal.tsx` | Informe final de auditoría |
| `InformeEjecutivo.tsx` | Resumen ejecutivo |

Documentos generados:
- Informe preliminar de auditoría
- Acta de mesa de trabajo
- Informe final de auditoría
- Informe ejecutivo para la dirección

---

###### b.5) HALLAZGOS Y PLANES DE MEJORAMIENTO

| Componente | Descripción |
|------------|-------------|
| `HallazgosYMejoramientoCompleto.tsx` | Módulo integrado |
| `RegistroHallazgo.tsx` | Formulario de hallazgo |
| `ClasificacionHallazgo.tsx` | Clasificación por tipo |
| `AccionCorrectiva.tsx` | Definición de acciones |
| `ResponsableAccion.tsx` | Asignación de responsables |

**Clasificación de Hallazgos:**

| Tipo | Descripción | Nivel |
|------|-------------|-------|
| **No Conformidad Mayor** | Incumplimiento total de requisito | Alto |
| **No Conformidad Menor** | Incumplimiento parcial | Medio |
| **Observación** | Oportunidad de mejora | Bajo |
| **Fortaleza** | Buena práctica identificada | Positivo |

**Estructura del Plan de Mejoramiento:**

| Campo | Descripción |
|-------|-------------|
| Hallazgo | Descripción del hallazgo |
| Causa raíz | Análisis de causa |
| Acción correctiva | Acción a implementar |
| Responsable | Persona responsable |
| Fecha compromiso | Fecha límite |
| Recursos | Recursos necesarios |
| Indicador | Indicador de cumplimiento |
| Meta | Meta a alcanzar |

---

###### b.6) SEGUIMIENTO TRIMESTRAL

| Componente | Descripción |
|------------|-------------|
| `SeguimientoPlanMejoramientoModule.tsx` | Módulo de seguimiento |
| `CargaEvidencias.tsx` | Carga de evidencias de avance |
| `ValidacionAvance.tsx` | Validación por auditor |
| `SemaforoIndicadores.tsx` | Indicadores tipo semáforo |
| `ReporteSeguimiento.tsx` | Reporte de seguimiento |

**Períodos de Seguimiento:**

| Período | Meses | Fecha Límite |
|---------|-------|--------------|
| Primer trimestre | Ene-Mar | 15 de Abril |
| Segundo trimestre | Abr-Jun | 15 de Julio |
| Tercer trimestre | Jul-Sep | 15 de Octubre |
| Cuarto trimestre | Oct-Dic | 15 de Enero |

**Sistema de Semáforos:**

| Color | Porcentaje | Estado |
|-------|------------|--------|
| 🟢 Verde | 80-100% | En cumplimiento |
| 🟡 Amarillo | 50-79% | En riesgo |
| 🔴 Rojo | 0-49% | Incumplimiento |

---

###### b.7) DASHBOARD Y REPORTES CIG

| Componente | Descripción |
|------------|-------------|
| `DashboardEjecutivoCIG.tsx` | Dashboard ejecutivo |
| `KPIsControlInterno.tsx` | Indicadores clave |
| `GraficosAvance.tsx` | Gráficos de progreso |
| `ReportePlanAnual.tsx` | Estado del plan anual |
| `ReporteCumplimiento.tsx` | Cumplimiento de mejoras |

**KPIs del Dashboard:**

| Indicador | Descripción |
|-----------|-------------|
| Auditorías planificadas | Total del plan anual |
| Auditorías ejecutadas | Completadas a la fecha |
| % Avance plan | Porcentaje de ejecución |
| Hallazgos abiertos | Pendientes de cierre |
| Hallazgos cerrados | Cerrados satisfactoriamente |
| % Cumplimiento mejoras | Avance de planes de mejora |

---

##### **c) GESTIÓN LEGAL (SIGL v5.0)**

**Ubicación:** `/esap/gestion-legal/`
**Archivos:** 96

Sistema Integrado de Gestión Legal para procesos jurídicos y coactivos.

---

###### c.1) ESTRUCTURA DEL MÓDULO

| Subcarpeta | Archivos | Descripción |
|------------|----------|-------------|
| `/modulos/` | 20 | Módulos funcionales principales |
| `/procesos-coactivos/` | 18 | Gestión de cobro coactivo |
| `/expedientes/` | 15 | Gestión de expedientes |
| `/design-system/` | 12 | Componentes UI especializados |
| `/services/` | 10 | Servicios API |
| `/core/` | 8 | Núcleo del sistema |
| `/config/` | 5 | Configuración |
| `/data/` | 4 | Datos mock |
| `/utils/` | 4 | Utilidades |

---

###### c.2) PROCESOS COACTIVOS

| Componente | Descripción |
|------------|-------------|
| `ProcesosCoactivosModule.tsx` | Módulo principal |
| `ListadoProcesos.tsx` | Listado de procesos activos |
| `NuevoProceso.tsx` | Creación de nuevo proceso |
| `DetalleProceso.tsx` | Vista detallada del proceso |
| `FlujoProcesal.tsx` | Flujo del proceso coactivo |
| `TerminosProcesales.tsx` | Control de términos |
| `NotificacionesJuridicas.tsx` | Sistema de notificaciones |

**Etapas del Proceso Coactivo:**

```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│  PERSUASIVO  │───▶│   COACTIVO   │───▶│  EJECUCIÓN   │───▶│    CIERRE    │
│              │    │              │    │              │    │              │
│ - Cobro      │    │ - Mandamiento│    │ - Embargo    │    │ - Pago total │
│   persuasivo │    │   de pago    │    │ - Secuestro  │    │ - Acuerdo    │
│ - Acuerdos   │    │ - Excepciones│    │ - Remate     │    │ - Archivo    │
└──────────────┘    └──────────────┘    └──────────────┘    └──────────────┘
```

**Gestión de Expedientes:**

| Componente | Descripción |
|------------|-------------|
| `ExpedienteDigital.tsx` | Expediente electrónico |
| `DocumentosExpediente.tsx` | Documentos del caso |
| `IndiceExpediente.tsx` | Índice automático |
| `TrazabilidadExpediente.tsx` | Historial de acciones |
| `CompartirExpediente.tsx` | Compartir con usuarios |

**Control de Términos:**

| Componente | Descripción |
|------------|-------------|
| `TerminosAlertas.tsx` | Alertas de vencimiento |
| `CalendarioTerminos.tsx` | Calendario de términos |
| `SuspensionTerminos.tsx` | Gestión de suspensiones |
| `ProrrogaTerminos.tsx` | Solicitudes de prórroga |

Alertas automáticas:
- 🔴 Vencido: Término expirado
- 🟡 Por vencer: 3 días o menos
- 🟢 Vigente: Más de 3 días

---

##### **d) CONTROL DISCIPLINARIO**

**Ubicación:** `/esap/disciplinario/`
**Archivos:** 30

Sistema para gestión de procesos disciplinarios según el Código General Disciplinario.

---

###### d.1) COMPONENTES PRINCIPALES

| Componente | Descripción |
|------------|-------------|
| `ControlDisciplinarioFull.tsx` | Módulo completo |
| `DashboardKanbanOperativo.tsx` | Vista Kanban de procesos |
| `GestionProcesos.tsx` | Gestión de procesos |
| `GestionNoticias.tsx` | Noticias disciplinarias |
| `GestionProfesionales.tsx` | Profesionales involucrados |
| `GestionTerminosAlertas.tsx` | Términos y alertas |

---

###### d.2) FLUJO DISCIPLINARIO

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   NOTICIA   │───▶│ INDAGACIÓN  │───▶│INVESTIGACIÓN│───▶│   JUICIO    │
│             │    │  PREVIA     │    │ DISCIPL.    │    │             │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
       │                  │                  │                  │
       ▼                  ▼                  ▼                  ▼
   Recepción          Verificación       Formulación        Decisión
   de queja           de hechos          de cargos          final
```

**Gestión de Noticias Disciplinarias:**

| Componente | Descripción |
|------------|-------------|
| `NuevoNoticia.tsx` | Registro de nueva noticia |
| `ClasificacionNoticia.tsx` | Clasificación por tipo |
| `AsignacionAbogado.tsx` | Asignación de profesional |
| `EvaluacionPreliminar.tsx` | Evaluación de procedibilidad |

**Estados de Proceso:**

| Estado | Descripción |
|--------|-------------|
| Recibido | Noticia ingresada al sistema |
| En evaluación | Análisis de procedibilidad |
| Indagación previa | Etapa de indagación |
| Investigación | Investigación formal |
| Juicio | Etapa de juzgamiento |
| Fallo | Decisión emitida |
| Archivado | Proceso cerrado |

---

##### **e) FIRMA ELECTRÓNICA**

**Ubicación:** `/esap/firma-electronica/`
**Archivos:** 18

Sistema de firma electrónica con validez legal según Ley 527 de 1999.

---

###### e.1) COMPONENTES PRINCIPALES

| Componente | Descripción |
|------------|-------------|
| `ModuloFirmaElectronicaWorldClass.tsx` | Módulo principal completo |
| `PortalTransaccionalFirmaCompleto.tsx` | Portal para firmantes |
| `GestionDocumentosFirma.tsx` | Gestión de documentos |
| `FlujosFirma.tsx` | Configuración de flujos |
| `VisorDocumentoFirmaOTP.tsx` | Visor con validación OTP |
| `ModalHistorialFirmas.tsx` | Historial de firmas |
| `ModalTrazabilidadDocumento.tsx` | Trazabilidad completa |

---

###### e.2) FLUJO DE FIRMA

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   CARGAR    │───▶│  ASIGNAR    │───▶│   FIRMAR    │───▶│  COMPLETAR  │
│  DOCUMENTO  │    │  FIRMANTES  │    │   (OTP)     │    │             │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
```

**Proceso de Firma:**

| Paso | Descripción |
|------|-------------|
| 1. Cargar documento | Subir PDF a firmar |
| 2. Definir firmantes | Agregar firmantes en orden |
| 3. Enviar solicitud | Notificar a firmantes |
| 4. Recibir código OTP | Código enviado por correo/SMS |
| 5. Validar identidad | Ingresar código OTP |
| 6. Firmar documento | Aplicar firma electrónica |
| 7. Generar certificado | Documento con certificado de firma |

**Validación OTP:**

| Componente | Descripción |
|------------|-------------|
| `GeneradorOTP.tsx` | Generación de código único |
| `ValidadorOTP.tsx` | Validación de código |
| `ReenvioOTP.tsx` | Reenvío de código |
| `ConfiguracionOTP.tsx` | Configuración de canal (email/SMS) |

**Trazabilidad:**

| Campo | Descripción |
|-------|-------------|
| Fecha/hora de firma | Timestamp exacto |
| Firmante | Nombre e identificación |
| IP de origen | Dirección IP |
| Hash del documento | Hash SHA-256 |
| Certificado | Certificado de firma |

---

##### **f) REGISTRO ACADÉMICO**

**Ubicación:** `/esap/registro-academico/`

Sistema para gestión de información académica de estudiantes.

---

###### f.1) COMPONENTES PRINCIPALES

| Componente | Descripción |
|------------|-------------|
| `RegistroAcademicoModule.tsx` | Módulo principal |
| `GestionMatriculas.tsx` | Gestión de matrículas |
| `HistorialAcademico.tsx` | Consulta de historial |
| `CertificacionesTitulos.tsx` | Certificación de títulos |
| `GestionNotas.tsx` | Administración de calificaciones |
| `ConsultaEstudiantes.tsx` | Búsqueda de estudiantes |
| `ReportesAcademicos.tsx` | Reportes académicos |

---

###### f.2) FUNCIONALIDADES

**Gestión de Matrículas:**

| Función | Descripción |
|---------|-------------|
| Registrar matrícula | Nueva matrícula de estudiante |
| Renovar matrícula | Renovación por período |
| Cancelar matrícula | Cancelación con motivo |
| Transferir | Cambio de programa/sede |
| Consultar estado | Estado actual de matrícula |

**Historial Académico:**

| Información | Descripción |
|-------------|-------------|
| Asignaturas cursadas | Lista completa |
| Calificaciones | Notas por asignatura |
| Créditos | Créditos aprobados/pendientes |
| Promedio | Promedio acumulado |
| Estado académico | Regular, Prueba, Suspendido |

**Certificación de Títulos:**

| Componente | Descripción |
|------------|-------------|
| `SolicitudCertificado.tsx` | Solicitud de certificado |
| `ValidacionTitulo.tsx` | Validación de requisitos |
| `GeneracionCertificado.tsx` | Generación con QR |
| `HistorialCertificados.tsx` | Certificados emitidos |

---

##### **g) CERTIFICADOS LABORALES**

**Ubicación:** `/esap/certificados-laborales/`
**Archivos:** 20

Sistema de generación y validación de certificados laborales con código QR.

---

###### g.1) COMPONENTES PRINCIPALES

| Componente | Descripción |
|------------|-------------|
| `CertificadosLaboralesDashboard.tsx` | Dashboard principal |
| `CertificadosLaboralesRouter.tsx` | Enrutador del módulo |
| `GenerarCertificadoModal.tsx` | Generación de certificados |
| `SolicitarCertificadoForm.tsx` | Formulario de solicitud |
| `ConfiguracionPlantilla.tsx` | Configuración de plantillas |
| `ValidarCertificadoQR.tsx` | Validador de QR |
| `HistorialVerificacionesQR.tsx` | Historial de verificaciones |
| `AnalyticsDashboard.tsx` | Dashboard de analíticas |

---

###### g.2) FLUJO DE CERTIFICACIÓN

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  SOLICITAR  │───▶│  VALIDAR    │───▶│  GENERAR    │───▶│  ENTREGAR   │
│             │    │  DATOS      │    │  CON QR     │    │             │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
```

**Tipos de Certificados:**

| Tipo | Descripción |
|------|-------------|
| Certificado laboral básico | Vinculación y cargo actual |
| Certificado con funciones | Incluye funciones del cargo |
| Certificado con salario | Incluye información salarial |
| Constancia de trabajo | Certificación simple |

**Validación por QR:**

| Componente | Descripción |
|------------|-------------|
| `QRGenerator.tsx` | Generador de código QR único |
| `QRScannerModal.tsx` | Escáner de QR |
| `ValidacionPublica.tsx` | Validación sin login |
| `ResultadoValidacion.tsx` | Resultado de verificación |

**Información del QR:**

| Campo | Descripción |
|-------|-------------|
| Código único | Identificador del certificado |
| Fecha emisión | Fecha de generación |
| Empleado | Nombre del funcionario |
| Cargo | Cargo certificado |
| URL validación | Enlace de verificación |

---

##### **h) ARQUITECTURA EMPRESARIAL**

**Ubicación:** `/esap/arquitectura-empresarial/`
**Archivos:** 31

Módulo para gestión de arquitectura empresarial según Marco de Referencia de Arquitectura Empresarial (MRAE) de MinTIC.

---

###### h.1) COMPONENTES PRINCIPALES

| Componente | Descripción |
|------------|-------------|
| `ArquitecturaEmpresarialModule.tsx` | Módulo principal |
| `DashboardEjecutivoAE.tsx` | Dashboard ejecutivo |
| `GestionProyectosAE.tsx` | Gestión de proyectos AE |
| `MatrizMadurezCompleta.tsx` | Matriz de madurez |
| `MatrizCumplimientoGlobal.tsx` | Cumplimiento por dominio |
| `RoadmapEstrategico.tsx` | Roadmap de implementación |
| `SeguimientoMinTIC.tsx` | Seguimiento reportes MinTIC |

---

###### h.2) DOMINIOS MRAE

| Dominio | Componente | Descripción |
|---------|------------|-------------|
| Estrategia TI | `DominioEstrategiaTI.tsx` | Alineación estratégica |
| Gobierno TI | `DominioGobiernoTI.tsx` | Gobernanza de TI |
| Información | `DominioInformacion.tsx` | Gestión de información |
| Sistemas de Información | `DominioSistemas.tsx` | Arquitectura de SI |
| Servicios Tecnológicos | `DominioServicios.tsx` | Infraestructura |
| Uso y Apropiación | `DominioUsoApropiacion.tsx` | Adopción tecnológica |
| Seguridad y Privacidad | `DominioSeguridadPrivacidad.tsx` | Seguridad de la información |

**Matriz de Madurez:**

| Nivel | Descripción |
|-------|-------------|
| 1 - Inicial | Procesos ad-hoc |
| 2 - Repetible | Procesos básicos definidos |
| 3 - Definido | Procesos estandarizados |
| 4 - Gestionado | Procesos medidos y controlados |
| 5 - Optimizado | Mejora continua |

---

##### **i) GESTIÓN PROFESORAL PTA**

**Ubicación:** `/esap/gestion-profesoral/`
**Archivos:** 17

Sistema para gestión del Plan de Trabajo Anual de docentes.

---

###### i.1) COMPONENTES PRINCIPALES

| Componente | Descripción |
|------------|-------------|
| `GestionProfesoralApp.tsx` | Aplicación principal |
| `GestionProfesoralDashboard.tsx` | Dashboard general |
| `DashboardDocente.tsx` | Vista para docentes |
| `DashboardAprobador.tsx` | Vista para aprobadores |
| `WizardCrearPTA.tsx` | Asistente de creación |
| `VistaDetallePTA.tsx` | Detalle del PTA |

---

###### i.2) SECCIONES DEL PTA

| Sección | Componente | Descripción |
|---------|------------|-------------|
| Docencia | `FormularioDocencia.tsx` | Actividades de enseñanza |
| Investigación | `FormularioInvestigacion.tsx` | Proyectos de investigación |
| Extensión | `FormularioExtension.tsx` | Proyección social |
| Complementarias | `FormularioActividadesComplementarias.tsx` | Otras actividades |

**Distribución de Horas:**

| Actividad | % Mínimo | % Máximo |
|-----------|----------|----------|
| Docencia | 40% | 70% |
| Investigación | 10% | 30% |
| Extensión | 10% | 20% |
| Complementarias | 5% | 15% |

**Flujo de Aprobación:**

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  BORRADOR   │───▶│  ENVIADO    │───▶│ EN REVISIÓN │───▶│  APROBADO   │
│             │    │             │    │             │    │             │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
       │                                     │
       │                                     ▼
       │                              ┌─────────────┐
       └──────────────────────────────│  REQUIERE   │
                                      │  AJUSTES    │
                                      └─────────────┘
```

**Prorrateo Automático:**

| Componente | Descripción |
|------------|-------------|
| `ModalProrrateo.tsx` | Modal de cálculo automático |
| `CalculadoraHoras.tsx` | Cálculo de distribución |
| `ValidadorPorcentajes.tsx` | Validación de límites |

---

##### **j) OTRAS SUBCARPETAS**

| Subcarpeta | Archivos | Descripción |
|------------|----------|-------------|
| `/admin/` | 3 | Componentes de administración avanzada |
| `/alertas/` | 5 | Sistema de notificaciones y alertas |
| `/auth/` | 4 | Componentes de autenticación |
| `/shared/` | 8 | Componentes compartidos del backoffice |

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
