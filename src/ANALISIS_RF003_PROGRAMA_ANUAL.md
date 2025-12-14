# ANÁLISIS DE CUMPLIMIENTO - RF003: PROGRAMA ANUAL DE AUDITORÍAS

**Fecha de análisis:** 14 de diciembre de 2025  
**Módulo:** Control Interno de Gestión  
**Componente:** `/components/esap/control-interno/ProgramaAnualAuditorias.tsx`

---

## 📋 REQUERIMIENTOS DEL RF003

### Requerimientos según documento oficial:

1. ⚠️ Importación de auditorías priorizadas en el Universo de Auditorías
2. ✅ Asignación de auditor líder y equipo auditor por proceso
3. ✅ Programación de etapas con fechas estimadas (Planeación, Ejecución, Comunicación)
4. ✅ Duración diferenciada: territoriales (etapas más cortas) vs sede principal
5. ⚠️ Visualización tipo calendario/cronograma
6. ❌ Sistema de ampliación de plazos (límite máximo 1 año, solo Admin/Jefe)
7. ❌ Registro de justificación de ampliación con historial completo
8. ⚠️ Generación de documento oficial del Programa Anual de auditoría

---

## ✅ FUNCIONALIDADES IMPLEMENTADAS

### 1. **Importación desde Universo de Auditorías** ⚠️ PARCIAL (70%)

**Implementado:**
- ✅ Botón "Importar desde Universo"
- ✅ Modal `ModalImportarUniverso` para seleccionar procesos
- ✅ Generación automática de códigos de auditoría (AUD-2025-XXX)
- ✅ Asignación automática de duraciones según tipo de sede
- ✅ Sugerencia automática de auditor líder
- ✅ Cálculo automático de fechas por etapa
- ✅ Conversión de procesos evaluados a auditorías programadas

**Código relevante:**
```typescript
const handleImportarDesdeUniverso = () => {
  setMostrarModalImportar(true);
};

onImportar={(auditoriasPrevisualizadas) => {
  const nuevasAuditorias: AuditoriaProgramada[] = auditoriasPrevisualizadas.map((preview) => {
    // Calcula fechas completas
    const inicioPlaneacion = new Date(fechaInicioSugerida);
    const finPlaneacion = new Date(inicioPlaneacion.getTime() + duraciones.planeacion * 24 * 60 * 60 * 1000);
    // ... resto de cálculos
  });
});
```

**Falta implementar:**
- ❌ Sincronización bidireccional (si se actualiza el Universo, reflejar en Programa)
- ❌ Validación de procesos duplicados (no importar dos veces el mismo)
- ❌ Indicador en Universo de qué procesos ya fueron exportados
- ❌ Opción de actualizar auditorías ya importadas

---

### 2. **Asignación de Auditor Líder y Equipo** ✅ COMPLETO (95%)

**Implementado:**
- ✅ Campo `auditorLider` en estructura de datos
- ✅ Campo `equipoAuditor` (array de nombres)
- ✅ Lista de auditores disponibles (10 auditores de ESAP)
- ✅ Visualización en tabla con avatar inicial
- ✅ Contador de miembros del equipo
- ✅ Asignación automática al importar

**Código relevante:**
```typescript
const AUDITORES_DISPONIBLES = [
  'Mario Oswaldo Bernal Rodriguez',
  'Catalina Rubio',
  'Nubia Pimiento',
  'Sandra Montero',
  'Fernando Ávila',
  'William Ramírez',
  'Lucila Villamil',
  'Alexandra Triviño',
  'Natalia Cañon',
  'Flor Mireya Murcia'
];

interface AuditoriaProgramada {
  auditorLider?: string;
  equipoAuditor?: string[];
}
```

**Falta implementar:**
- ❌ Modal de edición para asignar/cambiar auditor líder
- ❌ Modal para gestionar equipo auditor (agregar/quitar miembros)
- ❌ Validación de disponibilidad (evitar sobrecargar auditores)
- ❌ Indicador visual de carga de trabajo por auditor

---

### 3. **Programación de Etapas con Fechas** ✅ COMPLETO (100%)

