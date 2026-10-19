# Contrato para Codex — periodo único (EFDS-2328)

Desbloquea EFDS-2309 (botón de cerrar), EFDS-2312 (selector) y EFDS-2314 (carga masiva). El backend lo construye Claude en `feature/pa/ronda-claude`; mientras tanto, trabaja con estos datos simulados. Si algo del contrato no te sirve, dilo en `INTEGRACION-codex.md` antes de construir sobre él.

## Reglas aprobadas que el contrato refleja

- El periodo es **el de la plataforma** (`academic_work_plan.periodo_academico`, el del PTA). Programación Académica no crea periodos propios.
- **Se programa en planeación y en curso; solo se bloquea lo cerrado.**
- **"Cerrar" en Programación Académica cierra solo la programación**, no el periodo de la plataforma.
- **Activar solo lo hace el administrador del módulo**, con una confirmación que diga cuántos PTA quedan terminados y de qué periodos.
- El interperiodo (`2026-INT`) queda fuera de la migración hasta que el negocio diga a qué semestre pertenece.

## 1. `GET /programacion-academica/api/v1/periodos`

Respuesta `{ success: true, data: RespuestaPeriodos }`:

```ts
interface RespuestaPeriodos {
  periodos: PeriodoPlataforma[];   // ordenados por fechaInicio descendente
  legado: PeriodoLegado[];         // periodos viejos sin equivalencia (2026-INT, pruebas)
  permisos: {
    crear: boolean;                // crear un periodo de plataforma
    activar: boolean;              // activar uno (solo administrador del módulo)
    cerrarProgramacion: boolean;   // cerrar la programación de un periodo
    importar: boolean;             // carga masiva de asignaturas
  };
}

interface PeriodoPlataforma {
  idPeriodo: string;               // id de periodo_academico, como TEXTO ("12")
  modelo: 'plataforma';
  codigo: string;                  // "2026-1"
  anio: number;
  semestre: 1 | 2;
  fechaInicio: string;             // "YYYY-MM-DD"
  fechaFin: string;
  estadoPlataforma: 'planeacion' | 'concertacion' | 'en_curso' | 'cerrado';
  programacion: {
    estado: 'abierta' | 'cerrada';
    cerradaEn: string | null;      // ISO
  };
  programable: boolean;            // estadoPlataforma !== 'cerrado' && programacion.estado === 'abierta'
  esActivo: boolean;               // estadoPlataforma === 'en_curso'
}

interface PeriodoLegado {
  idPeriodo: string;               // UUID de periodo_programacion
  modelo: 'legado';
  codigo: string;                  // "2026-INT", "PRUEBA-CLAUDE"
  nombre: string;
  tipo: 'periodo_regular' | 'creditos_virtual' | 'interperiodo';
  estado: 'planeacion' | 'activo' | 'cerrado';
  motivo: string;                  // por qué no se migró
}
```

**Selector (EFDS-2312):** muestra `periodos`. Selección por defecto: el que tenga `esActivo`; si no hay, el primero. Los `legado` van aparte, en un grupo "Periodos anteriores al modelo único", sin mezclarlos. Un periodo con `programable: false` se puede consultar, pero no se edita: el backend rechaza toda escritura con 409 (EFDS-2301).

**Los permisos los calcula el servidor.** No deduzcas permisos de los roles en el navegador. Si `permisos.activar` es `false`, no muestres el botón; aunque lo muestres, el backend rechaza.

## 2. El `idPeriodo` sirve igual en todas las rutas

Toda ruta que hoy recibe un periodo acepta el `idPeriodo` de `GET /periodos`, sea `plataforma` (número en texto) o `legado` (UUID):

- `GET /horarios?periodo=`
- `GET /grupos?asignatura=&periodo=`
- `POST /grupos` (con `idPeriodo` en el cuerpo)
- `GET /publicaciones/:idPeriodo`
- `GET /publicaciones/:idPeriodo/pendientes-cierre`
- `POST /publicaciones/:idPeriodo/publicar`
- `POST /publicaciones/:idPeriodo/retirar`
- `POST /publicaciones/:idPeriodo/cerrar`
- `GET /validacion/vivos?periodo=`

**Grupos en un periodo de plataforma:** `POST /grupos` acepta además `tipoOferta: 'periodo_regular' | 'creditos_virtual' | 'interperiodo'` (por defecto `periodo_regular`). La oferta pasa a ser un atributo del grupo, no un periodo aparte.

## 3. Cerrar la programación (EFDS-2309)

`POST /programacion-academica/api/v1/publicaciones/:idPeriodo/cerrar`

- Cierra **la programación** del periodo, no el periodo de la plataforma.
- Exige `permisos.cerrarProgramacion`.
- Devuelve 409 si hay franjas ni aprobadas ni en excepción. El mensaje dice cuántas son; muéstralo tal cual.
- Respuesta: el mismo `EstadoPublicacion` de hoy.
- Después de un 2xx, invalida con `invalidarProgramacion('programacion', 'publicaciones')` y vuelve a pedir `GET /periodos`: el periodo queda con `programacion.estado = 'cerrada'` y `programable = false`.

## 4. Crear y activar (pantalla de periodos)

Estas rutas son **los servicios del PTA**. Programación Académica los llama; no los duplica.

