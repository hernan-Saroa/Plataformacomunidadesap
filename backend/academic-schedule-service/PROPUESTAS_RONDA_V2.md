# Propuestas — ronda v2

Para decisión de Tomás y Nicolás. Las propuestas 1 y 2 (desactivar la Docencia en el PTA y aplicar la decisión concertada) ya están **construidas y apagadas**: se encienden con un solo interruptor. Lo que falta para encenderlas está en la sección 4. La lista de pendientes para sus dueños está en la sección 6.

---

## 1. Desactivar la aprobación de Docencia en el PTA — CONSTRUIDO, apagado

**Un solo interruptor:** `PROG_CONCERTACION_HABILITADA`, la misma variable en los dos servicios.
- El régimen nuevo rige solo si está encendida **en los dos**. Cada lado verifica al otro por el contrato:
  - Programación Académica consulta `GET /contrato-programacion/v1/docencia/configuracion` del PTA;
  - el PTA consulta `GET /concertacion/configuracion` de Programación Académica.
- El corte es `PROG_CONCERTACION_DESDE_PERIODO` (por ejemplo `2027-1`), y se define **solo** en Programación Académica; el PTA lo lee de allí. Si la variable está encendida pero no hay corte, el régimen queda apagado.
- **Apagado** (así va a producción): el PTA no hace ni una consulta nueva y se comporta exactamente como hoy. Hay una prueba que verifica que no se hace ninguna llamada.

**Qué PTA entran al régimen nuevo:**
- los de un periodo igual o posterior al corte, y
- que estén en `BORRADOR` o que ya tengan docencia de programación.

Un PTA enviado o firmado antes de encender sigue con el flujo actual.

**Cambios en el PTA** (`pta/docencia-programacion.ts`, enganchado en `pta.service.ts`; cada enganche está dentro de `habilitadaLocal()`):

| Dónde | Qué hace |
|---|---|
| `aprobarComponente`, `revisarComponente` | Para `academica_pregrado`, `academica_posgrado` y `academica_territorial` responden 409: "La docencia se aprueba en Programación Académica" |
| `updatePTAStatus` / `savePTA` (enviar) | No se envía un PTA del régimen nuevo sin la docencia concertada |
| `savePTA` | La docencia `origen: 'programacion'` no se edita (se conserva la guardada) y no se agregan asignaturas a mano |
| `getComponentesAprobacion` | La Docencia sin horas **no** se auto-aprueba como "Sistema": eso sería aprobarla sin concertación |
| Reinicio completo | No borra las aprobaciones con `scope = 'programacion'` |
| Programación Académica no responde | El PTA falla cerrado con un error explícito (503) y no auto-aprueba nada |

**Pruebas** (`docencia-programacion.spec.ts`, 17):
- apagado;
- encendido;
- periodo anterior al corte;
- PTA ya enviado;
- edición bloqueada;
- PA caída;
- las **4 combinaciones** del interruptor, con exactamente un aprobador en cada una;
- los estados de aplicación.

Suite del PTA: 1033 pasan. Las 3 que fallan son de EFDS-1372 y ya fallaban antes (dependen de los 263 docentes del RUND).

**Pendiente en el backoffice:** ocultar los botones de aprobar y revisar Docencia en los PTA del régimen nuevo. Hoy el servidor ya los rechaza con 409.

---

## 2. La docencia aprobada llega al PTA — CONSTRUIDO, apagado

Al aprobar, Programación Académica entrega la decisión por el contrato (`POST /contrato-programacion/v1/docencia/decisiones`). Lo que entrega por cada grupo:
- `asignaturaId`, `programaId`, `pensum`, `creditos`, `semestre`, `modalidad`;
- las fechas del ciclo;
- las horas.

Con el interruptor encendido, el PTA **aplica** la decisión en una transacción:

