# Revisión del chatbot institucional ESAP

Fecha: 22 de octubre de 2026.

Nota posterior: este documento conserva el diagnóstico inicial. La corrección del primer punto está descrita en [PRIVACIDAD-HISTORIAL.md](PRIVACIDAD-HISTORIAL.md), incluyendo migración, compatibilidad y pruebas.

El segundo punto, sobre errores ocultos y recuperación, está corregido en el código y descrito en [ERRORES-Y-RECUPERACION.md](ERRORES-Y-RECUPERACION.md).

El tercer punto, sobre sesión y resolución del gateway, está corregido en el código y descrito en [SESION-Y-GATEWAY.md](SESION-Y-GATEWAY.md).

El cuarto punto, sobre cobertura global y atención diferenciada para visitantes, está descrito en [COBERTURA-GLOBAL.md](COBERTURA-GLOBAL.md).

El quinto punto, sobre dimensiones, foco, accesibilidad y navegación del widget, está corregido en el código y descrito en [USO-Y-ACCESIBILIDAD-WIDGET.md](USO-Y-ACCESIBILIDAD-WIDGET.md). Los hallazgos que siguen conservan el diagnóstico inicial.

Alcance: revisión del código local del microfrontend, widget, shell, microservicio, gateway, migraciones y configuraciones de despliegue. Se realizaron comprobaciones locales y pruebas aisladas con repositorios y HTTP simulados. No se modificó el comportamiento de la aplicación ni se consultaron conversaciones reales.

## Resultado principal

El chatbot tiene interfaz de conversación, historial y persistencia en PostgreSQL, pero **no está integrado en todas las vistas**. Se monta en dos contenedores: backoffice y portal autenticado. El motor actual responde con reglas y textos escritos en el código; no consulta los datos de los módulos ni utiliza un modelo de IA.

Antes de extenderlo conviene corregir el aislamiento de conversaciones, la autenticación entre orígenes y los errores ocultos por respuestas simuladas.

## Componentes y recorrido de una consulta

```text
BackofficeApp / PortalDashboard
  -> ChatbotFloatingButton (shell)
  -> chatbot/Module (Module Federation)
  -> ChatbotModule (apps/mfe-chatbot)
  -> ChatbotService (fetch)
  -> /chatbot/api/v1/chat/* mediante el API Gateway
  -> ChatController -> ChatService (backend/chatbot-service)
  -> PostgreSQL: chatbot.conversacion + chatbot.mensaje
  -> generarRespuestaInstitucional: coincidencias de palabras
```

En despliegues con el proxy web, el prefijo público de API es `/services`. El microfrontend usa por defecto `http://localhost:4000` en localhost; el microservicio escucha por defecto en 3015 y el remoto frontend en 3118.

| Pieza | Archivo principal | Responsabilidad |
| --- | --- | --- |
| Widget compartido | `apps/shell/src/components/esap/ChatbotFloatingButton.tsx` | Botón, panel flotante, minimizar y carga diferida del remoto. |
| Interfaz | `apps/mfe-chatbot/src/components/ChatbotModule.tsx` | Conversación, historial, buscador, envío y sugerencias. |
| Cliente HTTP | `apps/mfe-chatbot/src/services/chatbot.service.ts` | Listar, crear, obtener conversaciones y enviar mensajes; simulación ante errores. |
| Backend | `backend/chatbot-service/src/modules/chat/chat.controller.ts` y `chat.service.ts` | API, persistencia, borrado lógico y reglas de respuesta. |
| Autenticación del gateway | `backend/api-gateway/src/auth/jwt-auth.guard.ts` y `jwt.strategy.ts` | Exigir JWT y extraerlo, entre otras opciones, de la cookie HttpOnly. |
| Enrutamiento del gateway | `backend/api-gateway/src/gateway/proxy.config.ts` | Alias `chatbot` y `chatbot-service`. |
| Federación | `apps/mfe-chatbot/vite.config.ts` y `scripts/mfe.config.mjs` | Exposición e importación de `chatbot/Module`. |
| Base de datos | `backend/chatbot-service/db/migrations/001_create_chatbot_schema.sql` | Conversaciones, mensajes y tabla de plantillas. |
| Registro del módulo | `backend/chatbot-service/db/migrations/002_seed_chatbot_auth_module.sql` | Registra o activa `chatbot` en `auth.module`; no define permisos específicos de historial. |

## Cobertura actual de vistas

