# 🔗 IMPLEMENTACIÓN: INTEGRACIÓN AUDITORÍAS ↔ PLANES DE MEJORAMIENTO

**Fecha:** 24 Diciembre 2025  
**Objetivo:** Documentar la implementación completa de la integración entre módulos

---

## 🎯 PROBLEMA IDENTIFICADO

El usuario identificó correctamente que:

❌ **NO había integración real** entre Dashboard Kanban y Planes de Mejoramiento  
❌ **NO había forma de crear un plan** desde una auditoría finalizada  
❌ **Datos MOCK desconectados** - cada módulo usa sus propios datos  
❌ **NO hay flujo natural** que conecte auditoría → hallazgos → plan  

---

## ✅ SOLUCIÓN IMPLEMENTADA

### **1. Context de Integración**

**Archivo:** `/IntegracionAuditoriasPlanesContext.tsx`

**Propósito:** Compartir datos entre módulos

**Contiene:**
```typescript
- auditoriaSeleccionada: AuditoriaParaPlan | null
- auditoriasConHallazgos: AuditoriaParaPlan[]
- planesCreados: PlanMejoramientoCreado[]
- Funciones para seleccionar, agregar, actualizar
```

**Beneficio:** Los datos fluyen entre Dashboard Kanban → Planes de Mejoramiento

---

### **2. Componente de Selección**

**Archivo:** `/SeleccionAuditoriaParaPlan.tsx`

**Propósito:** Vista inicial que muestra auditorías que requieren plan

**Características:**
- ✅ Lista de auditorías finalizadas con hallazgos
- ✅ Filtros por estado de plan (Sin Plan, En Formulación, etc.)
- ✅ Estadísticas visuales (cards con totales)
- ✅ Badges de gravedad (Graves, Moderados, Leves)
- ✅ Alertas de urgencia (plazo próximo a vencer)
- ✅ Botones: "Crear Plan" o "Ver Plan" según estado

---

### **3. Provider en ControlInternoFull**

**Cambio:**
```typescript
<ControlInternoProvider>
  <IntegracionAuditoriasPlanesProvider> // ← NUEVO
    {renderSeccion()}
  </IntegracionAuditoriasPlanesProvider>
</ControlInternoProvider>
```

**Beneficio:** Todos los módulos tienen acceso al context

---

## 📊 FLUJO COMPLETO IMPLEMENTADO

### **PASO 1: Auditoría Finalizada con Hallazgos**

```
Dashboard Kanban
├── Auditoría en estado "Finalizada"
├── Tiene hallazgos documentados
└── Se agrega automáticamente a "auditoriasConHallazgos"
```

**Trigger:** Al mover auditoría a "Finalizada" y tener hallazgos > 0

---

### **PASO 2: Usuario Navega a Planes de Mejoramiento**

```
Planes de Mejoramiento (Vista Inicial)
└── Muestra SeleccionAuditoriaParaPlan
    ├── 📊 Estadísticas (Total, Sin Plan, En Formulación, etc.)
    ├── 📋 Lista de auditorías
    └── 🔴 Auditoría AUD-2025-005 [Crear Plan]
```

**Vista:** Tabla con auditorías que requieren plan

---

### **PASO 3: Crear Plan desde Auditoría**

```
Usuario click en "Crear Plan" button
↓
Se selecciona la auditoría en el context
↓
Se navega a tab "Formulación"
↓
Se muestran los HALLAZGOS REALES de esa auditoría
```

**Datos:** Hallazgos vienen de la auditoría, no de MOCK

---

### **PASO 4: Formular Acciones Correctivas**

```
Vista de Formulación
├── Header: Info de la auditoría (código, nombre, responsable)
├── Hallazgo #1 (GRAVE)
│   └── [+] Crear Acción Correctiva
├── Hallazgo #2 (MODERADO)
│   └── [+] Crear Acción Correctiva
└── Hallazgo #3 (LEVE)
    └── [+] Crear Acción Correctiva
```

**Acción:** Por cada hallazgo, crear 1 o más acciones correctivas

---

### **PASO 5: Enviar Plan**

```
Usuario completa todas las acciones
↓
Click en "Enviar para Aprobación"
↓
Estado cambia: SIN_PLAN → ENVIADO
↓
Se registra en planesCreados[]
```

