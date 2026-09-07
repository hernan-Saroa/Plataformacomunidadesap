# Addendum al Plan — Módulo Programación Académica (EFDS-1368 a 1371)

> Complemento del plan de trabajo. **Prevalece sobre el documento original** donde haya
> contradicción. Redactado tras ejecutar la Tarea 0 contra la rama
> `feat/habilitar-modulo-programacion-academico`.
>
> Fecha: 28 de agosto de 2026 · Rama base del módulo: `feature/programacion-academica`

---

## A. Corrección de B-1 (el bloqueo estaba mal declarado)

**Texto anterior (incorrecto):**
> ✅ RESUELTO — el enabler EFDS-1367 ya está construido. El microfront, los
> microservicios base, **el consumo del RUND y el canal al PTA existen**.

**Texto corregido:**

> ⚠️ **PARCIAL — el enabler aporta estructura, NO contratos.**
> Confirmado por evidencia en `feat/habilitar-modulo-programacion-academico`
> (commit `64f923a7`, Henrry Rojas, 28-ago).
>
> **Sí existe:** MFE `apps/mfe-programacion-academica` (federación
> `programacion_academica`, puerto 3116), microservicio
> `backend/academic-schedule-service` (puerto 3013), ruta en el gateway, registro en
> el shell (`SidebarPremium`, `BackofficeApp`), esquema `"academic-schedule"` con
> `periodo_programacion` y `franja_horaria`, y el módulo `programacion-academica`
> sembrado en `auth.module`.
>
> **NO existe:** el cliente de consumo del RUND, el canal hacia el componente de
> Docencia del PTA, ninguna entidad TypeORM, ningún repositorio y ningún endpoint de
> negocio (`app.module.ts` tiene `imports: []`; el servicio solo expone `/health`).
> Tampoco hay permisos granulares: el seed crea el módulo pero **cero** registros en
> `auth.permission`. El MFE renderiza datos fijos (`INITIAL_SCHEDULE`), sin cliente API.

**Origen del error:** B-1 se redactó sobre una confirmación verbal, no sobre evidencia
del repositorio. La instrucción del propio plan aplica: *manda el repositorio*.

### A.1 Consecuencia fuera de nuestro alcance — escalar a Henrry

Los criterios de aceptación de **EFDS-1367** exigen que el módulo consulte el RUND en
modo lectura por cédula (contrato de consumo establecido) y que la asignación de carga
alimente el componente de Docencia del PTA. **Con `imports: []` y solo `/health`, esos
dos AC no se cumplen.**

EFDS-1367 no debería aprobarse en su estado actual, o requiere un ticket de seguimiento
que cubra ambos contratos. Debe plantearse **antes de que la épica avance**, porque las
fases 3 y 4 (asignación docente y control de horas) dependen de esos dos canales.

### A.2 Petición operativa a Henrry

Nuestras 4 ramas de HU salen de `feat/habilitar-modulo-programacion-academico`, no de
`micro-frontend` (el enabler todavía no aterriza ahí). Por lo tanto:

> **No rebasear ni forzar push sobre `feat/habilitar-modulo-programacion-academico`.**

Un rebase deja las 4 ramas con historia huérfana y convierte la integración en un
conflicto grande. El PR final `feature/programacion-academica` → `micro-frontend` solo
se abre **después** de que el enabler llegue a `micro-frontend`.

---

## B. Decisión 1 — `franja_horaria` cuelga de la asignatura (se corrige en 1370)

**Problema.** El esquema del enabler enlaza `franja_horaria.id_asignatura`
**directamente**, sin `grupo` intermedio. Es exactamente el antipatrón que advierte el
plan (§8): *"El horario y las fechas cuelgan del grupo, no de la asignatura. Modelarlo al
revés obliga a rehacer 1371."* Además incumple RN-11: cada grupo debe ser una instancia
independiente.

