# 📝 Editor de Plantillas de Mensajes - SIGL

## 🎯 Descripción

Editor profesional de **clase mundial** para gestionar las plantillas de notificaciones del Sistema Integrado de Gestión Legal (SIGL). Permite personalizar completamente los mensajes que se envían a través de los diferentes canales de comunicación.

---

## 📍 Ubicación

**Navegación:**
1. Sidebar → **Gestión Legal (SIGL)**
2. Navegación horizontal → **Centro de Alertas** 🔔
3. Tab → **Plantillas** 📄

---

## ✨ Características Principales

### 🎨 **Diseño Premium**
- ✅ Interfaz moderna dividida en dos paneles (Lista + Editor)
- ✅ Animaciones fluidas con Motion (Framer Motion)
- ✅ Filtros inteligentes por canal y nivel de alerta
- ✅ Color-coding según nivel de alerta
- ✅ Responsive completo - mobile-first

### 🔧 **Funcionalidades**

#### **1. Gestión de Plantillas**
- ✅ **Ver** todas las plantillas disponibles
- ✅ **Editar** plantillas existentes
- ✅ **Duplicar** plantillas para crear variantes
- ✅ **Restaurar** valores por defecto
- ✅ **Activar/Desactivar** plantillas individuales

#### **2. Editor Visual**
- ✅ **Campo Asunto** (solo para EMAIL)
- ✅ **Campo Cuerpo** con textarea monoespaciada
- ✅ **Inserción de variables** con un click
- ✅ **Validación en tiempo real**
- ✅ **Caracteres especiales** permitidos (emojis, markdown)

#### **3. Variables Dinámicas**
```
{modulo}              → Nombre del módulo SIGL
{expediente}          → Número de radicado/expediente
{responsable}         → Nombre del responsable
{dias_restantes}      → Días restantes hasta vencimiento
{fecha_vencimiento}   → Fecha de vencimiento (DD/MM/YYYY)
{fecha_actual}        → Fecha actual (DD/MM/YYYY)
{prioridad}           → Prioridad del proceso (ALTA/MEDIA/BAJA)
{institucion}         → ESAP
```

#### **4. Vista Previa**
- ✅ **Previsualización en tiempo real** con datos de ejemplo
- ✅ **Toggle on/off** para mostrar/ocultar
- ✅ **Reemplazo automático** de variables
- ✅ **Formato visual** según canal (Email, Teams, SMS, In-App)

---

## 🎨 Plantillas Predeterminadas

### 📧 **EMAIL** (4 plantillas)
| Nivel | Nombre | Uso |
|-------|--------|-----|
| 🟢 VERDE | Email - Alerta Verde | Recordatorio preventivo (> 15 días) |
| 🟡 AMARILLO | Email - Alerta Amarilla | Precaución (10-15 días) |
| 🔴 ROJO | Email - Alerta Roja | Urgente (< 10 días) |
| ⚫ VENCIDO | Email - Término Vencido | Proceso vencido |

**Características EMAIL:**
- Incluye campo **Asunto** personalizable
- Formato formal y profesional
- Saludo y despedida corporativa
- Detalle completo del proceso

### 💬 **MICROSOFT TEAMS** (3 plantillas)
| Nivel | Nombre | Uso |
|-------|--------|-----|
| 🟡 AMARILLO | Teams - Alerta Amarilla | Mensaje de precaución |
| 🔴 ROJO | Teams - Alerta Roja | Mensaje urgente |
| ⚫ VENCIDO | Teams - Término Vencido | Alerta crítica |

**Características TEAMS:**
- Formato con **Markdown** (negrita, emojis)
- Mensajes **concisos** y directos
- Estructura en bullet points
- Call-to-action claro

### 📱 **SMS** (3 plantillas)
| Nivel | Nombre | Uso |
|-------|--------|-----|
| 🟡 AMARILLO | SMS - Alerta Amarilla | Recordatorio breve |
| 🔴 ROJO | SMS - Alerta Roja | Alerta urgente |
| ⚫ VENCIDO | SMS - Término Vencido | Notificación crítica |

