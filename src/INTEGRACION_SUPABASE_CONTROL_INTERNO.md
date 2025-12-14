# 🚀 GUÍA DE INTEGRACIÓN SUPABASE - CONTROL INTERNO ESAP

## 📋 Resumen Ejecutivo

Esta guía detalla cómo conectar el **Módulo de Control Interno de Gestión** del Backoffice ESAP con **Supabase** como backend, implementando persistencia de datos, autenticación y sincronización en tiempo real.

---

## ✅ PASO 1: Arquitectura Implementada

### 📁 Servicios Creados

Ya se han creado los siguientes archivos en `/components/esap/control-interno/services/`:

```
services/
├── types.ts                 ✅ Tipos TypeScript (600+ líneas)
├── api.ts                   ✅ Servicios API (700+ líneas)
├── hooks.ts                 ✅ React Hooks (400+ líneas)
├── supabase-schema.sql      ✅ Esquema de BD (600+ líneas)
├── index.ts                 ✅ Exportaciones
└── README.md                ✅ Documentación completa
```

### 🎯 Funcionalidades Disponibles

| Módulo | Servicios API | Hooks | Tablas BD |
|--------|--------------|-------|-----------|
| **Auditorías** | ✅ CRUD Completo | ✅ 5 hooks | ✅ `auditorias` |
| **Universo de Auditorías** | ✅ CRUD + Procesos | ✅ 2 hooks | ✅ `procesos_auditables`, `universo_auditorias` |
| **Programa Anual** | ✅ CRUD + Importar | ✅ 2 hooks | ✅ `programa_anual`, `auditorias_programadas` |
| **Hallazgos** | ✅ CRUD + Filtros | ✅ 4 hooks | ✅ `hallazgos` |
| **Planes de Mejoramiento** | ✅ CRUD + Acciones | ✅ 3 hooks | ✅ `planes_mejoramiento`, `acciones_mejoramiento` |
| **Plan Anual 5 Roles** | ✅ CRUD + Actividades | ✅ 2 hooks | ✅ `plan_anual_5roles`, `actividades` |
| **Listas de Chequeo** | ✅ CRUD Completo | ✅ 3 hooks | ✅ `listas_chequeo`, `secciones_lista_chequeo`, `items_lista_chequeo` |
| **Informes de Ley** | ✅ CRUD Completo | ✅ 3 hooks | ✅ `informes_ley`, `entregas_informes` |

---

## 🔧 PASO 2: Configuración de Supabase

### 2.1. Crear Proyecto en Supabase

1. **Ir a [supabase.com](https://supabase.com)**
2. **Crear cuenta** o iniciar sesión
3. **"New Project"**
   - Organization: `ESAP`
   - Name: `esap-control-interno`
   - Database Password: Guardar en lugar seguro
   - Region: `South America (São Paulo)` ← Más cercano a Colombia
   - Pricing Plan: Free para desarrollo, Pro para producción

4. **Esperar 2-3 minutos** mientras se aprovisiona el proyecto

### 2.2. Obtener Credenciales

Una vez creado el proyecto:

1. Ir a **Settings** → **API**
2. Copiar:
   - **Project URL**: `https://xxxxxxxxxx.supabase.co`
   - **anon public key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

---

## 🗄️ PASO 3: Crear Esquema de Base de Datos

### 3.1. Ejecutar Script SQL

1. En Supabase Dashboard, ir a **SQL Editor**
2. Click en **"New query"**
3. Abrir el archivo `/components/esap/control-interno/services/supabase-schema.sql`
4. **Copiar TODO el contenido** (600+ líneas)
5. **Pegar** en el editor SQL de Supabase
6. Click en **"Run"** (⌘ + Enter)
7. Esperar confirmación: ✅ **Success. No rows returned**

### 3.2. Verificar Tablas Creadas

1. Ir a **Table Editor** en Supabase
2. Verificar que existen estas 18 tablas:
   - ✅ `auditorias`
   - ✅ `procesos_auditables`
   - ✅ `universo_auditorias`
   - ✅ `auditorias_programadas`
   - ✅ `programa_anual`
   - ✅ `hallazgos`
   - ✅ `planes_mejoramiento`
   - ✅ `acciones_mejoramiento`
   - ✅ `plan_anual_5roles`
   - ✅ `actividades`
   - ✅ `listas_chequeo`
   - ✅ `secciones_lista_chequeo`
   - ✅ `items_lista_chequeo`
   - ✅ `informes_ley`
   - ✅ `entregas_informes`

### 3.3. Verificar Índices y Triggers

En SQL Editor, ejecutar:

```sql
-- Ver triggers creados
SELECT tgname, tgrelid::regclass 
FROM pg_trigger 
WHERE tgname LIKE 'update_%_updated_at';

-- Ver índices creados
SELECT indexname, tablename 
FROM pg_indexes 
WHERE schemaname = 'public' 
AND indexname LIKE 'idx_%';
```

Deberías ver **15+ triggers** y **10+ índices**.

---

## 💻 PASO 4: Configurar el Proyecto Next.js

### 4.1. Instalar Dependencias

```bash
npm install @supabase/supabase-js
```

### 4.2. Configurar Variables de Entorno

Crear archivo `.env.local` en la raíz del proyecto:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# API Base URL (opcional, para custom endpoints)
NEXT_PUBLIC_API_URL=/api/control-interno
```

⚠️ **IMPORTANTE:** Agregar `.env.local` al `.gitignore`

### 4.3. Crear Cliente Supabase

Crear archivo `/lib/supabase.ts`:

```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Faltan variables de entorno de Supabase');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  db: {
    schema: 'public',
  },
  global: {
    headers: {
      'x-application': 'esap-control-interno',
    },
  },
});

