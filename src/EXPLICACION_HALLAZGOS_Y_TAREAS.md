# 📘 EXPLICACIÓN: ¿Cómo Funcionan los Hallazgos y Tareas en el Kanban?

**ESAP - Módulo Control Interno de Gestión**  
**Fecha**: 23 Enero 2026

---

## 🎯 TU PREGUNTA

> "Cómo se han incluido los Hallazgos y tareas, no vemos la funcionalidad para eso"

**Observación en la imagen del Kanban**:
- Cada card muestra: `8 hallazgos`, `4 críticos`, `15% Tiempo`
- Badge naranja: `2 actividades pendientes`
- Métricas: `15 Docs`, `3 Inf`, `45%`

---

## ✅ RESPUESTA: ESTADO ACTUAL DE IMPLEMENTACIÓN

### 1️⃣ **LOS HALLAZGOS Y TAREAS SON DATOS MOCK (FICTICIOS)**

Actualmente, los números que ves en el Kanban son **valores de ejemplo hardcodeados** en el archivo de datos mock, **NO HAY FUNCIONALIDAD REAL** para crearlos o editarlos desde la UI.

### 📂 Archivo: `GestionAuditoriasKanbanSimple.tsx`

```typescript
interface Auditoria {
  id: string;
  codigo: string;
  titulo: string;
  // ... otros campos ...
  
  hallazgos: number;              // ⚠️ SOLO UN NÚMERO, no hay datos reales
  tareas: number;                 // ⚠️ SOLO UN NÚMERO, no hay datos reales
  actividadesPendientes?: number; // ⚠️ SOLO UN NÚMERO, no hay datos reales
  
  // Métricas también son números simples
  documentos: number;
  informes: number;
  progreso: number;
}

// EJEMPLO DE DATOS MOCK:
const AUDITORIAS_MOCK: Auditoria[] = [
  {
    id: 'aud-001',
    codigo: 'AUD-2025-001',
    titulo: 'Auditoría de Gestión Administrativa',
    // ...
    hallazgos: 0,                  // ⚠️ Valor fijo, no calculado
    tareas: 6,                     // ⚠️ Valor fijo, no calculado
    actividadesPendientes: 2,      // ⚠️ Valor fijo, no calculado
    documentos: 8,
    informes: 1,
    progreso: 15
  }
];
```

**Conclusión**: Los números se muestran en la UI, pero **NO EXISTE** un formulario, modal o componente para:
- ✅ Crear hallazgos
- ✅ Editar hallazgos
- ✅ Crear tareas
- ✅ Marcar tareas como completadas

---

## 2️⃣ **¿DÓNDE DEBERÍA ESTAR LA FUNCIONALIDAD?**

Según el documento maestro y la arquitectura del sistema, hay **2 lugares** donde debería implementarse:

### 🔹 **A) EXPEDIENTE DE AUDITORÍA** (Modal Completo)

**Archivo**: `/components/esap/control-interno/ExpedienteAuditoriaCompleto.tsx`

Este es el modal que se abre al hacer clic en **"Ver"** en una tarjeta del Kanban.

**Estructura de Tabs**:
```
📋 TAB 1: INFORMACIÓN GENERAL
🎯 TAB 2: FASE PLANEACIÓN (RF005)
⚡ TAB 3: FASE EJECUCIÓN (RF006-RF008) ← AQUÍ DEBERÍAN ESTAR LOS HALLAZGOS
📄 TAB 4: FASE COMUNICACIÓN (RF009)
📂 TAB 5: DOCUMENTACIÓN
📊 TAB 6: HISTORIAL Y AUDITORÍA
```

**Tab 3 - Fase Ejecución** debería incluir:
- ✅ **RF007**: Listas de chequeo digitales
- ✅ **RF008**: Registro de hallazgos (⚠️ FALTA IMPLEMENTAR)
- ✅ Evidencias fotográficas y documentales
- ✅ Entrevistas y reuniones
- ✅ Reunión de cierre

