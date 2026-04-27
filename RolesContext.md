# RolesContext — Guía de Roles y Abogados en Gestión Legal

Esta guía documenta todo lo necesario para entender, mantener y extender el sistema de roles del módulo **Defensa Judicial (Gestión Legal)**, de modo que cualquier chat o desarrollador pueda continuar sin tener que redescubrir lo ya implementado.

---

## 1. Los 4 roles de Gestión Legal

Definidos en `db/migrations/210_create_roles_gestion_legal.sql`:

| Código | Descripción |
|--------|-------------|
| `JEFE_GESTION_LEGAL` | Jefe del área. Puede ver todo el kanban, reasignar expedientes, filtrar por abogado. |
| `SECRETARIADO_GESTION_LEGAL` | Secretariado. Similar al jefe en visibilidad. |
| `MONITOREO_GESTION_LEGAL` | Monitoreo. Acceso de lectura/seguimiento. |
| `RESUELVE_GESTION_LEGAL` | **El abogado asignado a expedientes.** Es el único que aparece en los dropdowns de selección de abogado. |

Para crear un usuario que aparezca en la lista de abogados, **debe tener el rol `RESUELVE_GESTION_LEGAL`** en el auth-service.

---

## 2. Arquitectura de servicios (qué archivo es el real)

El módulo usa **Module Federation**. Los componentes están en:

```
apps/mfe-gestion-legal/src/components/modulos/
```

Sus imports de servicios resuelven así:

```
../../../../services/api/  →  apps/services/api/   ← ARCHIVOS REALES
```

Los archivos en `apps/mfe-gestion-legal/services/api/` y `apps/shell/src/services/api/` son re-exports o copias secundarias. **Edita siempre `apps/services/api/`** para que los cambios tengan efecto en producción/bundle.

---

## 3. Cómo funciona el dropdown de abogados ahora

### Antes (incorrecto)
Los abogados se obtenían de la tabla `legal_management.abogados` del propio schema del servicio legal:

```
GET localhost:3008/abogados   →  tabla hardcodeada del schema legal_management
```

Esto mostraba una lista fija que no reflejaba los usuarios reales del sistema.

### Ahora (correcto)
Los abogados se obtienen del **auth-service**, filtrando los usuarios con rol `RESUELVE_GESTION_LEGAL`:

```
GET localhost:3001/auth/api/v1/users?status=active&limit=1000
→ filtra client-side por roles que contengan "resuelve"
→ devuelve solo usuarios con RESUELVE_GESTION_LEGAL
```

### Flujo completo

```
Componente
  └─ legalService.getAbogados()
       └─ apps/services/api/legal.service.ts
            └─ authService.getAbogadosRolResuelve()
                 └─ apps/services/api/authService.ts
                      └─ GET /auth/api/v1/users?status=active&limit=1000
                           └─ filtra por rol "resuelve" client-side
```

---

## 4. Cambios realizados en el frontend

### `apps/services/api/authService.ts`

Se agregó el método `getAbogadosRolResuelve()` y la interfaz `AbogadoResuelve`:

```typescript
async getAbogadosRolResuelve(): Promise<AbogadoResuelve[]> {
  const response = await apiClient.get<{ data: any[]; meta: any } | any[]>(
    '/auth/api/v1/users',          // hardcoded: API_ENDPOINTS.AUTH.BASE es undefined en el bundle MFE
    { status: 'active', limit: 1000 }
  );
  const users = Array.isArray(response) ? response : (response?.data ?? []);
  return users
    .filter((u: any) => {
      const roles: any[] = u.user?.roles ?? u.roles ?? [];  // backend anida roles en u.user.roles
      return roles.some((r: any) => {
        const code = (r.code ?? '').toLowerCase();
        const name = (r.name ?? '').toLowerCase();
        return code.includes('resuelve') || name.includes('resuelve');
      });
    })
    .map((u: any) => ({
      id: u.user?.id_user ?? u.id_user ?? u.id,
      nombreCompleto: u.full_name ?? `${u.first_name ?? ''} ${u.last_name ?? ''}`.trim(),
      nombre:         u.full_name ?? `${u.first_name ?? ''} ${u.last_name ?? ''}`.trim(),
      email: u.email ?? '',
    }));
}

export interface AbogadoResuelve {
  id: string;
  nombreCompleto: string;
  nombre: string;
  email: string;
}
```

> **Por qué se filtra client-side:** El backend filtra usuarios por `roles.id` (UUID), no por `role=resuelve`. Pasar el nombre como query param no funciona. La solución es traer todos los activos y filtrar en el cliente.

> **Por qué se usa la ruta hardcoded `/auth/api/v1/users`:** `API_ENDPOINTS.AUTH.BASE` es `undefined` al momento de inicialización del bundle MFE (Module Federation evalúa el módulo antes de que el host configure los endpoints). Hardcodear la ruta es la solución correcta aquí.

