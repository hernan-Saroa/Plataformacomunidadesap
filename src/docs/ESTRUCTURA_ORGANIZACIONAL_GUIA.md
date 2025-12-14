# 🏢 Estructura Organizacional ESAP - Guía Completa

## 📋 Descripción General

El sistema de **Estructura Organizacional** es un módulo fundamental que permite gestionar la **estructura territorial jerárquica** de ESAP a nivel nacional. Este sistema impacta **todos los módulos** del backoffice ya que **cada usuario debe pertenecer a una o más sedes**.

---

## 🌳 Jerarquía de Estructura

La estructura organizacional de ESAP sigue una jerarquía de 4 niveles:

```
📍 SEDE NACIONAL (única)
    └── 🏛️ DIRECCIONES TERRITORIALES
            └── 🏫 CENTROS REGIONALES
                    └── 📌 PUNTOS DE ATENCIÓN
```

### Niveles Explicados:

1. **Sede Nacional** 🇨🇴
   - Una única sede a nivel país
   - Ubicación: Bogotá D.C.
   - Máximo nivel jerárquico

2. **Dirección Territorial** 🏛️
   - Sedes por región geográfica
   - Ejemplos: Bogotá, Antioquia, Valle, Cauca
   - Reportan directamente a la Sede Nacional

3. **Centro Regional** 🏫
   - Sedes en ciudades específicas
   - Ejemplos: Centro Regional Medellín, Centro Regional Cali
   - Reportan a su Dirección Territorial

4. **Punto de Atención** 📌
   - Oficinas pequeñas o puntos de servicio
   - Reportan a su Centro Regional

---

## 👥 Sistema de Asignación Múltiple

### Concepto Clave: **Un usuario puede pertenecer a múltiples sedes**

Ejemplos de casos reales:

- **Docente itinerante**: Enseña en Bogotá y Medellín
- **Administrativo regional**: Supervisa varias sedes
- **Director territorial**: Gestiona toda una territorial y sus subordinados
- **Coordinador nacional**: Acceso a toda la estructura

### Componentes de una Asignación:

Cada asignación de un usuario a una sede incluye:

```typescript
{
  unidadId: "DIR-BOG",              // Sede asignada
  ambitoAcceso: "territorial",      // Qué puede ver desde esta sede
  esPrincipal: true,                // Si es su sede principal
  fechaInicio: "2024-01-01",        // Cuándo empieza
  fechaFin: "2024-12-31",           // Cuándo termina (opcional)
  observaciones: "Notas..."         // Información adicional
}
```

---

## 🔐 Ámbito de Acceso

Define **qué información puede ver** el usuario desde cada sede asignada:

| Ámbito | Descripción | Ejemplo |
|--------|-------------|---------|
| **Local** 🏢 | Solo su sede específica | Coordinador local solo ve su centro |
| **Regional** 🏫 | Su sede + centros subordinados | Director regional ve sus centros |
| **Territorial** 🏛️ | Toda la territorial + subordinados | Director territorial ve toda su región |
| **Nacional** 🇨🇴 | Toda la estructura ESAP | Administrador nacional ve todo |

### Ejemplo Práctico:

```javascript
Usuario: "Carlos Rodríguez"
Asignaciones:
  1. Dirección Territorial Bogotá (Principal)
     - Ámbito: Territorial
     - Puede ver: DIR-BOG + todos sus centros regionales
  
  2. Centro Regional Medellín
     - Ámbito: Local
     - Puede ver: Solo CRE-MED
```

---

## 🎯 Sede Principal

### ¿Qué es la Sede Principal?

- **Una y solo una** de las sedes asignadas debe ser marcada como **principal**
- Es la sede "base" o "de origen" del usuario
- Se usa para reportes, estadísticas y filtros por defecto
- Se muestra visualmente con un ícono de estrella ⭐

### Características:

```typescript
✅ CORRECTO:
Usuario con 3 sedes:
  - Bogotá (Principal ⭐)
  - Medellín
  - Cali

❌ INCORRECTO:
Usuario con 3 sedes:
  - Bogotá
  - Medellín (Principal ⭐)
  - Cali (Principal ⭐)  // ❌ Solo puede haber una principal
```

---

## 💻 Uso en el Sistema

### 1. Creación de Usuario

Al crear un usuario, **ES OBLIGATORIO** asignar al menos una sede:

```typescript
// Formulario de creación
{
  // ... datos básicos del usuario
  
  asignacionesSedes: [
    {
      unidadId: "DIR-BOG",
      ambitoAcceso: "territorial",
      esPrincipal: true  // Marcar una como principal
    },
    {
      unidadId: "DIR-ANT",
      ambitoAcceso: "regional",
      esPrincipal: false
    }
  ],
  sedePrincipalId: "DIR-BOG"
}
```

### 2. Visualización en Tablas

Los usuarios muestran badges de sus sedes asignadas:

```
Juan Pérez
📍 Bogotá ⭐  |  Medellín  |  +2 más
```

### 3. Filtros por Sede

Todos los módulos pueden filtrar información por sede:

