# Despliegue — Bugs de QA de Programación Académica (EFDS-2427 … 2435)

Para Henrry. Ronda del 12–13 de noviembre de 2026. Rama de integración: `feature/pa/bugs-qa` → `micro-frontend`.
Los comandos son los de siempre del ambiente (`./deploy.<ambiente>.sh …`); donde dice `<amb>` va `dev`, `qa`, `pre` o `prod`.

## PASO 0 — PRIMERO, antes de cualquier otra cosa: partición de auditoría del mes siguiente

**Por qué:** la tabla `audit.request_logs` es particionada por mes. Si falta la partición del mes en que se escribe, el `audit-service` responde 500 a cada `POST /logs`. Hoy (13 de noviembre) hace falta la de **diciembre de 2026** (`audit.request_logs_2026_12`); si QA o prod no la tienen, **desde el 1 de diciembre cada cambio auditado falla**. Es un defecto de antes de esta ronda, pero esta ronda añade auditoría (interruptor, editar/eliminar/crear sesiones) y la hace visible.

**Qué pasa si falla la auditoría con esta ronda:** el cambio **sí se guarda** (apagar/encender el interruptor, editar una sesión) y el usuario ve éxito; el error solo queda en el log del servicio (`No se pudo registrar la auditoría de …`) y **ese registro de auditoría se pierde** (no se reintenta). Por eso hay que dejarla creada.

**Verificar** (solo lectura):
```sql
SELECT inhrelid::regclass FROM pg_inherits WHERE inhparent = 'audit.request_logs'::regclass ORDER BY 1;
-- debe aparecer audit.request_logs_AAAA_MM del mes en curso Y del mes siguiente
```
**Crear** (idempotente; crea la del mes en curso y la del siguiente si faltan, probado con `BEGIN … ROLLBACK`):
```sql
SELECT audit.create_monthly_partition();
```
Repetirlo cada mes hasta que los dueños de auditoría corrijan la función (pendiente para ellos).

## 0. Qué trae esta ronda (una línea por bug)

| Bug | Qué cambia | Dónde |
|---|---|---|
| EFDS-2435 | Interruptor de **Interoperabilidad con Programación Académica** en la base (PTA → Configuración). Programación Académica ya no depende de una variable | PTA + PA + MFE PTA |
| EFDS-2427 | Crear un periodo exige el permiso `programacion-academica.periodos.gestionar`. Programas Académicos → Periodos queda en consulta | PTA (servidor) + MFE PA + MFE Programas |
| EFDS-2434 | Candidatos con todos los docentes (bloqueados con su motivo) y asignación **múltiple** todo o nada | PA + MFE PA |
| EFDS-2432 | Editar y eliminar una sesión con reglas por estado, horas recalculadas y auditoría | PA + MFE PA |
| EFDS-2430 | Crear una sesión en varios días a la vez (validación previa, todo o nada) | PA + MFE PA |
| EFDS-2429 | Motivo cuando el programa solo se dicta en una sede (`unicaSede`) | PA + MFE PA |

## 1. Migraciones, en este orden

Se aplican con `./deploy.<amb>.sh db-migrate` (omite las ya registradas; son idempotentes).

| # | Archivo | Qué hace | Si algo falla |
|---|---|---|---|
| 1 | `db/migrations/690_pta_interoperabilidad_permiso.sql` | Crea el permiso `pta.backoffice.interoperabilidad` y lo da a SUPER_ADMIN y a los roles que ya tienen `pta.backoffice.config_reglas` | Sin él, nadie ve el interruptor (el superusuario sí) |
| 2 | `db/migrations/691_configuracion_sistema_clave_unica.sql` | Repone la llave única de `academic_work_plan."ConfiguracionSistema"` si un ambiente restaurado la perdió. Si hay claves repetidas avisa (`NOTICE`) y no toca nada | Ver la verificación 4 de la sección 6 |
| 3 | `backend/academic-schedule-service/db/migrations/080_permiso_periodos_gestionar.sql` | Crea `programacion-academica.periodos.gestionar` y lo da a ADMIN_PROGRAMACION y SUPER_ADMIN | Sin él, **nadie** puede crear periodos (403) |

Ya estaban en `micro-frontend` de rondas anteriores y deben estar aplicadas (si no, aplicarlas antes): PA `065_modalidad_distancia_y_aulas_sede_central.sql`, globales `669`–`674`. `scripts/diagnostico-bugs-qa.sql` (solo lectura) lo confirma.

## 2. Variables por ambiente

Quedan **declaradas con su valor** en cada `docker-compose.<amb>.yml`. Ninguna se cambió de valor: solo se hicieron explícitas.

