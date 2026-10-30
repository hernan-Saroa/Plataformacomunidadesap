# Eliminación de registros RUND

El listado ofrece eliminación individual y selección múltiple. La casilla del encabezado selecciona la página; «Seleccionar todos los resultados» incluye las otras páginas con los mismos filtros y periodo. Se pueden desmarcar excepciones. Cambiar filtros o periodo limpia la selección para evitar mezclar consultas.

Permiso requerido: `banco-docentes.rund.carga` (Cargador GGP). Se conserva el acceso administrativo mediante `banco-docentes.rund.manage` y Super Administrador. Revisión, incorporación o edición por sí solas no autorizan estas operaciones. La API verifica el permiso tanto al previsualizar como al confirmar.

La confirmación interna muestra los nombres, documentos y periodos exactos, requiere un motivo de 10 a 1.000 caracteres y una casilla de aceptación. No utiliza alertas nativas. Cancelar no modifica datos. El máximo por operación es 10.000 registros.

## Persistencia y alcance

- Migración `673_rund_registro_eliminacion.sql`: agrega `Docente.eliminadoRund`, inicialmente falso. El índice único por persona y periodo se aplica a los registros no eliminados.
- Es una eliminación lógica del registro RUND y su periodo. Deja de aparecer en el banco, sus estadísticas y la consulta de disponibilidad de RUND para PTA. La cuenta, la persona, los expedientes y las relaciones de PTA existentes se conservan.
- No se ejecuta una eliminación física ni se modifica el estado activo/inactivo de la cuenta. El cambio de estado del perfil sigue siendo una operación independiente.
- Una nueva creación/carga de la misma persona y periodo genera otro registro con su propio ID RUND, sin reutilizar las aprobaciones ni los soportes del expediente eliminado. La unicidad de los registros vigentes sigue protegida por PostgreSQL.
- El listado filtra la marca después del LEFT JOIN con Personas: un registro eliminado no reaparece como docente sin perfil.
- Las operaciones documentales, de revisión, OCR e incorporación que bloquean el perfil rechazan un expediente eliminado. Los archivos y las evidencias permanecen almacenados.

## Confirmación, concurrencia y auditoría

`POST /pta/banco-docentes/eliminacion/previsualizar` resuelve IDs exactos en el servidor, sin limitarse a la página visible. Acepta IDs explícitos o filtros con exclusiones y devuelve una huella de los IDs y sus fechas de modificación.

`POST /pta/banco-docentes/eliminacion/confirmar` requiere esa selección, la huella, el motivo y `confirmado: true`. Bloquea los registros en orden estable y rechaza selecciones modificadas, faltantes o ya eliminadas. La eliminación y los eventos `ELIMINAR_REGISTRO` se guardan en una sola transacción: si falla la auditoría, se revierte todo el lote. Cada evento conserva el actor autenticado, fecha, IP, motivo, periodo, cantidad e ID de operación. Nunca confía en el actor enviado por el cliente.

Los endpoints nuevos coexisten con el antiguo `DELETE /:id`, que continúa siendo un alias del cambio de estado para conservar compatibilidad. La interfaz usa exclusivamente los endpoints nuevos para eliminar.

## Verificación

- `scripts/verify-rund-registro-eliminacion.cjs`: SQL real en tablas TEMP con ROLLBACK. Individual, lote de 53 registros entre páginas, exclusiones, periodos, listado y estadísticas, auditoría, fallo atómico, selección obsoleta, conservación de Personas/cuentas y referencia PTA; nuevo registro del mismo periodo con expediente independiente.
- `scripts/verify-rund-eliminacion-browser.mjs`: componentes, contexto de permisos y adaptador API reales con respuestas sintéticas. Confirmación, cancelación, selección entre páginas, exclusiones, refresco, periodos, perfiles autorizados y modal entre 360 y 1.440 px.
- Pruebas unitarias y HTTP en `rund-registro-eliminacion.spec.ts`, `rund-permission-separation.http.spec.ts`, `RundDeleteModal.test.tsx` y `BancoDocentesPTA.test.tsx`.

Estas verificaciones no eliminan docentes reales.
