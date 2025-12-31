# Design System SIGL - Sistema Integral de Gestión Legal

## 🚀 Inicio Rápido

Este es el sistema de diseño corporativo ESAP 2025 para el módulo de Gestión Legal. Proporciona componentes reutilizables, estándares de diseño y mejores prácticas.

## 📦 Componentes Principales

### ModalSIGLPremium ⭐ NUEVO

Componente base para todos los modales del sistema. Proporciona diseño corporativo consistente con header destacado, footer con botones siempre visibles y estructura optimizada.

#### Uso Básico

```tsx
import { ModalSIGLPremium } from '@/components/esap/gestion-legal/design-system';
import { Scale } from 'lucide-react';

<ModalSIGLPremium
  isOpen={isOpen}
  onClose={onClose}
  title="Mi Modal"
  subtitle="Información adicional"
  icon={<Scale className="w-6 h-6 text-white" />}
  size="xl"
  height="full"
  headerColor="blue"
  badges={[
    { label: 'Activo', bg: '#E0EDFF', color: '#003DA5' }
  ]}
  footerActions={
    <>
      <Button variant="outline" onClick={onClose}>Cerrar</Button>
      <Button onClick={onSave}>Guardar</Button>
    </>
  }
>
  {/* Tu contenido aquí */}
</ModalSIGLPremium>
```

#### Props Disponibles

| Prop | Tipo | Requerido | Descripción |
|------|------|-----------|-------------|
| `isOpen` | boolean | ✅ | Controla visibilidad |
| `onClose` | () => void | ✅ | Callback al cerrar |
| `title` | string | ✅ | Título principal |
| `subtitle` | string | ❌ | Subtítulo |
| `icon` | ReactNode | ❌ | Icono del header |
| `badges` | BadgeConfig[] | ❌ | Badges informativos |
| `progressBar` | ProgressConfig | ❌ | Barra de progreso |
| `footerActions` | ReactNode | ❌ | Botones de acción |
| `size` | 'sm'\|'md'\|'lg'\|'xl'\|'full' | ❌ | Tamaño (default: xl) |
| `height` | 'auto'\|'full' | ❌ | Altura (default: full) |
| `headerColor` | 'blue'\|'green'\|'orange'\|'red' | ❌ | Color header (default: blue) |

### Ejemplos por Tipo de Modal

#### 1. Modal de Expediente (Grande, Full Height)

```tsx
<ModalSIGLPremium
  isOpen={isOpen}
  onClose={onClose}
  title="Expediente 25000-23-001"
  subtitle="Nulidad y Restablecimiento"
  icon={<Scale className="w-6 h-6 text-white" />}
  size="xl"
  height="full"
  badges={[
    { label: 'En Contestación', bg: '#E0EDFF', color: '#003DA5' },
    { label: '15 días restantes', bg: '#FEF3C7', color: '#F59E0B' }
  ]}
  progressBar={{
    value: 65,
    label: 'Progreso del Proceso',
    showPercentage: true
  }}
>
  <Tabs>
    {/* Tabs con información del expediente */}
  </Tabs>
</ModalSIGLPremium>
```

#### 2. Modal de Formulario (Mediano, Auto Height)

```tsx
<ModalSIGLPremium
  isOpen={isOpen}
  onClose={onClose}
  title="Nueva Demanda"
  subtitle="Registro de demanda judicial"
  icon={<FileText className="w-6 h-6 text-white" />}
  size="md"
  height="auto"
  footerActions={
    <>
      <Button variant="outline" onClick={onClose}>
        Cancelar
      </Button>
      <Button onClick={handleSubmit}>
        Guardar
      </Button>
    </>
  }
>
  <form className="p-6 space-y-4">
    {/* Campos del formulario */}
  </form>
</ModalSIGLPremium>
```

#### 3. Modal de Comunicaciones (Feed/Timeline)

```tsx
<ModalSIGLPremium
  isOpen={isOpen}
  onClose={onClose}
  title="Comunicaciones del Proceso"
  subtitle="Expediente 25000-23-001"
  icon={<MessageSquare className="w-6 h-6 text-white" />}
  size="lg"
  height="full"
  badges={[
    { label: '12 comunicaciones', bg: '#FFFFFF', color: '#003DA5' },
    { label: '3 sin leer', bg: '#FEE2E2', color: '#DC2626' }
  ]}
  footerActions={
    <Button onClick={handleNuevaComunicacion}>
      <Plus className="w-3.5 h-3.5 mr-1" />
      Nueva Comunicación
    </Button>
  }
>
  <div className="space-y-3 p-6">
    {/* Feed de comunicaciones */}
  </div>
</ModalSIGLPremium>
```