| Situación del PTA | Resultado (`estado_aplicacion`) |
|---|---|
| En borrador o devuelto, régimen nuevo | `aplicada`: reemplaza las asignaturas de ese nivel con las de programación (no editables), quita las manuales y deja `academica_<nivel>` **aprobado** con `scope = 'programacion'` y `scope_id = id_concertacion` |
| Todavía no existe | `pendiente_sin_pta`: se precarga cuando el docente lo crea |
| Firmado o cerrado | `pendiente_pta_firmado`: **no se modifica**; queda pendiente y se reporta |
| Enviado en el flujo anterior | `pendiente_pta_flujo_anterior`: no se aplica, para no aprobar dos veces |
| En aprobación | `pendiente_pta_en_aprobacion` |
| Interruptor apagado en el PTA | Solo se registra |

Programación Académica guarda la respuesta en `concertacion_docencia.aplicacion_pta` (migración 039) para que quede visible.

**Decisión pendiente:** qué hacer con un PTA firmado que tiene una decisión pendiente. La propuesta es usar la edición por componente existente (EFDS-1226), pero no está construida: hoy solo se reporta.

**Horas.** Salen del cálculo único del contrato (`horasImpacto`) con el reparto por días (`docencia/reparto.ts`). El PTA no las recalcula. Sigue pendiente del negocio la regla del reparto cuando dos docentes comparten un grupo; si cambia, se cambia esa sola función.

---

## 3. El interperiodo — DECIDIDO

**Decisión de Javier:** el interperiodo es un **semestre aparte**. No va ligado al primero ni al segundo.

**Qué queda así:**
- 2026-INT sigue **fuera de la migración**, con destino NULL en `equivalencia_periodo`.
  - Opera en el modelo legado.
  - Aparece en "Periodos anteriores al modelo único".
- No se asigna a 2026-1 ni a 2026-2.

**Lo que falta para modelarlo como periodo propio** (pendiente, sin construir):
- `periodo_academico` (dueño: el PTA) solo admite `semestre` 1 o 2 y un código año-semestre. Un interperiodo propio necesita ampliar ese modelo, por ejemplo con un tipo de periodo o un código `2026-INT`.
- Ese cambio es del PTA y de Programas Académicos (Julián Rojas). Cuando exista, entra con una fila en `equivalencia_periodo` y `reapuntar_grupos_por_equivalencia()`, sin otro cambio en Programación Académica.

---


## 4. Lo que falta para encender la concertación

1. **Los huecos del alcance territorial del PTA** (sección 4.1). Son del PTA y los comparten los dos módulos, porque la concertación decide igual que el PTA.
2. **Revisores reales.** En local solo SUPER_ADMIN tiene permisos `pta.review.academica.*`. JEFATURA_TERRITORIAL y APROBADOR_DOCENCIA solo aprueban. Sin un rol revisor, toda concertación pasa por un superusuario. Asignar ese permiso es gestión de usuarios: no lo toqué.
3. **Qué aprueban investigación y extensión.** Si el negocio dice que también revisan la Docencia, se agregan a `REVISIONES_REQUERIDAS`, sin cambiar el esquema ni el flujo.
4. **Firma.** Hoy es simulada, por decisión de Tomás, pero queda registrada. Para la firma real hay que ampliar de forma aditiva el DTO de OTP de auth-service para aceptar `prog-docencia:<id>:<huella>:<rol>`, como se hizo con el paz y salvo.
5. **Confirmar en dev** que la activación de periodo no falla por `uuid = text` (sección 6).
6. **Desplegar los dos servicios juntos** y definir el corte. Si se enciende un solo lado, no pasa nada: el régimen nuevo exige los dos.

### 4.1 Alcance territorial — igual al del PTA, sin tablas a mano

Se **descartó** la tabla de equivalencias (migración 038). Nunca se subió ni se aplicó fuera de local. Un dato mantenido a mano queda mal en cuanto cambia la estructura, y la estructura se carga por carga masiva.

