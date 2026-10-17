# Diagnóstico autorizado y política conservadora de correo

El punto 86 agrega la [decisión separada de omisión](CONTRATO-OMISION-CORREO-IDENTIDAD-RUND.md).
Este diagnóstico conserva su DTO y describe vigencia/evidencia; para conocer el
bloqueo administrativo se consulta `/omision`. Una recomendación o vigencia positiva
no sustituye ese recibo ni rehabilita un aviso omitido.

Punto 85. El diagnóstico distingue avisos no intentados, rechazos de vigencia,
ausencia de respuesta, resultados observados y revisión/cierre. Solo lee. No envía,
reserva, concilia, registra casos o cierra revisiones. Se añade al módulo opcional
`AuthIdentityMailReviewModule`, que continúa fuera de AppModule.

## Consulta explícita

`POST /banco-docentes/identidad/correos/revisiones/por-intencion/:intencionId/diagnosticar`,
con cuerpo vacío. POST permite solicitar explícitamente la consulta propietaria de
vigencia sin introducir llamadas Auth en los GET o el polling existentes.

Requiere JWT verificado, cuenta UUID, exp numérica finita vigente y manage efectivo
o la alternativa vigente por roles de gestión. Un token interno, permiso afirmado
en el JWT/body o permiso view no sustituyen esos controles. Cuenta, roles y exp
proceden de sesión. Se comprueban antes de leer y antes de entregar el resultado.
Revocación, caída del servicio de permisos o expiración durante la consulta impiden
entregar el diagnóstico. No hay atomicidad con cambios posteriores al último control.

La respuesta tiene `private, no-store` y diez campos:

| Campo | Contenido |
|---|---|
| version | 1 |
| intencionId | Identificador del aviso |
| estadoCorreo | Estado actual leído del outbox |
| diagnostico | Clasificación de la tabla siguiente |
| motivoVigencia | Motivo propietario del rechazo o null |
| casoId | Caso existente de 018 o null |
| cierreRegistrado | Existe un recibo compatible de 019 |
| requiereIntervencion | La recomendación requiere actuación/revisión |
| siguientePaso | Recomendación operativa; no ejecuta ni autoriza la operación |
| permiteReenvio | Siempre false |

No devuelve intento, destinatario, documento, mensaje, comando, contexto, contraseña,
hash, credenciales o excepción privada. `requiereIntervencion` corresponde a este
diagnóstico operativo; no reemplaza `requiereRevision` de los DTO anteriores.

## Clasificación y siguiente paso

| Evidencia | Diagnóstico | Recomendación |
|---|---|---|
| PENDIENTE con vigencia positiva | VIGENCIA_CONFIRMADA_AL_CONSULTAR | VALIDAR_AL_ENVIAR |
| PENDIENTE con rechazo explícito | VIGENCIA_RECHAZADA | REVISAR_VIGENCIA |
| PENDIENTE sin respuesta fiable de vigencia | VIGENCIA_NO_CONFIRMADA | RESTABLECER_CONSULTA_AUTH |
| ENVIANDO sin journal | SIN_RESULTADO_OBSERVADO | REGISTRAR_REVISION o CONTINUAR_REVISION si existe caso |
| ENVIANDO con ACEPTADO | ACEPTACION_PENDIENTE_CONCILIAR | CONCILIAR_RESULTADO |
| ENVIANDO con INCIERTO | INCERTIDUMBRE_PENDIENTE_CONCILIAR | CONCILIAR_RESULTADO |
| INCIERTO sin journal | RESULTADO_INCIERTO | REGISTRAR_REVISION o CONTINUAR_REVISION si existe caso |
| INCIERTO con journal | RESULTADO_INCIERTO | CONTINUAR_REVISION si existe caso; REVISION_OPERATIVA en otro caso |
| ENVIADO sin journal histórico | ENVIADO_SIN_RESULTADO_REGISTRADO | REVISAR_HISTORICO |
| ENVIADO con ACEPTADO y caso sin cerrar | ACEPTACION_REGISTRADA | CERRAR_REVISION |
| ENVIADO con ACEPTADO, sin caso o con cierre compatible | ACEPTACION_REGISTRADA | NINGUNO |

