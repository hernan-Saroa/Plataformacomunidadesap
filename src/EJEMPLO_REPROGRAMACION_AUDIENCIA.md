# 🔄 Ejemplo Completo: Reprogramación de Audiencia

## 📋 Escenario Real

**Contexto:** El Juzgado 1° Administrativo de Bogotá notifica a ESAP que la audiencia programada para el **15 de febrero de 2025** debe ser aplazada debido a cambio de magistrado. Se reprograma para el **28 de febrero de 2025**.

---

## 📅 PASO 1: Audiencia Original Programada

### **Datos Iniciales:**

```yaml
Expediente: DJ-001 - NULIDAD Y RESTABLECIMIENTO
Tipo de Audiencia: Audiencia de Pruebas
Fecha Original: 15/02/2025
Hora Original: 10:00 AM
Modalidad: Presencial
Lugar: Juzgado 1° Administrativo de Bogotá - Sala 3
Juez: Dr. Carlos Ramírez González
Abogado Responsable: Dra. Ana María López
Estado: Programada
```

### **Vista en el Sistema:**

```
┌────────────────────────────────────────────────────────┐
│ 📅 Audiencias Programadas  🟣 1                        │
├────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────┐ │
│  │ 🟣 Audiencia de Pruebas  🟢 Programada           │ │
│  │                                                   │ │
│  │ 📅 15/02/2025 a las 10:00 AM                     │ │
│  │ 🏛️ Juzgado 1° Administrativo de Bogotá - Sala 3 │ │
│  │ ⚖️ Dr. Carlos Ramírez González                   │ │
│  │ 👤 Dra. Ana María López                          │ │
│  │                                                   │ │
│  │                        [🔄 Reasignar]            │ │
│  └──────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────┘
```

---

## 🔄 PASO 2: Iniciar Reprogramación

**Acción:** Usuario hace clic en el botón **"🔄 Reasignar"**

### **Modal que se Abre:**

```
╔════════════════════════════════════════════════════════╗
║  🔄 Reasignar Audiencia Judicial                       ║
║  Expediente DJ-001 - Cambio de fecha/hora              ║
║                                                         ║
║  🟠 Reasignación  ⚖️ Registro Oficial           [✕]   ║
╠════════════════════════════════════════════════════════╣
║                                                         ║
║  ⚠️ REASIGNACIÓN DE AUDIENCIA                         ║
║  ┌──────────────────────────────────────────────────┐ ║
║  │ Estás modificando una audiencia ya programada.    │ ║
║  │ Se guardará un historial completo de los cambios. │ ║
║  │                                                    │ ║
║  │ 📅 Fecha actual: 15/02/2025 a las 10:00 AM       │ ║
║  └──────────────────────────────────────────────────┘ ║
║                                                         ║
║  ┌──────────────────────────────────────────────────┐ ║
║  │ 📁 Expediente: DJ-001                            │ ║
║  └──────────────────────────────────────────────────┘ ║
║                                                         ║
║  📅 Tipo de Audiencia *                               ║
║  ┌──────────────────────────────────────────────────┐ ║
║  │ Audiencia de Pruebas                    ▼        │ ║ (prellenado)
║  └──────────────────────────────────────────────────┘ ║
║                                                         ║
║  📅 Fecha de la Audiencia *     ⏰ Hora *             ║
║  ┌────────────────────────┐    ┌──────────────────┐  ║
║  │ [  ] (vacío)           │    │ [  ] (vacío)     │  ║ <- Usuario debe cambiar
║  └────────────────────────┘    └──────────────────┘  ║
║                                                         ║
║  📡 Modalidad de la Audiencia                         ║
║  ┌────────────┐  ┌────────────┐                      ║
║  │ 🏛️ Presencial │  │ 💻 Virtual  │                  ║ (prellenado)
║  └────────────┘  └────────────┘                      ║
║                                                         ║
║  📍 Lugar de la Audiencia *                           ║
║  ┌──────────────────────────────────────────────────┐ ║
║  │ Juzgado 1° Administrativo de Bogotá - Sala 3    │ ║ (prellenado)
║  └──────────────────────────────────────────────────┘ ║
║                                                         ║
║  ⚖️ Juez/Magistrado a cargo                           ║
║  ┌──────────────────────────────────────────────────┐ ║
║  │ Dr. Carlos Ramírez González                      │ ║ (prellenado)
║  └──────────────────────────────────────────────────┘ ║
║                                                         ║
║  👤 Abogado Responsable de ESAP *                     ║
║  ┌──────────────────────────────────────────────────┐ ║
║  │ Dra. Ana María López                             │ ║ (prellenado)
║  └──────────────────────────────────────────────────┘ ║
║                                                         ║
║  🎯 Objetivo de la Audiencia                          ║
║  ┌──────────────────────────────────────────────────┐ ║
║  │ Práctica de pruebas testimoniales y              │ ║ (prellenado)
║  │ documentales según auto del 05/01/2025           │ ║
║  └──────────────────────────────────────────────────┘ ║
║                                                         ║
║  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  ║
║                                                         ║
║  🔄 MOTIVO DE LA REASIGNACIÓN                         ║
║                                                         ║
║  Motivo *                                              ║
║  ┌──────────────────────────────────────────────────┐ ║
║  │ Selecciona el motivo...               ▼         │ ║
║  └──────────────────────────────────────────────────┘ ║
║                                                         ║
║  Detalle del motivo                                    ║
║  ┌──────────────────────────────────────────────────┐ ║
║  │                                                   │ ║
║  │                                                   │ ║
║  └──────────────────────────────────────────────────┘ ║
║                                                         ║
╠════════════════════════════════════════════════════════╣
║  [Cancelar]                   [Reasignar Audiencia]   ║
╚════════════════════════════════════════════════════════╝
```

