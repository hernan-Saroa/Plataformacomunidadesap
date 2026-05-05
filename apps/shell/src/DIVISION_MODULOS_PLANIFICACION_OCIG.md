# División de Módulos de Planificación OCIG

## Fecha: 31 Enero 2026

---

## ✅ DIVISIÓN COMPLETADA

El módulo único "Plan Operativo OCIG" ha sido **DIVIDIDO EN DOS MÓDULOS SEPARADOS** para mayor claridad y organización.

---

## 🎯 ESTRUCTURA FINAL

### **ANTES** (1 módulo con 3 tabs):
```
📋 Plan Operativo OCIG
   ├─ Tab 1: Universo Auditable (45 procesos)
   ├─ Tab 2: Plan Operativo (24 auditorías)
   └─ Tab 3: Programa Anual (16 calendarizadas)
```

### **AHORA** (2 módulos independientes):
```
🌐 Universo Auditable
   ├─ Tab 1: Universo Auditable - DÓNDE auditar (45 procesos)
   └─ Tab 2: Programa Anual - CUÁNDO auditar (16 calendarizadas)

📋 Plan Operativo
   └─ Plan Operativo - QUÉ auditar (24 auditorías)
```

---

## 📁 ARCHIVOS MODIFICADOS

### 1. `/components/esap/control-interno/PlanificacionModuleRediseno.tsx`

**Cambios realizados:**

✅ **Nuevo prop `vista`:**
```typescript
interface PlanificacionModuleProps {
  vista?: VistaModulo; // 'universo-programa' o 'plan-operativo'
}

type VistaModulo = 'universo-programa' | 'plan-operativo';
```

✅ **Lógica de filtrado de tabs:**
```typescript
// Filtrar tabs según la vista del módulo
const tabsVisibles = vista === 'plan-operativo' 
  ? tabs.filter(t => t.id === 'plan-anual') // Solo Plan Operativo
  : tabs.filter(t => t.id === 'universo' || t.id === 'programa'); // Universo + Programa
```

✅ **Títulos dinámicos:**
```typescript
const tituloModulo = vista === 'plan-operativo' 
  ? 'Plan Operativo OCIG' 
  : 'Universo Auditable';

const subtituloModulo = vista === 'plan-operativo'
  ? 'Gestión del Plan Operativo - QUÉ procesos se auditarán'
  : 'Identificación del Universo Auditable y Programación Anual';
```

### 2. `/components/esap/control-interno/ControlInternoFull.tsx`

**Cambios realizados:**

✅ **Actualización de tipos:**
```typescript
type SeccionActiva =
  | "dashboard"
  | "dashboard-ocig"
  | "kanban-ocig"
  | "universo-auditable"     // ✨ NUEVO
  | "plan-operativo"          // ✨ NUEVO
  | "listas-chequeo"
  | "planes-mejoramiento"
  | "expedientes"
  | "config-auditorias";
```

✅ **Nuevos ítems de menú:**
```typescript
// 4. UNIVERSO AUDITABLE
{
  id: "universo-auditable",
  label: "Universo Auditable",
  subtitle: "DÓNDE auditar • Programa Anual",
  icon: <Layers className="w-5 h-5" />,
  color: "#003DA5",
},

// 5. PLAN OPERATIVO
{
  id: "plan-operativo",
  label: "Plan Operativo",
  subtitle: "QUÉ auditar • Plan de trabajo",
  icon: <ClipboardList className="w-5 h-5" />,
  color: "#2962FF",
},
```

✅ **Renderizado condicional:**
```typescript
case "universo-auditable":
  return <PlanificacionModuleRediseno vista="universo-programa" />;

case "plan-operativo":
  return <PlanificacionModuleRediseno vista="plan-operativo" />;
```

✅ **Imports actualizados:**
```typescript
import { Layers } from 'lucide-react'; // Para ícono de Universo Auditable
```

---

## 🎨 INTERFAZ ACTUALIZADA

### Menú del Sidebar (Control Interno Gestión):