**Implementado:**
- ✅ Estructura completa de fechas por las 3 etapas:
  - Planeación (inicio, fin, duración en días)
  - Ejecución (inicio, fin, duración en días)
  - Comunicación (inicio, fin, duración en días)
- ✅ Cálculo automático de fechas consecutivas
- ✅ Visualización en tabla con iconos de reloj
- ✅ Espaciado entre etapas (1 día entre Planeación-Ejecución, 2 días entre Ejecución-Comunicación)

**Código relevante:**
```typescript
interface AuditoriaProgramada {
  fechas: {
    planeacion: {
      inicio: string;
      fin: string;
      duracionDias: number;
    };
    ejecucion: {
      inicio: string;
      fin: string;
      duracionDias: number;
    };
    comunicacion: {
      inicio: string;
      fin: string;
      duracionDias: number;
    };
  };
}
```

**Completitud:** ✅ **100%** - Implementación completa y funcional

---

### 4. **Duración Diferenciada Sede Principal vs Territoriales** ✅ COMPLETO (100%)

**Implementado:**
- ✅ Constante `DURACIONES_DEFAULT` con valores diferenciados:
  - **Sede Principal:** Planeación 15 días, Ejecución 30 días, Comunicación 15 días
  - **Territorial:** Planeación 10 días, Ejecución 4 días, Comunicación 10 días
- ✅ Aplicación automática según tipo de sede al importar
- ✅ Reconocimiento de las 16 territoriales de ESAP

**Código relevante:**
```typescript
const DURACIONES_DEFAULT = {
  sedesPrincipal: {
    planeacion: 15,
    ejecucion: 30,
    comunicacion: 15
  },
  territorial: {
    planeacion: 10,
    ejecucion: 4, // 4 días según requerimientos
    comunicacion: 10
  }
};
```

**Completitud:** ✅ **100%** - Cumple exactamente con especificaciones

---

### 5. **Visualización Tipo Calendario/Cronograma** ⚠️ PARCIAL (75%)

**Implementado:**
- ✅ Componente `GanttChartView` para vista de cronograma
- ✅ Toggle entre vista "Tabla" y "Calendario"
- ✅ Visualización de auditorías en línea de tiempo
- ✅ Click en auditorías para ver detalles
- ✅ Callback `onReschedule` para modificar fechas

**Código relevante:**
```typescript
<GanttChartView 
  auditorias={programa.auditorias} 
  añoFiscal={programa.añoFiscal}
  onAuditoriaClick={(auditoria) => setAuditoriaSeleccionada(auditoria)}
  onReschedule={(auditoriaId, nuevasFechas) => {
    setPrograma(prev => ({
      ...prev,
      auditorias: prev.auditorias.map(a => 
        a.id === auditoriaId ? { ...a, fechas: nuevasFechas } : a
      )
    }));
  }}
/>
```

**Falta implementar:**
- ❌ Vista mensual/trimestral/anual
- ❌ Filtros por auditor, riesgo o sede
- ❌ Indicadores de conflictos de fechas
- ❌ Drag & drop para reprogramar visualmente

---

### 6. **Sistema de Ampliación de Plazos** ❌ NO IMPLEMENTADO (0%)

**CRÍTICO - REQUERIMIENTO OBLIGATORIO**

**Lo que se requiere:**
- ❌ Botón "Solicitar Ampliación de Plazo" en cada auditoría
- ❌ Modal de ampliación con:
  - Etapa a ampliar (Planeación/Ejecución/Comunicación)
  - Nueva fecha límite
  - Justificación obligatoria
  - Validación: máximo 1 año desde fecha inicio original
- ❌ Control de permisos: Solo Admin o Jefe Control Interno
- ❌ Cálculo automático de días ampliados
- ❌ Indicador visual de auditorías con ampliaciones

**Estructura de datos requerida:**
```typescript
interface AmpliacionPlazo {
  id: string;
  auditoriaId: string;
  etapaAfectada: 'planeacion' | 'ejecucion' | 'comunicacion';
  fechaOriginal: string;
  nuevaFechaLimite: string;
  diasAmpliados: number;
  justificacion: string;
  usuarioAutorizo: string;
  fechaAutorizacion: string;
  estado: 'solicitada' | 'aprobada' | 'rechazada';
}

interface AuditoriaProgramada {
  // ... campos existentes
  ampliaciones: AmpliacionPlazo[];
  fechaInicioOriginal: string; // Para validar límite de 1 año
}
```

