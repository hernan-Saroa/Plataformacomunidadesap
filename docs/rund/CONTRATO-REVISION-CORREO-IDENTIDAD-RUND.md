# Revisión durable de correo sin resultado observado

Punto 83. Registro explícito, consulta, bandeja y asignación de casos. No cambia los
estados del correo, registra resultados SMTP, cierra casos o permite reenviar.
El módulo `AuthIdentityMailReviewModule` permanece fuera de AppModule.

El alcance descrito aquí corresponde al punto 83. El punto 84 añade el
[recibo separado de cierre con aceptación registrada](CONTRATO-CIERRE-REVISION-CORREO-IDENTIDAD-RUND.md),
conservando estas cuatro rutas, el caso y su DTO de doce campos.

El punto 87 añade una [entrada explícita para resultado INCIERTO registrado](CONTRATO-REVISION-RESULTADO-INCIERTO-RUND.md).
Reutiliza el mismo caso/DTO y asignación. El POST anterior mantiene su requisito
de ausencia de journal para abrir casos nuevos; no permite reenviar o cerrar incertidumbres.

## Registro e invariantes

La migración `018_rund_identidad_correo_revision.sql`, posterior a 017, crea
`rund.identidad_correo_revision`. Un caso único por intención conserva UUID propio,
intento original, estado de correo al abrir, cuenta que lo registró, fecha y eventual
responsable/fecha de asignación. No almacena texto libre, identidad del destinatario,
documentos, mensaje, contraseña, hash o credenciales de sesión.

Solo se abre un caso nuevo para ENVIANDO o INCIERTO sin resultado registrado en 017.
ENVIANDO puede seguir en vuelo: registrar revisión no afirma caída, rechazo o abandono
del intento. PENDIENTE, ENVIADO o un resultado ya registrado no fabrican otro caso.
No hay backfill, timer o captura automática de todos los envíos en vuelo.

El aviso se bloquea antes de registrar/asignar el caso, en el mismo orden que el
consumidor y conciliador. Esto serializa el registro con una confirmación tardía.
Repetir el registro conserva UUID, creador y fechas, incluso si otra cuenta autorizada
lo consulta o si después llegó un resultado. No cambia de intento.

El trigger protege intención, caso, intento, estado inicial, creador y fecha. Solo
permite PENDIENTE → EN_REVISION con responsable y fecha del servidor. Impide borrado,
cierre, reasignación o reemplazo de identidad. La asignación no resuelve el envío.

## API opcional y autorización

Base: `/banco-docentes/identidad/correos/revisiones`.

| Método y ruta | Acción |
|---|---|
| GET base | Bandeja paginada, sin abrir casos al leer |
| GET `/:casoId` | Caso y diagnóstico actual del mismo intento |
| POST `/por-intencion/:intencionId` | Registrar/recuperar un caso; cuerpo vacío |
| POST `/:casoId/asumir` | Asignar al operador autenticado; cuerpo vacío |

Exige JWT, cuenta UUID, exp numérica vigente y rol de gestión o permiso efectivo
`banco-docentes.rund.manage`, según la semántica vigente del banco. Un token interno,
permiso declarado en el body/JWT, ID de persona o permiso de solo lectura no bastan.
Actor/roles/exp proceden de la sesión verificada. No se aceptan campos para elegir
responsable, fecha, resultado, envío o cierre.

El servicio revalida permiso y vigencia después de las lecturas. En escrituras lo
hace antes de confirmar la transacción: revocación, caída de Auth o expiración durante
SQL revierten registro/asignación. Los roles de gestión conservan su alternativa
existente; tampoco omiten la comprobación de expiración. No se promete atomicidad
distribuida con una revocación posterior a la última comprobación.

La comprobación final de permisos puede hacer HTTP Auth mientras mantiene el bloqueo
del caso/aviso para poder revertir esa escritura. No hace SMTP. Los errores SQL se
traducen a 503 genérico sin parámetros; ausencia: 404; entrada/cursor inválidos: 400;
caso no elegible u otro responsable: 409. Todas las rutas mantienen private, no-store.

El DTO tiene doce campos: version, casoId, intencionId, estado, creadaEn,
registradaPor, asumidaPor, asumidaEn, estadoCorreoInicial, estadoCorreo,
resultadoRegistrado y requiereRevision. No devuelve el intento, resultado privado,
contexto de negocio o datos del destinatario.

## Concurrencia, consulta e historia

La bandeja admite `limite` textual entre 1 y 100 (25 por defecto), `estado` PENDIENTE
o EN_REVISION y cursor versionado vinculado al filtro. Ordena por fecha UTC de seis
decimales y UUID; conserva empates sin truncar microsegundos. Valida formato, versión
y filtro del cursor; no es firmado ni sirve como credencial de autorización.

El responsable toma el caso desde su propia sesión. Repetir con la misma cuenta
recupera la asignación sin cambiar fecha; otra cuenta recibe conflicto. Respuesta
HTTP perdida se recupera registrando/asumiendo con los mismos IDs.

Una aceptación tardía puede registrar el resultado y conciliar ENVIADO sin que el
caso lo impida. La consulta muestra el estado actual y requiereRevision false, pero
conserva estado inicial, creador y asignación: no borra la historia ni cierra el caso.
Si aún estaba PENDIENTE, no se inicia una nueva asignación después de ENVIADO. Un
responsable previamente asignado puede recuperar idempotentemente su recibo.
INCIERTO o ENVIANDO mantienen requiereRevision true, sin inferir éxito/rechazo.

El caso no expone operaciones de aceptar, cerrar, conciliar, cancelar o reenviar.
No importa el consumidor SMTP/conciliador ni modifica avisos, resultados, perfil,
bloques, auditoría de negocio o identidad Auth. No sustituye el GET por actor del
punto 80 ni altera sus seis campos o los recibos del consumidor.

## Pendientes y activación

El siguiente punto es el cierre auditable de revisiones cuando exista aceptación
registrada compatible, sin presentar los intentos sin evidencia como resueltos.
Siguen política de incertidumbre y rechazos de vigencia, intervalo Auth–SMTP, otros
canales y los requisitos de activación del mapa de independencia.

018 se instala solo en PostgreSQL temporal para las pruebas. Rutas nuevas, formulario
y consumidor siguen sin activar. No se cambian .env/Compose, bases existentes,
SMTP real, despliegues o el RUND embebido en PTA.
