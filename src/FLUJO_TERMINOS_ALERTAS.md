# ⏰ FLUJO COMPLETO: TÉRMINOS Y ALERTAS EN EL PROCESO DISCIPLINARIO

## 🎯 CONCEPTO CENTRAL: RF006 - TÉRMINOS Y ALERTAS

```
┌─────────────────────────────────────────────────────────────────────────┐
│        RF006 - TÉRMINOS Y ALERTAS: EL "RELOJ" DEL SISTEMA               │
│                                                                          │
│  ROL: Módulo TRANSVERSAL que monitorea TODO el proceso disciplinario   │
│  FUNCIÓN: Control automático de tiempos legales y alertas preventivas  │
│  IMPACTO: Previene vencimientos, prescripciones y sanciones            │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 🔄 INTEGRACIÓN CON EL FLUJO TOTAL

### **VISIÓN GENERAL: Términos y Alertas es un MÓDULO TRANSVERSAL**

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    FLUJO LINEAL DEL PROCESO DISCIPLINARIO               │
└─────────────────────────────────────────────────────────────────────────┘
                                    
   RF001 → RF002 → RF003 → RF004 → RF005
   Noticias Valoración Carpeta Revisión Expediente
                                    ↑
                                    │
                         ┌──────────┴──────────┐
                         │   RF006 - TÉRMINOS  │
                         │    (TRANSVERSAL)    │ ← ⏰ Monitorea TODAS las etapas
                         └─────────────────────┘
                                    ↓
                    Genera alertas en TIEMPO REAL
```

---

## 📊 ¿CÓMO SE GENERAN LOS TÉRMINOS?

### **1️⃣ GENERACIÓN AUTOMÁTICA desde otros módulos**

```
┌─────────────────────────────────────────────────────────────────────────┐
│  MÓDULO DE ORIGEN          │  ACCIÓN                │  TÉRMINO GENERADO  │
├────────────────────────────┼────────────────────────┼───────────────────┤
│  RF001 - Noticias          │  Recibe noticia        │  30 días hábiles  │
│  Disciplinarias            │  disciplinaria         │  para valorar     │
├────────────────────────────┼────────────────────────┼───────────────────┤
│  RF002 - Valoración        │  Jefe decide           │  6 meses para     │
│  y Asignación              │  abrir investigación   │  indagación       │
├────────────────────────────┼────────────────────────┼───────────────────┤
│  RF003 - Carpeta Digital   │  Profesional emite     │  5 días hábiles   │
│                            │  auto de apertura      │  para notificar   │
├────────────────────────────┼────────────────────────┼───────────────────┤
│  RF004 - Revisión          │  Auto firmado por      │  10 días hábiles  │
│  y Aprobación              │  Jefe OCID             │  para descargos   │
├────────────────────────────┼────────────────────────┼───────────────────┤
│  RF003 - Carpeta Digital   │  Se solicitan          │  15 días hábiles  │
│                            │  pruebas               │  para practicar   │
└────────────────────────────┴────────────────────────┴───────────────────┘
```

### **Ejemplo Real del Flujo:**

```
📅 CASO: Proceso P-120-2025 - Juan Pérez Gómez

┌─────────────────────────────────────────────────────────────────────────┐
│  FECHA       │  MÓDULO  │  ACCIÓN                  │  TÉRMINO GENERADO  │
├──────────────┼──────────┼──────────────────────────┼───────────────────┤
│  2025-01-07  │  RF004   │  Jefe firma Auto de      │  ⏰ CREADO:       │
│              │          │  Apertura                │  Notificar en     │
│              │          │                          │  5 días hábiles   │
│              │          │                          │  Vence: 2025-01-14│
├──────────────┼──────────┼──────────────────────────┼───────────────────┤
│  2025-01-10  │  RF006   │  Sistema calcula:        │  ⚠️ ALERTA:       │
│              │          │  Quedan 3 días           │  Próximo a vencer │
│              │          │                          │  Email enviado a  │
│              │          │                          │  Secretaría       │
├──────────────┼──────────┼──────────────────────────┼───────────────────┤
│  2025-01-12  │  RF006   │  Sistema calcula:        │  🚨 ALERTA CRÍTICA│
│              │          │  Quedan 2 días           │  Email urgente    │
├──────────────┼──────────┼──────────────────────────┼───────────────────┤
│  2025-01-13  │  RF003   │  Secretaría notifica     │  ✅ TÉRMINO       │
│              │          │  al investigado          │  CUMPLIDO         │
└──────────────┴──────────┴──────────────────────────┴───────────────────┘
```