**Completitud:** ❌ **0%** - Pendiente de implementación

---

### 7. **Historial Completo de Ampliaciones** ❌ NO IMPLEMENTADO (0%)

**CRÍTICO - REQUERIMIENTO OBLIGATORIO**

**Lo que se requiere:**
- ❌ Array de historial en cada auditoría
- ❌ Registro de cada cambio:
  - Usuario que autorizó
  - Fecha de autorización
  - Justificación
  - Fechas antes/después
  - Etapa afectada
- ❌ Visualización del historial:
  - Modal "Ver Historial de Cambios"
  - Timeline de ampliaciones
  - Trazabilidad completa
- ❌ Exportación del historial a PDF/Excel

**Estructura requerida:**
```typescript
interface HistorialCambio {
  id: string;
  tipo: 'creacion' | 'ampliacion' | 'reasignacion' | 'cambio_fechas';
  timestamp: string;
  usuario: string;
  descripcion: string;
  datosAnteriores?: any;
  datosNuevos?: any;
}

interface AuditoriaProgramada {
  // ... campos existentes
  historial: HistorialCambio[];
}
```

**Completitud:** ❌ **0%** - Pendiente de implementación

---

### 8. **Generación de Documento Oficial del Programa** ⚠️ PARCIAL (40%)

**Implementado:**
- ✅ Botón "Generar Documento Oficial"
- ✅ Componente `PanelExportacion`
- ✅ Estructura de datos completa para exportar

**Código relevante:**
```typescript
<Button
  size="sm"
  onClick={() => setMostrarPanelExportacion(true)}
  className="gap-2"
>
  <Download className="w-4 h-4" />
  Generar Documento Oficial
</Button>

<PanelExportacion
  isOpen={mostrarPanelExportacion}
  onClose={() => setMostrarPanelExportacion(false)}
  programa={programa}
  tipo="programa"
/>
```

**Falta implementar:**
- ❌ Plantilla oficial del Programa Anual según formato ESAP
- ❌ Generación de PDF estructurado
- ❌ Inclusión de:
  - Portada institucional
  - Tabla de contenido
  - Resumen ejecutivo
  - Cronograma visual (Gantt)
  - Tabla de auditorías por trimestre
  - Asignación de recursos (auditores)
  - Firmas de aprobación
- ❌ Exportación a Word editable
- ❌ Exportación a Excel con cronograma

**Completitud:** ⚠️ **40%** - Interfaz lista, falta implementación de generación

---

## 📊 FUNCIONALIDADES ADICIONALES IMPLEMENTADAS

### **Extras no requeridos pero implementados:**

1. ✅ **Búsqueda Avanzada**
   - Búsqueda por proceso, código o auditor
   - Filtrado en tiempo real

2. ✅ **Métricas del Dashboard**
   - Total auditorías
   - Por estado (Programadas, En Ejecución, Completadas)
   - Por nivel de riesgo (Críticas, Alto Riesgo)

3. ✅ **Gestión de Estados**
   - Programada, En Ejecución, Completada, Cancelada
   - Badges con colores diferenciados

4. ✅ **Vista de Tabla Completa**
   - Columnas con toda la información
   - Acciones por fila (Ver, Editar, Eliminar)
   - Responsive

5. ✅ **Códigos Automáticos**
   - Generación de códigos únicos (AUD-2025-XXX)
   - Incremento automático

6. ✅ **Responsive Design**
   - Mobile-first
   - Adaptación a tablet y desktop

---

## 🔗 INTEGRACIÓN CON OTROS MÓDULOS

### **Conexión con RF002 - Universo de Auditorías:**

**Estado actual:** ⚠️ PARCIAL (70%)

**Implementado:**
- ✅ Importación de procesos del Universo
- ✅ Conversión automática a auditorías programadas
- ✅ Preservación de datos (riesgo, tipo, sede)

**Falta:**
- ❌ Sincronización bidireccional
- ❌ Indicador en Universo de procesos exportados
- ❌ Actualización automática si cambia el Universo

