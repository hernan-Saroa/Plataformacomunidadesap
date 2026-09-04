# Guía de pruebas — Módulo de Programación Académica

Cómo levantar el módulo y verificarlo por su cuenta. Cubre las HU
**EFDS-1368, EFDS-1369, EFDS-1370 y EFDS-1371** sobre la rama
`feat/habilitar-modulo-programacion-academico`.

Todo lo que aparece aquí fue ejecutado contra esta rama, no deducido del código.
Los valores esperados son los que devolvió el servicio.

> **Qué NO cubre.** La asignación de docentes (EFDS-1372) vive en otra rama y no
> está aquí. La lista completa de lo no implementado está al final: léala antes
> de reportar un bug, porque varias ausencias son deliberadas.

---

## 1. Requisitos

| Pieza | Cómo se verifica |
|---|---|
| Node 20+ | `node -v` |
| Docker Desktop **corriendo** | `docker ps` responde sin error |
| Contenedor `superapp-db` arriba | `docker ps --filter name=superapp-db` |

### El puerto de la base es 55432, no 5432

El contenedor publica `55432 -> 5432`. Si tiene PostgreSQL instalado como
servicio de Windows, ese servicio se queda con el 5432 **a nivel de sistema** y
tapa el mapeo: `docker ps` muestra la publicación, la conexión entra, pero llega
a la base equivocada. El síntoma es desconcertante — las tablas no existen o el
catálogo aparece vacío, y no hay ningún error de conexión.

Por eso el `.env` usa `DB_PORT=55432`. Si algo no cuadra con los datos, confirme
primero contra qué base está hablando:

```bash
docker exec superapp-db psql -U postgres -d esap_db -Atc "SELECT current_database();"
```

---

## 2. Levantar el servicio

```bash
cd backend/academic-schedule-service
cp .env.example .env      # ajuste DB_PASS con la clave de su contenedor
npm install
npm run db:migrate        # aplica 001..010
npm run start:dev         # queda escuchando en 3013
```

`.env` mínimo:

```
PORT=3013
DB_HOST=localhost
DB_PORT=55432
DB_NAME=esap_db
DB_USER=postgres
DB_PASS=<la de su contenedor>
JWT_SECRET=esap-super-secret-jwt-key-2024
```

Comprobación:

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3013/health   # 200
```

`npm run db:status` lista las migraciones aplicadas. El runner lleva su propio
registro en `public.academic_schedule_migrations` y es idempotente: volver a
correr `db:migrate` sobre una base ya migrada no duplica datos.

---

## 3. Conseguir una identidad con rol `PROGRAMADOR_PREGRADO`

**La base de desarrollo no trae usuarios.** `auth."user"` y `auth.user_roles`
están en cero. Los roles sí existen (migración 009), pero no hay a quién
asignárselos. Esto sorprende a cualquiera que espere "entrar con su cuenta".

Para probar la API hay dos caminos. El primero es el que está verificado.

### Camino A — token de desarrollo (para probar la API)

El servicio valida el token con `JWT_SECRET` y lee los roles del claim `roles`.
No consulta la tabla de usuarios. Con el secreto de desarrollo puede emitir uno:

```bash
cd backend/academic-schedule-service
node -e "const j=require('jsonwebtoken');process.stdout.write(j.sign({sub:'11111111-1111-1111-1111-111111111111',username:'qa.pregrado',email:'qa@esap.edu.co',roles:['PROGRAMADOR_PREGRADO']},'esap-super-secret-jwt-key-2024',{expiresIn:'8h'}))"
```

Guárdelo en una variable y úselo en todo lo que sigue:

```bash
PRE=$(node -e "...")                        # el comando de arriba
curl -s -H "Authorization: Bearer $PRE" "http://localhost:3013/catalogo/programas?nivel=pregrado"
```

Cambie `PROGRAMADOR_PREGRADO` por `PROGRAMADOR_POSGRADO` para el perfil de
posgrado. **Esto sirve solo en desarrollo**: depende del secreto por defecto.

### Camino B — usuario real (para probar por la interfaz)

Este es el camino del demo. Está verificado de extremo a extremo.

**Credenciales del usuario de pruebas:**

```
usuario:  qa.programacion
clave:    Programacion2026*
rol:      PROGRAMADOR_PREGRADO
```

Si la base ya lo tiene, salte al §5. Si no, créelo con el endpoint del
auth-service — **nunca con un `INSERT` a mano**: la contraseña se guarda como
hash bcrypt y el servicio es quien sabe generarlo.

```bash
curl -s -X POST http://localhost:3001/new-person \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Ana Lucia",
    "lastName": "Programadora QA",
    "documentNumber": "1020304050",
    "email": "qa.programacion@esap.edu.co",
    "username": "qa.programacion",
    "password": "Programacion2026*",
    "roles": ["Programador(a) de Pregrado"]
  }'