---

## 🎬 FLUJO DETALLADO: CICLO DE VIDA DE UN TÉRMINO

### **FASE 1: CREACIÓN DEL TÉRMINO**

```
🔵 PASO 1: Acción en otro módulo
   │
   ├─ Ejemplo: Jefe firma Auto de Apertura en RF004
   │
   └─ Sistema detecta: "Este auto requiere notificación"

🔵 PASO 2: RF006 crea término automáticamente
   │
   ├─ Proceso: P-120-2025
   ├─ Actuación: "Notificación Auto de Apertura"
   ├─ Responsable: "Secretaría OCID"
   ├─ Fecha inicio: 2025-01-07
   ├─ Días hábiles: 5 (según configuración legal)
   ├─ Fecha vencimiento: 2025-01-14 (calculado automáticamente)
   └─ Estado: "PENDIENTE" 🟢
```

### **FASE 2: CÁLCULO AUTOMÁTICO DE DÍAS HÁBILES**

```
⚙️ MOTOR DE CÁLCULO (Excluye automáticamente):
   │
   ├─ ❌ Sábados
   ├─ ❌ Domingos
   └─ ❌ Festivos (desde calendario configurado en RF006)

📅 Ejemplo:
   Fecha inicio: Martes 7 enero 2025
   Días hábiles: 5
   
   Día 1: Miércoles 8 enero ✅
   Día 2: Jueves 9 enero ✅
   Día 3: Viernes 10 enero ✅
   Día 4: Lunes 13 enero ✅ (Sábado 11 y Domingo 12 NO cuentan)
   Día 5: Martes 14 enero ✅
   
   Vencimiento: 14 enero 2025 ⏰
```

### **FASE 3: MONITOREO Y ALERTAS AUTOMÁTICAS**

```
🤖 SISTEMA DE ALERTAS (Revisa cada noche a las 00:00)
   │
   ├─ Calcula días restantes para TODOS los términos activos
   │
   └─ Aplica REGLAS DE ALERTA configuradas:

┌─────────────────────────────────────────────────────────────────────────┐
│  REGLA                │  CONDICIÓN           │  ACCIÓN                  │
├───────────────────────┼──────────────────────┼─────────────────────────┤
│  Alerta Temprana      │  Faltan 10 días      │  • Notificación panel   │
│  (Preventiva)         │                      │  • NO email             │
├───────────────────────┼──────────────────────┼─────────────────────────┤
│  Alerta Preventiva    │  Faltan 5 días       │  • Email al responsable │
│                       │                      │  • Notificación panel   │
├───────────────────────┼──────────────────────┼─────────────────────────┤
│  Alerta Crítica       │  Faltan 2 días       │  • Email URGENTE        │
│                       │                      │  • Email a Jefe OCID    │
│                       │                      │  • Notificación panel   │
├───────────────────────┼──────────────────────┼─────────────────────────┤
│  Alerta Vencimiento   │  Día del vencimiento │  • Email crítico        │
│                       │                      │  • Dashboard rojo 🔴    │
├───────────────────────┼──────────────────────┼─────────────────────────┤
│  Alerta Vencido       │  1+ días vencido     │  • Email diario         │
│                       │                      │  • Reporte a Jefe       │
│                       │                      │  • Dashboard rojo 🔴    │
└───────────────────────┴──────────────────────┴─────────────────────────┘
```

### **FASE 4: CUMPLIMIENTO DEL TÉRMINO**

```
✅ ESCENARIO A: Término cumplido a tiempo
   │
   ├─ Secretaría notifica al investigado (2025-01-13)
   │
   ├─ En RF003 (Carpeta Digital), marca: "Notificado ✅"
   │
   └─ RF006 detecta la acción y:
      ├─ Actualiza estado: PENDIENTE 🟢 → CUMPLIDO ✅
      ├─ Registra fecha de cumplimiento
      ├─ Cancela alertas pendientes
      └─ Registra en historial de auditoría

🔴 ESCENARIO B: Término vencido
   │
   ├─ Pasa la fecha límite sin cumplirse (2025-01-15)
   │
   └─ RF006 automáticamente:
      ├─ Actualiza estado: PENDIENTE 🟢 → VENCIDO 🔴
      ├─ Envía alerta crítica a Jefe OCID
      ├─ Muestra en dashboard con indicador rojo
      ├─ Calcula días de retraso: "1 día vencido"
      └─ Genera reporte de incumplimiento
```

