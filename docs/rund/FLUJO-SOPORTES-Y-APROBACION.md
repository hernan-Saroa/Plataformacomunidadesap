# Soportes y aprobación del perfil RUND

Actualización: 8 de septiembre de 2026.

## Persistencia y recuperación

La fuente de verdad es PostgreSQL: `Docente`, `RundCampoEstado`, `RundSoporteCampo`, `RundDocumentoPerfil` y `RundAprobacionLog` conservan el perfil, estados por espacio, soportes, versiones y trazabilidad. Los borradores de autogestión se guardan en `BancoDocentesInvitaciones.borrador_json`.

Los bytes de los PDF se almacenan de forma persistente en OpenKM o, cuando el ambiente lo permite, en `uploads` del servidor. PostgreSQL conserva la referencia al archivo y sus metadatos; el PDF no se almacena como binario dentro de PostgreSQL. El almacenamiento local del servidor necesita un volumen persistente si se despliega en contenedores.

Estos componentes no guardan aprobaciones ni soportes en `localStorage` o `sessionStorage`. La memoria de la pantalla contiene la respuesta actual del servidor y los archivos seleccionados que todavía no se han enviado. Solo después de una respuesta exitosa de carga se consideran guardados; un archivo seleccionado pero aún no enviado debe seleccionarse nuevamente al cerrar la página.

Al abrir el expediente se consultan sus datos persistidos. Si falla la consulta, se muestra un error con **Reintentar**: no se fabrican estados, porcentajes ni documentos de ejemplo. Las respuestas tardías de un expediente anterior se descartan al cambiar de docente. Los requisitos adicionales se calculan según los datos declarados de cada perfil; el catálogo de reglas sigue definido en código, no es un editor de reglas administrable desde DB.

## Cómo se utiliza

1. Abra el docente del periodo correspondiente y su **Validación Integral RUND**.
2. En el punto de control, pulse **Subir** y adjunte un PDF de máximo 10 MB. También puede cargarlo desde **Documentos del perfil**, seleccionando en **Información que acredita** el campo al que corresponde. Un **Anexo general** se conserva en el expediente, pero no reemplaza un soporte obligatorio.
3. El archivo queda **Pendiente de revisión**. Estar cargado no significa estar aprobado.
4. Una persona con permisos de validación y acceso al original —GGP o SUPER_ADMIN— abre **Ver**, contrasta el archivo con la información registrada y elige **Aprobar** o **Devolver**. Quien cargó el soporte no puede revisarlo. Las decisiones se guardan de inmediato.
5. Para **Devolver**, se exige escribir el motivo y la corrección requerida. El motivo queda visible junto al soporte y en la trazabilidad. Los otros documentos conservan sus decisiones.
6. El responsable utiliza **Reemplazar** para corregir el archivo. Se crea una versión nueva, se conserva la anterior y el nuevo soporte queda pendiente de revisión. La aprobación anterior no se hereda.
7. Cuando todos los soportes obligatorios están presentes y todos los soportes aportados del espacio están aprobados y vigentes, el revisor pulsa **Aprobar bloque**. Contacto se revisa sin exigir archivos. La aprobación del bloque también exige una persona distinta del último cargador/editor del bloque.
8. El espacio aprobado muestra una pestaña verde con verificación, un aviso **Espacio aprobado**, la fecha de revisión y los campos acreditados en verde. El encabezado muestra cuántos espacios están aprobados, sobre seis.

La aprobación documental global se obtiene con Identidad, Formación, Vinculación, Académico y Transversal aprobados. Contacto tiene su aprobación independiente. Una devolución abierta mantiene el estado global **DEVUELTO**. Este estado documental es distinto de la vinculación laboral **Activo/Inactivo**.

## Reglas que protegen la revisión

- Se verifica en servidor la categoría, el bloque/tipo de soporte, la extensión, el MIME, la cabecera PDF y el tamaño permitido.
- Los títulos adicionales declarados (especialización, maestría, doctorado, posdoctorado) también requieren soporte. Investigación declarada requiere certificación.
- La identidad compartida por varios campos utiliza una sola decisión documental; no hay que aprobar el mismo PDF cinco veces.
- Un espacio no se puede aprobar con archivos pendientes, devueltos o vencidos. Los anexos técnicos de edición y cambio de estado mantienen su trámite independiente.
- La revisión identifica la versión exacta del documento y la versión de los datos del bloque. Si otro usuario reemplaza el archivo o modifica la información mientras se revisa, se exige actualizar la pantalla.
- Reemplazar o retirar un soporte reabre el espacio. Editar información del perfil reabre los espacios afectados y exige contrastar nuevamente sus soportes aprobados.
- Aprobar, devolver y sus registros de auditoría se confirman juntos en una transacción. Si falla la auditoría, no queda una decisión sin historial.
- El actor de una decisión procede de la sesión autenticada; no se acepta un aprobador enviado por el navegador.
- Eliminar es una retirada lógica: el archivo sale de los vigentes, su acceso normal queda cerrado y se conservan el registro, las versiones y el contenido almacenado como evidencia. No se realiza borrado físico desde esta acción.

