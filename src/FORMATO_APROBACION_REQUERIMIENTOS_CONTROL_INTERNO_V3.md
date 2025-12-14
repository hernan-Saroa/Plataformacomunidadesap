# Escuela Superior de Administración Pública

| | |
|---|---|
| **VERSIÓN:** | 2.0 |
| **PROCESO:** | Direccionamiento Estratégico |
| **CÓDIGO:** | ESAP-ERS-001 |
| **FORMATO:** | Aprobación de Requerimientos |
| **VIGENTE DESDE:** | 20/10/2025 |

---

# Control Interno Gestión - ESAP

---

## 1. INFORMACIÓN GENERAL DEL PROYECTO

### 1.1 Identificación

| Campo | Valor |
|-------|-------|
| **ID del Requerimiento** | REQ-CIG-2025-001 |
| **Nombre del Proyecto** | Sistema De Control Interno Gestión |
| **Solicitante** | Oficina de Control Interno Gestión - ESAP |
| **Responsable OTIC** | Oficina de Tecnología de la Información y Comunicaciones (OTIC) |
| **Institución** | Escuela Superior de Administración Pública (ESAP) |
| **Fecha de Solicitud** | 21/11/2025 |
| **Versión** | 3.0 |
| **Estado** | En Revisión |

### 1.2 Objetivo General

Desarrollar un sistema integral que automatice y gestione los procesos de auditoría interna de la Oficina de Control Interno de Gestión de la ESAP, permitiendo administrar el Plan Anual de Auditoría basado en los cinco roles del Decreto 648 de 2017, ejecutar las tres etapas del proceso de auditoría (Planeación, Ejecución y Comunicación), gestionar planes de mejoramiento con seguimiento automatizado, generar informes de ley, y proporcionar reportes ejecutivos integrados con Power BI para la toma de decisiones estratégicas.

### 1.3 Justificación Técnica

#### Problemática Actual:

- Procesos completamente manuales en Excel y Word sin integración
- No existe trazabilidad automatizada del proceso de auditoría
- Alto desgaste operativo en tareas administrativas repetitivas
- Dificultad para hacer seguimiento simultáneo a 33-35 procesos de auditoría
- Planes de mejoramiento que pueden extenderse hasta 2 años sin seguimiento eficiente
- Comunicación dispersa por correo electrónico sin registro centralizado
- Gestión documental fragmentada en archivos individuales
- Imposibilidad de generar reportes ejecutivos en tiempo real
- Incumplimiento potencial de obligaciones del Decreto 648 de 2017
- Equipo de 12 auditores dedicando tiempo excesivo a tareas triviales

#### Solución Propuesta:

- Sistema web integrado con arquitectura modular responsive (móvil, tablet, desktop)
- Automatización del Plan Anual de Auditoría basado en 5 roles del Decreto 648
- Gestión completa de las 3 etapas de auditoría con formatos estandarizados
- Seguimiento automatizado de planes de mejoramiento con notificaciones trimestrales
- Repositorio centralizado de gestión documental integrado con file server
- Sistema de notificaciones automáticas por correo electrónico
- Integración con Power BI para tableros de control ejecutivos
- Gestión especializada para 16 territoriales + sede principal
- Roles y permisos granulares (RBAC) con integración a Active Directory
- Auditoría completa de accesos y cambios con trazabilidad inmutable

### 1.4 Alcance

#### Incluye:

- 7 módulos funcionales completos: Plan Anual, Proceso de Auditoría, Planes de Mejoramiento, Informes de Ley y seguimiento, Gestión Documental, Notificaciones, Reportes
- Automatización de Universo de Auditorías según formato DAFP
- Generación de Programa Anual de Auditorías
- Gestión de 3 etapas de auditoría: Planeación, Ejecución, Comunicación
- Listas de chequeo estandarizadas y reutilizables
- Seguimiento trimestral automatizado a planes de mejoramiento con semáforos
- Gestión de 15-16 informes de ley con periodicidad automatizada
- 4 perfiles de usuario: Administrador (Jefe OCI), Auditor, Consulta, Área Auditada
- Sistema de roles y permisos con integración Active Directory
- Gestión documental con compresión automática por etapa
- Sistema de notificaciones automáticas (correo electrónico)
- Integración con Power BI existente para dashboards
- Gestión diferenciada para auditorías territoriales (16 territoriales)
- Interfaz responsive (web, tablet, mobile)
- Reportes ejecutivos para Comité Institucional de Coordinación de Control Interno (CICCI)
- Exportación a Excel, PDF, Word, PowerPoint

#### Excluye (Fase 2):

- Auditorías de calidad (ya gestionadas en iSolution)
- Integración automática completa con SECOP para auditoría de contratos
- Firma digital de documentos (dependiente de proceso de adquisición)
- Migración completa de datos históricos previos a 2024
- Auditorías especiales no planificadas (se manejarán manualmente)
- Modificación de formatos establecidos por el DAFP
- App móvil nativa (solo web responsive)
- Digitalización de documentos históricos

---

## 2. ARQUITECTURA DE INFORMACIÓN

### 2.1 Estructura del Sistema