| Acción | Ruta (gateway) | Notas |
|---|---|---|
| Crear | `POST /pta/api/v1/periodos-academicos` con `{ anio, semestre, fechaInicio, fechaFin }` | Nace en `planeacion`. El servidor valida duplicados y que las fechas no se solapen con otro periodo. |
| Impacto de activar | `GET /pta/api/v1/periodos-academicos/:id/impacto-activacion` | **Nuevo.** `{ codigo, yaActivo, ptasATerminar: number \| null, porPeriodo: [{ codigo, ptas }], periodosACerrar: string[], periodosAPlaneacion: string[], advertencia: string \| null }`. Es de solo lectura. **Si `advertencia` no es null, muéstrala tal cual** en la confirmación: hoy, en la base local, la regla que termina los PTA falla y `ptasATerminar` viene en `null`. |
| Activar | `PATCH /pta/api/v1/periodos-academicos/:id` con `{ estado: 'en_curso' }` | Cierra los periodos anteriores y termina los PTA de los demás. **Antes de llamarla, muestra la confirmación con el impacto.** |

La confirmación de activar es obligatoria y usa los números del servidor, no una cuenta del navegador:

> Activar 2026-2 terminará 37 PTA (2026-1: 35, 2025-2: 2) y cerrará el periodo 2026-1. ¿Continuar?

## 5. Carga masiva (EFDS-2314)

Usa el importador existente del PTA. No lo copies.

1. `POST /pta/api/v1/asignaturas-import/upload?periodo_codigo=<codigo>&dry_run=true` (multipart, campo `file`). Muestra el resultado de la validación.
2. Si el usuario confirma, repite la llamada con `dry_run=false`.

⚠️ **Pasa solo códigos que vengan de `GET /periodos`.** Si el importador recibe un código que no existe, crea un periodo "en curso" saltándose las reglas; ya está reportado a su dueño. Con un código existente no cambia el estado del periodo. La opción de agregar una asignatura a mano se queda.

## 6. Periodos de prueba — pendiente de aprobación de Tomás

En el modelo nuevo un periodo es año-semestre (`2026-1`) y es único, así que no puede llamarse `PRUEBA-CODEX-2`. Propuesta: **2099-1 para Claude y 2099-2 para Codex**, en fechas que no se solapen. Hasta que Tomás lo apruebe, usa datos simulados.

## 6b. Para tu prueba `ronda-v2.browser.mjs` (EFDS-2307)

El indicador de Alertas de Cruce ya no es un 0 constante: pide `GET /programacion-academica/api/v1/validacion/vivos?periodo=<id>`, que responde `{ success: true, data: { total, grupo, aula, docente, cruces: [] } }`. Tu API simulada responde TODO lo que empiece por `validacion` con el formato del histórico, así que el panel recibe un objeto sin `total` y la prueba falla con el módulo integrado (con tu módulo local pasa, porque ahí sigue el 0 fijo).

Ajuste propuesto en tu archivo, antes de la rama de `validacion`:

```js
else if (path.startsWith('validacion/vivos')) data = { total: 0, grupo: 0, aula: 0, docente: 0, cruces: [] };
```

Con eso la afirmación `'Alertas de Cruce' = '0'` vuelve a pasar, y sale del servidor simulado en vez de un número fijo. Validado con servidor real: el panel muestra el conteo del backend y Validación sigue con los 27 del histórico.

## 6c. Hallazgos de la validación con servidor real (para tus archivos)

- **Año máximo:** el PTA solo acepta años entre 2020 y 2050 (`El año debe ser un número entero entre 2020 y 2050.`). Tu formulario permite hasta 2100. El servidor responde bien y tu pantalla muestra el mensaje, pero conviene alinear el `max` a 2050.
- **Periodos de prueba:** 2099 no es posible. Claude usa **2050-1**; para ti queda **2050-2**, pendiente de que Tomás lo confirme.
- **Cerrar programación** es irreversible y hoy no pide confirmación. Sugerencia: un `window.confirm` igual al de activar.
- **Fechas:** al crear 2050-1 con 2050-02-01 → 2050-06-15, el PTA guardó 2050-01-31 → 2050-06-14. Es del backend del PTA (`new Date('YYYY-MM-DD')` sobre una columna `date`, depende de la zona horaria del servidor), no de tu pantalla. Está reportado a su dueño.

## 7. Estado de construcción

| Pieza | Estado |
|---|---|
| `GET /periodos` | ✅ listo |
| `idPeriodo` de plataforma en las rutas de la sección 2 | ✅ listo |
| Cerrar solo la programación | ✅ listo |
| Impacto de activar y permiso del administrador en el PTA | ✅ listo en la rama; el contenedor del PTA en local sigue con la imagen anterior |
| Grupo devuelve `idPeriodoAcademico` y `tipoOferta` | ✅ listo (nuevos campos de `Grupo`) |
| Importador | existe, sin cambios |

Te aviso en este archivo cuando cada pieza esté en `feature/pa/ronda-pruebas`.

## 8. Docencia que viene de Programación Académica, en la API del PTA (EFDS-2315)

Esto es lo que necesitas para la vista. Lo verifiqué con el servidor real el 12 de octubre: la concertación se aprobó, el docente creó su PTA y la Docencia llegó aprobada. Todo depende del interruptor `PROG_CONCERTACION_HABILITADA`, encendido en los dos servicios, y del corte `PROG_CONCERTACION_DESDE_PERIODO`. Con el interruptor apagado nada de esto aparece y el PTA funciona como hoy.

### 8.1 Las asignaturas — `GET /pta/api/v1/id/:id` → `data.asignaturas[]`

Cada asignatura concertada trae, además de los campos de siempre:

| Campo | Valor | Para qué sirve |
|---|---|---|
| `origen` | `"programacion"` | Indica que la asignatura viene de la concertación. Una asignatura cargada a mano no trae este campo |
| `editable` | `false` | Muéstrala en solo lectura. El servidor ya la protege: si llegan horas cambiadas, las ignora; si se agrega una asignatura a mano, responde **409** |
| `total_horas` y `horas_base` | número | Horas del cálculo único del contrato: `horas_clase × factor de vinculación`, con el reparto por días cuando dos docentes comparten un grupo. Ejemplo verificado: ASIG-00001 da 64 en pregrado y ASIG-00267 da 108 en posgrado (factor 3). El PTA no las recalcula |
| `nivel_concertacion` | `"pregrado"` o `"posgrado"` | Nivel de la concertación que la aprobó |
| `id_concertacion` | UUID | Concertación de origen. Sirve para enlazarla con `GET /programacion-academica/api/v1/concertacion/:id` |
| `componente_docencia` | `"academica_pregrado"` o `"academica_posgrado"` | Componente del PTA donde queda. Lo calcula el PTA, igual que para cualquier otra asignatura |
| `territorial_id` | `""` o el id de `auth.seccionales` | Lugar donde se dicta el grupo. Hoy siempre llega vacío, porque Programación Académica no captura esa ubicación |
| `fecha_inicio` y `fecha_fin` | `YYYY-MM-DD` | Ciclo del grupo |
| `observaciones` | `"Concertada en Programación Académica"` | |

Ejemplo real, recortado:

```json
{ "origen": "programacion", "editable": false, "asignatura_codigo": "ASIG-00001",
  "asignatura_nombre": "Constitución Del Territorio", "total_horas": 64, "horas_base": 64,
  "nivel_concertacion": "pregrado", "componente_docencia": "academica_pregrado",
  "id_concertacion": "1766061c-…", "territorial_id": "", "fecha_inicio": "2050-02-03", "fecha_fin": "2050-05-30" }
```

### 8.2 La aprobación — `GET /pta/api/v1/:ptaId/componentes-aprobacion`

La Docencia concertada aparece en `academica_<nivel>` con estos valores (los nombres van en camelCase, tal como los devuelve la API):
- `estado: "aprobado"`;
- `scope: "programacion"`;
- `scopeId`, que es el id de la concertación;
- `aprobadorNombre: "Programación Académica"`;
- `aprobadorRol: "concertacion"`;
- `horas`.

Con `scope === "programacion"` puedes mostrar "Aprobada en la concertación". En esos PTA no se ofrece aprobar ni revisar Docencia: el servidor responde **409**.

### 8.3 Qué pasó con cada decisión — `GET /programacion-academica/api/v1/concertacion/:id` → `aplicacionPta`

| Valor | Qué significa |
|---|---|
| `aplicada` | Ya está en el PTA |
| `pendiente_sin_pta` | El docente aún no crea su PTA. Se precarga al crearlo |
| `pendiente_pta_firmado` | El PTA está firmado o cerrado. No se modifica: queda pendiente y se reporta |
| `pendiente_pta_flujo_anterior` | El PTA se envió antes del corte, así que sigue con el flujo de hoy |
| `pendiente_pta_en_aprobacion` | Se aplica cuando el PTA vuelva al docente |
| `null`, con `errorNotificacion` | El PTA no respondió. Se puede reintentar |

### 8.4 Qué modo mostrar en la pantalla del PTA — `GET /pta/api/v1/contrato-programacion/v1/docencia/regimen`

Responde a lo que planteaste en `INTEGRACION-codex.md`. **No uses el interruptor directamente**: el régimen depende también del periodo de corte y del estado del PTA. Esta ruta aplica la **misma regla** con la que el servidor bloquea o permite.

| Consulta | Cuándo usarla |
|---|---|
| `?ptaId=<id>` | Para un PTA que ya existe |
| `?periodo=2050-1` | Para un PTA nuevo, antes de crearlo |

Respuesta: `{ "success": true, "data": { "regimen": "programacion" | "actual" } }`.

- **`actual`:** el formulario de hoy, sin ningún cambio. Así responde siempre con el interruptor apagado, sin consultar a Programación Académica. Tu rama apagada debe conservar exactamente el flujo actual.
- **`programacion`:**
  - la Docencia se muestra en solo lectura (`editable: false`);
  - se oculta «Agregar Asignatura»;
  - no se ofrece aprobar ni revisar Docencia;
  - si todavía no llegó docencia, conviene explicar que llega cuando se apruebe la concertación. El envío del PTA responde 409 mientras no haya docencia.
- **Errores:**
  - 400 si el periodo no tiene la forma `AAAA-S`;
  - 404 si el PTA no existe;
  - 401 sin sesión;
  - 503 si Programación Académica no responde (falla cerrado: no asumas `actual`).

Verificado con el servidor real: el PTA de prueba y 2050-1 dan `programacion`; 2049-2 da `actual`.

### 8.5 El interruptor

`GET /programacion-academica/api/v1/concertacion/configuracion` es público y devuelve `{ habilitada, motivo, desdePeriodo, firmaSimulada, revisionesRequeridas }`. `habilitada` ya tiene en cuenta los dos servicios. Si un lado está apagado, `motivo` explica cuál. Sirve como información general; para decidir la pantalla de un PTA usa la sección 8.4.

## 9. Dónde se dicta el grupo: su oferta CETAP (EFDS-2315)

Esto es para el selector de la pantalla de grupos. El PTA decide quién aprueba la Docencia por la territorial de cada asignatura, y esa territorial sale de la **oferta CETAP** del grupo:
- la oferta es un programa en un CETAP y un periodo;
- la crea la carga masiva (`academic_work_plan.oferta_cetap_programa`);
- su territorial es la del CETAP, por código (`DT-009`).

Va en la migración 040 y no se llena nada a mano. Verificado con el servidor real.

No la confundas con `tipoOferta` del grupo (periodo regular, interperiodo…) ni con el módulo `/ofertas` (periodos de oferta, EFDS-1375).

### 9.1 El grupo — `idOfertaCetap`