| Vista o contexto | Integración encontrada | Condiciones y límites |
| --- | --- | --- |
| Backoffice y vistas de los módulos dentro de él | Sí, widget compartido | Se muestra si la lista de módulos activos está vacía o contiene `chatbot`. No se monta una copia por módulo. |
| Módulo completo de chatbot en el backoffice | Sí | `case 'chatbot'` carga el remoto. El botón flotante se oculta para evitar duplicación. |
| Portal transaccional autenticado y sus vistas descendientes | Sí, widget compartido | `PortalDashboard` lo monta con `isActive={true}`, sin consultar la activación del módulo. |
| Portada pública | No | No pasa por los dos contenedores anteriores. Confirmado también en navegador local. |
| Login y recuperación de acceso dentro del flujo de login | No en el contenedor de esa vista | No existe una instancia global en `App.tsx`. |
| Solicitud pública de certificados laborales | No en el contenedor de esa vista | Renderizado independiente desde `App.tsx`. |
| Solicitud y verificación pública de títulos y certificados | No en el contenedor de esas vistas | Incluye las rutas públicas de verificación y validación. |
| Vinculación y matrícula por QR | No en el contenedor de esas vistas | Son ramas independientes de renderizado. |
| `/autogestion/docentes` | No en el contenedor de esa ruta | Se renderiza fuera de `BackofficeApp` y `PortalDashboard`. |
| `/expediente-compartido/:token` | No en el contenedor de esa ruta | Ruta independiente del shell. |
| `/editor-plantillas` y demos independientes | No en sus contenedores | No heredan el widget del backoffice. |
| Microfrontends abiertos directamente | No heredan el botón del shell | El chatbot standalone abre su propia interfaz completa; otros remotos no reciben el widget compartido. |

Referencias: `BackofficeApp.tsx:897`, `BackofficeApp.tsx:1047`, `PortalDashboard.tsx:277`, `ChatbotFloatingButton.tsx:39`, ramas de vistas de `App.tsx:1037` y rutas de `App.tsx:1210`.

La cobertura indicada es estructural: no equivale a una validación visual de cada pantalla, modal o rol. El widget usa `z-50`; overlays de mayor nivel pueden cubrirlo.

## Qué hace hoy

- Crea conversaciones asociadas a los datos de usuario que envía el navegador.
- Guarda mensajes de usuario y asistente, fechas y metadatos en PostgreSQL cuando el servicio responde correctamente.
- Añade un saludo inicial y cambia el título a partir del primer mensaje.
- Lista conversaciones y obtiene su detalle ordenando los mensajes por fecha.
- En modo widget solicita el historial por email y selecciona la conversación más reciente.
- En modo completo solicita **todas** las conversaciones y permite buscarlas por título, nombre o email.
- Presenta mensajes optimistas, indicador de procesamiento y desplazamiento al último mensaje.
- Incluye cuatro preguntas sugeridas: viáticos, certificados laborales, PTA y programación académica.
- Tiene endpoint de borrado lógico; no encontré una acción de borrado conectada en la interfaz ni un método cliente para invocarlo.
- Incluye documentación Swagger y `/health` en el microservicio.

El backend expone, bajo `/api/v1/chat`, `POST /conversaciones`, `GET /conversaciones`, `GET /conversaciones/:id`, `POST /conversaciones/:id/mensajes` y `DELETE /conversaciones/:id`.

## Cómo responde y qué no está implementado

`ChatService.generarRespuestaInstitucional` convierte la pregunta a minúsculas y evalúa seis grupos de palabras: viáticos/comisión, grados/títulos, certificados laborales, PTA/docentes, control disciplinario/proceso y programación/aulas. Si no encuentra coincidencias, devuelve un texto genérico.

No encontré integración con un proveedor de IA, recuperación de documentos, búsqueda semántica, consulta a servicios funcionales, acciones sobre trámites, adjuntos, voz ni streaming. El historial se guarda, pero no se utiliza como contexto del motor. El parámetro `contexto` llega al generador, pero este no lo utiliza. La tabla `prompt_template` no tiene entidad ni consumo en el servicio; `tokens` permanece con su valor por defecto en el flujo revisado.

El shell pasa identidad, pero no transmite al remoto el módulo o pantalla actuales, el rol activo ni sus permisos. `currentModule` solo lo usa el contenedor flotante para ocultarse cuando ya se muestra el módulo completo.

## Hallazgos por prioridad

### 1. Alta: falta aislamiento y autorización del historial

Evidencia: `ChatbotModule.tsx:88`, `chat.controller.ts:33`, `chat.service.ts:41`, `chat.service.ts:57` y `chat.service.ts:116`.

- La interfaz completa pide `todos=true` sin comprobar un permiso específico de administración de conversaciones.
- Sin email, el servicio lista todas las conversaciones activas, incluso si `todos` es falso.
- El filtro por email incluye también conversaciones con email nulo.
- Obtener, enviar mensajes y desactivar una conversación usan su ID, sin comprobar propietario o permiso administrativo.
- La identidad de una conversación procede del cuerpo enviado por el cliente, no de la identidad validada por el gateway.
- El microservicio no registra guards de autenticación/autorización. Las configuraciones Compose revisadas publican su puerto, por lo que un acceso directo alcanzable podría eludir la protección del gateway.