| Servicio | Variable | dev | qa | pre | prod |
|---|---|---|---|---|---|
| PTA | `PROG_CONCERTACION_HABILITADA` (**solo valor inicial**, ver 2.1) | `true` | `true` | `true` | **`false`** |
| PTA | `PROG_CONCERTACION_DESDE_PERIODO` (corte inicial) | `2026-1` | `2026-1` | `2026-1` | `2026-1` |
| PTA | `PTA_MOCK_FIRMA_OTP` (firma simulada) | `true` | `true` | `true` | `true` |
| PTA | `AUDIT_SERVICE_URL` | `http://audit-service:3011` | `http://audit-service:3011` | `http://audit-service-pre:3011` | `http://audit-service-prod:3011` |
| PA | `PROG_CONCERTACION_DESDE_PERIODO` (respaldo si no hay fila) | `2026-1` | `2026-1` | `2026-1` | `2026-1` |
| PA | `PROG_NUCLEO_PUENTE` | `suma` | `suma` | `suma` | `suma` |
| PA | `PROG_SIN_DATO_ASIGNABLE` | `true` | `true` | `true` | `true` |
| PA | `PROG_PORTAL_TOMA_FRANJAS` | `false` | `false` | `false` | `false` |
| PA | `PROG_MOCK_FIRMA_OTP` (firma simulada) | `true` | `true` | `true` | `true` |
| PA | `ACADEMIC_WORK_PLAN_SERVICE_URL` | `http://academic-work-plan-service:3003` | igual | igual | igual |

PA **ya no lee** `PROG_CONCERTACION_HABILITADA`: si está definida, escribe un aviso en el log y la ignora.

### 2.1 Cómo funciona el interruptor (importante)

* El estado vive en la base: `academic_work_plan."ConfiguracionSistema"`, clave `interoperabilidad_programacion` (`{habilitada, desdePeriodo, motivo, cambiadoPor, cambiadoEn}`). **PA y PTA leen esa misma fila.**
* `PROG_CONCERTACION_HABILITADA` **solo siembra** el valor inicial la **primera vez**, si no hay fila (`INSERT … WHERE NOT EXISTS`, seguro con varias réplicas). Sin definir = **apagado**. Después manda la base: cambiar la variable y reiniciar **no** cambia nada (el log avisa si difiere).
* **Lo cambia un administrador** desde **PTA → Configuración → Interoperabilidad** (permiso `pta.backoffice.interoperabilidad`), con motivo (≥ 10 caracteres), confirmación y auditoría (`audit-service`).

## 3. Pasos de datos (puente docente–área y catálogo)

Los dos archivos van **en el repo**: `db/data/programacion-academica/puente_docente_area.csv` y `db/data/programacion-academica/catalogo-importable-2026-1.xlsx`. Se cargan con **un comando, idempotente, con modo de prueba** (por defecto no escribe):

```bash
export ESAP_USUARIO='superuser@esap.edu.co'   # o una cuenta GESTION_PROFESORAL
export ESAP_CLAVE='…'
# 1) PRUEBA (no escribe nada): muestra qué cargaría el puente y la cobertura
scripts/cargar-datos-programacion.sh --url https://<url-del-ambiente>
# 2) Aplicar el puente
scripts/cargar-datos-programacion.sh --url https://<url-del-ambiente> --aplicar
# 3) Catálogo con las áreas decididas, en un periodo (código AAAA-S); primero en prueba
scripts/cargar-datos-programacion.sh --url https://<url-del-ambiente> --catalogo 2026-1
scripts/cargar-datos-programacion.sh --url https://<url-del-ambiente> --catalogo 2026-1 --aplicar
```

* Correrlo dos veces deja lo mismo (el puente reemplaza el puente completo; el catálogo actualiza lo existente).
* Si los docentes ya tienen núcleo del **RUND** (carga del RUND por la pantalla), el puente solo suma: sin el RUND cargado, los docentes del área salen por el puente.
* El catálogo también se puede cargar por pantalla: **Programación Académica → Periodos → Importar** con ese mismo Excel.

## 4. Qué reconstruir

| Qué | Comando |
|---|---|
| `academic-schedule-service` (PA) | `./deploy.<amb>.sh rebuild-service academic-schedule-service` |
| `academic-work-plan-service` (PTA) | `./deploy.<amb>.sh rebuild-service academic-work-plan-service` |
| MFE Programación Académica | `./deploy.<amb>.sh rebuild-mfe programacion-academica` |
| MFE Programas Académicos | `./deploy.<amb>.sh rebuild-mfe programas-academicos` |
| MFE PTA | `./deploy.<amb>.sh rebuild-mfe pta` |