`GET /grupos/:id` y `GET /grupos?asignatura=` traen `idOfertaCetap: string | null`. Un grupo existente queda en `null` hasta que se le asigna.

### 9.2 Las opciones del selector — `GET /grupos/ofertas-cetap?asignatura=<id>&periodo=<idPeriodo>`

```json
[{ "idOfertaCetap": "1", "idPrograma": "1", "idPeriodoAcademico": "11",
   "cetap": { "id": "1", "codigo": "CET-0288", "nombre": "Sede Central" },
   "territorial": { "codigo": "SC", "nombre": "SEDE_CENTRAL", "idSeccional": "900001" } }]
```

- Solo trae las ofertas **activas** del programa de la asignatura en ese periodo, ordenadas por territorial y CETAP.
- En un periodo legado responde `[]`: el modelo legado no tiene ofertas CETAP.
- El volumen real varía mucho: en 2050-1, APT tiene 271 ofertas y Administración Pública tiene 1. Conviene que el selector permita buscar.
- `territorial.idSeccional` puede venir `null` si el código del CETAP no cruza con auth. Muéstralo: ese grupo no se podrá concertar.

### 9.3 Asignar o quitar la oferta

| Llamada | Para qué |
|---|---|
| `POST /grupos` con `idOfertaCetap` (opcional) | Crea el grupo con su oferta |
| `PATCH /grupos/:id` con `{ "idOfertaCetap": "165" }` | Asigna la oferta. Con `null` la quita |

Respuestas **400** que conviene mostrar tal cual:
- *"La oferta CETAP no existe, no está activa, o no es del programa de la asignatura en este periodo."*
- *"Solo los grupos de un periodo de plataforma tienen oferta CETAP."*
- *"Las aulas 101 del grupo no son del CETAP CET-0135 (Neiva)."* Sale si el grupo ya tiene sesiones presenciales en aulas de otro CETAP.

### 9.4 El aula de una sesión presencial

`POST /horarios` con `tipoSesion: 'presencial'` y `aulaCodigo` responde **400** si el aula es de otro CETAP que la oferta del grupo: *"El aula 101 es del CETAP CET-0288 y el grupo se dicta en CET-0135."*. Una sesión mediada por tecnología no se verifica, y tampoco un grupo sin oferta (la verificación ocurre al concertar).

### 9.5 Al concertar

Si el docente envía con un grupo sin oferta, sin territorial que cruce, o con un aula de otro CETAP, recibe **409**, y el mensaje lista cada grupo con su motivo. Ejemplo: *"No se puede concertar sin saber dónde se dicta cada grupo (de ahí sale quién aprueba): Fundamentos de economía pública grupo 1 (sin oferta CETAP)."*

**Dirección Territorial (desde el 16 de octubre):** si la oferta no es de Sede Central, la concertación exige los permisos territoriales del PTA (`pta.{review,approve}.academica.territorial.<nivel>`). En el PTA se aplica por par (territorial, nivel) en `PtaTerritorialApproval`, con `scope: programacion`. Con todos los pares aprobados, `academica_territorial` aparece aprobado en `componentes-aprobacion`, igual que `academica_<nivel>` (sección 8.2).

## 10. Verificación de tu pantalla de Docencia del PTA (`5c0b25636`, 14 de octubre)

Integrada en `ronda-claude` y `ronda-pruebas`, y verificada en el navegador con el servidor real:

| Caso | Resultado |
|---|---|
| **Encendida** | El docente crea su PTA (2050-1, activado temporalmente) después de concertar. La Docencia aparece «Aprobada en la concertación», en solo lectura y sin «Agregar Asignatura». Muestra Concepciones (108 h) y Constitución del Territorio (64 h), total 172 h. Sin errores de JavaScript |
| **Apagada** | La sección Docencia es **idéntica** a la de hoy. La comparé contra el build del commit anterior a tu integración, sobre el mismo PTA: mismo texto, mismos 11 botones, mismos 10 campos editables y «Agregar Asignatura» |
| Pruebas del MFE del PTA | 590 de 590 |

Tres observaciones, para que decidas:
1. **Con el interruptor apagado, el formulario ahora depende de la consulta del régimen.** Si esa consulta falla, o si no hay periodo activo (`periodoNoDisponible`), no deja guardar ni enviar. Hoy, sin tu cambio, eso no bloquea. Fallar cerrado tiene sentido con el interruptor encendido. Con el interruptor apagado, el backend responde `actual` sin consultar nada; el riesgo es solo de red o de no tener periodo activo, pero es un cambio de comportamiento.
2. Mientras llega la respuesta, la sección Docencia muestra un instante el aviso ámbar «Consultando el régimen de Docencia…», también con el interruptor apagado.
3. En la lista «Mi Plan de Trabajo Académico», la tarjeta del PTA dice «Docencia — No iniciado» aunque la Docencia ya está aprobada en la concertación (`componentes-aprobacion`: `academica_<nivel>` aprobado con `scope: programacion`).

Dato local que no viene de tu pantalla: el docente de prueba tiene `horasAsignables = 0` en el banco de docentes, así que el formulario muestra «Límite excedido 172h / 0h».

## 11. Verificación del selector de oferta (`2110bbf95`) y del formulario del PTA (`2a9718618`), 16 de octubre

Los dos están integrados en `ronda-claude` y `ronda-pruebas`.

**Selector, verificado con el servidor real como `qa.programacion` en 2050-1 (APT, ASIG-00146):**
- la búsqueda «Neiva» encuentra 1 de 271 ofertas;
- crea el grupo con la oferta de Neiva (165), la cambia a Acevedo (153), la quita (`null`) y la vuelve a poner;
- una oferta de otro programa y un aula de otro CETAP responden 400;
- cambiar a Sede Central un grupo con sesión presencial en un aula de Neiva responde 400, y la pantalla muestra el aviso: *«Las aulas PRUEBA-CODEX-HUI del grupo no son del CETAP CET-0288 (Sede Central)»*;
- sin errores de JavaScript.

