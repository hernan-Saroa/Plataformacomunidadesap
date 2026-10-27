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

## 17. PTA nuevo: la docencia aprobada se ve desde el principio (19 de octubre)

- **Lo que vio Tomás:** concertación APROBADA, pero «Crear Nuevo PTA» decía «La Docencia llegará al PTA cuando se apruebe la concertación». La decisión sí había llegado al PTA (`docencia_concertada`): por diseño queda `pendiente_sin_pta` hasta que el docente guarda su PTA, y ahí se aplica (`aplicarPendientesAlCrear`). El formulario de un PTA nuevo no tenía cómo mostrarla antes de guardar. Su borrador de 2026-2 sí la tiene: ASIG-00001 (32 h) y ASIG-00003 (63.9 h), en total 95.9 h, «Aprobada en la concertación» (verificado en el navegador).
- **Nuevo (aditivo, PTA):** `GET /contrato-programacion/v1/docencia/aprobada?periodo=AAAA-S` devuelve `{ asignaturas, horas, ptaVigente: {id, estado} | null }`. Las asignaturas vienen tal como entrarán al PTA (misma conversión `entradaPta`). Es de solo lectura y **solo devuelve la del usuario autenticado** (identidad del token): otro usuario recibe `[]`.
- **mfe-pta:** `PTAForm`, en un PTA nuevo del régimen de concertación, carga esa docencia como vista previa. `DocenciaConcertada` dice «Aprobada en la concertación · se incorpora a este PTA al guardarlo» y, si ya existe un PTA del periodo, avisa que lo continúe («Ir a mis PTAs»). Al guardar un PTA **nuevo** no se reenvía la vista previa: el servidor la aplica al crear, y `protegerAsignaturas` rechaza asignaturas «de programación» que no tenga guardadas.
- Pruebas: MFE del PTA 599/599 (+3 en `PTAForm.docencia-concertada.test.tsx`); `docencia-decisiones.agregado.spec.ts` 7/7 sin omitidas (caso nuevo: solo la propia, otro usuario y otro periodo vacíos).
- **Omisión previa, ajena a este cambio:** `calculo-horas.paridad.spec.ts` usa `postgres` como contraseña por defecto y el Jest del PTA no carga el `.env`: se salta en silencio («sin base: paridad omitida»). Pendiente de decidir si se le da el mismo `cargar-env` que a PA.

## 18. Periodo cerrado: el portal del docente arranca en ceros (19 de octubre, en `micro-frontend`)

- **Reporte:** al activar 2027-1, el anterior (2026-2) quedó cerrado, pero las 4 franjas aprobadas del docente seguían en su portal y sus 96 h contaban contra el tope de 304 h del periodo nuevo.
- **Regla:** lo de un periodo **cerrado** (`periodo_academico.estado` o legado `periodo_programacion.estado` = `cerrado`) deja de ser carga vigente. Una sola condición, `sqlPeriodoNoCerrado()` en `periodos/periodo-ref.ts`, se usa en:
  - `DocenciaService.porGrupo`, el cálculo único: acumulado, tope al tomar y tope del backoffice;
  - el portal: `misFranjas` y `disponibles`, también para lo propio que bloquea por choque;
  - `tomar`, que rechaza con 409 una franja de un periodo cerrado.
  Al no haber franjas vigentes, el bloque de concertación del periodo cerrado también desaparece.
- **No es lo mismo que «programación cerrada»** (`programacion_periodo`): ahí el periodo sigue en curso y su docencia sigue contando.
- **No se borra nada:** franjas, concertaciones, firmas y el PTA del periodo cerrado quedan en la base como histórico.
- Verificado: portal de `qa.docente` en 2027-1 con 0 h de 304, 0 franjas propias y 9 disponibles (todas de 2027-1). Prueba de agregado nueva en `portal-docente.agregado.spec.ts` con mutación verificada. PA 227/227.

## 19. Ronda 3: contratos para Codex (EFDS-2344 y EFDS-2343), 20 de octubre

Rama base `feature/pa/ronda3` (desde `origin/micro-frontend` `7ccf579d5`). Claude trabaja en `feature/pa/ronda3-claude`; Codex en `feature/pa/ronda3-codex`. Codex consume estos contratos; no los cambia: si le falta un campo, lo pide en `INTEGRACION-codex.md`.

Rutas vía gateway: `/programacion-academica/api/v1/<ruta>` (las de abajo van sin ese prefijo). Todas exigen token.

### Reglas comunes a los dos contratos

- **Registro único del docente: la franja** (`franja_horaria.id_docente`). Un grupo puede tener varios docentes (uno por franja). No se lee `grupo.id_docente` ni `asignacion_docente` para saber quién dicta.
- **`idDocente`** es `auth.personas.id_person` (uuid); **`documento`** es la cédula.
- **Vinculación** del banco de docentes (`"Docente"."tipoVinculacion"`), normalizada:
  `vinculacion: { tipo: 'carrera' | 'ocasional' | 'especial' | 'catedra' | 'periodo_prueba' | 'otra', texto: string }`. `texto` es el valor crudo («Carrera2», «Cátedra»…). `null` si el docente no está en el banco.
- **Horas del docente** = cálculo único (`DocenciaService`: `horasImpacto` del contrato × reparto por días). Nunca se recalculan en el cliente.
- **`periodo`** acepta el id de `periodo_academico` o el código (`2050-1`).
- **`diaSemana`**: `LUNES | MARTES | MIERCOLES | JUEVES | VIERNES | SABADO | DOMINGO`. Horas `HH:MM`.
- **Ciclo** de un grupo: sus fechas, o las del periodo si no tiene (`cicloInicio`/`cicloFin`, `YYYY-MM-DD` o `null`).
- **Segregación por nivel (RN-08) en el servidor:** solo vuelve lo de los niveles que el usuario puede ver (programador o asignador docente de pregrado/posgrado; `programacion-academica.all` ve ambos). Pedir un `nivel` sin permiso responde 403.

### EFDS-2344 · Árbol de programación: `GET /programacion/arbol`

Query: `periodo` (obligatorio), `nivel?` (`pregrado|posgrado`), `programa?` (id), `tipoOferta?` (`periodo_regular|creditos_virtual|interperiodo`), `soloSinDocente?` (`true`: solo grupos con alguna franja sin docente).

```jsonc
{
  "periodo": { "id": "12", "codigo": "2050-1", "estado": "activo", "fechaInicio": "2050-02-01", "fechaFin": "2050-06-10" },
  "resumen": { "programas": 3, "asignaturas": 20, "grupos": 41, "franjas": 96, "franjasSinDocente": 12 },
  "programas": [{
    "idPrograma": "4", "codigo": "AP", "nombre": "Administración Pública", "nivel": "pregrado", "tipo": "profesional",
    "asignaturas": [{
      "idAsignatura": "1001", "codigo": "ASIG-01001", "nombre": "Historia del Pensamiento Político",
      "semestre": 1, "creditos": 3, "horasClase": 64,
      "area": { "id": "2", "codigo": "NT-002", "nombre": "Estado Y Poder" },          // null si no tiene
      "grupos": [{
        "idGrupo": "uuid", "numeroGrupo": 1, "estado": "PROGRAMADO", "tipoOferta": "periodo_regular",
        "cicloInicio": "2050-02-01", "cicloFin": "2050-05-30", "cupoMaximo": 30,
        "oferta": {                                                                       // null si el grupo no tiene oferta CETAP
          "idOfertaCetap": "77",
          "cetap": { "id": "10", "codigo": "CET-01", "nombre": "CETAP Bogotá" },
          "territorial": { "codigo": "DT01", "nombre": "Sede Principal" }
        },
        "horas": { "programadas": 64, "requeridas": 64, "semanas": 16, "excede": false },
        "estadoFranjas": { "PROGRAMADO": 0, "PUBLICADA": 0, "TOMADA": 0, "APROBADA": 2, "DEVUELTA": 0 },
        "docentes": [{                                                                    // [] si no tiene
          "idDocente": "uuid", "documento": "52364430", "nombre": "ÁVILA PÉREZ SANDRA",
          "vinculacion": { "tipo": "catedra", "texto": "Cátedra" },
          "fraccion": 1, "horas": 64
        }],
        "franjas": [{
          "idFranja": "uuid", "diaSemana": "LUNES", "horaInicio": "08:00", "horaFin": "10:00",
          "tipoSesion": "presencial", "jornada": "DIURNA", "aulaCodigo": "101", "estado": "APROBADA",
          "idDocente": "uuid"                                                              // null si no tiene
        }]
      }]
    }]
  }]
}
```

Orden: programa por nombre, asignatura por semestre y nombre, grupo por número, franja por día (lunes→domingo) y hora. Una sola llamada: no hay N+1. Programas y asignaturas sin grupos en el periodo no aparecen.

### EFDS-2343 · Calendario semanal del docente

**Backoffice:** `GET /programacion/docentes/calendario?periodo=&documento=` (o `&idDocente=`).
**Portal (el propio docente, identidad del token):** `GET /portal-docente/mi-calendario?periodo=`. Sin `periodo`, el periodo activo.
**Buscador para el filtro:** `GET /programacion/docentes?periodo=&q=` → docentes con al menos una franja en el periodo, por cédula o nombre (máx. 50):
`[{ "idDocente", "documento", "nombre", "vinculacion", "horas", "franjas": 6 }]`.

Respuesta del calendario (las dos rutas):

```jsonc
{
  "docente": { "idDocente": "uuid", "documento": "52364430", "nombre": "…", "vinculacion": { "tipo": "catedra", "texto": "Cátedra" } },
  "periodo": { "id": "12", "codigo": "2050-1", "estado": "activo", "fechaInicio": "…", "fechaFin": "…" },
  "horas": { "total": 128, "tope": 304 },                // tope: null si no aplica
  "franjas": [{
    "idFranja": "uuid", "diaSemana": "LUNES", "horaInicio": "08:00", "horaFin": "10:00",
    "reservada": false,                                   // true = de un nivel que el usuario no ve
    // Si reservada=true, todo lo de abajo viene null (solo se sabe que está ocupado: RN-07)
    "idGrupo": "uuid", "numeroGrupo": 1, "tipoOferta": "periodo_regular",
    "cicloInicio": "2050-02-01", "cicloFin": "2050-05-30",
    "idAsignatura": "1001", "codigoAsignatura": "ASIG-01001", "asignatura": "Historia…",
    "programa": "Administración Pública", "nivel": "pregrado",
    "aulaCodigo": "101", "tipoSesion": "presencial", "jornada": "DIURNA", "estado": "APROBADA"
  }]
}
```

- El calendario muestra **todas** las franjas del docente en el periodo, de lunes a domingo, incluidas las de grupos con ciclos distintos (el cliente puede rotular el ciclo).
- En el portal, `reservada` siempre es `false`: el docente ve todo lo suyo.
- 404 si el documento no existe en el banco de docentes; `franjas: []` si no tiene nada en el periodo.

