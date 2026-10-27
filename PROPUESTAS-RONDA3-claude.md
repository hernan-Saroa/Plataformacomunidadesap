# Ronda 3 · Propuestas (sin construir): EFDS-2345, EFDS-2341, EFDS-2346, EFDS-2347

20 de octubre de 2026 · rama `feature/pa/ronda3-claude` · **Nada de esto está construido. Espera aprobación.**

Fuentes auditadas: `PROGRAMACIÓN 2026_1.xlsx`, Resolución SC-1399 (calendario 2027), base local (`superapp-db`), código de PTA, PA, Viáticos, auth-service y los MFE. Las cifras se recalcularon con scripts sobre los archivos y la base; las del prompt original que no coinciden se marcan.

---

## Resumen

| Subtarea | Propuesta en una línea | Toca producción (PTA) | Estimado |
|---|---|---|---|
| EFDS-2345 | Usar el catálogo que **ya existe** (`nucleo_tematico`, NT-001…NT-033) y agregarle la relación docente↔núcleo, cargada por Excel | No (catálogo y tabla nueva) | 14 h |
| EFDS-2341 | Endpoint de candidatos con elegibilidad por núcleo, filtro por vinculación, búsqueda, sugerencia explicada, y la asignación de EFDS-1372 | No | 16 h |
| EFDS-2346 | `periodo_academico` con tipo (semestral / especial) y un segundo activo solo para especiales; auditar 28 consumidores | **Sí** | 28 h |
| EFDS-2347 | Una función de conteo de **sesiones reales** por ciclo, con festivos y recesos; comparte el **dato** de festivos con Viáticos, no su función | **Sí**, si cambia lo que va al PTA | 18 h |

---

## EFDS-2345 · Área de formación y relación docente–área

### Lo que encontré

1. **El catálogo con código ya existe.** `academic_work_plan.nucleo_tematico` tiene 33 núcleos (`NT-001`…`NT-033`) y las 427 asignaturas activas apuntan a uno (`asignatura.id_nucleo_tematico`). No hay que crear un catálogo nuevo: hay que **limpiar** este.
2. **De las 25 áreas del Excel, 17 ya están** con el mismo nombre (normalizado). Las 8 que faltan:

   | Área del Excel | Núcleo parecido que existe | Qué propongo |
   |---|---|---|
   | Complementario | NT-015 «Complementaria» | ¿Mismo? (pregunta 1) |
   | Estado Gobierno y Sociedad | NT-013 «Estado, Gobierno y Sociedad» | Mismo salvo la coma: unificar al normalizar |
   | Materias de Formación Específica | NT-010 «Ciclo De Formación Específica» | ¿Mismo? (pregunta 1) |
   | Finanzas Públicas | NT-028 «Finanzas Públicas - ESP» es un **programa de posgrado** | Crear núcleo nuevo de pregrado |
   | Electivas, Gestión Territorial, Idiomas, Opción de grado | — | Crear núcleos nuevos |

3. **El catálogo mezcla tres cosas distintas** bajo «núcleo»:
   - áreas reales (NT-002…NT-022);
   - **planes**, no áreas: NT-001 «Nuevo Plan de Estudios AP» (34 asignaturas) y NT-012 «Nuevo Plan de Estudios APT» (18);
   - **programas de posgrado** (NT-023…NT-033: «Maestría DDHH», «GEPUR - ESP»…).

   Para las 52 asignaturas de NT-001/NT-012, el Excel les da un área única a 19, **varias áreas según el plan** a 27 (la misma asignatura tiene un área en el plan antiguo y otra en el nuevo) y ninguna a 6.
