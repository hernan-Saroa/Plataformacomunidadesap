# academic-schedule-service — Programación Académica

Microservicio de la épica **EFDS-1366**. Expone el catálogo académico, la gestión
de grupos y el horario de cada grupo.

- **Puerto:** 3013 · **Ruta en el gateway:** `programacion-academica`
- **Esquema propio:** `"academic-schedule"` (grupos y franjas horarias)
- **Esquema que consume en solo lectura:** `academic_work_plan` (catálogo SNIES)

---

## Levantar en local, sin Docker

```bash
cp .env.example .env          # ajuste DB_PASS a su Postgres local
npm install
npm run db:migrate            # crea el esquema y carga el catálogo real
npm run start:dev             # servicio en http://localhost:3013
```

Comprobación rápida:

```bash
curl http://localhost:3013/health
```

Para levantarlo junto a los demás servicios, desde la raíz del monorepo:

```bash
npm run dev:backend -- --services=academic-schedule-service
```

El orquestador descubre los servicios por carpeta y ejecuta `start:dev`, así que
este servicio ya queda incluido sin registrarlo en ningún lado.

### El microfront

```bash
npm run dev -w @esap-mfe/programacion-academica   # http://localhost:3116
npm run dev                                       # el shell, en paralelo
```

El shell resuelve el remoto en desarrollo contra `localhost:3116`, según
`scripts/mfe.config.mjs`. No hace falta tocar la configuración del shell.

---

## La base de datos

El contenedor `superapp-db` se publica en el **55432**, no en el 5432, y así queda
versionado en `docker-compose.dev.yml`. El valor por defecto de `.env.example` ya
apunta ahí: no hace falta ningún paso manual.

```bash
docker compose -f docker-compose.dev.yml up -d db
npm run db:migrate
```

### ⚠️ Por qué 55432 y no 5432

Un **PostgreSQL instalado como servicio de Windows** se queda con el 5432 a nivel
de sistema y **tapa** el mapeo del contenedor: `docker ps` muestra la publicación,
pero las conexiones llegan al Postgres local.

El síntoma es traicionero: la base existe, autentica o no según el caso, y el
módulo aparece **vacío sin error claro**. Publicar en 55432 elimina la disputa.
**No lo devuelva a 5432.**

Para apuntar a un PostgreSQL local, cambie host y puerto en `.env` y corra
`npm run db:migrate` contra él: el runner es idempotente y crea todo.

## Migraciones

```bash
npm run db:status     # qué está pendiente, sin aplicar nada
npm run db:migrate    # aplica lo pendiente
```

Viven en `db/migrations/` y se aplican **en orden numérico**. El script lleva su
propio registro en `public.academic_schedule_migrations`, por nombre de archivo,
así que reejecutarlo es seguro. Cada migración corre en su propia transacción: si
una falla, no deja el esquema a medias.

> El runner por microservicio del repo (`cmd_db_migrate` en `deploy.*.sh`) usa
> `docker exec superapp-db` y por eso no sirve para el flujo local. `scripts/migrate.mjs`
> cubre ese caso con el cliente `pg` que ya es dependencia: no exige `psql` en el PATH.

### Qué hace cada una

| Migración | Contenido |
|---|---|
| 001–002 | Esquema base y registro del módulo en `auth` (del enabler EFDS-1367) |
| 003 | `franja_horaria` referencia el catálogo real: `bigint` + FK cross-schema |
| 004 | Permisos de programación por nivel (RN-08) |
| 005 | Tabla `grupo`: instancia independiente de programación (RN-11) |
| 006 | Reencauce `asignatura → grupo → franja` |
| 007 | **Catálogo real de la ESAP**: 14 programas, 427 asignaturas, 16 semestres |
| 008 | `tipo_sesion`, jornada y periodo propio del grupo |
| 009 | Roles de decanatura y asignación de permisos |
| 010 | Grupo y horario sembrados para demostración (`observaciones = 'DEMO'`) |

Para quitar los datos de demostración:

```sql
DELETE FROM "academic-schedule".grupo WHERE observaciones = 'DEMO';
-- las franjas caen solas por el ON DELETE CASCADE
```

---

## Autorización

El servicio exige **token válido**: hay un guard global (`JwtAuthGuard`) que
rechaza con 401 cualquier petición sin token, salvo `/health`. Se agregó porque el
puerto 3013 se publica al host en los tres entornos y sin él la API quedaba
accesible sin autenticar (EFDS-1791).

Ya con el token validado, la identidad efectiva **llega por cabeceras del gateway** (`x-user-id`, `x-user-roles`
separadas por coma), **no** por `req.user`. Los permisos se resuelven siempre en
el servidor contra `auth.role_permissions`; nunca se confía en algo que envíe el
cliente.

Roles con acceso (migración 009):

| Rol | Ve |
|---|---|
| `PROGRAMADOR_PREGRADO` | Catálogo de pregrado + disponibilidad docente |
| `PROGRAMADOR_POSGRADO` | Catálogo de posgrado + disponibilidad docente |
| `SUBDIRECTOR_ACADEMICO` | Ambos niveles |

Es **fail-closed**: sin permisos no se ve ningún nivel. RN-08 segrega el
**catálogo**, no la disponibilidad de docentes — esta última la ven ambos
perfiles, y es lo que hará posible el bloqueo transversal de franjas (RN-07).

Para probar endpoints sin gateway:

```bash
curl -H "Authorization: Bearer <token>" \
     -H "x-user-roles: PROGRAMADOR_PREGRADO" \
     "http://localhost:3013/catalogo/programas?nivel=pregrado"
```

---

## Endpoints

| Método | Ruta | Qué hace |
|---|---|---|
| `GET` | `/health` | Estado del servicio |
| `GET` | `/catalogo/programas?nivel=` | Programas visibles según permisos |
| `GET` | `/catalogo/programas/:id/asignaturas` | Catálogo agrupado por semestre |
| `GET` | `/grupos?asignatura=` | Grupos de una asignatura |
| `POST` | `/grupos` | Crea 1..N grupos |
| `PATCH` `DELETE` | `/grupos/:id` | Actualiza o elimina |
| `GET` | `/horarios?grupo=` | Sesiones del grupo |
| `POST` | `/horarios` | Crea una sesión |
| `DELETE` | `/horarios/:id` | Elimina una sesión |
| `PUT` | `/horarios/grupo/:id/periodo` | Ciclo de clases del grupo |

---

## Pruebas

```bash
npm test
```

Incluye pruebas **contra base real** (`catalogo.integracion.spec.ts`), que se
omiten solas si no hay base disponible. Existen porque tres defectos de este
módulo se escaparon a los mocks: un nombre de tabla inexistente, un valor por
defecto del ORM y la identidad del gateway. **Los mocks no ven la frontera.**

---

## Notas de diseño

- **El catálogo es de solo lectura.** Las entidades de `academic_work_plan` se
  mapean sin escritura y `synchronize` está en `false`. El dato es autoritativo
  del SNIES (RN-01, RN-02).
- **Las horas no se calculan aquí.** `horas_clase` y `horas_pta` se exponen tal
  como vienen. No es créditos × 16: el factor es 16 en pregrado y
  especializaciones y **12 en maestrías**, con excepciones de horas fijas de la
  Circular 003.
- **El horario cuelga del grupo**, no de la asignatura. Es lo que permite que dos
  grupos de la misma asignatura tengan horarios distintos (RN-11).
- **`tipo_sesion` ≠ `modalidad`.** El primero es de la sesión y lo define el
  programador; el segundo es dato maestro del SNIES. Una asignatura virtual puede
  tener sesiones presenciales.
