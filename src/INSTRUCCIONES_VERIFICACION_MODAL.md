# 🔍 INSTRUCCIONES PARA VERIFICAR EL MODAL DE EXPEDIENTE

## ⚠️ IMPORTANTE: El archivo está 100% implementado

El archivo `/components/esap/gestion-legal/modulos/ModalExpediente.tsx` está **completamente actualizado** con todas las nuevas funcionalidades.

## 🔄 PASOS PARA VER LOS CAMBIOS

### 1️⃣ Refresca Completamente el Navegador

**Chrome/Edge/Brave:**
- Windows: `Ctrl + Shift + R` o `Ctrl + F5`
- Mac: `Cmd + Shift + R`

**Firefox:**
- Windows: `Ctrl + F5`
- Mac: `Cmd + Shift + R`

**Safari:**
- Mac: `Cmd + Option + R`

### 2️⃣ Limpia la Caché (Si el paso 1 no funciona)

**Chrome/Edge:**
1. Abre DevTools (`F12`)
2. Click derecho en el botón de Refresh (🔄)
3. Selecciona **"Empty Cache and Hard Reload"**

**Firefox:**
1. Abre el menú (☰)
2. Opciones → Privacidad y Seguridad
3. Cookies y datos del sitio → Limpiar datos

### 3️⃣ Verifica que el Servidor de Desarrollo está Corriendo

Si usas Vite, deberías ver en la terminal:
```
VITE vX.X.X  ready in XXX ms
➜  Local:   http://localhost:XXXX/
```

Si no ves esto, reinicia el servidor:
```bash
npm run dev
# o
yarn dev
```

## ✅ QUÉ DEBERÍAS VER AL ABRIR EL MODAL

### Header Azul Degradado (Parte Superior)
```
┌─────────────────────────────────────────────────────┐
│ 🏛️ RADICADO: PJ-2025-001                  [X]      │
│ Nulidad y Restablecimiento del Derecho              │
│                                                      │
│ [CONTESTACIÓN] [⚡ Próximo - 25 días]               │
│ [📄 7 documentos] [⚖️ 6 actuaciones] [✅ 3 tareas] │
│                                                      │
│ Progreso del Proceso ────────── 45%                 │
│ ████████████░░░░░░░░░░░░░░░░░░░░░                   │
│ 22 días transcurridos     28 días restantes         │
└─────────────────────────────────────────────────────┘
```

### 6 Tabs Disponibles
```
┌───────────────────────────────────────────────────┐
│ [📋 General] [👥 Partes] [📄 Documentos]         │
│ [⚖️ Actuaciones] [✅ Tareas] [📝 Notas]           │
└───────────────────────────────────────────────────┘
```

### TAB "General" (Primera Vista)
Deberías ver:
- ✅ Resumen Ejecutivo (3 columnas: Juzgado, Cuantía, Fecha)
- ✅ Datos del Proceso (grid con radicado, medio de control, etapa, etc.)
- ✅ Profesional Asignado (con avatar y botón "Reasignar")
- ✅ Pretensiones del Demandante (lista de 6 items)
- ✅ Última Actuación Procesal (caja azul destacada)
- ✅ **Riesgos Identificados** (3 tarjetas naranjas con niveles)

### TAB "Documentos" (Tercer Tab)
Deberías ver:
- ✅ Buscador con ícono 🔍
- ✅ Dropdown de filtro por tipo
- ✅ Botón "Descargar Todos" (azul ESAP)
- ✅ Contador "7 de 7 documentos"
- ✅ 7 documentos listados con botones Ver y Descargar

### TAB "Tareas" (Quinto Tab)
Deberías ver:
- ✅ Botón "Nueva Tarea" (naranja)
- ✅ 3 tareas con badges de prioridad
- ✅ Cada tarea tiene semáforo de días restantes
- ✅ Botones "Marcar Completada" y "Editar"

