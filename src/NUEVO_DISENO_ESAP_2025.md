# 🎨 Nuevo Estándar de Diseño Corporativo ESAP 2025 - Implementación Oficial

**Versión:** 2.0  
**Fecha:** 30 de Diciembre de 2025  
**Estado:** ✅ ESTÁNDAR OFICIAL ACTIVO

---

## 📋 RESUMEN EJECUTIVO

El **Nuevo Estándar de Diseño Corporativo ESAP 2025** establece lineamientos claros para crear interfaces profesionales, limpias y usables en todos los módulos del Sistema Integral de Gestión Legal (SIGL) y otros sistemas institucionales.

### 🎯 Principios de Diseño

1. **Minimalismo Profesional** - Diseño limpio sin elementos visuales innecesarios
2. **Usabilidad Primero** - Funcionalidad sobre estética ornamental  
3. **Consistencia Total** - Todos los modales y componentes se ven y comportan igual
4. **Accesibilidad Integrada** - WCAG 2.1 AA en todos los componentes
5. **Responsive Mobile-First** - Funciona perfectamente en todos los dispositivos

---

## 🎨 PALETA DE COLORES CORPORATIVOS ESAP 2025

### Colores Principales

```css
/* Azul ESAP - Color Corporativo Principal */
--esap-blue-primary: #003DA5;     /* Azul institucional oscuro */
--esap-blue-material: #2962FF;    /* Azul Material Design vibrante (botones de acción) */
--esap-blue-light: #E0EDFF;       /* Azul claro para fondos de badges */

/* Naranja ESAP - Color de Acento (SOLO para indicadores, NO para botones) */
--esap-orange: #F57C00;           /* Naranja institucional */
--esap-orange-light: #FFF4E6;     /* Naranja claro para fondos */

/* Grises Corporativos */
--gray-50: #F9FAFB;               /* Fondos muy claros */
--gray-100: #F3F4F6;              /* Fondos de cards */
--gray-200: #E5E7EB;              /* Bordes suaves */
--gray-300: #D1D5DB;              /* Bordes normales */
--gray-600: #4B5563;              /* Textos secundarios */
--gray-900: #111827;              /* Textos principales */
```

### Colores de Estado (Semáforos)

```css
/* Estados Generales */
--status-success: #10B981;        /* Verde - Exitoso, Completado, Al día */
--status-warning: #F59E0B;        /* Amarillo - Advertencia, Próximo a vencer */
--status-error: #DC2626;          /* Rojo - Error, Vencido, Crítico */
--status-info: #3B82F6;           /* Azul - Información, En proceso */
--status-purple: #8B5CF6;         /* Púrpura - Especial, IA, Premium */

/* Semáforo de Términos Legales */
--termino-verde: #10B981;         /* > 15 días restantes */
--termino-amarillo: #F59E0B;      /* 6-15 días restantes */
--termino-rojo: #DC2626;          /* ≤ 5 días restantes */
```

### ⚠️ REGLA CRÍTICA: USO DE COLORES EN BOTONES

```css
/* ✅ CORRECTO - Botones de Acción */
Botones primarios: #2962FF (azul Material Design vibrante)
Botones secundarios: outline con border azul #2962FF
Botones terciarios: ghost/transparent

/* ❌ INCORRECTO - NO USAR NARANJA EN BOTONES */
NO usar #F57C00 en botones de acción
El naranja es SOLO para indicadores de estado/alertas
```

---

## 🏗️ ARQUITECTURA DE MODALES - ESTÁNDAR OFICIAL

### Componente Base: **ModalHeaderClean**

El estándar ESAP 2025 utiliza **ModalHeaderClean** como componente base para headers de modales, siguiendo un diseño minimalista profesional sin gradientes.

#### 📁 Ubicación
```
/components/esap/gestion-legal/modulos/ModalHeaderClean.tsx
```

#### 🎨 Características