```

Dos detalles que ahorran tiempo:

- `POST /new-person` es **público**. No necesita un administrador previo, lo cual
  importa porque en una base recién migrada no hay ningún usuario con quien
  autenticarse para crear el primero.
- El campo `roles` va por **nombre**, no por código: `Programador(a) de Pregrado`,
  no `PROGRAMADOR_PREGRADO`. Con el código, el usuario se crea **sin rol** y
  después todo responde 403 sin explicar por qué.

Verifique el vínculo:

```sql
SELECT u.username, r.code
FROM auth.user_roles ur
JOIN auth."user" u ON u.id_user = ur.id_user
JOIN auth.role r ON r.id = ur.id_rol
WHERE u.username = 'qa.programacion';
```

### Levantar el stack completo (necesario solo para el camino B)

La UI no habla con el 3013 directamente. Levante todo por compose, que además es
como se despliega:

```bash
docker compose -f docker-compose.dev.yml up -d db auth-service api-gateway academic-schedule-service frontend
```

> ⚠️ **No levante estos servicios "a mano" con `npm run start:dev`.** Los `.env`
> locales de cada microservicio **no están alineados entre sí**: el
> `academic-schedule-service` apunta al contenedor (`55432`) y el auth-service al
> PostgreSQL de Windows (`5432`), que son **bases distintas** — y además usan
> `JWT_SECRET` distintos, así que el token del login sale rechazado con 401.
> Por compose los tres comparten `DB_HOST: db` y el mismo secreto, y no hay
> desajuste.

---

## 4. Verificar los datos base antes de probar

```bash
docker exec superapp-db psql -U postgres -d esap_db -Atc "
SELECT 'programas   = '||count(*) FROM academic_work_plan.programa
UNION ALL SELECT 'asignaturas = '||count(*) FROM academic_work_plan.asignatura
UNION ALL SELECT 'semestres   = '||count(*) FROM academic_work_plan.ubicacion_semestral;"
```

Esperado:

```
programas   = 14
asignaturas = 427
semestres   = 16
```

Si no dan estos números, no siga: está contra otra base (vea §1) o falta correr
`db:migrate`. Todo lo demás va a fallar de formas difíciles de interpretar.

### El grupo DEMO

La migración 010 siembra un grupo de demostración con **2 sesiones**:

```bash
docker exec superapp-db psql -U postgres -d esap_db -Atc "
SELECT count(*) FROM \"academic-schedule\".franja_horaria f
JOIN \"academic-schedule\".grupo g ON g.id_grupo = f.id_grupo
WHERE g.observaciones = 'DEMO';"
```

Debe responder **2** — grupo 1 de `ASIG-00026` (Derecho Constitucional):
lunes 11:00–13:00 presencial y jueves 14:00–16:00 mediada por tecnología.

> ⚠️ **Ensayar altera los datos.** Este grupo aparece de primero en el listado,
> así que es el que uno toca sin querer al probar. Si agrega una sesión ahí, el
> conteo queda en 3 y el escenario deja de ser el sembrado. Ya pasó una vez.
>
> **Corra este conteo antes y después de cada ensayo.** Si no da 2, limpie:
>
> ```sql
> DELETE FROM "academic-schedule".franja_horaria f
> USING "academic-schedule".grupo g
> WHERE g.id_grupo = f.id_grupo AND g.observaciones = 'DEMO'
>   AND NOT (f.dia_semana = 'LUNES'  AND f.hora_inicio = '11:00')
>   AND NOT (f.dia_semana = 'JUEVES' AND f.hora_inicio = '14:00');
> ```
>
> Para sus pruebas cree grupos propios y márquelos (`observaciones: 'QA'`) para
> poder borrarlos de un solo golpe al terminar.

---

## 5. Pruebas por HU

### EFDS-1368 — Selección de catálogo por nivel

**Dónde:** `GET /catalogo/programas?nivel=pregrado|posgrado`, y en la UI el
selector de programa.

| Caso | Esperado |
|---|---|
| `nivel=pregrado` con token de pregrado | 200, lista de programas |
| Cada programa trae `horasBasePorCredito` | 16 en pregrado; 12 en maestría |

```bash
curl -s -H "Authorization: Bearer $PRE" "http://localhost:3013/catalogo/programas?nivel=pregrado"
```

El campo `horasBasePorCredito` sale del programa, no de una constante del
código: por eso maestría trae 12 y pregrado 16 (Circular Dispositiva 003/2025).

---

### EFDS-1369 — Consulta de asignatura por código SNIES

**Dónde:** `GET /catalogo/asignaturas/:codigo`, y en la UI "Buscar por código".

#### Las horas no son créditos × 16

Este es el caso que más se malinterpreta. **Dos asignaturas con los mismos 3
créditos devuelven horas distintas:**

| Código | Créditos | `horasClase` | `horasPta` |
|---|---|---|---|
| `ASIG-00146` | 3 | **48** | 144 |
| `ASIG-00001` | 3 | **64** | 192 |

Si el módulo calculara `créditos × 16`, ambas darían 48. No lo hace: las horas
vienen del catálogo, asignatura por asignatura. En el catálogo real, 3 créditos
corresponden a 36, 48 **o** 64 horas de clase según la asignatura.

#### Y las excepciones de horas fijas mandan sobre todo lo demás

| Código | Créditos | `horasPta` | `tipoExcepcion` |
|---|---|---|---|
| `ASIG-00132` | 10 | **384** | `seminario_enfasis` |

384 no se deriva de los 10 créditos por ninguna operación: es el valor fijo de
la Circular 003. Las otras excepciones son `opciones_grado_ap` (20) y
`seminario_opciones_apt` (144).

```bash
curl -s -H "Authorization: Bearer $PRE" http://localhost:3013/catalogo/asignaturas/ASIG-00132
```

> **RN-01/RN-02.** El código SNIES es la llave maestra y lo derivado es de solo
> lectura. El controlador de catálogo **no declara ninguna ruta de escritura**, y
> hay una prueba estructural que lo verifica. La garantía es que la ruta no
> existe, no que un guard la rechace.

---

### EFDS-1370 — Grupos

**Dónde:** `POST /grupos`, `GET /grupos?asignatura=<id>`, `PATCH`, `DELETE`.

#### Varios grupos por asignatura, y el mismo docente en más de uno (RN-11, AC-03)

```bash
AID=$(docker exec superapp-db psql -U postgres -d esap_db -Atc \
  "SELECT id FROM academic_work_plan.asignatura WHERE codigo='ASIG-00001';" | tr -d '\r')

