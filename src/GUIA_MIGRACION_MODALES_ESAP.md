# 📖 Guía de Migración de Modales ESAP 2025

**Estándar Oficial:** ModalHeaderClean  
**Última Actualización:** 30 de Diciembre de 2025

---

## 🎯 Objetivo

Esta guía te ayudará a migrar cualquier modal del sistema ESAP al **estándar ModalHeaderClean 2025**, asegurando consistencia visual y experiencia de usuario uniforme.

---

## ✅ Paso a Paso: Migración Completa

### **1️⃣ Importar el Componente ModalHeaderClean**

```tsx
// ✅ CORRECTO - Importar desde modulos/
import { ModalHeaderClean } from './ModalHeaderClean';

// ❌ INCORRECTO - NO importar desde design-system/
import { ModalHeaderClean } from '../design-system/ModalHeaderClean';
```

**Ubicación del archivo:** `/components/esap/gestion-legal/modulos/ModalHeaderClean.tsx`

---

### **2️⃣ Estructura Base del Modal**

```tsx
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ModalHeaderClean } from './ModalHeaderClean';
import { Button } from '@/components/ui/button';

export function MiModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0">
        
        {/* 1. Títulos ocultos para accesibilidad (OBLIGATORIO) */}
        <DialogTitle className="sr-only">
          Título del Modal
        </DialogTitle>
        <DialogDescription className="sr-only">
          Descripción detallada para lectores de pantalla
        </DialogDescription>

        {/* 2. Header - flex-shrink-0 (siempre visible, NO hace scroll) */}
        <ModalHeaderClean
          titulo="Título del Modal"
          subtitulo="Subtítulo descriptivo"
          icono={IconoComponente}
          colorIcono="blue"
          onClose={onClose}
        />

        {/* 3. Contenido - flex-1 overflow-y-auto (SOLO ESTO hace scroll) */}
        <div className="flex-1 overflow-y-auto px-6 py-4 bg-gray-50">
          {/* Tu contenido aquí */}
        </div>

        {/* 4. Footer - flex-shrink-0 (siempre visible, NO hace scroll) */}
        <div className="flex-shrink-0 px-6 py-4 bg-white border-t border-gray-200 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Información adicional
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button 
              onClick={handleGuardar}
              style={{ background: '#2962FF', color: '#FFFFFF' }}
            >
              Guardar
            </Button>
          </div>
        </div>

      </DialogContent>
    </Dialog>
  );
}
```

---

## 🔑 Clases CSS Clave (OBLIGATORIAS)

### **DialogContent**
```tsx
className="max-w-4xl h-[90vh] flex flex-col p-0"
```
- `max-w-4xl` - Ancho máximo del modal
- `h-[90vh]` - Altura del 90% del viewport
- `flex flex-col` - Layout flex vertical
- `p-0` - Sin padding (cada sección gestiona su propio padding)

### **Contenido (área con scroll)**
```tsx
className="flex-1 overflow-y-auto px-6 py-4 bg-gray-50"
```
- `flex-1` - Ocupa todo el espacio disponible
- `overflow-y-auto` - Permite scroll vertical
- `px-6 py-4` - Padding horizontal y vertical
- `bg-gray-50` - Fondo gris claro

### **Footer (siempre visible)**
```tsx
className="flex-shrink-0 px-6 py-4 bg-white border-t border-gray-200 flex items-center justify-between"
```
- `flex-shrink-0` - NO se encoge, siempre visible
- `border-t` - Borde superior
- `bg-white` - Fondo blanco

---

## 🎨 Props de ModalHeaderClean

```tsx
<ModalHeaderClean
  titulo="Título Principal"              // OBLIGATORIO
  subtitulo="Descripción breve"          // OPCIONAL
  icono={IconoLucide}                    // OBLIGATORIO (componente de lucide-react)
  colorIcono="blue"                      // OPCIONAL: 'blue' | 'green' | 'red' | 'orange' | 'purple'
  badgePrincipal="Estado Activo"         // OPCIONAL: Badge grande
  badges={<>                             // OPCIONAL: Badges adicionales (JSX)
    <Badge>Badge 1</Badge>
    <Badge>Badge 2</Badge>
  </>}
  onClose={onClose}                      // OBLIGATORIO: Función para cerrar
/>
```

