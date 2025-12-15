# 🔄 FLUJO COMPLETO - CONTROL INTERNO DE GESTIÓN

## 📌 VISIÓN GENERAL

El módulo de Control Interno de Gestión ejecuta un **ciclo completo de auditoría** que va desde la planificación estratégica anual hasta el seguimiento de las acciones correctivas, con informes periódicos a entes de control.

---

## 🎯 CICLO COMPLETO DE AUDITORÍA - 9 ETAPAS

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    CICLO ANUAL DE AUDITORÍAS ESAP                       │
└─────────────────────────────────────────────────────────────────────────┘

  📋 PLANIFICACIÓN ESTRATÉGICA (Enero - Febrero)
  ├─ RF001: Plan Anual de Auditorías
  ├─ RF002: Universo de Auditorías  
  └─ RF003: Programa Anual de Auditorías
            ↓
  📝 PREPARACIÓN DE AUDITORÍA (Marzo - Diciembre)
  └─ RF004: Plan Individual de Auditoría
            ↓
  🔍 EJECUCIÓN DE AUDITORÍA (Varía según plan)
  ├─ RF005: Etapa de Planeación
  ├─ RF006: Etapa de Ejecución
  ├─ RF007: Etapa de Comunicación
  └─ RF008: Listas de Chequeo
            ↓
  📊 GESTIÓN Y MONITOREO (Continuo)
  └─ RF009: Gestión de Auditorías
            ↓
  🔴 HALLAZGOS Y MEJORAS (Al finalizar auditoría)
  ├─ RF010: Gestión de Hallazgos
  └─ RF011: Formulación de Planes de Mejoramiento
            ↓
  ✅ SEGUIMIENTO (Trimestral)
  └─ RF012: Seguimiento de Planes de Mejoramiento
            ↓
  📄 REPORTES E INFORMES (Trimestral/Cuatrimestral)
  └─ RF013: Informes de Ley
            ↓
  📁 SOPORTE TRANSVERSAL (Durante todo el ciclo)
  ├─ RF014: Gestión Documental
  └─ RF015: Sistema de Notificaciones
```

---

## 📅 LÍNEA DE TIEMPO - AÑO 2025

```
ENERO          FEBRERO       MARZO         ABRIL-NOV      DICIEMBRE
  │               │             │              │              │
  │ PLANIFICACIÓN │  PROGRAMA   │   EJECUCIÓN DE AUDITORÍAS  │  CIERRE
  │               │             │                            │
  ▼               ▼             ▼                            ▼

RF001          RF003         RF004                      RF013
Plan Anual  → Programa → Plan Individual → Auditorías → Informes
              Aprobado                      ejecutadas    de Ley

                              ├─ RF005: Planeación
                              ├─ RF006: Ejecución
                              ├─ RF007: Comunicación
                              ├─ RF010: Hallazgos
                              ├─ RF011: Planes
                              └─ RF012: Seguimiento
                                         (trimestral)
```

---

## 🔄 FLUJO DETALLADO - PASO A PASO

### **FASE 1: PLANIFICACIÓN ESTRATÉGICA** (Enero - Febrero)

#### **RF001 - Plan Anual de Auditorías**
📁 Responsable: **Jefe Oficina de Control Interno**

**¿Qué hace?**
- Define objetivos estratégicos del año
- Establece prioridades de auditoría
- Asigna recursos (personal, presupuesto)
- Define cronograma macro

**Salidas:**
- Documento: "Plan Anual de Auditorías 2025"
- Objetivos estratégicos definidos
- Presupuesto aprobado

**Ejemplo:**
```
Plan Anual 2025 - ESAP
- Objetivo: Fortalecer control en procesos misionales
- Prioridades: Gestión Contractual (ALTA), Talento Humano (MEDIA)
- Recursos: 5 auditores + 1 especialista
- Presupuesto: $200.000.000
- Auditorías programadas: 12
```

---

#### **RF002 - Universo de Auditorías**
📁 Responsable: **Equipo OCI**

**¿Qué hace?**
- **Importa** todos los procesos desde el Mapa de Procesos ESAP
- Analiza riesgos por proceso
- Prioriza qué procesos auditar
- Selecciona procesos para el programa anual

**Datos de cada proceso:**
- Código: P-GC-001
- Nombre: Gestión Contractual
- Responsable: Director de Contratación
- Nivel de Riesgo: ALTO
- Última auditoría: 2023
- Obligatoriedad: Normativa

**Criterios de priorización:**
1. **Nivel de Riesgo** (Crítico > Alto > Medio > Bajo)
2. **Obligatoriedad legal** (Contraloría, Procuraduría)
3. **Tiempo desde última auditoría**
4. **Impacto en misión institucional**

**Salida:**
- Lista de 15-20 procesos priorizados
- Matriz de riesgos
- Justificación de selección

---

#### **RF003 - Programa Anual de Auditorías**
📁 Responsable: **Jefe OCI**

**¿Qué hace?**
- **Toma** los procesos priorizados del RF002
- Crea las auditorías del año
- Asigna auditores líderes
- Define fechas de cada etapa
- **Notifica** a responsables de procesos

**Por cada auditoría se define:**
```javascript
{
  codigo: "AUD-2025-001",
  nombre: "Auditoría de Gestión Contractual",
  proceso: {
    codigo: "P-GC-001",
    nombre: "Gestión Contractual",
    responsable: "Dr. Carlos Rodríguez",
    email: "carlos.rodriguez@esap.edu.co",
    direccion: "Dirección de Contratación"
  },
  auditorLider: "Ana García Torres",
  equipoAuditor: ["Luis Pérez", "María Santos"],
  nivelRiesgo: "ALTO",
  fechas: {
    planeacion: { inicio: "2025-05-10", fin: "2025-05-24" },
    ejecucion: { inicio: "2025-05-27", fin: "2025-06-20" },
    comunicacion: { inicio: "2025-06-23", fin: "2025-07-05" }
  },
  duracionTotal: 57, // días
  estado: "Programada"
}
```

**🔔 NOTIFICACIÓN AUTOMÁTICA:**
```
Para: carlos.rodriguez@esap.edu.co
Asunto: Nueva Auditoría Programada - Gestión Contractual

Estimado Dr. Carlos Rodríguez,

Se ha programado la Auditoría de Gestión Contractual (AUD-2025-001) 
para su proceso.

Auditor Líder: Ana García Torres
Fecha de inicio: 10 de mayo de 2025
Duración estimada: 57 días

