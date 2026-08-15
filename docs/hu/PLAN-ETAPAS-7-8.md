# Plan de ejecución · Etapas 7 y 8

**Épica:** EFDS-1145 — Módulo de Contratación
**HU en este plan:** EFDS-1161, EFDS-1162, EFDS-1164
**Rama base:** `feature/integracion-contratacion`

---

## 1. De dónde partimos

Lo construido llega hasta la etapa 6. La matriz de actividades
(`030_matriz_completa.sql`) ya declara los numerales de las etapas 7 y 8 con sus
exclusiones por modalidad, pero ninguno tiene lógica detrás: no hay tablas, ni
módulo de backend, ni panel.

| Numeral | Actividad | ¿Existe? |
|---|---|---|
| 7.1 | Audiencia de adjudicación | Solo en la matriz |
| 7.2 | Apertura de sobre económico | Solo en la matriz |
| 7.3 | Informe de evaluación definitivo | Solo en la matriz |
| 7.4 | Acto de adjudicación | Solo en la matriz |
| 8.1 | Elaboración de contrato | Solo en la matriz |
| 8.2 | Designación de supervisor | Solo en la matriz |
| 8.3 | Expedición de RP | Solo en la matriz |
| 8.4 | Constitución de garantías | Solo en la matriz |
| 8.5 | ARL | Solo en la matriz |
| 8.6 | Comunicación de inicio | Solo en la matriz |
| 8.7 | Acta de inicio | Solo en la matriz |
| 8.8 | Publicación en web ESAP | Solo en la matriz |

La última migración es la `034`. El último módulo, `comite` (actividad 6.2).

---

## 2. Cómo se encadenan las tres HU

No son independientes: cada una necesita el estado que deja la anterior.

```
EFDS-1161  Contrato electrónico + aceptación      (8.1)
              |  deja: contrato en estado ACEPTADO
              v
EFDS-1162  Suscripción (firma de las dos partes)  (8.1)
              |  deja: contrato PERFECCIONADO
              v
EFDS-1164  Pólizas, garantías y ARL               (8.4 / 8.5)
              |  deja: contrato LEGALIZADO
```

Por eso las ramas van encadenadas y no en paralelo: la 1162 firma un contrato
que solo existe si la 1161 lo generó, y la 1164 pide pólizas de un contrato que
solo está suscrito si la 1162 lo firmó. Construirlas a la vez obligaría a
inventar el estado que la anterior todavía no produce.

---

## 3. Flujo de ramas

Cada HU sale de la rama de integración ya con lo anterior dentro. Al terminar
una se integra, y de ahí nace la siguiente:

```
feature/integracion-contratacion
   |
   +-- feature/EFDS-1161_Contrato_electronico
   |      se desarrolla, se prueba, se mergea a integración
   |
   +-- feature/EFDS-1162_Suscripcion_contrato    (nace de integración, ya con la 1161)
   |      se desarrolla, se prueba, se mergea a integración
   |
   +-- feature/EFDS-1164_Polizas_garantias_ARL   (nace de integración, ya con la 1162)
          se desarrolla, se prueba, se mergea a integración
```

Regla de cierre de cada HU:

1. Typecheck de backend y front, limpio.
2. Suite completa de pruebas del backend, verde.
3. `git checkout feature/integracion-contratacion` y `git merge <rama-hu>`.
4. La siguiente rama nace de integración, ya con lo anterior dentro.

---

## 4. EFDS-1161 · Contrato electrónico y aceptación

**Historia.** Como Gestor de Contratación quiero generar el contrato electrónico
(minuta) y registrar la aceptación del proponente para formalizar el vínculo
contractual.

**Criterios (Gherkin).**

- Dado un proceso adjudicado, cuando el usuario genera el contrato, entonces el
  sistema produce la minuta a partir de la plantilla de la tipología.
- Dado un contrato generado, cuando el proponente lo acepta, entonces el sistema
  registra la aceptación.

**Reglas.** RF-ADJ-03, RF-DOC-03, RF-SIS-05. Aplica a todas las modalidades.

**Decisión de diseño — la minuta no se autogenera.**
Igual que se resolvió en EFDS-1149: el sistema no compone el documento. Ofrece
el formato de la tipología para descargarlo, se diligencia fuera y se sube el
resultado, que es el que queda en el expediente. Autogenerar exigiría un motor
de plantillas y un mapeo campo a campo que los documentos fuente no definen, y
dejaría a la entidad firmando un texto que nadie redactó. La trazabilidad
—cuál formato, quién lo subió, cuándo— se conserva igual.