Orden: migraciones → servicios → MFEs. **Caché de las entradas remotas:** tras reconstruir los MFEs, recargar con Ctrl+F5 (o ventana privada); si un usuario sigue viendo la versión anterior, reiniciar el nginx del frontend (`rebuild-mfe` ya lo hace con `restart_frontend_nginx`). Los servicios se reconstruyen con la hora del contenedor en UTC (no hay `TZ`): no cambiarla.

Al arrancar, cada servicio **escribe en el log su configuración efectiva** (sin secretos). Comprobar:

```bash
docker logs academic-work-plan-service-<amb> 2>&1 | grep "Interoperabilidad con Programación Académica"
docker logs academic-schedule-service-<amb>  2>&1 | grep "Configuración efectiva"
```

## 5. Contingencia: apagar la integración (Programación Académica caída o error en la docencia)

1. Entrar como administrador a **PTA → Configuración → Interoperabilidad** → **Apagar…** → escribir el motivo → Confirmar. Efecto inmediato en PA y PTA.
2. El PTA deja de consultar a Programación Académica; el docente registra su Docencia Directa **a mano**, como antes. No se borra nada de lo ya aplicado (queda editable). Las concertaciones en curso siguen su camino; lo que se acepte queda pendiente (`pendiente_interoperabilidad_apagada`).
3. Al resolver el problema: **Encender…**. Se aplica lo pendiente (un PTA con docencia manual **no se pisa**: queda en conflicto; uno enviado o firmado no se toca) y la pantalla muestra cuántas se aplicaron, cuántas quedaron en conflicto y cuántas se omitieron.
4. Sin pantalla (último recurso, con la base): `UPDATE academic_work_plan."ConfiguracionSistema" SET valor = jsonb_set(valor, '{habilitada}', 'false') WHERE clave = 'interoperabilidad_programacion';` — no deja auditoría; preferir la pantalla.

## 6. Verificación posterior (5 minutos)

1. **Superusuario → PTA → Configuración → pestaña «Interoperabilidad»**: se ve el estado, el origen, el periodo de corte (2026-1) y el último cambio. (Prod: debe decir **Apagada**.)
2. **Programación Académica → Periodos**: **Crear periodo** funciona (superusuario). Con una cuenta **GESTION_PROFESORAL** sin el permiso: 403 («La creación de periodos se hace desde Programación Académica…»). **Programas Académicos → Periodos**: solo consulta, con el enlace a Programación Académica.
3. **Programación Académica → Catálogo → un grupo → «Asignar horario»**: crear una sesión en **varios días** (chips L-M-X-J-V-S-D → «Validar días» → «Agregar sesiones»); **editar** una (lápiz) y **eliminar** otra (papelera).
4. **Asignación de docentes de un grupo** (p. ej. ASIG-00003): aparecen **todos** los docentes del área, los bloqueados con su motivo (cruce con día y hora, tope, situación…); repartir las franjas entre dos docentes y confirmar. Si el puente no está cargado y salen menos docentes de los esperados: sección 3.
5. **Base**: `select clave, valor->>'habilitada', valor->>'desdePeriodo' from academic_work_plan."ConfiguracionSistema" where clave='interoperabilidad_programacion';` debe devolver **una** fila.
6. **Logs**: sin `ERROR` de arranque; el aviso «Interoperabilidad con Programación Académica: … origen …» aparece en el PTA.

Si algo falla: sección 5 (apagar) y avisar a Tomás con el log del servicio.

## 7. Camino de prueba de EFDS-2435 en QA (Javier): un periodo activado como extraordinario

Sirve para probar el interruptor sin tocar el periodo principal. Probado contra un stack desechable (base creada solo con las migraciones del repo):

1. Programación Académica → Periodos (o `POST /pta/api/v1/periodos-academicos`): crear un periodo **semestral** (p. ej. `2026-2`, fechas que no se crucen con otro). Pide el permiso `programacion-academica.periodos.gestionar`.
2. `POST /pta/api/v1/periodos-academicos/:id/activar-extraordinario` `{ "motivo": "…≥10 caracteres…" }` (permiso «Periodos — Activar periodo extraordinario»). El periodo pasa a `en_curso` + `extraordinario`; **el principal no cambia**.
3. Crear un PTA en ese periodo con un docente y probar: **encendido** → agregar una asignatura a mano da **409**; **apagado** → se agrega a mano; **encender** de nuevo → se aplica lo pendiente sin pisar lo manual.

