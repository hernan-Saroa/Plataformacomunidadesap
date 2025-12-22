# 🔔 Centro de Configuración de Alertas - SIGL

## 📍 Ubicación en el Sistema

El Centro de Configuración de Alertas está integrado como **TAB #12** dentro del módulo de **Gestión Legal (SIGL)**.

### Navegación
1. Sidebar → **Gestión Legal (SIGL)**
2. Navegación horizontal → **Centro de Alertas** (ícono de campana 🔔, color naranja)

---

## ✨ Características de Clase Mundial

### 🎨 Diseño Premium
- **Gradientes sutiles** en fondos y botones
- **Animaciones fluidas** con Motion (Framer Motion)
- **Efectos hover** profesionales en todos los elementos
- **Scrollbars personalizados** con gradiente naranja
- **Tipografía optimizada** con jerarquía clara
- **Espaciado perfecto** siguiendo principios de diseño moderno

### 🎯 Experiencia de Usuario
- **Auto-selección** del primer módulo al cargar
- **Búsqueda en tiempo real** de módulos
- **Filtros inteligentes** (Activos/Inactivos)
- **Validación automática** de umbrales
- **Feedback inmediato** con toasts informativos
- **Estados visuales claros** para todos los controles
- **Responsive completo** - mobile-first

### 🔧 Funcionalidades

#### 1. Configuración de Umbrales
- **4 niveles de alerta**: Verde, Amarillo, Rojo, Vencido
- **Validación en tiempo real**: Previene configuraciones ilógicas
- **Ejemplos visuales**: Muestra cómo funcionarán los umbrales
- **Color-coded**: Cada nivel tiene su propio esquema de color

#### 2. Canales de Notificación
- **Email**: Notificaciones por correo institucional
- **Microsoft Teams**: Mensajes directos
- **SMS**: Mensajes de texto (próximamente)
- **In-App**: Notificaciones dentro del sistema
- **Multi-selección**: Permite activar múltiples canales

#### 3. Frecuencia de Envío
- **Inmediata**: Notificación instantánea
- **Diaria**: Resumen diario
- **Semanal**: Resumen semanal
- **Personalizada**: (en desarrollo)

#### 4. Escalamiento Automático
- **Activable por módulo**
- **Tiempo configurable** (en horas)
- **Notificación a supervisores** si no hay respuesta

#### 5. Destinatarios
- **Roles predefinidos** por módulo
- **Múltiples destinatarios** por alerta
- **Estado visual** (Activo/Inactivo)

---

## 🎨 Paleta de Colores