curl -s -X POST http://localhost:3013/grupos \
  -H "Authorization: Bearer $PRE" -H "Content-Type: application/json" \
  -d "{\"idAsignatura\":\"$AID\",\"cantidad\":2,\"observaciones\":\"QA\"}"
```

Esperado: dos grupos, `numeroGrupo` 1 y 2. La numeración es **por asignatura**,
así que arranca en 1 aunque ya existan grupos de otras asignaturas.

Ahora asigne **el mismo** `idDocente` a los dos con `PATCH /grupos/:id`. **Ambos
deben responder 200.** No hay restricción de unicidad docente–asignatura: un
profesor dicta legítimamente dos grupos de la misma materia. Si esto fallara
sería el bug, no al revés.

Limpieza:

```sql
DELETE FROM "academic-schedule".grupo WHERE observaciones = 'QA';
```

Borra en cascada las sesiones del grupo.

---

### EFDS-1371 — Horario

**Dónde:** `POST /horarios`, `GET /horarios?grupo=<id>`, `DELETE /horarios/:id`,
`PUT /horarios/grupo/:id/periodo`. En la UI, la grilla semanal.

#### Franjas arbitrarias: no hay intervalos fijos

```bash
curl -s -X POST http://localhost:3013/horarios \
  -H "Authorization: Bearer $PRE" -H "Content-Type: application/json" \
  -d "{\"idGrupo\":\"$G1\",\"diaSemana\":\"MARTES\",\"horaInicio\":\"11:05\",\"horaFin\":\"12:35\",\"tipoSesion\":\"presencial\"}"