**Características SMS:**
- **Máximo 160 caracteres** recomendado
- Sin formato especial
- Información esencial solamente
- Firma institucional abreviada

### 🔔 **IN-APP** (4 plantillas)
| Nivel | Nombre | Uso |
|-------|--------|-----|
| 🟢 VERDE | In-App - Alerta Verde | Notificación informativa |
| 🟡 AMARILLO | In-App - Alerta Amarilla | Notificación de atención |
| 🔴 ROJO | In-App - Alerta Roja | Notificación urgente |
| ⚫ VENCIDO | In-App - Término Vencido | Notificación crítica |

**Características IN-APP:**
- Mensajes **cortos y directos**
- Máximo 2-3 líneas
- Sin saludo/despedida
- Tono informativo

---

## 🎯 Filtros Disponibles

### **Por Canal**
```
┌─────────────────────────────┐
│ TODOS | EMAIL | TEAMS | SMS │ IN-APP
└─────────────────────────────┘
```

### **Por Nivel de Alerta**
```
┌────────────────────────────────────────┐
│ TODOS | 🟢 VERDE | 🟡 AMARILLO | 🔴 ROJO | ⚫ VENCIDO
└────────────────────────────────────────┘
```

---

## 📝 Ejemplo de Uso

### **Crear/Editar Plantilla**

1. **Seleccionar plantilla** de la lista (panel izquierdo)
2. Click en **"Editar"**
3. **Modificar** asunto y/o cuerpo
4. **Insertar variables** clickeando en los botones
5. Click en **"Guardar"**

### **Ejemplo: Plantilla Email Amarilla**

```
ASUNTO:
⚠ {modulo} - PRECAUCIÓN: Quedan {dias_restantes} días

CUERPO:
Estimado/a {responsable},

⚠ ALERTA AMARILLA - PRECAUCIÓN

El proceso de {modulo} con radicado {expediente} requiere su atención:

📅 Días restantes: {dias_restantes}
📆 Fecha de vencimiento: {fecha_vencimiento}
⚠ Estado: PRECAUCIÓN - Atención requerida

Por favor, priorice la gestión de este proceso para evitar vencimientos.

Cordialmente,
Sistema SIGL - ESAP
```

### **Vista Previa (con datos de ejemplo)**

```
ASUNTO:
⚠ Defensa Judicial - PRECAUCIÓN: Quedan 5 días

CUERPO:
Estimado/a Juan Pérez García,

⚠ ALERTA AMARILLA - PRECAUCIÓN

El proceso de Defensa Judicial con radicado 2024-001234 requiere su atención:

📅 Días restantes: 5
📆 Fecha de vencimiento: 25/12/2024
⚠ Estado: PRECAUCIÓN - Atención requerida

Por favor, priorice la gestión de este proceso para evitar vencimientos.

Cordialmente,
Sistema SIGL - ESAP
```

---

## 🔄 Gestión de Plantillas

### **Duplicar Plantilla**
1. Seleccionar plantilla
2. Click en **"Duplicar"**
3. Se crea una copia con sufijo "(Copia)"
4. Estado: **Inactiva** por defecto
5. Editar y personalizar según necesidad

### **Activar/Desactivar**
- ✅ **Activa**: Se usa en las notificaciones automáticas
- ⭕ **Inactiva**: No se envía, solo almacenada

### **Restaurar Valores por Defecto**
1. Click en **"Restaurar Defecto"**
2. Confirmar acción
3. Se pierden **TODAS** las personalizaciones
4. Se restauran las 14 plantillas predeterminadas

---

## 🎨 Buenas Prácticas

### **✅ Hacer**
- Usar **emojis** para mejor visualización
- Mantener **consistencia** en el tono según canal
- Usar **todas las variables** necesarias
- Probar la **vista previa** antes de guardar
- Mantener mensajes **claros y concisos**

### **❌ Evitar**
- **No** usar lenguaje técnico complejo
- **No** exceder longitud recomendada (especialmente SMS)
- **No** omitir información crítica (fecha, expediente)
- **No** usar variables inexistentes
- **No** desactivar todas las plantillas de un nivel

---

## 📊 Limitaciones Técnicas

