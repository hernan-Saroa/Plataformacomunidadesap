# Contexto de Roles y Permisos - Plataforma Comunidades ESAP

## 1. Arquitectura General

El sistema de roles y permisos se gestiona centralmente desde el **auth-service** (NestJS + TypeORM + PostgreSQL). Los demás microservicios (legal-management-service, etc.) solo **consumen** el JWT que contiene los roles del usuario.

### Flujo completo:
```
Login → auth-service genera JWT con roles[] → Frontend guarda token + user data
→ Frontend usa authService.hasPermission() para UI
→ Backend valida JWT en cada request (JwtAuthGuard)
→ Backend valida roles con @Roles() decorator + RolesGuard (solo en auth-service)
```

---

## 2. Esquema de Base de Datos (schema: `auth`)

### Tablas principales:

| Tabla | Descripción |
|-------|-------------|
| `auth.role` | Definición de roles |
| `auth.permission` | Permisos granulares |
| `auth.module` | Módulos del sistema (agrupan permisos) |
| `auth.role_permissions` | Tabla pivote: qué permisos tiene cada rol |
| `auth.user_roles` | Tabla pivote: qué roles tiene cada usuario |
| `auth.user` | Usuarios del sistema |

### Entidad Role (`auth.role`):
```typescript
// backend/auth-service/src/users/role.entity.ts
{
  id: string;           // UUID, PK
  code: string;         // UNIQUE - ej: 'SUPER_ADMIN', 'GESTION_LEGAL'
  name: string;         // UNIQUE - nombre legible
  description: string;
  icon: string;         // default 'Shield' (nombre de icono Lucide)
  color: string;        // default '#003DA5'
  type: 'sistema' | 'personalizado';
  category: 'backoffice' | 'portal' | 'sistema' | 'academico' | 'directivo' | 'administrativo';
  is_active: boolean;
  requires_2fa: boolean;
  created_by: string;
  updated_by: string;
  created_at: Date;
  updated_at: Date;
  permissions: Permission[];  // ManyToMany via auth.role_permissions
  users: User[];              // ManyToMany via auth.user_roles
}
```

### Entidad Permission (`auth.permission`):
```typescript
// backend/auth-service/src/users/permission.entity.ts
{
  id_permission: string;  // UUID, PK
  code: string;           // UNIQUE - ej: 'gestion-legal.defensa-judicial.create'
  name: string;           // nombre legible
  description: string;
  id_module: string;      // FK a auth.module
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}
```

### Entidad Module (`auth.module`):
```typescript
// backend/auth-service/src/users/module.entity.ts
{
  id_module: string;    // UUID, PK
  code: string;         // UNIQUE - ej: 'gestion-legal', 'control-disciplinario'
  name: string;
  description: string;
  icon: string;
  color: string;
  display_order: number;
  category: 'backoffice' | 'portal';
  is_active: boolean;
}
```

### Tabla pivote `auth.role_permissions`:
```sql
(id_rol UUID, id_permission UUID)  -- PK compuesta
-- Con columna is_active en algunas versiones
```

### Tabla pivote `auth.user_roles`:
```sql
(id_user UUID, id_rol UUID, is_active BOOLEAN, created_at, updated_at)
```

---

## 3. Roles Existentes en el Sistema

### Roles de Sistema (type = 'sistema'):

| Código | Nombre | Categoría | Módulo |
|--------|--------|-----------|--------|
| `SUPER_ADMIN` | Super Administrador | sistema | Todos (bypass total) |
| `ADMIN` | Administrador | sistema | Backoffice general |
| `GESTION_LEGAL` | Gestión Legal | backoffice | Gestión Legal |
| `JEFE_OCI` | Jefe de Control Interno | directivo | Control Interno |
| `PROFESIONAL_AUDITOR` | Profesional Auditor | administrativo | Control Interno |
| `AUXILIAR_AUDITORIA` | Auxiliar de Auditoría | administrativo | Control Interno |
| `CONSULTA` | Consulta Control Interno | administrativo | Control Interno |
| `CONTROL_INTERNO` | Control Interno | administrativo | Control Interno (acceso genérico) |
| `JEFE_DE_LA_OCID` | Jefe OCID | directivo | Control Disciplinario |
| `SECRETARIA_RADICADOR` | Radicador Disciplinario | administrativo | Control Disciplinario |
| `PROFESIONAL` | Profesional Disciplinario | administrativo | Control Disciplinario |
| `COORDINADOR_CERT_LABORAL` | Coordinador Cert. Laboral | backoffice | Verificación de títulos |
| `AUDITOR_LIDER` | Auditor Líder | backoffice | Control Interno |

