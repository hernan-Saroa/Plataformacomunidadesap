# DICCIONARIO DE DATOS - PLATAFORMA COMUNIDADES ESAP

## Documento Tecnico v1.0

**Fecha de Elaboracion:** Enero 2026
**Version:** 1.0
**Estado:** Vigente
**Tipo de Aplicacion:** React + TypeScript (Frontend SPA)

---

## Indice

1. [Resumen Ejecutivo](#1-resumen-ejecutivo)
2. [Entidades de Usuarios y Seguridad](#2-entidades-de-usuarios-y-seguridad)
3. [Entidades de Gestion Profesoral](#3-entidades-de-gestion-profesoral)
4. [Entidades de Plan de Trabajo Academico (PTA)](#4-entidades-de-plan-de-trabajo-academico-pta)
5. [Entidades de Certificados Laborales](#5-entidades-de-certificados-laborales)
6. [Entidades de Control Interno](#6-entidades-de-control-interno)
7. [Entidades de Estructura Organizacional](#7-entidades-de-estructura-organizacional)
8. [Entidades de Comunidad](#8-entidades-de-comunidad)
9. [Entidades Academicas](#9-entidades-academicas)
10. [Entidades de Graduados](#10-entidades-de-graduados)
11. [Entidades de Auditoria del Sistema](#11-entidades-de-auditoria-del-sistema)
12. [Estructuras de API](#12-estructuras-de-api)
13. [Diagrama de Relaciones](#13-diagrama-de-relaciones)
14. [Mapeo de Archivos por Modulo](#14-mapeo-de-archivos-por-modulo)
15. [Convenciones y Patrones](#15-convenciones-y-patrones)
16. [Glosario de Terminos](#16-glosario-de-terminos)

---

## 1. Resumen Ejecutivo

### 1.1 Proposito del Documento

Este diccionario de datos documenta todas las estructuras de datos, entidades, tipos e interfaces utilizadas en la Plataforma Comunidades ESAP. Sirve como referencia tecnica para:

- Desarrolladores que trabajan en el proyecto
- Arquitectos de software
- Analistas de datos
- Personal de QA/Testing
- Integracion con sistemas externos

### 1.2 Alcance

El documento cubre las siguientes areas funcionales:

| Modulo | Descripcion | Entidades Principales |
|--------|-------------|----------------------|
| **Usuarios y Seguridad** | Gestion de usuarios, roles y permisos | User, Role, Permission |
| **Gestion Profesoral** | Administracion de docentes y vinculaciones | Docente, ResolucionVinculacion |
| **Plan de Trabajo Academico** | Planificacion academica de docentes | PlanTrabajoAcademico, Componentes |
| **Certificados Laborales** | Emision y validacion de certificados | Certificado, Solicitud, Plantilla |
| **Control Interno** | Auditorias y planes de mejoramiento | Auditoria, Hallazgo, PlanMejoramiento |
| **Estructura Organizacional** | Jerarquia ESAP (Nacional/Territorial/CETAP) | UnidadOrganizacional |
| **Comunidad** | Red social institucional | Post, Evento, Anuncio |
| **Academico** | Periodos, asignaturas, calendario | PeriodoAcademico, EventoCalendario |
| **Graduados** | Titulos y certificaciones | GraduateTitle, VerificationCertificate |

### 1.3 Arquitectura de Datos

```
+----------------------------------+
|        CAPA DE PRESENTACION      |
|    (React Components + Hooks)    |
+----------------------------------+
              |
              v
+----------------------------------+
|        CAPA DE SERVICIOS         |
|   (Services API + Mock Data)     |
+----------------------------------+
              |
              v
+----------------------------------+
|         CAPA DE TIPOS            |
|  (TypeScript Interfaces/Types)   |
+----------------------------------+
              |
              v
+----------------------------------+
|          BACKEND API             |
|   (Endpoints REST - Externo)     |
+----------------------------------+
```

---

## 2. Entidades de Usuarios y Seguridad

### 2.1 User (Usuario)

**Ubicacion:** `/src/types/index.ts`
**Descripcion:** Entidad principal que representa a un usuario del sistema.

| Campo | Tipo | Requerido | Descripcion |
|-------|------|-----------|-------------|
| `id` | `string` | Si | Identificador unico UUID |
| `username` | `string` | Si | Nombre de usuario para login |
| `email` | `string` | Si | Correo electronico institucional |
| `firstName` | `string` | Si | Nombre(s) del usuario |
| `lastName` | `string` | Si | Apellido(s) del usuario |
| `fullName` | `string` | Si | Nombre completo concatenado |
| `documentType` | `DocumentType` | Si | Tipo de documento de identidad |
| `documentNumber` | `string` | Si | Numero de documento |
| `phone` | `string` | No | Telefono de contacto |
| `avatar` | `string` | No | URL de foto de perfil |
| `status` | `UserStatus` | Si | Estado del usuario en el sistema |
| `roles` | `Role[]` | Si | Array de roles asignados |
| `permissions` | `string[]` | Si | Codigos de permisos directos |
| `lastLogin` | `string` | No | Fecha/hora ultimo acceso (ISO 8601) |
| `loginCount` | `number` | Si | Contador de accesos |
| `asignacionesSedes` | `AsignacionSede[]` | Si | Asignaciones a sedes |
| `sedePrincipalId` | `string` | No | ID de sede principal |
| `asignacionesProgramas` | `AsignacionPrograma[]` | No | Asignaciones academicas |
| `createdAt` | `string` | Si | Fecha de creacion (ISO 8601) |
| `updatedAt` | `string` | Si | Fecha de actualizacion (ISO 8601) |

**Tipos Relacionados:**

```typescript
type DocumentType = 'CC' | 'TI' | 'CE' | 'PP' | 'NIT';

type UserStatus = 'active' | 'inactive' | 'pending' | 'blocked';
```

**Relaciones:**
- `hasMany` → `Role` (a traves de `roles[]`)
- `hasMany` → `AsignacionSede` (a traves de `asignacionesSedes[]`)
- `hasMany` → `AsignacionPrograma` (a traves de `asignacionesProgramas[]`)
- `hasMany` → `AuditLog` (registros de auditoria)

---

### 2.2 AsignacionSede (Asignacion a Sede)

**Ubicacion:** `/src/types/index.ts`
**Descripcion:** Vincula un usuario con una sede organizacional especifica.

| Campo | Tipo | Requerido | Descripcion |
|-------|------|-----------|-------------|
| `id` | `string` | Si | Identificador unico |
| `usuarioId` | `string` | Si | FK a User |
| `unidadId` | `string` | Si | ID de la unidad organizacional |
| `unidad` | `UnidadInfo` | No | Datos de la unidad (populate) |
| `rolId` | `string` | No | Rol especifico en esta sede |
| `rolNombre` | `string` | No | Nombre del rol |
| `ambitoAcceso` | `AmbitoAcceso` | Si | Nivel de acceso geografico |
| `esPrincipal` | `boolean` | Si | Indica si es sede principal |
| `estado` | `'activa' \| 'inactiva'` | Si | Estado de la asignacion |
| `fechaInicio` | `string` | Si | Fecha inicio vigencia |
| `fechaFin` | `string` | No | Fecha fin vigencia |
| `observaciones` | `string` | No | Notas adicionales |
| `createdAt` | `string` | Si | Fecha de creacion |
| `updatedAt` | `string` | Si | Fecha de actualizacion |

**Tipos Relacionados:**

```typescript
type AmbitoAcceso = 'nacional' | 'territorial' | 'regional' | 'local';

interface UnidadInfo {
  id: string;
  codigo: string;
  nombre: string;
  nivel: NivelUnidad;
  ciudad?: string;
  departamento?: string;
}
```

---

### 2.3 AsignacionPrograma (Asignacion a Programa Academico)

**Ubicacion:** `/src/types/index.ts`
**Descripcion:** Vincula un usuario con un programa academico.

| Campo | Tipo | Requerido | Descripcion |
|-------|------|-----------|-------------|
| `id` | `string` | Si | Identificador unico |
| `usuarioId` | `string` | Si | FK a User |
| `programaId` | `string` | Si | ID del programa academico |
| `programa` | `ProgramaInfo` | No | Datos del programa (populate) |
| `rolId` | `string` | No | Rol en el programa |
| `rolNombre` | `string` | No | Nombre del rol |
| `ambitoAcceso` | `AmbitoAcceso` | Si | Nivel de acceso |
| `esPrincipal` | `boolean` | Si | Si es programa principal |
| `estado` | `'activa' \| 'inactiva'` | Si | Estado |
| `fechaInicio` | `string` | Si | Fecha inicio |
| `fechaFin` | `string` | No | Fecha fin |
| `observaciones` | `string` | No | Notas |
| `createdAt` | `string` | Si | Fecha creacion |
| `updatedAt` | `string` | Si | Fecha actualizacion |

---

### 2.4 Role (Rol)

**Ubicacion:** `/src/types/index.ts`, `/src/types/roles-permissions.types.ts`
**Descripcion:** Define un rol de usuario con sus permisos asociados.

| Campo | Tipo | Requerido | Descripcion |
|-------|------|-----------|-------------|
| `id` | `string` | Si | Identificador unico |
| `code` | `string` | Si | Codigo unico (ej: `ROLE_ADMIN`) |
| `name` | `string` | Si | Nombre interno |
| `displayName` | `string` | Si | Nombre para mostrar en UI |
| `description` | `string` | No | Descripcion del rol |
| `type` | `'system' \| 'custom'` | Si | Tipo de rol |
| `category` | `PermissionCategory` | Si | Categoria principal |
| `isActive` | `boolean` | Si | Si esta activo |
| `isSystem` | `boolean` | Si | Si es rol del sistema |
| `color` | `string` | No | Color hex para UI |
| `icon` | `string` | No | Icono asociado |
| `permissions` | `string[]` | Si | IDs de permisos |
| `permissionCount` | `number` | No | Cantidad de permisos |
| `userCount` | `number` | Si | Usuarios con este rol |
| `createdAt` | `string` | Si | Fecha creacion |
| `updatedAt` | `string` | Si | Fecha actualizacion |

**Tipos de Rol del Sistema:**

```typescript
type RoleType =
  | 'Aspirante'
  | 'Estudiante'
  | 'Docente'
  | 'Administrativo'
  | 'Graduado'
  | 'Super Admin'
  | 'Custom';
```

---

### 2.5 Permission (Permiso)

**Ubicacion:** `/src/types/index.ts`, `/src/types/roles-permissions.types.ts`
**Descripcion:** Define un permiso granular del sistema.

| Campo | Tipo | Requerido | Descripcion |
|-------|------|-----------|-------------|
| `id` | `string` | Si | Identificador unico |
| `code` | `string` | Si | Codigo unico (ej: `users.create`) |
| `name` | `string` | Si | Nombre del permiso |
| `description` | `string` | No | Descripcion |
| `category` | `PermissionCategory` | Si | Categoria |
| `module` | `string` | Si | Modulo al que pertenece |
| `level` | `PermissionLevel` | Si | Nivel de accion |
| `isActive` | `boolean` | Si | Si esta activo |
| `isCustom` | `boolean` | Si | Si es personalizado |
| `requiresTwoFactor` | `boolean` | No | Si requiere 2FA |
| `isSystem` | `boolean` | Si | Si es del sistema |
| `isCritical` | `boolean` | Si | Si es critico |
| `createdAt` | `string` | Si | Fecha creacion |

**Tipos Relacionados:**

```typescript
type PermissionCategory =
  | 'users_management'
  | 'students_management'
  | 'teachers_management'
  | 'certificates'
  | 'enrollment'
  | 'community'
  | 'reports'
  | 'audit'
  | 'control_interno'
  | 'gestion_profesoral'
  | 'pta'
  | 'academic';

type PermissionLevel =
  | 'create'
  | 'read'
  | 'update'
  | 'delete'
  | 'execute'
  | 'approve'
  | 'export'
  | 'import';
```

---

### 2.6 AuthUser (Usuario Autenticado)

**Ubicacion:** `/src/types/index.ts`
**Descripcion:** Informacion del usuario en sesion activa.

| Campo | Tipo | Requerido | Descripcion |
|-------|------|-----------|-------------|
| `id` | `string` | Si | ID del usuario |
| `email` | `string` | Si | Email |
| `firstName` | `string` | Si | Nombre |
| `lastName` | `string` | Si | Apellido |
| `fullName` | `string` | Si | Nombre completo |
| `avatar` | `string` | No | URL foto |
| `roles` | `string[]` | Si | Codigos de roles |
| `permissions` | `string[]` | Si | Codigos de permisos |
| `isActive` | `boolean` | Si | Si esta activo |
| `lastLogin` | `string` | No | Ultimo login |

---

## 3. Entidades de Gestion Profesoral

### 3.1 Docente (Informacion del Docente)

**Ubicacion:** `/src/types/gestion-profesoral.ts`
**Descripcion:** Informacion completa de un docente de la ESAP.

| Campo | Tipo | Requerido | Descripcion |
|-------|------|-----------|-------------|
| `id` | `number` | Si | Identificador unico |
| `hoja_vida_id` | `number` | Si | FK a HojaVida |
| `codigo_docente` | `string` | Si | Codigo unico del docente |
| `numero_documento` | `string` | Si | Cedula de ciudadania |
| `nombres` | `string` | Si | Nombres del docente |
| `apellidos` | `string` | Si | Apellidos del docente |
| `email_institucional` | `string` | Si | Email @esap.edu.co |
| `tipo_vinculacion_actual` | `TipoVinculacion` | Si | Tipo de vinculacion vigente |
| `estado` | `EstadoDocente` | Si | Estado actual |
| `fecha_primera_vinculacion` | `string` | Si | Fecha primera vinculacion |
| `created_at` | `string` | Si | Fecha de creacion |

**Tipos Relacionados:**

```typescript
type TipoVinculacion =
  | 'CARRERA'        // Docente de carrera Nivel 1 o 2
  | 'OCASIONAL'      // Vinculacion hasta 1 año
  | 'PERIODO_PRUEBA' // Periodo de prueba 6 meses
  | 'HORA_CATEDRA'   // Contratacion por periodo
  | 'VISITANTE';     // Docente visitante

type EstadoDocente =
  | 'ACTIVO'
  | 'INACTIVO'
  | 'SUSPENDIDO'
  | 'RETIRADO';
```

---

### 3.2 DocentePTA (Docente para PTA)

**Ubicacion:** `/src/types/integracion-personas-pta.ts`
**Descripcion:** Vista de docente optimizada para el modulo PTA.

| Campo | Tipo | Requerido | Descripcion |
|-------|------|-----------|-------------|
| `personId` | `string` | Si | ID en modulo Personas |
| `userId` | `string` | Si | ID del usuario |
| `documentNumber` | `string` | Si | Cedula |
| `documentType` | `string` | Si | Tipo documento |
| `nombreCompleto` | `string` | Si | Nombre completo |
| `email` | `string` | Si | Email institucional |
| `telefono` | `string` | No | Telefono |
| `perfilAcademico` | `PerfilAcademico` | Si | Maximo nivel academico |
| `categoria` | `CategoriaEscalafon` | Si | Categoria en escalafon |
| `sedeVinculacion` | `string` | Si | Sede principal |
| `codigoSede` | `string` | Si | Codigo de sede |
| `tipoVinculacion` | `TipoVinculacionPTA` | Si | Tipo vinculacion |
| `tipoDedicacion` | `'TC' \| 'MT'` | Si | Dedicacion (TC/MT) |
| `nucleoTematico` | `string` | Si | Nucleo tematico |
| `horasProgramables` | `number` | Si | Horas segun vinculacion |
| `estado` | `EstadoDocentePTA` | Si | Estado actual |
| `sedes` | `SedeDocente[]` | Si | Sedes asignadas |

**Tipos Relacionados:**

```typescript
type PerfilAcademico = 'Especializacion' | 'Maestria' | 'Doctorado';

type CategoriaEscalafon = 'Auxiliar' | 'Asistente' | 'Asociado' | 'Titular';

type TipoVinculacionPTA =
  | 'Carrera1'
  | 'Carrera2'
  | 'Periodo Prueba'
  | 'Ocasional'
  | 'Visitante'
  | 'Especial';

type EstadoDocentePTA = 'activo' | 'inactivo' | 'licencia' | 'comision';
```

---

### 3.3 ResolucionVinculacion (Resolucion de Vinculacion)

**Ubicacion:** `/src/types/gestion-profesoral.ts`
**Descripcion:** Acto administrativo de vinculacion de docente.

| Campo | Tipo | Requerido | Descripcion |
|-------|------|-----------|-------------|
| `id` | `number` | Si | Identificador unico |
| `numero_resolucion` | `string` | Si | Numero de resolucion |
| `fecha_resolucion` | `string` | Si | Fecha de expedicion |
| `docente_id` | `number` | Si | FK a Docente |
| `tipo_vinculacion` | `TipoVinculacion` | Si | Tipo de vinculacion |
| `dedicacion` | `'TC' \| 'MT'` | Si | Tiempo completo o medio |
| `fecha_inicio` | `string` | Si | Fecha inicio vigencia |
| `fecha_fin` | `string` | No | Fecha fin vigencia |
| `horas_base` | `number` | Si | Horas base semanales |
| `salario_base` | `number` | Si | Salario base mensual |
| `territorial_id` | `number` | Si | FK a Territorial |
| `estado` | `EstadoResolucion` | Si | Estado de la resolucion |
| `requiere_pta` | `boolean` | Si | Si requiere PTA (calculado) |
| `observaciones` | `string` | No | Notas adicionales |
| `created_at` | `string` | Si | Fecha de creacion |

**Tipos Relacionados:**

```typescript
type EstadoResolucion = 'VIGENTE' | 'VENCIDA' | 'ANULADA';
```

---

## 4. Entidades de Plan de Trabajo Academico (PTA)

### 4.1 PlanTrabajoAcademico (PTA)

**Ubicacion:** `/src/types/gestion-profesoral.ts`, `/src/types/pta.types.ts`
**Descripcion:** Plan de trabajo academico semestral de un docente.

| Campo | Tipo | Requerido | Descripcion |
|-------|------|-----------|-------------|
| `id` | `string \| number` | Si | Identificador unico |
| `codigo` | `string` | Si | Codigo del PTA |
| `version` | `number` | Si | Version del documento |
| `docente_id` | `number` | Si | FK a Docente |
| `docenteId` | `string` | Si | ID docente (string) |
| `periodoId` | `string` | Si | ID del periodo |
| `periodoNombre` | `string` | Si | Nombre del periodo |
| `estado` | `EstadoPTA` | Si | Estado actual |
| `nivelAprobacionActual` | `NivelAprobacion` | No | Nivel de aprobacion actual |
| `historialAprobaciones` | `DecisionAprobacion[]` | Si | Historial de decisiones |
| `componenteDocencia` | `ComponenteDocencia` | Si | Componente de docencia |
| `componenteInvestigacion` | `ComponenteInvestigacion` | Si | Componente investigacion |
| `componenteExtension` | `ComponenteExtension` | Si | Componente extension |
| `componenteComplementarias` | `ComponenteComplementarias` | Si | Actividades complementarias |
| `componenteAdministrativas` | `ComponenteAdministrativas` | Si | Actividades administrativas |
| `totalHorasAsignadas` | `number` | Si | Total horas asignadas |
| `distribucionValida` | `boolean` | Si | Si distribucion es valida |
| `fechaCreacion` | `string` | Si | Fecha de creacion |
| `fechaUltimaModificacion` | `string` | Si | Ultima modificacion |
| `fechaEnvioAprobacion` | `string` | No | Fecha de envio |
| `fechaAprobacionFinal` | `string` | No | Fecha aprobacion final |
| `fechaEnFirme` | `string` | No | Fecha en firme |
| `observacionesDocente` | `string` | No | Observaciones del docente |
| `observacionesAprobadores` | `string[]` | No | Observaciones de aprobadores |
| `evidencias` | `EvidenciaPTA[]` | No | Evidencias (solo EN_FIRME) |
| `cumplimientoGlobal` | `number` | No | Porcentaje cumplimiento |

**Tipos Relacionados:**

```typescript
type EstadoPTA =
  | 'EN_CONSTRUCCION'
  | 'EN_APROBACION'
  | 'DEVUELTO_AJUSTES'
  | 'APROBADO'
  | 'EN_FIRME';

type NivelAprobacion =
  | 'coordinador-nucleo'
  | 'director-territorial'
  | 'subdirector-academico';
```

---

### 4.2 ComponenteDocencia

**Ubicacion:** `/src/types/pta.types.ts`
**Descripcion:** Componente de actividades de docencia del PTA.

| Campo | Tipo | Requerido | Descripcion |
|-------|------|-----------|-------------|
| `horas` | `number` | Si | Total horas del componente |
| `porcentaje` | `number` | Si | Porcentaje del total |
| `actividades` | `ActividadDocencia[]` | Si | Lista de actividades |

**ActividadDocencia:**

| Campo | Tipo | Requerido | Descripcion |
|-------|------|-----------|-------------|
| `id` | `string` | Si | Identificador unico |
| `territorial` | `string` | Si | Territorial asignada |
| `cetap` | `string` | No | CETAP especifico |
| `programaAcademico` | `TipoPrograma` | Si | Codigo del programa |
| `codigoAsignatura` | `string` | Si | Codigo de asignatura |
| `nombreAsignatura` | `string` | Si | Nombre de asignatura |
| `nucleoTematico` | `string` | Si | Nucleo tematico |
| `ubicacionSemestral` | `number` | Si | Semestre (1-10) |
| `modalidad` | `Modalidad` | Si | Modalidad de clase |
| `totalEstudiantes` | `number` | Si | Numero de estudiantes |
| `numeroCreditos` | `number` | Si | Creditos academicos |
| `horasBase` | `number` | Si | Horas base |
| `horasPTA` | `number` | Si | Horas PTA (horasBase x 3) |
| `fechaInicio` | `string` | Si | Fecha inicio |
| `fechaTerminacion` | `string` | Si | Fecha fin |
| `porcentajePTA` | `number` | Si | Porcentaje del PTA |
| `aprobadoPorProgramacion` | `boolean` | Si | Aprobacion programacion |
| `aprobadoPorDirector` | `boolean` | Si | Aprobacion director |
| `aprobadoPorDocente` | `boolean` | Si | Aprobacion docente |
| `observaciones` | `string` | No | Notas |

**Tipos Relacionados:**

```typescript
type TipoPrograma = 'AP' | 'EP' | 'APT' | 'ESP' | 'MAE' | 'DOC';

type Modalidad = 'Presencial' | 'Virtual' | 'Hibrida';
```

---

### 4.3 ComponenteInvestigacion

**Ubicacion:** `/src/types/pta.types.ts`
**Descripcion:** Componente de actividades de investigacion del PTA.

| Campo | Tipo | Requerido | Descripcion |
|-------|------|-----------|-------------|
| `horas` | `number` | Si | Total horas |
| `porcentaje` | `number` | Si | Porcentaje del total |
| `actividades` | `ActividadInvestigacion[]` | Si | Lista de actividades |

**ActividadProyectoInvestigacion:**

| Campo | Tipo | Requerido | Descripcion |
|-------|------|-----------|-------------|
| `tipo` | `'proyecto'` | Si | Tipo de actividad |
| `id` | `string` | Si | Identificador unico |
| `idProyecto` | `string` | Si | ID del proyecto |
| `nombreProyecto` | `string` | Si | Nombre del proyecto |
| `grupoInvestigacion` | `string` | Si | Grupo de investigacion |
| `lineaInvestigacion` | `string` | Si | Linea de investigacion |
| `rol` | `RolInvestigacion` | Si | Rol en el proyecto |
| `horasDescarga` | `number` | Si | Horas de descarga |
| `recibeEstimuloEconomico` | `boolean` | Si | Si recibe estimulo |
| `productos` | `ProductoInvestigacion[]` | Si | Productos generados |
| `funciones` | `string` | Si | Funciones asignadas |
| `compromisos` | `string` | Si | Compromisos |
| `actoAdministrativo` | `string` | Si | Acto administrativo |
| `fechaInicio` | `string` | Si | Fecha inicio |
| `fechaTerminacion` | `string` | Si | Fecha fin |
| `porcentajePTA` | `number` | Si | Porcentaje |
| `aprobadoPorSNI` | `boolean` | Si | Aprobacion SNI |
| `observaciones` | `string` | No | Notas |

**Tipos Relacionados:**

```typescript
type RolInvestigacion =
  | 'Investigador Lider'    // Max 400 horas
  | 'Coinvestigador'        // Max 300 horas
  | 'Asistente Nivel II';   // Max 200 horas
```

---

### 4.4 ComponenteExtension

**Ubicacion:** `/src/types/pta.types.ts`
**Descripcion:** Componente de actividades de extension academica.

| Campo | Tipo | Requerido | Descripcion |
|-------|------|-----------|-------------|
| `horas` | `number` | Si | Total horas |
| `porcentaje` | `number` | Si | Porcentaje del total |
| `actividades` | `ActividadExtension[]` | Si | Lista de actividades |

**ActividadExtension:**

| Campo | Tipo | Requerido | Descripcion |
|-------|------|-----------|-------------|
| `id` | `string` | Si | Identificador unico |
| `sedeTerriroral` | `string` | Si | Sede territorial |
| `subdireccion` | `Subdireccion` | Si | Subdireccion responsable |
| `actividadEspecifica` | `string` | Si | Actividad especifica |
| `municipioEntidad` | `string` | No | Municipio/Entidad |
| `compromisos` | `string` | Si | Compromisos |
| `evidencias` | `string` | Si | Evidencias esperadas |
| `fechaInicio` | `string` | Si | Fecha inicio |
| `fechaTerminacion` | `string` | Si | Fecha fin |
| `horasAsignadas` | `number` | Si | Horas asignadas |
| `porcentajePTA` | `number` | Si | Porcentaje |
| `aprobadoPorSubdireccion` | `boolean` | Si | Aprobacion subdireccion |
| `observaciones` | `string` | No | Notas |

**Tipos Relacionados:**

```typescript
type Subdireccion =
  | 'Capacitacion'
  | 'Procesos Seleccion'
  | 'DFAGE'
  | 'Alto Gobierno';
```

---

### 4.5 ComponenteComplementarias

**Ubicacion:** `/src/types/pta.types.ts`
**Descripcion:** Actividades complementarias del docente.

| Campo | Tipo | Requerido | Descripcion |
|-------|------|-----------|-------------|
| `horas` | `number` | Si | Total horas |
| `porcentaje` | `number` | Si | Porcentaje del total |
| `actividades` | `ActividadComplementaria[]` | Si | Lista de actividades |

**ActividadComplementaria:**

| Campo | Tipo | Requerido | Descripcion |
|-------|------|-----------|-------------|
| `id` | `string` | Si | Identificador unico |
| `sedeTerriroral` | `string` | Si | Sede territorial |
| `numeroActividad` | `number` | Si | Numero 1-24 del catalogo |
| `nombreActividad` | `string` | Si | Nombre de actividad |
| `descripcion` | `string` | Si | Descripcion detallada |
| `evidencias` | `string` | Si | Evidencias esperadas |
| `fechaInicio` | `string` | Si | Fecha inicio |
| `fechaTerminacion` | `string` | Si | Fecha fin |
| `horasAsignadas` | `number` | Si | Horas asignadas |
| `porcentajePTA` | `number` | Si | Porcentaje |
| `observaciones` | `string` | No | Notas |
| `responsableProgramacion` | `string` | Si | Responsable |
| `directorTerritorial` | `string` | Si | Director territorial |

---

## 5. Entidades de Certificados Laborales

### 5.1 SolicitudCertificado

**Ubicacion:** `/src/types/certificados.ts`
**Descripcion:** Solicitud de certificado laboral.

| Campo | Tipo | Requerido | Descripcion |
|-------|------|-----------|-------------|
| `id` | `string` | Si | Identificador unico |
| `codigo` | `string` | Si | Codigo de solicitud |
| `empleadoId` | `string` | Si | FK a Empleado |
| `empleadoNombre` | `string` | Si | Nombre del empleado |
| `empleadoDocumento` | `string` | Si | Documento del empleado |
| `empleadoCargo` | `string` | Si | Cargo del empleado |
| `empleadoDependencia` | `string` | Si | Dependencia |
| `tipoSolicitud` | `TipoCertificado` | Si | Tipo de certificado |
| `motivo` | `string` | No | Motivo de solicitud |
| `entidadDestino` | `string` | No | Entidad destino |
| `observaciones` | `string` | No | Observaciones |
| `estado` | `EstadoSolicitud` | Si | Estado de la solicitud |
| `fechaSolicitud` | `string` | Si | Fecha de solicitud |
| `fechaRevision` | `string` | No | Fecha de revision |
| `fechaAprobacion` | `string` | No | Fecha de aprobacion |
| `revisadoPor` | `string` | No | ID del revisor |
| `aprobadoPor` | `string` | No | ID del aprobador |
| `motivoRechazo` | `string` | No | Razon del rechazo |
| `prioridad` | `Prioridad` | Si | Nivel de prioridad |
| `certificadoId` | `string` | No | FK a Certificado generado |
| `diasPendientes` | `number` | Si | Dias en estado actual |
| `createdAt` | `string` | Si | Fecha de creacion |
| `updatedAt` | `string` | Si | Fecha de actualizacion |

**Tipos Relacionados:**

```typescript
type TipoCertificado =
  | 'laboral'
  | 'salario'
  | 'tiempo_servicio'
  | 'prestaciones';

type EstadoSolicitud =
  | 'pendiente'
  | 'en_revision'
  | 'aprobada'
  | 'rechazada'
  | 'cancelada'
  | 'procesada';

type Prioridad = 'normal' | 'alta' | 'urgente';
```

---

### 5.2 Certificado (Certificado Laboral)

**Ubicacion:** `/src/types/certificados.ts`
**Descripcion:** Certificado laboral generado.

| Campo | Tipo | Requerido | Descripcion |
|-------|------|-----------|-------------|
| `id` | `string` | Si | Identificador unico |
| `codigo` | `string` | Si | Codigo unico del certificado |
| `codigoVerificacion` | `string` | Si | Codigo de verificacion |
| `solicitudId` | `string` | No | FK a Solicitud |
| `empleadoId` | `string` | Si | FK a Empleado |
| `empleadoNombre` | `string` | Si | Nombre |
| `empleadoDocumentoTipo` | `string` | Si | Tipo de documento |
| `empleadoDocumentoNumero` | `string` | Si | Numero de documento |
| `empleadoCargo` | `string` | Si | Cargo |
| `empleadoDependencia` | `string` | Si | Dependencia |
| `empleadoFechaIngreso` | `string` | Si | Fecha de ingreso |
| `empleadoFechaRetiro` | `string` | No | Fecha de retiro |
| `empleadoSalario` | `number` | No | Salario (si aplica) |
| `empleadoTipoContrato` | `string` | Si | Tipo de contrato |
| `tipoCertificado` | `TipoCertificado` | Si | Tipo de certificado |
| `plantillaId` | `string` | Si | FK a Plantilla |
| `plantillaNombre` | `string` | Si | Nombre de plantilla |
| `contenido` | `string` | Si | Contenido HTML |
| `entidadDestino` | `string` | No | Entidad destino |
| `fechaEmision` | `string` | Si | Fecha de emision |
| `fechaVencimiento` | `string` | No | Fecha de vencimiento |
| `vigente` | `boolean` | Si | Si esta vigente |
| `estado` | `EstadoCertificado` | Si | Estado |
| `motivoAnulacion` | `string` | No | Razon de anulacion |
| `firmantes` | `Firmante[]` | Si | Personas que firman |
| `qrCode` | `string` | Si | Codigo QR en base64 |
| `urlPublica` | `string` | Si | URL publica verificacion |
| `archivoUrl` | `string` | Si | URL del PDF |
| `validacionesCount` | `number` | Si | Numero de validaciones |
| `generadoPor` | `string` | Si | FK a User |
| `anuladoPor` | `string` | No | FK a User |
| `fechaAnulacion` | `string` | No | Fecha de anulacion |
| `createdAt` | `string` | Si | Fecha de creacion |
| `updatedAt` | `string` | Si | Fecha de actualizacion |

**Tipos Relacionados:**

```typescript
type EstadoCertificado = 'activo' | 'anulado' | 'vencido';
```

---

### 5.3 Firmante

**Ubicacion:** `/src/types/certificados.ts`
**Descripcion:** Persona autorizada para firmar certificados.

| Campo | Tipo | Requerido | Descripcion |
|-------|------|-----------|-------------|
| `id` | `string` | Si | Identificador unico |
| `nombre` | `string` | Si | Nombre del firmante |
| `cargo` | `string` | Si | Cargo |
| `dependencia` | `string` | Si | Dependencia |
| `tipoFirma` | `TipoFirma` | Si | Tipo de firma |
| `firmaUrl` | `string` | No | URL imagen de firma |
| `selloUrl` | `string` | No | URL imagen de sello |
| `orden` | `number` | Si | Orden de firma |
| `activo` | `boolean` | Si | Si esta activo |

**Tipos Relacionados:**

```typescript
type TipoFirma = 'fisica' | 'digital' | 'mecanica';
```

---

### 5.4 PlantillaCertificado

**Ubicacion:** `/src/types/certificados.ts`
**Descripcion:** Plantilla para generacion de certificados.

| Campo | Tipo | Requerido | Descripcion |
|-------|------|-----------|-------------|
| `id` | `string` | Si | Identificador unico |
| `codigo` | `string` | Si | Codigo de plantilla |
| `nombre` | `string` | Si | Nombre |
| `descripcion` | `string` | No | Descripcion |
| `tipo` | `TipoPlantilla` | Si | Tipo de plantilla |
| `contenidoHTML` | `string` | Si | Contenido HTML |
| `variables` | `VariablePlantilla[]` | Si | Variables dinamicas |
| `estilos` | `string` | Si | CSS estilos |
| `encabezado` | `string` | No | HTML encabezado |
| `piePagina` | `string` | No | HTML pie de pagina |
| `marcaAgua` | `string` | No | URL marca de agua |
| `logoUrl` | `string` | No | URL del logo |
| `tamanoPagina` | `TamanoPagina` | Si | Tamano de pagina |
| `orientacion` | `Orientacion` | Si | Orientacion |
| `margenes` | `Margenes` | Si | Margenes en mm |
| `firmantes` | `string[]` | Si | IDs de firmantes |
| `requiereAprobacion` | `boolean` | Si | Si requiere aprobacion |
| `validezDias` | `number` | No | Dias de validez |
| `activa` | `boolean` | Si | Si esta activa |
| `version` | `string` | Si | Version |
| `createdBy` | `string` | Si | Creado por |
| `createdAt` | `string` | Si | Fecha creacion |
| `updatedAt` | `string` | Si | Fecha actualizacion |

**Tipos Relacionados:**

```typescript
type TipoPlantilla =
  | 'laboral'
  | 'salario'
  | 'tiempo_servicio'
  | 'prestaciones'
  | 'personalizada';

type TamanoPagina = 'carta' | 'oficio' | 'a4';

type Orientacion = 'vertical' | 'horizontal';

interface Margenes {
  superior: number;
  inferior: number;
  izquierdo: number;
  derecho: number;
}
```

---

### 5.5 ValidacionCertificado

**Ubicacion:** `/src/types/certificados.ts`
**Descripcion:** Registro de validacion de un certificado.

| Campo | Tipo | Requerido | Descripcion |
|-------|------|-----------|-------------|
| `id` | `string` | Si | Identificador unico |
| `certificadoId` | `string` | Si | FK a Certificado |
| `certificadoCodigo` | `string` | Si | Codigo del certificado |
| `metodoValidacion` | `MetodoValidacion` | Si | Metodo usado |
| `resultado` | `ResultadoValidacion` | Si | Resultado |
| `mensaje` | `string` | Si | Mensaje de resultado |
| `certificadoData` | `CertificadoResumen` | No | Datos del certificado |
| `validadoPor` | `string` | No | FK a User |
| `ipAddress` | `string` | No | Direccion IP |
| `userAgent` | `string` | No | User agent |
| `ubicacion` | `Ubicacion` | No | Ubicacion geografica |
| `fechaValidacion` | `string` | Si | Fecha de validacion |
| `duracionMs` | `number` | Si | Duracion en ms |

**Tipos Relacionados:**

```typescript
type MetodoValidacion = 'codigo' | 'qr' | 'url';

type ResultadoValidacion = 'valido' | 'invalido' | 'vencido' | 'anulado';
```

---

## 6. Entidades de Control Interno

### 6.1 Auditoria

**Ubicacion:** `/src/types/control-interno.ts`
**Descripcion:** Auditoria de control interno.

| Campo | Tipo | Requerido | Descripcion |
|-------|------|-----------|-------------|
| `id` | `string` | Si | Identificador unico |
| `codigo` | `string` | Si | Codigo de auditoria |
| `nombre` | `string` | Si | Nombre de la auditoria |
| `tipo` | `TipoAuditoria` | Si | Tipo de auditoria |
| `estado` | `EstadoAuditoria` | Si | Estado actual |
| `procesoAuditado` | `string` | Si | Proceso auditado |
| `alcance` | `string` | Si | Alcance de la auditoria |
| `objetivo` | `string` | Si | Objetivo |
| `auditorLider` | `string` | Si | Auditor lider |
| `equipoAuditor` | `string[]` | Si | Equipo auditor |
| `areaAuditada` | `string` | Si | Area auditada |
| `fechaInicio` | `string` | Si | Fecha inicio |
| `fechaFin` | `string` | No | Fecha fin |
| `fechaLimite` | `string` | Si | Fecha limite |
| `progreso` | `number` | Si | Porcentaje de progreso |
| `metodologia` | `Metodologia` | Si | Metodologia utilizada |
| `riesgoInherente` | `NivelRiesgo` | Si | Nivel de riesgo inherente |
| `prioridad` | `PrioridadAuditoria` | Si | Prioridad |
| `hallazgosCount` | `number` | Si | Numero de hallazgos |
| `evidenciasCount` | `number` | Si | Numero de evidencias |
| `createdAt` | `string` | Si | Fecha de creacion |
| `updatedAt` | `string` | Si | Fecha de actualizacion |

**Tipos Relacionados:**

```typescript
type TipoAuditoria =
  | 'gestion'
  | 'cumplimiento'
  | 'financiera'
  | 'tic'
  | 'desempeno';

type EstadoAuditoria =
  | 'planeacion'
  | 'ejecucion'
  | 'informe'
  | 'seguimiento'
  | 'cerrada';

type Metodologia = 'DAFP' | 'P-E-C' | 'Decreto_648' | 'Otra';

type NivelRiesgo = 'alto' | 'medio' | 'bajo';

type PrioridadAuditoria = 'alta' | 'media' | 'baja';
```

---

### 6.2 Hallazgo

**Ubicacion:** `/src/types/control-interno.ts`
**Descripcion:** Hallazgo detectado en una auditoria.

| Campo | Tipo | Requerido | Descripcion |
|-------|------|-----------|-------------|
| `id` | `string` | Si | Identificador unico |
| `codigo` | `string` | Si | Codigo del hallazgo |
| `auditoriaId` | `string` | Si | FK a Auditoria |
| `auditoriaCodigo` | `string` | Si | Codigo de auditoria |
| `auditoriaNombre` | `string` | Si | Nombre de auditoria |
| `titulo` | `string` | Si | Titulo del hallazgo |
| `tipo` | `TipoHallazgo` | Si | Tipo de hallazgo |
| `clasificacion` | `ClasificacionHallazgo` | Si | Clasificacion |
| `estado` | `EstadoHallazgo` | Si | Estado actual |
| `criticidad` | `Criticidad` | Si | Nivel de criticidad |
| `procesoAfectado` | `string` | Si | Proceso afectado |
| `areaResponsable` | `string` | Si | Area responsable |
| `responsable` | `string` | Si | Responsable directo |
| `descripcion` | `string` | Si | Descripcion detallada |
| `causaRaiz` | `string` | No | Causa raiz identificada |
| `impacto` | `string` | No | Impacto del hallazgo |
| `normativaIncumplida` | `string[]` | No | Normativa incumplida |
| `fechaDeteccion` | `string` | Si | Fecha de deteccion |
| `fechaLimiteRespuesta` | `string` | No | Fecha limite respuesta |
| `plazoImplementacion` | `number` | No | Plazo en dias |
| `evidenciasCount` | `number` | Si | Numero de evidencias |
| `comentariosCount` | `number` | Si | Numero de comentarios |
| `planMejoramientoId` | `string` | No | FK a PlanMejoramiento |
| `createdAt` | `string` | Si | Fecha de creacion |
| `updatedAt` | `string` | Si | Fecha de actualizacion |

**Tipos Relacionados:**

```typescript
type TipoHallazgo =
  | 'no_conformidad_mayor'
  | 'no_conformidad_menor'
  | 'observacion'
  | 'oportunidad_mejora';

type ClasificacionHallazgo =
  | 'administrativo'
  | 'operativo'
  | 'financiero'
  | 'tecnologico'
  | 'legal';

type EstadoHallazgo =
  | 'abierto'
  | 'en_plan_mejoramiento'
  | 'en_seguimiento'
  | 'cerrado';

type Criticidad = 'critica' | 'alta' | 'media' | 'baja';
```

---

### 6.3 PlanMejoramiento

**Ubicacion:** `/src/types/control-interno.ts`
**Descripcion:** Plan de mejoramiento para un hallazgo.

| Campo | Tipo | Requerido | Descripcion |
|-------|------|-----------|-------------|
| `id` | `string` | Si | Identificador unico |
| `codigo` | `string` | Si | Codigo del plan |
| `hallazgoId` | `string` | Si | FK a Hallazgo |
| `hallazgoCodigo` | `string` | Si | Codigo del hallazgo |
| `auditoriaId` | `string` | Si | FK a Auditoria |
| `titulo` | `string` | Si | Titulo del plan |
| `descripcion` | `string` | Si | Descripcion |
| `objetivos` | `string[]` | Si | Objetivos del plan |
| `areaResponsable` | `string` | Si | Area responsable |
| `responsableImplementacion` | `string` | Si | Responsable implementacion |
| `estado` | `EstadoPlanMejoramiento` | Si | Estado actual |
| `fechaCreacion` | `string` | Si | Fecha de creacion |
| `fechaAprobacion` | `string` | No | Fecha de aprobacion |
| `fechaInicioEjecucion` | `string` | No | Fecha inicio ejecucion |
| `fechaLimite` | `string` | Si | Fecha limite |
| `fechaCierre` | `string` | No | Fecha de cierre |
| `acciones` | `AccionMejora[]` | Si | Acciones correctivas |
| `recursos` | `RecursoNecesario[]` | Si | Recursos necesarios |
| `indicadores` | `IndicadorSeguimiento[]` | Si | Indicadores |
| `avanceGlobal` | `number` | Si | Porcentaje avance |
| `aprobadoPor` | `string` | No | Aprobado por |
| `observaciones` | `string` | No | Observaciones |
| `createdAt` | `string` | Si | Fecha de creacion |
| `updatedAt` | `string` | Si | Fecha de actualizacion |

**Tipos Relacionados:**

```typescript
type EstadoPlanMejoramiento =
  | 'borrador'
  | 'revision'
  | 'aprobado'
  | 'en_ejecucion'
  | 'completado'
  | 'vencido';
```

**AccionMejora:**

| Campo | Tipo | Requerido | Descripcion |
|-------|------|-----------|-------------|
| `id` | `string` | Si | Identificador unico |
| `numero` | `number` | Si | Numero secuencial |
| `descripcion` | `string` | Si | Descripcion |
| `tipo` | `TipoAccion` | Si | Tipo de accion |
| `responsable` | `string` | Si | Responsable |
| `fechaInicio` | `string` | Si | Fecha inicio |
| `fechaFin` | `string` | Si | Fecha fin |
| `estado` | `EstadoAccion` | Si | Estado |
| `avance` | `number` | Si | Porcentaje avance |
| `evidencias` | `Evidencia[]` | Si | Evidencias |
| `observaciones` | `string` | No | Notas |

```typescript
type TipoAccion = 'correctiva' | 'preventiva' | 'mejora';

type EstadoAccion = 'pendiente' | 'en_progreso' | 'completada' | 'vencida';
```

---

## 7. Entidades de Estructura Organizacional

### 7.1 UnidadOrganizacional

**Ubicacion:** `/src/types/estructura-organizacional.types.ts`
**Descripcion:** Unidad en la estructura jerarquica de la ESAP.

| Campo | Tipo | Requerido | Descripcion |
|-------|------|-----------|-------------|
| `id` | `string` | Si | Identificador unico |
| `codigo` | `string` | Si | Codigo unico (ej: ESAP-NAL) |
| `nombre` | `string` | Si | Nombre oficial |
| `nombreCorto` | `string` | No | Nombre abreviado |
| `nivel` | `NivelUnidad` | Si | Nivel jerarquico |
| `padreId` | `string \| null` | Si | ID unidad padre |
| `ruta` | `string[]` | Si | Array de IDs desde Nacional |
| `rutaNombres` | `string[]` | Si | Array de nombres de ruta |
| `departamento` | `string` | No | Departamento geografico |
| `ciudad` | `string` | No | Ciudad |
| `direccion` | `string` | No | Direccion fisica |
| `telefono` | `string` | No | Telefono |
| `email` | `string` | No | Email institucional |
| `capacidadEstudiantes` | `number` | No | Capacidad de estudiantes |
| `capacidadDocentes` | `number` | No | Capacidad de docentes |
| `estado` | `EstadoUnidad` | Si | Estado de la unidad |
| `fechaApertura` | `string` | No | Fecha de apertura |
| `fechaCierre` | `string` | No | Fecha de cierre |
| `permiteInscripciones` | `boolean` | Si | Si permite inscripciones |
| `permiteMatriculas` | `boolean` | Si | Si permite matriculas |
| `visiblePortal` | `boolean` | Si | Visible en portal publico |
| `descripcion` | `string` | No | Descripcion |
| `logo` | `string` | No | URL del logo |
| `createdAt` | `string` | Si | Fecha de creacion |
| `updatedAt` | `string` | Si | Fecha de actualizacion |
| `createdBy` | `string` | Si | Creado por |
| `updatedBy` | `string` | No | Actualizado por |

**Tipos Relacionados:**

```typescript
type NivelUnidad =
  | 'nacional'     // Sede Nacional
  | 'territorial'  // Direccion Territorial
  | 'cetap'        // Centro Territorial de Administracion Publica
  | 'regional'     // Regional
  | 'sede';        // Sede especifica

type EstadoUnidad =
  | 'activa'
  | 'inactiva'
  | 'en_configuracion'
  | 'cerrada_temporal';
```

**Estructura ESAP:**

```
Sede Nacional (1)
├── Direcciones Territoriales (17)
│   ├── Territorial Cundinamarca
│   │   ├── CETAP Bogota Norte
│   │   ├── CETAP Bogota Sur
│   │   └── ...
│   ├── Territorial Antioquia
│   │   ├── CETAP Medellin
│   │   └── ...
│   └── ... (15 mas)
└── CETAPs (71+)
```

---

### 7.2 UsuarioEstructura

**Ubicacion:** `/src/types/estructura-organizacional.types.ts`
**Descripcion:** Asignacion de usuario a una unidad organizacional.

| Campo | Tipo | Requerido | Descripcion |
|-------|------|-----------|-------------|
| `id` | `string` | Si | Identificador unico |
| `usuarioId` | `string` | Si | FK a User |
| `unidadId` | `string` | Si | FK a UnidadOrganizacional |
| `rolId` | `string` | Si | ID del rol |
| `rolNombre` | `string` | No | Nombre del rol |
| `ambitoAcceso` | `AmbitoAcceso` | Si | Ambito de acceso |
| `esPrincipal` | `boolean` | Si | Si es la principal |
| `estado` | `'activa' \| 'inactiva'` | Si | Estado |
| `fechaInicio` | `string` | Si | Fecha inicio |
| `fechaFin` | `string` | No | Fecha fin |
| `observaciones` | `string` | No | Notas |
| `createdAt` | `string` | Si | Fecha de creacion |
| `updatedAt` | `string` | Si | Fecha de actualizacion |
| `createdBy` | `string` | Si | Creado por |
| `updatedBy` | `string` | No | Actualizado por |

---

## 8. Entidades de Comunidad

### 8.1 CommunityPost

**Ubicacion:** `/src/types/community.types.ts`
**Descripcion:** Publicacion en la red social institucional.

| Campo | Tipo | Requerido | Descripcion |
|-------|------|-----------|-------------|
| `id` | `string` | Si | Identificador unico |
| `contenido` | `string` | Si | Contenido del post |
| `autor_id` | `string` | Si | FK a User |
| `autor_nombre` | `string` | Si | Nombre del autor |
| `autor_rol` | `RolAutor` | Si | Rol del autor |
| `autor_foto` | `string` | No | Foto del autor |
| `imagenes` | `string[]` | No | URLs de imagenes |
| `archivos` | `ArchivoAdjunto[]` | No | Archivos adjuntos |
| `estado` | `EstadoPost` | Si | Estado del post |
| `requiere_moderacion` | `boolean` | Si | Si requiere moderacion |
| `moderado_por` | `string` | No | FK a User moderador |
| `moderado_fecha` | `string` | No | Fecha de moderacion |
| `razon_rechazo` | `string` | No | Razon del rechazo |
| `categoria` | `CategoriaPost` | Si | Categoria |
| `etiquetas` | `string[]` | Si | Etiquetas |
| `likes` | `number` | Si | Numero de likes |
| `comentarios` | `number` | Si | Numero de comentarios |
| `compartidos` | `number` | Si | Numero de compartidos |
| `vistas` | `number` | Si | Numero de vistas |
| `es_oficial` | `boolean` | Si | Si es oficial |
| `es_destacado` | `boolean` | Si | Si esta destacado |
| `permite_comentarios` | `boolean` | Si | Si permite comentarios |
| `fecha_creacion` | `string` | Si | Fecha de creacion |
| `fecha_publicacion` | `string` | No | Fecha de publicacion |
| `fecha_actualizacion` | `string` | No | Fecha de actualizacion |
| `created_by` | `string` | Si | Creado por |
| `updated_by` | `string` | No | Actualizado por |

**Tipos Relacionados:**

```typescript
type RolAutor = 'Estudiante' | 'Docente' | 'Administrativo' | 'Graduado';

type EstadoPost =
  | 'Borrador'
  | 'Publicado'
  | 'En Revision'
  | 'Rechazado'
  | 'Archivado';

type CategoriaPost =
  | 'General'
  | 'Academico'
  | 'Deportes'
  | 'Cultura'
  | 'Investigacion'
  | 'Graduados';
```

---

### 8.2 CommunityEvent

**Ubicacion:** `/src/types/community.types.ts`
**Descripcion:** Evento de la comunidad ESAP.

| Campo | Tipo | Requerido | Descripcion |
|-------|------|-----------|-------------|
| `id` | `string` | Si | Identificador unico |
| `titulo` | `string` | Si | Titulo del evento |
| `descripcion` | `string` | Si | Descripcion |
| `imagen_portada` | `string` | No | Imagen de portada |
| `organizador_id` | `string` | Si | FK a User |
| `organizador_nombre` | `string` | Si | Nombre organizador |
| `organizador_tipo` | `TipoOrganizador` | Si | Tipo de organizador |
| `fecha_inicio` | `string` | Si | Fecha inicio |
| `fecha_fin` | `string` | Si | Fecha fin |
| `hora_inicio` | `string` | Si | Hora inicio |
| `hora_fin` | `string` | Si | Hora fin |
| `zona_horaria` | `string` | Si | Zona horaria |
| `modalidad` | `ModalidadEvento` | Si | Modalidad |
| `ubicacion_presencial` | `string` | No | Ubicacion presencial |
| `sede` | `string` | No | Sede (Nacional, Territorial, CETAP) |
| `enlace_virtual` | `string` | No | Enlace virtual |
| `categoria` | `CategoriaEvento` | Si | Categoria |
| `publico_objetivo` | `PublicoObjetivo[]` | Si | Publico objetivo |
| `requiere_inscripcion` | `boolean` | Si | Si requiere inscripcion |
| `cupos_maximos` | `number` | No | Cupos maximos |
| `cupos_disponibles` | `number` | No | Cupos disponibles |
| `inscripciones_abiertas` | `boolean` | Si | Si estan abiertas |
| `fecha_cierre_inscripcion` | `string` | No | Fecha cierre inscripcion |
| `estado` | `EstadoEvento` | Si | Estado |
| `asistentes_confirmados` | `number` | Si | Asistentes confirmados |
| `interesados` | `number` | Si | Interesados |
| `es_oficial` | `boolean` | Si | Si es oficial |
| `es_destacado` | `boolean` | Si | Si esta destacado |
| `fecha_creacion` | `string` | Si | Fecha de creacion |
| `fecha_publicacion` | `string` | No | Fecha de publicacion |
| `fecha_actualizacion` | `string` | No | Fecha de actualizacion |
| `created_by` | `string` | Si | Creado por |
| `updated_by` | `string` | No | Actualizado por |

**Tipos Relacionados:**

```typescript
type TipoOrganizador =
  | 'Facultad'
  | 'Direccion'
  | 'Bienestar'
  | 'Estudiantes'
  | 'Otro';

type ModalidadEvento = 'Presencial' | 'Virtual' | 'Hibrido';

type CategoriaEvento =
  | 'Academico'
  | 'Cultural'
  | 'Deportivo'
  | 'Social'
  | 'Conferencia'
  | 'Taller'
  | 'Seminario';

type PublicoObjetivo =
  | 'Estudiantes'
  | 'Docentes'
  | 'Administrativos'
  | 'Graduados'
  | 'Publico General';

type EstadoEvento =
  | 'Borrador'
  | 'Publicado'
  | 'En Curso'
  | 'Finalizado'
  | 'Cancelado';
```

---

### 8.3 CommunityAnnouncement

**Ubicacion:** `/src/types/community.types.ts`
**Descripcion:** Anuncio oficial institucional.

| Campo | Tipo | Requerido | Descripcion |
|-------|------|-----------|-------------|
| `id` | `string` | Si | Identificador unico |
| `titulo` | `string` | Si | Titulo |
| `contenido` | `string` | Si | Contenido |
| `resumen` | `string` | No | Resumen |
| `imagen_portada` | `string` | No | Imagen |
| `emisor_id` | `string` | Si | FK a User |
| `emisor_nombre` | `string` | Si | Nombre del emisor |
| `emisor_dependencia` | `string` | Si | Dependencia |
| `tipo` | `TipoAnuncio` | Si | Tipo de anuncio |
| `prioridad` | `PrioridadAnuncio` | Si | Prioridad |
| `alcance` | `AlcanceAnuncio` | Si | Alcance |
| `territoriales` | `string[]` | No | Territoriales (si aplica) |
| `cetaps` | `string[]` | No | CETAPs (si aplica) |
| `programas` | `string[]` | No | Programas (si aplica) |
| `dirigido_a` | `DirigidoA[]` | Si | Dirigido a |
| `fecha_vigencia_inicio` | `string` | Si | Fecha inicio vigencia |
| `fecha_vigencia_fin` | `string` | No | Fecha fin vigencia |
| `es_permanente` | `boolean` | Si | Si es permanente |
| `archivos` | `ArchivoAdjunto[]` | No | Archivos adjuntos |
| `estado` | `EstadoAnuncio` | Si | Estado |
| `es_oficial` | `true` | Si | Siempre true |
| `aparece_en_inicio` | `boolean` | Si | Si aparece en inicio |
| `requiere_lectura` | `boolean` | Si | Si requiere confirmacion |
| `vistas` | `number` | Si | Numero de vistas |
| `fecha_creacion` | `string` | Si | Fecha de creacion |
| `fecha_publicacion` | `string` | No | Fecha de publicacion |
| `fecha_actualizacion` | `string` | No | Fecha de actualizacion |
| `created_by` | `string` | Si | Creado por |
| `updated_by` | `string` | No | Actualizado por |
| `aprobado_por` | `string` | No | Aprobado por |
| `fecha_aprobacion` | `string` | No | Fecha de aprobacion |

**Tipos Relacionados:**

```typescript
type TipoAnuncio =
  | 'Convocatoria'
  | 'Comunicado'
  | 'Aviso'
  | 'Norma'
  | 'Evento'
  | 'Academico';

type PrioridadAnuncio = 'Baja' | 'Media' | 'Alta' | 'Urgente';

type AlcanceAnuncio =
  | 'Nacional'
  | 'Territorial'
  | 'CETAP'
  | 'Programa'
  | 'Facultad';

type DirigidoA =
  | 'Estudiantes'
  | 'Docentes'
  | 'Administrativos'
  | 'Graduados'
  | 'Aspirantes'
  | 'Todos';

type EstadoAnuncio = 'Borrador' | 'Publicado' | 'Vencido' | 'Archivado';
```

---

## 9. Entidades Academicas

### 9.1 PeriodoAcademico

**Ubicacion:** `/src/types/gestion-profesoral.ts`, `/src/types/calendario-academico.types.ts`
**Descripcion:** Periodo academico semestral.

| Campo | Tipo | Requerido | Descripcion |
|-------|------|-----------|-------------|
| `id` | `number` | Si | Identificador unico |
| `codigo` | `string` | Si | Codigo (ej: "2025-1") |
| `nombre` | `string` | Si | Nombre (ej: "Primer Semestre 2025") |
| `anio` | `number` | Si | Ano |
| `semestre` | `1 \| 2` | Si | Semestre (1 o 2) |
| `fecha_inicio` | `string` | Si | Fecha inicio |
| `fecha_fin` | `string` | Si | Fecha fin |
| `fecha_inicio_matriculas` | `string` | No | Fecha inicio matriculas |
| `fecha_fin_matriculas` | `string` | No | Fecha fin matriculas |
| `fecha_inicio_pta` | `string` | No | Fecha inicio PTA |
| `fecha_fin_pta` | `string` | No | Fecha fin PTA |
| `estado` | `EstadoPeriodo` | Si | Estado del periodo |
| `created_at` | `string` | Si | Fecha de creacion |
| `updated_at` | `string` | Si | Fecha de actualizacion |

**Tipos Relacionados:**

```typescript
type EstadoPeriodo = 'PLANIFICACION' | 'ACTIVO' | 'CERRADO';
```

---

### 9.2 CatalogoAsignaturas

**Ubicacion:** `/src/types/gestion-profesoral.ts`
**Descripcion:** Asignatura del catalogo academico.

| Campo | Tipo | Requerido | Descripcion |
|-------|------|-----------|-------------|
| `id` | `number` | Si | Identificador unico |
| `codigo` | `string` | Si | Codigo de asignatura |
| `nombre` | `string` | Si | Nombre de la asignatura |
| `programa_id` | `number` | Si | FK a Programa |
| `tipo_programa` | `TipoPrograma` | Si | Tipo de programa |
| `creditos` | `number` | Si | Creditos academicos |
| `horas_clase` | `number` | Si | Horas de clase (calculado) |
| `horas_totales` | `number` | Si | Horas totales (calculado) |
| `activo` | `boolean` | Si | Si esta activa |
| `created_at` | `string` | Si | Fecha de creacion |

**Tipos Relacionados:**

```typescript
type TipoPrograma =
  | 'AP'           // Administracion Publica
  | 'ECONOMIA_PUB' // Economia Publica
  | 'Maestria'     // Maestria
  | 'APT'          // Administracion Publica Territorial
  | 'ESP'          // Especializacion
  | 'DOCTORADO';   // Doctorado
```

---

### 9.3 EventoCalendario

**Ubicacion:** `/src/types/calendario-academico.types.ts`
**Descripcion:** Evento del calendario academico.

| Campo | Tipo | Requerido | Descripcion |
|-------|------|-----------|-------------|
| `id` | `string` | Si | Identificador unico |
| `nombre` | `string` | Si | Nombre del evento |
| `categoria` | `CategoriaEventoCal` | Si | Categoria |
| `color` | `string` | Si | Color hex |
| `fechaInicio` | `string` | Si | Fecha inicio (ISO 8601) |
| `fechaFin` | `string` | No | Fecha fin (ISO 8601) |
| `duracion` | `number` | No | Duracion en dias |
| `aplicaA` | `TipoUsuario[]` | Si | Aplica a usuarios |
| `programas` | `TipoPrograma[]` | No | Programas especificos |
| `descripcion` | `string` | Si | Descripcion |
| `accionPrincipal` | `string` | No | Accion principal |
| `urlAccion` | `string` | No | URL de accion |
| `documentosRequeridos` | `string[]` | No | Documentos requeridos |
| `sistema` | `string` | No | Sistema relacionado |
| `responsable` | `string` | No | Responsable |
| `baseLegal` | `string` | No | Base legal |
| `importancia` | `Importancia` | No | Importancia |
| `nota` | `string` | No | Notas |
| `metadata` | `Record<string, any>` | No | Metadata adicional |

**Tipos Relacionados:**

```typescript
type CategoriaEventoCal =
  | 'inscripcion'
  | 'matricula'
  | 'situaciones'
  | 'desarrollo'
  | 'calificaciones'
  | 'grados'
  | 'recesos'
  | 'administrativo';

type Importancia = 'alta' | 'media' | 'baja';
```

---

## 10. Entidades de Graduados

### 10.1 GraduateTitle

**Ubicacion:** `/src/types/index.ts`
**Descripcion:** Titulo academico de un graduado.

| Campo | Tipo | Requerido | Descripcion |
|-------|------|-----------|-------------|
| `id` | `string` | Si | Identificador unico |
| `documentType` | `DocumentType` | Si | Tipo documento |
| `documentNumber` | `string` | Si | Numero documento |
| `fullName` | `string` | Si | Nombre completo |
| `email` | `string` | No | Email |
| `phone` | `string` | No | Telefono |
| `titleType` | `TipoTitulo` | Si | Tipo de titulo |
| `programName` | `string` | Si | Nombre del programa |
| `faculty` | `string` | Si | Facultad |
| `diplomaNumber` | `string` | Si | Numero de diploma |
| `actaNumber` | `string` | Si | Numero de acta |
| `graduationDate` | `string` | Si | Fecha de graduacion |
| `verificationStatus` | `EstadoVerificacion` | Si | Estado de verificacion |
| `verificationDate` | `string` | No | Fecha de verificacion |
| `verifiedBy` | `string` | No | Verificado por |
| `verifierName` | `string` | No | Nombre del verificador |
| `verificationNotes` | `string` | No | Notas de verificacion |
| `diplomaUrl` | `string` | No | URL del diploma |
| `actaUrl` | `string` | No | URL del acta |
| `certificateUrl` | `string` | No | URL del certificado |
| `honors` | `Honores` | No | Honores obtenidos |
| `gpa` | `number` | No | GPA |
| `isPublic` | `boolean` | Si | Si es publico |
| `verificationCode` | `string` | Si | Codigo de verificacion |
| `createdAt` | `string` | Si | Fecha de creacion |
| `updatedAt` | `string` | Si | Fecha de actualizacion |

**Tipos Relacionados:**

```typescript
type TipoTitulo =
  | 'Tecnico'
  | 'Tecnologo'
  | 'Pregrado'
  | 'Especializacion'
  | 'Maestria'
  | 'Doctorado';

type EstadoVerificacion =
  | 'pending'
  | 'verified'
  | 'rejected'
  | 'expired';

type Honores =
  | 'Cum Laude'
  | 'Magna Cum Laude'
  | 'Summa Cum Laude';
```

---

### 10.2 VerificationCertificate

**Ubicacion:** `/src/types/index.ts`
**Descripcion:** Certificado de verificacion de titulo.

| Campo | Tipo | Requerido | Descripcion |
|-------|------|-----------|-------------|
| `id` | `string` | Si | Identificador unico |
| `certificateNumber` | `string` | Si | Numero unico del certificado |
| `qrCode` | `string` | Si | Codigo QR en base64 |
| `qrUrl` | `string` | Si | URL del QR |
| `graduate` | `GraduateInfo` | Si | Informacion del graduado |
| `requester` | `RequesterInfo` | Si | Informacion del solicitante |
| `status` | `EstadoCertificadoVerif` | Si | Estado |
| `generatedAt` | `string` | Si | Fecha de generacion |
| `generatedBy` | `string` | No | Generado por |
| `generatorName` | `string` | No | Nombre del generador |
| `expiresAt` | `string` | No | Fecha de expiracion |
| `viewCount` | `number` | Si | Veces visto |
| `qrScanCount` | `number` | Si | Veces escaneado |
| `lastScannedAt` | `string` | No | Ultimo escaneo |
| `scanHistory` | `QRScanRecord[]` | Si | Historial de escaneos |
| `certificatePdfUrl` | `string` | No | URL del PDF |
| `createdAt` | `string` | Si | Fecha de creacion |
| `updatedAt` | `string` | Si | Fecha de actualizacion |

**Tipos Relacionados:**

```typescript
type EstadoCertificadoVerif = 'active' | 'revoked' | 'expired';

interface GraduateInfo {
  documentNumber: string;
  documentIssueDate: string;
  fullName: string;
  titleType: TipoTitulo;
  programName: string;
  diplomaNumber: string;
  graduationDate: string;
  honors?: Honores;
  gpa?: number;
}

interface RequesterInfo {
  name: string;
  email: string;
  type: string;
  notes?: string;
}
```

---

## 11. Entidades de Auditoria del Sistema

### 11.1 AuditLog

**Ubicacion:** `/src/types/index.ts`
**Descripcion:** Registro de auditoria del sistema.

| Campo | Tipo | Requerido | Descripcion |
|-------|------|-----------|-------------|
| `id` | `string` | Si | Identificador unico |
| `eventType` | `AuditEventType` | Si | Tipo de evento |
| `entityType` | `AuditEntityType` | Si | Tipo de entidad |
| `entityId` | `string` | Si | ID de la entidad |
| `entityName` | `string` | No | Nombre de la entidad |
| `action` | `AuditAction` | Si | Accion realizada |
| `performedBy` | `string` | Si | FK a User |
| `performedByName` | `string` | Si | Nombre de quien lo realizo |
| `performedByRole` | `string` | No | Rol de quien lo realizo |
| `ipAddress` | `string` | No | Direccion IP |
| `userAgent` | `string` | No | User agent |
| `changes` | `AuditChange[]` | No | Cambios realizados |
| `metadata` | `Record<string, any>` | No | Metadata adicional |
| `severity` | `Severidad` | Si | Nivel de severidad |
| `timestamp` | `string` | Si | Fecha y hora |

**Tipos Relacionados:**

```typescript
type AuditEventType =
  // Eventos de usuario
  | 'user_login'
  | 'user_logout'
  | 'user_created'
  | 'user_updated'
  | 'user_deleted'
  // Eventos de roles
  | 'role_created'
  | 'role_updated'
  | 'role_deleted'
  // Eventos de permisos
  | 'permission_granted'
  | 'permission_revoked'
  // Eventos de documentos
  | 'document_uploaded'
  | 'document_verified'
  | 'document_rejected'
  // Eventos de configuracion
  | 'settings_changed'
  | 'export_data'
  | 'import_data'
  // Eventos de aspirantes
  | 'aspirant_created'
  | 'aspirant_updated'
  | 'aspirant_approved'
  | 'aspirant_rejected'
  // Eventos de certificados
  | 'certificate_generated'
  | 'title_verified'
  | 'title_rejected'
  // Eventos de solicitudes
  | 'application_submitted'
  | 'application_reviewed';

type AuditEntityType =
  | 'user'
  | 'role'
  | 'permission'
  | 'aspirant'
  | 'document'
  | 'certificate'
  | 'application'
  | 'settings';

type AuditAction =
  | 'create'
  | 'read'
  | 'update'
  | 'delete'
  | 'login'
  | 'logout'
  | 'approve'
  | 'reject'
  | 'export'
  | 'import';

type Severidad = 'low' | 'medium' | 'high' | 'critical';

interface AuditChange {
  field: string;
  oldValue: any;
  newValue: any;
}
```

---

## 12. Estructuras de API

### 12.1 ApiResponse (Respuesta Estandar)

**Ubicacion:** `/src/types/index.ts`, `/src/services/api/ptaAPI.ts`

```typescript
// Respuesta exitosa
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  timestamp: string;
}

// Respuesta de error
interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
    stack?: string;
  };
  timestamp: string;
}

// Respuesta paginada
interface PaginatedResponse<T> {
  success: true;
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    totalPages: number;
    totalItems: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  timestamp: string;
}
```

### 12.2 Filtros Comunes

```typescript
// Filtros de busqueda genericos
interface FiltrosBase {
  busqueda?: string;
  estado?: string;
  fechaDesde?: string;
  fechaHasta?: string;
  pagina?: number;
  porPagina?: number;
  ordenarPor?: string;
  ordenDireccion?: 'asc' | 'desc';
}

// Filtros especificos por modulo
interface FiltrosCertificados extends FiltrosBase {
  tipo?: TipoCertificado;
  empleadoId?: string;
  dependencia?: string;
}

interface FiltrosControlInterno extends FiltrosBase {
  tipoAuditoria?: TipoAuditoria;
  prioridad?: PrioridadAuditoria;
  auditorLider?: string;
}
```

---

## 13. Diagrama de Relaciones

```
+------------------+      +------------------+      +------------------+
|       USER       |----->| ASIGNACION_SEDE  |----->| UNIDAD_ORG       |
+------------------+      +------------------+      +------------------+
        |                                                   |
        |                                                   |
        v                                                   v
+------------------+      +------------------+      +------------------+
|       ROLE       |<-----|    PERMISSION    |      |     CETAP        |
+------------------+      +------------------+      +------------------+
        |
        |
        v
+------------------+      +------------------+      +------------------+
|     DOCENTE      |----->|       PTA        |----->| PERIODO_ACAD     |
+------------------+      +------------------+      +------------------+
        |                         |
        |                         |
        v                         v
+------------------+      +------------------+
| RESOL_VINCULACION|      |   COMPONENTES    |
+------------------+      | (Doc/Inv/Ext/...) |
                          +------------------+

+------------------+      +------------------+      +------------------+
|    AUDITORIA     |----->|     HALLAZGO     |----->| PLAN_MEJORA      |
+------------------+      +------------------+      +------------------+

+------------------+      +------------------+      +------------------+
|    SOLICITUD     |----->|   CERTIFICADO    |<-----|    PLANTILLA     |
+------------------+      +------------------+      +------------------+
                                  |
                                  v
                          +------------------+
                          |    VALIDACION    |
                          +------------------+

+------------------+      +------------------+
|  GRADUATE_TITLE  |----->| VERIF_CERTIFICATE|
+------------------+      +------------------+

+------------------+      +------------------+      +------------------+
|  COMMUNITY_POST  |      | COMMUNITY_EVENT  |      |COMMUNITY_ANNOUNCE|
+------------------+      +------------------+      +------------------+
```

---

## 14. Mapeo de Archivos por Modulo

### 14.1 Gestion Profesoral

| Archivo | Descripcion |
|---------|-------------|
| `/src/types/gestion-profesoral.ts` | Tipos de docentes, resoluciones, PTA |
| `/src/services/api/gestionProfesoralService.ts` | Servicios API |
| `/src/services/api/ptaAPI.ts` | API especifica para PTA |
| `/src/types/integracion-personas-pta.ts` | Integracion con modulo Personas |
| `/src/data/docentesGestionProfesoral.ts` | Datos mock de docentes |

### 14.2 Certificados Laborales

| Archivo | Descripcion |
|---------|-------------|
| `/src/types/certificados.ts` | Tipos de certificados |
| `/src/services/api/certificados.service.ts` | Servicios API |
| `/src/data/empleadosElegiblesCertificados.ts` | Datos mock de empleados |

### 14.3 Control Interno

| Archivo | Descripcion |
|---------|-------------|
| `/src/types/control-interno.ts` | Tipos de auditorias y hallazgos |
| `/src/services/api/controlInternoService.ts` | Servicios API |

### 14.4 Estructura Organizacional

| Archivo | Descripcion |
|---------|-------------|
| `/src/types/estructura-organizacional.types.ts` | Tipos de unidades |
| `/src/services/api/estructura.service.ts` | Servicios API |
| `/src/data/estructura-organizacional-completa.ts` | Datos estructura |
| `/src/data/territoriales-cetap-completo.ts` | Territoriales y CETAPs |

### 14.5 Comunidad

| Archivo | Descripcion |
|---------|-------------|
| `/src/types/community.types.ts` | Tipos de comunidad |
| `/src/services/api/portal.service.ts` | Servicios API |

### 14.6 Roles y Permisos

| Archivo | Descripcion |
|---------|-------------|
| `/src/types/roles-permissions.types.ts` | Tipos de roles y permisos |
| `/src/types/roles-sistema.types.ts` | Roles del sistema |
| `/src/services/api/roles-permissions-api.service.ts` | Servicios API |
| `/src/data/permissions-certificados-registro-granular.ts` | Permisos granulares |

### 14.7 Calendario Academico

| Archivo | Descripcion |
|---------|-------------|
| `/src/types/calendario-academico.types.ts` | Tipos de calendario |

### 14.8 Situaciones Administrativas

| Archivo | Descripcion |
|---------|-------------|
| `/src/types/situacionesAdministrativas.ts` | Tipos de situaciones |
| `/src/types/periodParameters.ts` | Parametros de periodo |

---

## 15. Convenciones y Patrones

### 15.1 Nomenclatura

| Elemento | Convencion | Ejemplo |
|----------|------------|---------|
| **Interfaces** | PascalCase | `User`, `PlanTrabajoAcademico` |
| **Type Unions** | SCREAMING_SNAKE_CASE | `'ACTIVO' \| 'INACTIVO'` |
| **Enums/Tipos** | PascalCase | `EstadoPTA`, `TipoVinculacion` |
| **DTOs** | Prefijo Create/Update | `CreateUserDTO`, `UpdateAspirantDTO` |
| **Respuestas** | Sufijo Response/Result | `LoginResponse`, `ValidateQRCodeResult` |
| **Filtros** | Prefijo Filtro | `FiltrosCertificados` |

### 15.2 Campos Comunes

Todos los modelos principales incluyen estos campos:

| Campo | Tipo | Descripcion |
|-------|------|-------------|
| `id` | `string \| number` | Identificador unico |
| `createdAt` | `string` | Fecha creacion (ISO 8601) |
| `updatedAt` | `string` | Fecha actualizacion (ISO 8601) |
| `createdBy` | `string` | FK a User (quien creo) |
| `updatedBy` | `string` | FK a User (quien actualizo) |
| `estado` / `status` | Union type | Estado del registro |
| `metadata` | `Record<string, any>` | Datos adicionales flexibles |

### 15.3 Formato de Fechas

Todas las fechas se almacenan en formato **ISO 8601**:

```typescript
// Ejemplo
const fecha = "2025-01-30T14:30:00.000Z";
```

### 15.4 Patrones de Estado

Los estados siguen un flujo logico predefinido:

```typescript
// Ejemplo: Estados de PTA
'EN_CONSTRUCCION' -> 'EN_APROBACION' -> 'DEVUELTO_AJUSTES' | 'APROBADO'
'APROBADO' -> 'EN_FIRME'

// Ejemplo: Estados de Solicitud de Certificado
'pendiente' -> 'en_revision' -> 'aprobada' | 'rechazada'
'aprobada' -> 'procesada'
```

---

## 16. Glosario de Terminos

| Termino | Definicion |
|---------|------------|
| **CETAP** | Centro Territorial de Administracion Publica |
| **ESAP** | Escuela Superior de Administracion Publica |
| **PTA** | Plan de Trabajo Academico |
| **SNI** | Sistema Nacional de Investigacion |
| **TC** | Tiempo Completo (dedicacion) |
| **MT** | Medio Tiempo (dedicacion) |
| **CIG** | Control Interno de Gestion |
| **DAFP** | Departamento Administrativo de la Funcion Publica |
| **FK** | Foreign Key (Llave foranea) |
| **DTO** | Data Transfer Object |
| **UUID** | Universally Unique Identifier |
| **ISO 8601** | Estandar internacional para fechas y horas |
| **API** | Application Programming Interface |
| **CRUD** | Create, Read, Update, Delete |

---

## Historial de Versiones

| Version | Fecha | Autor | Cambios |
|---------|-------|-------|---------|
| 1.0 | Enero 2026 | Equipo de Desarrollo | Creacion inicial del documento |

---

## Contacto

**Equipo de Arquitectura Frontend ESAP**

- Email: arquitectura@esap.edu.co
- Slack: #diccionario-datos
- Wiki: https://wiki.esap.edu.co/diccionario-datos

---

**Documento Tecnico - Plataforma Comunidades ESAP**
**Version 1.0 - Enero 2026**
