# 🔄 Sistema de Sincronización Automática de Términos

## 📋 Descripción General

El módulo de **Control de Términos e Informes** es un **MÓDULO TRANSVERSAL** que consolida TODOS los términos procesales y administrativos de TODOS los módulos de Gestión Legal.

Este documento explica cómo funciona la auto-generación de términos.

---

## 🎯 Objetivo

**Eliminar el trabajo manual** de identificar y registrar términos legales. El sistema:

1. ✅ **Detecta automáticamente** cuando se crea un expediente en cualquier módulo
2. ✅ **Identifica los términos legales** asociados según normativa vigente
3. ✅ **Calcula fechas de vencimiento** considerando días hábiles/calendario
4. ✅ **Auto-genera la solicitud** en el módulo de Términos
5. ✅ **Sincroniza cambios** bidireccionales con el expediente original

---

## 🏗️ Arquitectura del Sistema

```
┌─────────────────────────────────────────────────────────────┐
│           MÓDULOS DE GESTIÓN LEGAL (ORIGEN)                 │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  📁 Defensa Judicial  →  Expediente PJ-2025-001             │
│     ├─ Tipo: Tutela                                         │
│     ├─ Fecha Notificación: 25/12/2025                       │
│     └─ Etapa: NOTIFICACIÓN                                  │
│                        ↓                                     │
│                   [GATILLO]                                  │
│                        ↓                                     │
├─────────────────────────────────────────────────────────────┤
│              CONFIGURACIÓN DE TÉRMINOS LEGALES              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  📋 Config: Respuesta a Tutela                              │
│     ├─ Días Legales: 2 días calendario                      │
│     ├─ Es Improrrogable: SÍ                                 │
│     ├─ Base Normativa: Decreto 2591/1991                    │
│     └─ Consecuencia: Desacato + multa                       │
│                        ↓                                     │
│                [AUTO-GENERACIÓN]                             │
│                        ↓                                     │
├─────────────────────────────────────────────────────────────┤
│           MÓDULO DE TÉRMINOS E INFORMES (DESTINO)           │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  📊 Término Auto-Generado: TER-DJ-001-RES                   │
│     ├─ Tipo: Respuesta a Tutela                             │
│     ├─ Fecha Vencimiento: 27/12/2025 (calculada)            │
│     ├─ Días Restantes: 2 (calculados)                       │
│     ├─ Prioridad: CRÍTICA (semáforo rojo)                   │
│     ├─ Módulo Origen: DEFENSA_JUDICIAL                      │
│     ├─ Expediente Relacionado: PJ-2025-001 (link)           │
│     └─ Improrrogable: SÍ                                    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 📁 Estructura de Archivos

### 1. **Configuración de Términos**
`/config/terminosLegales.ts`

Define los términos legales según el tipo de proceso:

```typescript
TERMINOS_DEFENSA_JUDICIAL = {
  'Tutela': [
    {
      nombre: 'Respuesta a Tutela',
      diasLegales: 2,
      esHabil: false,
      esImprorrogable: true,
      baseNormativa: 'Decreto 2591/1991',
      consecuenciaIncumplimiento: 'Desacato',
      etapaGatillo: 'NOTIFICACIÓN'
    }
  ],
  'NRD Art.138': [
    {
      nombre: 'Contestación de Demanda NRD',
      diasLegales: 30,
      esHabil: true,
      baseNormativa: 'Ley 1437/2011'
    }
  ]
}
```

### 2. **Servicio de Sincronización**
`/services/sincronizacionTerminos.ts`

Contiene la lógica de auto-generación:

```typescript
export function sincronizarTodosLosTerminos(
  expedientesJudiciales: ExpedienteJudicial[],
  procesosDisciplinarios: ProcesoDisciplinario[]
): SolicitudInforme[] {
  // Lee todos los módulos
  // Genera términos automáticamente
  // Retorna lista consolidada
}
```

### 3. **Modelo de Datos Extendido**
`/core/types.ts`

Campos de integración transversal:

```typescript
export interface SolicitudInforme {
  // Campos básicos
  id: string;
  fechaVencimiento: Date;
  