---

## 🔗 INTEGRACIÓN DETALLADA CON CADA MÓDULO

### **🔗 RF001 - NOTICIAS DISCIPLINARIAS**

```
┌─────────────────────────────────────────────────────────────────────────┐
│  INTEGRACIÓN CON RF001                                                  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  📥 Se recibe Noticia Disciplinaria (ND-150-2025)                       │
│      ↓                                                                   │
│  ⏰ RF006 CREA TÉRMINO:                                                 │
│      • Actuación: "Valoración de Noticia Disciplinaria"                │
│      • Responsable: "Jefe OCID"                                         │
│      • Días hábiles: 30 (según Ley 734/2002)                           │
│      • Estado: PENDIENTE 🟢                                             │
│                                                                          │
│  🚨 SI SE VENCE:                                                        │
│      → La noticia debe archivarse                                       │
│      → RF006 alerta al Jefe OCID                                        │
│      → Se registra prescripción administrativa                          │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### **🔗 RF002 - VALORACIÓN Y ASIGNACIÓN**

```
┌─────────────────────────────────────────────────────────────────────────┐
│  INTEGRACIÓN CON RF002                                                  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ⚖️ Jefe decide abrir investigación (Proceso P-120-2025)               │
│      ↓                                                                   │
│  ⏰ RF006 CREA TÉRMINO:                                                 │
│      • Actuación: "Indagación Preliminar"                              │
│      • Responsable: Profesional asignado                                │
│      • Días hábiles: 180 (6 meses según ley)                           │
│      • Estado: PENDIENTE 🟢                                             │
│                                                                          │
│  📊 MONITOREO:                                                          │
│      → RF006 monitorea todo el período de 6 meses                       │
│      → Envía alertas cada mes con recordatorio                          │
│      → Alerta crítica a los 5 meses                                     │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### **🔗 RF003 - CARPETA DIGITAL**

```
┌─────────────────────────────────────────────────────────────────────────┐
│  INTEGRACIÓN CON RF003                                                  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  📁 Profesional trabaja en el proceso día a día                         │
│      ↓                                                                   │
│  ⏰ RF006 MUESTRA TÉRMINOS ACTIVOS:                                     │
│      • Panel lateral con términos del proceso                           │
│      • Semáforo: Verde 🟢 / Amarillo 🟡 / Rojo 🔴                       │
│      • Días restantes visibles                                          │
│                                                                          │
│  🔔 ALERTAS EN TIEMPO REAL:                                             │
│      • Badge rojo en menú: "2 términos próximos a vencer"              │
│      • Popup al abrir carpeta: "Urgente: Notificar hoy"                │
│      • Lista de tareas ordenada por urgencia                            │
│                                                                          │
│  ✅ MARCAR CUMPLIMIENTO:                                                │
│      Profesional: "Notifiqué auto al investigado"                       │
│      → RF003 registra acción                                            │
│      → RF006 detecta y marca término como CUMPLIDO ✅                   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### **🔗 RF004 - REVISIÓN Y APROBACIÓN**

```
┌─────────────────────────────────────────────────────────────────────────┐
│  INTEGRACIÓN CON RF004                                                  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ✍️ Jefe firma Auto de Apertura                                         │
│      ↓                                                                   │
│  ⏰ RF006 CREA AUTOMÁTICAMENTE:                                         │
│      • Término 1: "Notificar Auto" (5 días hábiles)                    │
│      • Término 2: "Investigado presenta descargos" (10 días después)   │
│                                                                          │
│  🔗 TÉRMINOS ENCADENADOS:                                               │
│      Término 1 CUMPLIDO → Activa Término 2 automáticamente              │
│                                                                          │
│  Ejemplo:                                                                │
│      7 ene: Jefe firma auto                                             │
│      → RF006: Notificar antes del 14 ene                                │
│      13 ene: Notificado ✅                                               │
│      → RF006: Descargos vencen el 27 ene (10 días hábiles después)     │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### **🔗 RF005 - EXPEDIENTE ELECTRÓNICO**

