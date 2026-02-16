# DIAGRAMAS ADICIONALES DE ARQUITECTURA - PLATAFORMA ESAP

## 1. DIAGRAMAS POR MICROSERVICIO

### 1.1 Auth Service - Arquitectura Interna

**Código PlantUML:**
```plantuml
@startuml Auth Service - Arquitectura Interna
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

**Explicación:** Arquitectura interna del Auth Service mostrando la estructura completa de componentes para autenticación y autorización. El AuthController maneja endpoints REST como login/register, el AuthService implementa la lógica de negocio para validación de credenciales y generación de tokens JWT. La JwtStrategy valida tokens en requests entrantes, mientras UsersService gestiona operaciones CRUD de usuarios y roles. El EmailService maneja envío de correos para recuperación de contraseña. La persistencia se realiza en PostgreSQL con esquemas para usuarios, roles, permisos y sesiones, complementado por Redis para cache de sesiones activas y lista negra de tokens revocados.

### 1.2 Academic Registration Service - Flujo de Certificados

**Código PlantUML:**
```plantuml
@startuml Academic Registration - Flujo de Certificados
actor Usuario
participant Controller
participant GraduationService
participant PDFGenerator
participant TemplateEngine
database PostgreSQL

Usuario -> Controller: Solicitar certificado
Controller -> GraduationService: Validar graduado
GraduationService -> PostgreSQL: Consultar datos
PostgreSQL --> GraduationService: Datos del graduado
GraduationService -> TemplateEngine: Generar HTML
TemplateEngine -> PDFGenerator: Convertir a PDF
PDFGenerator --> Controller: PDF generado
Controller --> Usuario: Descargar certificado
@enduml
```

**Explicación:** Diagrama de secuencia que muestra el flujo completo de generación de certificados de graduación. El proceso inicia con la solicitud del usuario al Controller, que valida la elegibilidad consultando el GraduationService. Los datos del graduado se obtienen de PostgreSQL, luego se genera el HTML mediante TemplateEngine y finalmente se convierte a PDF con PDFGenerator para descarga por el usuario.

### 1.3 Certification Service - Arquitectura Interna

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

**Explicación:** Arquitectura interna del Certification Service especializado en emisión y validación de certificados. Incluye controllers para gestión de certificados y plantillas, servicios para generación de PDFs y códigos QR, integración con blockchain para validación inmutable, y conexión con OnlyOffice para edición de plantillas.

### 1.4 Internal Control Service - Arquitectura Interna

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

**Explicación:** Arquitectura interna del Internal Control Service para gestión de auditorías institucionales. Incluye controllers para auditorías, hallazgos y planes de mejoramiento, motor de workflows con máquina de estados, servicios de notificaciones y reportes, conectando con base de datos especializada en procesos de control interno.

### 1.5 Disciplinary Control Service - Arquitectura Interna

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

**Explicación:** Arquitectura interna del Disciplinary Control Service para procesos disciplinarios formales. Incluye controllers para procesos, evidencias y autos legales, máquina de estados completa del proceso disciplinario, servicios de validación documental y plantillas legales especializadas.

### 1.6 Notification Service - Arquitectura Interna

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

**Explicación:** Arquitectura interna del Notification Service para comunicaciones multi-canal. Incluye controllers para email, SMS y push notifications, sistema de colas para procesamiento asíncrono, motor de plantillas dinámicas, y configuración de proveedores externos (SMTP, SMS gateways).

### 1.7 API Gateway - Arquitectura Interna

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

**Explicación:** Arquitectura interna del API Gateway como punto de entrada único del sistema. Incluye middlewares de autenticación y rate limiting, balanceo de carga, circuit breaker para resiliencia, validación de seguridad, y sistema completo de monitoreo con métricas, logs y tracing distribuido.

## 2. DIAGRAMAS POR MÓDULO FRONTEND

### 2.1 Módulo Control Interno - Arquitectura

**Código PlantUML:**
```plantuml
@startuml Módulo Control Interno
package "Control Interno Module" as module {
    package "Components" as components {
        [AuditoriaForm]
        [HallazgosTable]
        [PlanesMejoramiento]
        [DashboardAuditor]
    }

    package "Hooks" as hooks {
        [useAuditLog]
        [useControlInternoPermissions]
        [useNotificacionesControlInterno]
    }

    package "Services" as services {
        [auditLogService]
        [listasChequeoService]
        [tablerosKanbanService]
    }

    package "Context" as context {
        [ControlInternoContext]
    }
}