### **EMAIL**
- ✅ Sin límite de caracteres
- ✅ Asunto + Cuerpo personalizables
- ✅ Permite HTML básico
- ✅ Soporta emojis y caracteres especiales

### **TEAMS**
- ⚠️ Máximo recomendado: **500 caracteres**
- ✅ Soporta Markdown básico
- ✅ Soporta emojis
- ⚠️ Sin asunto

### **SMS**
- ⚠️ Máximo: **160 caracteres** (1 mensaje)
- ⚠️ Hasta **480 caracteres** (3 mensajes concatenados)
- ⚠️ Sin formato
- ⚠️ Emojis cuentan como múltiples caracteres

### **IN-APP**
- ✅ Máximo recomendado: **200 caracteres**
- ✅ Sin formato especial
- ⚠️ Sin asunto
- ✅ Soporta emojis

---

## 🔗 Integración con Sistema de Alertas

Las plantillas se utilizan automáticamente cuando el sistema envía notificaciones:

```typescript
// Pseudocódigo del flujo
1. Proceso alcanza umbral de alerta (ej: 5 días restantes)
2. Sistema determina nivel (ROJO)
3. Sistema consulta configuración del módulo
4. Sistema selecciona canales activos (EMAIL, TEAMS, IN-APP)
5. Para cada canal:
   a. Obtiene plantilla activa del nivel ROJO
   b. Reemplaza variables con datos reales
   c. Envía notificación
```

---

## 🛠️ Personalización Avanzada

### **Usar Markdown en TEAMS**
```markdown
**Negrita**
*Cursiva*
- Lista item 1
- Lista item 2
[Enlace](https://url.com)
```

### **Emojis Recomendados**
```
✓ ✔ ✅ → Éxito, completado
⚠ ⚡ → Precaución, atención
🔥 🚨 → Urgente, crítico
❌ ⛔ → Vencido, error
📅 📆 → Fechas
📋 📝 → Documentos
👤 👥 → Personas
```

---

## 📱 Responsive Design

### **Desktop** (> 1024px)
- Panel izquierdo: 33% (Lista)
- Panel derecho: 67% (Editor)
- Scroll independiente en cada panel

### **Tablet** (768-1024px)
- Panel izquierdo: 40% (Lista)
- Panel derecho: 60% (Editor)
- Layout compacto

### **Mobile** (< 768px)
- Vista en columna única
- Botón toggle para cambiar entre lista y editor
- Scroll vertical completo

---

## 🎯 Validaciones Implementadas

### **Al Guardar**
- ✅ Cuerpo no puede estar vacío
- ✅ Asunto obligatorio solo en EMAIL
- ✅ Variables deben existir en la lista permitida
- ✅ Longitud máxima sugerida según canal

### **En Tiempo Real**
- ✅ Contador de caracteres (SMS)
- ✅ Resaltado de variables
- ✅ Advertencias de longitud

---

## 📊 Estadísticas

```
Total de Plantillas: 14
├─ EMAIL: 4
├─ TEAMS: 3
├─ SMS: 3
└─ IN-APP: 4

Por Nivel:
├─ VERDE: 2
├─ AMARILLO: 4
├─ ROJO: 4
└─ VENCIDO: 4
```

---

## 🚀 Próximos Desarrollos

- [ ] **Plantillas por módulo específico**
- [ ] **Editor WYSIWYG para EMAIL**
- [ ] **Historial de versiones**
- [ ] **Plantillas multiidioma**
- [ ] **Variables condicionales** (`{si dias < 3}...{fin}`)
- [ ] **Plantillas de escalamiento** (supervisor, director)
- [ ] **Preview por dispositivo** (mobile/desktop)
- [ ] **Análisis de efectividad** por plantilla

---

## 📞 Soporte

**Archivo:** `/components/esap/alertas/PlantillasMensajes.tsx`
**Integración:** `/components/esap/alertas/CentroConfiguracionAlertas.tsx`
**Hook:** `/components/esap/alertas/useAlertasConfig.ts`

---

**Última actualización:** Diciembre 2024  
**Versión:** 1.0.0 - Editor Completo ✨  
**Estado:** ✅ Producción Ready