4. **Las áreas dependen de la generación del plan.** Los «parecidos» casi nunca conviven en el mismo plan: «Estado y poder» está en AP_33/34 y «Problemática del Estado y del Poder» en APT_52; «Organizaciones Públicas y Gestión» en AP_33/34/APT_53 y «Organizaciones públicas» en AP_35/36/APT_52. **Si no se unifican, un docente que dicta en el plan antiguo no sale como apto en el nuevo**, sin que nadie lo note.
5. **Duplicados exactos de verdad: uno.** «FINANZAS PÚBLICAS» = «Finanzas Públicas». «Idioma extranjero » solo tenía un espacio de más; no se une con nada. El prompt contaba ambos como duplicados (desviación menor).
6. **El RUND no sirve para decidir el área** (lo pidió Tomás: «si en el RUND hay un dato del docente que permita ver qué tipo de materia puede dar»):
   - `"Docente"."nucleoTematico"` es texto libre; vacío en 103 de 352 (**el 100 % de los de cátedra**). En 52 casos es una frase del acto administrativo («Labores de docencia y las demás actividades…»). Solo 104 coinciden con un nombre del catálogo.
   - Títulos (`pregrado`, `maestria`…) y perfiles académicos: **vacíos en los 352**. `nivelFormacion` y `escalafon` existen pero no dicen el área.
   - La rama `feat/agregar_modulo_rund` (RUND independiente, aún no integrada) agrega `rund.formacion_academica` con títulos, pero **tampoco** trae área ni asignaturas habilitadas.
   - **Conclusión:** del RUND sale la **vinculación** (`"Docente"."tipoVinculacion"`, 100 % poblada); el **área** sale del Excel.
7. **Cruce del Excel con el banco:** los **123** docentes de `DOCENTE_ASIGNATURA_` están todos en el banco (por cédula); de los 189 de `DOCENTES`, 139. La vinculación coincide en 119 de 123; las 4 diferencias son «Carrera» en el Excel y «Periodo de Prueba» en el banco.
8. Cifras del prompt verificadas: `DOCENTE_ASIGNATURA_` tiene 321 filas (no 320): una de cédula `0` y una con programa en minúsculas. Cruzan con el plan **319 de 321** (el prompt decía 317 de 320); las 2 que no cruzan son «Opción de grado» de APT_52.

### Propuesta

- **Catálogo:** se queda `nucleo_tematico` (código + nombre). Se agrega `tipo` (`area` | `plan` | `programa_posgrado`) para dejar de mezclar. Los 8 faltantes se crean con código nuevo. Unificar **solo** lo que el negocio confirme, con una tabla de equivalencias (`nucleo_equivalencia`: núcleo → núcleo canónico), **no** renombrando: así el plan antiguo y el nuevo apuntan al mismo canónico y la decisión queda escrita y es reversible.
- **Asignaturas de NT-001/NT-012:** reasignarles su área real con el Excel, **por plan**, en la carga masiva del catálogo (`PLAN_ESTUDIOS` ya trae `PROG_PENSUM` + `ÁREA DE FORMACIÓN`). Las 6 sin cruce se listan como excepción explícita, no se adivinan.
- **Docente↔núcleo:** tabla nueva en el PTA, `docente_nucleo (id_person, id_nucleo, origen, vigente_desde, cargado_por)`, con `id_person` (identidad estable, igual que la asignación). **No** se usa `"Docente"."nucleoTematico"`: es texto y es del RUND (RN-09: el RUND no se escribe desde aquí).
- **Carga:** derivada de `DOCENTE_ASIGNATURA_` (las áreas de lo que ya dicta), por carga masiva con vista previa y «Importar ahora», igual que el catálogo; idempotente; reporta docentes sin cédula en el banco y asignaturas sin cruce.
- **Los 66 docentes que no están en esa hoja:** sin núcleo **no son elegibles** por área (fallo cerrado), pero el asignador puede **forzar** la asignación con un motivo escrito (ver EFDS-2341). Mientras el negocio decide, el reporte los lista.
- **Posgrado:** el Excel no trae áreas. Mientras llegan, propongo usar **el programa como área** (los NT-023…NT-033 ya están así): elegible = docente que ya dictó en ese programa. Explícito y reemplazable.

### Preguntas para el negocio (EFDS-2345)

1. ¿Son la misma área? «Idiomas» = «Idioma extranjero»; «Electivas» = «Electivas Generales»; «Estado y poder» = «Problemática del Estado y del Poder»; «Economía Pública» = «Economía de lo Público»; «Organizaciones públicas» = «Organizaciones Públicas y Gestión»; «Complementario» = «Complementaria»; «Materias de Formación Específica» = «Ciclo De Formación Específica»; «Gestión Territorial» = «Desarrollo y Gestión Territorial».
2. Un docente que dictó una asignatura de un área, ¿es apto para **toda** el área o solo para esa asignatura?
3. Los 66 docentes sin asignaturas en la hoja: ¿se les asigna área a mano, o quedan solo para asignación forzada?
4. Posgrado: ¿sirve «el programa como área» mientras tanto?

---

## EFDS-2341 · Candidatos, sugerencia y asignación

### Propuesta

