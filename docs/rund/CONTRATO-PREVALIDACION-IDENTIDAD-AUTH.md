# Prevalidación de identidad en Auth para el traslado de escrituras RUND

Estado: contrato v1 implementado y probado localmente; uso en los flujos de escritura
pendiente. Complementa los puntos 60 y 61 del estado de migración.

La API confirma únicamente la resolución de persona/cuenta, conflictos de correo y
selección del rol docente. La validación completa del payload, el OTP, los soportes y
las reglas de negocio de RUND permanecen en sus flujos actuales.

## Solicitud interna

`POST /internal/rund/v1/personas/escritura/validar`

Requiere `x-internal-service-token` de Auth. Un JWT de usuario no sustituye esta
credencial y el gateway bloquea la ruta interna. No admite claves adicionales.

```json
{
  "version": 1,
  "operacionId": "11111111-1111-4111-8111-111111111111",
  "documento": "00123456",
  "correo": "persona@example.test",
  "resolverPorCorreo": false
}
```

- El servidor RUND debe crear y conservar el ID de operación. No se debe tomar de un
  body público como prueba de autorización. En este corte el cliente se prueba aislado;
  no existe todavía un coordinador que cree/persista esos IDs en los flujos actuales.
- Documento es texto no vacío. La comparación conserva BTRIM, eliminación de puntos y
  UPPER de la escritura anterior. No se convierte a número ni se pierden ceros.
- Correo es el valor ya normalizado a minúsculas y sin espacios exteriores que produce
  RUND. El contrato rechaza valores sin normalizar. No sustituye la validación de email
  del payload de alta/edición ni acredita que exista un buzón o que se haya verificado.
- resolverPorCorreo es booleano interno. Solo debe habilitarse desde el contexto de
  autogestión verificado. La API no valida OTP ni autoriza la operación por ese flag.

## Respuesta

HTTP 200, `Cache-Control: private, no-store`. En Auth se incluye el envelope habitual
`{success:true,data:...,timestamp:...}`. El contenido de data es:

```json
{
  "consulta": {
    "version": 1,
    "operacionId": "11111111-1111-4111-8111-111111111111",
    "documento": "00123456",
    "correo": "persona@example.test",
    "resolverPorCorreo": false
  },
  "resultado": {
    "personaId": null,
    "usuarioId": null,
    "rolDocenteId": "22222222-2222-4222-8222-222222222222",
    "coincidencia": "ninguna",
    "conflictoCorreo": false
  },
  "huella": "sha256 hexadecimal de 64 caracteres",
  "reserva": false
}
```

La huella de este ejemplo es descriptiva. Se calcula sobre UTF-8 de JSON.stringify del
array, en este orden: version, operacionId, documento, correo, resolverPorCorreo,
personaId, usuarioId, rolDocenteId, coincidencia, conflictoCorreo. UUID, texto, booleanos
y null conservan sus tipos. El cliente verifica echo, estructura, consistencia y huella.

| Campo | Significado |
|---|---|
| personaId | UUID elegido por documento; solo si no existe y el flag interno lo permite, por email. Null indica que no se encontró en ese snapshot. |
| usuarioId | Primera cuenta de la persona seleccionada, incluso inactiva; null si no existe. |
| rolDocenteId | Rol por code o name DOCENTE, con prioridad por code como en la escritura actual. Incluye inactivos; null si no existe. |
| coincidencia | documento, correo o ninguna. La persona por documento tiene prioridad. |
| conflictoCorreo | Correo de otra persona/username o username sin persona; se conserva la regla previa, incluidos propietarios null. |
| huella | Vincula esa consulta a ese resultado. No es firma, autorización, versión completa de filas ni garantía de concurrencia. |
| reserva | Siempre false: no hay reserva de identidad/correo, IDs o rol. |

La selección se ejecuta en una sola sentencia SELECT con CTEs, bajo el snapshot de esa
sentencia. Conserva los LIMIT 1 y prioridades anteriores; no agrega desempates que antes
no existían. No devuelve nombres, documento de la fuente, passwords, hashes de contraseña
ni filas completas. No solicita bloqueos explícitos, consume secuencias, guarda recibos o altera filas.
Cambios posteriores a la consulta pueden invalidar el resultado.

Body incompatible produce 400; falta de token, 401; configuración interna ausente, 503.
Un fallo de base produce error HTTP y no una ausencia confirmada. La falta de rol y los
conflictos son resultados explícitos de la prevalidación, sin declarar aprobada el alta.
El cliente transforma HTTP no exitoso, ruta 404, errores de red/JSON o contrato alterado
en 503. Usa token Auth/común, plazo de diez segundos, sin redirects, JWT, cookies,
credenciales PTA/JWT_SECRET, caché o fallback SQL.

## Reintentos y recuperación

Repetir una prevalidación vuelve a consultar Auth. El mismo ID puede producir la misma
huella si el resultado no cambia, o una distinta si cambia persona/cuenta/rol/conflicto.
No se guarda historial de operaciones. No se puede usar esta API para averiguar si una
escritura remota anterior se confirmó.

| Situación | Comportamiento actual / requisito antes de trasladar escrituras |
|---|---|
| Timeout/404/contrato parcial en prevalidación | Error 503; no confirmar ausencia ni iniciar una escritura basándose en esa respuesta. |
| Conflicto o rol ausente | Resultado del snapshot; el ejecutor futuro debe aplicar las mismas reglas de rechazo de negocio. |
| Nueva escritura concurrente después de prevalidar | Volver a validar al ejecutar; la huella no reserva ni protege esos datos. |
| Respuesta perdida después de una futura escritura Auth | Exige recibo persistido y consulta por ID de operación. Aún no implementados. No se debe volver a crear identidad a ciegas. |
| Reutilizar ID con otro comando de escritura | El protocolo futuro debe rechazarlo mediante una huella persistida del comando completo; la huella de esta consulta no cubre todo el payload. |
| Fallo tardío de perfil, soporte, auditoría u OCR | Hoy revierte la transacción local. El protocolo remoto debe coordinar confirmación/recuperación y evitar entregar éxito parcial. |
| Reversión ante cambios ajenos | Requiere control de versión/estado; no borrar cuentas ni restaurar campos que haya modificado otra operación. |
| Previsualización XLSX | Debe seguir sin persistencia remota. Validar identidad no reemplaza la prueba de perfil, evidencias y soporte ni sus savepoints actuales. |

Este contrato es la primera parte del traslado. La escritura actual sigue en la misma
transacción Auth/RUND del punto 60. Quedan por implementar recibos idempotentes, consulta
de estado, reintentos/recuperación, coordinación con RUND y validación completa del comando.
No existe todavía una transacción distribuida ni un mecanismo de compensación activo.

No agrega variables ni migraciones. Auth puede incorporar esta ruta sin cambiar los
consumidores actuales. Antes de conectar RUND a ella, desplegar primero Auth compatible.
La aceptación de instalaciones y el traslado de escrituras siguen pendientes.
