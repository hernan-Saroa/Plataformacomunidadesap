# Soportes y aprobación del perfil RUND

Actualización: 29 de octubre de 2026.

## Persistencia y recuperación

La fuente de verdad es PostgreSQL: `Docente`, `RundCampoEstado`, `RundSoporteCampo`, `RundDocumentoPerfil` y `RundAprobacionLog` conservan el perfil, estados por espacio, soportes, versiones y trazabilidad. Los borradores de autogestión se guardan en `BancoDocentesInvitaciones.borrador_json`.

Los bytes de los PDF se almacenan de forma persistente en OpenKM o, cuando el ambiente lo permite, en `uploads` del servidor. PostgreSQL conserva la referencia al archivo y sus metadatos; el PDF no se almacena como binario dentro de PostgreSQL. El almacenamiento local del servidor necesita un volumen persistente si se despliega en contenedores.

Estos componentes no guardan aprobaciones ni soportes en `localStorage` o `sessionStorage`. La memoria de la pantalla contiene la respuesta actual del servidor y los archivos seleccionados que todavía no se han enviado. Solo después de una respuesta exitosa de carga se consideran guardados; un archivo seleccionado pero aún no enviado debe seleccionarse nuevamente al cerrar la página.

Al abrir el expediente se consultan sus datos persistidos. Si falla la consulta, se muestra un error con **Reintentar**: no se fabrican estados, porcentajes ni documentos de ejemplo. Las respuestas tardías de un expediente anterior se descartan al cambiar de docente. Los requisitos adicionales se calculan según los datos declarados de cada perfil; el catálogo de reglas sigue definido en código, no es un editor de reglas administrable desde DB.

## Cómo se utiliza

1. Abra el docente del periodo correspondiente y su **Validación Integral RUND**.
2. Si desea aportar evidencia, en **Soportes que se tendrán en cuenta** pulse **Adjuntar soporte** y adjunte un PDF de máximo 10 MB. También puede cargarlo desde **Documentos del perfil**, seleccionando en **Información que acredita** el campo al que corresponde. Los soportes son opcionales para la validación de datos y la aprobación final del bloque.
3. El archivo queda **Pendiente de revisión**. Estar cargado no significa estar aprobado.
4. Una persona con permiso de revisión o administración RUND puede admitir o devolver los documentos, y validar o devolver cada dato por separado. Puede ser la misma persona que cargó la información si también tiene permiso de revisión. Cada decisión se guarda de inmediato y procede de la sesión autenticada.
5. Para **Devolver**, se exige escribir el motivo y la corrección requerida. En Identidad, Formación, Vinculación, Académico y Transversal, **Devolver bloque** solo se habilita cuando hay al menos un soporte propio con documento disponible. Un anexo general, un archivo eliminado/reemplazado o un soporte administrativo de edición no habilitan la devolución. Es posible devolver una carga parcial sin exigir todos los soportes ni aprobarlos previamente. Contacto conserva su revisión sin archivos. La condición de devolución documental del bloque se vuelve a comprobar en el servidor dentro de la transacción. Cada dato admite devolución con motivo aunque no haya archivos. El motivo queda visible junto al soporte y en la trazabilidad. Los otros documentos conservan sus decisiones.
6. El responsable utiliza **Reemplazar** para corregir el archivo. Se crea una versión nueva, se conserva la anterior y el nuevo soporte queda pendiente de revisión. La aprobación anterior no se hereda.
7. Después de validar cada dato requerido o registrado, el revisor pulsa **Aprobar bloque**. Su decisión permite aprobar sin archivos, o aunque los archivos estén pendientes, devueltos o vencidos. Las decisiones documentales se conservan; no se fabrican archivos ni se aprueban documentos automáticamente. Un dato devuelto o pendiente sí impide aprobar el bloque.
8. El espacio aprobado muestra una pestaña verde con verificación, un aviso **Espacio aprobado**, la fecha de revisión y los campos acreditados en verde. El encabezado cuenta los cinco espacios documentales; Contacto tiene su aprobación independiente.

## Varias evidencias por punto de control

