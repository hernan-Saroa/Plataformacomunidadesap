# PROMPT DE LÓGICA DE NEGOCIO - MÓDULO DE CONTROL INTERNO DE GESTIÓN
## Sistema de Gestión ESAP - Plataforma Integral
### Versión 4.0 FINAL - Integración Completa: Documento de Requerimientos + Excel Reales

---

## INSTRUCCIONES CRÍTICAS PARA EL AGENTE DE DESARROLLO

Este prompt integra **DOS FUENTES DE INFORMACIÓN CRÍTICAS**:

1. **Documento de Requerimientos (REQ-EGR-2025-001)**: Elaborado por los ingenieros de levantamiento de requerimientos con 20 requerimientos funcionales, casos de uso, stakeholders, arquitectura técnica y requerimientos no funcionales.

2. **Excel Operativos Reales (EM-FO-001 y EM-FO-002)**: Los formatos que actualmente usa la Oficina de Control Interno de Gestión día a día, con sus fórmulas, estructura y lógica de negocio exacta.

Tu tarea es construir una plataforma digital que cumpla con AMBAS especificaciones.

---

# PARTE I: INFORMACIÓN GENERAL DEL PROYECTO
## (Del Documento de Requerimientos REQ-EGR-2025-001)

### 1.1 Identificación del Proyecto

```yaml
ID_REQUERIMIENTO: REQ-EGR-2025-001
NOMBRE_PROYECTO: Sistema De Control Interno Gestión
SOLICITANTE: Oficina de Control Interno Gestión - ESAP
RESPONSABLE_TECNICO: Oficina de Tecnología de la Información y Comunicaciones (OTIC)
INSTITUCION: Escuela Superior de Administración Pública (ESAP)
FECHA_SOLICITUD: 03/11/2025
VERSION: 1.0
ESTADO: En Revisión
```

### 1.2 Objetivo General

> Desarrollar un sistema integral que automatice y gestione los procesos de auditoría interna de la Oficina de Control Interno de Gestión de la ESAP, permitiendo:
> - Administrar el Plan Anual de Auditoría basado en los **cinco roles del Decreto 648 de 2017**
> - Ejecutar las **tres etapas del proceso de auditoría** (Planeación, Ejecución y Comunicación)
> - Gestionar **planes de mejoramiento con seguimiento automatizado**
> - Generar **informes de ley**
> - Proporcionar **reportes ejecutivos integrados con Power BI** para la toma de decisiones estratégicas

### 1.3 Problemática Actual (Justificación)

```python
PROBLEMATICA_ACTUAL = [
    "Procesos completamente manuales en Excel y Word sin integración",
    "No existe trazabilidad automatizada del proceso de auditoría",
    "Alto desgaste operativo en tareas administrativas repetitivas",
    "Dificultad para hacer seguimiento simultáneo a 33-35 procesos de auditoría",
    "Planes de mejoramiento que pueden extenderse hasta 2 años sin seguimiento eficiente",
    "Comunicación dispersa por correo electrónico sin registro centralizado",
    "Gestión documental fragmentada en archivos individuales",
    "Imposibilidad de generar reportes ejecutivos en tiempo real",
    "Incumplimiento potencial de obligaciones del Decreto 648 de 2017",
    "Equipo de 12 auditores dedicando tiempo excesivo a tareas triviales"
]
```

### 1.4 Solución Propuesta

```python
SOLUCION_PROPUESTA = [
    "Sistema web integrado con arquitectura modular responsive (móvil, tablet, desktop)",
    "Automatización del Plan Anual de Auditoría basado en 5 roles del Decreto 648",
    "Gestión completa de las 3 etapas de auditoría con formatos estandarizados",
    "Seguimiento automatizado de planes de mejoramiento con notificaciones trimestrales",
    "Repositorio centralizado de gestión documental integrado con file server",
    "Sistema de notificaciones automáticas por correo electrónico",
    "Integración con Power BI para tableros de control ejecutivos",
    "Gestión especializada para 16 territoriales + sede principal",
    "Roles y permisos granulares (RBAC) con integración a Active Directory",
    "Auditoría completa de accesos y cambios con trazabilidad inmutable"
]
```

### 1.5 Alcance

**INCLUYE (MVP - Fase 1):**
- 7 módulos funcionales completos
- Automatización de Universo de Auditorías según formato DAF
- Generación de Programa Anual de Auditorías
- Gestión de 3 etapas de auditoría: Planeación, Ejecución, Comunicación
- Listas de chequeo estandarizadas y reutilizables
- Seguimiento trimestral automatizado a planes de mejoramiento con semáforos
- Gestión de 15-16 informes de ley con periodicidad automatizada
- 4 perfiles de usuario: Administrador, Auditor, Consulta, Área Auditada
- Sistema de roles y permisos con integración Active Directory
- Gestión documental con compresión automática por etapa
- Sistema de notificaciones automáticas (correo electrónico)
- Integración con Power BI existente para dashboards
- Gestión diferenciada para auditorías territoriales (16 territoriales)
- Interfaz responsive (web, tablet, mobile)
- Reportes ejecutivos para Comité de Gestión Institucional
- Exportación a Excel, PDF, Word, PowerPoint

**EXCLUYE (Fase 2):**
- Auditorías de calidad (ya gestionadas en iSolution)
- Integración automática completa con SECOP para auditoría de contratos
- Firma digital de documentos
- Migración completa de datos históricos previos a 2024
- Auditorías especiales no planificadas
- Modificación de formatos establecidos por el DAF
- App móvil nativa (solo web responsive)
- Digitalización de documentos históricos

---

# PARTE II: ARQUITECTURA DEL SISTEMA

