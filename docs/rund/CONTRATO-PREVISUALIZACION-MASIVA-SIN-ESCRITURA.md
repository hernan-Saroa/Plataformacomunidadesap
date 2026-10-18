# Previsualización masiva sin escrituras de negocio

Puntos 94–95. La ruta vigente `POST /banco-docentes/bulk?dry_run=true` evalúa el archivo
sin ejecutar escritores y después revertirlos. La importación definitiva conserva
su soporte, auditoría, transacciones y reglas anteriores. No se activa escritura HTTP.

## Evaluación y contrato conservados

El lote mantiene el período explícito de cada fila; el período del lote o el activo
solo completan faltantes. Consulta una vez el catálogo territorial antes de procesar
filas. Conserva la normalización, validación, tolerancia del Excel, teléfono reportado,
captura original y bloqueo de documentos repetidos en un mismo período del archivo.
Las filas válidas siguen evaluándose aunque otras fallen.

`upsertDocente` conserva la entrada compartida de validación/normalización. Solo el
despachador interno del lote agrega `previewOnly`; un campo del archivo no controla
esa opción. Antes de llamar al escritor Auth, el preview deriva a `previewRundBulkRow`
con un manager de lectura. No abre transacciones ni pasa por guardado o correo.

Las propuestas puras de persona y perfil se extraen del escritor anterior y son
compartidas por ambos recorridos. Se conservan los campos comparados, fechas civiles,
bigint textual, valores heredados, clasificación de cambios de persona/username y
perfil. Un perfil existente sin número RUND requiere asignación futura, pero la
consulta no solicita el próximo valor. También se conserva el caso anterior de una
persona sin usuario: si persona/perfil no cambian, la clasificación puede ser
`unchanged` aunque `authUserCreated` prediga la creación posterior del usuario.

El resumen mantiene `total`, `created`, `updated`, `unchanged`, `errors`, `results`,
`errorDetails` y `soporteCargaMasivaId` (null en preview). Los resultados conservan
acción, fila/previewId del archivo, documento, nombre, correo, territorial y estado
previsto de usuario/correo. Solo incluyen IDs de filas existentes; un ID que aún no
existe es null. No fabrica UUIDs de persona, usuario o perfil que después desaparezcan.
Los mensajes indican explícitamente previsualización, sin afirmar un guardado.

Errores conservan fila, hoja, columna y valores informativos conforme a los permisos
de la ruta. Fallos SQL inesperados se convierten en error genérico de fila, sin SQL
privado. Se conservan los controles `rejectExisting`, conflicto de correo y rol DOCENTE.
El frontend existente usa los contadores/datos de fila y no exige IDs nuevos en preview.

## Efectos y límites de independencia

La evaluación no escribe perfiles, personas, cuentas, roles, bloques, validaciones,
soportes, evidencias o journals. No calcula contraseñas, envía correo, adquiere locks,
consume secuencias o crea savepoints. La ruta HTTP sigue registrando la auditoría de
acceso sensible `RundAccesoDatosLog` y aplica enmascaramiento/denegación como antes:
esa auditoría deliberada no se elimina para presentar el endpoint como sin escrituras.

En el punto 94 seguían lecturas SQL a Auth. El
[punto 95](CONTRATO-PREVIEW-MASIVO-IDENTIDAD-AUTH.md) las sustituye por una lectura
propietaria mínima, con snapshot Auth de una sentencia y validación estricta del DTO.
El manager del evaluador solo consulta perfiles RUND; no hay SQL Auth alternativo.
El escritor definitivo conserva sus SELECT/escrituras Auth hasta migrar su ejecución.
Se requiere publicar primero Auth con el endpoint nuevo y después su consumidor RUND.
No se declara completado el aislamiento de todos los canales ni se activan escritores HTTP.

El resultado observa un estado que puede cambiar entre lecturas. No reserva identidad,
período, correo o número RUND ni garantiza un commit posterior. La importación vuelve
a validar y conserva las restricciones de la base. La observación no sustituye la
aceptación de instalaciones o una prueba de restricciones/configuraciones particulares.

## Verificación local

Suite RUND completa y build; 26 casos nuevos de preview, además de la regresión previa.
La prueba de catálogo existente conserva su nombre y exige ahora ausencia de soporte/
transacción en modo preview; mantiene la comprobación anterior para el definitivo.
Comparación del contenido anterior de ambos escritores y del servicio, retirando solo
las extracciones y el despacho de preview; propuestas y reglas extraídas conservadas.

El verificador del clúster PostgreSQL temporal agrega siete escenarios. Usa conexión
con `default_transaction_read_only=on`, bloquea transacciones/escritores/guardado/correo
en el fixture del servicio y compara todas las tablas RUND, identidades Auth y todas
sus secuencias. HTTP conserva solo el cambio esperado en la auditoría de acceso.
Comprueba altas sin IDs ficticios, actualización, duplicados, errores, otro período,
conflicto, rol ausente y fallo SQL privado. Contrasta la clasificación del preview con
el escritor real; únicamente esas referencias de prueba usan rollback, fuera del preview
productivo. El escenario anterior de fallo de bloques conserva su trigger y comprueba
que el escritor real revierte la fila; el preview no ejecuta ese trigger de escritura.
El escenario anterior de recuperación por savepoint conserva el rechazo de la primera
fila y procesamiento de la siguiente en el escritor de referencia; la consulta no
intenta esos INSERT y conserva ambas propuestas. No se eliminan esas comprobaciones.

Sin migraciones, .env, Compose o código frontend/Auth/gateway/shell nuevos. No se usan
bases existentes ni SMTP real. Estado y límites en
[ESTADO-MIGRACION-MICROSERVICIO.md](ESTADO-MIGRACION-MICROSERVICIO.md).