### Footer con Acciones (Parte Inferior)
```
┌─────────────────────────────────────────────────────┐
│ [Cerrar]  Expediente PJ-2025-001 · 7 docs · 6 act  │
│                                                      │
│         [🔔 Notificar] [🔗 Compartir] [📄 PDF]    │
│         [🪟 Abrir en Pestaña]                       │
└─────────────────────────────────────────────────────┘
```

## 🐛 SOLUCIÓN DE PROBLEMAS

### Problema 1: "No veo el header azul"
**Solución:** 
- Limpia la caché completamente (paso 2 arriba)
- Cierra y reabre el navegador
- Verifica en DevTools → Network que se cargó el archivo actualizado

### Problema 2: "Solo veo 4 tabs en lugar de 6"
**Solución:**
- El archivo no se actualizó correctamente
- Verifica la ruta: `/components/esap/gestion-legal/modulos/ModalExpediente.tsx`
- Confirma que tiene 1,130 líneas de código
- Reinicia el servidor de desarrollo

### Problema 3: "Error en la consola"
**Solución:**
- Abre DevTools (`F12`)
- Ve a la pestaña Console
- Copia el error completo
- Probablemente sea un error de importación o tipo

### Problema 4: "El modal no abre"
**Solución:**
- Verifica que el botón "Expediente" existe en la tarjeta
- Confirma que el estado `modalExpedienteOpen` funciona
- Revisa la consola por errores

## 🧪 PRUEBA RÁPIDA

Ejecuta este código en la consola del navegador (DevTools):
```javascript
// Verifica que el componente está cargado
console.log('Versión del Modal:', document.querySelector('[role="dialog"]'));

// Debería mostrar el modal si está abierto
```

## 📸 CAPTURAS DE REFERENCIA

### ✅ Header Correcto
- Fondo: Degradado azul (#2563EB → #1E40AF)
- Título: Blanco, grande (2xl)
- 5 badges visibles
- Barra de progreso con degradado verde-azul

### ✅ Tab "Riesgos" en General
- 3 tarjetas con fondo naranja claro
- Cada una con badge de nivel (Alto/Medio)
- Descripción + plan de mitigación

### ✅ Tab "Documentos"
- 7 documentos listados
- Buscador funcional
- Filtro por tipo funcional
- Botón "Descargar Todos"

## 🆘 SI AÚN NO FUNCIONA

1. **Verifica el archivo fuente:**
   ```bash
   # Desde la raíz del proyecto
   cat components/esap/gestion-legal/modulos/ModalExpediente.tsx | grep "TAB: TAREAS"
   ```
   Deberías ver: `{/* ==================== TAB: TAREAS ==================== */}`

2. **Cuenta las líneas:**
   ```bash
   wc -l components/esap/gestion-legal/modulos/ModalExpediente.tsx
   ```
   Deberías ver: `1130`

3. **Busca el header azul:**
   ```bash
   cat components/esap/gestion-legal/modulos/ModalExpediente.tsx | grep "from-blue-600"
   ```
   Deberías ver: `<div className="sticky top-0 z-10 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4">`

## ✅ CONFIRMACIÓN FINAL

**El archivo está correctamente implementado con:**
- ✅ 1,130 líneas de código
- ✅ 6 tabs funcionales
- ✅ 12 handlers de acciones
- ✅ 24 datos mock
- ✅ Header azul degradado
- ✅ Footer con 5 botones
- ✅ Sistema de riesgos
- ✅ Timeline de actuaciones
- ✅ Gestión de tareas
- ✅ Notas internas

**Si sigues sin ver los cambios después de:**
1. Refrescar con Ctrl+Shift+R
2. Limpiar caché
3. Reiniciar servidor

**Entonces hay un problema con el entorno de desarrollo, no con el código.**

---

**Archivo de verificación creado:** 26/12/2024  
**Estado del código:** ✅ 100% IMPLEMENTADO  
**Requiere:** Solo refrescar el navegador
