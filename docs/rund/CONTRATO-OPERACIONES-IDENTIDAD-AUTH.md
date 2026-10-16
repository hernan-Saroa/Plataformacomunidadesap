# Registro de intenciones de escritura RUND en Auth

Estado: registro implementado en el punto 62 y extendido en el 63 con la
[aplicación transaccional](CONTRATO-APLICACION-IDENTIDAD-AUTH.md), deshabilitada por defecto.
Sigue pendiente conectar y coordinar el escritor RUND con perfil, soporte, auditoría y OCR.

## Alcance y prerrequisito

Aplicar `db/migrations/669_auth_rund_identidad_operacion.sql` únicamente en la base de
Auth antes de usar estas rutas. La migración crea una tabla y protege sus transiciones;
no copia datos ni modifica personas/cuentas/roles. No se ejecuta desde el arranque de Auth.
Si no está instalada, los errores SQL no se interpretan como ausencia de operación.

Las rutas requieren el guard/token interno de Auth y quedan bloqueadas en el gateway,
incluso con JWT y token. No son rutas para el navegador. El cliente preparatorio de RUND
no se importa aún en módulos activos ni modifica el comportamiento de altas, edición,
autogestión, bulk o previsualización existentes.

## Identificador y huella

El coordinador servidor debe crear un UUID estable por intención y conservarlo durante
reintentos. Las rutas normalizan únicamente el UUID a minúsculas. La huella es una cadena
SHA-256 hexadecimal en minúsculas; el registro la trata como dato opaco. No recibe ni
almacena el comando completo, contraseña o JWT. El registro inicial guarda solo metadatos;
una aplicación confirmada agrega el resultado y sus diferencias de auditoría (punto 63).

La huella debe corresponder al comando completo, incluida su versión y contexto relevante,
no a la huella de prevalidación del punto 61. El ejecutor del punto 63 la recalcula
desde el comando validado y la compara con el registro. La canonicalización y el comando
completo están definidos en su contrato. El campo version=1
identifica esta versión del protocolo de registro; no acredita un payload de alta válido.

El token interno y el ID no sustituyen autorización, OTP, soporte o validación del actor.
Esas comprobaciones deberán mantenerse al conectar el coordinador futuro.

## Registrar

`POST /internal/rund/v1/personas/escritura/operaciones`

```json
{
  "version": 1,
  "operacionId": "11111111-1111-4111-8111-111111111111",
  "huellaComando": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
}
```

HTTP 200, sin caché. Repetir ID/huella devuelve el recibo persistido sin cambiar fechas.
Mismo ID/otra huella devuelve 409 y conserva el original. `ON CONFLICT DO NOTHING` evita
sobrescribir estado y resuelve registros simultáneos con una única clave primaria.
Un recibo cancelado o aplicado se devuelve en su estado final: registrar no lo reactiva.

Auth usa su envelope habitual. Para REGISTRADA/CANCELADA, `data.operacion` contiene:

```json
{
  "operacionId": "11111111-1111-4111-8111-111111111111",
  "version": 1,
  "huellaComando": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  "estado": "REGISTRADA",
  "registradaEn": "2026-10-15T00:00:00.000Z",
  "canceladaEn": null,
  "identidadAplicada": false
}
```

REGISTRADA y CANCELADA devuelven identidadAplicada=false. Con la extensión 670,
APLICADA devuelve identidadAplicada=true y agrega aplicadaEn/resultado; consultar o
registrar otra vez recupera ese recibo. Registrar nunca ejecuta el comando, reserva
documento/correo o valida conflictos de identidad.

## Consultar y recuperar una respuesta perdida

`GET /internal/rund/v1/personas/escritura/operaciones/:operacionId`

Siempre HTTP 200 para consulta válida, con echo y resultado explícito:
`{consulta:{operacionId},encontrada:true,operacion:...}` o
`{consulta:{operacionId},encontrada:false,operacion:null}`.

Si se pierde la respuesta de registro, consultar el mismo ID y comparar la huella antes
de continuar. Un nuevo cliente/proceso recupera el recibo desde PostgreSQL. No generar
otro ID para el mismo reintento. Tras una respuesta perdida de aplicación, el estado
APLICADA y su resultado confirman el commit Auth; REGISTRADA no confirma que una solicitud
en vuelo haya terminado. Consultar/reconciliar antes de continuar con el flujo nativo.

Un HTTP 404 de consulta indica ruta/contrato ausente; no confirma operación inexistente.
Una ausencia confirmada representa el momento de esa consulta; una solicitud anterior
en vuelo puede terminar después. El coordinador futuro debe reconciliar esa situación.

## Cancelar una intención existente

`POST /internal/rund/v1/personas/escritura/operaciones/:operacionId/cancelar`

Body exacto `{huellaComando:"..."}`. Compara ID, huella y estado registrado al actualizar.
HTTP 200 devuelve estado CANCELADA y su fecha; una repetición devuelve la misma fecha.
Huella diferente o recibo APLICADA devuelve 409. Operación no encontrada devuelve 404, sin fabricar un
recibo de cancelación. Un fallo o una ausencia no acreditan que una petición en vuelo
haya quedado cancelada. El coordinador futuro debe consultar/reintentar hasta confirmar.

La cancelación solo modifica metadatos de intención; no revierte persona/cuenta/rol ni
ejecuta compensaciones. Los constraints y el trigger impiden borrar recibos, cambiar
ID/versión/huella/fecha inicial o volver de CANCELADA a REGISTRADA. No existe TTL o purga
automática que permita reutilizar por accidente un ID antiguo.

## Transporte y aceptación pendiente

El cliente exige UUID, huella, versión, fechas y consistencia de estado; rechaza recibos
de otro ID/hash, campos adicionales o resultados aplicados incompletos. Conserva 409
como conflicto; los demás fallos de HTTP/red/JSON/contrato producen 503. No reintenta
automáticamente ni hace SQL, caché, redirects o forwarding de JWT/cookies. Usa URL/token
Auth existentes, token común como alternativa configurada y timeout de diez segundos.

La migración 669 se probó repetida sobre recibos existentes en PostgreSQL temporal. Las
pruebas verifican concurrencia, respuesta perdida después del commit, consulta por otro
cliente, cancelación, fallos de SQL/tabla ausente y preservación de personas, cuentas,
roles, perfiles, evidencias y secuencias. El rol de prueba solo tiene SELECT/INSERT/UPDATE
en el registro; carece de acceso a identidad. El clúster ficticio se elimina al terminar.

Para una instalación: migración 669 en Auth, Auth compatible y verificación de URL/token
antes de habilitar un consumidor. La escritura actual no utiliza estas rutas y conserva
su rollback local. Para aplicar, se requieren además 670 y la bandera específica,
según el contrato del punto 63. Aún falta coordinarlo con RUND, incluido tratamiento
de fallos tardíos y previsualización sin
persistencia remota. Esta entrega no certifica transacción distribuida ni compensación.