---

## ✍️ PASO 3: Llenar Datos de Reprogramación

### **Usuario completa el formulario:**

```yaml
# DATOS QUE EL USUARIO CAMBIA:

Nueva Fecha: 28/02/2025
Nueva Hora: 02:00 PM (14:00)

# MOTIVO DE REASIGNACIÓN:
Motivo: Cambio de magistrado/juez
Detalle: >
  El Juzgado 1° Administrativo de Bogotá notificó mediante 
  oficio 2025-0234 del 20/01/2025 que debido al cambio del 
  magistrado ponente Dr. Carlos Ramírez por la Dra. Patricia 
  Herrera, se reprograma la audiencia de pruebas para el 
  28 de febrero de 2025 a las 2:00 PM en la misma sala.

# DATOS QUE SE MANTIENEN:
Tipo: Audiencia de Pruebas
Modalidad: Presencial
Lugar: Juzgado 1° Administrativo de Bogotá - Sala 3
Juez: Dr. Carlos Ramírez González (ahora Dra. Patricia Herrera)
Abogado: Dra. Ana María López
```

### **Vista del Formulario Completo:**

```
╔════════════════════════════════════════════════════════╗
║  📅 Fecha de la Audiencia *     ⏰ Hora *             ║
║  ┌────────────────────────┐    ┌──────────────────┐  ║
║  │ 28/02/2025             │    │ 14:00            │  ║ ✅
║  └────────────────────────┘    └──────────────────┘  ║
║                                                         ║
║  🔄 MOTIVO DE LA REASIGNACIÓN                         ║
║                                                         ║
║  Motivo *                                              ║
║  ┌──────────────────────────────────────────────────┐ ║
║  │ Cambio de magistrado/juez             ▼         │ ║ ✅
║  └──────────────────────────────────────────────────┘ ║
║                                                         ║
║  Detalle del motivo                                    ║
║  ┌──────────────────────────────────────────────────┐ ║
║  │ El Juzgado 1° Administrativo de Bogotá notificó  │ ║
║  │ mediante oficio 2025-0234 del 20/01/2025 que     │ ║ ✅
║  │ debido al cambio del magistrado ponente Dr.      │ ║
║  │ Carlos Ramírez por la Dra. Patricia Herrera,     │ ║
║  │ se reprograma la audiencia de pruebas para el    │ ║
║  │ 28 de febrero de 2025 a las 2:00 PM...           │ ║
║  └──────────────────────────────────────────────────┘ ║
╚════════════════════════════════════════════════════════╝
```

---

## ✅ PASO 4: Guardar Reprogramación

**Acción:** Usuario hace clic en **"Reasignar Audiencia"**

### **Proceso:**

```
1. ⏳ Validación de campos obligatorios
2. 💾 Guardando cambios...
3. 📊 Actualizando historial
4. 📝 Creando actuación en timeline
5. ✅ Audiencia reasignada exitosamente
```

### **Notificación Toast:**

```
┌────────────────────────────────────────┐
│ ✅ Audiencia reasignada                │
│                                        │
│ Audiencia de Pruebas -                 │
│ 28/02/2025 a las 14:00                 │
│                                        │
│                               [Cerrar] │
└────────────────────────────────────────┘
```