- ✅ **Fondo blanco limpio** (`bg-white`) - Sin gradientes
- ✅ **Border inferior sutil** (`border-b border-gray-200`) - Separación visual elegante
- ✅ **Icono corporativo** con fondo azul ESAP
- ✅ **Título y subtítulo** jerárquicos
- ✅ **Badges informativos** integrados
- ✅ **Botón de cierre** con hover states
- ✅ **100% responsive** mobile-first
- ✅ **Accesibilidad completa** (ARIA labels)

#### 🔧 Interfaz TypeScript

```typescript
interface ModalHeaderCleanProps {
  /** Icono del header (componente Lucide React) */
  icono: React.ReactNode;
  
  /** Título principal del modal */
  titulo: string;
  
  /** Subtítulo descriptivo (opcional) */
  subtitulo?: string;
  
  /** Badges informativos (opcional) */
  badges?: Array<{
    label: string;
    color: 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'gray';
    icon?: React.ReactNode;
  }>;
  
  /** Función para cerrar el modal */
  onClose: () => void;
  
  /** ID para accesibilidad (opcional) */
  ariaLabelledBy?: string;
}
```

#### 💡 Ejemplo de Uso

```tsx
import { ModalHeaderClean } from './ModalHeaderClean';
import { Scale, Clock, AlertTriangle } from 'lucide-react';

<Dialog open={isOpen} onOpenChange={onClose}>
  <DialogContent className="max-w-6xl h-[90vh] flex flex-col p-0">
    {/* Header - SIEMPRE flex-shrink-0 */}
    <ModalHeaderClean
      icono={<Scale className="w-5 h-5 text-white" />}
      titulo="Expediente Judicial"
      subtitulo="Radicado: 25000-23-33-001-2024-00001-00"
      badges={[
        { label: 'En Contestación', color: 'blue' },
        { label: '15 días restantes', color: 'yellow', icon: <Clock className="w-3 h-3" /> },
        { label: 'Alta Cuantía', color: 'red', icon: <AlertTriangle className="w-3 h-3" /> }
      ]}
      onClose={onClose}
      ariaLabelledBy="modal-expediente-title"
    />

    {/* Contenido - SIEMPRE flex-1 overflow-y-auto */}
    <div className="flex-1 overflow-y-auto px-6 py-4 bg-gray-50">
      {/* Tu contenido aquí - SOLO esta sección hace scroll */}
      <Tabs>
        <TabsList>...</TabsList>
        <TabsContent>...</TabsContent>
      </Tabs>
    </div>

    {/* Footer - SIEMPRE flex-shrink-0 */}
    <div className="flex-shrink-0 px-6 py-4 bg-white border-t border-gray-200 flex items-center justify-between">
      <div className="text-sm text-gray-600">
        Última modificación: 29/12/2024
      </div>
      <div className="flex gap-3">
        <Button variant="outline" onClick={onClose}>
          Cerrar
        </Button>
        <Button 
          onClick={handleGuardar}
          style={{ background: '#2962FF', color: '#FFFFFF' }}
        >
          <Save className="w-4 h-4 mr-2" />
          Guardar Cambios
        </Button>
      </div>
    </div>
  </DialogContent>
</Dialog>
```

---

## 🏛️ ESTRUCTURA DE MODALES - PATRÓN MANDATORIO

### Anatomía Completa de un Modal

```
┌─────────────────────────────────────────────────────┐
│ HEADER (ModalHeaderClean)                          │
│ • flex-shrink-0 → SIEMPRE VISIBLE                  │
│ • bg-white con border-b                            │
│ • Icono + Título + Subtítulo + Badges + Close     │
├─────────────────────────────────────────────────────┤
│ CONTENIDO                                           │
│ • flex-1 overflow-y-auto → SOLO ESTA SECCIÓN SCROLL│
│ • px-6 py-4                                        │
│ • bg-gray-50 (fondo suave)                         │
│                                                     │
│ Aquí van tabs, forms, tables, etc.                │
│                                                     │
├─────────────────────────────────────────────────────┤
│ FOOTER                                              │
│ • flex-shrink-0 → SIEMPRE VISIBLE                  │
│ • bg-white con border-t                            │
│ • Info a la izquierda | Botones a la derecha      │
└─────────────────────────────────────────────────────┘
```