#### Módulo 1: Gestión de Plan Anual de Auditoría

Administración de los cinco roles del Decreto 648 de 2017 (Liderazgo estratégico, Enfoque hacia la prevención, Relación con entes de control, Evaluación y gestión de riesgos, Evaluación y seguimiento), formulación y seguimiento de actividades por rol, generación de indicadores de cumplimiento.

#### Módulo 2: Universo y Programa de Auditoría

Automatización del Universo de Auditorías basado en formato DAFP con cálculo automático de nivel de riesgo, priorización de auditorías por años (1-4), generación del Programa Anual de Auditoría con asignación de equipos y fechas.

#### Módulo 3: Proceso de Auditoría Interna

Gestión completa de las tres etapas: **Planeación** (anuncio, cartas, programa individual, presentación), **Ejecución** (listas de chequeo, hallazgos, evidencias, reunión apertura, reunión cierre), **Comunicación** (informes preliminar/controversia/final/ejecutivo/plan mejoramiento aceptado).

#### Módulo 4: Planes de Mejoramiento

Formulación por área auditada con análisis de causas, definición de acciones correctivas, asignación de responsables, seguimiento trimestral automatizado con notificaciones, cargue de evidencias, cálculo de avance con semáforos, seguimiento a efectividad anual.

#### Módulo 5: Informes de Ley y seguimientos

Gestión de 15-16 informes normativos requeridos, generación automática según periodicidad definida, recordatorios de vencimiento, integración con rol de "Enfoque a la prevención".

#### Módulo 6: Gestión Documental y Workflow

Repositorio centralizado con estructura por auditoría y etapa, informes de ley y seguimientos, cargue múltiple de documentos, compresión automática por etapa, versionamiento, integración con file server.

#### Módulo 7: Notificaciones y Workflow

Sistema de notificaciones automáticas por correo electrónico, workflow de aprobaciones, alertas de vencimientos, semáforos de seguimiento, confirmaciones de recepción.

#### Módulo 8: Reportería y Análisis

Reportes ejecutivos para el Comité Institucional de Coordinación de Control Interno (CICCI), indicadores de cumplimiento del Plan Anual, estado de auditorías en curso, cumplimiento de planes de mejoramiento, integración con Power BI, exportación múltiple (PDF, Excel, PowerPoint).

### 2.2 Arquitectura Técnica

| Componente | Tecnología |
|------------|------------|
| Frontend | React + TypeScript |
| Backend | Node.js + Express |
| Base de Datos | PostgreSQL (Alta Disponibilidad) |
| Hosting | Azure App Service |
| Autenticación | Active Directory ESAP |
| Notificaciones | SMTP / Office 365 |
| Integración BI | API REST para Power BI |
| File Storage | Integración con File Server G: |

---

## 3. Stakeholders (Actores involucrados)

### 3.1 Stakeholders Internos - Oficina de Control Interno Gestión

| Rol | Nombre | Responsabilidad/Interés | Nivel de Influencia |
|-----|--------|-------------------------|---------------------|
| Jefe de Control Interno Gestión (Propietario del Negocio) | por definir | Sponsor del proyecto, define prioridades estratégicas, presenta resultados en el Comité Institucional de Coordinación de Control Interno (CICCI), presenta el Plan Anual de Auditoría | ALTO |
| Auditor Lider | por definir | Usuario clave: líder de auditorías, gestiona equipos auditores, conoce procesos completos, participó en levantamiento de requerimientos | ALTO |
| Auditores | Equipo de 12 auditores | Usuarios principales: ejecutan auditorías, aplican listas de chequeo, identifican hallazgos | ALTO |

### 3.2 Stakeholders Internos - Otras Áreas ESAP

| Área/Proceso | Representante | Interacción con el Sistema | Nivel de Influencia |
|--------------|---------------|----------------------------|---------------------|
| 17 Procesos ESAP | Dueños de proceso | Reciben auditorías, formulan planes de mejoramiento, cargan evidencias de cumplimiento | ALTO |
| Dirección Nacional | Director Nacional ESAP | Recibe informes ejecutivos, solicita auditorías adicionales y/o especiales, Preside el Comité Institucional de Control Interno | ALTO |
| Subdirecciones | Subdirectores | Pueden sugerir auditorías adicionales y/o especiales en Comité Institucional de Coordinación de Control Interno (CICCI), reciben informes de sus áreas | MEDIO |
| Gestión Administrativa | Por definir | Proceso crítico auditado anualmente por el impacto en los estados financieros en relación con las cuentas de propiedad de planta y equipo | ALTO |
| Gestión Financiera | Por definir | Proceso crítico auditado anualmente Para garantizar la transparencia, la rendición de cuentas y el uso eficiente de los recursos públicos, así como para asegurar la confiabilidad de los estados financieros y proteger la reputación de la entidad. Estas auditorías ayudan a detectar y prevenir el fraude y prevenir la materialización de los riesgos asociados al proceso financiero. | ALTO |
| Gestión Contractual | Por definir | Proceso crítico auditado anualmente, requiere auditorías desde etapa precontractual hasta postcontractual, para verificar el cumplimiento de la normativa y los objetivos institucionales, evaluar la eficiencia de los procesos, identificar fallos y riesgos para corregirlos a tiempo, y garantizar la transparencia en el uso de los recursos públicos. Estas revisiones son fundamentales para el control interno y el mejoramiento continuo de la gestión pública. | ALTO |
| 16 Territoriales ESAP | Directores territoriales | Reciben auditorías con cronogramas diferenciados, cargan evidencias de planes de mejoramiento | MEDIO |
| Gestión Documental | Por definir | Proporciona directrices de archivo, integración con File Server G: | MEDIO |