---

## 📊 PASO 5: Resultado Final

### **A. Audiencia Actualizada en "Audiencias Programadas":**

```
┌────────────────────────────────────────────────────────┐
│ 📅 Audiencias Programadas  🟣 1                        │
├────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────┐ │
│  │ 🟣 Audiencia de Pruebas  🟢 Programada           │ │
│  │                                                   │ │
│  │ 📅 28/02/2025 a las 02:00 PM                     │ │ ← ACTUALIZADO
│  │ 🏛️ Juzgado 1° Administrativo de Bogotá - Sala 3 │ │
│  │ ⚖️ Dra. Patricia Herrera                         │ │ ← ACTUALIZADO
│  │ 👤 Dra. Ana María López                          │ │
│  │                                                   │ │
│  │                        [🔄 Reasignar]            │ │
│  └──────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────┘
```

### **B. Nueva Actuación en el Timeline:**

```
🔵━━━━━━━━━━━━━━ TIMELINE ━━━━━━━━━━━━━━━

  ● ┌──────────────────────────────────────────────────┐
  │ │ 📅 28/01/2025  🔄 Reasignación de Audiencia     │ ← NUEVA
  │ │ ⚡ Más Reciente                                  │
  │ │                                                  │
  │ │ Se reasignó Audiencia de Pruebas:               │
  │ │ de 15/02/2025 10:00 AM a 28/02/2025 02:00 PM    │
  │ │ Motivo: Cambio de magistrado/juez                │
  │ │                                                  │
  │ │ 👤 Dra. Ana María López  ✅ Completado          │
  │ └──────────────────────────────────────────────────┘
  │
  ● ┌──────────────────────────────────────────────────┐
  │ │ 📅 15/01/2025  📅 Programación de Audiencia     │
  │ │                                                  │
  │ │ Se programó Audiencia de Pruebas para el        │
  │ │ 15/02/2025 a las 10:00 AM                        │
  │ │                                                  │
  │ │ 👤 Dra. Ana María López  🟡 Reprogramado        │
  │ └──────────────────────────────────────────────────┘
  │
  ● ┌──────────────────────────────────────────────────┐
  │ │ 📅 26/12/2024  📋 Aporte de Pruebas             │
  │ │ ...                                              │
  │ └──────────────────────────────────────────────────┘
```

---

## 🔍 PASO 6: Ver Historial de Reasignaciones

### **Si se hace clic nuevamente en "🔄 Reasignar":**

El modal ahora muestra el historial completo:

```
╔════════════════════════════════════════════════════════╗
║  🔄 Reasignar Audiencia Judicial                       ║
║                                                         ║
║  ... (formulario) ...                                   ║
║                                                         ║
║  ┌──────────────────────────────────────────────────┐ ║
║  │ 📜 Historial de Reasignaciones (1)        ▼     │ ║ ← Expandible
║  └──────────────────────────────────────────────────┘ ║
║                                                         ║
║  ┌──────────────────────────────────────────────────┐ ║
║  │                                                   │ ║
║  │ ❌ De: 15/02/2025 10:00 AM →                     │ ║
║  │ ✅ A: 28/02/2025 02:00 PM                        │ ║
║  │                                                   │ ║
║  │ Motivo: Cambio de magistrado/juez                │ ║
║  │                                                   │ ║
║  │ El Juzgado 1° Administrativo de Bogotá notificó  │ ║
║  │ mediante oficio 2025-0234 del 20/01/2025 que...  │ ║
║  │                                                   │ ║
║  │ 👤 Dra. Ana María López • 📅 28/01/2025          │ ║
║  │                                                   │ ║
║  └──────────────────────────────────────────────────┘ ║
║                                                         ║
╚════════════════════════════════════════════════════════╝
```

---

## 📈 RESUMEN DE CAMBIOS

### **ANTES:**
```yaml
Fecha: 15/02/2025
Hora: 10:00 AM
Juez: Dr. Carlos Ramírez González
Estado: Programada (original)
Historial: []
```

### **DESPUÉS:**
```yaml
Fecha: 28/02/2025
Hora: 02:00 PM (14:00)
Juez: Dra. Patricia Herrera
Estado: Programada (reasignada)
Historial: 
  - fechaOriginal: "15/02/2025 10:00 AM"
    fechaNueva: "28/02/2025 02:00 PM"
    motivo: "Cambio de magistrado/juez"
    detalle: "El Juzgado 1° Administrativo..."
    registradoPor: "funcionario@esap.edu.co"
    fechaRegistro: "28/01/2025"
```