### 🔧 Template Base para Modales

```tsx
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ModalHeaderClean } from './ModalHeaderClean';
import { Button } from '@/components/ui/button';

interface MiModalProps {
  isOpen: boolean;
  onClose: () => void;
  // ... otros props específicos
}

export function MiModal({ isOpen, onClose }: MiModalProps) {
  const handleGuardar = () => {
    // Lógica de guardado
    toast.success('✅ Guardado exitosamente');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl h-[90vh] flex flex-col p-0">
        {/* Títulos ocultos para accesibilidad */}
        <DialogTitle className="sr-only">Título del Modal</DialogTitle>
        <DialogDescription className="sr-only">
          Descripción del modal para lectores de pantalla
        </DialogDescription>

        {/* 1️⃣ HEADER - flex-shrink-0 (siempre visible) */}
        <ModalHeaderClean
          icono={<IconoDelModulo className="w-5 h-5 text-white" />}
          titulo="Título Principal"
          subtitulo="Subtítulo descriptivo opcional"
          badges={[
            { label: 'Estado', color: 'blue' },
            { label: 'Indicador', color: 'green' }
          ]}
          onClose={onClose}
        />

        {/* 2️⃣ CONTENIDO - flex-1 overflow-y-auto (solo esto hace scroll) */}
        <div className="flex-1 overflow-y-auto px-6 py-4 bg-gray-50">
          {/* Aquí va el contenido: tabs, formularios, tablas, etc. */}
          <div className="space-y-6">
            {/* Tu contenido */}
          </div>
        </div>

        {/* 3️⃣ FOOTER - flex-shrink-0 (siempre visible) */}
        <div className="flex-shrink-0 px-6 py-4 bg-white border-t border-gray-200 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Información adicional aquí
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

## 🎨 SISTEMA DE BADGES

### Paleta de Colores para Badges

```tsx
const BADGE_COLORS = {
  blue: {
    bg: '#E0EDFF',
    text: '#003DA5',
    border: '#BFDBFE'
  },
  green: {
    bg: '#D1FAE5',
    text: '#065F46',
    border: '#A7F3D0'
  },
  yellow: {
    bg: '#FEF3C7',
    text: '#92400E',
    border: '#FDE68A'
  },
  red: {
    bg: '#FEE2E2',
    text: '#991B1B',
    border: '#FECACA'
  },
  purple: {
    bg: '#EDE9FE',
    text: '#5B21B6',
    border: '#DDD6FE'
  },
  gray: {
    bg: '#F3F4F6',
    text: '#374151',
    border: '#E5E7EB'
  }
};
```

### Ejemplo de Badges en ModalHeaderClean

```tsx
<ModalHeaderClean
  icono={<Scale className="w-5 h-5 text-white" />}
  titulo="Proceso Disciplinario"
  subtitulo="EXP-DISC-2024-00045"
  badges={[
    { 
      label: 'En Investigación', 
      color: 'blue' 
    },
    { 
      label: '45 días restantes', 
      color: 'yellow',
      icon: <Clock className="w-3 h-3" />
    },
    { 
      label: 'Falta Gravísima', 
      color: 'red',
      icon: <AlertTriangle className="w-3 h-3" />
    }
  ]}
  onClose={onClose}
/>
```

---

## 🎯 BOTONES - ESTÁNDARES Y USO

### Variantes de Botones

```tsx
// 1️⃣ BOTÓN PRIMARIO (Acción principal)
<Button 
  onClick={handleGuardar}
  style={{ background: '#2962FF', color: '#FFFFFF' }}
  className="hover:opacity-90 transition-opacity"
>
  <Save className="w-4 h-4 mr-2" />
  Guardar Cambios
</Button>

