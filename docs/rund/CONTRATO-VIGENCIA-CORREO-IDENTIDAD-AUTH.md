# Vigencia propietaria del correo de bienvenida RUND

Punto 81. Extiende el outbox del punto 79 y conserva la lectura por actor del 80.
La nueva consulta en Auth es de solo lectura; el consumidor RUND continúa opcional,
fuera de AppModule y sin worker, cron o activación del formulario manual.

El punto 82 incorpora [resultado observado y conciliación local](CONTRATO-CONCILIACION-CORREO-IDENTIDAD-RUND.md)
después del envío, sin sustituir esta validación previa o cerrar el intervalo Auth–SMTP.

## Consulta interna

`POST /internal/rund/v1/personas/escritura/operaciones/:operacionId/correo/validar`
usa el guard de token interno existente. JWT del navegador o ausencia de credencial
no lo sustituyen. La respuesta conserva `Cache-Control: private, no-store` y el
sobre habitual del interceptor Auth.

El cuerpo exacto contiene `comando` y `huellaComando`, con la misma canonicalización
del contrato de aplicación. El comando procede del contexto servidor inmutable,
nunca de una nueva dirección o contraseña enviada por el navegador. Auth recalcula
la huella y la contrasta con la operación persistida. ID/cuerpo inválidos: 400;
comando/huella distintos: 409; operación ausente: 404; error de lectura o comparación:
503 genérico, sin parámetros SQL, hashes, cuerpo privado o excepción original.

El resultado contiene solo `validacion` con estos cinco campos:

| Campo | Semántica |
|---|---|
| version | 1 |
| operacionId | UUID canónico de la operación consultada |
| huellaComando | Huella del comando acreditado |
| apta | true únicamente si se conserva el estado inicial compatible |
| motivo | null si apta; OPERACION_NO_ELEGIBLE, IDENTIDAD_NO_VIGENTE o CREDENCIALES_NO_VIGENTES en otro caso |

No devuelve email, documento, nombre, contraseña, hash, imágenes privadas o datos de
cuenta. Un rechazo explícito es HTTP 200 con apta false; no equivale a un error de
transporte ni a NO_APLICA del estado visual. No crea o modifica operaciones, efectos,
resoluciones, personas, usuarios, roles o avisos.

## Comprobaciones de Auth

- Operación APLICADA, huella y efectos privados coincidentes, cuenta nueva confirmada
  por el resultado y ausente de su preimagen. Una operación registrada/cancelada,
  cuenta existente, efecto incompatible o resolución de compensación/revisión impide
  acreditar vigencia.
- Persona y usuario originales siguen unidos a los IDs aplicados. Documento, correo
  de persona y username coinciden exactamente con el comando acreditado. El rol
  DOCENTE sigue asignado y activo. Otro propietario del correo/documento o un usuario
  distinto con ese username bloquean la consulta positiva.
- La revisión xmin de persona y cuenta coincide con la postimagen privada. Cualquier
  actualización posterior de esas filas requiere revisión, aunque reponga los mismos
  valores. Es una condición conservadora; una edición legítima puede bloquear la
  bienvenida hasta que exista una política explícita de resolución.
- La política actual del alta crea la cuenta **inactiva** y con password_temp true.
  Ambos valores deben conservarse. Auth compara el documento del comando contra el
  bcrypt actual, con el formato/coste inicial 10 del escritor vigente. Una cuenta
  activada, contraseña no temporal, hash incompatible o contraseña distinta no permite
  compartir las credenciales históricas. No se cambia la política de contraseñas.
- Una segunda lectura contrasta la imagen completa obtenida antes de bcrypt: un cambio
  de identidad, cuenta, rol, conflicto o resolución durante esa comparación impide
  devolver apta. No mantiene transacciones o bloqueos mientras calcula bcrypt.

Estas condiciones no convierten xmin en un historial duradero de credenciales ni
crean una garantía distribuida. La respuesta acredita una lectura puntual. Auth
puede cambiar después de la última lectura, antes de SMTP; siguen pendientes la
política operativa de ese intervalo y la aceptación antes de activar el consumidor.

## Uso en RUND

El consumidor verifica primero el aviso PENDIENTE, elegibilidad local y huella del
contexto/comando. Consulta Auth **fuera de la transacción RUND**, sin caché, retry,
redirección o reenvío de Authorization/cookie. El cliente exige HTTP 200 y cinco
campos exactos, versión, operación, huella y motivo coherentes. El destinatario no se
sustituye por datos mutables de Auth: si cambió, se bloquea el intento histórico.

Solo una respuesta apta permite abrir la transacción de reserva. Dentro de ella se
revalidan estado, elegibilidad y correspondencia del contexto, operación y huellas.
La fila bloqueada sigue serializando consumidores; un competidor que ya reservó
conserva su intento. ENVIANDO se confirma antes del HTTP de notificaciones, como en
el punto 79, y el mensaje mantiene su formato existente.

Rechazo, Auth caído, ruta ausente, JSON/contrato parcial, SQL o fallo previo a reservar
mantienen **PENDIENTE sin intento ni SMTP**. No se usa el snapshot como alternativa,
se modifica la cuenta, se regenera una contraseña o se inicia otro flujo. La revisión
y resolución durables de estos rechazos siguen pendientes; no se reintenta mediante
un timer. Un nuevo intento explícito vuelve a consultar al propietario.

ENVIANDO, ENVIADO e INCIERTO se recuperan sin llamar a Auth y sin otro envío. SMTP
incierto y fallo al persistir su recibo conservan las reglas del punto 79. Esta
consulta no es idempotencia SMTP remota, conciliación de intentos ni autorización
para restablecer un aviso a PENDIENTE. GET de estado por actor y su DTO no cambian.

## Validación y siguientes requisitos

Pruebas unitarias de servicio/Auth, cliente y consumidor; integración HTTP real con
servicios compilados y PostgreSQL temporal. El rol de consulta Auth solo tiene SELECT
en sus tablas, conexión readonly y ningún permiso sobre RUND; el consumidor utiliza
una base RUND separada sin schema Auth. Todo envío termina en un fixture loopback.

No hay migración nueva, cambio .env/Compose, SMTP real, despliegue o activación.
El siguiente punto es la conciliación explícita de ENVIANDO/INCIERTO, preservando la
prohibición de reenviar ante resultado desconocido. También siguen política de
rechazos, activación, otros canales y los cinco frentes del mapa de independencia.
