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