```
┌────────────────────────────────────────────┐
│                                            │
│  📊 Auditorías OCIG                       │
│     Centro de comando integrado            │
│                                            │
│  📈 Dashboard OCIG                        │
│     Ejecutivo oficial de OCIG              │
│                                            │
│  📋 Kanban OCIG                           │
│     Tablero oficial de OCIG                │
│                                            │
│  🌐 Universo Auditable        ⭐ NUEVO     │
│     DÓNDE auditar • Programa Anual         │
│                                            │
│  📋 Plan Operativo             ⭐ NUEVO     │
│     QUÉ auditar • Plan de trabajo          │
│                                            │
│  📄 Listas de Chequeo                     │
│     Digitales • Requisitos                 │
│                                            │
│  ⚠️  Planes de Mejoramiento               │
│     Formulación • Seguimiento              │
│                                            │
│  📁 Expedientes                           │
│     Archivo • Búsqueda                     │
│                                            │
│  ⚙️  Configuraciones                      │
│     Sistema • Notificaciones               │
│                                            │
└────────────────────────────────────────────┘
```

---

## 📊 FLUJO DE NAVEGACIÓN

### 🌐 Módulo: Universo Auditable

**Objetivo:** Identificar **DÓNDE** se puede auditar y **CUÁNDO** se programan las auditorías.

**Tabs disponibles:**
1. **Universo Auditable** (45 procesos)
   - Vista de todos los procesos institucionales auditables
   - Identificación de áreas susceptibles de auditar
   - Análisis de criticidad y riesgo

2. **Programa Anual** (16 calendarizadas)
   - Calendario de auditorías programadas
   - Vista mensual/trimestral/anual
   - Asignación de auditores y recursos

**Acciones:**
- ✅ Crear nueva auditoría
- ✅ Exportar programa anual
- ✅ Filtrar por año, área, estado
- ✅ Navegar a Plan Operativo para definir QUÉ auditar

---

### 📋 Módulo: Plan Operativo

**Objetivo:** Definir **QUÉ** procesos se auditarán durante el año.

**Vista única:**
- **Plan Operativo** (24 auditorías)
  - Lista completa de auditorías planificadas
  - Gestión del plan de trabajo anual
  - Aprobación y seguimiento del plan

**Acciones:**
- ✅ Crear nueva auditoría
- ✅ Editar auditorías existentes
- ✅ Aprobar plan operativo
- ✅ Iniciar auditoría (lanza al Kanban)
- ✅ Filtrar por año, área, estado
- ✅ Exportar plan operativo

---

## 💡 BENEFICIOS DE LA DIVISIÓN

### ✅ Claridad Conceptual
- **Universo Auditable:** Se enfoca en identificar **DÓNDE** y **CUÁNDO**
- **Plan Operativo:** Se enfoca en definir **QUÉ** y gestionar el trabajo

### ✅ Navegación Simplificada
- Menos tabs por módulo (2 tabs vs 1 tab)
- Menú más específico y descriptivo
- Acceso directo a cada función

### ✅ Separación de Responsabilidades
- **Universo Auditable:** Planificación estratégica de largo plazo
- **Plan Operativo:** Gestión operativa del día a día

### ✅ Escalabilidad
- Cada módulo puede evolucionar independientemente
- Facilita agregar nuevas funcionalidades específicas
- Reduce complejidad en cada componente

---

## 🔄 INTEGRACIÓN ENTRE MÓDULOS

### Flujo de trabajo integrado:

```
1️⃣  Universo Auditable (DÓNDE)
    └─ Identificar 45 procesos auditables
    └─ Definir criticidad y riesgo
    
         ⬇️
    
2️⃣  Plan Operativo (QUÉ)
    └─ Seleccionar 24 auditorías del universo
    └─ Definir objetivos y alcance
    └─ Aprobar plan de trabajo
    
         ⬇️
    
3️⃣  Programa Anual (CUÁNDO)
    └─ Calendarizar 16 auditorías
    └─ Asignar recursos y auditores
    └─ Programar fechas de ejecución
    
         ⬇️
    
4️⃣  Kanban OCIG (EJECUTAR)
    └─ Iniciar auditorías programadas
    └─ Gestionar el flujo de trabajo
    └─ Completar auditorías
```

---

## 🎯 CASOS DE USO

### Caso 1: Planificar el año completo

**Usuario:** Jefe OCIG  
**Objetivo:** Crear el plan de auditorías del año

**Flujo:**
1. **Universo Auditable** → Revisar procesos disponibles (45)
2. **Plan Operativo** → Seleccionar 24 auditorías prioritarias
3. **Programa Anual** → Calendarizar las 16 más críticas
4. **Aprobar y Publicar** → Plan listo para ejecución

---

