# Bandeja opcional de revisiones de correo

Punto 89. Prepara una entrada fuera del formulario de creación para la API del
[punto 83](CONTRATO-REVISION-CORREO-IDENTIDAD-RUND.md), reutilizando el
[panel por intención](CONTRATO-VISTA-OPERATIVA-CORREO-RUND.md). El componente no se
monta en el banco activo. No cambia backend, migraciones o decisiones disponibles.

## Entrada y autorización

`RundMailReviewInbox` recibe `client: RundMailOperationsClient` y `enabled?: boolean`,
false por defecto. Su llamador debe obtener el cliente estable mediante
`RundManualIdentityClient.operacionesCorreo()` después de resolver el principal
de cuenta verificado con la conexión de sesión existente. No se construye el actor
desde persona, email o un campo escrito por el operador. Esta entrega no incorpora
un llamador activo ni un acceso nuevo en el menú.

Montar el componente, habilitarlo o cambiar filtros no consulta la red ni resuelve
el principal. Requiere sesión autenticada y manage o alternativa vigente de gestión
para mostrar controles. El servidor conserva la autoridad sobre JWT, expiración y
permisos en cada petición. El actor del cliente no sustituye esa autorización.

## Consulta y paginación

Consultar desde el inicio hace GET a la ruta fija de revisiones con límite 25,
sin cursor. El filtro permite todas, pendientes de asignación o asignadas. No hay
filtro de cierre: los casos conservan su asignación aunque tengan recibo de cierre.
La lista incluye historial y no acredita recepción o lectura del correo.

Página siguiente reutiliza exclusivamente el cursor devuelto por el propietario.
Cambiar filtro descarta página, cursor y selección; requiere otra consulta explícita.
Consultar desde el inicio permite refrescar o volver al comienzo. No se conserva una
pila de páginas ni se presenta un total general. Es una lectura puntual, no una
instantánea: una asignación concurrente puede cambiar la pertenencia al filtro.

El cliente acepta únicamente límite entero 1–100, estado permitido y cursor opcional.
Transmite el límite como texto y omite estado/cursor ausentes. Rechaza otros campos.
La respuesta debe contener exactamente `casos` y `siguienteCursor`; cada caso conserva
los 12 campos del contrato anterior, sin datos personales adicionales.

Se comprueban máximo de filas, filtro, IDs únicos de caso/intención y orden estricto
por fecha UTC con seis decimales y UUID. No convierte la posición a milisegundos.
El cursor base64url canónico tiene como máximo 512 caracteres y exactamente versión,
fecha, caso y estado. Debe corresponder al filtro y al último caso de una página llena.
Toda página posterior debe avanzar respecto a su cursor de entrada. No se permite
cursor con página vacía, campos privados, posición ajena al último caso o ciclos.

## Detalle y decisiones

Ver gestión descarta la página y abre el panel por intención. Seleccionar una fila
no consulta el detalle ni ejecuta decisiones. El operador debe pulsar Consultar
gestión del correo para leer omisión, diagnóstico, caso y cierre vigentes, respetando
su precedencia. No se toman decisiones desde la observación anterior de la lista.

El panel conserva las confirmaciones y protección de otro responsable del punto 88.
Mientras consulta o decide, se bloquean filtro y consulta de la bandeja para no
desmontarlo a mitad de operación. Al terminar, volver a consultar la bandeja retira
el detalle. No se agregan envío, reenvío, aceptación SMTP o conciliación.

## Sesión, errores y límites

No hay caché, almacenamiento, polling, retries o refresh de autenticación automáticos.
Los errores son genéricos y no muestran mensajes privados del transporte. Fallar
retira la página previa y solo permite volver a consultar desde el inicio.

Cambio de cliente/conexión, notificación de sesión, revocación visual, deshabilitar
la entrada o desmontar descartan respuestas tardías y retiran datos y controles.
Se comprueba cancelación e invalidación incluso si el transporte ignora la señal.
Una escritura ya recibida por el servidor conserva sus recibos para recuperación.

Se valida con contratos/cliente, React/jsdom y transporte simulado, suite del MFE,
TypeScript y build aislado con envDir vacío. No equivale a aceptación de navegador
contra instalaciones reales. Continúan conexión/activación, resolución humana sin
evidencia, otras resoluciones de rechazos, intervalo Auth–SMTP, otros canales y
propietarios, y aceptación por ambiente. No se retira RUND de PTA.