```
[Filtro de Sede ▼]
  📍 Todas las sedes
  ─────────────────
  🇨🇴 Sede Nacional
  🏛️ DIR Bogotá ⭐
  🏛️ DIR Antioquia
  🏫 Centro Medellín
```

---

## 📊 Componentes Disponibles

### 1. **EstructuraOrganizacionalModule** (Módulo Principal)

Vista completa de gestión con 4 modos:

- **Vista Árbol** 🌳: Navegación jerárquica
- **Vista Lista** 📋: Tabla detallada
- **Vista Mapa** 🗺️: Geolocalización
- **Vista Estadísticas** 📊: Analytics

### 2. **GestionAsignacionesSedes** (Formulario de Asignaciones)

Componente para **crear/editar** asignaciones múltiples:

```jsx
<GestionAsignacionesSedes
  asignaciones={asignaciones}
  onChange={setAsignaciones}
  sedePrincipalId={sedePrincipal}
  onSedePrincipalChange={setSedePrincipal}
  required={true}
/>
```

**Funcionalidades:**
- ✅ Agregar sede
- ✅ Editar asignación
- ✅ Eliminar sede
- ✅ Marcar/cambiar sede principal
- ✅ Configurar ámbito de acceso
- ✅ Fechas de vigencia

### 3. **SelectorEstructura** (Selector de Sede)

Tres variantes según necesidad:

```jsx
// Base - Completo
<SelectorEstructura
  value={sedeId}
  onChange={setSedeId}
  incluirTodas={true}
/>

// Compacto - Para headers
<SelectorEstructuraCompacto
  value={sedeId}
  onChange={setSedeId}
/>

// Formulario - Con validación
<SelectorEstructuraForm
  value={sedeId}
  onChange={setSedeId}
  label="Sede"
  required={true}
  error={errors.sede}
/>
```

### 4. **BadgesSedesUsuario** (Visualización)

Muestra sedes asignadas visualmente:

```jsx
// Default - Badges
<BadgesSedesUsuario
  asignaciones={usuario.asignacionesSedes}
  maxVisible={2}
/>

// Compacto
<BadgesSedesUsuario
  asignaciones={usuario.asignacionesSedes}
  variant="compact"
/>

// Detallado
<BadgesSedesUsuario
  asignaciones={usuario.asignacionesSedes}
  variant="detailed"
/>

// Solo principal
<BadgeSedePrincipal
  asignaciones={usuario.asignacionesSedes}
/>
```

---

## 🔧 Integración en Módulos Existentes

### Paso 1: Actualizar Tipos

```typescript
import type { AsignacionSede } from '@/types';

interface Usuario {
  // ... campos existentes
  asignacionesSedes: AsignacionSede[];
  sedePrincipalId?: string;
  sedePrincipal?: {
    id: string;
    nombre: string;
    codigo: string;
  };
}
```

### Paso 2: Agregar Filtro de Sede

```tsx
import { SelectorEstructuraCompacto } from '@/components/estructura-organizacional';

function MiModulo() {
  const [sedeFilter, setSedeFilter] = useState<string>();

  return (
    <div>
      {/* Header con filtro */}
      <div className="flex gap-3">
        <SelectorEstructuraCompacto
          value={sedeFilter}
          onChange={setSedeFilter}
        />
        {/* Otros filtros */}
      </div>

      {/* Contenido filtrado por sede */}
      <MiContenido sedeId={sedeFilter} />
    </div>
  );
}
```

### Paso 3: Mostrar Sedes en Tablas

```tsx
import { BadgesSedesUsuario } from '@/components/estructura-organizacional';

<table>
  <tbody>
    {usuarios.map(usuario => (
      <tr key={usuario.id}>
        <td>{usuario.nombre}</td>
        <td>
          <BadgesSedesUsuario
            asignaciones={usuario.asignacionesSedes}
            maxVisible={2}
          />
        </td>
      </tr>
    ))}
  </tbody>
</table>
```

---

## 🔒 Validaciones y Reglas de Negocio

### Reglas Obligatorias:

1. ✅ **Todo usuario DEBE tener al menos 1 sede asignada**
2. ✅ **Solo puede haber 1 sede principal por usuario**
3. ✅ **No se puede duplicar asignación (mismo usuario + misma sede)**
4. ✅ **El código de sede debe ser único**
5. ✅ **Una sede con subordinados no se puede eliminar**
6. ✅ **Una sede con usuarios asignados no se puede eliminar**
7. ✅ **La jerarquía debe ser coherente** (territorial debe tener padre nacional)

### Validaciones en Frontend:

```typescript
// Validar al menos una sede
if (asignaciones.length === 0) {
  return "Debe asignar al menos una sede al usuario";
}

// Validar sede principal
const tienePrincipal = asignaciones.some(a => a.esPrincipal);
if (!tienePrincipal) {
  return "Debe marcar una sede como principal";
}

// Validar principal única
const principalesCount = asignaciones.filter(a => a.esPrincipal).length;
if (principalesCount > 1) {
  return "Solo puede haber una sede principal";
}
```