### 2.1 Módulos del Sistema (7 Módulos)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    SISTEMA DE CONTROL INTERNO GESTIÓN                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌───────────────────┐  ┌───────────────────┐  ┌───────────────────┐       │
│  │ MÓDULO 1          │  │ MÓDULO 2          │  │ MÓDULO 3          │       │
│  │ Gestión Plan      │  │ Universo y        │  │ Proceso de        │       │
│  │ Anual de          │  │ Programa de       │  │ Auditoría         │       │
│  │ Auditoría         │  │ Auditorías        │  │ Interna           │       │
│  │ (5 roles D.648)   │  │ (Formato DAF)     │  │ (3 Etapas)        │       │
│  └───────────────────┘  └───────────────────┘  └───────────────────┘       │
│                                                                             │
│  ┌───────────────────┐  ┌───────────────────┐  ┌───────────────────┐       │
│  │ MÓDULO 4          │  │ MÓDULO 5          │  │ MÓDULO 6          │       │
│  │ Planes de         │  │ Informes de       │  │ Gestión           │       │
│  │ Mejoramiento      │  │ Ley               │  │ Documental        │       │
│  │ (Seguimiento)     │  │ (20 informes)     │  │ (File Server)     │       │
│  └───────────────────┘  └───────────────────┘  └───────────────────┘       │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────┐       │
│  │ MÓDULO 7: Notificaciones, Reportería y Análisis                 │       │
│  │ (Power BI, Exportación, Alertas automáticas)                    │       │
│  └─────────────────────────────────────────────────────────────────┘       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Arquitectura Técnica

| Componente | Tecnología |
|------------|------------|
| **Frontend** | React + TypeScript |
| **Backend** | Node.js + Express |
| **Base de Datos** | PostgreSQL (Alta Disponibilidad) |
| **Hosting** | Azure App Service |
| **Autenticación** | Active Directory ESAP (SSO) |
| **Notificaciones** | SMTP / Office 365 |
| **Integración BI** | API REST para Power BI |
| **File Storage** | Integración con File Server G: |

---

# PARTE III: STAKEHOLDERS (ACTORES INVOLUCRADOS)

### 3.1 Stakeholders Internos - Oficina de Control Interno Gestión

| Rol | Nombre | Responsabilidad | Influencia |
|-----|--------|-----------------|------------|
| Jefe de Control Interno Gestión | Mario Oswaldo Bernal Rodriguez | Sponsor del proyecto, define prioridades estratégicas, presenta resultados en Comité de Gestión Institucional, aprueba Plan Anual de Auditoría | **ALTO** |
| Auditor Senior | Por definir | Usuario clave: líder de auditorías, gestiona equipos auditores, conoce procesos completos | **ALTO** |
| Auditores Internos | Equipo de 12 auditores | Usuarios principales: ejecutan auditorías, aplican listas de chequeo, identifican hallazgos | **ALTO** |
| Coordinador Administrativo | Por definir | Coordina logística de auditorías, apoya gestión documental | MEDIO |

### 3.2 Stakeholders Internos - Otras Áreas ESAP

| Área/Proceso | Representante | Interacción | Influencia |
|--------------|---------------|-------------|------------|
| 17 Procesos ESAP | Dueños de proceso | Reciben auditorías, formulan planes de mejoramiento, cargan evidencias | **ALTO** |
| Dirección Nacional | Director Nacional ESAP | Recibe informes ejecutivos, solicita auditorías especiales | **ALTO** |
| Subdirecciones | Subdirectores | Pueden sugerir auditorías, reciben informes de sus áreas | MEDIO |
| Gestión Administrativa | Por definir | Proceso crítico auditado anualmente | **ALTO** |
| Gestión Financiera | Por definir | Proceso crítico auditado anualmente, manejo de provisiones contables | **ALTO** |
| Gestión Contractual | Por definir | Proceso crítico, auditorías desde etapa precontractual hasta postcontractual | **ALTO** |
| 16 Territoriales ESAP | Directores territoriales | Reciben auditorías con cronogramas diferenciados | MEDIO |
| Gestión Documental | Por definir | Proporciona directrices de archivo, integración con File Server G: | MEDIO |

### 3.3 Stakeholders Internos - Área Técnica (OTIC)

| Rol | Nombre | Responsabilidad | Influencia |
|-----|--------|-----------------|------------|
| Director OTIC | Ing. Sandra Patricia Contreras Soto | Aprobador final del proyecto, asigna recursos técnicos | **ALTO** |
| Líder Técnico | Ing. Hernando Poveda | Coordina desarrollo, lidera equipo de fábrica de software | **ALTO** |

---

# PARTE IV: REQUERIMIENTOS FUNCIONALES DETALLADOS (RF001-RF020)

## RF001 - Gestión de Plan Anual de Auditoría

**Descripción:** Administración del Plan Anual estructurado por los 5 roles del Decreto 648 de 2017.

**Funcionalidades:**
- Admin crea plan anual estructurado por los 5 roles del Decreto 648
- Registro de actividades específicas por cada rol con responsables
- Asignación de fechas de inicio y fin para cada actividad
- Seguimiento de cumplimiento con cálculo automático de indicadores
- Jefe OTIC puede editar nombres de roles y actividades (parametrizable)
- Reportes de avance por rol con gráficos de cumplimiento
- Exportación del plan completo a Excel y PDF

**Los 5 Roles del Decreto 648 de 2017:**
1. Liderazgo estratégico
2. Enfoque hacia la prevención
3. Relación con entes de control
4. Evaluación y gestión de riesgos
5. Evaluación y seguimiento

---

## RF002 - Universo de Auditorías

**Descripción:** Formulario automatizado basado en el formato DAF para evaluar y priorizar auditorías.

**Funcionalidades:**
- Formulario automatizado con todas las preguntas del formato DAF
- Cálculo automático de nivel de riesgo según criterios DAF
- Priorización automática de auditorías por años (1-4 años)
- Identificación de procesos críticos y de alto riesgo
- Diferenciación entre sede principal y 16 territoriales
- Exportación a Excel compatible con formato DAF oficial
- Versionamiento del universo por año fiscal

