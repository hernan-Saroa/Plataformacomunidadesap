# Formulario manual con preparación, confirmación y recuperación

Punto 74 del frente 4. Extiende el cliente y la ejecución descritos en
[CONTRATO-EJECUCION-MANUAL-IDENTIDAD-RUND.md](CONTRATO-EJECUCION-MANUAL-IDENTIDAD-RUND.md).

`BancoDocenteEditModal` admite un `manualIdentityClient` opcional. El llamador
actual `BancoDocentesPTA` no lo proporciona. Sin esa prop se conserva la creación
actual; cualquier edición identificada por `docente_id` o `id` conserva su ruta,
soporte obligatorio, justificación, sugerencias y restricciones de datos sensibles.
No se habilita una bandera de ambiente ni se activa el módulo de servidor.

Para una creación con conexión explícita, el formulario conserva sus validaciones
y construcción de payload. Elimina actorId, soporteEdicionId, justificacionEdicion
y rundSuggestionIds antes de preparar. La entrada del servidor aporta actor,
roles, permisos y auditoría desde la sesión. No se usa userPersonId como actor del
cliente: ese valor puede identificar una persona diferente al principal JWT.
La futura conexión debe construir un cliente estable con el UUID del principal
autenticado y desmontar el diálogo al cambiar de sesión; no requiere leer el JWT
en el navegador. Este punto no añade ese principal al contrato del shell.

El ciclo visual tiene acciones separadas:

1. Preparar solicitud: valida el formulario, conserva su copia en memoria y usa
   el UUID que el cliente persiste antes de HTTP. No ejecuta identidad o perfil.
   Desde ese momento el formulario se sustituye por el diálogo de solicitud;
   no se puede sustituir la captura con otros datos bajo el mismo ID.
2. Confirmar creación: requiere preparación válida en esta apertura. Ejecuta una
   sola petición; errores retiran la confirmación disponible y conservan el UUID.
   No hay fallback a createBancoDocente ni actualización automática de sesión.
3. Consultar resultado: GET explícito, sin preparar ni ejecutar. CONFIRMADA solo
   se muestra tras validar el recibo del cliente. PENDIENTE y ABORTADA no se
   presentan como éxito. Un aborto impide recuperar preparación o ejecutar.
4. Recuperar preparación: sin ejecutar después. Con captura en memoria reenvía
   exactamente el mismo payload/ID; tras reabrir usa la captura del servidor por
   reanudar-preparacion, sin reconstruir formulario ni auditoría en el navegador.
5. Finalizar registro: solo después de CONFIRMADA, retira la reserva del navegador
   y llama onSaved. La interfaz informa que el correo de acceso sigue pendiente;
   no acredita envío ni encolado. Cerrar sin finalizar conserva la reserva.

Montar/reabrir no dispara HTTP. Un error 401/403/409/503, timeout o recibo incompleto
conserva el pendiente; el mensaje visible no reproduce errores privados. Datos
inválidos/bloqueo de sessionStorage detienen el flujo sin caer al escritor anterior.
Durante HTTP se bloquean acciones y cierre; el control de petición en memoria
también evita clics repetidos. Cambiar de instancia del cliente invalida ese diálogo
y descarta respuestas tardías; desmontarlo impide callbacks posteriores. El cliente
debe mantenerse estable durante toda la apertura.

Límites pendientes antes de activar:

- Un UUID persistido cuya captura no llegó al servidor no se elimina ni se cambia
  automáticamente. Mientras la copia sigue en memoria puede reenviarse; después de
  recargar sin captura remota, la recuperación requiere un procedimiento explícito
  de servidor. Lo mismo aplica a una captura incompatible que no puede corregirse
  bajo el mismo ID. Hace falta definir abandono/corrección seguros antes de habilitar.
- La revisión autorizada de la captura tras recarga, pendiente en el punto 74,
  se incorpora en el [punto 75](CONTRATO-REVISION-CAPTURA-MANUAL-RUND.md), con
  protección sensible vigente y confirmación visual explícita, sin activación.
- sessionStorage no constituye una bandeja durable entre dispositivos o sesiones
  del navegador. La idempotencia durable reside en el servidor.
- Correo durable, política/cierre de altas y revisiones, preview sin escritura remota,
  otros canales y aceptación por instalación continúan pendientes.

Las pruebas de este punto usan React, el formulario y cliente reales, con transporte
HTTP simulado y datos ficticios. Incluyen creación predeterminada, preparación sin
auditoría del navegador, edición con soporte/sugerencia, recuperación, doble clic,
errores de sesión/permiso y recibos. No certifican un navegador desplegado ni
reemplazan las pruebas PostgreSQL/HTTP de servidor documentadas en el punto 73.
