# 🚀 Servicios de Backend - Módulo Control Interno

Esta carpeta contiene toda la arquitectura de servicios para la integración con backend (Supabase).

## 📁 Estructura

```
services/
├── types.ts              # Tipos TypeScript compartidos
├── api.ts                # Capa de servicios API
├── hooks.ts              # Custom React Hooks
├── supabase-schema.sql   # Esquema de base de datos
├── index.ts              # Punto de entrada
└── README.md             # Esta guía
```

---

## 🎯 Uso Básico

### 1. Importar Tipos

```typescript
import { 
  Auditoria, 
  Hallazgo, 
  PlanMejoramiento,
  AuditoriaFilters 
} from '@/components/esap/control-interno/services';
```

### 2. Usar Servicios API Directamente

```typescript
import { controlInternoApi } from '@/components/esap/control-interno/services';

// Obtener todas las auditorías
const response = await controlInternoApi.auditorias.getAll();
if (response.success && response.data) {
  console.log(response.data);
}

// Crear una auditoría
const nuevaAuditoria = await controlInternoApi.auditorias.create({
  nombre: 'Auditoría Financiera 2025',
  tipo: 'Financiera',
  // ... más datos
});
```

### 3. Usar Custom Hooks (Recomendado)

```typescript
import { 
  useAuditorias, 
  useCreateAuditoria,
  useHallazgos 
} from '@/components/esap/control-interno/services';

function MiComponente() {
  // Hook para obtener auditorías
  const { data: auditorias, loading, error, refetch } = useAuditorias();
  
  // Hook para crear auditoría
  const { createAuditoria, loading: creating } = useCreateAuditoria();
  
  const handleCrear = async () => {
    const nueva = await createAuditoria({
      nombre: 'Nueva Auditoría',
      tipo: 'Gestión',
      fase: 'planeacion',
      // ... más datos
    });
    
    if (nueva) {
      refetch(); // Recargar lista
    }
  };
  
  if (loading) return <div>Cargando...</div>;
  if (error) return <div>Error: {error}</div>;
  
  return (
    <div>
      {auditorias?.map(auditoria => (
        <div key={auditoria.id}>{auditoria.nombre}</div>
      ))}
      <button onClick={handleCrear}>Crear Auditoría</button>
    </div>
  );
}
```

---

## 📚 API Disponibles

### 🔍 Auditorías

```typescript
// Obtener todas
const auditorias = await controlInternoApi.auditorias.getAll();

// Con filtros
const filtradas = await controlInternoApi.auditorias.getAll({
  tipo: 'Gestión',
  fase: 'en-curso',
  territorial: 'Cundinamarca'
});

// Paginadas
const paginadas = await controlInternoApi.auditorias.getPaginated(1, 10);

// Por ID
const auditoria = await controlInternoApi.auditorias.getById('uuid');

// Crear
const nueva = await controlInternoApi.auditorias.create(data);

// Actualizar
const actualizada = await controlInternoApi.auditorias.update('uuid', data);

// Eliminar
await controlInternoApi.auditorias.delete('uuid');

// Cambiar estado
await controlInternoApi.auditorias.changeStatus('uuid', 'en-ejecucion');

// Actualizar progreso
await controlInternoApi.auditorias.updateProgress('uuid', 75);
```

### 🎯 Universo de Auditorías

```typescript
// Obtener por año
const universo = await controlInternoApi.universoAuditorias.getByYear(2025);

// Crear
const nuevo = await controlInternoApi.universoAuditorias.create(data);

// Agregar proceso
const proceso = await controlInternoApi.universoAuditorias.addProceso(universoId, procesoData);

// Actualizar proceso
await controlInternoApi.universoAuditorias.updateProceso(procesoId, data);
```

### 📅 Programa Anual

```typescript
// Obtener por año
const programa = await controlInternoApi.programaAnual.getByYear(2025);

// Importar desde universo
const importadas = await controlInternoApi.programaAnual.importFromUniverso(
  programaId, 
  ['proceso-id-1', 'proceso-id-2']
);

// Agregar auditoría
await controlInternoApi.programaAnual.addAuditoria(programaId, auditoriaData);
```

### 🔴 Hallazgos

```typescript
// Todos los hallazgos
const hallazgos = await controlInternoApi.hallazgos.getAll();

// Por auditoría
const hallazgosAuditoria = await controlInternoApi.hallazgos.getByAuditoria(auditoriaId);

// Con filtros
const filtrados = await controlInternoApi.hallazgos.getAll({
  gravedad: 'Alta',
  estado: 'abierto'
});

// Crear
const hallazgo = await controlInternoApi.hallazgos.create(data);

// Cambiar estado
await controlInternoApi.hallazgos.changeStatus(hallazgoId, 'cerrado');
```

### 📋 Planes de Mejoramiento

```typescript
// Todos los planes
const planes = await controlInternoApi.planesMejoramiento.getAll();

// Crear plan
const plan = await controlInternoApi.planesMejoramiento.create(data);

// Agregar acción
const accion = await controlInternoApi.planesMejoramiento.addAccion(planId, accionData);

// Actualizar progreso de acción
await controlInternoApi.planesMejoramiento.updateAccionProgress(accionId, 80);
```

---

## 🎣 Hooks Disponibles

### Auditorías
- `useAuditorias(filters?, options?)` - Obtener auditorías
- `useAuditoria(id, options?)` - Obtener una auditoría
- `useCreateAuditoria()` - Crear auditoría
- `useUpdateAuditoria()` - Actualizar auditoría
- `useDeleteAuditoria()` - Eliminar auditoría