`GET /programacion/grupos/:idGrupo/candidatos?q=&vinculacion=` (solo lectura, permiso de asignación del nivel del grupo):

```jsonc
{
  "grupo": { "idGrupo", "asignatura", "area": { "codigo", "nombre" }, "cicloInicio", "cicloFin", "horas" },
  "sugerido": { "idDocente", "motivo": "Cumple el área NT-002; 32 h programadas (la menor entre 14 elegibles); sin cruce" } | null,
  "candidatos": [{
    "idDocente", "documento", "nombre", "vinculacion": { "tipo", "texto" },
    "cumpleArea": true, "horasProgramadas": 32, "tope": 304, "horasConEsteGrupo": 96,
    "cruce": null | { "diaSemana", "horaInicio", "horaFin" },        // sin revelar el grupo ajeno (RN-07)
    "bloqueos": [ { "codigo": "TOPE", "mensaje": "…" } ],            // los mismos motivos de EFDS-1372
    "asignable": true
  }]
}
```

- **Elegibles:** núcleo del docente = núcleo (canónico) de la asignatura. Filtro opcional por tipo de vinculación (del RUND). Búsqueda por cédula (prefijo) y nombre (sin tildes), como el buscador ya construido para EFDS-2343.
- **Sugerencia, en este orden y determinística:** (1) cumple el área; (2) menos horas programadas en el periodo, con el **cálculo único** (`DocenciaService`); (3) sin cruce con la **regla única** (`choque.ts`: día, horas y ciclo); (4) sin bloqueos de EFDS-1372 (situación, tope, vigencia de la vinculación); **desempate** por cédula ascendente. La respuesta dice **por qué**. Dos grupos de la misma asignatura al mismo docente se permiten si no se cruzan: la regla de choque ya lo resuelve.
- **La sugerencia solo recomienda:** quien asigna elige a cualquier candidato asignable. Elegir a uno **que no cumple el área** exige un motivo escrito (se guarda en `asignacion_docente.observaciones` con marca), para que la excepción quede trazada.
- **Asignar:** se reutiliza `POST /asignaciones` (EFDS-1372 + flujo nuevo de EFDS-2348). El registro único sigue siendo la franja.
- **Vinculación × área (pregunta abierta):** la regla queda como una función aislada `reglaVinculacionArea(vinculacion, area) → permitido | motivo`, que hoy permite todo. `HORAS_AREA` no sirve de fuente: **sus columnas por vinculación están todas en 0** (es una plantilla vacía).
- **Un docente por grupo:** el modelo de asignación de EFDS-1372 es uno por grupo. La reunión habló de «qué profesores van a dar esa materia en ese grupo», en plural. Si un grupo puede tener varios docentes (por franjas o días), cambia el modelo de asignación (pregunta 7).

### Preguntas para el negocio (EFDS-2341)

5. ¿Hay una regla entre vinculación y área (por ejemplo, ciertas áreas solo para carrera)? ¿De dónde sale?
6. Asignar a alguien que no cumple el área: ¿se permite con motivo, o se bloquea?
7. ¿Un grupo puede tener **más de un** docente? Si sí, ¿se reparte por días o por franjas?

---

## EFDS-2346 · Dos periodos activos y el tipo personalizado

### Lo que encontré

- **Modelo** (`periodo_academico`, PTA, en producción): `semestre` con `CHECK (1,2)`, `UNIQUE (anio, semestre)`, `codigo` = `AAAA-S` (varchar 10), estados `planeacion | concertacion | en_curso | cerrado`. **La base no protege «un solo en curso»** (no hay índice único parcial): lo hace solo `PATCH /periodos-academicos/:id`.
- **Activar** cierra los anteriores, pasa los posteriores a planeación y **termina todo PTA de otro periodo** (`CONDICION_PTA_A_FINALIZAR`, `pta.service.ts:67-79`). Con un segundo activo, activar el interperiodo **terminaría los PTA de 2027-1**.
- **Ya hay dos caminos que rompen la regla hoy:** el importador de asignaturas inserta periodos **en curso** si el código no existe (`asignaturas-import.service.ts:744-756`), y `GET /periodos-academicos` crea `2025-2` en curso si la tabla está vacía.
- **El interperiodo ya está a medias:** `grupo.tipo_oferta` admite `'interperiodo'` (un tipo de oferta **dentro** de un periodo), y la equivalencia de la migración 036 dejó `2026-INT` **sin destino**. Pero los docentes tienen PTA del interperiodo, así que tiene que ser un **periodo propio**.
- **El corte de la concertación** solo acepta `AAAA-[12]` (`configuracion.ts`): un periodo `2027-i` quedaría fuera sin aviso.
- **28 consumidores suponen un solo activo** (12 en el backend, 16 en el frontend). Lista completa en el anexo A. Ojo con dos ya rotos: el shell compara con `'ACTIVO'`, que nunca coincide con `en_curso` (`apps/shell/.../EstructuraOrganizacionalModule.tsx:48`), y hay periodos fijos en el código (`'2025-2'` en el tablero de KPI del PTA, `'2026-1'` en `savePTA`).