export default supabase;
```

---

## 🔌 PASO 5: Adaptar Servicios API a Supabase

### 5.1. Actualizar `services/api.ts`

Reemplazar la función `apiRequest` con implementación Supabase:

```typescript
import { supabase } from '@/lib/supabase';
import { 
  Auditoria, 
  // ... otros tipos 
} from './types';

// ==================== AUDITORÍAS ====================

export const auditoriasApi = {
  /**
   * Obtener todas las auditorías con filtros opcionales
   */
  getAll: async (filters?: AuditoriaFilters): Promise<ApiResponse<Auditoria[]>> => {
    try {
      let query = supabase
        .from('auditorias')
        .select('*')
        .order('fecha_creacion', { ascending: false });

      // Aplicar filtros
      if (filters?.tipo) {
        query = query.eq('tipo', filters.tipo);
      }
      if (filters?.fase) {
        query = query.eq('fase', filters.fase);
      }
      if (filters?.estado) {
        query = query.eq('estado', filters.estado);
      }
      if (filters?.territorial) {
        query = query.eq('territorial', filters.territorial);
      }
      if (filters?.auditorLider) {
        query = query.eq('auditor_lider', filters.auditorLider);
      }
      if (filters?.prioridad) {
        query = query.eq('prioridad', filters.prioridad);
      }
      if (filters?.search) {
        query = query.or(`nombre.ilike.%${filters.search}%,codigo.ilike.%${filters.search}%`);
      }

      const { data, error } = await query;

      if (error) {
        return {
          success: false,
          error: error.message,
        };
      }

      // Convertir snake_case a camelCase
      const auditorias = data.map(convertToAuditoria);

      return {
        success: true,
        data: auditorias,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido',
      };
    }
  },

  /**
   * Obtener una auditoría por ID
   */
  getById: async (id: string): Promise<ApiResponse<Auditoria>> => {
    try {
      const { data, error } = await supabase
        .from('auditorias')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        return {
          success: false,
          error: error.message,
        };
      }

      return {
        success: true,
        data: convertToAuditoria(data),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido',
      };
    }
  },

  /**
   * Crear una nueva auditoría
   */
  create: async (data: Partial<Auditoria>): Promise<ApiResponse<Auditoria>> => {
    try {
      // Convertir camelCase a snake_case
      const dbData = convertToDbFormat(data);

      const { data: newAuditoria, error } = await supabase
        .from('auditorias')
        .insert(dbData)
        .select()
        .single();

      if (error) {
        return {
          success: false,
          error: error.message,
        };
      }

      return {
        success: true,
        data: convertToAuditoria(newAuditoria),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido',
      };
    }
  },

  /**
   * Actualizar una auditoría
   */
  update: async (id: string, data: Partial<Auditoria>): Promise<ApiResponse<Auditoria>> => {
    try {
      const dbData = convertToDbFormat(data);

      const { data: updatedAuditoria, error } = await supabase
        .from('auditorias')
        .update(dbData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        return {
          success: false,
          error: error.message,
        };
      }

      return {
        success: true,
        data: convertToAuditoria(updatedAuditoria),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido',
      };
    }
  },

  /**
   * Eliminar una auditoría
   */
  delete: async (id: string): Promise<ApiResponse<void>> => {
    try {
      const { error } = await supabase
        .from('auditorias')
        .delete()
        .eq('id', id);

      if (error) {
        return {
          success: false,
          error: error.message,
        };
      }

      return {
        success: true,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido',
      };
    }
  },

  /**
   * Cambiar el estado de una auditoría
   */
  changeStatus: async (id: string, estado: Auditoria['estado']): Promise<ApiResponse<Auditoria>> => {
    return auditoriasApi.update(id, { estado });
  },

  /**
   * Actualizar progreso de una auditoría
   */
  updateProgress: async (id: string, progreso: number): Promise<ApiResponse<Auditoria>> => {
    return auditoriasApi.update(id, { progreso });
  },
};