Por favor, prepare la documentación solicitada en el memorando 
de asignación adjunto.

Cordialmente,
Oficina de Control Interno
```

**✅ INTEGRACIÓN:**
```typescript
// Se crea en contexto global
const auditoria = await crearAuditoria({...});

// Se notifica automáticamente
await notificarAnuncioAuditoria({
  codigoAuditoria: "AUD-2025-001",
  responsable: "Dr. Carlos Rodríguez",
  email: "carlos.rodriguez@esap.edu.co"
});
```

---

### **FASE 2: PREPARACIÓN DE AUDITORÍA** (Variable)

#### **RF004 - Plan Individual de Auditoría**
📁 Responsable: **Auditor Líder**

**¿Qué hace?**
- **Carga automáticamente** datos de la auditoría programada (RF003)
- Define objetivos específicos
- Define alcance detallado
- Define criterios de auditoría
- Identifica riesgos específicos
- Crea cronograma detallado
- **Genera** PDF del Plan Individual

**Datos pre-cargados desde RF003:**
```typescript
// ✅ ANTES (repetir todo manualmente)
setCodigo("AUD-2025-001");
setProceso("Gestión Contractual");
setAuditor("Ana García Torres");
// ... 20+ campos más

// ✅ AHORA (automático desde contexto)
const { auditoria } = useIntegracionControlInterno();

useEffect(() => {
  if (auditoria) {
    // TODO ya está cargado
    setCodigo(auditoria.codigo);
    setProceso(auditoria.proceso.nombre);
    setAuditor(auditoria.auditorLider.nombre);
    setFechas(auditoria.cronograma);
    // ... automático
  }
}, [auditoria]);
```

**Usuario solo agrega:**
- Objetivos específicos (3-5)
- Alcance detallado
- Criterios de auditoría (normas)
- Metodología
- Recursos necesarios

**Ejemplo de objetivo:**
```
OBJETIVO ESPECÍFICO 1:
Verificar el cumplimiento de la normatividad vigente en 
contratación directa durante el año 2024.

Alcance: Contratos directos > $50.000.000
Criterio: Ley 80/1993, Decreto 1082/2015
```

**Documento generado:**
```
📄 Plan Individual de Auditoría
   AUD-2025-001 - Gestión Contractual.pdf
   
   ✅ Guardado en RF014 (Gestión Documental)
   ✅ Carpeta: /Auditorías/2025/AUD-2025-001/Plan Individual/
   ✅ Sincronizado con: G:/Control_Interno/Auditorias/2025/AUD-2025-001/
   ✅ Versión: 1.0
   ✅ Permisos: Jefe OCI, Auditor Líder, Auditor
```

**🔔 NOTIFICACIÓN AUTOMÁTICA:**
```
Para: ana.garcia@esap.edu.co
Asunto: Plan Individual Guardado - AUD-2025-001

Su Plan Individual de Auditoría ha sido guardado correctamente.

Puede continuar con la Etapa de Planeación.

[Ver Plan] [Iniciar Planeación]
```

---

### **FASE 3: EJECUCIÓN DE AUDITORÍA** (3 Etapas)

#### **RF005 - Etapa de PLANEACIÓN**
📁 Responsable: **Auditor Líder**
⏱️ Duración: 10-15 días

**¿Qué hace?**
- **Carga** datos del Plan Individual (RF004) - SOLO LECTURA
- Genera Memorando de Asignación
- Solicita documentación al auditado
- Crea Programa de Trabajo detallado
- Define papeles de trabajo
- Planifica entrevistas

**Documentos generados:**
1. **Memorando de Asignación** (Oficial)
   - Dirigido al responsable del proceso
   - Firma del Jefe OCI
   - Con sello institucional
   
2. **Programa de Trabajo**
   - Actividades día a día
   - Responsables
   - Tiempos estimados
   
3. **Papeles de Trabajo** (plantillas vacías)
   - Para registrar evidencias
   - Formatos estandarizados

**Ejemplo - Memorando de Asignación:**
```
MEMORANDO No. 0125-2025
PARA: Dr. Carlos Rodríguez - Director de Contratación
DE: Jefe Oficina de Control Interno
ASUNTO: Asignación Auditoría de Gestión Contractual

En cumplimiento del Plan Anual de Auditorías 2025, se ha 
programado auditoría a su proceso.

Código: AUD-2025-001
Auditor Líder: Ana García Torres
Equipo: Luis Pérez, María Santos
Periodo de revisión: Enero 2024 - Diciembre 2024

Documentación requerida (ver anexo):
- Contratos vigentes
- Informes de supervisión
- Actas de comité
...

Fecha de inicio: 27 de mayo de 2025
```

**✅ INTEGRACIÓN:**
```typescript
const { auditoria, guardarDocumento } = useIntegracionControlInterno();

// Datos en SOLO LECTURA (no se pueden modificar)
<input value={auditoria.codigo} disabled />
<input value={auditoria.proceso.nombre} disabled />

// Generar memorando
const handleGenerarMemorando = async () => {
  const memorandoBlob = await generarPDF(datosMemorando);
  
  await guardarDocumento({
    nombre: `Memorando Asignación ${auditoria.codigo}`,
    tipo: "Memorando de Asignación",
    archivo: memorandoBlob,
    origenModulo: "Etapa de Planeación",
    auditoriaId: auditoria.id
    // ✅ Automático: guardar, versionar, sync, notificar
  });
};
```

---

#### **RF006 - Etapa de EJECUCIÓN**
📁 Responsable: **Equipo Auditor**
⏱️ Duración: 20-30 días

**¿Qué hace?**
- Ejecuta el Programa de Trabajo
- Aplica Listas de Chequeo (RF008)
- Recopila evidencias
- Registra hallazgos preliminares
- Llena papeles de trabajo
- Realiza entrevistas
- Toma fotografías/videos

**Actividades diarias:**
```
DÍA 1-5: Revisión documental
- Revisar contratos 2024
- Verificar cumplimiento normativo
- Registrar en papeles de trabajo

DÍA 6-10: Entrevistas
- Entrevistar a supervisores
- Entrevistar a contratistas
- Registrar declaraciones

DÍA 11-15: Pruebas de cumplimiento
- Aplicar listas de chequeo
- Verificar controles
- Identificar hallazgos

