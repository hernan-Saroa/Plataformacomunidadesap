# Arquitectura de IDs: Auth ↔ Expedientes (Defensa Judicial)

> Documento técnico para debugging de filtros de abogado y asignación de expedientes.
> Aplica principalmente al módulo `RESUELVE_GESTION_LEGAL` en defensa judicial.

---

## El problema central

Existen **tres espacios de UUID distintos** que conviven en este sistema y que NO son intercambiables directamente:

| Espacio | Campo | Origen | Ejemplo de uso |
|---|---|---|---|
| Auth UUID (`id_user`) | `user.id_user` | Auth Service — tabla `user` | JWT `sub`, `abogadoSustanciador` en DB |
| Person UUID (`id_person`) | `person.id_person` | Auth Service — tabla `personas` | Login response `user.id` (a veces) |
| Abogado UUID | `abogado.id` | Legal Service — tabla `abogados` | Tabla de referencia separada, sin FK a auth |

Cuando un componente frontend compara un ID de una fuente con uno de otra fuente sin saber de qué espacio vienen, el match falla silenciosamente.

---

## Flujo completo de cómo se guarda `abogadoSustanciador`

### 1. Login → JWT

**Archivo:** `backend/auth-service/src/auth/auth.service.ts` (aprox. línea 293)

```typescript
const payload = {
  sub: user.id_user,   // ← Auth UUID, NO el person UUID
  username: user.username,
  email: user.person?.email,
  name: user.person?.full_name,
  roles: rolesCodes,
};
```

El JWT lleva `sub = id_user`. Ese valor es el que los guardias de autenticación exponen como `userId` a los controladores.

### 2. Controlador → guarda en DB

**Archivo:** `backend/legal-management-service/src/controllers/expediente.controller.ts` (aprox. línea 64–85)

```typescript
// Si el rol es ABOGADO → auto-asignación
if (userRole === 'ABOGADO') {
  data.abogadoSustanciador = userId;  // ← userId viene del JWT.sub = id_user
}
// Si es JEFE/ADMIN → usa el ID enviado en el body
if (['JEFE_OFICINA', 'ADMIN'].includes(userRole)) {
  data.abogadoSustanciador = body.abogadoId ?? userId;
}
```

**Conclusión:** el campo `abogadoSustanciador` en la DB almacena el **Auth UUID (`id_user`)** del abogado asignado.

### 3. Entidad en DB

**Archivo:** `backend/legal-management-service/src/entities/expediente.entity.ts`

```typescript
@Column({ name: 'abogado_sustanciador', nullable: true })
abogadoSustanciador: string;  // varchar, sin FK constraint, almacena id_user del auth

@Column('text', { name: 'abogados_anteriores', array: true, default: '{}' })
abogadosAnteriores: string[];  // historial de id_user anteriores
```

**Importante:** no hay FK entre `abogado_sustanciador` y ninguna tabla del auth service ni de la tabla `abogados`. Es un string libre.

---

## Cómo el frontend obtiene la lista de abogados

### Endpoint utilizado

`GET /auth/api/v1/users?status=active&limit=1000`

El auth service devuelve un array de objetos con esta estructura aproximada:

```jsonc
{
  "id": "9cd2b6d9-...",          // UUID de la persona (id_person)
  "full_name": "Pepe Abogado",
  "email": "pepe@esap.co",
  "user": {
    "id_user": "158ceb9f-...",   // Auth UUID (el que va en JWT y en DB)
    "username": "pepe.abogado"
  },
  "roles": [{ "code": "RESUELVE_GESTION_LEGAL", "name": "Resuelve Gestión Legal" }]
}
```

### Mapeo en el frontend

**Archivo:** `apps/services/api/authService.ts` → `getAbogadosRolResuelve()`

```typescript
{
  id: u.user?.id_user ?? u.id_user ?? u.id,  // Prioriza Auth UUID
  rawId: u.id,                                 // Person UUID como fallback
  authId: u.user?.id_user ?? u.id_user ?? u.id,
  nombre: u.full_name ?? ...,
  email: u.email ?? u.person?.email ?? '',
}
```

El campo `id` del abogado mapeado **debería ser el Auth UUID** (`id_user`), que es el mismo que está guardado en `abogadoSustanciador` en la DB.