Actualización: 28 de octubre de 2026.

Cada punto de control de Identidad, Formación, Vinculación, Académico y Transversal admite **hasta 10 evidencias vigentes** (por ejemplo, anverso y reverso de la cédula, o varios actos administrativos). CC, CE y pasaporte comparten el mismo punto de identidad. Contacto no requiere archivos.

- **Agregar:** en la revisión centralizada de soportes, **Adjuntar soporte** carga la primera evidencia y **Agregar otra evidencia** las siguientes. Desde **Documentos del perfil**, cargar un soporte que ya tiene archivos también agrega una evidencia adicional; la pantalla lo advierte antes de cargar.
- **Reemplazar:** corrige una evidencia concreta. Crea una versión nueva de esa evidencia, conserva la anterior y la deja pendiente de revisión. Las demás evidencias conservan sus decisiones.
- **Eliminar:** retira solo esa evidencia (retirada lógica). El espacio queda en *Falta soporte* únicamente si ya no queda ninguna evidencia para un dato obligatorio.
- **Orden y numeración:** las evidencias se numeran por orden de incorporación (*Evidencia 1, 2…*). La numeración no cambia al reemplazar un archivo.

**Revisión.** Cada evidencia se **admite** (*Validar soporte*) o se **devuelve** (*Devolver soporte*, con motivo obligatorio) una sola vez en la revisión centralizada. Esto selecciona los archivos que pueden respaldar el perfil; cada dato se decide por separado. Para aprobar el bloque:

1. Cada dato requerido o registrado debe quedar validado por el revisor autorizado.
2. No puede quedar ningún dato devuelto sin resolver.
3. Los archivos pueden faltar o conservar sus decisiones independientes, incluidas revisiones pendientes, devoluciones o vencimientos. La decisión humana de los datos permite aprobar el bloque y queda auditada sin cambiar el estado de los archivos.

Estas reglas se aplican en el servidor dentro de la transacción; la pantalla muestra las mismas condiciones antes de habilitar **Aprobar bloque**.

**Asistente OCR.** El usuario elige cuándo analizar las nuevas evidencias. Con varias evidencias disponibles se pueden **seleccionar y ordenar** (*Analizar seleccionadas* / *Analizar todas*) y **reordenar** los análisis en espera antes de que comiencen; el servidor los procesa en ese orden. Reordenar intercambia los turnos que esos análisis ya tenían, sin adelantarlos sobre los de otros docentes. Los resultados se consultan archivo por archivo. Si dos evidencias proponen un valor para el mismo dato, el asistente lo advierte y el responsable elige cuál aplicar. Al aplicar una, las demás propuestas de ese dato se marcan como **desactualizadas** y no pueden aplicarse; se rechazan o se vuelve a analizar el documento.

**Alcance del OCR.** El asistente solo busca los datos que el documento puede acreditar:
- Una evidencia de un punto de control propone únicamente las filas de su tipo de soporte, que pertenecen a la pestaña de ese punto. Por ejemplo, un diploma de maestría solo propone *Maestría* y un documento de identidad solo propone los datos de Identidad.
- Un anexo general con categoría específica (Identidad, Títulos, Contratos, Resoluciones, Certificados) se limita a los datos de esa categoría.
- Un anexo general *Otros* no se analiza.
- Cada valor debe aparecer literalmente en el texto del PDF; si no, se descarta.
- Una sugerencia antigua que su documento no acredita se muestra como **fuera de alcance**: el servidor impide aplicarla y solo puede rechazarse.

**Soportes históricos.** Un soporte anterior que solo tiene archivo en la carpeta, sin versión documental, se reemplaza desde su botón **Reemplazar**, como cualquier evidencia. Las pantallas que todavía cargan sin indicar modo (Carpeta Digital y autogestión) conservan su comportamiento anterior.

**Trazabilidad.** Además de las acciones existentes, se registra:
- en cargas y revisiones, el número de evidencia y el total vigente del punto (`evidencia`, `evidenciasVigentes`, `evidenciaAdicional`);
- en retiros, las evidencias que quedan;
- en el OCR, `SOLICITAR_EXTRACCION_OCR` y `REORDENAR_EXTRACCION_OCR`, con el orden elegido.