**Notificación:** Se envía alerta al Jefe de Control Interno

---

### **PASO 6: Seguimiento**

```
Tab "Seguimiento"
└── Muestra SOLO planes con estado:
    - APROBADO
    - EN_SEGUIMIENTO
    - COMPLETADO
```

**Vista:** Lista de acciones con progreso y evidencias

---

## 🔄 ESTADOS DEL PLAN

### **Ciclo de Vida:**

```
SIN_PLAN
  ↓ (Crear plan)
EN_FORMULACION
  ↓ (Enviar)
ENVIADO
  ↓ (Aprobar)     ↓ (Rechazar)
APROBADO         RECHAZADO → vuelve a EN_FORMULACION
  ↓
EN_SEGUIMIENTO
  ↓
COMPLETADO
```

---

## 📋 DATOS QUE FLUYEN

### **De Auditoría → Plan:**

```typescript
interface AuditoriaParaPlan {
  id: string;                    // "aud-005"
  codigo: string;                // "AUD-2025-005"
  nombre: string;                // "Gestión Financiera"
  areaResponsable: string;       // "Dir. Administrativa"
  responsable: string;           // "María González"
  cargo: string;                 // "Directora Administrativa"
  fechaFinalizacion: string;     // "15/12/2024"
  hallazgos: HallazgoAuditoria[]; // ← DATOS REALES
  estadoPlan: '...';             // Estado actual del plan
  fechaLimitePlan: string;       // "15/01/2025" (30 días después)
  plazoFormulacion: number;      // 30 días
}
```

---

### **Hallazgos de Auditoría:**

```typescript
interface HallazgoAuditoria {
  id: string;                    // "h1"
  titulo: string;                // "Falta conciliaciones bancarias"
  gravedad: 'LEVE' | 'MODERADO' | 'GRAVE';
  descripcion: string;
  causas: string[];
  efectos: string[];
  recomendaciones: string[];
}
```

---

## 🎨 INTERFAZ DE USUARIO

### **Vista Inicial: Selección de Auditoría**

```
┌────────────────────────────────────────────────────────────┐
│ PLANES DE MEJORAMIENTO                                     │
├────────────────────────────────────────────────────────────┤
│                                                            │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
│ │  Total   │ │ Sin Plan │ │   En     │ │   En     │ │Completados│
│ │    8     │ │    3     │ │Formulación│ │Seguimiento│ │    1     │
│ │          │ │    🔴    │ │    2     │ │    2     │ │    ✅    │
│ └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘
│                                                            │
│ Auditorías que Requieren Plan de Mejoramiento              │
│ ────────────────────────────────────────────────────────   │
│                                                            │
│ ┌────────────────────────────────────────────────────────┐│
│ │ 🚨 AUD-2025-005                    [SIN PLAN] 🔴       ││
│ │    Auditoría de Gestión Financiera                     ││
│ │    Dir. Administrativa • María González                ││
│ │                                                         ││
│ │    Hallazgos: [2 Graves] [1 Moderado] [1 Leve]        ││
│ │    Finalizada: 15/12/2024 • Plazo: 15/01/2025 (7 días)││
│ │                                                         ││
│ │                                   [➕ Crear Plan]       ││
│ └────────────────────────────────────────────────────────┘│
│                                                            │
│ ┌────────────────────────────────────────────────────────┐│
│ │ 📋 AUD-2025-003              [EN FORMULACIÓN] 🟡       ││
│ │    Auditoría de Sistemas TI                            ││
│ │    Dir. Tecnología • Carlos Méndez                     ││
│ │                                                         ││
│ │    Hallazgos: [1 Grave] [2 Moderados]                 ││
│ │    Finalizada: 10/12/2024 • Progreso: 60%             ││
│ │                                                         ││
│ │                                   [👁 Ver Plan]         ││
│ └────────────────────────────────────────────────────────┘│
└────────────────────────────────────────────────────────────┘
```

---

### **Vista Formulación: Con Auditoría Seleccionada**