### Roles de OCI (auditoría):

| Código | Nombre |
|--------|--------|
| `jefe-oci` | Jefe OCI |
| `auditor-senior` | Auditor Sénior |
| `auditor` | Auditor |
| `auditor-junior` | Auditor Júnior |
| `apoyo-tecnico` | Apoyo Técnico |

> **IMPORTANTE**: `SUPER_ADMIN` tiene bypass total. El `RolesGuard` siempre retorna `true` si el usuario tiene este rol.

---

## 4. Permisos del Módulo Gestión Legal

Todos los permisos están definidos en `packages/shared-types/src/permissions.ts` como un enum `Permissions`.

### Convención de nombres de permisos:
```
{modulo}.{submodulo}.{recurso}.{accion}
```
Ejemplo: `gestion-legal.defensa-judicial.expediente.doc.upload`

### Permisos de Gestión Legal completos:

#### Defensa Judicial:
- `gestion-legal.defensa-judicial.manage` - Ver submódulo
- `gestion-legal.defensa-judicial.create` - Crear proceso
- `gestion-legal.defensa-judicial.expediente.doc.upload` / `.delete`
- `gestion-legal.defensa-judicial.expediente.actuacion.create`
- `gestion-legal.defensa-judicial.expediente.actuacion.audiencia.create`
- `gestion-legal.defensa-judicial.expediente.tarea.create` / `.delete`
- `gestion-legal.defensa-judicial.expediente.nota.create` / `.delete`
- `gestion-legal.defensa-judicial.autos.create` / `.delete`
- `gestion-legal.defensa-judicial.evidencias.create` / `.delete` / `.admitir`
- `gestion-legal.defensa-judicial.oficios.create` / `.delete` / `.atender`
- `gestion-legal.defensa-judicial.actas.create` / `.delete`
- `gestion-legal.defensa-judicial.estados.edit`

#### Juzgamiento Disciplinario:
- `gestion-legal.juzgamiento-disciplinario.manage`
- `gestion-legal.juzgamiento-disciplinario.expediente.edit` / `.prueba` / `.decision` / `.excepcion`
- `gestion-legal.juzgamiento-disciplinario.expediente.decision.notificar`
- `gestion-legal.juzgamiento-disciplinario.expediente.doc.upload`
- `gestion-legal.juzgamiento-disciplinario.autos.create` / `.delete`
- `gestion-legal.juzgamiento-disciplinario.evidencias.create` / `.delete` / `.admitir`
- `gestion-legal.juzgamiento-disciplinario.oficios.create` / `.delete` / `.atender`
- `gestion-legal.juzgamiento-disciplinario.actas.create` / `.delete`
- `gestion-legal.juzgamiento-disciplinario.estados.edit`

#### Asesoría Jurídica:
- `gestion-legal.asesoria-juridica.manage` / `.create` / `.delete`
- `gestion-legal.asesoria-juridica.expediente.doc.upload` / `.delete`

#### Centro de Comunicaciones:
- `gestion-legal.comunicaciones.manage` / `.create` / `.leido` / `.archivar`

#### Otros submódulos:
- `gestion-legal.terminos.manage`
- `gestion-legal.organos-control.manage` / `.create` / `.elaborar` / `.delete` / `.doc.upload` / `.respuesta.send` / `.respuesta.erase` / `.solicitar-insumo`
- `gestion-legal.procesos-coactivos.manage` / `.create` / `.edit` / `.delete`
- `gestion-legal.expedientes-electronicos.manage` / `.upload`
- `gestion-legal.plan-accion.manage` / `.create`
- `gestion-legal.riesgos.manage` / `.create` / `.edit` / `.delete`
- `gestion-legal.planes-mejoramiento.manage` / `.create`
- `gestion-legal.configuraciones.manage` / `.create` / `.edit` / `.delete`