### 🔹 **B) MÓDULO INDEPENDIENTE DE EJECUCIÓN**

**Archivo**: `/components/esap/control-interno/EjecucionAuditoriaModule.tsx`

Este módulo SÍ TIENE un componente para crear hallazgos:

```typescript
// Línea 521-524
const crearHallazgo = (datos: Partial<Hallazgo>) => {
  const nuevoHallazgo: Hallazgo = {
    id: `hall-${Date.now()}`,
    numero: `H-${hallazgos.length + 1}`,
    // ... resto del hallazgo
  };
};

// Línea 867-871
<FormularioHallazgo
  onCrear={crearHallazgo}
  onCancelar={() => setModalNuevoHallazgo(false)}
  evidenciasDisponibles={evidencias}
/>
```

**PERO**: Este módulo **NO ESTÁ CONECTADO** con el Kanban actualmente.

---

## 3️⃣ **¿QUÉ ESTÁ IMPLEMENTADO VS QUÉ FALTA?**

### ✅ **IMPLEMENTADO**

| Componente | Estado | Ubicación |
|------------|--------|-----------|
| Interfaz `Hallazgo` | ✅ Definida | `EjecucionAuditoriaModule.tsx` |
| Formulario crear hallazgo | ✅ Existe | `FormularioHallazgo` (dentro de Ejecución) |
| Lista de hallazgos | ✅ Existe | `SeccionHallazgos` (dentro de Ejecución) |
| Datos mock en Kanban | ✅ Números | `GestionAuditoriasKanbanSimple.tsx` |

### 🔴 **FALTA IMPLEMENTAR**

| Funcionalidad | Estado | Prioridad |
|---------------|--------|-----------|
| Conectar hallazgos del Expediente con Ejecución | ❌ No existe | 🔴 ALTA |
| Actualizar contador de hallazgos en Kanban | ❌ No existe | 🔴 ALTA |
| Modal rápido de hallazgos desde Kanban | ❌ No existe | 🟡 MEDIA |
| CRUD de tareas/actividades | ❌ No existe | 🔴 ALTA |
| Sincronización de datos entre módulos | ❌ No existe | 🔴 CRÍTICA |

---

## 4️⃣ **ARQUITECTURA ACTUAL vs DESEADA**

### 📊 **ARQUITECTURA ACTUAL** (Desconectada)

```
┌─────────────────────────────────────┐
│   KANBAN DE AUDITORÍAS              │
│   - Muestra: 8 hallazgos (mock)     │
│   - Muestra: 2 actividades (mock)   │
│                                     │
│   [Ver] ────┐                       │
└─────────────┼───────────────────────┘
              │
              ▼
┌─────────────────────────────────────┐
│   EXPEDIENTE AUDITORÍA (Modal)      │
│                                     │
│   Tab 1: General                    │
│   Tab 2: Planeación                 │
│   Tab 3: Ejecución ⚠️ VACÍO         │  ← PROBLEMA: No muestra hallazgos
│   Tab 4: Comunicación               │
│   Tab 5: Documentación              │
│   Tab 6: Historial                  │
└─────────────────────────────────────┘

         ❌ NO CONECTADO ❌

┌─────────────────────────────────────┐
│   EJECUCIÓN AUDITORÍA (Módulo)      │
│   ✅ Tiene FormularioHallazgo       │
│   ✅ Tiene crearHallazgo()          │
│   ✅ Tiene lista de hallazgos       │
│                                     │
│   PERO: No se usa desde Kanban      │
└─────────────────────────────────────┘
```

### ✅ **ARQUITECTURA DESEADA** (Integrada)