Los rechazos conservan los motivos propietarios OPERACION_NO_ELEGIBLE,
IDENTIDAD_NO_VIGENTE o CREDENCIALES_NO_VIGENTES. No se confunden con caída, ruta
ausente o contrato incompleto de Auth. Un error de vigencia no se considera rechazo
explícito. Un fallo al confirmar permisos, en cambio, deniega la petición con 403.

El POST anterior de revisión solo abre casos nuevos sin resultado. El punto 87
añade una [entrada explícita para INCIERTO registrado y conciliado](CONTRATO-REVISION-RESULTADO-INCIERTO-RUND.md),
reutilizando el mismo caso con la ampliación SQL 021. REVISION_OPERATIVA conserva su
código y puede conducir a esa entrada; con caso se recomienda CONTINUAR_REVISION.
No permite el cierre de aceptación de 019 ni presenta la incertidumbre como resuelta.

## Reglas de seguridad operativa

- ENVIANDO puede seguir en vuelo. La ausencia de resultado no afirma fallo, rechazo
  o abandono del proveedor, y nunca autoriza reenviar. No hay umbral de tiempo que
  lo convierta en PENDIENTE.
- INCIERTO tampoco acredita que el proveedor no recibió el mensaje. Se conservan
  aviso, intento, resultado e historia; no se reinician ni se generan credenciales.
- Un resultado registrado se puede proyectar con el conciliador existente, de forma
  explícita y sin SMTP. El diagnóstico no llama al conciliador.
- La aceptación registrada permite el cierre separado del punto 84, con su autorización
  y responsable propios. No acredita lectura o entrega final al destinatario.
- Una vigencia positiva es puntual. No autoriza enviar desde este recibo, cambiar el
  destinatario o compartir credenciales históricas. El consumidor existente vuelve
  a consultar Auth antes de reservar el primer intento. `permiteReenvio:false` no
  elimina ese primer envío explícito ya previsto; impide deducir un reenvío del diagnóstico.
- Rechazos o fallos de vigencia mantienen PENDIENTE sin intento. Se revisa el estado
  con su propietario; no se toma el snapshot como alternativa, se regenera contraseña,
  se activa la cuenta o se corrige identidad automáticamente.

## Consistencia y compatibilidad

Para PENDIENTE se verifican elegibilidad local, contexto/comando y sus huellas, alta
de cuenta y operación. Auth se consulta sin caché/retry fuera de una transacción SQL.
Después se relee la proyección local: si cambió durante esa consulta, responde 409
para repetir el diagnóstico, sin entregar la vigencia del estado anterior.

Para los otros estados solo se lee evidencia RUND; no se consulta vigencia Auth ni
SMTP. El permiso efectivo puede seguir requiriendo Auth según el rol. Las relaciones
caso/cierre/journal deben corresponder al mismo intento; inconsistencias producen 503.
Las lecturas no bloquean consumidores o resultados tardíos. El diagnóstico describe
el momento observado; no ofrece una garantía distribuida hasta un envío futuro.

Entrada inválida: 400; sesión inválida/vencida: 401; permiso no confirmado: 403;
aviso inexistente: 404; cambio local durante Auth: 409; SQL/contexto incoherente o
proveedor opcional ausente: 503 genérico. Ausencia de una tabla requerida también
falla de forma segura. El contrato de GET de correo anterior sigue independiente.

Se conservan consumidor, conciliador, apertura/asignación/cierre, sus seis rutas,
DTO/paginación previos, frontends, Auth, gateway productivo y migraciones 001–019.
No hay migración nueva, worker, cron, timer, polling o activación. Las pruebas usan
PostgreSQL temporal y servicios ficticios; no se leen .env reales o usan bases existentes.

## Pendientes antes de activar

La política conservadora y el diagnóstico quedan implementados. La resolución durable
de rechazos de vigencia y de incertidumbres con resultado registrado, su eventual
interfaz operativa y el intervalo Auth–SMTP siguen abiertos. No existe recibo consultable
del proveedor actual o idempotencia SMTP que permita garantizar reenvíos sin duplicación.
Siguen otras entradas/propietarios y aceptación por instalación del mapa de independencia.