DÍA 16-20: Consolidación
- Organizar evidencias
- Clasificar hallazgos
- Preparar informe preliminar
```

**Documentos generados:**
1. **Papeles de Trabajo** (llenos con evidencias)
2. **Evidencias** (fotos, escaneados, grabaciones)
3. **Actas de entrevista**
4. **Listas de chequeo aplicadas** (RF008)

**✅ INTEGRACIÓN:**
```typescript
// Guardar cada evidencia
await guardarDocumento({
  nombre: `Contrato 001-2024 - Evidencia`,
  tipo: "Evidencia",
  archivo: escaneadoContrato,
  origenModulo: "Etapa de Ejecución",
  auditoriaId: auditoria.id,
  tags: ["contrato", "2024", "evidencia"]
});

// Todas las evidencias quedan vinculadas a la auditoría
// Accesibles desde cualquier módulo
```

---

#### **RF007 - Etapa de COMUNICACIÓN**
📁 Responsable: **Auditor Líder**
⏱️ Duración: 10-15 días

**¿Qué hace?**
1. Genera **Informe Preliminar**
2. **Notifica** al auditado (5 días para responder)
3. Recibe controversias/observaciones
4. Analiza respuestas
5. Genera **Informe Final**
6. Presenta hallazgos formales
7. Solicita Plan de Mejoramiento

**Flujo de comunicación:**
```
┌──────────────────────────────────────────────────────────┐
│ 1. INFORME PRELIMINAR                                    │
│    - Genera PDF con hallazgos preliminares               │
│    - Envía al responsable del proceso                    │
│    - Plazo: 5 días hábiles para responder                │
└──────────────────────────────────────────────────────────┘
                        ↓
┌──────────────────────────────────────────────────────────┐
│ 2. CONTROVERSIA (Opcional)                               │
│    - Auditado presenta observaciones                     │
│    - Aporta evidencias adicionales                       │
│    - Justifica desacuerdos                               │
└──────────────────────────────────────────────────────────┘
                        ↓
┌──────────────────────────────────────────────────────────┐
│ 3. ANÁLISIS DE RESPUESTAS                                │
│    - Auditor evalúa argumentos                           │
│    - Acepta o rechaza controversias                      │
│    - Ajusta hallazgos si procede                         │
└──────────────────────────────────────────────────────────┘
                        ↓
┌──────────────────────────────────────────────────────────┐
│ 4. INFORME FINAL                                         │
│    - Genera PDF con hallazgos definitivos                │
│    - Incluye respuestas del auditado                     │
│    - Firma del Jefe OCI                                  │
└──────────────────────────────────────────────────────────┘
```

**🔔 NOTIFICACIÓN AUTOMÁTICA:**
```
Para: carlos.rodriguez@esap.edu.co
Asunto: Informe Preliminar Disponible - AUD-2025-001

El informe preliminar de la Auditoría de Gestión Contractual 
está disponible para su revisión.

Hallazgos identificados: 3
- 1 No Conformidad Mayor
- 1 No Conformidad Menor
- 1 Observación

Tiene hasta el 10 de julio de 2025 para presentar 
observaciones o controversias.

[Ver Informe Preliminar] [Presentar Controversia]
```

**✅ INTEGRACIÓN:**
```typescript
const { 
  auditoria, 
  guardarDocumento,
  notificarInformePreliminarListo 
} = useIntegracionControlInterno();

// Generar y notificar informe preliminar
const handleEnviarInformePreliminar = async () => {
  // 1. Guardar documento
  await guardarDocumento({
    nombre: `Informe Preliminar ${auditoria.codigo}`,
    tipo: "Informe Preliminar",
    archivo: informeBlob,
    origenModulo: "Etapa de Comunicación",
    auditoriaId: auditoria.id
  });
  
  // 2. Notificar al auditado
  await notificarInformePreliminarListo({
    auditoriaId: auditoria.id,
    codigoAuditoria: auditoria.codigo,
    responsable: auditoria.proceso.responsable,
    email: auditoria.proceso.emailResponsable,
    fechaLimiteRespuesta: calcularFechaLimite(5) // 5 días hábiles
  });
  
  // ✅ AUTOMÁTICO: 
  // - Documento guardado
  // - Notificación enviada
  // - Recordatorio automático 1 día antes del vencimiento
};
```

---

#### **RF008 - Listas de Chequeo**
📁 Responsable: **Auditores**
🔧 Uso: Durante Etapa de Ejecución (RF006)

**¿Qué hace?**
- Biblioteca de listas de chequeo estandarizadas
- Por tipo de proceso (contractual, financiero, etc.)
- Por normativa (Ley 80, Decreto 1082, etc.)
- Permite aplicar durante auditoría
- Genera evidencia de verificación

**Ejemplo - Lista de Chequeo Contractual:**
```
✓ SELECCIÓN DEL CONTRATISTA
  ☑ Se verificó el cumplimiento de requisitos habilitantes
  ☑ Se evaluaron los criterios de selección establecidos
  ☑ Se publicó el proceso en SECOP II
  ☐ Se realizó audiencia de adjudicación (SI APLICA)
  
✓ FORMALIZACIÓN
  ☑ Contrato firmado por las partes
  ☑ Registro presupuestal aprobado
  ☑ Garantías constituidas
  ☑ Publicación en SECOP II
  
✓ EJECUCIÓN
  ☑ Supervisor designado formalmente
  ☑ Informes de supervisión periódicos
  ☐ Modificaciones contractuales justificadas
  ☑ Pago contra entrega de productos
```

**Resultado:**
- % Cumplimiento: 90%
- Hallazgos: 2 (modificaciones sin justificación)
- Estado: Aceptable con observaciones

---

### **FASE 4: GESTIÓN Y MONITOREO**

#### **RF009 - Gestión de Auditorías**
📁 Responsable: **Jefe OCI / Coordinadores**
🎯 Propósito: Dashboard y monitoreo

**¿Qué hace?**
- **Dashboard** con todas las auditorías en tiempo real
- Filtros por estado, auditor, proceso, fecha
- Indicadores de gestión
- Alertas de atrasos
- Reportes de avance

**Vista del Dashboard:**
```
┌─────────────────────────────────────────────────────────────┐
│  GESTIÓN DE AUDITORÍAS - 2025                              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  📊 INDICADORES                                             │
│  ┌──────────┬──────────┬──────────┬──────────┐            │
│  │ Programa │ Planea   │ Ejecuión │ Finaliz  │            │
│  │    3     │    2     │    5     │    2     │            │
│  └──────────┴──────────┴──────────┴──────────┘            │
│                                                             │
│  📋 AUDITORÍAS EN CURSO                                     │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ AUD-2025-001 | Gestión Contractual                  │   │
│  │ Estado: Ejecución | Auditor: Ana García             │   │
│  │ Avance: 65% | Días restantes: 12                    │   │
│  │ ⚠️ Alerta: Papeles de trabajo pendientes            │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │ AUD-2025-002 | Talento Humano                       │   │
│  │ Estado: Comunicación | Auditor: Luis Pérez          │   │
│  │ Avance: 85% | Días restantes: 5                     │   │
│  │ ✅ En tiempo                                          │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