> **Estructura de respuesta del backend:** `toPersonResponseDto` devuelve `{ first_name, last_name, full_name, email, user: { id_user, roles: [...] } }`. Los roles están anidados en `u.user.roles`, no en `u.roles`.

### `apps/services/api/legal.service.ts`

Se reemplazaron `getAbogados()` y `getAbogadosDashboard()` para delegar al auth-service:

```typescript
import { authService } from './authService';

async getAbogados(): Promise<any[]> {
  return authService.getAbogadosRolResuelve();
}

async getAbogadosDashboard(): Promise<any[]> {
  return authService.getAbogadosRolResuelve();
}
```

### Componentes afectados

Se eliminó el filtro `.filter((a: any) => a.estado === 'ACTIVO')` en los componentes que usan abogados, porque `AbogadoResuelve` no tiene campo `estado` (el backend ya filtra por `status=active`).

Los dropdowns de abogado están en:
- `ModalNuevaDemandaRESTAURADO.tsx` — crear/editar demanda
- `ModalExpedienteConsulta.tsx` — reasignar abogado en expediente
- `ModuloDefensaJudicialV3.tsx` — filtro kanban (solo jefe/secretariado)
- Modales de audiencias y actuaciones — dropdown de abogado asignado

---

## 5. Cambio en el backend

### `backend/auth-service/src/auth/authorization.constants.ts`

El endpoint `GET /users` está protegido por `@Roles(...AUTH_READ_ROLES)`. Los 4 roles de gestión legal no estaban incluidos, causando **403 Forbidden** para cualquier usuario del módulo.

Se agregaron los 4 roles:

```typescript
export const AUTH_READ_ROLES = [
  'SUPER_ADMIN',
  'ADMIN',
  'CONTROL_INTERNO',
  'JEFE_OCI',
  'JEFE_CONTROL_INTERNO',
  'AUDITOR_LIDER',
  'GESTION_LEGAL',
  'COORDINADOR_CERT_LABORAL',
  // Roles de Gestión Legal — agregados para permitir GET /users
  'JEFE_GESTION_LEGAL',
  'MONITOREO_GESTION_LEGAL',
  'SECRETARIADO_GESTION_LEGAL',
  'RESUELVE_GESTION_LEGAL',
] as const;
```

---

## 6. Cómo crear usuarios para probar cada rol

1. Ir al panel de administración del auth-service (o ejecutar un script SQL).
2. Crear el usuario con los datos requeridos.
3. Asignarle **uno de los 4 roles** según la función:
   - `RESUELVE_GESTION_LEGAL` → aparecerá en todos los dropdowns de abogado
   - `JEFE_GESTION_LEGAL` → podrá ver el filtro kanban por abogado y reasignar expedientes
   - `SECRETARIADO_GESTION_LEGAL` → mismo acceso que jefe en visibilidad
   - `MONITOREO_GESTION_LEGAL` → acceso de solo lectura/seguimiento

4. Hacer login con ese usuario → verá el módulo Defensa Judicial con los permisos correspondientes.
5. Si el usuario tiene `RESUELVE_GESTION_LEGAL`, aparecerá en el dropdown "Seleccione un abogado..." de todos los formularios del módulo.

---

## 7. Checklist para extender a otros submódulos de Gestión Legal

Cuando se agregue un nuevo submodulo o funcionalidad que requiera selección de abogado o control por roles:

- [ ] **Dropdown de abogado**: usar `legalService.getAbogados()` — ya delega a `getAbogadosRolResuelve()` automáticamente.
- [ ] **Control de visibilidad por rol**: usar `authService.hasRole('JEFE_GESTION_LEGAL')` o `authService.hasAnyPermission([...])`.
- [ ] **Nuevo endpoint backend que use roles**: verificar que los 4 roles de GL estén en el guard correspondiente (como se hizo con `AUTH_READ_ROLES`).
- [ ] **Nuevo rol**: agregarlo en una migración SQL nueva, luego agregarlo al guard en `authorization.constants.ts` o donde corresponda.
- [ ] **Editar siempre `apps/services/api/`**, no `apps/mfe-gestion-legal/services/api/` ni `apps/shell/src/services/api/`.

---

## 8. Resumen de archivos clave

| Archivo | Propósito |
|---------|-----------|
| `apps/services/api/authService.ts` | Servicio real de auth. Aquí vive `getAbogadosRolResuelve()`. |
| `apps/services/api/legal.service.ts` | Servicio real de legal. `getAbogados()` delega a auth. |
| `backend/auth-service/src/auth/authorization.constants.ts` | `AUTH_READ_ROLES` — roles que pueden llamar `GET /users`. |
| `db/migrations/210_create_roles_gestion_legal.sql` | Definición de los 4 roles de GL en base de datos. |
| `apps/mfe-gestion-legal/src/components/modulos/` | Componentes del módulo Defensa Judicial. |