**Fórmula de Cálculo de Riesgo (DAF):**
```python
nivel_riesgo = impacto × probabilidad

CLASIFICACION_RIESGO = {
    "1-4": "BAJO",
    "5-9": "MEDIO",
    "10-15": "ALTO",
    "16-25": "CRÍTICO"
}

PRIORIZACION_AÑOS = {
    "CRÍTICO": "Año 1",
    "ALTO": "Año 1-2",
    "MEDIO": "Año 2-3",
    "BAJO": "Año 3-4"
}
```

---

## RF003 - Programa Anual de Auditorías

**Descripción:** Generación del cronograma anual de auditorías con asignación de equipos.

**Funcionalidades:**
- Importación de auditorías priorizadas del Universo
- Asignación de auditor líder y equipo auditor por proceso
- Programación de etapas con fechas estimadas (Planeación, Ejecución, Comunicación)
- Duración diferenciada: territoriales (etapas más cortas) vs sede principal
- Visualización tipo calendario/cronograma
- Ajuste de fechas con trazabilidad de cambios
- Generación de documento oficial del Programa Anual

**Estructura del Cronograma (del Excel EM-FO-001):**
```
Columnas: UNIDAD AUDITADA | RESPONSABLE | ENE (S1-S5) | FEB (S1-S4) | ... | DIC (S1-S5) | OBSERVACIONES

Marcas de Etapas:
- P = Planeación (color azul)
- E = Ejecución (color amarillo)
- C = Comunicación (color verde)
```

---

## RF004 - Plan Individual de Auditoría

**Descripción:** Creación del plan específico para cada auditoría.

**Funcionalidades:**
- Creación de plan individual seleccionando auditoría del programa anual
- Definición de alcance, objetivos y riesgos del proceso a auditar
- Asignación de equipo auditor (líder + miembros)
- Definición de criterios de auditoría
- Generación automática de documentos según formato estándar OTIC
- Envío automático a área auditada

---

## RF005 - Gestión de Etapa de Planeación

**Descripción:** Primera etapa del proceso de auditoría.

**Funcionalidades:**
- Generación automática de oficio de anuncio de auditoría
- Gestión de carta de representación (solicitud al área auditada)
- Gestión de carta de compromiso (compromiso del área auditada)
- Creación del programa individual de auditoría
- Solicitud de información específica al área auditada
- Plantilla de presentación del proceso de auditoría
- Programación y registro de reunión de apertura
- Control de fechas de inicio y fin de etapa con alertas
- Auditoría de todos los documentos generados

---

## RF006 - Gestión de Etapa de Ejecución

**Descripción:** Segunda etapa del proceso de auditoría.

**Funcionalidades:**
- Registro de reunión de apertura con plantilla estándar
- Gestión de listas de chequeo por tipo de proceso
- Aplicación de listas de chequeo con respuestas y observaciones
- Registro de hallazgos con descripción detallada
- Clasificación de hallazgos por tipo y gravedad
- Vinculación de hallazgos a normativa o procedimiento
- Cargue de evidencias asociadas a hallazgos
- Registro de reunión de cierre con plantilla
- Presentación de hallazgos preliminares al área auditada
- Control de fechas con alertas de vencimiento

---

## RF007 - Listas de Chequeo Estandarizadas

**Descripción:** Biblioteca de listas de verificación reutilizables.

**Funcionalidades:**
- Biblioteca de listas de chequeo reutilizables
- Asociación de listas a tipos de proceso específicos
- Creación y edición de listas de chequeo por Admin
- Versionamiento de listas de chequeo
- Aplicación de listas en auditorías en ejecución
- Reporte de cumplimiento por lista de chequeo
- Exportación de listas con respuestas

---

## RF008 - Gestión de Hallazgos

**Descripción:** Identificación, clasificación y seguimiento de hallazgos.

**Funcionalidades:**
- Identificación del tipo de hallazgo:
  - No conformidad
  - Observación
  - Oportunidad de mejora
- Descripción detallada del hallazgo
- Vinculación a normativa, procedimiento o requisito incumplido
- Clasificación por gravedad (crítico, mayor, menor)
- Asociación de evidencias documentales
- Formulación de recomendaciones
- Proceso de controversia con área auditada
- Ratificación o modificación de hallazgos después de controversia
- Auditoría de cambios en hallazgos

---

## RF009 - Gestión de Etapa de Comunicación

**Descripción:** Tercera etapa del proceso de auditoría.

**Funcionalidades:**
- Generación automática de informe preliminar con hallazgos
- Proceso de controversia de hallazgos (área auditada presenta argumentos)
- Análisis y respuesta a controversias por equipo auditor
- Ratificación o modificación de hallazgos según controversia
- Generación de informe final con hallazgos definitivos
- Generación de informe ejecutivo para Dirección ESAP
- Notificación automática a responsables del área auditada
- Envío de copia a Jefe OTIC para seguimiento
- Almacenamiento centralizado de todos los informes

---

## RF010 - Formulación de Planes de Mejoramiento

**Descripción:** Creación de planes de mejoramiento por el área auditada.

**Funcionalidades:**
- Formulación de plan de mejoramiento por área auditada
- Análisis de causas raíz por hallazgo (diagrama causa-efecto opcional)
- Definición de acciones correctivas específicas por hallazgo
- Asignación de responsables con datos de contacto
- Programación de fechas de implementación y verificación
- Solicitud de recursos necesarios
- Workflow de aprobación del plan por Jefe OTIC
- Notificación automática de aprobación/rechazo

**Estructura del Plan de Mejoramiento (del Excel EM-FO-002):**