### Propuesta

1. **Tipo de periodo como catálogo:** tabla `tipo_periodo (codigo, nombre, es_semestral, sufijo)` con `SEM1`, `SEM2`, `INTER` («Interperiodo», sufijo `i`) y los que el negocio agregue (vacacional, evaluación…). `periodo_academico` gana `id_tipo_periodo` y `nombre`. `semestre` deja de ser obligatorio para los especiales; `UNIQUE (anio, semestre)` pasa a `UNIQUE (anio, id_tipo_periodo, secuencia)`. Código: `2027-1`, `2027-2`, `2027-i` (y `2027-i2` si hubiera dos).
2. **Segundo activo, solo como excepción:** índice único parcial: **un solo semestral en curso** (la base lo garantiza, no solo el controlador). Un **especial** puede estar en curso a la vez, con una acción aparte, «Activar como periodo extraordinario», que pide motivo y permiso propio (`pta.periodos.activar_extraordinario`). Activar un especial **no cierra** nada ni termina PTA.
3. **Cierre de PTA por tipo:** activar un semestral termina los PTA de semestrales anteriores, **no** los de un especial en curso. Un especial cierra sus PTA cuando él se cierra.
4. **«El periodo activo»:** se define como **el semestral en curso**. Los consumidores lo piden por tipo (`.find(p => p.estado === 'en_curso' && p.tipo.esSemestral)`). Las listas devuelven todos con su tipo, y los selectores muestran los dos activos marcados. Se corrigen de paso el importador (no crea en curso), el `GET` (no siembra en curso) y el shell.
5. **El interperiodo como periodo:** los grupos del 2027-i cuelgan del periodo 2027-i; `tipo_oferta = 'interperiodo'` queda como coherencia (grupo de un periodo interperiodo ⇒ tipo de oferta interperiodo), validada en el servidor.
6. **Concertación:** el corte pasa a compararse por **fecha de inicio** del periodo, no por el texto del código.

### Preguntas para el negocio (EFDS-2346)

8. ¿La docencia del interperiodo **suma al tope** de 304 h del 2027-1 o tiene tope propio? Hoy, con dos periodos no cerrados, se sumaría.
9. ¿Puede haber más de un especial a la vez (por ejemplo, interperiodo y vacacional)?
10. ¿El PTA del interperiodo es un PTA aparte, o se agrega al del 2027-1?
11. ¿Quién activa un periodo extraordinario? ¿El mismo rol que activa los semestrales?

---

## EFDS-2347 · Calendario con festivos y semanas de receso

### Lo que encontré

- **El cálculo de Viáticos no sirve tal cual:** cuenta días hábiles **de lunes a viernes** (`DIAS_LABORALES_DEFAULT = [1..5]`), con modos de términos legales. La programación tiene clases en **sábado y domingo** (APT a distancia: domingos). Copiarlo o importarlo daría horas equivocadas.
- **Lo que sí se comparte es el dato:** `auth.festivos_colombia`. Viáticos lo lee con su propia entidad, en la misma base. **Solo tiene 2026 (18 filas).**
- **No hay librería común de backend:** `packages/*` es solo de frontend, y cada backend se construye con **su carpeta como contexto de Docker**. Una librería común obliga a cambiar el contexto de construcción en unos 10 `docker-compose*.yml` y en los Dockerfile.
- **Hoy las horas que van al PTA no dependen de fechas:** `créditos × 16 (o 12) × 3` o `horas_clase` del catálogo (el contrato `calcularImpacto` no recibe grupo ni fechas). Las fechas reales solo se usan en PA para validar el exceso (×1.3).
- **Calendario 2027 (SC-1399):** APT inicia el 30 de enero y los demás programas el 1 de febrero; Semana Santa del 22 al 28 de marzo; las clases de 2027-1 terminan el 3 de junio; habilitaciones hasta el 13 de julio; interperiodo del 18 de junio al 13 de julio (cierre el 16 de julio); 2027-2 desde el 7 de agosto (APT) hasta el 6 de diciembre; receso del 11 al 17 de octubre.