**Formulario del PTA, verificado con el servidor real:**
- **apagada**, la sección Docencia es idéntica a la de hoy;
- con la concertación **encendida** y Programación Académica caída, cae al formulario de hoy con tu aviso discreto, y el servidor no guarda (503): el PTA queda intacto;
- con la concertación encendida, el servidor rechaza agregar a mano (409), cambiar horas concertadas (409) y enviar sin Docencia concertada.

Observaciones para que decidas:
1. **Crear grupos depende de la consulta de ofertas.** Si `GET /grupos/ofertas-cetap` falla o está cargando, «Crear grupos» queda deshabilitado, aunque la oferta es opcional al crear.
2. **Etiqueta repetida.** El campo de búsqueda y la lista comparten el nombre accesible («Oferta CETAP para grupos nuevos»): un lector de pantalla los anuncia igual.
3. **Valor sin guardar tras un rechazo.** Después de un 400 al guardar la ubicación, la lista sigue mostrando la oferta rechazada, mientras el servidor conserva la anterior.
4. **Entorno de la prueba.** `GestionGrupos.test.tsx` falla con «document is not defined» si se corre sin `--environment jsdom`, porque este MFE no tiene configuración de Vitest. Con `// @vitest-environment jsdom` al inicio del archivo pasa en cualquier corrida.
5. **tsc del MFE de Programación Académica pasa de 102 a 104** por el ícono Lucide `MapPin` (TS2786, el problema transversal que ya conoces).
6. **El aviso promete algo que el servidor no permite.** Con Programación Académica caída, el aviso dice «Puedes continuar con el formulario habitual», pero en un periodo dentro del corte el servidor no guarda (503) hasta que Programación Académica responda.


## 12. Verificación de `e8cf434de` (17 de octubre)

Integrado en `ronda-claude` y `ronda-pruebas`. Atendiste las observaciones 1, 2, 3 y 6 de la sección 11:
- se crean grupos sin oferta aunque la consulta falle;
- el buscador tiene su propia etiqueta;
- tras un rechazo, la lista vuelve al valor guardado;
- el aviso del 503 es correcto.

Pruebas: MFE de Programación Académica 6 de 6 (con jsdom), MFE del PTA 596 de 596, y tus pruebas de navegador 15 de 15.

Quedan dos errores de tsc en el MFE de Programación Académica (104 frente a la línea base de 102):
1. `GestionGrupos.tsx`: un `Loader2` más en el botón «Guardar ubicación». Es el TS2786 transversal de Lucide.
2. `GestionGrupos.test.tsx`, línea 88: `new Promise(() => {})` necesita el tipo, por ejemplo `new Promise<OfertaCetapGrupo[]>(() => {})`.

Con la concertación apagada, la consulta del régimen siempre responde `actual`, así que tus cambios no alteran el formulario de hoy.

## 13. Prueba final de Codex: arreglos (18 de octubre)

### Hallazgos de tu reporte
1. **El docente no podía enviar a concertación.** No es una regresión: `ConcertacionDocente` nunca estuvo montado en el portal; yo verifiqué el envío el 12 de octubre por API. Ahora `PortalDocenteProgramacion` lo monta una vez por cada periodo donde el docente tiene docencia (tomada o devuelta). Para eso `FranjaPortal` trae `idPeriodo` y `periodoCodigo`. El bloque se oculta si el periodo es anterior al corte `desdePeriodo`. Prueba: `PortalDocenteProgramacion.test.tsx` (6 casos; falla si el botón desaparece). Verificado en el navegador con el servidor real: al tomar una franja en 2050-2 aparece «Concertación de mi docencia · Periodo 2050-2» con «Enviar».
2. **El portal no validaba el tope al tomar.** `tomar` ahora calcula con el mismo cálculo único (`DocenciaService`, incluyendo la franja hipotética) y responde 409 si se pasa del tope; con tope ≤ 0 no limita; sin registro en el RUND responde 403. El tope sale de `asignaciones/tope.ts` (304 h para cátedra, `horasAsignables` en otro caso) y lo usan el portal y el backoffice. La toma va bajo `pg_advisory_xact_lock` por docente, para que dos tomas simultáneas no se pasen. Hallazgo adicional: el backoffice tampoco aplicaba las 304 h a un catedrático con `horasAsignables = 0`; ahora sí. Canario: `tope-docente.agregado.spec.ts` (7 casos, transaccional; falló antes del arreglo).
3. **El panel de publicación no se actualizaba.** Nuevo hook `useEstadoPublicacion` sobre tu `useRevisionProgramacion('programacion','publicaciones')`. Prueba: `useEstadoPublicacion.test.ts` (4 casos).

### Muestra del 400 del importador (servidor real)
`POST /pta/api/v1/asignaturas-import/upload?periodo_codigo=2050-2&dry_run=true` con `carga-con-errores-por-fila.xlsx`:

```
HTTP/1.1 400 Bad Request
Content-Type: application/json; charset=utf-8
Content-Length: 379

{"success":false,"message":"Validación del Excel fallida (Reglas bloqueantes R1-R6).","errors":["ASIGNATURAS fila 3: creditos debe ser un entero entre 1 y 20.","ASIGNATURAS fila 6: falta codigo_asignatura.","ASIGNATURAS: códigos duplicados: ASIG-00007.","ASIGNATURAS: semestres no soportados: Semestre 99.","ASIGNATURAS: programas inexistentes en la hoja PROGRAMAS: PRO-999."]}
```