```
┌─────────────────────────────────────┐
│   KANBAN DE AUDITORÍAS              │
│   - Muestra: 8 hallazgos (REAL)     │ ← Calculado dinámicamente
│   - Muestra: 2 actividades (REAL)   │ ← Calculado dinámicamente
│                                     │
│   [Ver] ────┐                       │
└─────────────┼───────────────────────┘
              │
              ▼
┌─────────────────────────────────────┐
│   EXPEDIENTE AUDITORÍA (Modal)      │
│                                     │
│   Tab 1: General                    │
│   Tab 2: Planeación                 │
│   Tab 3: Ejecución ✅ ACTIVO        │  ← Muestra hallazgos reales
│     ├─ Listas de chequeo           │
│     ├─ Hallazgos (8 registros)     │  ← CRUD completo
│     ├─ Evidencias                  │
│     └─ Actividades (2 pendientes)  │  ← Gestión de tareas
│   Tab 4: Comunicación               │
│   Tab 5: Documentación              │
│   Tab 6: Historial                  │
└─────────────────────────────────────┘
              ▲
              │
              │ ✅ INTEGRADO
              │
┌─────────────┴───────────────────────┐
│   CONTEXTO GLOBAL                   │
│   - Gestiona hallazgos por auditoría│
│   - Calcula contadores automáticos  │
│   - Sincroniza con Kanban           │
└─────────────────────────────────────┘
```

---

## 5️⃣ **¿CÓMO DEBERÍA FUNCIONAR?** (Flujo Usuario)

### 🎯 **ESCENARIO 1: Crear Hallazgo desde Expediente**

```
Usuario → Kanban → Clic en card "AUD-2025-005"
   ↓
Modal "Expediente de Auditoría" se abre
   ↓
Usuario → Clic en Tab "Ejecución"
   ↓
Sección "Hallazgos" aparece con:
   ├─ Lista de hallazgos existentes (8 items)
   ├─ [+ Nuevo Hallazgo] botón
   ├─ Filtros (Tipo, Severidad, Estado)
   └─ Buscador
   ↓
Usuario → Clic en [+ Nuevo Hallazgo]
   ↓
Formulario aparece con campos:
   ├─ Tipo de hallazgo (No Conformidad, Observación, etc.)
   ├─ Descripción del hallazgo
   ├─ Causa raíz
   ├─ Criterio normativo incumplido
   ├─ Evidencia (adjuntar archivo)
   ├─ Severidad (Baja, Media, Alta, Crítica)
   ├─ Área responsable
   └─ Estado (Abierto, En análisis, Cerrado)
   ↓
Usuario → Completa formulario → Clic en "Guardar"
   ↓
Sistema:
   1. Crea hallazgo con código único (HAL-2025-009)
   2. Actualiza contador en card del Kanban (8 → 9)
   3. Registra en auditoría de cambios
   4. Envía notificación al área responsable
   5. Muestra toast: "✅ Hallazgo HAL-2025-009 creado"
   ↓
Card en Kanban ahora muestra: "9 hallazgos, 5 críticos"
```

### 🎯 **ESCENARIO 2: Gestión de Tareas/Actividades**

```
Usuario → Expediente → Tab "Ejecución"
   ↓
Sección "Actividades de la Fase" con:
   ├─ Actividad 1: Aplicar lista de chequeo ✅ Completada
   ├─ Actividad 2: Registrar hallazgos ⏳ En progreso
   ├─ Actividad 3: Reunión de cierre ⚠️ Pendiente
   └─ [+ Nueva Actividad]
   ↓
Usuario → Marca checkbox en "Actividad 3"
   ↓
Sistema:
   1. Actualiza progreso de la auditoría (45% → 60%)
   2. Actualiza badge en Kanban (2 pendientes → 1 pendiente)
   3. Si todas completas: Habilita botón "Avanzar a Comunicación"
   4. Muestra toast: "✅ Actividad marcada como completada"
```

---

## 6️⃣ **DATOS REALES VS DATOS MOCK**

### ⚠️ **ACTUALMENTE (DATOS MOCK)**

```typescript
// Archivo: GestionAuditoriasKanbanSimple.tsx
const AUDITORIAS_MOCK: Auditoria[] = [
  {
    id: 'aud-004',
    codigo: 'AUD-2025-004',
    titulo: 'Auditoría de Recursos Humanos',
    hallazgos: 8,          // ⚠️ Número fijo, no hay 8 hallazgos reales
    tareas: 12,            // ⚠️ Número fijo, no hay 12 tareas reales
    actividadesPendientes: 2, // ⚠️ Número fijo
    // ...
  }
];
```

