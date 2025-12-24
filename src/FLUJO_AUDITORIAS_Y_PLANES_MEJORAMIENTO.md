# 🔄 FLUJO: AUDITORÍAS Y PLANES DE MEJORAMIENTO

**Fecha:** 24 Diciembre 2025  
**Objetivo:** Explicar cómo interactúan las Auditorías con los Planes de Mejoramiento

---

## 🎯 CONCEPTO CLAVE

### **¿Qué es un Plan de Mejoramiento?**

Un **Plan de Mejoramiento** es un documento que se crea **DESPUÉS** de una auditoría para **corregir los hallazgos** encontrados.

```
AUDITORÍA → HALLAZGOS → PLAN DE MEJORAMIENTO → SEGUIMIENTO
```

---

## 📊 FLUJO COMPLETO DEL PROCESO

### **FASE 1: PLANIFICACIÓN**

```
┌─────────────────────────────────────────┐
│   MÓDULO: Planificación                 │
├─────────────────────────────────────────┤
│ 1. Plan Anual de Auditorías             │
│    → Se define qué auditar en el año    │
│                                          │
│ 2. Programa Anual                        │
│    → Se programa fecha de cada auditoría │
│                                          │
│ 3. Inicio de Auditoría                   │
│    → Se crea la auditoría oficialmente   │
└─────────────────────────────────────────┘
```

**Resultado:** Se crea una auditoría programada

**Ejemplo:**
- Código: `AUD-2025-005`
- Nombre: "Auditoría de Gestión Financiera"
- Área: Dirección Administrativa y Financiera
- Responsable: María González Ramírez
- Fecha programada: Febrero 2025

---

### **FASE 2: EJECUCIÓN DE LA AUDITORÍA**

```
┌─────────────────────────────────────────┐
│   MÓDULO: Dashboard Kanban              │
├─────────────────────────────────────────┤
│ 1. PLANEACIÓN                            │
│    → Se define alcance y metodología     │
│                                          │
│ 2. EJECUCIÓN                             │
│    → Se realizan pruebas y revisiones    │
│    → Se ENCUENTRAN HALLAZGOS ⚠️         │
│                                          │
│ 3. COMUNICACIÓN                          │
│    → Se genera informe final             │
│    → Se documentan todos los hallazgos   │
└─────────────────────────────────────────┘
```

**Resultado:** Informe de auditoría con hallazgos

**Ejemplo de Hallazgos encontrados:**

1. **Hallazgo GRAVE:** Falta de conciliaciones bancarias mensuales
2. **Hallazgo MODERADO:** Documentación de gastos incompleta
3. **Hallazgo LEVE:** Retraso en reportes presupuestales

---

### **FASE 3: FORMULACIÓN DEL PLAN DE MEJORAMIENTO**

```
┌─────────────────────────────────────────┐
│   MÓDULO: Planes de Mejoramiento        │
│   TAB: Formulación                       │
├─────────────────────────────────────────┤
│ ⚠️ Se reciben los HALLAZGOS              │
│                                          │
│ Por cada hallazgo:                       │
│ ✅ Se crea ACCIÓN CORRECTIVA             │
│    - ¿Qué se va a hacer?                 │
│    - ¿Quién es responsable?              │
│    - ¿Cuándo inicia y termina?           │
│    - ¿Qué evidencias se entregarán?      │
│                                          │
│ 📤 Se envía el plan para aprobación      │
└─────────────────────────────────────────┘
```

**Resultado:** Plan de Mejoramiento formulado

**Ejemplo de Acciones Correctivas:**

Para el **Hallazgo 1** (Falta de conciliaciones bancarias):

| Campo | Valor |
|-------|-------|
| **Acción** | Implementar software de conciliación bancaria y realizar conciliaciones mensuales |
| **Responsable** | Carlos Méndez Torres |
| **Cargo** | Contador Principal |
| **Fecha Inicio** | 01/02/2025 |
| **Fecha Fin** | 30/04/2025 |
| **Evidencias** | - Acta de adquisición de software<br>- Conciliaciones mensuales de feb, mar, abr |

---

### **FASE 4: SEGUIMIENTO AL PLAN**

