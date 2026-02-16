# Documentación Técnica - Plataforma Comunidad ESAP

## TABLA DE CONTENIDOS

1. [INTRODUCCIÓN](#1-introducción)
   1.1 [Propósito del Documento](#11-propósito-del-documento)
   1.2 [Alcance](#12-alcance)
   1.3 [Definiciones y Acrónimos](#13-definiciones-y-acrónimos)

2. [VISIÓN GENERAL DEL SISTEMA](#2-visión-general-del-sistema)
   2.1 [Descripción del Sistema](#21-descripción-del-sistema)
   2.2 [Objetivos Arquitectónicos](#22-objetivos-arquitectónicos)
   2.3 [Características Principales](#23-características-principales)

3. [REQUISITOS NO FUNCIONALES](#3-requisitos-no-funcionales)
   3.1 [Disponibilidad y Rendimiento](#31-disponibilidad-y-rendimiento)
   3.2 [Escalabilidad](#32-escalabilidad)
   3.3 [Seguridad](#33-seguridad)
   3.4 [Usabilidad y Accesibilidad](#34-usabilidad-y-accesibilidad)
   3.5 [Mantenibilidad](#35-mantenibilidad)

4. [STACK TECNOLÓGICO](#4-stack-tecnológico)
   4.1 [Tecnologías Core](#41-tecnologías-core)
   4.2 [Dependencias de Componentes UI](#42-dependencias-de-componentes-ui)
   4.3 [Gestión de Estado y Datos](#43-gestión-de-estado-y-datos)
   4.4 [Utilidades](#44-utilidades)

5. [ESTRUCTURA DEL PROYECTO](#5-estructura-del-proyecto)
   5.1 [Organización de Directorios](#51-organización-de-directorios)
   5.2 [Convenciones de Nomenclatura](#52-convenciones-de-nomenclatura)
   5.3 [Estructura de un Módulo (Micro-Frontend)](#53-estructura-de-un-módulo-micro-frontend)

6. [ARQUITECTURA DE LA APLICACIÓN](#6-arquitectura-de-la-aplicación)
   6.1 [Arquitectura de Alto Nivel](#61-arquitectura-de-alto-nivel)
   6.2 [Arquitectura de Micro-Frontends](#62-arquitectura-de-micro-frontends)
   6.3 [Vistas Principales](#63-vistas-principales)

7. [SISTEMA DE COMPONENTES](#7-sistema-de-componentes)
   7.1 [Jerarquía de Componentes](#71-jerarquía-de-componentes)
   7.2 [Componentes ESAP Backoffice](#72-componentes-esap-backoffice)
   7.3 [Componentes Portal](#73-componentes-portal)

8. [GESTIÓN DE ESTADO](#8-gestión-de-estado)
   8.1 [Estrategia de Estado](#81-estrategia-de-estado)
   8.2 [Contextos Principales](#82-contextos-principales)
   8.3 [Hooks Personalizados](#83-hooks-personalizados)

9. [SERVICIOS Y APIs](#9-servicios-y-apis)
   9.1 [Arquitectura de Servicios](#91-arquitectura-de-servicios)
   9.2 [APIClient - Cliente HTTP Centralizado](#92-apiclient---cliente-http-centralizado)
   9.3 [Configuración de Ambiente](#93-configuración-de-ambiente)

10. [SISTEMA DE AUTENTICACIÓN Y SEGURIDAD](#10-sistema-de-autenticación-y-seguridad)
    10.1 [Flujo de Autenticación](#101-flujo-de-autenticación)
    10.2 [Control de Acceso (RBAC)](#102-control-de-acceso-rbac)
    10.3 [Gestión de Sesión](#103-gestión-de-sesión)
    10.4 [Protecciones de Seguridad](#104-protecciones-de-seguridad)

11. [MODELOS DE DATOS](#11-modelos-de-datos)
    11.1 [Modelo de Usuario](#111-modelo-de-usuario)
    11.2 [Modelo de Plan de Trabajo Académico (PTA)](#112-modelo-de-plan-de-trabajo-académico-pta)
    11.3 [Estados del PTA](#113-estados-del-pta)

12. [FLUJOS DE LA APLICACIÓN](#12-flujos-de-la-aplicación)
    12.1 [Flujo de Aprobación del PTA](#121-flujo-de-aprobación-del-pta)
    12.2 [Portal Transaccional - Dashboard Dinámico](#122-portal-transaccional---dashboard-dinámico)

13. [INTEGRACIONES EXTERNAS](#13-integraciones-externas)
    13.1 [Integración con Backend](#131-integración-con-backend)
    13.2 [Generación de Documentos](#132-generación-de-documentos)

14. [PATRONES DE DISEÑO](#14-patrones-de-diseño)
    14.1 [Patrones de Componentes](#141-patrones-de-componentes)
    14.2 [Patrones de UI](#142-patrones-de-ui)

15. [DECISIONES ARQUITECTÓNICAS IMPLEMENTADAS](#15-decisiones-arquitectónicas-implementadas)
    15.1 [Framework Frontend: React + TypeScript](#151-framework-frontend-react--typescript)
    15.2 [Arquitectura Frontend: SPA Modular](#152-arquitectura-frontend-spa-modular)
    15.3 [Gestión de Estado: TanStack Query + Context API](#153-gestión-de-estado-tanstack-query--context-api)
    15.4 [Sistema de Autenticación: JWT + RBAC](#154-sistema-de-autenticación-jwt--rbac)
    15.5 [Sistema de Componentes UI: Radix UI + Tailwind CSS](#155-sistema-de-componentes-ui-radix-ui--tailwind-css)

16. [GUÍA DE DESARROLLO](#16-guía-de-desarrollo)
    16.1 [Configuración del Entorno](#161-configuración-del-entorno)
    16.2 [Convenciones de Código](#162-convenciones-de-código)

17. [DIAGRAMAS DE ARQUITECTURA](#17-diagramas-de-arquitectura)
    17.1 [Diagrama de Arquitectura General](#171-diagrama-de-arquitectura-general)
    17.2 [Diagrama de Sistema de Componentes UI](#172-diagrama-de-sistema-de-componentes-ui)
    17.3 [Diagrama de Flujo de Datos](#173-diagrama-de-flujo-de-datos)

[APÉNDICE A: GLOSARIO DE TÉRMINOS](#apéndice-a-glosario-de-términos)

[APÉNDICE B: HISTORIAL DE CAMBIOS](#apéndice-b-historial-de-cambios)

---

## 1. INTRODUCCIÓN

### 1.1 Propósito del Documento

Esta documentación técnica describe la arquitectura, diseño e implementación de la **Plataforma Comunidad ESAP**, una aplicación web integral para la gestión administrativa y académica de la Escuela Superior de Administración Pública (ESAP). El documento está dirigido a desarrolladores, arquitectos de software y stakeholders técnicos que necesiten comprender la estructura técnica del sistema.

### 1.2 Alcance

La documentación cubre:
- Arquitectura de microservicios backend
- Arquitectura de micro-frontends frontend
- Tecnologías y stack utilizado
- Patrones de diseño implementados
- Decisiones arquitectónicas tomadas
- Guías de desarrollo y mejores prácticas

### 1.3 Definiciones y Acrónimos

| Acrónimo | Definición |
|----------|------------|
| ESAP | Escuela Superior de Administración Pública |
| SPA | Single Page Application |
| RBAC | Role-Based Access Control |
| JWT | JSON Web Token |
| API | Application Programming Interface |
| UI | User Interface |
| UX | User Experience |
| ADR | Architecture Decision Record |
| PTA | Plan de Trabajo Académico |
| C4 | Modelo de diagramas de arquitectura |

## 2. VISIÓN GENERAL DEL SISTEMA

### 2.1 Descripción del Sistema

La plataforma ComUNIdadESAP es una aplicación de página única (Single Page Application - SPA) desarrollada con el framework React, que proporciona una solución integral para la gestión administrativa y académica de la Escuela Superior de Administración Pública (ESAP):
- **Portal Transaccional**: Panel de control unificado para usuarios autenticados, incluyendo docentes, personal administrativo, estudiantes y graduados.
- **Backoffice Administrativo**: Sistema completo de gestión para administradores del sistema con controles de acceso granular.
- **Módulos Especializados**: Gestión de registros académicos, control disciplinario interno, certificación, auditorías institucionales, gestión legal y notificaciones.

### 2.2 Objetivos Arquitectónicos

| Objetivo | Implementación |
|----------|----------------|
| Escalabilidad | Micro-frontends modulares |
| Mantenibilidad | Separación de responsabilidades |
| Seguridad | RBAC granular + JWT + protección XSS |
| Rendimiento | Code splitting + lazy loading |
| Accesibilidad | WCAG AA compliance |
| Experiencia UX | Responsive + PWA ready |

### 2.3 Características Principales

| Módulo | Estado | Descripción | Microservicio |
|--------|--------|-------------|---------------|
| Autenticación | Completo | Sistema JWT con tokens de acceso y refresh, recuperación de contraseña por email, validación de sesiones persistentes | auth-service |
| Autorización | Completo | Control de acceso basado en roles (RBAC) con permisos granulares por sede, programa académico y funcionalidades específicas | auth-service |
| Plan de Trabajo Académico | Completo | Gestión de PTA con 4 componentes evaluativos (docencia, investigación, extensión, administración) y flujo de aprobación en 3 niveles jerárquicos | academic-work-plan-service |
| Control Interno | Completo | Sistema completo de auditorías institucionales con equipos auditor, hallazgos, planes de mejoramiento y seguimiento de cumplimiento | internal-institutional-control-service |
| Certificados | Completo | Emisión y validación de certificados laborales y académicos con códigos QR para verificación pública y plantillas personalizables | certification-service |
| Reportería | Completo | Generación de reportes en PDF, Excel y dashboards interactivos con métricas en tiempo real y exportación de datos | academic-registration-service, certification-service, internal-disciplinary-control-service, internal-institutional-control-service, audit-service |
| Portal Unificado | Completo | Dashboard responsivo que se adapta dinámicamente según el rol del usuario, mostrando widgets relevantes y accesos directos | Frontend React |
| Micro-Frontends | En Migración | Arquitectura modular con múltiples módulos activos organizados en dominios (admin, alertas, auditoría, autenticación, disciplinario, firma electrónica, gestión legal, registro académico) y migración incremental planificada | Frontend modular |

## 3. REQUISITOS NO FUNCIONALES

### 3.1 Disponibilidad y Rendimiento

- **Tiempo de respuesta**: < 2 segundos para operaciones críticas
- **Disponibilidad**: 99.5% uptime mensual
- **Capacidad**: Soporte para 1000+ usuarios concurrentes
- **Optimización**: Code splitting, lazy loading, compresión de assets

### 3.2 Escalabilidad

| Requisito | Capacidad | Observaciones |
|-----------|-----------|---------------|
| Usuarios concurrentes | 500+ | Pico durante inscripciones académicas |
| Usuarios registrados | 26,000+ | Estudiantes, docentes, administrativos, egresados |
| Transacciones diarias | 10,000+ | Consultas, actualizaciones, reportes |
| Crecimiento anual esperado | 15% | En usuarios y transacciones |
| Escalabilidad Horizontal | ✅ Implementada | Microservicios independientes escalables |
| Escalabilidad Vertical | ✅ Implementada | Optimización de recursos por servicio |
| Base de datos | ✅ Implementada | Esquemas separados por servicio |

### 3.3 Seguridad

- **Autenticación**: JWT con refresh tokens
- **Autorización**: RBAC granular
- **Cifrado en tránsito**: TLS 1.3 obligatorio para todas las comunicaciones
- **Protecciones**: XSS prevention, CSRF protection, input validation
- **Compliance**: Protección de datos personales

### 3.4 Usabilidad y Accesibilidad

- **Accesibilidad**: Cumplimiento WCAG AA
- **Responsive**: Diseño adaptativo para dispositivos móviles
- **UX**: Interfaz intuitiva con feedback visual
- **Performance**: Carga inicial < 3 segundos

### 3.5 Mantenibilidad

- **Código**: TypeScript para type safety
- **Documentación**: ADR para decisiones arquitectónicas
- **Testing**: Cobertura de código > 80%
- **CI/CD**: Pipelines automatizados

### 3.6 Requisitos de Desarrollo y Calidad

| Requisito | Especificación | Estado |
|-----------|----------------|--------|
| Cobertura de código | Mínimo 70% en pruebas unitarias | ✅ Implementado |
| Documentación de código | JSDoc/TSDoc en funciones públicas y componentes | ✅ Implementado |
| Modularidad | Arquitectura de micro-frontends independientes | ✅ Implementado |
| Versionamiento | Semantic Versioning (SemVer) para releases | ✅ Implementado |
| Tiempo de despliegue | < 15 minutos para actualizaciones menores | ✅ Implementado |

*Nota: Los requisitos marcados como implementados cumplen con los estándares definidos para el proyecto, basados en las métricas y procesos establecidos en el ciclo de desarrollo.*

## 4. STACK TECNOLÓGICO

### 4.1 Tecnologías Core

El conjunto de tecnologías principales (stack tecnológico) de la aplicación frontend está compuesto por las siguientes herramientas:

| Componente | Tecnología | Versión | Propósito |
|------------|------------|---------|-----------|
| Framework Frontend | React | 18.3.1 | Marco de trabajo para interfaces de usuario |
| Lenguaje | TypeScript | 5.x | Seguridad de tipos (Type safety) |
| Build Tool | Vite | 6.3.5 | Herramienta de compilación |
| CSS Framework | Tailwind CSS | Última versión (Latest) | Marco de trabajo CSS basado en utilidades |
| Componentes Base | Radix UI | Última versión (Latest) | Componentes accesibles sin estilos predefinidos |
| Sistema UI | Shadcn/ui | Última versión (Latest) | Sistema de componentes de interfaz de usuario |
| Routing | React Router | 7.10.1 | Client-side routing |
| Backend Framework | NestJS | Latest | API development |
| Database | PostgreSQL | 16 | Data persistence |
| Cache | Redis | 7 | Session & data caching |

### 4.2 Dependencias de Componentes UI

| Paquete | Propósito |
|---------|-----------|
| @radix-ui/* | Suite completa de componentes accesibles sin estilos predefinidos |
| tailwindcss | Marco de trabajo CSS basado en clases de utilidad |
| lucide-react | Biblioteca de íconos con más de 487 íconos disponibles |
| recharts | Biblioteca para visualización de datos y generación de gráficos |
| embla-carousel-react | Carruseles accesibles y optimizados |
| Framer Motion | Latest | Animaciones |
| React Hook Form | 7.55.0 | Form management |

### 4.3 Gestión de Estado y Datos

| Librería | Versión | Uso |
|----------|---------|-----|
| TanStack Query | Latest | Server state management |
| Axios | Latest | HTTP client |
| Context API | Native | Global state |

### 4.4 Utilidades

| Librería | Versión | Uso |
|----------|---------|-----|
| Class Variance Authority | 0.7.1 | Conditional styling |
| Clsx | Latest | Conditional classes |
| UUID | 13.0.0 | ID generation |
| ExcelJS | 4.4.0 | Excel file generation |
| jsPDF | Latest | PDF generation |

## 5. ESTRUCTURA DEL PROYECTO

### 5.1 Organización de Directorios

La estructura del proyecto sigue una organización modular y escalable, separando claramente el frontend, backend, configuración de despliegue y recursos de base de datos:

```
/
├── src/                           # Código fuente del frontend
│   ├── components/                # Componentes React reutilizables
│   │   ├── esap/                  # Módulos específicos de ESAP
│   │   │   ├── admin/             # Gestión de usuarios y permisos
│   │   │   ├── alertas/           # Sistema de alertas y notificaciones
│   │   │   ├── audit/             # Utilidades de auditoría
│   │   │   ├── auth/              # Componentes de autenticación
│   │   │   ├── control-interno/   # Módulo completo de control interno
│   │   │   ├── disciplinario/     # Gestión de procesos disciplinarios
│   │   │   ├── firma-electronica/ # Sistema de firma digital
│   │   │   ├── gestion-legal/     # Gestión de procesos legales
│   │   │   ├── registro-academico/# Validación de certificados
│   │   │   └── shared/            # Componentes compartidos
│   │   └── portal/                # Componentes del portal público
│   ├── hooks/                     # Custom hooks de React
│   ├── contexts/                  # Contextos de React para estado global
│   ├── context/                   # (Duplicado - revisar)
│   ├── services/                  # Servicios para llamadas a API
│   ├── types/                     # Definiciones TypeScript
│   ├── enums/                     # Enumeraciones del dominio
│   ├── utils/                     # Funciones utilitarias
│   ├── lib/                       # Librerías y configuraciones
│   ├── pages/                     # Páginas principales de la aplicación
│   ├── config/                    # Configuraciones de la aplicación
│   ├── data/                      # Datos estáticos y mocks
│   ├── styles/                    # Estilos CSS adicionales
│   ├── assets/                    # Recursos estáticos (imágenes, íconos)
│   ├── guidelines/                # Guías y documentación interna
│   ├── App.tsx                    # Componente raíz de la aplicación
│   ├── main.tsx                   # Punto de entrada de Vite
│   ├── index.css                  # Estilos globales
│   └── Attributions.md            # Atribuciones de librerías
├── backend/                       # Microservicios del backend
│   ├── api-gateway/               # API Gateway principal
│   ├── auth-service/              # Servicio de autenticación
│   ├── academic-registration-service/ # Servicio de registro académico
│   ├── academic-work-plan-service/    # Servicio de planes de trabajo
│   ├── certification-service/     # Servicio de certificación
│   ├── internal-disciplinary-control-service/ # Control disciplinario
│   ├── internal-institutional-control-service/ # Control institucional
│   ├── legal-management-service/  # Gestión legal
│   ├── notifications-service/     # Servicio de notificaciones
│   ├── travel-expenses-service/   # Gastos de viaje
│   ├── audit-service/             # Servicio de auditoría
│   ├── interoperability-service/  # Interoperabilidad
│   └── package-lock.json          # Lockfile de dependencias
├── db/                           # Recursos de base de datos
│   ├── init/                     # Scripts de inicialización
│   ├── migrations/               # Migraciones de base de datos
│   ├── migrations_old/           # Migraciones anteriores
│   ├── backups/                  # Backups de base de datos
│   ├── backup_esap_db.sql        # Backup completo de BD
│   ├── backup_schemas.sh         # Script de backup de esquemas
│   ├── ddl_schemas.sh            # DDL de esquemas
│   ├── ejecutar_migraciones.bat  # Ejecutor de migraciones Windows
│   ├── ejecutar_todos_scripts.bat # Ejecutor completo Windows
│   └── update_passwords.sql      # Actualización de contraseñas
├── tests/                        # Tests del proyecto
│   └── integration/              # Tests de integración
├── docker-compose.yml            # Configuración base de Docker
├── docker-compose.dev.yml        # Entorno de desarrollo
├── docker-compose.pre.yml        # Entorno de pre-producción
├── docker-compose.qa.yml         # Entorno de QA
├── docker-compose.services.yml   # Servicios adicionales
├── Dockerfile.frontend           # Dockerfile base del frontend
├── Dockerfile.frontend.dev       # Dockerfile desarrollo frontend
├── Dockerfile.frontend.pre       # Dockerfile pre-producción frontend
├── Dockerfile.frontend.qa        # Dockerfile QA frontend
├── nginx.conf                    # Configuración de Nginx
├── package.json                  # Dependencias del frontend
├── package-lock.json             # Lockfile del frontend
├── tsconfig.json                 # Configuración TypeScript
├── tsconfig.node.json            # Configuración TypeScript para Node
├── vite.config.ts                # Configuración de Vite
├── index.html                    # HTML principal
├── .env                          # Variables de entorno base
├── .env.development              # Variables de desarrollo
├── .env.example                  # Ejemplo de variables de entorno
├── .gitignore                    # Archivos ignorados por Git
├── README.md                     # Documentación principal
├── DOCUMENTACION_TECNICA.md      # Esta documentación
├── DEPLOY_DEV.md                 # Guía de despliegue desarrollo
├── cambiosfront.md               # Registro de cambios frontend
├── HUTODAS.txt                   # Archivo de texto (revisar propósito)
├── deploy.dev.sh                 # Script de despliegue desarrollo
├── deploy.pre.sh                 # Script de despliegue pre-producción
├── deploy.qa.sh                  # Script de despliegue QA
├── migrate.local.sh              # Migración local
├── migrate.local.windows.bat     # Migración local Windows
├── create_test_data.js           # Creación de datos de prueba
├── seed_missing.js               # Seed de datos faltantes
├── fix_personas_columns.sql      # Fix de columnas personas
├── test_transitions.js           # Tests de transiciones
└── dashboard_debug.json          # Debug del dashboard
```

### 5.2 Convenciones de Nomenclatura

#### Archivos y Directorios
- **Componentes React**: PascalCase (Ej: `UserProfile.tsx`, `GraduatesManagementModule.tsx`)
- **Hooks personalizados**: camelCase con prefijo `use` (Ej: `useAuth.ts`, `usePermissions.ts`)
- **Servicios Frontend**: camelCase con sufijo `Service` (Ej: `auditService.ts`, `certificadosService.ts`, `userService.ts`)
- **Microservicios Backend**: kebab-case (Ej: `auth-service`, `academic-registration-service`, `api-gateway`)
- **Tipos e Interfaces**: PascalCase (Ej: `UserType.ts`, `AcademicWorkPlan.ts`)
- **Enumeraciones**: PascalCase (Ej: `UserRole.ts`, `PTAStatus.ts`)
- **Utilidades**: camelCase (Ej: `dateUtils.ts`, `validationUtils.ts`)
- **Archivos de configuración**: kebab-case (Ej: `vite.config.ts`, `nginx.conf`, `docker-compose.dev.yml`)
- **Scripts**: kebab-case con extensión `.sh` o `.js` (Ej: `deploy.dev.sh`, `create_test_data.js`)

#### Código
- **Variables y funciones**: camelCase
- **Constantes**: UPPER_SNAKE_CASE
- **Clases e interfaces**: PascalCase
- **Enums**: PascalCase
- **Props de componentes**: camelCase

### 5.3 Estructura de un Módulo (Micro-Frontend)

Los módulos del frontend siguen una estructura organizada, aunque no todos los módulos la implementan completamente. La estructura ideal y la implementación real varían:

#### Estructura Ideal (Propuesta)
```
src/components/esap/[modulo]/
├── [Modulo]Module.tsx            # Componente principal del módulo
├── components/                   # Subcomponentes específicos del módulo
│   ├── [Componente].tsx         # Componentes individuales
│   └── index.ts                 # Exportaciones del módulo
├── hooks/                        # Hooks personalizados del módulo
│   ├── use[Modulo].ts           # Hook principal
│   └── use[Subfuncionalidad].ts # Hooks específicos
├── services/                     # Servicios del módulo
│   ├── [modulo]Service.ts       # Servicio principal
│   ├── [modulo]Api.ts           # Cliente API específico
│   ├── types.ts                 # Tipos de servicios
│   └── index.ts                 # Exportaciones de servicios
├── types/                        # Tipos TypeScript del módulo
│   ├── [Modulo]Types.ts         # Tipos principales
│   └── [Modulo]Enums.ts         # Enumeraciones
├── utils/                        # Utilidades del módulo
│   ├── [modulo]Utils.ts         # Funciones utilitarias
│   ├── constants.ts             # Constantes del módulo
│   └── tooltips-config.ts       # Configuraciones específicas
├── index.ts                      # Punto de entrada del módulo
└── README.md                     # Documentación del módulo
```

#### Estructura Real Implementada (Ejemplo: Módulo Control Interno)
```
src/components/esap/control-interno/
├── index.ts                      # Exportaciones principales
├── ControlInternoContext.tsx     # Contexto React del módulo
├── ControlInternoFull.tsx        # Componente principal completo
├── HeaderModuloCIG.tsx           # Header específico del módulo
├── ConfiguracionesModulePremium.tsx # Configuraciones avanzadas
├── [50+ componentes .tsx]        # Componentes específicos del módulo
├── hooks/                        # Directorio de hooks
│   ├── useAuditLog.ts            # Hook para logs de auditoría
│   ├── useControlInternoPermissions.ts # Hook de permisos
│   ├── useCrearNotificacion.ts   # Hook para notificaciones
│   ├── useNotificacionesControlInterno.ts # Hook de notificaciones
│   └── EJEMPLOS_USO_NOTIFICACIONES.md # Documentación de hooks
├── services/                     # Directorio de servicios
│   ├── index.ts                  # Exportaciones de servicios
│   ├── api.ts                    # Cliente API principal
│   ├── auditLogService.ts        # Servicio de logs de auditoría
│   ├── listasChequeoService.ts   # Servicio de listas de chequeo
│   ├── tablerosKanbanService.ts  # Servicio de tableros Kanban
│   ├── tiposAuditoriaService.ts  # Servicio de tipos de auditoría
│   ├── authDebug.ts              # Utilidades de debug de auth
│   ├── hooks.ts                  # Configuraciones de hooks
│   └── types.ts                  # Tipos de servicios
├── utils/                        # Directorio de utilidades
│   ├── tooltips-config.ts        # Configuración de tooltips
│   ├── DatosEjemploAuditorias.ts # Datos de ejemplo
│   └── index.ts                  # Exportaciones de utilidades
└── [Archivos de documentación .md]
```

#### Estructura Simplificada (Ejemplo: Módulo Auth)
```
src/components/esap/auth/
├── EjemploPasswordSegura.tsx     # Componente de ejemplo
├── PasswordStrengthInput.tsx     # Componente de input de contraseña
└── PoliticaPasswordESAP.tsx      # Componente de política de contraseña
```

**Nota**: No todos los módulos siguen la estructura ideal. Algunos módulos tienen todos los archivos en el directorio raíz, mientras que módulos más complejos como `control-interno` implementan una organización jerárquica completa con subdirectorios para hooks, services y utils.

### 5.4 Estructura de Microservicios

Cada microservicio del backend sigue el patrón estándar de NestJS:

```
backend/[service-name]/
├── src/
│   ├── app.controller.ts         # Controller principal
│   ├── app.service.ts            # Servicio principal
│   ├── app.module.ts             # Módulo principal
│   ├── main.ts                   # Punto de entrada
│   ├── [feature]/                # Módulos de características
│   │   ├── [feature].controller.ts
│   │   ├── [feature].service.ts
│   │   ├── [feature].module.ts
│   │   ├── dto/                  # Data Transfer Objects
│   │   ├── entities/             # Entidades de base de datos
│   │   └── templates/            # Plantillas (HTML, documentos)
│   ├── common/                   # Código compartido
│   ├── config/                   # Configuraciones
│   └── database.config.ts        # Configuración de BD
├── test/                         # Tests del servicio
├── Dockerfile                    # Contenedor del servicio
├── package.json                  # Dependencias
├── tsconfig.json                 # Configuración TypeScript
├── .env.example                  # Variables de entorno ejemplo
└── README.md                     # Documentación del servicio
```

### 5.5 Configuración de Despliegue

#### Docker Compose
- **docker-compose.dev.yml**: Entorno de desarrollo local
- **docker-compose.pre.yml**: Pre-producción
- **docker-compose.qa.yml**: Quality Assurance
- **docker-compose.services.yml**: Servicios adicionales

#### Variables de Entorno
- **.env**: Variables base
- **.env.development**: Desarrollo específico
- **.env.example**: Template para nuevos entornos

#### Scripts de Despliegue
- **deploy.dev.sh**: Despliegue a desarrollo
- **deploy.pre.sh**: Despliegue a pre-producción
- **deploy.qa.sh**: Despliegue a QA
- **migrate.local.sh**: Migraciones locales

## 6. ARQUITECTURA DE LA APLICACIÓN

### 6.1 Arquitectura de Alto Nivel

La arquitectura de la Plataforma ESAP sigue un patrón de capas distribuido, organizado en los siguientes niveles:

#### 6.1.1 Arquitectura por Capas

**Código PlantUML:**
```plantuml
@startuml Arquitectura por Capas - Plataforma ESAP
skinparam backgroundColor #FEFEFE
skinparam componentStyle uml2

package "1. Capa de Presentación\n(Presentation Layer)" as presentation {
    component "Frontend React SPA" as frontend
    component "Portal Público" as portal
    component "Micro-frontends" as microfrontends
}

package "2. Capa de Aplicación\n(Application Layer)" as application {
    component "API Gateway" as gateway
    component "Authentication Middleware" as auth_middleware
    component "Rate Limiting" as rate_limit
    component "Request Routing" as routing
}

package "3. Capa de Servicios\n(Service Layer)" as services {
    component "Auth Service" as auth_svc
    component "Academic Registration Service" as academic_svc
    component "Certification Service" as cert_svc
    component "Internal Control Service" as audit_svc
    component "Disciplinary Control Service" as disciplinary_svc
    component "Notification Service" as notification_svc
}

package "4. Capa de Datos\n(Data Layer)" as data {
    component "PostgreSQL\n(Multi-tenant)" as postgres
    component "Redis Cache" as redis
    component "File Storage" as storage
}

package "5. Capa de Infraestructura\n(Infrastructure Layer)" as infrastructure {
    component "Docker Containers" as docker
    component "Kubernetes Orchestration" as k8s
    component "Load Balancers" as lb
    component "Monitoring & Logging" as monitoring
}

package "Capa de Seguridad\n(Security Layer - Transversal)" as security {
    component "JWT Authentication" as jwt
    component "RBAC Authorization" as rbac
    component "TLS/SSL Encryption" as tls
    component "Input Validation" as validation
}

presentation --> application
application --> services
services --> data
data --> infrastructure
security --> presentation
security --> application
security --> services
security --> data
@enduml
```

**Explicación Detallada del Diagrama de Arquitectura por Capas:**

Este diagrama ilustra la arquitectura de alto nivel de la Plataforma Comunidad ESAP organizada en seis capas claramente definidas, siguiendo principios de separación de responsabilidades y escalabilidad. Cada capa tiene responsabilidades específicas y se comunica con las capas adyacentes de manera controlada, permitiendo el desarrollo independiente de componentes mientras mantiene la coherencia del sistema completo.

La **Capa de Presentación** (Presentation Layer) representa la interfaz de usuario final, compuesta por una aplicación React SPA (Single Page Application) que incluye micro-frontends modulares para diferentes funcionalidades ESAP y un portal público para validación de certificados. Esta capa maneja toda la interacción del usuario, incluyendo formularios, dashboards dinámicos y navegación responsiva, asegurando una experiencia de usuario consistente y accesible.

La **Capa de Aplicación** (Application Layer) actúa como punto de entrada unificado a través del API Gateway, que implementa middlewares críticos como autenticación JWT, rate limiting para protección contra ataques DoS, y enrutamiento inteligente hacia los microservicios apropiados. Esta capa garantiza que todas las requests sean validadas y autorizadas antes de llegar a los servicios de negocio.

La **Capa de Servicios** (Service Layer) contiene los 11 microservicios especializados, cada uno enfocado en un dominio funcional específico como autenticación, registro académico, certificación, auditorías institucionales, procesos disciplinarios y notificaciones. Esta arquitectura permite el escalado independiente de cada servicio según sus necesidades de carga y recursos.

La **Capa de Datos** (Data Layer) maneja toda la persistencia de información utilizando PostgreSQL en una configuración multi-tenant con esquemas separados por servicio, Redis para cache distribuido de sesiones y datos temporales, y MinIO para almacenamiento de archivos como PDFs y documentos. Esta capa asegura la integridad y disponibilidad de los datos críticos del sistema.

La **Capa de Infraestructura** (Infrastructure Layer) proporciona la base tecnológica con contenedores Docker para aislamiento de servicios, orquestación Kubernetes para gestión automática de escalado y failover, balanceadores de carga para distribución de tráfico, y sistemas de monitoreo y logging para observabilidad completa.

Finalmente, la **Capa de Seguridad** (Security Layer) se implementa de manera transversal a todas las demás capas, incorporando autenticación JWT con tokens de acceso y refresh, control de acceso basado en roles (RBAC) granular, encriptación TLS 1.3 para todas las comunicaciones, y validación exhaustiva de entrada para prevenir ataques de inyección y XSS. Esta capa asegura que la seguridad sea un aspecto fundamental en cada componente del sistema.

#### 6.1.2 Diagrama General de Arquitectura

**Código PlantUML:**
```plantuml
@startuml Diagrama de Contexto - Plataforma ESAP
!include https://raw.githubusercontent.com/plantuml-stdlib/C4-PlantUML/master/C4_Context.puml

Person(user, "Usuario", "Docente, Administrativo, Estudiante")
System(esap, "Plataforma ESAP", "Sistema de gestión académica/administrativa")

System_Ext(auth, "Auth Service", "Autenticación y autorización")
System_Ext(academic, "Academic Services", "Servicios académicos")
System_Ext(certification, "Certification Service", "Emisión de certificados")
System_Ext(audit, "Audit Service", "Control interno")
System_Ext(notification, "Notification Service", "Sistema de notificaciones")

Rel(user, esap, "Usa")
Rel(esap, auth, "Autentica")
Rel(esap, academic, "Gestiona procesos académicos")
Rel(esap, certification, "Emite certificados")
Rel(esap, audit, "Realiza auditorías")
Rel(esap, notification, "Envía notificaciones")
@enduml
```

**Explicación del Diagrama:**
Este diagrama C4 de contexto muestra las relaciones de alto nivel de la plataforma ESAP. El usuario interactúa con el sistema principal que se comunica con varios microservicios especializados. Cada microservicio maneja un dominio específico: autenticación, procesos académicos, certificación, auditorías y notificaciones. Este diseño permite escalabilidad y mantenibilidad al separar responsabilidades por dominio funcional.

#### 6.1.2 Arquitectura por Módulos - Auth Service

**Código PlantUML:**
```plantuml
@startuml Arquitectura Auth Service
package "Auth Service" as auth {
    [AuthController] --> [AuthService]
    [AuthService] --> [JwtStrategy]
    [AuthService] --> [UsersService]
    [AuthService] --> [EmailService]

    [AuthController] --> [DTOs]
    [AuthService] --> [Entities]
    [JwtStrategy] --> [JWT Module]
    [EmailService] --> [SMTP Config]
}

package "Base de Datos" as db {
    [users] --> [roles]
    [users] --> [permissions]
    [sessions] --> [refresh_tokens]
}

package "Cache" as cache {
    [Redis] --> [session_store]
    [Redis] --> [token_blacklist]
}

[AuthService] --> db
[AuthService] --> cache
@enduml
```

**Explicación Detallada del Diagrama:**

Este diagrama muestra la arquitectura interna completa del **Auth Service**, el microservicio responsable de la autenticación y autorización en la plataforma ESAP.

**Componentes del Servicio:**
- **AuthController**: Punto de entrada REST que expone endpoints como `/auth/login`, `/auth/register`, `/auth/refresh`
- **AuthService**: Lógica de negocio principal que maneja validación de credenciales, generación de tokens y gestión de sesiones
- **JwtStrategy**: Implementa la estrategia Passport.js para validación de tokens JWT en requests entrantes
- **UsersService**: Gestiona operaciones CRUD de usuarios, roles y permisos
- **EmailService**: Maneja envío de emails para recuperación de contraseña y notificaciones de seguridad

**Estructura de Datos:**
- **DTOs (Data Transfer Objects)**: Define contratos de entrada/salida para las APIs (LoginDto, RegisterDto, etc.)
- **Entities**: Modelos de base de datos mapeados con TypeORM (User, Role, Permission, Session)
- **JWT Module**: Configuración de tokens JWT con tiempos de expiración y algoritmos de firma

**Persistencia y Cache:**
- **Base de Datos**: Almacena usuarios, roles, permisos y sesiones en PostgreSQL con esquema dedicado
- **Redis Cache**: Almacena sesiones activas, refresh tokens y lista negra de tokens revocados para validación rápida

**Flujo Típico**: Request → AuthController → AuthService → Validación → JWT Generation → Redis Storage → Response

#### 6.1.3 Arquitectura por Módulos - Academic Registration Service

**Código PlantUML:**
```plantuml
@startuml Arquitectura Academic Registration Service
package "Academic Registration Service" as academic {
    [GraduatesController] --> [GraduatesService]
    [CertificatesController] --> [CertificatesService]
    [PTAController] --> [PTAService]

    [GraduatesService] --> [PDFGeneratorService]
    [CertificatesService] --> [PDFGeneratorService]
    [PTAService] --> [ValidationService]

    [PDFGeneratorService] --> [TemplateEngine]
    [ValidationService] --> [AcademicRules]
}

package "Templates" as templates {
    [HTML Templates] --> [Certificate Templates]
    [PDF Templates] --> [Report Templates]
}

package "Database" as db {
    [graduates] --> [certificates]
    [academic_records] --> [pta_records]
}

[academic] --> templates
[academic] --> db
@enduml
```

**Explicación Detallada del Diagrama:**

Este diagrama ilustra la arquitectura completa del **Academic Registration Service**, el servicio central para la gestión académica de ESAP, responsable de graduados, certificados y registros académicos.

**Controladores Principales:**
- **GraduatesController**: Expone endpoints REST para gestión de graduados (`GET /graduates`, `POST /graduates/{id}/validate`)
- **CertificatesController**: Maneja emisión y descarga de certificados (`POST /certificates/generate`, `GET /certificates/{id}/download`)
- **PTAController**: Coordina validaciones de PTA con el Academic Work Plan Service (`GET /pta/{id}/validate`)

**Servicios de Lógica de Negocio:**
- **GraduatesService**: Implementa reglas de negocio para validación de graduación, cálculo de promedios y estados académicos
- **CertificatesService**: Orquesta el proceso completo de emisión de certificados, aplicando validaciones específicas
- **PTAService**: Gestiona validaciones académicas de PTA y comunicación con otros servicios académicos
- **PDFGeneratorService**: Utiliza Puppeteer para renderizado HTML a PDF con calidad profesional y branding institucional
- **ValidationService**: Aplica reglas académicas de negocio (créditos mínimos, requisitos de graduación, etc.)

**Motor de Plantillas y Recursos:**
- **TemplateEngine**: Procesa plantillas HTML con Handlebars/Mustache, inyectando datos dinámicos de estudiantes
- **HTML Templates**: Plantillas base con estilos CSS, logos institucionales y layouts certificados
- **PDF Templates**: Configuraciones específicas para diferentes tipos de certificados académicos

**Persistencia de Datos:**
- **graduates**: Información completa de estudiantes graduados (nombres, fechas, programas, promedios)
- **certificates**: Registro de certificados emitidos con códigos únicos, metadatos y hashes de integridad
- **academic_records**: Historial académico completo, transcripciones y registros curriculares
- **pta_records**: Referencias y validaciones de PTA procesadas por este servicio

**Flujo de Generación de Certificado:**
1. **Solicitud** → GraduatesController valida elegibilidad
2. **Validación** → CertificatesService confirma requisitos cumplidos
3. **Template Rendering** → TemplateEngine genera HTML con datos del estudiante
4. **PDF Generation** → PDFGeneratorService convierte HTML a PDF
5. **Almacenamiento** → File Storage guarda el PDF generado
6. **Descarga** → Usuario recibe enlace seguro para descarga

#### 6.1.4 Arquitectura por Módulos - Certification Service

**Código PlantUML:**
```plantuml
@startuml Arquitectura Certification Service
package "Certification Service" as cert {
    [CertificatesController] --> [CertificatesService]
    [TemplateController] --> [TemplateService]
    [ValidationController] --> [ValidationService]

    [CertificatesService] --> [PDFGeneratorService]
    [CertificatesService] --> [QRCodeService]
    [TemplateService] --> [TemplateConfigService]
    [ValidationService] --> [BlockchainService]
}

package "Templates" as templates {
    [Certificate Templates] --> [Labor Certificates]
    [Certificate Templates] --> [Academic Certificates]
    [Template Config] --> [Signer Config]
}

package "External Services" as external {
    [Blockchain] --> [Certificate Validation]
    [OnlyOffice] --> [Document Editing]
}

[cert] --> templates
[cert] --> external
@enduml
```

**Explicación Detallada del Diagrama:**

Este diagrama muestra la arquitectura completa del **Certification Service**, especializado en la emisión, validación y gestión de certificados académicos y laborales con características avanzadas de seguridad.

**Controladores Principales:**
- **CertificatesController**: Gestiona operaciones CRUD de certificados (`POST /certificates`, `GET /certificates/{id}`)
- **TemplateController**: Maneja configuración y personalización de plantillas (`PUT /templates/{id}`)
- **ValidationController**: Procesa validaciones públicas de certificados (`GET /validate/{code}`)

**Servicios de Lógica de Negocio:**
- **CertificatesService**: Orquesta todo el proceso de emisión de certificados, desde solicitud hasta entrega
- **PDFGeneratorService**: Genera PDFs de alta calidad con firmas digitales y códigos QR integrados
- **QRCodeService**: Crea códigos QR únicos para validación pública con URLs seguras
- **TemplateConfigService**: Gestiona configuración dinámica de plantillas por tipo de certificado
- **BlockchainService**: Integra con blockchain para validación inmutable y timestamps

**Plantillas y Configuración:**
- **Certificate Templates**: Plantillas HTML/CSS para certificados laborales y académicos
- **Template Config**: Configuraciones JSON para personalización (firmantes, logos, textos)
- **Signer Config**: Configuración de firmantes autorizados y sus certificados digitales

**Integraciones Externas:**
- **Blockchain**: Validación inmutable de certificados usando Ethereum/Solana
- **OnlyOffice**: Edición colaborativa de plantillas de certificados
- **File Storage**: Almacenamiento seguro de PDFs generados y plantillas

**Flujo de Emisión de Certificado:**
1. **Solicitud** → CertificatesController recibe petición con datos del estudiante
2. **Validación** → ValidationService confirma elegibilidad y permisos
3. **Generación QR** → QRCodeService crea código único con URL de validación
4. **Template Processing** → TemplateEngine renderiza HTML con datos dinámicos
5. **PDF Generation** → PDFGeneratorService convierte a PDF con firma digital
6. **Blockchain Timestamp** → BlockchainService registra hash para inmutabilidad
7. **Almacenamiento** → File Storage guarda PDF y metadatos
8. **Notificación** → Email con enlace seguro de descarga

**Características de Seguridad:**
- **Códigos QR únicos** para validación pública sin exposición de datos sensibles
- **Firmas digitales** integradas en PDFs usando certificados X.509
- **Blockchain anchoring** para prueba de existencia e integridad
- **Validación pública** a través de portal web sin necesidad de login

#### 6.1.5 Arquitectura por Módulos - Internal Control Service

**Código PlantUML:**
```plantuml
@startuml Arquitectura Internal Control Service
package "Internal Control Service" as control {
    [AuditoriasController] --> [AuditoriasService]
    [HallazgosController] --> [HallazgosService]
    [PlanesMejoramientoController] --> [PlanesMejoramientoService]

    [AuditoriasService] --> [EquipoAuditorService]
    [HallazgosService] --> [EvidenciaService]
    [PlanesMejoramientoService] --> [SeguimientoService]

    [EquipoAuditorService] --> [NotificationService]
    [SeguimientoService] --> [ReportService]
}

package "Workflow Engine" as workflow {
    [State Machine] --> [Audit States]
    [Transition Rules] --> [Approval Rules]
}

package "Database" as db {
    [auditorias] --> [hallazgos]
    [planes_mejoramiento] --> [seguimiento]
    [equipos_auditor] --> [auditores]
}

[control] --> workflow
[control] --> db
@enduml
```

**Explicación Detallada del Diagrama:**

Este diagrama representa la arquitectura compleja del **Internal Control Service**, el servicio más sofisticado de ESAP que maneja todo el proceso de auditorías institucionales con workflows avanzados.

**Controladores Principales:**
- **AuditoriasController**: Gestiona ciclo de vida completo de auditorías (`POST /auditorias`, `PUT /auditorias/{id}/estado`)
- **HallazgosController**: Maneja hallazgos encontrados durante auditorías (`POST /auditorias/{id}/hallazgos`)
- **PlanesMejoramientoController**: Gestiona planes de acción correctiva (`POST /planes-mejoramiento`)

**Servicios de Lógica de Negocio:**
- **AuditoriasService**: Implementa lógica compleja de gestión de auditorías con múltiples estados
- **HallazgosService**: Gestiona hallazgos con categorización, severidad y evidencias
- **PlanesMejoramientoService**: Coordina planes de mejoramiento con responsables y seguimientos
- **EquipoAuditorService**: Gestiona asignación y coordinación de equipos auditor
- **SeguimientoService**: Monitorea cumplimiento de planes y genera reportes de progreso
- **NotificationService**: Envía notificaciones automáticas en cada cambio de estado

**Motor de Workflows:**
- **State Machine**: Implementa máquina de estados compleja para auditorías (PLANIFICADA → EN_PROCESO → HALLAZGOS → PLANES → SEGUIMIENTO → CERRADA)
- **Transition Rules**: Reglas de negocio que controlan transiciones válidas entre estados
- **Approval Rules**: Lógica de aprobaciones multinivel para diferentes tipos de acciones

**Persistencia de Datos:**
- **auditorias**: Información completa de cada auditoría (equipo, alcance, cronograma, estado)
- **hallazgos**: Hallazgos categorizados con severidad, evidencias y recomendaciones
- **planes_mejoramiento**: Acciones correctivas con responsables, fechas límite y seguimientos
- **equipos_auditor**: Composición de equipos con roles específicos (líder, auditores, observadores)

**Flujo Completo de Auditoría:**
1. **Planificación** → Creación de auditoría con equipo y alcance definido
2. **Ejecución** → Equipo auditor realiza trabajo de campo y registra hallazgos
3. **Análisis** → Evaluación de hallazgos y categorización por severidad
4. **Planes de Mejoramiento** → Creación de acciones correctivas con responsables
5. **Seguimiento** → Monitoreo del cumplimiento y reportes de progreso
6. **Cierre** → Evaluación final y lecciones aprendidas

**Características Avanzadas:**
- **Workflows paralelos** para múltiples hallazgos en una misma auditoría
- **Notificaciones automáticas** en cada cambio de estado crítico
- **Reportes dinámicos** con dashboards de cumplimiento
- **Integración con calendario** para seguimientos programados
- **Historial completo** de cambios con trazabilidad

#### 6.1.6 Arquitectura por Módulos - Disciplinary Control Service

**Código PlantUML:**
```plantuml
@startuml Arquitectura Disciplinary Control Service
package "Disciplinary Control Service" as disciplinary {
    [ProcessController] --> [ProcessService]
    [EvidenceController] --> [EvidenceService]
    [LegalAutoController] --> [LegalAutoService]

    [ProcessService] --> [StateMachineService]
    [EvidenceService] --> [FileStorageService]
    [LegalAutoService] --> [TemplateService]

    [StateMachineService] --> [ProcessRules]
    [FileStorageService] --> [DocumentValidation]
}

package "State Machine" as states {
    [Radicada] --> [EnValoracion]
    [EnValoracion] --> [Asignada]
    [Asignada] --> [Evaluacion]
    [Evaluacion] --> [IndagacionPrevia]
    [IndagacionPrevia] --> [Investigacion]
    [Investigacion] --> [Juzgamiento]
    [Juzgamiento] --> [Finalizado]
}

package "Templates" as templates {
    [Legal Autos] --> [Auto Templates]
    [Notifications] --> [Legal Notifications]
}

[disciplinary] --> states
[disciplinary] --> templates
@enduml
```

**Explicación Detallada del Diagrama:**

Este diagrama ilustra la arquitectura del **Disciplinary Control Service**, que implementa procesos disciplinarios formales con máquina de estados compleja y gestión documental avanzada.

**Controladores Principales:**
- **ProcessController**: Gestiona procesos disciplinarios completos (`POST /processes`, `PUT /processes/{id}/advance`)
- **EvidenceController**: Maneja carga y validación de evidencias (`POST /processes/{id}/evidence`)
- **LegalAutoController**: Genera autos legales automáticamente (`POST /processes/{id}/autos`)

**Servicios de Lógica de Negocio:**
- **ProcessService**: Implementa lógica de negocio para transición entre estados del proceso
- **EvidenceService**: Gestiona evidencias con validación de tipos de archivo y metadatos
- **LegalAutoService**: Genera documentos legales automatizados basados en plantillas
- **StateMachineService**: Controla transiciones válidas entre estados del proceso disciplinario
- **FileStorageService**: Gestiona almacenamiento seguro de documentos y evidencias
- **DocumentValidationService**: Valida integridad y autenticidad de documentos

**Máquina de Estados del Proceso:**
- **Radicada**: Proceso iniciado, esperando asignación
- **EnValoracion**: Abogado asignado, evaluando viabilidad
- **Asignada**: Abogado confirmado, proceso formal iniciado
- **Evaluacion**: Fase inicial de investigación y evaluación
- **IndagacionPrevia**: Investigación preliminar formal
- **Investigacion**: Investigación completa con pruebas
- **Juzgamiento**: Fase de juicio y deliberación
- **Finalizado**: Resolución final del proceso

**Plantillas y Documentos:**
- **Legal Autos**: Plantillas para diferentes tipos de autos judiciales
- **Legal Notifications**: Plantillas para notificaciones a involucrados
- **Process Templates**: Formatos estandarizados para cada etapa del proceso

**Flujo del Proceso Disciplinario:**
1. **Radicación** → Noticia disciplinaria registrada en el sistema
2. **Valoración** → Abogado evalúa viabilidad y asigna abogado tratante
3. **Evaluación** → Análisis inicial y determinación de ruta procesal
4. **Indagación** → Investigación preliminar con recopilación de pruebas
5. **Investigación** → Investigación formal completa con audiencias
6. **Juzgamiento** → Fase de juicio con deliberación y fallo
7. **Finalización** → Resolución final y archivo del proceso

**Características de Seguridad y Legal:**
- **Cadena de custodia** completa para todas las evidencias
- **Versionado de documentos** con historial de cambios
- **Firmas digitales** en todos los autos generados
- **Auditoría completa** de todas las acciones realizadas
- **Encriptación** de datos sensibles durante almacenamiento
- **Validación de plazos** procesales automática

#### 6.1.7 Arquitectura por Módulos - Notification Service

**Código PlantUML:**
```plantuml
@startuml Arquitectura Notification Service
package "Notification Service" as notification {
    [EmailController] --> [EmailService]
    [SMSController] --> [SMSService]
    [PushController] --> [PushService]

    [EmailService] --> [TemplateEngine]
    [EmailService] --> [SMTPClient]
    [SMSService] --> [SMSProvider]
    [PushService] --> [PushProvider]

    [TemplateEngine] --> [EmailTemplates]
    [SMTPClient] --> [SMTPConfig]
}

package "Queue System" as queue {
    [Message Queue] --> [Email Queue]
    [Message Queue] --> [SMS Queue]
    [Message Queue] --> [Push Queue]
}

package "Templates" as templates {
    [Email Templates] --> [HTML Templates]
    [SMS Templates] --> [Text Templates]
    [Push Templates] --> [JSON Templates]
}

[notification] --> queue
[notification] --> templates
@enduml
```

**Explicación Detallada del Diagrama:**

Este diagrama muestra la arquitectura del **Notification Service**, el servicio centralizado de comunicaciones de ESAP que maneja múltiples canales de notificación con procesamiento asíncrono.

**Controladores Principales:**
- **EmailController**: Gestiona envío de emails (`POST /emails/send`, `GET /emails/{id}/status`)
- **SMSController**: Maneja mensajes de texto (`POST /sms/send`)
- **PushController**: Gestiona notificaciones push (`POST /push/send`)

**Servicios de Lógica de Negocio:**
- **EmailService**: Implementa lógica de envío de emails con plantillas dinámicas
- **SMSService**: Gestiona envío de SMS con proveedores externos (Twilio, etc.)
- **PushService**: Maneja notificaciones push para aplicaciones móviles/web
- **TemplateEngine**: Procesa plantillas con variables dinámicas y lógica condicional
- **SMTPClient**: Cliente configurado para envío masivo con rate limiting
- **SMTPConfig**: Configuración de servidores SMTP con credenciales seguras

**Sistema de Colas:**
- **Message Queue**: RabbitMQ/Redis para desacoplar envío y mejorar resiliencia
- **Email Queue**: Cola dedicada para procesamiento de emails por lotes
- **SMS Queue**: Cola prioritaria para SMS críticos con delivery garantizado
- **Push Queue**: Cola para notificaciones push con segmentación

**Motor de Plantillas:**
- **Email Templates**: Plantillas HTML con estilos responsivos y branding ESAP
- **SMS Templates**: Plantillas de texto optimizadas para 160 caracteres
- **Push Templates**: JSON estructurado para notificaciones push nativas

**Flujo de Notificación:**
1. **Recepción** → Controlador recibe petición con datos y tipo de notificación
2. **Validación** → Verificación de datos y permisos del remitente
3. **Template Processing** → TemplateEngine renderiza plantilla con datos dinámicos
4. **Queue** → Mensaje se encola para procesamiento asíncrono
5. **Envío** → Worker procesa cola y envía vía proveedor correspondiente
6. **Confirmación** → Callback actualiza estado y registra resultado
7. **Retry Logic** → Reintentos automáticos para fallos temporales

**Características Avanzadas:**
- **Multi-canal**: Email, SMS y push notifications desde un solo servicio
- **Plantillas dinámicas** con variables condicionales y bucles
- **Rate limiting** por usuario y tipo de notificación
- **Segmentación** avanzada por roles, sedes y preferencias
- **Analytics** de delivery, aperturas y engagement
- **Fallback** automático (email → SMS) para notificaciones críticas
- **Internacionalización** con plantillas multi-idioma

#### 6.1.8 Arquitectura por Módulos - API Gateway

**Código PlantUML:**
```plantuml
@startuml Arquitectura API Gateway
package "API Gateway" as gateway {
    [GatewayController] --> [GatewayService]
    [AuthMiddleware] --> [GatewayService]
    [RateLimitMiddleware] --> [GatewayService]

    [GatewayService] --> [LoadBalancer]
    [GatewayService] --> [CircuitBreaker]
    [GatewayService] --> [RequestRouter]

    [LoadBalancer] --> [ServiceDiscovery]
    [CircuitBreaker] --> [HealthCheck]
}

package "Security" as security {
    [JWTValidator] --> [TokenService]
    [CORSHandler] --> [SecurityHeaders]
    [RequestValidator] --> [InputSanitizer]
}

package "Monitoring" as monitoring {
    [MetricsCollector] --> [Prometheus]
    [LogAggregator] --> [ELK Stack]
    [TraceCollector] --> [Jaeger]
}

[gateway] --> security
[gateway] --> monitoring
@enduml
```

**Explicación Detallada del Diagrama:**

Este diagrama representa la arquitectura del **API Gateway**, el componente crítico que actúa como punto de entrada único para toda la plataforma ESAP, implementando funcionalidades transversales de seguridad, rendimiento y observabilidad.

**Componentes del Gateway:**
- **GatewayController**: Punto de entrada principal que recibe todas las requests HTTP
- **GatewayService**: Lógica central de enrutamiento y procesamiento de requests
- **AuthMiddleware**: Valida tokens JWT y gestiona autenticación/autorización
- **RateLimitMiddleware**: Implementa throttling por IP, usuario y endpoint
- **RequestRouter**: Enruta requests a microservicios específicos basado en URL patterns

**Funcionalidades de Balanceo y Resiliencia:**
- **LoadBalancer**: Distribuye carga entre instancias de microservicios
- **CircuitBreaker**: Patrón de resiliencia que previene cascadas de fallos
- **ServiceDiscovery**: Registro automático de instancias de microservicios
- **HealthCheck**: Monitoreo continuo de salud de servicios backend

**Capas de Seguridad:**
- **JWTValidator**: Verifica integridad y expiración de tokens JWT
- **TokenService**: Gestiona refresh tokens y blacklisting
- **CORSHandler**: Configura políticas de Cross-Origin Resource Sharing
- **SecurityHeaders**: Agrega headers de seguridad (HSTS, CSP, X-Frame-Options)
- **RequestValidator**: Sanitiza y valida entrada de datos
- **InputSanitizer**: Previene ataques de inyección y XSS

**Sistema de Monitoreo:**
- **MetricsCollector**: Recopila métricas de performance y uso (Prometheus)
- **LogAggregator**: Centraliza logs de todas las requests (ELK Stack)
- **TraceCollector**: Implementa distributed tracing (Jaeger)
- **AlertManager**: Genera alertas automáticas por anomalías

**Flujo de Request Processing:**
1. **Recepción** → GatewayController recibe request HTTP
2. **Autenticación** → AuthMiddleware valida JWT y permisos
3. **Rate Limiting** → RateLimitMiddleware verifica límites de uso
4. **Validación** → RequestValidator sanitiza y valida entrada
5. **Enrutamiento** → RequestRouter determina microservicio destino
6. **Balanceo** → LoadBalancer selecciona instancia saludable
7. **Circuit Breaker** → Verifica estado del servicio destino
8. **Ejecución** → Request se forwardea al microservicio
9. **Monitoreo** → MetricsCollector registra métricas de la transacción
10. **Respuesta** → Response se devuelve al cliente con headers de seguridad

**Características Avanzadas:**
- **API Versioning** automático con backward compatibility
- **Request/Response Transformation** para adaptar formatos entre cliente/servidor
- **Caching** a nivel de gateway para responses frecuentes
- **WebSocket Support** para comunicación bidireccional
- **GraphQL Federation** preparada para futuras implementaciones
- **Multi-region Deployment** con failover automático

### 6.2 Arquitectura de Microservicios

La plataforma ESAP implementa una arquitectura de microservicios completa en el backend, con 12 microservicios especializados que se comunican a través de un API Gateway centralizado.

#### 6.2.1 Diagrama de Arquitectura de Microservicios

**Código PlantUML:**
```plantuml
@startuml Arquitectura Completa de Microservicios
!include https://raw.githubusercontent.com/plantuml-stdlib/C4-PlantUML/master/C4_Container.puml

Person(user, "Usuario Final", "Docente, Administrativo, Estudiante")

System_Boundary(frontend, "Frontend Layer") {
    Container(react_spa, "React SPA", "TypeScript, React", "Aplicación principal con micro-frontends")
    Container(portal, "Portal Público", "React", "Validación pública de certificados")
}

System_Boundary(backend, "Backend Layer") {
    Container(api_gateway, "API Gateway", "NestJS, Express", "Enrutamiento centralizado, autenticación, rate limiting")

    Container(auth_svc, "Auth Service", "NestJS, PostgreSQL", "Autenticación JWT, RBAC, gestión de usuarios")
    Container(academic_reg_svc, "Academic Registration", "NestJS, PostgreSQL", "Registro académico, graduados, certificados")
    Container(academic_work_svc, "Academic Work Plan", "NestJS, PostgreSQL", "Planes de trabajo académico (PTA)")
    Container(cert_svc, "Certification Service", "NestJS, PostgreSQL", "Emisión y validación de certificados")
    Container(internal_control_svc, "Internal Control", "NestJS, PostgreSQL", "Auditorías institucionales")
    Container(disciplinary_svc, "Disciplinary Control", "NestJS, PostgreSQL", "Procesos disciplinarios")
    Container(legal_svc, "Legal Management", "NestJS, PostgreSQL", "Gestión de procesos legales")
    Container(notification_svc, "Notification Service", "NestJS, PostgreSQL", "Sistema de notificaciones email/SMS")
    Container(travel_svc, "Travel Expenses", "NestJS, PostgreSQL", "Gastos de viaje")
    Container(audit_svc, "Audit Service", "NestJS, PostgreSQL", "Logs de auditoría del sistema")
    Container(interop_svc, "Interoperability", "NestJS", "Integración con sistemas externos")
}

System_Boundary(infrastructure, "Infrastructure Layer") {
    ContainerDb(postgres, "PostgreSQL Cluster", "PostgreSQL 16", "Base de datos multi-tenant con esquemas separados")
    ContainerDb(redis, "Redis Cluster", "Redis 7", "Cache distribuido para sesiones y datos temporales")
    Container(queue, "Message Queue", "RabbitMQ/Redis", "Colas de mensajes para procesamiento asíncrono")
    Container(storage, "File Storage", "MinIO/NFS", "Almacenamiento de archivos y documentos")
}

System_Ext(smtp, "SMTP Server", "SendGrid/Mailgun", "Envío de correos electrónicos")
System_Ext(sms, "SMS Gateway", "Twilio", "Envío de mensajes de texto")
System_Ext(onlyoffice, "OnlyOffice", "Document Server", "Edición colaborativa de documentos")
System_Ext(blockchain, "Blockchain", "Ethereum", "Validación inmutable de certificados")

Rel(user, react_spa, "Usa aplicación web")
Rel(user, portal, "Valida certificados públicos")
Rel(react_spa, api_gateway, "HTTP/HTTPS", "API REST calls")
Rel(portal, api_gateway, "HTTP/HTTPS", "Validación de certificados")

Rel(api_gateway, auth_svc, "HTTP", "Autenticación y autorización")
Rel(api_gateway, academic_reg_svc, "HTTP", "Gestión académica")
Rel(api_gateway, academic_work_svc, "HTTP", "Planes de trabajo")
Rel(api_gateway, cert_svc, "HTTP", "Certificados")
Rel(api_gateway, internal_control_svc, "HTTP", "Auditorías")
Rel(api_gateway, disciplinary_svc, "HTTP", "Procesos disciplinarios")
Rel(api_gateway, legal_svc, "HTTP", "Gestión legal")
Rel(api_gateway, notification_svc, "HTTP", "Notificaciones")
Rel(api_gateway, travel_svc, "HTTP", "Gastos de viaje")
Rel(api_gateway, audit_svc, "HTTP", "Auditoría del sistema")
Rel(api_gateway, interop_svc, "HTTP", "Interoperabilidad")

Rel(auth_svc, postgres, "JDBC", "Persistencia de usuarios y roles")
Rel(academic_reg_svc, postgres, "JDBC", "Datos académicos")
Rel(academic_work_svc, postgres, "JDBC", "Planes de trabajo")
Rel(cert_svc, postgres, "JDBC", "Certificados emitidos")
Rel(internal_control_svc, postgres, "JDBC", "Auditorías y hallazgos")
Rel(disciplinary_svc, postgres, "JDBC", "Procesos disciplinarios")
Rel(legal_svc, postgres, "JDBC", "Documentos legales")
Rel(notification_svc, postgres, "JDBC", "Historial de notificaciones")
Rel(travel_svc, postgres, "JDBC", "Gastos de viaje")
Rel(audit_svc, postgres, "JDBC", "Logs de auditoría")

Rel(auth_svc, redis, "Redis", "Sesiones y tokens")
Rel(notification_svc, redis, "Redis", "Cache de plantillas")
Rel(api_gateway, redis, "Redis", "Rate limiting y cache")

Rel(notification_svc, smtp, "SMTP", "Envío de emails")
Rel(notification_svc, sms, "API", "Envío de SMS")
Rel(react_spa, onlyoffice, "WebSocket/HTTP", "Edición de documentos")
Rel(cert_svc, blockchain, "Web3", "Validación de certificados")
Rel(notification_svc, queue, "AMQP", "Mensajes asíncronos")
Rel(academic_reg_svc, storage, "HTTP", "Almacenamiento de PDFs")
Rel(cert_svc, storage, "HTTP", "Certificados generados")
@enduml
```

#### 6.2.2 Explicación Detallada de la Arquitectura de Microservicios

##### **Componentes Principales:**

**1. API Gateway (Punto de Entrada Único)**
- **Tecnología**: NestJS con Express
- **Funciones**:
  - Enrutamiento inteligente de requests a microservicios específicos
  - Autenticación JWT y validación de tokens
  - Rate limiting para protección contra ataques DoS
  - Logging centralizado de todas las requests
  - Compresión de respuestas y optimización de performance
  - CORS handling y security headers

**2. Auth Service (Servicio de Autenticación)**
- **Base de datos**: Esquema `auth` en PostgreSQL
- **Funcionalidades**:
  - Login/logout con JWT y refresh tokens
  - Gestión de usuarios, roles y permisos (RBAC)
  - Recuperación de contraseña por email
  - Validación de sesiones persistentes
  - Integración con LDAP/Active Directory (futuro)

**3. Academic Registration Service (Registro Académico)**
- **Base de datos**: Esquema `academic_registration` en PostgreSQL
- **Funcionalidades**:
  - Gestión de graduados y registros académicos
  - Generación de certificados de graduación en PDF
  - Validación de elegibilidad para certificados
  - Historial académico y transcripciones

**4. Academic Work Plan Service (Planes de Trabajo Académico)**
- **Base de datos**: Esquema `academic_work_plan` en PostgreSQL
- **Funcionalidades**:
  - Gestión del PTA con 4 componentes evaluativos
  - Flujo de aprobación en 3 niveles jerárquicos
  - Cálculo automático de porcentajes y evaluaciones
  - Historial de versiones y cambios

**5. Certification Service (Servicio de Certificación)**
- **Base de datos**: Esquema `certification` en PostgreSQL
- **Funcionalidades**:
  - Emisión de certificados laborales y académicos
  - Generación de códigos QR para verificación pública
  - Plantillas personalizables con OnlyOffice
  - Integración con blockchain para validación inmutable

**6. Internal Control Service (Control Interno Institucional)**
- **Base de datos**: Esquema `internal_control` en PostgreSQL
- **Funcionalidades**:
  - Gestión completa de auditorías institucionales
  - Equipos auditor, hallazgos y planes de mejoramiento
  - Seguimiento de cumplimiento y reportes
  - Workflows de aprobación y notificaciones

**7. Disciplinary Control Service (Control Disciplinario)**
- **Base de datos**: Esquema `disciplinary_control` en PostgreSQL
- **Funcionalidades**:
  - Procesos disciplinarios con máquina de estados
  - Gestión de evidencias y documentos
  - Generación automática de autos legales
  - Seguimiento de etapas del proceso

**8. Legal Management Service (Gestión Legal)**
- **Base de datos**: Esquema `legal_management` en PostgreSQL
- **Funcionalidades**:
  - Gestión de procesos legales institucionales
  - Plantillas de documentos legales
  - Seguimiento de casos y audiencias
  - Integración con sistemas judiciales

**9. Notification Service (Servicio de Notificaciones)**
- **Base de datos**: Esquema `notifications` en PostgreSQL
- **Funcionalidades**:
  - Envío de emails transaccionales y masivos
  - SMS para notificaciones críticas
  - Plantillas personalizables con variables dinámicas
  - Queue system para procesamiento asíncrono

**10. Travel Expenses Service (Gastos de Viaje)**
- **Base de datos**: Esquema `travel_expenses` en PostgreSQL
- **Funcionalidades**:
  - Gestión de solicitudes de viaje
  - Cálculo automático de viáticos
  - Aprobaciones y reembolsos
  - Integración con sistemas contables

**11. Audit Service (Servicio de Auditoría)**
- **Base de datos**: Esquema `audit` en PostgreSQL
- **Funcionalidades**:
  - Logging de todas las operaciones del sistema
  - Trazabilidad completa de cambios
  - Reportes de auditoría y compliance
  - Alertas de seguridad y anomalías

**12. Interoperability Service (Interoperabilidad)**
- **Funcionalidades**:
  - Integración con sistemas externos (SIA, SICON, etc.)
  - APIs para compartir datos con otras instituciones
  - Transformación de formatos de datos
  - Sincronización bidireccional

##### **Infraestructura Compartida:**

**PostgreSQL Cluster:**
- Base de datos multi-tenant con esquemas separados por servicio
- Alta disponibilidad con réplicas de lectura
- Backup automático y point-in-time recovery
- Partitioning para tablas de alto volumen

**Redis Cluster:**
- Cache distribuido para sesiones y datos temporales
- Rate limiting distribuido
- Cache de plantillas y configuraciones
- Pub/Sub para comunicación entre servicios

**Message Queue:**
- Procesamiento asíncrono de tareas pesadas
- Desacoplamiento de servicios
- Retry logic y dead letter queues
- Monitoring de colas y performance

**File Storage:**
- Almacenamiento distribuido para PDFs, imágenes y documentos
- CDN integration para archivos públicos
- Versioning y backup automático
- Compresión y optimización automática

##### **Principios de Diseño:**

1. **Separación de Responsabilidades**: Cada microservicio maneja un dominio específico
2. **Base de Datos por Servicio**: Esquemas independientes para evitar acoplamiento
3. **API Gateway Centralizado**: Punto único de entrada con funcionalidades transversales
4. **Comunicación Síncrona/Asíncrona**: HTTP para operaciones síncronas, queues para asíncronas
5. **Observabilidad**: Logging, métricas y tracing distribuidos
6. **Resiliencia**: Circuit breakers, timeouts y retry logic
7. **Escalabilidad**: Servicios stateless que pueden escalar horizontalmente

##### **Flujos de Comunicación:**

- **Síncrono**: Frontend → API Gateway → Microservicio específico → Base de datos
- **Asíncrono**: Microservicio → Queue → Worker → Notificación/Email
- **Event-driven**: Cambios en un servicio notifican a otros vía events

Esta arquitectura permite mantener, escalar y evolucionar cada microservicio de forma independiente mientras mantiene la coherencia del sistema completo.

### 6.3 Vistas Principales

La aplicación cuenta con múltiples vistas organizadas por tipo de usuario y funcionalidad:

| Vista | Ruta | Descripción | Tipo de Usuario |
|-------|------|-------------|-----------------|
| **Landing Page** | `/` | Página pública de inicio con información institucional, servicios disponibles y navegación principal | Público |
| **Login** | `/login` | Autenticación de usuarios con soporte para diferentes roles y recuperación de contraseña | Todos |
| **Portal Transaccional** | `/portal/*` | Dashboard unificado para usuarios finales (estudiantes, docentes, graduados) con widgets dinámicos | Estudiantes, Docentes, Graduados |
| **Backoffice Administrativo** | `/admin/*` | Sistema administrativo completo con módulos especializados por rol | Administrativos, Coordinadores |
| **Verificar Certificado Graduado** | `/verificar-certificado-graduado` | Validación pública de certificados de grado con códigos QR | Público |
| **Validar Certificado Público** | `/validar/:codigo` | Endpoint público para validación de certificados mediante código único | Público |
| **Solicitar Certificado Laboral** | `/solicitar-certificado-laboral` | Formulario público para solicitud de certificados laborales | Público |

**Código PlantUML - Mapa Completo de Vistas:**
```plantuml
@startuml Mapa Completo de Vistas Principales
left to right direction

actor "Usuario Público" as public
actor "Usuario Autenticado" as auth_user

rectangle "Vistas Públicas" as public_views {
    usecase "Landing Page (/)" as landing
    usecase "Verificar Certificado\n(/verificar-certificado-graduado)" as verify_grad
    usecase "Validar Certificado\n(/validar/:codigo)" as validate_cert
    usecase "Solicitar Certificado\n(/solicitar-certificado-laboral)" as request_cert
}

rectangle "Autenticación" as auth {
    usecase "Login/Register (/login)" as login
}

rectangle "Portal Transaccional" as portal {
    usecase "Dashboard Dinámico (/portal)" as dashboard
    usecase "Perfil de Usuario" as profile
    usecase "Certificados Personales" as my_certs
    usecase "Historial Académico" as academic_history
}

rectangle "Backoffice Administrativo" as backoffice {
    usecase "Dashboard Admin (/admin)" as admin_dashboard
    usecase "Gestión de Usuarios" as user_mgmt
    usecase "Módulo PTA" as pta_module
    usecase "Control Interno" as audit_module
    usecase "Certificaciones" as cert_module
    usecase "Procesos Disciplinarios" as disciplinary_module
    usecase "Gestión Legal" as legal_module
}


public --> landing
public --> verify_grad
public --> validate_cert
public --> request_cert

auth_user --> login
login --> portal
login --> backoffice

portal --> dashboard
dashboard --> profile
dashboard --> my_certs
dashboard --> academic_history

backoffice --> admin_dashboard
admin_dashboard --> user_mgmt
admin_dashboard --> pta_module
admin_dashboard --> audit_module
admin_dashboard --> cert_module
admin_dashboard --> disciplinary_module
admin_dashboard --> legal_module

@enduml
```

**Explicación del Diagrama:**
Este mapa completo de vistas muestra todas las rutas principales de la aplicación organizadas por tipo de usuario. Las vistas públicas permiten acceso sin autenticación, mientras que las autenticadas se dividen en Portal Transaccional (para usuarios finales) y Backoffice Administrativo (para personal institucional). Las herramientas especializadas requieren permisos administrativos específicos.

## 7. SISTEMA DE COMPONENTES

### 7.1 Jerarquía de Componentes

**Código PlantUML - Jerarquía de Componentes:**
```plantuml
@startuml Jerarquía de Componentes
skinparam backgroundColor #FEFEFE
skinparam componentStyle uml2

package "App (Root)" as app {
    component Router
    component AuthProvider
    component ThemeProvider
}

package "Layout" as layout {
    component Header
    component Sidebar
    component Main
    component Footer
}

package "Main Content" as main {
    component Dashboard
    component ModuleContainer
    component "..."
}

app --> layout
layout --> main
Router --> layout
AuthProvider --> layout
ThemeProvider --> layout
Main --> Dashboard
Main --> ModuleContainer
Main --> "..."
@enduml
```

**Explicación del Diagrama:**
La jerarquía de componentes muestra la estructura de árbol de la aplicación React. Comienza con el componente App raíz que proporciona contextos globales (AuthProvider, ThemeProvider) y enrutamiento. El Layout envuelve el contenido principal que se divide en Header, Sidebar, Main y Footer. El área Main contiene los componentes dinámicos como Dashboard y contenedores de módulos.

### 7.2 Componentes ESAP Backoffice

El backoffice administrativo está compuesto por aproximadamente 322 módulos especializados organizados por categorías funcionales:

| Categoría | Ubicación | Descripción |
|-----------|-----------|-------------|
| **Administración de Usuarios** | `UsersPersonsModulePremium.tsx, /admin/` | Gestión granular de usuarios con filtros avanzados, perfiles detallados y control de acceso |
| **Roles y Permisos** | `/RolesAdministrationModulePremium.tsx` | Sistema RBAC completo con asignación de roles, permisos granulares y control de acceso por módulo |
| **Auditoría** | `/AuditModulePremium.tsx` | Logs de auditoría del sistema, analytics de uso y monitoreo de actividades críticas |
| **Gestión Profesoral** | `/src/components/gestion-profesoral/GestionProfesoralApp.tsx` | Sistema completo de Planes de Trabajo Académico (PTA) con flujos de aprobación multinivel |
| **Certificados** | `/CertificateRequestsModule.tsx` | Gestión de solicitudes de certificados, verificación de elegibilidad y emisión de documentos |
| **Reportería** | `/ReportsModuleV2.tsx` | Generación de reportes avanzados en múltiples formatos (PDF, Excel) con dashboards interactivos |
| **Comunidad** | `/CommunityAnnouncementsModuleUnified.tsx` | Gestión de anuncios institucionales, eventos comunitarios y comunicaciones masivas |
| **Control Interno** | `/control-interno/` | Módulo completo de auditorías institucionales con equipos auditor y planes de mejoramiento |
| **Control Disciplinario** | `/disciplinario/` | Procesos disciplinarios formales con workflows complejos y gestión documental |
| **Registro Académico** | `/GraduatesManagementModule.tsx` | Gestión de graduados, certificados de grado y validación académica |
| **Gestión Legal** | `/gestion-legal/` | Procesos legales institucionales, contratos y asesoría jurídica |
| **Firma Electrónica** | `/firma-electronica/` | Sistema de firma digital para documentos institucionales |

**Código PlantUML - Arquitectura de Componentes Backoffice:**
```plantuml
@startuml Arquitectura de Componentes Backoffice
left to right direction

package "Núcleo Administrativo" as core {
    component UsersPersonsModulePremium
    component RolesAdministrationModulePremium
    component AuditModulePremium
}

package "Gestión Académica" as academic {
    component GestionProfesoralApp
    component GraduatesManagementModule
    component CertificateRequestsModule
}

package "Control Institucional" as control {
    component ControlInternoModule
    component DisciplinarioModule
    component GestionLegalModule
}

package "Servicios y Reportes" as services {
    component ReportsModuleV2
    component CommunityAnnouncementsModuleUnified
    component TravelExpensesModule
}

package "APIs Backend" as apis {
    component AuthService
    component AcademicService
    component AuditService
    component CertificationService
}

core --> apis
academic --> apis
control --> apis
services --> apis
@enduml
```

**Explicación del Diagrama:**
La arquitectura de componentes backoffice muestra la organización modular por categorías funcionales. Los componentes del núcleo administrativo manejan la base del sistema (usuarios, roles, auditoría), mientras que los módulos especializados se conectan con los servicios backend correspondientes para proporcionar funcionalidades específicas de ESAP.

### 7.3 Componentes Portal

El portal cuenta con aproximadamente 43 componentes ubicados en `/src/components/portal/`:

| Categoría | Componentes | Descripción |
|-----------|-------------|-------------|
| **Landing** | `LandingPage.tsx`, `PublicNavbar.tsx` | Página pública de inicio con navegación principal y servicios disponibles |
| **Autenticación** | `LoginPage.tsx`, `ModalRecuperarContrasena.tsx` | Sistema de login y recuperación de contraseña para usuarios |
| **Dashboard** | `PortalDashboard.tsx`, `UnifiedPortalViewV5.tsx` | Dashboard unificado que se adapta según el rol del usuario autenticado |
| **PTA** | `DocentesSection.tsx`, `gestion-profesoral/` | Vista personal del docente para gestión de Planes de Trabajo Académico |
| **Perfil** | `ProfilePage.tsx`, `PerfilUsuarioEditable.tsx` | Gestión y edición del perfil de usuario autenticado |
| **Certificados** | `CertificadosLaboralesPortal.tsx`, `ValidarCertificadoGraduado.tsx` | Solicitud y validación de certificados laborales y académicos |
| **Comunidad** | `CommunitySection.tsx`, `CapacitacionesDisponibles.tsx` | Sección de anuncios comunitarios y capacitaciones disponibles |
| **Empleos** | `JobBoardPortal.tsx`, `ApplyToJobModal.tsx` | Bolsa de empleo institucional con postulaciones |
| **Expedientes** | `MisExpedientesLegalesV2.tsx` | Vista de expedientes legales del usuario |
| **Verificación** | `PublicCertificateValidation.tsx`, `VerificationCertificateDisplay.tsx` | Validación pública de certificados con códigos QR |

**Código PlantUML - Arquitectura de Componentes Portal:**
```plantuml
@startuml Arquitectura de Componentes Portal
left to right direction

package "Portal Público" as public {
    component LandingPage
    component PublicNavbar
    component PublicCertificateValidation
    component VerificationCertificateDisplay
}

package "Portal Autenticado" as auth {
    component PortalDashboard
    component UnifiedPortalViewV5
    component ProfilePage
    component PerfilUsuarioEditable
}

package "Módulos Especializados" as modules {
    component DocentesSection
    component CertificadosLaboralesPortal
    component JobBoardPortal
    component MisExpedientesLegalesV2
}

package "APIs Portal" as apis {
    component AuthService
    component AcademicService
    component CertificationService
}

public --> apis
auth --> apis
modules --> apis
@enduml
```

**Explicación del Diagrama:**
La arquitectura del portal separa claramente las vistas públicas (accesibles sin autenticación) de las vistas autenticadas (requieren login). Los módulos especializados se conectan con los servicios backend correspondientes, manteniendo la separación de responsabilidades y la escalabilidad del sistema.

## 8. GESTIÓN DE ESTADO

### 8.1 Estrategia de Estado

La aplicación implementa una estrategia de estado en capas:

| Capa | Tecnología | Uso |
|------|------------|-----|
| **Estado Local** | `useState`, `useReducer` | UI, formularios, modales, estado temporal de componentes |
| **Estado Global** | React Context | Autenticación, Notificaciones, PTA, configuración global |
| **Estado del Servidor** | TanStack Query | Datos remotos, caché, sincronización, manejo de errores |
| **Estado de Formularios** | React Hook Form | Validación, dirty state, errores, gestión de formularios complejos |

**Código PlantUML - Arquitectura de Estado:**
```plantuml
@startuml Arquitectura de Gestión de Estado
skinparam backgroundColor #FEFEFE

package "Estado Local" as local {
    component useState
    component useReducer
    note right: Componentes individuales
}

package "Estado Global" as global {
    component ReactContext
    component AuthContext
    component NotificacionesContext
    note right: Estado compartido app-wide
}

package "Estado del Servidor" as server {
    component TanStackQuery
    component ReactQuery
    component Axios
    note right: API calls y caché
}

package "Estado de Formularios" as forms {
    component ReactHookForm
    component Validation
    note right: Formularios y validación
}

local --> global : Props drilling
global --> server : Context providers
server --> forms : Data binding
forms --> local : Form state
@enduml
```

**Explicación del Diagrama:**
La arquitectura de estado en capas permite una separación clara de responsabilidades. El estado local maneja la UI temporal, el estado global mantiene datos compartidos, el estado del servidor gestiona las APIs con caché inteligente, y el estado de formularios maneja la validación y el dirty state. Los datos fluyen de manera controlada entre las capas según las necesidades de cada componente.

### 8.2 Contextos Principales

**Código PlantUML - Contextos de la Aplicación:**
```plantuml
@startuml Contextos Principales
package "Context Providers" as contexts {
    component AuthContext
    component ThemeContext
    component UserContext
    component ControlInternoContext
}

package "Estado Gestionado" as state {
    usecase "Estado de Autenticación" as auth_state
    usecase "Tema de UI" as theme_state
    usecase "Datos de Usuario" as user_state
    usecase "Estado Control Interno" as control_state
}

AuthContext --> auth_state
ThemeContext --> theme_state
UserContext --> user_state
ControlInternoContext --> control_state
@enduml
```

**Explicación del Diagrama:**
Los contextos principales proporcionan estado global accesible en toda la aplicación. AuthContext maneja autenticación, ThemeContext los temas de UI, UserContext la información del usuario, y ControlInternoContext el estado específico del módulo de control interno.

### 8.3 Hooks Personalizados

**Código PlantUML - Sistema de Hooks:**
```plantuml
@startuml Sistema de Hooks Personalizados
package "Custom Hooks" as hooks {
    component useAuth
    component useApi
    component usePermissions
    component useAuditLog
    component useControlInternoPermissions
}

package "Funcionalidades" as features {
    usecase "Autenticación" as auth
    usecase "Llamadas API" as api
    usecase "Control de Acceso" as permissions
    usecase "Logs de Auditoría" as audit
    usecase "Permisos Control Interno" as control
}

useAuth --> auth
useApi --> api
usePermissions --> permissions
useAuditLog --> audit
useControlInternoPermissions --> control
@enduml
```

**Explicación del Diagrama:**
Los hooks personalizados encapsulan lógica reutilizable. useAuth maneja autenticación, useApi centraliza llamadas HTTP, usePermissions controla acceso basado en roles, mientras que hooks específicos como useAuditLog manejan funcionalidades especializadas de auditoría.

## 9. SERVICIOS Y APIs

### 9.1 Arquitectura de Servicios

Backend implementado como microservicios NestJS con:
- API Gateway para enrutamiento
- Servicios independientes por dominio
- Comunicación REST entre servicios

Los servicios están organizados en una estructura modular:

```
/src/services/
├── api/                          # Clientes API específicos
│   ├── client.ts                 # APIClient singleton
│   ├── auth.service.ts           # Autenticación
│   ├── usuarios.service.ts       # Gestión de usuarios
│   ├── rolesService.ts           # Roles y permisos
│   ├── ptaAPI.ts                 # API del PTA
│   ├── certificados.service.ts   # Certificados
│   ├── dashboard.service.ts      # Dashboard
│   ├── controlInternoService.ts  # Control interno
│   ├── disciplinary.service.ts   # Procesos disciplinarios
│   ├── legal.service.ts          # Gestión legal
│   ├── graduados.service.ts      # Gestión de graduados
│   └── ...
│
├── notifications/                # Servicios de notificaciones
│   └── ptaNotificationsService.ts # Notificaciones PTA
│
├── pta/                          # Servicios PTA especializados
│   ├── ptaAprobacionGranularService.ts
│   └── ptaEnFirmeService.ts
│
├── personasPTAIntegrationService.ts  # Integración Personas-PTA
├── ptaPersonasService.ts             # Caché PTA-Personas
├── notificacionesPersonasPTA.ts      # Notificaciones PTA
├── notificationService.ts            # Notificaciones globales
├── auditService.ts                   # Servicio de auditoría
├── certificadosService.ts            # Servicio de certificados
├── usersService.ts                   # Servicio de usuarios
└── estructuraService.ts              # Servicio de estructura organizacional
```

**Código PlantUML - Arquitectura de Servicios Frontend:**
```plantuml
@startuml Arquitectura de Servicios Frontend
package "API Layer" as api {
    package "Core API" as core {
        component APIClient
        component AuthService
        component UsersService
        component RolesService
    }

    package "Business APIs" as business {
        component PTAService
        component CertificatesService
        component AuditService
        component LegalService
        component GraduatesService
    }

    package "Integration Services" as integration {
        component PersonasPTAIntegration
        component PTAPersonasService
        component NotificationsPTA
    }
}

package "Service Layer" as services {
    component NotificationService
    component AuditService
    component DocumentGeneratorService
    component EstructuraService
}

api --> services
@endplantuml
```

**Explicación:**
La arquitectura de servicios frontend sigue el patrón de separación por responsabilidades. La capa API contiene clientes especializados para cada dominio del backend, mientras que la capa de servicios maneja lógica de negocio compleja y integraciones. Los servicios de integración manejan la comunicación entre diferentes dominios como Personas y PTA.

### 9.2 APIClient - Cliente HTTP Centralizado

```typescript
class ApiClient {
  private axiosInstance: AxiosInstance;

  constructor(baseURL: string) {
    this.axiosInstance = axios.create({
      baseURL,
      timeout: 10000,
    });
  }

  async get<T>(url: string): Promise<T> {
    // Implementation
  }
}
```

### 9.3 Configuración de Ambiente

Variables de entorno para diferentes ambientes:
- Development
- Staging
- Production

## 10. SISTEMA DE AUTENTICACIÓN Y SEGURIDAD

### 10.1 Flujo de Autenticación

**Código PlantUML - Flujo de Autenticación:**
```plantuml
@startuml Flujo de Autenticación
actor Usuario
participant Frontend
participant AuthService
database PostgreSQL
participant Redis

Usuario -> Frontend: Ingresar credenciales
Frontend -> AuthService: POST /auth/login
AuthService -> PostgreSQL: Validar credenciales
PostgreSQL --> AuthService: Usuario válido
AuthService -> AuthService: Generar JWT + Refresh Token
AuthService -> Redis: Almacenar Refresh Token
AuthService --> Frontend: JWT + Refresh Token
Frontend -> Frontend: Almacenar tokens
Frontend --> Usuario: Acceso concedido

note right of AuthService
    JWT: Token de acceso (1h)
    Refresh Token: Renovación (7d)
end note
@enduml
```

**Explicación del Diagrama:**
El flujo de autenticación comienza con el ingreso de credenciales por parte del usuario. El frontend envía las credenciales al Auth Service que valida contra la base de datos. Si es válido, genera JWT y refresh token, almacena el refresh en Redis, y devuelve ambos tokens al frontend para almacenamiento local.

### 10.2 Control de Acceso (RBAC)

**Código PlantUML - Sistema RBAC:**
```plantuml
@startuml Sistema RBAC
package "Roles" as roles {
    component Admin
    component Docente
    component Estudiante
    component Auditor
}

package "Permisos" as permissions {
    component "Crear Usuario" as create_user
    component "Editar PTA" as edit_pta
    component "Ver Certificados" as view_cert
    component "Realizar Auditorías" as audit
}

package "Recursos" as resources {
    component "Módulo Usuarios" as user_module
    component "Módulo PTA" as pta_module
    component "Módulo Certificados" as cert_module
    component "Módulo Auditorías" as audit_module
}

Admin --> create_user
Admin --> edit_pta
Admin --> view_cert
Admin --> audit

Docente --> edit_pta
Docente --> view_cert

Estudiante --> view_cert

Auditor --> audit

create_user --> user_module
edit_pta --> pta_module
view_cert --> cert_module
audit --> audit_module
@enduml
```

**Explicación del Diagrama:**
El sistema RBAC asigna permisos específicos a roles. Los administradores tienen acceso completo a todos los módulos, docentes pueden editar PTA y ver certificados, estudiantes solo ver certificados, y auditores realizar auditorías. Cada permiso se mapea a recursos específicos del sistema.

### 10.3 Gestión de Sesión

**Código PlantUML - Gestión de Sesión:**
```plantuml
@startuml Gestión de Sesión
participant Frontend
participant AuthService
participant Redis
database PostgreSQL

== Inicio de Sesión ==
Frontend -> AuthService: Login request
AuthService -> PostgreSQL: Validate user
AuthService -> AuthService: Generate tokens
AuthService -> Redis: Store refresh token
AuthService --> Frontend: Return JWT + refresh

== Uso Normal ==
Frontend -> AuthService: API request + JWT
AuthService -> AuthService: Validate JWT
AuthService --> Frontend: Authorized response

== Renovación de Token ==
Frontend -> AuthService: Refresh token request
AuthService -> Redis: Validate refresh token
AuthService -> AuthService: Generate new JWT
AuthService --> Frontend: New JWT

== Cierre de Sesión ==
Frontend -> AuthService: Logout request
AuthService -> Redis: Remove refresh token
AuthService --> Frontend: Logout confirmation
@enduml
```

**Explicación del Diagrama:**
La gestión de sesión maneja el ciclo completo: login inicial, uso normal con validación JWT, renovación automática de tokens expirados, y logout seguro que elimina el refresh token de Redis.

### 10.4 Protecciones de Seguridad

**Código PlantUML - Capas de Seguridad:**
```plantuml
@startuml Capas de Seguridad
package "Frontend Security" as frontend {
    component "Input Sanitization" as input_sanit
    component "XSS Protection" as xss
    component "CSRF Tokens" as csrf
}

package "API Security" as api {
    component "JWT Validation" as jwt
    component "Rate Limiting" as rate_limit
    component "Request Validation" as validation
}

package "Infrastructure Security" as infra {
    component "TLS 1.3" as tls
    component "Security Headers" as headers
    component "CORS Policy" as cors
}

frontend --> api
api --> infra
@enduml
```

**Explicación del Diagrama:**
La seguridad se implementa en múltiples capas: frontend con sanitización y protección XSS, API con validación JWT y rate limiting, e infraestructura con TLS 1.3 y headers de seguridad. Cada capa proporciona protección adicional contra diferentes tipos de ataques.

## 11. MODELOS DE DATOS

### 11.1 Modelo de Usuario

```typescript
interface User {
  id: string;
  email: string;
  role: UserRole;
  permissions: Permission[];
  profile: UserProfile;
}
```

### 11.2 Modelo de Plan de Trabajo Académico (PTA)

```typescript
interface AcademicWorkPlan {
  id: string;
  userId: string;
  components: WorkPlanComponent[];
  status: PTAStatus;
  approvals: Approval[];
}
```

### 11.3 Estados del PTA

- BORRADOR
- EN_REVISION
- APROBADO_NIVEL_1
- APROBADO_NIVEL_2
- APROBADO_FINAL
- RECHAZADO

## 12. FLUJOS DE LA APLICACIÓN

### 12.1 Flujo de Aprobación del PTA

**Código PlantUML - Flujo de Aprobación del PTA:**
```plantuml
@startuml Flujo de Aprobación del PTA
actor Docente
participant PTAModule
participant AcademicService
participant NotificationService
database PTADatabase

== Creación y Borrador ==
Docente -> PTAModule: Crear nuevo PTA
PTAModule -> PTAModule: Validar datos del formulario
PTAModule -> AcademicService: POST /pta (BORRADOR)
AcademicService -> PTADatabase: Guardar borrador
AcademicService --> PTAModule: PTA creado exitosamente
PTAModule --> Docente: Confirmación de guardado

== Envío a Revisión ==
Docente -> PTAModule: Enviar a revisión
PTAModule -> AcademicService: PATCH /pta/{id}/submit
AcademicService -> PTADatabase: Cambiar estado a EN_REVISION
AcademicService -> NotificationService: Notificar revisores nivel 1
NotificationService --> Docente: Email de confirmación envío

== Aprobación Nivel 1 ==
AcademicService -> AcademicService: Evaluar PTA
alt Aprobado Nivel 1
    AcademicService -> PTADatabase: Estado = APROBADO_NIVEL_1
    AcademicService -> NotificationService: Notificar docente y nivel 2
    AcademicService -> PTAModule: Enviar a nivel 2
else Rechazado Nivel 1
    AcademicService -> PTADatabase: Estado = RECHAZADO
    AcademicService -> NotificationService: Notificar docente con observaciones
    AcademicService -> PTAModule: Devolver para corrección
end

== Aprobación Nivel 2 ==
PTAModule -> AcademicService: Procesar aprobación nivel 2
alt Aprobado Nivel 2
    AcademicService -> PTADatabase: Estado = APROBADO_FINAL
    AcademicService -> NotificationService: Notificar aprobación final
    AcademicService --> PTAModule: PTA aprobado definitivamente
else Rechazado Nivel 2
    AcademicService -> PTADatabase: Estado = EN_REVISION
    AcademicService -> NotificationService: Notificar correcciones requeridas
    AcademicService -> PTAModule: Devolver para ajustes
end

PTAModule --> Docente: Resultado final del proceso
@enduml
```

**Explicación del Diagrama:**
Este diagrama muestra el flujo completo de aprobación de un Plan de Trabajo Académico (PTA) en la plataforma ESAP. El proceso comienza con la creación de un borrador por parte del docente, pasa por envío a revisión, y requiere aprobación en dos niveles jerárquicos. En cada etapa se generan notificaciones automáticas y se actualiza el estado en la base de datos. Si es rechazado en cualquier nivel, retorna para correcciones con observaciones específicas.

### 12.2 Portal Transaccional - Dashboard Dinámico

**Código PlantUML - Dashboard Dinámico por Roles:**
```plantuml
@startuml Dashboard Dinámico por Roles
actor Usuario
participant PortalDashboard
participant RoleService
participant DataService
database UserDatabase

Usuario -> PortalDashboard: Acceder al portal
PortalDashboard -> RoleService: Obtener roles del usuario
RoleService -> UserDatabase: Consultar permisos y módulos
UserDatabase --> RoleService: Roles y permisos activos
RoleService --> PortalDashboard: Configuración de dashboard

alt Usuario Administrador
    PortalDashboard -> DataService: Obtener métricas globales
    DataService -> DataService: Consultar estadísticas sistema
    DataService --> PortalDashboard: Métricas globales, gestión usuarios
    PortalDashboard --> Usuario: Dashboard Admin (métricas, usuarios, configuración)

else Usuario Docente
    PortalDashboard -> DataService: Obtener datos PTA docente
    DataService -> DataService: Consultar PTA personal, evaluaciones
    DataService --> PortalDashboard: PTA status, evaluaciones pendientes
    PortalDashboard --> Usuario: Dashboard Docente (PTA, evaluaciones, calendario)

else Usuario Estudiante
    PortalDashboard -> DataService: Obtener datos académicos
    DataService -> DataService: Consultar certificados, procesos
    DataService --> PortalDashboard: Certificados disponibles, procesos activos
    PortalDashboard --> Usuario: Dashboard Estudiante (certificados, procesos, perfil)

else Usuario Graduado
    PortalDashboard -> DataService: Obtener historial graduado
    DataService -> DataService: Consultar certificados emitidos, validaciones
    DataService --> PortalDashboard: Certificados descargados, historial académico
    PortalDashboard --> Usuario: Dashboard Graduado (certificados, validaciones, perfil)
end
@enduml
```

**Explicación del Diagrama:**
El dashboard transaccional se adapta dinámicamente según el rol principal del usuario autenticado. El sistema consulta los roles y permisos del usuario para determinar qué widgets y funcionalidades mostrar. Cada tipo de usuario ve información relevante a sus necesidades: administradores ven métricas globales, docentes su PTA y evaluaciones, estudiantes sus certificados y procesos académicos, y graduados su historial de certificados y validaciones.

## 13. INTEGRACIONES EXTERNAS

### 13.1 Integración con Backend

- API Gateway como punto único de entrada
- Autenticación JWT
- Manejo de errores centralizado

### 13.2 Generación de Documentos

- PDFs con jsPDF
- Excel con ExcelJS
- Integración con OnlyOffice

## 14. PATRONES DE DISEÑO

### 14.1 Patrones de Componentes

- **Compound Components**: Para componentes complejos
- **Render Props**: Para lógica reutilizable
- **Custom Hooks**: Para lógica de negocio

### 14.2 Patrones de UI

| Patrón | Descripción |
|--------|-------------|
| **Error Boundaries** | Aislamiento de errores por módulo, previniendo que un error en un componente afecte toda la aplicación |
| **Loading Skeletons** | Feedback visual durante carga de datos, mostrando placeholders que simulan la estructura del contenido |
| **Optimistic Updates** | UI responde inmediatamente a acciones del usuario, con rollback automático si la operación falla |
| **Debounce/Throttle** | Optimización de búsquedas y eventos frecuentes, reduciendo llamadas innecesarias al servidor |
| **Lazy Loading** | Carga diferida de módulos y componentes solo cuando son necesarios, mejorando el tiempo de carga inicial |
| **Code Splitting** | División de bundles de JavaScript por rutas, permitiendo carga paralela y reducción del bundle inicial |

## 15. DECISIONES ARQUITECTÓNICAS IMPLEMENTADAS

Esta sección documenta las decisiones técnicas implementadas en la Plataforma Comunidad ESAP, basadas en el análisis del código fuente y la arquitectura actual del sistema.

### 15.1 Framework Frontend: React + TypeScript

**Implementación Actual:**
- **Framework**: React 18.3.1 con TypeScript en modo estricto
- **Build Tool**: Vite 6.3.5 para desarrollo y compilación
- **Evidencia**: Confirmado en `package.json` y archivos de configuración

**Características Técnicas:**
- Componentes funcionales con hooks
- TypeScript estricto para type safety
- JSX/TSX para templates
- Hot reload en desarrollo

### 15.2 Arquitectura Frontend: SPA Modular (No Micro-Frontends)

**Implementación Actual:**
- **Arquitectura**: Single Page Application (SPA) con módulos organizados por dominio
- **Estructura**: Componentes organizados en carpetas `/esap/*` y `/portal/*`
- **Evidencia**: Estructura de archivos en `/src/components/` sin implementación de Module Federation o single-spa

**Estado Actual:**
- La documentación menciona "micro-frontends" pero la implementación actual es una SPA tradicional
- Los módulos están organizados lógicamente pero comparten el mismo bundle
- No hay aislamiento de runtime entre módulos

### 15.3 Gestión de Estado: TanStack Query + Context API

**Implementación Actual:**
- **Server State**: TanStack Query (React Query) para datos del servidor
- **Global State**: React Context API para estado compartido
- **Local State**: useState/useReducer para estado de componentes
- **Evidencia**: `QueryProvider.tsx`, contexts en `/src/contexts/`, TanStack Query en `package.json`

**Contextos Implementados:**
- `NotificacionesContext`: Gestión de notificaciones del sistema
- `PermissionsContext`: Control de permisos de usuario
- `PTAContext`: Estado específico del módulo PTA

### 15.4 Sistema de Autenticación: JWT + RBAC

**Implementación Actual:**
- **Protocolo**: JWT con access tokens (1h) y refresh tokens (7d)
- **Backend**: NestJS con @nestjs/jwt y passport-jwt
- **Frontend**: Gestión manual de tokens (localStorage)
- **Evidencia**: Auth service con JWT strategy, passport-jwt en `package.json`

**Características de Seguridad:**
- RBAC granular por roles, permisos y módulos
- Sesiones persistentes en Redis
- Validación de tokens en API Gateway

### 15.5 Sistema de Componentes UI: Radix UI + Tailwind CSS

**Implementación Actual:**
- **Componentes Base**: Radix UI (30+ componentes headless)
- **Estilos**: Tailwind CSS para utility-first styling
- **Sistema UI**: Shadcn/ui para componentes pre-construidos
- **Evidencia**: Múltiples paquetes @radix-ui/* en `package.json`, tailwind-merge

**Beneficios Implementados:**
- Accesibilidad WCAG AA garantizada por Radix UI
- Diseño consistente y personalizable
- Componentes headless para máxima flexibilidad

## 16. GUÍA DE DESARROLLO

### 16.1 Configuración del Entorno

#### Prerrequisitos del Sistema

Antes de comenzar, asegúrate de tener instalados los siguientes componentes:

| Componente | Versión Mínima | Propósito |
|------------|----------------|-----------|
| **Node.js** | 18.17.0+ | Runtime de JavaScript |
| **npm** | 9.0.0+ | Gestor de paquetes de Node.js |
| **Docker** | 24.0+ | Contenedorización de servicios |
| **Docker Compose** | 2.0+ | Orquestación de contenedores |
| **Git** | 2.30+ | Control de versiones |
| **PostgreSQL** | 16+ | Base de datos (opcional para desarrollo local) |
| **Redis** | 7+ | Cache y sesiones (opcional para desarrollo local) |

**Comando de verificación:**
```bash
# Verificar versiones instaladas
node --version
npm --version
docker --version
docker-compose --version
git --version
```

#### Instalación y Configuración Inicial

##### 1. Clonar el Repositorio
```bash
# Clonar el repositorio
git clone <url-del-repositorio>
cd plataforma-comunidad-esap

# Instalar dependencias del frontend
npm install
```

##### 2. Configurar Variables de Entorno

Copia los archivos de ejemplo y configura las variables de entorno:

```bash
# Variables de entorno del frontend
cp .env.example .env.development
cp .env.example .env

# Variables de entorno de servicios backend
cp backend/auth-service/.env.example backend/auth-service/.env
cp backend/academic-registration-service/.env.example backend/academic-registration-service/.env
# ... repetir para cada servicio
```

**Variables críticas a configurar:**
```bash
# .env.development
VITE_API_BASE_URL=http://localhost:3000
VITE_AUTH_SERVICE_URL=http://localhost:3001
VITE_ACADEMIC_SERVICE_URL=http://localhost:3002
VITE_CERTIFICATION_SERVICE_URL=http://localhost:3004
VITE_DATABASE_URL=postgresql://user:password@localhost:5432/esap_db
VITE_REDIS_URL=redis://localhost:6379
```

##### 3. Configurar Base de Datos

**Opción A: Usando Docker (Recomendado)**
```bash
# Levantar servicios de infraestructura
docker-compose -f docker-compose.services.yml up -d

# Ejecutar migraciones
npm run migrate:dev
```

**Opción B: Base de datos local**
```bash
# Crear base de datos PostgreSQL
createdb esap_db

# Ejecutar scripts de inicialización
bash db/init/01_legal_schema_init.sql
# ... ejecutar scripts en orden
```

##### 4. Configurar Servicios Backend

```bash
# Instalar dependencias de todos los servicios
npm run install:all

# Construir servicios (opcional)
npm run build:all
```

#### Comandos de Desarrollo

##### Desarrollo Local Completo
```bash
# Levantar toda la infraestructura con Docker
docker-compose -f docker-compose.dev.yml up -d

# Ejecutar frontend en modo desarrollo
npm run dev

# Los servicios estarán disponibles en:
# - Frontend: http://localhost:5173
# - API Gateway: http://localhost:3000
# - Auth Service: http://localhost:3001
# - Academic Service: http://localhost:3002
```

##### Desarrollo Individual de Servicios
```bash
# Ejecutar solo el frontend
npm run dev

# Ejecutar API Gateway
cd backend/api-gateway && npm run start:dev

# Ejecutar Auth Service
cd backend/auth-service && npm run start:dev

# Ejecutar otros servicios según necesidad
```

##### Testing
```bash
# Ejecutar tests del frontend
npm run test

# Ejecutar tests de un servicio específico
cd backend/auth-service && npm run test

# Ejecutar tests de integración
npm run test:integration

# Ejecutar tests end-to-end
npm run test:e2e
```

##### Build y Despliegue
```bash
# Build de producción del frontend
npm run build

# Build de todos los servicios
npm run build:all

# Despliegue a desarrollo
npm run deploy:dev

# Despliegue a pre-producción
npm run deploy:pre

# Despliegue a QA
npm run deploy:qa
```

#### Scripts Disponibles en package.json

| Script | Descripción |
|--------|-------------|
| `npm run dev` | Inicia servidor de desarrollo con hot reload |
| `npm run build` | Construye aplicación para producción |
| `npm run preview` | Vista previa del build de producción |
| `npm run test` | Ejecuta tests unitarios |
| `npm run test:watch` | Tests en modo watch |
| `npm run test:coverage` | Tests con reporte de cobertura |
| `npm run lint` | Ejecuta ESLint para verificación de código |
| `npm run lint:fix` | Corrige automáticamente errores de linting |
| `npm run format` | Formatea código con Prettier |
| `npm run type-check` | Verificación de tipos TypeScript |
| `npm run install:all` | Instala dependencias en todos los servicios |
| `npm run build:all` | Construye todos los servicios backend |
| `npm run clean:all` | Limpia builds y node_modules |
| `npm run migrate:dev` | Ejecuta migraciones de base de datos |
| `npm run seed:dev` | Ejecuta seeds de datos de desarrollo |
| `npm run docker:dev` | Levanta entorno completo con Docker |
| `npm run docker:stop` | Detiene todos los contenedores |

#### Solución de Problemas Comunes

##### Error de Puerto Ocupado
```bash
# Verificar qué proceso usa el puerto
lsof -i :3000

# Matar proceso
kill -9 <PID>

# O cambiar puerto en configuración
```

##### Error de Conexión a Base de Datos
```bash
# Verificar que PostgreSQL esté corriendo
docker ps | grep postgres

# Verificar conexión
psql -h localhost -U user -d esap_db
```

##### Error de Dependencias
```bash
# Limpiar cache de npm
npm cache clean --force

# Reinstalar dependencias
rm -rf node_modules package-lock.json
npm install
```

##### Logs de Debugging
```bash
# Ver logs de contenedores
docker-compose logs -f

# Ver logs de un servicio específico
docker-compose logs auth-service

# Ver logs del frontend
npm run dev -- --logLevel debug
```

#### Configuración por Entorno

##### Desarrollo Local
- **Base de datos**: PostgreSQL en Docker
- **Cache**: Redis en Docker
- **Email**: Console logging (no envío real)
- **File Storage**: Local filesystem

##### Pre-producción
- **Base de datos**: PostgreSQL dedicada
- **Cache**: Redis cluster
- **Email**: SendGrid con envío real
- **File Storage**: MinIO S3-compatible

##### Producción
- **Base de datos**: PostgreSQL con réplicas
- **Cache**: Redis cluster con persistencia
- **Email**: SendGrid con templates
- **File Storage**: AWS S3 o similar
- **CDN**: CloudFront o similar
- **Monitoring**: Prometheus + Grafana
- **Logging**: ELK Stack

#### Verificación de Instalación

Después de completar la configuración, verifica que todo funcione correctamente:

```bash
# Verificar que el frontend compile
npm run build

# Verificar que los tests pasen
npm run test

# Verificar conectividad con servicios
curl http://localhost:3000/health

# Verificar base de datos
npm run migrate:dev
```

Si encuentras algún problema durante la configuración, consulta la documentación específica de cada servicio en sus respectivos directorios `backend/*/README.md`.

### 16.2 Convenciones de Código

- ESLint para linting
- Prettier para formateo
- Husky para pre-commits
- Commitlint para mensajes de commit

## 17. DIAGRAMAS DE ARQUITECTURA

### 17.1 Diagrama de Arquitectura General

La arquitectura de la Plataforma ESAP se presenta en cuatro diagramas separados para mayor claridad y comprensión:

#### 17.1.1 Diagrama de Contexto - Visión General
**Descripción**: Muestra las relaciones de alto nivel entre usuarios, el sistema principal y servicios externos.

```plantuml
@startuml Diagrama de Contexto - Plataforma ESAP
!include https://raw.githubusercontent.com/plantuml-stdlib/C4-PlantUML/master/C4_Context.puml

Person(user, "Usuario Final", "Docente, Administrativo, Estudiante, Graduado")
System(esap, "Plataforma ESAP", "Sistema de gestión académica/administrativa")

System_Ext(auth, "Auth Service", "Autenticación y autorización")
System_Ext(academic, "Academic Services", "Servicios académicos")
System_Ext(certification, "Certification Service", "Emisión de certificados")
System_Ext(audit, "Audit Service", "Control interno")
System_Ext(notification, "Notification Service", "Sistema de notificaciones")

Rel(user, esap, "Usa")
Rel(esap, auth, "Autentica")
Rel(esap, academic, "Gestiona procesos académicos")
Rel(esap, certification, "Emite certificados")
Rel(esap, audit, "Realiza auditorías")
Rel(esap, notification, "Envía notificaciones")
@enduml
```

#### 17.1.2 Diagrama de Contenedores - Arquitectura por Capas
**Descripción**: Ilustra la organización en capas del sistema con frontend, backend de microservicios e infraestructura.

```plantuml
@startuml Arquitectura por Capas - Contenedores
!include https://raw.githubusercontent.com/plantuml-stdlib/C4-PlantUML/master/C4_Container.puml

Person(user, "Usuario Final")

System_Boundary(frontend, "Frontend Layer") {
    Container(react_spa, "React SPA", "TypeScript, React", "Aplicación principal")
    Container(portal, "Portal Público", "React", "Validación de certificados")
}

System_Boundary(backend, "Backend Layer") {
    Container(api_gateway, "API Gateway", "NestJS", "Punto de entrada único")
    Container(microservices, "11 Microservicios", "NestJS, PostgreSQL", "Servicios especializados")
}

System_Boundary(infra, "Infrastructure") {
    ContainerDb(postgres, "PostgreSQL", "Base de datos multi-tenant")
    ContainerDb(redis, "Redis", "Cache y sesiones")
    Container(queue, "Message Queue", "Procesamiento asíncrono")
}

Rel(user, react_spa, "HTTPS")
Rel(user, portal, "HTTPS")
Rel(react_spa, api_gateway, "API REST")
Rel(portal, api_gateway, "Validación")
Rel(api_gateway, microservices, "Enrutamiento")
Rel(microservices, postgres, "Persistencia")
Rel(microservices, redis, "Cache")
Rel(microservices, queue, "Mensajes")
@enduml
```

#### 17.1.3 Diagrama de Microservicios - Servicios Especializados
**Descripción**: Detalla los 11 microservicios especializados con sus puertos y funcionalidades principales.

```plantuml
@startuml Microservicios Especializados
!include https://raw.githubusercontent.com/plantuml-stdlib/C4-PlantUML/master/C4_Container.puml

System_Boundary(microservices, "Microservicios ESAP") {
    Container(auth_svc, "Auth Service", "Puerto 3001", "JWT, RBAC, Usuarios")
    Container(academic_svc, "Academic Registration", "Puerto 3002", "Graduados, Certificados")
    Container(pta_svc, "Academic Work Plan", "Puerto 3003", "PTA, Aprobaciones")
    Container(cert_svc, "Certification Service", "Puerto 3004", "Blockchain, QR Codes")
    Container(disciplinary_svc, "Disciplinary Control", "Puerto 3005", "Procesos legales")
    Container(legal_svc, "Legal Management", "Puerto 3006", "Gestión legal")
    Container(audit_svc, "Internal Control", "Puerto 3007", "Auditorías")
    Container(notification_svc, "Notification Service", "Puerto 3008", "Email/SMS")
    Container(travel_svc, "Travel Expenses", "Puerto 3009", "Viáticos")
    Container(audit_log_svc, "Audit Service", "Puerto 3010", "Logs del sistema")
    Container(interop_svc, "Interoperability", "Puerto 3011", "Integración externa")
}

Container(api_gateway, "API Gateway", "Puerto 3000", "Enrutamiento centralizado")

api_gateway --> auth_svc
api_gateway --> academic_svc
api_gateway --> pta_svc
api_gateway --> cert_svc
api_gateway --> disciplinary_svc
api_gateway --> legal_svc
api_gateway --> audit_svc
api_gateway --> notification_svc
api_gateway --> travel_svc
api_gateway --> audit_log_svc
api_gateway --> interop_svc
@enduml
```

#### 17.1.4 Diagrama de Infraestructura y Integraciones
**Descripción**: Muestra la infraestructura compartida y las integraciones con servicios externos.

```plantuml
@startuml
title Infraestructura y Servicios Externos – ESAP

package "Infraestructura Compartida" {
  database PostgreSQL
  database Redis
  queue "Message Queue"
  folder "File Storage"
}

package "Servicios Externos" {
  component "SMTP Gateway"
  component "SMS Gateway"
  component "OnlyOffice"
  component "Blockchain"
}

PostgreSQL --> Redis
Redis --> "Message Queue"
"Message Queue" --> "File Storage"

"File Storage" --> "SMTP Gateway"
"File Storage" --> "SMS Gateway"
"File Storage" --> "OnlyOffice"
"File Storage" --> "Blockchain"

@enduml

```

### 17.2 Diagrama de Sistema de Componentes UI

El sistema de componentes UI se presenta en tres diagramas separados para mayor claridad:

#### 17.2.1 Jerarquía de Componentes - Atomic Design
**Descripción**: Muestra la estructura jerárquica siguiendo el patrón Atomic Design (átomos, moléculas, organismos).

```plantuml
@startuml Jerarquía Atomic Design
package "Atoms" as atoms {
    [Button]
    [Input]
    [Icon]
    [Typography]
}

package "Molecules" as molecules {
    [FormField]
    [Card]
    [Navigation]
    [SearchBar]
}

package "Organisms" as organisms {
    [Header]
    [DataTable]
    [FormSection]
    [DashboardWidget]
}

atoms --> molecules : Composición
molecules --> organisms : Integración

note right
    **Atomic Design Pattern:**
    • Atoms: Componentes básicos indivisibles
    • Molecules: Combinaciones funcionales
    • Organisms: Secciones completas
end note
@enduml
```

#### 17.2.2 Componentes de Negocio - Módulos ESAP
**Descripción**: Ilustra los componentes especializados organizados por dominios funcionales de ESAP.

```plantuml
@startuml Componentes de Negocio ESAP
package "ESAP Modules" as esap {
    package "Academic" as academic {
        [GraduatesManagementModule]
        [CertificateRequestsModule]
        [PTAManagementModule]
    }

    package "Control" as control {
        [ControlInternoModule]
        [DisciplinarioModule]
        [GestionLegalModule]
    }

    package "Services" as services {
        [ReportsModuleV2]
        [UsersPersonsModulePremium]
        [RolesAdministrationModulePremium]
    }
}

package "Portal Components" as portal {
    [PortalDashboard]
    [PublicCertificateValidation]
    [JobBoardPortal]
}

organisms --> esap : Especialización
organisms --> portal : Especialización

note right
    **Business Components:**
    • ESAP Modules: Funcionalidades específicas
    • Portal Components: Interfaz pública
    • Integración con backend APIs
end note
@enduml
```

#### 17.2.3 Arquitectura de Layout - Estructura de la Aplicación
**Descripción**: Muestra cómo se organizan los componentes de layout para formar la estructura general de la aplicación.

```plantuml
@startuml Arquitectura de Layout
package "Layout Structure" as layout {
    [App] as app
    [Router] as router
    [AuthProvider] as auth
    [ThemeProvider] as theme
}

package "Page Layout" as page_layout {
    [Header] as header
    [Sidebar] as sidebar
    [Main] as main
    [Footer] as footer
}

package "Dynamic Content" as content {
    [Dashboard] as dashboard
    [ModuleContainer] as module
    [BusinessComponents] as business
}

app --> router : Enrutamiento
app --> auth : Autenticación
app --> theme : Tema UI
router --> page_layout : Layout
page_layout --> content : Contenido
content --> business : Módulos

note right
    **Layout Architecture:**
    • App: Raíz con providers globales
    • Page Layout: Estructura base
    • Dynamic Content: Contenido adaptable
    • Responsive y accesible
end note
@enduml
```

**Explicación General del Sistema de Componentes UI:**

La arquitectura de componentes UI de la Plataforma ESAP sigue el patrón **Atomic Design** con una jerarquía clara de cuatro niveles:

1. **Atoms**: Componentes básicos (Button, Input, Icon) construidos con Radix UI
2. **Molecules**: Combinaciones funcionales (FormField, Card) con lógica específica
3. **Organisms**: Secciones completas (Header, DataTable) con estado local
4. **Business Components**: Módulos especializados (ESAP Modules, Portal) conectados al backend

Esta estructura permite desarrollo modular, reutilización de componentes, consistencia visual y mantenibilidad a largo plazo. Los componentes están construidos con **TypeScript** para type safety, **Tailwind CSS** para styling y **Radix UI** para accesibilidad WCAG AA garantizada.

### 17.3 Diagramas de Flujo de Datos por Microservicio

##GENERAL 
```plantuml
@startuml Flujo de Datos
actor Usuario
participant Frontend
participant API_Gateway
participant Microservicio
database PostgreSQL

Usuario -> Frontend: Interacción UI
Frontend -> API_Gateway: Request HTTP
API_Gateway -> API_Gateway: Validar JWT
API_Gateway -> Microservicio: Request interno
Microservicio -> PostgreSQL: Query/Update
PostgreSQL --> Microservicio: Resultado
Microservicio --> API_Gateway: Response
API_Gateway --> Frontend: Response HTTP
Frontend --> Usuario: Actualización UI
@enduml
```

#### 17.3.1 Auth Service - Flujo de Autenticación
**Descripción**: Muestra el proceso completo de login, validación JWT y gestión de sesiones.

```plantuml
@startuml Flujo Auth Service
actor Usuario
participant Frontend
participant API_Gateway
participant Auth_Service
database PostgreSQL
database Redis

== Inicio de Sesión ==
Usuario -> Frontend: Ingresar credenciales
Frontend -> API_Gateway: POST /auth/login
API_Gateway -> Auth_Service: Forward login request
Auth_Service -> PostgreSQL: Validar usuario/contraseña
PostgreSQL --> Auth_Service: Usuario válido

== Generación de Tokens ==
Auth_Service -> Auth_Service: Generar JWT + Refresh Token
Auth_Service -> Redis: Almacenar Refresh Token
Auth_Service --> API_Gateway: Tokens generados
API_Gateway --> Frontend: JWT + Refresh Token
Frontend -> Frontend: Almacenar en localStorage
Frontend --> Usuario: Acceso concedido

== Validación de Requests ==
Usuario -> Frontend: Operación protegida
Frontend -> API_Gateway: Request + JWT
API_Gateway -> Auth_Service: Validar JWT
Auth_Service -> Redis: Verificar sesión activa
Redis --> Auth_Service: Sesión válida
Auth_Service --> API_Gateway: Autorización OK
API_Gateway -> API_Gateway: Procesar request
@enduml
```

#### 17.3.2 Academic Registration Service - Flujo de Certificados
**Descripción**: Ilustra el proceso de generación y descarga de certificados académicos.

```plantuml
@startuml Flujo Academic Registration
actor Usuario
participant Frontend
participant API_Gateway
participant Academic_Service
database PostgreSQL
participant PDF_Generator
participant File_Storage

== Solicitud de Certificado ==
Usuario -> Frontend: Solicitar certificado
Frontend -> API_Gateway: POST /certificates/generate
API_Gateway -> Academic_Service: Validar elegibilidad
Academic_Service -> PostgreSQL: Verificar datos académicos
PostgreSQL --> Academic_Service: Datos válidos

== Generación de PDF ==
Academic_Service -> PDF_Generator: Generar certificado PDF
PDF_Generator -> PDF_Generator: Renderizar HTML template
PDF_Generator --> Academic_Service: PDF generado
Academic_Service -> File_Storage: Almacenar PDF
File_Storage --> Academic_Service: URL de descarga

== Respuesta al Usuario ==
Academic_Service --> API_Gateway: URL de descarga
API_Gateway --> Frontend: Enlace seguro
Frontend -> File_Storage: Descargar PDF
File_Storage --> Frontend: PDF certificado
Frontend --> Usuario: Certificado descargado
@enduml
```

#### 17.3.3 Certification Service - Flujo de Validación Blockchain
**Descripción**: Muestra el proceso de emisión de certificados con validación blockchain.

```plantuml
@startuml Flujo Certification Service
actor Usuario
participant Frontend
participant API_Gateway
participant Certification_Service
database PostgreSQL
participant Blockchain
participant QR_Generator
participant File_Storage

== Solicitud de Certificado ==
Usuario -> Frontend: Solicitar certificado laboral
Frontend -> API_Gateway: POST /certificates
API_Gateway -> Certification_Service: Procesar solicitud
Certification_Service -> PostgreSQL: Validar datos laborales
PostgreSQL --> Certification_Service: Datos confirmados

== Generación con Blockchain ==
Certification_Service -> QR_Generator: Crear código QR único
QR_Generator --> Certification_Service: QR generado
Certification_Service -> Certification_Service: Generar hash del documento
Certification_Service -> Blockchain: Timestamp inmutable
Blockchain --> Certification_Service: Transaction ID

== Almacenamiento Seguro ==
Certification_Service -> File_Storage: Guardar PDF + metadatos
File_Storage --> Certification_Service: Almacenamiento OK
Certification_Service --> API_Gateway: Certificado emitido
API_Gateway --> Frontend: Confirmación + enlace
Frontend --> Usuario: Certificado listo para descarga
@enduml
```

#### 17.3.4 Internal Control Service - Flujo de Auditorías
**Descripción**: Representa el workflow complejo de procesos de auditoría institucional.

```plantuml
@startuml Flujo Internal Control
actor Auditor
participant Frontend
participant API_Gateway
participant Control_Service
database PostgreSQL
participant Notification_Service

== Planificación de Auditoría ==
Auditor -> Frontend: Crear nueva auditoría
Frontend -> API_Gateway: POST /auditorias
API_Gateway -> Control_Service: Procesar creación
Control_Service -> PostgreSQL: Guardar auditoría (estado: PLANIFICADA)
PostgreSQL --> Control_Service: Auditoría creada

== Ejecución y Hallazgos ==
Control_Service -> Control_Service: Cambiar estado: EN_PROCESO
Control_Service -> Notification_Service: Notificar equipo auditor
Notification_Service --> Auditor: Notificación por email
Auditor -> Frontend: Registrar hallazgos
Frontend -> API_Gateway: POST /auditorias/{id}/hallazgos
API_Gateway -> Control_Service: Procesar hallazgo
Control_Service -> PostgreSQL: Guardar hallazgo

== Planes de Mejoramiento ==
Control_Service -> Control_Service: Estado: HALLAZGOS
Control_Service -> Notification_Service: Notificar responsables
Auditor -> Frontend: Crear plan de mejoramiento
Frontend -> API_Gateway: POST /planes-mejoramiento
API_Gateway -> Control_Service: Crear plan
Control_Service -> PostgreSQL: Guardar plan (estado: PENDIENTE)
PostgreSQL --> Control_Service: Plan creado

== Seguimiento ==
Control_Service -> Notification_Service: Recordatorios automáticos
Notification_Service --> Auditor: Actualizaciones de cumplimiento
@enduml
```

#### 17.3.5 Disciplinary Control Service - Flujo de Procesos Disciplinarios
**Descripción**: Ilustra el workflow de 8 estados para procesos disciplinarios formales.

```plantuml
@startuml Flujo Disciplinary Control
actor Abogado
participant Frontend
participant API_Gateway
participant Disciplinary_Service
database PostgreSQL
participant Document_Generator

== Inicio del Proceso ==
Abogado -> Frontend: Crear proceso disciplinario
Frontend -> API_Gateway: POST /process
API_Gateway -> Disciplinary_Service: Iniciar proceso
Disciplinary_Service -> PostgreSQL: Guardar (estado: RADICADA)
PostgreSQL --> Disciplinary_Service: Proceso creado

== Valoración Inicial ==
Disciplinary_Service -> Disciplinary_Service: Estado: EN_VALORACION
Disciplinary_Service -> Disciplinary_Service: Asignar abogado tratante
Disciplinary_Service -> PostgreSQL: Actualizar asignación

== Investigación ==
Abogado -> Frontend: Avanzar a investigación
Frontend -> API_Gateway: PATCH /process/{id}/stage
API_Gateway -> Disciplinary_Service: Cambiar estado
Disciplinary_Service -> PostgreSQL: Estado: INVESTIGACION
Disciplinary_Service -> Document_Generator: Generar auto legal
Document_Generator --> Disciplinary_Service: Auto generado

== Juzgamiento ==
Disciplinary_Service -> Disciplinary_Service: Estado: JUZGAMIENTO
Disciplinary_Service -> Disciplinary_Service: Aplicar reglas procesales
Disciplinary_Service -> PostgreSQL: Registrar deliberación

== Finalización ==
Disciplinary_Service -> Disciplinary_Service: Estado: FINALIZADO
Disciplinary_Service -> Document_Generator: Generar resolución final
Document_Generator --> Disciplinary_Service: Documento final
Disciplinary_Service --> API_Gateway: Proceso completado
@enduml
```

#### 17.3.6 Notification Service - Flujo Multi-canal
**Descripción**: Muestra el procesamiento asíncrono de notificaciones por múltiples canales.

```plantuml
@startuml Flujo Notification Service
actor Sistema
participant API_Gateway
participant Notification_Service
database PostgreSQL
participant Message_Queue
participant Email_Provider
participant SMS_Provider

== Recepción de Notificación ==
Sistema -> API_Gateway: Solicitud de notificación
API_Gateway -> Notification_Service: POST /notifications
Notification_Service -> PostgreSQL: Validar destinatarios
PostgreSQL --> Notification_Service: Destinatarios OK

== Procesamiento Asíncrono ==
Notification_Service -> Notification_Service: Renderizar templates
Notification_Service -> Message_Queue: Encolar notificaciones
Message_Queue --> Notification_Service: Encolado OK
Notification_Service --> API_Gateway: Notificación programada

== Envío Multi-canal ==
Message_Queue -> Notification_Service: Procesar cola
Notification_Service -> Email_Provider: Enviar emails
Notification_Service -> SMS_Provider: Enviar SMS
Email_Provider --> Notification_Service: Email enviado
SMS_Provider --> Notification_Service: SMS enviado

== Confirmación y Logging ==
Notification_Service -> PostgreSQL: Registrar resultados
PostgreSQL --> Notification_Service: Logging completado
Notification_Service -> Message_Queue: Marcar como procesado
@enduml
```


### 17.4 Diagrama de Estados del PTA

**Código PlantUML:**
```plantuml
@startuml Estados del PTA
[*] --> BORRADOR
BORRADOR --> EN_REVISION : Enviar a revisión
EN_REVISION --> APROBADO_NIVEL_1 : Aprobado nivel 1
EN_REVISION --> RECHAZADO : Rechazado
APROBADO_NIVEL_1 --> EN_REVISION : Corrección solicitada
APROBADO_NIVEL_1 --> APROBADO_NIVEL_2 : Aprobado nivel 2
APROBADO_NIVEL_2 --> APROBADO_FINAL : Aprobado final
APROBADO_NIVEL_2 --> EN_REVISION : Corrección solicitada
APROBADO_FINAL --> [*]
RECHAZADO --> BORRADOR : Corregir y reenviar
RECHAZADO --> [*] : Archivar
@enduml
```

**Explicación:** Máquina de estados que representa el flujo de aprobación de los Planes de Trabajo Académico, desde borrador hasta aprobación final, con estados intermedios y transiciones de corrección.

---


### 18 APIs de Microservicios - Referencia Detallada

Basado en el análisis del código fuente, a continuación se detalla la referencia completa de APIs expuestas por cada microservicio:

#### 18.1 Auth Service APIs (Puerto 3001)

**Autenticación:**
- `POST /auth/login` - Login de usuario
- `POST /auth/new-person` - Registro de nueva persona
- `PATCH /auth/change-password` - Cambio de contraseña
- `POST /auth/logout` - Logout de usuario
- `GET /auth/me` - Información del usuario actual
- `GET /auth/verify` - Verificación de token JWT

**Gestión de Usuarios:**
- `GET /users` - Listado de usuarios con filtros
- `GET /users/stats` - Estadísticas de usuarios
- `GET /users/:id` - Usuario específico
- `GET /users/modules` - Módulos disponibles
- `GET /users/permissions` - Permisos disponibles

**Roles y Permisos:**
- `GET /roles` - Listado de roles con filtros
- `GET /roles/stats` - Estadísticas de roles
- `GET /roles/:id` - Rol específico
- `POST /roles` - Crear rol
- `PUT /roles/:id` - Actualizar rol
- `DELETE /roles/:id` - Eliminar rol
- `POST /roles/:id/duplicate` - Duplicar rol
- `PATCH /roles/:id/toggle-active` - Activar/desactivar rol
- `PATCH /roles/:id/toggle-2fa` - Activar/desactivar 2FA
- `GET /roles/:id/permissions` - Permisos del rol
- `PUT /roles/:id/permissions` - Actualizar permisos del rol
- `GET /roles/permissions/all` - Todos los permisos disponibles

**Estructura Organizacional:**
- `GET /users/estructura-organizacional` - Estructura organizacional completa
- `GET /users/estadisticas` - Estadísticas organizacionales
- `GET /users/geopolitica/departamentos` - Departamentos
- `GET /users/geopolitica/departamentos/:id/ciudades` - Ciudades por departamento
- `GET /users/geopolitica/:id` - Información geopolítica
- `POST /users/sedes` - Crear sede
- `GET /users/sedes` - Listar sedes
- `GET /users/sedes/seccional/:id` - Sedes por seccional
- `GET /users/sedes/:id` - Sede específica
- `PUT /users/sedes/:id` - Actualizar sede
- `DELETE /users/sedes/:id` - Eliminar sede
- `POST /users/seccionales` - Crear seccional
- `GET /users/seccionales` - Listar seccionales
- `GET /users/seccionales/:id` - Seccional específica
- `PUT /users/seccionales/:id` - Actualizar seccional
- `DELETE /users/seccionales/:id` - Eliminar seccional

#### 18.2 Academic Registration Service APIs (Puerto 3002)

**Graduados:**
- `GET /graduates` - Listado de graduados
- `GET /graduates/:id` - Graduado específico
- `POST /graduates` - Crear graduado
- `PUT /graduates/:id` - Actualizar graduado
- `DELETE /graduates/:id` - Eliminar graduado
- `GET /graduates/:id/validate` - Validar graduado
- `GET /graduates/:id/certificate` - Obtener certificado

**Certificados:**
- `GET /certificates` - Listado de certificados
- `GET /certificates/:id` - Certificado específico
- `POST /certificates/generate/:graduateId` - Generar certificado
- `GET /certificates/:id/download` - Descargar certificado
- `PUT /certificates/:id` - Actualizar certificado

#### 18.3 Certification Service APIs (Puerto 3004)

**Solicitudes de Certificado:**
- `GET /certificates/solicitudes` - Listado de solicitudes
- `GET /certificates/solicitudes/:id` - Solicitud específica
- `GET /certificates/solicitudes/person/:personId` - Solicitudes por persona
- `POST /certificates/solicitudes` - Crear solicitud
- `PUT /certificates/solicitudes/:id` - Actualizar solicitud

**Certificados:**
- `GET /certificates/certificados` - Listado de certificados
- `GET /certificates/certificados/verify/:codigo` - Verificar certificado público
- `GET /certificates/certificados/:codigo/validations` - Historial de validaciones
- `POST /certificates/certificados/generate/:solicitudId` - Generar certificado
- `GET /certificates/certificados/:id/download-docx` - Descargar DOCX
- `GET /certificates/certificados/:id` - Certificado específico
- `POST /certificates/certificados/:id/reenviar` - Reenviar certificado

**Firmantes:**
- `GET /certificates/firmantes` - Listado de firmantes
- `GET /certificates/firmantes/principal` - Firmante principal

**Plantillas:**
- `GET /certificates/plantillas/:tipo` - Plantilla activa por tipo

**Auto-servicio:**
- `POST /certificates/autoservicio/verificar-documento` - Verificar documento
- `POST /certificates/autoservicio/generar-codigo` - Generar código de validación
- `POST /certificates/autoservicio/validar-codigo` - Validar código

**Configuración de Plantillas:**
- `GET /certificates/template-config` - Obtener configuración
- `POST /certificates/template-config/signer-name` - Actualizar nombre del firmante
- `POST /certificates/template-config/upload-signature` - Subir firma
- `POST /certificates/template-config/upload-logo` - Subir logo
- `POST /certificates/template-config/reset-*` - Resetear configuraciones
- `POST /certificates/template-config/revert-change` - Revertir cambio
- `GET /certificates/template-config/change-history` - Historial de cambios
- `POST /certificates/template-config/content` - Actualizar contenido

#### 18.4 Internal Control Service APIs (Puerto 3007)

**Auditorías:**
- `GET /auditorias` - Listado de auditorías
- `GET /auditorias/estadisticas` - Estadísticas de auditorías
- `GET /auditorias/fase/:fase` - Auditorías por fase
- `GET /auditorias/:id` - Auditoría específica
- `POST /auditorias` - Crear auditoría
- `PATCH /auditorias/:id` - Actualizar auditoría
- `DELETE /auditorias/:id` - Eliminar auditoría
- `POST /auditorias/:id/aprobar` - Aprobar auditoría
- `POST /auditorias/:id/rechazar` - Rechazar auditoría
- `POST /auditorias/:id/modificacion` - Solicitar modificación
- `GET /auditorias/kanban/all` - Vista Kanban
- `GET /auditorias/kanban/archivadas` - Auditorías archivadas
- `GET /auditorias/personas/buscar` - Buscar persona
- `GET /auditorias/personas/disponibles` - Personas disponibles
- `GET /auditorias/codigo/:codigo` - Auditoría por código
- `GET /auditorias/:id/hallazgos` - Hallazgos de auditoría
- `GET /auditorias/:id/notas` - Notas de auditoría
- `GET /auditorias/:id/historial` - Historial de auditoría

**Notas de Auditoría:**
- `POST /auditorias/:id/notas` - Crear nota
- `PATCH /auditorias/:id/notas/:notaId` - Actualizar nota
- `DELETE /auditorias/:id/notas/:notaId` - Eliminar nota
- `PATCH /auditorias/:id/notas/:notaId/importante` - Marcar como importante

**Ampliación de Plazo:**
- `POST /auditorias/:id/ampliar-plazo/solicitar` - Solicitar ampliación
- `POST /auditorias/:id/ampliar-plazo/aprobar` - Aprobar ampliación
- `POST /auditorias/:id/ampliar-plazo/rechazar` - Rechazar ampliación
- `GET /auditorias/ampliar-plazo/pendientes` - Solicitudes pendientes

**Hallazgos:**
- `GET /hallazgos` - Listado de hallazgos
- `GET /hallazgos/categoria/criticos` - Hallazgos críticos
- `GET /hallazgos/categoria/controversias` - Hallazgos controversias
- `GET /hallazgos/categoria/borradores` - Hallazgos borradores
- `GET /hallazgos/:id` - Hallazgo específico
- `POST /hallazgos` - Crear hallazgo
- `PUT /hallazgos/:id` - Actualizar hallazgo
- `DELETE /hallazgos/:id` - Eliminar hallazgo

**Planes de Mejoramiento:**
- `GET /planes-mejoramiento` - Listado de planes
- `GET /planes-mejoramiento/:id` - Plan específico
- `GET /planes-mejoramiento/hallazgo/:hallazgoId` - Planes por hallazgo
- `POST /planes-mejoramiento` - Crear plan
- `PUT /planes-mejoramiento/:id` - Actualizar plan
- `DELETE /planes-mejoramiento/:id` - Eliminar plan
- `POST /planes-mejoramiento/:id/aprobar` - Aprobar plan
- `POST /planes-mejoramiento/:id/rechazar` - Rechazar plan
- `GET /planes-mejoramiento/:id/seguimiento` - Seguimiento del plan
- `POST /planes-mejoramiento/:id/avance` - Registrar avance
- `GET /planes-mejoramiento/:id/semaforo` - Estado semáforo
- `GET /planes-mejoramiento/:id/eventos` - Eventos timeline

**Acciones de Planes:**
- `POST /planes-mejoramiento/:planId/acciones` - Crear acción
- `PUT /planes-mejoramiento/:planId/acciones/:accionId` - Actualizar acción
- `DELETE /planes-mejoramiento/:planId/acciones/:accionId` - Eliminar acción
- `POST /planes-mejoramiento/:planId/acciones/:accionId/evidencias` - Cargar evidencia
- `POST /planes-mejoramiento/:planId/acciones/:accionId/evidencias/:evidenciaId/validar` - Validar evidencia

**Seguimientos:**
- `POST /planes-mejoramiento/:planId/seguimientos/:seguimientoId/registros` - Crear registro
- `POST /planes-mejoramiento/:planId/eventos` - Crear evento timeline

**Documentos:**
- `GET /documentos` - Listado de documentos
- `GET /documentos/:id` - Documento específico
- `POST /documentos` - Crear documento
- `PUT /documentos/:id` - Actualizar documento
- `DELETE /documentos/:id` - Eliminar documento
- `GET /documentos/:id/download` - Descargar documento
- `GET /documentos/:id/preview` - Vista previa
- `GET /documentos/:id/versiones` - Versiones del documento
- `GET /documentos/auditoria/:auditoriaId` - Documentos por auditoría
- `GET /documentos/auditoria/:auditoriaId/etapa/:etapa` - Documentos por etapa
- `POST /documentos/:id/sincronizar` - Sincronizar documento

**Documentos de Planes:**
- `POST /planes-mejoramiento/:planId/documentos` - Crear documento
- `GET /planes-mejoramiento/:planId/documentos` - Listar documentos
- `GET /planes-mejoramiento/:planId/documentos/:id` - Documento específico
- `GET /planes-mejoramiento/:planId/documentos/:id/descargar` - Descargar documento
- `DELETE /planes-mejoramiento/:planId/documentos/:id` - Eliminar documento

**Evidencias:**
- `POST /evidencias` - Crear evidencia
- `GET /evidencias/accion/:accionId` - Evidencias por acción
- `GET /evidencias/hallazgo/:hallazgoId` - Evidencias por hallazgo
- `GET /evidencias/plan/:planId` - Evidencias por plan
- `GET /evidencias/auditoria/:auditoriaId` - Evidencias por auditoría
- `GET /evidencias/:id` - Evidencia específica
- `GET /evidencias/:id/download` - Descargar evidencia
- `GET /evidencias/:id/preview` - Vista previa
- `POST /evidencias/:id/validar` - Validar evidencia
- `DELETE /evidencias/:id` - Eliminar evidencia

**Tipos de Auditoría:**
- `GET /tipos-auditoria` - Listado de tipos
- `GET /tipos-auditoria/:id` - Tipo específico
- `POST /tipos-auditoria` - Crear tipo
- `PATCH /tipos-auditoria/:id` - Actualizar tipo
- `DELETE /tipos-auditoria/:id` - Eliminar tipo
- `POST /tipos-auditoria/:id/restore` - Restaurar tipo

**Tableros Kanban:**
- `GET /tableros-kanban` - Listado de tableros
- `GET /tableros-kanban/:id` - Tablero específico
- `GET /tableros-kanban/tipo/:tipo` - Tableros por tipo
- `POST /tableros-kanban` - Crear tablero
- `PATCH /tableros-kanban/:id` - Actualizar tablero
- `DELETE /tableros-kanban/:id` - Eliminar tablero
- `POST /tableros-kanban/:id/restore` - Restaurar tablero
- `POST /tableros-kanban/:tableroId/etapas` - Crear etapa
- `PATCH /tableros-kanban/:tableroId/etapas/:etapaId` - Actualizar etapa
- `DELETE /tableros-kanban/:tableroId/etapas/:etapaId` - Eliminar etapa
- `POST /tableros-kanban/:tableroId/etapas/reordenar` - Reordenar etapas

**Programa Anual:**
- `GET /programa-anual` - Listado de programas
- `GET /programa-anual/:id` - Programa específico
- `POST /programa-anual` - Crear programa
- `PUT /programa-anual/:id` - Actualizar programa
- `DELETE /programa-anual/:id` - Eliminar programa
- `POST /programa-anual/:id/importar-auditorias` - Importar auditorías
- `GET /programa-anual/:id/auditorias` - Auditorías del programa
- `GET /programa-anual/:id/cronograma` - Cronograma del programa
- `POST /programa-anual/auditorias/:auditoriaId/ampliar-plazo` - Ampliar plazo

**Plan Individual:**
- `GET /plan-individual` - Listado de planes
- `GET /plan-individual/:id` - Plan específico
- `POST /plan-individual` - Crear plan
- `PUT /plan-individual/:id` - Actualizar plan
- `DELETE /plan-individual/:id` - Eliminar plan
- `POST /plan-individual/:id/enviar` - Enviar plan
- `POST /plan-individual/:id/aceptar` - Aceptar plan
- `GET /plan-individual/auditoria/:auditoriaId` - Planes por auditoría

**Listas de Chequeo:**
- `GET /listas-chequeo` - Listado de listas
- `GET /listas-chequeo/:id` - Lista específica
- `POST /listas-chequeo` - Crear lista
- `PATCH /listas-chequeo/:id` - Actualizar lista
- `DELETE /listas-chequeo/:id` - Eliminar lista
- `POST /listas-chequeo/:id/restore` - Restaurar lista

**Notificaciones:**
- `GET /notificaciones/usuario/:usuarioId` - Notificaciones por usuario
- `GET /notificaciones/usuario/:usuarioId/no-leidas` - No leídas
- `GET /notificaciones/usuario/:usuarioId/conteo` - Conteo no leídas
- `POST /notificaciones` - Crear notificación
- `PUT /notificaciones/:id/leida` - Marcar como leída
- `PUT /notificaciones/usuario/:usuarioId/todas-leidas` - Marcar todas leídas
- `PUT /notificaciones/:id/archivar` - Archivar notificación
- `DELETE /notificaciones/:id` - Eliminar notificación
- `GET /notificaciones/preferencias/:usuarioId` - Preferencias
- `PUT /notificaciones/preferencias/:usuarioId` - Actualizar preferencias
- `GET /notificaciones/debug/:usuarioId` - Debug usuario
- `GET /notificaciones/todas` - Todas las notificaciones
- `POST /notificaciones/ejecutar-job-automatico` - Ejecutar job automático
- `GET /notificaciones/debug-datos` - Debug datos

**Aprobaciones:**
- `POST /aprobaciones` - Crear aprobación
- `GET /aprobaciones` - Listado de aprobaciones
- `GET /aprobaciones/pendientes` - Aprobaciones pendientes
- `GET /aprobaciones/estadisticas` - Estadísticas
- `GET /aprobaciones/:id` - Aprobación específica
- `POST /aprobaciones/:id/aprobar` - Aprobar
- `POST /aprobaciones/:id/rechazar` - Rechazar
- `PUT /aprobaciones/:id` - Actualizar
- `DELETE /aprobaciones/:id` - Eliminar

**Informes de Ley:**
- `GET /informes-ley` - Listado de informes
- `GET /informes-ley/estadisticas` - Estadísticas
- `GET /informes-ley/estadisticas/categoria` - Estadísticas por categoría
- `GET /informes-ley/estadisticas/periodicidad` - Estadísticas por periodicidad
- `GET /informes-ley/calendario/:year` - Calendario anual
- `GET /informes-ley/proximos-vencimientos` - Próximos vencimientos
- `GET /informes-ley/vencidos` - Entregas vencidas
- `GET /informes-ley/:id` - Informe específico
- `GET /informes-ley/codigo/:codigo` - Informe por código
- `POST /informes-ley` - Crear informe
- `PATCH /informes-ley/:id` - Actualizar informe
- `DELETE /informes-ley/:id` - Eliminar informe
- `GET /informes-ley/entregas/all` - Todas las entregas
- `GET /informes-ley/:informeId/entregas` - Entregas por informe
- `GET /informes-ley/entregas/:id` - Entrega específica
- `POST /informes-ley/entregas` - Crear entrega
- `PATCH /informes-ley/entregas/:id` - Actualizar entrega
- `DELETE /informes-ley/entregas/:id` - Eliminar entrega
- `POST /informes-ley/actualizar-estados-vencidos` - Actualizar estados vencidos
- `POST /informes-ley/:id/generar` - Generar informe
- `POST /informes-ley/:informeId/entregas/:entregaId/enviar` - Enviar revisión
- `POST /informes-ley/:informeId/entregas/:entregaId/aprobar` - Aprobar informe
- `POST /informes-ley/:informeId/entregas/:entregaId/rechazar` - Rechazar informe
- `GET /informes-ley/entregas/:entregaId/workflow` - Workflow de entrega
- `GET /informes-ley/entregas/:entregaId/historial` - Historial de entrega
- `POST /informes-ley/entregas/:entregaId/upload` - Subir archivo
- `GET /informes-ley/archivos/:nombreArchivo` - Servir archivo

#### 18.5 Disciplinary Control Service APIs (Puerto 3005)

**Procesos Disciplinarios:**
- `GET /process/stats` - Estadísticas de procesos
- `GET /process/:id/statistics` - Estadísticas de proceso específico
- `POST /process/assign` - Asignar proceso
- `PATCH /process/:id` - Actualizar proceso
- `GET /process/by-radicado/:radicado` - Proceso por radicado
- `PATCH /process/:id/stage` - Cambiar etapa del proceso
- `PATCH /process/:id/evidence` - Agregar evidencia
- `POST /process/:id/documents` - Crear documento
- `GET /process/:id/documents` - Documentos del proceso
- `GET /process/:id/documents/:documentId/download` - Descargar documento
- `DELETE /process/:id/documents/:documentId` - Eliminar documento
- `GET /process/my-processes` - Mis procesos
- `GET /process` - Listado de procesos
- `GET /process/:id` - Proceso específico
- `DELETE /process/:id` - Eliminar proceso

**Evidencias:**
- `POST /evidence/upload` - Subir evidencia
- `GET /evidence/:filename` - Obtener evidencia
- `GET /evidence/download/:filename` - Descargar evidencia

**Autos Legales:**
- `POST /auto` - Crear auto
- `GET /auto` - Listado de autos
- `GET /auto/by-process/:processId` - Autos por proceso
- `PUT /auto/:id` - Actualizar auto
- `PATCH /auto/:id/send-review` - Enviar a revisión
- `PATCH /auto/:id/approve` - Aprobar auto
- `PATCH /auto/:id/sign` - Firmar auto
- `PATCH /auto/:id/notify` - Notificar auto
- `GET /auto/:id/versions` - Versiones del auto
- `DELETE /auto/:id` - Eliminar auto
- `GET /auto/:id/pdf` - PDF del auto
- `GET /auto/:id/versions/:version/pdf` - PDF de versión específica
- `GET /auto/:id/onlyoffice-config` - Configuración OnlyOffice
- `POST /auto/onlyoffice/callback` - Callback OnlyOffice

**Alertas:**
- `GET /alertas` - Listado de alertas
- `GET /alertas/:id` - Alerta específica

**Profesionales:**
- `GET /professional/workload` - Carga de trabajo
- `GET /professional` - Listado de profesionales
- `POST /professional` - Crear profesional
- `PATCH /professional/:id` - Actualizar profesional
- `POST /professional/:id/signature` - Subir firma
- `GET /professional/candidates` - Candidatos disponibles
- `DELETE /professional/:id` - Eliminar profesional

**Configuración:**
- `GET /configuration/available-roles` - Roles disponibles
- `GET /configuration/stages` - Configuración de etapas
- `PUT /configuration/stages` - Actualizar etapas
- `GET /configuration/global` - Configuración global
- `PUT /configuration/global` - Actualizar configuración global
- `GET /configuration/seed` - Seed inicial

**Términos Procesales:**
- `GET /terminos-procesales` - Listado de términos
- `GET /terminos-procesales/:id` - Término específico
- `POST /terminos-procesales` - Crear término
- `PUT /terminos-procesales/:id` - Actualizar término
- `PATCH /terminos-procesales/:id/marcar-cumplido` - Marcar cumplido
- `POST /terminos-procesales/recalcular` - Recalcular términos
- `DELETE /terminos-procesales/:id` - Eliminar término

**Reglas de Alerta:**
- `GET /reglas-alerta` - Listado de reglas
- `GET /reglas-alerta/:id` - Regla específica
- `POST /reglas-alerta` - Crear regla
- `PUT /reglas-alerta/:id` - Actualizar regla
- `PATCH /reglas-alerta/:id/toggle` - Activar/desactivar regla
- `DELETE /reglas-alerta/:id` - Eliminar regla

**Autos Legales (Templates):**
- `GET /auto-templates/config` - Configuración de templates
- `PUT /auto-templates/config` - Actualizar configuración

**Noticias Disciplinarias:**
- `POST /news` - Crear noticia
- `GET /news/pending-assignment` - Pendientes de asignación
- `GET /news` - Listado de noticias
- `GET /news/:id` - Noticia específica
- `PATCH /news/:id/return` - Devolver noticia
- `PATCH /news/:id/status` - Cambiar estado
- `PATCH /news/:id/kanban` - Actualizar Kanban
- `DELETE /news/:id` - Eliminar noticia
- `PATCH /news/:id/archive` - Archivar noticia

**Días Festivos:**
- `GET /dias-festivos` - Listado de días festivos
- `GET /dias-festivos/:id` - Día festivo específico
- `POST /dias-festivos` - Crear día festivo
- `PUT /dias-festivos/:id` - Actualizar día festivo
- `DELETE /dias-festivos/:id` - Eliminar día festivo

**Jobs:**
- `POST /jobs/recalcular-terminos` - Recalcular términos
- `POST /jobs/enviar-alertas` - Enviar alertas

### 19 Conclusiones del Análisis

La **Plataforma Comunidad ESAP** representa una implementación técnica robusta y moderna de una aplicación web compleja de gestión académica y administrativa. Los siguientes aspectos destacan:

#### Fortalezas Técnicas:
1. **Arquitectura Moderna**: Microservicios bien diseñados con responsabilidades claras
2. **Stack Tecnológico Actual**: Uso de las mejores prácticas y tecnologías actuales
3. **Seguridad Integral**: Implementación completa de autenticación, autorización y protección de datos
4. **Escalabilidad**: Diseño preparado para crecimiento horizontal y vertical
5. **Mantenibilidad**: Código bien estructurado con TypeScript y patrones consistentes

#### Complejidad del Sistema:
- **11 microservicios** coordinados vía API Gateway
- **100+ migraciones** de base de datos indicando evolución continua
- **Múltiples módulos frontend** con funcionalidades especializadas
- **Integración compleja** con sistemas externos y blockchain

#### Madurez del Proyecto:
- **Producción ready** con configuraciones multi-entorno
- **Documentación técnica** completa y actualizada
- **DevOps preparado** con Docker y scripts de despliegue
- **Cumple estándares** de calidad y mejores prácticas

Esta plataforma demuestra un alto nivel de sofisticación técnica y está preparada para manejar las necesidades complejas de una institución educativa como la ESAP.

---

## APÉNDICE A: GLOSARIO DE TÉRMINOS

- **Micro-frontend**: Arquitectura que permite dividir una aplicación frontend en módulos independientes
- **RBAC**: Role-Based Access Control, sistema de control de acceso basado en roles
- **JWT**: JSON Web Token, estándar para tokens de acceso
- **SPA**: Single Page Application, aplicación que carga una sola página HTML
- **PWA**: Progressive Web App, aplicación web con capacidades nativas
- **TypeORM**: Object-Relational Mapping para TypeScript/Node.js
- **NestJS**: Framework Node.js para APIs escalables
- **Radix UI**: Biblioteca de componentes accesibles sin estilos
- **TanStack Query**: Librería para gestión de estado del servidor
- **Puppeteer**: Herramienta para control de navegadores Chrome/Chromium

## APÉNDICE B: HISTORIAL DE CAMBIOS

| Versión | Fecha | Descripción | Autor |
|---------|-------|-------------|-------|
| 1.0 | 2024-01-27 | Documentación inicial completa | Sistema |
| 1.1 | 2024-01-27 | Análisis técnico detallado del código fuente | Arquitecto del Sistema |