package "API Integration" as api {
    [Academic Service]
    [Audit Service]
    [Notification Service]
}

components --> hooks
hooks --> services
services --> api
context --> components
@enduml
```

**Explicación:** Arquitectura del módulo frontend de Control Interno organizada por capas. Los componentes (AuditoriaForm, HallazgosTable, etc.) utilizan hooks personalizados (useAuditLog, useControlInternoPermissions) para lógica reutilizable. Los servicios (auditLogService, listasChequeoService) manejan llamadas API, mientras el ControlInternoContext proporciona estado global. Se integra con Academic Service, Audit Service y Notification Service del backend.

### 2.2 Módulo Disciplinario - Estados de Procesos

**Código PlantUML:**
```plantuml
@startuml Estados del Proceso Disciplinario
[*] --> RADICADA : Nueva noticia
RADICADA --> EN_VALORACION : Asignar abogado
EN_VALORACION --> ASIGNADA : Abogado asignado
ASIGNADA --> DEVUELTA : Devolver noticia

ASIGNADA --> EVALUACION : Iniciar proceso
EVALUACION --> INDAGACION_PREVIA : Indagación inicial
INDAGACION_PREVIA --> INVESTIGACION : Investigación formal
INVESTIGACION --> JUZGAMIENTO : Fase de juicio
JUZGAMIENTO --> [*] : Resolución final

EVALUACION --> ARCHIVADO : Archivo del caso
INDAGACION_PREVIA --> ARCHIVADO
INVESTIGACION --> ARCHIVADO
JUZGAMIENTO --> ARCHIVADO
@enduml
```

**Explicación:** Máquina de estados que representa el flujo completo del proceso disciplinario en ESAP. Comienza con RADICADA (noticia disciplinaria registrada), pasa por EN_VALORACION (asignación de abogado) y ASIGNADA (abogado confirmado). El proceso puede devolverse (DEVUELTA) o continuar a EVALUACION, INDAGACION_PREVIA, INVESTIGACION y JUZGAMIENTO. En cualquier etapa puede archivarse (ARCHIVADO) o llegar a resolución final.

## 3. DIAGRAMAS DE FLUJO ESPECÍFICOS

### 3.1 Flujo de Autenticación Completo

**Código PlantUML:**
```plantuml
@startuml Flujo de Autenticación Detallado
actor Usuario
participant Frontend
participant API_Gateway
participant Auth_Service
participant Users_DB
participant Redis_Cache

Usuario -> Frontend: Ingresar credenciales
Frontend -> Frontend: Validar formato
Frontend -> API_Gateway: POST /auth/login
API_Gateway -> API_Gateway: Rate limiting check
API_Gateway -> Auth_Service: Forward login request

Auth_Service -> Users_DB: Query user by email
Users_DB --> Auth_Service: User data + hashed password
Auth_Service -> Auth_Service: Verify password (bcrypt)
Auth_Service -> Auth_Service: Generate JWT + Refresh Token

Auth_Service -> Redis_Cache: Store refresh token
Auth_Service --> API_Gateway: Success + tokens
API_Gateway -> Frontend: JWT + refresh token

Frontend -> Frontend: Store tokens (localStorage)
Frontend -> Frontend: Set auth headers for future requests
Frontend --> Usuario: Login successful + redirect
@enduml
```

**Explicación:** Diagrama de secuencia detallado del flujo de autenticación completo. El usuario ingresa credenciales que se validan en frontend, luego pasan por rate limiting en API Gateway. El Auth Service consulta PostgreSQL para verificar credenciales, genera tokens JWT y refresh tokens, almacena el refresh en Redis, y devuelve tokens al frontend para almacenamiento seguro en localStorage.

### 3.2 Flujo de Aprobación del PTA

**Código PlantUML:**
```plantuml
@startuml Flujo de Aprobación PTA
actor Docente
participant PTA_Module
participant API_Gateway
participant Academic_Service
participant Notification_Service
database PTA_DB

Docente -> PTA_Module: Crear/Editar PTA
PTA_Module -> PTA_Module: Validar datos
PTA_Module -> API_Gateway: POST /pta
API_Gateway -> Academic_Service: Process PTA
Academic_Service -> PTA_DB: Save PTA (BORRADOR)
Academic_Service --> API_Gateway: PTA created
API_Gateway --> PTA_Module: Success