```
┌─────────────────────────────────────────┐
│   MÓDULO: Planes de Mejoramiento        │
│   TAB: Seguimiento                       │
├─────────────────────────────────────────┤
│ 📊 Se monitorean las acciones:          │
│                                          │
│ ✅ COMPLETADAS: 2 acciones               │
│ 🔄 EN PROCESO: 3 acciones                │
│ ⏳ PENDIENTES: 1 acción                  │
│ ⚠️ VENCIDAS: 0 acciones                  │
│                                          │
│ Por cada acción:                         │
│ - Ver avance actual                      │
│ - Verificar evidencias cargadas          │
│ - Enviar recordatorios                   │
│ - Marcar como completada                 │
└─────────────────────────────────────────┘
```

**Resultado:** Seguimiento continuo hasta que todas las acciones estén completadas

---

## 🔗 RELACIÓN ENTRE MÓDULOS

### **Flujo de Datos:**

```
┌──────────────────────┐
│  1. PLANIFICACIÓN    │
│  (RF001-004)         │
└──────────┬───────────┘
           │
           │ Se crea auditoría
           ↓
┌──────────────────────┐
│  2. DASHBOARD KANBAN │
│  (Centro Comando)    │
│                      │
│  • Planeación        │
│  • Ejecución         │
│  • Comunicación      │
└──────────┬───────────┘
           │
           │ Se encuentran HALLAZGOS
           ↓
┌──────────────────────┐
│  3. PLANES DE        │
│     MEJORAMIENTO     │
│  (RF010-011)         │
│                      │
│  Tab: Formulación    │
│  → Crear acciones    │
│                      │
│  Tab: Seguimiento    │
│  → Monitorear avance │
└──────────────────────┘
```

---

## 📋 EJEMPLO COMPLETO PASO A PASO

### **PASO 1: SE PROGRAMA LA AUDITORÍA**

**Módulo:** Planificación  
**Acción:** Se crea auditoría en el Programa Anual

```
┌─────────────────────────────────────┐
│ AUDITORÍA PROGRAMADA                │
├─────────────────────────────────────┤
│ Código: AUD-2025-005                │
│ Nombre: Auditoría Gestión Financiera│
│ Área: Dir. Administrativa           │
│ Fecha: Febrero 2025                 │
│ Estado: PROGRAMADA                  │
└─────────────────────────────────────┘
```

---

### **PASO 2: SE EJECUTA LA AUDITORÍA**

**Módulo:** Dashboard Kanban  
**Acción:** Se mueve la tarjeta por las columnas

```
PROGRAMADA → PLANEACIÓN → EJECUCIÓN → COMUNICACIÓN → FINALIZADA
                                  ↑
                            Aquí se encuentran
                            los HALLAZGOS
```

Durante la **EJECUCIÓN**, el auditor encuentra:

```
┌─────────────────────────────────────────────┐
│ HALLAZGO #1 (GRAVE)                         │
├─────────────────────────────────────────────┤
│ Título: Falta de conciliaciones bancarias   │
│                                             │
│ Descripción:                                │
│ No se realizan conciliaciones bancarias     │
│ mensuales, solo trimestrales.               │
│                                             │
│ Causas:                                     │
│ ✗ Falta de personal capacitado              │
│ ✗ Procesos manuales lentos                  │
│ ✗ No hay software especializado             │
│                                             │
│ Efectos:                                    │
│ ⚠️ Riesgo de fraude no detectado            │
│ ⚠️ Información financiera inexacta          │
│ ⚠️ Posibles observaciones de contraloría    │
│                                             │
│ Recomendaciones:                            │
│ ✅ Implementar software de conciliación     │
│ ✅ Capacitar personal                       │
│ ✅ Establecer calendario mensual            │
└─────────────────────────────────────────────┘
```

---

### **PASO 3: SE GENERA EL INFORME**

**Módulo:** Dashboard Kanban (Fase Comunicación)  
**Acción:** Se crea informe final con todos los hallazgos

```
┌─────────────────────────────────────────┐
│ INFORME DE AUDITORÍA                    │
│ AUD-2025-005                            │
├─────────────────────────────────────────┤
│ Hallazgos Encontrados:                  │
│                                         │
│ 🔴 1 GRAVE                              │
│    → Conciliaciones bancarias           │
│                                         │
│ 🟡 1 MODERADO                           │
│    → Documentación incompleta           │
│                                         │
│ 🟢 1 LEVE                               │
│    → Retraso en reportes                │
│                                         │
│ Total: 3 hallazgos                      │
│                                         │
│ ⚠️ REQUIERE PLAN DE MEJORAMIENTO        │
└─────────────────────────────────────────┘
```

