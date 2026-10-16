# Abandono seguro previo a reservar identidad

Punto 76 del frente 4. Extiende el ciclo manual de los puntos 74–75 sin activar
el módulo o el escritor remoto.

## Frontera deliberada

Una solicitud cuyo journal de identidad ya fue reservado puede tener una petición
Auth en vuelo aunque su estado local sea PREPARADA. Su ausencia en Auth observada
por GET tampoco prueba que no vaya a registrarse después. Este punto no libera
esas solicitudes ni interpreta un aborto local como cancelación remota.

Solo se admite abandono cuando no existe rund.identidad_operacion para la intención
de esa solicitud. Puede no haber captura o existir una captura privada cuyo proceso
falló antes de reservar el journal. La captura existente se conserva inmutable.
El ID anterior queda cerrado de manera durable y una corrección empieza con otro
UUID únicamente después de comprobar ese cierre en el servidor.

## Migración 015 y exclusión SQL

rund.identidad_abandono_manual registra actor, solicitud y fecha. No contiene
formulario, identidad o credenciales. No tiene FK a captura porque también cierra
IDs que nunca llegaron al servidor. No permite UPDATE o DELETE.

La inserción del abandono, la captura inicial y la primera reserva del journal usan
el mismo pg_advisory_xact_lock calculado sobre actor/solicitud. Después de adquirirlo
se comprueba el estado correspondiente dentro de PostgreSQL:

- Si gana el abandono, una captura o reserva tardía con el mismo ID falla. Las
  comprobaciones previas de la aplicación no sustituyen esta barrera SQL.
- Si gana una captura sin journal, el abandono posterior puede cerrarla y se
  impide reservar una operación después.
- Si gana la reserva del journal, el abandono falla con P7601, traducido a HTTP 409.
  PREPARADA, AUTH_REGISTRADA, AUTH_APLICADA, CANCELADA y un commit conocido conservan
  su operación; ninguno se borra ni se libera mediante este endpoint.
- Las inserciones rechazadas por abandono usan P7602. La preparación tardía puede
  devolver el 503 genérico de su frontera HTTP; conserva el ID y no crea journal.
- Los bloqueos de preparación/commit nativo existentes permanecen intactos. El
  advisory lock nuevo no se añade a actualizaciones de journal/contexto/ejecución,
  evitando invertir esos bloqueos. No se mantiene un bloqueo SQL durante HTTP.

Las consultas tempranas del servicio de entrada devuelven 409 al preparar/reanudar
una solicitud ya abandonada. Las capturas guardadas siguen disponibles para revisión
autorizada. El contexto nativo requiere un journal por sus FK existentes.

La migración es repetible y no modifica filas históricas. Agrega una tabla: el
esquema RUND ficticio contiene 34 tablas y siete categorías, sin copiar docentes.
Debe instalarse antes de habilitar el módulo manual. No se ejecutó en bases
existentes ni implica activar flags, rutas o workers.

## API protegida

POST /banco-docentes/identidad/solicitudes-manuales/:solicitudId/abandonar acepta
únicamente body vacío. GET /:solicitudId/abandono recupera el recibo. Ambos conservan
JWT, rol o manage del banco y no-store. Actor y expiración son los de la sesión;
no admite actor, motivo, formulario o autoridad del navegador.

Se exige exp finito/vigente. Roles GESTION_PROFESORAL/SUPER_ADMIN/ADMIN conservan
la autorización existente por rol; otros roles consultan manage vigente en Auth
antes y después del trabajo, sin caché del guard. Una revocación o vencimiento
posterior al commit puede impedir entregar el recibo; otra sesión autorizada lo
recupera con el mismo ID. Estos controles no son atomicidad distribuida de permisos.

El recibo tiene exactamente solicitudId, estado=ABANDONADA y puedeIniciarOtra=true.
Un 404 de consulta no acredita abandono. Repetir POST/GET conserva la misma marca
y fecha. Otro actor no consulta ese recibo; el mismo UUID en otro espacio de actor
no adopta la captura anterior. Errores de infraestructura se sanitizan como 503.
El servicio no llama aplicar, cancelar, compensar, abortar, confirmar perfil o correo.

## Navegador y corrección

Abandonar solicitud abre una confirmación visual específica. El POST no retira el
UUID del navegador. Consultar abandono permite recuperar su respuesta perdida.
Iniciar otro registro exige un GET válido de abandono y verifica que no cambió el
pendiente antes de retirarlo. No acepta un recibo elegido por el llamador. Luego
abre el formulario vacío; el siguiente preparar genera el UUID nuevo.

Mientras haya ejecución en vuelo no se abandona ni libera el ID desde el cliente.
Un 401/403/404/409/503, DTO parcial, error de storage o GET fallido conserva la
reserva. No hay retries, refresh, logs privados, eliminación de captura del servidor
o fallback al escritor anterior. Abandonar no llama onSaved ni anuncia un docente
creado. La instancia del cliente debe permanecer estable durante la apertura.

## Lo que sigue pendiente

Las solicitudes con journal reservado requieren un cierre autenticado que use las
garantías existentes de aborto/cancelación/compensación y permita resolver una
identidad aplicada. Ese circuito no se habilita por este punto; la UI conserva el
ID y permite recuperar la solicitud. Se necesita esa resolución antes de permitir
una corrección de solicitudes ya avanzadas.

También continúan principal confiable del shell, correo durable, política/cierre
de altas y revisiones, preview sin escritura remota, otros canales, consumidores
históricos, integración PTA/Programación y aceptación por instalación. Los módulos
preparatorios siguen fuera de AppModule y ambas banderas Auth false por defecto.
