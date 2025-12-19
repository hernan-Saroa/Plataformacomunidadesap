# 🎯 GUÍA DE ACCESO - MÓDULO DEFENSA JUDICIAL (MOD-01)

## 📍 **CÓMO VER LOS NUEVOS COMPONENTES**

### **OPCIÓN 1: Desde el Kanban (Recomendado)**

1. **Iniciar Sesión** en el Backoffice
2. **Abrir Sidebar** (menú lateral izquierdo)
3. **Navegar a:** `Gestión Legal` → `Sistema Integral de Gestión Legal (SIGL)`
4. **Seleccionar:** `MOD-01 - Defensa Judicial` en el selector de módulos
5. **Click en botón:** `Vista Completa` (botón azul en la barra superior del Kanban)

### **OPCIÓN 2: Desde el Sidebar Directo**

1. **Iniciar Sesión** en el Backoffice
2. **Abrir Sidebar**
3. **Click en:** `Gestión Legal` → `Defensa Judicial (MOD-01)`
4. Esto abrirá directamente el Kanban del módulo
5. **Click en:** `Vista Completa`

---

## 🎨 **QUÉ VAS A VER**

### **Vista Lista (Principal)**
- ✅ Tabla completa de expedientes judiciales
- ✅ 6 Tarjetas de estadísticas (Total, Verde, Amarillo, Rojo, Vencidos, Activos)
- ✅ Filtros múltiples (jurisdicción, estado, alerta)
- ✅ Búsqueda en tiempo real
- ✅ Semáforo visual (VERDE/AMARILLO/ROJO/VENCIDO)
- ✅ Botón "Nuevo Expediente"

### **Formulario de Creación**
Al hacer click en **"Nuevo Expediente"**:
- ✅ Wizard de 4 pasos (Jurisdicción → Info Básica → Demanda → Asignación)
- ✅ 4 Jurisdicciones disponibles (Constitucional, Contencioso, Laboral, Ordinaria)
- ✅ Cálculo automático de plazos en días hábiles
- ✅ Validaciones según normativa colombiana
- ✅ Stepper visual con progreso

### **Vista Detalle**
Al hacer click en el botón 👁️ (Ver) de un expediente:
- ✅ Información completa del expediente
- ✅ Timeline de fechas y plazos
- ✅ Pretensión del demandante
- ✅ Lista de documentos
- ✅ Acciones rápidas (Editar, Subir Documento, Generar Reporte)

---

## 📊 **EXPEDIENTES DE EJEMPLO**

### **5 Expedientes Mock Precargados:**

1. **PJ-2025-00001** - Acción de Tutela
   - Estado: ROJO (2 días restantes)
   - Jurisdicción: Constitucional
   - Demandante: Juan Pérez Gómez vs ESAP

2. **PJ-2025-00002** - Nulidad y Restablecimiento
   - Estado: AMARILLO (8 días restantes)
   - Jurisdicción: Contencioso Administrativo
   - Demandante: María Rodríguez vs ESAP

3. **PJ-2025-00003** - Proceso Ordinario Laboral
   - Estado: VENCIDO (-42 días)
   - Jurisdicción: Laboral
   - Demandante: Carlos Méndez Silva vs ESAP

4. **PJ-2025-00004** - Proceso Ejecutivo
   - Estado: VERDE (24 días restantes)
   - Jurisdicción: Ordinaria
   - Demandante: Constructora ABC S.A.S. vs ESAP

5. **PJ-2024-00156** - Acción de Nulidad
   - Estado: AMARILLO (13 días restantes)
   - Jurisdicción: Contencioso Administrativo
   - Demandante: Ana Gutiérrez López vs ESAP

---

## 🔧 **COMPONENTES CREADOS**

### **Archivos Nuevos:**

1. **`/components/esap/gestion-legal/ModuloDefensaJudicial.tsx`**
   - Módulo principal completo
   - Vista Lista + Vista Detalle
   - Integración con Kanban

2. **`/components/esap/gestion-legal/FormularioExpedienteCompleto.tsx`**
   - Wizard de 4 pasos
   - Validaciones completas
   - Cálculo automático de plazos

3. **`/components/esap/gestion-legal/SistemaAlertasExpedientes.tsx`**
   - Motor de alertas diarias
   - Semáforo VERDE/AMARILLO/ROJO/VENCIDO
   - Dashboard de alertas