---

## 🎨 Colores Corporativos ESAP

### **Colores Principales**

```tsx
// Azul Corporativo (botones primarios)
style={{ background: '#2962FF', color: '#FFFFFF' }}

// Naranja Corporativo (alertas importantes)
style={{ background: '#F57C00', color: '#FFFFFF' }}

// Azul Oscuro ESAP (títulos)
style={{ color: '#003DA5' }}
```

### **Colores de Badges**

```tsx
// Verde - Estados positivos
className="bg-green-100 text-green-700 border-green-300"

// Rojo - Estados críticos
className="bg-red-100 text-red-700 border-red-300"

// Amarillo/Naranja - Estados de advertencia
className="bg-yellow-100 text-yellow-700 border-yellow-300"

// Azul - Estados informativos
className="bg-blue-100 text-blue-700 border-blue-300"

// Gris - Estados neutros
className="bg-gray-100 text-gray-700 border-gray-300"
```

---

## ✅ Checklist de Validación

Después de migrar un modal, verifica:

### **Funcionalidad**
- [ ] Modal abre correctamente
- [ ] Modal cierra con botón X
- [ ] Modal cierra con tecla ESC
- [ ] Formularios funcionan (si aplica)
- [ ] Validaciones funcionan correctamente
- [ ] Datos se guardan sin errores
- [ ] Toasts de éxito/error aparecen

### **Diseño**
- [ ] Header usa ModalHeaderClean
- [ ] Fondo blanco limpio (sin gradientes)
- [ ] Footer siempre visible (no se oculta al hacer scroll)
- [ ] Solo el contenido hace scroll (no header ni footer)
- [ ] Botones primarios usan azul #2962FF
- [ ] Badges con colores apropiados
- [ ] Iconos claros y visibles

### **Responsive**
- [ ] Funciona en móvil (< 640px)
- [ ] Funciona en tablet (640-1023px)
- [ ] Funciona en desktop (1024px+)
- [ ] No hay scroll horizontal
- [ ] Textos legibles en todos los tamaños
- [ ] Botones accesibles en móvil

### **Accesibilidad**
- [ ] Navegable con Tab/Shift+Tab
- [ ] Cierra con tecla ESC
- [ ] DialogTitle con className="sr-only" presente
- [ ] DialogDescription con className="sr-only" presente
- [ ] Focus visible en elementos interactivos
- [ ] Contraste de colores adecuado (WCAG AA)

---

## 🚫 Errores Comunes a Evitar

### ❌ **Error 1: Olvidar flex-col en DialogContent**
```tsx
// ❌ INCORRECTO
<DialogContent className="max-w-4xl h-[90vh] p-0">

// ✅ CORRECTO
<DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0">
```

### ❌ **Error 2: Olvidar overflow-y-auto en contenido**
```tsx
// ❌ INCORRECTO - No hace scroll
<div className="flex-1 px-6 py-4">

// ✅ CORRECTO - Hace scroll
<div className="flex-1 overflow-y-auto px-6 py-4">
```

### ❌ **Error 3: Olvidar flex-shrink-0 en footer**
```tsx
// ❌ INCORRECTO - Footer se oculta al hacer scroll
<div className="px-6 py-4 border-t">

// ✅ CORRECTO - Footer siempre visible
<div className="flex-shrink-0 px-6 py-4 border-t">
```

### ❌ **Error 4: No incluir DialogTitle/Description**
```tsx
// ❌ INCORRECTO - Mala accesibilidad
<Dialog open={isOpen} onOpenChange={onClose}>
  <DialogContent>
    <ModalHeaderClean ... />

// ✅ CORRECTO
<Dialog open={isOpen} onOpenChange={onClose}>
  <DialogContent>
    <DialogTitle className="sr-only">Título</DialogTitle>
    <DialogDescription className="sr-only">Descripción</DialogDescription>
    <ModalHeaderClean ... />
```