---

## 5. Cómo Funciona el JWT

### Login (`auth-service/src/auth/auth.service.ts`):

Al hacer login, `buildLoginResponse()` construye el JWT con:
```typescript
const payload = {
  sub: user.id_user,
  username: user.username,
  email: user.person?.email,
  name: user.person?.full_name || ...,
  roles: rolesCodes,     // Array de códigos de rol: ['GESTION_LEGAL', 'ADMIN']
  rolesIds: rolesIds,     // Array de UUIDs de los roles
};
```

La respuesta del login incluye:
```typescript
{
  accessToken: "jwt...",
  user: {
    id, username,
    roles: Role[],        // Objetos completos con .code, .name, .permissions[]
    person: Person,
    modules: string[],    // Códigos de módulos derivados de los permisos del rol
  }
}
```

### Cálculo de `modules[]`:
Se extraen del primer segmento del código de permiso:
```typescript
for (const role of user.roles) {
  if (role.code === 'SUPER_ADMIN') { super_admin = true; }
  for (const permission of role.permissions) {
    const code = permission.code.split('.')[0]; // 'gestion-legal'
    if (!modules.includes(code)) modules.push(code);
  }
}
if (super_admin && modules.length === 0) modules.push('all');
```

---

## 6. Validación en Backend (Microservicios)

### En legal-management-service:

El JWT se valida con `JwtStrategy` + `JwtAuthGuard`:

```typescript
// backend/legal-management-service/src/auth/jwt.strategy.ts
async validate(payload: any) {
  return {
    userId: payload.sub,
    username: payload.username,
    roles: payload.roles,    // Array de códigos: ['GESTION_LEGAL']
    email: payload.email,
  };
}
```

El guard `JwtAuthGuard` se aplica globalmente o por controlador. Los endpoints que necesiten ser públicos usan `@Public()`.

> **NOTA**: El `legal-management-service` NO tiene `RolesGuard` ni `@Roles()` decorator propios. Solo valida autenticación (JWT válido). La autorización granular por permisos se hace en el **frontend**.

### En auth-service (tiene validación de roles en backend):

```typescript
// Decorador @Roles()
@Roles('SUPER_ADMIN', 'ADMIN')
@UseGuards(RolesGuard)

// El RolesGuard verifica:
// 1. Si no hay roles requeridos → permite
// 2. Si es internalService → permite
// 3. Si tiene SUPER_ADMIN → permite siempre
// 4. Si tiene alguno de los roles requeridos → permite
// 5. Si no → ForbiddenException
```

---

## 7. Validación en Frontend (React)

### Método 1: `authService.hasPermission()` (más usado)

```typescript
// apps/shell/src/services/api/authService.ts
hasPermission(permission: string): boolean {
  const user = this.getCurrentUser();
  if (user?.roles.find(r => r.code === 'SUPER_ADMIN')) return true;
  return user?.permissions?.includes(permission) || false;
}

hasRole(role: string): boolean {
  const user = this.getCurrentUser();
  return roles.some((r: any) => r?.code === role || r?.name === role);
}

hasAnyPermission(permissions: string[]): boolean {
  return permissions.some(p => this.hasPermission(p));
}

hasAllPermissions(permissions: string[]): boolean {
  return permissions.every(p => this.hasPermission(p));
}
```

### Método 2: `PermissionsContext` (React Context)

```typescript
// apps/shell/src/contexts/PermissionsContext.tsx
const { hasPermission, hasModule, hasAnyPermission } = usePermissions();

// hasModule('all') siempre es true para SUPER_ADMIN
// hasPermission verifica si el código está en la lista o si modules incluye 'all'
```

### Método 3: Hook `useAuth()`

```typescript
// apps/shell/src/hooks/useAuth.ts
const { hasPermission } = useAuth();
```

---

## 8. Cómo Mostrar/Ocultar un Botón por Permiso

### Patrón estándar en el frontend:

```tsx
import { authService } from '../services/api/authService';
import { Permissions } from '@esap/shared-types'; // o desde permissions.ts local

// Ocultar completamente el botón si no tiene permiso:
{authService.hasPermission(Permissions.GESTION_LEGAL_DEFENSA_JUDICIAL_CREATE) && (
  <button onClick={handleCrear}>Nuevo Proceso</button>
)}

// Deshabilitar el botón si no tiene permiso:
<button
  disabled={!authService.hasPermission(Permissions.GESTION_LEGAL_CONFIGURACIONES_EDIT)}
  onClick={handleEditar}
>
  Editar
</button>

// Verificar por rol (menos granular):
{authService.hasRole('GESTION_LEGAL') && (
  <SomeComponent />
)}

// Verificar múltiples permisos (cualquiera):
{authService.hasAnyPermission([
  Permissions.GESTION_LEGAL_RIESGOS_CREATE,
  Permissions.GESTION_LEGAL_RIESGOS_EDIT,
]) && (
  <button>Gestionar Riesgos</button>
)}
```

### Ejemplo real del proyecto (mfe-gestion-legal):

```tsx
// apps/mfe-gestion-legal/src/components/modulos/ModuloDefensaJudicialV3.tsx
if (authService.hasPermission(Permissions.GESTION_LEGAL_DEFENSA_JUDICIAL_CREATE)) {
  // Mostrar botón de crear nuevo proceso
}

// apps/mfe-gestion-legal/src/components/modulos/ConfiguracionesSIGL.tsx
{authService.hasPermission(Permissions.GESTION_LEGAL_CONFIGURACIONES_CREATE) && (
  <button>Agregar</button>
)}

{authService.hasPermission(Permissions.GESTION_LEGAL_CONFIGURACIONES_DELETE) && (
  <button>Eliminar</button>
)}

<input disabled={!authService.hasPermission(Permissions.GESTION_LEGAL_CONFIGURACIONES_EDIT)} />
```

---

## 9. Cómo Añadir un Nuevo Permiso a un Rol

### Paso 1: Definir el permiso en el enum (si es nuevo)

```typescript
// packages/shared-types/src/permissions.ts
export enum Permissions {
  // ... existentes ...
  GESTION_LEGAL_MI_NUEVO_PERMISO = 'gestion-legal.mi-submodulo.mi-accion',
}
```

### Paso 2: Crear migración SQL para insertar el permiso en la BD

```sql
-- db/migrations/XXX_add_nuevo_permiso.sql
DO $$
DECLARE
  v_module_id uuid;
BEGIN
  -- Obtener el módulo de gestión legal
  SELECT id_module INTO v_module_id FROM auth.module WHERE code = 'gestion-legal';

  -- Insertar el permiso
  INSERT INTO auth.permission (id_permission, code, name, description, id_module, is_active)
  VALUES (gen_random_uuid(), 'gestion-legal.mi-submodulo.mi-accion', 'Mi Nuevo Permiso', 'Descripción', v_module_id, true)
  ON CONFLICT (code) DO NOTHING;

  -- Asignar al rol GESTION_LEGAL (u otro rol)
  INSERT INTO auth.role_permissions (id_rol, id_permission)
  SELECT r.id, p.id_permission
  FROM auth.role r
  CROSS JOIN auth.permission p
  WHERE r.code = 'GESTION_LEGAL'
    AND p.code = 'gestion-legal.mi-submodulo.mi-accion'
  ON CONFLICT (id_rol, id_permission) DO NOTHING;
END $$;
```

### Paso 3: Usar en el frontend

```tsx
{authService.hasPermission(Permissions.GESTION_LEGAL_MI_NUEVO_PERMISO) && (
  <button>Mi Acción</button>
)}
```

---

## 10. Cómo Crear un Nuevo Rol

### Opción A: Vía migración SQL

```sql
INSERT INTO auth.role (id, code, name, description, category, icon, color, type, is_active)
VALUES (gen_random_uuid(), 'MI_NUEVO_ROL', 'Mi Nuevo Rol', 'Descripción', 'administrativo', 'Shield', '#003DA5', 'sistema', true)
ON CONFLICT (code) DO NOTHING;

-- Asignar permisos:
INSERT INTO auth.role_permissions (id_rol, id_permission)
SELECT r.id, p.id_permission
FROM auth.role r
CROSS JOIN auth.permission p
WHERE r.code = 'MI_NUEVO_ROL'
  AND p.code IN ('gestion-legal.defensa-judicial.manage', 'gestion-legal.defensa-judicial.create')
ON CONFLICT (id_rol, id_permission) DO NOTHING;
```

