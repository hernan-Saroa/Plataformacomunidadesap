# 📸 Guía Visual: Reprogramación de Audiencia - ESAP

## 🎯 Resumen Ejecutivo

Esta guía muestra visualmente el proceso completo de reprogramación de una audiencia judicial en el Sistema SIGL de ESAP, desde la notificación inicial hasta el registro automático en el timeline con historial completo.

---

## 📋 Caso de Uso Real

### **Situación:**
```
📞 LLAMADA DEL JUZGADO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Juzgado 1° Administrativo de Bogotá
Oficio: 2025-0234
Fecha: 20/01/2025

"Estimada Dra. López:

Se le informa que debido al CAMBIO DE MAGISTRADO 
PONENTE, la audiencia de pruebas programada para 
el 15 de febrero de 2025 a las 10:00 AM se 
REPROGRAMA para el 28 de febrero de 2025 a las 
2:00 PM en la misma sala.

Dr. Carlos Ramírez → Dra. Patricia Herrera"
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## 🔄 Flujo Visual Completo

### **PASO 1: VISTA INICIAL** 📅

```
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ EXPEDIENTE DJ-001 - NULIDAD Y RESTABLECIMIENTO      ┃
┃ [General] [Partes] [Documentos] [⚖️ Actuaciones]   ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