| # | Campo | Tipo | Descripción |
|---|-------|------|-------------|
| 1 | N° hallazgo | Texto | Consecutivo del hallazgo |
| 2 | Descripción del hallazgo | Texto largo | Hallazgo evidenciado en auditoría |
| 3 | Causas | Texto largo | Causas que dieron origen al hallazgo |
| 4 | Acción de mejora a realizar | Texto largo | Acción(es) propuestas para subsanar |
| 5 | Soporte o evidencia | Texto | Evidencia de la acción propuesta |
| 6 | Cantidad unidad de medida programada | Número | Veces que planea realizar la acción |
| 7 | Fecha inicial | Fecha | Fecha de inicio de la acción |
| 8 | Fecha fin | Fecha | Fecha de finalización de la acción |
| 9 | Tiempo de ejecución (Meses) | **CALCULADO** | =DATEDIF(fecha_inicio, fecha_fin, "M") |
| 10 | Cargo Responsable | Texto | Cargo del responsable de la acción |

---

## RF011 - Seguimiento a Planes de Mejoramiento

**Descripción:** Seguimiento trimestral automatizado con semáforos.

**Funcionalidades:**
- Notificaciones automáticas trimestrales a responsables
- Cargue de evidencias de cumplimiento por acción correctiva
- Evaluación de cumplimiento por acción (cumplida, en proceso, pendiente)
- Cálculo automático de porcentaje de avance del plan
- Semáforos visuales por estado (verde: al día, amarillo: próximo vencimiento, rojo: vencido)
- Alertas de vencimiento con 15 días de anticipación
- Seguimiento a efectividad de acciones (verificación anual)
- Generación de informes de seguimiento consolidados
- Auditoría completa de evidencias cargadas

**Columnas de Seguimiento al Cumplimiento (del Excel EM-FO-002):**

| # | Campo | Tipo | Fórmula/Valores |
|---|-------|------|-----------------|
| 11 | Cantidad de acciones implementadas | Número | Evidencias objetivas de cumplimiento |
| 12 | Cumplimiento | **CALCULADO** | =IF(K>=F, 2, IF(K>=1, 1, 0)) |
| 13 | Estado de la acción | Lista | ABIERTA / CERRADA |
| 14 | Responsable del seguimiento | Texto | Jefe de Control Interno |
| 15 | Observación cumplimiento | Texto largo | Descripción del avance |

**Valores de Cumplimiento:**
- **2 = CUMPLE** 🟢 (implementó >= programado)
- **1 = CUMPLE PARCIALMENTE** 🟡 (implementó algo pero menos de lo programado)
- **0 = NO CUMPLE** 🔴 (no implementó nada)

**Columnas de Seguimiento a Efectividad (del Excel EM-FO-002):**

| # | Campo | Tipo | Fórmula/Valores |
|---|-------|------|-----------------|
| 17 | Evaluar aplicación de controles | Lista | SI / NO |
| 18 | Validar que situación no se repitió | Lista | SI / NO |
| 19 | Efectividad | **CALCULADO** | =IF(Q<>R, 1, IF(Q="SI", 2, 0)) |
| 20 | Observación efectividad | Texto largo | Descripción de efectividad |

**Valores de Efectividad:**
- **2 = EFECTIVA** 🟢 (ambos SI)
- **1 = PARCIALMENTE EFECTIVA** 🟡 (uno SI y otro NO)
- **0 = INEFECTIVA** 🔴 (ambos NO)

---

## RF012 - Gestión de Informes de Ley

**Descripción:** Gestión de los 20 informes normativos obligatorios.

**Funcionalidades:**
- Catálogo de 15-16 informes normativos requeridos
- Periodicidad definida por informe (mensual, trimestral, semestral, anual)
- Generación de formatos estándar por tipo de informe
- Integración automática con datos del sistema
- Recordatorios automáticos de vencimiento con 7 días de anticipación
- Cargue manual de información adicional no automatizable
- Workflow de revisión y aprobación
- Vinculación con rol "Enfoque a la prevención"

**Catálogo de Informes de Ley (del Excel EM-FO-001):**

| Código | Nombre | Periodicidad | Responsables |
|--------|--------|--------------|--------------|
| IL-001 | Gestión OCI | SEMESTRAL | Catalina Rubio, Nubia Pimiento |
| IL-002 | Evaluación Sistema Control Interno | ANUAL | Sandra Montero, Fernando Ávila |
| IL-003 | Medición MECI | ANUAL | Fernando Ávila, Mario Bernal |
| IL-004 | Control Interno Contable - Contaduría | ANUAL | Nubia Pimiento, Mario Bernal |
| IL-005 | Evaluación Gestión por Dependencias | SEMESTRAL | Catalina Rubio, Mario Bernal |
| IL-006 | Programa Transparencia y Ética Pública | CUATRIMESTRAL | Fernando Ávila, William Ramírez |
| IL-007 | Mapa de Riesgos (Corrupción) | CUATRIMESTRAL | Sandra Montero, William Ramírez |
| IL-008 | Mapa de Riesgos (Gestión y Seguridad Digital) | CUATRIMESTRAL | Sandra Montero, William Ramírez |
| IL-009 | Austeridad y Eficiencia del Gasto | TRIMESTRAL | Lucila Villamil, Nubia Pimiento |
| IL-010 | LITIGOB | MENSUAL | Natalia Cañon |
| IL-011 | Seguimiento PQRSD | MENSUAL | William Ramírez, Natalia Cañon |
| IL-012 | Fortalecimiento Meritocracia | SEMESTRAL | Flor Mireya Murcia, William Ramírez |
| IL-013 | Índice Transparencia (ITA) | SEMESTRAL | Alexandra Triviño, Lucila Villamil |
| IL-014 | Sistema SG-SST | TRIMESTRAL | William Ramírez |
| IL-015 | Política Gobierno Digital | SEMESTRAL | Alexandra Triviño, William Ramírez |
| IL-016 | Modelo Seguridad MSPI | SEMESTRAL | Alexandra Triviño, Lucila Villamil |
| IL-017 | Derechos de Autor Software | ANUAL | Lucila Villamil |
| IL-018 | Reporte DIARI-CGR | MENSUAL | Alexandra Triviño, Catalina Rubio |
| IL-019 | Planes Mejoramiento Interno OCI | TRIMESTRAL | Nubia Pimiento, Catalina Rubio |
| IL-020 | Plan Mejoramiento CGR | SEGÚN REQUERIMIENTO | Fernando Ávila, Nubia Pimiento |