### ❌ **Error 5: Import incorrecto de ModalHeaderClean**
```tsx
// ❌ INCORRECTO - Path equivocado
import { ModalHeaderClean } from '../design-system/ModalHeaderClean';

// ✅ CORRECTO
import { ModalHeaderClean } from './ModalHeaderClean';
```

---

## 📝 Ejemplo Completo: Modal de Expediente

```tsx
import { useState } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ModalHeaderClean } from './ModalHeaderClean';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, Download, Eye, X } from 'lucide-react';

interface ModalExpedienteProps {
  isOpen: boolean;
  onClose: () => void;
  expediente: {
    id: string;
    titulo: string;
    estado: string;
    descripcion: string;
  } | null;
}

export function ModalExpediente({ isOpen, onClose, expediente }: ModalExpedienteProps) {
  if (!expediente) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0">
        
        {/* Accesibilidad */}
        <DialogTitle className="sr-only">
          Expediente {expediente.id}
        </DialogTitle>
        <DialogDescription className="sr-only">
          Vista completa del expediente {expediente.id} con información detallada
        </DialogDescription>

        {/* Header */}
        <ModalHeaderClean
          titulo={`Expediente ${expediente.id}`}
          subtitulo={expediente.titulo}
          icono={FileText}
          colorIcono="blue"
          badgePrincipal={expediente.estado}
          badges={
            <>
              <Badge className="bg-blue-100 text-blue-700 border-blue-300">
                🔗 Integrado
              </Badge>
            </>
          }
          onClose={onClose}
        />

        {/* Contenido - SOLO ESTO hace scroll */}
        <div className="flex-1 overflow-y-auto px-6 py-4 bg-gray-50">
          <div className="space-y-6">
            
            {/* Información del Expediente */}
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <h3 className="font-bold text-gray-900 mb-2">Información General</h3>
              <p className="text-sm text-gray-700">{expediente.descripcion}</p>
            </div>

            {/* Documentos */}
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <h3 className="font-bold text-gray-900 mb-3">Documentos Adjuntos</h3>
              <div className="space-y-2">
                {[1, 2, 3].map(i => (
                  <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-blue-600" />
                      <span className="text-sm font-medium">Documento {i}.pdf</span>
                    </div>
                    <Button size="sm" variant="outline">
                      <Eye className="w-4 h-4 mr-2" />
                      Ver
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            {/* Más contenido aquí... */}
            
          </div>
        </div>

        {/* Footer - Siempre visible */}
        <div className="flex-shrink-0 px-6 py-4 bg-white border-t border-gray-200 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Última actualización: 30/12/2025
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose}>
              <X className="w-4 h-4 mr-2" />
              Cerrar
            </Button>
            <Button style={{ background: '#2962FF', color: '#FFFFFF' }}>
              <Download className="w-4 h-4 mr-2" />
              Exportar
            </Button>
          </div>
        </div>

      </DialogContent>
    </Dialog>
  );
}
```

---

## 📚 Recursos Adicionales

- **Documentación Oficial:** `/NUEVO_DISENO_ESAP_2025.md`
- **Progreso de Migración:** `/ESTANDARIZACION_MODALES_ESAP_2025.md`
- **Auditoría Técnica:** `/AUDITORIA_EXHAUSTIVA_GESTION_LEGAL.md`
- **Componente Base:** `/components/esap/gestion-legal/modulos/ModalHeaderClean.tsx`

---

## 🆘 Soporte

Si tienes dudas durante la migración:

1. Revisa los ejemplos en modales ya migrados (31 modales de referencia)
2. Consulta esta guía
3. Verifica el checklist de validación
4. Contacta al equipo de desarrollo ESAP

---

**Última Actualización:** 30 de Diciembre de 2025  
**Estado del Proyecto:** ✅ 31/31 modales migrados (100%)
