# Estándares de Diseño ESAP 2025 - Sistema Integral de Gestión Legal (SIGL)

## 📋 Índice
1. [Introducción](#introducción)
2. [Principios de Diseño](#principios-de-diseño)
3. [Componentes Base](#componentes-base)
4. [Modales Premium](#modales-premium)
5. [Paleta de Colores](#paleta-de-colores)
6. [Tipografía](#tipografía)
7. [Espaciado y Layout](#espaciado-y-layout)
8. [Componentes Específicos](#componentes-específicos)
9. [Mejores Prácticas](#mejores-prácticas)

---

## Introducción

Este documento define los estándares de diseño corporativo ESAP 2025 para el Sistema Integral de Gestión Legal (SIGL). Todos los componentes, modales y vistas deben seguir estas directrices para mantener consistencia visual y experiencia de usuario premium.

### Objetivos
- ✅ Mantener identidad corporativa ESAP consistente
- ✅ Garantizar accesibilidad (WCAG 2.1 AA)
- ✅ Optimizar UX para usuarios administrativos y jurídicos
- ✅ Facilitar mantenimiento y escalabilidad del código

---

## Principios de Diseño

### 1. **Claridad Profesional**
- Diseño limpio y corporativo similar a SAP Fiori o Microsoft Dynamics 365
- Jerarquía visual clara con headers destacados
- Información organizada en secciones lógicas

### 2. **Mobile-First Responsive**
- Todos los componentes deben ser completamente responsivos
- Breakpoints estándar: `sm: 640px`, `md: 768px`, `lg: 1024px`, `xl: 1280px`
- Priorizar contenido crítico en móviles

### 3. **Accesibilidad**
- Contraste mínimo 4.5:1 para texto normal
- Contraste mínimo 3:1 para texto grande y componentes UI
- Labels descriptivos para screen readers
- Navegación por teclado completa

### 4. **Consistencia**
- Usar componentes del design system (CardSIGL, ButtonSIGL, etc.)
- Mantener patrones de interacción predecibles
- Reutilizar ModalSIGLPremium como base

---

## Componentes Base

### Design System SIGL

Ubicación: `/components/esap/gestion-legal/design-system/`

#### Componentes Disponibles

1. **ButtonSIGL** - Botones corporativos
2. **CardSIGL** - Tarjetas de contenido
3. **BadgeSIGL** - Badges y etiquetas
4. **InputSIGL** - Campos de entrada
5. **SelectSIGL** - Selectores dropdown
6. **ModalSIGL** - Modales básicos
7. **ModalSIGLPremium** - Modales premium estandarizados ⭐
8. **TarjetaKanbanProfesionalSIGL** - Tarjetas para vistas Kanban
9. **SemaforoTermino** - Indicador de términos legales

#### Tokens de Diseño

```typescript
// Ubicación: /components/esap/gestion-legal/design-system/tokens.ts

export const colorTokens = {
  primary: {
    main: '#003DA5',      // Azul ESAP principal
    light: '#1557A0',
    dark: '#002876'
  },
  secondary: {
    main: '#F57C00',      // Naranja ESAP
    light: '#FF9800',
    dark: '#E65100'
  },
  status: {
    success: '#10B981',
    warning: '#F59E0B',
    error: '#DC2626',
    info: '#3B82F6'
  },
  neutral: {
    50: '#F9FAFB',
    100: '#F3F4F6',
    200: '#E5E7EB',
    300: '#D1D5DB',
    // ... continuar hasta 900
  }
};
```

---

## Modales Premium

### ModalSIGLPremium - Componente Base

Todos los modales nuevos DEBEN usar `ModalSIGLPremium` como base.

#### Estructura Estándar

```tsx
import { ModalSIGLPremium } from '../design-system/ModalSIGLPremium';
import { Scale, FileText, Download } from 'lucide-react';

<ModalSIGLPremium
  isOpen={isOpen}
  onClose={onClose}
  title="Expediente Judicial"
  subtitle="Radicado: 25000-23-33-001-2024-00001-00"
  icon={<Scale className="w-6 h-6 text-white" />}
  size="xl"
  height="full"
  headerColor="blue"
  badges={[
    { 
      label: 'En Contestación', 
      bg: '#E0EDFF', 
      color: '#003DA5' 
    },
    { 
      label: '15 días restantes', 
      bg: '#FEF3C7', 
      color: '#F59E0B',
      icon: <Clock className="w-3 h-3" />
    }
  ]}
  progressBar={{
    value: 65,
    label: 'Progreso del Proceso',
    showPercentage: true
  }}
  footerInfo={
    <div className="text-xs text-gray-600">
      Última actualización: <strong>28/12/2024</strong>
    </div>
  }
  footerActions={
    <>
      <Button variant="outline" onClick={onClose}>
        Cerrar
      </Button>
      <Button style={{ background: '#003DA5', color: '#FFFFFF' }}>
        <Download className="w-3.5 h-3.5 mr-1" />
        Descargar PDF
      </Button>
    </>
  }
  ariaDescription="Vista completa del expediente judicial con información detallada"
>
  {/* Contenido del modal */}
  <div className="px-6 py-4">
    {/* Tu contenido aquí */}
  </div>
</ModalSIGLPremium>
```

### Anatomía del Modal Premium

```
┌─────────────────────────────────────────────────┐
│ ┌─────────────────────────────────────────────┐ │
│ │  HEADER (bg-gradient-to-r from-blue-600)   │ │  ← flex-shrink-0
│ │  - Icono + Título                           │ │
│ │  - Badges informativos                      │ │
│ │  - Barra de progreso (opcional)            │ │
│ └─────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────┐ │
│ │                                             │ │
│ │  CONTENIDO                                  │ │  ← flex-1 overflow-y-auto
│ │  (Scrollable)                               │ │
│ │                                             │ │
│ │  - Tabs, Cards, Forms, etc.                │ │
│ │                                             │ │
│ └─────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────┐ │
│ │  FOOTER (bg-gray-50 border-t-2)            │ │  ← flex-shrink-0
│ │  - Info adicional | Botones de acción      │ │
│ └─────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘
```

### Props del ModalSIGLPremium

| Prop | Tipo | Requerido | Descripción |
|------|------|-----------|-------------|
| `isOpen` | boolean | ✅ | Controla visibilidad del modal |
| `onClose` | function | ✅ | Callback al cerrar |
| `title` | string | ✅ | Título principal |
| `subtitle` | string | ❌ | Subtítulo o info adicional |
| `icon` | ReactNode | ❌ | Icono del header (Lucide React) |
| `badges` | BadgeConfig[] | ❌ | Badges informativos |
| `progressBar` | ProgressConfig | ❌ | Barra de progreso |
| `children` | ReactNode | ✅ | Contenido del modal |
| `footerActions` | ReactNode | ❌ | Botones de acción |
| `footerInfo` | ReactNode | ❌ | Info adicional en footer |
| `size` | 'sm'\|'md'\|'lg'\|'xl'\|'full' | ❌ | Tamaño del modal (default: 'xl') |
| `height` | 'auto'\|'full' | ❌ | Altura del modal (default: 'full') |
| `headerColor` | 'blue'\|'green'\|'orange'\|'red'\|'purple' | ❌ | Color del header (default: 'blue') |
| `ariaDescription` | string | ❌ | Descripción para accesibilidad |

---

## Paleta de Colores

### Colores Corporativos ESAP

#### Primarios
```css
/* Azul ESAP - Principal */
--esap-blue-primary: #003DA5;
--esap-blue-light: #2a6dbd;
--esap-blue-lighter: #1557a0;

/* Naranja ESAP - Acento */
--esap-orange: #F57C00;
```

#### Semánticos

```css
/* Estados */
--status-success: #10B981;    /* Verde - Aprobado/Completado */
--status-warning: #F59E0B;    /* Amarillo - Advertencia/Pendiente */
--status-error: #DC2626;      /* Rojo - Error/Crítico */
--status-info: #3B82F6;       /* Azul - Información */

/* Términos Legales (Semáforo) */
--termino-verde: #10B981;     /* > 15 días */
--termino-amarillo: #F59E0B;  /* 6-15 días */
--termino-rojo: #DC2626;      /* ≤ 5 días */
```

#### Fondos y Superficies

```css
/* Backgrounds */
--bg-primary: #FFFFFF;
--bg-secondary: #F9FAFB;
--bg-tertiary: #F3F4F6;

/* Gradientes para Headers */
--gradient-blue: linear-gradient(to right, #2563EB, #1E40AF);
--gradient-green: linear-gradient(to right, #059669, #047857);
--gradient-orange: linear-gradient(to right, #EA580C, #C2410C);
```

### Uso de Colores

#### DO ✅
```tsx
// Usar tokens corporativos
<Button style={{ background: '#003DA5', color: '#FFFFFF' }}>
  Guardar
</Button>

// Semáforo de términos
const getSemaforoColor = (dias: number) => {
  if (dias <= 5) return '#DC2626';
  if (dias <= 15) return '#F59E0B';
  return '#10B981';
};
```

#### DON'T ❌
```tsx
// NO usar colores hardcoded sin razón
<Button style={{ background: '#123456' }}>  // ❌
  Guardar
</Button>

// NO usar colores que no sean de la paleta corporativa
<Badge className="bg-pink-500">  // ❌
  Estado
</Badge>
```

---

## Tipografía

### Font Family
```css
/* Sistema usa font-family por defecto de Tailwind */
font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 
             "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
```

### Escala Tipográfica

⚠️ **IMPORTANTE**: NO usar clases de Tailwind para font-size, font-weight, o line-height a menos que sea específicamente solicitado. El sistema tiene tipografía predefinida en `/styles/globals.css`.

#### Títulos de Modal
```tsx
// Título principal del modal
<h1 className="text-2xl font-black text-white">
  {title}
</h1>

// Subtítulo
<p className="text-sm text-blue-100">
  {subtitle}
</p>
```

#### Secciones dentro del modal
```tsx
// Encabezado de sección
<h3 className="text-sm font-black text-blue-900 mb-3">
  RESUMEN EJECUTIVO
</h3>

// Subtítulo de sección
<h4 className="text-sm font-bold text-gray-700 mb-3">
  DATOS DEL PROCESO
</h4>
```

#### Texto de contenido
```tsx
// Texto normal
<p className="text-sm text-gray-700">
  Contenido...
</p>

// Texto enfatizado
<p className="text-sm font-bold text-gray-900">
  Importante
</p>

// Texto secundario
<p className="text-xs text-gray-600">
  Información adicional
</p>
```

---

## Espaciado y Layout

### Sistema de Espaciado Tailwind

```tsx
// Padding interno de modales
px-6 py-4  // Header y Footer
px-6 py-4  // Contenido principal

// Gaps entre elementos
gap-2  // Elementos pequeños (badges, iconos)
gap-3  // Elementos medianos (cards en grid)
gap-4  // Secciones

// Márgenes
mb-2   // Entre título y subtítulo
mb-3   // Entre secciones pequeñas
mb-4   // Entre secciones grandes
```

### Grids Responsive

```tsx
// Grid de 2 columnas (responsive)
<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
  {/* Contenido */}
</div>

// Grid de 3 columnas
<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
  {/* Contenido */}
</div>

// Grid con columna span
<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
  <div className="md:col-span-2">
    {/* Ocupa 2 columnas en desktop */}
  </div>
</div>
```

---

## Componentes Específicos

### Badges de Estado

```tsx
// Badge básico
<Badge 
  className="font-bold"
  style={{ background: '#003DA5', color: '#FFFFFF' }}
>
  En Contestación
</Badge>

// Badge con icono
<Badge className="bg-white/20 text-white font-bold border border-white/30">
  <FileText className="w-3 h-3 mr-1" />
  12 documentos
</Badge>

// Badge de semáforo
<Badge 
  className="font-bold flex items-center gap-1.5 border-2"
  style={{ 
    background: '#FEF3C7', 
    color: '#F59E0B', 
    borderColor: '#F59E0B' 
  }}
>
  <div className="w-2.5 h-2.5 rounded-full animate-pulse bg-current" />
  15 días restantes
</Badge>
```

### Cards de Información

```tsx
// Card estándar
<Card className="p-4">
  <h4 className="text-sm font-bold text-gray-700 mb-3">
    Título
  </h4>
  {/* Contenido */}
</Card>

// Card destacada
<Card className="p-4 bg-gradient-to-br from-blue-50 to-white border-2 border-blue-200">
  {/* Contenido importante */}
</Card>

// Card con borde lateral
<Card className="p-4 border-l-4 border-l-blue-500">
  {/* Contenido */}
</Card>
```

### Botones

```tsx
// Botón primario
<Button 
  style={{ background: '#003DA5', color: '#FFFFFF' }}
  className="font-bold"
>
  <Save className="w-3.5 h-3.5 mr-1" />
  Guardar
</Button>

// Botón secundario
<Button variant="outline" className="font-bold">
  <X className="w-3.5 h-3.5 mr-1" />
  Cancelar
</Button>

// Botón de acción crítica
<Button 
  style={{ background: '#DC2626', color: '#FFFFFF' }}
  className="font-bold"
>
  <Trash2 className="w-3.5 h-3.5 mr-1" />
  Eliminar
</Button>
```

### Tabs

```tsx
<Tabs value={tabActivo} onValueChange={setTabActivo}>
  <TabsList className="grid w-full grid-cols-6 mb-4 bg-gray-100">
    <TabsTrigger value="general" className="text-xs font-bold">
      📋 General
    </TabsTrigger>
    <TabsTrigger value="documentos" className="text-xs font-bold">
      📄 Documentos
    </TabsTrigger>
    {/* Más tabs */}
  </TabsList>
  
  <TabsContent value="general" className="space-y-4">
    {/* Contenido */}
  </TabsContent>
</Tabs>
```

### Timeline de Actuaciones

```tsx
<div className="relative">
  {/* Línea vertical */}
  <div className="absolute left-3 top-0 bottom-0 w-1 bg-gradient-to-b from-blue-500 to-blue-300" />
  
  {actuaciones.map((actuacion, idx) => (
    <div key={idx} className="relative pl-10 pb-6 last:pb-0">
      {/* Punto en la línea */}
      <div 
        className="absolute left-0 top-0 w-7 h-7 rounded-full border-4 border-white shadow-lg"
        style={{ background: idx === 0 ? '#003DA5' : '#CBD5E0' }}
      >
        {idx === 0 && <Activity className="w-3 h-3 text-white" />}
      </div>
      
      <Card className="p-4">
        {/* Contenido de la actuación */}
      </Card>
    </div>
  ))}
</div>
```

---

## Mejores Prácticas

### 1. Uso de ModalSIGLPremium

✅ **DO**
```tsx
// Siempre usar ModalSIGLPremium para nuevos modales
import { ModalSIGLPremium } from '../design-system/ModalSIGLPremium';

<ModalSIGLPremium
  isOpen={isOpen}
  onClose={onClose}
  title="Mi Modal"
  // ... resto de props
>
  {children}
</ModalSIGLPremium>
```

❌ **DON'T**
```tsx
// NO crear modales desde cero
<Dialog>
  <DialogContent className="custom-modal">  // ❌
    {/* ... */}
  </DialogContent>
</Dialog>
```

### 2. Responsive Design

✅ **DO**
```tsx
// Usar clases responsive de Tailwind
<div className="flex flex-col md:flex-row gap-3">
  {/* Se apila verticalmente en móvil, horizontal en desktop */}
</div>

<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {/* Responsive grid */}
</div>
```

### 3. Accesibilidad

✅ **DO**
```tsx
// Usar DialogDescription para screen readers
<DialogDescription className="sr-only">
  Vista completa del expediente judicial {expedienteId}
</DialogDescription>

// Labels descriptivos
<Button aria-label="Cerrar modal">
  <X className="w-5 h-5" />
</Button>

// Texto alternativo
<Avatar>
  <AvatarFallback aria-label={`Avatar de ${nombre}`}>
    JD
  </AvatarFallback>
</Avatar>
```

### 4. Estados de Carga y Errores

✅ **DO**
```tsx
// Mostrar estados vacíos amigables
{items.length === 0 && (
  <Card className="p-8 text-center">
    <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
    <p className="text-sm font-bold text-gray-500">
      No hay documentos disponibles
    </p>
    <p className="text-xs text-gray-400 mt-1">
      Los documentos aparecerán aquí cuando sean cargados
    </p>
  </Card>
)}

// Usar toast para feedback
import { toast } from 'sonner@2.0.3';

toast.success('✅ Operación exitosa', {
  description: 'Los cambios se guardaron correctamente'
});
```

### 5. Performance

✅ **DO**
```tsx
// Usar React.memo para componentes costosos
export const ExpedienteCard = React.memo(({ expediente }) => {
  // ...
});

// Evitar re-renders innecesarios
const memoizedData = useMemo(() => 
  procesarDatos(rawData), 
  [rawData]
);
```

---

## Ejemplos de Implementación

### Modal de Expediente Judicial

```tsx
import { ModalSIGLPremium } from '../design-system/ModalSIGLPremium';
import { Scale, FileText, Activity, Target } from 'lucide-react';

export function ModalExpediente({ isOpen, onClose, expediente }) {
  return (
    <ModalSIGLPremium
      isOpen={isOpen}
      onClose={onClose}
      title={expediente.id}
      subtitle={expediente.medioControl}
      icon={<Scale className="w-6 h-6 text-white" />}
      size="xl"
      height="full"
      badges={[
        { 
          label: expediente.etapa, 
          bg: '#FFFFFF', 
          color: '#003DA5' 
        },
        { 
          label: `${expediente.diasRestantes} días`, 
          bg: '#FEF3C7', 
          color: '#F59E0B',
          icon: <Clock className="w-3 h-3" />
        }
      ]}
      progressBar={{
        value: expediente.progreso,
        label: 'Progreso del Proceso',
        showPercentage: true
      }}
      footerInfo={
        <Button variant="outline" onClick={onClose}>
          Cerrar
        </Button>
      }
      footerActions={
        <>
          <Button variant="outline" size="sm">
            <Bell className="w-3.5 h-3.5 mr-1" />
            Notificar
          </Button>
          <Button 
            size="sm"
            style={{ background: '#003DA5', color: '#FFFFFF' }}
          >
            <Download className="w-3.5 h-3.5 mr-1" />
            Descargar PDF
          </Button>
        </>
      }
    >
      <div className="px-6 py-4">
        <Tabs value={tabActivo} onValueChange={setTabActivo}>
          {/* Contenido de tabs */}
        </Tabs>
      </div>
    </ModalSIGLPremium>
  );
}
```

---

## Checklist de Revisión

Antes de aprobar un nuevo componente/modal, verificar:

- [ ] ¿Usa `ModalSIGLPremium` como base?
- [ ] ¿Respeta la paleta de colores corporativa?
- [ ] ¿Es completamente responsive?
- [ ] ¿Tiene labels de accesibilidad adecuados?
- [ ] ¿Los botones del footer son siempre visibles?
- [ ] ¿Usa componentes del design system (CardSIGL, ButtonSIGL, etc.)?
- [ ] ¿Sigue la estructura de header/contenido/footer?
- [ ] ¿Tiene estados vacíos y de error amigables?
- [ ] ¿Usa toast para feedback de acciones?
- [ ] ¿El código está bien documentado?

---

## Recursos Adicionales

### Componentes del Design System
- `/components/esap/gestion-legal/design-system/`
- `ModalSIGLPremium.tsx` - Base para modales
- `tokens.ts` - Tokens de diseño
- `index.ts` - Exports centralizados

### Ejemplos de Implementación
- `ModalExpediente.tsx` - Modal de expediente judicial
- `ModalProcesoDisciplinario.tsx` - Modal de proceso disciplinario
- `ModalComunicacionesProceso.tsx` - Feed de comunicaciones
- `ModalNuevaDemanda.tsx` - Formulario de registro

### Guías Relacionadas
- `/styles/globals.css` - Estilos globales y tipografía
- `/styles/esap-theme.css` - Variables de tema corporativo

---

**Versión:** 1.0  
**Última actualización:** Diciembre 2024  
**Autor:** Equipo de Desarrollo ESAP