Con el Excel válido responde 200 con `{"success":true,"dry_run":true,"periodo":"2050-2","carga":{...omitidos...},"indicadores_pta":{...}}`; la lista de errores del éxito se llama `errores` (en español).

**Para el MFE:** el 400 usa la clave `errors` (inglés), el éxito usa `errores`. Si `peticion()` solo lanza `message` cuando `!res.ok`, el usuario ve «Validación del Excel fallida» sin las filas. Hay que leer `errors` en el camino de error.

## 14. Reinicio de la base, carga masiva, catálogo por periodo, choque de aulas y aulas por oferta (18 de octubre)

### 14.1 La base local quedó en cero (con respaldo)
- Respaldo completo antes de tocar nada: `respaldos/reinicio-antes.dump` (en el scratchpad de Claude), restauración comprobada en una base desechable. Foto de conteos antes y después: `pruebas-carga/conteos-antes.txt` y `conteos-despues.txt` (solo cambiaron 16 tablas).
- Se borró: periodos 2050-1, 2050-2, 2026-1 y 2027-2 (los dos últimos los creó Tomás a mano hoy), periodos legado y equivalencias, grupos/franjas/asignaciones/concertaciones, programas, núcleos, asignaturas, ofertas CETAP, el PTA de prueba huérfano, el usuario `prueba.codex.final.20502@esap.edu.co`, el aula `PRUEBA-CODEX-HUI` y el histórico (575 filas).
- Se conservó: usuarios, personas, docentes (352), roles, territoriales y CETAP (290), 29 aulas, semestres, periodo 2025-2 y viáticos.
- No hubo clase C: ninguna fila de docente real dependía de lo borrado (0 asignaciones, 0 concertaciones, 0 PTA con docencia).
- **Reimportar el histórico (575 filas):** `psql -U postgres -d esap_db -f programacion_historica-575.sql` (archivo en `pruebas-carga/`, solo INSERT sobre la tabla vacía). Ojo: la columna `id_asignatura_sugerido` apunta a ids de asignaturas de la carga anterior; al recargar el catálogo esos ids cambian, así que hay que anularla (`UPDATE "academic-schedule".programacion_historica SET id_asignatura_sugerido = NULL, n_candidatos = NULL`) y recalcular las sugerencias si se necesitan.
- Para volver a este estado: `respaldos/volver-a-cero.sql` (conserva lo anterior y borra periodos distintos de 2025-2, catálogo, ofertas y programación).

### 14.2 Carga masiva: qué significa lo que se ve (reproducido de punta a punta)
Reproducido por la interfaz como `qa.admin`: crear 2050-1, cargar el Excel válido, validar, confirmar; luego crear 2050-2 y repetir.
- **«No ingresadas» no son rechazadas: son «sin cambios».** Es `carga.asignaturas.omitidos` = ya existían idénticas. En el segundo periodo el catálogo (14 programas, 427 asignaturas, 33 núcleos) ya existe y no cambia; **lo único que la carga le agrega al periodo son las ofertas CETAP (325)**, que esa pantalla no mostraba.
- Primera carga: 427 asignaturas nuevas, 14 programas, 33 núcleos, 325 ofertas. Segunda: 0 / 0 / 0 y **325 ofertas por crear**. El mismo Excel otra vez en el mismo periodo: `blocked_reason: "ALL_IDENTICAL"` y 325 ofertas «ya existentes».
- **Programas Académicos sí muestra los 14 programas** de cada periodo cargado (lista por oferta CETAP del periodo). Lo que veía Tomás vacío era un periodo SIN oferta (p. ej. el que traía la pantalla por defecto), y el mensaje «Aún no hay programas registrados. Crea uno para comenzar» engañaba. Ahora dice que el periodo no tiene oferta cargada y dónde cargarla.

### 14.3 Respuesta del importador (aditivo; nada de lo anterior cambia)
`POST /pta/api/v1/asignaturas-import/upload?periodo_codigo=<cod>&dry_run=true|false` (y `/validate`). Campos nuevos, **iguales en la validación previa y en la confirmación**:
- `carga.<categoría>.sin_cambios` (= `omitidos`, dicho claro) y `carga.<categoría>.rechazadas` (filas que no se pueden ingresar). **Sin cambios no es rechazadas.**
- `ofertas`: `{ por_crear, ya_existentes, rechazadas, detalle: [{ codigo_cetap, nombre_cetap, codigo_programa, nombre_programa, estado: 'por_crear' | 'ya_existente' | 'rechazada', motivo? }] }`. «Rechazada» = el programa de la oferta no existe en el catálogo ni en la hoja PROGRAMAS (hoy lo bloquean antes las reglas R1-R6; queda reservado).
- La confirmación además trae `resumen_periodo: { programas, asignaturas, cetaps, ofertas }` = lo que quedó en el periodo.

