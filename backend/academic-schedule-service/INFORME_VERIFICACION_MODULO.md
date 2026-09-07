# Informe de verificación — Módulo de Programación Académica (épica EFDS-1366)

Constancia de estado del módulo: qué está implementado, qué se verificó y cómo, y
**qué NO** — sin necesidad de levantar el entorno. Todo valor pegado aquí salió de
ejecutar el comando o de recorrer la interfaz, no de deducirlo.

Rama de integración: `feat/habilitar-modulo-programacion-academico` · commit al cierre `90f86e9e`.

---

## 0. Hallazgo y arreglo — PANTALLA HUÉRFANA (encontrada y CORREGIDA)

> Recorrer el módulo **con el ratón desde el login** —lo que pidió el PUNTO 3.2 y
> que ninguna verificación por API podía ver— destapó que el módulo era
> **inalcanzable para su usuario previsto**: un usuario con rol
> `PROGRAMADOR_PREGRADO` NO veía "Programación Académica" en el sidebar. **Se
> corrigió y se verificó por navegador que ahora sí aparece.**

Antes: `evidencia/02-sidebar-SIN-modulo-huerfano.png` · Después:
`evidencia/03-sidebar-CON-modulo-corregido.png`.

### Causa raíz

El backoffice deriva la lista `modules` del usuario del **prefijo del permiso**, no
del código del módulo (`backend/auth-service/src/auth/auth.service.ts:402`):

```ts
const code = permission.code.split('.')[0].toLowerCase().replace(/_/g, '-');
```

- Permisos del rol: `programacion.catalogo.pregrado`, `programacion.docentes.disponibilidad`, …
- Derivación: `split('.')[0]` → **`programacion`**
- Código del módulo (`auth.module`) y alias aceptados por el sidebar: **`programacion-academica`** (o `academic-schedule`)
- `canShowModule('programacion-academica')` compara `[programacion-academica, academic-schedule]` contra `[programacion]` → **no coincide → oculto**.

Desajuste de convención: el prefijo del permiso (`programacion`) nunca igualaba al
código del módulo (`programacion-academica`). Para otros módulos el prefijo sí
coincide (`pta.*` → `pta`), por eso solo este caía. Es la clase de defecto de
EFDS-1643.

### Arreglo aplicado

**Renombrar el prefijo de los permisos** `programacion.*` → `programacion-academica.*`.
Se eligió el prefijo **con guion** (no guion bajo): la derivación produce
`programacion-academica`, **carácter por carácter igual** al código aceptado, sin
depender del reemplazo `_→-`. Verificado empíricamente antes de escribir la migración:

```
'programacion.catalogo.pregrado'.split('.')[0]           -> 'programacion'            (no coincide)
'programacion-academica.catalogo.pregrado'.split('.')[0] -> 'programacion-academica'  (COINCIDE)
```

Componentes del arreglo (van juntos o el RBAC deja de encontrar los permisos):

1. **Migración 017** (`017_permisos_prefijo_modulo.sql`), forward-only e idempotente:
   `UPDATE auth.permission SET code = regexp_replace(code, '^programacion\.', 'programacion-academica.')`.
   Es **UPDATE EN SITIO**, preservando `id_permission`. Como `auth.role_permissions`
   referencia por `id_permission` (FK), **las asignaciones de los tres roles quedan
   intactas sin moverlas** — no se repite EFDS-1643. Verificado: los 3 roles
   (PROGRAMADOR_PREGRADO, PROGRAMADOR_POSGRADO, SUBDIRECTOR_ACADEMICO) conservan sus
   permisos con los códigos nuevos.
2. **RBAC del módulo** (`programacion-permissions.ts`): las 4 constantes de código →
   `programacion-academica.*`.
3. **Filtro SQL del resolutor** (`programacion-permissions.service.ts`): había un
   tercer uso escondido, `AND p.code LIKE 'programacion.%'`, que tras el renombre
   devolvía conjunto vacío → 403 para todos. Corregido a `programacion-academica.%`.
   Lo destapó la prueba empírica del endpoint (200/403), no la lectura del código.