**Reglas que hay que conocer:**
- El interruptor solo afecta a periodos con código `AAAA-1` o `AAAA-2` **desde el periodo de corte** (hoy `2026-1`). Un periodo **personalizado** (p. ej. `2026-INT`) **no** entra al régimen de Programación: siempre es docencia manual; no sirve para probar el interruptor.
- **Usar un docente que no tenga ningún PTA activo.** Verificado: si el docente tiene un **borrador** en otro periodo, `POST /pta/api/v1/save` sin `id` **reescribe ese borrador** al periodo nuevo (defecto del PTA anterior a esta ronda); si ya tiene un PTA en ejecución (p. ej. aprobado), responde 400 «Ya tienes un Plan de Trabajo en ejecución». Esta ronda **no** pudo probar el caso del docente totalmente limpio (en la base desechable no había otro docente con rol DOCENTE sin PTA).
- Al terminar: cerrar el periodo extraordinario y borrar el PTA de prueba (y sus filas relacionadas).

## 8. Instalación de dependencias (lockfile) — estado revisado

- Los `Dockerfile.frontend*` (dev, qa, pre, prod, app) usan `npm install --legacy-peer-deps`, **no `npm ci`**: el desfase del `package-lock.json` raíz **no rompe** los builds de QA. No se tocó el lockfile.
- Los Dockerfile de los servicios (`backend/*/Dockerfile`) usan `npm ci` con el lockfile **de cada servicio**; esta ronda no cambió dependencias de ningún servicio (sin cambios en sus `package.json` ni `package-lock.json`).
- **Pendiente para otros equipos:** `npm ci` en la raíz falla porque `package-lock.json` no está sincronizado con los `package.json` de los workspaces (faltan, entre otros, `@esap-mfe/chatbot`, `@esap-mfe/gestion-infraestructura`, `vitest` y `jsdom`; viene de commits de otros equipos en `micro-frontend`). Hoy solo lo notaría un CI que use `npm ci` en la raíz (no hay ninguno). No se corrió `npm audit fix`.

## 9. Segunda entrega (16 de nov): plantilla de Excel, reutilizar periodo y arreglos visuales

- **Sin migraciones, sin variables nuevas, sin permisos nuevos.** Reconstruir `academic-schedule-service` y los MFE `mfe-programacion-academica` y `mfe-pta` (y limpiar la caché de `remoteEntry`).
- Verificación (2 minutos): Programación Académica → el menú empieza por **Periodos**; Programación General → botón **«Cargar desde Excel»**; Periodos → **«Reutilizar datos de otro periodo»**; PTA → Configuración → Interoperabilidad → al pulsar «Apagar…» el botón **«Confirmar» se ve** (azul).
- **Datos que QA necesita para que la asignación de docentes funcione** (no es código):
  1. **RUND con vinculaciones vigentes.** Hoy en QA los docentes ocasionales tienen fin de vinculación 2025-12-17: cualquier grupo que termine después los bloquea («El grupo termina … después del fin de vinculación»). Hay que recargar el RUND del periodo o probar con docentes de planta.
  2. **Puente docente–área cargado** (sección 3). Cubre pregrado.
  3. **Posgrado:** las asignaturas de especialización/maestría tienen área «Programa: …» y ningún docente la tiene. Falta el insumo de la ESAP (qué docentes dictan cada programa de posgrado) para cargarlo al puente.
- Roles de prueba (ver INTEGRACION-claude.md §41.1): programar = `PROGRAMADOR_PREGRADO/POSGRADO`; asignar y enviar a revisión = `PROGRAMADOR_DOCENTE_*`; revisar = `REVISOR_DOCENCIA_*`; aprobar = `APROBADOR_DOCENCIA` o `JEFATURA_TERRITORIAL`; todo = `ADMIN_PROGRAMACION`.

## 10. Tercera entrega (18 de nov): asignar un docente en varios grupos, eliminar periodos y quitar los datos semilla

- ⚠️ **La limpieza de datos semilla de esta entrega se CORRIGIÓ en la §11** (la 081 quedó sin efecto y la reemplaza la 082, que no toca el PTA). Seguir la §11 para la migración, el respaldo y la verificación.
- **Reconstruir:** `academic-work-plan-service` (eliminar periodos), `academic-schedule-service` (solo trae la migración) y el MFE `mfe-programacion-academica`.
- **Verificación (2 minutos):**
  1. y 2. Los datos semilla y el histórico: ver la verificación de la §11.
  3. Cada periodo que no está en curso tiene el botón **«Eliminar»**: muestra qué se borraría y pide confirmar. El periodo en curso y uno con PTA de docentes no se eliminan (el sistema dice por qué).
  4. Asignar a un docente que ya tiene un grupo, en otro grupo de su misma área: se asigna.

## 11. Cuarta entrega (18 de nov, noche): limpieza de datos semilla sin tocar el PTA (EFDS-2447), respaldo del histórico y EFDS-2448