Docente -> PTA_Module: Enviar a revisión
PTA_Module -> API_Gateway: PATCH /pta/{id}/submit
API_Gateway -> Academic_Service: Update status
Academic_Service -> PTA_DB: Status = EN_REVISION
Academic_Service -> Notification_Service: Notify reviewers
Notification_Service -> Docente: Email notification
@enduml
```

**Explicación:** Diagrama de secuencia del flujo de aprobación del PTA. El docente crea/edita el PTA en el módulo frontend, que valida datos localmente antes de enviar al API Gateway. El Academic Service guarda como BORRADOR en PostgreSQL. Al enviar a revisión, cambia status a EN_REVISION y notifica automáticamente a revisores mediante Notification Service.

## 4. DIAGRAMA GENERAL DE ARQUITECTURA COMPLETA (C4)

**Código PlantUML:**
```plantuml
@startuml Arquitectura General Completa
!include https://raw.githubusercontent.com/plantuml-stdlib/C4-PlantUML/master/C4_Context.puml
!include https://raw.githubusercontent.com/plantuml-stdlib/C4-PlantUML/master/C4_Container.puml

Person(user, "Usuario", "Docente, Administrativo, Estudiante")
System_Boundary(esap, "Plataforma ESAP") {
    Container(frontend, "Frontend React", "TypeScript, React", "SPA con micro-frontends")
    Container(api_gateway, "API Gateway", "NestJS", "Enrutamiento y autenticación")

    Container(auth_svc, "Auth Service", "NestJS", "Autenticación y autorización")
    Container(academic_svc, "Academic Registration", "NestJS", "Gestión académica")
    Container(cert_svc, "Certification Service", "NestJS", "Emisión de certificados")
    Container(audit_svc, "Internal Control", "NestJS", "Auditorías institucionales")
    Container(disciplinary_svc, "Disciplinary Control", "NestJS", "Procesos disciplinarios")
    Container(notification_svc, "Notification Service", "NestJS", "Sistema de notificaciones")

    ContainerDb(postgres, "PostgreSQL", "Base de datos", "Datos multi-tenant")
    ContainerDb(redis, "Redis", "Cache", "Sesiones y datos temporales")
}

System_Ext(onlyoffice, "OnlyOffice", "Documentos colaborativos")
System_Ext(smtp, "SMTP Server", "Envío de correos")

Rel(user, frontend, "Usa")
Rel(frontend, api_gateway, "HTTP/HTTPS", "API calls")
Rel(api_gateway, auth_svc, "Autentica")
Rel(api_gateway, academic_svc, "Gestión académica")
Rel(api_gateway, cert_svc, "Certificados")
Rel(api_gateway, audit_svc, "Auditorías")
Rel(api_gateway, disciplinary_svc, "Procesos disciplinarios")
Rel(api_gateway, notification_svc, "Notificaciones")

Rel(auth_svc, postgres, "Persistencia")
Rel(academic_svc, postgres, "Persistencia")
Rel(cert_svc, postgres, "Persistencia")
Rel(audit_svc, postgres, "Persistencia")
Rel(disciplinary_svc, postgres, "Persistencia")
Rel(notification_svc, postgres, "Persistencia")

Rel(frontend, redis, "Sesiones")
Rel(notification_svc, smtp, "Envío de correos")
Rel(frontend, onlyoffice, "Edición de documentos")
@enduml
```

**Explicación:** Diagrama C4 completo de la arquitectura general de ESAP mostrando el contexto del sistema. El usuario interactúa con el frontend React y portal público, que se comunican con el API Gateway. Este enruta requests a 8 microservicios especializados (Auth, Academic Registration, Certification, etc.) que persisten en PostgreSQL y Redis. Incluye integraciones con servicios externos como SMTP, OnlyOffice y blockchain.

## 5. DIAGRAMAS DE COMPONENTES DETALLADOS

### 5.1 Arquitectura de Componentes por Patrón Atomic Design

**Código PlantUML:**
```plantuml
@startuml Arquitectura de Componentes - Atomic Design
package "Atoms (Átomos)" as atoms {
    package "Basic" as basic {
        [Button] as btn
        [Input] as input
        [Icon] as icon
        [Typography] as typo
    }

    package "Form" as form {
        [Checkbox] as check
        [Radio] as radio
        [Select] as select
        [Textarea] as textarea
    }

    package "Feedback" as feedback {
        [Spinner] as spinner
        [Alert] as alert
        [Toast] as toast
        [Badge] as badge
    }
}