Estado: **implementado e integrado en `feature/pa/ronda3`**. Lo cubre la prueba de agregado `src/vista/vista.agregado.spec.ts`, con mutación verificada, y se verificó por API con los datos de 2027-2.

Agregados al contrato. Son aditivos y no cambian lo de arriba:
- Calendario: `horasPorGrupo: { [idGrupo]: number | null }`, solo para los grupos visibles.
- Si el contrato de horas con el PTA no responde, las `horas` de un docente y `horas.total` vienen en `null`. La vista no se cae.
- `GET /programacion/mis-permisos` devuelve `{ ver, programar, asignar, disponibilidad }` (por niveles), para que la pantalla muestre solo lo que corresponde.
- **Clientes y tipos listos** en `apps/mfe-programacion-academica/src/services/api/vistaApi.ts`: `getArbolProgramacion`, `buscarDocentes`, `getCalendarioDocente`, `getMiCalendario` y `getMisPermisos`. Codex: úsalo. Si te falta algo, pídelo en `INTEGRACION-codex.md`.

## 20. Ronda 3: EFDS-2342 y EFDS-2348 (20 de octubre)

### Rol de asignación (EFDS-2342)

- **Migración PA `060`:** crea los permisos `programacion-academica.asignacion-docente.<nivel>` y los roles `PROGRAMADOR_DOCENTE_PREGRADO` y `PROGRAMADOR_DOCENTE_POSGRADO`, ambos con disponibilidad docente.
  - Trae un canario: cada rol resuelve su permiso y ninguno de programar ni del otro nivel.
  - Los roles aparecen solos en la gestión de usuarios, porque esa lista viene de `auth.role`. No se tocó ese módulo.
- **Ver, programar y asignar son permisos distintos:** `nivelesVisibles`, `nivelesProgramables` y `nivelesAsignables`.
  - `POST /asignaciones` y `DELETE /asignaciones/grupo/:id` usan `@EscrituraEn(..., { exigeNivel: 'asignacion' })`.
  - Publicar y retirar usan solo los niveles que se programan.
- ⚠️ **Desviación a confirmar con Tomás:** `PROGRAMADOR_PREGRADO` y `PROGRAMADOR_POSGRADO` **ya no asignan docentes**. Asigna el rol nuevo o quien tenga `programacion-academica.all`. Si los programadores deben seguir asignando, basta una migración de una línea.
- **Panel del docente:** `GET /asignaciones/docente/:doc` y `GET /asignaciones/acumulado/:doc` respondían a cualquier token, incluido el de un docente. Ahora exigen el permiso de disponibilidad o el de asignación.
- **Menú del asignador:** solo Programación General y Disponibilidad Docente, más Concertación si está encendida. No puede publicar ni programar.

### El docente recibe su programación (EFDS-2348)

- **Interruptor `PROG_PORTAL_TOMA_FRANJAS`:** sin definir, rige el flujo nuevo.
  - Tomar y soltar responden 409 en el servidor, y `disponibles` sale vacío.
  - Al asignar, las franjas del grupo quedan en **TOMADA** («con docente, pendiente de concertación») dentro de una transacción. Así la concertación y el portal funcionan igual que antes.
  - Lo **APROBADO** no se reasigna ni se retira: responde 409.
- **Portal:** `GET /portal-docente/configuracion` informa qué flujo rige. El portal muestra **Mis grupos asignados** con horario, aula, ciclo, horas y estado.
- Las 3 suites del flujo anterior se corren con el interruptor encendido, porque ese código sigue vivo.

### Pruebas y datos

- **Pruebas:** PA 247/247 sin omitidas y MFE PA 33/33. Las suites nuevas tienen mutación verificada: `asignacion-docente.agregado.spec.ts`, `flujo-asignado.agregado.spec.ts` y `vista.agregado.spec.ts`.
- **Usuario QA local nuevo:** `qa.asignador@esap.edu.co`, con la clave de `qa.programacion` y el rol `PROGRAMADOR_DOCENTE_PREGRADO`.
- **Propuestas sin construir** de EFDS-2345, 2341, 2346 y 2347: `PROPUESTAS-RONDA3-claude.md`.

## 21. Ronda 3b: archivos que genera Codex para el núcleo (EFDS-2345 y EFDS-2375), 24 de octubre

Codex genera **dos archivos de datos**. Claude los carga. Ninguno es código: se pueden regenerar y volver a cargar sin cambiar nada más.

### 21.1 · Tabla de equivalencias de áreas → `nucleo_equivalencia`

**Archivo:** `datos/nucleos/nucleo_equivalencia.csv`, UTF-8 con BOM, separador `;`, una fila por variante.

| Columna | Obligatoria | Valores | Qué es |
|---|---|---|---|
| `area_canonica` | sí, salvo `tipo` `generica` o `sin_area` | texto | Nombre del área canónica, igual en todas sus filas (p. ej. `Estado y Poder`) |
| `variante` | sí | texto | Cómo aparece el área en el plan de estudios, en la base o en el RUND, tal cual (con tildes y mayúsculas; el servidor normaliza) |
| `coincidencia` | sí | `exacta` \| `prefijo` | `prefijo` para las variantes con «…» de la tabla: casan con todo texto que **empiece** así |
| `tipo` | sí | `area` \| `generica` \| `sin_area` | `generica` = frase que no es un núcleo («Labores de docencia…»), se descarta. `sin_area` = núcleo real sin área asignada todavía (se reporta) |
| `fuente` | sí | `plan` \| `rund` \| `base` | De dónde salió la variante: hoja `PLAN_ESTUDIOS`, archivo del RUND o catálogo `nucleo_tematico` |

- Cada área canónica tiene **también una fila con su propio nombre como variante**.
- Las áreas que «quedan solas» (Teoría Económica e Historia, Formación integral y de contexto, Opción de grado, Formación General) van con una fila: su nombre.
- Las frases genéricas van con `tipo=generica`, `coincidencia=prefijo`, sin `area_canonica`. Mínimo: «Labores de docencia», «Impartir asignaturas», «Desarrollo de los diferentes programas misionales», «Programas curriculares».
- Los errores de digitación se agregan como variantes (p. ej. «Problremática Pública»).
- **Normalización del servidor** (la misma en SQL y en TypeScript): minúsculas, sin tildes, sin `. , ; : ( )`, espacios unificados. Dos variantes que normalizan igual en el archivo son un error y la carga lo rechaza.

### 21.2 · Puente para los catedráticos → `docente_nucleo` con origen `puente`

**Archivo:** `datos/nucleos/puente_docente_area.csv`, UTF-8 con BOM, separador `;`, **una fila por docente y asignatura** que dicta, sacadas de la hoja `DOCENTE_ASIGNATURA_` cruzada con `PLAN_ESTUDIOS` (por `COD_ASIGNA` = `PROG_PENSUM` y nombre de asignatura normalizado).

| Columna | Obligatoria | Ejemplo | Qué es |
|---|---|---|---|
| `documento` | sí | `52364430` | Cédula, solo dígitos |
| `nombre` | sí | `ÁVILA PÉREZ SANDRA ESPERANZA` | Solo para el reporte; no se usa para cruzar |
| `plan` | sí | `APT_53` | `PROG_PENSUM` |
| `asignatura` | sí | `Historia de la Administración Pública` | Nombre como está en el plan |
| `area_formacion` | sí | `Estado y poder` | `ÁREA DE FORMACIÓN` del plan, **tal cual**: el servidor la lleva al área canónica con la tabla 21.1 |

- No incluir filas sin cédula (la de cédula `0`) ni las que no cruzan con el plan. Reportarlas aparte en `datos/nucleos/puente_excluidas.csv` (mismas columnas + `motivo`).
- El servidor guarda **un núcleo por docente y área** (no por asignatura), con origen `puente` y el texto de las asignaturas que lo justifican.
- Un docente cuya cédula no esté en `auth.personas` se reporta, no se crea.

### 21.3 · Cómo se cargan

- **Equivalencias:** migración del PTA sembrada con este archivo (la primera versión la armó Claude con la tabla de la instrucción; el archivo de Codex la reemplaza con la misma estructura).
- **Puente:** `POST /pta/banco-docentes/nucleos/puente?dry_run=true|false`, multipart `file` (CSV o XLSX con esas columnas), permiso de carga del RUND. Respuesta: `{ filas, docentes, nucleosCreados, sinCambios, rechazadas: [{ fila, documento, motivo }] }`.
- **Origen `rund`:** se calcula solo al cargar el archivo del RUND (sección 22) y se puede recalcular con `POST /pta/banco-docentes/nucleos/reinterpretar`.
- **Interruptor del puente:** `PROG_NUCLEO_PUENTE` en Programación Académica (`false` lo apaga). Apagado, los candidatos solo usan el núcleo del RUND.

### 21.4 · Cómo quedó cargado (24 de octubre)

- **Equivalencias:** migración 669 (tabla de la instrucción) + 670 (archivo de Codex, commit `fbd18264d`). La 670 **suma**: no borra variantes de la 669 ni rebaja un `prefijo` a `exacta`. Diferencias con el archivo de Codex que se mantienen del lado del servidor, porque sin ellas dejan de resolverse textos reales del RUND:
  - «Gestión del Desarrollo» y «Finanzas Públicas y Presupuesto» son `prefijo` (el RUND trae «Gestión Del Desarrollo Territorial, …» y «Finanzas Públicas Y Presupuesto Público»).
  - «Gobierno y Política Pública» (`prefijo`, Estado, Gobierno y Sociedad) no está en el archivo y aparece en el RUND («…Gobierno Y Política Pública Y Politica Pública Territorial»).
- **Puente:** el CSV de Codex se lee con `;` (el lector genérico de Excel tomaba la coma). 278 filas, 0 rechazadas, 123 docentes, 202 núcleos. Cada carga definitiva **reemplaza** el puente completo (`nucleosRetirados` en la respuesta).
- **Regla del puente en Programación Académica:** cuenta solo para quien **no** tiene núcleo del RUND. No amplía el área de un docente que ya la tiene en el RUND.

## 22. EFDS-2341: candidatos por área y asignación por franja (24 de octubre)

Regla del negocio (decisiones 3, 6 y 7): **nadie se asigna fuera de su área**, un docente sin núcleo no se asigna, un docente por franja. No hay asignación forzada.

### 22.1 · De dónde sale el área

- **Asignatura:** `academic_work_plan.area_de_asignatura(id_asignatura)` (migración 671), regla única en SQL. Posgrado: el programa es el área (`area_formacion.id_programa`). Pregrado: `nucleo_tematico.nombre` normalizado contra `nucleo_equivalencia` (exacta; si no, el prefijo más largo). `NULL` = sin área.
- **Docente:** `academic_work_plan.docente_nucleo` (migración 669), orígenes `rund` y `puente`. Con `PROG_NUCLEO_PUENTE=false` solo cuenta `rund`.
- **Reinterpretación del RUND:** automática después de cada carga definitiva del RUND (la respuesta trae `nucleos: { docentes, conArea, genericos, sinArea, sinResolver }`); si fallara, la carga del RUND no se toca y se repite con `POST /pta/banco-docentes/nucleos/reinterpretar`.
- **Cobertura:** `GET /pta/banco-docentes/nucleos/cobertura` → `{ docentes, con_rund, solo_puente, sin_nucleo, sin_nucleo_con_carga_rund, con_nucleo_fuera_del_banco, porArea: [{ codigo, nombre, rund, puente }] }`.