---

## RF013 - Gestión Documental

**Descripción:** Repositorio centralizado de documentos de auditoría.

**Funcionalidades:**
- Repositorio centralizado con estructura jerárquica (auditoría → etapa → documentos)
- Cargue de múltiples documentos simultáneos
- Compresión automática de carpeta al finalizar cada etapa
- Versionamiento automático de documentos
- Búsqueda por auditoría, etapa, tipo de documento, fecha
- Filtros avanzados de búsqueda
- Integración con file server existente G: (sincronización)
- Previsualización de documentos en navegador
- Control de permisos por rol de usuario

**Estructura de Carpetas:**
```
FILE_SERVER_G:/CONTROL_INTERNO/
└── {AÑO_FISCAL}/
    └── AUDITORIAS/
        └── {CODIGO_AUDITORIA}/
            ├── 01_PLANEACION/
            ├── 02_EJECUCION/
            ├── 03_COMUNICACION/
            └── 04_MEJORAMIENTO/
```

**Restricciones:**
- Máximo 10 MB por archivo
- Formatos permitidos: .pdf, .docx, .xlsx, .pptx, .jpg, .png
- Retención: 5 años según política institucional

---

## RF014 - Sistema de Notificaciones

**Descripción:** Notificaciones automáticas por correo y en plataforma.

**Funcionalidades:**
- Notificación automática de anuncio de auditoría al área auditada
- Recordatorios automáticos de plazos próximos a vencer (7 días antes)
- Alertas de vencimiento de fechas críticas
- Notificación de hallazgos identificados
- Solicitud automática de evidencias en planes de mejoramiento
- Confirmaciones de recepción de documentos
- Notificaciones de aprobación/rechazo de planes
- Configuración de preferencias de notificación por usuario
- Panel de notificaciones dentro del sistema

**Eventos de Notificación:**

| Evento | Destinatarios | Canal |
|--------|---------------|-------|
| Auditoría asignada | Equipo auditor | Email + Plataforma |
| Auditoría anunciada | Área auditada | Email + Plataforma |
| Hallazgo identificado | Área auditada | Email + Plataforma |
| Controversia presentada | Auditor líder | Email + Plataforma |
| Plan enviado para aprobación | Jefe OTIC | Email + Plataforma |
| Plan aprobado/rechazado | Área auditada | Email + Plataforma |
| Seguimiento trimestral próximo | Responsables acciones | Email + Plataforma |
| Acción correctiva vencida | Responsable + Jefe OTIC | Email + Plataforma |
| Informe de ley próximo a vencer | Auditor asignado + Jefe OTIC | Email + Plataforma |

---

## RF015 - Roles y Permisos

**Descripción:** Sistema RBAC con integración Active Directory.

**Funcionalidades:**
- Rol Administrador (Jefe OTIC): acceso total, edición de configuración, gestión de usuarios
- Rol Auditor: gestión de auditorías asignadas, creación de hallazgos, generación de informes
- Rol Consulta: visualización de reportes y dashboards, sin edición
- Rol Área Auditada: acceso solo a sus planes de mejoramiento, cargue de evidencias
- Integración con Active Directory de ESAP para autenticación única (SSO)
- Gestión de permisos granulares por módulo y funcionalidad
- Auditoría de accesos y acciones por usuario

**Matriz de Permisos:**

| Permiso | ADMIN | AUDITOR | CONSULTA | ÁREA_AUDITADA |
|---------|-------|---------|----------|---------------|
| Crear Plan Anual | ✅ | ❌ | ❌ | ❌ |
| Editar Plan Anual | ✅ | ❌ | ❌ | ❌ |
| Crear Auditoría | ✅ | ✅ | ❌ | ❌ |
| Ejecutar Auditoría | ✅ | ✅ (asignadas) | ❌ | ❌ |
| Registrar Hallazgos | ✅ | ✅ | ❌ | ❌ |
| Ver Hallazgos | ✅ | ✅ | ✅ | ✅ (propios) |
| Presentar Controversia | ❌ | ❌ | ❌ | ✅ |
| Formular Plan Mejoramiento | ❌ | ❌ | ❌ | ✅ |
| Aprobar Plan Mejoramiento | ✅ | ❌ | ❌ | ❌ |
| Cargar Evidencias | ❌ | ❌ | ❌ | ✅ |
| Validar Evidencias | ✅ | ✅ | ❌ | ❌ |
| Ver Reportes | ✅ | ✅ | ✅ | ✅ (limitado) |
| Exportar Reportes | ✅ | ✅ | ✅ | ❌ |
| Configurar Sistema | ✅ | ❌ | ❌ | ❌ |

---

## RF016 - Reportes Ejecutivos

**Descripción:** Generación de reportes para toma de decisiones.

**Funcionalidades:**
- Reporte de avance del Plan Anual por rol con porcentajes de cumplimiento
- Indicadores de cumplimiento del Plan Anual (tablero ejecutivo)
- Estado de auditorías en curso (planeación, ejecución, comunicación)
- Reporte de cumplimiento de planes de mejoramiento con semáforos
- Hallazgos por tipo, gravedad y área auditada
- Tendencias de hallazgos por período
- Exportación a PDF para impresión
- Exportación a PowerPoint para presentaciones en Comité de Gestión
- Programación de envío automático de reportes

---

## RF017 - Integración con Power BI

**Descripción:** API REST para conexión con Power BI existente.

**Funcionalidades:**
- API REST para extracción de datos del sistema
- Refrescamiento automático de información (diario o bajo demanda)
- Compatibilidad con dashboards existentes en Power BI
- Documentación completa de API (endpoints, parámetros, formatos)
- Seguridad de API con autenticación y autorización
- Datos en formato compatible con modelos de Power BI