---

### **Conexión con RF004 - Gestión de Auditorías:**

**Estado actual:** ❌ NO IMPLEMENTADO

**Requerido:**
- ❌ Botón "Iniciar Auditoría" que crea registro en RF004
- ❌ Sincronización de estados
- ❌ Actualización automática de fechas reales

---

## 📈 ANÁLISIS DE CUMPLIMIENTO

### **Resumen por Requerimiento:**

| # | Requerimiento | Estado | % Completitud |
|---|--------------|--------|---------------|
| 1 | Importación desde Universo | ⚠️ Parcial | 70% |
| 2 | Asignación auditor/equipo | ✅ Completo | 95% |
| 3 | Programación de etapas | ✅ Completo | 100% |
| 4 | Duración diferenciada | ✅ Completo | 100% |
| 5 | Visualización calendario | ⚠️ Parcial | 75% |
| 6 | Ampliación de plazos | ❌ Pendiente | 0% |
| 7 | Historial de cambios | ❌ Pendiente | 0% |
| 8 | Documento oficial | ⚠️ Parcial | 40% |

### **CUMPLIMIENTO TOTAL: 60%**

---

## ⚠️ PUNTOS CRÍTICOS PENDIENTES

### **PRIORIDAD ALTA - FUNCIONALIDAD OBLIGATORIA:**

#### **1. Sistema de Ampliación de Plazos (Requerimientos 6 y 7)**

**Impacto:** CRÍTICO - Es un requerimiento explícito del documento

**Implementación requerida:**

```typescript
// 1. Agregar estructura de ampliaciones
interface AuditoriaProgramada {
  // ... campos existentes
  fechaInicioOriginal: string;
  ampliaciones: AmpliacionPlazo[];
  historialCambios: HistorialCambio[];
}

// 2. Crear componente ModalAmpliacionPlazo
<ModalAmpliacionPlazo
  isOpen={modalAmpliacion}
  auditoria={auditoriaSeleccionada}
  onSolicitar={(ampliacion) => {
    // Validar permiso (solo Admin/Jefe)
    if (usuarioActual.rol !== 'Admin' && usuarioActual.rol !== 'Jefe') {
      toast.error('No tienes permisos para autorizar ampliaciones');
      return;
    }
    
    // Validar límite 1 año
    const diasTranscurridos = calcularDias(auditoria.fechaInicioOriginal, ampliacion.nuevaFecha);
    if (diasTranscurridos > 365) {
      toast.error('No se puede ampliar más de 1 año desde el inicio');
      return;
    }
    
    // Registrar ampliación
    agregarAmpliacion(ampliacion);
  }}
/>

// 3. Función de validación
const validarAmpliacion = (auditoria: AuditoriaProgramada, nuevaFecha: string, etapa: string) => {
  const inicioOriginal = new Date(auditoria.fechaInicioOriginal);
  const nuevaFechaObj = new Date(nuevaFecha);
  const diasDiferencia = (nuevaFechaObj - inicioOriginal) / (1000 * 60 * 60 * 24);
  
  if (diasDiferencia > 365) {
    return { valido: false, mensaje: 'Excede límite de 1 año' };
  }
  
  return { valido: true };
};

// 4. Componente de Historial
<HistorialCambiosModal
  auditoria={auditoriaSeleccionada}
  ampliaciones={auditoriaSeleccionada.ampliaciones}
  historial={auditoriaSeleccionada.historialCambios}
/>
```

---

#### **2. Completar Generación de Documento Oficial**

**Impacto:** ALTO - Requerimiento clave del módulo

**Implementación requerida:**