Consecuencia: el código permite acceder a conversaciones ajenas si se alcanza el servicio o, mediante el gateway, si se cuenta con sesión válida. No se explotó este comportamiento sobre datos reales.

Corrección propuesta: derivar el propietario de la sesión validada, comprobar acceso en cada operación, reservar el listado global a un permiso administrativo y proteger el acceso directo al servicio. Los visitantes públicos necesitan un ámbito de conversación separado.

### 2. Alta: los fallos de API se presentan como respuestas normales

Evidencia: `apps/mfe-chatbot/src/services/chatbot.service.ts:47`, `:74` y `:117`.

Un error de listado produce `[]`; un error de creación produce una conversación `local-*`; un error de envío produce una respuesta genérica local. Esto también sucede ante HTTP 401. No se avisa en pantalla que la consulta no quedó guardada. Los mensajes simulados viven en el estado React, sin persistencia local implementada.

El indicador «En línea» y los puntos verdes se muestran de forma fija; no comprueban conectividad del servicio.

Corrección propuesta: estados visibles de error y reintento, distinguir sesión vencida de indisponibilidad, conservar el texto pendiente e indicar cualquier modo de demostración explícitamente.

### 3. Alta: falta enviar credenciales entre orígenes

Evidencia: cliente HTTP del chatbot frente a `apps/shell/src/config/environment.ts:488` y `backend/api-gateway/src/auth/jwt.strategy.ts:24`.

El cliente del chatbot usa `fetch` sin `credentials: 'include'`. El flujo de autenticación de la plataforma utiliza una cookie HttpOnly. En desarrollo, shell `localhost:3000` y gateway `localhost:4000` son orígenes distintos, por lo que las peticiones del chatbot no envían esa cookie con la configuración actual. En producción con `/services` en el mismo origen, la cookie puede viajar por el comportamiento predeterminado de `fetch`.

El guard no declara el chatbot como público. La solución para usuarios autenticados es integrar correctamente el cliente con la sesión; la atención pública requiere endpoints y permisos deliberadamente separados.

El cliente también resuelve su URL de forma independiente y no consume la resolución `VITE_API_URL` del shell, lo que puede producir diferencias entre entornos.

### 4. Alta: cobertura global incompleta y activación inconsistente

Evidencia: tabla de vistas anterior.

No hay widget global junto al enrutador. Cambiar entre backoffice y portal desmonta sus instancias. La activación del módulo se consulta en el backoffice y se ignora en el portal. La lista inicialmente vacía del backoffice permite mostrar el botón antes de conocer la configuración real.

Corrección propuesta: montar una instancia compartida en el shell raíz, conservar su estado durante navegación, centralizar activación y aplicar un modo de atención según sesión. Mantener separado el acceso al historial administrativo.

### 5. Alta en el despliegue afectado: ruta ausente en el gateway TLS

Evidencia: `nginx.frontend.gateway.conf:231`, `nginx.frontend.gateway.tls.conf.template`, `Dockerfile.frontend.gateway:7`.

La configuración HTTP contiene `/remotes/mfe-chatbot/`. La plantilla TLS del gateway que enruta a contenedores por microfrontend no incluye esa ruta; la petición cae en `location /`, que apunta al shell. Puede impedir cargar el remoto cuando se utiliza esa variante TLS.

Las variantes `nginx.frontend.gateway.prebuilt.conf` y su plantilla TLS sirven remotos desde archivos con reglas generales y tienen un recorrido diferente. No se verificó cuál está desplegada en QA o producción.

### 6. Media: respuestas incorrectas por coincidencias literales

Evidencia: `chat.service.ts:127`.

- `viaticos` coincide; `viáticos` por sí solo no coincide.
- `programacion` y `comision` tampoco normalizan tildes.
- «Cómo es el proceso de viáticos» puede terminar en la respuesta de Control Disciplinario por la palabra `proceso`.
- No existe interpretación de seguimiento, memoria conversacional ni uso real del contexto.

Se reprodujeron estos casos con el generador real en aislamiento. Las orientaciones son textos estáticos y no verifican si el usuario puede acceder al módulo recomendado.

### 7. Media: tamaño del widget y experiencia de uso

Evidencia: `ChatbotFloatingButton.tsx:54`, `:87` y `ChatbotModule.tsx:178`.

