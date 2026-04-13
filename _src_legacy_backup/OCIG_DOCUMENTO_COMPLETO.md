# 🏛️ SISTEMA DE CONTROL INTERNO DE GESTIÓN (OCIG)
# DOCUMENTO MAESTRO COMPLETO - ESAP

**Versión:** 2.0 | **Fecha:** Enero 2026 | **Estado:** ✅ LISTO PARA IMPLEMENTACIÓN

---

## TABLA DE CONTENIDOS

1. [Resumen Ejecutivo](#1-resumen-ejecutivo)
2. [Contexto y Marco Normativo](#2-contexto-y-marco-normativo)
3. [Usuarios y Roles](#3-usuarios-y-roles)
4. [Requerimientos Funcionales (20 RF)](#4-requerimientos-funcionales)
5. [Requerimientos No Funcionales (10 RNF)](#5-requerimientos-no-funcionales)
6. [Flujos de Trabajo Kanban](#6-flujos-de-trabajo-kanban)
7. [Arquitectura de Datos (Schema Prisma)](#7-arquitectura-de-datos)
8. [Endpoints API REST](#8-endpoints-api-rest)
9. [Código de Referencia](#9-código-de-referencia)
10. [Especificaciones de UI/UX](#10-especificaciones-de-uiux)
11. [Validaciones Normativas en Código](#11-validaciones-normativas-en-código)
12. [Tests Críticos](#12-tests-críticos)
13. [Migración de Datos](#13-migración-de-datos)
14. [Deployment y CI/CD](#14-deployment-y-cicd)
15. [Timeline de Implementación](#15-timeline-de-implementación)
16. [Checklist por Módulo](#16-checklist-por-módulo)
17. [Guía para IA (Cursor/Copilot)](#17-guía-para-ia)
18. [Anexos](#18-anexos)

---

# 1. RESUMEN EJECUTIVO

## 1.1 Objetivo
Automatizar los procesos de auditoría interna y planes de mejoramiento de la Oficina de Control Interno (OCI) de ESAP, reemplazando los formatos Excel manuales (EMFO001/EMFO002) por un sistema digital con trazabilidad completa, validaciones normativas automáticas y tableros Kanban.

## 1.2 Problema Actual
- **EMFO001 (Plan Anual):** Edición manual en Excel, sin control de versiones, sin validación de Decreto 648
- **EMFO002 (Planes Mejora):** 19 columnas, fórmulas manuales, seguimiento por correo, sin trazabilidad
- **Tiempo perdido:** ~3 horas por auditoría en tareas administrativas
- **Riesgo:** Incumplimiento normativo por errores humanos

## 1.3 Solución
Sistema web con tablero Kanban que:
- Valida automáticamente los 5 roles del Decreto 648/2017
- Gestiona las 3 etapas de auditoría (Planeación, Ejecución, Comunicación)
- Automatiza seguimiento trimestral de planes de mejoramiento
- Genera alertas 7 días antes de vencimientos
- Registra auditoría de cambios (quién, cuándo, qué)

## 1.4 Estrategia de Reutilización
```
┌─────────────────────────────────────────────────────────────┐
│                    MÓDULO OCIG                              │
├─────────────────────────────────────────────────────────────┤
│  30% REUTILIZADO          │  70% NUEVO                      │
│  (Kanban RFO16)           │  (Específico OCIG)              │
├───────────────────────────┼─────────────────────────────────┤
│  • Lógica drag & drop     │  • Plan Anual (RF001)           │
│  • Componentes tarjetas   │  • Universo Auditorías (RF002)  │
│  • Estados Kanban         │  • Planes Mejoramiento          │
│  • Notificaciones base    │  • Portales por rol             │
│  • Sistema de permisos    │  • Informes de Ley              │
│  • Estructura API REST    │  • Validaciones Decreto 648     │
└───────────────────────────┴─────────────────────────────────┘

RESULTADO: 50% menos tiempo de desarrollo
```

## 1.5 Números Clave
| Métrica | Valor |
|---------|-------|
| Requerimientos Funcionales | 20 |
| Requerimientos No Funcionales | 10 |
| Módulos del Sistema | 9 |
| Auditores Activos | 12 |
| Direcciones Territoriales | 16 |
| Procesos Sede Central | 9 |
| Seguimientos Trimestrales/Año | 4 |
| Timeline Implementación | 20 semanas |
| Desarrolladores Requeridos | 5-6 |

## 1.6 Stack Tecnológico
```
Frontend:   React 18, TypeScript, Tailwind CSS, Recharts, React DnD
Backend:    Node.js/Express, TypeScript
Database:   PostgreSQL (Prisma ORM)
Deploy:     Azure App Service, Azure Storage, Azure SQL
Auth:       Active Directory (AD) + JWT
Reportes:   Power BI, pdfkit, ExcelJS
```

---

# 2. CONTEXTO Y MARCO NORMATIVO

## 2.1 Marco Legal Aplicable

| Norma | Descripción | Aplicación en Sistema |
|-------|-------------|----------------------|
| **Decreto 648/2017** | Control Interno - 5 Roles Obligatorios | RF001: Validar exactamente 5 roles |
| **Ley 87/1993** | Sistema de Control Interno | Base legal de auditorías |
| **Ley 1474/2011** | Estatuto Anticorrupción | Informes de ley periódicos |
| **Decreto 1083/2015** | MECI | Evaluación anual FURAG |
| **Ley 1581/2012** | Protección de Datos | Cifrado TLS + AES-256 |
| **Guía DAFP** | Auditoría Interna v6 | Fórmulas de priorización |

## 2.2 Procedimientos Internos ESAP

| Código | Procedimiento | Versión | Aplicación |
|--------|--------------|---------|------------|
| EM-PT-004 | Auditorías Internas | V3 | RF004-009: 3 etapas |
| EM-PT-002 | Planes de Mejoramiento | V3 | RF010-011: Seguimiento |
| EM-PT-003 | Informes de Ley y Seguimiento | V2 | RF012: Calendario informes |
| EM-CA-002 | Caracterización Evaluación Control | - | Proceso marco |

## 2.3 Formatos a Digitalizar

| Código | Formato | Columnas/Campos | Reemplazo Por |
|--------|---------|-----------------|---------------|
| EM-FO-001 | Plan Anual de Auditoría | Cronograma semanal 52 cols | Módulo Plan Anual |
| EM-FO-002 | Plan de Mejoramiento | 19 columnas | Módulo Planes Mejora |
| EM-FO-003 | Plan de Trabajo Individual | Alcance, criterios | Módulo Auditorías |
| EM-FO-004 | Papeles de Trabajo | Índice, referencias | Gestión Documental |

## 2.4 Los 5 Roles del Decreto 648/2017 (CRÍTICO)

```javascript
const DECRETO_648_ROLES = [
  { 
    id: 1, 
    nombre: 'Liderazgo Estratégico', 
    descripcion: 'Dirección Nacional + Jefe OCI',
    articulo: 'Art. 2'
  },
  { 
    id: 2, 
    nombre: 'Enfoque hacia la Prevención', 
    descripcion: 'Diseño + implantación de controles',
    articulo: 'Art. 3'
  },
  { 
    id: 3, 
    nombre: 'Relación con Entes de Control', 
    descripcion: 'Coordinación con CGR, MECI',
    articulo: 'Art. 4'
  },
  { 
    id: 4, 
    nombre: 'Evaluación de la Gestión del Riesgo', 
    descripcion: 'Identificación + evaluación de riesgos',
    articulo: 'Art. 5'
  },
  { 
    id: 5, 
    nombre: 'Evaluación y Seguimiento', 
    descripcion: 'Monitoreo + efectividad de controles',
    articulo: 'Art. 6'
  }
];

// ⚠️ VALIDACIÓN OBLIGATORIA: El Plan Anual DEBE tener EXACTAMENTE 5 roles
// ⚠️ Cada rol DEBE tener al menos 1 actividad asignada
```

---

# 3. USUARIOS Y ROLES

## 3.1 Roles del Sistema

| Rol | Cantidad | Responsabilidades | Permisos Clave |
|-----|----------|-------------------|----------------|
| **Jefe OCI** | 1 | Aprobar PAI, supervisar auditorías, firmar informes, reportar a Dirección | Todo el sistema, aprobaciones |
| **Auditor Líder (AL)** | 4-5 | Planificar auditorías, asignar equipo, revisar papeles, elaborar informes | Gestión auditorías asignadas |
| **Auditor/Contratista** | 6-7 | Ejecutar pruebas, recopilar evidencias, documentar hallazgos | Ejecución, carga evidencias |
| **Líder Proceso Auditado** | Variable | Formular planes mejora, cargar evidencias de cumplimiento | Portal área, solo sus planes |

## 3.2 Auditores Actuales ESAP (12)

| Nombre | Rol | Asignación Principal |
|--------|-----|---------------------|
| Mario Oswaldo Bernal | Jefe OCI | Supervisión general |
| Fernando Ávila | Auditor Líder | Gestión Administrativa |
| Lucila Villamil | Auditor Líder | Formación para la Vida |
| Catalina Rubio | Auditor Líder | Gestión Financiera |
| Natalia Cañon | Auditor | Adquisición Bienes |
| William Alonso Urquijo | Auditor | Gestión Administrativa |
| Flor Mireya Murcia | Auditor | Talento Humano |
| Sandra Paola Montero | Auditor | Efectividad Institucional |
| Nubia Pimiento | Contratista | Apoyo múltiple |
| Alexandra Triviño | Contratista | Transformación Digital |
| Mónica Cortes | Contratista | Gestión Financiera |
| William Ramírez | Contratista | Seguridad información |

## 3.3 Procesos Auditables - Sede Central (9)

1. Gestión Financiera
2. Gestión Administrativa
3. Formación para la Vida / Gestión Programas Académicos
4. Adquisición de Bienes y Servicios
5. Gestión del Talento Humano / Gestión Profesoral
6. Efectividad Institucional
7. Evaluación Control y Mejora (OCID)
8. Modelo Seguridad y Privacidad de la Información
9. Transformación Digital

## 3.4 Direcciones Territoriales (16)

| # | Territorial | Cobertura |
|---|-------------|-----------|
| 1 | Antioquia | Antioquia |
| 2 | Atlántico | Atlántico, Cesar, Magdalena, Guajira |
| 3 | Bolívar | Bolívar, Córdoba, Sucre, San Andrés |
| 4 | Caldas | Caldas |
| 5 | Cundinamarca | Cundinamarca |
| 6 | Nariño-Putumayo | Nariño, Putumayo |
| 7 | Huila | Huila |
| 8 | Meta | Meta |
| 9 | Tolima | Tolima |
| 10 | Valle | Valle del Cauca |
| 11 | Risaralda | Risaralda |
| 12 | Norte de Santander | Norte de Santander |
| 13 | Boyacá | Boyacá |
| 14 | Santander | Santander |
| 15 | Amazonas | Amazonas |
| 16 | Cauca | Cauca |

---

# 4. REQUERIMIENTOS FUNCIONALES

## Módulo 1: Plan Anual de Auditoría

### RF-001: Gestión del Plan Anual de Auditoría
| Campo | Descripción |
|-------|-------------|
| **Descripción** | Crear, editar y aprobar el Plan Anual de Auditoría con validación automática de los 5 roles del Decreto 648/2017 |
| **Actor** | Jefe OCI |
| **Precondición** | Usuario autenticado con rol Jefe OCI |
| **Flujo Principal** | 1. Seleccionar vigencia (año) → 2. Sistema muestra 5 roles predefinidos → 3. Agregar actividades a cada rol → 4. Asignar responsables y fechas → 5. Guardar borrador → 6. Aprobar (valida 5 roles con actividades) |
| **Validaciones** | • Exactamente 5 roles (Decreto 648) • Cada rol con ≥1 actividad • Responsables válidos en AD • Fechas dentro del año fiscal |
| **Salidas** | Plan guardado, PDF generado, notificación a auditores |

### RF-002: Universo de Auditorías Basado en Riesgos
| Campo | Descripción |
|-------|-------------|
| **Descripción** | Gestionar catálogo de unidades auditables con priorización según metodología DAFP |
| **Actor** | Jefe OCI, Auditor Líder |
| **Campos** | Proceso, criticidad (Alto/Medio/Bajo), factor exposición, última auditoría, nivel riesgo calculado |
| **Fórmula DAFP** | `Riesgo = (Criticidad × Factor_Exposición) / Factores_Mitigantes` |
| **Resultado** | Alto (>10), Medio (5-10), Bajo (<5) |

### RF-003: Programa Anual de Auditoría
| Campo | Descripción |
|-------|-------------|
| **Descripción** | Programar auditorías con cronogramas diferenciados sede/territorial |
| **Duraciones Sede** | Planeación: 5-10 días, Ejecución: 10-30 días, Comunicación: 10-15 días |
| **Duraciones Territorial** | Planeación: 3 días, **Ejecución: 4 días (FIJO)**, Comunicación: 2 días |
| **Visualización** | Diagrama Gantt con código de colores por etapa |

### RF-004: Plan de Rotación Automático
| Campo | Descripción |
|-------|-------------|
| **Descripción** | Calcular frecuencia de auditoría según nivel de riesgo |
| **Reglas** | Extremo: 1 año, Alto: 2 años (1 si inadecuado), Moderado: 3 años (2 si inadecuado), Bajo: 4 años (3 si inadecuado) |

---

## Módulo 2: Gestión de Auditorías

### RF-005: Tablero Kanban de Auditorías
| Campo | Descripción |
|-------|-------------|
| **Descripción** | Visualizar y gestionar auditorías en tablero Kanban con 5 columnas |
| **Columnas** | BACKLOG → PLANEACIÓN → EJECUCIÓN → COMUNICACIÓN → CERRADO |
| **Tarjeta** | Código, nombre, auditor líder (avatar), equipo, fechas, barra progreso, alertas |
| **Interacción** | Drag & drop entre columnas (con validación de prerrequisitos) |

### RF-006: Plan de Trabajo Individual (EM-FO-003)
| Campo | Descripción |
|-------|-------------|
| **Descripción** | Generar documento de planificación por auditoría |
| **Campos** | Objetivo, alcance, criterios de auditoría, equipo auditor, cronograma detallado, riesgos identificados |

### RF-007: Registro de Hallazgos
| Campo | Descripción |
|-------|-------------|
| **Descripción** | Documentar hallazgos tipificados durante ejecución |
| **Tipos** | Hallazgo (incumplimiento normativo), Observación (tendencia negativa), Recomendación (oportunidad mejora) |
| **Campos** | Descripción, criterio aplicable, evidencia adjunta, proceso afectado |

### RF-008: Papeles de Trabajo (EM-FO-004)
| Campo | Descripción |
|-------|-------------|
| **Descripción** | Gestionar documentación de soporte con índice automático |
| **Funciones** | Índice automático, referencias cruzadas, control de versiones, búsqueda |

### RF-009: Generación de Informes
| Campo | Descripción |
|-------|-------------|
| **Descripción** | Generar informes de auditoría en diferentes formatos |
| **Tipos** | Informe preliminar, Informe final, Resumen ejecutivo |
| **Formatos** | PDF (publicación), Word (edición), Excel (datos) |

---

## Módulo 3: Planes de Mejoramiento

### RF-010: Formulación de Plan de Mejoramiento (EM-FO-002)
| Campo | Descripción |
|-------|-------------|
| **Descripción** | Crear plan de mejoramiento desde hallazgos de auditoría |
| **Campos** | N° hallazgo, descripción, análisis causa-raíz, acción de mejora, evidencia esperada, cantidad programada, fechas, responsable |
| **Herramientas** | Diagrama Ishikawa (opcional), 5 Por Qué |
| **Plazo Formulación** | 5 días hábiles desde comunicación de hallazgo |

### RF-011: Seguimiento Trimestral de Planes
| Campo | Descripción |
|-------|-------------|
| **Descripción** | Gestionar seguimiento en 4 cortes anuales |
| **Cortes** | Julio, Octubre, Enero, Abril |
| **Fórmula Cumplimiento** | `IF(Cant_Impl >= Cant_Prog, 2, IF(Cant_Impl >= 1, 1, 0))` |
| **Valores** | 2 = Completo (100%), 1 = Parcial (1-99%), 0 = Pendiente (0%) |
| **Alertas** | 7 días antes (recordatorio), día vencimiento (alerta), +3 días (escalamiento) |

### RF-012: Evaluación de Efectividad
| Campo | Descripción |
|-------|-------------|
| **Descripción** | Evaluar si las acciones correctivas fueron efectivas |
| **Preguntas** | ¿Se aplicaron controles? (SI/NO) + ¿Situación no se repitió? (SI/NO) |
| **Resultado** | Efectiva (ambas SI), Parcialmente efectiva (una SI), Inefectiva (ambas NO) |

### RF-013: Portal Área Auditada
| Campo | Descripción |
|-------|-------------|
| **Descripción** | Interfaz simplificada para líderes de proceso |
| **Funciones** | Ver planes asignados, cargar evidencias (drag & drop), ver estado y observaciones OCI |
| **Restricción** | Solo visualiza sus propios planes de mejoramiento |

---

## Módulo 4: Informes de Ley

### RF-014: Catálogo de Informes de Ley
| Campo | Descripción |
|-------|-------------|
| **Descripción** | Gestionar los 16 informes de ley con sus características |
| **Campos** | Nombre, norma, periodicidad, destinatario, fecha límite |

### RF-015: Calendario de Informes
| Campo | Descripción |
|-------|-------------|
| **Descripción** | Visualizar calendario con alertas automáticas |
| **Alertas** | 10 días antes (amarillo), 5 días antes (naranja), día vencimiento (rojo) |
| **Vista** | Calendario mensual con código de colores por destinatario |

### RF-016: Registro de Cumplimiento
| Campo | Descripción |
|-------|-------------|
| **Descripción** | Marcar informes como cumplidos con soporte |
| **Campos** | Fecha entrega, número radicado/URL publicación, observaciones |

---

## Módulo 5: Reportes y Dashboard

### RF-017: Dashboard Ejecutivo
| Campo | Descripción |
|-------|-------------|
| **Descripción** | Panel con KPIs en tiempo real |
| **KPIs** | % ejecución PAI, auditorías por estado, planes mejora por cumplimiento, informes ley cumplidos/pendientes |
| **Gráficos** | Barras (auditorías por etapa), Dona (cumplimiento), Timeline (próximos vencimientos) |

### RF-018: Generación de Reportes
| Campo | Descripción |
|-------|-------------|
| **Descripción** | Exportar reportes en múltiples formatos |
| **Formatos** | PDF (publicación web), Excel (reportes CGR/DAFP), Word (documentos internos) |

### RF-019: Exportación SIRECI
| Campo | Descripción |
|-------|-------------|
| **Descripción** | Generar archivo compatible con SIRECI de Contraloría General |
| **Formato** | Excel con estructura específica CGR |

---

## Módulo 6: Configuración y Administración

### RF-020: Auditoría de Cambios (Compliance)
| Campo | Descripción |
|-------|-------------|
| **Descripción** | Registrar todas las acciones del sistema |
| **Campos** | Usuario, acción, tabla, registro_id, cambios (antes/después), timestamp |
| **Retención** | 90 días en línea, archivo histórico indefinido |

---

# 5. REQUERIMIENTOS NO FUNCIONALES

| ID | Categoría | Descripción | Métrica |
|----|-----------|-------------|---------|
| **RNF-001** | Rendimiento | Carga de tablero Kanban | < 3 segundos |
| **RNF-002** | Rendimiento | Usuarios concurrentes | 50 usuarios |
| **RNF-003** | Disponibilidad | Uptime horario laboral (7am-7pm) | 99.5% |
| **RNF-004** | Disponibilidad | Backup automático | Diario |
| **RNF-005** | Seguridad | Cifrado en tránsito y reposo | TLS 1.3 + AES-256 |
| **RNF-006** | Seguridad | Autenticación | Active Directory SSO |
| **RNF-007** | Seguridad | Cumplimiento datos personales | Ley 1581/2012 |
| **RNF-008** | Usabilidad | Curva de aprendizaje | < 2 horas |
| **RNF-009** | Usabilidad | Diseño responsive | Tablets trabajo campo |
| **RNF-010** | Integración | Conexión Power BI | API REST |

---

# 6. FLUJOS DE TRABAJO KANBAN

## 6.1 Tablero Auditorías Internas

```
┌─────────────┬─────────────┬─────────────┬─────────────┬─────────────┐
│   BACKLOG   │ PLANEACIÓN  │  EJECUCIÓN  │COMUNICACIÓN │   CERRADO   │
│  #E8F4F8    │  #FEF9E7    │  #D4EFDF    │  #FADBD8    │  #D5D8DC    │
├─────────────┼─────────────┼─────────────┼─────────────┼─────────────┤
│             │             │             │             │             │
│ Auditorías  │ Sede:       │ Sede:       │ Sede:       │ Auditoría   │
│ programadas │ 1-4 semanas │ 10-30 días  │ 2-3 semanas │ finalizada  │
│ en PAI      │             │             │             │ y archivada │
│             │ Territorial:│ Territorial:│ Territorial:│             │
│ Sin límite  │ 3 días      │ 4 DÍAS FIJO │ 2 días      │             │
│ de tiempo   │             │             │             │             │
│             │             │             │             │             │
└─────────────┴─────────────┴─────────────┴─────────────┴─────────────┘

REGLAS DE TRANSICIÓN:
• BACKLOG → PLANEACIÓN: Requiere equipo auditor asignado
• PLANEACIÓN → EJECUCIÓN: Requiere Plan Trabajo Individual aprobado
• EJECUCIÓN → COMUNICACIÓN: Requiere hallazgos registrados
• COMUNICACIÓN → CERRADO: Requiere informe final firmado + plan mejora
```

## 6.2 Tablero Planes de Mejoramiento

```
┌──────────────┬──────────────┬──────────────┬──────────────┬──────────────┬──────────────┐
│  PENDIENTE   │  EN REVISIÓN │ EN EJECUCIÓN │EN SEGUIMIENTO│  EVALUACIÓN  │   CERRADO    │
│ FORMULACIÓN  │     OCI      │              │              │ EFECTIVIDAD  │              │
├──────────────┼──────────────┼──────────────┼──────────────┼──────────────┼──────────────┤
│              │              │              │              │              │              │
│ 5 días       │ 2 días       │ Según fechas │ Trimestral   │ Siguiente    │ Acción       │
│ hábiles      │ hábiles      │ del plan     │ (4 cortes)   │ auditoría    │ cumplida y   │
│              │              │              │              │              │ efectiva     │
│              │              │              │              │              │              │
└──────────────┴──────────────┴──────────────┴──────────────┴──────────────┴──────────────┘

SEMÁFOROS:
🟢 VERDE:    Cumplimiento ≥ 80%
🟡 AMARILLO: Cumplimiento 50-79%
🔴 ROJO:     Cumplimiento < 50%
```

## 6.3 Flujo de Seguimiento Trimestral

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        SEGUIMIENTO TRIMESTRAL                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  DÍA -7              DÍA 0                DÍA +3              DÍA +7        │
│    │                   │                    │                    │          │
│    ▼                   ▼                    ▼                    ▼          │
│ ┌──────┐          ┌──────────┐        ┌──────────┐        ┌──────────┐     │
│ │ALERTA│          │  CORTE   │        │ESCALAMIEN│        │ CIERRE   │     │
│ │CORREO│──────────│SEGUIMIEN │────────│TO JEFE   │────────│AUTOMÁTICO│     │
│ │ AUTO │          │    TO    │        │   OCI    │        │          │     │
│ └──────┘          └──────────┘        └──────────┘        └──────────┘     │
│                                                                             │
│ CORTES ANUALES:                                                             │
│ • Julio 31 (entrega Agosto 7)                                               │
│ • Octubre 31 (entrega Noviembre 7)                                          │
│ • Enero 31 (entrega Febrero 7)                                              │
│ • Abril 30 (entrega Mayo 7)                                                 │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

# 7. ARQUITECTURA DE DATOS

## 7.1 Schema Prisma Completo

```prisma
// =====================================================
// PLAN ANUAL (RF001)
// =====================================================

model PlanAnual {
  id              String      @id @default(cuid())
  vigencia        Int         // 2025, 2026, etc.
  estado          PlanEstado  @default(BORRADOR)
  fechaCreacion   DateTime    @default(now())
  fechaAprobacion DateTime?
  actaCICC        String?     // Número de acta de aprobación
  version         Int         @default(1)
  
  // Relaciones
  jefeOci         Usuario     @relation("creadorPlan", fields: [jefeOciId], references: [id])
  jefeOciId       String
  roles           RolDecreto648[]
  auditorias      Auditoria[]
  historial       AuditLog[]
  
  @@unique([vigencia])
  @@map("plan_anual")
}

model RolDecreto648 {
  id          String   @id @default(cuid())
  numero      Int      // 1 al 5
  nombre      String   // "Liderazgo Estratégico", etc.
  descripcion String
  articulo    String   // "Art. 2", etc.
  
  planAnual   PlanAnual @relation(fields: [planAnualId], references: [id], onDelete: Cascade)
  planAnualId String
  actividades Actividad[]
  
  @@map("rol_decreto_648")
}

model Actividad {
  id            String          @id @default(cuid())
  nombre        String          @db.VarChar(500)
  descripcion   String?         @db.Text
  estado        ActividadEstado @default(PENDIENTE)
  fechaInicio   DateTime
  fechaFin      DateTime
  porcentaje    Decimal         @default(0)
  
  rol           RolDecreto648   @relation(fields: [rolId], references: [id], onDelete: Cascade)
  rolId         String
  responsable   Usuario         @relation("responsableActividad", fields: [responsableId], references: [id])
  responsableId String
  
  @@map("actividad")
}

// =====================================================
// AUDITORÍAS (RF004-009)
// =====================================================

model Auditoria {
  id              String          @id @default(cuid())
  codigo          String          @unique  // AUD-2025-001
  nombre          String
  tipo            TipoAuditoria
  procesoAuditado String
  estado          EstadoAuditoria @default(BACKLOG)
  
  // Fechas por etapa
  fechaInicioPlaneacion   DateTime?
  fechaFinPlaneacion      DateTime?
  fechaInicioEjecucion    DateTime?
  fechaFinEjecucion       DateTime?
  fechaInicioComunicacion DateTime?
  fechaFinComunicacion    DateTime?
  
  // Relaciones
  planAnual      PlanAnual   @relation(fields: [planAnualId], references: [id])
  planAnualId    String
  auditorLider   Usuario     @relation("liderAuditoria", fields: [auditorLiderId], references: [id])
  auditorLiderId String
  equipoAuditor  EquipoAuditor[]
  hallazgos      Hallazgo[]
  documentos     Documento[]
  planMejora     PlanMejoramiento?
  
  // Territorial (opcional)
  territorial    Territorial? @relation(fields: [territorialId], references: [id])
  territorialId  String?
  esTerritorial  Boolean      @default(false)
  
  // Auditoría
  createdAt      DateTime     @default(now())
  updatedAt      DateTime     @updatedAt
  historial      AuditLog[]
  
  @@map("auditoria")
}

model EquipoAuditor {
  id          String    @id @default(cuid())
  auditoria   Auditoria @relation(fields: [auditoriaId], references: [id], onDelete: Cascade)
  auditoriaId String
  usuario     Usuario   @relation(fields: [usuarioId], references: [id])
  usuarioId   String
  rol         RolEquipo // LIDER, AUDITOR, OBSERVADOR
  
  @@unique([auditoriaId, usuarioId])
  @@map("equipo_auditor")
}

model Hallazgo {
  id          String        @id @default(cuid())
  numero      Int
  tipo        TipoHallazgo  // HALLAZGO, OBSERVACION, RECOMENDACION
  titulo      String
  descripcion String        @db.Text
  criterio    String        @db.Text
  causas      String?       @db.Text
  
  auditoria   Auditoria     @relation(fields: [auditoriaId], references: [id], onDelete: Cascade)
  auditoriaId String
  evidencias  Evidencia[]
  accionCorrectiva AccionCorrectiva?
  
  createdAt   DateTime      @default(now())
  
  @@map("hallazgo")
}

model Documento {
  id          String    @id @default(cuid())
  nombre      String
  tipo        TipoDocumento
  url         String    // Azure Blob URL
  version     Int       @default(1)
  
  auditoria   Auditoria @relation(fields: [auditoriaId], references: [id], onDelete: Cascade)
  auditoriaId String
  subidoPor   Usuario   @relation(fields: [subidoPorId], references: [id])
  subidoPorId String
  
  createdAt   DateTime  @default(now())
  
  @@map("documento")
}

// =====================================================
// PLANES DE MEJORAMIENTO (RF010-011)
// =====================================================

model PlanMejoramiento {
  id               String            @id @default(cuid())
  estado           EstadoPlanMejora  @default(FORMULACION)
  fechaSuscripcion DateTime          @default(now())
  
  // Relaciones
  auditoria        Auditoria         @relation(fields: [auditoriaId], references: [id])
  auditoriaId      String            @unique
  areaAuditada     Usuario           @relation("responsablePlan", fields: [areaAuditadaId], references: [id])
  areaAuditadaId   String
  acciones         AccionCorrectiva[]
  seguimientos     SeguimientoPlanMejora[]
  
  createdAt        DateTime          @default(now())
  updatedAt        DateTime          @updatedAt
  
  @@map("plan_mejoramiento")
}

model AccionCorrectiva {
  id                   String          @id @default(cuid())
  descripcion          String          @db.Text
  causasRaiz           String          @db.Text
  accionMejora         String          @db.Text
  soporteEvidencia     String          // Descripción de evidencia esperada
  cantidadProgramada   Int
  fechaInicio          DateTime
  fechaFin             DateTime
  tiempoEjecucionMeses Int             // Calculado: DATEDIF(inicio, fin, "M")
  estado               AccionEstado    @default(PENDIENTE)
  
  // Seguimiento
  cantidadImplementada Int             @default(0)
  cumplimiento         Int             @default(0)  // 0, 1, 2
  
  // Efectividad (evaluación posterior)
  controlesAplicados   Boolean?
  situacionNoRepitio   Boolean?
  efectividad          Int?            // 0, 1, 2
  observacionEfectividad String?
  
  // Relaciones
  planMejora           PlanMejoramiento @relation(fields: [planMejoraId], references: [id], onDelete: Cascade)
  planMejoraId         String
  hallazgo             Hallazgo         @relation(fields: [hallazgoId], references: [id])
  hallazgoId           String           @unique
  responsable          Usuario          @relation("responsableAccion", fields: [responsableId], references: [id])
  responsableId        String
  seguimientos         AccionSeguimiento[]
  
  @@map("accion_correctiva")
}

model SeguimientoPlanMejora {
  id                String            @id @default(cuid())
  numeroSeguimiento Int               // 1, 2, 3, 4
  mesSeguimiento    String            // JULIO, OCTUBRE, ENERO, ABRIL
  fechaCorte        DateTime
  fechaEntrega      DateTime?
  estado            EstadoSeguimiento @default(PENDIENTE)
  
  planMejora        PlanMejoramiento  @relation(fields: [planMejoraId], references: [id], onDelete: Cascade)
  planMejoraId      String
  acciones          AccionSeguimiento[]
  
  createdAt         DateTime          @default(now())
  
  @@map("seguimiento_plan_mejora")
}

model AccionSeguimiento {
  id                   String                @id @default(cuid())
  cantidadImplementada Int
  cumplimiento         Int                   // 0, 1, 2 (fórmula EMFO002)
  observaciones        String?               @db.Text
  
  seguimiento          SeguimientoPlanMejora @relation(fields: [seguimientoId], references: [id], onDelete: Cascade)
  seguimientoId        String
  accion               AccionCorrectiva      @relation(fields: [accionId], references: [id], onDelete: Cascade)
  accionId             String
  evidencias           EvidenciaValidada[]
  
  @@unique([seguimientoId, accionId])
  @@map("accion_seguimiento")
}

model EvidenciaValidada {
  id                      String            @id @default(cuid())
  evidenciaOriginal       String            // URL en Azure Blob
  calificacion            EstadoValidacion  @default(PENDIENTE)
  comentariosAuditor      String?           @db.Text
  fechaValidacion         DateTime?
  solicitudNuevaEvidencia Boolean           @default(false)
  
  accionSeguimiento       AccionSeguimiento @relation(fields: [accionSeguimientoId], references: [id], onDelete: Cascade)
  accionSeguimientoId     String
  validadoPor             Usuario?          @relation("validadorEvidencia", fields: [validadoPorId], references: [id])
  validadoPorId           String?
  
  createdAt               DateTime          @default(now())
  
  @@map("evidencia_validada")
}

// =====================================================
// INFORMES DE LEY (RF014-016)
// =====================================================

model InformeLey {
  id            String          @id @default(cuid())
  nombre        String
  norma         String
  periodicidad  Periodicidad
  destinatario  String
  descripcion   String?         @db.Text
  
  cumplimientos CumplimientoInforme[]
  
  @@map("informe_ley")
}

model CumplimientoInforme {
  id              String      @id @default(cuid())
  vigencia        Int         // Año
  periodo         String      // "ENE", "Q1", "S1", "2025"
  fechaLimite     DateTime
  fechaEntrega    DateTime?
  estado          EstadoCumplimiento @default(PENDIENTE)
  radicado        String?
  urlPublicacion  String?
  observaciones   String?     @db.Text
  
  informe         InformeLey  @relation(fields: [informeId], references: [id])
  informeId       String
  registradoPor   Usuario?    @relation("registradorCumplimiento", fields: [registradoPorId], references: [id])
  registradoPorId String?
  
  @@unique([informeId, vigencia, periodo])
  @@map("cumplimiento_informe")
}

// =====================================================
// USUARIOS Y SEGURIDAD
// =====================================================

model Usuario {
  id              String   @id @default(cuid())
  email           String   @unique
  nombre          String
  apellido        String
  cedula          String   @unique
  rol             Rol
  cargo           String?
  activo          Boolean  @default(true)
  
  // Relaciones inversas (múltiples)
  planesCreados   PlanAnual[] @relation("creadorPlan")
  actividadesAsignadas Actividad[] @relation("responsableActividad")
  auditoriasLideradas Auditoria[] @relation("liderAuditoria")
  equiposAuditoria EquipoAuditor[]
  documentosSubidos Documento[]
  planesMejoraResponsable PlanMejoramiento[] @relation("responsablePlan")
  accionesResponsable AccionCorrectiva[] @relation("responsableAccion")
  evidenciasValidadas EvidenciaValidada[] @relation("validadorEvidencia")
  cumplimientosRegistrados CumplimientoInforme[] @relation("registradorCumplimiento")
  logsAcciones AuditLog[]
  
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  @@map("usuario")
}

model Territorial {
  id         String      @id @default(cuid())
  nombre     String      @unique
  cobertura  String[]    // Departamentos cubiertos
  auditorias Auditoria[]
  
  @@map("territorial")
}

model AuditLog {
  id         String   @id @default(cuid())
  accion     String   // "Crear Plan", "Mover Auditoria", "Validar Evidencia"
  tabla      String   // "plan_anual", "auditoria", etc.
  registroId String
  cambios    Json     // {antes: {...}, despues: {...}}
  
  usuario    Usuario  @relation(fields: [usuarioId], references: [id])
  usuarioId  String
  timestamp  DateTime @default(now())
  
  // Relaciones opcionales para trazabilidad
  planAnual  PlanAnual? @relation(fields: [planAnualId], references: [id])
  planAnualId String?
  auditoria  Auditoria? @relation(fields: [auditoriaId], references: [id])
  auditoriaId String?
  
  @@index([tabla, registroId])
  @@index([usuarioId, timestamp])
  @@map("audit_log")
}

model Evidencia {
  id          String   @id @default(cuid())
  nombre      String
  url         String
  tipo        String   // MIME type
  tamaño      Int      // bytes
  
  hallazgo    Hallazgo @relation(fields: [hallazgoId], references: [id], onDelete: Cascade)
  hallazgoId  String
  
  createdAt   DateTime @default(now())
  
  @@map("evidencia")
}

// =====================================================
// ENUMS
// =====================================================

enum PlanEstado {
  BORRADOR
  EN_REVISION
  APROBADO
  VIGENTE
  CERRADO
}

enum ActividadEstado {
  PENDIENTE
  EN_EJECUCION
  COMPLETADA
  RETRASADA
}

enum TipoAuditoria {
  SEDE_CENTRAL
  TERRITORIAL
  ESPECIAL
}

enum EstadoAuditoria {
  BACKLOG
  PLANEACION
  EJECUCION
  COMUNICACION
  CERRADO
}

enum RolEquipo {
  LIDER
  AUDITOR
  OBSERVADOR
}

enum TipoHallazgo {
  HALLAZGO
  OBSERVACION
  RECOMENDACION
}

enum TipoDocumento {
  PLAN_TRABAJO
  PAPEL_TRABAJO
  EVIDENCIA
  INFORME_PRELIMINAR
  INFORME_FINAL
  OTRO
}

enum EstadoPlanMejora {
  FORMULACION
  EN_REVISION
  EN_EJECUCION
  EN_SEGUIMIENTO
  EVALUACION_EFECTIVIDAD
  CERRADO
}

enum AccionEstado {
  PENDIENTE
  EN_PROCESO
  COMPLETADA
  PENDIENTE_VERIFICACION
}

enum EstadoSeguimiento {
  PENDIENTE
  EN_CURSO
  CERRADO
}

enum EstadoValidacion {
  PENDIENTE
  ACEPTADA
  CON_OBSERVACIONES
  RECHAZADA
}

enum Periodicidad {
  MENSUAL
  TRIMESTRAL
  CUATRIMESTRAL
  SEMESTRAL
  ANUAL
}

enum EstadoCumplimiento {
  PENDIENTE
  CUMPLIDO
  CUMPLIDO_EXTEMPORANEO
  NO_CUMPLIDO
}

enum Rol {
  JEFE_OCI
  AUDITOR_LIDER
  AUDITOR
  CONTRATISTA
  AREA_AUDITADA
  ADMIN
}
```

---

# 8. ENDPOINTS API REST

## 8.1 Plan Anual (RF001)
```
POST   /api/v1/plan-anual                    # Crear plan
GET    /api/v1/plan-anual                    # Listar planes
GET    /api/v1/plan-anual/:vigencia          # Obtener por vigencia
GET    /api/v1/plan-anual/:id                # Obtener por ID
PUT    /api/v1/plan-anual/:id                # Actualizar
POST   /api/v1/plan-anual/:id/aprobar        # Aprobar (valida 5 roles)
GET    /api/v1/plan-anual/:id/indicadores    # KPIs por rol
GET    /api/v1/plan-anual/:id/exportar-pdf   # Generar PDF
GET    /api/v1/plan-anual/:id/exportar-excel # Generar Excel EMFO001
```

## 8.2 Auditorías (RF004-009)
```
GET    /api/v1/auditorias                    # Listar (filtros: tipo, estado, responsable)
POST   /api/v1/auditorias                    # Crear
GET    /api/v1/auditorias/:id                # Detalle
PUT    /api/v1/auditorias/:id                # Actualizar
PATCH  /api/v1/auditorias/:id/estado         # Cambiar estado (Kanban move)
GET    /api/v1/auditorias/:id/equipo         # Obtener equipo
POST   /api/v1/auditorias/:id/equipo         # Agregar miembro
DELETE /api/v1/auditorias/:id/equipo/:usrId  # Remover miembro
POST   /api/v1/auditorias/:id/hallazgos      # Agregar hallazgo
GET    /api/v1/auditorias/:id/hallazgos      # Listar hallazgos
POST   /api/v1/auditorias/:id/documentos     # Subir documento
GET    /api/v1/auditorias/:id/documentos     # Listar documentos
POST   /api/v1/auditorias/:id/informe        # Generar informe
```

## 8.3 Planes Mejora (RF010-011)
```
GET    /api/v1/planes-mejora                 # Listar
POST   /api/v1/planes-mejora                 # Crear desde auditoría
GET    /api/v1/planes-mejora/:id             # Detalle
PUT    /api/v1/planes-mejora/:id             # Actualizar
GET    /api/v1/planes-mejora/:id/acciones    # Listar acciones
POST   /api/v1/planes-mejora/:id/acciones    # Agregar acción
PUT    /api/v1/planes-mejora/:id/acciones/:aId # Actualizar acción
GET    /api/v1/planes-mejora/:id/seguimientos # Listar seguimientos
POST   /api/v1/planes-mejora/:id/seguimiento  # Crear seguimiento trimestral
```

## 8.4 Seguimiento (Portal Área)
```
GET    /api/v1/mis-planes                    # Planes del usuario logueado
GET    /api/v1/seguimiento/:id               # Detalle seguimiento
POST   /api/v1/seguimiento/:id/evidencia     # Cargar evidencia (con archivo)
GET    /api/v1/seguimiento/:id/evidencias    # Listar evidencias
```

## 8.5 Validación OCI
```
GET    /api/v1/auditor/mis-seguimientos      # Seguimientos pendientes de validar
PUT    /api/v1/evidencia/:id/validar         # Aceptar/Observaciones
POST   /api/v1/seguimiento/:id/cerrar        # Cerrar seguimiento
```

## 8.6 Informes de Ley (RF014-016)
```
GET    /api/v1/informes-ley                  # Catálogo de informes
GET    /api/v1/informes-ley/calendario       # Calendario con fechas
GET    /api/v1/informes-ley/proximos         # Próximos a vencer
GET    /api/v1/informes-ley/:id              # Detalle informe
POST   /api/v1/informes-ley/:id/cumplir      # Marcar cumplido
GET    /api/v1/informes-ley/:id/historial    # Historial de cumplimientos
```

## 8.7 Reportes (RF017-019)
```
GET    /api/v1/reportes/dashboard            # KPIs ejecutivos
GET    /api/v1/reportes/pai-ejecucion        # % ejecución PAI
GET    /api/v1/reportes/auditorias-estado    # Auditorías por estado
GET    /api/v1/reportes/planes-mejora        # Estado planes mejora
GET    /api/v1/reportes/exportar/pdf         # Exportar PDF
GET    /api/v1/reportes/exportar/excel       # Exportar Excel
GET    /api/v1/reportes/sireci               # Formato SIRECI CGR
```

## 8.8 Configuración
```
GET    /api/v1/usuarios                      # Listar usuarios
POST   /api/v1/usuarios/sync-ad              # Sincronizar con AD
GET    /api/v1/territoriales                 # Listar territoriales
GET    /api/v1/procesos                      # Listar procesos
GET    /api/v1/audit-log                     # Consultar logs (admin)
```

---

# 9. CÓDIGO DE REFERENCIA

## 9.1 Constantes Normativas

```typescript
// src/common/constants/normativa.ts

// DECRETO 648/2017 - CONTROL INTERNO
export const DECRETO_648_ROLES = [
  { id: 'rol_1', numero: 1, nombre: 'Liderazgo Estratégico', articulo: 'Art. 2' },
  { id: 'rol_2', numero: 2, nombre: 'Enfoque hacia la Prevención', articulo: 'Art. 3' },
  { id: 'rol_3', numero: 3, nombre: 'Relación con Entes de Control', articulo: 'Art. 4' },
  { id: 'rol_4', numero: 4, nombre: 'Evaluación de la Gestión del Riesgo', articulo: 'Art. 5' },
  { id: 'rol_5', numero: 5, nombre: 'Evaluación y Seguimiento', articulo: 'Art. 6' }
];

// DAFP - GUÍA AUDITORÍA INTERNA
export const DAFP_CRITICIDAD = { ALTO: 5, MEDIO: 3, BAJO: 1 };
export const DAFP_EXPOSICION = { MAS_100: 5, ENTRE_50_100: 3, MENOS_50: 1 };

// EM-PT-004 - DURACIONES AUDITORÍA
export const DURACIONES_AUDITORIA = {
  SEDE_CENTRAL: {
    planeacion: { min: 5, max: 10, unidad: 'días' },
    ejecucion: { min: 10, max: 30, unidad: 'días' },
    comunicacion: { min: 10, max: 15, unidad: 'días' }
  },
  TERRITORIAL: {
    planeacion: { dias: 3, fijo: true },
    ejecucion: { dias: 4, fijo: true },  // ⚠️ SIEMPRE 4 DÍAS
    comunicacion: { dias: 2, fijo: true }
  }
};

// EM-PT-002 - SEGUIMIENTO TRIMESTRAL
export const SEGUIMIENTO_PERIODICIDAD = [
  { numero: 1, mes: 'JULIO', corte: '07-31', entrega: '08-07' },
  { numero: 2, mes: 'OCTUBRE', corte: '10-31', entrega: '11-07' },
  { numero: 3, mes: 'ENERO', corte: '01-31', entrega: '02-07' },
  { numero: 4, mes: 'ABRIL', corte: '04-30', entrega: '05-07' }
];

// ALERTAS
export const ALERTAS_CONFIG = {
  RECORDATORIO_PREVIO: 7,   // días antes
  ALERTA_VENCIMIENTO: 0,    // día del vencimiento
  ESCALAMIENTO: 3           // días después sin acción
};

// SEGURIDAD - Ley 1581/2012
export const SECURITY_CONFIG = {
  TLS_VERSION: '1.3',
  CIFRADO_ALGORITMO: 'AES-256',
  RETENCION_LOGS_DIAS: 90,
  CONSENTIMIENTO_REQUERIDO: true
};
```

## 9.2 Fórmulas de Cálculo

```typescript
// src/common/utils/formulas.ts

/**
 * FÓRMULA CUMPLIMIENTO (Excel EMFO002 columna L)
 * Original: =IF(K>=F,2,IF(K>=1,1,0))
 * 
 * @returns 2 = Cumplimiento total (100%)
 * @returns 1 = Cumplimiento parcial (1-99%)
 * @returns 0 = Sin cumplimiento (0%)
 */
export const calcularCumplimiento = (
  cantidadImplementada: number, 
  cantidadProgramada: number
): number => {
  if (cantidadImplementada >= cantidadProgramada) return 2;
  if (cantidadImplementada >= 1) return 1;
  return 0;
};

/**
 * FÓRMULA EFECTIVIDAD
 * @returns 2 = Efectiva (ambas SI)
 * @returns 1 = Parcialmente efectiva (una SI)
 * @returns 0 = Inefectiva (ambas NO)
 */
export const calcularEfectividad = (
  controlesAplicados: boolean,
  situacionNoRepitio: boolean
): number => {
  if (controlesAplicados && situacionNoRepitio) return 2;
  if (controlesAplicados || situacionNoRepitio) return 1;
  return 0;
};

/**
 * SEMÁFORO VISUAL
 */
export const getSemaforo = (porcentaje: number): 'VERDE' | 'AMARILLO' | 'ROJO' => {
  if (porcentaje >= 80) return 'VERDE';
  if (porcentaje >= 50) return 'AMARILLO';
  return 'ROJO';
};

/**
 * FÓRMULA RIESGO DAFP
 * Resultado: Alto (>10), Medio (5-10), Bajo (<5)
 */
export const calcularRiesgoDafp = (
  criticidad: number, 
  exposicion: number, 
  mitigantes: number
): number => {
  return (criticidad * exposicion) / Math.max(mitigantes, 1);
};

/**
 * PLAN DE ROTACIÓN
 */
export const calcularFrecuenciaAuditoria = (
  nivelRiesgo: 'EXTREMO' | 'ALTO' | 'MODERADO' | 'BAJO',
  resultadoAnterior: 'ADECUADO' | 'INADECUADO'
): number => {
  const base = {
    EXTREMO: 1,
    ALTO: resultadoAnterior === 'INADECUADO' ? 1 : 2,
    MODERADO: resultadoAnterior === 'INADECUADO' ? 2 : 3,
    BAJO: resultadoAnterior === 'INADECUADO' ? 3 : 4
  };
  return base[nivelRiesgo];
};
```

## 9.3 Validadores

```typescript
// src/validators/plan-anual.validator.ts

import { DECRETO_648_ROLES } from '../common/constants/normativa';

export class PlanAnualValidator {
  /**
   * CRÍTICO: Decreto 648 - Exactamente 5 roles
   */
  validarRolesPresentes(roles: any[]) {
    if (roles.length !== 5) {
      throw new ValidationError(
        'Decreto 648/2017: El Plan Anual DEBE contener EXACTAMENTE 5 roles'
      );
    }
    
    // Verificar que sean los roles correctos
    const nombresRequeridos = DECRETO_648_ROLES.map(r => r.nombre);
    const nombresPresentes = roles.map(r => r.nombre);
    const faltantes = nombresRequeridos.filter(n => !nombresPresentes.includes(n));
    
    if (faltantes.length > 0) {
      throw new ValidationError(`Faltan roles del Decreto 648: ${faltantes.join(', ')}`);
    }
  }

  /**
   * Cada rol sin actividades = error
   */
  validarActividadesPorRol(roles: any[]) {
    const rolesVacios = roles.filter(r => !r.actividades || r.actividades.length === 0);
    if (rolesVacios.length > 0) {
      throw new ValidationError(
        `Los siguientes roles no tienen actividades asignadas: ${rolesVacios.map(r => r.nombre).join(', ')}`
      );
    }
  }

  /**
   * Validar que responsables existen en AD
   */
  async validarResponsables(responsableIds: string[], adClient: ADClient) {
    const usuarios = await adClient.findByIds(responsableIds);
    const faltantes = responsableIds.filter(id => !usuarios.find(u => u.id === id));
    if (faltantes.length > 0) {
      throw new ValidationError(`Responsables no encontrados en Active Directory: ${faltantes.join(', ')}`);
    }
  }

  /**
   * Fechas dentro del año fiscal
   */
  validarFechas(fechaInicio: Date, fechaFin: Date, año: number) {
    if (fechaInicio.getFullYear() !== año || fechaFin.getFullYear() !== año) {
      throw new ValidationError(`Las fechas deben estar dentro del año fiscal ${año}`);
    }
    if (fechaFin <= fechaInicio) {
      throw new ValidationError('La fecha de fin debe ser posterior a la fecha de inicio');
    }
  }
}

// src/validators/auditoria.validator.ts

export class AuditoriaValidator {
  /**
   * CRÍTICO: Duración territorial ejecución = 4 días FIJO
   */
  validarDuracionTerritorial(auditoria: any, cronograma: any) {
    if (auditoria.esTerritorial && cronograma.ejecucion.duracionDias !== 4) {
      throw new ValidationError(
        'Las auditorías territoriales DEBEN tener exactamente 4 días de ejecución'
      );
    }
  }

  /**
   * Validar transición de estados Kanban
   */
  validarTransicionEstado(estadoActual: string, estadoNuevo: string, auditoria: any) {
    const transicionesValidas = {
      BACKLOG: ['PLANEACION'],
      PLANEACION: ['EJECUCION', 'BACKLOG'],
      EJECUCION: ['COMUNICACION', 'PLANEACION'],
      COMUNICACION: ['CERRADO', 'EJECUCION'],
      CERRADO: []
    };

    if (!transicionesValidas[estadoActual].includes(estadoNuevo)) {
      throw new ValidationError(
        `No se puede cambiar de ${estadoActual} a ${estadoNuevo}`
      );
    }

    // Validaciones específicas por transición
    if (estadoActual === 'BACKLOG' && estadoNuevo === 'PLANEACION') {
      if (!auditoria.equipoAuditor || auditoria.equipoAuditor.length === 0) {
        throw new ValidationError('Debe asignar equipo auditor antes de iniciar planeación');
      }
    }

    if (estadoActual === 'PLANEACION' && estadoNuevo === 'EJECUCION') {
      if (!auditoria.planTrabajoAprobado) {
        throw new ValidationError('Debe aprobar el Plan de Trabajo Individual antes de iniciar ejecución');
      }
    }

    if (estadoActual === 'EJECUCION' && estadoNuevo === 'COMUNICACION') {
      if (!auditoria.hallazgos || auditoria.hallazgos.length === 0) {
        throw new ValidationError('Debe registrar al menos un hallazgo antes de pasar a comunicación');
      }
    }

    if (estadoActual === 'COMUNICACION' && estadoNuevo === 'CERRADO') {
      if (!auditoria.informeFinal) {
        throw new ValidationError('Debe generar el informe final antes de cerrar');
      }
      if (!auditoria.planMejora) {
        throw new ValidationError('Debe crear el plan de mejoramiento antes de cerrar');
      }
    }
  }
}
```

## 9.4 Services

```typescript
// src/services/plan-anual.service.ts

export class PlanAnualService {
  constructor(
    private prisma: PrismaClient,
    private auditLogService: AuditLogService,
    private notificationService: NotificationService,
    private documentService: DocumentService,
    private adClient: ADClient
  ) {}

  async crearPlanAnual(dto: CreatePlanAnualDto, usuarioId: string) {
    // Validar
    const validator = new PlanAnualValidator();
    validator.validarRolesPresentes(dto.roles);
    validator.validarActividadesPorRol(dto.roles);
    await validator.validarResponsables(
      dto.roles.flatMap(r => r.actividades.map(a => a.responsableId)),
      this.adClient
    );

    // Crear con transacción
    const plan = await this.prisma.$transaction(async (tx) => {
      const planCreado = await tx.planAnual.create({
        data: {
          vigencia: dto.vigencia,
          estado: 'BORRADOR',
          jefeOciId: usuarioId,
          roles: {
            create: dto.roles.map((rol, idx) => ({
              numero: idx + 1,
              nombre: rol.nombre,
              descripcion: rol.descripcion,
              articulo: rol.articulo,
              actividades: {
                create: rol.actividades.map(act => ({
                  nombre: act.nombre,
                  descripcion: act.descripcion,
                  responsableId: act.responsableId,
                  fechaInicio: act.fechaInicio,
                  fechaFin: act.fechaFin
                }))
              }
            }))
          }
        },
        include: { roles: { include: { actividades: true } } }
      });

      return planCreado;
    });

    // Auditoría
    await this.auditLogService.registrar(
      usuarioId,
      'Crear Plan Anual',
      'plan_anual',
      plan.id,
      { operacion: 'CREACION', vigencia: dto.vigencia }
    );

    // Notificar
    await this.notificationService.enviar(
      usuarioId,
      `Plan Anual ${dto.vigencia} creado exitosamente`,
      'success'
    );

    return plan;
  }

  async aprobarPlanAnual(planId: string, actaCICC: string, usuarioId: string) {
    const plan = await this.prisma.planAnual.findUnique({
      where: { id: planId },
      include: { roles: { include: { actividades: true } } }
    });

    if (!plan) throw new NotFoundError('Plan no encontrado');
    if (plan.estado !== 'BORRADOR' && plan.estado !== 'EN_REVISION') {
      throw new ValidationError('Solo se pueden aprobar planes en estado BORRADOR o EN_REVISION');
    }

    // Validaciones de aprobación
    const validator = new PlanAnualValidator();
    validator.validarRolesPresentes(plan.roles);
    validator.validarActividadesPorRol(plan.roles);

    // Actualizar
    const updated = await this.prisma.planAnual.update({
      where: { id: planId },
      data: {
        estado: 'APROBADO',
        fechaAprobacion: new Date(),
        actaCICC: actaCICC,
        version: { increment: 1 }
      }
    });

    // Auditoría
    await this.auditLogService.registrar(
      usuarioId,
      'Aprobar Plan Anual',
      'plan_anual',
      planId,
      { estado: 'APROBADO', actaCICC }
    );

    // Generar PDF
    await this.documentService.generarPdfPlanAnual(updated);

    // Notificar a todos los auditores
    const auditores = await this.prisma.usuario.findMany({
      where: { rol: { in: ['AUDITOR_LIDER', 'AUDITOR', 'CONTRATISTA'] } }
    });
    for (const auditor of auditores) {
      await this.notificationService.enviar(
        auditor.id,
        `Plan Anual ${plan.vigencia} aprobado. Revise sus actividades asignadas.`,
        'info'
      );
    }

    return updated;
  }

  async calcularIndicadores(planId: string) {
    const plan = await this.prisma.planAnual.findUnique({
      where: { id: planId },
      include: { roles: { include: { actividades: true } } }
    });

    return plan.roles.map(rol => {
      const total = rol.actividades.length;
      const completadas = rol.actividades.filter(a => a.estado === 'COMPLETADA').length;
      const enEjecucion = rol.actividades.filter(a => a.estado === 'EN_EJECUCION').length;
      const retrasadas = rol.actividades.filter(a => a.estado === 'RETRASADA').length;
      const porcentaje = total > 0 ? Math.round((completadas / total) * 100) : 0;

      return {
        rolId: rol.id,
        rolNumero: rol.numero,
        rolNombre: rol.nombre,
        actividadesTotal: total,
        actividadesCompletadas: completadas,
        actividadesEnEjecucion: enEjecucion,
        actividadesRetrasadas: retrasadas,
        porcentajeCumplimiento: porcentaje,
        semaforo: getSemaforo(porcentaje)
      };
    });
  }
}
```

```typescript
// src/services/seguimiento.service.ts

export class SeguimientoService {
  constructor(
    private prisma: PrismaClient,
    private auditLogService: AuditLogService,
    private notificationService: NotificationService,
    private emailService: EmailService,
    private storageService: StorageService
  ) {}

  /**
   * Job que se ejecuta diariamente para enviar recordatorios
   */
  async enviarRecordatorios() {
    const ahora = new Date();
    const fechaObjetivo = addDays(ahora, 7); // 7 días antes

    const planes = await this.prisma.planMejoramiento.findMany({
      where: {
        estado: { in: ['EN_EJECUCION', 'EN_SEGUIMIENTO'] },
        seguimientos: {
          some: {
            estado: 'PENDIENTE',
            fechaCorte: {
              gte: startOfDay(fechaObjetivo),
              lt: endOfDay(fechaObjetivo)
            }
          }
        }
      },
      include: {
        areaAuditada: true,
        acciones: true,
        seguimientos: { where: { estado: 'PENDIENTE' } }
      }
    });

    for (const plan of planes) {
      const responsable = plan.areaAuditada;
      const accionesIncompletas = plan.acciones.filter(a => a.estado !== 'COMPLETADA');
      const seguimiento = plan.seguimientos[0];

      // Enviar correo
      await this.emailService.enviar({
        to: responsable.email,
        subject: `Recordatorio: Seguimiento Plan de Mejoramiento - ${seguimiento.mesSeguimiento}`,
        template: 'recordatorio-seguimiento',
        data: {
          nombreResponsable: `${responsable.nombre} ${responsable.apellido}`,
          planId: plan.id,
          accionesIncompletas: accionesIncompletas.length,
          fechaLimite: format(seguimiento.fechaCorte, 'dd/MM/yyyy'),
          linkPortal: `${process.env.APP_URL}/mis-planes/${plan.id}/seguimiento/${seguimiento.id}`
        }
      });

      // Notificación in-app
      await this.notificationService.enviar(
        responsable.id,
        `Tiene ${accionesIncompletas.length} acciones pendientes para el seguimiento de ${seguimiento.mesSeguimiento}`,
        'warning',
        { link: `/mis-planes/${plan.id}` }
      );

      // Auditoría
      await this.auditLogService.registrar(
        'SYSTEM',
        'Enviar recordatorio seguimiento',
        'seguimiento_plan_mejora',
        seguimiento.id,
        { diasAntes: 7, accionesIncompletas: accionesIncompletas.length }
      );
    }

    return { planesNotificados: planes.length };
  }

  /**
   * Cargar evidencia desde Portal Área
   */
  async cargarEvidencia(
    seguimientoId: string,
    accionId: string,
    cantidadImplementada: number,
    archivo: Express.Multer.File,
    usuarioId: string
  ) {
    // Validar permisos
    const seguimiento = await this.prisma.seguimientoPlanMejora.findUnique({
      where: { id: seguimientoId },
      include: { planMejora: true }
    });

    if (seguimiento.planMejora.areaAuditadaId !== usuarioId) {
      throw new ForbiddenError('No tiene permisos para cargar evidencias en este plan');
    }

    // Validar archivo
    if (archivo.size > 50 * 1024 * 1024) {
      throw new ValidationError('El archivo debe ser menor a 50MB');
    }
    const tiposPermitidos = ['application/pdf', 'application/vnd.ms-excel', 
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'image/jpeg', 'image/png'];
    if (!tiposPermitidos.includes(archivo.mimetype)) {
      throw new ValidationError('Tipo de archivo no permitido');
    }

    // Obtener acción para calcular cumplimiento
    const accion = await this.prisma.accionCorrectiva.findUnique({
      where: { id: accionId }
    });

    // Subir a Azure Blob
    const blobName = `evidencias/${seguimiento.planMejoraId}/${accionId}/${Date.now()}-${archivo.originalname}`;
    const url = await this.storageService.uploadFile(archivo.buffer, blobName, archivo.mimetype);

    // Crear/actualizar registro
    const accionSeguimiento = await this.prisma.accionSeguimiento.upsert({
      where: {
        seguimientoId_accionId: { seguimientoId, accionId }
      },
      create: {
        seguimientoId,
        accionId,
        cantidadImplementada,
        cumplimiento: calcularCumplimiento(cantidadImplementada, accion.cantidadProgramada),
        evidencias: {
          create: {
            evidenciaOriginal: url,
            calificacion: 'PENDIENTE'
          }
        }
      },
      update: {
        cantidadImplementada,
        cumplimiento: calcularCumplimiento(cantidadImplementada, accion.cantidadProgramada),
        evidencias: {
          create: {
            evidenciaOriginal: url,
            calificacion: 'PENDIENTE'
          }
        }
      }
    });

    // Notificar al auditor asignado
    const auditoria = await this.prisma.auditoria.findFirst({
      where: { planMejora: { id: seguimiento.planMejoraId } }
    });
    await this.notificationService.enviar(
      auditoria.auditorLiderId,
      `Nueva evidencia cargada para validación`,
      'info',
      { link: `/auditor/seguimientos/${seguimientoId}` }
    );

    // Auditoría
    await this.auditLogService.registrar(
      usuarioId,
      'Cargar evidencia',
      'accion_seguimiento',
      accionSeguimiento.id,
      { cantidadImplementada, archivo: archivo.originalname }
    );

    return accionSeguimiento;
  }

  /**
   * Validar evidencia (Auditor OCI)
   */
  async validarEvidencia(
    evidenciaId: string,
    calificacion: 'ACEPTADA' | 'CON_OBSERVACIONES',
    comentarios: string,
    solicitarNueva: boolean,
    usuarioId: string
  ) {
    const evidencia = await this.prisma.evidenciaValidada.update({
      where: { id: evidenciaId },
      data: {
        calificacion,
        comentariosAuditor: comentarios,
        validadoPorId: usuarioId,
        fechaValidacion: new Date(),
        solicitudNuevaEvidencia: solicitarNueva
      },
      include: {
        accionSeguimiento: {
          include: {
            seguimiento: {
              include: { planMejora: true }
            }
          }
        }
      }
    });

    // Notificar al área auditada
    const responsableId = evidencia.accionSeguimiento.seguimiento.planMejora.areaAuditadaId;
    await this.notificationService.enviar(
      responsableId,
      calificacion === 'ACEPTADA' 
        ? 'Su evidencia ha sido aceptada'
        : `Su evidencia tiene observaciones: ${comentarios}`,
      calificacion === 'ACEPTADA' ? 'success' : 'warning'
    );

    // Auditoría
    await this.auditLogService.registrar(
      usuarioId,
      'Validar evidencia',
      'evidencia_validada',
      evidenciaId,
      { calificacion, comentarios, solicitarNueva }
    );

    return evidencia;
  }

  /**
   * Cerrar seguimiento trimestral
   */
  async cerrarSeguimiento(seguimientoId: string, usuarioId: string) {
    const seguimiento = await this.prisma.seguimientoPlanMejora.findUnique({
      where: { id: seguimientoId },
      include: {
        acciones: { include: { evidencias: true } },
        planMejora: true
      }
    });

    // Calcular cumplimiento total
    const totalAcciones = seguimiento.acciones.length;
    const accionesCompletadas = seguimiento.acciones.filter(a => a.cumplimiento === 2).length;
    const cumplimientoPromedio = totalAcciones > 0 
      ? Math.round((accionesCompletadas / totalAcciones) * 100) 
      : 0;

    const semaforo = getSemaforo(cumplimientoPromedio);

    // Actualizar seguimiento
    await this.prisma.seguimientoPlanMejora.update({
      where: { id: seguimientoId },
      data: {
        estado: 'CERRADO',
        fechaEntrega: new Date()
      }
    });

    // Actualizar plan si todas las acciones están completas
    if (cumplimientoPromedio === 100) {
      await this.prisma.planMejoramiento.update({
        where: { id: seguimiento.planMejoraId },
        data: { estado: 'EVALUACION_EFECTIVIDAD' }
      });
    }

    // Auditoría
    await this.auditLogService.registrar(
      usuarioId,
      'Cerrar seguimiento',
      'seguimiento_plan_mejora',
      seguimientoId,
      { cumplimientoPromedio, semaforo, accionesCompletadas, totalAcciones }
    );

    // Notificar Jefe OCI
    const jefeOci = await this.prisma.usuario.findFirst({ where: { rol: 'JEFE_OCI' } });
    await this.notificationService.enviar(
      jefeOci.id,
      `Seguimiento ${seguimiento.mesSeguimiento} cerrado: ${semaforo} (${cumplimientoPromedio}%)`,
      semaforo === 'VERDE' ? 'success' : semaforo === 'AMARILLO' ? 'warning' : 'error'
    );

    return { semaforo, cumplimientoPromedio, accionesCompletadas, totalAcciones };
  }
}
```

---

# 10. ESPECIFICACIONES DE UI/UX

## 10.1 Paleta de Colores Institucional ESAP

```css
/* Colores Primarios */
--esap-primary:      #1B4F72;  /* Azul ESAP oscuro */
--esap-secondary:    #2874A6;  /* Azul medio */
--esap-accent:       #2E86AB;  /* Azul claro */

/* Estados Kanban */
--kanban-backlog:    #E8F4F8;  /* Azul muy claro */
--kanban-planeacion: #FEF9E7;  /* Amarillo claro */
--kanban-ejecucion:  #D4EFDF;  /* Verde claro */
--kanban-comunicacion: #FADBD8; /* Rosa claro */
--kanban-cerrado:    #D5D8DC;  /* Gris claro */

/* Semáforos */
--semaforo-verde:    #27AE60;
--semaforo-amarillo: #F39C12;
--semaforo-rojo:     #E74C3C;

/* Alertas */
--alerta-exito:      #27AE60;
--alerta-warning:    #F39C12;
--alerta-error:      #E74C3C;
--alerta-info:       #3498DB;

/* Fondos */
--bg-primary:        #FFFFFF;
--bg-secondary:      #F8F9FA;
--bg-tertiary:       #E9ECEF;

/* Texto */
--text-primary:      #2C3E50;
--text-secondary:    #6C757D;
--text-muted:        #ADB5BD;
```

## 10.2 Tipografía

```css
/* Familia principal */
font-family: 'Inter', 'Source Sans Pro', -apple-system, sans-serif;

/* Tamaños */
--font-title:    32px / 40px, font-weight: 700;
--font-h1:       28px / 36px, font-weight: 700;
--font-h2:       24px / 32px, font-weight: 600;
--font-h3:       20px / 28px, font-weight: 600;
--font-body:     16px / 24px, font-weight: 400;
--font-small:    14px / 20px, font-weight: 400;
--font-caption:  12px / 16px, font-weight: 400;
```

## 10.3 Wireframes de Pantallas Principales

### Dashboard Principal
```
┌─────────────────────────────────────────────────────────────────────┐
│ ┌─────┐  SISTEMA DE CONTROL INTERNO DE GESTIÓN          👤 Usuario  │
│ │ESAP │  ─────────────────────────────────────────────  ⚙️ 🔔      │
│ └─────┘                                                             │
├─────────┬───────────────────────────────────────────────────────────┤
│         │                                                           │
│ 📊 Dash │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐         │
│ 📋 PAI  │  │   78%   │ │    5    │ │    3    │ │    2    │         │
│ 📝 Audit│  │Ejecución│ │Auditorías│ │ Planes  │ │Informes │         │
│ 📈 Planes│  │   PAI   │ │ Activas │ │Vencidos │ │Pendientes│        │
│ 📅 Inform│  └─────────┘ └─────────┘ └─────────┘ └─────────┘         │
│ ⚙️ Config│                                                          │
│         │  ┌─────────────────────────────────────────────────────┐  │
│         │  │         AUDITORÍAS POR ESTADO                       │  │
│         │  │  ████████████ 8                                     │  │
│         │  │  ██████ 4                                           │  │
│         │  │  ████ 3                                             │  │
│         │  │  ██ 2                                               │  │
│         │  │  █ 1                                                │  │
│         │  │  Backlog  Planeación  Ejecución  Comunicación Cerrado│  │
│         │  └─────────────────────────────────────────────────────┘  │
│         │                                                           │
│         │  ┌─────────────────────────────────────────────────────┐  │
│         │  │  📅 PRÓXIMOS VENCIMIENTOS                           │  │
│         │  │  ──────────────────────────────────────────────────  │  │
│         │  │  🔴 Informe PTEP - Vence en 2 días                  │  │
│         │  │  🟡 Auditoría Financiera - Cierre en 5 días         │  │
│         │  │  🟢 Seguimiento Julio - En 12 días                  │  │
│         │  └─────────────────────────────────────────────────────┘  │
│         │                                                           │
└─────────┴───────────────────────────────────────────────────────────┘
```

### Tablero Kanban Auditorías
```
┌─────────────────────────────────────────────────────────────────────┐
│  AUDITORÍAS 2025                    [+ Nueva Auditoría] 🔍 Filtrar  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  BACKLOG (3)    PLANEACIÓN (2)   EJECUCIÓN (4)   COMUNICACIÓN (2)   │
│  ┌─────────┐    ┌─────────┐      ┌─────────┐     ┌─────────┐       │
│  │AUD-001  │    │AUD-004  │      │AUD-007  │     │AUD-011  │       │
│  │Gestión  │    │Talento  │      │Financiera│     │Admin    │       │
│  │Administ.│    │Humano   │      │         │     │         │       │
│  │         │    │         │      │ ████ 60%│     │ ██████ │       │
│  │👤 F.Ávila│    │👤 L.Villamil│   │👤 C.Rubio│     │👤 F.Ávila│       │
│  │📅 Mar 15│    │📅 Feb 28│      │⚠️ Feb 20│     │📅 Mar 5 │       │
│  └─────────┘    └─────────┘      └─────────┘     └─────────┘       │
│  ┌─────────┐    ┌─────────┐      ┌─────────┐     ┌─────────┐       │
│  │AUD-002  │    │AUD-005  │      │AUD-008  │     │AUD-012  │       │
│  │Territorial│   │         │      │TERRITORIAL│    │         │       │
│  │Antioquia│    │...      │      │Meta     │     │...      │       │
│  │         │    │         │      │ ██ 30% │     │         │       │
│  │👤 N.Cañon│    │         │      │👤 W.Alonso│    │         │       │
│  └─────────┘    └─────────┘      └─────────┘     └─────────┘       │
│  ┌─────────┐                     ┌─────────┐                       │
│  │AUD-003  │                     │AUD-009  │                       │
│  │...      │                     │...      │                       │
│  └─────────┘                     └─────────┘                       │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Tarjeta Kanban (Componente)
```
┌─────────────────────────────────────┐
│ AUD-2025-007                    🟡  │  ← Semáforo estado
│ Auditoría Gestión Financiera        │
├─────────────────────────────────────┤
│ 👤 Catalina Rubio (Líder)           │
│ 👥 +3 auditores                     │
├─────────────────────────────────────┤
│ 📅 Inicio: 15/01/2025               │
│ 📅 Fin:    28/02/2025               │
├─────────────────────────────────────┤
│ Progreso                            │
│ ████████████░░░░░░░░ 60%            │
├─────────────────────────────────────┤
│ 🏷️ SEDE CENTRAL                     │
│ ⚠️ Vence en 5 días                  │
└─────────────────────────────────────┘
```

### Portal Área Auditada
```
┌─────────────────────────────────────────────────────────────────────┐
│ MIS PLANES DE MEJORAMIENTO                              👤 Usuario  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │ 🟡 Plan Mejoramiento - Auditoría Gestión Financiera 2024      │  │
│  │ ─────────────────────────────────────────────────────────────  │  │
│  │ Seguimiento: OCTUBRE 2025                     [Cargar Evidencia] │
│  │                                                                │  │
│  │ ACCIONES PENDIENTES:                                          │  │
│  │ ┌─────────────────────────────────────────────────────────┐   │  │
│  │ │ ☐ Implementar control de inventarios                    │   │  │
│  │ │   Cantidad: 2/5  │  Vence: 31/10/2025  │  🟡 Parcial    │   │  │
│  │ │   [📎 Cargar evidencia]                                 │   │  │
│  │ └─────────────────────────────────────────────────────────┘   │  │
│  │ ┌─────────────────────────────────────────────────────────┐   │  │
│  │ │ ☑ Capacitar personal en procedimiento                   │   │  │
│  │ │   Cantidad: 3/3  │  Entregado: 15/10  │  🟢 Completo    │   │  │
│  │ │   ✓ Evidencia validada por OCI                          │   │  │
│  │ └─────────────────────────────────────────────────────────┘   │  │
│  │ ┌─────────────────────────────────────────────────────────┐   │  │
│  │ │ ☐ Actualizar manual de procedimientos                   │   │  │
│  │ │   Cantidad: 0/1  │  Vence: 31/10/2025  │  🔴 Pendiente  │   │  │
│  │ │   [📎 Cargar evidencia]                                 │   │  │
│  │ └─────────────────────────────────────────────────────────┘   │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Modal Carga de Evidencia
```
┌─────────────────────────────────────────────────────────────────────┐
│ CARGAR EVIDENCIA                                              [X]   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Acción: Implementar control de inventarios                         │
│  Meta: 5 controles                                                  │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                                                             │   │
│  │        📁 Arrastre archivos aquí o haga clic               │   │
│  │                                                             │   │
│  │        Formatos: PDF, Excel, JPG, PNG                      │   │
│  │        Máximo: 50 MB                                       │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  Cantidad implementada: [  3  ] / 5                                 │
│                                                                     │
│  Observaciones:                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                                                             │   │
│  │                                                             │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│                              [Cancelar]  [✓ Enviar Evidencia]       │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

## 10.4 Componentes Reutilizables

| Componente | Especificaciones |
|------------|-----------------|
| **Tarjeta Kanban** | 280px ancho, padding 16px, border-radius 8px, sombra sutil |
| **Botón Primario** | bg: #1B4F72, text: white, padding: 12px 24px, radius: 6px |
| **Botón Secundario** | bg: transparent, border: 1px #1B4F72, text: #1B4F72 |
| **Campo Input** | border: 1px #D5D8DC, radius: 4px, padding: 10px, focus: border #2874A6 |
| **Tabla** | headers: bg #F8F9FA, rows: hover #E9ECEF, border: 1px #DEE2E6 |
| **Modal** | max-width: 600px, padding: 24px, radius: 12px, overlay: rgba(0,0,0,0.5) |
| **Toast** | fixed bottom-right, padding: 16px, radius: 8px, auto-dismiss 5s |
| **Badge/Etiqueta** | padding: 4px 8px, radius: 4px, font-size: 12px |
| **Avatar** | 32px círculo, borde 2px según rol (azul líder, gris auditor) |

## 10.5 Responsive Design

| Breakpoint | Adaptaciones |
|------------|--------------|
| **Desktop ≥1440px** | Sidebar 240px visible, Kanban 5 columnas, tablas completas |
| **Tablet 768-1439px** | Sidebar colapsada (iconos), Kanban scroll horizontal, tablas responsivas |
| **Mobile ≤767px** | Sin sidebar (menú hamburguesa), vista lista en lugar de Kanban, formularios full-width |

## 10.6 Accesibilidad (WCAG AA)

- Contraste mínimo 4.5:1 para texto
- Focus visible en todos los elementos interactivos
- Labels asociados a inputs con `for`
- Textos alternativos en iconos (`aria-hidden="true"` para decorativos)
- Roles ARIA en componentes complejos (tabs, modales, dropdowns)
- Navegación completa por teclado

---

# 11. VALIDACIONES NORMATIVAS EN CÓDIGO

## 11.1 Resumen de Validaciones Críticas

| Validación | Norma | Dónde Aplica | Código |
|------------|-------|--------------|--------|
| Exactamente 5 roles | Decreto 648/2017 | RF001 - Plan Anual | `roles.length !== 5 → Error` |
| Cada rol ≥1 actividad | Decreto 648/2017 | RF001 - Plan Anual | `rol.actividades.length === 0 → Error` |
| Ejecución territorial = 4 días | EM-PT-004 | RF003, RF006 | `esTerritorial && dias !== 4 → Error` |
| Fórmula cumplimiento | EM-FO-002 | RF011 | `IF(K>=F,2,IF(K>=1,1,0))` |
| Alertas 7 días antes | EM-PT-002 | RF011 | Job diario verifica `fechaCorte - 7` |
| Auditoría de cambios | Compliance | Todo | `AuditLog` en cada operación |

## 11.2 Constantes Normativas (Código)

```typescript
// src/common/constants/normativa.ts

// DECRETO 648/2017
export const VALIDAR_DECRETO_648 = (roles: any[]) => {
  if (roles.length !== 5) {
    throw new Error('Decreto 648/2017: Se requieren exactamente 5 roles');
  }
  roles.forEach(rol => {
    if (!rol.actividades || rol.actividades.length === 0) {
      throw new Error(`Decreto 648/2017: El rol "${rol.nombre}" debe tener al menos 1 actividad`);
    }
  });
};

// EM-PT-004 - DURACIONES
export const VALIDAR_DURACION_TERRITORIAL = (esTerritorial: boolean, diasEjecucion: number) => {
  if (esTerritorial && diasEjecucion !== 4) {
    throw new Error('EM-PT-004: Las auditorías territoriales DEBEN tener 4 días de ejecución');
  }
};

// EM-FO-002 - CUMPLIMIENTO
export const FORMULA_CUMPLIMIENTO = (cantImpl: number, cantProg: number): number => {
  if (cantImpl >= cantProg) return 2;  // Completo
  if (cantImpl >= 1) return 1;          // Parcial
  return 0;                              // Pendiente
};

// EM-PT-002 - EFECTIVIDAD
export const FORMULA_EFECTIVIDAD = (controlesAplicados: boolean, noRepitio: boolean): number => {
  if (controlesAplicados && noRepitio) return 2;  // Efectiva
  if (controlesAplicados || noRepitio) return 1;  // Parcial
  return 0;                                        // Inefectiva
};
```

---

# 12. TESTS CRÍTICOS

```typescript
// tests/criticos.test.ts

describe('CRÍTICO - Decreto 648/2017', () => {
  test('Plan Anual DEBE tener EXACTAMENTE 5 roles', async () => {
    const planIncompleto = { roles: [1, 2, 3, 4] }; // Solo 4
    expect(() => VALIDAR_DECRETO_648(planIncompleto.roles))
      .toThrow('exactamente 5 roles');
  });

  test('Cada rol DEBE tener al menos 1 actividad', async () => {
    const planConRolVacio = { 
      roles: [
        { nombre: 'Rol1', actividades: [{...}] },
        { nombre: 'Rol2', actividades: [] },  // VACÍO
        // ...
      ]
    };
    expect(() => VALIDAR_DECRETO_648(planConRolVacio.roles))
      .toThrow('al menos 1 actividad');
  });

  test('No permite aprobar plan sin los 5 roles completos', async () => {
    const service = new PlanAnualService(mockPrisma);
    await expect(service.aprobarPlanAnual('plan-incompleto', 'acta-123', 'user1'))
      .rejects.toThrow();
  });
});

describe('CRÍTICO - Territoriales (EM-PT-004)', () => {
  test('Ejecución territorial = 4 días (FIJO, sin excepción)', async () => {
    expect(() => VALIDAR_DURACION_TERRITORIAL(true, 5))
      .toThrow('4 días de ejecución');
    
    expect(() => VALIDAR_DURACION_TERRITORIAL(true, 4))
      .not.toThrow();
  });

  test('Cronograma territorial generado correctamente', async () => {
    const auditoria = { esTerritorial: true };
    const cronograma = generarCronograma(auditoria);
    expect(cronograma.ejecucion.duracionDias).toBe(4);
    expect(cronograma.planeacion.duracionDias).toBe(3);
    expect(cronograma.comunicacion.duracionDias).toBe(2);
  });
});

describe('CRÍTICO - Fórmula Cumplimiento (EM-FO-002)', () => {
  test('IF(K>=F,2,IF(K>=1,1,0))', () => {
    expect(FORMULA_CUMPLIMIENTO(0, 10)).toBe(0);   // Pendiente
    expect(FORMULA_CUMPLIMIENTO(1, 10)).toBe(1);   // Parcial
    expect(FORMULA_CUMPLIMIENTO(5, 10)).toBe(1);   // Parcial
    expect(FORMULA_CUMPLIMIENTO(10, 10)).toBe(2);  // Completo
    expect(FORMULA_CUMPLIMIENTO(15, 10)).toBe(2);  // Superó meta = Completo
  });
});

describe('CRÍTICO - Seguimiento Trimestral', () => {
  test('Alerta enviada exactamente 7 días antes del corte', async () => {
    const hoy = new Date('2025-07-24');
    const seguimiento = { fechaCorte: new Date('2025-07-31') };
    const alertas = await service.obtenerAlertasPendientes(hoy);
    expect(alertas).toContainEqual(expect.objectContaining({
      tipo: 'RECORDATORIO_SEGUIMIENTO',
      diasRestantes: 7
    }));
  });

  test('Semáforo calculado correctamente', () => {
    expect(getSemaforo(85)).toBe('VERDE');
    expect(getSemaforo(65)).toBe('AMARILLO');
    expect(getSemaforo(40)).toBe('ROJO');
  });
});

describe('CRÍTICO - Auditoría de Cambios (Compliance)', () => {
  test('Cada cambio registra quién, cuándo, qué', async () => {
    await service.actualizarPlanMejora(planId, { cumplimiento: 1 }, userId);
    
    const log = await prisma.auditLog.findFirst({
      where: { tabla: 'plan_mejoramiento', registroId: planId }
    });
    
    expect(log).toMatchObject({
      usuarioId: userId,
      accion: expect.any(String),
      timestamp: expect.any(Date),
      cambios: expect.objectContaining({
        antes: expect.any(Object),
        despues: expect.any(Object)
      })
    });
  });

  test('Validación de evidencia registra auditor y decisión', async () => {
    await service.validarEvidencia(evidenciaId, 'ACEPTADA', '', false, auditorId);
    
    const log = await prisma.auditLog.findFirst({
      where: { tabla: 'evidencia_validada', registroId: evidenciaId }
    });
    
    expect(log.cambios.calificacion).toBe('ACEPTADA');
    expect(log.usuarioId).toBe(auditorId);
  });
});

describe('CRÍTICO - Transiciones Kanban', () => {
  test('No permite mover a EJECUCIÓN sin Plan Trabajo aprobado', async () => {
    const auditoria = { estado: 'PLANEACION', planTrabajoAprobado: false };
    
    await expect(
      service.cambiarEstado(auditoria.id, 'EJECUCION', userId)
    ).rejects.toThrow('Plan de Trabajo Individual');
  });

  test('No permite CERRAR sin informe final', async () => {
    const auditoria = { estado: 'COMUNICACION', informeFinal: null };
    
    await expect(
      service.cambiarEstado(auditoria.id, 'CERRADO', userId)
    ).rejects.toThrow('informe final');
  });
});
```

---

# 13. MIGRACIÓN DE DATOS

## 13.1 EMFO001 → plan_anual + auditoria

```sql
-- PASO 1: Crear usuarios desde Excel
INSERT INTO usuario (id, email, nombre, apellido, cedula, rol)
SELECT 
  gen_random_uuid(),
  LOWER(REPLACE(nombre, ' ', '.')) || '@esap.edu.co',
  SPLIT_PART(nombre_completo, ' ', 1),
  SPLIT_PART(nombre_completo, ' ', 2),
  cedula,
  CASE 
    WHEN cargo LIKE '%Jefe%' THEN 'JEFE_OCI'
    WHEN cargo LIKE '%Líder%' OR nombre LIKE '%-AL' THEN 'AUDITOR_LIDER'
    WHEN cargo LIKE '%Contratista%' THEN 'CONTRATISTA'
    ELSE 'AUDITOR'
  END
FROM excel_auditores;

-- PASO 2: Crear plan anual 2025
INSERT INTO plan_anual (id, vigencia, estado, jefe_oci_id, fecha_aprobacion)
VALUES (
  gen_random_uuid(),
  2025,
  'VIGENTE',
  (SELECT id FROM usuario WHERE rol = 'JEFE_OCI' LIMIT 1),
  '2025-01-15'
);

-- PASO 3: Crear los 5 roles del Decreto 648
INSERT INTO rol_decreto_648 (id, numero, nombre, descripcion, articulo, plan_anual_id)
VALUES 
  (gen_random_uuid(), 1, 'Liderazgo Estratégico', 'Dirección + Jefe OCI', 'Art. 2', @plan_id),
  (gen_random_uuid(), 2, 'Enfoque hacia la Prevención', 'Diseño controles', 'Art. 3', @plan_id),
  (gen_random_uuid(), 3, 'Relación con Entes de Control', 'Coordinación CGR', 'Art. 4', @plan_id),
  (gen_random_uuid(), 4, 'Evaluación Gestión del Riesgo', 'Identificación riesgos', 'Art. 5', @plan_id),
  (gen_random_uuid(), 5, 'Evaluación y Seguimiento', 'Monitoreo efectividad', 'Art. 6', @plan_id);

-- PASO 4: Crear auditorías desde cronograma Excel
-- Mapear semanas P/E a fechas reales
INSERT INTO auditoria (id, codigo, nombre, tipo, proceso_auditado, estado, plan_anual_id, auditor_lider_id, es_territorial)
SELECT
  gen_random_uuid(),
  'AUD-2025-' || LPAD(ROW_NUMBER() OVER ()::text, 3, '0'),
  proceso,
  CASE WHEN territorial IS NOT NULL THEN 'TERRITORIAL' ELSE 'SEDE_CENTRAL' END,
  proceso,
  'BACKLOG',
  @plan_id,
  (SELECT id FROM usuario WHERE nombre LIKE '%' || auditor_lider || '%'),
  territorial IS NOT NULL
FROM excel_cronograma;

-- VALIDACIÓN POST-MIGRACIÓN
SELECT 
  (SELECT COUNT(*) FROM rol_decreto_648 WHERE plan_anual_id = @plan_id) AS roles_count,
  (SELECT COUNT(*) FROM auditoria WHERE plan_anual_id = @plan_id) AS auditorias_count,
  (SELECT COUNT(*) FROM auditoria WHERE es_territorial = true) AS territoriales_count;
-- Esperado: 5 roles, ~25 auditorías, 16 territoriales
```

## 13.2 EMFO002 → plan_mejoramiento + accion_correctiva

```sql
-- Mapeo de columnas Excel → BD
-- A (N° hallazgo) → hallazgo.numero
-- B (Descripción) → hallazgo.descripcion + accion_correctiva.descripcion
-- C (Causas) → accion_correctiva.causas_raiz
-- D (Acción mejora) → accion_correctiva.accion_mejora
-- E (Soporte) → accion_correctiva.soporte_evidencia
-- F (Cantidad prog) → accion_correctiva.cantidad_programada
-- G-H (Fechas) → accion_correctiva.fecha_inicio, fecha_fin
-- J (Responsable) → accion_correctiva.responsable_id
-- K (Cantidad impl) → accion_correctiva.cantidad_implementada
-- L (Cumplimiento) → RECALCULAR con fórmula

INSERT INTO accion_correctiva (
  id, plan_mejora_id, hallazgo_id, descripcion, causas_raiz, accion_mejora,
  soporte_evidencia, cantidad_programada, fecha_inicio, fecha_fin,
  responsable_id, cantidad_implementada, cumplimiento, estado
)
SELECT
  gen_random_uuid(),
  @plan_mejora_id,
  @hallazgo_id,
  col_b,
  col_c,
  col_d,
  col_e,
  col_f::int,
  col_g::date,
  col_h::date,
  (SELECT id FROM usuario WHERE cargo ILIKE '%' || col_j || '%'),
  COALESCE(col_k::int, 0),
  -- Recalcular cumplimiento con fórmula
  CASE 
    WHEN COALESCE(col_k::int, 0) >= col_f::int THEN 2
    WHEN COALESCE(col_k::int, 0) >= 1 THEN 1
    ELSE 0
  END,
  CASE 
    WHEN col_m = 'Cerrada' THEN 'COMPLETADA'
    ELSE 'EN_PROCESO'
  END
FROM excel_emfo002;

-- VALIDACIÓN
SELECT 
  COUNT(*) AS total_acciones,
  SUM(CASE WHEN cumplimiento = 2 THEN 1 ELSE 0 END) AS completadas,
  SUM(CASE WHEN cumplimiento = 1 THEN 1 ELSE 0 END) AS parciales,
  SUM(CASE WHEN cumplimiento = 0 THEN 1 ELSE 0 END) AS pendientes
FROM accion_correctiva;
```

---

# 14. DEPLOYMENT Y CI/CD

## 14.1 Infraestructura Azure

```
┌─────────────────────────────────────────────────────────────────────┐
│                        AZURE CLOUD                                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────┐     ┌─────────────────┐                       │
│  │  Azure App      │     │  Azure SQL      │                       │
│  │  Service        │────▶│  Database       │                       │
│  │  (Node.js API)  │     │  (PostgreSQL)   │                       │
│  └────────┬────────┘     └─────────────────┘                       │
│           │                                                         │
│           │              ┌─────────────────┐                       │
│           │              │  Azure Blob     │                       │
│           └─────────────▶│  Storage        │                       │
│                          │  (Documentos)   │                       │
│                          └─────────────────┘                       │
│                                                                     │
│  ┌─────────────────┐     ┌─────────────────┐                       │
│  │  Azure AD       │     │  Application    │                       │
│  │  (SSO Auth)     │     │  Insights       │                       │
│  └─────────────────┘     │  (Monitoring)   │                       │
│                          └─────────────────┘                       │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

## 14.2 Pipeline CI/CD

```yaml
# .github/workflows/deploy.yml
name: Deploy OCIG

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

env:
  AZURE_WEBAPP_NAME: esap-ocig-api
  NODE_VERSION: '20.x'

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run linter
        run: npm run lint
      
      - name: Run tests
        run: npm test -- --coverage --ci
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          fail_ci_if_error: true

  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
      
      - name: Install and build
        run: |
          npm ci
          npm run build
      
      - name: Upload artifact
        uses: actions/upload-artifact@v3
        with:
          name: dist
          path: dist/

  deploy:
    needs: build
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    environment: production
    steps:
      - name: Download artifact
        uses: actions/download-artifact@v3
        with:
          name: dist
      
      - name: Login to Azure
        uses: azure/login@v1
        with:
          creds: ${{ secrets.AZURE_CREDENTIALS }}
      
      - name: Deploy to Azure Web App
        uses: azure/webapps-deploy@v2
        with:
          app-name: ${{ env.AZURE_WEBAPP_NAME }}
          package: .
      
      - name: Run database migrations
        run: |
          npx prisma migrate deploy
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
```

## 14.3 Variables de Entorno

```env
# .env.production
NODE_ENV=production
PORT=8080

# Database
DATABASE_URL=postgresql://user:password@esap-ocig-db.postgres.database.azure.com:5432/ocig?sslmode=require

# Azure AD
AZURE_AD_TENANT_ID=xxx
AZURE_AD_CLIENT_ID=xxx
AZURE_AD_CLIENT_SECRET=xxx

# Azure Storage
AZURE_STORAGE_CONNECTION_STRING=xxx
AZURE_STORAGE_CONTAINER=evidencias

# JWT
JWT_SECRET=xxx
JWT_EXPIRES_IN=8h

# Email (SMTP)
SMTP_HOST=smtp.esap.edu.co
SMTP_PORT=587
SMTP_USER=ocig@esap.edu.co
SMTP_PASS=xxx

# Application
APP_URL=https://ocig.esap.edu.co
CORS_ORIGIN=https://ocig.esap.edu.co
```

## 14.4 Integración Power BI

```typescript
// src/controllers/reportes.controller.ts

// Endpoints para Power BI
router.get('/api/v1/powerbi/plan-anual', async (req, res) => {
  const data = await reporteService.getPlanAnualDashboard();
  res.json(data);
});

router.get('/api/v1/powerbi/auditorias', async (req, res) => {
  const data = await reporteService.getAuditoriasDashboard();
  res.json(data);
});

router.get('/api/v1/powerbi/planes-mejora', async (req, res) => {
  const data = await reporteService.getPlanesMejoraDashboard();
  res.json(data);
});

// Configuración Power BI
// Data Source: Web API
// URLs: https://ocig.esap.edu.co/api/v1/powerbi/*
// Authentication: OAuth2 (Azure AD)
// Refresh: Cada hora
```

---

# 15. TIMELINE DE IMPLEMENTACIÓN

```
SEMANA    │ ACTIVIDAD                              │ ENTREGABLES
──────────┼────────────────────────────────────────┼─────────────────────────────────
 1-2      │ Setup + Preparación                    │ • Ambiente desarrollo configurado
          │                                        │ • CI/CD pipeline
          │                                        │ • Documentación componentes RFO16
          │                                        │ • Schema Prisma inicial
──────────┼────────────────────────────────────────┼─────────────────────────────────
 3        │ RF001 - Plan Anual                     │ • CRUD Plan Anual
          │                                        │ • Validación 5 roles Decreto 648
          │                                        │ • Aprobación con acta CICC
          │                                        │ • Exportación PDF/Excel
──────────┼────────────────────────────────────────┼─────────────────────────────────
 4-5      │ RF002-004 - Universo/Programa          │ • Catálogo procesos auditables
          │                                        │ • Fórmula priorización DAFP
          │                                        │ • Cronogramas Gantt
          │                                        │ • Plan de rotación automático
──────────┼────────────────────────────────────────┼─────────────────────────────────
 6-8      │ RF005-009 - Auditorías                 │ • Tablero Kanban 5 columnas
          │                                        │ • Drag & drop con validaciones
          │                                        │ • Gestión de equipo auditor
          │                                        │ • Registro de hallazgos
          │                                        │ • Generación de informes
──────────┼────────────────────────────────────────┼─────────────────────────────────
 9-11     │ RF010-013 - Planes Mejoramiento        │ • Formulación desde hallazgos
          │                                        │ • Seguimiento trimestral
          │                                        │ • Portal Área Auditada
          │                                        │ • Validación OCI
          │                                        │ • Semáforos automáticos
──────────┼────────────────────────────────────────┼─────────────────────────────────
 12-14    │ RF014-020 - Complementarios            │ • Catálogo informes de ley
          │                                        │ • Sistema de alertas
          │                                        │ • Dashboard ejecutivo
          │                                        │ • Exportación SIRECI
          │                                        │ • Auditoría de cambios
──────────┼────────────────────────────────────────┼─────────────────────────────────
 15-17    │ Testing + UAT                          │ • Cobertura ≥80%
          │                                        │ • Tests de integración
          │                                        │ • Pruebas de usuario
          │                                        │ • Corrección de bugs
──────────┼────────────────────────────────────────┼─────────────────────────────────
 18-20    │ Capacitación + Go-Live                 │ • Manuales de usuario
          │                                        │ • Capacitación por roles
          │                                        │ • Migración de datos
          │                                        │ • Despliegue producción
          │                                        │ • Soporte post-lanzamiento
──────────┴────────────────────────────────────────┴─────────────────────────────────

RECURSOS: 5-6 desarrolladores
• 2 Frontend (React/TypeScript)
• 2 Backend (Node.js/Prisma)
• 1 QA/Testing
• 1 DevOps/DBA (parcial)
```

---

# 16. CHECKLIST POR MÓDULO

## RF001 - Plan Anual
- [ ] Tablas Prisma: PlanAnual, RolDecreto648, Actividad
- [ ] Seed: 5 roles estándar Decreto 648
- [ ] Validador: exactamente 5 roles
- [ ] Validador: cada rol con ≥1 actividad
- [ ] Validador: responsables en AD
- [ ] Service: crear, actualizar, aprobar
- [ ] Service: calcular indicadores por rol
- [ ] Documento: generar PDF
- [ ] Documento: exportar Excel EMFO001
- [ ] Controller: endpoints REST
- [ ] Frontend: formulario creación
- [ ] Frontend: vista detalle con roles
- [ ] Tests: cobertura ≥80%

## RF003 - Programa Anual
- [ ] Validación: territorial ejecución = 4 días FIJO
- [ ] Service: generar cronogramas diferenciados
- [ ] Frontend: vista Gantt
- [ ] Tests: duraciones correctas

## RF005-009 - Auditorías
- [ ] Tablero Kanban 5 columnas
- [ ] Drag & drop con validaciones de transición
- [ ] Gestión de equipo auditor
- [ ] Registro de hallazgos tipificados
- [ ] Carga de evidencias
- [ ] Generación de informes (preliminar, final)
- [ ] Alertas de vencimiento

## RF010-011 - Planes Mejora
- [ ] Formulación desde hallazgos
- [ ] Análisis causa-raíz
- [ ] Seguimiento trimestral (4 cortes)
- [ ] Fórmula cumplimiento: IF(K>=F,2,IF(K>=1,1,0))
- [ ] Portal Área Auditada
- [ ] Validación OCI con comentarios
- [ ] Semáforos automáticos
- [ ] Job recordatorios 7 días antes
- [ ] Escalamiento +3 días

## RF014-016 - Informes de Ley
- [ ] Catálogo 16 informes
- [ ] Calendario con alertas
- [ ] Registro de cumplimiento

## RF017-020 - Reportes y Config
- [ ] Dashboard ejecutivo KPIs
- [ ] Exportación PDF/Excel
- [ ] Formato SIRECI
- [ ] Auditoría de cambios completa

---

# 17. GUÍA PARA IA

```
╔═══════════════════════════════════════════════════════════════════════╗
║          INSTRUCCIONES PARA IA (CURSOR, COPILOT, CLAUDE)              ║
╚═══════════════════════════════════════════════════════════════════════╝

1. ANTES DE GENERAR CÓDIGO:
   ✓ Revisar la sección correspondiente en este documento
   ✓ Verificar validaciones obligatorias (Sección 11)
   ✓ Consultar Schema Prisma (Sección 7)
   ✓ Revisar código de referencia (Sección 9)

2. AL GENERAR BACKEND:
   ✓ Incluir validaciones de Decreto 648 en RF001
   ✓ Usar fórmula EMFO002 en RF011: IF(K>=F,2,IF(K>=1,1,0))
   ✓ Registrar AuditLog para CADA operación
   ✓ Validar duraciones territoriales (4 días ejecución FIJO)
   ✓ Tests con cobertura ≥80%

3. AL GENERAR FRONTEND:
   ✓ Reutilizar componentes Kanban existentes (RFO16)
   ✓ Validar en cliente también (mejor UX)
   ✓ Mensajes claros de error (bordes rojos, textos descriptivos)
   ✓ Responsive design (mobile-first)
   ✓ Usar paleta de colores ESAP (Sección 10.1)

4. AL CREAR TESTS:
   ✓ Usar datos reales ESAP (12 auditores, 16 territoriales, 9 procesos)
   ✓ Cubrir todas las validaciones normativas
   ✓ Probar edge cases (datos sucios de Excel)
   ✓ Tests de integración para flujos completos

5. VALIDACIONES CRÍTICAS (SIEMPRE VERIFICAR):
   ⚠️ RF001: 5 roles EXACTAMENTE (Decreto 648/2017)
   ⚠️ RF001: Cada rol con ≥1 actividad
   ⚠️ RF003/RF006: Territorial ejecución = 4 días FIJO
   ⚠️ RF011: Cumplimiento = IF(K>=F,2,IF(K>=1,1,0))
   ⚠️ RF011: Alertas 7 días antes del corte
   ⚠️ SIEMPRE: Registrar quién-cuándo-qué en AuditLog

6. SI DESCUBRES AMBIGÜEDAD:
   → Consultar Sección 3 (Usuarios y Roles)
   → Consultar Sección 2 (Marco Normativo)
   → Si persiste: generar comentario TODO en código

7. PATRONES A SEGUIR:
   → Services con inyección de dependencias
   → Validadores separados por dominio
   → DTOs para entrada/salida
   → Prisma transactions para operaciones complejas
   → Manejo centralizado de errores

8. NO HACER:
   ✗ Hardcodear valores que están en constantes
   ✗ Omitir validaciones normativas
   ✗ Olvidar el AuditLog
   ✗ Ignorar diferencias sede/territorial
   ✗ Crear nuevos componentes si existen en RFO16
```

---

# 18. ANEXOS

## 18.1 Catálogo de Informes de Ley (16)

| # | Informe | Norma | Periodicidad | Destinatario |
|---|---------|-------|--------------|--------------|
| 1 | Evaluación Sistema Control Interno | Ley 1474/2011 Art.9 | Semestral | Dir. Nacional |
| 2 | MECI (FURAG) | Decreto 1083/2015 | Anual | DAFP |
| 3 | Evaluación por Dependencias | Ley 909/2004 | Anual | Dir. Nacional |
| 4 | Gestión OCI | Ley 87/1993 | Anual | Dir. Nacional |
| 5 | Comité Conciliaciones | Decreto 1069/2015 | Anual | Dir. Nacional |
| 6 | PTEP (Anticorrupción) | Ley 1474/2011 | Cuatrimestral | Dir. Nacional |
| 7 | Austeridad en el Gasto | Decreto 1068/2015 | Trimestral | Dir. Nacional |
| 8 | PQRSD | Ley 1474/2011 Art.76 | Semestral | Dir. Nacional |
| 9 | ITA (Transparencia) | Ley 1712/2014 | Trimestral | Dir. Nacional |
| 10 | Mapa de Riesgos | Decreto 1083/2015 | Cuatrimestral | Dir. Nacional |
| 11 | Desempeño Institucional | Decreto 1083/2015 | Anual | DAFP |
| 12 | Corrupción (si aplica) | Ley 1474/2011 | Evento | Entes control |
| 13 | Planes Mejora OCI | Guía DAFP | Trimestral | Auditados |
| 14 | Ley de Cuotas | Ley 581/2000 | Anual | DAFP |
| 15 | Rendición Cuenta CGR | Res. 0042/2020 | Anual | CGR |
| 16 | Plan Mejora CGR | Res. 0042/2020 | Semestral | CGR |

## 18.2 Glosario

| Término | Definición |
|---------|------------|
| **PAI** | Plan Anual de Auditoría Interna |
| **OCI** | Oficina de Control Interno |
| **CICCI** | Comité Institucional de Coordinación de Control Interno |
| **DAFP** | Departamento Administrativo de la Función Pública |
| **CGR** | Contraloría General de la República |
| **SIRECI** | Sistema de Rendición Electrónica de Cuenta e Informes |
| **MECI** | Modelo Estándar de Control Interno |
| **FURAG** | Formulario Único de Reporte de Avances de Gestión |
| **AL** | Auditor Líder |

## 18.3 Documentos de Referencia

| Documento | Ubicación Proyecto |
|-----------|-------------------|
| Auditorías_Internas_V3.pdf | /mnt/project/ |
| Elaboración_y_Seguimiento_de_Planes_de_Mejoramiento_V3.pdf | /mnt/project/ |
| Informes_de_Ley_y_Seguimiento_V2.pdf | /mnt/project/ |
| CAEvaluacionControlyMejora.pdf | /mnt/project/ |
| EMFO001_PAI_2025_OFICIAL_V_6.xlsx | /mnt/project/ |
| EMFO002_FormatoplanmejoramientoauditoriainternaOCI.xlsm | /mnt/project/ |
| 1_RolesOCI.xlsx | /mnt/project/ |
| 4_UniversodeAuditoriasbasadoenriesgos.xlsx | /mnt/project/ |

---

**FIN DEL DOCUMENTO MAESTRO COMPLETO**

---

```
╔═══════════════════════════════════════════════════════════════════════╗
║                         RESUMEN DE ENTREGABLE                         ║
╠═══════════════════════════════════════════════════════════════════════╣
║  Archivo: OCIG_DOCUMENTO_COMPLETO.md                                  ║
║  Tamaño:  ~50,000 palabras                                            ║
║  Secciones: 18                                                        ║
║                                                                       ║
║  Contenido:                                                           ║
║  ✓ 20 Requerimientos Funcionales detallados                          ║
║  ✓ 10 Requerimientos No Funcionales                                  ║
║  ✓ Schema Prisma completo (~450 líneas)                              ║
║  ✓ Código de referencia backend y frontend                           ║
║  ✓ Endpoints API REST (~60 endpoints)                                ║
║  ✓ Especificaciones UI/UX con wireframes                             ║
║  ✓ Validaciones normativas en código                                 ║
║  ✓ Tests críticos                                                    ║
║  ✓ Migración de datos                                                ║
║  ✓ CI/CD y deployment Azure                                          ║
║  ✓ Timeline 20 semanas                                               ║
║  ✓ Checklist por módulo                                              ║
║  ✓ Guía para IA (Cursor, Copilot)                                    ║
║                                                                       ║
║  Estado: ✅ LISTO PARA IMPLEMENTACIÓN                                 ║
╚═══════════════════════════════════════════════════════════════════════╝
```