```
┌─────────────────────────────────────────────────────────────────────────┐
│  INTEGRACIÓN CON RF005                                                  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  📦 Expediente muestra TRAZABILIDAD de términos                         │
│      ↓                                                                   │
│  📊 SECCIÓN: "Historial de Términos del Proceso"                        │
│      • Todos los términos creados                                       │
│      • Fechas de cumplimiento/vencimiento                               │
│      • Responsables de cada actuación                                   │
│      • Alertas enviadas (auditoría)                                     │
│                                                                          │
│  🔍 AUDITORÍA COMPLETA:                                                 │
│      • Cuándo se creó cada término                                      │
│      • Quién fue el responsable                                         │
│      • Si se cumplió o se venció                                        │
│      • Qué alertas se enviaron                                          │
│      • Evidencia de notificaciones                                      │
│                                                                          │
│  📄 REPORTE PDF:                                                        │
│      Al exportar expediente, incluye:                                   │
│      → Tabla de términos cumplidos ✅                                    │
│      → Tabla de términos vencidos 🔴 (con justificación)               │
│      → Gráfico de línea de tiempo del proceso                           │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### **🔗 RF007 - PROFESIONALES**

```
┌─────────────────────────────────────────────────────────────────────────┐
│  INTEGRACIÓN CON RF007                                                  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  👤 Dashboard del Profesional                                           │
│      ↓                                                                   │
│  ⏰ RF006 MUESTRA:                                                      │
│      • "Mis Términos Pendientes" (lista priorizada)                    │
│      • Vencen hoy: 2 🔴                                                 │
│      • Próximos a vencer: 5 🟡                                          │
│      • Pendientes: 12 🟢                                                │
│                                                                          │
│  📊 MÉTRICAS DE DESEMPEÑO:                                             │
│      • Tasa de cumplimiento: 95% ✅                                     │
│      • Términos vencidos este mes: 1 🔴                                 │
│      • Promedio de cumplimiento: 2 días antes del vencimiento           │
│                                                                          │
│  🎯 DISTRIBUCIÓN DE CARGA:                                              │
│      Jefe OCID ve:                                                      │
│      • Profesional A: 8 términos pendientes                             │
│      • Profesional B: 15 términos pendientes (sobrecargado)             │
│      → Puede reasignar procesos para balancear carga                    │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 📧 SISTEMA DE ALERTAS: QUIÉN RECIBE QUÉ

### **MATRIZ DE NOTIFICACIONES**

```
┌─────────────────────────────────────────────────────────────────────────┐
│  TIPO ALERTA     │  DÍAS ANTES  │  DESTINATARIO       │  CANAL          │
├──────────────────┼──────────────┼─────────────────────┼────────────────┤
│  Temprana        │  10 días     │  Responsable        │  Panel          │
├──────────────────┼──────────────┼─────────────────────┼────────────────┤
│  Preventiva      │  5 días      │  Responsable        │  Email + Panel  │
├──────────────────┼──────────────┼─────────────────────┼────────────────┤
│  Crítica         │  2 días      │  Responsable        │  Email urgente  │
│                  │              │  + Jefe OCID        │  + Panel + SMS  │
├──────────────────┼──────────────┼─────────────────────┼────────────────┤
│  Día Vencimiento │  0 días      │  Responsable        │  Email crítico  │
│                  │              │  + Jefe OCID        │  + Panel        │
│                  │              │  + Secretaría       │  + Dashboard    │
├──────────────────┼──────────────┼─────────────────────┼────────────────┤
│  Vencido         │  -1 día      │  Responsable        │  Email diario   │
│                  │              │  + Jefe OCID        │  + Reporte      │
│                  │              │  + Director         │  + Auditoría    │
└──────────────────┴──────────────┴─────────────────────┴────────────────┘
```

### **EJEMPLO DE EMAIL DE ALERTA**

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
De: sistema.disciplinario@esap.edu.co
Para: marta.torres@esap.edu.co
CC: jefe.ocid@esap.edu.co
Asunto: 🚨 ALERTA CRÍTICA - Término próximo a vencer (2 días)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Estimada Marta Torres,

Se le notifica que el siguiente término procesal vencerá en 2 DÍAS HÁBILES:

┌───────────────────────────────────────────────────────────────────┐
│  PROCESO: P-120-2025 - Juan Pérez Gómez                          │
│  ACTUACIÓN: Notificación Auto de Apertura                        │
│  FECHA INICIO: 2025-01-07                                        │
│  FECHA VENCIMIENTO: 2025-01-14 (Martes)                          │
│  DÍAS RESTANTES: 2 días hábiles                                  │
│  RESPONSABLE: Secretaría OCID                                    │
└───────────────────────────────────────────────────────────────────┘

⚠️ ACCIÓN REQUERIDA:
Por favor, complete la notificación del Auto de Apertura al investigado 
antes del 14 de enero de 2025.