**Cómo decide hoy el PTA la Docencia** (auditado en `pta.service.ts`, `assertAlcancePersonalDeActividades` y `assertAlcanceTerritorial`):
- **Permiso:** el del componente (`pta.approve.academica.<nivel>`), con los roles vigentes de la cuenta.
- **Lado del aprobador:** `auth.personas.id_seccional`, o la seccional de su sede.
- **Lado del docente:** **no** es la territorial del docente. Es la de **cada asignatura** (`asignaturas[].territorial_id`, un id de `auth.seccionales`), que el docente elige al llenar el PTA.
- **Comparación:** por id o por nombre normalizado. Si una asignatura no tiene territorial, no se puede verificar y el PTA responde 403.
- **Enrutamiento:** una asignatura de una Dirección Territorial va a `academica_territorial`, que se aprueba por par (territorial, nivel) en otra tabla.
- El alcance del rol (`auth.role.alcance`) **no se usa** en producción. `territorialGrantsFromRoles` solo aparece en pruebas.

**La concertación hace exactamente eso.** La territorial del grupo sale de datos que mantiene la carga masiva de estructura de auth:
- el código de la franja o del aula contra `auth.seccionales.cod_seccional`;
- o el CETAP del aula contra `auth.sede_cetap_mapping`.

Viaja al PTA como `territorial_id`. Si una asignatura es de una Dirección Territorial, el PTA no la aplica desde la concertación por nivel: queda `pendiente_docencia_territorial`.

**Huecos del PTA (reportados, no resueltos con datos a mano):**

| Hueco | Dato real (base local) |
|---|---|
| **Un aprobador sin seccional en Personas no tiene restricción geográfica**: aprueba cualquier territorial | Los 3 usuarios con roles de Docencia (1 APROBADOR_DOCENCIA y 2 JEFATURA_TERRITORIAL) **no tienen seccional** |
| **Dos catálogos de seccionales en auth que no cruzan.** Personas usa los heredados (10 "Seccional Huila"); la carga masiva de estructura crea los suyos (900022 `DT-009` "HUILA"), con 337 sedes. Distinto id y distinto nombre normalizado: un aprobador de Huila no cruza con una asignatura de "HUILA" | De 352 docentes, 176 tienen seccional en Personas, todos del catálogo heredado |
| **Programación Académica no captura dónde se dicta un grupo.** `franja_horaria.sede_codigo` existe pero el formulario no lo llena. Las aulas guardan `DT-009`/`CET-0135`. `auth.sede_cetap_mapping` está vacía en local | Las 19 franjas locales: sin sede. Hoy toda concertación llega sin territorial, y un aprobador **con** seccional no puede decidirla (igual que en el PTA) |

**Jefatura (EFDS-2304):** además de la tabla propia, ahora usa la seccional de la persona cuando su código **es** el del RUND (`cod_seccional = 'DT-009'`), sin tabla intermedia. Con el doble catálogo, una persona del catálogo heredado no cruza. En local solo cruza 1 cuenta (SC).

---

## 5. Lo construido (apagado por defecto)

- **EFDS-2306:** la docencia sale de la franja (registro único), con las horas del cálculo único del contrato y el reparto por días en una función reemplazable.
- **EFDS-2315:**
  - concertación completa (enviar, revisar, devolver, aprobar), con los permisos y el alcance territorial del PTA;
  - firma simulada registrada (quién, cuándo, rol, huella, contexto);
  - Docencia desactivada en el PTA y decisión aplicada (secciones 1 y 2);
  - un solo interruptor, verificado en los dos lados, con corte por periodo;
  - **flujo principal verificado de punta a punta con el servidor real (14 de octubre):** concertar antes del PTA, crear el PTA y ver la Docencia aprobada con sus asignaturas y horas; y con el PTA ya existente, aplicación directa. El docente no puede agregar ni cambiar la docencia concertada.