package "Molecules (Moléculas)" as molecules {
    package "Form Controls" as form_ctrl {
        [FormField] as formfield
        [InputGroup] as inputgroup
        [DatePicker] as datepicker
        [FileUpload] as fileupload
    }

    package "Navigation" as nav {
        [Breadcrumb] as breadcrumb
        [Pagination] as pagination
        [Tabs] as tabs
        [Menu] as menu
    }

    package "Data Display" as data {
        [Card] as card
        [List] as list
        [Table] as table
        [Avatar] as avatar
    }
}

package "Organisms (Organismos)" as organisms {
    package "Layout" as layout {
        [Header] as header
        [Sidebar] as sidebar
        [Footer] as footer
        [MainLayout] as mainlayout
    }

    package "Forms" as forms {
        [LoginForm] as loginform
        [RegistrationForm] as regform
        [SearchForm] as searchform
        [FilterForm] as filterform
    }

    package "Data Tables" as tables {
        [DataTable] as datatable
        [KanbanBoard] as kanban
        [DashboardGrid] as dashboard
        [ReportTable] as report
    }
}

package "Templates (Plantillas)" as templates {
    [DashboardTemplate] as dashboard_temp
    [FormTemplate] as form_temp
    [ListTemplate] as list_temp
    [DetailTemplate] as detail_temp
}

package "Pages (Páginas)" as pages {
    [LoginPage] as login_page
    [DashboardPage] as dashboard_page
    [ProfilePage] as profile_page
    [SettingsPage] as settings_page
}

atoms --> molecules
molecules --> organisms
organisms --> templates
templates --> pages
@enduml
```

**Explicación:** Diagrama que ilustra la jerarquía completa de componentes UI siguiendo el patrón Atomic Design. Comienza con átomos básicos (Button, Input, Icon), evoluciona a moléculas (FormField, Card, Navigation), organismos (Header, DataTable, Forms), plantillas (DashboardTemplate, FormTemplate) y finalmente páginas completas (LoginPage, DashboardPage). Cada nivel aumenta en complejidad y especificidad funcional.

### 5.2 Diagrama de Integración de Servicios Backend

**Código PlantUML:**
```plantuml
@startuml Integración de Servicios Backend
package "API Gateway" as gateway {
    [RouteHandler] as route
    [AuthMiddleware] as auth_mid
    [RateLimiter] as rate_limit
    [RequestLogger] as logger
}

package "Microservicios" as services {
    package "Auth Service" as auth {
        [AuthController] as auth_ctrl
        [AuthService] as auth_svc
        [JwtService] as jwt_svc
        [UserRepository] as user_repo
    }

    package "Academic Service" as academic {
        [AcademicController] as acad_ctrl
        [AcademicService] as acad_svc
        [PTAService] as pta_svc
        [AcademicRepository] as acad_repo
    }

    package "Certification Service" as cert {
        [CertController] as cert_ctrl
        [CertService] as cert_svc
        [PDFGenerator] as pdf_gen
        [CertRepository] as cert_repo
    }

    package "Audit Service" as audit {
        [AuditController] as audit_ctrl
        [AuditService] as audit_svc
        [AuditLogService] as audit_log
        [AuditRepository] as audit_repo
    }
}

package "Base de Datos" as db {
    [PostgreSQL] as postgres
    [Redis] as redis
}

package "Servicios Externos" as external {
    [SMTP Server] as smtp
    [OnlyOffice] as onlyoffice
    [File Storage] as storage
}

gateway --> services
services --> db
services --> external

route --> auth_mid
auth_mid --> rate_limit
rate_limit --> logger

auth_ctrl --> auth_svc
auth_svc --> jwt_svc
jwt_svc --> user_repo

acad_ctrl --> acad_svc
acad_svc --> pta_svc
pta_svc --> acad_repo

cert_ctrl --> cert_svc
cert_svc --> pdf_gen
pdf_gen --> cert_repo

audit_ctrl --> audit_svc
audit_svc --> audit_log
audit_log --> audit_repo
@enduml
```

**Explicación:** Diagrama de integración que muestra cómo el API Gateway centraliza el acceso a microservicios con middlewares de autenticación, rate limiting y logging. Cada microservicio (Auth, Academic, Certification, Audit) tiene su estructura interna de controllers, servicios y repositorios. Todos persisten en PostgreSQL y Redis, con integraciones a servicios externos como SMTP, OnlyOffice y almacenamiento de archivos.

## 6. DIAGRAMAS DE FLUJO DE NEGOCIO

### 6.1 Flujo Completo de Gestión de Auditorías

**Código PlantUML:**
```plantuml
@startuml Flujo Completo de Auditorías
actor Auditor
participant Frontend
participant AuditService
participant AcademicService
participant NotificationService
database AuditDB