- El panel tiene altura de 580 px, pero el remoto conserva `h-[calc(100vh-4.5rem)]` incluso con `isWidget=true`. Riesgo de recorte del área inferior y de la entrada de mensajes; requiere verificación visual en tamaños de pantalla concretos.
- El acceso a pantalla completa existe, pero está oculto con `display: none`.
- Cerrar/minimizar desmonta el remoto y descarta borradores y mensajes locales simulados.
- En widget se ocultan el historial y el botón de nueva conversación; se retoma automáticamente la conversación más reciente.
- Las sugerencias solo se muestran con cero mensajes. Las conversaciones nuevas ya contienen el saludo del asistente, por lo que el flujo normal no llega a mostrarlas.
- Los textos con `**negritas**` se renderizan como texto plano, sin procesar Markdown.
- El botón flotante no declara nombre accesible específico, `aria-expanded` ni asociación con el panel; no se implementa manejo específico de foco o Escape.

### 8. Media: integridad, validación y concurrencia

Evidencia: DTO de mensajes y conversaciones, `chat.service.ts:20`, `:70`, y efectos de `ChatbotModule.tsx:70`.

- Se admite que el cliente declare mensajes con rol `system` o `assistant`; el flujo lo guarda. Hoy no alimenta un LLM, pero debe corregirse antes de incorporar uno.
- No hay límites de longitud en DTO, paginación del historial ni limitación de frecuencia propia del chatbot.
- Guardar conversación/saludo y guardar mensaje/respuesta son pasos separados sin transacción; un fallo intermedio deja datos parciales.
- La carga automática de la conversación más reciente puede competir con `initialConversationId`.
- Una respuesta pendiente puede añadirse al estado de otra conversación si se cambia de conversación antes de terminar el envío.
- No se cancelan cargas al desmontar o cambiar usuario. El efecto de historial depende del email, pero no del ID.

### 9. Media: variables de conexión a PostgreSQL inconsistentes

Evidencia: `backend/chatbot-service/src/config/typeorm.config.ts`, `docker-compose.backend.yml:20` y configuración de chatbot en `docker-compose.yml` y `docker-compose.prod.yml`.

El servicio lee `DB_USERNAME`, `DB_PASSWORD` y `DB_DATABASE`. Algunas configuraciones le suministran `DB_USER`, `DB_PASS` y `DB_NAME`. Esas variantes pueden terminar usando los valores predeterminados del código en vez de los definidos en Compose. DEV, QA y PRE revisados usan los nombres esperados. No se realizó conexión a bases de datos ni se inspeccionaron secretos de entorno.

## Comprobaciones realizadas y límites

- `node_modules/.bin/tsc.cmd --noEmit -p apps/mfe-chatbot/tsconfig.json`: correcto.
- Seis comprobaciones aisladas sobre el código real transpilado, con HTTP/repositorios simulados: error 401 oculto y credenciales omitidas; listado sin propietario; inclusión de conversaciones con email nulo; sensibilidad a tildes; clasificación por `proceso` y contexto ignorado; aceptación de rol `system`. Todas confirmaron el comportamiento descrito. Esto no sustituye pruebas con PostgreSQL o una sesión real.
- Navegador headless contra `http://localhost:3000/`: portada cargada y sin botón «Asistente ESAP».
- Remoto local `http://localhost:3118/remotes/mfe-chatbot/assets/remoteEntry.js`: HTTP 200, JavaScript.
- Servicio local `http://localhost:3015/health`: conexión rechazada en el momento de la revisión. No permite concluir nada sobre QA/producción ni sobre otras direcciones de servicio.
- No se encontraron pruebas unitarias o de integración propias en `apps/mfe-chatbot` o `backend/chatbot-service`. Sí hay una prueba de selección de servicios de despliegue que menciona chatbot, en `scripts/verify-deploy-service-selection.test.cjs`.
- No se ejecutó compilación del backend: sus dependencias NestJS/TypeORM no están instaladas localmente. No se instalaron dependencias ni se levantaron servicios.
- No se validaron sesiones reales, persistencia en PostgreSQL, migraciones aplicadas, disponibilidad remota ni diseño visual de todas las vistas.

## Orden propuesto para el siguiente trabajo

1. Corregir autenticación, propiedad de conversaciones y permiso de administración del historial.
2. Eliminar respuestas simuladas silenciosas y exponer estados reales de conexión/error.
3. Resolver las diferencias TLS y variables de base de datos según el despliegue utilizado.
4. Incorporar una instancia global con persistencia de estado y atención diferenciada para usuarios y visitantes.
5. Ajustar dimensiones, foco, accesibilidad, nueva conversación y navegación en el widget.
6. Definir la capacidad del asistente: orientación documental, consulta de información o ejecución de acciones. Integrar después contexto, conocimiento y herramientas con permisos específicos.
7. Verificar cobertura de todas las rutas, aislamiento entre usuarios, recuperación ante fallos y funcionamiento en móvil.
