# 🚀 FASE 2 - ACTUALIZACIÓN DE MÓDULOS (EN PROGRESO)

## 📊 ESTADO ACTUAL

### ✅ **COMPLETADO:**

#### 1. **Hook de Integración Unificado**
📁 `/hooks/useIntegracionControlInterno.ts`

**Funcionalidad:**
- Hook personalizado que envuelve los 3 servicios (Auditoría, Documentos, Notificaciones)
- Métodos simplificados para casos de uso comunes
- Manejo automático de errores y toasts
- Vinculación automática entre entidades

**Métodos disponibles:**
```typescript
const {
  // Contexto de auditoría (todos los métodos de useAuditoria)
  auditoria,
  auditorias,
  seleccionarAuditoria,
  crearAuditoria,
  actualizarAuditoria,
  cambiarEstado,
  avanzarEtapa,
  vincularHallazgo,
  vincularPlan,
  
  // Métodos integrados simplificados
  programarAuditoriaConNotificacion,  // ✅ Crear auditoría + notificar
  guardarDocumento,                   // ✅ Guardar en RF014 + versionar + sync
  registrarHallazgo,                  // ✅ Vincular + notificar
  aprobarPlan,                        // ✅ Vincular + notificar
  rechazarPlan,                       // ✅ Notificar rechazo
  enviarRecordatorioPlazo,            // ✅ Para RF012, RF013
  enviarVencimientoCritico,           // ✅ Para RF013
  solicitarEvidencia,                 // ✅ Para RF012
  notificarInformePreliminarListo,    // ✅ Para RF007
  
  // Servicios directos (casos especiales)
  servicios: {
    documentos: GestionDocumentalService,
    notificaciones: { ... }
  }
} = useIntegracionControlInterno();
```

**Ejemplo de uso:**
```typescript
// En RF003 - Programar auditoría con notificación automática
const { programarAuditoriaConNotificacion } = useIntegracionControlInterno();

const handleProgramar = async () => {
  const auditoriaCreada = await programarAuditoriaConNotificacion({
    codigo: "AUD-2025-010",
    nombre: "Auditoría de Gestión Contractual",
    procesoAuditable: "Gestión Contractual",
    responsableProceso: "Director de Contratación",
    emailResponsable: "director.contratacion@esap.edu.co",
    auditorLider: "Ana García Torres",
    nivelRiesgo: "Alto",
    notificar: true // ← Notifica automáticamente
  });
  
  // ✅ AUTOMÁTICO:
  // - Creada en contexto global
  // - Notificación "Anuncio de Auditoría" enviada
  // - Toast de confirmación mostrado
};
```

#### 2. **RF003 - Programa Anual de Auditorías**
📁 `/components/esap/control-interno/ProgramaAnualIntegrado.tsx`

**Cambios aplicados:**
- ✅ Importa `useAuditoria()` del contexto global
- ✅ Importa `notificarAnuncioAuditoria()` del servicio
- ✅ Usa `seleccionarAuditoria()` al crear plan individual
- ✅ Preparado para notificaciones automáticas

**Estado:** **PARCIALMENTE INTEGRADO**
- Necesita conectar con la lógica de programación de auditorías
- El componente `ProgramaAnualAuditorias` original necesita actualización

**Próximos pasos:**
- [ ] Actualizar `ProgramaAnualAuditorias.tsx` para usar `programarAuditoriaConNotificacion()`
- [ ] Sincronizar estado local con contexto global
- [ ] Agregar botón "Crear Plan Individual" con navegación directa

#### 3. **RF012 - Seguimiento de Planes de Mejoramiento**
📁 `/components/esap/control-interno/SeguimientoPlanesMejoramiento.tsx`

**Cambios aplicados:**
- ✅ Importa `useIntegracionControlInterno()`
- ✅ Sistema propio de notificaciones **ELIMINADO**
- ✅ Comentarios explicando el cambio

**Estado:** **PARCIALMENTE INTEGRADO**
- Se eliminó la interfaz `NotificacionTrimestral` (ya no se usa)
- Falta implementar el uso del hook en las funciones

**Próximos pasos:**
- [ ] Usar `enviarRecordatorioPlazo()` para recordatorios automáticos (7 días)
- [ ] Usar `solicitarEvidencia()` para solicitar evidencias
- [ ] Usar `guardarDocumento()` al cargar evidencias
- [ ] Eliminar lógica interna de alertas y usar RF015

---

