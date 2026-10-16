# Registro durable y reconciliación de identidad en RUND

Punto 64: base local de coordinación. No sustituye el escritor actual ni confirma el
commit nativo. Complementa los contratos de [operaciones](CONTRATO-OPERACIONES-IDENTIDAD-AUTH.md)
y [aplicación Auth](CONTRATO-APLICACION-IDENTIDAD-AUTH.md).

## Persistencia y alcance

La migración `backend/rund-service/db/migrations/008_rund_identidad_operacion.sql`
crea `rund.identidad_operacion`. Se aplica en la base de RUND, después de sus
migraciones anteriores; no agrega FK ni consultas a schemas ajenos. No se ejecuta
desde el arranque de la aplicación. Solo se probó en bases temporales ficticias.

Guarda intención UUID, operación Auth UUID, versión, huella del comando, estado,
fecha inicial y recibo Auth conocido. El UUID Auth lo genera el servidor y se
conserva aun al reiniciar procesos/conexiones. No guarda el comando completo,
contraseña o JWT. Un recibo aplicado sí puede contener diferencias de perfil con
datos personales para auditoría: su acceso queda reservado al coordinador servidor.
No agregarlo a respuestas públicas ni a logs al conectar consumidores.

El servicio/módulo es preparatorio. No está importado desde AppModule ni módulos
activos; no hay controlador HTTP, worker, tarea programada, nueva bandera o cambio
de configuración. RUND sigue funcionando con el escritor anterior sin requerir
la tabla 008. La bandera de aplicación Auth del punto 63 permanece apagada.

## Operaciones del servicio

| Método servidor | Comportamiento |
|---|---|
| `preparar(intencionId, comando)` | Valida el contrato/huella del punto 63 y persiste en autocommit el ID Auth antes de cualquier HTTP. No llama a Auth. |
| `consultar(intencionId)` | Lee exclusivamente el journal RUND. Intención desconocida produce 404. |
| `registrarEnAuth(intencionId)` | Usa el ID/huella ya persistidos, registra solo metadatos en Auth y conserva el recibo confirmado localmente. |
| `reconciliar(intencionId)` | Consulta al propietario y conserva su recibo confirmado. No registra, aplica o cancela automáticamente. |

El futuro coordinador debe generar y conservar una intención servidor por operación
de negocio; no deduplicar por documento, número de fila XLSX o ID enviado libremente
por un navegador. Repetir ID/comando conserva el UUID Auth y la fecha originales.
Otro comando para el mismo ID devuelve 409 sin contactar a Auth ni sobrescribir datos.
Falta conectar esa identidad estable a la solicitud de negocio real y su contexto
nativo de período, soporte, permisos y auditoría.

`preparar` usa el DataSource propio, sin aceptar outerManager: la intención debe
quedar confirmada antes de HTTP y sobrevivir al rollback de una transacción de negocio
posterior. No llamarla desde una transacción que bloquee ese mismo registro. El servicio
no persiste el comando: la recuperación de una aplicación ya confirmada no lo necesita;
retomar una aplicación pendiente requerirá el comando original y su misma huella.

## Estados y respuestas inciertas

| Estado local | Hecho confirmado |
|---|---|
| PREPARADA | Existe intención local; puede haber una solicitud remota todavía en vuelo. |
| AUTH_REGISTRADA | Auth confirmó su registro; no acredita identidad aplicada. |
| AUTH_APLICADA | Auth confirmó identidad y resultado; no acredita perfil/soporte/auditoría nativos. |
| CANCELADA | Auth confirmó cancelación de intención sin aplicación; no es compensación. |

La ausencia explícita con echo del contrato Auth solo devuelve
`consultaAuth=NO_ENCONTRADA` si la intención sigue PREPARADA. Es una observación, no
cancelación ni permiso para generar otro UUID. Si ya había recibo conocido, esa
ausencia produce 503 y conserva el registro. Ruta ausente, caída o contrato parcial
también fallan sin usar SQL alternativo, caché o reintentos automáticos.

Se hace HTTP antes de adquirir bloqueos locales. Después se bloquea el journal
FOR UPDATE en una transacción corta, con lock_timeout de cinco segundos. ID, huella,
versión y fecha original Auth deben coincidir con lo previamente conocido. El UPDATE
usa CTE/SELECT externo para mantener el formato de filas de TypeORM/PostgreSQL.

Una respuesta REGISTRADA iniciada antes puede llegar después del recibo final:
se conserva el estado final. Recibos iguales no actualizan filas ni fechas. Un
resultado aplicado diferente o estados finales contradictorios producen 503; otro
ID/huella produce 409. Los terminales son inmutables. Constraints y trigger impiden
borrar la intención, cambiar metadatos, retroceder o persistir recibos inconsistentes.
No existe TTL que permita reutilizar intenciones por accidente.

Si Auth confirma y se pierde la respuesta, o falla después la persistencia local,
la intención previa conserva el mismo ID. Una instancia nueva puede consultar a
Auth y completar el recibo local. Si también falla esa consulta, permanece pendiente;
no se confirma éxito, ausencia o cancelación por inferencia.

## Validación y trabajo siguiente

Pruebas con código compilado, cliente HTTP Auth real y TypeORM contra una segunda
base temporal que contiene RUND y carece del schema Auth. Rol efímero limitado al
journal, sin acceso al negocio ficticio. Se comprueban concurrencia, cierre/reapertura
de conexiones, respuesta perdida real, fallo de guardado local, datos contradictorios,
respuestas atrasadas, migración repetible y preservación del negocio.

Este corte no aplica/compensa identidades, confirma un commit nativo ni envía correo.
El siguiente debe vincular intención y contexto durable de negocio, validar fallos
tardíos, compensación segura y preview sin escritura remota, y confirmar el resultado
nativo junto a sus datos/auditoría. La activación requiere completar y aceptar esas
condiciones; la API Auth aplicada y el journal por sí solos no cierran la independencia.