4. **`/components/esap/gestion-legal/GestionDocumentosExpediente.tsx`**
   - Upload de documentos
   - Clasificación por tipos
   - Vista previa y descarga

### **Archivos Modificados:**

1. **`/components/esap/gestion-legal/KanbanSIGL.tsx`**
   - Agregado: Import de ModuloDefensaJudicial
   - Agregado: Estado `vistaModuloCompleto`
   - Agregado: Renderizado condicional para vista completa

2. **`/components/esap/gestion-legal/KanbanGestionLegal.tsx`**
   - Agregado: Prop `onAbrirModuloCompleto`
   - Agregado: Botón "Vista Completa" (solo visible en MOD-01)

3. **`/components/esap/gestion-legal/index.ts`**
   - Agregado: Exports de nuevos componentes

---

## 🚀 **FUNCIONALIDADES IMPLEMENTADAS**

### ✅ **1. Formulario Completo de Expedientes**
- Wizard multi-paso con validaciones
- 4 Jurisdicciones configuradas según normativa colombiana
- Cálculo automático de días hábiles (excluye festivos 2025)
- Plazos taxativos vs editables
- Verificación de duplicados

### ✅ **2. Sistema de Alertas Automáticas**
- Motor diario de cálculo de alertas
- Semáforo dinámico:
  - **VERDE**: >50% del plazo restante
  - **AMARILLO**: 25-50% del plazo
  - **ROJO**: <25% del plazo (CRÍTICO)
  - **VENCIDO**: ≤0 días
- Notificaciones automáticas al cambiar color
- Alertas especiales Día 25 y Día 28
- Escalación a MOD-08 cuando vence

### ✅ **3. Gestión Documental**
- Upload de archivos (PDF, DOC, DOCX, JPG, PNG, XLS, XLSX)
- Clasificación por 10 tipos de documentos
- Vista previa y descarga
- Sistema de etiquetas
- Contador de visualizaciones
- Validaciones de tamaño (máx 50MB) y formato

### ✅ **4. Integración Kanban ↔ Módulo Completo**
- Navegación fluida entre vistas
- Botón condicional solo en MOD-01
- Preservación del estado del Kanban
- Diseño conservado

---

## 🎯 **PRÓXIMOS PASOS**

### **Backend Integration (Cuando esté listo):**
```typescript
// 1. API de expedientes
POST /api/expedientes/crear
GET /api/expedientes/listar
PUT /api/expedientes/:id/actualizar

// 2. Job diario de alertas
// Ejecutar a las 6:00 AM UTC
cron: '0 6 * * *'
handler: SistemaAlertasExpedientes.ejecutarJobDiario()

// 3. Storage de documentos
// AWS S3 / Azure Blob Storage
uploadDocument(file, expedienteId)
```

### **Replicar en otros módulos:**
- MOD-02 (Órganos de Control)
- MOD-03 (Asesoría Jurídica)
- MOD-04 (Juzgamiento Disciplinario)
- etc.

---

## 📞 **SOPORTE**

Si no ves los cambios:

1. **Verifica que estás en el módulo correcto:**
   - Sidebar → Gestión Legal → Sistema SIGL
   - O: Gestión Legal → Defensa Judicial (MOD-01)

2. **Busca el botón "Vista Completa":**
   - Debe estar en la barra superior del Kanban
   - Solo aparece en MOD-01 (Defensa Judicial)

3. **Revisa la consola del navegador:**
   - F12 → Console
   - Busca errores en rojo

4. **Archivos a verificar:**
   ```
   /components/esap/gestion-legal/ModuloDefensaJudicial.tsx
   /components/esap/gestion-legal/FormularioExpedienteCompleto.tsx
   /components/esap/gestion-legal/SistemaAlertasExpedientes.tsx
   /components/esap/gestion-legal/GestionDocumentosExpediente.tsx
   ```

---

## ✨ **RESUMEN**

**IMPLEMENTADO:**
- ✅ Módulo Defensa Judicial completo
- ✅ Formulario de expedientes (4 jurisdicciones)
- ✅ Sistema de alertas automáticas
- ✅ Gestión documental
- ✅ Integración con Kanban

**LISTO PARA:**
- 🚀 Testing completo
- 🚀 Integración con backend
- 🚀 Replicación en otros módulos

**DISEÑO:**
- ✅ Conservado completamente
- ✅ Mobile-first y responsive
- ✅ Colores corporativos ESAP (#003DA5)
- ✅ Design system SIGL