  // 🔗 INTEGRACIÓN TRANSVERSAL
  moduloOrigen?: ModuloOrigen;
  tipoTermino?: TipoTermino;
  expedienteRelacionado?: string;
  esImprorrogable?: boolean;
  baseNormativa?: string;
  consecuenciaIncumplimiento?: string;
}
```

---

## 🔄 Flujo de Auto-Generación

### Paso 1: Evento Gatillo
```typescript
// Cuando se crea/actualiza un expediente
ExpedienteJudicial.onCreate(expediente => {
  // Trigger: Nuevo expediente creado
})
```

### Paso 2: Identificar Términos Aplicables
```typescript
const configuraciones = obtenerTerminosPorModulo(
  'DEFENSA_JUDICIAL',
  expediente.medioControl // 'Tutela'
);
```

### Paso 3: Calcular Fechas
```typescript
const fechaVencimiento = calcularFechaVencimiento(
  expediente.fechaNotificacion,
  config.diasLegales, // 2
  config.esHabil       // false
);
```

### Paso 4: Generar Término
```typescript
const termino: SolicitudInforme = {
  id: 'TER-DJ-001-RES',
  tipoInforme: 'Respuesta a Tutela',
  fechaVencimiento: fechaVencimiento,
  diasRestantes: calcularDiasRestantes(...),
  moduloOrigen: 'DEFENSA_JUDICIAL',
  expedienteRelacionado: 'PJ-2025-001'
};
```

---

## 📊 Tipos de Términos Soportados

### 1. TÉRMINOS JUDICIALES
- **Origen**: Defensa Judicial
- **Ejemplos**: 
  - Respuesta a tutela (2 días calendario)
  - Contestación de demanda NRD (30 días hábiles)
  - Recurso de apelación (10 días hábiles)
- **Característica**: Improrrogables, perentorios

### 2. TÉRMINOS DISCIPLINARIOS
- **Origen**: Juzgamiento Disciplinario
- **Ejemplos**:
  - Descargos (10 días hábiles)
  - Recurso de apelación (10 días hábiles)
- **Característica**: Improrrogables según Ley 1952/2019

### 3. TÉRMINOS ADMINISTRATIVOS
- **Origen**: Centro de Comunicaciones
- **Ejemplos**:
  - Derecho de petición (15 días calendario)
  - Consulta ciudadana (30 días calendario)
- **Característica**: Silencio administrativo si no se responde

### 4. TÉRMINOS DE ÓRGANOS DE CONTROL
- **Origen**: Órganos de Control
- **Ejemplos**:
  - Respuesta a CGR (15 días calendario)
  - Informe a Procuraduría (10 días calendario)
- **Característica**: Posible hallazgo si no se cumple

### 5. SLA INTERNOS
- **Origen**: Asesoría Jurídica
- **Ejemplos**:
  - Concepto jurídico (10 días hábiles)
  - Revisión contractual (5 días hábiles)
- **Característica**: Acuerdos de nivel de servicio

---

## 🎨 Reglas de Semáforo

El sistema asigna automáticamente prioridades:

| Días Restantes | Color | Prioridad | Acción |
|----------------|-------|-----------|--------|
| ≤ 2 días | 🔴 ROJO | CRÍTICA | Acción inmediata |
| 3-5 días | 🟡 AMARILLO | URGENTE | Planear acción |
| > 5 días | 🟢 VERDE | NORMAL | Monitoreo |
| Vencido | ⚫ NEGRO | CRÍTICA | Escalamiento |

---

## 📅 Cálculo de Días Hábiles

El sistema distingue entre:

### Días Calendario
```typescript
// Tutelas, derechos de petición
fechaVencimiento = fechaInicio + diasLegales
```

### Días Hábiles
```typescript
// Contestaciones judiciales, descargos
// Excluye sábados, domingos y festivos
let diasContados = 0;
while (diasContados < diasLegales) {
  fecha++;
  if (!esFestivo && !esFinDeSemana) {
    diasContados++;
  }
}
```

---

## 🔗 Integración Bidireccional

### Del Expediente al Término
```typescript
// Cuando cambia el expediente
ExpedienteJudicial.onChange(expediente => {
  // Actualizar término relacionado
  Termino.update({
    where: { expedienteRelacionado: expediente.id },
    data: { /* cambios */ }
  });
});
```

### Del Término al Expediente
```typescript
// Cuando se cumple el término
Termino.onComplete(termino => {
  // Marcar actuación en el expediente
  ExpedienteJudicial.addActuacion({
    tipo: 'Cumplimiento de término',
    fecha: new Date()
  });
});
```

---

## 📈 Ejemplo Completo: Tutela

### 1. Se crea expediente
```typescript
const expediente = {
  id: 'PJ-2025-001',
  medioControl: 'Tutela',
  fechaNotificacion: new Date('2025-12-25'),
  etapa: 'NOTIFICACIÓN'
};
```

### 2. Sistema detecta configuración
```typescript
Config = TERMINOS_DEFENSA_JUDICIAL['Tutela'][0]
// → Respuesta a Tutela, 2 días calendario
```

### 3. Calcula vencimiento
```typescript
fechaVencimiento = 2025-12-25 + 2 días = 2025-12-27
```

### 4. Genera término automáticamente
```typescript
const termino = {
  id: 'TER-DJ-001-RES',
  tipoInforme: 'Respuesta a Tutela',
  fechaVencimiento: new Date('2025-12-27'),
  diasRestantes: 2,
  prioridad: 'CRÍTICA',
  moduloOrigen: 'DEFENSA_JUDICIAL',
  expedienteRelacionado: 'PJ-2025-001',
  esImprorrogable: true
};
```

### 5. Aparece en el módulo de Términos
- ✅ Vista Timeline: Primero en la lista (2 días)
- ✅ Vista Calendario: 27 de diciembre con punto rojo
- ✅ Filtro por módulo: Aparece en "Defensa Judicial"

---

## 🚀 Activación del Sistema

### Modo Actual (Mock Manual)
```typescript
// En datosSolicitudesInformes.ts
export const solicitudesInformesMock = [...]; // Manual
```

### Modo Sincronización Automática
```typescript
// Descomentar esta línea:
export const solicitudesConsolidadas = generarTerminosConsolidados();