┌──────────────────────────────────────────────────────┐
│ ⚖️ Historial Cronológico de Actuaciones Procesales  │
│ 📊 6 registros        [📝 Registrar] [📅 Programar] │
└──────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────┐
│ 📅 Audiencias Programadas  🟣 1                      │
├──────────────────────────────────────────────────────┤
│  ╔════════════════════════════════════════════════╗ │
│  ║ 🟣 Audiencia de Pruebas  🟢 Programada         ║ │
│  ║                                                 ║ │
│  ║ 📅 15/02/2025 a las 10:00 AM                   ║ │
│  ║ 🏛️ Juzgado 1° Administrativo de Bogotá        ║ │
│  ║ ⚖️ Dr. Carlos Ramírez González                 ║ │
│  ║ 👤 Dra. Ana María López                        ║ │
│  ║                                                 ║ │
│  ║                       [🔄 Reasignar] ◄━━━━━━━ CLICK AQUÍ
│  ╚════════════════════════════════════════════════╝ │
└──────────────────────────────────────────────────────┘
```

---

### **PASO 2: MODAL DE REASIGNACIÓN SE ABRE** 🔄

```
╔═══════════════════════════════════════════════════════════╗
║  🔄 Reasignar Audiencia Judicial                          ║
║  Expediente DJ-001 - Cambio de fecha/hora                 ║
║                                                            ║
║  🟠 Reasignación  ⚖️ Registro Oficial              [✕]   ║
╠═══════════════════════════════════════════════════════════╣
║                                                            ║
║  ⚠️ REASIGNACIÓN DE AUDIENCIA                             ║
║  ┌────────────────────────────────────────────────────┐  ║
║  │ Estás modificando una audiencia ya programada.     │  ║
║  │ Se guardará un historial completo de los cambios.  │  ║
║  │                                                     │  ║
║  │ 📅 Fecha actual: 15/02/2025 a las 10:00 AM        │  ║
║  └────────────────────────────────────────────────────┘  ║
║                                                            ║
║  ┌────────────────────────────────────────────────────┐  ║
║  │ 📁 Expediente: DJ-001                              │  ║
║  └────────────────────────────────────────────────────┘  ║
║                                                            ║
║  📅 Tipo de Audiencia *                                   ║
║  ┌────────────────────────────────────────────────────┐  ║
║  │ Audiencia de Pruebas                      ▼        │  ║ ✅ PRELLENADO
║  └────────────────────────────────────────────────────┘  ║
║                                                            ║
║  📅 Fecha *                    ⏰ Hora *                  ║
║  ┌──────────────────────┐    ┌───────────────────────┐  ║
║  │ 28/02/2025 ◄━━━━━━━━━│    │ 14:00 ◄━━━━━━━━━━━━━━│  ║ ✍️ USUARIO CAMBIA
║  └──────────────────────┘    └───────────────────────┘  ║
║     ❌ 15/02/2025                 ❌ 10:00               ║
║                                                            ║
║  📡 Modalidad                                             ║
║  ┌──────────────┐  ┌──────────────┐                     ║
║  │ 🏛️ Presencial │  │ 💻 Virtual    │                   ║ ✅ PRELLENADO
║  └──────────────┘  └──────────────┘                     ║
║       (ACTIVO)          (INACTIVO)                        ║
║                                                            ║
║  📍 Lugar de la Audiencia *                               ║
║  ┌────────────────────────────────────────────────────┐  ║
║  │ Juzgado 1° Administrativo de Bogotá - Sala 3      │  ║ ✅ PRELLENADO
║  └────────────────────────────────────────────────────┘  ║
║                                                            ║
║  ⚖️ Juez/Magistrado                                       ║
║  ┌────────────────────────────────────────────────────┐  ║
║  │ Dra. Patricia Herrera ◄━━━━━━━━━━━━━━━━━━━━━━━━━│  ║ ✍️ USUARIO ACTUALIZA
║  └────────────────────────────────────────────────────┘  ║
║     ❌ Dr. Carlos Ramírez González                       ║
║                                                            ║
║  👤 Abogado Responsable ESAP *                            ║
║  ┌────────────────────────────────────────────────────┐  ║
║  │ Dra. Ana María López                               │  ║ ✅ PRELLENADO
║  └────────────────────────────────────────────────────┘  ║
║                                                            ║
║  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  ║
║                                                            ║
║  🔄 MOTIVO DE LA REASIGNACIÓN                             ║
║                                                            ║
║  Motivo *                                                  ║
║  ┌────────────────────────────────────────────────────┐  ║
║  │ Cambio de magistrado/juez             ▼            │  ║ ✍️ USUARIO SELECCIONA
║  └────────────────────────────────────────────────────┘  ║
║                                                            ║
║  Detalle del motivo                                        ║
║  ┌────────────────────────────────────────────────────┐  ║
║  │ El Juzgado 1° Administrativo de Bogotá notificó    │  ║
║  │ mediante oficio 2025-0234 del 20/01/2025 que       │  ║ ✍️ USUARIO ESCRIBE
║  │ debido al cambio del magistrado ponente            │  ║
║  │ Dr. Carlos Ramírez por la Dra. Patricia Herrera,   │  ║
║  │ se reprograma la audiencia de pruebas para el      │  ║
║  │ 28 de febrero de 2025 a las 2:00 PM en la misma... │  ║
║  └────────────────────────────────────────────────────┘  ║
║                                                            ║
╠═══════════════════════════════════════════════════════════╣
║  [Cancelar]                      [💾 Reasignar Audiencia] ║ ◄━━ CLICK AQUÍ
╚═══════════════════════════════════════════════════════════╝
```

---

### **PASO 3: GUARDANDO...** ⏳

```
┌─────────────────────────────────────────┐
│ 💾 Reasignando audiencia...             │
│                                         │
│ ▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░░░░░░░ 50%        │
│                                         │
│ 1. ✅ Validando cambios                │
│ 2. ✅ Actualizando audiencia           │
│ 3. ⏳ Registrando historial            │
│ 4. ⏳ Creando actuación                │
│                                         │
└─────────────────────────────────────────┘
```

---

### **PASO 4: RESULTADO EXITOSO** ✅

```
┌────────────────────────────────────────────────┐
│ ✅ Audiencia reasignada                        │
│                                                │
│ Audiencia de Pruebas -                         │
│ 28/02/2025 a las 14:00                         │
│                                                │
│                                      [Cerrar]  │
└────────────────────────────────────────────────┘
```

**Vista actualizada de Audiencias Programadas:**

```
┌──────────────────────────────────────────────────────┐
│ 📅 Audiencias Programadas  🟣 1                      │
├──────────────────────────────────────────────────────┤
│  ╔════════════════════════════════════════════════╗ │
│  ║ 🟣 Audiencia de Pruebas  🟢 Programada         ║ │
│  ║                                                 ║ │
│  ║ 📅 28/02/2025 a las 02:00 PM ◄━━━━ ACTUALIZADO ║ │
│  ║    ❌ 15/02/2025 10:00 AM                      ║ │
│  ║                                                 ║ │
│  ║ 🏛️ Juzgado 1° Administrativo de Bogotá        ║ │
│  ║ ⚖️ Dra. Patricia Herrera ◄━━━━━━━ ACTUALIZADO  ║ │
│  ║    ❌ Dr. Carlos Ramírez González              ║ │
│  ║ 👤 Dra. Ana María López                        ║ │
│  ║                                                 ║ │
│  ║                       [🔄 Reasignar]           ║ │ ◄━━ Puede reasignar de nuevo
│  ╚════════════════════════════════════════════════╝ │
└──────────────────────────────────────────────────────┘
```

**Nueva actuación en el Timeline:**

```
🔵━━━━━━━━━━━━━━ TIMELINE ━━━━━━━━━━━━━━━

  ● ┌──────────────────────────────────────────────────┐
  │ │ 📅 28/01/2025  🔄 Reasignación de Audiencia     │ ◄━━ NUEVO
  │ │ ⚡ Más Reciente                                  │
  │ │                                                  │
  │ │ Se reasignó Audiencia de Pruebas:               │
  │ │ ❌ DE: 15/02/2025 10:00 AM                      │
  │ │ ✅ A:  28/02/2025 02:00 PM                      │
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
  │ │ 👤 Dra. Ana María López  🟡 Reprogramado        │ ◄━━ Estado actualizado
  │ └──────────────────────────────────────────────────┘
  │
  ● ┌──────────────────────────────────────────────────┐
  │ │ 📅 26/12/2024  📋 Aporte de Pruebas             │
  │ │ ...                                              │
  │ └──────────────────────────────────────────────────┘