### 22.2 · `GET /programacion-academica/api/v1/asignaciones/candidatos?grupo=<uuid>&franjas=<uuid>,<uuid>`

Permiso: consultar la disponibilidad docente o asignar docentes (igual que el panel del docente). Sin `franjas`, todas las del grupo. Solo lectura.

```jsonc
{
  "grupo": "uuid",
  "franjas": [{ "idFranja": "uuid", "diaSemana": "LUNES", "horaInicio": "08:00", "horaFin": "10:00", "docenteActual": "Nombre" | null }],
  "area": { "codigo": "AF-01", "nombre": "Estado y Poder", "nucleoAsignatura": "Problemática del Estado y del Poder" } | null,
  "candidatos": [{
    "documento": "…", "nombre": "…", "vinculacion": "Ocasional", "perfil": "…",
    "titulos": { "pregrado": "…", "especializacion": null, "maestria": "…", "doctorado": null, "posdoctorado": null },
    "nucleos": [{ "area": "Estado y Poder", "origen": "rund", "texto": "Problemática Del Estado Y Del Poder" }],
    "origenArea": "rund" | "puente",
    "horasProgramadas": 96,      // docencia ya programada (cálculo único), sin este grupo
    "horasImpacto": 32,          // lo que suman las franjas pedidas (horas del grupo × fracción por días)
    "tope": 304,
    "cruce": false,
    "motivos": [{ "regla": "RN-07", "mensaje": "…" }],   // bloqueos de EFDS-1372, en seco
    "asignable": true
  }],
  "sugerido": { "documento": "…", "nombre": "…", "razones": ["Es del área…", "Tiene 0 h programadas, la menor…", "No tiene cruce…", "No tiene bloqueos…", "Empata…; se desempata por cédula."] } | null,
  "mensaje": null | "La asignatura no tiene área de formación…" | "Ningún docente tiene núcleo temático en el área «…»." | "Hay N docente(s) del área «…», pero todos tienen algún bloqueo…"
}
```

- Solo aparecen docentes del área. Orden: aptos primero, menos horas programadas, cédula.
- El **sugerido** es el primero apto (área, sin cruce, sin bloqueos, menos horas; empate por cédula).
- Las horas y los cruces se calculan **para las franjas pedidas**: una franja de dos días es la mitad de las horas del grupo (regla de reparto por días vigente).

### 22.3 · `POST /programacion-academica/api/v1/asignaciones` con `franjas`

Cuerpo: `{ "idGrupo": "uuid", "documento": "…", "franjas": ["uuid", …] }`. `franjas` es opcional:

- **Sin `franjas` (o todas):** asignación del grupo completo, como antes (modal: todas las franjas por defecto).
- **Con un subconjunto:** solo esas franjas pasan al docente (y a `TOMADA` en el flujo nuevo). El resto conserva el suyo. Si al final todas las franjas tienen el mismo docente, queda su `asignacion_docente`; si el grupo queda repartido, no hay «docente del grupo» y se retira esa fila.
- El área es un **motivo más del bloqueo duro**, el primero: `{ "asignado": false, "motivos": [{ "regla": "AREA", "mensaje": "El docente no es del área «…» (sus áreas: …)." }] }`. Nada se guarda.
- Una franja que no es del grupo → 400. Una franja `APROBADA` de otro docente → 409.
- El listado de franjas (`GET /horarios`) muestra ahora el docente **de cada franja**, no el del grupo.

### 22.4 · Qué hace el front (Codex)

En el modal de asignar: pedir `candidatos` con las franjas marcadas (todas por defecto), mostrar el área, la lista con vinculación, perfil, títulos, núcleo y su origen (`rund` / `puente`), horas, cruce y motivos; resaltar el sugerido con sus razones; si `mensaje`, mostrarlo en lugar de la lista. Permitir desmarcar franjas para asignarlas a otro docente. **No** ofrecer asignar a alguien que no esté en la lista.

## 23. EFDS-2374: concertación en el orden nuevo (24 de octubre)

HU EFDS-2371 (Javier): el programador asigna, la programación se revisa y aprueba **por dentro** (roles del PTA, con firma del aprobador) y **después** el docente, en «Mi programación», solo **acepta** (con firma) o **reporta una novedad** justificada. Lo aceptado alimenta el PTA. El docente no modifica nada.

Todo esto rige solo con `PROG_CONCERTACION_HABILITADA=true` (y su corte `PROG_CONCERTACION_DESDE_PERIODO`), igual que antes. **Apagada, nada cambia.** El orden anterior (el docente enviaba primero) deja de existir con el interruptor encendido: ya no hay `POST /concertacion/:idPeriodo/enviar` del docente.

### 23.1 · Diagrama de estados (`concertacion_docencia.estado`, una por docente × periodo × nivel)

```
                    programador: enviar (foto + huella)
   (asignada) ─────────────────────────────────────────────▶ ENVIADA
       ▲                                                        │ revisor(es): revisar + firma
       │                                                        ▼
       │                                                    REVISADA
       │                                                        │ aprobador: aprobar + FIRMA
       │      revisor/aprobador: devolver (comentario)          ▼
       ├──────────────◀──────────── DEVUELTA ◀───── (ENVIADA | REVISADA)
       │                                                    POR_ACEPTAR ──── el docente la ve en «Mi programación»
       │                                                     │        │
       │       docente: novedad (tipo + justificación)       │        │ docente: aceptar + FIRMA
       └──────────────◀──────────── NOVEDAD ◀────────────────┘        ▼
                                                                   ACEPTADA ──▶ franjas APROBADA ──▶ PTA
```

| Estado | Quién la tiene | Qué puede pasar |
|---|---|---|
| (asignada) | Programador | Las franjas tienen docente y están `TOMADA`. El programador asigna, reasigna y retira libremente. |
| `ENVIADA` | Revisores | El programador envió la foto (franjas y horas, con huella). Revisar (firma del revisor) o devolver. |
| `REVISADA` | Aprobador | Revisiones completas. Aprobar (firma del aprobador) o devolver. |
| `DEVUELTA` | Programador | Devuelta por dentro con comentario. El programador ajusta y vuelve a enviar. |
| `POR_ACEPTAR` | Docente | Aprobada por dentro. El docente acepta (firma) o reporta novedad. |
| `NOVEDAD` | Programador | El docente reportó una novedad: tipo `investigacion` \| `movilidad` \| `perfil` \| `otra` y justificación obligatoria. El programador reasigna o ajusta y vuelve a enviar (vuelve a pasar por revisión). |
| `ACEPTADA` | — | Final. Las franjas pasan a `APROBADA` y la decisión va al PTA (con las firmas del aprobador y del docente). |
| `APROBADA` | — | Solo filas del orden anterior; no se crean más. |

Reglas:
- Mientras la concertación está `ENVIADA`, `REVISADA` o `POR_ACEPTAR`, sus franjas **no se reasignan** (409): hay que devolverla primero. En `DEVUELTA` y `NOVEDAD` el programador las cambia como quiera.
- Aprobar y aceptar verifican que la foto siga vigente (mismas franjas, mismo docente, `TOMADA`): nadie aprueba ni acepta algo distinto de lo enviado.
- Quién revisa y aprueba: los mismos permisos y alcance territorial del PTA que ya usaba la concertación (`pta.review.academica.<nivel>`, `pta.approve.academica.<nivel>` y sus territoriales).
- Quién envía: el programador con asignación del nivel (`programacion-academica.asignacion-docente.<nivel>`).
- Al PTA: la decisión lleva la firma del aprobador y la del docente. El PTA la registra si quien llama puede aprobar **o** si quien llama es el propio docente y el aprobador que firmó tiene el permiso de aprobar en el PTA.

### 23.2 · Contrato de «Mi programación» para Codex (portal del docente)

- `GET /programacion-academica/api/v1/concertacion/mia?periodo=<id>` → `[{ idConcertacion, nivel, estado, horas, franjas: [{ idFranja, idGrupo, codigoAsignatura, asignatura, horas }], comentario, novedad: { tipo, justificacion, creadaEn } | null, firmas: [{ rol, firmadoEn, modoOtp }], actualizadaEn }]`. El docente ve sus concertaciones desde `POR_ACEPTAR` (antes son internas: no aparecen).
- `POST /programacion-academica/api/v1/concertacion/:id/aceptar` `{ codigo }` (OTP de 6 dígitos; simulado mientras `PROG_MOCK_FIRMA_OTP` no sea `false`) → la concertación queda `ACEPTADA`.
- `POST /programacion-academica/api/v1/concertacion/:id/novedad` `{ tipo, justificacion }` → `NOVEDAD`. `tipo` ∈ `investigacion`, `movilidad`, `perfil`, `otra`; `justificacion` obligatoria (mínimo 10 caracteres).
- Solo el docente dueño puede aceptar o reportar, y solo en `POR_ACEPTAR`.
- Lo que el portal ya muestra (calendario, grupos asignados) no cambia.

### 23.3 · Contrato del programador y de la revisión interna

- `POST /programacion-academica/api/v1/concertacion/enviar` `{ idPeriodo, documento }` → crea o reenvía las concertaciones del docente (una por nivel con docencia `TOMADA` en el periodo y en los niveles que el usuario asigna). Mismas validaciones de antes: corte del periodo, ciclo del grupo, territorial por la oferta CETAP.
- `GET /programacion-academica/api/v1/concertacion/programador?periodo=<id>` → concertaciones de los niveles que el usuario asigna, con estado, comentario de devolución y novedad.
- Revisor y aprobador, sin cambios de ruta: `GET concertacion/bandeja`, `POST concertacion/:id/revisar` `{ tipo, codigo }`, `POST concertacion/:id/aprobar` `{ codigo }` (ahora deja `POR_ACEPTAR`), `POST concertacion/:id/devolver` `{ comentario }` (ahora vuelve al programador; las franjas siguen `TOMADA` con su docente).

## 24. EFDS-2347: festivos, recesos y horas de las sesiones reales (24 de octubre)

Decisiones 12 y 13: las horas de un festivo **se descuentan** (no llegan al acumulado ni al PTA); los recesos son los mismos para todos, por periodo; los fines de semana cuentan.

### 24.1 · El cálculo único, ahora por sesiones