### Verificado tras el arreglo

- Derivación: `modules: ["programacion-academica"]` → coincide con el sidebar.
- Navegador: el módulo **aparece** en el sidebar de `qa.programacion` y se navega
  completo (evidencia 03–13).
- RBAC intacto: catálogo pregrado **200**, posgrado **403**, sin sesión **401**.
- Asignaciones de los 3 roles preservadas.
- Suite del microservicio **86/86**, contrato **24/24**, tsc limpio.

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
- **6 migraciones nuevas** (012–017): `012_create_asignacion_docente`,
  `013_asignacion_confirmacion_disponibilidad`, `014_seed_docentes_catedra_desarrollo`,
  `015_aulas_y_bloqueo`, `016_ofertas_academicas`, `017_permisos_prefijo_modulo` (el
  arreglo del huérfano).
- **Pruebas:** microservicio 86/86, contrato 24/24, tsc limpio.
- **Historia:** su commit `fb0fa30e` sigue siendo ancestro; no se reescribió nada.
- **Huérfano del sidebar (§0): encontrado y corregido**, verificado por navegador. El
  módulo ya es alcanzable por su decanatura.

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

## 3. Coherencia visual con la plataforma (renderizado, con capturas)

Corregido el huérfano, se recorrió el módulo renderizado. **Se ve como parte del
producto**, no pegado. Evidencia: `evidencia/04-modulo-abierto.png` (KPIs, tabla con
badges, buscador, botón azul institucional) y las siguientes.

| Aspecto | Veredicto (visto renderizado) |
|---|---|
| Entrada en el sidebar del backoffice | ✅ mismo estilo que las demás (ícono, tipografía, estado activo resaltado). Ver `evidencia/03`. |
| Encabezados, KPIs, tarjetas | ✅ mismas tarjetas redondeadas, tipografía y azul `#003DA5` que el resto. `evidencia/04` |
| Tablas y listados | ✅ mismo tratamiento (encabezado gris, filas, badges de estado Confirmado/Cruce/Programado) |
| Botones | ✅ variantes y colores consistentes (primario azul, secundario gris) |
| Formularios y campos | ✅ mismos estilos de entrada, etiqueta y placeholders. `evidencia/07`, `11`, `12` |
| Estados de solo lectura / advertencia | ✅ badge "Solo lectura · RUND/SNIES", tarjeta ámbar de "No asignable", barra de tope. `evidencia/07`, `11`, `12` |
| Paleta y tipografía | ✅ `#003DA5` hardcodeado (63×), la MISMA convención de la plataforma (el PTA lo hace 760×; nadie usa un token compartido) |

**A nivel de estructura:** usa el `shared/ModuleLayout` que comparten los MFE
recientes (contratación, control-interno, control-disciplinario, gestión-legal). El
PTA usa su propio layout más antiguo; el módulo se parece a los MFE **nuevos**, no
al PTA. No es un defecto —es la convención vigente—; se declara por si el patrón de
referencia fuera el PTA.

**La rejilla de calendario (riesgo señalado):** `CalendarioHorario.tsx`, ~362 líneas
a mano. La sección "Programación General" renderiza coherente (`evidencia/08`). La
rejilla semanal en sí vive dentro del flujo de grupos (Catálogo → grupo → horario) y
**no se llegó a un grupo con sesiones en este recorrido**, así que la rejilla poblada
queda como el único elemento visual sin captura directa. Por código usa las mismas
clases y color; el veredicto visual de la rejilla llena queda pendiente de una
captura con un grupo real cargado.

---

## 4. Inventario de rutas — alcanzabilidad

Las secciones del módulo **no son rutas URL**: son estado interno del componente
(`setSeccion`), conmutado por clics en el sidebar del módulo. Para llegar al módulo
hay dos saltos: sidebar del backoffice → módulo, y luego sidebar del módulo → sección.