```

---

### **PASO 5: VER HISTORIAL COMPLETO** 📜

**Si se vuelve a hacer click en "🔄 Reasignar":**

```
╔═══════════════════════════════════════════════════════════╗
║  🔄 Reasignar Audiencia Judicial                          ║
║                                                            ║
║  ... (formulario prellenado con datos actuales) ...       ║
║                                                            ║
║  ┌────────────────────────────────────────────────────┐  ║
║  │ 📜 Historial de Reasignaciones (1)           ▼    │  ║ ◄━━ Click para expandir
║  └────────────────────────────────────────────────────┘  ║
║                                                            ║
║  ╔════════════════════════════════════════════════════╗  ║
║  ║ HISTORIAL EXPANDIDO:                               ║  ║
║  ║                                                     ║  ║
║  ║ ┌──────────────────────────────────────────────┐  ║  ║
║  ║ │ Cambio #1                                     │  ║  ║
║  ║ │                                               │  ║  ║
║  ║ │ ❌ De: 15/02/2025 10:00 AM →                 │  ║  ║
║  ║ │ ✅ A:  28/02/2025 02:00 PM                   │  ║  ║
║  ║ │                                               │  ║  ║
║  ║ │ 📋 Motivo: Cambio de magistrado/juez         │  ║  ║
║  ║ │                                               │  ║  ║
║  ║ │ 📝 Detalle:                                   │  ║  ║
║  ║ │ El Juzgado 1° Administrativo de Bogotá       │  ║  ║
║  ║ │ notificó mediante oficio 2025-0234 del       │  ║  ║
║  ║ │ 20/01/2025 que debido al cambio del          │  ║  ║
║  ║ │ magistrado ponente Dr. Carlos Ramírez por    │  ║  ║
║  ║ │ la Dra. Patricia Herrera, se reprograma...   │  ║  ║
║  ║ │                                               │  ║  ║
║  ║ │ 👤 Dra. Ana María López                      │  ║  ║
║  ║ │ 📅 28/01/2025                                 │  ║  ║
║  ║ │                                               │  ║  ║
║  ║ └──────────────────────────────────────────────┘  ║  ║
║  ║                                                     ║  ║
║  ╚════════════════════════════════════════════════════╝  ║
║                                                            ║
╚═══════════════════════════════════════════════════════════╝
```

**Si se reasigna de nuevo (ejemplo: cambio de sala):**

```
╔════════════════════════════════════════════════════════════╗
║  📜 Historial de Reasignaciones (2)                   ▼   ║
╠════════════════════════════════════════════════════════════╣
║                                                             ║
║  ┌─────────────────────────────────────────────────────┐  ║
║  │ Cambio #2 - MÁS RECIENTE                            │  ║
║  │                                                      │  ║
║  │ ❌ De: 28/02/2025 02:00 PM - Sala 3 →              │  ║
║  │ ✅ A:  28/02/2025 02:00 PM - Sala 5                │  ║
║  │                                                      │  ║
║  │ 📋 Motivo: Fuerza mayor                            │  ║
║  │ 📝 Detalle: Daño en instalaciones de Sala 3...     │  ║
║  │ 👤 Dra. Ana María López • 📅 05/02/2025           │  ║
║  └─────────────────────────────────────────────────────┘  ║
║                                                             ║
║  ┌─────────────────────────────────────────────────────┐  ║
║  │ Cambio #1                                            │  ║
║  │                                                      │  ║
║  │ ❌ De: 15/02/2025 10:00 AM →                        │  ║
║  │ ✅ A:  28/02/2025 02:00 PM                          │  ║
║  │                                                      │  ║
║  │ 📋 Motivo: Cambio de magistrado/juez               │  ║
║  │ 👤 Dra. Ana María López • 📅 28/01/2025           │  ║
║  └─────────────────────────────────────────────────────┘  ║
║                                                             ║
╚════════════════════════════════════════════════════════════╝
```

---

## 📊 Comparativa: ANTES vs DESPUÉS

```
╔═══════════════════════════════════════════════════════════╗
║                     ANTES DE REASIGNAR                     ║
╠═══════════════════════════════════════════════════════════╣
║  Fecha:     15/02/2025                                    ║
║  Hora:      10:00 AM                                      ║
║  Lugar:     Juzgado 1° Administrativo - Sala 3           ║
║  Juez:      Dr. Carlos Ramírez González                   ║
║  Abogado:   Dra. Ana María López                          ║
║  Estado:    Programada (original)                         ║
║  Historial: []  ← Sin historial                          ║
╚═══════════════════════════════════════════════════════════╝
                           ⬇️
                    🔄 REASIGNACIÓN
                           ⬇️
