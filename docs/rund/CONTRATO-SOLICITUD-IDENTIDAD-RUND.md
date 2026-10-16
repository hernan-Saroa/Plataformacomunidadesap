# Intención estable por solicitud de creación manual

Punto 71. Une una solicitud de servidor con el ejecutor del punto 66. Preparación
para CREAR_MODAL, sin conectar rutas activas ni aplicar identidad remota.

## Origen y límite de confianza

`AuthIdentityRequestService.preparar(solicitudId, actorId, comando, escritura)`
recibe una solicitud UUID que el flujo debe conservar durante sus reintentos y el
UUID del operador autenticado. El llamador debe comprobar sesión y permisos antes
de cada invocación; nunca obtener actorId del body. La clave de idempotencia no
concede autorización. Este servicio no declara endpoints, guards o excepciones JWT.

Solo admite creación manual: auditoría MODAL/CREAR con el mismo actor, territorial
resuelta por el servidor, rejectExisting=true y sin bulkImport, relaxValidation o
preserveTerritorial. No sirve para edición, lote, API o autogestión. Esas entradas
conservan todos sus controles actuales de soporte, sugerencias, período y OTP.

Reutiliza normalizeBancoDocentePayload, validatePayload y
validateManualBancoDocentePayload del banco. La función obligatoria solo se exporta;
su cuerpo y sus llamadas activas permanecen iguales. Rechaza datos manuales inválidos
antes de reservar. Comprueba que el contexto nativo sea la normalización del formulario
y que el comando Auth tenga sus mismos datos de identidad/contacto, fechas civiles,
nombre, opciones y territorial. El servicio no consulta el catálogo: requiere el
snapshot territorial confiable del llamador, como el coordinador anterior.

## Reserva y preparación recuperables

Migración RUND **013**, posterior a 008–012, agrega identidad_solicitud con siete
columnas: actor UUID, solicitud UUID, intención UUID única generada por servidor,
origen CREAR_MODAL, huellas de comando/contexto y fecha de creación.
La clave es (actor, solicitud), no documento, correo, posición de fila o hash de
formulario. Dos operaciones explícitas pueden tener el mismo formulario sin compartir
intención; el mismo UUID en dos actores tampoco comparte estado.

1. Valida y captura un contexto independiente de las referencias del llamador.
2. Inserta la reserva en autocommit; una colisión de la misma clave recupera el vínculo.
3. Exige ambas huellas iguales; contenido distinto devuelve 409 sin reemplazarlo.
4. Prepara journal, contexto y decisión con la intención reservada, sin HTTP.
5. Confirma que contexto/decisión existan con la huella esperada antes de devolver LISTA.

No hay FK a 008 porque la reserva debe sobrevivir a una caída anterior a su creación.
La intención única es reservada localmente antes de cualquier solicitud al propietario.
Un trigger impide adoptar journals anteriores; otros validan comando, contexto, actor
y creación manual al insertar sus registros vinculados. Las intenciones de los puntos
anteriores, que aún no tienen solicitud, mantienen su contrato. UPDATE/DELETE de la
reserva se rechazan; repetir 013 no fabrica vínculos para el historial ni cambia IDs.

consultar(solicitudId, actorId) devuelve solo metadatos del vínculo y preparación:
PENDIENTE si falta contexto/decisión, LISTA si ambos están persistidos. No hace HTTP
ni completa la preparación automáticamente. Una solicitud ajena/ausente devuelve 404.
Las fechas conservan seis decimales PostgreSQL. No devuelve formulario o resultado nativo.

LISTA significa contexto preparado; no significa permisos concedidos, prevalidación
Auth, reserva de identidad, perfil creado, correo enviado o ejecución permitida.
Un aborto previo permanece ABORTADA aunque se prepare otra vez. La confirmación
nativa y sus recibos siguen en el ejecutor, sin decisiones implícitas nuevas.

## Reintentos y fallos

- Fallo de reserva: no crea journal/contexto ni solicita identidad.
- Fallo posterior: conserva la reserva y, si ya existe, el journal PREPARADA. Otro
  proceso completa el mismo ID; no crea una intención nueva por timeout.
- Solicitudes simultáneas iguales convergen en vínculo, UUID Auth y fechas.
- Respuesta perdida: consultar o preparar de nuevo con el mismo contexto recupera
  el vínculo. Si ya se confirmó el perfil, preparar no vuelve a escribirlo.
- El contexto incluye la auditoría congelada. No reconstruir datos variables como
  IP/fecha de auditoría al reintentar: recuperar sus metadatos originales. Un contexto
  reconstruido diferente produce 409; la futura entrada debe conservar esta distinción.

La reserva del punto 71 contiene solo IDs, huellas y códigos. 009 continúa guardando el contexto
privado según su contrato; no exponerlo en logs o respuestas de negocio.

El punto 72 agrega [captura privada y entrada manual protegida](CONTRATO-ENTRADA-MANUAL-IDENTIDAD-RUND.md).
014 añade dos columnas nullable a esta tabla; las entradas nuevas sí conservan el
formulario y contexto privados para recuperarlos antes de completar 009. El registro
del punto 71 permanece válido con ambas columnas null; no se reconstruye su captura.
La ruta nueva reutiliza este preparador, conserva la auditoría original y prevalida
Auth de nuevo en cada POST. Sigue desconectada de AppModule y no ejecuta identidad.

## Validación y conexión pendiente

Pruebas con reglas manuales reales, PostgreSQL/TypeORM y APIs Auth reales en bases
ficticias separadas. Concurrencia, reserva/contexto fallidos, respuesta perdida,
consulta por actor, cambio de contenido, restricciones SQL y repetición de migración.
Un fixture ejecuta explícitamente la intención preparada y comprueba la recuperación
sin repetir identidad/perfil; el servicio de solicitudes por sí solo no ejecuta nada.
Evidencia: [validacion-solicitud-identidad-rund.json](validacion-solicitud-identidad-rund.json).

AuthIdentityRequestModule importa el ejecutor y continúa fuera de AppModule. Las
entradas activas y su transacción/correo se conservan. Ambas banderas Auth siguen
apagadas por defecto. No hay migración automática o aplicación a bases existentes.

Sigue conectar la entrada manual con su sesión/permisos, origen confiable, catálogo,
prevalidación Auth y recuperación del contexto, conservando el ID desde el cliente.
Después, cubrir edición/lotes/autogestión con sus soportes/OTP y definir el cierre de
altas/revisiones, preview sin escritura remota, correo durable y aceptación por ambiente.
Este vínculo no completa esas integraciones ni certifica despliegue.