---

## Cómo el frontend obtiene el usuario logueado (`currentUser`)

**Archivo:** `apps/services/api/authService.ts` → `getCurrentUser()`

```typescript
getCurrentUser(): AuthUser | null {
  const userData = localStorage.getItem(config.STORAGE_KEYS.USER_DATA);
  return userData ? JSON.parse(userData) : null;
}
```

El objeto se guarda durante el login desde `saveUserData(response.user)`. El problema es que la interfaz TypeScript declara `AuthUser` con campos camelCase (`email`, `fullName`, `firstName`) pero **el backend puede devolver snake_case** (`full_name`, `first_name`, `person.email`). El objeto crudo en localStorage puede tener esta forma:

```jsonc
{
  "id": "4d967290-...",          // Puede ser id_person O id_user según la versión del endpoint
  "person": {
    "first_name": "Carlos",
    "last_name": "Vargas",
    "email": "cvargas@esap.co"   // Aquí está el email, NO en currentUser.email
  },
  "roles": [...]
}
```

Si el login response devuelve `id = id_person` en lugar de `id = id_user`, entonces `currentUser.id ≠ abogado.id` y el filtro falla.

---

## Mapa de archivos involucrados

### Backend

```
backend/
├── auth-service/
│   ├── src/auth/auth.service.ts          # Genera JWT con sub=id_user
│   ├── src/users/user.entity.ts          # Entidad User: id_user, id_person
│   └── src/users/person.entity.ts        # Entidad Person: id_person, full_name, email
└── legal-management-service/
    ├── src/auth/jwt.strategy.ts           # Extrae userId=payload.sub del JWT
    ├── src/entities/expediente.entity.ts  # abogadoSustanciador: string (sin FK)
    ├── src/controllers/expediente.controller.ts  # Auto-asigna abogadoSustanciador=userId
    ├── src/services/expediente.service.ts # Mueve UUIDs a abogadosAnteriores
    ├── src/dtos/create-expediente.dto.ts  # abogadoSustanciadorId?: string
    └── src/dtos/update-expediente.dto.ts  # abogadoSustanciador?: string
```

### Frontend

```
apps/
├── services/api/authService.ts           # getAbogadosRolResuelve() — fuente de verdad para abogados
├── mfe-gestion-legal/services/api/
│   └── authService.ts                    # Copia legacy (misma lógica)
├── shell/src/services/api/
│   └── authService.ts                    # Copia del shell (misma lógica)
└── mfe-gestion-legal/src/components/modulos/
    ├── ModuloDefensaJudicialV3.tsx        # Filtro de expedientes por rol RESUELVE
    ├── ModalNuevaDemandaRESTAURADO.tsx    # Guarda abogadoSustanciador como NOMBRE (bug conocido)
    └── ModalExpediente.tsx               # Guarda abogadoSustanciador como UUID al reasignar
```

**Nota:** `apps/mfe-gestion-legal/src/` importa desde `../../../../services/api/authService`, que resuelve a `apps/services/api/authService.ts`. Esa es la copia activa.

---

## Inconsistencia conocida en cómo se guarda el abogado

| Flujo | Campo guardado | Valor almacenado | Problema |
|---|---|---|---|
| Crear demanda (`ModalNuevaDemandaRESTAURADO`) | `abogadoSustanciador` | **Nombre del abogado** (string) | No permite match por UUID |
| Reasignar (`ModalExpediente`) | `abogadoSustanciador` | **UUID del abogado** | Correcto, pero UUID puede ser id_user o id de tabla abogados según flujo |
| Auto-asignación (backend controller) | `abogadoSustanciador` | **Auth UUID (`id_user`)** | Correcto, es el UUID del JWT |

La lógica de resolución en el frontend intenta manejar los tres casos:

```typescript
// En ModuloDefensaJudicialV3.tsx → mapping de abogadoAsignado
if (exp.abogadoSustanciador && abogadosMap.has(exp.abogadoSustanciador)) {
  return abogadosMap.get(exp.abogadoSustanciador);  // caso UUID → nombre
}
if (exp.abogado?.nombreCompleto) return exp.abogado.nombreCompleto; // caso objeto
if (typeof exp.abogadoSustanciador === 'string' && exp.abogadoSustanciador.length < 30) {
  return exp.abogadoSustanciador;  // caso nombre directo (fallback)
}
```