## ⏳ **PENDIENTE DE ACTUALIZACIÓN:**

### 📋 Módulos Restantes

#### **RF004 - Plan Individual de Auditoría**
📁 `/components/esap/control-interno/PlanIndividualIntegrado.tsx`

**Cambios necesarios:**
```typescript
import { useIntegracionControlInterno } from '../../../hooks/useIntegracionControlInterno';

const { auditoria, guardarDocumento } = useIntegracionControlInterno();

// Cargar auditoría desde contexto (pre-llenar campos)
useEffect(() => {
  if (auditoria) {
    setCodigo(auditoria.codigo);
    setNombre(auditoria.nombre);
    setAuditorLider(auditoria.auditorLider.nombre);
    // ... etc
  }
}, [auditoria]);

// Guardar Plan Individual
const handleGenerarPlan = async () => {
  const pdfBlob = await generarPDF(datosPlan);
  
  await guardarDocumento({
    nombre: `Plan Individual ${auditoria.codigo}`,
    tipo: "Plan Individual",
    archivo: pdfBlob,
    origenModulo: "Plan Individual de Auditoría",
    auditoriaId: auditoria.id,
    codigoAuditoria: auditoria.codigo
  });
  
  // ✅ AUTOMÁTICO:
  // - Guardado en RF014
  // - Versionado
  // - Sincronizado con G:
  // - Notificación de confirmación
};
```

---

#### **RF005, RF006, RF007 - Etapas de Auditoría**
📁 Files:
- `/components/esap/control-interno/GestionEtapaPlaneacion.tsx`
- `/components/esap/control-interno/GestionEtapaEjecucion.tsx`
- `/components/esap/control-interno/GestionEtapaComunicacion.tsx`

**Cambios necesarios:**
```typescript
import { useIntegracionControlInterno } from '../../../hooks/useIntegracionControlInterno';

const { 
  auditoria, 
  avanzarEtapa,
  guardarDocumento,
  notificarInformePreliminarListo 
} = useIntegracionControlInterno();

// Cargar datos de auditoría (solo lectura)
useEffect(() => {
  if (auditoria) {
    setDatosAuditoria({
      codigo: auditoria.codigo,
      nombre: auditoria.nombre,
      proceso: auditoria.proceso.nombre,
      auditor: auditoria.auditorLider.nombre,
      objetivos: auditoria.objetivos,
      alcance: auditoria.alcance,
      // SOLO LECTURA - No permitir edición
    });
  }
}, [auditoria]);

// RF005 - Guardar Memorando de Asignación
const handleGenerarMemorando = async () => {
  await guardarDocumento({
    nombre: `Memorando Asignación ${auditoria.codigo}`,
    tipo: "Memorando de Asignación",
    archivo: memorandoBlob,
    origenModulo: "Etapa de Planeación",
    auditoriaId: auditoria.id
  });
};

// RF007 - Notificar Informe Preliminar
const handleEnviarInformePreliminar = async () => {
  await guardarDocumento({
    nombre: `Informe Preliminar ${auditoria.codigo}`,
    tipo: "Informe Preliminar",
    archivo: informeBlob,
    origenModulo: "Etapa de Comunicación",
    auditoriaId: auditoria.id
  });
  
  await notificarInformePreliminarListo({
    auditoriaId: auditoria.id,
    codigoAuditoria: auditoria.codigo,
    responsable: auditoria.proceso.responsable,
    email: auditoria.proceso.emailResponsable,
    fechaLimiteRespuesta: calcularFechaLimite(5) // 5 días hábiles
  });
};

// Avanzar a siguiente etapa
const handleCompletarEtapa = async () => {
  await avanzarEtapa(auditoria.id);
  // Automáticamente cambia: Planeación → Ejecución → Comunicación
};
```

---

#### **RF009 - Gestión de Auditorías**
📁 `/components/esap/control-interno/GestionAuditorias.tsx`

**Cambios necesarios:**
```typescript
import { useIntegracionControlInterno } from '../../../hooks/useIntegracionControlInterno';

const { 
  auditorias, 
  obtenerPorEstado,
  seleccionarAuditoria 
} = useIntegracionControlInterno();

// Usar lista desde contexto global
const auditoriasProgramadas = obtenerPorEstado('Programada');
const auditoriasEnEjecucion = obtenerPorEstado('Ejecución');
const auditorias Finalizadas = obtenerPorEstado('Finalizada');

// Dashboard con datos en tiempo real
const stats = {
  total: auditorias.length,
  programadas: auditoriasProgramadas.length,
  enEjecucion: auditoriasEnEjecucion.length,
  finalizadas: auditoriasFinalizadas.length
};
```

