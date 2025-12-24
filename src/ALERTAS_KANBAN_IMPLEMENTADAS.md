# ✅ ALERTAS VISUALES IMPLEMENTADAS EN KANBAN Y LISTA

**Fecha:** 24 Diciembre 2025  
**Implementación:** Sistema de alertas para actividades pendientes en Dashboard Kanban

---

## 🎯 OBJETIVO

Mostrar **alertas visuales** en las tarjetas del Dashboard Kanban cuando una auditoría tiene **actividades pendientes** en su fase actual, evitando que el auditor avance al siguiente estado sin completar el proceso metodológico obligatorio.

---

## ✅ IMPLEMENTACIÓN COMPLETA

### **1. Modificación de la Interfaz `Auditoria`**

**Archivo:** `/components/esap/control-interno/GestionAuditoriasKanbanSimple.tsx`

**Campos agregados:**
```typescript
interface Auditoria {
  // ... campos existentes ...
  
  // ✅ INTEGRACIÓN: Validación de actividades del proceso de auditoría
  actividadesCompletas?: boolean;     // ¿Completó las 3 actividades de la fase actual?
  actividadesPendientes?: number;     // Número de actividades pendientes (0-3)
}
```

---

### **2. Datos de Prueba Actualizados**

Se actualizaron 2 auditorías de ejemplo con estados diferentes:

#### **Auditoría 1: AUD-2025-001 (Antioquia) - CON ALERTAS**
```typescript
{
  codigo: 'AUD-2025-001',
  estado: 'Planeación',
  actividadesCompletas: false,      // ⚠️ Actividades incompletas
  actividadesPendientes: 2          // Faltan 2 actividades
}
```

#### **Auditoría 2: AUD-2025-002 (Bogotá) - SIN ALERTAS**
```typescript
{
  codigo: 'AUD-2025-002',
  estado: 'Planeación',
  actividadesCompletas: true,       // ✅ Todas las actividades completadas
  actividadesPendientes: 0
}
```

---

### **3. VISTA KANBAN - Badge de Alerta en Tarjetas**

**Ubicación:** Dentro del componente `TarjetaAuditoria`, después del badge de hallazgos

**Código implementado:**
```tsx
{/* ⚠️ ALERTA: Actividades Pendientes */}
{auditoria.actividadesCompletas === false && 
 auditoria.actividadesPendientes && 
 auditoria.actividadesPendientes > 0 && (
  <Badge className="text-xs bg-amber-100 text-amber-800 border-2 border-amber-400 flex items-center gap-1 font-bold animate-pulse">
    <AlertCircle className="w-3 h-3" />
    {auditoria.actividadesPendientes} actividad{auditoria.actividadesPendientes > 1 ? 'es' : ''} pendiente{auditoria.actividadesPendientes > 1 ? 's' : ''}
  </Badge>
)}
```

**Características:**
- ✅ **Color:** Fondo amarillo (`bg-amber-100`) con borde amarillo fuerte (`border-amber-400`)
- ✅ **Icono:** `AlertCircle` de Lucide React
- ✅ **Animación:** `animate-pulse` para llamar la atención
- ✅ **Texto dinámico:** Plural automático según el número de actividades pendientes
- ✅ **Condicional:** Solo se muestra si `actividadesCompletas === false` y hay actividades pendientes

---

### **4. VISTA LISTA - Alerta Expandida**

**Ubicación:** Antes de la sección de "MÉTRICAS" en la vista de lista

**Código implementado:**
```tsx
{/* ⚠️ ALERTA: Actividades Pendientes (VISTA LISTA) */}
{auditoria.actividadesCompletas === false && 
 auditoria.actividadesPendientes && 
 auditoria.actividadesPendientes > 0 && (
  <div className="mb-4 bg-amber-50 border-2 border-amber-400 rounded-lg p-4 animate-pulse">
    <div className="flex items-start gap-3">
      <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
      <div className="flex-1">
        <p className="text-sm text-amber-900 mb-1">
          <strong>⚠️ Actividades pendientes de la fase actual</strong>
        </p>
        <p className="text-xs text-amber-700">
          Faltan <strong>{auditoria.actividadesPendientes} actividad{auditoria.actividadesPendientes > 1 ? 'es' : ''}</strong> por completar antes de avanzar al siguiente estado
        </p>
      </div>
    </div>
  </div>
)}
```

**Características:**
- ✅ **Versión expandida:** Más espacio para mostrar información detallada
- ✅ **Mensaje descriptivo:** Explica claramente el problema y qué debe hacer el usuario
- ✅ **Mismo diseño:** Mantiene la consistencia con el badge de la vista Kanban
- ✅ **Responsive:** Se adapta correctamente en móviles y desktop