- Regla en SQL: `"academic-schedule".sesiones_de_franja(id_franja)` (migración 062) → `sesiones_ciclo, festivos, recesos, sesiones, horas_sesion, horas, anios_sin_festivos`. El ciclo es el del grupo o, si no tiene, el de su periodo.
- Horas del docente en un grupo = **Σ horas reales de sus franjas × factor de vinculación** del contrato. Es lo que va al acumulado, al tope, a los candidatos, a la concertación y, al aceptar, al PTA.
- Las horas del plan (catálogo × factor) quedan como **referencia** (`horasPlan`). Se usan en lugar de las sesiones solo si el grupo no tiene ciclo o la asignatura tiene horas fijas en el catálogo; en ese caso se reparten con la regla por días y se avisa.
- Festivos cargados: 2026 y 2027 (18 por año). Si el ciclo cae en un año sin festivos, el cálculo lo **avisa**: «No hay festivos cargados para 2031: las horas pueden estar sobreestimadas.»

### 24.2 · Lo que cambia en las respuestas (aditivo)

- Árbol (`GET /programacion/arbol`), cada `grupos[].docentes[]` trae además: `horasPlan`, `base` (`'sesiones' | 'plan'`), `descontadas: { festivos, recesos }` (sesiones de ese docente que no cuentan) y `avisos: string[]`. `horas` y `fraccion` salen ahora de las sesiones.
- Calendario y buscador: `horas` con el mismo cálculo.
- `grupos[].horas` (programadas vs requeridas del catálogo) **no cambia**: es la validación de planeación contra el catálogo (Circular 003), no las horas del docente.

### 24.3 · Festivos y recesos

- `GET /programacion-academica/api/v1/periodos/festivos?anio=2026` → `{ anio, cargados, festivos: [{ fecha, nombre }] }`.
- `GET /programacion-academica/api/v1/periodos/:idPeriodo/recesos` → `[{ idReceso, fechaInicio, fechaFin, motivo, creadoPor }]`.
- `POST /programacion-academica/api/v1/periodos/:idPeriodo/recesos` `{ fechaInicio, fechaFin, motivo }` — solo la administración del módulo (`programacion-academica.all`); dentro de las fechas del periodo; periodo cerrado → rechazado por el guard.
- `DELETE /programacion-academica/api/v1/periodos/:idPeriodo/recesos/:idReceso` — igual.
- `:idPeriodo` acepta el id de plataforma o el UUID legado.

## 25. EFDS-2346: periodo personalizado y periodo extraordinario (24 de octubre)

Decisiones 8 a 11: el interperiodo tiene su propio tope y su PTA va aparte; un extraordinario a la vez; lo activa la administración del módulo con permiso propio.

### 25.1 · Modelo (PTA, migración 672)

- `periodo_academico.tipo`: `semestral` (código `AAAA-1` / `AAAA-2`) o `personalizado` (código propio `AAAA-XXXXX`, p. ej. `2027-INT`, con `nombre`, sin `semestre`). Un personalizado es un periodo más: mismas reglas (fechas sin cruce, estados, activación).
- `extraordinario` + `motivo_extraordinario`, `extraordinario_por`, `extraordinario_en`.
- **El periodo activo es el PRINCIPAL**: `estado = 'en_curso' AND NOT extraordinario`.
- La base garantiza un solo principal en curso y un solo extraordinario en curso (índices únicos parciales). Antes solo lo cuidaba el controlador.
- Permiso nuevo `pta.periodos.activar_extraordinario` (módulo PTA), asignado a SUPER_ADMIN; el administrador lo da a otros roles si quiere.

### 25.2 · API del PTA

- `POST /pta/periodos-academicos` con `{ tipo: 'personalizado', anio, codigo, nombre, fechaInicio, fechaFin }` crea un personalizado (en planeación). Sin `tipo`, igual que antes.
- `POST /pta/periodos-academicos/:id/activar-extraordinario` `{ motivo }` (mínimo 10 caracteres) → en curso como extraordinario. 403 sin el permiso; 409 si ya hay un extraordinario en curso, si el periodo ya está en curso o si está cerrado. **No** cierra el principal, **no** mueve otros periodos y **no** termina PTA.
- `PATCH /pta/periodos-academicos/:id` `{ estado: 'en_curso' }` activa como **principal** (como siempre): cierra los anteriores, pasa los posteriores a planeación y termina los PTA de otros periodos, **excepto** el extraordinario en curso y sus PTA. Un extraordinario en curso no se convierte en principal (409: ciérrelo primero). `{ estado: 'cerrado' }` sobre el extraordinario lo cierra sin exigir otro activo.
- `GET /pta/periodos-academicos` trae `tipo`, `nombre`, `extraordinario`, `motivoExtraordinario`… y, si hay extraordinario en curso, devuelve el principal **antes** que él: quien busca «el activo» con el primer en curso recibe el principal.
- Programación Académica `GET /periodos`: cada periodo trae `tipo`, `nombre`, `semestre` (null en personalizados), `esActivo` (principal), `esExtraordinario` y `motivoExtraordinario`.

### 25.3 · Consumidores corregidos

- PTA: activación y vista previa (`periodo-activacion.ts`: el personalizado se ordena por fecha; el extraordinario en curso no se toca), terminación de PTA (`CONDICION_PTA_A_FINALIZAR`), detalle del periodo (programas sin periodo solo en el principal), periodo de carga por defecto del RUND, importador de asignaturas (**ya no crea periodos en curso**: los crea en planeación y no modifica uno existente).
- Programación Académica: periodo por defecto del portal y de las vistas; lista de periodos.
- Frontend que elige «el activo» (`.find(en_curso)` → principal): `mfe-pta` (`ptaApi.getActivePeriodoAcademico`, `BancoDocentesView` ×2, `BancoDocentesPTA`, `PtaBackofficeModule` ×2, `PTAForm`), `mfe-programas-academicos` (`GestionPeriodos`, `ImportarAsignaturas`, `ProgramasAcademicosModule` ×2). Los que muestran insignias o listas de en curso siguen mostrando los dos (el docente puede tener PTA del interperiodo).

### 25.4 · Sin tocar (fuera del alcance de esta tarea): para sus dueños

- **auth-service** `programas.service.ts:484-494`: «periodo activo» con `ORDER BY anio DESC, semestre DESC LIMIT 1`. Con un personalizado extraordinario en curso (semestre NULL, que en DESC va primero) un programa nuevo quedaría en el extraordinario. Debe filtrar `AND NOT extraordinario`. También `:88` (`estado = 'en_curso'`), que debería ser el principal.
- **shell** `EstructuraOrganizacionalModule.tsx:48`: compara con `'ACTIVO'`, que nunca coincide con `en_curso` (ya estaba roto); y `ConfiguracionPeriodo.tsx`.
- **mfe-estructura-org** (`EstructuraOrganizacionalModule.tsx`, `estructuraService.ts`): consume los periodos; revisar que use el principal.
- `mfe-reportes` `PlantaDocenteReportView.tsx:243`: solo etiqueta «(en curso)», correcto con los dos.

### 25.5 · Defectos de producción del PTA (reportados aparte, no corregidos)

- `pta.service.ts` `savePTA` (línea 4340): un PTA sin periodo se guarda en **`'2026-1'`** fijo, no en el periodo activo.
- `pta.service.ts` `getDashboardKPIs` (línea 11768): sin periodo, el tablero muestra **`'2025-2'`** fijo.
- Del mismo tipo: `seedPTAs` (`'2026-1'`, solo desarrollo), `cascada.controller.ts:44`, `asignaturas-import.controller.ts:41,57,64` y `asignaturas-import.service.ts:52,564` (`'2025-2'` por defecto), Programación Académica `validacion.controller.ts:45` (`'2026-1'`, `'2026-V1'`).
- **No corregido (EFDS-2328, decide Nicolás):** la regla que termina los PTA al activar compara `SolicitudPTA."ptaId"` (uuid en esta base) con el id del PTA (texto) y **falla**: hoy activar no termina ningún PTA. Se corrigió y se revirtió en un commit propio para aplicarlo de una vez cuando haya decisión (`s."ptaId"::text = p.id::text`). La prueba del extraordinario no depende de eso: iguala el tipo dentro de su transacción.

## 26. Verificación en navegador de la Ronda 3b, con servidores reales (24 de octubre)

Stack local con la concertación encendida en PA y PTA (`PROG_CONCERTACION_HABILITADA=true`, corte `2027-2`), micro-frontends integrados (`feature/pa/ronda3`, con lo de Codex) servidos desde `superapp-frontend`. Datos propios marcados QA-R3B, deshechos al terminar.

### 26.1 · Lo que se recorrió y funcionó

1. **Programador** (`qa.asignador`): `GET /asignaciones/candidatos` por franja → docente del área con 18 h para el miércoles; un docente de otra área (Cuantitativa) se rechaza con `{regla:'AREA'}`; asignación por franja (lunes y miércoles al mismo docente → queda su asignación completa).
2. **Envío** del programador: 30 h = 12 h del lunes (9 lunes, 3 festivos: 1-may, 10-may, 31-may) + 18 h del miércoles (9 sesiones).
3. **Revisor y aprobador** (superadmin, por la pantalla «Concertación de la docencia», con el modal de firma): revisión → aprobación → `POR_ACEPTAR`; las franjas siguen `TOMADA` y nada llegó al PTA.
4. **Docente** (`qa.docente2`) en «Mi programación»: ve 30 h de 304, las firmas del revisor y del aprobador y el calendario (franjas de las 18:00). **Novedad** (tipo `movilidad`): se rechazan la justificación corta y el tipo inválido; la válida deja `NOVEDAD`.
5. **Vuelta al programador**: ve la novedad, reasigna el lunes a otro docente del área y reenvía → `ENVIADA`, 18 h. Revisión, aprobación y **aceptación** del docente (con código de 6 dígitos) → `ACEPTADA`.
6. **PTA**: al crear el PTA 2027-2 del docente llega la asignatura con `origen: programacion`, `editable: false`, **18 h** (las reales, no las 64 del plan), territorial de la oferta CETAP.
7. **Periodo extraordinario**: se creó `2027-INT` (personalizado), se rechazó activarlo con motivo corto y se activó con motivo: `2027-2` siguió en curso, el PTA del docente siguió en `Borrador`, y `GET /periodos` (PA) devuelve `esActivo` para el principal y `esExtraordinario` para el otro.
8. **Árbol y calendario de Codex con servidor real**: el árbol muestra el grupo QA con área, ciclo, docentes con horas del servidor y estados; el calendario del portal y el del backoffice muestran las franjas con aula, ciclo y reserva.

### 26.2 · Encontrado al recorrerlo (para Codex)

