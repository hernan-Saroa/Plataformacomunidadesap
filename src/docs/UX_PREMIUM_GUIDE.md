# 🚀 Guía de UX Premium - La Comunidad ESAP

## Sistema de Microinteracciones, Navegación sin Toque y Accesibilidad ARIA

Esta guía documenta el sistema completo de UX Premium implementado en La Comunidad ESAP, incluyendo microinteracciones world-class, navegación por teclado extendida y accesibilidad WCAG 2.1 AA completa.

---

## 📋 Tabla de Contenidos

1. [Microinteracciones Premium](#microinteracciones-premium)
2. [Navegación sin Toque (Teclado)](#navegación-sin-toque)
3. [Accesibilidad ARIA Completa](#accesibilidad-aria)
4. [Componentes Disponibles](#componentes-disponibles)
5. [Hooks Personalizados](#hooks-personalizados)
6. [Ejemplos de Uso](#ejemplos-de-uso)
7. [Mejores Prácticas](#mejores-prácticas)

---

## 🎨 Microinteracciones Premium

### ¿Qué son las Microinteracciones?

Pequeñas animaciones y feedback visual que proporcionan confirmación instantánea de las acciones del usuario, mejorando la experiencia y haciendo la interfaz más intuitiva y placentera.

### Hook: `useMicrointeractions`

```tsx
import { useMicrointeractions } from '../hooks/useMicrointeractions';

const {
  triggerFeedback,
  getVariants,
  getInteractiveProps,
  getFocusProps,
  getEntranceAnimation,
  getCurrentAnimation,
  reducedMotion,
} = useMicrointeractions();
```

#### Métodos Disponibles:

**1. `triggerFeedback(type, duration)`**
Activa una animación de feedback específica.

```tsx
// Tipos: 'success' | 'error' | 'warning' | 'info' | 'loading'
triggerFeedback('success', 500);
```

**2. `getInteractiveProps()`**
Retorna props para elementos interactivos con hover y tap.

```tsx
<motion.button {...getInteractiveProps()}>
  Click me
</motion.button>
```

**3. `getEntranceAnimation(type)`**
Animaciones de entrada para elementos.

```tsx
// Tipos: 'slideUp' | 'fadeIn' | 'scaleIn'
<motion.div {...getEntranceAnimation('fadeIn')}>
  Content
</motion.div>
```

### Componente: `MicrointeractionWrapper`

Wrapper reutilizable para añadir microinteracciones a cualquier elemento.

```tsx
import { MicrointeractionWrapper } from '../components/shared/MicrointeractionWrapper';

<MicrointeractionWrapper
  type="button"              // 'button' | 'card' | 'item' | 'none'
  enableHover={true}
  enableTap={true}
  enableFocus={true}
  enableRipple={true}        // Efecto ripple al hacer click
  entranceAnimation="fadeIn" // Animación de entrada
>
  <YourComponent />
</MicrointeractionWrapper>
```

#### Tipos de Wrapper:

- **`button`**: Hover, tap, focus y ripple activados
- **`card`**: Hover y focus, sin tap ni ripple
- **`item`**: Hover y tap, sin focus
- **`none`**: Configuración manual

### Estilos CSS Disponibles

Clases CSS para microinteracciones rápidas:

```tsx
// Hover Lift
<div className="hover-lift">Elemento con lift</div>

// Hover Scale
<div className="hover-scale">Elemento con scale</div>

// Hover Glow
<div className="hover-glow">Elemento con glow</div>
```

### Soporte para Reducción de Movimiento

El sistema detecta automáticamente la preferencia del usuario `prefers-reduced-motion` y simplifica las animaciones cuando está activa.

---

## ⌨️ Navegación sin Toque

### Hook: `useKeyboardNavigation`

Sistema completo de navegación por teclado sin necesidad de usar el mouse.

```tsx
import { useKeyboardNavigation } from '../hooks/useKeyboardNavigation';

const {
  handleArrowNavigation,
  handleTabNavigation,
  handleEscape,
  handleActivation,
  skipToContent,
  navigateLandmarks,
} = useKeyboardNavigation();
```

### Atajos Globales Predefinidos

La Comunidad ESAP incluye estos atajos globales:

| Atajo | Acción |
|-------|--------|
| `⌘K` / `Ctrl+K` | Abrir búsqueda global |
| `/` | Enfocar campo de búsqueda |
| `Shift + H` | Ir a inicio |
| `Shift + P` | Abrir perfil |
| `Shift + N` | Ver notificaciones |
| `Shift + M` | Abrir menú principal |
| `Shift + ?` | Mostrar atajos de teclado |

### Definir Atajos Personalizados

```tsx
import { useKeyboardNavigation, KeyboardShortcut } from '../hooks/useKeyboardNavigation';

const customShortcuts: KeyboardShortcut[] = [
  {
    key: 's',
    ctrl: true,
    description: 'Guardar cambios',
    action: () => handleSave(),
    global: true,
  },
  {
    key: 'Escape',
    description: 'Cerrar modal',
    action: () => closeModal(),
  },
];

useKeyboardNavigation(customShortcuts);
```

### Componentes de Navegación

#### `SkipLinks`
Enlaces de salto para navegación rápida.

```tsx
import { SkipLinks } from '../components/shared/SkipLinks';

<SkipLinks
  links={[
    { id: 'skip-main', label: 'Ir al contenido principal', targetId: 'main-content' },
    { id: 'skip-nav', label: 'Ir a navegación', targetId: 'main-navigation' },
  ]}
/>
```

#### `KeyboardShortcutsPanel`
Panel modal para mostrar todos los atajos disponibles.

```tsx
import { KeyboardShortcutsPanel } from '../components/shared/KeyboardShortcutsPanel';

<KeyboardShortcutsPanel
  isOpen={showShortcuts}
  onClose={() => setShowShortcuts(false)}
  customShortcuts={myShortcuts}
/>
```

### Navegación por Arrows

```tsx
const { handleArrowNavigation } = useKeyboardNavigation();

const items = document.querySelectorAll('.item');
const [currentIndex, setCurrentIndex] = useState(0);

<div onKeyDown={(e) => 
  handleArrowNavigation(
    e, 
    Array.from(items), 
    currentIndex, 
    setCurrentIndex,
    'vertical' // 'vertical' | 'horizontal' | 'grid'
  )
}>
  {/* Items */}
</div>
```

---

## ♿ Accesibilidad ARIA Completa

### Hook: `useAccessibility`

```tsx
import { useAccessibility } from '../hooks/useAccessibility';

const {
  isKeyboardUser,  // Detecta si usuario navega con teclado
  ariaProps,       // Funciones helper para ARIA
  announce,        // Anunciar a lectores de pantalla
  createId,        // Generar IDs únicos
} = useAccessibility();
```

### ARIA Props Helpers

#### Botones

```tsx
const buttonProps = ariaProps.button('Guardar documento', {
  pressed: false,
  expanded: false,
  controls: 'menu-id',
  disabled: false,
});

<button {...buttonProps}>Guardar</button>
```

#### Inputs

```tsx
const inputProps = ariaProps.input('Nombre completo', {
  required: true,
  invalid: hasError,
  describedBy: 'name-hint',
  errorMessage: 'error-msg',
});

<input {...inputProps} />
```

#### Regiones

```tsx
const regionProps = ariaProps.region('Contenido principal', 'main');

<main {...regionProps}>
  {/* Content */}
</main>
```

### Live Announcements

Anunciar cambios dinámicos a lectores de pantalla:

```tsx
// Método 1: Hook
const { announce } = useAccessibility();
announce('Documento guardado exitosamente', 'polite'); // o 'assertive'

// Método 2: Componente
import { LiveRegion } from '../components/shared/LiveRegion';

<LiveRegion 
  message={statusMessage} 
  level="polite" 
  duration={3000}
/>

// Método 3: Hook especializado
import { useLiveAnnouncements } from '../hooks/useAccessibility';

const { announcement, announce } = useLiveAnnouncements();
announce('Cambio detectado', 'assertive', 2000);
```

### Focus Management

#### `FocusManager`
Componente para gestionar focus en modales.

```tsx
import { FocusManager } from '../components/shared/FocusManager';

<FocusManager
  isActive={isModalOpen}
  restoreFocus={true}        // Restaurar focus al cerrar
  autoFocus={true}           // Auto-focus en primer elemento
  onEscape={() => closeModal()}
>
  <YourModalContent />
</FocusManager>
```

#### `useFocusTrap`
Hook para trap focus en un contenedor.

```tsx
import { useFocusTrap } from '../hooks/useAccessibility';

const containerRef = useFocusTrap(isActive);

<div ref={containerRef}>
  {/* Focus quedará atrapado aquí */}
</div>
```

#### `useFocusRestoration`
Guardar y restaurar focus.

```tsx
import { useFocusRestoration } from '../hooks/useAccessibility';

const { saveFocus, restoreFocus } = useFocusRestoration();

// Al abrir modal
const openModal = () => {
  saveFocus();
  setIsOpen(true);
};

// Al cerrar modal
const closeModal = () => {
  setIsOpen(false);
  restoreFocus();
};
```

### Expandibles y Acordeones

```tsx
import { useAriaExpanded } from '../hooks/useAccessibility';

const {
  isExpanded,
  toggle,
  expand,
  collapse,
  triggerProps,
  contentProps,
} = useAriaExpanded(false);

<button {...triggerProps} onClick={toggle}>
  Toggle
</button>
<div {...contentProps} hidden={!isExpanded}>
  Content
</div>
```

---

## 📦 Componentes Disponibles

### 1. `MicrointeractionWrapper`
Wrapper para microinteracciones premium.

### 2. `SkipLinks`
Enlaces de salto para navegación rápida.

### 3. `LiveRegion`
Región ARIA live para anuncios.

### 4. `FocusManager`
Gestión de focus en modales.

### 5. `KeyboardShortcutsPanel`
Panel de atajos de teclado.

### 6. `LandingPageEnhanced`
Ejemplo completo de implementación.

---

## 🎯 Hooks Personalizados

### Microinteracciones
- `useMicrointeractions()` - Gestión de microinteracciones

### Navegación
- `useKeyboardNavigation(shortcuts)` - Navegación por teclado

### Accesibilidad
- `useAccessibility()` - Utilidades ARIA generales
- `useFocusTrap(isActive)` - Trap focus en contenedor
- `useFocusRestoration()` - Guardar/restaurar focus
- `useLiveAnnouncements()` - Anuncios dinámicos
- `useAriaDescription(desc)` - Descripción ARIA
- `useAriaExpanded(initial)` - Estado de expansión

---

## 💡 Ejemplos de Uso

### Ejemplo 1: Card Interactiva con Microinteracciones

```tsx
import { MicrointeractionWrapper } from '../components/shared/MicrointeractionWrapper';
import { useAccessibility } from '../hooks/useAccessibility';

function InteractiveCard() {
  const { ariaProps, announce } = useAccessibility();
  
  const handleClick = () => {
    announce('Card seleccionada', 'polite');
  };

  return (
    <MicrointeractionWrapper
      type="card"
      entranceAnimation="fadeIn"
    >
      <div
        className="hover-lift p-6 bg-white rounded-lg shadow-lg cursor-pointer"
        onClick={handleClick}
        {...ariaProps.button('Seleccionar tarjeta')}
        tabIndex={0}
      >
        <h3>Título</h3>
        <p>Contenido de la tarjeta</p>
      </div>
    </MicrointeractionWrapper>
  );
}
```

### Ejemplo 2: Botón con Ripple y Feedback

```tsx
import { MicrointeractionWrapper } from '../components/shared/MicrointeractionWrapper';
import { useMicrointeractions } from '../hooks/useMicrointeractions';

function ActionButton() {
  const { triggerFeedback } = useMicrointeractions();

  const handleSave = () => {
    // Guardar datos...
    triggerFeedback('success', 600);
  };

  return (
    <MicrointeractionWrapper type="button" enableRipple>
      <button
        onClick={handleSave}
        className="px-6 py-3 bg-blue-600 text-white rounded-lg"
      >
        Guardar Cambios
      </button>
    </MicrointeractionWrapper>
  );
}
```

### Ejemplo 3: Modal Accesible con Focus Management

```tsx
import { FocusManager } from '../components/shared/FocusManager';
import { LiveRegion } from '../components/shared/LiveRegion';
import { useAccessibility } from '../hooks/useAccessibility';

function AccessibleModal({ isOpen, onClose }) {
  const { ariaProps, announce } = useAccessibility();
  const [message, setMessage] = useState('');

  const handleSubmit = () => {
    setMessage('Formulario enviado exitosamente');
    announce('Formulario enviado exitosamente', 'assertive');
    setTimeout(onClose, 2000);
  };

  return (
    <>
      <LiveRegion message={message} level="assertive" />
      
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
          <FocusManager
            isActive={isOpen}
            restoreFocus
            autoFocus
            onEscape={onClose}
          >
            <div
              className="bg-white rounded-lg p-6 max-w-md"
              {...ariaProps.dialog('Formulario de contacto')}
            >
              <h2>Formulario</h2>
              <input
                type="text"
                placeholder="Nombre"
                {...ariaProps.input('Nombre completo', { required: true })}
              />
              <button onClick={handleSubmit}>Enviar</button>
              <button onClick={onClose}>Cancelar</button>
            </div>
          </FocusManager>
        </div>
      )}
    </>
  );
}
```

### Ejemplo 4: Lista Navegable por Teclado

```tsx
import { useKeyboardNavigation } from '../hooks/useKeyboardNavigation';
import { useState } from 'react';

function NavigableList({ items }) {
  const { handleArrowNavigation } = useKeyboardNavigation();
  const [selectedIndex, setSelectedIndex] = useState(0);

  return (
    <ul
      role="listbox"
      aria-label="Lista de opciones"
      onKeyDown={(e) => {
        const itemElements = document.querySelectorAll('[role="option"]');
        handleArrowNavigation(
          e,
          Array.from(itemElements) as HTMLElement[],
          selectedIndex,
          setSelectedIndex,
          'vertical'
        );
      }}
    >
      {items.map((item, index) => (
        <li
          key={index}
          role="option"
          aria-selected={index === selectedIndex}
          tabIndex={index === selectedIndex ? 0 : -1}
          className={index === selectedIndex ? 'selected' : ''}
        >
          {item}
        </li>
      ))}
    </ul>
  );
}
```

---

## ✅ Mejores Prácticas

### Microinteracciones

1. **Usa animaciones sutiles**: No abrumar al usuario
2. **Respeta `prefers-reduced-motion`**: Automático en el sistema
3. **Feedback inmediato**: Menos de 100ms de delay
4. **Consistencia**: Usa los mismos patrones en toda la app

### Navegación por Teclado

1. **Orden lógico de Tab**: Sigue el flujo visual
2. **Indicadores de focus visibles**: Ya implementado
3. **Atajos intuitivos**: Documenta en el panel de atajos
4. **Skip links**: Siempre en páginas largas

### Accesibilidad

1. **ARIA labels significativos**: Describe la acción, no el elemento
2. **Live regions para cambios dinámicos**: Usa `polite` por defecto
3. **Focus management en modales**: Siempre trap y restore focus
4. **Contraste suficiente**: Ya cumplido en design system
5. **Tamaño mínimo de touch targets**: 44x44px en móvil

---

## 🎓 Recursos Adicionales

### Estándares Seguidos

- **WCAG 2.1 AA**: Accesibilidad web
- **ARIA 1.2**: Roles y propiedades
- **Keyboard Navigation**: Best practices

### Testing

```bash
# Verificar accesibilidad
npm run test:a11y

# Verificar atajos de teclado
# Presionar Shift + ? en la aplicación
```

### Demo Completo

Ver `LandingPageEnhanced.tsx` para un ejemplo completo de implementación.

---

## 📞 Soporte

Para dudas o sugerencias sobre el sistema de UX Premium:

1. Revisar esta documentación
2. Ver ejemplos en `LandingPageEnhanced.tsx`
3. Consultar los comentarios en los hooks y componentes

---

**Última actualización**: Noviembre 2024  
**Versión**: 1.0.0  
**Estado**: ✅ Producción Ready