### 11.1 Migraciones (con `./deploy.<amb>.sh db-migrate`)
- `081_retirar_datos_semilla.sql` **quedó sin efecto** (`SELECT 1`). Su primera versión borraba en `academic_work_plan.docencia_concertada`, una tabla del PTA, y fallaba por llave foránea si un grupo viejo ya estaba en un periodo del PTA. **Si en algún ambiente ya corrió la versión vieja, avisar**: no se esperan daños (la ejecución vieja falla entera o no encuentra nada), pero hay que mirar el log de ese ambiente.
- `082_retirar_datos_semilla_sin_tocar_pta.sql` (**nueva**, la que limpia). Solo escribe en el esquema `academic-schedule`:
  - Retira los 5 periodos viejos SEMBRADOS (`2026-1`, `2026-2`, `2026-V1`, `2026-V2`, `2026-INT` de `periodo_programacion`), cada uno con sus grupos, sesiones, asignaciones, recesos, concertaciones y su equivalencia; el grupo DEMO, y la programación histórica (575 filas).
  - **No toca nada del PTA**: ni `periodo_academico` (el 2026-1 del PTA es real), ni PTA, ni `docencia_concertada`. Un periodo viejo que tenga **algo ligado al PTA** (un grupo ya reapuntado a un periodo del PTA, o una concertación con decisión de docencia registrada en el PTA) **se conserva entero** y el log lo dice: `NOTICE: 082: periodo viejo 2026-1 CONSERVADO: …`. Los periodos viejos creados por usuarios tampoco se tocan.
  - Idempotente. Deja en el log cuántas filas quitó de cada cosa (`NOTICE: 082: …`). **Copiar esos NOTICE en el ticket.**
  - Prueba con el SQL real (en transacción que se revierte): `backend/academic-schedule-service/src/periodos/datos-semilla.agregado.spec.ts`.

### 11.2 Respaldo de la programación histórica y cómo volver a cargarla
- Respaldo (en el repo): `backend/academic-schedule-service/db/respaldos/programacion_historica.datos.sql` (575 filas, tal como quedaban tras las migraciones 022 y 025).
- Comando (idempotente, **por defecto en modo prueba**: informa y no guarda nada):
  ```bash
  # en el servidor, desde la raíz del repo
  backend/academic-schedule-service/db/respaldos/recargar-historico.sh superapp-db-qa             # PRUEBA
  backend/academic-schedule-service/db/respaldos/recargar-historico.sh superapp-db-qa --aplicar   # carga
  ```
  Imprime `Programación histórica: antes N filas · después 575 (2026-1: … · 2026-V1: …)` y `MODO PRUEBA: nada se guardó` o `APLICADO`. Correrlo otra vez no duplica nada. Recalcula la sugerencia de asignatura contra el catálogo de ese ambiente (regla de la 025). Solo escribe en `"academic-schedule".programacion_historica`.
- **No se corre en el despliegue**: solo si el negocio pide volver a ver los «cruces del histórico».

### 11.3 EFDS-2448 (reportado por Javier en EFDS-1368)
- «Guardar periodo» del grupo (Catálogo → grupo → horario) **no guarda** si falta alguna fecha del ciclo o si el grupo no tiene al menos una sesión: muestra una alerta con el motivo y no guarda nada. La regla está en el servidor (`PUT /horarios/grupo/:id/periodo` responde 400 con el motivo), no solo en la pantalla.
- Grupo **virtual o a distancia**: su horario es opcional (lo define el docente), así que solo se exigen las dos fechas.
- La carga desde Excel y «reutilizar periodo» no cambian (fijan el ciclo antes de crear las sesiones).
- En la selección de días, el miércoles es **«MI»** (antes «X»).

### 11.4 Reconstruir y verificar
- Reconstruir: `academic-schedule-service` (migraciones 081/082 y EFDS-2448) y el MFE `mfe-programacion-academica`. Además lo de la §10 si no se desplegó aún. (El shell trae un cambio de una línea en `offlineCache.ts` que solo afecta las pruebas; no hace falta reconstruirlo por esto.)
- Verificación (3 minutos):
  1. Log de `db-migrate`: aparecen los `NOTICE: 082:` y **ningún** `ERROR`. Si sale «CONSERVADO», ese periodo viejo tiene datos ligados al PTA y se queda a propósito.
  2. Programación Académica → Periodos: ya no aparecen los periodos viejos retirados (2026-INT, 2026-2…) en «Periodos anteriores al modelo único».
  3. Validación de Cruces: el histórico sale en 0.
  4. PTA → el periodo 2026-1 y sus PTA siguen igual.
  5. Un grupo sin sesiones → «Guardar periodo» muestra «No se guardó el periodo del grupo: falta al menos una sesión en el horario.» Con una sesión y las dos fechas, guarda.