```

Esperado: **201**. Una franja de 11:05 a 12:35 se acepta tal cual. La grilla no
está partida en bloques de 45 o 60 minutos, y la jornada se deriva sola
(`"jornada":"DIURNA"`) en vez de pedírsela al usuario.

#### Solape dentro del mismo grupo: rechazado, y dice contra cuál

Sobre el mismo grupo, cree ahora `MARTES 12:00–13:00`:

```
400  La sesión se cruza con otra del mismo grupo el martes de 11:05:00 a 12:35:00.
```

El mensaje **nombra la sesión en conflicto**. Un "horario inválido" a secas
obligaría a revisar la semana entera a mano para encontrar el choque.

---

## 6. Autorización — RN-08

La segregación por nivel se resuelve **en el servidor** a partir de los roles del
token. Nunca se confía en un nivel enviado por el cliente.

| Caso | Esperado |
|---|---|
| Cualquier ruta **sin token** | `401 {"message":"Unauthorized"}` |
| Token de pregrado → `?nivel=posgrado` | `403` |
| Token de pregrado → `GET /catalogo/asignaturas/ASIG-00267` | `403` |

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3013/catalogo/programas
# 401

curl -s -H "Authorization: Bearer $PRE" "http://localhost:3013/catalogo/programas?nivel=posgrado"
# 403 No tiene permiso para programar el catálogo de posgrado.
```

El tercer caso es el que suele pasarse por alto: `ASIG-00267` es de la Maestría
en DDHH y Posconflicto, y el bloqueo **también aplica pidiéndola por código
directo**, no solo al listar programas. El mensaje explica el motivo:

```
403 La asignatura ASIG-00267 pertenece a un programa de posgrado y no tiene permiso para consultarlo.
```

Un 403 mudo se confunde con "el sistema está caído" y termina en un reporte de
falla en vez de una solicitud de permiso.

> **Sobre el 401.** El guard JWT es global (`APP_GUARD`); solo `/health` es
> público. Vale la pena confirmarlo porque el 3013 se publica en todos los
> ambientes: sin guard, cualquiera con alcance de red al host entraba mandando
> una cabecera de rol falsa.

---

## 7. Recorrido por navegador (camino B)

Con el stack levantado (§3), abra **http://localhost/** e ingrese con
`qa.programacion` / `Programacion2026*`.

| Paso | Qué debe ver |
|---|---|
| 1. Login | Entra al backoffice |
| 2. Sidebar | Aparece **Programación Académica** |
| 3. Abrir el módulo | Carga el micro-frontend |
| 4. Nivel y programa | Solo pregrado. Posgrado no está disponible para este rol |
| 5. Catálogo | Asignaturas del programa por semestre |
| 6. Buscar por código | `ASIG-00132` → 384 h |
| 7. Grupos | Crear uno o varios de una asignatura |
| 8. Horario | Franja 11:05–12:35 se acepta; un solape se rechaza |