### Opción B: Vía API del auth-service

```
POST /roles
Body: {
  name: "Mi Nuevo Rol",
  code: "MI_NUEVO_ROL",        // opcional, se auto-genera del name
  description: "...",
  icon: "Shield",
  color: "#003DA5",
  type: "personalizado",
  category: "administrativo",
  permissionIds: ["uuid-1", "uuid-2"]  // o códigos de permiso
}
```

### Opción C: Desde el panel de administración del frontend (módulo Roles y Permisos)

---

## 11. Cómo Asignar un Rol a un Usuario

### Vía SQL:
```sql
INSERT INTO auth.user_roles (id_user, id_rol, is_active)
VALUES ('uuid-usuario', 'uuid-rol', true)
ON CONFLICT (id_user, id_rol) DO UPDATE SET is_active = true;
```

### Vía API:
El auth-service tiene endpoints en `UsersController` para gestionar roles de usuarios.

---

## 12. Archivos Clave

| Archivo | Descripción |
|---------|-------------|
| `backend/auth-service/src/users/role.entity.ts` | Entidad Role |
| `backend/auth-service/src/users/permission.entity.ts` | Entidad Permission |
| `backend/auth-service/src/users/module.entity.ts` | Entidad Module |
| `backend/auth-service/src/users/user.entity.ts` | Entidad User (tiene ManyToMany con Role) |
| `backend/auth-service/src/users/user-role.entity.ts` | Entidad pivote UserRole |
| `backend/auth-service/src/users/roles.service.ts` | CRUD de roles + asignación de permisos |
| `backend/auth-service/src/users/roles.controller.ts` | Endpoints REST de roles |
| `backend/auth-service/src/auth/auth.service.ts` | Login y generación de JWT |
| `backend/auth-service/src/auth/guards/roles.guard.ts` | Guard que valida roles en endpoints |
| `backend/auth-service/src/auth/decorators/roles.decorator.ts` | Decorador @Roles() |
| `backend/auth-service/src/auth/authorization.constants.ts` | Constantes AUTH_READ_ROLES, AUTH_MANAGE_ROLES |
| `packages/shared-types/src/permissions.ts` | Enum con TODOS los permisos del sistema |
| `apps/shell/src/services/api/authService.ts` | Servicio frontend: hasPermission(), hasRole() |
| `apps/shell/src/contexts/PermissionsContext.tsx` | React Context para permisos |
| `apps/shell/src/hooks/useAuth.ts` | Hook useAuth con hasPermission |
| `backend/legal-management-service/src/auth/jwt.strategy.ts` | JWT strategy del legal service |
| `backend/legal-management-service/src/auth/jwt-auth.guard.ts` | Guard JWT del legal service |

---

## 13. Reglas Importantes

1. **SUPER_ADMIN siempre pasa**: Tanto en backend (`RolesGuard`) como en frontend (`hasPermission()`), si el usuario tiene rol `SUPER_ADMIN`, todo retorna `true`.

2. **Los microservicios NO validan permisos granulares**: Solo validan que el JWT sea válido. La autorización granular es responsabilidad del frontend.

3. **Los permisos se cargan al login**: Se guardan en `localStorage` como parte del objeto `user`. NO se re-consultan en cada request.

4. **El code del rol se normaliza**: El `RolesGuard` normaliza los códigos (quita acentos, uppercase, reemplaza caracteres especiales por `_`) antes de comparar.

5. **Los roles de tipo 'sistema' NO se pueden eliminar** vía API.

6. **Cada permiso pertenece a un módulo**: El campo `id_module` en `permission` agrupa permisos por módulo funcional.

7. **Los módulos accesibles se calculan al login**: Se derivan del primer segmento del código de permiso (ej: `gestion-legal` de `gestion-legal.defensa-judicial.create`).
