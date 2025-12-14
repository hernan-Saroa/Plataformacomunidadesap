# ANÁLISIS DE CUMPLIMIENTO - RF004: PLAN INDIVIDUAL DE AUDITORÍA

**Fecha de análisis:** 14 de diciembre de 2025  
**Módulo:** Control Interno de Gestión  
**Componentes:** `/components/esap/control-interno/ModalCrearAuditoria.tsx` y `/components/esap/control-interno/GestionAuditorias.tsx`

---

## 📋 REQUERIMIENTOS DEL RF004

### Requerimientos según documento oficial:

1. ❌ Creación de plan individual seleccionando auditoría del programa anual
2. ⚠️ Definición de alcance, objetivos y riesgos del proceso a auditar
3. ⚠️ Asignación de equipo auditor (líder + miembros)
4. ⚠️ Definición de criterios de auditoría
5. ❌ Generación automática de documentos según formato estándar OCI
6. ❌ Envío automático a área auditada

---

## 🔍 ESTADO ACTUAL DE IMPLEMENTACIÓN

### **Archivos Encontrados:**

1. **`ModalCrearAuditoria.tsx`** - Wizard de creación parcial
2. **`GestionAuditorias.tsx`** - Dashboard de gestión general

### **Análisis de `ModalCrearAuditoria.tsx`:**

**Lo que tiene (parcial):**
- ✅ Estructura de wizard de 7 pasos
- ✅ Tipos de datos definidos correctamente
- ✅ Lista de auditores disponibles
- ✅ Criterios de auditoría sugeridos
- ✅ Campos para alcance, objetivos y riesgos

**Lo que falta:**
- ❌ NO está conectado con el Programa Anual (RF003)
- ❌ NO tiene selección de auditoría desde programa
- ❌ NO genera documentos automáticos
- ❌ NO tiene función de envío a área auditada
- ❌ Wizard incompleto (solo estructura)

---

## 📊 CUMPLIMIENTO POR REQUERIMIENTO

### **1. Creación seleccionando auditoría del Programa Anual** ❌ NO IMPLEMENTADO (0%)

**Lo que se requiere:**
- Modal que muestre las auditorías del Programa Anual (RF003)
- Filtro por estado "Programada"
- Selección de auditoría base
- Heredar datos: proceso, equipo, fechas, riesgo
- Convertir de "Programada" a "En Plan Individual"

**Estado actual:**
- El modal existe pero no se conecta con RF003
- No hay selección de auditoría programada
- No hereda datos del programa anual

**Implementación requerida:**
```typescript
interface SeleccionAuditoriaProps {
  auditoriasPrograma: AuditoriaProgramada[];
  onSeleccionar: (auditoria: AuditoriaProgramada) => void;
}

// Paso 1: Seleccionar auditoría del programa
<SeleccionAuditoria
  auditorias={programaAnual.auditorias.filter(a => a.estado === 'Programada')}
  onSeleccionar={(aud) => {
    // Prellenar formulario con datos de la auditoría
    setFormData({
      procesoAuditable: aud.procesoAuditable,
      auditorLider: aud.auditorLider,
      equipoAuditor: aud.equipoAuditor,
      fechas: aud.fechas,
      // ...
    });
  }}
/>
```

---

### **2. Definición de alcance, objetivos y riesgos** ⚠️ PARCIAL (40%)

**Lo que tiene:**
- ✅ Campos de texto para alcance, objetivos y riesgos
- ✅ Estructura de datos correcta

**Lo que falta:**
- ❌ Templates predefinidos según tipo de proceso
- ❌ Asistente inteligente para redacción
- ❌ Validación de completitud
- ❌ Ejemplos contextuales
- ❌ Guardado de borradores

**Implementación requerida:**
```typescript
const TEMPLATES_ALCANCE = {
  'Gestión Financiera': {
    alcance: 'La auditoría incluye la revisión de [periodo], abarcando:\n- Ejecución presupuestal\n- Gestión de caja menor\n- Conciliaciones bancarias\n- Comprobantes de egreso',
    objetivos: '1. Verificar cumplimiento de normatividad...\n2. Evaluar controles...',
    riesgos: '- Riesgo de malversación de fondos\n- Riesgo de incumplimiento normativo'
  },
  // Más templates por tipo
};

// Botón "Usar Template"
<Button onClick={() => aplicarTemplate(procesoTipo)}>
  Cargar Template
</Button>
```