### Propuesta

- **Una sola función de conteo, en SQL**, en la base que ya comparten: `calendario.sesiones(dia_semana, desde, hasta, id_periodo)`, que devuelve cuántas veces ocurre ese día de la semana en el ciclo **menos** festivos **menos** recesos del periodo. La usan, con las fechas del ciclo de cada grupo (`choque.ts`: grupo, o periodo si no tiene), el tope, el acumulado, la validación de horas del grupo y lo que se envía al PTA. Así no hay dos implementaciones ni cambios de Docker.
- **Viáticos no se toca.** Comparte con PA la **tabla** de festivos (el dato), que es lo que debe ser único. Si más adelante Viáticos quiere migrar, la función queda disponible.
- **Festivos 2027:** migración con los 18 festivos de Colombia 2027, en el mismo formato (`origen`, `regla`). Y una alerta: si un ciclo cae en un año sin festivos cargados, la programación lo avisa (Viáticos ya tiene ese aviso).
- **Recesos como configuración del periodo:** tabla `periodo_receso (id_periodo, desde, hasta, motivo)`, editable en Periodos. 2027-1: 22 al 28 de marzo; 2027-2: 11 al 17 de octubre.

### Preguntas para el negocio (EFDS-2347)

12. **La decisión de fondo:** si un lunes es festivo, ¿el docente **pierde** esas horas (se le pagan y cargan menos), o la programación debe **reponerlas** para llegar a las horas del plan (64 h)? Hoy las horas son fijas por la Circular 003 («nunca se recalculan»). Si se descuentan, cambia lo que llega al PTA en producción.
13. ¿Las semanas de receso son por periodo o pueden ser por programa o territorial?
14. ¿Quién mantiene los festivos de cada año: Viáticos, Programación o un administrador común?

---

## Anexo A · Consumidores de «el periodo activo» (EFDS-2346)

**Backend:** `periodo-academico.controller.ts:213-234` (regla de un activo y activación) · `pta.service.ts:67-79, 7352` (termina PTA de otros periodos) · `periodo-academico.controller.ts:39-53` (siembra 2025-2 en curso) · `periodo-academico.controller.ts:404-421` (programas sin periodo en el en curso) · `banco-docentes.service.ts:2026-2028` (periodo de carga por defecto, `LIMIT 1`) · `asignaturas-import.service.ts:744-756` (**inserta en curso**) · `asignaturas-import.service.ts:572-590` · `auth-service/programas.service.ts:80-90, 480-508` (un programa nuevo va al en curso) · PA `periodos.service.ts:99` · PA `sqlPeriodoNoCerrado` (depende de que activar cierre los anteriores) · valores fijos: `pta.service.ts:4334, 7862, 11762`, `cascada.controller.ts:44`, `asignaturas-import.controller.ts:41,57,64`, PA `validacion.controller.ts:45`.

**Frontend:** `mfe-pta` `ptaApi.ts:77-95` (`getActivePeriodoAcademico`), `PortalDocentePTA.tsx:660-698`, `PTAForm.tsx:2938-2955, 2983, 5896-5906` (el selector solo ofrece los en curso), `PtaBackofficeModule.tsx:1980, 2017-2019, 3717`, `BancoDocentesView.tsx:88-96, 437`, `BancoDocentesPTA.tsx:195-196, 484`, `PTAWorldClassToolbar.tsx:180`, `CalendarioAcademicoPTA.tsx:111` (semestre por mes), `CentroReportesPTA.tsx:100-102, 1040` · `mfe-programas-academicos` `GestionPeriodos.tsx`, `ProgramasAcademicosModule.tsx`, `ImportarAsignaturas.tsx:99` · `mfe-programacion-academica` `ProgramacionAcademicaModule.tsx:167, 369`, `GestionOfertas.tsx`, `periodosApi.ts` · `mfe-estructura-org` y **shell** (`'ACTIVO'`, roto) · `mfe-reportes` `PlantaDocenteReportView.tsx:243`.

Viáticos y Evaluación no consultan `periodo_academico`.
