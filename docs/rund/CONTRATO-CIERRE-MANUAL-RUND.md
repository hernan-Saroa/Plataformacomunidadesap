# Cierre autenticado de solicitudes con operación reservada

Punto 77 del frente 4. Complementa el abandono previo al journal del punto 76.
El módulo manual continúa fuera de AppModule y el llamador activo no proporciona
manualIdentityClient. Las banderas Auth permanecen false por defecto.

## Entrada y autorización

POST /banco-docentes/identidad/solicitudes-manuales/:solicitudId/cerrar acepta body
vacío. GET /:solicitudId/cierre solo consulta hechos locales. Ambos usan JWT,
las reglas vigentes de rol o manage del banco y Cache-Control: private, no-store.
No aceptan actor, intención, comando, motivo o permisos del navegador.

AuthIdentityManualCloseService exige UUID del principal y exp finito/vigente.
Roles GESTION_PROFESORAL/SUPER_ADMIN/ADMIN conservan la autorización por rol; otros
roles consultan manage vigente en Auth. Se comprueba autorización al entrar,
antes de preparar contexto parcial, antes de abortar, antes del registro/cancelación
Auth, antes del POST de compensación y antes de entregar el resultado. No utiliza
los permisos cacheados del guard. No hay atomicidad distribuida frente a una
revocación posterior al último control.

La búsqueda se limita a actor y solicitud. Otro actor/ausencia: 404. Sin captura o
sin journal: 409, con el abandono previo como circuito distinto. Un perfil confirmado
no puede cerrarse, abortarse o compensarse desde esta ruta: POST devuelve 409 y
GET informa CONFIRMADA, sin liberar el ID. La consulta del recibo de ejecución
permite finalizar ese registro por el circuito anterior.

## Secuencia reanudable

1. Verifica la captura inmutable y su intención. Si un fallo dejó solo el journal
   PREPARADA, reconstruye contexto/decisión mediante execution.preparar usando la
   captura servidor original, sin catálogo, formulario nuevo o prevalidación de
   escritura. Un contexto ausente tras publicación remota no se inventa: conserva
   el error y requiere recuperación específica.
2. Confirma el aborto nativo irreversible con CANCELACION_SOLICITUD y los bloqueos
   ya existentes. Un aborto anterior conserva su motivo. Si gana un commit nativo,
   no se revierte el perfil ni se solicita compensación.
3. resolverAbortoConControles concilia el propietario, registra el mismo UUID si
   todavía consta ausencia y cancela una operación registrada. Las comprobaciones
   de servidor preceden a REGISTRAR_AUTH y CANCELAR_AUTH. Un 409 de cancelación
   se resuelve por el recibo propietario; no acredita cierre por sí mismo.
4. Si Auth ya aplicó identidad, resolverConControles concilia una resolución o
   solicita explícitamente compensación, con otro control antes del POST. Auth
   conserva su política existente: ediciones seguras pueden COMPENSADA; altas,
   cambios posteriores u otras situaciones incompatibles, REVISION_REQUERIDA.
5. Persiste los recibos con las garantías previas. REVISION_REQUERIDA crea el caso
   durable por el trigger existente. Solo una cancelación o compensación confirmada
   con aborto y ausencia de commit permite indicar CERRADA.

Los métodos anteriores resolverAborto y resolver delegan sin callback y conservan
su comportamiento. Los callbacks son funciones internas de servidor, nunca body.
No hay SQL Auth en RUND ni transacciones locales durante HTTP. No se envía correo,
confirma perfil, elimina persona/cuenta o cierra automáticamente una revisión.

Un timeout, fallo local, revocación o sesión vencida conserva solicitud/intención/
operación. Puede quedar aborto con cancelación/compensación pendiente; otra petición
autorizada retoma el mismo ID. Las respuestas perdidas tras commit Auth se concilian
por GET, sin repetir los efectos. No se compensa al fallar una ejecución habitual;
se requiere esta acción explícita de cierre.

## Recibo limitado

La respuesta tiene nueve campos: solicitudId, intencionId, estado, estadoAuth,
decisionNativa, estadoNativo, resolucionAuth, casoRevisionId y puedeIniciarOtra.
No contiene identidad, formulario, comando, hashes internos o auditoría.

| Estado | Significado | Otra solicitud desde este cierre |
|---|---|---|
| PENDIENTE | No hay aborto/cierre confirmado | No |
| ABORTADA | Se impide commit nativo; falta resolución propietaria | No |
| CERRADA | Aborto sin commit y CANCELADA, o aplicado con COMPENSADA | Sí |
| REVISION_REQUERIDA | Resolución propietaria con caso durable pendiente | No |
| CONFIRMADA | El perfil ganó su commit; recuperar recibo de ejecución | No |

GET no registra, cancela o compensa y un estado local pendiente no afirma que
Auth no haya avanzado. CERRADA y REVISION_REQUERIDA conocidas se recuperan sin
volver a pedir cambios a Auth, manteniendo la autorización vigente. Un estado
incoherente o revisión sin caso durable falla con 503; la frontera HTTP sanitiza
errores privados de infraestructura.

## Ciclo visual opcional

Cerrar operación requiere confirmación específica, que informa del aborto y de
la posible compensación/revisión de identidad. Consultar cierre permite recuperar
una respuesta perdida sin POST automático. El cliente valida claves exactas y
coherencia de los estados; el ID solo se retira tras un GET CERRADA válido, sin
ejecución en vuelo ni cambio de pendiente durante la consulta.

Una revisión muestra su caso y conserva la solicitud. No ofrece Iniciar otro
registro. Un cierre CERRADA permite abrir formulario vacío con UUID nuevo en el
siguiente preparar. Estas acciones no llaman onSaved ni anuncian un perfil creado.
Un CONFIRMADA consultado por cierre requiere consultar el recibo de ejecución
para finalizar por el circuito existente.

No hay retries, refresh, logs privados, almacenamiento de recibos personales o
fallback al escritor anterior. Revisión visual, cierre y abandono permanecen
opcionales en el modal; creación predeterminada, edición con soporte/sugerencias,
OTP, carga masiva y demás flujos activos conservan sus fuentes.

## Alcance restante

Este punto no define eliminación de altas de identidad, cierre humano de casos,
recuperación de contextos inconsistentes tras publicación ni una exclusión global
de toda solicitud nueva para la misma persona entre dispositivos. La política de
altas/revisiones sigue siendo requisito de activación.

Siguen principal confiable del shell, correo durable, preview sin escritura remota,
otros canales, SQL restante entre propietarios, consumidores históricos,
PTA/Programación y aceptación por instalación. No requiere migraciones nuevas.