### 3.3 Stakeholders internos - Área Técnica (OTIC)

| Rol | Nombre | Responsabilidad | Nivel de Influencia |
|-----|--------|-----------------|---------------------|
| Jefe de OTIC | Ing. Sandra Contreras | Aprobador final del proyecto, asigna recursos técnicos | ALTO |
| Líder Técnico | Ing. Hernando Poveda | Coordina desarrollo, lidera equipo de fábrica de software | ALTO |

---

## 4. REQUERIMIENTOS FUNCIONALES DETALLADOS

### 4.1 RF001 - Gestión de Plan Anual de Auditoría

- Admin crea plan anual estructurado por los 5 roles del Decreto 648
- Registro de actividades específicas por cada rol con responsables
- Asignación de fechas de inicio y fin para cada actividad
- Seguimiento de cumplimiento con cálculo automático de indicadores
- Jefe OCI puede editar nombres de roles y actividades (parametrizable)
- Reportes de avance por rol con gráficos de cumplimiento
- Exportación del plan completo a Excel y PDF

### 4.2 RF002 - Universo de Auditorías

- Formulario automatizado con todas las preguntas del formato DAFP
- Cálculo automático de nivel de riesgo según criterios DAFP
- Priorización automática de auditorías por años (1-4 años)
- Identificación de procesos críticos y de alto riesgo
- Diferenciación entre sede principal y 16 territoriales
- Exportación a Excel compatible con formato DAFP oficial
- Versionamiento del universo de auditoría por año fiscal

### 4.3 RF003 - Programa Anual de Auditorías

- Importación de auditorías priorizadas en el Universo de Auditorías
- Asignación de auditor líder y equipo auditor por proceso
- Programación de etapas con fechas estimadas (Planeación, Ejecución, Comunicación)
- Duración diferenciada: territoriales (etapas más cortas) vs sede principal
- Visualización tipo calendario/cronograma
- El sistema debe permitir la ampliación de plazos de auditoría con un límite máximo de 1 año desde la fecha de inicio. Las auditorías se programan contra etapas (planeación, ejecución, comunicación) y no contra fechas fijas absolutas. Solo el rol de Administrador o Jefe de Control Interno debe tener permisos para autorizar ampliaciones de plazo.
- El sistema debe registrar la justificación de la ampliación, usuario que autorizó, fecha de autorización y nueva fecha límite, manteniendo el historial completo de cambios
- Generación de documento oficial del Programa Anual de auditoría

### 4.4 RF004 - Plan Individual de Auditoría

- Creación de plan individual seleccionando auditoría del programa anual de auditoría
- Definición de alcance, objetivos y riesgos del proceso a auditar
- Asignación de equipo auditor (líder + miembros)
- Definición de criterios de auditoría
- Generación automática de documentos según formato estándar OCI
- Envío automático a área auditada

### 4.5 RF005 - Gestión de Etapa de Planeación

- Generación automática de oficio de anuncio de auditoría
- Gestión de carta de representación (solicitud al área auditada)
- Gestión de carta de compromiso (compromiso del área auditada)
- Creación del programa individual de auditoría
- Solicitud de información específica al área auditada
- Plantilla de presentación del proceso de auditoría
- Control de fechas de inicio y fin de etapa con alertas
- Auditoría de todos los documentos generados

### 4.6 RF006 - Gestión de Etapa de Ejecución

- Programación y registro de reunión de apertura
- Registro de reunión de apertura con plantilla estándar
- Gestión de listas de chequeo por tipo de proceso
- Aplicación de listas de chequeo con respuestas y observaciones
- Registro de hallazgos con descripción detallada
- Clasificación de hallazgos por tipo y gravedad
- Vinculación de hallazgos a normativa o procedimiento
- Cargue de evidencias asociadas a hallazgos
- Registro de reunión de cierre con plantilla estándar
- Presentación de hallazgos preliminares al área auditada
- Control de fechas con alertas de vencimiento

### 4.7 RF007 - Listas de Chequeo Estandarizadas

- Biblioteca de listas de chequeo reutilizables
- Asociación de listas a tipos de proceso específicos
- Creación y edición de listas de chequeo por Admin
- Versionamiento de listas de chequeo
- Aplicación de listas en auditorías en ejecución
- Reporte de cumplimiento por lista de chequeo
- Exportación de listas con respuestas

### 4.8 RF008 - Gestión de Hallazgos