**✅ INTEGRACIÓN:**
```typescript
const { auditorias, obtenerPorEstado } = useIntegracionControlInterno();

// Datos en tiempo real desde contexto global
const stats = {
  programadas: obtenerPorEstado('Programada').length,
  enEjecucion: obtenerPorEstado('Ejecución').length,
  finalizadas: obtenerPorEstado('Finalizada').length
};

// Si se actualiza una auditoría en RF007, 
// el dashboard (RF009) se actualiza automáticamente
```

---

### **FASE 5: HALLAZGOS Y MEJORAS**

#### **RF010 - Gestión de Hallazgos**
📁 Responsable: **Auditor Líder**
⏱️ Momento: Al finalizar Etapa de Comunicación

**¿Qué hace?**
- Registra hallazgos del Informe Final
- Clasifica por tipo y gravedad
- Genera Ficha de Hallazgo
- **Notifica** al responsable del proceso
- Vincula con auditoría

**Tipos de hallazgo:**
- **No Conformidad Mayor:** Incumplimiento grave de norma
- **No Conformidad Menor:** Incumplimiento leve
- **Observación:** Oportunidad de mejora
- **Hallazgo Positivo:** Buena práctica

**Ejemplo de hallazgo:**
```
CÓDIGO: HAL-2025-005
TIPO: No Conformidad Menor
GRAVEDAD: Media

DESCRIPCIÓN:
Se evidenció que 3 de 15 contratos revisados no cuentan con 
informe de supervisión del primer trimestre de ejecución.

PROCESO: Gestión Contractual
RESPONSABLE: Dr. Carlos Rodríguez

CAUSA RAÍZ:
Falta de seguimiento al cronograma de informes de supervisión.

EFECTO:
Riesgo de incumplimiento contractual sin detección oportuna.

CRITERIO INCUMPLIDO:
Manual de Supervisión Contractual ESAP, numeral 5.3

EVIDENCIA:
- Contratos 001-2024, 005-2024, 012-2024
- Carpetas de supervisión sin informes Q1
```

**🔔 NOTIFICACIÓN AUTOMÁTICA:**
```
Para: carlos.rodriguez@esap.edu.co
Asunto: Hallazgo Identificado - HAL-2025-005

Se identificó un hallazgo de tipo "No Conformidad Menor" 
en la auditoría de Gestión Contractual.

Código: HAL-2025-005
Gravedad: Media
Descripción: Informes de supervisión faltantes

Debe formular un Plan de Mejoramiento en los próximos 10 días.

[Ver Hallazgo Completo] [Formular Plan de Mejoramiento]
```

**✅ INTEGRACIÓN:**
```typescript
const { registrarHallazgo, guardarDocumento } = useIntegracionControlInterno();

// Registrar hallazgo
await registrarHallazgo({
  codigoHallazgo: "HAL-2025-005",
  tipo: "No Conformidad Menor",
  gravedad: "Media",
  proceso: "Gestión Contractual",
  responsable: "Dr. Carlos Rodríguez",
  email: "carlos.rodriguez@esap.edu.co",
  auditoriaId: auditoria.id
});

// ✅ AUTOMÁTICO:
// - Vinculado con auditoría en contexto global
// - Notificación "Hallazgo Identificado" enviada
// - Ficha de hallazgo generada y guardada en RF014
```

---

#### **RF011 - Formulación de Planes de Mejoramiento**
📁 Responsable: **Responsable del Proceso (Auditado)**
⏱️ Plazo: 10 días hábiles desde notificación

**¿Qué hace?**
- Responsable formula acciones correctivas
- Define responsables y plazos
- Establece indicadores de cumplimiento
- Carga evidencias de planificación
- Envía a OCI para aprobación

**Estructura del plan:**
```
PLAN DE MEJORAMIENTO: PM-2025-003
HALLAZGO ASOCIADO: HAL-2025-005
RESPONSABLE: Dr. Carlos Rodríguez

┌──────────────────────────────────────────────────────────┐
│ ACCIÓN CORRECTIVA 1                                      │
├──────────────────────────────────────────────────────────┤
│ Descripción:                                             │
│ Implementar sistema de alertas automáticas para         │
│ recordar elaboración de informes de supervisión.         │
│                                                          │
│ Responsable: Coordinador de Contratos                   │
│ Plazo: 30 días (hasta 15 de agosto de 2025)            │
│                                                          │
│ Indicador:                                               │
│ 100% de contratos con informes de supervisión al día    │
│                                                          │
│ Recursos: Sistema de gestión documental existente       │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│ ACCIÓN PREVENTIVA 1                                      │
├──────────────────────────────────────────────────────────┤
│ Descripción:                                             │
│ Capacitar a supervisores en elaboración de informes      │
│ periódicos.                                              │
│                                                          │
│ Responsable: Jefe de Talento Humano                     │
│ Plazo: 45 días (hasta 30 de agosto de 2025)            │
│                                                          │
│ Indicador:                                               │
│ 100% de supervisores capacitados                         │
└──────────────────────────────────────────────────────────┘
```

**Flujo de aprobación:**
```
Responsable      →    OCI         →    Estado
Crea Plan            Revisa            
                     ↓                  
                  ¿Aprueba?            
                     ↓                  
              SÍ ←─┴─→ NO              
              ↓           ↓             
         APROBADO    RECHAZADO         
         (ejecutar)  (reformular)      
```