// Usar en el componente:
const [solicitudes] = useState(solicitudesConsolidadas);
```

---

## 💡 Beneficios

1. ✅ **Cero trabajo manual**: No hay que registrar términos manualmente
2. ✅ **Cero errores de cálculo**: Las fechas se calculan automáticamente
3. ✅ **100% trazabilidad**: Cada término está vinculado a su expediente
4. ✅ **Alertas tempranas**: Semáforo automático según días restantes
5. ✅ **Vista consolidada**: Todos los términos en un solo lugar
6. ✅ **Filtros inteligentes**: Por módulo, tipo, prioridad
7. ✅ **Base normativa**: Cada término incluye su fundamento legal
8. ✅ **Consecuencias claras**: Qué pasa si no se cumple el término

---

## 🔧 Próximos Pasos (Producción Real)

1. **Conectar con eventos reales**: Usar webhooks cuando se crean expedientes
2. **Notificaciones automáticas**: Email/SMS según semáforo
3. **Dashboard ejecutivo**: Gráficos de cumplimiento
4. **Inteligencia artificial**: Predecir riesgos de incumplimiento
5. **Integración con calendario**: Sincronizar con Google Calendar/Outlook

---

## 📚 Referencias Normativas

- **Ley 1437 de 2011** (CPACA): Términos judiciales contenciosos
- **Decreto 2591 de 1991**: Tutelas
- **Ley 1952 de 2019**: Código Disciplinario
- **Ley 1755 de 2015**: Derecho de petición
- **Ley 610 de 2000**: Responsabilidad fiscal

---

**Desarrollado por**: Sistema de Gestión Legal ESAP 2025  
**Versión**: 1.0  
**Última actualización**: Diciembre 2025
