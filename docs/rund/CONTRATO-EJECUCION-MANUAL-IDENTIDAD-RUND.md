# Ejecución manual autorizada y cliente con solicitud estable

Punto 73. Añade ejecución explícita y recibo recuperable a la entrada manual del
punto 72. El módulo continúa fuera de AppModule y el cliente nuevo no está montado
en el formulario activo. Ambas banderas Auth permanecen false por defecto.

## Ejecución por solicitud y actor

En el mismo prefijo banco-docentes/identidad/solicitudes-manuales se declaran:

| Método | Ruta | Efecto |
|---|---|---|
| POST | /:solicitudId/ejecutar | Body vacío. Ejecuta la captura propia con controles vigentes. |
| GET | /:solicitudId/ejecucion | Consulta el recibo mínimo propio sin aplicar identidad. |

Se conservan JWT, no-store y la alternativa por roles de gestión o permiso manage
del modal. El actor procede de la sesión, nunca del body. No se admite intencionId,
contexto, autorización o nuevo formulario en ejecutar. Otra sesión recibe 404 y
una solicitud histórica sin captura no se ejecuta. La escritura requiere además
expiración JWT numérica y vigente; un token sin exp no autoriza esta nueva operación.

AuthIdentityManualExecutionService consulta el vínculo por actor/solicitud. Si ya
existe commit nativo devuelve su recibo sin prevalidar, aplicar identidad o escribir
perfil otra vez. El permiso/sesión sigue siendo obligatorio para recuperar ese hecho.
ABORTADA devuelve 409 y no se reactiva. Las demás solicitudes recuperan y prevalidan
su captura usando el servicio del punto 72 antes de ejecutar.

El ejecutor del punto 66 incorpora ejecutarConControles, con callbacks exclusivamente
servidor antes de registrar en Auth, aplicar identidad y confirmar RUND. ejecutar
conserva su comportamiento previo delegando sin callbacks. Después de un callback
asíncrono se vuelve a comprobar el aborto antes de la mutación Auth; el commit
nativo mantiene su exclusión SQL con ABORTADA.

En cada checkpoint se comprueba expiración y, para roles normales, se consultan
permisos frescos al propietario, sin reutilizar el snapshot del guard de esa petición.
Un grant perdido o consulta de permisos fallida deniega con 403; sesión vencida, 401.
Los roles de gestión conservan su autorización por rol existente. También se comprueba
la expiración tras esperar la consulta de permisos y la autorización antes de devolver
el resultado final o recuperar un commit concurrente.

Son comprobaciones previas, no una transacción distribuida de permisos: una revocación
posterior al último checkpoint puede coincidir con una escritura ya en vuelo. No se
mantienen transacciones SQL durante HTTP ni se afirma atomicidad entre propietarios.
La aceptación operativa debe conservar estas reglas y las exclusiones del ejecutor.

## Pendientes y recibos

Si se pierde permiso/sesión después de Auth aplicado, el perfil no se confirma desde
ese checkpoint. Queda AUTH_APLICADA/PREPARADA y la siguiente sesión autorizada puede
reanudar con los mismos IDs sin volver a aplicar identidad. Un fallo de la transacción
nativa también conserva el aplicado y revierte perfil/auditoría/marcador juntos.
No se aborta, cancela o compensa automáticamente como reacción al error.

Si otro proceso ya confirmó mientras prevalidábamos, el servicio recupera ese recibo
después de reautorizar. Respuesta perdida después del commit: GET o repetir ejecutar
devuelve el mismo recibo sin nuevo POST de identidad. Una ausencia remota desactualizada
puede producir 503 mientras otro proceso avanza; se consulta/reintenta explícitamente
el mismo ID, sin bucles de escritura automáticos.

El DTO tiene nueve campos: solicitudId, intencionId, estado, decisionNativa, estadoAuth,
estadoNativo, docenteId, confirmadaEn y correo. Estado PENDIENTE/ABORTADA/CONFIRMADA;
docente y fecha solo aparecen en CONFIRMADA. No expone formulario, identidad, cuenta,
contraseña, contexto o resultado nativo completo. correo=PENDIENTE no acredita envío
ni encolado; el correo durable sigue pendiente antes de activar esta ruta. Los errores
de infraestructura conservan el 503 genérico de la frontera del punto 72.

## Cliente preparatorio

RundManualIdentityClient usa el transporte/auth existente con rutas RUND, sin fallback
a PTA o al escritor activo. No está importado por rundApi ni por el modal actual.
Ofrece iniciar, preparar, reanudar, ejecutar, consultarEjecucion y cerrar.

- Conserva un UUID de solicitud en sessionStorage, separado por actor, antes de HTTP.
  El navegador no guarda formulario, JWT o credenciales en esa clave. Recargar permite
  recuperar el mismo ID y reanudar desde la captura del servidor sin formulario.
- Timeout, 401, 403, 409, 503 o respuesta parcial no borran la reserva ni generan otro
  UUID. Si storage falla, no se inicia HTTP. No se crea un ID al intentar recuperar
  una solicitud inexistente en el navegador.
- Desactiva retries, refresh automático, logs de error privados y toast automático
  para estas llamadas. Un nuevo intento o reautenticación es explícito con el mismo ID.
- Doble clic en ejecutar comparte una petición en curso. Valida el recibo estricto,
  IDs, estados y fecha UTC de microsegundos; respuesta parcial/ajena no fabrica éxito.
- Solo cerrar con un recibo CONFIRMADA coherente y la misma solicitud retira la clave,
  después de terminar la petición. PENDIENTE/ABORTADA no se cierran como éxito.

La integración visual debe conservar el formulario original mientras prepara y usar
recuperación por ID después de una respuesta incierta. El helper no monta pantallas,
cambia el POST actual o habilita automáticamente la escritura remota.

## Validación y siguientes pasos

Pruebas backend y frontend, compilaciones y PostgreSQL/TypeORM con HTTP Auth/RUND
reales sobre datos ficticios separados. Revocación antes/después de registrar/aplicar,
JWT vencido durante HTTP, fallo nativo, concurrencia, respuesta perdida, recuperación
y permisos para recibos confirmados. Gateway sin cuerpos privados. Cliente con storage,
recarga, doble clic, fallos de red y DTO incoherente; TypeScript/build MFE completos.

Evidencia: [validacion-ejecucion-manual-identidad-rund.json](validacion-ejecucion-manual-identidad-rund.json).

Siguen montaje del cliente en el modal con su ciclo de recuperación, política de
altas/cierre de revisiones, correo durable y preview sin escritura remota. Edición,
lotes y autogestión necesitan controles/origen propios, incluyendo soportes, sugerencias
y OTP. La activación requiere aceptación por instalación. Sin nuevas migraciones,
variables, .env, Compose, bases existentes, push, despliegue o retiro del RUND de PTA.