- **La integración quitó la pantalla de asignar.** `AsignacionDocente.tsx` sigue en el repo pero ya no se monta: «Disponibilidad Docente» muestra solo la consulta. No hay modal para asignar ni para los candidatos (§22). El programador solo puede asignar por API.
- **La prueba `rutas-cliente.spec.ts §2.1` falla en `ronda3`**: vigila el filtro de jornada de Programación General, que Codex reemplazó por el árbol. O se devuelve el filtro (el árbol no lo tiene) o se retira la prueba: decisión de Codex y de Tomás.
- **«Mi programación» y la bandeja siguen en el orden anterior.** La etiqueta del docente dice «Enviada por el docente (pendiente)» con la concertación en `POR_ACEPTAR`; no hay botones de aceptar ni de novedad (§23.2); la bandeja del revisor dice «Devolver al docente» (ahora vuelve al programador). **Textos de la bandeja y de las etapas corregidos en §28.2.** `ConcertacionDocente.tsx` / `enviarConcertacion()` llaman a `POST /concertacion/:idPeriodo/enviar`, que ahora responde 409 a propósito.
- **Gestión de Periodos** (`mfe-programas-academicos`) muestra `2027-INT` como «ACTIVO», «Semestre —», sin distinguirlo del principal; su «Crear periodo» solo crea semestrales y no tiene «Activar como extraordinario» (§25.2).

### 26.3 · Defecto previo (PTA) — corregido en §27.6

`POST /periodos-academicos` guarda las fechas **un día antes** en un servidor con zona UTC−5 (`new Date('2027-06-21')` es medianoche UTC y TypeORM lo escribe en hora local). Pasa igual con un semestral; no lo introdujo la Ronda 3b.

### 26.4 · Corregido durante la verificación

La decisión que va al PTA llevaba las firmas de **todos** los ciclos (5 en vez de 3 tras una novedad), incluidas las del ciclo anterior, que firmaron una foto que ya no es la vigente. Ahora solo viajan las de la huella vigente; las anteriores siguen en el registro. Con prueba (cae si se quita el filtro).

## 27. Decisiones de Tomás y verificación por pantalla (25 de octubre)

### 27.1 · Decisiones recibidas
- **Terminación de PTA al activar (EFDS-2328):** queda revertida, como en §25.5.
- **Posgrado:** la regla estricta no cambia. Tomás consigue la programación de posgrado y se usará la opción 1: un archivo docente × programa con el formato del puente (origen `puente`).
- **Sin situación en el RUND:** asignable **con aviso** (§27.3).

### 27.2 · Lo de Codex integrado
Merge de `feature/pa/ronda3-codex` (modal de asignación, «Mi programación» con aceptar y novedad, filtro de jornada, catálogo importable). PA 271/271 (`rutas-cliente.spec.ts` vuelve a pasar), PTA 1145 + 1 omitida (la manual de siempre), front 38/38, datos/catálogo de Codex 7/7.

### 27.3 · Sin situación administrativa: asignable con aviso
`PROG_SIN_DATO_ASIGNABLE` ahora está **encendido por defecto** (`sinDatoAsignable()` en `situacion-docente.ts`, leído en cada llamada; `=false` vuelve a bloquear). Contrato nuevo, para que Codex lo muestre:
- `GET /asignaciones/candidatos` → cada candidato trae `avisos: string[]` (`["Sin situación administrativa registrada en el RUND"]` o `[]`).
- `POST /asignaciones` → la respuesta trae `avisos` cuando asigna a alguien con aviso.
- `GET /asignaciones/docente/:documento` → `situacion.aviso`.
El modal (`AsignacionAreaModal.tsx`) muestra el aviso en la tarjeta del candidato y, al elegirlo, antes de confirmar. Las demás reglas (área, escalafón, cruces, tope) siguen aplicando. El texto vive en `AVISO_SIN_SITUACION`.

### 27.4 · El clasificador normaliza guiones bajos
`servicio_activo` es `servicio activo`: `normalizar()` ahora colapsa `_` y espacios, además de tildes y mayúsculas, en PA (`situacion-docente.ts`) y en el contrato del PTA (`situacion-administrativa.clasificador.ts`). Pruebas en ambos. `qa.docente` (`servicio_activo`) quedó asignable sin tocar el dato.

### 27.5 · Catálogo importable de Codex, contra la base real
Respaldo previo: `pg_dump -n academic_work_plan` (793 KB) y foto de las 427 asignaturas con su área calculada. Validación previa real (`upload?dry_run=true`, periodo de prueba `2048-1`): 0 errores, 0 advertencias; 0 asignaturas creadas, 65 actualizadas, 362 sin cambios; 2 núcleos nuevos (`NT-034 Finanzas Públicas`, `NT-035 Opción de grado`); 325 ofertas.

**Defecto del archivo de Codex (corregido en una copia, no en el original):** el xlsx perdía la tilde en 8 nombres (`Público→Publico`, p. ej. ASIG-00170, 00183, 00196, 00203, 00269, 00281) y vaciaba `horas_clase` en 3 asignaturas (ASIG-00139, 00218, 00427; la base tiene 0). El importador hace upsert de toda fila, así que los habría sobrescrito. La carga se hizo con una copia con esas 15 celdas restauradas desde la base. **El generador (`generar-catalogo.mjs`) debe conservar `nombre` y `horas_clase` de la exportación base.**

Resultado verificado fila por fila (antes/después):
- 427 asignaturas, mismos códigos; ninguna nueva.
- Solo cambia `id_nucleo_tematico` en **65** (0 de posgrado); ninguna otra columna cambia en ninguna fila.
- Posgrado: 160 filas idénticas en todas las columnas.
- Las 65 cambian de **área efectiva** (código AF distinto en las 65). De las 44 «Nuevo Plan de Estudios AP/APT» que no tenían área real, las **44** la tienen ahora. Pregrado sin área real en toda la base: 52 → **8** (las de `REVISION_CATALOGO`: Constitución del Territorio AP_día, tres de AP_noche y cuatro de APT: Matemática I/II, Estadística I, Metodología). Esas necesitan decisión del negocio.
- Se creó el periodo de prueba `2048-1` con 325 ofertas y luego se borró; las asignaturas cargadas se conservan.

### 27.6 · Las fechas del periodo ya no se corren un día
`src/pta/fecha-periodo.ts`: las fechas del periodo son fechas civiles (`YYYY-MM-DD`); `fechaCivil()` valida el calendario real y nunca crea una `Date`. `create`, `update` y el cruce de fechas comparan cadenas; la entidad declara `fechaInicio/fechaFin: string`. `periodo-fechas.agregado.spec.ts` fija `TZ=America/Bogota` (y comprueba que sea efectiva): contra el código anterior **fallan 3** (crear, editar, cruce), con el arreglo pasan. Los periodos ya guardados con el día corrido no se tocan: hay que revisarlos.

### 27.7 · La regla del puente, como configuración
`PROG_NUCLEO_PUENTE`: `solo_sin_rund` (**por defecto**, equivale a la regla actual y al antiguo `true`; 86,5 % sobre 2026-1), `suma` (el puente suma al núcleo del RUND; 99,25 %) y `apagado`/`false`. Se lee en cada consulta (`modoDelPuente()`). Prueba real: con `suma` el docente con RUND en otra área y puente en esta pasa a candidato y asignable; con el defecto, no.

### 27.8 · Recorrido por las pantallas de Codex, con servidor real y concertación encendida
Asignación, aceptación y novedad **por pantalla** (qa.asignador, superadmin, qa.docente2): el modal lista los candidatos del área, muestra el aviso «Sin situación administrativa registrada en el RUND» y asigna por franja (30 h, estado `TOMADA`); revisión y aprobación por «Concertación de la docencia»; el docente ve las firmas, **reporta novedad** (se rechaza la justificación corta; vuelve al programador) y, tras el reenvío, **acepta y firma** → `Aceptada · docencia enviada al PTA`; al crear el PTA llega la asignatura con 30 h y `origen: programacion`.

Encontrado:
- **Falta la pantalla del programador para enviar a revisión** (`POST concertacion/enviar`): se hizo por API. Y la bandeja decía «Orden del flujo: el docente envía → …», «Enviada por el docente» y «Devolver al docente» (corregido en §28.2; el contrato del envío está en §28.3).
- Mi programación llama «Pendiente de concertación» a un grupo ya `POR_ACEPTAR`.
- El modal de firma, al aprobar, vuelve a mostrar la verificación tras «Firmar y aceptar» aunque la firma ya quedó registrada (hay que cerrar con Esc). **Corregido en §28.2.**
- **Corregido:** si el programador reenvía **sin cambiar nada** tras una novedad, la huella es la misma y al PTA viajaban 5 firmas (revisor y aprobador dos veces). Ahora viaja la última firma de cada rol (`DISTINCT ON (rol)`), el registro conserva las cinco; prueba con mutación.
- Local: reiniciar `auth-service` limpia el límite de intentos de login (429).

## 28. Periodo extraordinario, dos arreglos de concertación y pendientes de Tomás (25 de octubre, segunda tanda)

### 28.1 · Pantalla de periodos de Codex (`a4d112737`), integrada y verificada con servidor real

Integrada con `--no-ff` desde `origin/feature/pa/ronda3-codex`. Es la pantalla de **Programas Académicos → Periodos** (`mfe-programas-academicos`), no la de Programación Académica. Se reconstruyó el MFE con `VITE_API_URL=/services` y se copió al contenedor `superapp-frontend`.

Con PTA real y la base `esap_db` (periodos de prueba 2049-1 y 2049-INT, ya borrados):

| Por API | Resultado |
|---|---|
| Motivo `corto` | 400 «Explique el motivo… (mínimo 10 caracteres)» |
| Activar 2049-INT con motivo válido | 201; queda `en_curso`, `extraordinario: true`, con motivo, usuario y fecha |
| Activar 2049-1 con el extraordinario en curso | 409 «Ya hay un periodo extraordinario en curso (2049-INT): ciérrelo antes de activar otro.» |
| Activar otra vez el mismo | 409 «ya está en curso como extraordinario» |
| **El principal** | **2027-2 sigue `en_curso`, `extraordinario: false`** (se comprobó al terminar) |

Por pantalla (superadmin): la lista muestra «Principal en curso» (2027-2) y, tras activar, «Extraordinario en curso»; el periodo personalizado se muestra con su nombre y año, sin «Semestre —»; el modal dice «No cierra el periodo principal 2027-2. No mueve otros periodos ni termina sus PTA.»; con motivo corto el botón de confirmar está deshabilitado; Esc cierra y devuelve el foco; con motivo de 10 o más caracteres confirma, el modal se cierra y la lista se refresca; con un extraordinario en curso el botón «Activar como extraordinario» de los demás periodos queda deshabilitado. Las fechas de los periodos nuevos se ven sin día corrido (1/2/2049). Capturas en `C:\Users\Tomas\Claude\periodos-antes.png`, `periodos-modal-real.png` y `periodos-despues.png`.

No probé con servidor real a un usuario **sin** el permiso `pta.periodos.activar_extraordinario` (solo con superadmin): ese caso lo cubren la prueba de navegador de Codex y la validación del controlador (403).

### 28.2 · Dos arreglos en la concertación (MFE de Programación Académica)

