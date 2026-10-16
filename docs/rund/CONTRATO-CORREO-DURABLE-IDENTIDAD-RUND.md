# Correo durable de la creación manual RUND

Punto 79. Outbox transaccional y consumidor servidor opcional. Sin activar el
formulario manual, el módulo de ejecución o un worker de correo.

## Registro del aviso

La migración `016_rund_identidad_correo.sql` crea `rund.identidad_correo`. El trigger
posterior a la confirmación nativa guarda un aviso de bienvenida en **la misma
transacción** que perfil, bloques, auditoría y recibo. Si falla el outbox se revierte
esa confirmación; Auth aplicado conserva su operación para recuperar el commit con
los mismos IDs. No hay HTTP o envío de correo en esa transacción.

Solo corresponde cuando la solicitud tiene captura manual original compatible,
actor/huella/contexto coincidentes, decisión EN_CURSO, commit nativo confirmado y
cuenta nueva acreditada por el recibo Auth y el resultado nativo. Las cuentas
existentes, lotes, autogestión, operaciones abortadas y escritor anterior no generan
esta bienvenida. No se reconstruye una solicitud desde identidad mutable o un formulario
nuevo del navegador.

La intención es la clave única del aviso. El outbox contiene tipo/versionado, estado,
fechas y UUID de intento; no duplica destinatario, documento, mensaje, contraseña,
JWT o cookie. El contexto servidor original ya conserva los datos de negocio privados.
La migración recupera únicamente confirmaciones elegibles anteriores sin aviso y
se puede repetir sin cambiar estados, recibos o reenviar. Su bloqueo de instalación
impide perder confirmaciones concurrentes durante el backfill; no se instala aquí en
bases existentes. Requiere las migraciones 008–015 previas.

## Intento durable

`AuthIdentityMailService` ofrece métodos internos `consultar` y `enviarPendiente`.
No tiene controlador, cron, timer de polling o import desde AppModule. No es una API
del navegador y no cambia las rutas manuales o sus recibos existentes.

| Estado | Significado y siguiente acción |
|---|---|
| PENDIENTE | Aviso durable sin intento reservado; permite un intento explícito del consumidor servidor. |
| ENVIANDO | Intento reservado y confirmado antes de HTTP; puede estar en vuelo o necesitar conciliación tras un reinicio/fallo. No se reclama automáticamente. |
| ENVIADO | El endpoint existente de notificaciones confirmó su respuesta contractual después del envío SMTP. No certifica recepción o lectura del buzón. |
| INCIERTO | No se pudo confirmar el contrato de envío; puede haber ocurrido el efecto remoto. Requiere revisión y no se reenvía. |

Un bloqueo de fila serializa consumidores de distintas instancias. El ganador
valida elegibilidad y contexto inmutable, genera un UUID de intento y confirma
ENVIANDO antes del HTTP. Los demás solo recuperan el estado. El fallo anterior a
esa reserva no inicia correo y conserva PENDIENTE para un intento explícito posterior.

Después del HTTP se registra ENVIADO o INCIERTO contra la misma intención e intento.
Si se pierde la escritura de ese recibo, queda ENVIANDO. No se reinicia por timeout,
lease, arranque de otra instancia, nueva consulta o repetición de ejecución nativa.
Los triggers impiden borrar avisos, cambiar su identidad o volver a PENDIENTE desde
un intento iniciado o terminal. El recibo interno mínimo contiene solo intencionId,
estado y requiereRevision; este último señala el estado INCIERTO conocido.

## Contrato de envío y compatibilidad

El adaptador usa `POST /api/v1/emails/send` del servicio de notificaciones existente,
con sus variables `NOTIFICATIONS_SERVICE_URL`/`NOTIFICATION_SERVICE_URL` y sus
destinos por defecto actuales. Conserva asunto y contenido de bienvenida, derivando
destinatario/usuario/documento/nombre únicamente del contexto servidor. El HTML
escapa los valores. La política vigente de Auth usa el documento para inicializar
la contraseña temporal; este corte no modifica cuentas o esa política, ni persiste
una segunda copia de la contraseña en el aviso.

Exige HTTP 201 y el recibo exacto `{message:'Correo enviado'}` del controlador
existente. Red, timeout, redirección, otro código, JSON inválido o recibo parcial
quedan inciertos. No reintenta, reenvía credenciales de sesión o registra cuerpo,
destinatario, errores remotos o parámetros SQL. El timeout limita la espera y no
demuestra que SMTP no aceptó el mensaje.

El endpoint actual de emails no ofrece idempotencia remota. Por eso esta base
garantiza un aviso y un intento local, **no entrega exactamente una vez**, y no
permite recuperar una respuesta perdida reenviando a ciegas. El proveedor SMTP
puede producir duplicados por causas propias; este consumidor no los controla.

El escritor activo, sus correos best-effort, Macro Docente, OTP y otros módulos de
notificaciones mantienen su implementación. Los endpoints manuales y el cliente
frontend conservan sus DTO actuales; `correo:PENDIENTE` sigue siendo un marcador
de compatibilidad y no prueba encolado o envío. El consumidor nuevo no está conectado
a ese flujo y el modal no se activa en este corte.

## Activación y pendientes

Antes de activar el consumidor se necesita consulta autenticada por actor y
presentación del estado de correo en el formulario, conciliación explícita de
ENVIANDO/INCIERTO, política de destinatario/credenciales si Auth cambió desde el alta
y aceptación del contrato con notificaciones por instalación. Un reenvío recuperable
necesitará un contrato propietario idempotente o una resolución operativa aprobada;
no se habilita reseteando la fila. No se afirma vigencia actual de una contraseña
derivada de un snapshot histórico.

También siguen los requisitos generales de aislamiento y activación del mapa de
pendientes. La migración se valida únicamente en PostgreSQL temporal; todas las
entregas de prueba terminan en un servidor ficticio loopback, sin SMTP real.
