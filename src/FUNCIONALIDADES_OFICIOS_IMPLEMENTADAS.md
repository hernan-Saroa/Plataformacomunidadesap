# ✅ Funcionalidades de Oficios Judiciales - ESAP Defensa Judicial

## 📋 Resumen de Implementación

Se han implementado exitosamente **dos funcionalidades principales** para el módulo de Defensa Judicial - Tablero Kanban - Oficios:

### 1. ✨ **Vista Previa en Tiempo Real**
### 2. ⚙️ **Configurador de Plantillas de Oficios**

---

## 🔍 1. Vista Previa en Tiempo Real

### **Archivo:** `/components/esap/gestion-legal/modulos/ModalRedactarOficio.tsx`

### **Funcionalidad:**
El modal "Redactar Oficio Judicial" ahora incluye una pestaña **"Vista Previa"** que muestra el oficio con formato oficial ESAP mientras el usuario escribe.

### **Características:**

#### ✅ **Vista Previa Reactiva:**
- La vista previa se actualiza **automáticamente** mientras escribes en la pestaña "Redactar"
- Muestra el oficio con el formato oficial ESAP completo
- Incluye todos los campos: número, fecha, destinatario, asunto, expediente, contenido y firma

#### ✅ **Formato Oficial ESAP:**
- **Membrete corporativo** con nombre de la entidad
- **Colores corporativos** (#003DA5 azul, #F57C00 naranja)
- **Borde superior decorativo** de 4px
- **Gradiente de fondo** en el encabezado
- **Estructura profesional** con metadatos organizados
- **Pie de página** con información del sistema

#### ✅ **Elementos Incluidos en la Vista Previa:**
```
┌─────────────────────────────────────────┐
│  MEMBRETE CORPORATIVO                   │
│  - Nombre de la entidad (ESAP)         │
│  - Subtítulo y dependencia             │
│  - Borde decorativo azul               │
├─────────────────────────────────────────┤
│  METADATOS DEL OFICIO                   │
│  - OFICIO No: [Número ingresado]       │
│  - FECHA: [Fecha automática]           │
│  - PARA: [Destinatario]                │
│  - ASUNTO: [Asunto del oficio]         │
│  - EXPEDIENTE: [ID del expediente]     │
├─────────────────────────────────────────┤
│  CONTENIDO                              │
│  - Texto completo del oficio           │
│  - Formato justificado                 │
│  - Interlineado profesional            │
├─────────────────────────────────────────┤
│  FIRMA Y DATOS DE CONTACTO              │
│  - Nombre del firmante                 │
│  - Dependencia                         │
│  - Entidad                             │
├─────────────────────────────────────────┤
│  ANEXOS (si hay archivos adjuntos)     │
│  - Lista de archivos con tamaños       │
├─────────────────────────────────────────┤
│  PIE DE PÁGINA                          │
│  - Texto oficial del sistema           │
└─────────────────────────────────────────┘
```

#### ✅ **Navegación entre Pestañas:**
- **Pestaña "Redactar"**: Formulario completo para ingresar datos
- **Pestaña "Vista Previa"**: Visualización del documento final
- Cambio instantáneo sin perder información

#### ✅ **Sincronización Automática:**
Todos los campos se sincronizan en tiempo real:
- ✓ Número del oficio
- ✓ Destinatario
- ✓ Asunto
- ✓ Contenido completo (con formato preservado)
- ✓ Firma
- ✓ Archivos adjuntos (muestra la lista)
- ✓ Fecha automática
- ✓ Expediente

---

## ⚙️ 2. Configurador de Plantillas de Oficios

### **Archivo:** `/components/esap/gestion-legal/modulos/ConfiguradorPlantillasOficios.tsx`

### **Funcionalidad:**
Editor completo para personalizar el diseño y formato de los oficios judiciales oficiales.

### **Características:**

#### ✅ **Configuración de Información de la Entidad:**
- Nombre de la entidad
- Subtítulo de la entidad
- Dependencia
- Dirección física
- Teléfono
- Email
- Sitio web

#### ✅ **Configuración de Diseño:**
- **Colores corporativos**:
  - Color primario (selector visual + input hex)
  - Color secundario (selector visual + input hex)
- **Tipografía**:
  - Tamaño de fuente (12px, 14px, 16px)
  - Estilo de fuente (Arial, Times New Roman, Calibri, Georgia)
- **Márgenes**:
  - Margen superior
  - Margen inferior
  - Margen lateral

#### ✅ **Opciones de Diseño:**
- ☑️ Incluir logo de la entidad
- ☑️ Incluir borde superior decorativo
- 📝 Texto personalizable del pie de página

#### ✅ **Vista Previa en Tiempo Real:**
- Pestaña "Editar Configuración": Formulario completo
- Pestaña "Vista Previa": Muestra cómo se verá el oficio con la configuración aplicada
- Cambios visuales instantáneos

#### ✅ **Persistencia:**
- Guardado automático en **localStorage**
- Los cambios se aplican a todos los nuevos oficios
- Botón "Restaurar por Defecto" para volver a la configuración original

#### ✅ **Notificaciones:**
- Toast de confirmación al guardar
- Toast de confirmación al restaurar
- Feedback visual en todos los cambios

---

## 🎯 3. Integración con Configuración del Sistema

### **Archivo:** `/components/esap/gestion-legal/modulos/ModuloConfiguracionDefensaJudicial.tsx`

### **Funcionalidad:**
Módulo completo de configuración para Defensa Judicial con tabs organizados.

### **Estructura:**
```
📁 Configuración del Sistema
├─ 📄 Plantillas de Oficios (ConfiguradorPlantillasOficios)
├─ 👥 Usuarios (placeholder)
├─ 🔔 Notificaciones (placeholder)
├─ 🛡️ Seguridad (placeholder)
└─ 🔌 Integraciones (placeholder)
```

### **Cómo Usar:**
```tsx
import { ModuloConfiguracionDefensaJudicial } from './components/esap/gestion-legal/modulos/ModuloConfiguracionDefensaJudicial';

// En tu router o componente principal:
<ModuloConfiguracionDefensaJudicial />
```

---

## 📝 Flujo de Uso

### **Paso 1: Configurar la Plantilla (Primera vez)**
1. Acceder a **Configuración del Sistema** > **Plantillas de Oficios**
2. Personalizar:
   - Información de la entidad
   - Colores corporativos
   - Tipografía y márgenes
   - Opciones de diseño
3. Ver cambios en tiempo real en la **Vista Previa**
4. Hacer clic en **"Guardar Configuración"**
5. ✅ La plantilla queda guardada para todos los oficios futuros

### **Paso 2: Redactar un Oficio**
1. Ir a **Defensa Judicial** > **Tablero Kanban** > **Oficios**
2. Hacer clic en **"Redactar Oficio"**
3. En la pestaña **"Redactar"**:
   - Seleccionar plantilla rápida (opcional)
   - Llenar número, destinatario, asunto, contenido
   - Adjuntar archivos (opcional)
4. Cambiar a la pestaña **"Vista Previa"**:
   - ✨ Ver el oficio con formato oficial en tiempo real
   - El documento se actualiza mientras escribes
   - Incluye la plantilla personalizada (si la configuraste)
5. Hacer clic en **"Enviar Oficio"** o **"Guardar Borrador"**
6. ✅ El oficio queda registrado en el sistema

---

## 🎨 Diseño Corporativo ESAP 2025

### **Colores por Defecto:**
- **Azul Principal:** `#003DA5`
- **Naranja Corporativo:** `#F57C00`
- **Azul Claro (fondos):** `#E0EDFF`
- **Gris Neutro:** `#F5F5F5`

### **Tipografía:**
- **Por defecto:** Arial, sans-serif
- **Tamaño:** 14px
- **Interlineado:** 1.8 (profesional)

### **Espaciado:**
- **Márgenes:** 2cm superior/inferior, 2.5cm lateral
- **Padding interno:** Responsive y equilibrado

---

## 💾 Almacenamiento

### **LocalStorage Keys:**
```javascript
// Configuración de plantilla
localStorage.setItem('esap_plantilla_oficios', JSON.stringify(config));

// Recuperar configuración
const config = JSON.parse(localStorage.getItem('esap_plantilla_oficios'));
```

### **Estructura de Datos:**
```typescript
interface ConfiguracionPlantilla {
  nombreEntidad: string;
  subtituloEntidad: string;
  dependencia: string;
  direccion: string;
  telefono: string;
  email: string;
  website: string;
  colorPrimario: string;
  colorSecundario: string;
  tamañoFuente: string;
  estiloFuente: string;
  includirLogo: boolean;
  includirBordeSuperior: boolean;
  textoPiePagina: string;
}
```

---

## 🚀 Mejoras Futuras (Sugerencias)

### **Corto Plazo:**
- [ ] Exportar oficio a PDF real (usando jsPDF o similar)
- [ ] Múltiples plantillas guardadas (selector de plantilla)
- [ ] Firmas digitales con certificado
- [ ] Integración con sistema de correspondencia

### **Mediano Plazo:**
- [ ] Plantillas por tipo de proceso (Contencioso, Disciplinario, etc.)
- [ ] Variables dinámicas en plantillas (ej: {demandante}, {fecha_auto})
- [ ] Editor WYSIWYG más avanzado (formato rico)
- [ ] Historial de versiones de plantillas

### **Largo Plazo:**
- [ ] Flujo de aprobación de oficios
- [ ] Integración con sistema de notificaciones judiciales
- [ ] Analytics de oficios enviados
- [ ] Plantillas colaborativas (edición múltiple)

---

## 📞 Soporte Técnico

### **Archivos Modificados:**
1. `/components/esap/gestion-legal/modulos/ModalRedactarOficio.tsx` ✅
2. `/components/esap/gestion-legal/modulos/ConfiguradorPlantillasOficios.tsx` ✅ (nuevo)
3. `/components/esap/gestion-legal/modulos/ModuloConfiguracionDefensaJudicial.tsx` ✅ (nuevo)
4. `/components/ui/dialog.tsx` ✅ (ajuste de posicionamiento)

### **Dependencias:**
- React 18+
- Tailwind CSS v4
- lucide-react (iconos)
- sonner@2.0.3 (notificaciones)

---

## ✨ Resumen Final

### **✅ Completado:**
1. ✨ **Vista previa en tiempo real** mientras se redacta el oficio
2. ⚙️ **Configurador de plantillas** en Configuración del Sistema
3. 🎨 **Diseño corporativo ESAP 2025** aplicado
4. 💾 **Persistencia en localStorage** para configuración
5. 📱 **Responsive design** móvil y desktop
6. 🔔 **Notificaciones toast** para feedback del usuario
7. 📄 **Formato oficial** con membrete ESAP
8. 🔄 **Sincronización automática** entre campos

### **🎯 Resultado:**
Un sistema completo de redacción de oficios judiciales con:
- Vista previa profesional en tiempo real
- Plantillas personalizables y guardables
- Formato oficial ESAP aplicado automáticamente
- Interfaz intuitiva y fácil de usar
- Totalmente responsive

---

**Fecha de Implementación:** 27 de enero de 2025  
**Estado:** ✅ Completado y Funcional  
**Módulo:** Defensa Judicial - Gestión de Oficios  
**Versión:** ESAP 2025 Premium
