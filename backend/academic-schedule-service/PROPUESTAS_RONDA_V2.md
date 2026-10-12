# Propuestas — ronda v2 (sin aplicar)

Para decisión de Tomás y Nicolás. Nada de esto está construido: son los pasos que faltan para encender la concertación (EFDS-2315) y para que la docencia aprobada llegue al PTA. Lo que **sí** está construido y apagado por defecto se describe al final.

---

## 1. Desactivar la aprobación de Docencia en el PTA

**Objetivo.** Que la Docencia se apruebe una sola vez, en la concertación de Programación Académica. Los PTA que ya están en curso o firmados no se tocan.

**Corte por periodo, no global.** Se agrega un ajuste en `ConfiguracionSistema` (por ejemplo `docencia_desde_programacion: ["2027-1"]`) con los periodos en los que la Docencia viene de Programación Académica.
- Un PTA de otro periodo sigue con el flujo actual.
- Un PTA ya enviado o en un estado cerrado (`APROBADO`, `EN_FIRME`, etc.) nunca cambia de flujo, aunque su periodo esté en la lista.

**Cambios en el PTA, todos en `pta.service.ts`:**

| # | Dónde | Qué |
|---|---|---|
| 1 | `aprobarComponente`, `revisarComponente` y las variantes territoriales y en lote | Si el componente es `academica_*` y el periodo del PTA está en el corte, responden 409: "La docencia se aprueba en Programación Académica". El backoffice deja de mostrar esas acciones |
| 2 | Al aplicar una decisión concertada | Las filas `academica_pregrado` / `academica_posgrado` de `PtaComponentApproval` quedan `aprobado`, con `scope = 'programacion'` y `scope_id = id_concertacion`. Es el mismo mecanismo que hoy usa `solicitud_edicion` |
| 3 | `resetParallelApprovalWorkflow` / `resetComponentApprovalWorkflow` | Un reenvío completo del PTA **no** reinicia las filas con `scope = 'programacion'` |
| 4 | Consolidación (`svc:10719-10738`) | Sin cambios: si todos los componentes están aprobados, el PTA pasa a Aprobado, como hoy |
| 5 | `academica_territorial` | Se trata igual que pregrado y posgrado. La concertación hoy separa por nivel; si se necesita la división territorial, se agrega como dimensión de la concertación |

**Riesgos:**
- Sin el corte por periodo, los PTA en curso quedarían con la Docencia sin aprobar y sin nadie que la apruebe. Por eso el corte es obligatorio.
- El hallazgo de la activación (la terminación de PTA falla por `uuid = text`) es independiente, pero conviene corregirlo antes de usar el corte, porque ambos tocan el ciclo del periodo.

**Encender la concertación.** Con este cambio desplegado y el corte definido, se pone `PROG_CONCERTACION_HABILITADA=true` en Programación Académica. Desde ese momento la jefatura deja de aprobar por franja; esto ya está construido.

---

## 2. La docencia aprobada aparece en el PTA (integración)

**Hoy.** Al aprobar, Programación Académica entrega la decisión por el contrato (`POST /contrato-programacion/v1/docencia/decisiones`). El PTA solo la **registra** en `docencia_concertada`, con `aplicada_en` en NULL.

**Propuesta.** Un paso en el PTA, `aplicarDocenciaConcertada(idConcertacion)`, que corre al registrar la decisión:
1. Busca el PTA del docente (por documento) en el periodo (con el modelo único, el código de periodo es el mismo en los dos módulos).
2. Si el PTA **no existe todavía**, no hace nada. Cuando el docente cree su PTA, se precarga la docencia concertada de ese periodo.
3. Si el PTA existe y **no está cerrado**:
   - escribe las asignaturas en `datosEstructurados.asignaturas` con `origen: 'programacion'` y `id_concertacion`;
   - aplica el punto 2 de la propuesta 1;
   - marca `aplicada_en`.