---

### **PASO 4: SE NOTIFICA AL ÁREA AUDITADA**

**Módulo:** Notificaciones (dentro de Configuraciones)  
**Acción:** Se envía notificación al responsable del área

```
┌─────────────────────────────────────────┐
│ 🔔 NUEVA NOTIFICACIÓN                   │
├─────────────────────────────────────────┤
│ Para: María González Ramírez            │
│ Cargo: Directora Administrativa         │
│                                         │
│ Asunto: Informe de Auditoría            │
│                                         │
│ La auditoría AUD-2025-005 ha finalizado │
│ con 3 hallazgos. Debe formular un Plan  │
│ de Mejoramiento dentro de 30 días.      │
│                                         │
│ Fecha límite: 15/02/2025                │
│                                         │
│ [Ver Informe] [Formular Plan]           │
└─────────────────────────────────────────┘
```

---

### **PASO 5: SE FORMULA EL PLAN DE MEJORAMIENTO**

**Módulo:** Planes de Mejoramiento (Tab: Formulación)  
**Acción:** El área auditada crea acciones correctivas para cada hallazgo

```
┌─────────────────────────────────────────────────────┐
│ PLAN DE MEJORAMIENTO - AUD-2025-005                 │
├─────────────────────────────────────────────────────┤
│ Auditoría: Gestión Financiera                       │
│ Área: Dirección Administrativa                      │
│ Responsable: María González Ramírez                 │
│ Fecha Límite: 15/02/2025                            │
│                                                     │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                     │
│ 🔴 HALLAZGO #1 (GRAVE)                              │
│ Falta de conciliaciones bancarias mensuales        │
│                                                     │
│ ✅ ACCIÓN CORRECTIVA #1.1                           │
│ Implementar software de conciliación bancaria      │
│                                                     │
│ Responsable: Carlos Méndez Torres                  │
│ Cargo: Contador Principal                          │
│ Fecha Inicio: 01/02/2025                           │
│ Fecha Fin: 30/04/2025                              │
│                                                     │
│ Evidencias a entregar:                             │
│ □ Acta de adquisición de software                  │
│ □ Manual de usuario del software                   │
│ □ Conciliación bancaria febrero 2025               │
│ □ Conciliación bancaria marzo 2025                 │
│ □ Conciliación bancaria abril 2025                 │
│                                                     │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                     │
│ ✅ ACCIÓN CORRECTIVA #1.2                           │
│ Capacitar personal en conciliaciones              │
│                                                     │
│ Responsable: Laura Sánchez Díaz                    │
│ Cargo: Jefe de Capacitación                        │
│ Fecha Inicio: 15/02/2025                           │
│ Fecha Fin: 28/02/2025                              │
│                                                     │
│ Evidencias a entregar:                             │
│ □ Lista de asistencia a capacitación               │
│ □ Certificados de capacitación                     │
│ □ Evaluación post-capacitación                     │
│                                                     │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                     │
│ 🟡 HALLAZGO #2 (MODERADO)                           │
│ Documentación de gastos incompleta                 │
│                                                     │
│ ✅ ACCIÓN CORRECTIVA #2.1                           │
│ Crear checklist de documentos por tipo de gasto   │
│                                                     │
│ ... (más acciones)                                 │
│                                                     │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                     │
│ Total: 6 acciones correctivas                      │
│                                                     │
│ [Guardar Borrador] [Enviar para Aprobación]        │
└─────────────────────────────────────────────────────┘
```

---

### **PASO 6: SE APRUEBA EL PLAN**

**Módulo:** Planes de Mejoramiento  
**Acción:** El jefe de Control Interno aprueba el plan

```
┌─────────────────────────────────────────┐
│ PLAN DE MEJORAMIENTO                    │
│ Estado: ✅ APROBADO                     │
├─────────────────────────────────────────┤
│ Aprobado por: Fernando Ávila            │
│ Cargo: Jefe Oficina Control Interno     │
│ Fecha: 10/02/2025                       │
│                                         │
│ Observaciones:                          │
│ Plan completo y coherente. Aprobado.    │
│ Se espera cumplimiento de plazos.       │
└─────────────────────────────────────────┘
```