```typescript
const generarDocumentoOficial = (programa: ProgramaAnual) => {
  // 1. Estructura del documento
  const documento = {
    portada: {
      titulo: `PROGRAMA ANUAL DE AUDITORÍAS ${programa.añoFiscal}`,
      entidad: 'Escuela Superior de Administración Pública - ESAP',
      responsable: programa.responsable,
      fecha: new Date().toLocaleDateString('es-CO'),
      version: programa.version
    },
    
    resumenEjecutivo: {
      totalAuditorias: programa.auditorias.length,
      distribucion: {
        criticas: programa.auditorias.filter(a => a.nivelRiesgo === 'CRÍTICO').length,
        altas: programa.auditorias.filter(a => a.nivelRiesgo === 'ALTO').length,
        // ...
      }
    },
    
    cronograma: generarCronogramaGantt(programa.auditorias),
    
    detalleAuditorias: programa.auditorias.map(a => ({
      codigo: a.codigo,
      proceso: a.procesoAuditable,
      auditor: a.auditorLider,
      equipo: a.equipoAuditor,
      fechas: a.fechas,
      riesgo: a.nivelRiesgo
    })),
    
    asignacionRecursos: generarTablaAsignaciones(programa.auditorias),
    
    firmas: {
      jefOCI: programa.responsable,
      fecha: new Date().toISOString()
    }
  };
  
  // 2. Generar PDF
  return generarPDF(documento);
};
```

---

#### **3. Mejorar Integración con Universo**

**Impacto:** MEDIO - Mejora flujo de trabajo

**Implementación requerida:**

```typescript
// Agregar a ProcesoAuditable en Universo:
interface ProcesoAuditable {
  // ... campos existentes
  exportadoAlPrograma: boolean;
  fechaExportacion?: string;
  auditoriaVinculadaId?: string;
}

// Función de sincronización
const sincronizarConUniverso = (auditoriaId: string) => {
  // Marcar proceso en Universo como exportado
  // Vincular IDs para trazabilidad
};
```

---

## 🎯 PLAN DE ACCIÓN RECOMENDADO

### **Fase 1 - Funcionalidades Críticas (Prioridad ALTA)**

**Tiempo estimado: 4-6 horas**

1. ✅ Implementar sistema de ampliación de plazos:
   - Modal de solicitud de ampliación
   - Validación de 1 año máximo
   - Control de permisos (Admin/Jefe)
   - Registro en historial

2. ✅ Implementar historial completo de cambios:
   - Estructura de datos
   - Modal de visualización
   - Timeline de cambios
   - Trazabilidad completa

3. ✅ Agregar validación de permisos:
   - Context de usuario actual
   - Validación en ampliaciones
   - Bloqueo de acciones no autorizadas

---

### **Fase 2 - Completar Funcionalidades Parciales (Prioridad MEDIA)**

**Tiempo estimado: 3-4 horas**

1. ✅ Completar generación de documento oficial:
   - Plantilla de PDF
   - Cronograma Gantt visual
   - Tabla de asignaciones
   - Exportación a Word/Excel

2. ✅ Mejorar importación desde Universo:
   - Validación de duplicados
   - Sincronización bidireccional
   - Indicadores de exportación

3. ✅ Completar gestión de equipos:
   - Modal de asignación de auditor líder
   - Modal de gestión de equipo
   - Validación de disponibilidad

---

### **Fase 3 - Mejoras de UX (Prioridad BAJA)**

**Tiempo estimado: 2-3 horas**

1. Mejorar vista de calendario:
   - Filtros avanzados
   - Drag & drop
   - Indicadores de conflictos

2. Dashboard mejorado:
   - Gráficos adicionales
   - Distribución por trimestre
   - Carga de trabajo por auditor

---

## ✅ CONCLUSIÓN

El **RF003 - Programa Anual de Auditorías** está implementado en un **60%** con funcionalidades base sólidas pero **falta implementar 2 requerimientos críticos obligatorios**:

**Fortalezas:**
- ✅ Estructura de datos completa y bien diseñada
- ✅ Programación de etapas funcional
- ✅ Duraciones diferenciadas correctamente
- ✅ Importación desde Universo operativa

**Debilidades críticas:**
- ❌ **Sistema de ampliación de plazos NO IMPLEMENTADO** (requerimiento obligatorio)
- ❌ **Historial de cambios NO IMPLEMENTADO** (requerimiento obligatorio)
- ⚠️ Generación de documento oficial incompleta
- ⚠️ Integración con Universo no bidireccional

**Recomendación:** Implementar URGENTEMENTE las funcionalidades de ampliación de plazos e historial de cambios antes de continuar con otros módulos, ya que son requerimientos explícitos y obligatorios del documento de especificaciones.