No se requiere migración: la base ya permitía varios documentos vigentes por tipo. El formulario de autogestión del docente no cambia: sigue reemplazando su archivo como antes.

La aprobación documental global se obtiene con Identidad, Formación, Vinculación, Académico y Transversal aprobados. Contacto tiene su aprobación independiente. Una devolución abierta mantiene el estado global **DEVUELTO**. Este estado documental es distinto de la vinculación laboral **Activo/Inactivo**.

## Reglas que protegen la revisión

- Se verifica en servidor la categoría, el bloque/tipo de soporte, la extensión, el MIME, la cabecera PDF y el tamaño permitido.
- Los títulos adicionales declarados (especialización, maestría, doctorado, posdoctorado) e investigación requieren revisión del dato. El revisor puede validarlos sin adjuntar un documento; un archivo de otro tipo no se asocia como evidencia de ese dato.
- La identidad compartida por varios campos utiliza una sola decisión documental; no hay que aprobar el mismo PDF cinco veces.
- Los documentos son una ayuda opcional. Su ausencia, devolución, vencimiento o revisión pendiente no bloquean la aprobación cuando los datos han sido validados expresamente. Los anexos técnicos de edición y cambio de estado mantienen su trámite independiente.
- La revisión identifica la versión exacta del documento y la versión de los datos del bloque. Si otro usuario reemplaza el archivo o modifica la información mientras se revisa, se exige actualizar la pantalla.
- Reemplazar o retirar un soporte reabre el espacio. Editar información del perfil reabre los espacios afectados y exige contrastar nuevamente sus soportes aprobados.
- Aprobar, devolver y sus registros de auditoría se confirman juntos en una transacción. Si falla la auditoría, no queda una decisión sin historial.
- El actor de una decisión procede de la sesión autenticada; no se acepta un aprobador enviado por el navegador.
- Eliminar es una retirada lógica: el archivo sale de los vigentes, su acceso normal queda cerrado y se conservan el registro, las versiones y el contenido almacenado como evidencia. No se realiza borrado físico desde esta acción.

La correspondencia del contenido con los datos la determina el revisor humano. El análisis de palabras del PDF, cuando produce un resultado, es una advertencia orientativa; no concede aprobaciones automáticas.

El asistente OCR es opcional en todos los espacios. Una extracción pendiente, en ejecución, fallida o con sugerencias sin decidir no bloquea la aprobación humana de filas, soportes o bloques. Solicitar o recibir un análisis tampoco reabre una aprobación existente. Las sugerencias pueden dejarse sin usar; no se aplican ni descartan automáticamente al aprobar. Si el encargado decide aplicar una sugerencia y modifica datos del perfil, se reabren únicamente los bloques afectados para revisar los valores nuevos, igual que con una edición manual. Se mantienen los requisitos documentales, las revisiones por fila, los permisos, las versiones y la trazabilidad.

## Organización de varios soportes y del OCR

En las seis pestañas, la selección documental se concentra en **Soportes que se tendrán en cuenta**. Cada archivo se admite o devuelve una sola vez, con motivo obligatorio para la devolución. Admitir un archivo lo habilita como evidencia; cada dato conserva su propia decisión. Los datos se presentan debajo en filas a todo el ancho, una debajo de otra, con **Validar dato** y **Devolver dato**. La devolución requiere explicar qué se debe corregir y no rechaza el archivo admitido.

Una cédula admitida puede respaldar los cinco datos de Identidad, pero cada uno se valida por separado. En Formación, Académico y las demás pestañas, se muestran únicamente los soportes del tipo que corresponde al dato: un diploma de maestría no respalda un pregrado. Contacto permite revisar sus datos sin exigir documentos. Los datos calculados automáticamente quedan fuera de la revisión manual.