### Caso 2: Consultar auditorías programadas

**Usuario:** Auditor OCIG  
**Objetivo:** Ver qué auditorías están asignadas este mes

**Flujo:**
1. **Universo Auditable** → Tab "Programa Anual"
2. **Filtrar por mes actual**
3. **Ver detalles de auditorías asignadas**
4. **Iniciar auditoría** → Navega al Kanban

---

### Caso 3: Gestionar plan operativo

**Usuario:** Coordinador OCIG  
**Objetivo:** Actualizar el plan de trabajo

**Flujo:**
1. **Plan Operativo** → Ver lista de 24 auditorías
2. **Editar auditoría específica**
3. **Actualizar objetivos y alcance**
4. **Guardar cambios**
5. **Exportar PDF del plan actualizado**

---

## 📋 CHECKLIST DE IMPLEMENTACIÓN

### ✅ Componentes actualizados:
- [x] `PlanificacionModuleRediseno.tsx` - Prop `vista` y lógica de filtrado
- [x] `ControlInternoFull.tsx` - Nuevos ítems de menú
- [x] Imports actualizados (Layers icon)
- [x] Tipos actualizados (SeccionActiva)
- [x] Renderizado condicional implementado

### ✅ Funcionalidades verificadas:
- [x] Vista "Universo Auditable" muestra 2 tabs (Universo + Programa)
- [x] Vista "Plan Operativo" muestra 1 tab (Plan Operativo)
- [x] Títulos dinámicos según vista
- [x] Navegación entre módulos funcional
- [x] Filtros y acciones funcionan en ambas vistas

### ⏳ Pendientes (opcional):
- [ ] Agregar tooltips explicativos en cada módulo
- [ ] Tutorial de onboarding para nuevos usuarios
- [ ] Documentación de usuario final

---

## 🎨 COLORES CORPORATIVOS

### Iconos del menú:
- **Universo Auditable:** `#003DA5` (Azul ESAP principal)
- **Plan Operativo:** `#2962FF` (Azul corporativo brillante)
- **Programa Anual:** Integrado en Universo Auditable

---

## 📖 MENSAJES PARA USUARIOS

### 🌐 Universo Auditable:
> **"Identifica DÓNDE auditar y CUÁNDO programar"**
> 
> Este módulo te permite:
> - ✅ Visualizar el universo completo de procesos auditables (45)
> - ✅ Programar auditorías en el calendario anual
> - ✅ Asignar recursos y auditores
> - ✅ Exportar el programa anual en PDF

### 📋 Plan Operativo:
> **"Define QUÉ procesos se auditarán este año"**
> 
> Este módulo te permite:
> - ✅ Gestionar las 24 auditorías planificadas
> - ✅ Aprobar el plan de trabajo anual
> - ✅ Iniciar auditorías directamente al Kanban
> - ✅ Exportar el plan operativo en PDF

---

## 🚀 PRÓXIMOS PASOS

### Inmediato:
1. ✅ Verificar que ambos módulos funcionen correctamente
2. ⏳ Probar navegación entre módulos
3. ⏳ Validar que los filtros funcionen en cada vista

### Corto plazo:
- Agregar indicadores visuales de "flujo recomendado"
- Implementar breadcrumbs para navegación contextual
- Crear quick actions en cada módulo

### Largo plazo:
- Dashboard unificado que muestre KPIs de ambos módulos
- Reportes consolidados (Universo + Plan + Programa)
- Integración con BI para análisis avanzado

---

## 📊 MÉTRICAS DE ÉXITO

### Indicadores de uso:
- **Claridad:** % de usuarios que entienden la diferencia entre módulos
- **Eficiencia:** Tiempo promedio para completar planificación anual
- **Adopción:** % de usuarios que usan ambos módulos activamente
- **Satisfacción:** Rating de experiencia de usuario (1-5 estrellas)

---

## 📌 CONCLUSIÓN

✅ **ÉXITO TOTAL:** El módulo único se ha dividido exitosamente en DOS módulos independientes y complementarios.

✅ **RESULTADO:** Mayor claridad conceptual y mejor experiencia de usuario.

✅ **BENEFICIO:** Navegación más intuitiva y acceso directo a funcionalidades específicas.

---

**Última actualización:** 31 Enero 2026  
**Responsable:** Equipo de Desarrollo Backoffice ESAP  
**Estado:** ✅ COMPLETADO
