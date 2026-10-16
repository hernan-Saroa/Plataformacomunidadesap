# Revisión autorizada de la captura manual

Punto 75 del frente 4. Complementa
[CONTRATO-FORMULARIO-MANUAL-IDENTIDAD-RUND.md](CONTRATO-FORMULARIO-MANUAL-IDENTIDAD-RUND.md)
y mantiene la conexión opcional sin activar el escritor remoto.

## Lectura de servidor

`GET /banco-docentes/identidad/solicitudes-manuales/:solicitudId/captura` usa los
guards JWT y rol o permiso manage del banco, con `Cache-Control: private, no-store`.
El gateway conserva el prefijo `/rund/api/v1`. El módulo continúa fuera de AppModule.
No admite selección de actor, permisos o contexto mediante body o query.

AuthIdentityManualCaptureService exige un principal UUID y exp finito/vigente.
Conserva la política existente de autorización por GESTION_PROFESORAL, SUPER_ADMIN
o ADMIN; para otros roles comprueba manage por Auth antes y después de leer, sin
usar el resultado cacheado del guard o los permisos afirmados en el navegador.
Una sesión vencida devuelve 401; falta de permiso o consulta de permisos fallida,
403. Cada lectura vuelve a comprobar estas condiciones. Como en la ejecución,
son controles previos y no atomicidad distribuida frente a revocaciones posteriores.

La captura se busca exclusivamente por actor y solicitud. Otro actor o ausencia
devuelven 404; histórico sin captura, 409. Se reutilizan las verificaciones existentes
de formulario, envelope, actor, comando y contexto mediante sus huellas. Una captura
incoherente falla cerrada y los errores de infraestructura se entregan como 503
genérico, sin query o parámetros privados. La extracción de esa validación a restore
conserva el comportamiento de preparar/reanudar.

La respuesta contiene exactamente version=1, solicitudId, intencionId, campos y
proteccionDatos. campos es una lista blanca de 47 campos escalares normalizados del
perfil y la identidad solicitada. Muestra los valores efectivos de nombre, correo,
teléfono y territorial del contexto; incluye período, horas, formación, vinculación,
fechas y observaciones. No devuelve envelope, formulario original, rawPayload,
comando Auth, actor, roles, IP, IDs internos de persona/cuenta/territorial o auditoría.
CETAP no forma parte del perfil docente según la regla ya existente.

La protección sensible se calcula con los roles de la sesión actual, sin confiar
en fullAccess recibido ni en el acceso que tuvo quien capturó el formulario.
GESTION_PROFESORAL y SUPER_ADMIN conservan acceso completo; las demás sesiones
autorizadas, incluido ADMIN, reciben documento enmascarado y puntaje salarial null,
con los dos campos identificados como protegidos. Esta es la clasificación vigente
del banco; no pretende detectar información sensible escrita en cualquier texto libre.

Consultar no registra, prepara, aplica, cancela, compensa o confirma operaciones.
No envía correo ni consulta catálogo o prevalidación de escritura. Puede leerse la
misma captura después de un commit sin repetirlo. No requiere migraciones nuevas.

## Revisión en el formulario opcional

El cliente conserva el UUID existente y usa GET sin retries, refresh, logs de error,
toasts automáticos o caché. Valida versión, IDs, claves exactas, tipos escalares y
coherencia de los campos protegidos antes de mostrar la respuesta. No guarda esta
proyección en sessionStorage; permanece en memoria durante la apertura.

Preparar/recuperar solicita después la captura validada del servidor y comprueba
que corresponde a la misma intención preparada. Solo entonces habilita la revisión
visual. Confirmar creación exige marcar «He revisado los datos guardados de esta
solicitud». Repetir preparación o cualquier consulta reinicia esa marca; un error
retira la captura visible y la posibilidad de confirmar. No usa el formulario local
como sustituto cuando falla la lectura autorizada.

«Revisar datos guardados» permite leer la captura sin preparar o ejecutar. Esa acción
por sí sola no habilita escritura. «Consultar resultado» conserva la recuperación
de un commit mediante el recibo mínimo, sin exigir leer datos personales para
finalizar un resultado confirmado. La lectura no depende del estado actual del
proveedor de prevalidación de escritura, aunque siguen exigiéndose permisos vigentes.
Un cambio de instancia del cliente oculta la captura e invalida el diálogo; el
desmontaje descarta respuestas tardías. React representa los valores como texto.

La marca de revisión es un control de interfaz, no una aprobación durable del
servidor ni una firma. El endpoint de ejecución conserva su body vacío y las
autorizaciones del punto 73. La relación inmutable solicitud/intención/contexto del
servidor vincula la revisión con los datos de esa operación.

## Alcance restante

El llamador activo no proporciona manualIdentityClient y las banderas Auth
continúan false por defecto. La creación/edición actual, soportes, sugerencias,
OTP, carga masiva y escritores activos conservan sus rutas. No se modifica el
contrato del shell ni se asume que userPersonId sea el principal JWT.

Sigue pendiente definir la corrección o abandono seguro de una solicitud sin
captura remota, o cuya captura deba corregirse, sin perder operaciones en vuelo.
También faltan principal confiable en el shell, correo durable, política/cierre
de altas y revisiones, preview sin escritura remota, otros canales y aceptación
por instalación antes de activar. sessionStorage no es una bandeja entre dispositivos.

Las pruebas de UI usan transporte simulado. Las de integración usan JWT, guards,
TypeORM, PostgreSQL y HTTP reales con datos ficticios en clúster temporal separado;
no certifican despliegues ni bases existentes.
