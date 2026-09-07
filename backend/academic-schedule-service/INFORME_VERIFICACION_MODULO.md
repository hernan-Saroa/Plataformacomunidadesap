# Informe de verificación — Módulo de Programación Académica (épica EFDS-1366)

Constancia de estado del módulo: qué está implementado, qué se verificó y cómo, y
**qué NO** — sin necesidad de levantar el entorno. Todo valor pegado aquí salió de
ejecutar el comando o de recorrer la interfaz, no de deducirlo.

Rama de integración: `feat/habilitar-modulo-programacion-academico` · commit al cierre `90f86e9e`.

---

## 0. Hallazgo que cambia el veredicto — PANTALLA HUÉRFANA (bloqueante)

> **El módulo está implementado y funciona por API, pero es INALCANZABLE por el
> ratón para su usuario previsto.** Un usuario con rol `PROGRAMADOR_PREGRADO` NO
> ve la entrada "Programación Académica" en el sidebar del backoffice.

**Verificado por navegador real** (no por API): con el usuario de pruebas
`qa.programacion` (rol `PROGRAMADOR_PREGRADO`) logueado, el sidebar del backoffice
**no lista el módulo**. Evidencia: `evidencia/02-sidebar-SIN-modulo-huerfano.png`.

### Causa raíz

El backoffice decide qué módulos muestra a partir de la lista `modules` del
usuario. Esa lista **se deriva del prefijo del permiso**, no del código del módulo
(`backend/auth-service/src/auth/auth.service.ts:402`):

```ts
const code = permission.code.split('.')[0].toLowerCase().replace(/_/g, '-');
```

- Permisos del rol: `programacion.catalogo.pregrado`, `programacion.docentes.disponibilidad`
- Derivación: `split('.')[0]` → **`programacion`**
- Módulo registrado (`auth.module`) y esperado por el sidebar: **`programacion-academica`** (alias `academic-schedule`)
- `SidebarPremium.canShowModule('programacion-academica')` compara los alias
  `['programacion-academica','academic-schedule']` contra `['programacion']` → **no coincide → oculto**.

Es un desajuste de convención de nombres: el prefijo de permiso (`programacion`)
nunca iguala al código del módulo (`programacion-academica`). Para otros módulos el
prefijo sí coincide (p. ej. `pta.*` → `pta`), por eso solo este cae.

### Por qué no se detectó antes

Toda la verificación previa fue **a nivel de API** (curl a los endpoints por el
gateway). El recorrido con ratón desde el login —lo que pidió el PUNTO 3.2— es lo
que lo destapó. Es la misma clase de defecto de EFDS-1643.

### Qué NO hice

