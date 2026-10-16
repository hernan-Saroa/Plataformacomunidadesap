# Bandeja y asignación de revisiones de identidad RUND

Punto 70. Agrega seguimiento propio a las resoluciones REVISION_REQUERIDA del
[punto 69](CONTRATO-CONCILIACION-COMPENSACION-RUND.md). Preparación desconectada de
AppModule: no activa escritura remota ni cambia las entradas actuales del banco.

## Caso durable y migraciones

RUND **012_rund_identidad_revision.sql**, posterior a 008–011, crea
`rund.identidad_revision`. Su FK apunta únicamente a la resolución local de RUND.
Cada intención tiene un caso con UUID estable, fecha de creación y estado. No
copia documentos, correos, identidad, comandos, credenciales o imágenes privadas Auth.

El trigger de 011 crea el caso al insertar REVISION_REQUERIDA en la misma
transacción que su recibo local. Si falla el caso, tampoco se confirma ese recibo;
el resultado Auth se recupera por GET y se guardan ambos después. COMPENSADA no
genera casos. La migración incorpora revisiones anteriores una sola vez, con la
fecha de persistencia del recibo, y repetirla conserva casos y responsables.

| Estado del caso | Significado |
|---|---|
| PENDIENTE | Caso registrado sin responsable. |
| EN_REVISION | Un usuario autorizado lo asumió; guarda su UUID y fecha de servidor. |

La única transición es PENDIENTE → EN_REVISION. PostgreSQL protege IDs y fecha de
creación y rechaza borrados, cierres, reasignaciones o fechas de asignación ajenas
a la transacción. No existe decisión de negocio para cerrar el caso en este corte.
El UUID del responsable es una referencia a Auth; no añade una FK entre propietarios.

## API preparatoria protegida

AuthIdentityReviewModule declara estas rutas bajo
`banco-docentes/identidad/revisiones`, sin alias PTA. Solo se importa/exporta desde
el ejecutor desconectado. Ninguna queda publicada por el servicio activo.

| Método | Ruta | Efecto |
|---|---|---|
| GET | raíz | Lista casos con cursor, límite y filtro de estado. |
| GET | /:casoId | Consulta el caso y los IDs/huellas/motivo de su resolución. |
| POST | /:casoId/asumir | El usuario de la sesión asume un caso pendiente. Body vacío; devuelve 200. |

Todas usan JwtAuthGuard y PermissionsGuard, con el permiso existente
`banco-docentes.rund.manage` y las reglas de superadministración del banco. El
permiso de un rol normal se consulta a Auth; declararlo en el body o en los claims
de permisos no lo concede. La consulta fallida a Auth deniega el acceso. Un token
interno de servicio no sustituye el JWT del operador. Respuestas `private, no-store`.

El actor sale del subject firmado de la sesión (con los alias existentes del
guard); debe ser UUID. El solicitante no puede elegir responsable, estado o fecha.
Una sesión sin actor válido recibe 401; body con campos, 400; sin permiso, 403.
Caso ausente, 404; caso ya asumido por otro, 409. Asumir usa bloqueo de fila y
lock_timeout de cinco segundos. Repetir con el mismo actor devuelve el caso
original sin actualizar su fecha. Dos actores simultáneos tienen un solo ganador.

La bandeja devuelve `casos` y `siguienteCursor`. Límite por defecto 25, máximo 100;
filtro opcional PENDIENTE/EN_REVISION. Orden por fecha de creación y UUID, sin
OFFSET. El cursor base64url versionado conserva los seis decimales de PostgreSQL,
incluye el filtro y rechaza cambios de filtro o datos inválidos con 400. Es una
posición, no un permiso; cada petición vuelve a pasar por los guards. La paginación
no congela una instantánea: una asignación concurrente puede sacar un caso del
filtro PENDIENTE, como corresponde a una bandeja viva.

## Pendiente y recuperación

consultar del ejecutor agrega `casoRevision: {casoId, estado}` o null. Requiere
012 para esta consulta preparatoria; los flujos activos no usan sus tablas nuevas.
Una asignación conserva `resolucionAuthPendiente=true` y
`revisionAuthRequerida=true`, así como ABORTADA, AUTH_APLICADA y PREPARADA nativa.
No compensa identidad, borra cuentas, reanuda la intención, confirma perfil o envía
correo. No modifica el recibo propietario Auth ni el journal aplicado original.

Respuesta perdida después de asignar: GET o repetir con el mismo operador recupera
el caso sin segunda actualización. Fallo de actualización: responsable y fecha se
revierten juntos. El UUID permite seguimiento sin copiar datos personales de Auth.

## Validación y alcance pendiente

Pruebas unitarias, compilaciones, gateway y PostgreSQL temporal ficticio con
TypeORM, JWT, guards y permisos Auth HTTP reales. Incluye concurrencia, revocación
del grant con el mismo JWT, Auth caído/parcial, asignación ajena, respuesta perdida,
rollback, migración repetida, backfill, precisión de microsegundos y restricciones
SQL. Evidencia: [validacion-revision-identidad-rund.json](validacion-revision-identidad-rund.json).

Siguen pendientes la política y resolución explícita de altas/revisiones, la unión
de la intención estable con las entradas reales y sus permisos/OTP/prevalidación/
soportes, preview sin escritura remota, correo durable y aceptación por instalación.
Asignar un responsable no resuelve esa política. Ambas banderas Auth permanecen
apagadas; migraciones sin ejecución automática. Sin bases existentes, .env reales,
push, despliegue o retiro del RUND embebido de PTA.