- Identificación del tipo de hallazgo (no conformidad, observación, oportunidad mejora)
- Descripción detallada del hallazgo
- Vinculación a normativa, procedimiento o requisito incumplido
- Clasificación por gravedad (crítico, mayor, menor)
- Asociación de evidencias documentales
- Formulación de recomendaciones
- Proceso de controversia con área auditada
- Ratificación o modificación de hallazgos después de controversia
- Auditoría de cambios en hallazgos

### 4.9 RF009 - Gestión de Etapa de Comunicación

- Generación automática de informe preliminar con hallazgos
- Proceso de controversia de hallazgos (área auditada presenta argumentos)
- Análisis y respuesta a controversias por equipo auditor
- Ratificación o modificación de hallazgos según controversia
- Generación de informe final con hallazgos definitivos
- Construcción y remisión del plan de mejoramiento por parte del área auditada
- Notificación automática a responsables del área auditada
- Generación de informe ejecutivo para Dirección ESAP junto con el Plan de Mejoramiento
- Almacenamiento centralizado de todos los informes

### 4.10 RF010 - Formulación de Planes de Mejoramiento

- Formulación de plan de mejoramiento por área auditada
- Análisis de causas raíz por hallazgo (diagrama causa-efecto opcional)
- Definición de acciones correctivas específicas por hallazgo
- Asignación de responsables con datos de contacto
- Programación de fechas de implementación y verificación
- Solicitud de recursos necesarios
- Workflow de aceptación del plan por Jefe OCI
- Notificación automática de aprobación/rechazo

### 4.11 RF011 - Seguimiento a Planes de Mejoramiento

- Notificaciones automáticas trimestrales a responsables
- Cargue de evidencias de cumplimiento por acción correctiva
- Evaluación de cumplimiento por acción (cumplida, en proceso, pendiente)
- Cálculo automático de porcentaje de avance del plan
- Semáforos visuales por estado (verde: al día, amarillo: próximo vencimiento, rojo: vencido)
- Alertas de vencimiento con 15 días de anticipación
- Seguimiento a efectividad de acciones (verificación anual)
- Generación de informes de seguimiento consolidados
- Auditoría completa de evidencias cargadas
- Sistema de Validación de Evidencias con Trazabilidad: Cada evidencia cargada por el área auditada debe poder ser calificada por el equipo auditor con dos estados: 'Aceptado' o 'Con Observaciones'. Esta validación debe quedar registrada en la plataforma con fecha, hora y usuario que realizó la calificación.
- En caso de observaciones, el sistema debe permitir agregar comentarios específicos y solicitar nueva evidencia o aclaraciones.
- Toda esta trazabilidad debe ser visible tanto para el auditor como para el área auditada, garantizando transparencia en el proceso de seguimiento.

### 4.12 RF012 - Gestión de Informes de Ley

- Cargue manual de información adicional no automatizable
- Cargue de información en aplicativos especiales (internos - externos)
- Catálogo de 15-16 informes normativos requeridos
- Periodicidad definida por informe (mensual, trimestral, semestral, anual)
- Generación de formatos estándar por tipo de informe
- Integración automática con datos del sistema
- Recordatorios automáticos de vencimiento con 7 días de anticipación
- Workflow de revisión y aprobación
- Vinculación con rol "Enfoque a la prevención"

### 4.13 RF013 - Gestión Documental

- Repositorio centralizado con estructura jerárquica (auditoría → etapa → documentos)
- Cargue de múltiples documentos simultáneos
- Compresión automática de carpeta al finalizar cada etapa
- Versionamiento automático de documentos
- Búsqueda por auditoría, etapa, tipo de documento, fecha
- Filtros avanzados de búsqueda
- Integración con file server existente G: (sincronización)
- Previsualización de documentos en navegador
- Control de permisos por rol de usuario

### 4.14 RF014 - Sistema de Notificaciones

- Notificación automática de anuncio de auditoría al área auditada
- Recordatorios automáticos de plazos próximos a vencer (7 días antes)
- Alertas de vencimiento de fechas críticas
- Notificación de hallazgos identificados
- Solicitud automática de evidencias en planes de mejoramiento
- Confirmaciones de recepción de documentos
- Notificaciones de aprobación/rechazo de planes
- Configuración de preferencias de notificación por usuario
- Panel de notificaciones dentro del sistema

### 4.15 RF015 - Roles y Permisos

- **Rol Administrador (Jefe OCI)**: acceso total, edición de configuración, gestión de usuarios
- **Rol Auditor**: gestión de auditorías asignadas, creación de hallazgos, generación de informes
- **Rol Consulta**: visualización de reportes y dashboards, sin edición
- **Rol Área Auditada**: acceso solo a sus planes de mejoramiento, cargue de evidencias
- Integración con Active Directory de ESAP para autenticación única (SSO)
- Gestión de permisos granulares por módulo y funcionalidad
- Auditoría de accesos y acciones por usuario

### 4.16 RF016 - Reportes Ejecutivos

- Reporte de avance del Plan Anual por rol con porcentajes de cumplimiento
- Indicadores de cumplimiento del Plan Anual (tablero ejecutivo)
- Estado de auditorías en curso (planeación, ejecución, comunicación)
- Reporte de cumplimiento de planes de mejoramiento con semáforos
- Hallazgos por tipo, gravedad y área auditada
- Tendencias de hallazgos por período
- Exportación a PDF para impresión
- Exportación a PowerPoint para presentaciones en Comité de Gestión
- Programación de envío automático de reportes