La correspondencia del contenido con los datos la determina el revisor humano. El análisis de palabras del PDF, cuando produce un resultado, es una advertencia orientativa; no concede aprobaciones automáticas.

## Autogestión del docente

La invitación y el código OTP autorizan el envío de datos y los soportes del mismo perfil. El catálogo incluye los puntos de control de los cinco espacios documentales, incluido el formato de tratamiento de datos.

Si un archivo falla, el formulario informa que los datos sí se guardaron, identifica cuántos archivos siguen pendientes y permite reintentar solo esos archivos durante la sesión vigente. Los soportes ya cargados se identifican como tales. No se muestra **Registro completado** mientras persistan fallos del envío seleccionado.

Al autenticarse nuevamente, el perfil consulta los soportes y espacios en PostgreSQL y muestra sus aprobaciones y las correcciones requeridas. Se conservan las restricciones sobre nombres y contenido de originales para este canal.

El reintento conserva el identificador del perfil durante la sesión de esa pantalla; no vuelve a enviar el perfil ni crea otra versión de los archivos que ya cargaron correctamente. Si la sesión OTP vence, se requiere volver a autenticarse mediante el flujo de invitación.

## Dónde consultar la trazabilidad

- **Ver trazabilidad de revisiones y documentos**: últimas 50 acciones del perfil, con actor, fecha, acción, bloque, motivo y datos de la versión cuando corresponda. El historial completo permanece en `RundAprobacionLog`.
- **Historial** en Documentos del perfil: versiones anteriores, reemplazadas y retiradas. Los originales reemplazados conservan su consulta para los roles autorizados.
- Las acciones nuevas incluyen `APROBAR_SOPORTE`, `DEVOLVER_SOPORTE` y `REABRIR_POR_EDICION`; se mantienen `CARGAR_DOCUMENTO`, `REEMPLAZAR_DOCUMENTO`, `ELIMINAR_DOCUMENTO`, `APROBAR` y `DEVOLVER`.

## Validación realizada

- Servicio académico: 499 pruebas de regresión aprobadas; la selección RUND se repitió después de los ajustes de rutas y pasó sus 196 pruebas. Además, tres pruebas nuevas verificaron que el actor de revisión se toma de la sesión y que los roles sin acceso al original no pueden revisar.
- Interfaz PTA: 121 pruebas aprobadas, incluidas carga de estados persistidos, devolución con motivo, aprobación de bloque, reemplazo sin aprobación heredada e historial. También comprueba recuperación en una pantalla nueva, errores del servidor sin estados sintéticos y descarte de respuestas de otro docente.
- Autogestión: tres pruebas aprobadas, incluida una carga parcial fallida seguida del reintento de un único archivo, sin reenviar el perfil, y la recuperación del estado documental después de autenticarse de nuevo.
- `node scripts/verify-rund-evidence-workflow.cjs`: integración con PostgreSQL real, exclusivamente sobre tablas temporales y archivos sintéticos en memoria. Verifica errores, segregación de funciones, versiones, estados, reapertura por edición, rollback si falla la auditoría, activación y retirada lógica. Siempre revierte la transacción de prueba.
- `node scripts/verify-rund-evidence-browser.mjs`: Chrome con los componentes reales y una API simulada; verifica las interacciones y genera las capturas [aprobado](evidence-preview/aprobado.png) y [devuelto](evidence-preview/devuelto.png).
- Compilación del servicio académico y del frontend PTA completada.

Las pruebas no modificaron perfiles ni archivos reales. Esta validación no equivale a una prueba en producción contra el repositorio OpenKM de la institución: la integración documental utiliza el proveedor ya configurado en cada ambiente. Los permisos de acceso a originales se conservan. No se ejecutaron migraciones ni se reescribieron aprobaciones históricas; los nuevos controles se aplican al operar el flujo actualizado.

## Referencia técnica

`POST /pta/api/v1/pta/banco-docentes/:docenteId/bloques/:bloque/soportes/:soporteId/revision`

```json
{
  "estado": "Rechazado",
  "observacion": "El archivo no corresponde al título registrado. Adjunte el diploma correcto.",
  "documentoVersionId": "UUID de la versión vigente",
  "blockVersion": 3
}
```

`estado` acepta `Aprobado` o `Rechazado`; la interfaz presenta este último como **Devuelto**. La ruta antigua de guardado por lote, que no persistía decisiones, devuelve un error indicando que se debe actualizar la pantalla y usar la revisión por soporte.