**Endpoints de API:**
```
GET /api/v1/reportes/plan-anual?año_fiscal={año}&rol_id={id}
GET /api/v1/reportes/auditorias?año={año}&etapa={etapa}&territorio_id={id}
GET /api/v1/reportes/planes-mejoramiento?año={año}&estado={estado}&area_id={id}
GET /api/v1/reportes/hallazgos?fecha_inicio={fecha}&fecha_fin={fecha}&tipo={tipo}
GET /api/v1/reportes/indicadores?año={año}
GET /api/v1/reportes/informes-ley?año={año}&periodicidad={periodicidad}
```

---

## RF018 - Gestión de Auditorías Territoriales

**Descripción:** Manejo diferenciado para las 16 direcciones territoriales.

**Funcionalidades:**
- Diferenciación de 16 territoriales en el sistema
- Tiempos de etapa adaptados (más cortos que sede principal)
- Equipos auditores típicos de 3 personas para territoriales
- Reportes consolidados por territorial
- Visualización geográfica en dashboards
- Comparativos entre territoriales

**Territoriales ESAP:**
1. Antioquia
2. Atlántico - Cesar - Magdalena - La Guajira
3. Bolívar - Córdoba - Sucre - San Andrés
4. Caldas
5. Cundinamarca
6. Nariño - Putumayo
7. Huila
8. Norte de Santander
9. Tolima
10. Valle
11. Meta
12. Risaralda
13. Santander
14. Boyacá
15. Cauca
16. Quindío

---

## RF019 - Auditorías Especiales

**Descripción:** Auditorías fuera del programa anual.

**Funcionalidades:**
- Creación de auditorías fuera del programa anual (solicitadas por Dirección)
- Seguimiento independiente sin afectar programa anual
- Integración en reportes generales de gestión
- Identificación visual como "Auditoría Especial"

---

## RF020 - Configuración del Sistema

**Descripción:** Parametrización del sistema por el administrador.

**Funcionalidades:**
- Edición de nombres de los cinco roles del Decreto 648
- Creación, edición y eliminación de actividades por rol
- Gestión de tipos de auditoría
- Configuración de periodicidades para informes de ley
- Personalización de formatos de documentos
- Gestión de listas de chequeo estándar
- Configuración de umbrales de alertas
- Gestión de plantillas de correo electrónico

---

# PARTE V: REQUERIMIENTOS NO FUNCIONALES

### 5.1 Rendimiento

| Métrica | Valor Requerido |
|---------|-----------------|
| Tiempo de respuesta operaciones comunes | < 3 segundos @ 50 usuarios |
| Carga inicial de página | < 2 segundos |
| Generación de reportes estándar | < 30 segundos |
| Generación de reportes complejos | < 60 segundos |
| Búsquedas en base de datos | < 1 segundo |
| Cargue de documentos (hasta 10 MB) | < 5 segundos |
| Usuarios concurrentes sin degradación | 50 usuarios |

### 5.2 Seguridad

- **Autenticación:** Integración con Active Directory ESAP (SSO)
- **Autorización:** RBAC granular (4 roles principales + permisos específicos)
- **Cifrado en tránsito:** TLS 1.2+ obligatorio
- **Cifrado en reposo:** AES-256 para datos sensibles
- **Sesiones:** Timeout automático después de 30 minutos de inactividad
- **Auditoría:** Logs inmutables de todos los accesos y cambios con timestamps
- **Protección contra ataques:** OWASP Top 10 mitigado
- **Backup:** Cifrado de respaldos
- **Cumplimiento:** Políticas de seguridad ESAP

### 5.3 Disponibilidad

| Métrica | Valor Requerido |
|---------|-----------------|
| SLA | 99.5% en horario laboral (6am-10pm) |
| Mantenimientos programados | Notificación 48 horas antes |
| Backup | Automático diario, retención 90 días |
| RTO (Recovery Time Objective) | 4 horas |
| RPO (Recovery Point Objective) | 1 hora |
| Monitoreo | 24/7 con alertas automáticas |
| Failover | Automático para componentes críticos |

### 5.4 Usabilidad

- Interfaz intuitiva para usuarios no técnicos
- Navegación: máximo 3 clics para funciones comunes
- Mensajes de error claros y orientativos con sugerencias
- Ayuda contextual en cada módulo principal
- Responsive design: funciona en desktop (>1024px), tablet (768-1024px), móvil (<768px)
- Accesibilidad: contraste adecuado, navegación por teclado
- Tiempos de carga visual: < 3 segundos por página

### 5.5 Compatibilidad

- **Navegadores:** Chrome, Edge, Firefox (últimas 2 versiones)
- **Sistema operativo:** Windows 10/11 (entorno corporativo ESAP)
- **Integración con Office 365:** correo electrónico, OneDrive
- **Exportación:** Excel (.xlsx), PDF, Word (.docx), PowerPoint (.pptx)
- **Compatibilidad con formatos DAF existentes (Excel)**
- **Integración con Power BI Desktop y Power BI Service**

### 5.6 Escalabilidad

- Arquitectura preparada para crecimiento a 100 usuarios simultáneos
- Base de datos dimensionada para almacenar 5 años de información histórica
- Capacidad de procesar hasta 50 auditorías simultáneas
- Almacenamiento: 100 GB inicial, expandible según necesidad
- Posibilidad de agregar módulos adicionales sin afectar arquitectura base

### 5.7 Cumplimiento Normativo

- Alineación total con **Decreto 648 de 2017** (5 roles de Control Interno)
- Seguimiento de guías del **DAF** (Departamento Administrativo de la Función Pública)
- **Guía de Auditoría Interna versión 6**
- Ley de Archivo y gestión documental colombiana
- Protección de datos personales (**Ley 1581 de 2012**)
- Políticas institucionales de ESAP

---

# PARTE VI: CASOS DE USO CRÍTICOS

## Caso de Uso 1: Creación del Plan Anual de Auditoría

**Actor:** Jefe OTIC