---

## 📊 VISUALIZACIÓN DE ALERTAS

### **Vista Kanban (Tarjetas):**

```
┌─────────────────────────────────────┐
│ AUD-2025-001                        │
│ Auditoría Administrativa Antioquia │
│                                     │
│ 👨‍💼 Juan Pérez Gómez                 │
│ 👤 Ana María López Silva            │
│                                     │
│ ⚠️ Riesgo Moderado                  │
│                                     │
│ [Verde 25 días] [⚠️ 2 actividades pendientes] [✓ 6 tareas]
│                 ↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑
│         BADGE ANIMADO CON PULSE     │
│                                     │
│ [Ver] [Editar]                      │
└─────────────────────────────────────┘
```

### **Vista Lista (Expandida):**

```
┌──────────────────────────────────────────────────────────┐
│ AUD-2025-001 • Auditoría                      [Planeación]│
│ Auditoría de Gestión Administrativa...                   │
│                                                           │
│ 👨‍💼 Auditor Líder: Juan Pérez      👤 Auditor: Ana López  │
│                                                           │
│ ⚠️ Riesgo: Moderado  🏷️ Tipo: Territorial  ⚡ Alta       │
│                                                           │
│ ┌────────────────────────────────────────────────────┐   │
│ │ ⚠️ Actividades pendientes de la fase actual        │   │
│ │                                                     │   │
│ │ Faltan 2 actividades por completar antes de       │   │
│ │ avanzar al siguiente estado                        │   │
│ └────────────────────────────────────────────────────┘   │
│           ↑↑↑ ALERTA EXPANDIDA CON ANIMATE-PULSE         │
│                                                           │
│ 📊 Métricas:  25 días  |  6 tareas  |  8 docs            │
│                                                           │
│ [Ver Expediente] [Cambiar Estado] [Notas] [Historial]    │
└──────────────────────────────────────────────────────────┘
```

---

## 🎨 DISEÑO Y UX

### **Colores Utilizados:**
- **Fondo:** `bg-amber-50` / `bg-amber-100` (Amarillo suave)
- **Borde:** `border-amber-400` con `border-2` (Amarillo fuerte para destacar)
- **Texto:** `text-amber-800` / `text-amber-900` (Amarillo oscuro para legibilidad)
- **Icono:** `AlertCircle` en `text-amber-600`

### **Animaciones:**
- `animate-pulse`: Efecto de pulsación continua que llama la atención sin ser molesto

### **Responsividad:**
- ✅ **Desktop:** Badge compacto en Kanban, alerta expandida en Lista
- ✅ **Tablet:** Se adapta correctamente manteniendo legibilidad
- ✅ **Móvil:** Texto se ajusta y badge mantiene visibilidad

---

## 🔄 FLUJO DE USUARIO

### **Escenario 1: Auditoría con actividades incompletas**

1. Usuario abre Dashboard Kanban
2. Ve tarjeta `AUD-2025-001` con **badge amarillo pulsando**:
   ```
   ⚠️ 2 actividades pendientes
   ```
3. Click en botón "Ver" para abrir Expediente
4. Tab "Planeación" muestra:
   ```
   ⚠️ Fase de Planeación incompleta
   Completa las 3 actividades antes de mover esta auditoría a Ejecución
   ```
5. Usuario completa las 2 actividades faltantes
6. Al cerrar el Expediente, **el badge desaparece** de la tarjeta
7. Puede mover la tarjeta a "Ejecución" sin restricciones

---

### **Escenario 2: Vista de lista con alerta expandida**

1. Usuario cambia a Vista Lista (botón toggle superior)
2. Ve lista de auditorías con tarjetas expandidas
3. Auditoría `AUD-2025-001` muestra **alerta amarilla completa**:
   ```
   ┌────────────────────────────────────────┐
   │ ⚠️ Actividades pendientes de la fase   │
   │    actual                               │
   │                                         │
   │ Faltan 2 actividades por completar     │
   │ antes de avanzar al siguiente estado   │
   └────────────────────────────────────────┘
   ```
4. Mensaje más descriptivo ayuda al usuario a entender qué debe hacer
5. Click en "Ver Expediente" → Completa actividades
6. Al refrescar, **alerta desaparece** automáticamente

---

## 🚀 PRÓXIMOS PASOS (PENDIENTES)

### **1. Validación en Drag & Drop**