// 2️⃣ BOTÓN SECUNDARIO (Acción alternativa)
<Button 
  variant="outline" 
  onClick={handleCancelar}
  className="border-gray-300 text-gray-700 hover:bg-gray-50"
>
  <X className="w-4 h-4 mr-2" />
  Cancelar
</Button>

// 3️⃣ BOTÓN TERCIARIO/GHOST (Acción terciaria)
<Button 
  variant="ghost"
  onClick={handleVerMas}
  className="text-gray-600 hover:text-gray-900 hover:bg-gray-100"
>
  <Eye className="w-4 h-4 mr-2" />
  Ver Detalles
</Button>

// 4️⃣ BOTÓN DESTRUCTIVO (Acciones peligrosas)
<Button 
  onClick={handleEliminar}
  className="bg-red-600 text-white hover:bg-red-700"
>
  <Trash2 className="w-4 h-4 mr-2" />
  Eliminar
</Button>

// 5️⃣ BOTÓN DESHABILITADO
<Button 
  disabled
  className="opacity-50 cursor-not-allowed"
>
  <Lock className="w-4 h-4 mr-2" />
  Sin Permisos
</Button>
```

### ⚠️ IMPORTANTE: NO usar naranja (#F57C00) en botones

El naranja es **SOLO** para indicadores de estado y alertas, **NUNCA** para botones de acción.

---

## 📊 COMPONENTES DEL DESIGN SYSTEM

### Componentes Disponibles

```tsx
// 1. Headers de Módulos
import { ModuleHeader } from '@/components/esap/gestion-legal/design-system/ModuleHeader';

// 2. Cards de Métricas
import { ModuleMetrics } from '@/components/esap/gestion-legal/design-system/ModuleMetrics';

// 3. Barra de Filtros
import { ModuleFilters } from '@/components/esap/gestion-legal/design-system/ModuleFilters';

// 4. Tooltip Informativo
import { ModuleInfoTooltip } from '@/components/esap/gestion-legal/design-system/ModuleInfoTooltip';

// 5. Header de Modales (ESTÁNDAR OFICIAL)
import { ModalHeaderClean } from '@/components/esap/gestion-legal/modulos/ModalHeaderClean';

// 6. Tarjetas Kanban
import { TarjetaKanbanCompactaSIGL } from '@/components/esap/gestion-legal/design-system/TarjetaKanbanCompactaSIGL';

// 7. Semáforo de Términos
import { SemaforoTermino } from '@/components/esap/gestion-legal/design-system/SemaforoTermino';

// 8. Badges
import { BadgeSIGL } from '@/components/esap/gestion-legal/design-system/BadgeSIGL';

// 9. Botones
import { ButtonSIGL } from '@/components/esap/gestion-legal/design-system/ButtonSIGL';