**🔔 NOTIFICACIONES:**
```
APROBACIÓN:
Para: carlos.rodriguez@esap.edu.co
Asunto: ✓ Plan de Mejoramiento Aprobado - PM-2025-003

Su Plan de Mejoramiento ha sido aprobado por la Oficina 
de Control Interno.

Puede iniciar la ejecución de las acciones correctivas.

Recordatorios automáticos:
- 7 días antes del vencimiento
- Al vencimiento
- Solicitudes de evidencia trimestrales

[Ver Plan Aprobado] [Iniciar Ejecución]

---

RECHAZO:
Para: carlos.rodriguez@esap.edu.co
Asunto: ✗ Plan de Mejoramiento Rechazado - PM-2025-003

Su Plan de Mejoramiento ha sido rechazado.

Observaciones de OCI:
"Las acciones propuestas no abordan la causa raíz 
identificada. Se requiere establecer un mecanismo de 
control preventivo, no solo correctivo."

Por favor, reformule el plan considerando estas observaciones.

[Ver Observaciones Completas] [Editar Plan]
```

**✅ INTEGRACIÓN:**
```typescript
const { aprobarPlan, rechazarPlan, guardarDocumento } = useIntegracionControlInterno();

// Aprobar plan
const handleAprobar = async () => {
  await aprobarPlan({
    planId: plan.id,
    codigoPlan: plan.codigo,
    responsable: plan.responsable,
    email: plan.email,
    aprobadoPor: "Ana García Torres",
    fechaAprobacion: new Date().toISOString().split('T')[0],
    auditoriaId: plan.auditoriaId
  });
  
  // ✅ AUTOMÁTICO:
  // - Vinculado con auditoría
  // - Notificación "Aprobación de Plan" enviada
  // - Plan guardado en RF014
  // - Estado cambiado a "Aprobado"
};

// Rechazar plan
const handleRechazar = async (observaciones) => {
  await rechazarPlan({
    planId: plan.id,
    codigoPlan: plan.codigo,
    responsable: plan.responsable,
    email: plan.email,
    rechazadoPor: "Ana García Torres",
    observaciones
  });
  
  // ✅ AUTOMÁTICO:
  // - Notificación "Rechazo de Plan" enviada
  // - Estado cambiado a "Rechazado"
  // - Permite editar y reenviar
};
```

---

### **FASE 6: SEGUIMIENTO**

#### **RF012 - Seguimiento de Planes de Mejoramiento**
📁 Responsable: **OCI (trimestral) + Responsable (continuo)**
⏱️ Frecuencia: Trimestral

**¿Qué hace?**
- Monitoreo continuo de planes aprobados
- Verificación de evidencias de cumplimiento
- Semáforo de estado (verde/amarillo/rojo)
- Alertas automáticas de vencimientos
- Solicitudes de evidencia
- Verificación de efectividad

**Sistema de seguimiento:**
```
┌────────────────────────────────────────────────────────────┐
│ PM-2025-003 | Informes de Supervisión                      │
├────────────────────────────────────────────────────────────┤
│ Estado: En Ejecución | Semáforo: 🟢 Verde                  │
│ Avance: 60% | Plazo: 30 días restantes                    │
├────────────────────────────────────────────────────────────┤
│                                                            │
│ ACCIÓN 1: Sistema de alertas                              │
│ ┌──────────────────────────────────────────────┐         │
│ │ Estado: Cumplida                              │         │
│ │ Evidencia: ✓ Cargada (15/06/2025)            │         │
│ │ Validación: ✓ Aceptada (20/06/2025)          │         │
│ │ Semáforo: 🟢 Verde                            │         │
│ └──────────────────────────────────────────────┘         │
│                                                            │
│ ACCIÓN 2: Capacitación supervisores                       │
│ ┌──────────────────────────────────────────────┐         │
│ │ Estado: En Proceso                            │         │
│ │ Evidencia: ⏳ Pendiente                       │         │
│ │ Validación: -                                 │         │
│ │ Semáforo: 🟡 Amarillo (vence en 15 días)     │         │
│ └──────────────────────────────────────────────┘         │
└────────────────────────────────────────────────────────────┘
```

**Alertas automáticas:**
```
🔔 7 DÍAS ANTES DEL VENCIMIENTO:
Para: carlos.rodriguez@esap.edu.co
Asunto: Recordatorio: Vence Plan de Mejoramiento en 7 días

El Plan de Mejoramiento PM-2025-003 vence el 15 de agosto.

Acciones pendientes: 1
- Acción 2: Capacitación supervisores (⏳ Pendiente de evidencia)

Por favor, cargue las evidencias de cumplimiento.

[Cargar Evidencia] [Ver Plan]

---

🔴 AL VENCIMIENTO SIN CUMPLIR:
Para: carlos.rodriguez@esap.edu.co
Cc: jefe.oci@esap.edu.co, rector@esap.edu.co
Asunto: ¡URGENTE! Plan de Mejoramiento Vencido

El Plan de Mejoramiento PM-2025-003 venció sin cumplir.

Días vencido: 2
Acciones incumplidas: 1

Se requiere acción inmediata para evitar reporte a entes 
de control.

[Tomar Acción Inmediata]
```

**Validación de evidencias:**
```
┌──────────────────────────────────────────────────────────┐
│ EVIDENCIA CARGADA                                        │
├──────────────────────────────────────────────────────────┤
│ Archivo: Acta_Capacitacion_Supervisores.pdf              │
│ Fecha: 28/08/2025                                        │
│ Cargado por: Carlos Rodríguez                            │
│                                                          │
│ VALIDACIÓN POR OCI:                                      │
│ ┌────────────────────────────────────────────┐          │
│ │ ☑ Aceptado                                 │          │
│ │ ☐ Con Observaciones                        │          │
│ │ ☐ Rechazado                                │          │
│ │                                            │          │
│ │ Comentarios:                               │          │
│ │ La evidencia cumple con lo requerido.      │          │
│ │ Se verifica asistencia del 100% de los     │          │
│ │ supervisores activos.                      │          │
│ │                                            │          │
│ │ Validado por: Ana García Torres            │          │
│ │ Fecha: 30/08/2025                          │          │
│ └────────────────────────────────────────────┘          │
└──────────────────────────────────────────────────────────┘
```