== Creación de Auditoría ==
Auditor -> Frontend: Crear nueva auditoría
Frontend -> AuditService: POST /auditorias
AuditService -> AuditDB: Crear auditoría (BORRADOR)
AuditService --> Frontend: Auditoría creada

== Configuración del Equipo ==
Auditor -> Frontend: Asignar equipo auditor
Frontend -> AuditService: PUT /auditorias/{id}/equipo
AuditService -> AuditDB: Actualizar equipo
AuditService -> NotificationService: Notificar equipo
NotificationService --> Auditor: Confirmación

== Ejecución de Auditoría ==
Auditor -> Frontend: Iniciar auditoría
Frontend -> AuditService: PATCH /auditorias/{id}/iniciar
AuditService -> AuditDB: Status = EN_PROCESO
AuditService --> Frontend: Auditoría iniciada

== Registro de Hallazgos ==
Auditor -> Frontend: Registrar hallazgo
Frontend -> AuditService: POST /auditorias/{id}/hallazgos
AuditService -> AuditDB: Crear hallazgo
AuditService --> Frontend: Hallazgo registrado

== Plan de Mejoramiento ==
Auditor -> Frontend: Crear plan mejoramiento
Frontend -> AuditService: POST /planes-mejoramiento
AuditService -> AcademicService: Validar responsables
AcademicService --> AuditService: Responsables válidos
AuditService -> AuditDB: Crear plan
AuditService -> NotificationService: Notificar responsables
NotificationService --> Auditor: Plan creado

== Seguimiento ==
Auditor -> Frontend: Revisar cumplimiento
Frontend -> AuditService: GET /planes-mejoramiento/{id}/seguimiento
AuditService -> AuditDB: Consultar avances
AuditService --> Frontend: Estado del plan

== Cierre ==
Auditor -> Frontend: Cerrar auditoría
Frontend -> AuditService: PATCH /auditorias/{id}/cerrar
AuditService -> AuditDB: Status = CERRADA
AuditService -> NotificationService: Notificar cierre
NotificationService --> Auditor: Auditoría cerrada
@enduml
```

**Explicación:** Diagrama de secuencia completo del proceso de auditorías institucionales. Desde la creación y configuración del equipo auditor, pasando por la ejecución y registro de hallazgos, hasta la creación de planes de mejoramiento con responsables. Incluye seguimiento del cumplimiento y notificaciones automáticas en cada etapa crítica del proceso.

### 6.2 Flujo de Emisión de Certificados

**Código PlantUML:**
```plantuml
@startuml Flujo de Emisión de Certificados
actor Usuario
participant Frontend
participant CertService
participant AcademicService
participant PDFService
participant ValidationService
database CertDB

== Solicitud de Certificado ==
Usuario -> Frontend: Solicitar certificado
Frontend -> CertService: POST /certificates/request
CertService -> AcademicService: Validar elegibilidad
AcademicService --> CertService: Usuario elegible
CertService -> CertDB: Crear solicitud (PENDIENTE)
CertService --> Frontend: Solicitud creada

== Procesamiento ==
CertService -> CertService: Procesar solicitud
CertService -> AcademicService: Obtener datos académicos
AcademicService --> CertService: Datos del estudiante
CertService -> PDFService: Generar PDF
PDFService --> CertService: PDF generado
CertService -> ValidationService: Generar código QR
ValidationService --> CertService: Código QR creado
CertService -> CertDB: Actualizar status (APROBADO)
CertService --> Usuario: Notificación por email

== Validación Pública ==
Usuario -> Frontend: Validar certificado público
Frontend -> ValidationService: GET /validate/{code}
ValidationService -> CertDB: Verificar código
CertDB --> ValidationService: Certificado válido
ValidationService --> Frontend: Datos de validación
Frontend --> Usuario: Certificado válido/inválido
@enduml
```

**Explicación:** Diagrama de secuencia del proceso completo de emisión de certificados. Desde la solicitud del usuario y validación de elegibilidad, pasando por obtención de datos académicos, generación de PDF con firmas digitales y códigos QR, hasta la validación pública mediante portal web. Incluye notificaciones automáticas y verificación de integridad blockchain.

---

*Estos diagramas adicionales proporcionan una visión más detallada y específica de diferentes aspectos del sistema ESAP, complementando los diagramas generales incluidos en la documentación principal.*