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

1. **Revisar la tabla de equivalencias territoriales** (sección 4.1). La migración 038 crea la tabla **vacía**. Las 17 filas propuestas están en `db/dev-fixtures/equivalencia_territorial_propuesta.sql` y se cargan solo en local.
2. **Qué aprueban investigación y extensión.** Si el negocio dice que también revisan la Docencia, se agregan a `REVISIONES_REQUERIDAS`, sin cambiar el esquema ni el flujo.
3. **Firma.** Hoy es simulada, por decisión de Tomás, pero queda registrada. Para la firma real hay que ampliar de forma aditiva el DTO de OTP de auth-service para aceptar `prog-docencia:<id>:<huella>:<rol>`, como se hizo con el paz y salvo.
4. **Confirmar en dev** que la activación de periodo no falla por `uuid = text` (sección 6).
5. **Desplegar los dos servicios juntos** y definir el corte. Si se enciende un solo lado, no pasa nada: el régimen nuevo exige los dos.

### 4.1 Alcance territorial — para revisión

**Cómo funciona.** JEFATURA_TERRITORIAL y APROBADOR_DOCENCIA deciden **solo** sobre su territorial:
- la del docente sale del RUND (`DT-xxx`);
- la del aprobador sale de sus seccionales en auth;
- se cruzan con la tabla `equivalencia_territorial`, por código.

Lo que no esté en la tabla falla cerrado: no decide nadie con alcance filtrado. La misma tabla resuelve la territorial de la jefatura que no se podía asignar en EFDS-2304.

**Filas que hay que revisar:**

| Fila | Por qué es dudosa |
|---|---|
| SC | La seccional existe también duplicada como 900001 |
| DT-003 → BOL | Existe también 900004 (BCS) |
| DT-010 → MET | Su id es 18, fuera de la numeración del resto |
| DT-012 → NDS | Existe también 900013 (NSA) |
| Quindío (13, QUI) | No tiene DT en el RUND, así que no tiene fila |

Además, en auth hay un catálogo duplicado de seccionales, 900014 a 900029, con códigos DT. La propuesta usa las seccionales originales, no esas.

---

## 5. Lo construido (apagado por defecto)

- **EFDS-2306:** la docencia sale de la franja (registro único), con las horas del cálculo único del contrato y el reparto por días en una función reemplazable.
- **EFDS-2315:**
  - concertación completa (enviar, revisar, devolver, aprobar), con los roles y el alcance territorial del PTA;
  - firma simulada registrada (quién, cuándo, rol, huella, contexto);
  - Docencia desactivada en el PTA y decisión aplicada (secciones 1 y 2);
  - un solo interruptor, verificado en los dos lados, con corte por periodo.
- **EFDS-2304:** territorial de la jefatura por la equivalencia, además de la tabla legada.
- **EFDS-2311:** las vistas vuelven a leer del servidor tras aprobar, con el mecanismo común de Codex.
- **Carga masiva (EFDS-2314):** verificada **solo hasta el importador** (simulación). **No está confirmada**: ver la sección 6.

---

## 6. Pendientes para sus dueños

| # | Hallazgo | Dueño | Gravedad |
|---|---|---|---|
| 1 | **El importador convierte en 0 las horas vacías** de 3 asignaturas: ASIG-00139 y ASIG-00427 (Opciones De Grado AP) y ASIG-00218 (Seminario De Opciones De Grado APT). Un 0 parece un dato real, y el vacío decía "sin definir". Es peor que lo de las tildes | Programas Académicos (Julián Rojas) | Alta |
| 2 | El importador no es idempotente: recalcula campos derivados (Circular 003, `modalidad_sufijo`) y corrige tildes en 6 nombres ("Publico" → "Público") | Programas Académicos | Media |
| 3 | La plantilla de carga no trae `pensum` ni las columnas de la Circular 003. El catálogo local tiene 0 asignaturas con pensum | Programas Académicos | Media |
| 4 | El importador crea periodos en estado `en_curso` | PTA / Programas Académicos | Media |
| 5 | La activación de periodo puede fallar por `uuid = text` al terminar los PTA. En local `PlanTrabajoAcademico.id` es text, así que hay que **confirmarlo en dev** | PTA | Alta si se confirma |
| 6 | El esquema local del PTA diverge: `id` text sin PK y faltan las tablas de aprobación (`PtaComponentApproval`, Review, Territorial). La migración 327 no aplica en local | PTA / infraestructura | Media (impide probar en local) |
| 7 | Las fechas del PTA se corren un día por la zona horaria | PTA | Media |
| 8 | Catálogo de seccionales duplicado en auth (900014–900029, más 900001, 900004 y 900013) | Gestión de usuarios (auth) | Media; no se toca sin aprobación |
| 9 | auth-service escribe directamente en el esquema del PTA | auth / PTA | Media |
| 10 | La migración `db/init` 010 (Control Interno) falla en local | Control Interno | Baja |