Respuesta real, **confirmación en un periodo nuevo con el catálogo ya cargado** (2050-2; el `detalle` real trae 325 filas, aquí 2):
```json
{
  "success": true,
  "dry_run": false,
  "periodo": "2050-2",
  "carga": {
    "programas": {
      "creados": 0,
      "actualizados": 0,
      "omitidos": 14,
      "sin_cambios": 14,
      "rechazadas": 0
    },
    "nucleos_tematicos": {
      "creados": 0,
      "actualizados": 0,
      "omitidos": 33,
      "sin_cambios": 33,
      "rechazadas": 0
    },
    "cetaps": {
      "creados": 0,
      "actualizados": 0,
      "omitidos": 290,
      "sin_cambios": 290,
      "rechazadas": 0
    },
    "ofertas_cetap_programa": {
      "creados": 325,
      "actualizados": 0,
      "omitidos": 0,
      "sin_cambios": 0,
      "rechazadas": 0
    },
    "asignaturas": {
      "creados": 0,
      "actualizados": 0,
      "omitidos": 427,
      "sin_cambios": 427,
      "rechazadas": 0
    }
  },
  "ofertas": {
    "por_crear": 325,
    "ya_existentes": 0,
    "rechazadas": 0,
    "detalle": [
      {
        "codigo_cetap": "CET-0288",
        "nombre_cetap": "Sede Central",
        "codigo_programa": "PRO-001",
        "nombre_programa": "Administración Pública - Diurno",
        "estado": "por_crear"
      },
      {
        "codigo_cetap": "CET-0288",
        "nombre_cetap": "Sede Central",
        "codigo_programa": "PRO-002",
        "nombre_programa": "Administración Pública - Nocturno",
        "estado": "por_crear"
      }
    ]
  },
  "resumen_periodo": {
    "programas": 14,
    "asignaturas": 427,
    "cetaps": 271,
    "ofertas": 325
  }
}
```
La validación previa del mismo caso es idéntica, sin `resumen_periodo`. Primera carga (catálogo vacío): `carga.asignaturas = {creados: 427, omitidos: 0, sin_cambios: 0, rechazadas: 0}` y `ofertas.por_crear = 325`. El mismo Excel otra vez en el mismo periodo: `blocked_reason: "ALL_IDENTICAL"` y `ofertas = {por_crear: 0, ya_existentes: 325, rechazadas: 0}`.
El MFE de PA ya muestra «sin cambios», las ofertas y las filas del 400 (`errors`); la pantalla completa (tabla de ofertas) es tuya.

### 14.4 El Catálogo Académico depende del periodo
- **De dónde sale cada dato:** no hay nada quemado. Programas y asignaturas salen de las tablas compartidas `academic_work_plan.programa` y `asignatura` (las llena la carga masiva) y no pertenecen a un periodo. Lo que sí pertenece al periodo es la **oferta** (`oferta_cetap_programa`).
- **Regla:** una asignatura aparece en un periodo si su programa tiene al menos una oferta CETAP activa en él. Un periodo sin carga no muestra nada. La segregación por nivel sigue igual; lo que ve el docente no cambia (el portal lee grupos, no el catálogo).
- **Contrato (aditivo; sin `periodo` todo sale como antes):**
  - `GET /catalogo/programas?nivel=&periodo=<idPeriodo>` devuelve solo los programas con oferta activa en ese periodo.
  - `GET /catalogo/programas/:id/asignaturas?periodo=` con un programa sin oferta en el periodo devuelve `semestres: []` y `ofertadoEnPeriodo: false` (el campo solo viaja con `periodo`).
  - `GET /catalogo/asignaturas/:codigo?periodo=` responde 404 «existe en el catálogo, pero su programa no tiene oferta en este periodo».
  - `periodo` inválido da 400; un id de periodo legado (uuid) no filtra porque no tiene ofertas.
- MFE de PA: `SelectorCatalogo`, `BuscarPorCodigo` y `DisponibilidadAulas` ya pasan el periodo seleccionado.

### 14.5 Choque de aula y de docente: una sola regla
Causa: `crearSesion` buscaba el aula por código y día **sin mirar periodo ni fechas** (y el validador vivo lo documentaba: «el aula se compara contra todas»), así que lo programado en un periodo dejaba el aula ocupada en todos.
- **Regla (`horarios/choque.ts`, única):** chocan si coinciden el día, las horas se solapan (tocarse en el extremo no cuenta) **y los ciclos de clases se solapan en fechas**. El ciclo es el del grupo; sin ciclo, el del periodo. Sin fechas conocidas se asume solape (lado seguro). Es la misma regla del histórico de cruces.
- La usan: crear franja (aula), `GET /aulas/:codigo/disponibilidad`, cruces vivos de Validación, validación al publicar, asignación de docentes (RN-07) y el portal del docente (listar disponibles y tomar). Ya no hay tres versiones.
- `GET /aulas/:codigo/disponibilidad?periodo=<id>` o `?grupo=<uuid>` mide la ocupación en ese ciclo; sin parámetros devuelve todo lo que tenga el aula (como antes). Solo día y hora, nunca el grupo.
- Pruebas contra la base real con dos periodos (sin solape no choca, con solape sí, y el ciclo propio del grupo manda sobre el del periodo). Mutación verificada: si la regla ignora las fechas, fallan 6 pruebas.

### 14.6 Aula y oferta, relacionadas: contrato de `GET /aulas`
Cada aula trae ahora `tipo`, `piso`, `territorial: {codigo, nombre}`, `cetap: {codigo, nombre}` e `idOfertaCetap` (null sin filtro de oferta). Filtros, combinables:
- `?cetap=CET-xxxx` devuelve las aulas de ese CETAP.
- `?grupo=<uuid>`: con **grupo con oferta**, las aulas del CETAP de esa oferta (`idOfertaCetap` es la del grupo). Con **grupo sin oferta**, las aulas de los CETAP con oferta activa del programa de su asignatura en su periodo; **cada aula trae la oferta que se deduce al elegirla** (hay una por programa, CETAP y periodo).
- `?asignatura=<id>&periodo=<id>` hace lo mismo cuando el grupo todavía no existe.
- Lista vacía con filtro de oferta significa que ninguna aula es válida (periodo sin carga, o programa sin ofertas). Los filtros inválidos dan 400 (no se ignoran). Un grupo de periodo legado no filtra.
- **Sin aula** (virtual o mediada por tecnología): se elige la oferta directamente con `GET /grupos/ofertas-cetap`. Las validaciones del servidor se quedan (aula de otro CETAP que la oferta da 400).
- La UI del selector de aula con estas opciones es tuya.