**Decisión.** Lo corrige **nuestro equipo dentro de EFDS-1370**, no Henrry:

1. La entidad `grupo` **es el entregable de 1370**. Delegarla implicaría que un tercero
   construya la tabla central de nuestra HU y luego nosotros encima: duplica contexto y
   añade espera.
2. Es el momento más barato posible: tablas vacías, sin datos, enabler sin mergear.
3. No es un arreglo colateral: **es el requisito** (RN-11).

**Cómo (obligatorio).** **No editar la migración de Henrry.** Crear una migración nueva
en `backend/academic-schedule-service/db/migrations/` que:

- cree la tabla `grupo` (FK a asignatura, número de grupo, periodo);
- añada `franja_horaria.id_grupo` con su FK;
- sea **forward-only e idempotente**, como el resto del repo (el runner registra por
  nombre de archivo, ver `migrate.local.sh`).

Editar una migración de una rama ajena sin mergear es garantía de conflicto.

**Comunicación.** Avisar a Henrry para que el esquema documentado del enabler quede
corregido.

**Impacto en horas:** +2 h en EFDS-1370 (12 → 14).

---

## C. Decisión 2 — `bigint` con FK real (UUID se elimina)

**Problema.** `franja_horaria.id_programa` e `id_asignatura` son **UUID sin FK**, pero el
catálogo autoritativo (`academic_work_plan.programa`, `academic_work_plan."Asignatura"`)
usa **bigint**. Tal como está, no referencia nada y además impide la FK: el peor de los
dos mundos.

**Verificación ejecutada (28-ago).** ¿Comparten base de datos?

> **Sí.** `academic-schedule-service`, `academic-work-plan-service` y `auth-service`
> apuntan todos a `DB_HOST: db` / `DB_NAME: esap_db` (contenedor `superapp-db`, ver
> `docker-compose.dev.yml`). Son **esquemas distintos dentro de la misma instancia**, y
> PostgreSQL soporta FK entre esquemas.

**Decisión.** `id_programa` e `id_asignatura` pasan a **`bigint` con FK real** hacia el
catálogo de `academic_work_plan`. Se implementa en la misma migración nueva de la
decisión B.

**Descartado: replicar el catálogo.** Crearía una segunda fuente de verdad sobre datos
que RN-01 y RN-02 declaran autoritativos del SNIES. Ya conocemos ese desenlace:
**EFDS-1536 y EFDS-1539 fueron exactamente eso** —dos fuentes de verdad divergiendo— y
costaron ~9 h de diagnóstico entre ambos. Además, la sincronización no tendría dueño.

**Si en el futuro se separan las bases:** mantener `bigint` como identificador foráneo
(nunca UUID) y consumir el catálogo por API del servicio dueño. Un read-model cacheado
solo se discute ante un problema de rendimiento **medido**, y quedaría marcado
explícitamente como **no autoritativo**.

---

## D. Decisión 3 — El "16N" no se implementa literal: se reusa el calculador del PTA

**Problema.** El AC-03 de EFDS-1369 pide `N créditos = N × 16 horas`. Pero
`backend/academic-work-plan-service/src/pta/horas-pta.calculator.ts` implementa la
**Circular Dispositiva 003 de 2025**, que es más específica:

- `horasBasePorCredito` **parametrizado por programa** (16 **o 12**);
- excepciones con horas fijas: `seminario_enfasis`=384, `opciones_grado_ap`=20,
  `seminario_opciones_apt`=144;
- `horasPregradoCentral` (64 h de clase) para pregrados centrales;
- factor ×3 del Art. 37.

**Por qué importa.** El propósito declarado del módulo es **alimentar el componente de
Docencia del PTA**, y RN-06 dice que esas horas son **inalterables**. Si Programación
Académica calcula con 16N fijo y el PTA con la Circular 003, se produce divergencia
**en el punto exacto de integración entre los dos módulos**: el mismo patrón de bug de
EFDS-1536/1539, pero ahora cruzando servicios.