**Aprobar bloque** exige la validación de cada dato requerido o registrado. Los soportes son opcionales y la decisión final corresponde al revisor autorizado. Cualquier dato devuelto impide la aprobación final. El OCR sigue siendo opcional y aplicar una sugerencia no aprueba el dato. Las decisiones registran actor, fecha, motivo y versiones de los soportes; una huella del valor y sus evidencias impide reutilizar una validación después de cambiar el dato, sustituir su archivo o retirar la evidencia. Las aprobaciones históricas de bloques se conservan hasta reabrirlos; no se ejecuta una migración ni se reescribe su historial.

El OCR se inicia por elección del usuario. Puede seleccionar hasta 20 archivos por lote, ordenarlos antes de enviarlos y ajustar hasta 100 trabajos visibles que todavía esperan en la cola, aunque procedan de distintos lotes. Los trabajos iniciados continúan en el servidor. Las sugerencias se consultan eligiendo **Archivo para revisar**, sin desplegar simultáneamente todos los resultados. Inicialmente se muestra el trabajo en curso o el siguiente turno de la cola. Un revisor autorizado puede organizar el análisis; aplicar o corregir datos mantiene el permiso de edición del perfil.

`RUND_OCR_ENABLED` sigue controlando la disponibilidad del asistente. El descubrimiento automático de archivos está desactivado por defecto; `RUND_EXTRACCION_AUTOMATICA=true` habilita expresamente el modo anterior. No debe activarse cuando se requiere seleccionar y ordenar manualmente las nuevas cargas. Las colas existentes no se eliminan al cambiar este modo.

**Volver a procesar.** Los PDF vigentes que ya fueron analizados vuelven a estar disponibles para seleccionar y ordenar, aunque conserven propuestas pendientes antiguas. **Volver a procesar este PDF** solicita uno individualmente. Al confirmar el nuevo análisis, las propuestas antiguas pendientes se conservan como descartadas por sustitución; las confirmadas o corregidas, el perfil y las aprobaciones documentales permanecen intactos. Los análisis anteriores siguen consultables desde el selector, con fecha para distinguir ejecuciones del mismo PDF. Un archivo en cola o procesándose no admite otra solicitud simultánea. El reemplazo de propuestas, la nueva cola y la auditoría se guardan juntos o se revierten juntos si falla la operación.

`POST /pta/api/v1/pta/banco-docentes/:docenteId/extracciones/reprocesar` recibe `{ "documentos": ["UUID", "UUID"] }` en el orden deseado (máximo 20). Exige permiso de edición, revisión o administración RUND y acceso al original. No concede permiso para aplicar valores al perfil.

## Autogestión del docente

La invitación y el código OTP autorizan el envío de datos y los soportes del mismo perfil. El catálogo incluye los puntos de control de los cinco espacios documentales, incluido el formato de tratamiento de datos.

Si un archivo falla, el formulario informa que los datos sí se guardaron, identifica cuántos archivos siguen pendientes y permite reintentar solo esos archivos durante la sesión vigente. Los soportes ya cargados se identifican como tales. No se muestra **Registro completado** mientras persistan fallos del envío seleccionado.

Al autenticarse nuevamente, el perfil consulta los soportes y espacios en PostgreSQL y muestra sus aprobaciones y las correcciones requeridas. Se conservan las restricciones sobre nombres y contenido de originales para este canal.

El reintento conserva el identificador del perfil durante la sesión de esa pantalla; no vuelve a enviar el perfil ni crea otra versión de los archivos que ya cargaron correctamente. Si la sesión OTP vence, se requiere volver a autenticarse mediante el flujo de invitación.

## Dónde consultar la trazabilidad

- **Ver trazabilidad de revisiones y documentos**: últimas 50 acciones del perfil, con actor, fecha, acción, bloque, motivo y datos de la versión cuando corresponda. El historial completo permanece en `RundAprobacionLog`.
- **Historial** en Documentos del perfil: versiones anteriores, reemplazadas y retiradas. Los originales reemplazados conservan su consulta para los roles autorizados.
- Las acciones nuevas incluyen `APROBAR_SOPORTE`, `DEVOLVER_SOPORTE`, `APROBAR_DATO`, `DEVOLVER_DATO` y `REABRIR_POR_EDICION`; se mantienen `CARGAR_DOCUMENTO`, `REEMPLAZAR_DOCUMENTO`, `ELIMINAR_DOCUMENTO`, `APROBAR` y `DEVOLVER`.

