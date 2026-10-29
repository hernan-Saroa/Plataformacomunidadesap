# Cobertura global del chatbot

Cuarto ajuste de la revisión, 22 de octubre de 2026.

## Integración

`App.tsx` monta `GlobalChatbotProvider` por encima de las rutas del shell. El asistente queda disponible en portada, login, servicios públicos, autogestión docente, expediente compartido, portal transaccional y backoffice cuando el módulo `chatbot` está activo. Las rutas, formularios, verificaciones y permisos de esos servicios conservan sus controladores actuales.

Se retiraron los widgets particulares de `PortalDashboard` y `BackofficeApp`. La navegación dentro del shell conserva el widget global, sus mensajes y borradores en memoria. El remoto se descarga al abrirlo por primera vez. Minimizarlo o entrar en la vista completa del chatbot lo oculta sin descartar su estado.

La vista completa conserva su propia selección de historial y utiliza `ChatbotFullPageScope` para evitar dos asistentes visibles y comprobar la activación. El historial persistido sigue siendo la fuente de información compartida entre ambas presentaciones; no se sincronizan borradores entre ellas.

El widget se reinicia al iniciar o cerrar sesión, cambiar de cuenta o cambiar de gateway. La decisión de usar la atención autenticada depende de la sesión validada del shell, no de los roles del visitante, de parámetros de URL ni de restos del usuario anterior. Los tokens de expedientes compartidos y los campos de formularios no se entregan al asistente.

## Activación y fallos

El shell comprueba `GET /chatbot/api/v1/public/config` sin cookies y sin caché. La respuesta contiene únicamente `{ activo: boolean }`, consultado desde `auth.module`. Un registro inexistente o inactivo deshabilita la interfaz. Un fallo de base de datos devuelve 503; no se interpreta como una activación.

La comprobación tiene un límite de 20 segundos y se repite al recuperar el foco, al reintentar y cuando la administración de módulos emite `esap:chatbot-config-changed`. Las respuestas de una comprobación anterior se descartan. Un fallo durante una actualización oculta el widget y ofrece reintento conservando el borrador en memoria; una desactivación confirmada lo desmonta.

Los errores de carga o renderizado del remoto quedan dentro de una frontera propia del widget. El resto de la vista continúa funcionando y el usuario puede reintentar la apertura.

## Atención pública y privacidad

Los visitantes reciben `PublicChatbotModule`, que consulta exclusivamente `POST /chatbot/api/v1/public/consultas`. El servidor ofrece orientación general mediante reglas sobre acceso, certificados y autogestión docente; este ajuste no integra un proveedor de IA.

La consulta pública valida texto no vacío de hasta 2000 caracteres y comprueba que el módulo siga activo. No consulta usuarios, permisos, conversaciones ni expedientes y no escribe mensajes o conversaciones. El cliente envía solo el texto, con `credentials: 'omit'`. Las consultas visibles se mantienen únicamente en memoria y los fallos conservan el texto para un reintento voluntario.

En el gateway se autorizaron exclusivamente `GET` para la configuración y `POST` para estas consultas, con rutas completas de versión 1. Los métodos diferentes, subrutas y todas las operaciones de `/chatbot/api/v1/chat/*` mantienen la autenticación. El guard del servicio privado y el permiso de lectura global del primer ajuste continúan vigentes.

## Verificación

- 82 pruebas de frontend: cliente HTTP, historial privado, errores, orientación pública, conservación del borrador, transición visitante/cuenta/cuenta distinta, navegación, vista completa, activación, timeout y aislamiento de errores del remoto.
- 19 pruebas HTTP y de autorización del backend: regresiones de privacidad, consultas públicas sin escritura, validación, desactivación y matriz de rutas/métodos públicos del gateway.
- TypeScript del chatbot, que también comprueba los nuevos componentes del shell importados por las pruebas, correcto.
- Compilaciones de producción completas del chatbot y del shell correctas, en directorios temporales; el build existente no se sobrescribió.
- Consulta SQL de activación y regresiones de la migración de privacidad verificadas con PostgreSQL, tablas temporales y `ROLLBACK`, mediante `node scripts/verify-chatbot-postgres.cjs`.

La comprobación general de TypeScript del shell encuentra errores en archivos ajenos a este ajuste: por ejemplo, tipos/importaciones de certificados laborales y control interno. No se modificaron esos módulos para resolverlos. Esta comprobación global no queda aprobada por este cambio.

## Entrega

Se deben desplegar juntos el shell, el remoto del chatbot, el gateway y el servicio del chatbot para que existan los nuevos endpoints públicos. No hay una migración adicional para este punto; la migración `003_secure_conversation_ownership.sql` del primer ajuste sigue siendo necesaria para el historial privado. No se aplicaron migraciones a tablas permanentes ni se modificaron conversaciones reales durante estas verificaciones.
