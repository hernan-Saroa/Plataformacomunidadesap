# 📚 DOCUMENTACIÓN BACKOFFICE ESAP

Bienvenido a la documentación completa del **Backoffice Administrativo de la Comunidad Universitaria ESAP**.

---

## 🎯 ÍNDICE DE DOCUMENTACIÓN

### 🏗️ **Arquitectura y Diseño**

#### 📋 [ESTÁNDAR KANBAN - SIGL](./ESTANDAR-KANBAN-SIGL.md) ⭐ **NUEVO**
- **Estándar oficial** para visualización de procesos en Gestión Legal
- Diseño de tarjetas, columnas y sistema de alertas
- Paleta de colores por módulo
- Checklist de calidad
- **APROBADO**: Mantener este diseño en todos los módulos SIGL

#### 🎨 [Arquitectura Visual - Control Disciplinario](./ARQUITECTURA_VISUAL_CONTROL_DISCIPLINARIO.md)
- Diseño completo del módulo Control Interno Disciplinario
- Sistema de tarjetas Noticias/Procesos
- Integración Editor de Documentos + Gestión Documental
- Tarjetas compactas con información esencial

#### 📱 [Guía Responsive - Control Disciplinario](./GUIA_RESPONSIVE_DISCIPLINARIO.md)
- Implementación responsive Mobile, Tablet, Desktop
- Breakpoints y diseño adaptativo
- Sistema Touch + HTML5 Backend para DnD

---

### ⌨️ **Navegación y Atajos**

#### 🎹 [Atajos de Teclado](./ATAJOS_TECLADO.md)
- Navegación completa por teclado
- Ctrl+1 a Ctrl+9: Acceso directo a módulos
- Ctrl+K: Ayuda de atajos
- Flechas: Navegación en sidebar
- Cumplimiento WCAG 2.1 AA

#### 📝 [Resumen Implementación Atajos](./RESUMEN_ATAJOS_IMPLEMENTACION.md)
- Detalles técnicos de implementación
- useKeyboardShortcuts hook
- Integración con módulos

---

### 🔧 **Desarrollo Backend**

#### 🗄️ [Guía Backend - Control Disciplinario](./BACKEND_GUIDE_CONTROL_DISCIPLINARIO.md)
- Estructura de base de datos Supabase
- Tablas: noticias_disciplinarias, procesos_disciplinarios
- Políticas RLS y seguridad
- Flujos de conversión Noticia → Proceso

---

### 🔐 **Permisos y Seguridad**

#### 👥 [Sistema de Permisos - Control Disciplinario](./PERMISOS_CONTROL_DISCIPLINARIO.md)
- Roles: Administrador, Coordinador, Profesional, Consulta
- Permisos por acción
- Filtrado de información según rol
- Implementación en React

---

### 🐛 **Fixes y Correcciones**

#### 📱 [Corrección Responsive Mobile](./CORRECCION_RESPONSIVE_MOBILE.md)
- Fix para dashboard Kanban en mobile
- Ajustes de altura y scroll
- Optimización de tarjetas

#### ✅ [Fix Responsive Final](./FIX_RESPONSIVE_FINAL.md)
- Solución definitiva para problemas responsive
- Mobile-first approach
- Testing en múltiples dispositivos

---

## 🚀 GUÍAS RÁPIDAS

### Para empezar a desarrollar:
1. Leer [Arquitectura Visual](./ARQUITECTURA_VISUAL_CONTROL_DISCIPLINARIO.md)
2. Revisar [Atajos de Teclado](./ATAJOS_TECLADO.md) para navegación
3. Implementar siguiendo el [Estándar Kanban](./ESTANDAR-KANBAN-SIGL.md) ⭐

### Para implementar un nuevo módulo de Gestión Legal:
1. ✅ Seguir **OBLIGATORIAMENTE** el [Estándar Kanban SIGL](./ESTANDAR-KANBAN-SIGL.md)
2. Usar `KanbanGenerico` o crear uno específico
3. Configurar etapas en `kanban-configs.tsx`
4. Integrar con `ModuloConKanban` para toggle Kanban/Lista