**Flujo Principal:**
1. Jefe OTIC accede al módulo de Plan Anual
2. Sistema muestra los 5 roles del Decreto 648
3. Para cada rol, Jefe OTIC registra actividades específicas con responsable y fechas
4. Sistema valida completitud de información obligatoria
5. Jefe OTIC revisa y aprueba el Plan Anual
6. Sistema genera documento oficial del Plan Anual
7. Sistema notifica a auditores asignados a actividades

**Validaciones:**
- Todos los roles deben tener al menos 1 actividad
- Fechas deben estar dentro del año fiscal
- Responsables deben existir en el sistema
- No puede haber actividades sin responsable

---

## Caso de Uso 2: Ejecución Completa de una Auditoría

**Actor:** Auditor Líder

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
19. Sistema genera informe final
20. Sistema genera informe ejecutivo para Dirección
21. Sistema notifica a responsables del área
22. Área auditada formula plan de mejoramiento
23. Sistema marca auditoría como completada

**Validaciones:**
- No se puede avanzar a siguiente etapa sin completar la anterior (BLOQUEO DURO)
- Todos los hallazgos deben tener evidencias asociadas (BLOQUEO DURO)
- Informes solo se generan con plantillas aprobadas

---

## Caso de Uso 3: Seguimiento Trimestral a Plan de Mejoramiento

**Actor:** Sistema (automatizado) + Área Auditada

**Flujo Principal:**
1. Sistema identifica planes de mejoramiento con seguimiento trimestral pendiente
2. Sistema envía notificación automática a responsables (7 días antes)
3. Responsable del área accede al sistema y carga evidencias de cumplimiento
4. Sistema valida tipo y formato de evidencias
5. Responsable registra estado de cada acción correctiva
6. Sistema calcula porcentaje de avance automáticamente
7. Sistema actualiza semáforo según estado (verde/amarillo/rojo)
8. Si hay acciones vencidas, sistema envía alerta a Jefe OTIC
9. Auditor revisa evidencias y valida cumplimiento
10. Sistema genera reporte de seguimiento consolidado
11. Sistema programa siguiente seguimiento trimestral

**Validaciones:**
- Evidencias deben cargarse antes de fecha límite
- Cada acción requiere justificación si está pendiente
- Alertas se envían automáticamente en caso de incumplimiento

---

## Caso de Uso 4: Generación de Reporte Ejecutivo para Comité

**Actor:** Jefe OTIC

**Flujo Principal:**
1. Jefe OTIC accede al módulo de Reportes Ejecutivos
2. Selecciona tipo de reporte (avance Plan Anual, auditorías, planes mejoramiento)
3. Define período de análisis (mes, trimestre, año)
4. Sistema consulta datos en tiempo real de la base de datos
5. Sistema genera gráficos, indicadores y tablas automáticamente
6. Jefe OTIC revisa reporte preliminar
7. Jefe OTIC exporta a PowerPoint para presentación
8. Sistema integra datos con Power BI para dashboards
9. Jefe OTIC programa envío automático mensual a Dirección

**Validaciones:**
- Datos deben estar actualizados (última sincronización < 24 horas)
- Exportación debe mantener formato institucional ESAP
- Gráficos deben ser legibles y con colores corporativos

---

# PARTE VII: CRITERIOS DE ACEPTACIÓN GENERALES

| Módulo/Feature | Criterio de Aceptación | Verificación |
|----------------|------------------------|--------------|
| Plan Anual de Auditoría | Sistema permite crear plan con 5 roles, asignar actividades, calcular indicadores | Prueba funcional |
| Universo de Auditorías | Automatiza cálculo de riesgo según DAF, prioriza auditorías | Prueba funcional |
| Proceso de Auditoría | Gestiona 3 etapas completas con generación de documentos | Prueba funcional |
| Planes de Mejoramiento | Seguimiento trimestral automatizado con notificaciones y semáforos | Prueba funcional |
| Gestión Documental | Repositorio centralizado, compresión automática, integración file server | Prueba funcional |
| Notificaciones | Envío automático de correos por eventos críticos | Test de integración |
| Reportes Ejecutivos | Generación automática con datos en tiempo real, exportación múltiple | Prueba funcional |
| Integración Power BI | Conexión exitosa, refrescamiento automático de datos | Test de integración |
| Rendimiento | Tiempo respuesta < 3s x 50 usuarios, reportes < 30s | Test de carga |
| Seguridad | Integración AD, RBAC, logs de auditoría, sesiones seguras | Prueba de seguridad |
| Usabilidad | Navegación intuitiva máx 3 clics, responsive móvil/tablet/desktop | Pruebas multi-device |
| Disponibilidad | 99.5% SLA, backup diario, RTO 4h / RPO 1h | Monitoreo 24/7 |

---

# PARTE VIII: EQUIPO AUDITOR REAL (del Excel EM-FO-001)

### Auditores de Planta

| Nombre | Cargo | Áreas de Competencia |
|--------|-------|----------------------|
| Mario Bernal | Jefe de Control Interno | Todas las áreas |
| Catalina Rubio Rubio | Auditor Senior | Financiera, Docencia |
| Fernando Ávila | Auditor Senior | Administrativa, Tecnológica |
| Lucila Villamil Avendaño | Auditor | Talento Humano, Documental |
| Sandra Paola Montero | Auditor | Riesgos, Contractual |
| Flor Mireya Murcia | Auditor | Talento Humano |
| William Alonso Urquijo | Auditor | Administrativa |

### Contratistas

| Nombre | Identificador | Áreas de Competencia |
|--------|---------------|----------------------|
| Nubia Pimiento | Contratista 1 | Financiera |
| Natalia Cañon | Contratista 1 | Jurídica y Contratación |
| Alexandra Triviño | Contratista 1 | Tecnológica |
| Monica Cortes | Contratista 2 | Financiera |
| William Ramírez | Contratista 3 | Administrativa, SG-SST |

---