---

### **3. Asignación de equipo auditor** ⚠️ PARCIAL (50%)

**Lo que tiene:**
- ✅ Campo auditorLider
- ✅ Array equipoAuditor
- ✅ Lista de auditores disponibles

**Lo que falta:**
- ❌ Validación de disponibilidad de auditores
- ❌ Indicador de carga de trabajo actual
- ❌ Asignación automática según disponibilidad
- ❌ Gestión de roles dentro del equipo
- ❌ Calendario de disponibilidad

**Implementación requerida:**
```typescript
interface AuditorDisponibilidad {
  nombre: string;
  auditoriaActuales: number;
  disponible: boolean;
  cargaTrabajo: number; // 0-100%
  proximaDisponibilidad: string;
}

const verificarDisponibilidad = (auditor: string, fechas: any) => {
  // Consultar auditorías activas del auditor
  const carga = calcularCarga(auditor);
  return carga < 80; // Máximo 80% de carga
};
```

---

### **4. Definición de criterios de auditoría** ⚠️ PARCIAL (60%)

**Lo que tiene:**
- ✅ Array de criterios
- ✅ Lista de criterios sugeridos
- ✅ Normativa aplicable

**Lo que falta:**
- ❌ Criterios específicos por tipo de proceso
- ❌ Vinculación con marco normativo (leyes, decretos)
- ❌ Checklist de criterios obligatorios
- ❌ Ponderación de criterios

**Implementación requerida:**
```typescript
interface CriterioAuditoria {
  id: string;
  descripcion: string;
  normativaBase: string; // Ley 87 de 1993, etc.
  obligatorio: boolean;
  ponderacion: number; // peso en la evaluación
}

const CRITERIOS_POR_PROCESO = {
  'Gestión Financiera': [
    {
      id: 'crit-1',
      descripcion: 'Cumplimiento Ley 819 de 2003 - Responsabilidad Fiscal',
      normativaBase: 'Ley 819/2003',
      obligatorio: true,
      ponderacion: 30
    },
    // ...
  ]
};
```

---

### **5. Generación automática de documentos OCI** ❌ NO IMPLEMENTADO (0%)

**CRÍTICO - REQUERIMIENTO OBLIGATORIO**

**Lo que se requiere:**
- ❌ Plantillas de documentos oficiales:
  1. **Oficio de Anuncio de Auditoría** - Notificar inicio
  2. **Carta de Representación** - Solicitar al área
  3. **Programa Individual de Auditoría** - Plan detallado
  4. **Solicitud de Información** - Documentos requeridos
- ❌ Generación automática al crear plan
- ❌ Numeración consecutiva automática
- ❌ Firmas digitales
- ❌ Exportación a PDF con membrete ESAP

**Implementación requerida:**
```typescript
interface DocumentoOCI {
  tipo: 'anuncio' | 'carta_representacion' | 'programa_individual' | 'solicitud_info';
  numero: string; // Consecutivo automático
  fecha: string;
  destinatario: string;
  asunto: string;
  contenido: string; // Template renderizado
  firmante: string;
  estadoFirma: 'pendiente' | 'firmado';
}

const generarDocumentosOCI = async (planAuditoria: PlanIndividual) => {
  const documentos: DocumentoOCI[] = [];
  
  // 1. Oficio de Anuncio
  const anuncio = await generarOficioAnuncio({
    numero: obtenerConsecutivo('anuncio'),
    proceso: planAuditoria.procesoAuditable,
    fechaInicio: planAuditoria.fechas.planeacion.inicio,
    auditor: planAuditoria.auditorLider,
    destinatario: planAuditoria.responsableProceso
  });
  
  // 2. Carta de Representación
  const cartaRep = await generarCartaRepresentacion({
    numero: obtenerConsecutivo('carta_rep'),
    proceso: planAuditoria.procesoAuditable,
    criterios: planAuditoria.criterios
  });
  
  // 3. Programa Individual
  const programa = await generarProgramaIndividual({
    numero: obtenerConsecutivo('programa'),
    alcance: planAuditoria.alcance,
    objetivos: planAuditoria.objetivos,
    metodologia: 'Revisión documental, entrevistas, pruebas de cumplimiento',
    cronograma: planAuditoria.fechas
  });
  
  return [anuncio, cartaRep, programa];
};
```