Por la condición de parada ("reportar la pantalla huérfana antes de conectarla,
puede ser síntoma de algo mayor"), **no la conecté**. No toqué la derivación, el
sidebar ni los permisos. Queda para decisión conjunta.

### Opciones de arreglo (para discutir, no implementadas)

1. **Renombrar los permisos** a `programacion_academica.*` (con guion bajo, que la
   derivación convierte a `programacion-academica`). Toca la migración de permisos y
   el RBAC del módulo. Riesgo: coordinar con quien ya tenga esos permisos. ~1,5 h.
2. **Agregar `programacion` como alias** del módulo en `SidebarPremium` (mapa de
   alias, línea ~104). Cambio mínimo en un archivo, pero deja la convención torcida
   (el resto de módulos deriva bien). ~0,5 h.
3. **Corregir la derivación** para mapear prefijos a códigos de módulo. Toca el
   auth-service, afecta a todos los módulos → mayor alcance/riesgo. ~2 h.

Recomiendo la **opción 1**: alinea la convención en la fuente en vez de parchear el
consumidor. Pero es decisión del equipo por el impacto en permisos existentes.

**Consecuencia para este informe:** las capturas de la UI del módulo (§7) quedan
BLOQUEADAS — no hay forma legítima de renderizar el módulo por el ratón mientras el
huérfano exista, y no forcé la visibilidad manipulando la respuesta de autenticación.

---

## 1. Reconciliación de ramas (PUNTO 1)

| Rama | Commit | ¿Qué contiene? |
|---|---|---|
| `feature/programacion-academica` | `acae77f1` | Solo **fases 1–2** (migraciones 003–010, catálogo/grupos/horarios). **Ninguna** HU de fases 3–4. Rama quedada. |
| `feat/habilitar-modulo-programacion-academico` | `90f86e9e` | **Todo**: fases 1–2 + las 5 HU de fases 3–4 (1372, 1373, 1374, 1375, 1376) + el contrato PROG↔PTA. Es la rama de la muestra. |

**¿Las cinco HU de fases 3 y 4 están en la rama de Henrry (la de la muestra,
`feat/habilitar-modulo-programacion-academico`)? → SÍ.**

`feature/programacion-academica` es una rama distinta y **quedada**: está totalmente
contenida en `habilitar` como ancestro, pero se detuvo en fases 1–2. Si alguien
buscara el módulo ahí, lo vería incompleto.

**Historia de Henrry intacta:** su commit `fb0fa30e` ("Ajustes para realizar
migraciones por microservicio") sigue siendo ancestro de `habilitar`; no se
reescribió historia (sin `--force`, sin rebase de sus commits).

### Resumen para Henrry (para que lo mande el líder, no yo)

- **Entraron 5 HU** de fases 3–4 en `feat/habilitar-modulo-programacion-academico`:
  EFDS-1372 (asignación + bloqueo duro), 1373 (descuento de horas + contrato de
  cálculo, cierra EFDS-1651), 1374 (bloqueo transversal de aulas), 1375 (5 ofertas),
  1376 (fechas de vinculación).
- **5 migraciones nuevas** (012–016): `012_create_asignacion_docente`,
  `013_asignacion_confirmacion_disponibilidad`, `014_seed_docentes_catedra_desarrollo`,
  `015_aulas_y_bloqueo`, `016_ofertas_academicas`.
- **Pruebas:** microservicio 86/86, contrato 24/24.
- **Historia:** su commit `fb0fa30e` sigue siendo ancestro; no se reescribió nada.
- **Pendiente crítico antes de exponer a decanaturas:** el huérfano del §0.

---

## 2. Estado del entorno de la muestra (PUNTO 2)

- **Rama de la muestra:** `feat/habilitar-modulo-programacion-academico`. **Ya no
  está en el estado del día de la muestra** — recibió los merges de fases 3–4 y de
  la reconciliación posteriores. La muestra corrió sobre `374b69d4`; hoy está en `90f86e9e`.
- **Baseline de datos: intacto.** grupo DEMO con **2** sesiones · catálogo
  **14 / 427 / 16** · asignaciones en **0**.

### Inventario de lo removible (NO borrar aún — para decisión)

| Elemento | Qué es | Cuánto | Sentencia de borrado |
|---|---|---|---|
| Usuario `qa.programacion` | Usuario de pruebas del demo | 1 | `DELETE FROM auth.user_roles WHERE id_user IN (SELECT id_user FROM auth."user" WHERE username='qa.programacion'); DELETE FROM auth."user" WHERE username='qa.programacion'; DELETE FROM auth.personas WHERE num_identificacion='1020304050';` |
| Docentes cátedra sintéticos | Aprovisionamiento para RN-04 (mig. 014) | 2 | `DELETE FROM academic_work_plan."Docente" d USING auth.personas p WHERE d."personaId"=p.id_person AND p.num_identificacion IN ('9000000001','9000000002'); DELETE FROM auth.personas WHERE num_identificacion IN ('9000000001','9000000002');` |
| Grupo DEMO | Seed de demostración (mig. 010) | 1 grupo / 2 franjas | `DELETE FROM "academic-schedule".grupo WHERE observaciones='DEMO';` (cascada a franjas) |
| Aulas provisionales | C-4 sin resolver (mig. 015) | 5 | `DELETE FROM "academic-schedule".aula WHERE provisional=true;` |

**Recomendación:** conservar todo hasta que se resuelva el huérfano y se rehaga la
verificación por navegador; el usuario y los seeds son necesarios para volver a
probar. Retirar solo cuando el módulo entre a un flujo de datos reales.

---

## 3. Coherencia visual con la plataforma (a nivel de código)

> ⚠️ **Alcance honesto:** por el huérfano del §0 no pude renderizar el módulo por el
> ratón, así que **esta comparación es a nivel de código, no de píxeles.** Lo que
> exige mirar la pantalla renderizada queda pendiente hasta resolver el huérfano.

| Aspecto | Módulo | Resto de la plataforma | Veredicto (código) |
|---|---|---|---|
| Layout | usa `shared/ModuleLayout` | contratación, control-interno, control-disciplinario, gestión-legal usan el mismo `ModuleLayout` | ✅ alinea con los MFE recientes |
| Color institucional | `#003DA5` hardcodeado (63×) | el PTA hardcodea `#003DA5` (760×) | ✅ misma convención de la plataforma (nadie usa un token compartido) |
| Íconos | `lucide-react` | el resto de MFE usa `lucide-react` | ✅ misma librería |
| Sidebar del módulo (interno) | `ModuleLayout` + `MenuGroup`, azul institucional | igual patrón | ✅ (código) |

**Discrepancia declarada:** el PTA **no** usa `ModuleLayout` (usa su propio layout,
más antiguo). El módulo se parece a los MFE **nuevos** (contratación, control-*),
no al PTA. No es un defecto —es la convención vigente— pero si el patrón de
referencia fuera el PTA, habría diferencia de layout. **No corregido:** requeriría
decidir cuál es el patrón canónico; no es trivial.

**La rejilla de calendario (riesgo señalado):** `CalendarioHorario.tsx`, ~362
líneas, hecha a mano sin librería. A nivel de código usa las mismas clases Tailwind
y `#003DA5` que el resto del módulo. **Si parece "pegada" o no, no lo puedo afirmar
sin verla renderizada** — y eso está bloqueado por el huérfano. Queda como el
riesgo visual principal, sin veredicto visual.

---

## 4. Inventario de rutas — alcanzabilidad

Las secciones del módulo **no son rutas URL**: son estado interno del componente
(`setSeccion`), conmutado por clics en el sidebar del módulo. Para llegar al módulo
hay dos saltos: sidebar del backoffice → módulo, y luego sidebar del módulo → sección.

| Pantalla | Cómo se llega | ¿Alcanzable con ratón? |
|---|---|---|
| **Módulo (cualquier sección)** | Backoffice → sidebar → "Programación Académica" | **NO — pantalla huérfana (§0)** |
| Catálogo (1368/1369) | dentro del módulo → "Catálogo Académico" | sí, *si* el módulo fuera alcanzable |
| Programación/horarios (1371) | módulo → "Programación General" | ídem |
| Aulas (1374) | módulo → "Disponibilidad de Aulas" | ídem |
| Asignación docente (1372/1373/1376) | módulo → "Disponibilidad Docente" | ídem |
| Ofertas (1375) | módulo → "Ofertas Académicas" | ídem |
| Validación de cruces | módulo → "Validación de Cruces" | ídem |

**Todas las pantallas del módulo son huérfanas hoy**, no por su navegación interna
(que es correcta), sino porque el módulo entero no aparece en el sidebar del
backoffice para el rol previsto (§0).

---

## 5. Matriz de trazabilidad — HU → criterio → evidencia

Evidencia por **prueba** (nombre trazable) y **API** (endpoint verificado por
navegador/gateway). La evidencia por **captura de UI** está bloqueada por el
huérfano (§0) y se marca como tal.

| HU | Criterio | Regla | Cómo se verifica | Evidencia |
|---|---|---|---|---|
| EFDS-1368 | Selección de catálogo por nivel | RN-08 | `catalogo.service.spec` + `catalogo.integracion.spec` + API `GET /catalogo/programas?nivel=` | test + API ✅ · UI bloqueada |
| EFDS-1368 | `horasBasePorCredito` 16/12 | Circular 003 | API devuelve 16 pregrado / 12 maestría | test + API ✅ |
| EFDS-1369 | Asignatura por código SNIES | RN-01 | `catalogo.codigo.spec` + API `GET /catalogo/asignaturas/ASIG-00132` → 384 h | test + API ✅ · UI bloqueada |
| EFDS-1369 | Derivado de solo lectura | RN-02 | `catalogo.inmutabilidad.spec` (estructural: sin rutas de escritura) | test ✅ |
| EFDS-1370 | Varios grupos por asignatura | RN-11/AC-03 | `grupos.service.spec` + API `POST /grupos cantidad=2` | test + API ✅ |
| EFDS-1370 | Mismo docente en 2 grupos | AC-03 | `grupos.service.spec` (sin unicidad docente-asignatura) | test ✅ |
| EFDS-1371 | Franja arbitraria (sin intervalos) | AC-01 | `horarios.service.spec` + API franja 11:05–12:35 → 201 | test + API ✅ |
| EFDS-1371 | Solape intra-grupo rechazado | AC-03 | `horarios.service.spec` + `solapamiento` | test ✅ |
| EFDS-1372 | Panel del docente solo lectura | RN-09 | `catalogo.inmutabilidad` + estructural del contrato (sin rutas de escritura) | test ✅ · UI bloqueada |
| EFDS-1372 | Situación no asignable + motivo + vigencia | — | `situacion-docente.spec` + API `GET /asignaciones/docente/19195704` (sabático) | test + API ✅ · UI bloqueada |
| EFDS-1372 | Bloqueo duro con TODOS los motivos | RN-07/10/12 | `reglas-asignacion.spec` + `bloqueo-duro.agregado.spec` | test ✅ |
| EFDS-1372 | Cruce transversal sin revelar grupo | RN-07 | `reglas-asignacion.spec` (mensaje sin id de grupo) | test ✅ |
| EFDS-1373 | Cálculo por el contrato (cierra 1651) | RN-03 | `calculo-horas.paridad.spec` (427 asignaturas) + API `GET /contrato-programacion/v1/calculo/...` | test + API ✅ |
| EFDS-1373 | Factor carrera ×3 / cátedra ×1 | RN-03 | `factor-vinculacion.spec` | test ✅ |
| EFDS-1373 | Tope transversal por oferta | RN-04/05 | `acumulado.spec` + API `GET /asignaciones/acumulado/` | test + API ✅ |
| EFDS-1373 | Cátedra 304 h transversal | RN-04 | `acumulado.spec` + API acumulado de `9000000001` → tope 304 | test + API ✅ |
| EFDS-1374 | Bloqueo de aula por salón/horario | RN-07 | `aulas` + API `POST /horarios` mismo aula cruzado → 400 | test + API ✅ |
| EFDS-1374 | Disponibilidad sin revelar ocupante | RN-07 | `aulas.confidencialidad.spec` (estructural: SELECT no trae grupo/asignatura/docente) | test ✅ |
| EFDS-1374 | Aula obligatoria al publicar | — | API `POST /aulas/publicar/:g` con franja sin aula → 400 | API ✅ |
| EFDS-1375 | Cinco ofertas académicas | — | `ofertas.agregado.spec` (2+2+1) + API `GET /ofertas` | test + API ✅ |
| EFDS-1375 | Acumulación por semestre entre ofertas | — | `ofertas.agregado.spec` (total = Σ por oferta) | test ✅ |
| EFDS-1376 | Fechas de vinculación en el contrato | RN-10 | `docentes-contrato.service` expone `vinculacion_desde/hasta` | código + API ✅ |
| EFDS-1376 | Rango RN-10 reutilizado | AC-02 | `vinculacion-rango.spec` (reutiliza 1372) | test ✅ |
| EFDS-1376 | Confirmación de disponibilidad (AC-03) | — | API `POST /asignaciones` con `disponibilidadConfirmadaPor` → registra quién/cuándo | API ✅ · UI bloqueada |

**Criterios sin evidencia declarados:**
- **RN-08 por navegador (403 pregrado→posgrado, 401 sin sesión):** verificado por
  API/gateway y por test, **no por captura de UI** (bloqueado por el huérfano).
- **Toda captura de UI de las 9 HU:** bloqueada por el huérfano (§0). La función está
  cubierta por test + API; lo que falta es la evidencia visual.

---

## 6. Resultados de pruebas (salida real)

**Microservicio `academic-schedule-service`:**
```
Test Suites: 13 passed, 13 total
Tests:       86 passed, 86 total
```
`tsc --noEmit`: **limpio** (sin salida).

**Contrato `academic-work-plan-service` (suite del contrato):**
```
Test Suites: 4 passed, 4 total
Tests:       24 passed, 24 total
```
> Un test de esta suite falló primero (263 esperado, 265 recibido): la semilla de
> cátedra (mig. 014) sumó 2 docentes. El canario cumplió su función —detectar un
> cambio de población—. Se corrigió excluyendo los sintéticos marcados "(DESARROLLO)"
> (commit `90f86e9e`); ahora afirma los 263 del RUND.

**`tsc --noEmit` del PTA:** 3 errores, **todos AJENOS y preexistentes**, en specs de
colegas — no del módulo ni del contrato:
```
src/pta/banco-docentes/banco-docentes-sensitive-data.spec.ts(52,19)  — proteccion_datos
src/pta/banco-docentes/banco-docentes-sensitive-data.spec.ts(78,19)  — proteccion_datos
src/pta/pta.service.identificacion-institucional.spec.ts(91,20)      — documento_identidad
```

**Build del microfront:** `npm run build` (vía Docker `Dockerfile.frontend.dev`)
completó exitosamente; el bundle federado del módulo se sirve
(`/remotes/mfe-programacion-academica/assets/…`) y contiene las cuatro features de
fases 3–4 (acumulado, confirmación, aulas, ofertas). *(Nota: el build usa `dummy`
en las credenciales de Microsoft, lo que deshabilita el SSO en dev — ver §7.)*

**Migraciones (`db:migrate --status`):** 16 de 16 aplicadas, 0 pendientes
(001–016).

---

## 7. Canarios (qué afirma cada uno)

| Canario | Afirma | Resultado |
|---|---|---|
| Paridad de cálculo (`calculo-horas.paridad.spec`) | Sobre las **427** asignaturas reales, el calculador reproduce EXACTAMENTE `horas_pta` del catálogo — 0 discrepancias | ✅ |
| 9 no asignables (`situacion-administrativa.agregado.spec`) | Sobre la planta del RUND, exactamente **9** no asignables (1 sabático + 8 comisiones) y los **4 cargos directivos NO** caen en el fail-closed | ✅ |
| Confidencialidad de aula (`aulas.confidencialidad.spec`) | El SELECT de disponibilidad de aula **no trae** id_grupo, asignatura ni docente (RN-07 en el DTO, no en la UI) | ✅ |
| Solo lectura del catálogo (`catalogo.inmutabilidad.spec`) | El controlador de catálogo **no declara ninguna ruta de escritura** (RN-02/RN-09, garantía estructural) | ✅ |
| Cinco ofertas (`ofertas.agregado.spec`) | Exactamente **2 regulares + 2 virtuales + 1 interperiodo**, y `total = Σ(por oferta)` sobre datos reales | ✅ |
| Bloqueo duro agregado (`bloqueo-duro.agregado.spec`) | Sobre un escenario conocido de 6 franjas, rechaza exactamente 3, y cada una del lado esperado | ✅ |

---

## 8. Limitaciones declaradas

- **Reachability (bloqueante):** el módulo es **inalcanzable por el ratón** para el
  rol `PROGRAMADOR_PREGRADO` (§0). Es el pendiente #1.
- **Capturas de UI:** no disponibles por lo anterior; la evidencia visual de las 9 HU
  queda pendiente hasta resolver el huérfano. No se forzó la visibilidad manipulando
  la autenticación.
- **Coherencia visual:** evaluada solo a nivel de código (§3); falta la evaluación de
  píxeles, incluida la rejilla de calendario.
- **Login por UI en dev:** el build de desarrollo trae el SSO de Microsoft con tenant
  `dummy` (roto) y el formulario de credenciales ESAP con `display:none`. No hay
  login funcional por la UI en este build; se entra por sesión restaurada (cookie +
  señal en `sessionStorage`). Es un asunto del entorno de dev, no del módulo.
- **Aulas:** 5 registros **provisionales** (C-4 sin resolver). Cuando llegue el
  catálogo oficial, es carga de datos.
- **Fechas de ofertas:** de **referencia** (C-5 sin resolver), parametrizables.
- **Docentes de cátedra:** **2 sintéticos** marcados "(DESARROLLO)"; los 263 del RUND
  no traen ninguno. Necesarios para ejercer RN-04.
- **Modalidad `sin_definir`:** **249 de 427** asignaturas la traen así, dato entregado
  por la ESAP; no es defecto del módulo.

---

## 9. Capturas disponibles

Solo hay evidencia visual de lo alcanzable legítimamente (el backoffice y la
ausencia del módulo). La UI del módulo está bloqueada por el §0.

| Archivo | Qué muestra |
|---|---|
| `evidencia/01-backoffice-usuario-real.png` | Backoffice cargado con `qa.programacion` (rol PROGRAMADOR_PREGRADO) logueado |
| `evidencia/02-sidebar-SIN-modulo-huerfano.png` | El sidebar del backoffice **sin** la entrada "Programación Académica" — evidencia del huérfano |

Las 17 capturas obligatorias del módulo (catálogo, ASIG-00132 → 384 h, franja
11:05, sabático, tope 304, aulas, ofertas, 403/401) **quedan pendientes** hasta
resolver el huérfano. La función que demostrarían está cubierta por test + API en la
matriz del §5.