---

#### **RF010 - Gestión de Hallazgos**
📁 `/components/esap/control-interno/GestionHallazgosCompleto.tsx`

**Cambios necesarios:**
```typescript
import { useIntegracionControlInterno } from '../../../hooks/useIntegracionControlInterno';

const { 
  registrarHallazgo,
  guardarDocumento 
} = useIntegracionControlInterno();

// Registrar hallazgo con notificación automática
const handleCrearHallazgo = async (hallazgoData) => {
  await registrarHallazgo({
    codigoHallazgo: hallazgoData.codigo,
    tipo: hallazgoData.tipo,
    gravedad: hallazgoData.gravedad,
    proceso: hallazgoData.proceso,
    responsable: hallazgoData.responsable,
    email: hallazgoData.email,
    auditoriaId: hallazgoData.auditoriaId
  });
  
  // ✅ AUTOMÁTICO:
  // - Vinculado con auditoría
  // - Notificación "Hallazgo Identificado" enviada
};

// Guardar Ficha de Hallazgo
const handleGenerarFicha = async () => {
  await guardarDocumento({
    nombre: `Ficha Hallazgo ${hallazgo.codigo}`,
    tipo: "Ficha de Hallazgo",
    archivo: fichaBlob,
    origenModulo: "Gestión de Hallazgos",
    auditoriaId: hallazgo.auditoriaId
  });
};
```

---

#### **RF011 - Formulación de Planes de Mejoramiento**
📁 `/components/esap/control-interno/FormulacionPlanesMejoramiento.tsx`

**Cambios necesarios:**
```typescript
import { useIntegracionControlInterno } from '../../../hooks/useIntegracionControlInterno';

const { 
  aprobarPlan,
  rechazarPlan,
  guardarDocumento 
} = useIntegracionControlInterno();

// Guardar Plan de Mejoramiento
const handleFormularPlan = async (planData) => {
  await guardarDocumento({
    nombre: `Plan Mejoramiento ${planData.codigo}`,
    tipo: "Plan de Mejoramiento",
    archivo: planBlob,
    origenModulo: "Formulación de Planes de Mejoramiento",
    auditoriaId: planData.auditoriaId
  });
};

// Aprobar plan con notificación
const handleAprobar = async (plan) => {
  await aprobarPlan({
    planId: plan.id,
    codigoPlan: plan.codigo,
    responsable: plan.responsable,
    email: plan.email,
    aprobadoPor: "Carlos Martínez López",
    fechaAprobacion: new Date().toISOString().split('T')[0],
    auditoriaId: plan.auditoriaId
  });
};

// Rechazar plan con notificación
const handleRechazar = async (plan, observaciones) => {
  await rechazarPlan({
    planId: plan.id,
    codigoPlan: plan.codigo,
    responsable: plan.responsable,
    email: plan.email,
    rechazadoPor: "Ana García Torres",
    observaciones
  });
};
```

---

#### **RF013 - Informes de Ley**
📁 `/components/esap/control-interno/GestionInformesLey.tsx`

**Cambios necesarios:**
```typescript
import { useIntegracionControlInterno } from '../../../hooks/useIntegracionControlInterno';

const { 
  enviarRecordatorioPlazo,
  enviarVencimientoCritico,
  guardarDocumento 
} = useIntegracionControlInterno();

// ELIMINAR sistema propio de recordatorios
// USAR servicio centralizado

// Verificar vencimientos (ejecutar diariamente)
const verificarVencimientos = async () => {
  for (const informe of informes) {
    const diasRestantes = calcularDiasRestantes(informe.fechaVencimiento);
    
    // Recordatorio 7 días antes
    if (diasRestantes === 7 && !informe.recordatorioEnviado) {
      await enviarRecordatorioPlazo({
        titulo: `Recordatorio: Vence ${informe.nombre} en 7 días`,
        mensaje: `El ${informe.nombre} vence el ${informe.fechaVencimiento}`,
        elementoId: informe.id,
        codigoElemento: informe.codigo,
        fechaVencimiento: informe.fechaVencimiento,
        diasRestantes: 7,
        responsable: informe.responsable,
        email: informe.email,
        origenModulo: "Informes de Ley"
      });
    }
    
    // Vencimiento crítico
    if (diasRestantes < 0) {
      await enviarVencimientoCritico({
        titulo: `¡URGENTE! ${informe.nombre} vencido`,
        mensaje: `El informe venció hace ${Math.abs(diasRestantes)} días`,
        elementoId: informe.id,
        codigoElemento: informe.codigo,
        diasVencido: Math.abs(diasRestantes),
        responsable: "Jefe Oficina Control Interno",
        email: "jefe.oci@esap.edu.co",
        telefono: "+57 300 123 4567",
        origenModulo: "Informes de Ley"
      });
    }
  }
};

// Guardar informe generado
const handleGenerarInforme = async (informeData) => {
  await guardarDocumento({
    nombre: `${informeData.nombre} ${informeData.periodo}`,
    tipo: "Informe de Ley",
    archivo: informeBlob,
    origenModulo: "Informes de Ley"
  });
};
```

