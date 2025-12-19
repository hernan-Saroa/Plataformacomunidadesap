# 📝 FUNCIONALIDAD BOTÓN "NUEVO CASO" (Nuevo Expediente)

**Fecha:** 18 de Diciembre de 2025  
**Módulo:** MOD-01 - Defensa Judicial  
**Componente:** `ModuloDefensaJudicial.tsx`  
**Estado:** ✅ COMPLETAMENTE FUNCIONAL

---

## 🎯 **RESUMEN**

El botón **"Nuevo Expediente"** (anteriormente "Nuevo Caso") permite crear nuevos expedientes judiciales en el Sistema Integral de Gestión Legal (SIGL) de la ESAP.

### **Ubicación:**
- Esquina superior derecha de la pantalla principal
- Al lado del título "Defensa Judicial"
- Color: Azul corporativo (#003DA5)
- Icono: Plus (+)

---

## 🔄 **FLUJO COMPLETO DE CREACIÓN**

### **Paso 1: Click en el Botón**

```tsx
<ButtonSIGL
  variant="primary"
  onClick={handleCrearExpediente}
>
  <Plus className="w-4 h-4" />
  Nuevo Expediente
</ButtonSIGL>
```

**Acción:** Abre un modal con el formulario completo

---

### **Paso 2: Formulario Multi-Paso**

El modal muestra un **formulario de 4 pasos** (`FormularioExpedienteCompleto.tsx`):

#### **PASO 1: Información Básica** ⚖️
```
┌─────────────────────────────────────────────────┐
│ 📋 Paso 1: Información Básica del Expediente   │
├─────────────────────────────────────────────────┤
│                                                 │
│ Jurisdicción: *                                 │
│ ┌─────────────────────────────────────┐        │
│ │ Contencioso Administrativo        ▼ │        │
│ └─────────────────────────────────────┘        │
│                                                 │
│ Medio de Control: *                             │
│ ┌─────────────────────────────────────┐        │
│ │ Acción de Nulidad                 ▼ │        │
│ └─────────────────────────────────────┘        │
│                                                 │
│ Número de Radicado:                             │
│ ┌─────────────────────────────────────┐        │
│ │ Ej: 11001-33-31-001-2024-00123-00   │        │
│ └─────────────────────────────────────┘        │
│                                                 │
│ Despacho/Juzgado: *                             │
│ ┌─────────────────────────────────────┐        │
│ │ Tribunal Administrativo...          │        │
│ └─────────────────────────────────────┘        │
│                                                 │
│          [Cancelar]    [Siguiente →]           │
└─────────────────────────────────────────────────┘
```

**Campos:**
- ✅ Jurisdicción (obligatorio)
  - Contencioso Administrativo
  - Ordinaria
  - Laboral
  - Constitucional
- ✅ Medio de Control (obligatorio, dinámico según jurisdicción)
- ✅ Número de Radicado (opcional)
- ✅ Despacho/Juzgado (obligatorio)

---

#### **PASO 2: Partes del Proceso** 👥
```
┌─────────────────────────────────────────────────┐
│ 📋 Paso 2: Partes del Proceso                  │
├─────────────────────────────────────────────────┤
│                                                 │
│ Demandante: *                                   │
│ ┌─────────────────────────────────────┐        │
│ │ Nombre completo del demandante      │        │
│ └─────────────────────────────────────┘        │
│                                                 │
│ Demandado: *                                    │
│ ┌─────────────────────────────────────┐        │
│ │ ESAP - Rectoría Nacional            │        │
│ └─────────────────────────────────────┘        │
│ ⚠️ VALIDACIÓN: Debe incluir "ESAP"             │
│                                                 │
│ Apoderado/Abogado Asignado: *                   │
│ ┌─────────────────────────────────────┐        │
│ │ Dr. Juan Pérez                      │        │
│ └─────────────────────────────────────┘        │
│                                                 │
│      [← Anterior]    [Siguiente →]             │
└─────────────────────────────────────────────────┘
```

**Campos:**
- ✅ Demandante (obligatorio)
- ✅ Demandado (obligatorio, debe incluir "ESAP")
- ✅ Apoderado/Abogado (obligatorio)

**Validaciones:**
- 🔍 Detecta duplicados usando algoritmo de Levenshtein
- ⚠️ Alerta si el demandado no incluye "ESAP"

---

#### **PASO 3: Fechas y Plazos** 📅
```
┌─────────────────────────────────────────────────┐
│ 📋 Paso 3: Fechas y Plazos                     │
├─────────────────────────────────────────────────┤
│                                                 │
│ Fecha de Notificación: *                        │
│ ┌─────────────────────────────────────┐        │
│ │ 📅 18/12/2024                       │        │
│ └─────────────────────────────────────┘        │
│                                                 │
│ Fecha de la Demanda:                            │
│ ┌─────────────────────────────────────┐        │
│ │ 📅 15/12/2024                       │        │
│ └─────────────────────────────────────┘        │
│ ⚠️ VALIDACIÓN: No puede ser posterior           │
│                                                 │
│ Plazo en Días Hábiles: *                        │
│ ┌─────────────────────────────────────┐        │
│ │ 30 días                             │        │
│ └─────────────────────────────────────┘        │
│ ℹ️ Plazo por defecto: 30 días hábiles           │
│                                                 │
│ ✅ Fecha de Vencimiento Calculada:              │
│    📍 28 de Enero de 2025                       │
│    ⏱️  Días restantes: 41 días hábiles          │
│    🟢 Estado: VERDE (a tiempo)                  │
│                                                 │
│      [← Anterior]    [Siguiente →]             │
└─────────────────────────────────────────────────┘
```

**Campos:**
- ✅ Fecha de Notificación (obligatorio)
- ✅ Fecha de la Demanda (opcional)
- ✅ Plazo en días hábiles (obligatorio, 30 por defecto)

**Cálculos Automáticos:**
- 🤖 Fecha de vencimiento (excluye festivos colombianos)
- 🤖 Días hábiles restantes
- 🤖 Color de alerta (VERDE/AMARILLO/ROJO/VENCIDO)

**Validaciones:**
- ✅ Fecha de notificación no futura
- ✅ Fecha de demanda coherente con notificación
- ✅ Plazo válido según jurisdicción

---

#### **PASO 4: Detalles Adicionales** 📝
```
┌─────────────────────────────────────────────────┐
│ 📋 Paso 4: Detalles Adicionales                │
├─────────────────────────────────────────────────┤
│                                                 │
│ Cuantía:                                        │
│ ┌─────────────────────────────────────┐        │
│ │ $ 50.000.000                        │        │
│ └─────────────────────────────────────┘        │
│ ℹ️ Deja en 0 si es indeterminada                │
│                                                 │
│ Pretensiones: *                                 │
│ ┌─────────────────────────────────────┐        │
│ │ Declarar la nulidad del acto...     │        │
│ │                                     │        │
│ │                                     │        │
│ └─────────────────────────────────────┘        │
│                                                 │
│ Hechos (resumen):                               │
│ ┌─────────────────────────────────────┐        │
│ │ El día 15 de noviembre de 2024...   │        │
│ │                                     │        │
│ │                                     │        │
│ └─────────────────────────────────────┘        │
│                                                 │
│      [← Anterior]    [✅ Guardar]               │
└─────────────────────────────────────────────────┘
```

**Campos:**
- ✅ Cuantía (opcional, 0 = indeterminada)
- ✅ Pretensiones (obligatorio)
- ✅ Hechos (opcional)

---

### **Paso 3: Guardado y Confirmación**

Al hacer click en **"Guardar"**, se ejecuta:

```typescript
const handleGuardarExpediente = (data: any) => {
  // 1. Generar ID único
  const año = new Date().getFullYear();
  const numero = (expedientes.length + 1).toString().padStart(5, '0');
  const nuevoId = `PJ-${año}-${numero}`; // Ej: PJ-2025-00006
  
  // 2. Crear objeto expediente
  const nuevoExpediente: Expediente = {
    id: nuevoId,
    jurisdiccion: data.jurisdiccion,
    demandante: data.demandante,
    demandado: data.demandado,
    juzgado: data.despacho,
    medioControl: data.medioControl,
    abogadoAsignado: data.apoderado,
    fechaNotificacion: new Date(data.fechaNotificacion),
    fechaDemanda: new Date(data.fechaDemanda),
    fechaVencimiento: new Date(data.fechaVencimiento),
    plazo: data.plazo,
    diasRestantes: data.diasRestantes,
    colorAlerta: data.colorAlerta,
    estado: 'ACTIVO',
    valorDemanda: data.cuantia,
    pretension: data.pretensiones,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  
  // 3. Agregar al inicio de la lista
  setExpedientes([nuevoExpediente, ...expedientes]);
  
  // 4. Mostrar toast de éxito
  addToast({
    type: 'success',
    title: '✅ Expediente creado',
    message: `Expediente ${nuevoId} creado exitosamente`,
  });
  
  // 5. Cerrar modal
  setMostrarFormulario(false);
};
```

---

## ✅ **VALIDACIONES IMPLEMENTADAS**

### **1. Demandado debe incluir "ESAP"**
```typescript
✅ VÁLIDO:   "ESAP - Rectoría Nacional"
✅ VÁLIDO:   "Escuela Superior de Administración Pública"
❌ INVÁLIDO: "Ministerio de Educación"
```

### **2. Detección de Duplicados** (Algoritmo de Levenshtein)
```typescript
// Si existe expediente similar
⚠️ ALERTA: "Ya existe un expediente similar:
  - PJ-2025-00001 (Juan Pérez Gómez vs ESAP)
  - Similitud: 85%
  ¿Deseas continuar?"
```

### **3. Validación de Fechas**
```typescript
❌ Fecha de notificación no puede ser futura
❌ Fecha de demanda no puede ser posterior a notificación
❌ Plazo debe estar entre 1 y 90 días
```

### **4. Cálculo de Días Hábiles**
```typescript
// Excluye:
- Sábados y domingos
- 18 festivos colombianos oficiales
- Ej: 1 de enero, 6 de enero, 19 de marzo, etc.

Resultado:
📅 Fecha notificación: 18/12/2024
⏰ Plazo: 30 días hábiles
📍 Vencimiento: 28/01/2025 (calculado)
```

---

## 🎨 **INTERFAZ VISUAL**

### **Botón "Nuevo Expediente":**
```
┌──────────────────────────┐
│  ➕ Nuevo Expediente     │  ← Botón azul corporativo
└──────────────────────────┘
```

### **Modal del Formulario:**
```
┌─────────────────────────────────────────────────────────────┐
│ ✕                                                            │
│ Crear Nuevo Expediente Judicial                             │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ ⚖️  →  👥  →  📅  →  📝                                      │
│ Paso 1   Paso 2   Paso 3   Paso 4                           │
│                                                              │
│ [Contenido del formulario según paso activo]                │
│                                                              │
│                                                              │
│                              [Cancelar]  [Siguiente/Guardar] │
└─────────────────────────────────────────────────────────────┘
```

### **Notificación de Éxito:**
```
┌─────────────────────────────────────┐
│ ✅ Expediente creado                │
│ Expediente PJ-2025-00006            │
│ creado exitosamente                 │
└─────────────────────────────────────┘
```

---

## 📊 **RESULTADO EN LA TABLA**

Después de crear, el expediente aparece **al inicio de la tabla**:

```
┌──────────┬────────────────┬───────────────────────┬──────────────┬─────────────────┬───────────────┬──────────────┬──────────┐
│ Alerta   │ ID / Expediente│ Demandante vs Demandado│ Jurisdicción │ Abogado         │ Días Restantes│ Vencimiento  │ Acciones │
├──────────┼────────────────┼───────────────────────┼──────────────┼─────────────────┼───────────────┼──────────────┼──────────┤
│ 🟢 VERDE │ PJ-2025-00006  │ María López           │ CONTENCIOSO  │ Dr. Juan Pérez  │ 30 días       │ 28 ene 2025  │ 👁️       │
│          │ Acción Nulidad │ vs ESAP - Rectoría    │              │                 │               │              │          │
└──────────┴────────────────┴───────────────────────┴──────────────┴─────────────────┴───────────────┴──────────────┴──────────┘
```

---

## 🔧 **CAMPOS DEL FORMULARIO**

| Campo | Tipo | Obligatorio | Validación | Valor Defecto |
|-------|------|-------------|------------|---------------|
| **Jurisdicción** | Select | ✅ Sí | 4 opciones | Contencioso |
| **Medio de Control** | Select | ✅ Sí | Dinámico | Acción de Nulidad |
| **Número de Radicado** | Text | ❌ No | - | Auto-generado |
| **Despacho/Juzgado** | Text | ✅ Sí | Min 5 chars | - |
| **Demandante** | Text | ✅ Sí | Min 3 chars | - |
| **Demandado** | Text | ✅ Sí | Incluye "ESAP" | ESAP |
| **Apoderado** | Text | ✅ Sí | Min 3 chars | - |
| **Fecha Notificación** | Date | ✅ Sí | No futura | Hoy |
| **Fecha Demanda** | Date | ❌ No | Coherente | - |
| **Plazo (días)** | Number | ✅ Sí | 1-90 | 30 |
| **Cuantía** | Currency | ❌ No | >= 0 | 0 |
| **Pretensiones** | Textarea | ✅ Sí | Min 10 chars | - |
| **Hechos** | Textarea | ❌ No | - | - |

---

## 🚀 **CARACTERÍSTICAS AVANZADAS**

### **1. Cálculo Automático de Vencimientos**
```typescript
// Utilidades implementadas en /utils/diasHabiles.ts
import { 
  calcularFechaVencimiento, 
  calcularDiasHabilesRestantes,
  obtenerInfoCalculoVencimiento 
} from '../../../utils/diasHabiles';

// Ejemplo:
const vencimiento = calcularFechaVencimiento(
  new Date('2024-12-18'), // Fecha notificación
  30                       // Plazo en días hábiles
);
// Resultado: 2025-01-28 (excluye fines de semana y festivos)
```

### **2. Sistema de Alertas Automático**
```typescript
// Se calcula automáticamente al guardar:
const diasRestantes = calcularDiasHabilesRestantes(
  new Date(), 
  vencimiento
);

const colorAlerta = 
  diasRestantes < 0 ? 'VENCIDO' :
  diasRestantes < 5 ? 'ROJO' :
  diasRestantes < 10 ? 'AMARILLO' : 'VERDE';
```

### **3. Generación de ID Único**
```typescript
// Formato: PJ-YYYY-NNNNN
const nuevoId = `PJ-${año}-${numero.padStart(5, '0')}`;

// Ejemplos:
PJ-2025-00001
PJ-2025-00002
PJ-2025-00156
```

---

## 📝 **EJEMPLO COMPLETO DE USO**

### **Escenario: Crear Acción de Tutela**

1. **Click en "Nuevo Expediente"**
   - Modal se abre en Paso 1

2. **Paso 1 - Información Básica:**
   - Jurisdicción: `CONSTITUCIONAL`
   - Medio de Control: `Acción de Tutela`
   - Número Radicado: `(vacío, auto-genera)`
   - Despacho: `Juzgado 25 Civil Municipal de Bogotá`
   - Click "Siguiente"

3. **Paso 2 - Partes:**
   - Demandante: `Juan Pérez Gómez`
   - Demandado: `ESAP`
   - Apoderado: `Dr. Luis Ramírez`
   - Click "Siguiente"

4. **Paso 3 - Fechas:**
   - Fecha Notificación: `10/12/2024`
   - Fecha Demanda: `08/12/2024`
   - Plazo: `10 días` (Tutela)
   - **Sistema calcula:**
     - Vencimiento: `20/12/2024`
     - Días restantes: `2`
     - Alerta: `🔴 ROJO`
   - Click "Siguiente"

5. **Paso 4 - Detalles:**
   - Cuantía: `0` (indeterminada)
   - Pretensiones: `Ordene a la ESAP readmitir al estudiante...`
   - Hechos: `(resumen del caso)`
   - Click "Guardar"

6. **Resultado:**
   - ✅ Toast: "Expediente PJ-2025-00006 creado exitosamente"
   - ✅ Modal se cierra
   - ✅ Expediente aparece en la tabla (primera fila)
   - ✅ Estadísticas se actualizan (Total +1, Críticos +1)

---

## 🎯 **ESTADOS DEL FORMULARIO**

### **Progreso Visual:**
```
⚖️ ━━━  👥 ━━━  📅 ━━━  📝
   ACTIVO   PENDIENTE  PENDIENTE  PENDIENTE

↓ Siguiente paso ↓

⚖️ ━━━  👥 ━━━  📅 ━━━  📝
   ✅      ACTIVO   PENDIENTE  PENDIENTE

↓ Siguiente paso ↓

⚖️ ━━━  👥 ━━━  📅 ━━━  📝
   ✅      ✅      ACTIVO   PENDIENTE

↓ Guardar ↓

⚖️ ━━━  👥 ━━━  📅 ━━━  📝
   ✅      ✅      ✅      ✅
```

---

## 🔐 **SEGURIDAD Y VALIDACIÓN**

### **Validaciones del Frontend:**
✅ Campos obligatorios no vacíos  
✅ Formatos de fecha válidos  
✅ Rangos de números correctos  
✅ Detección de duplicados  
✅ Coherencia entre fechas

### **Validaciones de Negocio:**
✅ Demandado incluye "ESAP"  
✅ Plazo acorde a jurisdicción  
✅ Fecha de notificación no futura  
✅ Fecha de demanda coherente  
✅ Cálculo correcto de días hábiles

---

## 📄 **ARCHIVOS RELACIONADOS**

```
/components/esap/gestion-legal/
├── ModuloDefensaJudicial.tsx           ← Componente principal
├── FormularioExpedienteCompleto.tsx    ← Formulario 4 pasos
└── design-system/
    ├── Button.tsx                      ← Botón "Nuevo Expediente"
    ├── Modal.tsx                       ← Modal del formulario
    └── Toast.tsx                       ← Notificación de éxito

/utils/
├── diasHabiles.ts                      ← Cálculo de vencimientos
└── validaciones.ts                     ← Validaciones de negocio
```

---

## 🎓 **CONCLUSIÓN**

La funcionalidad del botón **"Nuevo Expediente"** está **completamente implementada** con:

✅ **Formulario de 4 pasos** intuitivo y guiado  
✅ **Validaciones completas** (frontend + negocio)  
✅ **Cálculo automático** de vencimientos con festivos colombianos  
✅ **Sistema de alertas** automático (VERDE/AMARILLO/ROJO/VENCIDO)  
✅ **Generación de IDs** únicos  
✅ **Detección de duplicados** con algoritmo de Levenshtein  
✅ **Notificaciones** visuales de éxito  
✅ **Actualización en tiempo real** de estadísticas y tabla

### **Resultado:**
El usuario puede crear nuevos expedientes judiciales de forma **rápida, segura y guiada**, con todas las validaciones y cálculos automáticos necesarios para el correcto funcionamiento del Sistema Integral de Gestión Legal (SIGL).

---

**Generado:** 18 de Diciembre de 2025  
**Por:** Documentación Técnica - SIGL  
**Proyecto:** Backoffice Administrativo ESAP  
**Módulo:** MOD-01 - Defensa Judicial
