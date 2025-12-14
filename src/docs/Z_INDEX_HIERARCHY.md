# 📐 Jerarquía de Z-Index - Sistema ESAP

## Estructura de Capas (Z-Index Layers)

Para evitar conflictos de superposición entre componentes, establecemos la siguiente jerarquía estricta:

```
┌─────────────────────────────────────────────────────────┐
│  CAPA 6: Modales y Overlays (z-9999)                   │
│  - Modales de formularios                               │
│  - Command Palette                                      │
│  - Overlays de confirmación                             │
├─────────────────────────────────────────────────────────┤
│  CAPA 5: Tooltips y Popovers (z-1000)                  │
│  - Tooltips                                             │
│  - Dropdowns                                            │
│  - Popovers                                             │
├─────────────────────────────────────────────────────────┤
│  CAPA 4: Notificaciones (z-500)                        │
│  - Toast notifications                                  │
│  - Alerts flotantes                                     │
├─────────────────────────────────────────────────────────┤
│  CAPA 3: TopBar (z-101)                                │
│  - Header superior                                      │
│  - Breadcrumbs                                          │
├─────────────────────────────────────────────────────────┤
│  CAPA 2: Sidebar (z-100)                               │
│  - Navegación lateral                                   │
│  - Overlay del sidebar móvil (z-99)                    │
├─────────────────────────────────────────────────────────┤
│  CAPA 1: Contenido (z-0 a z-10)                        │
│  - Contenido de módulos                                 │
│  - Cards y secciones                                    │
│  - Elementos interactivos                               │
└─────────────────────────────────────────────────────────┘
```

## ✅ Valores Estándar por Componente

| Componente | Z-Index | Ubicación |
|------------|---------|-----------|
| **Modales** | 9999 | Todos los modales del sistema |
| **ProfileModal** | 9999 | ProfileModal.tsx |
| **Command Palette** | 9999 | CommandPalettePremium.tsx |
| **Tooltips/Dropdowns** | 1000 | Componentes UI |
| **Notifications Panel** | 500 | NotificationsPanelV2.tsx |
| **Landing Page Header** | 200 | LandingPage.tsx |
| **TopBar (Backoffice)** | 101 | TopBar.tsx |
| **Sidebar** | 100 | SidebarPremium.tsx |
| **Sidebar Overlay (mobile)** | 99 | SidebarPremium.tsx |
| **Contenido principal** | 0-10 | Módulos |

## 🚫 Reglas Importantes

1. **NUNCA usar z-index > 10000** - Reservado para casos extremos
2. **Modales siempre usan z-9999** - Deben estar sobre todo
3. **TopBar siempre z-101** - Por encima del sidebar pero debajo de modales
4. **Sidebar z-100** - Base de navegación
5. **Contenido regular z-0 a z-10** - Evitar z-index altos innecesarios

## 🔧 Solución de Problemas Comunes

### Problema: TopBar queda debajo de elementos
**Solución**: Verificar que ningún elemento del contenido tenga z-index > 100

### Problema: Modal no aparece
**Solución**: Verificar que use z-9999 o superior

### Problema: Dropdown/Tooltip cortado
**Solución**: Asegurar que use z-1000

## 📝 Cambios Recientes

**Diciembre 10, 2025**:
- ✅ ProfileModal actualizado de z-100 a z-9999 (corrige conflicto con sidebar)
- ✅ Corregido problema de menú lateral escondido detrás del modal de perfil

**Diciembre 2025**:
- ✅ TopBar (Backoffice) actualizado de z-50 a z-101
- ✅ Landing Page Header actualizado de z-50 a z-200
- ✅ Agregado backdrop-blur-xl al header de Landing Page
- ✅ Sidebar mantiene z-100
- ✅ Modales estandarizados en z-9999
- ✅ Documentación creada

---

**Última actualización**: Diciembre 2025  
**Responsable**: Equipo de Desarrollo ESAP