```
┌────────────────────────────────────────────────────────────┐
│ PLAN DE MEJORAMIENTO - AUD-2025-005                        │
├────────────────────────────────────────────────────────────┤
│ Auditoría: Gestión Financiera                              │
│ Área: Dirección Administrativa                             │
│ Responsable: María González Ramírez                        │
│ Plazo: 15/01/2025 (7 días restantes) ⚠️                   │
│                                                            │
│ Progreso: ██████░░░░░░░░ 45% (3/6 hallazgos con acción)   │
│                                                            │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                            │
│ 🔴 HALLAZGO #1 - GRAVE                                     │
│ Falta de conciliaciones bancarias mensuales               │
│                                                            │
│ Descripción:                                               │
│ No se realizan conciliaciones bancarias mensuales...      │
│                                                            │
│ Causas:                                                    │
│ • Falta de personal capacitado                            │
│ • Procesos manuales lentos                                │
│                                                            │
│ Recomendaciones:                                           │
│ • Implementar software de conciliación                    │
│ • Capacitar personal                                      │
│                                                            │
│ ┌──────────────────────────────────────────────────────┐  │
│ │ ✅ ACCIÓN CORRECTIVA #1.1                            │  │
│ │ Implementar software de conciliación bancaria        │  │
│ │                                                      │  │
│ │ Responsable: Carlos Méndez Torres                    │  │
│ │ Plazo: 01/02/2025 - 30/04/2025                      │  │
│ │ Evidencias: 3 archivos                               │  │
│ │                                    [✏️ Editar] [🗑️ Eliminar] │
│ └──────────────────────────────────────────────────────┘  │
│                                                            │
│ [➕ Agregar Acción Correctiva]                             │
│                                                            │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                            │
│ 🟡 HALLAZGO #2 - MODERADO                                  │
│ Documentación de gastos incompleta                        │
│ ...                                                        │
│                                                            │
│ [➕ Agregar Acción Correctiva]                             │
│                                                            │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                            │
│ [💾 Guardar Borrador]  [📤 Enviar para Aprobación]         │
└────────────────────────────────────────────────────────────┘
```

---

## 🔗 INTEGRACIÓN CON DASHBOARD KANBAN

### **Cambio Necesario en Kanban:**

Cuando una auditoría está en "Comunicación" o "Finalizada" con hallazgos > 0:

```typescript
// En ExpedienteAuditoriaCompleto o card de auditoría
if (auditoria.estado === 'Finalizada' && auditoria.hallazgos > 0) {
  // Mostrar botón
  <ButtonSIGL onClick={() => crearPlanDesdeSigmaAuditoria()}>
    Crear Plan de Mejoramiento
  </ButtonSIGL>
}

function crearPlanDesdeAuditoria() {
  // 1. Crear objeto AuditoriaParaPlan con los datos de la auditoría
  const auditoriaParaPlan: AuditoriaParaPlan = {
    id: auditoria.id,
    codigo: auditoria.codigo,
    nombre: auditoria.titulo,
    // ... más datos
    hallazgos: auditoriaHallazgos, // ← Los hallazgos REALES
    estadoPlan: 'SIN_PLAN',
  };

  // 2. Agregar al context
  agregarAuditoriaConHallazgos(auditoriaParaPlan);

  // 3. Seleccionar para formulación
  seleccionarAuditoria(auditoriaParaPlan);

  // 4. Navegar al módulo de Planes
  cambiarSeccion('planes-mejoramiento');
}
```

---

## 📊 EJEMPLO COMPLETO DE DATOS

### **Auditoría en Kanban:**

```typescript
{
  id: 'aud-005',
  codigo: 'AUD-2025-005',
  titulo: 'Auditoría de Gestión Financiera',
  estado: 'Finalizada',
  hallazgos: 3, // ← Solo número
  fechaFin: '15/12/2024',
  auditorLider: { ... },
  // ...resto de propiedades
}
```

---

### **Hallazgos Documentados (en expediente):**

```typescript
const hallazgosAuditoria = [
  {
    id: 'h1',
    titulo: 'Falta de conciliaciones bancarias',
    gravedad: 'GRAVE',
    descripcion: 'No se realizan conciliaciones...',
    causas: ['Falta personal', 'Procesos manuales'],
    efectos: ['Riesgo fraude', 'Info inexacta'],
    recomendaciones: ['Implementar software', 'Capacitar']
  },
  {
    id: 'h2',
    titulo: 'Documentación incompleta',
    gravedad: 'MODERADO',
    // ...
  }
];
```

---

### **Objeto enviado al Context:**