**Lectura correcta.** El AC-03 no está equivocado, está **incompleto**: 16N es el caso
por defecto de la Circular 003 (factor 16), redactado en el ERS como equivalencia general
del SNIES. La Circular es la regla operativa más específica y el ERS de junio no recogió
el factor 12 ni las excepciones.

**Decisión.** Invocar el **calculador compartido** con 16 como factor por defecto. No
duplicar la fórmula.

**Tests de AC-03 (reemplazan a los dos originales):**

```
EFDS-1369 :: AC-03 :: 3 créditos con factor 16 equivale a 48 horas
EFDS-1369 :: AC-03 :: 3 créditos con factor 12 equivale a 36 horas
EFDS-1369 :: AC-03 :: asignatura con horas fijas ignora el cálculo por créditos
EFDS-1369 :: AC-03 :: el resultado coincide con el del calculador del PTA
```

El último es el que **protege la integración** y no puede omitirse.

**Escalamiento obligatorio.** Esto es una desviación de un AC escrito: no puede quedar
solo en el código. Debe subirse a **Nicolas Mancera** para corregir el texto de la HU.
Es el momento adecuado: las 4 HUs siguen en "En aprobación" y se editan sin ceremonia.

---

## E. Estimación recalibrada

| Ítem | Plan | Ajustado | Motivo |
|---|---|---|---|
| Tarea 0 | 2,0 | **2,0** | Ejecutada |
| EFDS-1368 | 14,0 | **12,0** | Catálogo reutilizable; RBAC y consumo desde cero |
| EFDS-1369 | 13,0 | **11,0** | Entidad existe; falta unicidad de `codigo` + inmutabilidad backend |
| EFDS-1370 | 12,0 | **14,0** | +2 h: crear `grupo` y refactorizar `franja_horaria` (decisión B) |
| EFDS-1371 | 20,0 | **20,0** | Falta `tipo_sesion`; sin librería de calendario |
| **Total** | 61,0 | **59,0** | |

> El total coincide casi con el original **por compensación**, no porque nada haya
> cambiado: bajan 1368 y 1369 por reutilización, sube 1370 por el refactor.

---

## F. Estado de las ramas (creadas 28-ago)

```
feat/habilitar-modulo-programacion-academico   (enabler, Henrry — NO REBASEAR)
└── feature/programacion-academica              (integración del módulo)
    ├── feature/pa/EFDS-1368-seleccion-nivel-programa
    ├── feature/pa/EFDS-1369-asignatura-codigo-snies
    ├── feature/pa/EFDS-1370-gestion-grupos
    └── feature/pa/EFDS-1371-horario-calendario
```

**Desviación del §4 del plan, deliberada:** el plan indica ramificar desde
`micro-frontend`, pero el enabler aún no está allí; hacerlo habría producido ramas **sin
el módulo**. Se ramificó desde el enabler. Cuando este llegue a `micro-frontend`, la
integración es un merge normal.

---

## G. Bloqueos vigentes tras el addendum

| # | Bloqueo | Estado |
|---|---|---|
| B-1 | Enabler | ⚠️ **Reclasificado**: estructura sí, contratos no (§A). Escalar a Henrry |
| B-2 | Catálogo de asignaturas real | 🔴 Vigente — construir contra seed |
| B-3 | Planes de estudio | 🔴 Vigente — construir contra seed |
| B-4 | Numeración de grupos | 🟡 Vigente — estrategia aislada y reemplazable |
| B-5 | Comportamiento del calendario | 🟡 Vigente — decisiones por defecto del §9 del plan |
| B-6 | HUs en "En aprobación" | 🟡 Vigente — **aprovechar para corregir el AC-03 (§D)** |
| **B-7** | **Contratos RUND y PTA ausentes en el enabler** | 🔴 **NUEVO** — bloquea fases 3 y 4; no bloquea nuestras 4 HUs |