| Pantalla | Cómo se llega (clics desde el login) | ¿Alcanzable con ratón? | Evidencia |
|---|---|---|---|
| Módulo | Backoffice → sidebar "Programación Académica" | **SÍ** (tras el arreglo del §0) | `03`, `04` |
| Catálogo (1368/1369) | módulo → "Catálogo Académico" | sí | `05`, `06`, `07` |
| Programación general (1371) | módulo → "Programación General" | sí | `08` |
| Aulas (1374) | módulo → "Disponibilidad de Aulas" | sí | `09` |
| Asignación docente (1372/1373/1376) | módulo → "Disponibilidad Docente" | sí | `10`, `11`, `12` |
| Ofertas (1375) | módulo → "Ofertas Académicas" | sí | `13` |
| Validación de cruces | módulo → "Validación de Cruces" | sí | (navegable, sin captura dedicada) |

Sin pantallas huérfanas tras el arreglo. La navegación interna del módulo (sidebar →
sección) siempre fue correcta; lo que faltaba era la entrada del módulo en el
sidebar del backoffice.

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

**Migraciones (`db:migrate --status`):** 17 de 17 aplicadas, 0 pendientes
(001–017; la 017 es el arreglo del huérfano).

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

- **Rejilla de calendario poblada:** único elemento visual sin captura directa; hay
  que llegar a un grupo con sesiones cargadas (§3, §9). Riesgo visual residual.
- **Capturas 403/401 como pantalla:** son estados de API; verificados por
  navegador/gateway pero no fotografiados como UI (§9).
- **"Programación General" muestra datos de muestra:** esa sección de listado sigue
  sobre `INITIAL_SCHEDULE` (mock) hasta que se conecte; el resto de secciones usan
  datos reales.
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

## 9. Capturas de evidencia

Todas genuinas, capturadas por navegador real con `qa.programacion` (rol
PROGRAMADOR_PREGRADO), sin manipular la autenticación.

| Archivo | Qué muestra | Obligatoria # |
|---|---|---|
| `01-backoffice-usuario-real.png` | Backoffice con el usuario real logueado | — |
| `02-sidebar-SIN-modulo-huerfano.png` | **ANTES:** sidebar sin el módulo (el huérfano) | — |
| `03-sidebar-CON-modulo-corregido.png` | **DESPUÉS:** el módulo aparece en el sidebar | 1 |
| `04-modulo-abierto.png` | Módulo abierto: KPIs, tabla, coherencia visual | 1 |
| `05-catalogo-nivel-programa.png` | Selección de nivel y programa | 2 |
| `06-catalogo-por-semestre.png` | Catálogo por nivel/programa | 2/3 |
| `07-asig-00132-384h.png` | **ASIG-00132 → 384 h**, excepción de la Circular 003 | 4, 5 |
| `08-programacion-general.png` | Programación general (franjas, badges de estado) | — |
| `09-aula-disponibilidad.png` | Disponibilidad de aulas | 14 |
| `10-panel-docente.png` | Panel del docente (buscador) | 9 |
| `11-sabatico-no-asignable-motivo-vigencia.png` | **Sabático: no asignable, con motivo y vigencia** (2026-10-01), panel solo lectura | 9, 10 |
| `12-catedra-tope-304.png` | **Cátedra: tope 304 h** (aunque su plan es 800) | 12, 13 |
| `13-cinco-ofertas.png` | Las cinco ofertas académicas | 15 |

**Obligatorias sin captura dedicada** (cubiertas por test + API en la matriz §5):
gestión de grupos (6), calendario con sesiones (7), franja 11:05 (8), bloqueo duro
con varios motivos a la vez (11), aula sin revelar ocupante (14 — la disponibilidad
solo trae día/hora, ver `09` y el canario), 403 pregrado→posgrado (16) y 401 sin
sesión (17). Los dos últimos son estados de error de API; verificados por
navegador/gateway (200/403/401) pero no fotografiados como pantalla. La rejilla de
calendario poblada (7) requiere llegar a un grupo con sesiones cargadas — no se hizo
en este recorrido.
