# Guía de Uso: Componentes de Sedes y Programas Académicos

**Fecha**: 30 de Noviembre, 2025  
**Proyecto**: Backoffice Administrativo ESAP  
**Versión**: 2.0

---

## 📦 Componentes Disponibles

### 1. **GestionAsignacionesSedes**
Componente para gestionar asignaciones de sedes organizacionales a usuarios.

**Ubicación**: `/components/estructura-organizacional/GestionAsignacionesSedes.tsx`

**Props**:
```typescript
interface GestionAsignacionesSedesProps {
  asignaciones: CreateAsignacionSedeDTO[];
  onChange: (asignaciones: CreateAsignacionSedeDTO[]) => void;
  sedePrincipalId?: string;
  onSedePrincipalChange?: (sedePrincipalId?: string) => void;
  required?: boolean;
}
```

**Uso**:
```tsx
import { GestionAsignacionesSedes } from '../estructura-organizacional/GestionAsignacionesSedes';

<GestionAsignacionesSedes
  asignaciones={formData.asignacionesSedes}
  onChange={(asignaciones) => setFormData({ ...formData, asignacionesSedes: asignaciones })}
  sedePrincipalId={formData.sedePrincipalId}
  onSedePrincipalChange={(id) => setFormData({ ...formData, sedePrincipalId: id })}
  required={true}
/>
```

---

### 2. **GestionAsignacionesProgramas**
Componente para gestionar asignaciones de programas académicos a usuarios.

**Ubicación**: `/components/esap/GestionAsignacionesProgramas.tsx`

**Props**:
```typescript
interface GestionAsignacionesProgramasProps {
  asignaciones: CreateAsignacionProgramaDTO[];
  onChange: (asignaciones: CreateAsignacionProgramaDTO[]) => void;
  required?: boolean;
  sedesAsignadas?: string[]; // Para validación
}
```

**Uso**:
```tsx
import { GestionAsignacionesProgramas } from './GestionAsignacionesProgramas';

<GestionAsignacionesProgramas
  asignaciones={formData.asignacionesProgramas}
  onChange={(asignaciones) => setFormData({ ...formData, asignacionesProgramas: asignaciones })}
  sedesAsignadas={formData.asignacionesSedes.map(a => a.unidadId)}
  required={true}
/>
```

**Funcionalidades**:
- ✅ Agregar/eliminar programas
- ✅ Marcar programa como principal
- ✅ Fechas de inicio y fin
- ✅ Observaciones por asignación
- ✅ Validación con sedes asignadas

---

### 3. **UserSedesYProgramasInfo**
Componente para visualizar información de sedes y programas de un usuario.

**Ubicación**: `/components/shared/UserSedesYProgramasInfo.tsx`

**Props**:
```typescript
interface UserSedesYProgramasInfoProps {
  user: Partial<User>;
  variant?: 'compact' | 'detailed' | 'full';
  showSedes?: boolean;
  showProgramas?: boolean;
}
```

**Uso - Variante Compact** (Solo badges principales):
```tsx
import { UserSedesYProgramasInfo } from '../shared/UserSedesYProgramasInfo';

<UserSedesYProgramasInfo 
  user={usuario} 
  variant="compact" 
/>
```

**Uso - Variante Detailed** (Con detalles):
```tsx
<UserSedesYProgramasInfo 
  user={usuario} 
  variant="detailed" 
  showSedes={true}
  showProgramas={true}
/>
```

**Uso - Variante Full** (Información completa):
```tsx
<UserSedesYProgramasInfo 
  user={usuario} 
  variant="full" 
/>
```

**Componentes Helper**:
```tsx
import { UserSedePrincipal, UserProgramaPrincipal } from '../shared/UserSedesYProgramasInfo';

// Solo sede principal
<UserSedePrincipal user={usuario} />

// Solo programa principal
<UserProgramaPrincipal user={usuario} />
```

---

### 4. **FiltrosSedePrograma**
Componente de filtros avanzados por sede y programa académico.

**Ubicación**: `/components/shared/FiltrosSedePrograma.tsx`

