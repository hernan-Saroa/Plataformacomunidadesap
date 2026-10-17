# Conciliación local de resultados de correo RUND

Punto 82. Recuperación explícita del estado de un intento cuyo resultado sí se
alcanzó a registrar. Extiende los puntos 79–81; conserva el consumidor y el formulario
manual sin activar. No incorpora endpoints, polling, reenvíos o cambios en notificaciones.

El punto 83 agrega [casos explícitos de revisión sin resultado](CONTRATO-REVISION-CORREO-IDENTIDAD-RUND.md),
con sesión/manage y asignación de responsable. No modifica este conciliador ni
habilita cierre, aceptación manual o reenvío.

## Resultado observado

La migración `017_rund_identidad_correo_resultado.sql`, posterior a 016, crea
`rund.identidad_correo_resultado`. Guarda únicamente intención, UUID de intento,
resultado y fecha. No contiene destinatario, documento, nombre, mensaje, contraseña,
hash, JWT o cookie. No genera resultados retrospectivos para avisos anteriores.

| Resultado | Qué acredita |
|---|---|
| ACEPTADO | El adaptador confirmó el HTTP 201 y recibo exacto del contrato de notificaciones. No acredita entrega o lectura del buzón. |
| INCIERTO | El consumidor no pudo confirmar ese contrato; el efecto remoto puede haber ocurrido. No acredita rechazo ni permite repetir SMTP. |
| Ausencia de resultado | No hay hecho registrado para conciliar. Puede haber petición en vuelo, caída del proceso o pérdida del registro posterior al efecto remoto. |

Un trigger exige el mismo intento del aviso ENVIANDO y una fecha no anterior a su
reserva. El resultado es inmutable: no se cambia, borra, sustituye por otro intento
o agrega a un aviso pendiente/terminal para fabricar evidencia histórica.
La confianza procede del consumidor servidor que registra su observación; no es un
recibo verificable de forma independiente en el proveedor SMTP.

## Dos guardados después del intento

Antes de consultar Auth y reservar, el consumidor verifica que exista la tabla 017
y que su conexión tenga SELECT/INSERT. Falta de migración o permisos impide iniciar
el envío y conserva PENDIENTE sin intento. Se mantienen los controles de vigencia
de Auth del punto 81 y el commit de ENVIANDO antes de invocar notificaciones.

Después del HTTP se realizan dos transacciones locales independientes:

1. Registrar el resultado observado para la misma intención/intento. La fila del
   aviso se bloquea para serializar registros; una repetición idéntica recupera el
   registro y otra observación contradictoria se rechaza.
2. Proyectar ese registro al estado del aviso: ACEPTADO → ENVIADO; INCIERTO → INCIERTO.
   Si este segundo guardado falla, el primero permanece para conciliación explícita.

Ambas transacciones contienen solo SQL RUND. No mantienen bloqueos durante HTTP a
Auth/notificaciones ni modifican perfil, bloques, auditoría, identidad o credenciales.
Los permisos y la estructura reales deben verificarse por instalación antes de activar;
el control previo no garantiza que un SQL posterior nunca falle.

## Servicio de conciliación

`AuthIdentityMailReconciliationService` se proporciona en el módulo de correo
opcional. No está en AppModule y no importa clientes Auth/SMTP. Sus métodos internos
no se exponen a navegador o token interno mediante una ruta nueva.

`conciliar(intencionId)` bloquea el aviso y compara el registro con su intento. Solo
repara la proyección ENVIANDO cuando existe resultado observado compatible. Un
resultado ausente no modifica el estado: ENVIANDO sigue ENVIANDO y requiere revisión.
INCIERTO no se transforma en ENVIADO ni se restablece a PENDIENTE.

Los terminales históricos sin registro conservan sus estados; no se inventa un
resultado para completar la tabla nueva. Una contradicción de estado, intención,
intento o resultado falla con 503 genérico sin mutar datos. Aviso ausente: 404;
IDs/resultados inválidos: 400; registro de otro intento/resultado: 409.

El recibo propio tiene cinco campos: version 1, intencionId, estado,
resultadoRegistrado y requiereRevision. Este último es true para ENVIANDO o INCIERTO
en el diagnóstico de conciliación. ENVIANDO puede seguir en vuelo; revisión no lo
convierte en intento abandonado o fallido. No expone el UUID de intento, resultado
privado, fechas o contenido del correo.

La concurrencia entre conciliadores conserva un evento y las fechas terminales.
Si el conciliador proyecta mientras el consumidor termina, este recupera el terminal
compatible. Si SMTP sigue en vuelo sin resultado, la conciliación libera el bloqueo
y el consumidor puede registrar/proyectar normalmente después de su respuesta.

`enviarPendiente`, su recibo de tres campos, el GET por actor y el DTO visual de seis
campos conservan sus contratos. Consultar o repetir `enviarPendiente` sobre estados
iniciados/terminales no concilia automáticamente, consulta Auth o inicia otro SMTP.

## Límites y activación

Si se pierde el proceso/respuesta antes del primer guardado, no hay evidencia para
resolver el envío. Esos casos siguen abiertos para revisión durable; nunca se deduce
aceptación o rechazo a partir del tiempo, el estado actual de Auth o un nuevo POST.
El proveedor actual carece de recibo consultable por intento/idempotencia remota.

El siguiente punto es registrar y gestionar la revisión de intentos sin resultado
observado, manteniendo la prohibición de reenviar ante incertidumbre. También siguen
la resolución de rechazos de vigencia y la política del intervalo Auth–SMTP, antes
de activar el consumidor o el formulario manual.

017 se ejecuta únicamente en PostgreSQL temporal para las pruebas. No se instala en
bases existentes ni se activan servicios, banderas, SMTP real o despliegues.