### ✅ **COMO DEBERÍA SER (DATOS REALES)**

```typescript
// Archivo: ControlInternoContext.tsx (Estado Global)
const [hallazgosPorAuditoria, setHallazgosPorAuditoria] = useState<{
  [auditoriaId: string]: Hallazgo[];
}>({
  'aud-004': [
    {
      id: 'hall-001',
      codigo: 'HAL-2025-001',
      tipo: 'No Conformidad',
      descripcion: 'Falta de segregación de funciones en proceso de nómina',
      severidad: 'Crítica',
      estado: 'Abierto',
      evidencias: ['evidencia-001.pdf', 'foto-001.jpg'],
      // ...
    },
    {
      id: 'hall-002',
      codigo: 'HAL-2025-002',
      tipo: 'Observación',
      descripcion: 'Documentación de contratos incompleta',
      severidad: 'Media',
      estado: 'En análisis',
      // ...
    },
    // ... 6 hallazgos más (total: 8)
  ]
});

// En el Kanban, el contador se calcula dinámicamente:
const contadorHallazgos = hallazgosPorAuditoria['aud-004']?.length || 0; // = 8
const hallazgosCriticos = hallazgosPorAuditoria['aud-004']
  ?.filter(h => h.severidad === 'Crítica')
  .length || 0; // = 4

// Mostrar en card:
<div className="text-xs text-gray-600">
  {contadorHallazgos} hallazgos, {hallazgosCriticos} críticos
</div>
```

---

## 7️⃣ **¿QUÉ NECESITAMOS IMPLEMENTAR?**

### 🔴 **PRIORIDAD CRÍTICA**

1. **Crear Contexto Global de Hallazgos**
   - Archivo: `/components/esap/control-interno/HallazgosContext.tsx`
   - Funciones: `crearHallazgo()`, `editarHallazgo()`, `eliminarHallazgo()`
   - Estado: `hallazgosPorAuditoria: { [auditoriaId]: Hallazgo[] }`

2. **Integrar Hallazgos en ExpedienteAuditoriaCompleto**
   - Tab 3: Agregar sección de hallazgos
   - Reutilizar `FormularioHallazgo` de EjecucionAuditoriaModule
   - Conectar con contexto global

3. **Actualizar Contadores en Kanban**
   - Calcular dinámicamente desde contexto
   - Actualizar en tiempo real cuando se crea/edita hallazgo

4. **Crear Contexto Global de Tareas/Actividades**
   - Similar a hallazgos
   - Funciones CRUD
   - Integración con progreso de auditoría

### 🟡 **PRIORIDAD MEDIA**

5. **Modal Rápido de Hallazgos**
   - Botón en card del Kanban: "Ver Hallazgos (8)"
   - Modal simple con lista y filtros
   - Sin abrir expediente completo

6. **Dashboard de Hallazgos**
   - Vista consolidada de todos los hallazgos
   - Filtros por auditoría, severidad, estado
   - Exportar a Excel/PDF

---

## 8️⃣ **EJEMPLO DE CÓDIGO: Cómo Debería Funcionar**

### 📝 **1. Crear el Contexto Global**