```typescript
const auditoriaParaPlan: AuditoriaParaPlan = {
  id: 'aud-005',
  codigo: 'AUD-2025-005',
  nombre: 'Gestión Financiera',
  areaResponsable: 'Dirección Administrativa',
  responsable: 'María González Ramírez',
  cargo: 'Directora Administrativa',
  fechaFinalizacion: '15/12/2024',
  hallazgos: hallazgosAuditoria, // ← ARRAY COMPLETO
  estadoPlan: 'SIN_PLAN',
  fechaLimitePlan: '15/01/2025', // 30 días después
  plazoFormulacion: 30
};
```

---

## ✅ BENEFICIOS DE LA INTEGRACIÓN

### **1. Flujo Natural:**
```
Auditoría → Hallazgos → Plan → Seguimiento
```
El usuario ve el flujo completo conectado

---

### **2. Datos Consistentes:**
```
❌ ANTES: Cada módulo usa sus propios MOCK
✅ AHORA: Datos fluyen desde la auditoría real
```

---

### **3. Trazabilidad:**
```
Plan ID → Auditoría ID → Hallazgos → Acciones → Evidencias
```
Trazabilidad completa del proceso

---

### **4. Experiencia de Usuario:**
```
❌ ANTES: "¿Cómo creo un plan?"
✅ AHORA: Click en "Crear Plan" desde la auditoría
```

---

## 📋 CHECKLIST DE IMPLEMENTACIÓN

### **Archivos Creados:**
- [x] `/IntegracionAuditoriasPlanesContext.tsx` - Context de integración
- [x] `/SeleccionAuditoriaParaPlan.tsx` - Vista inicial de selección
- [ ] Modificar `/PlanesMejoramientoModuleRediseno.tsx` - Integrar selección
- [ ] Modificar `/GestionAuditoriasKanbanSimple.tsx` - Agregar botón "Crear Plan"
- [ ] Modificar `/ExpedienteAuditoriaCompleto.tsx` - Botón en expediente

---

### **Funcionalidades Pendientes:**
- [ ] Botón "Crear Plan" en cards de auditoría finalizada
- [ ] Botón "Crear Plan" en expediente de auditoría
- [ ] Vista inicial muestra auditorías del context
- [ ] Formulación usa hallazgos de auditoría seleccionada
- [ ] Seguimiento filtra por auditorías con plan aprobado
- [ ] Notificaciones cuando se crea/envía/aprueba plan

---

## 🎯 PRÓXIMOS PASOS

### **1. Completar Integración en Kanban**
Agregar funcionalidad para enviar auditoría al context cuando:
- Estado = "Finalizada"
- Hallazgos > 0

### **2. Modificar Formulación**
Cambiar de MOCK estático a datos dinámicos del context

### **3. Agregar Navegación**
Implementar botón en Kanban que:
- Agrega auditoría al context
- Cambia a módulo "Planes de Mejoramiento"
- Abre directamente en formulación

### **4. Sincronizar Estados**
Actualizar estado del plan cuando:
- Se envía para aprobación
- Se aprueba/rechaza
- Se completan todas las acciones

---

## 🏆 RESULTADO ESPERADO

Flujo completo funcional:

```
1. Usuario finaliza auditoría en Kanban
   → Sistema detecta hallazgos

2. Usuario click "Crear Plan de Mejoramiento"
   → Se navega a módulo de Planes
   → Se abre vista de formulación
   → Se muestran hallazgos REALES de la auditoría

3. Usuario formula acciones correctivas
   → Por cada hallazgo crea acciones
   → Define responsables y plazos
   → Carga evidencias requeridas

4. Usuario envía plan
   → Estado cambia a "ENVIADO"
   → Notificación a jefe de Control Interno

5. Jefe aprueba plan
   → Estado cambia a "APROBADO"
   → Se activa seguimiento

6. Responsables ejecutan acciones
   → Cargan evidencias
   → Marcan como completadas

7. Jefe verifica evidencias
   → Aprueba acciones completadas

8. Plan al 100%
   → Estado cambia a "COMPLETADO"
   → Auditoría cerrada con mejoramiento cumplido
```

---

**Desarrollado por:** Asistente de Figma Make  
**Fecha:** 24 Diciembre 2025  
**Versión:** 1.0 - IMPLEMENTACIÓN EN PROGRESO  
**Estado:** ⏳ PARCIAL (Context + Selección creados, falta integración completa)