**✅ INTEGRACIÓN (Sistema propio ELIMINADO):**
```typescript
const { 
  enviarRecordatorioPlazo,
  enviarVencimientoCritico,
  solicitarEvidencia,
  guardarDocumento
} = useIntegracionControlInterno();

// ❌ ANTES: Sistema propio de notificaciones
// interface NotificacionTrimestral { ... }
// const enviarNotificacionTrimestral = () => { ... }

// ✅ AHORA: Servicio centralizado
const verificarPlanes = async () => {
  for (const plan of planes) {
    const diasRestantes = calcularDias(plan.fechaVencimiento);
    
    // Recordatorio 7 días antes
    if (diasRestantes === 7) {
      await enviarRecordatorioPlazo({
        titulo: `Recordatorio: Vence Plan en 7 días`,
        mensaje: `Plan ${plan.codigo} vence el ${plan.fechaVencimiento}`,
        elementoId: plan.id,
        codigoElemento: plan.codigo,
        fechaVencimiento: plan.fechaVencimiento,
        diasRestantes: 7,
        responsable: plan.responsable,
        email: plan.email,
        origenModulo: "Seguimiento de Planes de Mejoramiento",
        accionesPendientes: plan.accionesPendientes
      });
    }
    
    // Vencimiento crítico
    if (diasRestantes < 0) {
      await enviarVencimientoCritico({
        titulo: `¡URGENTE! Plan Vencido`,
        elementoId: plan.id,
        codigoElemento: plan.codigo,
        diasVencido: Math.abs(diasRestantes),
        responsable: plan.responsable,
        email: plan.email,
        telefono: plan.telefono,
        origenModulo: "Seguimiento de Planes"
      });
    }
  }
};

// Solicitar evidencia
const handleSolicitarEvidencia = async (accion) => {
  await solicitarEvidencia({
    planId: accion.planId,
    codigoPlan: accion.codigoPlan,
    accionId: accion.id,
    descripcionAccion: accion.descripcion,
    plazo: accion.fechaVencimiento,
    responsable: accion.responsable,
    email: accion.email
  });
};

// Guardar evidencia cargada
const handleCargarEvidencia = async (archivo) => {
  await guardarDocumento({
    nombre: `Evidencia ${accion.codigo}`,
    tipo: "Evidencia de Cumplimiento",
    archivo,
    origenModulo: "Seguimiento de Planes",
    tags: ["evidencia", "cumplimiento", accion.planCodigo]
  });
};
```

---

### **FASE 7: REPORTES E INFORMES**

#### **RF013 - Informes de Ley**
📁 Responsable: **Jefe OCI**
⏱️ Frecuencia: Trimestral / Cuatrimestral / Anual

**¿Qué hace?**
- Genera informes obligatorios para entes de control
- Compila datos de todas las auditorías
- Consolida hallazgos y planes
- Reporta estados de cumplimiento
- Envía a Contraloría, Procuraduría, DAFP

**Tipos de informes:**
```
1. INFORME PORMENORIZADO (Trimestral)
   Destinatario: Contraloría General de la República
   Contenido:
   - Auditorías ejecutadas
   - Hallazgos identificados
   - Planes de mejoramiento formulados
   - Estados de seguimiento
   
2. INFORME EJECUTIVO ANUAL (Anual)
   Destinatario: Rectoría + Consejo Directivo
   Contenido:
   - Gestión anual de OCI
   - Indicadores de gestión
   - Logros y dificultades
   - Plan del año siguiente
   
3. INFORME MECI (Cuatrimestral)
   Destinatario: DAFP
   Contenido:
   - Estado del sistema de control interno
   - Avances en implementación MECI
   - Planes de fortalecimiento
```

**Estructura del Informe Pormenorizado:**
```
INFORME PORMENORIZADO DEL ESTADO DEL CONTROL INTERNO
Período: Enero - Marzo 2025
Entidad: ESAP

1. AUDITORÍAS EJECUTADAS
   ┌──────────────────────────────────────────┐
   │ Total programadas: 3                     │
   │ Finalizadas: 2                           │
   │ En curso: 1                              │
   │ % Cumplimiento: 67%                      │
   └──────────────────────────────────────────┘

2. HALLAZGOS IDENTIFICADOS
   ┌──────────────────────────────────────────┐
   │ No Conformidades Mayores: 1              │
   │ No Conformidades Menores: 3              │
   │ Observaciones: 5                         │
   │ Total: 9                                 │
   └──────────────────────────────────────────┘

3. PLANES DE MEJORAMIENTO
   ┌──────────────────────────────────────────┐
   │ Formulados: 4                            │
   │ Aprobados: 3                             │
   │ En seguimiento: 3                        │
   │ Cumplidos: 1                             │
   └──────────────────────────────────────────┘

4. PRINCIPALES RIESGOS IDENTIFICADOS
   - Debilidades en supervisión contractual
   - Falta de actualización de manuales
   - ...

5. RECOMENDACIONES
   - Fortalecer capacitación en contratación
   - Actualizar procedimientos
   - ...
```

**Recordatorios automáticos:**
```
🔔 7 DÍAS ANTES DEL VENCIMIENTO:
Para: jefe.oci@esap.edu.co
Asunto: Recordatorio: Vence Informe Pormenorizado en 7 días

El Informe Pormenorizado Q1-2025 debe ser enviado a 
Contraloría antes del 15 de abril de 2025.

Días restantes: 7

Estado de preparación:
- Datos consolidados: ✓
- Informe redactado: ⏳ Pendiente
- Revisión Jefe OCI: ⏳ Pendiente

[Generar Informe] [Ver Datos Consolidados]

---

🔴 VENCIMIENTO CRÍTICO:
Para: jefe.oci@esap.edu.co
Cc: rector@esap.edu.co
Asunto: ¡URGENTE! Informe Pormenorizado Vencido

El Informe Pormenorizado Q1-2025 venció hace 2 días.

Fecha de vencimiento: 15/04/2025
Días vencido: 2

Se requiere acción inmediata para evitar sanciones de 
Contraloría.

ENVÍO POR SMS: +57 300 123 4567
```