### Hallazgos
- `useHallazgos(filters?, options?)` - Obtener hallazgos
- `useHallazgosByAuditoria(auditoriaId, options?)` - Hallazgos de una auditoría
- `useHallazgo(id, options?)` - Obtener un hallazgo
- `useCreateHallazgo()` - Crear hallazgo
- `useUpdateHallazgo()` - Actualizar hallazgo

### Planes de Mejoramiento
- `usePlanesMejoramiento(filters?, options?)` - Obtener planes
- `usePlanMejoramiento(id, options?)` - Obtener un plan
- `useCreatePlanMejoramiento()` - Crear plan

### Otros
- `useUniversoAuditorias(year, options?)` - Universo del año
- `useProgramaAnual(year, options?)` - Programa anual
- `usePlanAnual5Roles(year, options?)` - Plan anual 5 roles
- `useListasChequeo(options?)` - Listas de chequeo
- `useInformesLey(options?)` - Informes de ley

---

## 🗄️ Integración con Supabase

### 1. Crear el Proyecto en Supabase

1. Ir a [supabase.com](https://supabase.com)
2. Crear nuevo proyecto
3. Copiar las credenciales (URL y anon key)

### 2. Ejecutar el Schema

1. Ir a SQL Editor en Supabase
2. Copiar el contenido de `supabase-schema.sql`
3. Ejecutar el script
4. Verificar que todas las tablas se crearon

### 3. Configurar Variables de Entorno

Crear archivo `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key
NEXT_PUBLIC_API_URL=https://tu-proyecto.supabase.co/rest/v1
```

### 4. Instalar Cliente de Supabase

```bash
npm install @supabase/supabase-js
```

### 5. Crear Cliente Supabase

Crear archivo `lib/supabase.ts`:

```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

### 6. Adaptar los Servicios API

Modificar `services/api.ts` para usar Supabase:

```typescript
import { supabase } from '@/lib/supabase';

// Ejemplo: Obtener auditorías
export const auditoriasApi = {
  getAll: async (filters?: AuditoriaFilters) => {
    try {
      let query = supabase.from('auditorias').select('*');
      
      if (filters?.tipo) {
        query = query.eq('tipo', filters.tipo);
      }
      if (filters?.fase) {
        query = query.eq('fase', filters.fase);
      }
      
      const { data, error } = await query;
      
      if (error) {
        return { success: false, error: error.message };
      }
      
      return { success: true, data: data as Auditoria[] };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Error desconocido' 
      };
    }
  },
  
  // ... más métodos
};
```

---

## 🔒 Seguridad (RLS)

El esquema incluye Row Level Security (RLS) básico. Ajustar según roles de ESAP:

```sql
-- Ejemplo: Solo auditores pueden crear auditorías
CREATE POLICY "Solo auditores crean auditorías" ON auditorias
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM usuarios 
      WHERE id = auth.uid() 
      AND rol IN ('Auditor', 'Auditor Líder', 'Jefe Control Interno')
    )
  );
```

---

## 📊 Migraciones

Si necesitas modificar el esquema después de crearlo:

1. Crear archivo de migración en `supabase/migrations/`
2. Ejecutar con Supabase CLI:

```bash
supabase migration new nombre_migracion
supabase db push
```

---

## 🧪 Testing

Ejemplo de tests con datos mock:

```typescript
import { controlInternoApi } from './services';

// Mock fetch para testing
global.fetch = jest.fn();

describe('Auditorías API', () => {
  test('Debe obtener auditorías', async () => {
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => [{ id: '1', nombre: 'Test' }]
    });
    
    const response = await controlInternoApi.auditorias.getAll();
    expect(response.success).toBe(true);
    expect(response.data).toHaveLength(1);
  });
});
```

---

## 📝 Notas Importantes

1. **Validación**: Todos los datos se validan en el backend (constraints SQL)
2. **Timestamps**: Se manejan automáticamente con triggers
3. **UUIDs**: Generados automáticamente con uuid-ossp
4. **Soft Delete**: Considera agregar `deleted_at` si necesitas soft deletes
5. **Auditoría**: Los campos `creado_por` y `actualizado_por` rastrean cambios

---

## 🆘 Troubleshooting

### Error: "relation does not exist"
- Verificar que ejecutaste el schema SQL completo
- Revisar que el nombre de la tabla coincida

### Error: "permission denied"
- Revisar políticas RLS
- Verificar que el usuario está autenticado

### Error: "invalid input syntax for type uuid"
- Asegurar que los IDs son UUIDs válidos
- Usar `uuid_generate_v4()` para generar nuevos

---

## 🔄 Actualización de Componentes Existentes

Para migrar componentes que usan mock data a usar los servicios:

### Antes:
```typescript
const [auditorias, setAuditorias] = useState(MOCK_AUDITORIAS);
```

### Después:
```typescript
const { data: auditorias, loading, refetch } = useAuditorias();

const { createAuditoria } = useCreateAuditoria();

const handleCrear = async (data) => {
  const nueva = await createAuditoria(data);
  if (nueva) {
    refetch(); // Recargar lista
  }
};
```

---

## 📞 Soporte

Para dudas o problemas:
1. Revisar la documentación de Supabase
2. Verificar los logs en Supabase Dashboard
3. Consultar el esquema SQL para entender la estructura

---

**Última actualización:** 14 de diciembre de 2024
