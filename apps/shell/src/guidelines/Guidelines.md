# 📱 GUÍA ARQUITECTÓNICA - RESPONSIVIDAD MOBILE-FIRST WORLD-CLASS

Esta guía establece las reglas y patrones arquitectónicos que deben seguirse obligatoriamente en todos los desarrollos del Backoffice ESAP (tanto en el Shell como en los Microfrontends - MFEs) para garantizar una experiencia responsive uniforme, de alta resolución, intuitiva y compatible con todos los navegadores modernos.

---

## 1. Principio Fundamental: Mobile-First Progresivo
El diseño debe pensarse y codificarse primero para pantallas móviles (`320px` a `640px`) y luego ampliarse progresivamente para tablets y escritorios usando breakpoints de Tailwind. 

* **Regla de oro CSS**: Escribir las clases base pensando en móvil y usar prefijos (`sm:`, `md:`, `lg:`) únicamente para expandir o reorganizar elementos en pantallas más grandes.
* **Evitar la sobreescritura reversa**: Nunca programar un diseño pensado en escritorio para luego "arreglarlo" en móvil usando `max-width` o parches con `!important`.

---

## 2. Contrato de Breakpoints y Unidades del Viewport

### Breakpoints Estándar
Para garantizar la consistencia visual, solo se deben usar los siguientes breakpoints:
- **Base (Móvil Pequeño)**: `320px` - `474px` (Sin prefijo)
- **xs (Móvil Estándar)**: `475px` - `639px`
- **sm (Tablet Retrato)**: `640px` - `767px`
- **md (Tablet Paisaje)**: `768px` - `1023px`
- **lg (Desktop Estándar)**: `1024px` - `1279px`
- **xl (Desktop High-Res)**: `1280px` - `1535px`
- **2xl+ (Pantallas 4K / Ultra-wide)**: `1536px` en adelante

### Alturas y Unidades Dinámicas (Dynamic Viewports)
- **❌ Evitar `100vh`**: En navegadores móviles (iOS Safari, Android Chrome), el valor `100vh` no descuenta la barra de navegación del navegador, lo que genera desbordes y oculta botones inferiores.
- **✅ Usar `100dvh` y `100dvw`**: Utilizar las unidades de viewport dinámicas (Dynamic Viewport Height/Width) para layouts de pantalla completa o modales adaptativos.

---

## 3. Arquitectura de Componentes Adaptativos

Para mantener el código limpio y evitar condicionales gigantescos en los componentes, se debe seguir el patrón de **Componentes Adaptativos** mediante el uso del hook unificado `useIsMobile()` o el contenedor `<ResponsiveContainer />`.

### A. Uso del Hook `useIsMobile`
```tsx
import { useIsMobile, useIsTablet } from '@/hooks/useIsMobile';

export function MiModulo() {
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();

  return (
    <div className="p-4 md:p-8">
      {isMobile ? <VistaMobile /> : <VistaDesktop />}
    </div>
  );
}
```

### B. Regla para Tableros Complejos (Kanban)
- **Desktop/Tablet**: Se muestra la distribución en columnas horizontales (`flex` o `grid` horizontal) con scroll horizontal suave.
- **Mobile**: El tablero Kanban debe convertirse automáticamente en un **Acordeón Colapsable por Etapas** o un sistema de **Pestañas (Tabs)**. Esto evita el scroll horizontal infinito de columnas vacías y mejora la usabilidad a una sola mano.

### C. Regla para Tablas y Listados
- **Desktop**: Tablas profesionales estructuradas con cabeceras explícitas, ordenamiento interactivo y columnas de metadatos.
- **Mobile/Tablet**: Transformación automática a **Tarjetas (Cards) de Alta Resolución** con touch targets claros, truncado inteligente de textos largos y menú contextual de acciones rápidas mediante un botón de tres puntos (`MoreVertical`).

---

## 4. Usabilidad Touch y Accesibilidad (A11y)

Para lograr un acabado World-Class, los controles interactivos deben cumplir con los estándares de Apple y Google:

1. **Touch Targets (Áreas de toque) de 44x44px**:
   Cualquier botón, enlace, icono o elemento interactivo debe tener un área de clic activa de mínimo `44px` de alto y ancho en dispositivos touch.
   ```tsx
   /* Botón compacto con área táctil accesible */
   <button className="min-w-[44px] min-h-[44px] p-2 flex items-center justify-center">
     <Icon className="w-5 h-5" />
   </button>
   ```
2. **Prevención de Zoom Automático en iOS**:
   Los campos de entrada (`input`, `textarea`, `select`) en dispositivos móviles deben tener un tamaño de fuente de mínimo `16px` (`text-base`). Si la fuente es menor a 16px, iOS hace zoom automático al enfocar el campo, rompiendo el responsive del layout.
3. **Optimización para Teclados Virtuales**:
   Utilizar la API `window.visualViewport` o el hook `useKeyboardVisible` en modales y formularios extensos para ajustar la altura del contenedor dinámicamente cuando el teclado virtual está desplegado, asegurando que los botones de acción ("Guardar", "Cancelar") permanezcan visibles.

---

## 5. Rendimiento y Cross-Browser

1. **Tap Highlight Color**:
   Remover la caja azul parpadeante por defecto de Android/iOS al hacer tap en elementos interactivos y reemplazarla por microanimaciones en hover/active:
   ```css
   * {
     -webkit-tap-highlight-color: transparent;
   }
   ```
2. **Scroll Smooth e Inercial**:
   Garantizar scroll nativo fluido en iOS usando `overflow-y-auto` combinado con scroll inercial:
   ```css
   .scrollable-element {
     -webkit-overflow-scrolling: touch;
   }
   ```
3. **Imágenes y Recursos en Alta Resolución**:
   Utilizar SVG para todos los íconos (Lucide Icons) y logotipos. Para imágenes bitmap, utilizar `srcset` o formatos modernos como WebP para prevenir pixelado en pantallas Retina y de alta densidad de pixeles.