### Las rutas del gateway llevan `/api/v1`

El navegador no llama al 3013. Llama a nginx, que reenvía al gateway:

```
http://localhost/services/programacion-academica/api/v1/catalogo/programas?nivel=pregrado
```

El segmento **`/api/v1` es obligatorio** — el gateway enruta como
`/{servicio}/api/v{version}/{ruta}`. Sin él responde **404**, no 401 ni 403:

| Ruta | Resultado |
|---|---|
| `/programacion-academica/catalogo/programas` | 404 |
| `/programacion-academica/api/catalogo/programas` | 404 |
| `/programacion-academica/api/v1/catalogo/programas` | **200** |

Vale la pena tenerlo presente al depurar: **por API directa al 3013 la ruta sin
`/api/v1` funciona igual**, así que un error de prefijo no se ve hasta pasar por
el gateway — es decir, hasta abrir el navegador.

### Cómo viaja la sesión

El login responde con una cookie **HttpOnly** `esap_access_token`; no devuelve el
token en el cuerpo. El servicio la acepta tanto por esa cookie como por
`Authorization: Bearer`. Para reproducir el camino del navegador con `curl`:

```bash
TOK=$(curl -s -i -X POST http://localhost/services/auth/api/v1/login \
  -H "Content-Type: application/json" \
  -d '{"username":"qa.programacion","password":"Programacion2026*"}' \
  | grep -i "^set-cookie: esap_access_token=" | sed 's/.*esap_access_token=//; s/;.*//' | tr -d '\r')

curl -s -H "Cookie: esap_access_token=$TOK" \
  "http://localhost/services/programacion-academica/api/v1/catalogo/programas?nivel=pregrado"
```

Con esa misma sesión, `?nivel=posgrado` responde **403** y sin cookie responde
**401**: RN-08 se aplica igual por la interfaz que por API directa.

---

## 8. Pruebas automatizadas

```bash
cd backend/academic-schedule-service
npm test
```

---

## 9. Qué NO está implementado

Lo siguiente **no es un defecto**: está fuera del alcance de estas cuatro HU.

| Ausente | Dónde va |
|---|---|
| **Asignación de docente con validación** | EFDS-1372, otra rama |
| **Escalafón, vinculación, situación administrativa** | EFDS-1372 |
| **Control de horas del docente** (tope, acumulado) | No implementado |
| **Bloqueo transversal entre grupos** (RN-07) | EFDS-1372 |
| **Gestión de aulas** (capacidad, choque de aula) | No implementado |
| **Ofertas múltiples / réplicas entre territoriales** | No implementado |

Dos precisiones que evitan reportes de bug equivocados:

- **`grupo.idDocente` acepta cualquier UUID.** En esta rama no tiene llave
  foránea ni validación: es un marcador de posición. Que deje guardar un docente
  inexistente, o uno en año sabático, es lo esperado aquí — quien valida es
  EFDS-1372.
- **Dos grupos distintos pueden chocar en horario.** El solape se verifica
  **dentro** de un grupo (§5). El cruce entre grupos de un mismo docente es
  RN-07 y llega con la asignación.

---

## 10. Si algo no cuadra

| Síntoma | Causa habitual |
|---|---|
| Catálogo vacío o tablas ausentes | Está contra el PostgreSQL local, no el contenedor. Use 55432 (§1) |
| `401` con un token recién emitido | `JWT_SECRET` del `.env` distinto del usado al firmar |
| `403` con todo bien configurado | El rol del claim `roles` no coincide con `PROGRAMADOR_PREGRADO` |
| `EADDRINUSE` en 3013 | Quedó un proceso previo: `Stop-Process -Id <pid> -Force` |
| El grupo DEMO tiene 3 sesiones | Un ensayo anterior lo alteró. Restaure con el SQL de §4 |