## Validación realizada

- Servicio académico: revisión de toda la suite, con 1452 pruebas aprobadas en 125 suites. Una prueba manual de importación sobre una base desechable permanece omitida por su configuración optativa. Se mantienen la validación sin soportes, el rechazo de decisiones obsoletas y la separación de permisos. La revisión adicional impide aprobar un número de identificación vacío solo porque el tipo de documento figure como CC.
- Interfaz PTA: revisión general con 1008 pruebas aprobadas en 80 archivos, más cuatro comprobaciones dirigidas de navegación y cierre de expediente. Se reprodujo y corrigió que un guardado pendiente pudiera volver a consultar el docente anterior y sustituir la pantalla actual; las consultas del expediente cerrado también se descartan. Se mantienen la aprobación sin soportes, las devoluciones y el OCR opcional.
- Autogestión: tres pruebas aprobadas, incluida una carga parcial fallida seguida del reintento de un único archivo, sin reenviar el perfil, y la recuperación del estado documental después de autenticarse de nuevo.
- `node scripts/verify-rund-evidence-workflow.cjs`: integración con PostgreSQL real, exclusivamente sobre tablas temporales y archivos sintéticos en memoria. Verifica las cinco decisiones de Identidad, devolución de un dato sin rechazar el archivo, bloqueo de la aprobación final, huella obsoleta y rollback de auditoría, además de versiones, reapertura por edición, activación y retirada lógica. Los permisos se comprueban por separado en las pruebas HTTP y en `verify-rund-permission-separation.cjs`. Siempre revierte la transacción de prueba.
- `node scripts/verify-rund-evidence-browser.mjs`: Chrome con los componentes reales y una API simulada; verifica las interacciones, la persistencia de las decisiones al recargar, la aprobación final sin soportes tras validar los cinco datos y las seis pestañas a 320, 390, 768, 1024 y 1500 píxeles sin desbordamiento. Guarda las capturas de esta comprobación en `.local/rund-row-review-preview/`.
- Compilación del servicio académico y del frontend PTA completada.

Las pruebas no modificaron perfiles ni archivos reales. Esta validación no equivale a una prueba en producción contra el repositorio OpenKM de la institución: la integración documental utiliza el proveedor ya configurado en cada ambiente. Los permisos de acceso a originales se conservan. No se ejecutaron migraciones ni se reescribieron aprobaciones históricas; los nuevos controles se aplican al operar el flujo actualizado.

## Referencia técnica

`POST /pta/api/v1/pta/banco-docentes/:docenteId/bloques/:bloque/datos/:campo/revision`

Recibe `estado` (`Aprobado` o `Rechazado`), `huella` y `blockVersion` obtenidos del estado actual; `observacion` es obligatoria para devolver un dato. El servidor comprueba el campo, el bloque y el valor vigente. Registra los soportes compatibles admitidos cuando existen; su ausencia no impide aprobar. La auditoría identifica el criterio del revisor y si decidió sin soporte admitido (`criterioRevision`, `sinSoporteAdmitido`). Exige permiso de revisión o administración RUND y acceso completo; el actor se obtiene de la sesión. Cargador e Incorporador conservan sus funciones sin recibir este permiso. Los eventos se guardan en `RundAprobacionLog`, dentro de la misma transacción que actualiza el estado del bloque.

`POST /pta/api/v1/pta/banco-docentes/:docenteId/bloques/:bloque/soportes/:soporteId/revision`

```json
{
  "estado": "Rechazado",
  "alcance": "documento",
  "observacion": "El archivo no corresponde al título registrado. Adjunte el diploma correcto.",
  "documentoVersionId": "UUID de la versión vigente",
  "blockVersion": 3
}
```

`estado` acepta `Aprobado` o `Rechazado`; la interfaz presenta este último como **Devuelto**. La ruta antigua de guardado por lote, que no persistía decisiones, devuelve un error indicando que se debe actualizar la pantalla y usar la revisión por soporte.