### 4.17 RF017 - Integración con Power BI

- API REST para extracción de datos del sistema
- Refrescamiento automático de información (diario o bajo demanda)
- Compatibilidad con dashboards existentes en Power BI
- Documentación completa de API (endpoints, parámetros, formatos), con compatibilidad con el tablero que ya existe y que se acaba de mejorar para la OCI
- Seguridad de API con autenticación y autorización
- Datos en formato compatible con modelos de Power BI

### 4.18 RF018 - Gestión de Auditorías Territoriales

- Diferenciación de 16 territoriales en el sistema
- Tiempos de etapa adaptados (más cortos que sede principal)
- Gestión Diferenciada de Cronogramas: Las auditorías territoriales tienen cronogramas especiales que difieren de las auditorías regulares. Específicamente, la etapa de ejecución en territoriales se reduce a 4 días (una semana) debido a que las visitas son presenciales y de corta duración, mientras que las auditorías regulares pueden extenderse hasta un mes completo en esta etapa.
- El sistema debe permitir configurar estos cronogramas diferenciados y validar que las etapas de planeación, ejecución y comunicación se ajusten a los tiempos específicos de cada tipo de auditoría.
- Equipos auditores típicos de 3 personas para territoriales
- Reportes consolidados por territorial
- Visualización geográfica en dashboards
- Comparativos entre territoriales

### 4.19 RF019 - Auditorías Especiales

- Creación de auditorías fuera del programa anual (solicitadas por Dirección)
- Seguimiento independiente sin afectar programa anual
- Integración en reportes generales de gestión
- Identificación visual como "Auditoría Especial"

### 4.20 RF020 - Configuración del Sistema

- Edición de nombres de los cinco roles del Decreto 648
- Creación, edición y eliminación de actividades por rol
- Gestión de tipos de auditoría
- Configuración de periodicidades para informes de ley
- Personalización de formatos de documentos
- Gestión de listas de chequeo estándar
- Configuración de umbrales de alertas
- Gestión de plantillas de correo electrónico

---

## 5. REQUERIMIENTOS NO FUNCIONALES

### 5.1 Rendimiento

- Tiempo de respuesta para operaciones comunes: < 3 segundos @ 50 usuarios concurrentes
- Carga inicial de página: < 2 segundos
- Generación de reportes estándar: < 30 segundos
- Generación de reportes complejos: < 60 segundos
- Búsquedas en base de datos: < 1 segundo
- Cargue de documentos: hasta 10 MB por archivo, < 5 segundos
- 50 usuarios concurrentes sin degradación perceptible

### 5.2 Seguridad

- Autenticación: integración con Active Directory ESAP (SSO)
- Autorización: RBAC granular (4 roles principales + permisos específicos)
- Cifrado en tránsito: TLS 1.2+ obligatorio
- Cifrado en reposo: AES-256 para datos sensibles
- Sesiones: timeout automático después de 30 minutos de inactividad
- Auditoría: logs inmutables de todos los accesos y cambios con timestamps
- Protección contra ataques: OWASP Top 10 mitigado
- Backup: cifrado de respaldos
- Cumplimiento: políticas de seguridad ESAP

### 5.3 Disponibilidad

- SLA: 99.5% de disponibilidad en horario laboral (6am-10pm)
- Mantenimientos programados: notificación con 48 horas de anticipación
- Backup: automático diario, retención de 90 días
- Recovery: RTO 4 horas, RPO 1 hora
- Monitoreo: 24/7 con alertas automáticas
- Failover: automático para componentes críticos

### 5.4 Usabilidad

- Interfaz intuitiva para usuarios no técnicos
- Navegación: máximo 3 clics para funciones comunes
- Mensajes de error claros y orientativos con sugerencias
- Ayuda contextual en cada módulo principal
- Responsive design: funciona en desktop (>1024px), tablet (768-1024px), móvil (<768px)
- Accesibilidad: contraste adecuado, navegación por teclado
- Tiempos de carga visual: < 3 segundos por página

### 5.5 Compatibilidad

- Navegadores: Chrome, Edge, Firefox (últimas 2 versiones)
- Sistema operativo: Windows 10/11 (entorno corporativo ESAP)
- Integración con Office 365: correo electrónico, OneDrive
- Exportación: Excel (.xlsx), PDF, Word (.docx), PowerPoint (.pptx)
- Compatibilidad con formatos DAF existentes (Excel)
- Integración con Power BI Desktop y Power BI Service

### 5.6 Escalabilidad

- Arquitectura preparada para crecimiento a 100 usuarios simultáneos
- Base de datos dimensionada para almacenar 5 años de información histórica
- Capacidad de procesar hasta 50 auditorías simultáneas
- Almacenamiento: 100 GB inicial en el repositorio de la ESAP, expandible según necesidad
- Posibilidad de agregar módulos adicionales sin afectar arquitectura base