## 🎨 Paleta de Colores Corporativos

```tsx
// Azul ESAP Principal
const ESAP_BLUE = '#003DA5';
const ESAP_BLUE_LIGHT = '#2a6dbd';
const ESAP_BLUE_LIGHTER = '#1557a0';

// Naranja ESAP
const ESAP_ORANGE = '#F57C00';

// Estados
const SUCCESS = '#10B981';  // Verde
const WARNING = '#F59E0B';  // Amarillo
const ERROR = '#DC2626';    // Rojo
const INFO = '#3B82F6';     // Azul
```

## 📐 Componentes del Design System

### Cards

```tsx
import { CardSIGL } from '@/components/esap/gestion-legal/design-system';

<CardSIGL className="p-4">
  Contenido
</CardSIGL>
```

### Buttons

```tsx
import { ButtonSIGL } from '@/components/esap/gestion-legal/design-system';

<ButtonSIGL variant="primary" onClick={handleClick}>
  Guardar
</ButtonSIGL>
```

### Badges

```tsx
import { BadgeSIGL } from '@/components/esap/gestion-legal/design-system';

<BadgeSIGL color="blue">
  Activo
</BadgeSIGL>
```

### Semáforo de Términos

```tsx
import { SemaforoTermino } from '@/components/esap/gestion-legal/design-system';

<SemaforoTermino diasRestantes={15} />
```

## 📚 Documentación Completa

Para documentación detallada, consulta:
- [DESIGN_STANDARDS.md](./DESIGN_STANDARDS.md) - Estándares de diseño completos
- [Ejemplos de implementación](../modulos/) - Modales de referencia

## ✨ Mejores Prácticas

### 1. Siempre usar ModalSIGLPremium

✅ **Correcto**
```tsx
import { ModalSIGLPremium } from '@/components/esap/gestion-legal/design-system';

<ModalSIGLPremium {...props}>
  {children}
</ModalSIGLPremium>
```

❌ **Incorrecto**
```tsx
// NO crear modales desde cero
<Dialog>
  <DialogContent>...</DialogContent>
</Dialog>
```

### 2. Responsive Design

```tsx
// Usar clases responsive
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {/* Contenido */}
</div>

<div className="flex flex-col md:flex-row gap-3">
  {/* Botones */}
</div>
```

### 3. Accesibilidad

```tsx
// Incluir descripción ARIA
<ModalSIGLPremium
  ariaDescription="Vista completa del expediente con información detallada"
  {...otherProps}
>
  {children}
</ModalSIGLPremium>

// Labels descriptivos
<Button aria-label="Cerrar modal">
  <X />
</Button>
```

### 4. Toast para Feedback

```tsx
import { toast } from 'sonner@2.0.3';

toast.success('✅ Guardado exitosamente', {
  description: 'Los cambios se aplicaron correctamente'
});

toast.error('❌ Error al guardar', {
  description: 'Por favor intenta nuevamente'
});
```

## 🔧 Troubleshooting

### Los botones del footer no son visibles

Asegúrate de usar `ModalSIGLPremium` en lugar de crear tu propio modal. El componente garantiza que el footer siempre esté visible.

### Los colores no coinciden con la guía corporativa

Usa las constantes de color definidas en `tokens.ts`:

```tsx
import { colorTokens } from '@/components/esap/gestion-legal/design-system/tokens';

<Button style={{ background: colorTokens.primary.main }}>
  Botón
</Button>
```

### El modal no es responsive

Verifica que estés usando las clases responsive de Tailwind:

```tsx
<div className="flex flex-col md:flex-row">
  {/* Contenido */}
</div>
```

## 📖 Ejemplos de Referencia

Revisa estos archivos para ver implementaciones completas:

1. **ModalExpediente.tsx** - Modal completo de expediente judicial
2. **ModalProcesoDisciplinario.tsx** - Modal de proceso disciplinario
3. **ModalComunicacionesProceso.tsx** - Feed de comunicaciones
4. **ModalNuevaDemanda.tsx** - Formulario de registro

## 🆘 Soporte

Si tienes dudas sobre cómo usar el design system:
1. Consulta [DESIGN_STANDARDS.md](./DESIGN_STANDARDS.md)
2. Revisa los ejemplos de implementación en `/modulos/`
3. Busca componentes similares en el código existente

---

**Versión:** 1.0  
**Última actualización:** Diciembre 2024