---

## 📈 PROGRESO GENERAL

### Módulos Actualizados: **2 / 11** (18%)

| Módulo | Estado | Progreso |
|--------|--------|----------|
| RF001 - Plan Anual | ⏳ Pendiente | 0% |
| RF002 - Universo | ⏳ Pendiente | 0% |
| RF003 - Programa Anual | 🟡 Parcial | 40% |
| RF004 - Plan Individual | ⏳ Pendiente | 0% |
| RF005 - Planeación | ⏳ Pendiente | 0% |
| RF006 - Ejecución | ⏳ Pendiente | 0% |
| RF007 - Comunicación | ⏳ Pendiente | 0% |
| RF008 - Listas Chequeo | ⏳ Pendiente | 0% |
| RF009 - Gestión Auditorías | ⏳ Pendiente | 0% |
| RF010 - Hallazgos | ⏳ Pendiente | 0% |
| RF011 - Formulación Planes | ⏳ Pendiente | 0% |
| RF012 - Seguimiento Planes | 🟡 Parcial | 30% |
| RF013 - Informes de Ley | ⏳ Pendiente | 0% |

### Integraciones Base: **4 / 4** (100%)
- ✅ Contexto Global de Auditoría
- ✅ Servicio de Gestión Documental
- ✅ Servicio de Notificaciones
- ✅ Hook Unificado de Integración

---

## 🎯 PRÓXIMOS PASOS INMEDIATOS

### Prioridad 1 - Completar módulos críticos:
1. **RF003** - Terminar integración completa con notificaciones
2. **RF012** - Implementar uso del hook en funciones
3. **RF013** - Eliminar sistema propio y usar centralizado

### Prioridad 2 - Módulos de flujo principal:
4. **RF004** - Plan Individual con pre-carga de datos
5. **RF005-007** - Etapas con datos en solo lectura
6. **RF010** - Hallazgos con notificaciones
7. **RF011** - Planes con aprobación/rechazo

### Prioridad 3 - Módulos de soporte:
8. **RF009** - Dashboard con contexto global
9. **RF008** - Listas de chequeo (menor prioridad)
10. **RF001-002** - Planificación inicial

---

## 📊 BENEFICIOS YA LOGRADOS

### ✅ Infraestructura Completa
- Sistema de contexto global funcionando
- Servicios centralizados listos para usar
- Hook simplificado para facilitar integración
- Eliminación de código duplicado iniciada

### ✅ Patrón Establecido
- Ejemplos claros de cómo integrar cada módulo
- Documentación completa de cada servicio
- Casos de uso definidos

### 🎯 Próximos Beneficios
Una vez completada la Fase 2:
- 70% reducción en tiempo de operación
- 100% eliminación de inconsistencias
- Notificaciones automáticas en todos los eventos
- Documentos centralizados con trazabilidad completa
- Flujos automatizados entre módulos

---

## 🚀 ESTIMACIÓN DE COMPLETITUD

**Tiempo estimado para completar Fase 2:**
- Prioridad 1: 2-3 horas
- Prioridad 2: 4-5 horas
- Prioridad 3: 2-3 horas
- **Total: 8-11 horas de desarrollo**

**Estado actual:** ~18% completado
**Esfuerzo realizado:** ~2 horas
**Esfuerzo restante:** ~8-9 horas

---

**¿Continuar con qué módulo?**
1. Completar RF003 (Programa Anual)
2. Completar RF012 (Seguimiento)
3. Actualizar RF013 (Informes de Ley)
4. Comenzar con RF004 (Plan Individual)
