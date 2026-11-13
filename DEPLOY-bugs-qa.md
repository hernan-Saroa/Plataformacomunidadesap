# Despliegue — Bugs de QA de Programación Académica (EFDS-2427 … 2435)

Para Henrry. Ronda del 12–13 de noviembre de 2026. Rama de integración: `feature/pa/bugs-qa` → `micro-frontend`.
Los comandos son los de siempre del ambiente (`./deploy.<ambiente>.sh …`); donde dice `<amb>` va `dev`, `qa`, `pre` o `prod`.

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