4. Si el PTA está **firmado o cerrado**: no lo modifica. Usa el flujo existente de edición por componente (EFDS-1226, `SolicitudPta` de tipo `edicion_componentes` con clave `docencia`). La solicitud nace aprobada por el origen y deja la decisión trazada.

**No editable en el PTA.**
- Las asignaturas con `origen: 'programacion'` se muestran en solo lectura en `PTAForm`.
- `savePTA` rechaza cualquier cambio sobre ellas.
- La única fuente es Programación Académica.

**Cambios después de creado el PTA.** Si la docencia cambia en Programación Académica:
- se devuelve la concertación;
- el docente vuelve a enviar;
- al aprobarse de nuevo, el mismo `id_concertacion` reemplaza la docencia del PTA (es idempotente).

**Horas.**
- **Hoy:** salen del cálculo único del contrato (`horasImpacto`) con el reparto por días cuando dos docentes comparten un grupo (`docencia/reparto.ts`). El PTA las recibe ya calculadas y no las recalcula.
- **Pendiente del negocio:** cómo se reparten cuando dos docentes comparten un grupo. Si cambia la regla, se cambia esa sola función.

---

## 3. El interperiodo — DECIDIDO

**Decisión de Javier:** el interperiodo es un **semestre aparte**. No va ligado al primero ni al segundo.

**Qué queda así:**
- 2026-INT sigue **fuera de la migración**, con destino NULL en `equivalencia_periodo`. Opera en el modelo legado y aparece en "Periodos anteriores al modelo único".
- No se asigna a 2026-1 ni a 2026-2.

**Lo que falta para modelarlo como periodo propio** (pendiente, sin construir):
- `periodo_academico` (dueño: el PTA) solo admite `semestre` 1 o 2 y un código año-semestre. Un interperiodo propio necesita ampliar ese modelo, por ejemplo con un tipo de periodo o un código `2026-INT`.
- Ese cambio es del PTA y de Programas Académicos (Julián Rojas). Cuando exista, entra con una fila en `equivalencia_periodo` y `reapuntar_grupos_por_equivalencia()`, sin otro cambio en Programación Académica.

## 4. Bloqueantes para encender la concertación

1. **La propuesta 1 aprobada y desplegada.** Si no, hay doble aprobación.
2. **El alcance territorial de los aprobadores.**
   - El PTA compara contra `auth.seccionales`; la territorial del docente viene del RUND (`DT-009`), y no hay vínculo estructurado entre los dos (el RUND no trae `sedeId`).
   - Hoy solo SUPER_ADMIN o un rol con alcance **Global** decide. JEFATURA_TERRITORIAL y APROBADOR_DOCENCIA no tienen alcance definido, así que **no deciden** (fail-closed).
   - Se necesita una de dos: que el RUND traiga la sede, o una tabla de equivalencias `direccion_territorial ↔ seccional` revisada por el negocio.
3. **Qué aprueban investigación y extensión.** Si el negocio dice que también revisan la Docencia, se agregan a `REVISIONES_REQUERIDAS`, sin cambiar el esquema ni el flujo.
4. **Firma.** Hoy es simulada, por decisión de Tomás, pero registrada. Para la firma real hay que ampliar de forma aditiva el DTO de OTP de auth-service para aceptar `prog-docencia:<id>:<huella>:<rol>`, como se hizo con el paz y salvo.

---

## 5. Lo construido (apagado por defecto)

- **EFDS-2306:** la docencia sale de la franja (registro único), con las horas del cálculo único del contrato y el reparto por días en una función reemplazable.
- **EFDS-2315:**
  - concertación completa (enviar, revisar, devolver, aprobar), con los roles del PTA;
  - firma simulada registrada (quién, cuándo, rol, huella, contexto);
  - entrega al PTA por el contrato;
  - se apaga con `PROG_CONCERTACION_HABILITADA`.
- **EFDS-2311:** las vistas vuelven a leer del servidor tras aprobar, con el mecanismo común de Codex.
- **Contrato:** `POST /contrato-programacion/v1/docencia/decisiones` en el PTA. Solo registra, en la tabla propia `docencia_concertada` (migración 667).