// 10. Cards
import { CardSIGL } from '@/components/esap/gestion-legal/design-system/CardSIGL';
```

---

## ✅ MÓDULOS ACTUALIZADOS AL ESTÁNDAR ESAP 2025

### ✅ Módulos Completamente Conformes

1. **✅ Defensa Judicial** - ModuloDefensaJudicialV3.tsx
   - ModalHeaderClean en todos los modales
   - Botones azul #2962FF
   - Responsive mobile-first
   - Funcionalidad completa

2. **✅ Juzgamiento Disciplinario** - ModuloJuzgamientoDisciplinarioV3.tsx
   - ModalHeaderClean implementado
   - Design system completo
   - Paridad Kanban/Lista

3. **✅ Órganos de Control** - OrganosControl.tsx
   - Todos los modales con ModalHeaderClean
   - Diseño corporativo limpio
   - Funcionalidad completa

4. **✅ Procesos Coactivos** - ProcesosCoactivosV3.tsx
   - ModalHeaderClean en todos los modales
   - Vistas Kanban y Lista
   - Gestión de pagos y expedientes

5. **✅ Planes de Mejoramiento** - PlanesMejoramientoV4.tsx
   - Modal con ModalHeaderClean
   - Validaciones completas
   - Accesibilidad integrada

6. **✅ Plan de Acción** - PlanAccionV4.tsx
   - ModalHeaderClean implementado
   - 4 vistas funcionales
   - Métricas consolidadas

7. **✅ Riesgos** - Riesgos.tsx
   - ModalHeaderClean en modal de nuevo riesgo
   - Matriz de riesgos interactiva
   - Diseño profesional

### 🔄 Módulos Pendientes de Migración

8. **⚠️ Asesoría Jurídica** - ModuloAsesoriaJuridicaV3.tsx
   - ❌ Modales usan enfoque manual (sin ModalHeaderClean)
   - Pendiente: Actualizar ModalNuevaConsulta, ModalExpedienteConsulta

9. **⚠️ Centro de Comunicaciones** - CentroComunicacionesJuridicasV3.tsx
   - ❌ Modales usan enfoque manual
   - Pendiente: Actualizar ModalNuevaComunicacion, ModalExpedienteComunicacion

10. **⚠️ Términos e Informes** - ModuloTerminosInformesV3.tsx
    - ❌ Modal usa enfoque manual
    - Pendiente: Actualizar ModalDetalleSolicitudInforme, ModalNuevaSolicitudInforme

---

## 📋 CHECKLIST DE IMPLEMENTACIÓN

### Para Crear un Nuevo Modal (Estándar ESAP 2025)

- [ ] Importar `ModalHeaderClean` desde `/modulos/ModalHeaderClean`
- [ ] Usar `Dialog` con `DialogContent` de shadcn/ui
- [ ] Agregar `DialogTitle` y `DialogDescription` con clase `sr-only` (accesibilidad)
- [ ] Estructura `flex flex-col` en DialogContent
- [ ] Header con `ModalHeaderClean` + clase `flex-shrink-0`
- [ ] Contenido con clase `flex-1 overflow-y-auto px-6 py-4 bg-gray-50`
- [ ] Footer con clase `flex-shrink-0 px-6 py-4 bg-white border-t`
- [ ] Botones en footer con colores corporativos (#2962FF para primarios)
- [ ] Validar responsive (mobile, tablet, desktop)
- [ ] Probar que footer SIEMPRE sea visible (no se esconda al hacer scroll)
- [ ] Agregar `aria-labels` apropiados
- [ ] Documentar con JSDoc

### Para Actualizar un Modal Existente

- [ ] Identificar el modal a actualizar
- [ ] Hacer backup del código actual (comentar o versionar)
- [ ] Reemplazar header actual por `ModalHeaderClean`
- [ ] Ajustar estructura a patrón flex-col (header + content + footer)
- [ ] Verificar que solo el contenido hace scroll (no todo el modal)
- [ ] Actualizar botones a azul #2962FF
- [ ] Remover gradientes si los hay
- [ ] Probar funcionalidad completa
- [ ] Validar accesibilidad con teclado
- [ ] Revisar en móvil/tablet

---

## 🎓 MEJORES PRÁCTICAS

### DO's ✅

- ✅ Usar ModalHeaderClean para TODOS los modales
- ✅ Mantener footer siempre visible (flex-shrink-0)
- ✅ Usar azul #2962FF en botones primarios
- ✅ Agregar iconos en badges cuando sea relevante
- ✅ Incluir subtítulos descriptivos en headers
- ✅ Usar bg-gray-50 en área de contenido (contraste suave)
- ✅ Validar accesibilidad (ARIA labels, navegación por teclado)
- ✅ Probar en diferentes tamaños de pantalla
- ✅ Agregar confirmaciones en acciones destructivas

### DON'Ts ❌

- ❌ NO usar gradientes en headers (diseño anticuado)
- ❌ NO usar naranja #F57C00 en botones (solo para indicadores)
- ❌ NO hacer que todo el modal haga scroll (solo el contenido)
- ❌ NO ocultar el footer al hacer scroll
- ❌ NO crear componentes de modal custom (usar ModalHeaderClean)
- ❌ NO ignorar responsive mobile
- ❌ NO omitir ARIA labels para accesibilidad
- ❌ NO usar múltiples estilos de headers en el mismo sistema

---

## 📐 RESPONSIVE DESIGN

### Breakpoints

```css
/* Mobile First */
Base: 0px - 639px (móviles)
sm: 640px+ (tablets pequeñas)
md: 768px+ (tablets)
lg: 1024px+ (laptops)
xl: 1280px+ (desktops)
2xl: 1536px+ (pantallas grandes)
```

### Adaptaciones por Dispositivo

```tsx
// Móvil (< 640px)
<DialogContent className="max-w-full h-screen"> {/* Pantalla completa */}