1. **El modal de firma reaparecía en la verificación.** Causa: al registrarse la firma, la bandeja se recargaba, ponía `cargando` y mostraba «Cargando concertaciones…» en lugar de la lista; eso **desmontaba el modal**, que al volver a montarse empezaba otra vez en «Verificación». Ahora la lista solo se reemplaza por «Cargando…» cuando cambia el periodo; al refrescar tras una firma, la lista y el modal siguen montados. Además, `FirmaOtpModal` **se cierra solo 1,8 s después de «Firma registrada»** (alcanza a leerse); también cierra el docente al aceptar.
   - Prueba nueva (`ConcertacionBandeja.test.tsx`): recarga lenta tras firmar; el modal no vuelve a mostrar los dígitos y se cierra solo. Falló con el arreglo a medias (el modal se desmontaba) y pasa con el definitivo.
   - Servidor real: tras «Firmar revisión» se ve «Firma registrada», nunca reaparecen las casillas del código y el modal se cierra a los ~1,0 s.
2. **Textos del orden nuevo.** La bandeja dice «Orden del flujo: el programador envía → el área académica revisa y firma → la jefatura aprueba y firma → el docente acepta y firma. Cualquiera de los dos puede devolverla al programador con un comentario.» El botón es «Devolver al programador». Las etapas son cuatro: Enviada por el programador → Revisión académica → Aprobación → Aceptación del docente (`POR_ACEPTAR` = 3 hechas, `ACEPTADA` = 4). `DEVUELTA` dice «Devuelta al programador: debe corregir y reenviar»; `NOVEDAD`, «Novedad reportada por el docente: el programador debe revisarla y reenviar». Prueba nueva con el orden de las cuatro etapas.

Pruebas: MFE de Programación Académica 40/40; Programas Académicos 28/28. Verificado en pantalla con una concertación real (ENVIADA → revisión firmada).

Para Codex: al abrir «Concertación de la docencia» el front llama a `GET /jefatura/pendientes`, que con la concertación encendida responde 409 «La docencia se aprueba en la concertación…» (es a propósito); aparece como error en la consola del navegador. Conviene no pedirlo cuando la concertación está encendida.

### 28.3 · Contrato del envío a revisión (para la pantalla del programador, de Codex)

**Quién envía:** el programador (no el docente). Exige un nivel «asignable» para el usuario (los que decide el rol: pregrado, posgrado o ambos); sin ninguno, 403 «No tiene permiso para asignar docentes en ningún nivel académico.»

`POST /programacion-academica/api/v1/concertacion/enviar`

```json
{ "idPeriodo": "603", "documento": "1020304055" }
```

- `idPeriodo`: id del periodo (el mismo `idPeriodo` que ya viaja en grupos y franjas). `documento`: cédula del docente.
- Crea una concertación por **nivel** con franjas `TOMADA` del docente en ese periodo, limitada a los niveles que el usuario asigna (RN-08: pregrado no envía posgrado). La concertación nace `ENVIADA`, **sin firma**: firman el revisor, el aprobador y, al final, el docente.
- **Reenvío:** también sirve para volver a enviar una concertación `DEVUELTA` o `NOVEDAD` (toma una foto nueva de las franjas, borra las revisiones y marca atendida la novedad). Con cualquier otro estado responde 409 «La docencia de pregrado de este periodo ya fue enviada (estado APROBADA).»
- **Respuesta 201:** la lista actual del programador en el periodo (la misma de `GET concertacion/programador?periodo=<id>`), así la pantalla se refresca sin otra llamada:

```json
{ "success": true, "data": [
  { "idConcertacion": "a81d3fb8-497c-447d-b0c7-e9d2fa77567a", "nivel": "pregrado", "estado": "ENVIADA", "horas": 30,
    "documento": "1020304055", "docente": "Lucía Docente Ronda3b QA", "numFranjas": 2,
    "comentario": null, "novedad": null, "actualizadaEn": "2026-10-25T19:41:39.400Z" } ] }
```

  `comentario` trae el motivo de la devolución; `novedad` es `{ tipo, justificacion, creadaEn }` si el docente la reportó y no se ha atendido. La lista viene con `DEVUELTA` y `NOVEDAD` primero.
- **Errores que la pantalla debe mostrar tal cual (traen el motivo):**
  - 409 «La concertación de la docencia está apagada: el PTA todavía aprueba la Docencia.» (interruptor apagado en PA o en PTA).
  - 404 «No existe un docente con documento … en el RUND.»
  - 409 «La concertación aplica desde el periodo …» (periodo anterior al corte `PROG_CONCERTACION_DESDE_PERIODO`).
  - 409 «Defina el ciclo (fechas) del grupo antes de enviar: …» (grupo sin fechas).
  - 409 «No se puede concertar sin saber dónde se dicta cada grupo… (sin oferta CETAP / su CETAP no tiene territorial / aula de otro CETAP)».
  - 409 «El docente tiene N franja(s) devuelta(s) del flujo anterior en este periodo: reasígnelas antes de enviar.»
  - 400 «El docente no tiene docencia asignada en este periodo en los niveles que usted asigna.»
  - 409 «La docencia de … ya fue enviada (estado …).»
- **Qué invalidar al enviar con éxito:** `invalidarProgramacion('concertacion')` (la bandeja del revisor y «Mi programación» se recargan).
- **Qué docentes mostrar para enviar:** no hay un endpoint de «pendientes de enviar». Se deducen de los grupos del periodo con franjas `TOMADA` (el árbol que ya consume la pantalla de asignación) y se cruzan por `documento` con `GET concertacion/programador`: sin fila = nunca enviada; `DEVUELTA`/`NOVEDAD` = reenviar; cualquier otro estado = ya en curso (deshabilitar «Enviar»). Si prefieren un endpoint que lo traiga resuelto, se puede añadir sin cambiar el contrato actual.
- Estados y quién actúa en cada uno: §23.1. «Mi programación» y la bandeja del revisor no cambian de ruta.

### 28.4 · Las 8 asignaturas de pregrado sin área (para decidir Tomás; no se aplicó nada)

Siguen con el núcleo comodín «Nuevo Plan de Estudios AP/APT» y, por eso, `area_de_asignatura()` devuelve vacío: en la asignación por área nadie del área las ve. Nombres exactos tal como están en la base:

| Código | Nombre exacto | Programa | Modalidad | Semestre | Cr. | Núcleo actual |
|---|---|---|---|---|---|---|
| ASIG-00001 | Constitución Del Territorio (AP_día) | Administración Pública - Diurno | presencial_dia | 1 | 3 | Nuevo Plan de Estudios AP |
| ASIG-00064 | Historia del pensamiento político (AP_noche) Nuevo Plan de Estudios | Administración Pública - Nocturno | presencial_noche | 3 | 3 | Nuevo Plan de Estudios AP |
| ASIG-00065 | Electiva I (AP_noche) Nuevo Plan de Estudios | Administración Pública - Nocturno | presencial_noche | 3 | 3 | Nuevo Plan de Estudios AP |
| ASIG-00067 | Matemáticas II (AP_noche) Nuevo Plan de Estudios | Administración Pública - Nocturno | presencial_noche | 3 | 3 | Nuevo Plan de Estudios AP |
| ASIG-00151 | Matemática I | Administración Pública Territorial | sin_definir | 1 | 3 | Nuevo Plan de Estudios APT |
| ASIG-00153 | Matemáticas II | Administración Pública Territorial | sin_definir | 2 | 3 | Nuevo Plan de Estudios APT |
| ASIG-00180 | Estadística I | Administración Pública Territorial | sin_definir | 3 | 3 | Nuevo Plan de Estudios APT |
| ASIG-00181 | Metodología de investigación | Administración Pública Territorial | sin_definir | 3 | 2 | Nuevo Plan de Estudios APT |

Las **tres de AP noche** son ASIG-00064, ASIG-00065 y ASIG-00067. Las cuatro de APT son 00151, 00153, 00180 y 00181, y la restante es la de AP día, 00001.

Qué hay en el catálogo para cada una (evidencia, **no** una decisión; el área de cada «parecida» sale de `area_de_asignatura`):

| Asignatura | Parecidas ya con área | Lectura |
|---|---|---|
| ASIG-00064 Historia del pensamiento político (noche) | ASIG-00032 y ASIG-00009 (AP día/noche, «Estado Y Poder» → **Estado y Poder**); ASIG-00008 (AP día, «Estado, Gobierno y Sociedad» → **Estado, Gobierno y Sociedad**) | Dos áreas distintas para el mismo nombre: hay que elegir |
| ASIG-00065 Electiva I (noche) | ASIG-00030 Electiva I (AP día) → **Electivas**; ASIG-00163 Electiva I (APT) → **Formación General** | Dos áreas: AP usa Electivas, APT usa Formación General |
| ASIG-00067 Matemáticas II (noche) | ASIG-00040 (AP noche) y ASIG-00039 (AP día) → **Cuantitativa**; ASIG-00062 (AP día) → **Complementario** | Mayoría Cuantitativa; hay una excepción |
| ASIG-00151 Matemática I (APT) | ASIG-00162 Matemática I (APT) → **Formación General**; ASIG-00012 (AP noche) → **Cuantitativa** | Dos áreas: la hermana del mismo programa dice Formación General |
| ASIG-00153 Matemáticas II (APT) | las mismas de Matemáticas II: **Cuantitativa** (00039, 00040) y **Complementario** (00062) | Igual que 00067 |
| ASIG-00180 Estadística I (APT) | ASIG-00050 y ASIG-00051 (AP día/noche) → **Cuantitativa** | Una sola área |
| ASIG-00001 Constitución Del Territorio (AP día) | ninguna con ese nombre. **Ojo:** ASIG-00002 se llama «Construcción Del Territorio (AP_noche)» (Desarrollo y Gestión Territorial) | Posible error de digitación en el nombre: «Constitución» frente a «Construcción»; confirmarlo antes de asignar área |
| ASIG-00181 Metodología de investigación (APT) | ninguna con nombre parecido en pregrado | Sin referencia |

Áreas disponibles (`area_formacion`): AF-01 Estado y Poder · AF-02 Organizaciones Públicas · AF-03 Economía Pública · AF-04 Finanzas Públicas · AF-05 Desarrollo y Gestión Territorial · AF-06 Gestión del Desarrollo · AF-07 Cuantitativa · AF-08 Problemática Pública · AF-09 Espacio, Tiempo y Territorio · AF-10 Estado, Gobierno y Sociedad · AF-11 Idiomas · AF-12 Electivas · AF-13 Complementario · AF-14 Formación Específica · AF-15 Teoría Económica e Historia · AF-16 Formación integral y de contexto · AF-17 Opción de grado · AF-18 Formación General (y las de posgrado, `AF-PRG-…`).

Cuando Tomás decida: se aplica cambiando el núcleo de esas 8 filas por un núcleo real (mismo mecanismo de §27.5: respaldo previo, comparación fila a fila y carga), sin tocar nada más. Hasta entonces el canario de `area-docente.agregado.spec.ts` las acepta como excepción explícita (núcleo comodín).