**✅ INTEGRACIÓN (Sistema propio ELIMINADO):**
```typescript
const { 
  enviarRecordatorioPlazo,
  enviarVencimientoCritico,
  guardarDocumento
} = useIntegracionControlInterno();

// ❌ ANTES: Sistema propio de recordatorios
// const verificarVencimientosInformes = () => { ... }

// ✅ AHORA: Servicio centralizado
const verificarInformes = async () => {
  for (const informe of informes) {
    const diasRestantes = calcularDias(informe.fechaVencimiento);
    
    // Recordatorio 7 días antes
    if (diasRestantes === 7) {
      await enviarRecordatorioPlazo({
        titulo: `Recordatorio: Vence ${informe.nombre} en 7 días`,
        mensaje: `${informe.nombre} vence el ${informe.fechaVencimiento}`,
        elementoId: informe.id,
        codigoElemento: informe.codigo,
        fechaVencimiento: informe.fechaVencimiento,
        diasRestantes: 7,
        responsable: "Jefe OCI",
        email: "jefe.oci@esap.edu.co",
        origenModulo: "Informes de Ley"
      });
    }
    
    // Vencimiento crítico (con SMS)
    if (diasRestantes < 0) {
      await enviarVencimientoCritico({
        titulo: `¡URGENTE! ${informe.nombre} vencido`,
        mensaje: `Venció hace ${Math.abs(diasRestantes)} días`,
        elementoId: informe.id,
        codigoElemento: informe.codigo,
        diasVencido: Math.abs(diasRestantes),
        responsable: "Jefe OCI",
        email: "jefe.oci@esap.edu.co",
        telefono: "+57 300 123 4567", // ← Envía SMS
        origenModulo: "Informes de Ley"
      });
    }
  }
};

// Guardar informe generado
const handleGenerarInforme = async () => {
  await guardarDocumento({
    nombre: `${informe.nombre} ${informe.periodo}`,
    tipo: "Informe de Ley",
    archivo: informeBlob,
    origenModulo: "Informes de Ley",
    sincronizarFileServer: true,
    notificar: true
  });
  
  // ✅ AUTOMÁTICO:
  // - Guardado en RF014
  // - Sincronizado con G:
  // - Notificación de confirmación
  // - Versionado si existe anterior
};
```

---

### **SOPORTE TRANSVERSAL (Durante todo el ciclo)**

#### **RF014 - Gestión Documental**
📁 Función: **Repositorio Centralizado**
🎯 Todos los documentos del ciclo

**¿Qué hace?**
- **Recibe** documentos de TODOS los módulos
- Versionamiento automático
- Sincronización con file server `G:/`
- Control de acceso por roles
- Búsqueda avanzada
- Trazabilidad completa

**Estructura de carpetas:**
```
G:/Control_Interno/Auditorias/
├── 2025/
│   ├── AUD-2025-001_Gestion_Contractual/
│   │   ├── Plan Individual/
│   │   │   └── Plan_Individual_AUD-2025-001_v1.pdf
│   │   ├── Memorando de Asignación/
│   │   │   └── Memorando_0125-2025.pdf
│   │   ├── Programa de Trabajo/
│   │   │   └── Programa_Trabajo_v2.xlsx
│   │   ├── Papeles de Trabajo/
│   │   │   ├── PT_001_Contratos.xlsx
│   │   │   └── PT_002_Entrevistas.docx
│   │   ├── Evidencias/
│   │   │   ├── Contrato_001-2024.pdf
│   │   │   ├── Foto_Archivo_01.jpg
│   │   │   └── ...
│   │   ├── Informes/
│   │   │   ├── Informe_Preliminar_v1.pdf
│   │   │   ├── Informe_Final_v3.pdf
│   │   │   └── Controversia_Auditado.pdf
│   │   ├── Hallazgos/
│   │   │   ├── Ficha_HAL-2025-005.pdf
│   │   │   └── ...
│   │   └── Planes/
│   │       ├── PM-2025-003_v1.pdf
│   │       ├── PM-2025-003_v2.pdf (reformulado)
│   │       └── Evidencias/
│   │           └── Evidencia_Accion_1.pdf
│   │
│   ├── AUD-2025-002_Talento_Humano/
│   │   └── ...
│   └── ...
│
└── Informes_de_Ley/
    ├── 2025/
    │   ├── Pormenorizado_Q1_2025.pdf
    │   ├── Pormenorizado_Q2_2025.pdf
    │   └── Ejecutivo_Anual_2025.pdf
    └── ...
```

**Todos los módulos guardan aquí:**
```typescript
// RF004 guarda Plan Individual
// RF005 guarda Memorando, Programa
// RF006 guarda Papeles, Evidencias
// RF007 guarda Informes
// RF010 guarda Fichas de Hallazgo
// RF011 guarda Planes
// RF012 guarda Evidencias de cumplimiento
// RF013 guarda Informes de Ley

// ✅ TODO centralizado
// ✅ TODO versionado
// ✅ TODO sincronizado con G:
// ✅ TODO con trazabilidad
```

---

#### **RF015 - Sistema de Notificaciones**
📁 Función: **Central de Comunicaciones**
🎯 Todas las notificaciones del sistema

**¿Qué hace?**
- **Recibe** solicitudes de TODOS los módulos
- Envía por múltiples canales (Sistema, Email, SMS)
- Gestiona prioridades
- Agrupa notificaciones similares
- Respeta preferencias del usuario
- Registro de trazabilidad

**Todos los módulos notifican aquí:**
```typescript
// RF003 → Anuncio de Auditoría
// RF007 → Informe Preliminar Listo
// RF010 → Hallazgo Identificado
// RF011 → Aprobación/Rechazo de Plan
// RF012 → Recordatorio de Plazo, Solicitud de Evidencia
// RF013 → Recordatorio/Vencimiento de Informes
// RF014 → Confirmación de Recepción (automática)

// ✅ TODAS centralizadas
// ✅ TODAS con prioridad configurada
// ✅ TODAS con canales automáticos
// ✅ TODAS registradas
```

**Centro de notificaciones del usuario:**
```
┌────────────────────────────────────────────────────────┐
│ 🔔 NOTIFICACIONES (5 nuevas)                          │
├────────────────────────────────────────────────────────┤
│                                                        │
│ 🔴 ALTA - Hace 2 horas                                │
│ Hallazgo Identificado - HAL-2025-005                  │
│ Se identificó una no conformidad en su proceso...     │
│ [Ver Hallazgo] [Formular Plan]                        │
│                                                        │
│ 🟡 MEDIA - Hace 5 horas                               │
│ Recordatorio: Vence Plan en 7 días                    │
│ El Plan PM-2025-003 vence el 15 de agosto...         │
│ [Cargar Evidencia] [Ver Plan]                         │
│                                                        │
│ 🟢 BAJA - Ayer                                        │
│ Documento guardado correctamente                      │
│ El documento "Evidencia Acción 1" se guardó...       │
│ [Ver Documento]                                        │
└────────────────────────────────────────────────────────┘
```

---

## 🔄 FLUJO COMPLETO - EJEMPLO REAL

### **Caso Práctico: Auditoría de Gestión Contractual**