### 5.7 Mantenibilidad

- Código fuente documentado con comentarios y guías
- Arquitectura modular y desacoplada
- Logs detallados de errores y eventos del sistema
- Panel de administración para diagnóstico y configuración
- Scripts de base de datos versionados
- Documentación técnica completa y actualizada

### 5.8 Cumplimiento Normativo

- Alineación total con Decreto 648 de 2017 (5 roles de Control Interno)
- Seguimiento de guías del DAFP (Departamento Administrativo de la Función Pública)
- Guía de Auditoría Interna versión 6
- Ley de Archivo y gestión documental colombiana
- Protección de datos personales (Ley 1581 de 2012)
- Políticas institucionales de ESAP

### 5.9 Integración

- API REST para integración con Power BI
- Integración con Active Directory de ESAP
- Integración con file server existente (unidad G:)
- Integración con servidor SMTP para envío de correos
- Preparación para futura integración con SECOP (contratos)
- Posibilidad de exportar datos a sistemas externos

### 5.10 Capacitación y Documentación

- Manual de usuario por rol (Administrador, Auditor, Consulta, Área Auditada)
- Manual de administración del sistema
- Videos tutoriales de funciones principales (mínimo 5)
- Plan de capacitación para 12 auditores + personal administrativo
- Ayuda contextual dentro del sistema
- Documentación de API para integraciones
- Guía de solución de problemas comunes

---

## 6. CASO DE USO CRÍTICO: SOLICITUD Y EMISIÓN DE CERTIFICADO

### 6.1 Caso de Uso 1: Creación del Plan Anual de Auditoría

**Actor:** Jefe OCI - Oficina de Control Interno

**Flujo Principal:**

1. Jefe OCI accede al módulo de Plan Anual
2. Sistema muestra los 5 roles del Decreto 648
3. Para cada rol, Jefe OCI registra actividades específicas con responsable y fechas
4. Sistema valida completitud de información obligatoria
5. Jefe OCI revisa y aprueba el Plan Anual
6. Sistema genera documento oficial del Plan Anual
7. Sistema notifica a auditores asignados a actividades

**Validaciones:**

- Todos los roles deben tener al menos 1 actividad
- Fechas deben estar dentro del año fiscal
- Responsables deben existir en el sistema
- No puede haber actividades sin responsable

### 6.2 Caso de Uso 2: Ejecución Completa de una Auditoría

**Actor:** Auditor Líder

**Flujo Principal:**

**Etapa de Planeación:**

1. Auditor selecciona auditoría del Programa Anual
2. Sistema genera automáticamente oficio de anuncio
3. Auditor envía anuncio al área auditada (sistema notifica)
4. Sistema genera cartas de representación y compromiso
5. Auditor crea programa individual de auditoría
6. Auditor solicita información al área auditada
7. Auditor programa reunión de apertura
8. Sistema marca etapa como completada

**Etapa de Ejecución:**

9. Auditor registra reunión de apertura
10. Auditor aplica listas de chequeo del proceso
11. Auditor identifica hallazgos con evidencias
12. Sistema clasifica hallazgos automáticamente
13. Auditor programa reunión de cierre
14. Auditor presenta hallazgos preliminares
15. Sistema marca etapa como completada

**Etapa de Comunicación:**

16. Sistema genera informe preliminar con hallazgos
17. Área auditada presenta controversias (opcional)
18. Auditor analiza y ratifica/modifica hallazgos
19. Área auditada formula plan de mejoramiento
20. El equipo auditor acepta el plan de mejoramiento
21. Sistema genera informe ejecutivo para Dirección
22. Sistema genera informe final
23. Sistema notifica a responsables del área
24. Sistema marca auditoría como completada

**Validaciones:**

- No se puede avanzar a siguiente etapa sin completar la anterior
- Todos los hallazgos deben tener evidencias asociadas
- Informes solo se generan con plantillas aprobadas

### 6.3 Caso de Uso 3: Seguimiento Trimestral a Plan de Mejoramiento

**Actor:** Sistema (automatizado) + Área Auditada

**Flujo Principal:**

1. Sistema identifica planes de mejoramiento con seguimiento trimestral de acciones pendientes de cumplimiento
2. Sistema envía notificación automática a responsables (7 días antes)
3. Responsable del área accede al sistema y carga evidencias de cumplimiento
4. Sistema valida tipo, formato y auditada de evidencias
5. Equipo Auditor revisa evidencias y valida cumplimiento
6. El equipo auditor registra estado de cada acción correctiva
7. Sistema calcula porcentaje de avance automáticamente
8. Sistema actualiza semáforo según estado (verde/amarillo/rojo)
9. Si hay acciones vencidas, sistema envía alerta a Jefe OCI
10. Sistema genera reporte de seguimiento consolidado
11. Sistema programa siguiente seguimiento trimestral

**Validaciones:**

- Evidencias deben cargarse antes de fecha límite
- Cada acción requiere justificación si está pendiente
- Alertas se envían automáticamente en caso de incumplimiento

### 6.4 Caso de Uso 4: Generación de Reporte Ejecutivo para Comité

**Actor:** Jefe OCI