---

## 📈 Estadísticas y Reportes

El módulo proporciona estadísticas detalladas:

```typescript
{
  // Por unidad
  totalUsuarios: 150,
  usuariosActivos: 145,
  usuariosPorRol: { "docente": 80, "admin": 5 },
  
  // Capacidad
  totalEstudiantes: 3500,
  capacidadEstudiantes: 5000,
  porcentajeOcupacion: 70,
  
  // Jerarquía
  totalSubordinados: 5,
  subordinadosPorNivel: { "regional": 3, "punto_atencion": 2 }
}
```

---

## 🚀 Ejemplos de Casos de Uso

### Caso 1: Docente en Múltiples Sedes

**Contexto:** Profesor que enseña en 3 ciudades diferentes

```typescript
{
  usuario: "Prof. María García",
  asignacionesSedes: [
    {
      unidadId: "DIR-BOG",
      ambitoAcceso: "local",
      esPrincipal: true,        // Bogotá es su sede base
      fechaInicio: "2024-01-01"
    },
    {
      unidadId: "CRE-MED",
      ambitoAcceso: "local",
      esPrincipal: false,
      fechaInicio: "2024-01-01",
      fechaFin: "2024-06-30",   // Solo primer semestre
      observaciones: "Clases de Liderazgo"
    },
    {
      unidadId: "DIR-VAL",
      ambitoAcceso: "local",
      esPrincipal: false,
      fechaInicio: "2024-07-01"  // Segundo semestre
    }
  ]
}
```

### Caso 2: Director Territorial

**Contexto:** Director que supervisa toda una territorial

```typescript
{
  usuario: "Dir. Carlos Ramírez",
  asignacionesSedes: [
    {
      unidadId: "DIR-ANT",
      ambitoAcceso: "territorial",  // Ve toda la territorial
      esPrincipal: true
    }
  ]
}
```

Con `ambitoAcceso: "territorial"`, puede ver:
- DIR-ANT (Dirección Territorial Antioquia)
- Todos los Centros Regionales de Antioquia
- Todos los Puntos de Atención subordinados

### Caso 3: Administrador Nacional

**Contexto:** Administrador con acceso total

```typescript
{
  usuario: "Admin. Ana López",
  asignacionesSedes: [
    {
      unidadId: "SEDE-NAL",
      ambitoAcceso: "nacional",  // Ve todo el país
      esPrincipal: true
    }
  ]
}
```

---

## 🛠️ Comandos de API

### Crear Usuario con Sedes

```javascript
POST /api/usuarios
{
  "username": "jperez",
  "email": "jperez@esap.edu.co",
  "firstName": "Juan",
  "lastName": "Pérez",
  // ... otros campos
  
  "asignacionesSedes": [
    {
      "unidadId": "DIR-BOG",
      "ambitoAcceso": "territorial",
      "esPrincipal": true
    }
  ],
  "sedePrincipalId": "DIR-BOG"
}
```

### Agregar Sede a Usuario Existente

```javascript
POST /api/estructura-organizacional/asignaciones
{
  "usuarioId": "user123",
  "unidadId": "CRE-MED",
  "ambitoAcceso": "local",
  "esPrincipal": false,
  "fechaInicio": "2024-12-01"
}
```

### Cambiar Sede Principal

```javascript
POST /api/estructura-organizacional/usuarios/user123/sede-principal
{
  "unidadId": "DIR-ANT"
}
```

---

## 🎨 Guía Visual de Estados

### Badges de Nivel:

- 🔵 **Nacional**: `bg-blue-100 text-blue-700`
- 🟢 **Territorial**: `bg-green-100 text-green-700`
- 🟣 **Regional**: `bg-purple-100 text-purple-700`
- 🟠 **Punto de Atención**: `bg-orange-100 text-orange-700`

### Íconos:

- ⭐ **Sede Principal**
- 🏢 **Sede Genérica**
- 📍 **Ubicación**
- 📅 **Fecha**
- ⚠️ **Observación**

---

## ✅ Checklist de Implementación

Al integrar Estructura Organizacional en un módulo nuevo:

- [ ] Importar tipos `AsignacionSede`
- [ ] Agregar selector de sede en filtros
- [ ] Mostrar badges de sedes en tablas/cards
- [ ] Validar al menos una sede en formularios
- [ ] Implementar filtro por sede en API calls
- [ ] Respetar `ambitoAcceso` del usuario
- [ ] Mostrar sede principal en perfiles
- [ ] Documentar endpoints API específicos

---

## 📞 Soporte

Para consultas sobre Estructura Organizacional:
- Ver documentación de API: `/docs/api/ENDPOINTS_ESTRUCTURA_ORGANIZACIONAL.md`
- Revisar tipos TypeScript: `/types/estructura-organizacional.types.ts`
- Ejemplos de uso: `/components/estructura-organizacional/`

---

**Última actualización**: 30 de Noviembre, 2024  
**Versión del módulo**: 1.0.0  
**Estado**: ✅ Implementado y listo para uso