**Props**:
```typescript
interface FiltrosSedeProgramaProps {
  filtros: FiltrosSedePrograma;
  onChange: (filtros: FiltrosSedePrograma) => void;
  showSedes?: boolean;
  showProgramas?: boolean;
  showNiveles?: boolean;
  showModalidades?: boolean;
  showNivelesOrg?: boolean;
}
```

**Uso Completo**:
```tsx
import { FiltrosSedePrograma, type FiltrosSedePrograma as FiltrosType } from '../shared/FiltrosSedePrograma';

const [filtros, setFiltros] = useState<FiltrosType>({
  sedes: [],
  programas: [],
  niveles: [],
  modalidades: [],
  nivelesOrganizacionales: [],
});

<FiltrosSedePrograma
  filtros={filtros}
  onChange={setFiltros}
  showSedes={true}
  showProgramas={true}
  showNiveles={true}
  showModalidades={true}
  showNivelesOrg={true}
/>
```

**Uso Solo Sedes**:
```tsx
<FiltrosSedePrograma
  filtros={filtros}
  onChange={setFiltros}
  showSedes={true}
  showProgramas={false}
  showNiveles={false}
  showModalidades={false}
  showNivelesOrg={true}
/>
```

**Aplicar Filtros a Datos**:
```tsx
// Filtrar usuarios según filtros activos
const usuariosFiltrados = usuarios.filter(usuario => {
  // Filtro por sede
  if (filtros.sedes.length > 0) {
    const tieneSede = usuario.asignacionesSedes?.some(
      asignacion => filtros.sedes.includes(asignacion.unidadId)
    );
    if (!tieneSede) return false;
  }

  // Filtro por programa
  if (filtros.programas.length > 0) {
    const tienePrograma = usuario.asignacionesProgramas?.some(
      asignacion => filtros.programas.includes(asignacion.programaId)
    );
    if (!tienePrograma) return false;
  }

  // Filtro por nivel académico
  if (filtros.niveles.length > 0) {
    const tieneNivel = usuario.asignacionesProgramas?.some(asignacion => {
      const programa = PROGRAMAS_ESAP.find(p => p.codigo === asignacion.programaId);
      return programa && filtros.niveles.includes(programa.nivel);
    });
    if (!tieneNivel) return false;
  }

  return true;
});
```

---

### 5. **ReporteDistribucionTerritorialAcademica**
Componente de reporte con métricas y visualizaciones.

**Ubicación**: `/components/esap/ReporteDistribucionTerritorialAcademica.tsx`

**Uso**:
```tsx
import { ReporteDistribucionTerritorialAcademica } from './ReporteDistribucionTerritorialAcademica';

<ReporteDistribucionTerritorialAcademica />
```

**Métricas que muestra**:
- ✅ Total usuarios
- ✅ Usuarios con programas
- ✅ Usuarios con múltiples sedes
- ✅ Usuarios con múltiples programas
- ✅ Top 5 sedes con más usuarios
- ✅ Top 5 programas con más usuarios
- ✅ Distribución por nivel académico
- ✅ Distribución por modalidad
- ✅ Distribución por nivel organizacional

---

## 🛠️ Utilidades de Validación

### Funciones de Validación Sede-Programa

**Ubicación**: `/utils/validacion-sede-programa.ts`

#### 1. **isProgramaDisponibleEnSede**
Valida si un programa está disponible en una sede específica.

```typescript
import { isProgramaDisponibleEnSede } from '../utils/validacion-sede-programa';

const disponible = isProgramaDisponibleEnSede('AP-DIURNA', 'SEDE-NAL');
// Returns: true | false
```

#### 2. **getProgramasDisponiblesEnSede**
Obtiene todos los programas disponibles en una sede.

```typescript
import { getProgramasDisponiblesEnSede } from '../utils/validacion-sede-programa';

const programas = getProgramasDisponiblesEnSede('SEDE-NAL');
// Returns: ProgramaESAP[]
```

#### 3. **getSedesDisponiblesParaPrograma**
Obtiene todas las sedes donde está disponible un programa.

```typescript
import { getSedesDisponiblesParaPrograma } from '../utils/validacion-sede-programa';

const sedes = getSedesDisponiblesParaPrograma('MAE-AP');
// Returns: SedeESAP[]
```

#### 4. **validarAsignacionesSedePrograma**
Valida las asignaciones de sede-programa de un usuario.