```
┌─────────────────────────────────────────────────────────────┐
│ ENERO 2025 - PLANIFICACIÓN                                  │
└─────────────────────────────────────────────────────────────┘

15/01: RF001 - Jefe OCI aprueba Plan Anual 2025
       → 12 auditorías programadas
       
20/01: RF002 - Equipo analiza Universo de Procesos
       → 45 procesos disponibles
       → Prioriza 15 por riesgo
       
30/01: RF003 - Se programa AUD-2025-001
       → Proceso: Gestión Contractual
       → Auditor Líder: Ana García Torres
       → Fechas: Mayo-Julio
       ✉️ Notificación a Director de Contratación

┌─────────────────────────────────────────────────────────────┐
│ MAYO 2025 - PREPARACIÓN                                     │
└─────────────────────────────────────────────────────────────┘

05/05: RF004 - Ana García crea Plan Individual
       ✅ Datos pre-cargados desde RF003
       → Define 5 objetivos específicos
       → Establece alcance (contratos 2024)
       📄 Genera PDF
       💾 Guarda en RF014
       ✉️ Confirmación de recepción

10/05: RF005 - Etapa de PLANEACIÓN
       → Genera Memorando de Asignación
       → Solicita documentación
       → Crea Programa de Trabajo
       📄 3 documentos generados
       💾 Todos en RF014
       ✉️ Memorando enviado oficialmente

┌─────────────────────────────────────────────────────────────┐
│ MAYO-JUNIO 2025 - EJECUCIÓN                                 │
└─────────────────────────────────────────────────────────────┘

27/05: RF006 - Inicio Etapa de EJECUCIÓN
       → Revisión de 15 contratos
       → Aplicación de RF008 (Listas de Chequeo)
       → Recopilación de evidencias
       💾 25 evidencias guardadas en RF014
       
05/06: Identificación de hallazgo preliminar
       → 3 contratos sin informes de supervisión
       
20/06: Fin de ejecución
       → 15 contratos revisados
       → 3 hallazgos identificados
       → 25 evidencias recopiladas

┌─────────────────────────────────────────────────────────────┐
│ JUNIO-JULIO 2025 - COMUNICACIÓN                             │
└─────────────────────────────────────────────────────────────┘

23/06: RF007 - Genera Informe Preliminar
       📄 PDF con 3 hallazgos
       💾 Guarda en RF014
       ✉️ Notifica a Director (5 días para responder)
       
28/06: Director presenta controversia
       → Acepta 2 hallazgos
       → Controvierte 1 (aporta evidencia adicional)
       
02/07: Ana García analiza controversia
       → Acepta evidencia aportada
       → Ajusta hallazgo controvertido
       
05/07: Genera Informe Final
       📄 PDF con 2 hallazgos definitivos
       💾 Guarda en RF014
       ✉️ Notifica a Director
       
       🎯 Auditoría FINALIZADA
       → Estado cambia en contexto global
       → RF009 actualiza dashboard automáticamente

┌─────────────────────────────────────────────────────────────┐
│ JULIO 2025 - HALLAZGOS Y PLANES                             │
└─────────────────────────────────────────────────────────────┘

08/07: RF010 - Ana García registra hallazgos
       → HAL-2025-005 (No Conformidad Menor)
       → HAL-2025-006 (Observación)
       📄 2 Fichas de Hallazgo
       💾 Guarda en RF014
       🔗 Vincula con AUD-2025-001
       ✉️ Notifica a Director
       
15/07: RF011 - Director formula Plan PM-2025-003
       → 2 acciones correctivas
       → 1 acción preventiva
       → Plazos: 30-45 días
       📄 PDF del plan
       💾 Guarda en RF014
       → Envía a OCI para aprobación
       
18/07: Ana García aprueba plan
       ✅ Plan aprobado
       ✉️ Notifica a Director
       → Estado: "Aprobado - En Ejecución"

┌─────────────────────────────────────────────────────────────┐
│ AGOSTO 2025 - SEGUIMIENTO                                   │
└─────────────────────────────────────────────────────────────┘

08/08: RF012 - Recordatorio automático (7 días antes)
       ✉️ Email a Director: "Vence plan en 7 días"
       
13/08: Director carga evidencia Acción 1
       📄 Captura de pantalla del sistema
       💾 Guarda en RF014
       
15/08: Ana García valida evidencia
       ✅ Aceptada
       → Acción 1: CUMPLIDA
       
25/08: Director carga evidencia Acción 2
       📄 Acta de capacitación
       💾 Guarda en RF014
       
28/08: Ana García valida evidencia
       ✅ Aceptada
       → Acción 2: CUMPLIDA
       
30/08: Plan completamente cumplido
       🎯 PM-2025-003 CERRADO
       ✉️ Notifica a Director: "Plan cumplido exitosamente"

┌─────────────────────────────────────────────────────────────┐
│ SEPTIEMBRE 2025 - INFORME TRIMESTRAL                        │
└─────────────────────────────────────────────────────────────┘

25/09: RF013 - Recordatorio automático
       ✉️ Email a Jefe OCI: "Vence Informe Pormenorizado en 7 días"
       
02/10: Jefe OCI genera Informe Q3-2025
       → Consolida datos de AUD-2025-001 y otras
       → Incluye hallazgos y planes
       📄 PDF de 35 páginas
       💾 Guarda en RF014
       → Envía a Contraloría
       
       ✅ CICLO COMPLETO

RESULTADO FINAL:
- 1 Auditoría ejecutada
- 2 Hallazgos identificados
- 1 Plan de Mejoramiento formulado y cumplido
- 30+ documentos generados y centralizados
- 15+ notificaciones automáticas enviadas
- 100% trazabilidad
- 0% inconsistencias
```

---

## 🎯 RESUMEN DEL FLUJO

### **Etapas del Ciclo:**
1. **Planificación** (RF001-003) → Define QUÉ auditar
2. **Preparación** (RF004-005) → Define CÓMO auditar
3. **Ejecución** (RF006-008) → EJECUTA la auditoría
4. **Comunicación** (RF007) → COMUNICA resultados
5. **Hallazgos** (RF010) → IDENTIFICA problemas
6. **Mejora** (RF011) → FORMULA soluciones
7. **Seguimiento** (RF012) → VERIFICA cumplimiento
8. **Reporte** (RF013) → INFORMA a entes externos

### **Soporte Transversal:**
- **RF014** → TODOS los documentos
- **RF015** → TODAS las notificaciones
- **RF009** → MONITOREO continuo

### **Integraciones Clave:**
✅ **Contexto Global** → Modelo único de auditoría  
✅ **Gestión Documental** → Documentos centralizados  
✅ **Notificaciones** → Comunicaciones automáticas  

---

**¿Te queda claro el flujo completo?** 🎯