```typescript
// /components/esap/control-interno/HallazgosContext.tsx

import { createContext, useContext, useState, ReactNode } from 'react';

interface Hallazgo {
  id: string;
  codigo: string;
  auditoriaId: string;
  tipo: 'No Conformidad' | 'Observación' | 'Oportunidad de Mejora';
  descripcion: string;
  causaRaiz: string;
  criterioNormativo: string;
  evidencias: string[];
  severidad: 'Baja' | 'Media' | 'Alta' | 'Crítica';
  areaResponsable: string;
  estado: 'Abierto' | 'En Análisis' | 'Cerrado';
  fechaDeteccion: string;
  responsableDeteccion: string;
}

interface HallazgosContextType {
  hallazgosPorAuditoria: { [auditoriaId: string]: Hallazgo[] };
  crearHallazgo: (auditoriaId: string, datos: Omit<Hallazgo, 'id' | 'codigo'>) => void;
  editarHallazgo: (hallazgoId: string, datos: Partial<Hallazgo>) => void;
  eliminarHallazgo: (hallazgoId: string) => void;
  obtenerHallazgosPorAuditoria: (auditoriaId: string) => Hallazgo[];
  contarHallazgos: (auditoriaId: string) => number;
  contarHallazgosCriticos: (auditoriaId: string) => number;
}

const HallazgosContext = createContext<HallazgosContextType | undefined>(undefined);

export function HallazgosProvider({ children }: { children: ReactNode }) {
  const [hallazgosPorAuditoria, setHallazgosPorAuditoria] = useState<{
    [auditoriaId: string]: Hallazgo[];
  }>({
    // Datos iniciales mock
    'aud-004': [
      {
        id: 'hall-001',
        codigo: 'HAL-2025-001',
        auditoriaId: 'aud-004',
        tipo: 'No Conformidad',
        descripcion: 'Falta de segregación de funciones en nómina',
        causaRaiz: 'Procedimientos no documentados',
        criterioNormativo: 'Decreto 1072/2015 - Art. 123',
        evidencias: ['evidencia-001.pdf'],
        severidad: 'Crítica',
        areaResponsable: 'Talento Humano',
        estado: 'Abierto',
        fechaDeteccion: '15/01/2025',
        responsableDeteccion: 'Catalina Rubio'
      },
      // ... más hallazgos
    ]
  });

  const crearHallazgo = (auditoriaId: string, datos: Omit<Hallazgo, 'id' | 'codigo'>) => {
    const nuevoId = `hall-${Date.now()}`;
    const numeroHallazgo = (hallazgosPorAuditoria[auditoriaId]?.length || 0) + 1;
    const codigo = `HAL-2025-${String(numeroHallazgo).padStart(3, '0')}`;

    const nuevoHallazgo: Hallazgo = {
      ...datos,
      id: nuevoId,
      codigo,
      auditoriaId
    };

    setHallazgosPorAuditoria(prev => ({
      ...prev,
      [auditoriaId]: [...(prev[auditoriaId] || []), nuevoHallazgo]
    }));

    toast.success(`✅ Hallazgo ${codigo} creado exitosamente`);
  };

  const obtenerHallazgosPorAuditoria = (auditoriaId: string) => {
    return hallazgosPorAuditoria[auditoriaId] || [];
  };

  const contarHallazgos = (auditoriaId: string) => {
    return hallazgosPorAuditoria[auditoriaId]?.length || 0;
  };

  const contarHallazgosCriticos = (auditoriaId: string) => {
    return hallazgosPorAuditoria[auditoriaId]?.filter(h => h.severidad === 'Crítica').length || 0;
  };

  return (
    <HallazgosContext.Provider value={{
      hallazgosPorAuditoria,
      crearHallazgo,
      editarHallazgo,
      eliminarHallazgo,
      obtenerHallazgosPorAuditoria,
      contarHallazgos,
      contarHallazgosCriticos
    }}>
      {children}
    </HallazgosContext.Provider>
  );
}

export const useHallazgos = () => {
  const context = useContext(HallazgosContext);
  if (!context) {
    throw new Error('useHallazgos debe usarse dentro de HallazgosProvider');
  }
  return context;
};
```

### 📝 **2. Usar el Contexto en el Kanban**

