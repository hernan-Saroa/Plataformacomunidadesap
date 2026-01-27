# 🔄 FLUJO INTEGRAL DE CONTROL INTERNO DE GESTIÓN

## Sistema de Gestión Integrado - ESAP

**Fecha:** Enero 22, 2025  
**Versión:** 3.0  
**Estado:** Documentación Completa

---

## 📋 ÍNDICE

1. [Visión General del Flujo](#visión-general-del-flujo)
2. [Flujo Detallado por Módulo](#flujo-detallado-por-módulo)
3. [Conexiones entre Módulos](#conexiones-entre-módulos)
4. [Flujo de Datos y Estados](#flujo-de-datos-y-estados)
5. [Validaciones y Reglas de Negocio](#validaciones-y-reglas-de-negocio)
6. [Arquitectura de Integración](#arquitectura-de-integración)

---

## 🎯 VISIÓN GENERAL DEL FLUJO

```
┌─────────────────────────────────────────────────────────────────┐
│                    CICLO ANUAL DE AUDITORÍA                     │
└─────────────────────────────────────────────────────────────────┘

   1️⃣ PLANEACIÓN OCIG
   ├── Plan Anual de Auditoría
   ├── Universo de Auditorías
   └── Programa Anual
          ↓
   2️⃣ AUDITORÍAS OCIG (KANBAN)
   ├── Planeación → Ejecución → Comunicación → Seguimiento → Finalizada
   └── Hallazgos detectados
          ↓
   3️⃣ PLANES DE MEJORAMIENTO
   ├── Formulación (30 días)
   ├── Seguimiento
   └── Cierre
          ↓
   4️⃣ INFORMES DE LEY
   ├── Informe Ejecutivo Anual
   ├── Informe Pormenorizado
   └── Formatos Oficiales
          ↓
   5️⃣ EXPEDIENTES
   └── Archivo Digital Completo
          ↓
   6️⃣ CONFIGURACIONES
   └── Tipos • Listas • Notificaciones
```

---

## 🔄 FLUJO DETALLADO POR MÓDULO

### 1️⃣ PLANEACIÓN OCIG (RF001-004)

**Objetivo:** Planificar el ciclo anual de auditorías

#### 📊 Tabs del Módulo:

```
┌─────────────────────────────────────────────────────────────┐
│ Tab 1: Plan Anual de Auditoría (RF001)                     │
├─────────────────────────────────────────────────────────────┤
│ • Crear Plan Anual (inicio de cada año)                    │
│ • Definir objetivos estratégicos                           │
│ • Establecer metas de cobertura                            │
│ • Asignar recursos                                         │
│ • Estado: BORRADOR → APROBADO → ACTIVO                     │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ Tab 2: Universo de Auditorías (RF002)                      │
├─────────────────────────────────────────────────────────────┤
│ • Identificar todas las áreas auditables                   │
│ • Evaluar riesgos institucionales                          │
│ • Priorizar áreas (Alto/Medio/Bajo)                        │
│ • Criterios: impacto, materialidad, frecuencia            │
│ • Resultado: Lista priorizada de áreas                     │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ Tab 3: Programa Anual (RF003)                              │
├─────────────────────────────────────────────────────────────┤
│ • Seleccionar auditorías del universo                      │
│ • Programar fechas (inicio/fin)                            │
│ • Asignar auditor líder                                    │
│ • Establecer alcance                                       │
│ • Resultado: Cronograma anual aprobado                     │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ Tab 4: Seguimiento al Plan (RF004)                         │
├─────────────────────────────────────────────────────────────┤
│ • Monitorear ejecución vs programado                       │
│ • % de cumplimiento del plan                               │
│ • Auditorías atrasadas                                     │
│ • Reprogramaciones                                         │
│ • Dashboard ejecutivo                                      │
└─────────────────────────────────────────────────────────────┘
```

#### 🔗 Salida del Módulo:

```javascript
// Las auditorías aprobadas en el Programa Anual pasan automáticamente a:
AUDITORÍAS OCIG (KANBAN) → Estado: "Planeación"
```

---

### 2️⃣ AUDITORÍAS OCIG - TABLERO KANBAN (RF005-009)

**Objetivo:** Ejecutar y monitorear auditorías en tiempo real

#### 📊 Estados del Kanban:

```
┌─────────────┐   ┌─────────────┐   ┌──────────────┐   ┌─────────────┐   ┌─────────────┐
│ PLANEACIÓN  │ → │  EJECUCIÓN  │ → │ COMUNICACIÓN │ → │ SEGUIMIENTO │ → │ FINALIZADA  │
│             │   │             │   │              │   │             │   │             │
│ • Objetivos │   │ • Trabajo   │   │ • Informe    │   │ • Plan de   │   │ • Cerrada   │
│ • Alcance   │   │   de campo  │   │   preliminar │   │   mejora    │   │ • Archivada │
│ • Equipo    │   │ • Evidencias│   │ • Hallazgos  │   │ • Acciones  │   │ • Expediente│
│ • Programa  │   │ • Listas    │   │ • Informe    │   │ • Monitoreo │   │   completo  │
│             │   │   chequeo   │   │   final      │   │             │   │             │
└─────────────┘   └─────────────┘   └──────────────┘   └─────────────┘   └─────────────┘
     3 días            15 días            5 días            30 días           ∞
```

#### 🎯 Actividades por Estado:

##### **🔵 PLANEACIÓN** (3-5 días)
```
✓ Definir objetivos específicos
✓ Establecer alcance
✓ Conformar equipo auditor
✓ Programar reunión de apertura
✓ Solicitar documentación previa
✓ Preparar listas de chequeo
```
**Transición a Ejecución:** Reunión de apertura realizada

##### **🟡 EJECUCIÓN** (10-20 días)
```
✓ Trabajo de campo
✓ Revisión documental
✓ Entrevistas
✓ Verificación in situ
✓ Aplicar listas de chequeo
✓ Recolectar evidencias
✓ Identificar hallazgos preliminares
```
**Transición a Comunicación:** Trabajo de campo completado

##### **🟠 COMUNICACIÓN** (5-7 días)
```
✓ Elaborar informe preliminar
✓ Comunicar hallazgos al área auditada
✓ Recibir descargos (5 días)
✓ Evaluar descargos
✓ Emitir informe final
✓ Reunión de cierre
```
**Transición a Seguimiento:** Informe final emitido

##### **🟣 SEGUIMIENTO** (30+ días)
```
✓ Verificar si hay hallazgos
✓ SI HAY HALLAZGOS:
   → Crear Plan de Mejoramiento (automático)
   → Monitorear formulación (30 días)
   → Seguimiento a acciones
✓ NO HAY HALLAZGOS:
   → Pasar directo a Finalizada
```
**Transición a Finalizada:** Plan completado o sin hallazgos

##### **✅ FINALIZADA**
```
✓ Auditoría cerrada
✓ Expediente digital completo
✓ Lecciones aprendidas
✓ Actualizar indicadores
✓ Archivo permanente
```

#### 🔗 Integración con Planes de Mejoramiento:

```javascript
// Cuando una auditoría pasa a "Seguimiento" con hallazgos:

if (auditoria.estado === 'Seguimiento' && auditoria.hallazgos > 0) {
  // 1. Crear registro automático en Planes de Mejoramiento
  const plan = {
    auditoriaId: auditoria.id,
    codigoAuditoria: auditoria.codigo,
    hallazgos: auditoria.hallazgosDetallados,
    estado: 'EN_FORMULACION',
    plazoFormulacion: 30, // días
    fechaLimite: calcularFechaLimite(auditoria.fechaFin, 30)
  };
  
  // 2. Navegar automáticamente a "Planes de Mejoramiento"
  navegarAPlanesConContexto(plan);
  
  // 3. Mostrar badge en sidebar con número de hallazgos
  mostrarBadge('planes-mejoramiento', auditoria.hallazgos);
}
```

---

### 3️⃣ PLANES DE MEJORAMIENTO (RF010-011)

**Objetivo:** Gestionar hallazgos y acciones correctivas

#### 📊 Tabs del Módulo:

```
┌─────────────────────────────────────────────────────────────┐
│ Tab 1: Formulación (RF010)                                 │
├─────────────────────────────────────────────────────────────┤
│ VISTA: Auditorías con hallazgos pendientes                 │
│                                                             │
│ Auditoría seleccionada:                                    │
│ ┌─────────────────────────────────────────┐               │
│ │ AUD-2025-004 - Gestión de RRHH Valle    │               │
│ │ 3 Hallazgos | Plazo: 25 días restantes  │               │
│ └─────────────────────────────────────────┘               │
│                                                             │
│ Por cada hallazgo:                                         │
│ ┌─────────────────────────────────────────┐               │
│ │ Hallazgo 1: Inconsistencias en nómina   │               │
│ │ Gravedad: GRAVE                          │               │
│ │                                          │               │
│ │ 📝 Formulación de Acciones:              │               │
│ │ • Acción 1: Revisar contratos            │               │
│ │   - Responsable: Jefe de RRHH            │               │
│ │   - Plazo: 15 días                       │               │
│ │   - Indicador: 100% contratos revisados  │               │
│ │                                          │               │
│ │ • Acción 2: Capacitar personal           │               │
│ │   - Responsable: Coordinador Cap.        │               │
│ │   - Plazo: 30 días                       │               │
│ │   - Indicador: 90% asistencia            │               │
│ └─────────────────────────────────────────┘               │
│                                                             │
│ [Guardar Borrador] [Enviar a Aprobación OCIG]             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ Tab 2: Seguimiento (RF011)                                 │
├─────────────────────────────────────────────────────────────┤
│ VISTA: Planes aprobados en seguimiento                     │
│                                                             │
│ Plan: AUD-2025-004                                         │
│ ┌─────────────────────────────────────────┐               │
│ │ Progreso General: 45%                    │               │
│ │                                          │               │
│ │ Acción 1: Revisar contratos              │               │
│ │ Estado: ✅ COMPLETADA (100%)             │               │
│ │ Evidencias: [3 documentos]               │               │
│ │                                          │               │
│ │ Acción 2: Capacitar personal             │               │
│ │ Estado: 🟡 EN_PROGRESO (45%)             │               │
│ │ Evidencias: [1 documento]                │               │
│ │ Observaciones OCIG: "Pendiente lista"    │               │
│ │                                          │               │
│ │ Semáforo: 🟡 AMARILLO                    │               │
│ │ (Hay 1 acción en riesgo)                 │               │
│ └─────────────────────────────────────────┘               │
└─────────────────────────────────────────────────────────────┘
```

#### 🔗 Estados del Plan:

```
SIN_PLAN → EN_FORMULACION → ENVIADO → APROBADO → EN_SEGUIMIENTO → COMPLETADO
   ↑            30 días         ↓         ↓          según plazo        ↓
   └─────────────────────────────┴─────────┴────────────────────────────┘
                            RECHAZADO (vuelve a formulación)
```

#### 🎯 Reglas de Negocio:

```javascript
// 1. Plazo de Formulación
const PLAZO_FORMULACION = 30; // días desde cierre de auditoría

// 2. Alertas automáticas
if (diasRestantes <= 7) {
  enviarAlerta('URGENTE', 'Plan vence en ' + diasRestantes + ' días');
  semaforo = 'ROJO';
} else if (diasRestantes <= 15) {
  enviarAlerta('ADVERTENCIA', 'Plan próximo a vencer');
  semaforo = 'AMARILLO';
}

// 3. Aprobación automática
if (plan.estado === 'ENVIADO' && diasSinRespuesta > 5) {
  // Recordatorio a OCIG cada 2 días
  enviarRecordatorioOCIG();
}

// 4. Cierre automático
if (plan.progresoGeneral === 100 && plan.evidenciasCompletas) {
  plan.estado = 'COMPLETADO';
  auditoria.estado = 'Finalizada';
  generarExpediente(auditoria, plan);
}
```

---

### 4️⃣ INFORMES DE LEY (RF012)

**Objetivo:** Generar informes oficiales obligatorios

#### 📊 Tabs del Módulo:

```
┌─────────────────────────────────────────────────────────────┐
│ Tab 1: Informe Ejecutivo Anual                             │
├─────────────────────────────────────────────────────────────┤
│ Período: 2025                                              │
│                                                             │
│ 📊 Resumen Ejecutivo:                                       │
│ • Auditorías programadas: 25                               │
│ • Auditorías ejecutadas: 23 (92%)                          │
│ • Auditorías en curso: 2                                   │
│ • Hallazgos totales: 47                                    │
│   - Graves: 12                                             │
│   - Moderados: 23                                          │
│   - Leves: 12                                              │
│ • Planes de mejoramiento: 18                               │
│ • Planes completados: 14 (78%)                             │
│                                                             │
│ 📈 Gráficas:                                                │
│ [Auditorías por territorial]                               │
│ [Hallazgos por área]                                       │
│ [Cumplimiento del plan]                                    │
│                                                             │
│ [Generar PDF] [Generar Excel] [Enviar a Contraloría]      │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ Tab 2: Informe Pormenorizado                               │
├─────────────────────────────────────────────────────────────┤
│ Detalle completo de cada auditoría:                        │
│                                                             │
│ AUD-2025-001: Gestión Administrativa Antioquia             │
│ • Alcance: Procesos administrativos 2025                   │
│ • Objetivos: (3 objetivos)                                 │
│ • Metodología: Revisión documental + entrevistas           │
│ • Hallazgos: (2 hallazgos)                                 │
│   - Hallazgo 1: Falta de procedimientos documentados       │
│     Recomendación: Crear manual de procesos                │
│   - Hallazgo 2: Archivo físico desorganizado               │
│     Recomendación: Implementar archivo digital             │
│ • Plan de mejoramiento: PMJ-2025-001 (EN_SEGUIMIENTO)      │
│ • Estado: Finalizada                                       │
│                                                             │
│ [Incluir en informe] ✓                                     │
│                                                             │
│ ... (Todas las demás auditorías)                           │
│                                                             │
│ [Generar Informe Completo PDF]                             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ Tab 3: Formatos Oficiales                                  │
├─────────────────────────────────────────────────────────────┤
│ Plantillas precargadas:                                     │
│                                                             │
│ 📄 Formato 1: Informe CGR (Contraloría General)            │
│ 📄 Formato 2: Informe DAFP (Función Pública)               │
│ 📄 Formato 3: Informe Presidencia                          │
│ 📄 Formato 4: MECI - Módulo Control Gestión                │
│ 📄 Formato 5: FURAG - Formato único reporte                │
│                                                             │
│ [Generar Todos] [Personalizar]                             │
└─────────────────────────────────────────────────────────────┘
```

#### 🔗 Fuente de Datos:

```javascript
// Los informes se generan automáticamente desde:
const datosInforme = {
  auditorias: obtenerAuditoriasPorPeriodo(2025),
  hallazgos: obtenerHallazgosPorPeriodo(2025),
  planes: obtenerPlanesPorPeriodo(2025),
  metricas: calcularMetricas(2025)
};

// Actualización automática cada vez que:
// 1. Se finaliza una auditoría
// 2. Se cierra un plan de mejoramiento
// 3. Se cambia el estado de un hallazgo
```

---

### 5️⃣ EXPEDIENTES (RF013)

**Objetivo:** Archivo digital completo de auditorías

#### 📊 Vista del Módulo:

```
┌─────────────────────────────────────────────────────────────┐
│ 📁 EXPEDIENTES DIGITALES - ARCHIVO HISTÓRICO               │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ 🔍 [Buscar por código, título, año...]                     │
│                                                             │
│ Filtros:                                                    │
│ • Año: [Todos ▼] [2025] [2024] [2023]                     │
│ • Territorial: [Todos ▼]                                   │
│ • Estado: [Finalizadas ▼]                                  │
│ • Tiene hallazgos: [Sí ▼]                                  │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐│
│ │ 📂 AUD-2025-004 - Gestión RRHH Valle                    ││
│ │ Finalizada: 15 Dic 2025                                 ││
│ │                                                          ││
│ │ 📋 Contenido del Expediente:                             ││
│ │ ├── 1. Plan de Auditoría                                ││
│ │ ├── 2. Acta de Apertura                                 ││
│ │ ├── 3. Listas de Chequeo (5)                            ││
│ │ ├── 4. Evidencias (23 documentos)                       ││
│ │ ├── 5. Informe Preliminar                               ││
│ │ ├── 6. Descargos del Área (3 documentos)                ││
│ │ ├── 7. Informe Final                                    ││
│ │ ├── 8. Acta de Cierre                                   ││
│ │ ├── 9. Plan de Mejoramiento PMJ-2025-004                ││
│ │ │   ├── 9.1. Acciones formuladas (5)                    ││
│ │ │   ├── 9.2. Evidencias de cumplimiento (12)            ││
│ │ │   └── 9.3. Acta de cierre del plan                    ││
│ │ └── 10. Lecciones Aprendidas                            ││
│ │                                                          ││
│ │ 📊 Estadísticas:                                         ││
│ │ • Duración: 45 días                                     ││
│ │ • Hallazgos: 3 (1 Grave, 2 Moderados)                   ││
│ │ • Documentos: 48                                        ││
│ │ • Estado plan: Completado (100%)                        ││
│ │                                                          ││
│ │ [📥 Descargar Expediente ZIP] [📄 Ver PDF] [🔍 Detalles]││
│ └─────────────────────────────────────────────────────────┘│
│                                                             │
│ ... (Más expedientes)                                      │
└─────────────────────────────────────────────────────────────┘
```

#### 🔗 Generación Automática:

```javascript
// El expediente se genera automáticamente cuando:
if (auditoria.estado === 'Finalizada' && 
    (plan === null || plan.estado === 'COMPLETADO')) {
  
  const expediente = {
    codigo: auditoria.codigo,
    fechaCierre: new Date(),
    documentos: [
      ...auditoria.documentosPlaneacion,
      ...auditoria.documentosEjecucion,
      ...auditoria.documentosComunicacion,
      ...(plan ? plan.documentos : [])
    ],
    metadatos: {
      duracionTotal: calcularDuracion(auditoria),
      hallazgos: auditoria.hallazgos,
      cumplimientoPlan: plan?.progreso || 100
    }
  };
  
  archivarExpediente(expediente);
  notificarArchivo(auditoria.auditorLider);
}
```

---

### 6️⃣ CONFIGURACIONES (RF019)

**Objetivo:** Configurar el sistema de auditorías

#### 📊 Tabs del Módulo:

```
┌─────────────────────────────────────────────────────────────┐
│ Tab 1: Tipos de Auditoría                                  │
├─────────────────────────────────────────────────────────────┤
│ • Regular: Auditorías programadas anuales                  │
│ • Territorial: Auditorías a sedes territoriales            │
│ • Especial: Auditorías por denuncias o solicitudes         │
│                                                             │
│ [+ Agregar Tipo Personalizado]                             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ Tab 2: Listas de Chequeo                                   │
├─────────────────────────────────────────────────────────────┤
│ • Lista: Gestión Administrativa (25 ítems)                 │
│ • Lista: Gestión Financiera (30 ítems)                     │
│ • Lista: Sistemas TI (40 ítems)                            │
│ • Lista: Recursos Humanos (20 ítems)                       │
│                                                             │
│ [+ Crear Lista] [Importar Excel]                           │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ Tab 3: Notificaciones                                      │
├─────────────────────────────────────────────────────────────┤
│ Configurar alertas automáticas:                            │
│                                                             │
│ ✓ Auditoría próxima a vencer (7 días antes)                │
│ ✓ Hallazgo sin respuesta (5 días)                          │
│ ✓ Plan de mejoramiento vence (15 días antes)               │
│ ✓ Acción vencida sin evidencias (1 día después)            │
│ ✓ Resumen semanal a OCIG (lunes 8am)                       │
│                                                             │
│ [Guardar Configuración]                                    │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔗 CONEXIONES ENTRE MÓDULOS

### Mapa de Navegación:

```
┌──────────────────┐
│ PLANEACIÓN OCIG  │
│                  │
│ Programa Anual   │──────┐
└──────────────────┘      │
                          ↓
                ┌──────────────────┐
                │ AUDITORÍAS OCIG  │
                │   (KANBAN)       │
                │                  │
    ┌───────────│  Planeación      │
    │           │       ↓          │
    │           │  Ejecución       │
    │           │       ↓          │
    │           │  Comunicación    │
    │           │       ↓          │
    │       ┌───│  Seguimiento     │───┐
    │       │   │       ↓          │   │
    │       │   │  Finalizada      │   │
    │       │   └──────────────────┘   │
    │       │                          │
    │       │ (Hallazgos detectados)   │
    │       ↓                          │
    │  ┌──────────────────┐            │
    │  │ PLANES DE        │            │
    │  │ MEJORAMIENTO     │            │
    │  │                  │            │
    │  │ Formulación      │            │
    │  │      ↓           │            │
    │  │ Seguimiento      │            │
    │  │      ↓           │            │
    │  │ Completado       │────────────┘
    │  └──────────────────┘            │
    │                                  │
    │  (Plan cerrado o sin hallazgos)  │
    │                   ↓              │
    │          ┌──────────────────┐    │
    │          │  EXPEDIENTES     │←───┘
    │          │                  │
    │          │  Archivo Digital │
    │          └──────────────────┘
    │                   ↓
    └─────────→ ┌──────────────────┐
                │  INFORMES DE LEY │
                │                  │
                │  Datos agregados │
                └──────────────────┘
                        ↑
                ┌──────────────────┐
                │ CONFIGURACIONES  │
                │                  │
                │ Tipos • Listas   │
                └──────────────────┘
```

---

## 📊 FLUJO DE DATOS Y ESTADOS

### Context Global:

```typescript
// IntegracionAuditoriasPlanesContext.tsx

interface IntegracionContextType {
  // 1. Auditoría seleccionada para crear plan
  auditoriaSeleccionada: AuditoriaParaPlan | null;
  seleccionarAuditoria: (auditoria: AuditoriaParaPlan) => void;
  limpiarSeleccion: () => void;

  // 2. Lista de auditorías que requieren plan
  auditoriasConHallazgos: AuditoriaParaPlan[];
  agregarAuditoriaConHallazgos: (auditoria: AuditoriaParaPlan) => void;
  actualizarEstadoPlan: (auditoriaId: string, estado: string) => void;

  // 3. Planes creados
  planesCreados: PlanMejoramientoCreado[];
  crearPlan: (plan: PlanMejoramientoCreado) => void;

  // 4. Navegación automática
  navegarAFormulacion: boolean;
  setNavegarAFormulacion: (navegar: boolean) => void;
}
```

### Estados Sincronizados:

```javascript
// Cuando se finaliza una auditoría con hallazgos:

// 1. Actualizar estado en Kanban
actualizarEstadoAuditoria(auditoriaId, 'Seguimiento');

// 2. Crear registro en Planes de Mejoramiento
agregarAuditoriaConHallazgos({
  id: auditoria.id,
  codigo: auditoria.codigo,
  hallazgos: hallazgosDetectados,
  estadoPlan: 'SIN_PLAN',
  fechaLimitePlan: calcularFechaLimite(30)
});

// 3. Mostrar badge en sidebar
actualizarBadge('planes-mejoramiento', hallazgosDetectados.length);

// 4. Navegar automáticamente (primera vez)
if (!yaNavego) {
  seleccionarAuditoria(auditoria);
  navegarA('planes-mejoramiento');
  mostrarToast('Plan de mejoramiento pendiente');
}

// 5. Cuando se completa el plan
if (plan.estado === 'COMPLETADO') {
  actualizarEstadoAuditoria(auditoriaId, 'Finalizada');
  generarExpediente(auditoria, plan);
  limpiarBadge('planes-mejoramiento');
  actualizarInformesLey();
}
```

---

## ✅ VALIDACIONES Y REGLAS DE NEGOCIO

### Transiciones de Estado:

```javascript
// REGLA 1: No se puede pasar de Planeación a Ejecución sin:
const validarTransicionPlaneacionEjecucion = (auditoria) => {
  return (
    auditoria.objetivos.length > 0 &&
    auditoria.auditorLider !== null &&
    auditoria.equipoAuditores.length > 0 &&
    auditoria.programaTrabajo !== null &&
    auditoria.actaApertura !== null
  );
};

// REGLA 2: No se puede pasar de Ejecución a Comunicación sin:
const validarTransicionEjecucionComunicacion = (auditoria) => {
  return (
    auditoria.listasChequeoCompletadas >= auditoria.listasChequeoTotales &&
    auditoria.evidenciasRecolectadas >= 10 &&
    auditoria.progreso === 100
  );
};

// REGLA 3: No se puede Finalizar sin resolver hallazgos:
const validarFinalizacion = (auditoria, plan) => {
  if (auditoria.hallazgos === 0) {
    return true; // Sin hallazgos, puede finalizar
  }
  
  if (plan === null) {
    return false; // Tiene hallazgos pero no hay plan
  }
  
  return plan.estado === 'COMPLETADO'; // Plan completado
};

// REGLA 4: Plazo de formulación del plan
const validarPlazoFormulacion = (auditoria, plan) => {
  const diasDesdeFinalizacion = calcularDias(auditoria.fechaFin, hoy);
  const PLAZO_MAXIMO = 30;
  
  if (diasDesdeFinalizacion > PLAZO_MAXIMO && plan.estado !== 'ENVIADO') {
    enviarAlertaUrgente('Plazo de formulación vencido');
    return false;
  }
  
  return true;
};
```

### Alertas Automáticas:

```javascript
// Sistema de alertas automático

const verificarAlertas = () => {
  // 1. Auditorías por vencer
  auditorias.forEach(aud => {
    if (aud.diasRestantes <= 7 && aud.estado !== 'Finalizada') {
      crearAlerta({
        tipo: 'URGENTE',
        modulo: 'AUDITORIAS',
        mensaje: `Auditoría ${aud.codigo} vence en ${aud.diasRestantes} días`,
        destinatarios: [aud.auditorLider, 'coordinador-ocig'],
        acciones: ['Ver auditoría', 'Solicitar prórroga']
      });
    }
  });
  
  // 2. Planes de mejoramiento por vencer
  planes.forEach(plan => {
    if (plan.diasRestantes <= 15 && plan.estado === 'EN_FORMULACION') {
      crearAlerta({
        tipo: 'ADVERTENCIA',
        modulo: 'PLANES_MEJORAMIENTO',
        mensaje: `Plan ${plan.codigo} debe enviarse en ${plan.diasRestantes} días`,
        destinatarios: [plan.responsableArea],
        acciones: ['Continuar formulación', 'Ver hallazgos']
      });
    }
  });
  
  // 3. Acciones vencidas sin evidencias
  acciones.forEach(accion => {
    if (accion.fechaVencimiento < hoy && accion.evidencias.length === 0) {
      crearAlerta({
        tipo: 'CRITICO',
        modulo: 'PLANES_MEJORAMIENTO',
        mensaje: `Acción vencida sin evidencias: ${accion.descripcion}`,
        destinatarios: [accion.responsable, 'coordinador-ocig'],
        acciones: ['Cargar evidencias', 'Solicitar prórroga', 'Justificar']
      });
    }
  });
};

// Ejecutar cada hora
setInterval(verificarAlertas, 3600000);
```

---

## 🏗️ ARQUITECTURA DE INTEGRACIÓN

### Componentes Actuales:

```
/components/esap/control-interno/
├── ControlInternoFull.tsx                    # MÓDULO PRINCIPAL
├── IntegracionAuditoriasPlanesContext.tsx    # CONTEXT DE INTEGRACIÓN
│
├── GestionAuditoriasKanbanSimple.tsx         # TABLERO KANBAN (RF005-009)
├── PlanificacionModuleRediseno.tsx           # PLANEACIÓN (RF001-004)
├── PlanesMejoramientoModuleRediseno.tsx      # PLANES (RF010-011)
├── InformesLeyModulePremium.tsx              # INFORMES (RF012)
├── ExpedientesModulePremium.tsx              # EXPEDIENTES (RF013)
├── ConfiguracionesModulePremium.tsx          # CONFIGURACIONES (RF019)
│
└── Modales y componentes auxiliares...
```

### Flujo de Integración Actual:

```javascript
// 1. En GestionAuditoriasKanbanSimple.tsx

import { useIntegracionAuditoriaPlanes } from './IntegracionAuditoriasPlanesContext';

const { 
  seleccionarAuditoria,
  agregarAuditoriaConHallazgos 
} = useIntegracionAuditoriaPlanes();

// Al finalizar auditoría con hallazgos
const handleFinalizarAuditoria = (auditoria) => {
  if (auditoria.hallazgos > 0) {
    // Crear objeto para planes
    const auditoriaParaPlan = {
      id: auditoria.id,
      codigo: auditoria.codigo,
      hallazgos: auditoria.hallazgosDetallados,
      estadoPlan: 'SIN_PLAN'
    };
    
    // Agregar al context
    agregarAuditoriaConHallazgos(auditoriaParaPlan);
    seleccionarAuditoria(auditoriaParaPlan);
    
    // Toast informativo
    toast.success('Plan de mejoramiento creado automáticamente');
  }
};

// 2. En ControlInternoFull.tsx

// Navegación automática detectada por Context
useEffect(() => {
  if (auditoriaSeleccionada && seccionActiva !== 'planes-mejoramiento') {
    setSeccionActiva('planes-mejoramiento');
    mostrarBadge('planes-mejoramiento', auditoriaSeleccionada.hallazgos.length);
  }
}, [auditoriaSeleccionada]);

// 3. En PlanesMejoramientoModuleRediseno.tsx

// Recibir auditoría del context
const { auditoriaSeleccionada, limpiarSeleccion } = useIntegracionAuditoriaPlanes();

useEffect(() => {
  if (auditoriaSeleccionada) {
    // Abrir formulario automáticamente
    setMostrarFormulario(true);
    precargarHallazgos(auditoriaSeleccionada.hallazgos);
  }
}, [auditoriaSeleccionada]);
```

---

## 📈 MÉTRICAS Y REPORTES

### Dashboard Ejecutivo:

```
┌─────────────────────────────────────────────────────────────┐
│ 📊 CONTROL INTERNO DE GESTIÓN - DASHBOARD EJECUTIVO         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐│
│ │ AUDITORÍAS │ │ HALLAZGOS  │ │  PLANES    │ │ EFICACIA   ││
│ │            │ │            │ │            │ │            ││
│ │    23/25   │ │     47     │ │   18/18    │ │    92%     ││
│ │    92%     │ │  (12 G)    │ │   100%     │ │            ││
│ └────────────┘ └────────────┘ └────────────┘ └────────────┘│
│                                                             │
│ 📈 Tendencias:                                              │
│ [Gráfico de auditorías por mes]                            │
│ [Gráfico de hallazgos por gravedad]                        │
│ [Gráfico de cumplimiento de planes]                        │
│                                                             │
│ 🎯 Indicadores:                                             │
│ • Cobertura del plan: 92%                                  │
│ • Oportunidad de informes: 95%                             │
│ • Efectividad de acciones: 88%                             │
│ • Satisfacción de áreas auditadas: 4.2/5                   │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎯 CONCLUSIONES

### ✅ Estado Actual:

1. **Integración Kanban ↔ Planes de Mejoramiento:** ✅ Implementada
2. **Context compartido:** ✅ Funcional
3. **Navegación automática:** ✅ Operativa
4. **Badges dinámicos:** ✅ Implementados

### 🔧 Mejoras Recomendadas:

1. **Integración Planeación → Kanban:** 
   - Las auditorías del Programa Anual deberían aparecer automáticamente en el Kanban

2. **Integración Planes → Expedientes:**
   - Generar expediente automático al cerrar plan

3. **Integración Global → Informes:**
   - Los informes deberían actualizarse en tiempo real

4. **Notificaciones Push:**
   - Sistema de alertas en tiempo real

---

## 📞 SOPORTE

Para más información sobre el flujo de Control Interno de Gestión, consultar:

- **Documentación técnica:** `/docs/CONTROL-INTERNO-FLUJO.md`
- **Context de integración:** `/components/esap/control-interno/IntegracionAuditoriasPlanesContext.tsx`
- **Componente principal:** `/components/esap/control-interno/ControlInternoFull.tsx`

---

**FIN DEL DOCUMENTO**  
**Versión:** 3.0  
**Fecha:** Enero 22, 2025