## 12. Quinta entrega (19 de nov): alerta cuando nadie se puede asignar (EFDS-2449) y vinculaciones vencidas del RUND

### 12.1 EFDS-2449 (reportado por Javier en EFDS-1939)
- Cuando **todos** los candidatos de un grupo están bloqueados, el modal «Asignar docente» muestra una alerta roja con: que no se puede asignar a nadie, qué hacer y los motivos más frecuentes con su conteo. Ejemplo: «Ningún docente del área «X» se puede asignar a este grupo. Revise la vinculación de los docentes en el RUND o habilite docentes del área. Motivos más frecuentes: 3 con la vinculación vencida, 1 con cruce de horario.» El motivo de cada docente sigue en su tarjeta.
- La alerta la redacta el **servidor** (`GET /asignaciones/candidatos` trae `bloqueoTotal` y el mismo texto en `aviso`), así que es igual en cualquier pantalla. Cada docente cuenta una vez por categoría. Si algún candidato se puede asignar, no hay alerta.
- Reconstruir: `academic-schedule-service` y el MFE `mfe-programacion-academica`. Sin migraciones ni variables nuevas.

### 12.2 «Vinculación vencida» NO es un error del sistema: es el RUND sin actualizar
La regla de vinculación (RN-10: el ciclo del grupo debe caer dentro de la vinculación del docente) **es correcta y no se cambió**. Si a un ocasional le sale «El grupo termina el 2026-06-12, después del fin de vinculación del docente (2025-12-15)», el sistema está funcionando: lo que falta es cargar el RUND de 2026 para ese docente.

Comprobado el 19-nov-2026 sobre el RUND de QA (consulta de solo lectura, conteos agregados; no se guardó ningún dato personal):

| Dato (RUND de QA) | Conteo |
|---|---|
| Docentes en el RUND | 791 |
| Por carga: 2025-1 / 2025-2 / 2026-1 / sin dato | 256 / 260 / 270 / 5 |
| Ocasionales | 370 |
| Ocasionales con vinculación 2025 (1 ene → 15 dic 2025) | 236 (118 cargados en 2025-1 y 118 en 2025-2) |
| Ocasionales con vinculación 2026 (hasta dic 2026) | 123 (122 cargados en 2026-1) |
| Docentes con la vinculación ya vencida al 19-nov-2026 | 316 de 791: 243 ocasionales, 65 en periodo de prueba, 4 especiales, 2 visitantes, 1 carrera 2, 1 de cátedra |

- **Es el RUND de 2025, no solo el de 2025-1**: las vinculaciones que terminan en diciembre de 2025 vienen de las cargas 2025-1 y 2025-2 por igual. El RUND de 2026-1 sí está cargado, pero solo para 270 de los 791 docentes: los otros 236 ocasionales siguen con su contrato de 2025. Los 65 de periodo de prueba también son de cargas 2025 (terminaron entre jul-2025 y jul-2026).
- Los docentes de carrera con vinculación indefinida (sin fecha de fin) no se ven afectados.
- **Qué hacer:** cargar el RUND de 2026 de los docentes que faltan (carga masiva del RUND, Banco de docentes del PTA). Cuando cada docente tenga su vinculación 2026, deja de salir el bloqueo. No hay nada que corregir en Programación Académica.
- **Cómo verificar después de cargar:** abrir el modal de asignación de un grupo de 2026-1; el resumen de la alerta ya no debe decir «con la vinculación vencida» para esos docentes.
- **No reportar como defecto** «no puedo asignar a un ocasional porque su vinculación venció» mientras su RUND siga siendo el de 2025.

## EFDS-2238 · Traslados de Disciplinario a Judiciales

Desplegar juntas las imágenes de Disciplinario, Notificaciones y Gestión Legal y recrear sus contenedores con el Compose del ambiente. La transferencia interna lleva el ambiente y los documentos. Legal la guarda en Judiciales incluso cuando Graph está apagado. La base de Legal y su volumen de adjuntos deben pertenecer al ambiente.

| Ambiente | MAIL_ENVIRONMENT | JURIDICA_EMAIL en los tres servicios | MAIL_TEST_INBOX en Notificaciones | Transporte |
| --- | --- | --- | --- | --- |
| Local | local | judicial@local.invalid | avisos@local.invalid | Mailpit local |
| Dev | dev | judicial@dev.invalid | avisos@dev.invalid | Mailpit de dev |
| QA | qa | judicial@qa.invalid | avisos@qa.invalid | Mailpit de QA |
| PRE | pre | judicial@pre.invalid | avisos@pre.invalid | Mailpit de PRE |
| Producción | prod | cuenta institucional autorizada en LEGAL_EMAIL_ACCOUNT_JUDICIAL | vacío | proveedor institucional |