```typescript
// /components/esap/control-interno/GestionAuditoriasKanbanSimple.tsx

import { useHallazgos } from './HallazgosContext';

export function GestionAuditoriasKanbanSimple() {
  const { contarHallazgos, contarHallazgosCriticos } = useHallazgos();

  return (
    // ... código del Kanban ...
    
    {auditorias.map(auditoria => (
      <div key={auditoria.id} className="card">
        {/* ... contenido de la card ... */}
        
        <div className="flex gap-4 text-xs text-gray-600">
          <span className="flex items-center gap-1">
            <FileText className="w-4 h-4" />
            {contarHallazgos(auditoria.id)} hallazgos {/* ← Dinámico */}
          </span>
          <span className="flex items-center gap-1">
            <AlertCircle className="w-4 h-4 text-red-600" />
            {contarHallazgosCriticos(auditoria.id)} críticos {/* ← Dinámico */}
          </span>
        </div>
      </div>
    ))}
  );
}
```

### 📝 **3. Integrar en el Expediente**

```typescript
// /components/esap/control-interno/ExpedienteAuditoriaCompleto.tsx

import { useHallazgos } from './HallazgosContext';
import { FormularioHallazgo } from './EjecucionAuditoriaModule';

export function ExpedienteAuditoriaCompleto({ auditoriaId }: Props) {
  const { obtenerHallazgosPorAuditoria, crearHallazgo } = useHallazgos();
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  
  const hallazgos = obtenerHallazgosPorAuditoria(auditoriaId);

  return (
    <div className="modal">
      <Tabs defaultValue="general">
        {/* ... otros tabs ... */}
        
        <TabsContent value="ejecucion">
          <div className="space-y-6">
            {/* Sección de Hallazgos */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold">
                  Hallazgos ({hallazgos.length})
                </h3>
                <Button onClick={() => setMostrarFormulario(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Nuevo Hallazgo
                </Button>
              </div>

              {/* Lista de hallazgos */}
              <div className="space-y-3">
                {hallazgos.map(hallazgo => (
                  <CardHallazgo key={hallazgo.id} hallazgo={hallazgo} />
                ))}
              </div>

              {/* Formulario de creación */}
              {mostrarFormulario && (
                <FormularioHallazgo
                  onCrear={(datos) => {
                    crearHallazgo(auditoriaId, datos);
                    setMostrarFormulario(false);
                  }}
                  onCancelar={() => setMostrarFormulario(false)}
                />
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

---

## 9️⃣ **RESUMEN EJECUTIVO**

### ❓ **Tu Pregunta**
> "¿Cómo se han incluido los hallazgos y tareas?"

### ✅ **Respuesta Corta**
Los hallazgos y tareas que ves en el Kanban son **números ficticios (mock)** hardcodeados en el código. **NO HAY funcionalidad real** para crearlos, editarlos o gestionarlos desde la interfaz.

### 🔧 **¿Qué Existe?**
- ✅ Interfaz de datos `Hallazgo` definida
- ✅ Formulario para crear hallazgos (en módulo desconectado)
- ✅ Números mock en el Kanban

### 🔴 **¿Qué Falta?**
- ❌ Contexto global de hallazgos
- ❌ Integración con el Expediente de Auditoría
- ❌ Actualización dinámica de contadores en Kanban
- ❌ CRUD de tareas/actividades
- ❌ Sincronización entre módulos

### 🎯 **Próximos Pasos Sugeridos**
1. Crear `HallazgosContext.tsx` (estado global)
2. Integrar hallazgos en Tab "Ejecución" del Expediente
3. Actualizar contadores del Kanban dinámicamente
4. Crear contexto similar para Tareas/Actividades
5. Implementar RF008 completo (Registro de Hallazgos)

---

## 🔚 CONCLUSIÓN

Los hallazgos y tareas **se muestran** en el Kanban, pero actualmente son solo **números de ejemplo**. Para hacerlos funcionales necesitamos:

1. ✅ Crear sistema de gestión de estado (Context API)
2. ✅ Conectar formularios existentes
3. ✅ Actualizar contadores dinámicamente
4. ✅ Integrar con el Expediente de Auditoría

**Tiempo estimado de implementación**: 4-6 horas de desarrollo

¿Deseas que implemente esta funcionalidad ahora?

---

**Documento creado**: 23 Enero 2026  
**Autor**: Asistente IA  
**Basado en**: Análisis de código real del sistema ESAP CIG