╔═══════════════════════════════════════════════════════════╗
║                    DESPUÉS DE REASIGNAR                    ║
╠═══════════════════════════════════════════════════════════╣
║  Fecha:     28/02/2025  ✅ ACTUALIZADO                   ║
║  Hora:      02:00 PM    ✅ ACTUALIZADO                   ║
║  Lugar:     Juzgado 1° Administrativo - Sala 3           ║
║  Juez:      Dra. Patricia Herrera  ✅ ACTUALIZADO        ║
║  Abogado:   Dra. Ana María López                          ║
║  Estado:    Programada (reasignada)                       ║
║  Historial: [1 cambio]  ✅ CON HISTORIAL COMPLETO       ║
║                                                            ║
║  ┌────────────────────────────────────────────────────┐  ║
║  │ Historial:                                         │  ║
║  │ • De: 15/02/2025 10:00 AM                          │  ║
║  │ • A:  28/02/2025 02:00 PM                          │  ║
║  │ • Motivo: Cambio de magistrado/juez                │  ║
║  │ • Por: Dra. Ana María López                        │  ║
║  │ • Cuándo: 28/01/2025                               │  ║
║  └────────────────────────────────────────────────────┘  ║
╚═══════════════════════════════════════════════════════════╝
```

---

## 🎯 Ventajas del Sistema

### ✅ **Trazabilidad Total**
```
Cada cambio queda registrado con:
- Fecha/hora anterior y nueva
- Motivo del cambio
- Responsable del cambio
- Fecha del registro
- Detalle completo
```

### ✅ **Auditoría Completa**
```
Se puede rastrear:
- ¿Quién reprogramó?
- ¿Cuándo se reprogramó?
- ¿Por qué se reprogramó?
- ¿Cuántos cambios ha tenido?
```

### ✅ **Timeline Automático**
```
Cada reasignación crea automáticamente 
una actuación en el historial del expediente
```

### ✅ **Datos Prellenados**
```
Usuario solo cambia lo necesario:
- Nueva fecha
- Nueva hora
- Motivo
- Detalles opcionales
```

### ✅ **Sin Pérdida de Información**
```
Todos los datos originales se preservan
en el historial
```

---

## 🚀 Cómo Usar

### **Para ver la demo interactiva:**

1. Renombrar archivo:
   ```bash
   mv App_DEMO_REPROGRAMACION.tsx App.tsx
   ```

2. Abrir navegador en:
   ```
   http://localhost:5173
   ```

3. Navegar por los 4 pasos con los botones

### **Para usar en producción:**

1. Abrir expediente
2. Ir a tab "⚖️ Actuaciones"
3. En "Audiencias Programadas" → Click "🔄 Reasignar"
4. Completar formulario
5. Click "Reasignar Audiencia"
6. ✅ Listo!

---

## 📁 Archivos Creados

✅ `/components/esap/gestion-legal/modulos/ModalProgramarAudiencia.tsx`  
✅ `/components/esap/gestion-legal/modulos/ModalRegistrarActuacion.tsx`  
✅ `/components/esap/gestion-legal/demo/DemoReprogramacionAudiencia.tsx`  
✅ `/EJEMPLO_REPROGRAMACION_AUDIENCIA.md`  
✅ `/GUIA_VISUAL_REPROGRAMACION.md` (este archivo)  
✅ `/App_DEMO_REPROGRAMACION.tsx`  

---

## 💡 Tips de Uso

### ✨ **Mejores Prácticas:**

1. **Siempre incluir motivo detallado**
   - Ayuda a auditorías futuras
   - Justifica el cambio legalmente

2. **Actualizar el juez si cambió**
   - Mantiene datos actualizados
   - Evita confusiones

3. **Revisar historial antes de reasignar**
   - Ver cambios anteriores
   - Entender el contexto

4. **Notificar a todas las partes**
   - Abogado responsable
   - Partes involucradas
   - Juzgado (si aplica)

---

## 🎨 Colores ESAP

```
🔵 Azul Principal:  #003DA5
🟣 Púrpura:        #7C3AED
🟠 Naranja:        #F57C00
🟢 Verde Éxito:    #10B981
🔴 Rojo Error:     #DC2626
⚪ Gris Fondo:     #F9FAFB
```

---

## 📞 Soporte

### **Dudas o problemas:**
- Revisar `/FUNCIONALIDAD_ACTUACIONES_AUDIENCIAS.md`
- Revisar `/EJEMPLO_REPROGRAMACION_AUDIENCIA.md`
- Ejecutar demo interactiva

---

**Fecha de Creación:** 28 de enero de 2025  
**Módulo:** Defensa Judicial - Gestión de Audiencias  
**Estado:** ✅ Completado y Documentado  
**Versión:** ESAP 2025 Premium