```typescript
import { validarAsignacionesSedePrograma } from '../utils/validacion-sede-programa';

const validacion = validarAsignacionesSedePrograma(
  usuario.asignacionesSedes,
  usuario.asignacionesProgramas
);

console.log(validacion.esValido); // true | false
console.log(validacion.errores); // string[]
console.log(validacion.advertencias); // string[]

// Mostrar errores al usuario
if (!validacion.esValido) {
  validacion.errores.forEach(error => {
    toast.error(error);
  });
}

// Mostrar advertencias
validacion.advertencias.forEach(advertencia => {
  toast.warning(advertencia);
});
```

#### 5. **getProgramasCompatiblesConSedes**
Filtra programas compatibles con las sedes asignadas.

```typescript
import { getProgramasCompatiblesConSedes } from '../utils/validacion-sede-programa';

const codigosSedes = ['SEDE-NAL', 'DIR-ATL'];
const programasCompatibles = getProgramasCompatiblesConSedes(codigosSedes);
// Returns: ProgramaESAP[]
```

#### 6. **getInfoCompatibilidadSedePrograma**
Obtiene información detallada de compatibilidad.

```typescript
import { getInfoCompatibilidadSedePrograma } from '../utils/validacion-sede-programa';

const info = getInfoCompatibilidadSedePrograma('SEDE-NAL', 'AP-DIURNA');

console.log(info?.compatible); // true | false
console.log(info?.razon); // string explicando por qué
console.log(info?.modalidadPrograma); // 'Presencial' | 'Virtual' | 'Distancia'
console.log(info?.nivelSede); // 'nacional' | 'territorial' | ...
```

---

## 📊 Helpers de Mock Data

**Ubicación**: `/mock-data/usuarios-con-sedes-programas.ts`

### Funciones Disponibles:

#### 1. **getUsuariosPorSede**
```typescript
import { getUsuariosPorSede } from '../mock-data/usuarios-con-sedes-programas';

const usuarios = getUsuariosPorSede('SEDE-NAL');
// Returns: Partial<User>[]
```

#### 2. **getUsuariosPorPrograma**
```typescript
import { getUsuariosPorPrograma } from '../mock-data/usuarios-con-sedes-programas';

const usuarios = getUsuariosPorPrograma('AP-DIURNA');
// Returns: Partial<User>[]
```

#### 3. **getUsuariosPorSedeYPrograma**
```typescript
import { getUsuariosPorSedeYPrograma } from '../mock-data/usuarios-con-sedes-programas';

const usuarios = getUsuariosPorSedeYPrograma('SEDE-NAL', 'AP-DIURNA');
// Returns: Partial<User>[]
```

#### 4. **getEstadisticasDistribucion**
```typescript
import { getEstadisticasDistribucion } from '../mock-data/usuarios-con-sedes-programas';

const stats = getEstadisticasDistribucion();
// Returns:
// {
//   porSede: Record<string, number>,
//   porPrograma: Record<string, number>,
//   totalUsuarios: number
// }
```

---

## 🎨 Ejemplo de Integración Completa

### Módulo de Usuarios con Filtros y Visualización