**Migración `035_contrato_electronico.sql`.**

- Catálogo `hiring.tipologias_contrato` con las tipologías de contrato. Cada una
  apunta a su formato en `hiring.plantillas` por el numeral, reutilizando la
  biblioteca de EFDS-1419 en vez de abrir un segundo repositorio de formatos.
- Tabla `hiring.contratos`: proceso, tipología, número, objeto, valor, plazo,
  contratista, `minuta_documento_id`, estado y sus marcas de tiempo.
- Estados: `GENERADO`, `ACEPTADO`, `RECHAZADO`. La aceptación guarda quién y
  cuándo; sin eso «el sistema registra la aceptación» no se sostiene ante una
  controversia.
- Los numerales 7.4 y 8.1 no se insertan: ya están en la matriz de la `030`.

**Backend — módulo `contratos`.**

- `GET /procesos/:id/contrato` — estado: si aplica, la tipología, si hay minuta,
  quién aceptó. Con `ROLES_LECTURA_CONTRATACION`.
- `POST /procesos/:id/contrato` — genera con la tipología elegida y la minuta
  diligenciada adjunta. Con `ROLES_CONTRATO` (gestor y director).
- `POST /procesos/:id/contrato/aceptar` — registra la aceptación del proponente.
- `POST /procesos/:id/contrato/rechazar` — con motivo obligatorio.
- Se exige proceso adjudicado antes de generar: un contrato sin adjudicación no
  tiene a quién vincular.
- Al aceptar, se sincroniza la actividad 8.1 y queda traza.

**Front — `PanelContrato.tsx`** en el numeral 8.1, con el patrón de los paneles
de la etapa 6: cabecera con el estado, formato de la tipología ofrecido para
descarga (`useFormatosDeLaActividad`), formulario de generación y bloque de
aceptación. Registrado en `DetalleProceso.tsx` como `NUMERAL_CONTRATO = '8.1'`.

**Pruebas.** Generación sin adjudicación rechazada; generación con tipología
válida; aceptación que cambia el estado y cierra la actividad; rechazo con
motivo; doble aceptación rechazada.

---

## 5. EFDS-1162 · Suscripción del contrato

**Historia.** Como Ordenador del Gasto quiero suscribir el contrato con la firma
del ordenador y del contratista para perfeccionar el contrato.

**Criterio.** Dado un contrato generado y aceptado, cuando el ordenador del
gasto y el contratista firman, entonces el sistema registra la suscripción y
marca el contrato como perfeccionado.

**Reglas.** RF-LEG-01. Aplica a todas las modalidades.

**Decisión de diseño — firma registrada, no firma criptográfica.**
La HU anota como dependencia «solución de firma electrónica a integrar», es
decir, no hay proveedor elegido. Se construye el registro de la suscripción con
las dos firmas y sus evidencias, dejando el punto de integración aislado en un
solo servicio. Cuando la entidad contrate el proveedor, se enchufa ahí sin tocar
el resto. Implementar hoy una firma propia sería inventar una solución legal que
no nos corresponde definir.

**Migración `036_suscripcion_contrato.sql`.**

- Tabla `hiring.firmas_contrato`: contrato, parte (`ORDENADOR` o `CONTRATISTA`),
  quién firmó, cuándo, hash del documento firmado y evidencia adjunta.
- Restricción de una sola firma vigente por parte y contrato.
- Estado nuevo del contrato: `PERFECCIONADO`, al que solo se llega con las dos
  firmas. El estado no lo fija quien firma: lo deriva el servicio al comprobar
  que ya están ambas.
- Columnas `perfeccionado_at` y `contrato_firmado_documento_id`.

**Backend — se amplía `contratos`.**

- `POST /procesos/:id/contrato/firmar` — registra una firma. El rol depende de
  la parte: el ordenador firma con `ROL_ORDENADOR_GASTO`; la del contratista la
  registra el gestor con su evidencia.
- Al entrar la segunda firma, el contrato pasa a `PERFECCIONADO` en la misma
  transacción y se sincroniza la actividad 8.1.
- Firmar un contrato no aceptado se rechaza: el orden es generar, aceptar y
  después firmar.

**Front.** Bloque de firmas dentro de `PanelContrato.tsx`: las dos partes con su
estado, quién puede firmar cada una y el sello de perfeccionamiento cuando ambas
están. No es panel aparte porque es el mismo contrato en otro momento; separarlo
obligaría al usuario a saltar entre pantallas para un solo trámite.