### 28.5 · Periodos guardados con el día corrido: consulta para identificarlos (solo lectura)

Archivo: `backend/academic-work-plan-service/scripts/diagnostico-periodos-dia-corrido.sql`. Es una transacción `READ ONLY`; **no corrige nada**.

Uso:

```bash
# Paso 0 — ¿el servidor del PTA corría al oeste de UTC? (en el contenedor o equipo del servicio)
node -p "new Date().getTimezoneOffset()"      # 300 = UTC-5 (sí se corrían); 0 = UTC (no se corrían)

# Paso 1 — la consulta; :corte = momento (hora de la base) en que se desplegó la corrección en ese ambiente
psql "$DATABASE_URL" -v corte="'2026-10-25 18:00'" -f diagnostico-periodos-dia-corrido.sql
```

Lo que hay que saber antes de leerla:
- **El desfase es siempre de 1 día hacia atrás**, y solo si el servidor corría al oeste de UTC. Si el PTA de dev corría en UTC, no hay periodos corridos y no hay nada que revisar (el paso 0 lo decide).
- **No se puede saber desde la base qué fecha escribió la persona**: no hay bitácora de periodos (`AuditLog` no los registra) ni otra copia de las fechas. Por eso la consulta no deduce la fecha correcta: lista los periodos escritos antes de la corrección (`COALESCE(updated_at, created_at) < :corte`) y, junto a lo guardado, muestra cómo quedarían si estuvieran corridos (`inicio_si_corrido`, `fin_si_corrido`, `dias_corridos_posibles = 1`) con el día de la semana de cada una. Quien conozca el calendario oficial confirma cuáles lo están.
- Pistas (no pruebas): `sospecha_inicio_domingo` y `sospecha_fin_fin_de_semana` marcan los periodos que arrancan en domingo o terminan en sábado/domingo; salen primero. También muestra cuántos grupos y recesos dependen de cada periodo, para priorizar.
- Los periodos sembrados por migración (por ejemplo `2025-2`, `2025-08-01` a `2025-12-15`) entran como candidatos por su `updated_at`, pero se sembraron como texto, no como `Date`: no se corrieron.
- Corte: `created_at`/`updated_at` son `timestamp` sin zona; cerca del momento del despliegue la comparación puede errar por unas horas (si hay un periodo escrito ese día, revisarlo aparte).

Resultado en la base local (PTA corriendo en UTC-5, `getTimezoneOffset()` = 300): 5 periodos candidatos, todos creados o editados el 18, 19 o 20 de octubre, antes de la corrección (2026-2, 2027-2, 2025-2, 2026-1, 2027-1). Son datos de prueba; 2026-2 y 2027-2 terminan en domingo y sábado y salen marcados como sospechosos. No se corrigió ninguno.

## 29. Decisiones de Tomás (25 de octubre, tercera tanda), base local en cero y pruebas sobre la rama integrada

### 29.1 · Lo de Codex integrado (`8d1dc7b80`)

Integrado con `--no-ff`. Se aplicó la conexión que Codex dejó en `INTEGRACION-codex.md`: `ProgramacionAcademicaModule.tsx` ahora pasa `nivelesAsignables`, `concertacionHabilitada` y `programable` a `DisponibilidadDocente`, y con eso aparece el envío a revisión junto al calendario del docente.

### 29.2 · Decisiones aplicadas

| Decisión | Dónde quedó |
|---|---|
| **Puente: suma** (núcleo del RUND más las áreas que dicta), como valor por defecto | `PROG_NUCLEO_PUENTE`: sin definir o `true` = `suma`. `solo_sin_rund` y `false` siguen existiendo como opciones. Cobertura medida sobre 2026-1: 99,25 %. Las pruebas del puente se reescribieron para el nuevo defecto. |
| **«Estado, Gobierno y Sociedad» se une a «Estado y Poder»** | Migración `db/migrations/673_estado_gobierno_sociedad_en_estado_y_poder.sql`: las 3 equivalencias que apuntaban al área vieja (`Estado, Gobierno y Sociedad`, `Gobierno y Políticas Públicas`, `Gobierno y Política Pública`) apuntan a «Estado y Poder»; los núcleos de los docentes se recalculan (39 filas pasaron al área nueva; 3 que ya la tenían por el mismo origen se fundieron); el área vieja queda **inactiva**, no borrada. Idempotente; aplicada en la base local. |
| **Áreas por asignatura, en el Excel y no en una migración** | Ver 29.4: Codex regenera el Excel; yo lo valido. |

Recalculo de los núcleos: aplicada la 673, `POST /pta/banco-docentes/nucleos/reinterpretar` (RUND) dio **0 núcleos creados y 0 retirados** y la misma cobertura (183 docentes con RUND, 284 personas con algún núcleo). Prueba nueva en `area-docente.agregado.spec.ts`: las tres equivalencias apuntan a «Estado y Poder», el área vieja no tiene equivalencias ni docentes y está inactiva, y las asignaturas del catálogo con ese núcleo caen en «Estado y Poder».

### 29.3 · Lo que Codex debe cambiar en el generador (para el Excel)

En `esap/programacion/equivalencias.mjs` y en `datos/nucleos/nucleo_equivalencia.csv` (archivos de Codex; yo no los toqué): `Estado, Gobierno y Sociedad` («Estado Gobierno y Sociedad», «Gobierno y Políticas Públicas») pasa a ser variante de **Estado y Poder**.

### 29.4 · Áreas decididas por Tomás para el Excel del catálogo

**Las 8 asignaturas que hoy no tienen área** (código = columna `codigo_asignatura`; el nombre no se cambia):

| Código | Nombre exacto | Área decidida | Núcleo (`nucleo_tematico`) que la da |
|---|---|---|---|
| ASIG-00151 | Matemática I (APT) | **Cuantitativa** | Cuantitativa (NT-020) |
| ASIG-00153 | Matemáticas II (APT) | **Cuantitativa** | Cuantitativa (NT-020) |
| ASIG-00180 | Estadística I (APT) | **Cuantitativa** | Cuantitativa (NT-020) |
| ASIG-00067 | Matemáticas II (AP_noche) Nuevo Plan de Estudios | **Cuantitativa** | Cuantitativa (NT-020) |
| ASIG-00181 | Metodología de investigación (APT) | **Complementario** | Complementaria (NT-015) |
| ASIG-00064 | Historia del pensamiento político (AP_noche) Nuevo Plan de Estudios | **Estado y Poder** | Estado Y Poder (NT-002) |
| ASIG-00065 | Electiva I (AP_noche) Nuevo Plan de Estudios | **Electivas** | Electivas Generales (NT-009) |
| ASIG-00001 | Constitución Del Territorio (AP_día) | **Desarrollo y Gestión Territorial** | Desarrollo Y Gestión Territorial (NT-007) |

El nombre de ASIG-00001 **no se cambia**: es probable que sea «Construcción» (como ASIG-00002), pero falta confirmarlo.

**Regla de Tomás: «Estadística y Matemáticas: Cuantitativa en todos los planes».** Además de las cuatro anteriores, estas asignaturas de pregrado tienen hoy otra área y pasarían a Cuantitativa si la regla se aplica a todo lo que se llama Matemática(s) I/II o Estadística I/II (el núcleo que la da es Cuantitativa NT-020, o Fundamentación Cuantitativa NT-004 en los planes de AP):

| Código | Nombre | Programa | Área hoy |
|---|---|---|---|
| ASIG-00172 | Estadistica I | APT | Formación General |
| ASIG-00184 | Estadística II | APT | Formación General |
| ASIG-00162 | Matemática I | APT | Formación General |
| ASIG-00167 | Matemática II | APT | Formación General |
| ASIG-00013 | Matemáticas I (AP_día) | AP diurno | Complementario |
| ASIG-00038 | Matemáticas I (AP_noche) | AP nocturno | Complementario |
| ASIG-00062 | Matemáticas II (AP_día) | AP diurno | Complementario |

Ya están en Cuantitativa y no cambian: ASIG-00012, 00037, 00039, 00040, 00050, 00051, 00070, 00071 (AP) y ASIG-00235, 00237 (Economía Pública).

**Quedan fuera hasta que Tomás confirme el alcance de la regla** (el nombre no es «Matemática/Estadística I o II»): ASIG-00190 *Matematica Financiera* (APT, Formación General) y ASIG-00014 y ASIG-00015 *Matemáticas Lúdicas* (AP, Complementario).

Posgrado no se toca. El generador debe seguir comprobando que solo cambian las columnas del núcleo/área (la prueba de conservación de Codex), ahora con estos 15 cambios esperados, ni uno más.

Excel vigente (aún sin estas decisiones; es el válido hoy): `C:\Users\Tomas\Documents\ESAP\temporal\Plataformacomunidadesap\esap\programacion\resultados\2026-1\catalogo-importable-2026-1.xlsx`. Validación previa de este archivo (`POST /pta/asignaturas-import/upload?dry_run=true&periodo_codigo=2048-1`, base sin periodos, sin escribir nada): 0 errores, 0 advertencias; programas 14 sin cambios; núcleos 35 sin cambios; **asignaturas 427, 0 creadas, 0 actualizadas, 427 sin cambios**; 290 CETAP sin cambios; 325 ofertas por crear, 0 rechazadas. Cuando Codex entregue el Excel con las áreas decididas se valida igual (sobre un periodo temporal que se borra) y se pasa la ruta final.

### 29.5 · Base local en cero de periodos

Respaldo previo (formato custom de `pg_dump`, base `esap_db` completa, tomado justo antes de borrar): `C:\Users\Tomas\AppData\Local\Temp\claude\c--Users-Tomas-Documents-ESAP-temporal-Plataformacomunidadesap\9a1ce787-a0ac-458e-adea-130c114e82c4\scratchpad\r3c\respaldo-antes-borrar-periodos.dump` (otro, anterior a la migración 673, en el mismo directorio: `respaldo-antes-r3c.dump`). Solo la base local: dev no se tocó.

Lo que se borró (conteos exactos, con la lista previa y la posterior en `listado-previo2.txt` y `listado-posterior.txt` del mismo directorio):

| Tabla | Filas |
|---|---|
| `periodo_academico` | 6 (2025-2, 2026-1, 2026-2, 2027-1, 2027-2 y el 2049-1 de prueba) |
| `grupo` | 10 |
| `franja_horaria` | 27 (en cascada con los grupos) |
| `oferta_cetap_programa` | 1.300 |
| `concertacion_docencia` | 3 (con 11 firmas, 13 del historial y 3 revisiones, en cascada) |
| `docencia_concertada` (PTA) | 3 |
| `PlanTrabajoAcademico` | 1 (con 14 aprobaciones por componente y 1 evento, en cascada) |
| `HistorialEstadoPTA` | 3 |
| asignaciones, recesos, `programacion_periodo`, `periodo_programacion`, equivalencias de periodo, histórico, `periodo_cetap`, detalles del PTA, aprobaciones de jefatura, concertación del PTA, solicitudes, evidencias y extensiones del PTA | 0 (vacías) |