---

### **PASO 7: SE HACE SEGUIMIENTO**

**Módulo:** Planes de Mejoramiento (Tab: Seguimiento)  
**Acción:** Se monitorea el avance de cada acción

```
┌─────────────────────────────────────────────────────┐
│ SEGUIMIENTO - PLAN AUD-2025-005                     │
├─────────────────────────────────────────────────────┤
│ Progreso General: ████████░░░░░░ 45%                │
│                                                     │
│ ✅ COMPLETADAS: 2/6 acciones                        │
│ 🔄 EN PROCESO: 3/6 acciones                         │
│ ⏳ PENDIENTES: 1/6 acciones                         │
│                                                     │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                     │
│ ✅ ACCIÓN #1.1 - COMPLETADA                         │
│ Implementar software de conciliación               │
│                                                     │
│ Estado: ✅ Completada el 25/02/2025                 │
│ Responsable: Carlos Méndez Torres                  │
│                                                     │
│ Evidencias cargadas:                               │
│ ✅ Acta de adquisición.pdf                          │
│ ✅ Manual_usuario.pdf                               │
│ ✅ Conciliacion_feb_2025.xlsx                       │
│                                                     │
│ Verificado por: Fernando Ávila                     │
│                                                     │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                     │
│ 🔄 ACCIÓN #1.2 - EN PROCESO                         │
│ Capacitar personal en conciliaciones              │
│                                                     │
│ Estado: 🔄 En proceso (60% avance)                  │
│ Responsable: Laura Sánchez Díaz                    │
│ Fecha límite: 28/02/2025 (3 días restantes)        │
│                                                     │
│ Evidencias cargadas:                               │
│ ✅ Lista_asistencia.pdf                             │
│ ✅ Certificados_capacitacion.pdf                    │
│ ⏳ Pendiente: Evaluación post-capacitación         │
│                                                     │
│ [Ver Detalle] [Enviar Recordatorio]                │
│                                                     │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                     │
│ ⏳ ACCIÓN #2.1 - PENDIENTE                          │
│ Crear checklist de documentos                      │
│                                                     │
│ Estado: ⏳ Pendiente                                │
│ Responsable: Andrea Castro López                   │
│ Fecha inicio: 01/03/2025                           │
│                                                     │
│ [Ver Detalle] [Enviar Recordatorio]                │
└─────────────────────────────────────────────────────┘
```

---

## 🎯 PUNTOS CLAVE DE LA RELACIÓN

### **1. Una auditoría puede generar MÚLTIPLES hallazgos**

```
1 AUDITORÍA → 3 HALLAZGOS
              ├── Hallazgo Grave
              ├── Hallazgo Moderado
              └── Hallazgo Leve
```

---

### **2. Cada hallazgo puede tener MÚLTIPLES acciones correctivas**

```
HALLAZGO GRAVE → 2 ACCIONES CORRECTIVAS
                 ├── Acción #1.1: Implementar software
                 └── Acción #1.2: Capacitar personal
```

---

### **3. Un Plan de Mejoramiento es para UNA auditoría específica**

```
PLAN DE MEJORAMIENTO (AUD-2025-005)
├── Hallazgo #1 (Grave)
│   ├── Acción #1.1
│   └── Acción #1.2
├── Hallazgo #2 (Moderado)
│   ├── Acción #2.1
│   └── Acción #2.2
└── Hallazgo #3 (Leve)
    └── Acción #3.1
```

---

### **4. El seguimiento es sobre cada acción individual**

```
6 ACCIONES CORRECTIVAS
├── ✅ 2 Completadas
├── 🔄 3 En Proceso
└── ⏳ 1 Pendiente
```

---

## 📊 ESTADOS Y TRANSICIONES

### **Estado de la Auditoría:**

```
PROGRAMADA → PLANEACIÓN → EJECUCIÓN → COMUNICACIÓN → FINALIZADA
                                                         ↓
                                                  Se generan
                                                   HALLAZGOS
```

---

### **Estado del Plan de Mejoramiento:**

