# Entrada opcional de revisiones con sesión verificada

Punto 90. Conecta la [bandeja del punto 89](CONTRATO-BANDEJA-REVISIONES-CORREO-RUND.md)
con la [sesión de operador existente](CONTRATO-SESION-OPERADOR-MANUAL-RUND.md).
No agrega acceso al banco, menú o shell activos, ni activa módulos o banderas.

## Apertura y principal

`RundMailReviewWorkspace` recibe solo `enabled?: boolean`, false por defecto.
El actor no es una prop elegible por el llamador. Requiere sesión autenticada,
manage o alternativa vigente de gestión y conexión `manualOperatorSession` del
proveedor existente. Sin esos prerrequisitos no monta el componente conectado.
Con la opción ausente no monta suscripciones, resuelve la cuenta o consulta HTTP.

Montar o habilitar la entrada tampoco resuelve automáticamente el principal. Abrir
revisiones de correo invoca `useRundManualIdentitySession.resolve()`, que valida
versión/UUID de la cuenta resuelta y mantiene su protección de generación y cancelación.
No deriva actor desde persona, email o campos del formulario. El servidor conserva
la autoridad sobre JWT, expiración y permisos de cada petición.

Solo después de resolver se obtiene el cliente operativo estable mediante
`RundManualIdentityClient.operacionesCorreo()`. Se monta la bandeja habilitada
únicamente si sigue siendo el cliente de esa resolución. No hay consulta automática
de la lista o el detalle: el operador conserva sus botones explícitos del punto 89.
No se inicia, lee, cierra, sustituye o borra una solicitud manual almacenada.

Mientras resuelve, el botón de apertura está bloqueado y una referencia síncrona
impide duplicarlo. Una apertura correcta retira ese botón: no permite reemplazar
el cliente desde la entrada mientras la bandeja o su detalle operan.

## Cambio de sesión y recuperación

La conexión mantiene sus notificaciones existentes. Una notificación invalida el
cliente operativo propio, retira bandeja, filas, cursor y detalle, y permite abrir
de nuevo. El hook descarta su cliente manual y aborta la resolución pendiente.
La nueva apertura resuelve otra vez, incluso cuando se conserva el mismo UUID.
No reutiliza el cliente operativo invalidado ni espera una respuesta antigua para
permitir la nueva resolución.

Cada apertura tiene generación propia. Una respuesta o error anteriores no pueden
publicar otra cuenta, ocultar el estado ocupado de la nueva apertura o mostrar su
error. Cambiar el objeto de conexión desmonta el ámbito anterior y crea uno nuevo.
Se limpia la suscripción y se invalida solo el cliente que pertenece a esta entrada;
no se modifican clientes de otros formularios.

Revocar autenticación/permiso, deshabilitar, perder conexión o desmontar retira el
ámbito conectado e invalida su cliente. Restituir acceso exige una apertura explícita,
sin restaurar resultados. La limpieza funciona con el ciclo de efectos de StrictMode.
No guarda principal, filas o recibos en almacenamiento.

Los errores al resolver se muestran de forma genérica, sin mensajes privados ni
reintento automático. Se permite otra apertura explícita. No se presume cancelar
una escritura que ya llegó al servidor: sus recibos durables mantienen recuperación.

## Integración conservada y validación

Se reutilizan hook, fábrica, bandeja y panel reales sin cambiar sus implementaciones.
La bandeja conserva paginación, consulta actual del detalle, omisión prioritaria,
confirmaciones y restricciones de responsable. Mientras el detalle consulta/decide,
se bloquea la consulta del listado y su filtro. No hay envío o reenvío nuevos.

Pruebas React/jsdom en StrictMode con conexión/transporte simulados y clientes reales:
opción ausente, permisos, principal inválido, cuenta distinta de persona, almacenamiento
intacto, concurrencia, resolución/lista/decisión tardías, revocación, reconexión,
misma cuenta con cliente nuevo y desmontaje. Se ejecutan además suite del MFE,
TypeScript y build aislado con envDir vacío; el bundle activo conserva la ausencia
de rutas operativas y de la entrada opcional.

La conexión de esta entrada está preparada localmente. Sigue comprobar el recorrido
integrado con las rutas HTTP, permisos y recuperación antes de habilitarla, junto
con aceptación de navegador/instalación. Las pruebas de transporte simulado no
sustituyen esa aceptación. Continúan resolución humana sin evidencia, otras
resoluciones de rechazos, intervalo Auth–SMTP y otros canales/propietarios.
No se declara independencia completa ni retiro de RUND de PTA.