# PARTE IX: SUPUESTOS Y DEPENDENCIAS

### Supuestos

- Infraestructura Azure estará disponible en máximo 2 semanas desde aprobación
- Equipo de desarrollo de 5-6 personas estará disponible tiempo completo
- Auditores dedicarán 2 horas semanales para validaciones y pruebas UAT
- Formatos del DAF se mantendrán estables durante el desarrollo
- Power BI existente funcionará como herramienta de visualización integrada
- No habrá cambios organizacionales significativos durante implementación
- Presupuesto será cubierto con fábrica de software interna
- Acceso a Active Directory será otorgado para integración

### Dependencias Internas

- OTIC: Asignación oficial del equipo de desarrollo
- Infraestructura: Aprovisionamiento de servidores en Azure
- OTIC Gestión: Disponibilidad de Jefe OTIC y auditores para reuniones (2h/semana)
- Active Directory: Acceso y permisos para integración de usuarios
- File Server: Permisos de lectura/escritura en unidad G:
- SMTP: Configuración de servidor de correo

### Dependencias Externas

- DAF: Estabilidad de formatos y guías durante desarrollo
- Power BI: Disponibilidad de licencias y conectividad
- Microsoft: Disponibilidad y estabilidad de servicios Azure
- Normativa: Cambios en Decreto 648 pueden requerir modificaciones

---

# PARTE X: GLOSARIO

| Término | Definición |
|---------|------------|
| ESAP | Escuela Superior de Administración Pública |
| OCI | Oficina de Control Interno de Gestión |
| OTIC | Oficina de Tecnologías de la Información y las Comunicaciones |
| DAF | Departamento Administrativo de la Función Pública |
| Decreto 648 | Normativa de 2017 que establece los 5 roles de Control Interno |
| Unidad Auditable | Proceso, área, tema específico o contrato sujeto a auditoría |
| Hallazgo | Incumplimiento de requisito normativo o procedimental |
| Plan de Mejoramiento | Conjunto de acciones correctivas para atender hallazgos |
| iSolution | Sistema de gestión documental y procesos de la ESAP |
| MVP | Minimum Viable Product - Producto Mínimo Viable |
| RBAC | Role-Based Access Control - Control de acceso basado en roles |
| RTO | Objetivo de Tiempo de Recuperación (máximo 4 horas) |
| RPO | Objetivo de Punto de Recuperación (máximo 1 hora) |
| UAT | User Acceptance Testing - Pruebas de aceptación de usuario |
| SLA | Service Level Agreement - Acuerdo de nivel de servicio |
| SSO | Single Sign-On - Inicio de sesión único |
| API REST | Interfaz de programación para integración de sistemas |

---

# PARTE XI: FIRMAS DE APROBACIÓN

| Rol | Nombre | Cargo | Firma | Fecha |
|-----|--------|-------|-------|-------|
| SPONSOR | Mario Oswaldo Bernal Rodriguez | Jefe de la Oficina de Control Interno | ______________ | __/__/____ |
| JEFE OTIC | Sandra Patricia Contreras Soto | Jefe de la Oficina de Tecnologías de la Información y las Comunicaciones | ______________ | __/__/____ |

---

## INSTRUCCIONES FINALES PARA DESARROLLO

### Prioridades de Implementación

```
FASE 1 - MVP (Semanas 1-4):
├── Autenticación con Active Directory (SSO)
├── RF001 - Gestión Plan Anual de Auditoría (5 roles Decreto 648)
├── RF002 - Universo de Auditorías (cálculo riesgo DAF)
├── RF003 - Programa Anual de Auditorías (cronograma)
├── RF015 - Roles y Permisos (RBAC)
└── Dashboard básico por rol

FASE 2 (Semanas 5-6):
├── RF004 - Plan Individual de Auditoría
├── RF005 - Gestión Etapa Planeación
├── RF006 - Gestión Etapa Ejecución
├── RF007 - Listas de Chequeo
├── RF008 - Gestión de Hallazgos
└── RF009 - Gestión Etapa Comunicación

FASE 3 (Semanas 7-8):
├── RF010 - Formulación Planes de Mejoramiento
├── RF011 - Seguimiento a Planes (semáforos, cálculos automáticos)
├── RF012 - Gestión de Informes de Ley
├── RF014 - Sistema de Notificaciones
└── RF013 - Gestión Documental

FASE 4 (Semanas 9-10):
├── RF016 - Reportes Ejecutivos
├── RF017 - Integración con Power BI
├── RF018 - Gestión Auditorías Territoriales
├── RF019 - Auditorías Especiales
├── RF020 - Configuración del Sistema
└── Pruebas UAT y ajustes finales
```

### Principios de Desarrollo

1. **RESPETAR LA ESTRUCTURA DE LOS EXCEL**: Los formatos EM-FO-001 y EM-FO-002 deben poder exportarse idénticos a los actuales.

2. **CÁLCULOS AUTOMÁTICOS**: Las fórmulas del Excel deben ejecutarse automáticamente en el sistema.

3. **NOTIFICACIONES PROACTIVAS**: El sistema debe alertar ANTES de que venzan los plazos.

4. **TRAZABILIDAD TOTAL**: Todo cambio debe quedar registrado con usuario, timestamp y detalle.

5. **BLOQUEOS DUROS**: No se puede avanzar de etapa sin completar la anterior. Todos los hallazgos DEBEN tener evidencias.

6. **SEMÁFOROS VISUALES**: Usar los mismos criterios de cumplimiento del Excel (0, 1, 2).

7. **INTEGRACIÓN COMPLETA**: Active Directory, Power BI, File Server G: y SMTP deben funcionar correctamente.

---

**FIN DEL PROMPT V4.0 - VERSIÓN COMPLETA**

*Versión: 4.0 FINAL | Fecha: Noviembre 2025*
*Fuentes: Documento REQ-EGR-2025-001 + Excel EM-FO-001 + Excel EM-FO-002*
