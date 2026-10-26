# Errores y recuperación del chatbot

Segundo ajuste de la revisión, 22 de octubre de 2026.

## Comportamiento implementado

El cliente ya no transforma fallos de API en un historial vacío, una conversación `local-*` o una respuesta simulada. Todas las operaciones comprueban el estado HTTP y la estructura del JSON recibido. Un HTML de error devuelto con HTTP 200, JSON inválido o mensajes de otra conversación se tratan como fallos; no se muestran como respuestas válidas.

Las llamadas conservan `credentials: 'include'` y usan `cache: 'no-store'`. Tienen un límite de 20 segundos que incluye la lectura del cuerpo de la respuesta y cancela la petición mediante `AbortController`. Los mensajes de error distinguen sesión expirada, permisos insuficientes, conversación inaccesible, límite de consultas, fallo del servidor, desconexión, tiempo agotado y respuesta no válida. No exponen mensajes internos del navegador o del proxy.

## Recuperación por operación

| Fallo | Comportamiento |
| --- | --- |
| Consulta de acceso o historial | Muestra error y permite reintentar la lectura. No interpreta el fallo como ausencia de conversaciones ni crea una nueva por ese motivo. |
| Detalle de conversación | Permite reintentar la lectura; no recupera un detalle rechazado desde una copia local. |
| Conversación inaccesible (404) | Permite volver al historial personal mediante lectura, también desde el widget, sin repetir mensajes ni crear conversaciones automáticamente. |
| Creación sin confirmación | Ofrece «Revisar historial». Primero consulta las conversaciones existentes, sin repetir automáticamente la creación. Si sigue vacío, el usuario puede iniciar una conversación explícitamente, también desde el widget. |
| Envío sin confirmación | Restaura el texto como borrador y retira el mensaje optimista. Avisa que el servidor podría haberlo guardado. Ofrece «Revisar conversación» y bloquea otro envío hasta completar esa lectura. |
| Revisión del envío | Recupera el historial del servidor y conserva las ediciones del borrador. Pide comprobar si el mensaje ya aparece antes de volver a enviarlo; nunca repite el POST por su cuenta. |
| Actualización de la lista tras envío confirmado | Conserva los mensajes confirmados. El reintento actualiza solamente la lista; no envía otra vez la consulta. |
| Sesión o permiso rechazados | Mantiene el aislamiento del primer ajuste: limpia datos visibles y borradores cuando se rechaza la sesión o el permiso, sin simular éxito. |

No se afirma que un envío fallido no se haya guardado: un corte de conexión o un timeout puede ocurrir después de la escritura. Este ajuste no añade idempotencia ni transacciones al backend; por eso la recuperación revisa el estado antes de permitir una repetición voluntaria.

## Estado y borradores

- La interfaz muestra «Comprobando servicio», «Última consulta correcta» o el estado de error correspondiente, según la última operación. No presenta un indicador permanente de «En línea».
- Se retiraron los puntos verdes fijos del contenedor flotante. El estado real de la consulta se muestra dentro del chatbot en ambos modos.
- Los mensajes optimistas se identifican como «Pendiente de confirmación» hasta recibir los mensajes persistidos por el servidor.
- Los borradores se mantienen en memoria, separados por conversación. Cambiar de cuenta o perder autorización los limpia.
- El remoto se carga al abrir el widget por primera vez y permanece montado al minimizarlo, para conservar los borradores y operaciones pendientes al reabrirlo. El panel oculto queda fuera de la interacción y la accesibilidad.
- Los borradores no se escriben en almacenamiento persistente del navegador. Recargar la página, cerrar sesión o desmontar el contenedor descarta ese estado en memoria.
- El modo widget utiliza la altura del panel y un contenedor flexible con altura mínima cero para mantener accesibles los errores, reintentos y entrada de mensajes.

## Alcance y verificación

Los cambios de este punto afectan al cliente y la interfaz de `apps/mfe-chatbot`, y al contenedor `ChatbotFloatingButton` del shell. No requieren una migración adicional ni cambian el backend, el motor de respuestas, las rutas, los permisos generales ni las integraciones de otros módulos. Sigue siendo necesario desplegar la migración y el contrato del primer ajuste, descritos en [PRIVACIDAD-HISTORIAL.md](PRIVACIDAD-HISTORIAL.md).

Las pruebas cubren el flujo normal, HTTP 400/401/403/404/409/429/500/502/503/504, errores de red, JSON inválido, cuerpos incompatibles, timeout durante petición y lectura, conservación del borrador, revisión sin reenvío, fallo de creación, fallo al actualizar la lista, bloqueo de doble envío, minimización del widget y las regresiones de privacidad del primer punto.

Para ejecutarlas: `cd apps/mfe-chatbot` y `npm test`. Comprobación de tipos desde la raíz: `npx tsc --noEmit -p apps/mfe-chatbot/tsconfig.json`. El alias de `chatbot/Module` en la configuración de Vitest es exclusivo de las pruebas del contenedor y no altera la federación de producción.

Resultados: 40 pruebas correctas (20 de cliente HTTP, 19 de interfaz y una del contenedor flotante), TypeScript correcto y build de producción correcto. Se verificó además el artefacto de producción en navegador con respuestas HTTP ficticias: fallo 503 del historial sin ninguna creación automática, fallo 503 de envío con conservación del borrador, revisión de la conversación sin repetir el POST y cero errores de ejecución. El build, el servidor de comprobación y los datos fueron temporales; no se modificaron conversaciones reales ni el despliegue en ejecución.