**Flujo Principal:**

1. Jefe OCI accede al módulo de Reportes Ejecutivos
2. Selecciona tipo de reporte (avance Plan Anual de Auditoría, Programa de auditoría, planes mejoramiento)
3. Define período de análisis (mes, trimestre, año)
4. Sistema consulta datos en tiempo real de la base de datos
5. Sistema genera gráficos, indicadores y tablas automáticamente
6. Jefe OCI revisa reporte preliminar
7. Jefe OCI exporta a PowerPoint para presentación
8. Sistema integra datos con Power BI para dashboards
9. Jefe OCI programa envío automático mensual a Dirección

**Validaciones:**

- Datos deben estar actualizados (última sincronización < 24 horas)
- Exportación debe mantener formato institucional ESAP
- Gráficos deben ser legibles y con colores corporativos

### 6.5 Caso de Uso 5: Ley y Seguimiento

**Actor:** Sistema (Automatizado)

**Actores secundarios:** Auditor/Funcionario OCI, Jefe OCI

**Flujo Principal:**

**Generación y Aprobación de Informes de Ley**

1. El **Sistema** consulta el catálogo interno de los **15-16 informes normativos** y verifica la periodicidad definida para cada uno (mensual, trimestral, semestral, anual).

2. El **Sistema** identifica la fecha de vencimiento y, con **7 días de anticipación**, envía automáticamente un **recordatorio** al Auditor/Funcionario OCI responsable.

3. El Auditor/Funcionario OCI accede al **Módulo 5: Informes de Ley** para gestionar el informe pendiente.

4. El **Sistema** genera automáticamente el formato estándar requerido para el informe, integrando los datos que ya se encuentran disponibles en el sistema.

5. El Auditor/Funcionario OCI realiza la **carga manual** de la información adicional que no es susceptible de automatización (ej. información basada en los formatos Excel proporcionados por el DAF).

6. El Auditor/Funcionario OCI inicia el **workflow de revisión y aprobación** del informe.

7. El **Sistema** envía el informe al Jefe OCI (Dr. Mario Osvaldo Bernal) para su revisión y aprobación.

8. Al ser aprobado, el **Sistema** almacena el informe finalizado y lo vincula automáticamente al rol estratégico de **"Enfoque a la prevención"** dentro del Plan Anual de Auditoría.

**Validaciones:**

- El sistema debe permitir configurar y respetar la **periodicidad definida por informe** (mensual, trimestral, semestral, anual).
- El **workflow de revisión y aprobación** debe ser obligatorio antes de la finalización del informe.
- El informe de ley debe **vincularse** de manera inequívoca al rol de **"Enfoque a la prevención"** para su seguimiento dentro del Plan Anual de Auditoría

---

## 7. CRITERIOS DE ACEPTACIÓN GENERALES

| Módulo/Feature | Criterio de Aceptación | Verificación |
|----------------|------------------------|--------------|
| Plan Anual de Auditoría | Sistema permite crear plan con 5 roles, asignar actividades, calcular indicadores | Prueba funcional |
| Universo de Auditorías | Automatiza cálculo de riesgo según DAF, prioriza auditorías | Prueba funcional |
| Proceso de Auditoría (aplica para territoriales, auditorías especiales) | Gestiona 3 etapas completas con generación de documentos | Prueba funcional |
| Planes de Mejoramiento | Seguimiento trimestral automatizado con notificaciones y semáforos | Prueba funcional |
| Gestión Documental | Repositorio centralizado, compresión automática, integración file server | Prueba funcional |
| Notificaciones | Envío automático de correos por eventos críticos | Test de integración |
| Reportes Ejecutivos | Generación automática con datos en tiempo real, exportación múltiple | Prueba funcional |
| Integración Power BI | Conexión exitosa, refrescamiento automático de datos | Test de integración |
| Rendimiento | Tiempo respuesta < 3s x 50 usuarios, reportes < 30s | Test de carga |
| Seguridad | Integración AD, RBAC, logs de auditoría, sesiones seguras | Prueba de seguridad |
| Usabilidad | Navegación intuitiva máx 3 clics, responsive móvil/tablet/desktop | Pruebas multi-device |
| Disponibilidad | 99.5% SLA, backup diario, RTO 4h / RPO 1h | Monitoreo 24/7 |
| Informes de Ley y Seguimiento (Módulo 5) | El sistema debe gestionar el catálogo de los 15-16 informes de ley, enviar recordatorios automáticos 7 días antes de su vencimiento según la periodicidad definida (mensual, trimestral, etc.), y asegurar que el informe aprobado se vincule al rol de "Enfoque a la prevención". | Prueba funcional |

---

## 8. SUPUESTOS Y DEPENDENCIAS

### 8.1 Supuestos

- Infraestructura Azure estará disponible en máximo 2 semanas desde aprobación
- Equipo de desarrollo de 5-6 personas estará disponible tiempo completo
- Auditores dedicarán 2 horas semanales para validaciones y pruebas UAT
- Formatos del DAFP se mantendrán estables durante el desarrollo
- Power BI existente funcionará como herramienta de visualización integrada
- No habrá cambios organizacionales significativos durante implementación
- Presupuesto será cubierto con fábrica de software interna (sin presupuesto adicional)
- Acceso a Active Directory será otorgado para integración