🔗 ACCESOS RÁPIDOS:
• Ver Carpeta Digital del Proceso: [Link]
• Ver detalles del término: [Link]
• Historial de alertas: [Link]

───────────────────────────────────────────────────────────────────

⏰ Sistema de Términos y Alertas - RF006
ESAP - Backoffice Administrativo
Este es un mensaje automático. Por favor no responder.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## 🎯 CASOS DE USO CRÍTICOS

### **CASO 1: Prevención de Prescripción**

```
🚨 PROBLEMA: La indagación preliminar tiene 6 meses de plazo

SOLUCIÓN CON RF006:
┌─────────────────────────────────────────────────────────────────────┐
│  Mes 1-4: Sistema envía recordatorios mensuales                    │
│  Mes 5:   Alerta preventiva con 30 días de anticipación            │
│  Mes 5.5: Alerta crítica con 15 días de anticipación               │
│  Mes 6:   Alerta final: "Proceso debe cerrarse HOY"                │
│                                                                      │
│  RESULTADO: Profesional no olvida el plazo legal                   │
│             Se evita prescripción del proceso                       │
└─────────────────────────────────────────────────────────────────────┘
```

### **CASO 2: Notificaciones Oportunas**

```
📨 PROBLEMA: Auto firmado debe notificarse en 5 días hábiles

SOLUCIÓN CON RF006:
┌─────────────────────────────────────────────────────────────────────┐
│  Día 1: Jefe firma auto → RF006 crea término automáticamente       │
│  Día 2: RF004 envía auto firmado a Secretaría                      │
│  Día 3: RF006 envía primera alerta preventiva                      │
│  Día 4: RF006 envía alerta crítica a Secretaría + Jefe             │
│  Día 5: Secretaría notifica al investigado ✅                       │
│                                                                      │
│  RESULTADO: Cumplimiento del término legal                         │
│             No hay nulidades procesales                             │
└─────────────────────────────────────────────────────────────────────┘
```

### **CASO 3: Gestión de Sobrecarga**

```
👥 PROBLEMA: Profesional con muchos procesos puede olvidar plazos

SOLUCIÓN CON RF006:
┌─────────────────────────────────────────────────────────────────────┐
│  Profesional Marta Torres tiene 15 procesos asignados              │
│  ↓                                                                   │
│  RF006 prioriza términos por urgencia:                             │
│  • 2 términos vencen hoy 🔴                                         │
│  • 3 términos vencen en 2 días 🟡                                   │
│  • 10 términos más lejanos 🟢                                       │
│  ↓                                                                   │
│  Dashboard muestra: "ATENCIÓN: 2 términos urgentes"                │
│  Email diario: Lista priorizada de tareas                          │
│  ↓                                                                   │
│  RESULTADO: Profesional sabe qué hacer primero                     │
│             Gestión eficiente del tiempo                            │
└─────────────────────────────────────────────────────────────────────┘
```

### **CASO 4: Auditoría de Cumplimiento**

```
🔍 PROBLEMA: Contraloría audita expediente y pregunta por vencimientos

SOLUCIÓN CON RF006:
┌─────────────────────────────────────────────────────────────────────┐
│  Auditor: "¿Por qué este auto se notificó tarde?"                  │
│  ↓                                                                   │
│  Jefe OCID accede a RF005 (Expediente Electrónico)                │
│  → Sección: "Historial de Términos"                                │
│  → Ve registro completo:                                            │
│     • Término creado: 7 enero                                       │
│     • Alerta enviada: 10 enero (5 días antes)                      │
│     • Alerta crítica: 12 enero (2 días antes)                      │
│     • Cumplimiento: 13 enero ✅ (1 día antes del vencimiento)      │
│  ↓                                                                   │
│  RESULTADO: Evidencia completa de gestión oportuna                 │
│             Trazabilidad total de alertas                           │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 📊 MÉTRICAS Y REPORTES DE RF006

### **Reportes Generados Automáticamente**

```
📈 REPORTE DIARIO (Para Jefe OCID)
├─ Términos que vencen hoy: 3
├─ Términos próximos a vencer (5 días): 8
├─ Términos vencidos no cumplidos: 2 🔴
└─ Tasa de cumplimiento del mes: 92%

📊 REPORTE MENSUAL (Para Dirección)
├─ Total términos gestionados: 156
├─ Cumplidos a tiempo: 144 (92.3%)
├─ Cumplidos con retraso: 8 (5.1%)
├─ Vencidos sin cumplir: 4 (2.6%) 🔴
├─ Profesional con mejor desempeño: Laura Díaz (98%)
└─ Profesional con más vencimientos: Carlos Ruiz (3) 🔴