---

### **6. Envío automático a área auditada** ❌ NO IMPLEMENTADO (0%)

**CRÍTICO - REQUERIMIENTO OBLIGATORIO**

**Lo que se requiere:**
- ❌ Sistema de notificaciones por correo
- ❌ Bandeja de entrada del responsable del área
- ❌ Estado de lectura de documentos
- ❌ Firma de recibido por el área
- ❌ Log de envíos y confirmaciones

**Implementación requerida:**
```typescript
interface NotificacionArea {
  id: string;
  planAuditoriaId: string;
  destinatario: string; // Responsable del área
  email: string;
  documentosAdjuntos: string[]; // IDs de documentos
  fechaEnvio: string;
  fechaLectura?: string;
  estadoConfirmacion: 'enviado' | 'leido' | 'confirmado';
  observacionesArea?: string;
}

const enviarNotificacionArea = async (plan: PlanIndividual) => {
  // 1. Generar documentos
  const documentos = await generarDocumentosOCI(plan);
  
  // 2. Preparar correo
  const correo = {
    para: plan.responsableAreaEmail,
    asunto: `Anuncio de Auditoría - ${plan.procesoAuditable} - ${plan.codigo}`,
    cuerpo: `
      Estimado/a ${plan.responsableArea},
      
      Por medio del presente se le informa que se ha programado una auditoría
      al proceso ${plan.procesoAuditable}, según el Programa Anual de Auditorías.
      
      Adjunto encontrará:
      - Oficio de anuncio
      - Carta de representación (favor diligenciar y devolver)
      - Programa individual de auditoría
      
      Cordialmente,
      ${plan.auditorLider}
      Oficina de Control Interno
    `,
    adjuntos: documentos.map(d => d.pdfUrl)
  };
  
  // 3. Enviar y registrar
  await enviarCorreo(correo);
  await registrarNotificacion({
    planAuditoriaId: plan.id,
    destinatario: plan.responsableArea,
    fechaEnvio: new Date().toISOString(),
    estadoConfirmacion: 'enviado'
  });
  
  toast.success('Notificación enviada al área auditada');
};
```

---

## 📈 ANÁLISIS DE CUMPLIMIENTO GENERAL

### **Resumen por Requerimiento:**

| # | Requerimiento | Estado | % Completitud |
|---|--------------|--------|---------------|
| 1 | Selección desde Programa Anual | ❌ Pendiente | 0% |
| 2 | Alcance, objetivos y riesgos | ⚠️ Parcial | 40% |
| 3 | Asignación de equipo | ⚠️ Parcial | 50% |
| 4 | Criterios de auditoría | ⚠️ Parcial | 60% |
| 5 | Generación de documentos OCI | ❌ Pendiente | 0% |
| 6 | Envío a área auditada | ❌ Pendiente | 0% |

### **CUMPLIMIENTO TOTAL: 25%**

---

## 🚨 PUNTOS CRÍTICOS

### **ALTA PRIORIDAD - FUNCIONALIDADES FALTANTES CRÍTICAS:**

1. **Integración con RF003 (Programa Anual)** - 0% implementado
   - Sin esto, el RF004 no tiene sentido
   - Es el punto de partida obligatorio

2. **Generación de documentos OCI** - 0% implementado
   - Requerimiento explícito del documento
   - Sin documentos, no hay auditoría formal

3. **Envío a área auditada** - 0% implementado
   - Parte del flujo obligatorio
   - Trazabilidad de comunicaciones

---

## 🎯 ESTRUCTURA COMPLETA REQUERIDA