// Tablet (640px - 1023px)
<DialogContent className="max-w-3xl h-[85vh]"> {/* Moderado */}

// Desktop (1024px+)
<DialogContent className="max-w-6xl h-[90vh]"> {/* Grande */}
```

---

## 🧪 TESTING Y VALIDACIÓN

### Checklist de Calidad

#### Funcionalidad
- [ ] Modal abre correctamente
- [ ] Modal cierra con botón X
- [ ] Modal cierra con click fuera (si aplica)
- [ ] Modal cierra con ESC
- [ ] Todos los botones funcionan
- [ ] Formularios validan correctamente
- [ ] Datos se guardan/actualizan

#### Diseño
- [ ] Header usa ModalHeaderClean
- [ ] Footer siempre visible
- [ ] Solo contenido hace scroll
- [ ] Botones con color azul #2962FF
- [ ] Badges con colores apropiados
- [ ] Iconos visibles y claros

#### Responsive
- [ ] Funciona en móvil (< 640px)
- [ ] Funciona en tablet (640-1023px)
- [ ] Funciona en desktop (1024px+)
- [ ] No hay scroll horizontal
- [ ] Textos legibles en todos los tamaños

#### Accesibilidad
- [ ] Navegable con teclado (Tab, Shift+Tab)
- [ ] Cierra con ESC
- [ ] ARIA labels presentes
- [ ] Focus visible en elementos interactivos
- [ ] Contraste de colores adecuado (WCAG AA)

---

## 📚 RECURSOS Y DOCUMENTACIÓN

### Archivos de Referencia

1. **Componente Base:**
   - `/components/esap/gestion-legal/modulos/ModalHeaderClean.tsx`

2. **Ejemplos Completos:**
   - `/components/esap/gestion-legal/modulos/PlanesMejoramientoV4.tsx`
   - `/components/esap/gestion-legal/modulos/OrganosControl.tsx`
   - `/components/esap/gestion-legal/modulos/ProcesosCoactivosV3.tsx`

3. **Design System:**
   - `/components/esap/gestion-legal/design-system/`

4. **Auditoría Completa:**
   - `/AUDITORIA_EXHAUSTIVA_GESTION_LEGAL.md`

### Soporte Técnico

Para dudas o inconsistencias:
1. Revisar este documento (fuente de verdad)
2. Consultar archivos de referencia listados arriba
3. Validar con auditoría exhaustiva
4. Documentar nuevos patrones encontrados

---

## 🎯 CONCLUSIÓN

El **Nuevo Estándar de Diseño Corporativo ESAP 2025** está basado en:

- ✅ **ModalHeaderClean** como componente base oficial
- ✅ Diseño **minimalista profesional** sin gradientes
- ✅ Colores corporativos **ESAP consistentes**
- ✅ **Usabilidad** y accesibilidad primero
- ✅ **Responsive mobile-first** en todo
- ✅ **Consistencia total** en toda la aplicación

**Este documento es la fuente de verdad oficial para el diseño corporativo ESAP 2025.**

---

**Versión:** 2.0  
**Fecha de Actualización:** 30 de Diciembre de 2025  
**Próxima Revisión:** Trimestral (Marzo 2026)  
**Responsable:** Equipo de Desarrollo ESAP
