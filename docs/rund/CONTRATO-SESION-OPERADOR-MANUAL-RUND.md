# Sesión del operador para el cliente manual RUND

Punto 78. Preparación opcional, sin activar el escritor remoto ni sustituir el
formulario vigente. Complementa los contratos de formulario, captura y cierre manual.

## Fuente de identidad

El principal de una solicitud manual es la **cuenta** autenticada (`sub` del JWT),
distinta de `userPersonId`. El shell consulta bajo demanda el endpoint existente
`GET /auth/api/v1/me`, o `GET /me` de Auth en modo directo. Conserva la configuración
del gateway por instalación, incluidos sus prefijos; no introduce destinos nuevos.

La estrategia JWT existente verifica firma y vencimiento y devuelve `userId` desde
`sub`. `/me` mantiene guard y DTO; solo agrega `Cache-Control: private, no-store`.
El lector exige HTTP correcto y `userId` UUID; proyecta exclusivamente:

```ts
{ version: 1, actorId: 'uuid-de-la-cuenta' }
```

Usa la cookie HttpOnly enviada por el navegador, `credentials: include`, `no-store`,
límite de espera y cancelación. No consulta almacenamiento, caché offline, el usuario
cacheado del shell o eventos para reconstruir el principal. No decodifica JWT, añade
Authorization, acepta persona/email/id/sub como suplente, sigue redirecciones o
renueva/reintenta automáticamente. Errores HTTP, red, JSON, cancelación o DTO inválido
producen un error genérico. La petición específica evita los interceptores offline
del cliente HTTP general, sin cambiar su comportamiento para otros módulos.

La proyección sirve para seleccionar el espacio local de la solicitud. **No concede
permisos ni acredita una sesión vigente durante toda la operación.** `/me` conserva
las reglas existentes de JWT; no agrega una consulta de revocación o roles a la base.
Cada endpoint manual mantiene sus controles de servidor sobre sesión, vencimiento,
actor y autorización efectiva. El principal no se envía como autoridad en el body.

## Conexión y ciclo de vida

`RundShellModule` proporciona una conexión estructural opcional con `resolve` y
`subscribe`. Montar RUND no consulta Auth. Cambios en persona, email, roles o permisos
conservan el desmontaje del remote previo y descartan la conexión anterior. Cambiar
solo el nombre conserva el formulario habitual.

El evento existente `esap:auth-user-changed` únicamente invalida lecturas/clientes;
se ignora su contenido y no desencadena HTTP o remonta el formulario habitual.
Desmontaje, invalidación, cancelación y ciclos StrictMode descartan respuestas de
generaciones anteriores, incluso si un transporte tarda en respetar el aborto.
Un consumidor que falle al recibir la notificación no impide invalidar los demás.

`RundModulePremium` y `AuthProvider` propagan la conexión sin alterar autenticación,
roles, permisos o compatibilidad con consumidores anteriores. El hook opcional
`useRundManualIdentitySession` solo crea un cliente cuando se solicita `resolve()`
y recibe principal v1 válido. Oculta el cliente durante una nueva comprobación;
lo retira ante error, invalidación, cambio de conexión o desmontaje. Dos lecturas
concurrentes solo publican la más reciente. Misma cuenta/conexión conserva instancia;
otra cuenta utiliza su propio espacio `sessionStorage` del cliente existente.

El cliente conserva únicamente el UUID pendiente por cuenta. Invalidar la conexión
no borra una solicitud recuperable de esa cuenta ni concede acceso a otra. El hook
no inicia, prepara, ejecuta, cierra o abandona solicitudes automáticamente.

## Activación y límites

El banco activo todavía no monta el hook ni proporciona `manualIdentityClient` al
modal. La conexión del shell está preparada, pero no implica que el cliente manual
esté conectado al flujo de escritura. La autogestión pública y las entradas de PTA
mantienen su comportamiento. El módulo manual continúa fuera del AppModule RUND y
las banderas de aplicación/compensación Auth siguen false por defecto.

Antes de activar hay que cerrar correo durable, política y resolución de revisiones,
recuperación de contextos inconsistentes, adaptación de las demás entradas y SQL
pendiente entre propietarios, además de aceptación por instalación. Al conectar el
hook al formulario deberá respetarse su invalidación y revalidar antes de cada
acción; referencias guardadas por consumidores no sustituyen controles del servidor.
Este corte no establece exclusión entre dispositivos ni atomicidad distribuida
entre revocación de permisos y operaciones en vuelo.

La verificación HTTP usa el controlador, guard y estrategia JWT reales con cuentas
ficticias y el lector productivo del shell. Solo reemplaza destinos por loopback y
la incorporación de la cookie que realiza el navegador. No carga main/dotenv, módulos
de base de datos ni credenciales de instalaciones.