```typescript
// ============ TIPOS COMPLETOS ============

interface PlanIndividualAuditoria {
  id: string;
  codigo: string; // PIA-2025-001
  
  // Vínculo con Programa Anual
  auditoriaOrigenId: string; // ID de AuditoriaProgramada
  procesoAuditable: string;
  tipoSede: 'Sede Principal' | 'Territorial';
  territorial?: string;
  
  // Definición del Plan
  alcance: string;
  objetivos: string[];
  riesgos: string[];
  criteriosAuditoria: CriterioAuditoria[];
  normativaAplicable: string[];
  
  // Equipo
  auditorLider: string;
  equipoAuditor: MiembroEquipo[];
  
  // Cronograma
  fechas: {
    planeacion: { inicio: string; fin: string };
    ejecucion: { inicio: string; fin: string };
    comunicacion: { inicio: string; fin: string };
  };
  
  // Documentos generados
  documentosOCI: DocumentoOCI[];
  
  // Comunicaciones
  notificaciones: NotificacionArea[];
  
  // Estado
  estado: 'Borrador' | 'Aprobado' | 'Notificado' | 'En Ejecución';
  fechaCreacion: string;
  creadoPor: string;
  fechaAprobacion?: string;
  aprobadoPor?: string;
}

interface MiembroEquipo {
  nombre: string;
  rol: 'Líder' | 'Auditor' | 'Apoyo';
  cargaTrabajo: number; // % de dedicación
}

interface CriterioAuditoria {
  id: string;
  descripcion: string;
  normativaBase: string;
  obligatorio: boolean;
  metodologia: string; // Cómo se evaluará
}

interface DocumentoOCI {
  id: string;
  tipo: 'anuncio' | 'carta_representacion' | 'programa_individual' | 'solicitud_info';
  numero: string;
  fecha: string;
  contenido: string;
  pdfUrl?: string;
  firmado: boolean;
  fechaFirma?: string;
}
```

---

## 📋 PLAN DE IMPLEMENTACIÓN RECOMENDADO

### **Fase 1: Integración con Programa Anual (CRÍTICA)**

**Tiempo estimado: 2-3 horas**

1. ✅ Crear componente `SeleccionAuditoriaPrograma`
   - Listar auditorías del Programa Anual con estado "Programada"
   - Filtros por riesgo, sede, fecha
   - Botón "Crear Plan Individual"

2. ✅ Prellenado automático de datos
   - Heredar proceso, equipo, fechas, riesgo
   - Generar código automático (PIA-2025-XXX)

3. ✅ Actualización de estados
   - Cambiar auditoría en Programa a "En Plan Individual"
   - Sincronización bidireccional

---

### **Fase 2: Completar Wizard de Plan Individual**

**Tiempo estimado: 3-4 horas**

1. ✅ Paso 1: Datos heredados (readonly)
2. ✅ Paso 2: Alcance y objetivos con templates
3. ✅ Paso 3: Riesgos identificados
4. ✅ Paso 4: Criterios de auditoría
5. ✅ Paso 5: Revisión de equipo
6. ✅ Paso 6: Confirmación y guardado

---

### **Fase 3: Generación de Documentos OCI (CRÍTICA)**

**Tiempo estimado: 4-5 horas**

1. ✅ Templates de documentos:
   - Oficio de Anuncio
   - Carta de Representación
   - Programa Individual de Auditoría

2. ✅ Motor de generación:
   - Reemplazo de variables
   - Generación de PDF
   - Numeración consecutiva

3. ✅ Gestión de firmas:
   - Firma digital del Jefe OCI
   - Estado de documentos firmados

---

### **Fase 4: Sistema de Notificaciones**

**Tiempo estimado: 2-3 horas**

1. ✅ Envío de correos electrónicos
2. ✅ Notificación en bandeja del sistema
3. ✅ Confirmación de lectura
4. ✅ Log de comunicaciones

---

## ✅ CONCLUSIÓN

El **RF004 - Plan Individual de Auditoría** está en un **25% de implementación** con componentes base creados pero sin las funcionalidades críticas:

**Estado actual:**
- ⚠️ Wizard de creación existe pero incompleto
- ⚠️ Tipos de datos bien definidos
- ❌ **NO conectado con Programa Anual (RF003)**
- ❌ **NO genera documentos OCI**
- ❌ **NO envía notificaciones**

**Recomendación:** 
Implementar URGENTEMENTE:
1. Integración con RF003
2. Generación de documentos OCI
3. Sistema de notificaciones

Sin estas 3 funcionalidades, el RF004 no cumple su propósito de formalizar el inicio de una auditoría.