📉 ANÁLISIS DE RIESGO (Para Auditoría)
├─ Procesos en riesgo de prescripción: 2
├─ Términos críticos pendientes: 5
├─ Alertas no atendidas: 1
└─ Recomendaciones: Reasignar carga de Carlos Ruiz
```

---

## 🔧 CONFIGURACIÓN DEL SISTEMA

### **Parámetros Configurables en RF006**

```
⚙️ CALENDARIO DE FESTIVOS
├─ Festivos nacionales (obligatorios)
├─ Festivos regionales (por territorial)
├─ Días institucionales (ESAP)
└─ Importación automática desde fuente oficial

⚙️ REGLAS DE ALERTA
├─ Días de anticipación (2, 5, 10 días)
├─ Canales de notificación (Email, Panel, SMS)
├─ Destinatarios (Responsable, Jefe, Ambos)
├─ Horario de envío (Evitar fines de semana)
└─ Activar/Desactivar por tipo de término

⚙️ TÉRMINOS LEGALES (Base de conocimiento)
├─ Valoración de noticia: 30 días hábiles
├─ Indagación preliminar: 6 meses
├─ Notificación de auto: 5 días hábiles
├─ Presentación de descargos: 10 días hábiles
├─ Práctica de pruebas: 15 días hábiles
└─ Decisión final: 60 días hábiles

⚙️ INTEGRACIONES
├─ Email corporativo (SMTP ESAP)
├─ SMS (proveedor)
├─ Dashboard en RF007 (Profesionales)
└─ Auditoría en RF005 (Expediente)
```

---

## 🚀 RESUMEN EJECUTIVO

### **¿Por qué RF006 es CRÍTICO para el sistema?**

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    SIN RF006 (Términos y Alertas)                       │
├─────────────────────────────────────────────────────────────────────────┤
│  ❌ Procesos prescriben por vencimiento de plazos                       │
│  ❌ Autos mal notificados → Nulidades procesales                        │
│  ❌ Profesionales olvidan fechas límite                                 │
│  ❌ Jefe OCID no sabe qué procesos están en riesgo                      │
│  ❌ Auditoría no puede verificar cumplimiento                           │
│  ❌ Sanciones de entes de control por incumplimientos                   │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                    CON RF006 (Términos y Alertas)                       │
├─────────────────────────────────────────────────────────────────────────┤
│  ✅ Cálculo automático de días hábiles (excluye festivos)               │
│  ✅ Alertas preventivas antes de vencimientos                           │
│  ✅ Trazabilidad completa de términos                                   │
│  ✅ Dashboard con semáforo de riesgos                                   │
│  ✅ Cumplimiento normativo garantizado                                  │
│  ✅ Auditoría completa para entes de control                            │
│  ✅ Prevención de prescripciones y nulidades                            │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 💡 ANALOGÍA FINAL

```
🏢 Proceso Disciplinario = FÁBRICA

RF001 - Noticias       = Materia prima que entra
RF002 - Valoración     = Control de calidad inicial
RF003 - Carpeta        = Línea de producción (trabajo diario)
RF004 - Revisión       = Control de calidad final
RF005 - Expediente     = Bodega de productos terminados

🕐 RF006 - TÉRMINOS    = RELOJ DE LA FÁBRICA ⏰

Sin reloj:
• No sabes cuándo entregar
• Incumples compromisos con clientes
• Pierdes contratos por retrasos

Con reloj:
• Entregas a tiempo
• Cumples compromisos
• Evitas penalizaciones
• Generas confianza
```

---

## ✅ CONCLUSIÓN

**RF006 - Términos y Alertas NO es opcional, es ESENCIAL:**

- ⏰ **Monitorea** todo el proceso disciplinario
- 🤖 **Calcula** automáticamente días hábiles
- 🔔 **Alerta** antes de vencimientos
- 📊 **Reporta** métricas de cumplimiento
- 🔍 **Audita** trazabilidad de términos
- ⚖️ **Garantiza** cumplimiento legal

Sin RF006, el sistema disciplinario es un barco sin brújula ni reloj.  
Con RF006, cada término es monitoreado, cada alerta es enviada, cada vencimiento es prevenido.

---

**🎯 ESAP - Backoffice Administrativo v1.0**  
*Control Interno Disciplinario - Documentación Técnica RF006*
