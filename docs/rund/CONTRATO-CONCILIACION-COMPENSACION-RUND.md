# Conciliación durable de la compensación Auth en RUND

Punto 69. Preparación validada localmente; no activa las entradas reales o la
escritura remota. Complementa la compensación propietaria Auth (68), el aborto
irreversible (66–67) y el journal aplicado (64). No cambia sus recibos históricos.

## Registro local y requisitos

Migración propia RUND **011**, posterior a 008–010. Agrega
`rund.identidad_resolucion_auth`, con FK únicamente a la ejecución RUND, intención,
operación Auth, huellas de comando/contexto, estado/motivo, fecha local y recibo
mínimo Auth. No copia identidad, preimagen/postimagen o credenciales. Las ocho
claves del recibo deben coincidir con sus metadatos y estado; no admite claves extra.

El trigger de inserción bloquea journal, contexto y decisión en el mismo orden que
abortar/confirmar. Exige AUTH_APLICADA, ABORTADA, contexto PREPARADA e IDs/huellas
coincidentes. Rechaza resolución antes del aborto, después del commit nativo o para
una identidad no aplicada. UPDATE/DELETE se rechazan; repetir 011 no altera datos,
fechas o decisiones y no inventa resoluciones para contextos anteriores.

Auth requiere 669–671 y su API compatible. El ejecutor preparatorio RUND ahora
requiere 011 para consultar su estado ampliado. Los flujos activos siguen fuera de
ese ejecutor y no necesitan la tabla nueva para operar. No hay migración automática
en el arranque o cambios de .env/Compose. Ambas banderas Auth siguen false por defecto.

## Cliente entre servicios

`AuthIdentityCompensationClient` consulta y solicita resolución con el UUID Auth y
la intención/huella que RUND ya guardó:

- GET `operaciones/:operacionId/compensacion` valida consulta/encontrada/resolucion.
  Solo encontrada=false y resolucion=null con consulta exacta acredita ausencia.
- POST `operaciones/:operacionId/compensar` envía únicamente intención y huella;
  nunca genera otro UUID, envía prueba aportada por el llamante o acepta identidad.
- Valida ocho claves exactas, IDs/huella, versión 1, fecha ISO canónica, estado,
  motivo cerrado y booleano identidadRevertida coherente. COMPENSADA exige motivo
  null/booleano true; REVISION_REQUERIDA exige motivo conocido/booleano false.
- Usa AUTH_SERVICE_URL y AUTH_INTERNAL_SERVICE_TOKEN o INTERNAL_SERVICE_TOKEN.
  Solo token de servicio, sin JWT/cookies, redirects, caché o reintento automático;
  timeout de diez segundos. URL con credenciales/query/hash o protocolo ajeno falla.
- Un 409 POST conserva conflicto. 404, caída, error HTTP o DTO parcial/ajeno nunca
  se convierten en ausencia, revisión o compensación: producen 503 sin efectos locales.

Los endpoints Auth ya están protegidos y bloqueados por el gateway desde el punto
68; no se agregan rutas públicas, workers o excepciones de autenticación.

## Coordinación explícita

`AuthIdentityCompensationService` se registra en un módulo preparatorio importado
y exportado por AuthIdentityExecutionModule. Ambos siguen fuera de AppModule.

| Método servidor | Efecto |
|---|---|
| consultar(id) | Lee solo RUND: metadatos/estados, recibo local o null y fecha local. |
| reconciliar(id) | Exige aborto sin commit e identidad aplicada; GET Auth y persiste su recibo. No solicita compensación. |
| resolver(id) | Primero concilia; solo si no existe resolución solicita una compensación con el mismo UUID y guarda el recibo confirmado. |

Un recibo terminal local se recupera sin HTTP ni otra escritura. La ausencia
observada se vuelve a comprobar localmente antes de devolverla: una respuesta GET
antigua no borra el recibo que otra solicitud ya confirmó. No se infiere cancelación
de una solicitud en vuelo a partir de un GET sin resolución.

El HTTP termina antes de abrir transacciones RUND. Al persistir, se comprueban de
nuevo estados/huellas bajo los mismos bloqueos del aborto/commit, con lock_timeout
de cinco segundos. Un recibo idéntico se reutiliza; uno contradictorio no reemplaza
el ya guardado. La igualdad JSONB permite distinto orden de claves sin mutar el recibo.

El servicio no actualiza el journal AUTH_APLICADA, perfiles, auditorías de negocio,
contraseñas o roles. No hace SQL Auth, confirma commit nativo o envía correo.
resolverAborto del ejecutor conserva la cancelación de intenciones no aplicadas;
la compensación aplicada se solicita explícitamente mediante el servicio nuevo.
recuperar del ejecutor conserva su GET del recibo aplicado; la recuperación de la
resolución corresponde a reconciliar del servicio nuevo, sin mutación remota.

## Estado de ejecución y revisiones

consultar del ejecutor agrega resolucionAuth y revisionAuthRequerida. Los hechos
originales de decisión/commit/aplicación no se sobrescriben:

| Hecho durable local | resolucionAuthPendiente | revisionAuthRequerida |
|---|---|---|
| ABORTADA, sin resolución/cancelación confirmada | true | false |
| CANCELADA sin aplicar identidad | false | false |
| AUTH_APLICADA + COMPENSADA confirmada localmente | false | false |
| AUTH_APLICADA + REVISION_REQUERIDA confirmada localmente | true | true |

Una compensación confirmada conserva AUTH_APLICADA como historial y PREPARADA
nativa como ausencia de commit. El aborto sigue prohibiendo confirmar/reanudar la
intención. El indicador pendiente=false no acredita correo, perfil confirmado o
aceptación de despliegue. Una revisión sigue pendiente aunque resolver haya podido
guardar su recibo; reintentar devuelve esa revisión, sin pedir otra restauración.
El tratamiento humano de revisiones y la política de altas siguen pendientes.

El punto 70 agrega [caso durable, bandeja y asignación](CONTRATO-REVISION-IDENTIDAD-RUND.md).
Con 012, insertar una revisión crea su caso en la misma transacción; un fallo del
caso revierte también el recibo local y reconciliar permite recuperarlos. El
ejecutor agrega casoRevision y requiere 012 para su consulta preparatoria. Asumir
el caso conserva pendiente=true: no cierra la revisión ni modifica identidad. Los
flujos activos siguen fuera de estos módulos y no requieren sus tablas nuevas.

## Fallos y comprobaciones

Respuesta Auth perdida tras commit o fallo local al guardar: RUND mantiene pendiente
hasta consultar el mismo UUID, recuperar el recibo y persistirlo; no vuelve a pedir
compensación si GET ya la confirma. Pérdida de respuesta después de la persistencia
local: otra instancia recupera el recibo sin HTTP o nuevos efectos. Solicitudes
simultáneas conservan un recibo y las mismas fechas.

Validación con PostgreSQL/TypeORM y Auth/RUND por HTTP reales en bases temporales
ficticias separadas, sin schema Auth en RUND. Incluye restauración propietaria más
persistencia RUND, revisiones/altas, concurrencia, respuestas perdidas, fallo local,
ausencia retenida, DTO inválido, contradicción, restricciones SQL e inmutabilidad.
Evidencia:
[validacion-conciliacion-compensacion-rund.json](validacion-conciliacion-compensacion-rund.json).

Continúan la política y resolución explícita de altas/revisiones, entradas reales
con permisos/OTP/prevalidación/soporte e intención estable, preview sin escritura
remota, correo durable y aceptación por instalación. No se usan bases existentes o
.env reales ni se certifica activación; el RUND embebido de PTA se conserva.
