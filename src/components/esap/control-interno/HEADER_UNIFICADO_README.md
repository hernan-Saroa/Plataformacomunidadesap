# Header Unificado - Control Interno de Gestión

## 📋 Resumen de Cambios

Se ha unificado el diseño de todos los encabezados/navegadores del módulo de Control Interno de Gestión para mantener una experiencia visual consistente en toda la aplicación.

## 🎨 Diseño Mandatorio

El diseño base está tomado del **Dashboard Kanban Operativo** (`GestionAuditoriasKanbanSimple.tsx`):

### Características del Header Unificado:
- **Título principal**: Color naranja (#F97316), font-black, text-2xl
- **Subtítulo**: Color gris (#6B7280), text-sm
- **Espacio para acciones personalizadas**: Botones, filtros, controles de vista, etc.
- **Diseño responsive**: Adaptable a mobile y desktop

## 📦 Componentes Creados

### 1. `HeaderModuloCIG`
**Ubicación**: `/components/esap/control-interno/HeaderModuloCIG.tsx`

Componente reutilizable para encabezados generales del módulo.

**Props**:
```typescript
interface HeaderModuloCIGProps {
  titulo: string;              // Título principal en naranja
  subtitulo: string;           // Subtítulo descriptivo
  accionesPersonalizadas?: React.ReactNode;  // Botones, filtros, etc.
}
```

**Uso**:
```tsx
import { HeaderModuloCIG } from './HeaderModuloCIG';

<HeaderModuloCIG
  titulo="Ciclo de Planificación de Auditorías"
  subtitulo="Gestión del proceso de planificación anual de auditorías"
  accionesPersonalizadas={
    <Button>Nueva Auditoría</Button>
  }
/>
```

### 2. `HeaderAuditoriaCIG`
**Ubicación**: `/components/esap/control-interno/HeaderAuditoriaCIG.tsx`

Componente especializado para vistas de detalle de auditorías que muestra información específica de la auditoría actual.

**Props**:
```typescript
interface HeaderAuditoriaCIGProps {
  auditoria: {
    codigo: string;
    nombre: string;
    auditorLider: string;
    fechaInicio: string;
    fechaFin: string;
  };
  onVerExpediente?: () => void;
}
```

**Uso**:
```tsx
import { HeaderModuloCIG } from './HeaderAuditoriaCIG';

<HeaderModuloCIG
  auditoria={{
    codigo: 'AUD-2025-001',
    nombre: 'Auditoría de Gestión Financiera',
    auditorLider: 'Fernando Ávila',
    fechaInicio: '15/1/2025',
    fechaFin: '24/1/2025'
  }}
  onVerExpediente={() => {}}
/>
```

## ✅ Módulos Actualizados

### 1. PlanificacionModuleRediseno.tsx
- ✅ Implementa `HeaderModuloCIG`
- ✅ Título: "Ciclo de Planificación de Auditorías"
- ✅ Subtítulo: "Gestión del proceso de planificación anual de auditorías"
- ✅ Mantiene navegación por pasos (tabs)

### 2. ProcesoAuditoriaModuleRediseno.tsx
- ✅ Implementa `HeaderModuloCIG` (función exportada como `HeaderModuloCIG`)
- ✅ Muestra información de la auditoría actual
- ✅ Botón "Ver Expediente"
- ✅ Información del auditor líder y fechas

### 3. GestionAuditoriasKanbanSimple.tsx
- ✅ Header original (diseño mandatorio)
- ✅ Título: "Tablero Kanban Operativo"
- ✅ Subtítulo: "Gestión visual del flujo de auditorías"
- ✅ Controles: Expandir/Colapsar, selector Kanban/Lista, botón Nueva Auditoría

## 🎯 Beneficios

1. **Consistencia Visual**: Todos los módulos tienen el mismo look & feel
2. **Mantenibilidad**: Cambios centralizados en componentes reutilizables
3. **Escalabilidad**: Fácil aplicar el header a nuevos módulos
4. **UX Mejorada**: Navegación predecible y familiar para el usuario
5. **Línea Corporativa ESAP**: Color naranja (#F97316) como identificador visual

## 🔄 Migración de Otros Módulos

Para aplicar el header unificado a otros módulos del CIG:

```tsx
// ANTES
<div className="bg-white border-b">
  <h1 className="text-xl">Mi Módulo</h1>
</div>

// DESPUÉS
import { HeaderModuloCIG } from './HeaderModuloCIG';

<HeaderModuloCIG
  titulo="Mi Módulo"
  subtitulo="Descripción breve del módulo"
/>
```

## 📝 Notas de Implementación

- El color naranja (#F97316) es el color oficial para títulos principales en CIG
- El diseño es mobile-first y responsive
- Se mantiene compatibilidad con los componentes del design-system (CardSIGL, ButtonSIGL, etc.)
- Todos los headers están alineados con la línea corporativa de ESAP

## 🚀 Próximos Pasos

1. ✅ Aplicar header unificado a módulos restantes:
   - PlanesMejoramientoModuleRediseno.tsx
   - SeguimientoPlanMejoramientoModule.tsx
   - Otros módulos del CIG

2. ✅ Documentar patrones de uso en Guidelines.md

3. ✅ Crear tests unitarios para componentes de header

---

**Última actualización**: 24 Diciembre 2025  
**Responsable**: Equipo de Desarrollo ESAP  
**Versión**: 1.0
