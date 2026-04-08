# 📋 Guía de Implementación: Vista de Archivados y Eliminados

## 🎯 Objetivo
Implementar una sección protegida por permisos en cada módulo de Gestión Legal donde se puedan visualizar, restaurar y eliminar permanentemente expedientes/procesos archivados o eliminados.

## 🏗️ Arquitectura

### Componentes Creados
1. **`VistaArchivados.tsx`** - Componente reutilizable principal
2. **`PermisosContext.tsx`** - Sistema de permisos y control de acceso

### Flujo de Trabajo
```
Usuario con permisos → Accede a vista "Archivados" → 
Ve items archivados/eliminados → 
Puede Restaurar (vuelve al módulo activo) o 
Eliminar Permanentemente (eliminación de BD)
```

## 🔐 Sistema de Permisos

### Permisos Definidos
```typescript
PERMISOS = {
  VER_ARCHIVADOS: 'VER_ARCHIVADOS',           // Ver sección
  RESTAURAR_ITEMS: 'RESTAURAR_ITEMS',         // Restaurar items
  ELIMINAR_PERMANENTE: 'ELIMINAR_PERMANENTE', // Eliminar de forma permanente
  // ... otros permisos
}
```

### Roles y Permisos por Defecto
- **SUPER_ADMIN**: Todos los permisos
- **ADMIN_MODULO**: Todos los permisos del módulo
- **USUARIO_AVANZADO**: Ver y restaurar
- **USUARIO_CONSULTA**: Solo consulta (sin archivados)

## 📝 Paso a Paso: Implementación en un Módulo

### PASO 1: Agregar imports necesarios
```typescript
import { VistaArchivados, ItemArchivado, EstadoArchivado } from '../design-system/VistaArchivados';
import { usePermisos, PERMISOS } from '../config/PermisosContext';
```

### PASO 2: Actualizar tipo de vista
```typescript
// Antes
type VistaModulo = 'kanban' | 'lista';

// Después
type VistaModulo = 'kanban' | 'lista' | 'archivados';
```

### PASO 3: Agregar opción en toggle view
```typescript
toggleView={{
  current: tipoVista,
  onChange: setTipoVista,
  options: [
    { label: 'Kanban', icon: <Columns3 className="w-4 h-4" /> },
    { label: 'Lista', icon: <List className="w-4 h-4" /> },
    { label: 'Archivados', icon: <Archive className="w-4 h-4" /> } // ✅ NUEVO
  ]
}}
```

### PASO 4: Crear datos mock de archivados
```typescript
const itemsArchivadosMock: ItemArchivado[] = [
  {
    id: 'DJ-999',
    codigo: '25000-23-33-001-2023-00999-00',
    nombre: 'Nulidad Acto Administrativo - Juan Pérez',
    tipo: 'Proceso Judicial',
    estado: 'ARCHIVADO',
    fechaArchivado: new Date('2024-12-01'),
    usuarioArchivo: 'Dra. Ana María López',
    motivoArchivo: 'Desistimiento de la demanda por parte del actor',
    metadatos: {
      'Tipo Acción': 'NULIDAD Y RESTABLECIMIENTO',
      'Juzgado': 'Juzgado 12 Administrativo de Bogotá',
      'Cuantía': '$85,000,000'
    }
  },
  {
    id: 'DJ-998',
    codigo: '11001-03-25-000-2023-00888-00',
    nombre: 'Reparación Directa - Carlos Martínez',
    tipo: 'Proceso Judicial',
    estado: 'ELIMINADO',
    fechaArchivado: new Date('2024-11-15'),
    usuarioArchivo: 'Dr. Juan Carlos Pérez',
    motivoArchivo: 'Proceso duplicado - Error en radicación',
    metadatos: {
      'Tipo Acción': 'REPARACIÓN DIRECTA',
      'Juzgado': 'Tribunal Administrativo de Cundinamarca'
    }
  }
];
```

### PASO 5: Implementar funciones de restaurar/eliminar
```typescript
const handleRestaurar = async (itemId: string) => {
  // Lógica para mover el item de archivados a activos
  console.log('Restaurando item:', itemId);
  
  // Aquí se implementaría la llamada al backend
  // await api.restaurarExpediente(itemId);
  
  // Actualizar estado local
  // setExpedientes([...expedientes, itemRestaurado]);
};

const handleEliminarPermanente = async (itemId: string) => {
  // Lógica para eliminar permanentemente de la BD
  console.log('Eliminando permanentemente:', itemId);
  
  // Aquí se implementaría la llamada al backend
  // await api.eliminarPermanente(itemId);
  
  // Actualizar estado local
  // setItemsArchivados(itemsArchivados.filter(i => i.id !== itemId));
};
```