```
FORMULACIÓN → ENVIADO → APROBADO → EN SEGUIMIENTO → COMPLETADO
     ↑                      ↓
     └──── RECHAZADO ───────┘
           (Reformular)
```

---

### **Estado de cada Acción Correctiva:**

```
PENDIENTE → EN PROCESO → COMPLETADA
              ↓
            VENCIDA
           (Si pasa la fecha límite)
```

---

## 🔔 NOTIFICACIONES Y ALERTAS

### **El sistema envía notificaciones automáticas:**

| Evento | Destinatario | Tipo |
|--------|-------------|------|
| Auditoría finalizada con hallazgos | Responsable del área auditada | 🔴 Urgente |
| Plazo formulación por vencer (7 días) | Responsable del área | ⚠️ Alerta |
| Plan enviado para aprobación | Jefe Control Interno | 🔔 Recordatorio |
| Plan aprobado | Responsable del área | ✅ Información |
| Acción próxima a vencer (5 días) | Responsable de la acción | ⚠️ Alerta |
| Acción vencida | Responsable + Jefe área | 🔴 Urgente |
| Plan completado al 100% | Todos los involucrados | 🎉 Información |

---

## 📈 INDICADORES DE GESTIÓN

### **Indicadores por Auditoría:**

```
┌─────────────────────────────────────────┐
│ AUDITORÍA: AUD-2025-005                 │
├─────────────────────────────────────────┤
│ Hallazgos encontrados: 3                │
│ ├── Graves: 1                           │
│ ├── Moderados: 1                        │
│ └── Leves: 1                            │
│                                         │
│ Acciones correctivas: 6                 │
│ Avance del plan: 45%                    │
│ Plazo cumplimiento: 30/04/2025          │
└─────────────────────────────────────────┘
```

---

### **Indicadores Generales:**

```
┌─────────────────────────────────────────┐
│ PLANES DE MEJORAMIENTO (2025)           │
├─────────────────────────────────────────┤
│ Total de planes: 8                      │
│                                         │
│ Estados:                                │
│ ✅ Completados: 2                       │
│ 🔄 En seguimiento: 5                    │
│ ⏳ En formulación: 1                    │
│                                         │
│ Cumplimiento promedio: 72%              │
│ Acciones vencidas: 3                    │
└─────────────────────────────────────────┘
```

---

## 🎨 VISUALIZACIÓN EN EL DASHBOARD

### **En el Dashboard Kanban:**

Cuando una auditoría está en **COMUNICACIÓN** o **FINALIZADA**, se muestra:

```
┌─────────────────────────────────────┐
│ AUD-2025-005                        │
│ Gestión Financiera                  │
├─────────────────────────────────────┤
│ Estado: FINALIZADA                  │
│                                     │
│ ⚠️ HALLAZGOS: 3                     │
│                                     │
│ 📋 Plan de Mejoramiento:            │
│    Estado: En Seguimiento (45%)     │
│                                     │
│ [Ver Informe] [Ver Plan]            │
└─────────────────────────────────────┘
```

---

## 💡 EJEMPLO DE USO PRÁCTICO

### **Caso Real:**

**Situación:**  
El auditor Fernando Ávila realiza una auditoría al área financiera y encuentra que no se hacen conciliaciones bancarias mensuales.

**Paso 1 - Auditor (Dashboard Kanban):**
```
✍️ Documenta el hallazgo:
   - Título: "Falta de conciliaciones bancarias"
   - Gravedad: GRAVE
   - Causas, efectos, recomendaciones
```

**Paso 2 - Sistema:**
```
🔔 Notifica a María González (Directora Administrativa):
   "Debe formular plan de mejoramiento en 30 días"
```

**Paso 3 - María (Planes de Mejoramiento):**
```
📝 Formula el plan:
   - Acción 1: Implementar software (Carlos Méndez)
   - Acción 2: Capacitar personal (Laura Sánchez)
   - Evidencias requeridas para cada acción
   
📤 Envía plan para aprobación
```

**Paso 4 - Fernando (Planes de Mejoramiento):**
```
✅ Revisa y aprueba el plan
```

**Paso 5 - Carlos y Laura:**
```
🔄 Ejecutan las acciones
📎 Cargan evidencias
```

**Paso 6 - Fernando (Seguimiento):**
```
👁️ Verifica evidencias
✅ Marca acciones como completadas
📊 Monitorea avance general
```