- **EFDS-2304:** territorial de la jefatura por código del RUND, además de la tabla legada.
- **EFDS-2311:** las vistas vuelven a leer del servidor tras aprobar, con el mecanismo común de Codex.
- **EFDS-2314 (carga masiva): confirmada sobre 2050-1**, con respaldo previo. El importador queda como está (decisión de Tomás). El resultado coincide con la simulación:

  | Qué | Resultado |
  |---|---|
  | Programas | 14 actualizados |
  | Asignaturas | 427 actualizadas |
  | Ofertas | 325 creadas |
  | Periodo 2050-1 | Sigue en planeación |

  Los cambios campo por campo son los anticipados: campos derivados, tildes y las 3 horas en 0. Para cargar en local hubo que alinear el catálogo de semestres (fila 11 de la sección 6).
- **Un id que no es UUID responde 400, no 500**, en todas las rutas de Programación Académica.

---

## 6. Pendientes para sus dueños

| # | Hallazgo | Dueño | Gravedad |
|---|---|---|---|
| 1 | **El importador convierte en 0 las horas vacías** de 3 asignaturas: ASIG-00139 y ASIG-00427 (Opciones De Grado AP) y ASIG-00218 (Seminario De Opciones De Grado APT). Un 0 parece un dato real, y el vacío decía "sin definir". Además rompe el cálculo único: con vacío, el contrato usa el respaldo (horas de carrera / 3); con 0, el impacto es 0 y esas asignaturas no se pueden concertar | Programas Académicos (Julián Rojas) | Alta |
| 2 | El importador no es idempotente: recalcula campos derivados (Circular 003, `modalidad_sufijo`) y corrige tildes en 6 nombres ("Publico" → "Público") | Programas Académicos | Media |
| 3 | La plantilla de carga no trae `pensum` ni las columnas de la Circular 003. El catálogo local tiene 0 asignaturas con pensum | Programas Académicos | Media |
| 4 | El importador crea periodos en estado `en_curso` (solo si el periodo no existe; sobre 2050-1, que ya existía, no lo cambió) | PTA / Programas Académicos | Media |
| 5 | La activación de periodo puede fallar por `uuid = text` al terminar los PTA. En local `PlanTrabajoAcademico.id` es text, así que hay que **confirmarlo en dev** | PTA | Alta si se confirma |
| 6 | Huecos del alcance territorial del PTA: aprobador sin seccional sin restricción, y dos catálogos de seccionales que no cruzan (sección 4.1) | PTA / Gestión de usuarios (auth) | Alta antes de encender |
| 7 | Programación Académica no captura dónde se dicta un grupo, así que la Docencia territorial no se puede concertar (sección 4.1) | Programación Académica | Alta antes de encender |
| 8 | Las fechas del PTA se corren un día por la zona horaria | PTA | Media |
| 9 | auth-service escribe directamente en el esquema del PTA | auth / PTA | Media |
| 10 | La migración `db/init` 010 (Control Interno) falla en local | Control Interno | Baja |
| 11 | **Orden entre la siembra de Programación Académica y el importador.** La migración PA 007 (EFDS-1368, está en micro-frontend) siembra `ubicacion_semestral` con `PRE_x`/`POS_x` e ids propios, y además escribe en el esquema del PTA. El importador siembra ids fijos (1–12 pregrado, 13–16 posgrado) y choca por etiqueta. Si el importador cargó primero (lo normal en dev), la 007 no inserta nada. En un ambiente nuevo, la carga falla con `ubicacion_semestral_etiqueta_key`. La simulación (`dry_run`) no lo detecta | Programación Académica / Programas Académicos | Media |
| 12 | El esquema local venía de los volcados de `db/init`, sin la PK de `PlanTrabajoAcademico` (definida en la 190) y sin las migraciones de aprobación (340, 376, 387, 396, 398, 399, 401) ni la de auditoría del RUND (428), que exige la lectura de un PTA. Ya se aplicaron en local, con respaldo y registradas en `auth.migrations_db_log`. No se aplicaron la 369 ni la 397, que tocan permisos de roles en auth | Infraestructura | Resuelto en local |