// ==================== FUNCIONES HELPER ====================

/**
 * Convertir datos de BD (snake_case) a formato TypeScript (camelCase)
 */
function convertToAuditoria(dbData: any): Auditoria {
  return {
    id: dbData.id,
    codigo: dbData.codigo,
    nombre: dbData.nombre,
    tipo: dbData.tipo,
    fase: dbData.fase,
    estado: dbData.estado,
    territorial: dbData.territorial,
    sede: dbData.sede,
    tipoSede: dbData.tipo_sede,
    auditorLider: dbData.auditor_lider,
    auditorLiderId: dbData.auditor_lider_id,
    equipoAuditor: dbData.equipo_auditor || [],
    equipoAuditorIds: dbData.equipo_auditor_ids || [],
    alcance: dbData.alcance || '',
    objetivos: dbData.objetivos || '',
    riesgos: dbData.riesgos || '',
    criteriosAuditoria: dbData.criterios_auditoria || [],
    normativaAplicable: dbData.normativa_aplicable || [],
    fechaInicio: dbData.fecha_inicio,
    fechaFin: dbData.fecha_fin,
    fechaCreacion: dbData.fecha_creacion,
    fechaActualizacion: dbData.fecha_actualizacion,
    fechasEtapa: dbData.fechas_etapa,
    progreso: dbData.progreso || 0,
    prioridad: dbData.prioridad,
    procesoAuditableId: dbData.proceso_auditable_id,
    programaAnualId: dbData.programa_anual_id,
    hallazgos: dbData.hallazgos || 0,
    hallazgosIds: dbData.hallazgos_ids || [],
    documentosGenerados: dbData.documentos_generados,
    observaciones: dbData.observaciones || '',
    creadoPor: dbData.creado_por,
    actualizadoPor: dbData.actualizado_por,
  };
}

/**
 * Convertir datos de TypeScript (camelCase) a formato BD (snake_case)
 */
function convertToDbFormat(data: Partial<Auditoria>): any {
  const dbData: any = {};

  if (data.codigo !== undefined) dbData.codigo = data.codigo;
  if (data.nombre !== undefined) dbData.nombre = data.nombre;
  if (data.tipo !== undefined) dbData.tipo = data.tipo;
  if (data.fase !== undefined) dbData.fase = data.fase;
  if (data.estado !== undefined) dbData.estado = data.estado;
  if (data.territorial !== undefined) dbData.territorial = data.territorial;
  if (data.sede !== undefined) dbData.sede = data.sede;
  if (data.tipoSede !== undefined) dbData.tipo_sede = data.tipoSede;
  if (data.auditorLider !== undefined) dbData.auditor_lider = data.auditorLider;
  if (data.auditorLiderId !== undefined) dbData.auditor_lider_id = data.auditorLiderId;
  if (data.equipoAuditor !== undefined) dbData.equipo_auditor = data.equipoAuditor;
  if (data.equipoAuditorIds !== undefined) dbData.equipo_auditor_ids = data.equipoAuditorIds;
  if (data.alcance !== undefined) dbData.alcance = data.alcance;
  if (data.objetivos !== undefined) dbData.objetivos = data.objetivos;
  if (data.riesgos !== undefined) dbData.riesgos = data.riesgos;
  if (data.criteriosAuditoria !== undefined) dbData.criterios_auditoria = data.criteriosAuditoria;
  if (data.normativaAplicable !== undefined) dbData.normativa_aplicable = data.normativaAplicable;
  if (data.fechaInicio !== undefined) dbData.fecha_inicio = data.fechaInicio;
  if (data.fechaFin !== undefined) dbData.fecha_fin = data.fechaFin;
  if (data.fechasEtapa !== undefined) dbData.fechas_etapa = data.fechasEtapa;
  if (data.progreso !== undefined) dbData.progreso = data.progreso;
  if (data.prioridad !== undefined) dbData.prioridad = data.prioridad;
  if (data.procesoAuditableId !== undefined) dbData.proceso_auditable_id = data.procesoAuditableId;
  if (data.programaAnualId !== undefined) dbData.programa_anual_id = data.programaAnualId;
  if (data.documentosGenerados !== undefined) dbData.documentos_generados = data.documentosGenerados;
  if (data.observaciones !== undefined) dbData.observaciones = data.observaciones;

  return dbData;
}
```

### 5.2. Crear Archivo Helper de Conversiones

Crear `/components/esap/control-interno/services/converters.ts`:

```typescript
/**
 * CONVERSORES - snake_case ↔ camelCase
 * Funciones para convertir entre formato BD y TypeScript
 */