### PASO 6: Renderizar vista de archivados
```typescript
{/* Vista de Archivados - NUEVA */}
{tipoVista === 'archivados' && (
  <VistaArchivados
    items={itemsArchivadosMock}
    moduloNombre="Defensa Judicial"
    onRestaurar={handleRestaurar}
    onEliminarPermanente={handleEliminarPermanente}
    permisoRequerido={PERMISOS.VER_ARCHIVADOS}
    usuarioActual={usuario}
  />
)}
```

## 🎨 Diseño y UX

### Pantalla de Acceso Denegado
Si el usuario NO tiene permisos, ve:
```
┌────────────────────────────────┐
│         🛡️ ACCESO RESTRINGIDO  │
│                                │
│ No tiene permisos para acceder │
│ a la sección de Archivados y   │
│ Eliminados.                    │
│                                │
│ Contacte al administrador del  │
│ sistema para solicitar acceso. │
└────────────────────────────────┘
```

### Vista Principal (con permisos)
```
┌─────────────────────────────────────────┐
│ 📦 Archivados y Eliminados   🛡️ Protegido│
├─────────────────────────────────────────┤
│ Total: 15 │ Archivados: 10 │ Eliminados: 5│
├─────────────────────────────────────────┤
│ 🔍 Buscar... [Todos] [Archivados] [...] │
├─────────────────────────────────────────┤
│ ┌─────────────────────────────────────┐ │
│ │ DJ-999  [📦 Archivado]             │ │
│ │ Nulidad Acto - Juan Pérez          │ │
│ │ 📅 2024-12-01  👤 Dra. López       │ │
│ │ [👁️] [🔄 Restaurar]                │ │
│ └─────────────────────────────────────┘ │
│ ┌─────────────────────────────────────┐ │
│ │ DJ-998  [🗑️ Eliminado]             │ │
│ │ Reparación - Carlos Martínez       │ │
│ │ 📅 2024-11-15  👤 Dr. Pérez        │ │
│ │ [👁️] [🗑️ Eliminar Permanente]     │ │
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

## 🔗 Integración con Módulos Existentes

### Módulos donde implementar:
1. ✅ **Defensa Judicial** (MOD-01)
2. **Juzgamiento Disciplinario** (MOD-02)
3. **Órganos de Control** (MOD-03)
4. **Planes de Mejoramiento** (MOD-10)
5. **Quejas y Reclamos** (MOD-11)
6. **Auditorías** (MOD-12)

### Ejemplo: Defensa Judicial
```typescript
// Ver archivo: /components/esap/gestion-legal/modulos/ModuloDefensaJudicialV3.tsx

export function ModuloDefensaJudicialV3() {
  const { usuario } = usePermisos();
  const [tipoVista, setTipoVista] = useState<VistaModulo>('kanban');
  
  // ... código existente ...
  
  return (
    <div>
      {/* Kanban */}
      {tipoVista === 'kanban' && <VistaKanban />}
      
      {/* Lista */}
      {tipoVista === 'lista' && <VistaLista />}
      
      {/* Archivados - NUEVO */}
      {tipoVista === 'archivados' && (
        <VistaArchivados
          items={itemsArchivados}
          moduloNombre="Defensa Judicial"
          onRestaurar={handleRestaurar}
          onEliminarPermanente={handleEliminarPermanente}
        />
      )}
    </div>
  );
}
```

## 🔄 Backend: Endpoints Necesarios

### Endpoints Recomendados
```
GET    /api/modulo/:moduloId/archivados       → Obtener items archivados
POST   /api/modulo/:moduloId/restaurar/:id    → Restaurar item
DELETE /api/modulo/:moduloId/permanente/:id   → Eliminar permanente
```

### Estructura de Respuesta
```typescript
interface ApiArchivadosResponse {
  items: ItemArchivado[];
  total: number;
  archivados: number;
  eliminados: number;
}
```

## 📊 Auditoría y Trazabilidad

### Campos de Auditoría
Cada item archivado/eliminado debe registrar:
- `fechaArchivado`: Timestamp del archivo/eliminación
- `usuarioArchivo`: Usuario que realizó la acción
- `motivoArchivo`: Razón del archivo/eliminación
- `fechaRestauracion`: (Opcional) Si fue restaurado
- `usuarioRestauracion`: (Opcional) Usuario que restauró

### Log de Acciones
```typescript
// Al archivar
logAuditoria({
  accion: 'ARCHIVAR_EXPEDIENTE',
  modulo: 'DEFENSA_JUDICIAL',
  itemId: 'DJ-001',
  usuario: 'Dr. Carlos Méndez',
  fecha: new Date(),
  motivo: 'Proceso terminado por desistimiento'
});