Se conservan, con los mismos conteos de antes: 427 asignaturas, 14 programas, 35 núcleos temáticos, 365 docentes del RUND, 29 aulas, 341 usuarios y 441 personas. Los núcleos de los docentes (`docente_nucleo`) pasaron de 393 a 390 filas solo por la fusión de la migración 673. Verificación posterior: todas las tablas de periodo en 0.

⚠️ **Dato que Tomás debe conocer antes de probar desde cero:** `GET /pta/api/v1/periodos-academicos` (la lista de periodos) **crea por sí sola** un periodo `2025-2` «en curso» (1-ago-2025 a 15-dic-2025) si no encuentra ninguno (`periodo-academico.controller.ts`, método `list`). Es un comportamiento anterior a esta ronda. En cuanto una pantalla abra la lista, la base deja de estar en cero. Se puede quitar ese autogenerado; no lo toqué sin decisión.

### 29.6 · Permiso de activación extraordinaria, probado con un usuario sin él

Prueba con servidor real, con usuarios que pasan el `@Roles` del endpoint pero no tienen `pta.periodos.activar_extraordinario`:

- **API:** `qa.admin` (ADMIN_PROGRAMACION) y un usuario QA con GESTION_PROFESORAL responden **403** «Activar un periodo extraordinario requiere el permiso «Periodos — Activar periodo extraordinario».»; el periodo de prueba siguió en `planeacion` y el principal sin cambios.
- **Pantalla:** un usuario QA con un rol de los mismos permisos que el superadmin **menos** ese (511 permisos) abre Programas Académicos → Periodos y ve la lista y los botones «Activar» (5), pero **0** botones «Activar como extraordinario». Con superadmin el botón aparece (28.1). Captura: `C:\Users\Tomas\Claude\periodos-sin-permiso.png`. Fixtures QA deshechos (usuario, persona y rol).
- Aparte: `qa.admin` no ve el módulo Programas Académicos en el menú; la pantalla de periodos no le es alcanzable.

### 29.7 · Pruebas sobre la rama integrada (backend y front), con la base en cero

| Suite | Resultado |
|---|---|
| Programación Académica (backend, jest) | **272/272** (271 + la nueva de la 673) |
| PTA (backend, jest) | **1145 pasan, 1 omitida** (la manual de siempre) |
| MFE de Programación Académica (vitest) | **51/51** |
| MFE de Programas Académicos (vitest) | **28/28** |
| Datos y catálogo de Codex (`node --test`) | **11/11** |

Dos ajustes de pruebas por las decisiones y por la base en cero: la prueba «solo aparecen docentes del área» esperaba el puente en `solo_sin_rund` (ahora E, con núcleo RUND en otra área y puente en esta, también es candidata); y el canario `cruces-vivos` exigía al menos un periodo real, y con la base en cero avisa y sigue exigiendo que el total de cruces sea cero. En una primera corrida del front, con el PTA corriendo en paralelo, 3 pruebas fallaron por tiempo (`findByText` de 1 s); solas, pasan 51/51.

## 30. Conciliación de áreas, Excel final, consulta sin escritura y envío a revisión verificado (25 de octubre, cuarta tanda)

### 30.1 · Lo de Codex integrado (`979c8e2a4`) y los dos parches de consola
Integrado con `--no-ff`. En `ProgramacionAcademicaModule.tsx` se aplicó el parche de consola de `INTEGRACION-codex.md`: la detección de jefatura (`getPendientesJefatura`) espera la configuración de concertación y solo consulta con la concertación **apagada**. Verificado en el navegador: con la concertación encendida no hay ninguna llamada a `/jefatura/pendientes` ni error 409 en consola.

### 30.2 · Conciliación de las decisiones de área (mis 18 contra las 28 de Codex)
Mis 18 (las 8 sin área, las 7 de «Estadística y Matemáticas en todos los planes» y las 3 que Tomás sumó: ASIG-00190, 00014 y 00015) **están todas** en el CSV de Codex con la misma área. Las otras 10 del CSV son decisiones que ya se cumplían (ya estaban en Cuantitativa): ASIG-00012, 00037, 00039, 00040, 00050, 00051, 00070, 00071 (AP) y ASIG-00235, 00237 (Economía Pública). Ninguna decisión del CSV falta en mi lista ni la contradice.

Hallazgo: con el CSV tal cual, el generador movía además las 8 de AP (00012, 00037, 00039, 00040, 00050, 00051, 00070, 00071) del núcleo «Fundamentación Cuantitativa» (NT-004) al de nombre «Cuantitativa» (NT-020) aunque ya estaban en el área correcta: 26 cambios en vez de 18. Ajuste mío en `esap/programacion/generar-catalogo.mjs` (archivo de Codex): una decisión que ya se cumple conserva el núcleo actual; solo cambia el núcleo de lo que cambia de área. Se regeneró el Excel con el mismo `--catalogo-base` y la misma fuente (`PROGRAMACIÓN ACADEMICA  2026_1.xlsx`, huella `5b4508c1…`).

### 30.3 · Excel final y validación
Ruta: `C:\Users\Tomas\Documents\ESAP\temporal\Plataformacomunidadesap\esap\programacion\resultados\2026-1\catalogo-importable-2026-1.xlsx`

- Contra la base real (comparación fila a fila, 11.995 campos ajenos al área incluidos): **427 asignaturas, mismos códigos, 0 nuevas**; **18 cambian de área, exactamente las esperadas, y las 18 cambian de área real** (ninguna solo de nombre); posgrado: 160 sin cambios; ninguna otra columna difiere.
- Validación previa del importador (`dry_run=true`, periodo temporal 2048-1, que no escribe ni crea el periodo): 0 errores, 0 advertencias; programas 14 sin cambios; **asignaturas 0 creadas, 18 actualizadas, 409 sin cambios**; 325 ofertas por crear, 0 rechazadas.
- Pruebas de datos y catálogo de Codex: 14/14.
- ASIG-00001 conserva el nombre «Constitución Del Territorio» (por confirmar si es «Construcción»).

### 30.4 · La consulta de periodos ya no escribe
`GET /pta/api/v1/periodos-academicos` ya no siembra un «2025-2» en curso cuando no hay periodos: devuelve `[]`. Prueba nueva `periodo-lista-vacia.spec.ts` (lista vacía y `save`/`create` sin llamar; con periodos tampoco escribe).

Consumidores revisados (ninguno depende de que exista uno): todos leen la respuesta como arreglo con valor por defecto y tratan la ausencia de periodo activo: PA (`ProgramacionAcademicaModule`, `periodosApi`: estado «Sin periodos»), Programas Académicos (`ProgramasAcademicosModule`, `useImportAsignaturas`), PTA (`ptaApi.getActivePeriodoAcademico` cae al año/semestre calendario; `PtaBackofficeModule` y `BancoDocentesPTA` limpian la lista), shell y Estructura Organizacional (devuelven `[]` si falla), reportes y registro académico. `BancoDocentesView` conserva el código fijo «2025-2» como valor por defecto de su selector; no rompe, pero queda como deuda de esa pantalla. Ningún servicio de backend consulta este endpoint. Con la base en cero, la lista responde `[]` (200).

### 30.5 · Envío a revisión, verificado en el navegador con servidor real (cierra EFDS-2374)
Periodo 2049-1 en curso, asignatura y docente QA, concertación encendida, superadmin como programador:
1. **Disponibilidad Docente → docente**: aparece «Docencia asignada» con la carga (88 h) y el botón «Enviar a revisión».
2. Un clic, **una sola** llamada `POST /concertacion/enviar` (201) y la lista del programador se recarga: «Pregrado · En revisión · 88 h en la foto de revisión», «Docencia … enviada a revisión».
3. **Concertación de la docencia (bandeja)**: aparece la docencia, con «Enviada por el programador ✓ → 2 Revisión académica (pendiente) → 3 Aprobación → 4 Aceptación del docente» y los botones «Revisar y firmar (académica)», «Aprobar y firmar» y «Devolver al programador».
4. Firma de la revisión: el modal muestra «Firma registrada», se cierra solo y no reaparece la verificación.
Capturas: `C:\Users\Tomas\Claude\envio-1-disponibilidad.png`, `envio-2-docente.png`, `envio-3-click.png`, `envio-4-bandeja.png`.

### 30.6 · Video del flujo con las novedades
`C:\Users\Tomas\Claude\demo-flujo-nuevo-pa.webm` (1366×768). Rótulos explicativos solo en las partes nuevas: (1) el programador envía a revisión, (2) bandeja en el orden nuevo y firma que se cierra sola, (3) periodo extraordinario. Los pasos de enlace van sin explicación.

### 30.7 · Pruebas sobre la rama integrada y estado de la base
PA backend 272/272 · PTA backend 1147 pasan, 1 omitida (+2 de la lista vacía) · MFE PA 51/51 · MFE Programas Académicos 28/28 · datos/catálogo 14/14. La base local quedó **sin periodos**, con los mismos conteos conservados (427 asignaturas, 14 programas, 35 núcleos, 390 núcleos de docentes, 365 docentes del RUND, 29 aulas, 341 usuarios, 441 personas) y sin fixtures QA. El Excel **no** se cargó: las asignaturas de la base siguen como estaban; lo carga Tomás.

## 31. Periodo personalizado al crear (26 de octubre)

Pedido de Tomás que faltaba en las pantallas: al crear un periodo no solo se elige semestre 1 o 2; hay una tercera opción, **Personalizado (lo defino yo)**, con nombre y código que define quien lo crea. El backend ya lo soportaba (§25.2); faltaban los dos formularios.

- **Programas Académicos → Periodos → Crear Periodo** (`GestionPeriodos.tsx`): el selector tiene «Semestre 1», «Semestre 2» y «Personalizado». Con Personalizado aparecen **Nombre del periodo** (p. ej. «Interperiodo 2027») y **Código** (el año, un guion y de 1 a 5 letras o dígitos; no puede ser 1 ni 2, que son los semestres). Envía `{ tipo: 'personalizado', anio, codigo, nombre, fechaInicio, fechaFin }`; el semestre sigue enviando `{ anio, semestre, fechaInicio, fechaFin }` como antes.
- **Programación Académica → Periodos** (`GestionOfertas.tsx`): el mismo selector y los mismos campos; tras crear, deja seleccionado el periodo nuevo para importar el catálogo.
- **Editar un personalizado** (Programas Académicos): año y semestre quedan bloqueados («Personalizado») y la actualización solo envía fechas y fase, que es lo que acepta el backend; el código no se edita.
- Pruebas nuevas (`GestionPeriodos.personalizado.test.tsx`, 4): las tres opciones; el personalizado se envía con nombre y código en mayúsculas y sin semestre; un código «1» no se envía y avisa; el semestre sigue igual. Verificado con servidor real en las dos pantallas (2049-INT y 2049-VER, ya borrados).
