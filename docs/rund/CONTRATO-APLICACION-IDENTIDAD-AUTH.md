# Aplicación transaccional de identidad RUND en Auth

Punto 63: implementado y validado localmente. El cliente es preparatorio y no está
conectado al escritor activo de RUND. `RUND_IDENTITY_APPLY_ENABLED` está deshabilitada
por defecto; solo el valor `true` habilita la ruta, incluso con token válido.

## Prerrequisitos y ruta

Aplicar en orden las migraciones 669, 670 y 671 en la base de Auth, publicar Auth compatible
y comprobar URL/token internos. Las migraciones no se ejecutan desde el arranque del
servicio. La 670 agrega resultado/aplicada_en y la transición REGISTRADA → APLICADA.
El punto 68 agrega captura privada atomica de preimagen/efectos y resolucion propietaria:
[CONTRATO-COMPENSACION-IDENTIDAD-AUTH.md](CONTRATO-COMPENSACION-IDENTIDAD-AUTH.md).
Solo se probaron en PostgreSQL temporal; no se modificaron bases ni configuraciones
de instalaciones. No habilitar el ejecutor en los ambientes hasta validar el coordinador.

`POST /internal/rund/v1/personas/escritura/operaciones/:operacionId/aplicar`

Requiere el guard/token interno existente, no JWT de navegador. El gateway bloquea la
ruta normal y codificada. Responde HTTP 200 con envelope Auth, `data.operacion` y no-store.
Body exacto `{comando,huellaComando}`. El comando versión 1 contiene:

```json
{
  "version": 1,
  "actorId": "11111111-1111-4111-8111-111111111111",
  "payload": {
    "documentNumber": "FICTICIO",
    "documentType": "CC",
    "primer_nombre": "ANA",
    "primer_apellido": "PRUEBA",
    "segundo_apellido": null,
    "genero": "F",
    "fechaNacimiento": "2000-02-29"
  },
  "options": {"relaxValidation": false, "preserveTerritorial": true},
  "territorial": null,
  "emailFinal": "ficticio@example.test",
  "phoneFinal": null,
  "finalFullName": "ANA PRUEBA"
}
```

Solo se admiten esas claves y tipos. Las fechas civiles son YYYY-MM-DD válidas o null;
el correo llega normalizado y la seccional, si existe, es `{id: "bigint textual"}`.
Se rechazan campos extra, NUL y números territoriales fuera del rango PostgreSQL bigint.
Auth reconstruye los objetos en orden fijo, JSON.stringify y SHA-256 hexadecimal.
Auth y RUND mantienen el mismo contrato sin importaciones entre servicios. El orden
de claves recibido no altera la huella; actor, opciones y todos los valores sí cuentan.
La huella debe coincidir tanto con el body como con el recibo registrado previamente.

El comando es para un coordinador de confianza: actorId no demuestra autorización y
relaxValidation no acredita OTP. El futuro consumidor debe conservar permisos, OTP,
validaciones, soporte y auditoría antes de llamar a esta API. No se admiten contraseña,
rol arbitrario, SQL, nombres de tablas ni opciones de conexión en el body.

## Commit, resultado y reintento

Una transacción Auth adquiere bloqueo asesor remoto y bloquea el recibo FOR UPDATE.
Si está REGISTRADA, ejecuta las reglas de persona/cuenta/rol y guarda APLICADA, resultado
y fecha y captura preimagen/postimagen en la misma transacción. Un fallo en cualquier
paso, incluida la captura, revierte todas esas filas.
Las secuencias PostgreSQL pueden avanzar aun con rollback; no se promete revertirlas.
La huella diferente o estado CANCELADA devuelven 409; recibo inexistente, 404.
La bandera apagada devuelve 503 sin consultar la base.

El adaptador conserva el SQL del escritor local: resolución por documento/email,
unicidad de correo, territorial preservada, actualización de perfil/username y rol
DOCENTE. Una cuenta nueva queda inactiva, con contraseña temporal basada en documento
y bcrypt costo 10, compatible con bcryptjs del flujo previo. Las cuentas existentes
conservan contraseña, activación y condición temporal. No envía correos ni escribe RUND.

Un recibo aplicado tiene los siete campos base del registro y agrega:

```json
{
  "estado": "APLICADA",
  "identidadAplicada": true,
  "canceladaEn": null,
  "aplicadaEn": "2026-10-15T00:00:00.000Z",
  "resultado": {
    "personaId": "11111111-1111-4111-8111-111111111111",
    "usuarioId": "22222222-2222-4222-8222-222222222222",
    "usuarioCreado": false,
    "camposModificados": ["nom_largo"],
    "cambios": {"nom_largo": {"anterior": "ANA", "nuevo": "ANA PRUEBA"}}
  }
}
```

El resultado permite recuperar la auditoría original; puede contener datos personales
anteriores/nuevos del perfil. Está protegido por token interno en Auth, sin caché ni
contraseña/hash/JWT. No se persiste el comando completo. No publicar el resultado en
logs ni incorporarlo a respuestas públicas al conectar el coordinador.

APLICADA y CANCELADA son inmutables. Si la operacion ya fue COMPENSADA, volver a aplicar
devuelve 409. En los demas casos, aplicar otra vez el mismo ID/comando devuelve el
resultado original sin ejecutar SQL de identidad; GET y registro repetido también lo
recuperan. Cancelar una aplicación devuelve 409 y no simula compensación. Una carrera
aplicar/cancelar admite un solo estado final. Si se pierde la respuesta tras commit,
consultar el mismo ID y reutilizarlo; no crear otro ID. REGISTRADA/ausencia representan
una observación, no la cancelación de una solicitud todavía en vuelo.

El cliente verifica estado, fechas, ID/huella y resultado estricto: UUID, booleano y
lista de cambios conocida con diferencias anterior/nuevo. No confirma DTO parcial,
datos ajenos o claves sensibles. Conserva 409; otros fallos de transporte/contrato
producen 503 sin reintento automático, caché o sustitución por SQL.

## Límite de esta entrega y siguiente punto

El bloqueo asesor serializa estos ejecutores remotos entre sí, con lock_timeout de
cinco segundos. El punto 68 agrega bloqueos de tabla durante captura/restauracion para
excluir otros escritores Auth y comprobar revisiones. El escritor
activo de RUND y su rollback permanecen intactos; el cliente aún no se importa allí.

Antes de sustituir ese escritor faltan coordinación durable con el commit nativo,
fallos tardíos, reconciliación/compensación segura, envío de correos posterior al commit
y preview sin escritura remota. Una API Auth aplicada no confirma perfil, soporte,
auditoría o validación documental RUND. La activación conjunta por ambientes queda
pendiente y el RUND embebido de PTA se conserva.