### Colores Principales
- **Naranja Principal**: `#FF6B35` (más moderno que #FF9900)
- **Gradiente Naranja**: `from-orange-500 to-orange-600`
- **Azul ESAP**: `#003DA5` (institucional)

### Estados de Alerta
- **Verde**: `#10B981` - Situación normal
- **Amarillo**: `#EAB308` - Precaución
- **Rojo**: `#EF4444` - Urgente
- **Negro**: `#1F2937` - Vencido

### Canales
- **Email**: `#EA4335` (Google Red)
- **Teams**: `#5B5FC7` (Microsoft Purple)
- **SMS**: `#10B981` (Green)
- **In-App**: `#FF6B35` (Orange)

---

## 🔗 Integración con SIGL

### Módulos Configurables (11 total)

1. **Defensa Judicial** (`#003DA5`) - Prioridad ALTA
2. **Órganos de Control** (`#DC2626`) - Prioridad ALTA
3. **Asesoría Jurídica** (`#7C3AED`) - Prioridad MEDIA
4. **Juzgamiento Disciplinario** (`#059669`) - Prioridad ALTA
5. **Procesos Coactivos** (`#F59E0B`) - Prioridad ALTA
6. **Buzón de Notificaciones** (`#6366F1`) - Prioridad ALTA
7. **Buzón Oficina Jurídica** (`#8B5CF6`) - Prioridad MEDIA
8. **Plan de Acción** (`#10B981`) - Prioridad MEDIA
9. **Riesgos** (`#EF4444`) - Prioridad ALTA
10. **Planes de Mejoramiento** (`#3B82F6`) - Prioridad MEDIA
11. **Términos para Informes** (`#0066CC`) - Prioridad ALTA

### Configuración por Defecto

```typescript
// Ejemplo: Defensa Judicial
{
  habilitado: true,
  umbral: { verde: 15, amarillo: 10, rojo: 5, vencido: 0 },
  canales: ['EMAIL', 'TEAMS', 'IN_APP'],
  frecuencia: 'INMEDIATA',
  destinatarios: ['Abogado Asignado', 'Jefe Oficina Jurídica'],
  escalar: true,
  tiempoEscalamiento: 24, // horas
  prioridad: 'ALTA'
}
```

---

## 📊 Vistas Disponibles

### 1. ⚙️ Configuración (Implementado)
- Configuración completa de todos los módulos
- Búsqueda y filtros
- Estadísticas en tiempo real
- Panel de edición detallado

### 2. 📄 Plantillas (Próximamente)
- Editor de plantillas de mensajes
- Variables dinámicas
- Previsualización

### 3. 🕐 Historial (Próximamente)
- Registro de alertas enviadas
- Filtros por fecha, módulo, canal
- Métricas de entrega

### 4. 📈 Estadísticas (Próximamente)
- Gráficos de efectividad
- Análisis de tiempos de respuesta
- Dashboard de métricas

---

## 💾 Funciones de Gestión

### Guardar Cambios
- **Validación completa** antes de guardar
- **Confirmación visual** con toast
- **Persistencia** de configuración

### Exportar Configuración
- **Formato JSON** descargable
- **Nombre con fecha**: `alertas-sigl-2024-12-20.json`
- **Útil para**: Backup, migración, auditoría

### Restaurar Valores por Defecto
- **Confirmación requerida**
- **Restaura** todos los módulos a configuración inicial
- **Feedback visual** inmediato

---

## 🚀 Próximos Pasos (REQ-MOD01-002)

El siguiente paso es implementar el **Sistema de Alertas Automáticas** que utilizará esta configuración:

### Funcionalidades Planeadas
1. ✅ Cálculo automático de días restantes
2. ✅ Aplicación de colores según umbrales configurados
3. ✅ Envío de notificaciones según canal y frecuencia
4. ✅ Escalamiento automático a supervisores
5. ✅ Registro en historial
6. ✅ Métricas de efectividad

---

## 🔐 Validaciones Implementadas

### Umbrales
- ✅ Verde > Amarillo > Rojo > 0
- ✅ Alertas en tiempo real si hay inconsistencias
- ✅ Prevención de guardado con errores

### Canales
- ✅ Al menos 1 canal activo si el módulo está habilitado
- ✅ Validación antes de deshabilitar último canal

### Escalamiento
- ✅ Tiempo mínimo: 1 hora
- ✅ Solo disponible si el módulo está habilitado

---

## 📱 Responsive Design

### Breakpoints
- **Mobile**: `< 768px` - Layout vertical, tabs colapsables
- **Tablet**: `768px - 1024px` - Grid adaptativo 2 columnas
- **Desktop**: `> 1024px` - Grid completo 12 columnas
- **Large Desktop**: `> 1536px` - Espaciado optimizado

### Características Mobile
- Búsqueda sticky
- Scroll optimizado
- Botones táctiles grandes
- Animaciones suaves sin lag

---

## 🎭 Animaciones

### Biblioteca
- **Motion (Framer Motion)** - `motion/react`

### Efectos Aplicados
- **Fade in/out**: Transiciones entre vistas
- **Slide**: Navegación entre tabs
- **Scale**: Hover en botones y cards
- **Rotate**: Hover en iconos principales
- **Layout**: Animación del indicador de tab activo

### Performance
- ✅ GPU Acceleration habilitado
- ✅ Will-change optimizado
- ✅ Throttling en scroll
- ✅ Debouncing en búsqueda

---

## 🧪 Testing

### Casos de Prueba
1. ✅ Cambiar umbrales y validar restricciones
2. ✅ Activar/desactivar canales
3. ✅ Cambiar frecuencia de envío
4. ✅ Habilitar/deshabilitar módulos
5. ✅ Exportar configuración
6. ✅ Restaurar valores por defecto
7. ✅ Búsqueda y filtros
8. ✅ Responsive en todos los tamaños

---

## 📚 Dependencias

```json
{
  "motion": "^latest",
  "lucide-react": "^latest",
  "sonner": "2.0.3",
  "@/ui/button": "local",
  "@/ui/badge": "local",
  "@/ui/card": "local"
}
```

---

## 🎯 Cumplimiento de Estándares

- ✅ **WCAG 2.1 AA**: Accesibilidad completa
- ✅ **Navegación por teclado**: Tab, Enter, Escape
- ✅ **Screen readers**: Labels y aria-* apropiados
- ✅ **Contraste**: Todos los textos > 4.5:1
- ✅ **Tamaños táctiles**: Botones > 44x44px

---

## 👨‍💻 Mantenimiento

### Agregar un Nuevo Módulo
1. Añadir entrada en `MODULOS_CONFIG`
2. Definir color, icono, umbrales
3. Configurar destinatarios
4. Listo - se renderiza automáticamente

### Agregar un Nuevo Canal
1. Añadir entrada en `CANALES_DISPONIBLES`
2. Definir ícono y descripción
3. Implementar lógica de envío (backend)

---

## 📞 Contacto y Soporte

Para dudas o mejoras:
- **Módulo**: Gestión Legal (SIGL)
- **Componente**: `/components/esap/alertas/CentroConfiguracionAlertas.tsx`
- **Integración**: `/components/esap/gestion-legal/GestionLegalFull.tsx`

---

**Última actualización**: Diciembre 2024
**Versión**: 1.0.0 - Clase Mundial ✨