import { Auditoria, Hallazgo, PlanMejoramiento, ProcesoAuditable } from './types';

// Convertir snake_case a camelCase
export function toCamelCase(str: string): string {
  return str.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
}

// Convertir camelCase a snake_case
export function toSnakeCase(str: string): string {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

// Convertir objeto completo
export function convertKeys(obj: any, converter: (str: string) => string): any {
  if (Array.isArray(obj)) {
    return obj.map((item) => convertKeys(item, converter));
  }
  
  if (obj !== null && typeof obj === 'object') {
    return Object.keys(obj).reduce((result, key) => {
      const newKey = converter(key);
      result[newKey] = convertKeys(obj[key], converter);
      return result;
    }, {} as any);
  }
  
  return obj;
}

// Funciones específicas
export const dbToApp = (obj: any) => convertKeys(obj, toCamelCase);
export const appToDb = (obj: any) => convertKeys(obj, toSnakeCase);
```

---

## 🧪 PASO 6: Probar la Integración

### 6.1. Crear Componente de Prueba

Crear `/components/test/TestSupabaseConnection.tsx`:

```typescript
'use client';

import { useState, useEffect } from 'react';
import { useAuditorias, useCreateAuditoria } from '../esap/control-interno/services';
import { Button } from '../ui/button';

export function TestSupabaseConnection() {
  const { data: auditorias, loading, error, refetch } = useAuditorias();
  const { createAuditoria, loading: creating } = useCreateAuditoria();

  const handleCreateTest = async () => {
    await createAuditoria({
      codigo: `TEST-${Date.now()}`,
      nombre: 'Auditoría de Prueba',
      tipo: 'Gestión',
      fase: 'planeacion',
      estado: 'programada',
      territorial: 'Cundinamarca',
      sede: 'Bogotá',
      tipoSede: 'Sede Principal',
      fechaInicio: new Date().toISOString().split('T')[0],
      fechaFin: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      progreso: 0,
      prioridad: 'Media',
      alcance: 'Prueba de conexión',
      objetivos: 'Verificar integración con Supabase',
      riesgos: '',
      observaciones: 'Creado automáticamente para testing',
    });
    refetch();
  };

  if (loading) return <div className="p-4">Cargando auditorías...</div>;
  if (error) return <div className="p-4 text-red-600">Error: {error}</div>;

  return (
    <div className="p-6 border rounded-lg">
      <h2 className="text-xl font-bold mb-4">🧪 Test de Conexión Supabase</h2>
      
      <div className="mb-4">
        <p className="text-sm text-gray-600">
          Total auditorías: <strong>{auditorias?.length || 0}</strong>
        </p>
      </div>

      <Button onClick={handleCreateTest} disabled={creating}>
        {creating ? 'Creando...' : 'Crear Auditoría de Prueba'}
      </Button>

      <div className="mt-4 space-y-2">
        {auditorias?.map((auditoria) => (
          <div key={auditoria.id} className="p-2 bg-gray-50 rounded">
            <p className="font-medium">{auditoria.nombre}</p>
            <p className="text-xs text-gray-500">{auditoria.codigo}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
```

### 6.2. Agregar a una Página de Test

Crear `/app/test/page.tsx`:

```typescript
import { TestSupabaseConnection } from '@/components/test/TestSupabaseConnection';

export default function TestPage() {
  return (
    <div className="container mx-auto py-8">
      <TestSupabaseConnection />
    </div>
  );
}
```

### 6.3. Probar

1. Iniciar servidor: `npm run dev`
2. Ir a `http://localhost:3000/test`
3. Click en **"Crear Auditoría de Prueba"**
4. ✅ Debería aparecer la nueva auditoría
5. Ir a Supabase → Table Editor → `auditorias`
6. ✅ Verificar que el registro existe en la BD

---

## 📊 PASO 7: Monitoreo y Logs

### 7.1. Ver Logs en Supabase

1. Ir a **Logs** en Supabase Dashboard
2. Seleccionar **Postgres Logs**
3. Filtrar por tabla: `auditorias`
4. Ver queries ejecutados en tiempo real

### 7.2. Usar Supabase Studio

1. **Database** → **Tables**: Ver datos
2. **Database** → **Roles**: Gestionar permisos
3. **Database** → **Policies**: Ver/editar RLS
4. **API Docs**: Documentación auto-generada

---

## 🔒 PASO 8: Configurar Seguridad (RLS)

### 8.1. Políticas Básicas (Ya incluidas en schema)

El schema incluye políticas RLS básicas. Para producción, personalizar:

```sql
-- Eliminar políticas de prueba
DROP POLICY IF EXISTS "Usuarios pueden ver auditorías" ON auditorias;
DROP POLICY IF EXISTS "Usuarios pueden crear auditorías" ON auditorias;

-- Crear políticas específicas de ESAP
CREATE POLICY "Ver auditorías según rol" ON auditorias
  FOR SELECT USING (
    -- Auditor Líder ve las suyas
    auth.uid() = auditor_lider_id OR
    -- Equipo auditor ve las asignadas
    auth.uid() = ANY(equipo_auditor_ids) OR
    -- Jefe Control Interno ve todas
    EXISTS (
      SELECT 1 FROM perfiles
      WHERE id = auth.uid()
      AND rol IN ('Jefe Control Interno', 'Administrador')
    )
  );
```

### 8.2. Integrar con Usuarios ESAP

Conectar con el módulo de **Administración de Personas**:

```sql
-- Agregar foreign keys a tabla de usuarios
ALTER TABLE auditorias
  ADD CONSTRAINT fk_auditor_lider
  FOREIGN KEY (auditor_lider_id)
  REFERENCES personas(id);
```

---

## ✨ PASO 9: Features Avanzadas

### 9.1. Realtime Subscriptions

```typescript
import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';

function AuditoriasRealtime() {
  useEffect(() => {
    const subscription = supabase
      .channel('auditorias-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'auditorias',
        },
        (payload) => {
          console.log('Cambio detectado:', payload);
          // Actualizar UI automáticamente
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return <div>Auditorías en tiempo real</div>;
}
```

### 9.2. Storage para Documentos

```typescript
// Subir documento de auditoría
const uploadDocument = async (file: File, auditoriaId: string) => {
  const { data, error } = await supabase.storage
    .from('documentos-auditorias')
    .upload(`${auditoriaId}/${file.name}`, file);

  if (error) {
    console.error('Error uploading:', error);
    return null;
  }

  return data.path;
};
```

---

## 📈 PASO 10: Migración de Datos Existentes

Si ya tienes datos mock, migrar a Supabase:

```typescript
// Script de migración (ejecutar una vez)
async function migrateData() {
  const MOCK_AUDITORIAS = [...]; // Tus datos actuales

  for (const auditoria of MOCK_AUDITORIAS) {
    await controlInternoApi.auditorias.create(auditoria);
  }

  console.log('✅ Migración completada');
}
```

---

## ✅ CHECKLIST FINAL

- [ ] Proyecto Supabase creado
- [ ] Esquema SQL ejecutado (18 tablas)
- [ ] Variables de entorno configuradas
- [ ] Cliente Supabase creado (`/lib/supabase.ts`)
- [ ] Servicios API adaptados a Supabase
- [ ] Componente de prueba funcionando
- [ ] Primer registro creado en BD
- [ ] RLS configurado
- [ ] Integración con módulo de Personas
- [ ] Documentación revisada

---

## 🆘 Troubleshooting

### "Invalid API key"
→ Verificar que copiaste correctamente el `anon key` de Supabase

### "relation does not exist"
→ Ejecutar nuevamente el schema SQL completo

### "Row Level Security" bloquea operaciones
→ Temporalmente deshabilitar RLS en desarrollo:
```sql
ALTER TABLE auditorias DISABLE ROW LEVEL SECURITY;
```

---

## 📞 Próximos Pasos

1. ✅ **Backend integrado** con Supabase
2. ⏭️ **Paso 2:** Vista Calendario Gantt
3. ⏭️ **Paso 3:** Modal de Importación
4. ⏭️ **Paso 4:** Exportación Excel/PDF
5. ⏭️ **Paso 5:** Proceso de Controversia
6. ⏭️ **Paso 6:** Validación de Evidencias

---

**Fecha:** 14 de diciembre de 2024  
**Módulo:** Control Interno de Gestión ESAP  
**Estado:** ✅ LISTO PARA INTEGRACIÓN