### 8.2 Dependencias

#### Internas:

- **OTIC**: Asignación oficial del equipo de desarrollo de fábrica de software
- **Infraestructura**: Aprovisionamiento de servidores y servicios en Azure
- **OCI**: Disponibilidad de Jefe OCI y auditores para reuniones de validación (2h/semana)
- **Capacitación**: Calendario aprobado para entrenamientos sin afectar operación
- **Testing**: Participación activa de auditores en pruebas UAT
- **Active Directory**: Acceso y permisos para integración de usuarios
- **File Server**: Permisos de lectura/escritura en unidad G: para integración documental
- **SMTP**: Configuración de servidor de correo para envío de notificaciones
- **Gestión Documental**: Cumplimiento de directrices del área para almacenamiento (muy importante que los documentos que se generen desde el sistema y que sean formatos del proceso sirvan para la gestión documental)
- **Restricciones de Carga de Archivos**: El sistema debe establecer límites de tamaño por archivo individual para las evidencias cargadas por las áreas auditadas. Se recomienda un límite máximo de 50 MB por archivo, considerando que las evidencias pueden incluir documentos PDF, imágenes, actas y presentaciones. Las áreas deben ser juiciosas en cargar únicamente la documentación solicitada y pertinente.

#### Externas:

- **DAFP**: Estabilidad de formatos y guías durante desarrollo (cambios pueden requerir ajustes)
- **Power BI**: Disponibilidad de licencias y conectividad para integración
- **Microsoft**: Disponibilidad y estabilidad de servicios Azure
- **Normativa**: Cambios en Decreto 648 o guías de auditoría pueden requerir modificaciones

---

## 9. GLOSARIO Y DEFINICIONES

| Término | Definición |
|---------|------------|
| ESAP | Escuela Superior de Administración Pública |
| OCI | Oficina de Control Interno de Gestión |
| OTIC | Oficina de Tecnologías de la Información y las Comunicaciones |
| DAFP | Departamento Administrativo de la Función Pública |
| Decreto 648 | Normativa de 2017 que establece los 5 roles de Control Interno |
| Aspecto Evaluables | Pueden ser macroprocesos, procesos, procedimientos, sistemas de gestión bajo estándares internacionales (a ser evaluados como 3ª línea de defensa), sistemas de información, activos de seguridad de la información, unidades desconcentradas o descentralizadas (sucursales, regionales o zonales), áreas funcionales, proyectos, planes, programas y aspectos de la planeación estratégica y la gestión de riesgos, entre otros. |
| Hallazgo | Incumplimiento de requisito normativo o procedimental identificado en auditoría |
| Plan de Mejoramiento | Conjunto de acciones correctivas para atender hallazgos de auditoría |
| iSolution | Sistema de gestión documental y procesos de la ESAP |
| MVP | Minimum Viable Product - Producto Mínimo Viable funcional |
| RBAC | Role-Based Access Control - Control de acceso basado en roles |
| RTO | Objetivo de Tiempo de Recuperación (máximo 4 horas) |
| RPO | Objetivo de Punto de Recuperación (máximo 1 hora de datos perdidos) |
| UAT | User Acceptance Testing - Pruebas de aceptación de usuario |
| SLA | Service Level Agreement - Acuerdo de nivel de servicio |
| SSO | Single Sign-On - Inicio de sesión único mediante Active Directory |
| API REST | Application Programming Interface - Interfaz de programación para integración de sistemas |

---

## 10. CONTROL DE CAMBIOS

| Versión | Fecha | Cambios | Autor | Aprobador | Estado |
|---------|-------|---------|-------|-----------|--------|
| 1.0 | 03/11/2025 | Documento inicial | Business Analyst | Por definir | En Revisión |
| 2.0 | TBD | Cambios post-revisión | TBD | TBD | |
| 3.0 | 20/11/2025 | ajuste comentarios área | Business Analyst | | |

---

## 11. FIRMAS DE APROBACIÓN

| SPONSOR / DIRECTOR | Firma | Fecha |
|--------------------|-------|-------|
| **Nombre:** Mario Oswaldo Bernal Rodriguez | | |
| **Cargo:** Jefe de la Oficina de Control Interno | ____________________ | ____ / ____ / ______ |

| JEFE OTIC | Firma | Fecha |
|-----------|-------|-------|
| **Nombre:** Sandra Patricia Contreras Soto | | |
| **Cargo:** Jefe de la Oficina de Tecnologías de la Información y las Comunicaciones | __________________ | ____ / ____ / ______ |

| CCD | Firma | Fecha |
|-----|-------|-------|
| **Nombre:** José Gil Lesmes | *José Gil* | 21 /11 /2025 |
| **Cargo:** Gerente de proyectos | | |

---

*"Los datos proporcionados serán tratados de acuerdo con la política de tratamiento de datos personales de la Unidad (www.alimentosparaaprender.gov.co), la ley 1581 de 2012 y sus decretos reglamentarios"*