```tsx
import React, { useState } from 'react';
import { FiltrosSedePrograma, type FiltrosSedePrograma as FiltrosType } from '../shared/FiltrosSedePrograma';
import { UserSedesYProgramasInfo } from '../shared/UserSedesYProgramasInfo';
import { usuariosConSedesYProgramas } from '../mock-data/usuarios-con-sedes-programas';
import { PROGRAMAS_ESAP } from '../data/oferta-academica-esap';

export function ModuloUsuariosConFiltros() {
  const [filtros, setFiltros] = useState<FiltrosType>({
    sedes: [],
    programas: [],
    niveles: [],
    modalidades: [],
    nivelesOrganizacionales: [],
  });

  // Aplicar filtros
  const usuariosFiltrados = usuariosConSedesYProgramas.filter(usuario => {
    // Filtro por sede
    if (filtros.sedes.length > 0) {
      const tieneSede = usuario.asignacionesSedes?.some(
        asignacion => filtros.sedes.includes(asignacion.unidadId)
      );
      if (!tieneSede) return false;
    }

    // Filtro por programa
    if (filtros.programas.length > 0) {
      const tienePrograma = usuario.asignacionesProgramas?.some(
        asignacion => filtros.programas.includes(asignacion.programaId)
      );
      if (!tienePrograma) return false;
    }

    // Filtro por nivel académico
    if (filtros.niveles.length > 0) {
      const tieneNivel = usuario.asignacionesProgramas?.some(asignacion => {
        const programa = PROGRAMAS_ESAP.find(p => p.codigo === asignacion.programaId);
        return programa && filtros.niveles.includes(programa.nivel);
      });
      if (!tieneNivel) return false;
    }

    return true;
  });

  return (
    <div className="space-y-6">
      <h1>Gestión de Usuarios</h1>

      {/* Filtros */}
      <FiltrosSedePrograma
        filtros={filtros}
        onChange={setFiltros}
      />

      {/* Resultados */}
      <div className="text-sm text-gray-600">
        Mostrando {usuariosFiltrados.length} de {usuariosConSedesYProgramas.length} usuarios
      </div>

      {/* Lista de Usuarios */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {usuariosFiltrados.map(usuario => (
          <div key={usuario.id} className="bg-white rounded-lg border p-4">
            <h3 className="font-bold text-gray-900 mb-2">{usuario.fullName}</h3>
            <p className="text-sm text-gray-600 mb-3">{usuario.email}</p>
            
            {/* Mostrar sedes y programas */}
            <UserSedesYProgramasInfo 
              user={usuario} 
              variant="detailed" 
            />
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## 🚀 Buenas Prácticas

### 1. **Validación en Formularios**
Siempre valida las asignaciones antes de enviar:

```tsx
import { validarAsignacionesSedePrograma } from '../utils/validacion-sede-programa';

const handleSubmit = () => {
  const validacion = validarAsignacionesSedePrograma(
    formData.asignacionesSedes,
    formData.asignacionesProgramas
  );

  if (!validacion.esValido) {
    validacion.errores.forEach(error => toast.error(error));
    return;
  }

  // Mostrar advertencias pero continuar
  validacion.advertencias.forEach(warning => toast.warning(warning));

  // Enviar formulario
  onSubmit(formData);
};
```

### 2. **Filtros Persistentes**
Guarda los filtros en localStorage:

```tsx
import { useEffect } from 'react';

const [filtros, setFiltros] = useState<FiltrosType>(() => {
  const saved = localStorage.getItem('filtros-usuarios');
  return saved ? JSON.parse(saved) : {
    sedes: [],
    programas: [],
    niveles: [],
    modalidades: [],
    nivelesOrganizacionales: [],
  };
});

useEffect(() => {
  localStorage.setItem('filtros-usuarios', JSON.stringify(filtros));
}, [filtros]);
```

### 3. **Carga Condicional de Programas**
Filtra programas según sedes seleccionadas:

```tsx
import { getProgramasCompatiblesConSedes } from '../utils/validacion-sede-programa';

const programasDisponibles = useMemo(() => {
  if (formData.asignacionesSedes.length === 0) {
    return PROGRAMAS_ESAP;
  }
  
  const codigosSedes = formData.asignacionesSedes.map(a => a.unidadId);
  return getProgramasCompatiblesConSedes(codigosSedes);
}, [formData.asignacionesSedes]);
```

---

## 📝 Notas Importantes

1. **Programas Virtuales**: Los programas con modalidad "Virtual" están disponibles en TODAS las sedes automáticamente.

2. **Validación No Bloqueante**: Las validaciones de compatibilidad sede-programa generan **advertencias** pero no bloquean la creación de usuarios. Esto permite flexibilidad administrativa.

3. **Ámbito de Acceso**: El campo `ambitoAcceso` determina el alcance de permisos del usuario en esa sede/programa:
   - `nacional`: Acceso a todas las sedes
   - `territorial`: Acceso a nivel territorial
   - `regional`: Acceso a nivel regional
   - `local`: Acceso solo a esa sede específica

4. **Asignaciones Principales**: Solo puede haber UNA sede principal y UN programa principal por usuario.

---

**Última actualización**: 30 de Noviembre, 2025  
**Versión de la Guía**: 1.0