**Paso 7 - Sistema:**
```
🎉 Cuando todas las acciones están completadas:
   Plan marcado como COMPLETADO
   Se cierra el ciclo de mejoramiento
```

---

## 🔗 INTEGRACIÓN CON OTROS MÓDULOS

### **Gestión Documental:**

Todas las evidencias de las acciones correctivas se archivan en Gestión Documental:

```
Gestión Documental
└── Expediente: AUD-2025-005
    ├── Informe de Auditoría.pdf
    ├── Plan de Mejoramiento.pdf
    └── Evidencias
        ├── Acta_adquisicion_software.pdf
        ├── Manual_usuario.pdf
        ├── Conciliacion_feb_2025.xlsx
        ├── Lista_asistencia.pdf
        └── Certificados_capacitacion.pdf
```

---

### **Notificaciones:**

Todas las alertas se registran en el módulo de Notificaciones:

```
Configuraciones → Notificaciones
├── 🔴 Acción #2.1 vencida (3 días de retraso)
├── ⚠️ Acción #3.1 próxima a vencer (5 días)
├── 🔔 Plan aprobado - AUD-2025-005
└── ✅ Acción #1.1 completada
```

---

### **Auditoría de Cambios:**

Todos los cambios en el plan se registran:

```
Configuraciones → Auditoría de Cambios
├── 10/02/2025 12:45 - Plan aprobado por Fernando Ávila
├── 09/02/2025 16:30 - Plan enviado por María González
├── 25/02/2025 14:20 - Acción #1.1 marcada completada
└── 26/02/2025 10:15 - Evidencias cargadas por Carlos Méndez
```

---

## 📋 CHECKLIST PARA ENTENDER EL FLUJO

### **¿Entiendes la relación? Verifica:**

- [ ] ✅ Sé que primero se hace una **Auditoría**
- [ ] ✅ Entiendo que la auditoría puede encontrar **Hallazgos**
- [ ] ✅ Sé que cada hallazgo requiere **Acciones Correctivas**
- [ ] ✅ Entiendo que el conjunto de acciones forma un **Plan de Mejoramiento**
- [ ] ✅ Sé que el plan se **formula** primero
- [ ] ✅ Entiendo que luego se hace **seguimiento** a cada acción
- [ ] ✅ Sé que cada acción tiene un **responsable** y **fechas**
- [ ] ✅ Entiendo que hay que cargar **evidencias** del cumplimiento
- [ ] ✅ Sé que el Jefe de Control Interno **verifica** las evidencias
- [ ] ✅ Entiendo que el plan se completa cuando **todas** las acciones están hechas

---

## 🎯 RESUMEN EN UNA FRASE

**Un Plan de Mejoramiento es la respuesta del área auditada a los hallazgos encontrados en una auditoría, donde proponen acciones concretas para corregir los problemas identificados.**

---

## 📊 DIAGRAMA VISUAL FINAL

```
┌──────────────────────────────────────────────────────────────────┐
│                    CICLO COMPLETO                                 │
└──────────────────────────────────────────────────────────────────┘

1️⃣ PLANIFICAR
   ↓
   📅 Se programa auditoría

2️⃣ EJECUTAR  
   ↓
   🔍 Se realiza auditoría
   ↓
   ⚠️ Se encuentran HALLAZGOS

3️⃣ FORMULAR
   ↓
   📝 Se crea Plan de Mejoramiento
   ↓
   ✅ Se definen Acciones Correctivas
   ↓
   📤 Se envía para aprobación

4️⃣ APROBAR
   ↓
   👍 Jefe Control Interno aprueba

5️⃣ EJECUTAR ACCIONES
   ↓
   🔄 Responsables ejecutan acciones
   ↓
   📎 Cargan evidencias

6️⃣ VERIFICAR
   ↓
   👁️ Jefe verifica evidencias
   ↓
   ✅ Marca acciones como completadas

7️⃣ CERRAR
   ↓
   🎉 Plan completado al 100%
   ↓
   📊 Auditoría cerrada con mejoramiento cumplido
```

---

**Desarrollado por:** Asistente de Figma Make  
**Fecha:** 24 Diciembre 2025  
**Versión:** 1.0  
**Estado:** ✅ DOCUMENTACIÓN COMPLETA