En pruebas, Notificaciones usa `EMAIL_PROVIDER=smtp`, `SMTP_HOST=mailpit`, `SMTP_PORT=1025`, usuario y contraseña vacíos y remitente `notificaciones@<ambiente>.invalid`. Cada proyecto y su red tienen un capturador independiente. Los avisos generales conservan su destinatario lógico en `X-ESAP-Original-To`. El asunto y la cabecera `X-ESAP-Environment` identifican el ambiente. Retirar el desvío legado `EMAIL_REDIRECT_TO`. La interfaz del capturador contiene documentos de prueba y queda dentro de la red del proyecto.

Para sincronizar correspondencia externa, usar cuentas Graph exclusivas del ambiente. En las variables de despliegue definir, por ejemplo, `QA_LEGAL_EMAIL_ACCOUNT_JUDICIAL` y `QA_LEGAL_EMAIL_ACCOUNT_CORREOS`. Para dev, PRE o local sustituir el prefijo por `DEV_`, `PRE_` o `LOCAL_`. Compose las entrega a Legal como `LEGAL_EMAIL_ACCOUNT_JUDICIAL` y `LEGAL_EMAIL_ACCOUNT_CORREOS`. Se pueden dejar vacías para probar solo los traslados. Producción usa esas variables sin prefijo, con el remitente y las credenciales de su proveedor habitual.

### Diagnóstico del proceso 126 para Henrry

1. Identificar las imágenes que atendieron el proceso 126 el 26 de octubre. Correlacionar radicado e identificador interno en los registros de ese día, teniendo en cuenta la zona horaria. La configuración actual solo describe el contenedor actual.
2. En Disciplinario QA, verificar `MAIL_ENVIRONMENT=qa`, `JURIDICA_EMAIL=judicial@qa.invalid`, `LEGAL_MANAGEMENT_SERVICE_URL=http://legal-management-service-qa:3008` y `NOTIFICATIONS_SERVICE_URL=http://notifications-service-qa:3009`. Buscar cierre, traslado directo y resultado del envío. El cierre por sí solo no acredita la entrega.
3. En Notificaciones, verificar la fila QA y el transporte anteriores. Comprobar si el evento `PLIEGO_CARGOS_TRASLADO_JURIDICA` estaba habilitado para correo. Revisar adicionales por rol, buzón de desvío, recepción de la solicitud y respuesta. Un 202 indica omisión o desvío. Para el envío efectivo comprobar la aceptación SMTP y el identificador del mensaje. Consultar solo las variables indicadas o la línea de arranque.
4. En Gestión Legal, verificar ambiente, destino judicial, base y volumen de QA. Buscar la transferencia, el buzón grabado y el número de documentos. En la versión anterior buscar también en **Correos**. Los registros históricos mezclados requieren conciliación por proceso y ambiente antes de moverlos.
5. Con expedientes de prueba, aprobar un auto, asignar profesional, radicar una noticia y aprobar un pliego. Comprobar los destinatarios de los avisos en Mailpit. Pulsar **Enviar a Jurídica** una vez. Debe aparecer un único mensaje para Judiciales en el capturador de QA y una sola comunicación en **Centro de Comunicaciones → Judiciales**, con los documentos descargables. Buscar el mismo radicado en PRE y verificar que está ausente.

**No verificado en condiciones de QA.** Se validaron los Compose dev, QA, PRE y producción. Docker Desktop falló al iniciar WSL y no se pudo ejecutar el recorrido en contenedores. La atribución del incidente del 26 de octubre sigue dependiendo de los registros de QA.

El ensayo local con los controladores y el proxy compilados devolvió 201 al traslado con PDF, 201 a la asignación y 202 al intento de mandar la asignación a Judiciales. Se usó SMTP en loopback. El Compose alternativo local que extiende el frontend también presenta una referencia previa a la red no declarada del chatbot; el Compose local de solo backend valida.

## 13. EFDS-2336 · La territorial del PTA mostraba un nombre equivocado en preproducción

### 13.1 Qué cambia
- **Solo el MFE `mfe-pta`.** Sin migraciones, sin variables nuevas, sin cambios de servidor. Reconstruir y publicar el MFE del PTA.
- En la pestaña **Aprobación** de la ficha del docente, cada tarjeta de decisión dice ahora **de quién es la territorial que muestra**:

| Tarjeta | Rótulo | Qué muestra |
|---|---|---|
| Componente Docencia (Territorial) | **Territorial de la docencia** | La territorial donde se dictan las asignaturas que se decidieron (el par territorial–nivel). Es la del aprobador territorial, no la del docente. |
| Complementarias (Territorial) | **Territorial de las complementarias** | La de sus pares, igual que arriba. |
| Docencia Pregrado / Posgrado, Investigación, Extensión, Complementarias | **Territorial del docente** | La territorial del docente (la del PTA). |

- Si un identificador no tiene correspondencia **única** en el catálogo de territoriales del ambiente, se muestra **«Territorial no identificada»**. Nunca otro valor: ni la del docente, ni Sede Central, ni la primera de la lista.
- La pestaña Trazabilidad no muestra territoriales (solo componentes, estados y quién decidió); no cambia.

### 13.2 Por qué fallaba
- Al aprobar, la pantalla guardaba como alcance de la decisión la **territorial del docente**, y la tarjeta de Docencia (Territorial) mostraba ese valor. En el caso del reporte, el docente es de **Cauca** y la docencia aprobada es de **Tolima** (la aprobó el aprobador de Tolima): la tarjeta decía «Cauca».
- Si la decisión no traía territorial, la pantalla caía a la del docente (un valor por defecto escondido).
- Además hay un problema de **datos** que la pantalla no puede resolver sola (ver 13.3).

### 13.3 Pasos de datos (los hace el dueño de cada catálogo; Programación/PTA no los modifica)
En los ambientes conviven catálogos de territoriales que no cruzan:
- `auth.seccionales` trae **mezcladas** las filas heredadas (código CAU, TOL…) y las de Estructura Organizacional (DT-001…), con ids distintos.
- La territorial del RUND (`Docente.territorialId`) a veces llega como **id de dependencia** (`auth.dependencias`), no como id de seccional.
- Hay ids que existen **a la vez** en dos catálogos con significado distinto (en la base local: 6 entre seccionales y dependencias, 17 entre seccionales y `direccion_territorial`, y 50 docentes con su territorial en ese rango). Con un id así, cualquier pantalla puede mostrar un nombre válido pero equivocado.

**Consulta de diagnóstico (solo lectura)**: `backend/academic-work-plan-service/db/diagnostico/efds-2336-territorial-docente.sql`. No es migración; no la corre `db-migrate`.
```bash
docker cp backend/academic-work-plan-service/db/diagnostico/efds-2336-territorial-docente.sql superapp-db-pre:/tmp/
docker exec superapp-db-pre psql -U postgres -d esap_db -v cedula=<CEDULA DEL DOCENTE> -f /tmp/efds-2336-territorial-docente.sql
# lo mismo en QA con superapp-db-qa
```
Muestra, para ese docente: su territorial del RUND y a qué resuelve en **cada** catálogo; sus PTA; las decisiones por componente con el alcance guardado; las decisiones por par (territorial de la docencia); la territorial de cada asignatura y la de su CETAP; y cuántos ids del ambiente son ambiguos. Sin nombres de personas.

**Cómo leerla:**
- Si en la sección 1 la territorial del docente resuelve en **dos** catálogos, o solo en `dependencias`: el dato del RUND no apunta a una seccional. Lo corrige quien carga el RUND / Estructura Organizacional (el id debe ser el de `auth.seccionales`).
- Si en la sección 4 un `territorial_id` resuelve en dos catálogos: el par quedó con un id ambiguo. Reportarlo al equipo de `auth` / Estructura Organizacional con la salida de la consulta.
- Si la tarjeta muestra «Territorial no identificada»: el id no está en el catálogo del ambiente (o está dos veces). Es dato, no pantalla: correr la consulta.

### 13.4 Verificación posterior en PRE (2 minutos)
1. Abrir el PTA del docente del reporte → pestaña **Aprobación** → tarjeta **Componente Docencia (Territorial)**.
2. El rótulo dice **«Territorial de la docencia»** y el valor es la territorial de las asignaturas aprobadas (la del aprobador territorial: **Tolima** en el reporte), no la del docente.
3. Las demás tarjetas dicen **«Territorial del docente»** con la territorial del docente.
4. Si alguna dice «Territorial no identificada», correr la consulta de 13.3 con la cédula y enviar la salida.

### 13.5 Hallazgo aparte, no corregido en esta entrega
En la misma tarjeta, el campo **ROL** del aprobador decía «Docente» aunque quien aprobó es «Aprobador Docencia Territorial». El rol lo calcula la pantalla con 7 perfiles generales del PTA y los roles granulares (como «Aprobador Docencia Territorial») no tienen equivalente, así que caen en «Docente»; el servidor guarda lo que envía la pantalla. Corregirlo bien es que el servidor tome el rol del token (como ya hace con el nombre). Queda propuesto como ticket aparte.