// Al restaurar
logAuditoria({
  accion: 'RESTAURAR_EXPEDIENTE',
  modulo: 'DEFENSA_JUDICIAL',
  itemId: 'DJ-001',
  usuario: 'Dra. Ana López',
  fecha: new Date(),
  motivo: 'Error en archivo - proceso aún activo'
});

// Al eliminar permanentemente
logAuditoria({
  accion: 'ELIMINAR_PERMANENTE',
  modulo: 'DEFENSA_JUDICIAL',
  itemId: 'DJ-001',
  usuario: 'Admin Sistema',
  fecha: new Date(),
  motivo: 'Cumplimiento política retención documental'
});
```

## 🛡️ Seguridad y Permisos

### Validación de Permisos
```typescript
// En el frontend
const puedeVerArchivados = tienePermiso(PERMISOS.VER_ARCHIVADOS);
const puedeRestar = tienePermiso(PERMISOS.RESTAURAR_ITEMS);
const puedeEliminarPermanente = tienePermiso(PERMISOS.ELIMINAR_PERMANENTE);

// En el backend (Node.js ejemplo)
app.get('/api/archivados', verificarPermiso('VER_ARCHIVADOS'), async (req, res) => {
  // Lógica para obtener archivados
});

app.post('/api/restaurar/:id', verificarPermiso('RESTAURAR_ITEMS'), async (req, res) => {
  // Lógica para restaurar
});

app.delete('/api/permanente/:id', verificarPermiso('ELIMINAR_PERMANENTE'), async (req, res) => {
  // Lógica para eliminar permanentemente
});
```

### Niveles de Seguridad
1. **Nivel 1 - Frontend**: Ocultar botones según permisos
2. **Nivel 2 - Backend**: Validar permisos en cada endpoint
3. **Nivel 3 - Base de Datos**: Soft delete con flag `deleted_at`
4. **Nivel 4 - Auditoría**: Log completo de todas las acciones

## 📱 Responsive Design
La VistaArchivados está optimizada para:
- **Desktop (>1024px)**: 3 columnas en estadísticas, vista completa
- **Tablet (768-1024px)**: 2 columnas, botones compactos
- **Mobile (<768px)**: 1 columna, vista tipo lista

## ✅ Checklist de Implementación

Por cada módulo:
- [ ] Importar componentes necesarios
- [ ] Actualizar tipo `VistaModulo`
- [ ] Agregar opción en `toggleView`
- [ ] Crear datos mock de archivados
- [ ] Implementar `handleRestaurar`
- [ ] Implementar `handleEliminarPermanente`
- [ ] Renderizar `<VistaArchivados />`
- [ ] Probar con usuario SIN permisos
- [ ] Probar con usuario CON permisos
- [ ] Verificar modales de confirmación
- [ ] Probar búsqueda y filtros
- [ ] Validar responsive mobile

## 🎯 Beneficios de esta Implementación

1. ✅ **Protección de Información**: Solo usuarios autorizados acceden
2. ✅ **Trazabilidad Completa**: Auditoría de quién, qué, cuándo
3. ✅ **Recuperación de Datos**: Posibilidad de restaurar errores
4. ✅ **Cumplimiento Normativo**: Políticas de retención documental
5. ✅ **Componente Reutilizable**: Mismo código para todos los módulos
6. ✅ **UX Consistente**: Diseño uniforme en toda la aplicación

## 📞 Soporte

Para dudas sobre implementación, contactar al equipo de desarrollo ESAP.

---

**Última actualización**: Enero 2025  
**Versión**: 1.0  
**Responsable**: Equipo Desarrollo Backoffice ESAP