**Pruebas.** Firma sobre contrato no aceptado rechazada; primera firma que deja
el contrato aún sin perfeccionar; segunda firma que lo perfecciona; firma
duplicada de la misma parte rechazada; firma sin el rol correcto rechazada.

---

## 6. EFDS-1164 · Pólizas, garantías y ARL

**Historia.** Como Gestor de Contratación quiero cargar y aprobar las
pólizas/garantías y registrar la ARL cuando aplique para legalizar el contrato
con las coberturas exigidas.

**Criterios.**

- Dado un contrato suscrito, cuando el contratista carga las pólizas, entonces
  el sistema permite su revisión y aprobación.
- Dado un contratista persona natural, cuando se legaliza, entonces el sistema
  exige el registro de ARL.

**Reglas.** RF-LEG-03. Aplica a todas las modalidades; la ARL solo a personas
naturales.

**Decisión de diseño — amparos desglosados, no una póliza monolítica.**
La matriz lo pide explícito en 8.4: «desglosar los amparos para el control de
las fechas de vencimiento». Una póliza con una sola fecha no permite avisar del
amparo que vence primero, que es justo para lo que sirve el control.

**Migración `037_polizas_garantias_arl.sql`.**

- Catálogo `hiring.tipos_amparo`: cumplimiento, salarios y prestaciones,
  calidad, estabilidad de la obra, responsabilidad civil y buen manejo del
  anticipo.
- Tabla `hiring.garantias`: contrato, aseguradora, número de póliza, documento,
  estado (`CARGADA`, `APROBADA`, `RECHAZADA`), quién revisó y cuándo.
- Tabla `hiring.amparos`: garantía, tipo, valor asegurado, vigencia desde y
  hasta. El desglose que pide la matriz.
- Tabla `hiring.afiliaciones_arl`: contrato, quién afilia (entidad o
  contratista), ARL, número, fecha y soporte.
- Los numerales 8.4 y 8.5 ya están en la matriz; solo se usan.

**Backend — módulo `legalizacion`.**

- `GET /procesos/:id/legalizacion` — garantías con sus amparos, ARL, qué falta y
  si el contrato ya está legalizado.
- `POST /procesos/:id/legalizacion/garantias` — carga con sus amparos.
- `POST /procesos/:id/legalizacion/garantias/:gid/aprobar` y `.../rechazar` — la
  revisión que pide el criterio 1, con motivo obligatorio al rechazar.
- `POST /procesos/:id/legalizacion/arl` — registro de la afiliación.
- La exigencia de ARL se deriva del tipo de persona del contratista, no de una
  casilla que el usuario marque: es el criterio 2 y no puede depender de que
  alguien se acuerde de activarlo.
- Con todas las garantías aprobadas y la ARL registrada cuando aplique, el
  contrato pasa a `LEGALIZADO` y se sincronizan las actividades 8.4 y 8.5.

**Front — `PanelLegalizacion.tsx`** en los numerales 8.4 y 8.5: garantías con sus
amparos y vencimientos, acciones de aprobar y rechazar, bloque de ARL que solo
aparece si el contratista es persona natural, y un resumen de qué falta.

**Pruebas.** Carga sobre contrato no suscrito rechazada; carga con amparos;
aprobación y rechazo con motivo; ARL exigida para persona natural y no exigida
para jurídica; legalización que solo se completa con todo aprobado.

---

## 7. Riesgos conocidos

**Las 16 tipologías no están en los documentos fuente que tenemos.** La HU las
menciona sin listarlas. Se siembra el catálogo con las tipologías que aparecen
en la matriz y en las plantillas ya cargadas, y la migración queda idempotente
para completarlo cuando Contratación entregue la lista. Queda anotado en el
cierre de la 1161 para que no pase como si estuviera resuelto.

**La firma electrónica no tiene proveedor.** Ya explicado: se aísla el punto de
integración. La 1162 queda funcionalmente completa como registro, y la
integración real será otra HU cuando haya proveedor.

**La adjudicación (7.1–7.4) no está construida.** La 1161 exige proceso
adjudicado. Como no existe todavía el módulo de adjudicación, la condición se
comprueba contra el estado del proceso y el enganche queda marcado en el código
para cuando llegue la HU de la etapa 7. Es la única forma de no bloquear las
tres HU detrás de una que no está en este lote.

---

## 8. Entregable

Al cerrar, este documento se completa con las subtareas creadas por HU con sus
horas, lo efectivamente construido frente a lo planeado, y lo que quedó fuera y
por qué.