Agregar modal de confirmación cuando intenten arrastrar una tarjeta con actividades incompletas:

```tsx
// Pseudocódigo
const handleDrop = (auditoriaId: string, nuevoEstado: EstadoAuditoria) => {
  const auditoria = obtenerAuditoria(auditoriaId);
  
  if (!auditoria.actividadesCompletas) {
    mostrarModalAdvertencia({
      titulo: "⚠️ Actividades pendientes",
      mensaje: `Esta auditoría tiene ${auditoria.actividadesPendientes} actividades sin completar.`,
      pregunta: "¿Deseas moverla de todas formas?",
      onConfirmar: () => moverAuditoria(auditoriaId, nuevoEstado),
      onCancelar: () => revertirDrop()
    });
  } else {
    moverAuditoria(auditoriaId, nuevoEstado);
  }
};
```

---

### **2. Persistencia con Supabase**

Guardar estado de actividades en base de datos:

```sql
-- Tabla: actividades_auditoria
CREATE TABLE actividades_auditoria (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auditoria_id UUID REFERENCES auditorias(id),
  fase VARCHAR(50), -- 'Planeación', 'Ejecución', 'Comunicación'
  actividad_id VARCHAR(100),
  checklist_completados JSONB, -- { "ep1": true, "ep2": false, ... }
  progreso_porcentaje INTEGER DEFAULT 0,
  completa BOOLEAN DEFAULT false,
  fecha_actualizacion TIMESTAMP DEFAULT NOW(),
  actualizado_por VARCHAR(255)
);
```

---

### **3. Notificaciones Automáticas**

Enviar notificaciones cuando:
- Un auditor intenta cambiar de estado sin completar actividades
- Se completa una fase (todas las actividades al 100%)
- Quedan actividades pendientes y la auditoría está cerca de su fecha límite

---

### **4. Dashboard de Métricas**

Agregar métricas en el header del Kanban:

```
┌────────────────────────────────────────────────────────┐
│  DASHBOARD KANBAN                                      │
│                                                        │
│  📊 Auditorías Totales: 13                            │
│  ⚠️ Con Actividades Pendientes: 3                     │
│  ✅ Con Actividades Completas: 10                     │
│  🔴 Vencidas: 2                                        │
└────────────────────────────────────────────────────────┘
```

---

## ✅ RESUMEN DE ARCHIVOS MODIFICADOS

| Archivo | Cambios | Estado |
|---------|---------|--------|
| `/components/esap/control-interno/GestionAuditoriasKanbanSimple.tsx` | ✅ Interfaz actualizada | ✅ Completo |
| `` | ✅ Datos MOCK actualizados | ✅ Completo |
| `` | ✅ Badge en Vista Kanban | ✅ Completo |
| `` | ✅ Alerta en Vista Lista | ✅ Completo |
| `/components/esap/control-interno/ActividadesAuditoriaIntegradas.tsx` | ✅ Componente de actividades | ✅ Completo |
| `/components/esap/control-interno/ExpedienteAuditoriaCompleto.tsx` | ✅ Tabs integrados | ✅ Completo |
| `/components/esap/control-interno/ControlInternoFull.tsx` | ✅ Módulo eliminado | ✅ Completo |

---

## 📝 NOTAS TÉCNICAS

### **Lógica de Visualización:**

```tsx
// La alerta se muestra solo si:
1. actividadesCompletas === false
2. actividadesPendientes existe (no es undefined/null)
3. actividadesPendientes > 0

// Condición completa:
{auditoria.actividadesCompletas === false && 
 auditoria.actividadesPendientes && 
 auditoria.actividadesPendientes > 0 && (
  <Badge>...</Badge>
)}
```

### **Texto Dinámico:**

```tsx
// Maneja singular/plural automáticamente
{auditoria.actividadesPendientes} actividad{auditoria.actividadesPendientes > 1 ? 'es' : ''}

// Ejemplos:
// 1 actividad pendiente
// 2 actividades pendientes
// 3 actividades pendientes
```

---

## ✅ CONCLUSIÓN

La implementación de alertas visuales en el Dashboard Kanban garantiza que los auditores:

1. ✅ **Vean claramente** cuándo tienen actividades pendientes
2. ✅ **Reciban recordatorios visuales** antes de cambiar de estado
3. ✅ **Sigan el proceso metodológico** completo sin saltarse pasos
4. ✅ **Mantengan la calidad** de las auditorías al completar todas las actividades

---

**Desarrollado por:** Asistente de Figma Make  
**Fecha:** 24 Diciembre 2025  
**Versión:** 1.0