### Para trabajar con Control Disciplinario:
1. Leer [Arquitectura Visual](./ARQUITECTURA_VISUAL_CONTROL_DISCIPLINARIO.md)
2. Revisar [Sistema de Permisos](./PERMISOS_CONTROL_DISCIPLINARIO.md)
3. Si trabajas con backend: [Guía Backend](./BACKEND_GUIDE_CONTROL_DISCIPLINARIO.md)
4. Para responsive: [Guía Responsive](./GUIA_RESPONSIVE_DISCIPLINARIO.md)

---

## 📊 MÓDULOS DOCUMENTADOS

### ✅ Control Interno Disciplinario
- Dashboard Kanban Operativo
- Sistema de Noticias y Procesos
- Editor de Documentos integrado
- Gestión Documental completa
- Totalmente responsive

### ✅ Sistema Integrado de Gestión Legal (SIGL)
- **11 submódulos con Kanban estandarizado**:
  1. Defensa Judicial (4 jurisdicciones)
  2. Órganos de Control
  3. Asesoría Jurídica
  4. Juzgamiento Disciplinario
  5. Procesos Coactivos
  6. Buzón de Notificaciones
  7. Buzón Oficina Jurídica
  8. Plan de Acción
  9. Riesgos
  10. Planes de Mejoramiento
  11. Términos para Informes
- **Formato Kanban** como vista principal ⭐
- Toggle Kanban/Lista en todos los módulos

---

## 🎨 ESTÁNDARES DE DISEÑO

### Colores Corporativos ESAP
```css
--azul-esap: #003DA5    /* Color principal */
--gris-texto: #374151   /* Texto principal */
--gris-claro: #F9FAFB   /* Fondos */
```

### Sistema de Alertas (Común a todos los módulos)
```
🟢 VERDE    → Más de 15 días
🟡 AMARILLO → 5-15 días
🔴 ROJO     → 1-4 días
⚫ VENCIDO  → 0 o menos días
```

### Tipografía
- Se respetan las definiciones en `/styles/globals.css`
- NO usar clases Tailwind de font-size/weight sin necesidad
- El sistema tiene tipografía predefinida por elemento HTML

---

## 📝 CONVENCIONES DE CÓDIGO

### Estructura de Archivos
```
/components/esap/
├── disciplinario/           # Control Interno Disciplinario
│   ├── DashboardKanbanOperativo.tsx
│   ├── EditorDocumentos.tsx
│   └── ...
├── gestion-legal/           # SIGL
│   ├── KanbanGenerico.tsx
│   ├── KanbanDefensaJudicial.tsx
│   ├── kanban-configs.tsx
│   ├── ModuloConKanban.tsx
│   └── ...
└── shared/                  # Componentes compartidos
    └── ModuleLayout.tsx
```

### Componentes UI Compartidos
```
/components/ui/
├── button.tsx
├── badge.tsx
├── card.tsx
└── ...
```

---

## 🔗 RECURSOS ADICIONALES

### Bibliotecas Principales
- **React 18** + **TypeScript**
- **Tailwind CSS v4.0** (sin config, solo CSS)
- **react-dnd**: Drag & Drop
- **motion/react**: Animaciones
- **lucide-react**: Iconos
- **sonner**: Notificaciones toast

### Accesibilidad
- Cumplimiento **WCAG 2.1 AA**
- Navegación completa por teclado
- Roles ARIA implementados
- Focus management

---

## 📧 CONTACTO Y CONTRIBUCIONES

Para dudas o contribuciones:
1. Revisar la documentación relevante
2. Seguir los estándares establecidos
3. Mantener consistencia con módulos existentes

---

**Última actualización**: 20 de diciembre de 2024  
**Mantenido por**: Equipo de Desarrollo ESAP  
**Versión**: 2.0