### 14.7 Propuesta (sin implementar): copiar la oferta del periodo anterior
Hoy un periodo sin ofertas obliga a cargar el Excel otra vez. Propongo `POST /pta/api/v1/periodos-academicos/:destino/copiar-oferta` con `{ desde, dryRun }` (permiso: el mismo de la carga masiva).
- **Qué se copia:** las ofertas activas (programa × CETAP) del periodo origen, con sus cupos estimados. **No se copia** nada que sea del periodo: grupos, franjas, asignaciones, concertaciones ni docentes. El catálogo es compartido y no se toca.
- **CETAP que cambiaron:** se copia solo si el CETAP y el programa siguen activos en la estructura vigente. Los que ya no están se listan como «rechazada» con su motivo (nunca se descartan en silencio). Un CETAP nuevo no aparece por copia: entra con el Excel, que se carga encima.
- **Sin duplicar:** la clave única (CETAP, programa, periodo) con `ON CONFLICT DO NOTHING`. Correrlo dos veces crea 0; si luego se carga el Excel, lo que ya está sale «ya_existente». Nunca borra ofertas del destino.
- **Vista previa:** `dryRun` devuelve el mismo bloque `ofertas` del importador (por_crear, ya_existentes, rechazadas y detalle), para que la pantalla de la carga lo reutilice.
- **Reglas:** el destino debe ser programable (planeación o en curso), origen distinto de destino, y el origen debe tener ofertas (si no, 400). Queda en la auditoría.
- Decisiones pendientes de Tomás: si se copian también los cupos, y qué hacer con las ofertas del origen cuyo CETAP se cerró (hoy: informar).

### 14.8 Pruebas
Las pruebas de agregado de PA ya no dependen del catálogo cargado: usan `test/catalogo-qa.cjs` (programa, núcleo, asignatura, periodo y oferta propios, con códigos `QA-*`, dentro de la transacción de cada prueba, o confirmados y retirados cuando leen por otra conexión). Un fixture que falla ahora **se grita**: antes la prueba se saltaba en silencio y dejaba una conexión abierta dentro de una transacción abortada. Ojo al medir omitidas: con la suite completa Jest no muestra los `console.warn`; hay que correr cada archivo solo.

## 15. Prueba de Tomás: concertación oculta y vista de la jefatura (18 de octubre)

- **El docente no veía «Enviar a concertación»:** no faltaba el botón. El corte local `PROG_CONCERTACION_DESDE_PERIODO=2050-2` (lo dejé para pruebas anteriores) era posterior a 2026-2, el periodo de sus franjas, y el portal oculta el bloque antes del corte. El `.env` local de PA quedó en `2026-1`. El PTA lee el corte de PA: 2026-1 y 2026-2 → régimen `programacion`; 2025-2 → `actual`.
- **La jefatura veía «Sin periodos» y «No tiene permisos de programación»:** `GET /periodos` exige un nivel de programación y la jefatura no programa (solo revisa y aprueba). Ahora `periodosApi` adjunta `status` al error, y `ProgramacionAcademicaModule` entra en **perfil de revisión** con un 403 de `/periodos`: sin cabecera de periodo, sin indicadores y sin las secciones de programación; solo Concertación (y Aprobación territorial si es jefatura). El backend no cambió. Codex: el cambio es aditivo y está en tu módulo (`soloRevision`).
- Verificado en el navegador real sin enviar nada: el docente ve «Concertación de mi docencia · Periodo 2026-2» con «Enviar»; la jefatura ve solo Concertación, sin errores de JS.

## 16. Concertación: firma con el modal del PTA y acciones claras en la bandeja (19 de octubre)

- **Firma:** `FirmaOtpModal.tsx` (MFE de PA) es el mismo diseño y flujo del modal de firma del PTA (`mfe-pta/.../FirmaDigitalPTA.tsx`): verificación con 6 casillas y temporizador de 5 min → generación animada → certificado → firma registrada. Copia deliberada: son MFE distintos sin paquete de UI compartido. El código viaja con la decisión y lo verifica el servidor, como antes. Lo abren: el docente al enviar o reenviar (`ConcertacionDocente`), el revisor al revisar y el aprobador al aprobar (`ConcertacionBandeja`). Se quitaron los inputs sueltos de «Código de firma».
- **«Solo aparecía Devolver»:** el servidor estaba bien (`puede` de superadmin: revisar + aprobar + devolver; de la jefatura: aprobar + devolver). En ENVIADA la bandeja ocultaba «Aprobar», porque solo se aprueba tras la revisión académica, y el «Revisar» de superadmin salía gris junto a un input. Ahora: «Revisar y firmar» destacado; «Aprobar y firmar» siempre visible para quien aprueba, deshabilitado con el motivo hasta que la revisión termine; etapas Enviada → Revisión académica → Aprobación (`EtapasConcertacion.tsx`) y registro de firmas.
- **Backend (aditivo):** `GET /concertacion/bandeja` trae `periodoCodigo` y `firmas: [{rol, firmadoEn, modoOtp}]`.
- **Periodos:** el corte local es `PROG_CONCERTACION_DESDE_PERIODO=2026-1`, así que todo lo que funcionaba en 2050 rige para 2026-1, 2026-2 y cualquier periodo posterior.
- Pruebas: MFE 29/29 (nuevas `ConcertacionBandeja.test.tsx`; el portal prueba el envío por el modal). Concertación backend 22/22, sin omitidas. tsc del MFE: 125, todos TS2786/ImportMeta transversales (los +15 son los íconos Lucide del modal).