---

## 💾 DATOS GUARDADOS EN EL SISTEMA

```javascript
// Audiencia actualizada
{
  id: 1234,
  tipo: "Audiencia de Pruebas",
  fecha: "28/02/2025",  // CAMBIADO
  hora: "14:00",        // CAMBIADO
  modalidad: "Presencial",
  lugar: "Juzgado 1° Administrativo de Bogotá - Sala 3",
  juez: "Dra. Patricia Herrera",  // CAMBIADO
  abogadoResponsable: "Dra. Ana María López",
  objetivo: "Práctica de pruebas testimoniales...",
  estado: "Programada",
  expedienteId: "DJ-001",
  
  // NUEVO: Datos de reasignación
  motivoReasignacion: "Cambio de magistrado/juez",
  detalleReasignacion: "El Juzgado 1° Administrativo de Bogotá notificó mediante oficio 2025-0234 del 20/01/2025 que debido al cambio del magistrado ponente Dr. Carlos Ramírez por la Dra. Patricia Herrera, se reprograma la audiencia de pruebas para el 28 de febrero de 2025 a las 2:00 PM en la misma sala.",
  fechaAnterior: "15/02/2025",
  horaAnterior: "10:00",
  
  // NUEVO: Historial completo
  historial: [
    {
      fechaOriginal: "15/02/2025 10:00 AM",
      fechaNueva: "28/02/2025 02:00 PM",
      motivo: "Cambio de magistrado/juez",
      detalle: "El Juzgado 1° Administrativo de Bogotá notificó...",
      registradoPor: "funcionario@esap.edu.co",
      fechaRegistro: "28/01/2025"
    }
  ]
}

// Actuación automática creada
{
  id: 9876,
  fecha: "28/01/2025",
  hora: "11:30:00",
  tipo: "Reasignación de Audiencia",
  descripcion: "Se reasignó Audiencia de Pruebas: de 15/02/2025 10:00 AM a 28/02/2025 02:00 PM. Motivo: Cambio de magistrado/juez",
  responsable: "Dra. Ana María López",
  estado: "Completado",
  expedienteId: "DJ-001",
  registradoPor: "funcionario@esap.edu.co",
  fechaRegistro: "2025-01-28T11:30:00Z"
}
```

---

## 🎯 Beneficios de la Reprogramación

✅ **Trazabilidad completa:** Historial de todos los cambios  
✅ **Auditoría:** Quién, cuándo y por qué se cambió  
✅ **Transparencia:** Motivos documentados  
✅ **Continuidad:** Se mantiene el contexto original  
✅ **Cumplimiento:** Registro oficial para reportes  
✅ **Control:** No se pierden datos de la audiencia original  

---

## 🔔 Notificaciones Automáticas (Futuro)

```
📧 Email a Dra. Ana María López:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  🔄 Audiencia Reprogramada - Expediente DJ-001

  Estimada Dra. López:

  Se le informa que la Audiencia de Pruebas del 
  expediente DJ-001 ha sido reprogramada:

  ❌ Fecha anterior: 15/02/2025 a las 10:00 AM
  ✅ Nueva fecha: 28/02/2025 a las 02:00 PM

  Motivo: Cambio de magistrado/juez

  Lugar: Juzgado 1° Administrativo de Bogotá - Sala 3
  Nuevo Juez: Dra. Patricia Herrera

  Por favor, confirme su asistencia.

  SIGL - Sistema de Gestión Legal ESAP
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## 📊 Dashboard de Audiencias (Vista Futura)

```
┌─────────────────────────────────────────────────┐
│  📅 AUDIENCIAS - Resumen Mensual FEBRERO 2025  │
├─────────────────────────────────────────────────┤
│                                                  │
│  🟢 Programadas: 5                              │
│  🟡 Reprogramadas: 2                            │
│  ✅ Realizadas: 0                               │
│  ❌ Canceladas: 0                               │
│                                                  │
│  Próxima audiencia:                             │
│  📅 28/02/2025 - DJ-001 - Audiencia de Pruebas │
│                                                  │
└─────────────────────────────────────────────────┘
```

---

**Fecha del Ejemplo:** 28 de enero de 2025  
**Expediente:** DJ-001 - NULIDAD Y RESTABLECIMIENTO  
**Usuario:** funcionario@esap.edu.co  
**Estado:** ✅ Ejemplo Completado