---

## Cómo funciona el filtro de rol RESUELVE

En `ModuloDefensaJudicialV3.tsx → loadExpedientes()`:

1. Se cargan los expedientes y la lista de abogados RESUELVE en paralelo.
2. Si `hasRole('RESUELVE_GESTION_LEGAL')` → se intenta encontrar el abogado del usuario logueado en la lista.
3. Se usa matching múltiple (por `id`, `rawId`, `authId`, email, nombre) porque los UUIDs no son confiables entre endpoints.
4. Si se encuentra → se filtran solo los expedientes donde `abogadoSustanciador` o `abogadoAsignado` coincide.
5. Si **no** se encuentra en la lista (el usuario tiene rol RESUELVE pero no aparece en `/auth/api/v1/users` filtrado) → se intenta filtrar directamente comparando `abogadoSustanciador` contra todos los IDs del `currentUser`.

---

## Checklist de debugging cuando el filtro no funciona

### Paso 1 — Verificar que `abogadoSustanciador` en DB tiene el Auth UUID correcto

```sql
SELECT radicado, abogado_sustanciador FROM expedientes WHERE abogado_sustanciador IS NOT NULL LIMIT 10;
```

Compara ese UUID contra `id_user` en el auth service:

```sql
-- En auth-service DB
SELECT id_user, id_person FROM "user" WHERE id_user = '<uuid-del-expediente>';
```

### Paso 2 — Verificar qué ID devuelve el login response

En el navegador, después de login:
```javascript
JSON.parse(localStorage.getItem('esap_user_data'))
// Observar: ¿tiene .id? ¿.id_user? ¿.person.email?
```

### Paso 3 — Verificar que getAbogadosRolResuelve mapea bien

En consola del navegador buscar los logs `[DEBUG RESUELVE]` que incluyen:
- `currentUser raw:` — estructura real del objeto en localStorage
- `abogadosData:` — lista con sus IDs
- `abogadoSustanciador en expedientes:` — UUIDs reales en los expedientes
- `myAbogado encontrado:` — resultado del match

### Paso 4 — Verificar el filtro de roles en getAbogadosRolResuelve

El filtro actual excluye usuarios que tengan SECRETARIADO o MONITOREO además de RESUELVE. Si el usuario logueado tiene doble rol, será excluido de la lista y el match fallará.

```typescript
// apps/services/api/authService.ts → getAbogadosRolResuelve()
const hasExcludedRole = roles.some((r: any) => {
  const code = (r.code ?? '').toUpperCase();
  return code === 'SECRETARIADO_GESTION_LEGAL' || code === 'MONITOREO_GESTION_LEGAL';
});
return hasResuelve && !hasExcludedRole;
```

### Paso 5 — Verificar JWT Strategy

**Archivo:** `backend/legal-management-service/src/auth/jwt.strategy.ts`

```typescript
async validate(payload: any) {
  return {
    userId: payload.sub,  // ← Este es el id_user que se guarda en abogadoSustanciador
    ...
  };
}
```

`payload.sub` DEBE ser `id_user`, no `id_person`. Verificar que el auth service genera el JWT con `sub = id_user`.

---

## Solución recomendada a largo plazo

1. **Agregar FK explícita** entre `expedientes.abogado_sustanciador` y la tabla `user.id_user` del auth service (o mantenerlo como referencia lógica documentada).

2. **Unificar el campo ID** en el login response: que la respuesta de login siempre incluya `id_user` como campo explícito además de `id`, para que el frontend pueda usar el Auth UUID sin ambigüedad.

3. **Corregir `ModalNuevaDemandaRESTAURADO`**: cambiar `value={abog.nombre}` a `value={abog.id}` para que siempre se guarde el Auth UUID al crear, igual que en la reasignación.

4. **Endpoint dedicado en el backend**: exponer un endpoint `/legal/api/v1/expedientes/mis-expedientes` que filtre por el Auth UUID del JWT, eliminando la lógica de filtrado en el frontend.
