# Chatbot con Qwen y fuente Isolución

Para preparar el push y desplegar por ambiente, seguir
[despliegue y push](DESPLIEGUE-Y-PUSH.md). Incluye instalación idempotente de Qwen,
perfiles automáticos, secretos y comprobación documental antes del reemplazo.

## Alcance y validación de respuestas

El chatbot aplica `content-policy.ts` antes de consultar Isolución o Qwen, tanto
en el acceso público como en el privado y en la alternativa sin IA. Solicitudes
claramente ajenas, obscenas, de credenciales, expedientes personales o cambios en
Isolución reciben una orientación breve. Las consultas ambiguas piden identificar
el módulo, trámite o código documental. No se repite el texto inapropiado en la
respuesta. La autenticación, propiedad de la conversación y activación del módulo
se comprueban antes de estos controles; el historial privado mantiene su flujo
normal y el chat público no crea conversaciones persistentes.

Las consultas institucionales sobre acoso, violencia o discriminación siguen
permitidas. Los controles distinguen la consulta de protocolos de la generación
de contenido explícito. Son reglas locales y heurísticas: una formulación nueva
puede requerir aclaración y las pruebas no constituyen una garantía contra toda
posible manipulación del lenguaje.

Solo las preguntas válidas de los últimos dos turnos ayudan a interpretar
referencias como «sus requisitos». Las respuestas enviadas por el cliente no se
entregan al modelo como hechos. Un tema nuevo no hereda el anterior. Se rechazan
instrucciones al asistente incrustadas en preguntas, historial o documentos.

`evidence-policy.ts` contrasta la relación entre pregunta, título, proceso y código.
No basta una palabra genérica ni una coincidencia interna como «labor» en
«colaboración». El texto de un objetivo no se utiliza para contestar sobre plazos,
costos o requisitos que no consten en el pasaje. La generación exige referencias
coherentes y descarta contenido inapropiado, enlaces Markdown arbitrarios y cifras
de plazos/importes con unidades que no aparezcan en las fuentes citadas. Si falla
esta validación, se usa un pasaje seguro o se indica que falta evidencia. Estas
comprobaciones reducen errores; no demuestran por sí solas que toda paráfrasis de
un modelo sea semánticamente correcta.

El modo rápido distingue falta de coincidencias, origen no disponible, capacidad
ocupada y agotamiento del presupuesto de consulta. Un fallo de conexión no se
presenta como prueba de que no existan documentos.

La suite del backend incluye 157 pruebas de política, evidencias, aislamiento,
acceso y conservación de funciones existentes. Contrasta también todos los nombres
de módulos del menú actual. La prueba local reproducible de límites es
`node scripts/verify-chatbot-content-policy-live.mjs`; no ejecuta
instrucciones SQL ni escribe en la vista. Se conserva la prueba del widget en
`scripts/verify-chatbot-current-services-browser.mjs`.

La revisión final añade regresiones para cinco casos: mantener únicamente el tema
explícito más reciente al interpretar un seguimiento; conservar ese contexto si
Qwen falla; comparar cifras completas (15 días no equivale a 115 días); normalizar
marcadores de rol con caracteres invisibles o de ancho completo; y pedir precisión
sobre certificados ambiguos en la alternativa sin IA, sin enviarlos directamente
al formulario laboral.

Verificación de la última revisión activa: doce comprobaciones públicas pasaron,
con tiempos de 8–219 ms; el widget respondió la consulta de títulos en 89 ms y
abrió el formulario correcto. La consulta documental del objetivo de `GF-PT-008`
devolvió en 277 ms un pasaje de «VIATICOS / GASTOS DE DESPLAZAMIENTO» con su fuente
oficial de Isolución. Son medidas locales, no una garantía de disponibilidad de
red. Pasaron también 108 pruebas del frontend y sus comprobaciones de TypeScript
y compilación. OCR y Gemma conservaron sus mismos procesos y configuración.

## Nombres y formularios actuales

La orientación de títulos usa **Verificación de títulos**, el nombre visible en
la portada y en `PublicTitleVerification`. Su enlace es
`/certificacion-titulos-graduados`, relativo al ambiente. Los nombres anteriores
se reconocen como consultas del usuario y se responden con el nombre actual.
El asistente explica que se solicita un certificado de verificación y que la
emisión depende de los registros; no promete una emisión inmediata ni pide datos
personales en el chat. La alternativa sin IA reutiliza esa misma orientación.

`src/modules/chat/platform-services.json` concentra los nombres y enlaces públicos
del chatbot. `npm run platform:check`, incluido en `npm run build`, contrasta el
catálogo con las tarjetas, rutas, componentes y campos actuales del shell. Un
cambio incompatible detiene la compilación y obliga a revisar las instrucciones.
Las pruebas incluyen renombrado, eliminación de ruta y cambio de campo simulados.
Esta comprobación se ejecuta en el repositorio completo antes de publicar; una
imagen construida con solo el microservicio usa el catálogo ya empaquetado y
avisa que no dispone de los fuentes del shell para contrastarlo.

Verificación local posterior: la pregunta exacta sobre títulos respondió en 97 ms
en el widget y abrió el formulario correcto sin enviarlo; tres consultas por el
gateway tardaron 1217, 19 y 12 ms. Pasaron 71 pruebas de backend y 108 de frontend,
con compilación Nest/Vite y verificación TypeScript. La prueba reproducible es
`node scripts/verify-chatbot-current-services-browser.mjs`; requiere el shell,
el chatbot y el gateway locales activos. Son medidas locales, no garantías de
disponibilidad de red. OCR y Gemma no se reiniciaron ni cambiaron su configuración.

## Corrección de velocidad y relevancia

`CHATBOT_AI_FAST_MODE=true` es ahora el modo predeterminado. Las preguntas de
navegación usan rutas y pasos verificados de la plataforma: no hacen una búsqueda
genérica de certificados ni esperan a cargar el modelo. El enlace laboral es
`/solicitar-certificado-laboral`, relativo al origen del navegador, y su pantalla
pública fue verificada en `localhost:3000`.

Las búsquedas documentales reutilizan resultados durante 30 segundos y el texto
aprobado preparado en memoria. La respuesta inmediata usa un pasaje pertinente y
una fuente; si falta evidencia, lo dice brevemente. Tiene un presupuesto interno
de 1,6 segundos; el navegador cancela a los cuatro segundos si falla la conexión.
No se muestran tablas, firmas ni historiales de cambios como respuesta.

Al arrancar se preparan documentos de temas frecuentes, sin bloquear el servidor.
Qwen prepara mejoras en segundo plano, con una sola generación por proceso y
conservando la comprobación del OCR y `keep_alive=0`. Una respuesta generada válida
puede reutilizarse durante 30 segundos, aislada por audiencia y contexto. La carga
en frío de Qwen 9B puede seguir siendo lenta en este equipo, pero queda fuera de
la espera HTTP. No se garantiza una generación nueva de Qwen en dos segundos.
`CHATBOT_AI_FAST_MODE=false` conserva el recorrido generativo para diagnósticos.

La búsqueda de certificados laborales exige tanto `certific` como `labor`, y los
códigos como `GF-PT-008` se buscan completos. Así se evita responder con certificados
de idoneidad o publicaciones por coincidir únicamente con la palabra certificado.

Medición real tras activar la corrección: pregunta exacta del usuario, 166 ms por
el gateway y 65 ms hasta la respuesta visible en el widget; variante laboral, 12 ms;
certificados de grado, 13 ms; objetivo documental de `GF-PT-008`, 249 ms. Son medidas
locales, no una garantía universal de red o de disponibilidad de contenido.

Validación de esta corrección: 66 pruebas de backend y 108 de frontend aprobadas,
compilación Nest/Vite/TypeScript correcta y prueba del widget real con enlace
laboral visible y ausencia de certificados ajenos. OCR y Gemma conservaron sus
horas de inicio, cero reinicios y las mismas huellas de configuración.

Las mediciones de 54–107 segundos de las secciones siguientes corresponden al
recorrido generativo anterior y se mantienen como registro de la instalación.

## Estado verificado: 3 de noviembre de 2026

El backend implementa recuperación documental desde SQL Server, lectura limitada
de HTML/PDF/DOCX y generación con `qwen3.5:9b` en la instancia exclusiva del chatbot.
El servidor de Gemma, la configuración `RUND_*` y los módulos ajenos al chatbot
conservan sus flujos. No hay cambios de esquema ni migraciones nuevas.

La conexión real a `Isolucion5Esap.dbo.VW_LISTADOMAESTRODOCUMENTOS` funcionó:
101 columnas y 871 fichas recuperadas en una consulta de hasta 2000 filas.
En esas filas, `TEXTO`, `TEXTOOBJETIVO` y `TEXTODESARROLLODELPROCESO` estaban vacíos.
La búsqueda nueva de viáticos encontró `GF-IN-006`, `GF-FO-028` y `GF-PT-008`.
Las rutas son relativas y requieren el prefijo `/IsolucionEsap`. Los errores
iniciales 404/500 se resolvieron completando la sesión de consulta ASP.NET y ASP
clásico del sitio. Con la cuenta de consulta expresamente autorizada se leyó la
ficha `GL-IN-001` y su PDF real: unas 8292 letras de cuatro páginas. Las descargas
y los textos se procesan en memoria; no se cargan archivos en Isolución.
El usuario confirmó que todos los documentos aprobados de la vista son públicos.

Mientras falte contenido, el motor devuelve títulos, códigos y versiones y explica
que solo dispone de fichas. No pide al modelo que invente pasos o requisitos.
La prueba inicial con Qwen real utilizó un documento **ficticio**, respondió correctamente
«cinco días» y citó `PRUEBA-IA`. Tardó 107 segundos incluida la carga inicial,
durante una construcción Docker concurrente; no es una medida de rendimiento
sostenido. Posteriormente se validó el flujo HTTP completo con SQL y documentos
reales: respondió al objetivo del procedimiento de viáticos, citando `GF-IN-006`,
`GF-FO-028` y `GF-PT-008`, en 62,5 segundos incluida la carga de Qwen.
Después del reemplazo autorizado, el chatbot quedó activo en el puerto local
3015. La prueba a través del gateway 4000 respondió sobre expedición de resoluciones
en 53,7 segundos y enlazó el PDF real `GL-IN-001`. La instancia temporal 3016 se
cerró al finalizar. Las consultas públicas de estas pruebas no guardaron historial.

Todas las consultas del conector a la vista son SELECT. No se ejecutan INSERT,
UPDATE, DELETE, ALTER, CREATE, permisos ni cargas de archivos en Isolución.

## Configuración común

Copiar `backend/chatbot-service/knowledge.env.example` a un archivo privado por
ambiente, completar las variables y establecer `CHATBOT_AI_ENABLED=true` después
de verificar acceso y contenido. El archivo local `.env.knowledge` está ignorado
por Git y no contiene contraseñas. La activación local utiliza el entorno del
proceso para mantener ambas claves solo en memoria. Si se arranca sin ese entorno,
el archivo mantiene el motor anterior hasta usar el lanzador documentado abajo.

El entorno del proceso tiene prioridad. En ejecución nativa, Nest carga
`.env.knowledge`, `.env` y `.env.local`, en ese orden, sin expandir `$`.
En Docker, las seis composiciones base admiten el archivo opcional indicado por
`CHATBOT_KNOWLEDGE_ENV_FILE`; el ambiente local hereda el de desarrollo. Si falta,
se conserva el funcionamiento anterior. No se propagan estas variables a RUND.

Las contraseñas deben inyectarse mediante el gestor de secretos del ambiente como
`CHATBOT_ISOLUCION_PASSWORD` y `CHATBOT_ISOLUCION_WEB_PASSWORD`; no pasarlas en
argumentos ni versionarlas. La cuenta SQL no se utiliza para iniciar sesión web.
Si un operador utiliza un archivo de entorno privado, debe proteger sus permisos
y escribir secretos con `$` entre comillas simples para evitar interpolación de
Docker Compose. La validación de certificados está habilitada en el ejemplo:
instalar la CA institucional en los servidores. Se aceptó el certificado solo
para las pruebas locales expresamente autorizadas.

`CHATBOT_ISOLUCION_ALLOWED_COLUMN/VALUE` filtra documentos aprobados.
`CHATBOT_ISOLUCION_PUBLIC_ENABLED` y `PUBLIC_ALLOWED_COLUMN/VALUE` exigen una
política independiente. En este proyecto se configuró el estado `Aprobado` para
ambos filtros después de la confirmación explícita del usuario. El controlador no recibe filtros, SQL, URLs
del modelo, identidad ni parámetros de conexión suministrados por el navegador.

`CHATBOT_ISOLUCION_DOCUMENT_BASE_URL` resuelve las rutas relativas con la semántica
estándar de URL; `DOCUMENT_PATH_PREFIX=/IsolucionEsap` adapta las rutas de la vista.
`DOCUMENT_ORIGINS` y `DOCUMENT_PATHS` autorizan exactamente los
orígenes y prefijos de ruta que el lector puede solicitar. No añadir dominios
genéricos. `FETCH_DOCUMENTS=true` habilita esa lectura tras verificar el origen.
No se envían credenciales SQL ni cookies de usuarios a los enlaces.
`WEB_AUTH_ENABLED`, `WEB_LOGIN_URL`, `WEB_USER` y `WEB_PASSWORD` configuran una
sesión técnica de consulta: inicia sesión mediante el formulario real y sigue
los marcos `ControlDeInicioV4.asp` / `IdentificaUsuarioV4.asp`. Solo el login usa
POST; los documentos y anexos se leen por GET. Cookies exclusivamente en memoria,
renovación a los cinco minutos y espera de 30 segundos tras fallo de autenticación.
No se reutilizan cookies de visitantes ni se siguen redirecciones de login a otro
origen. Si ESAP cambia la clave de consulta, actualizar el secreto web del ambiente.

## Windows y revisión local

Usar `CHATBOT_OLLAMA_URL=http://127.0.0.1:11436` y, si comparte GPU,
`CHATBOT_AI_OCR_OLLAMA_URL=http://127.0.0.1:11434`.

Para arrancar sin guardar claves:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/start-chatbot-knowledge.ps1 -Port 3015
# Si ya hay un chatbot local, el reemplazo debe estar autorizado:
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/start-chatbot-knowledge.ps1 -Port 3015 -ReplaceRunning
```

El lanzador solicita las dos claves con entrada oculta, las hereda únicamente al
proceso hijo y restaura su entorno. No las escribe en archivos ni argumentos.
Los registros locales van a `.local/chatbot-runtime`, ignorado por Git. El
reemplazo verifica el health y que el proceso sea Node; solo detiene su supervisor
Nest si su ruta identifica expresamente `backend/chatbot-service`.

```powershell
cd backend/chatbot-service
npm run build
npm run knowledge:check
# Solo lectura; usa la contraseña ya inyectada en el entorno.
npm run knowledge:check -- --question=viaticos
```

El diagnóstico no conecta a PostgreSQL, no abre HTTP y no carga modelos por
defecto. Comprueba esquema, permisos, mapeo y disponibilidad de Qwen. La opción
`--question` prueba el flujo privado. Un fallo de diagnóstico produce código 1.

## Docker y ambientes

Requiere Node 22, Docker Compose 2.30 o posterior para el perfil GPU incluido,
conectividad al SQL institucional y un servidor Ollama con Qwen instalado. La
instancia local incluida requiere GPU NVIDIA compatible; un ambiente sin esos
recursos debe apuntar a un servidor propio adecuado mediante `CHATBOT_OLLAMA_URL`.
No puede garantizarse acceso a una IP privada sin ruta de red/VPN desde el servidor.

Para una instancia en el mismo host:

```powershell
docker compose -p esap-chatbot-ai -f docker-compose.chatbot-ia.yml up -d
docker compose -p esap-chatbot-ai -f docker-compose.chatbot-ia.yml exec -T chatbot-ollama ollama pull qwen3.5:9b
# Archivo privado preparado para Docker y secretos del ambiente ya configurados:
$env:CHATBOT_KNOWLEDGE_ENV_FILE = './backend/chatbot-service/.env.knowledge.qa'
docker compose -f docker-compose.qa.yml -f docker-compose.chatbot-knowledge.yml config --quiet
# Aplicar únicamente después de revisar la configuración del ambiente:
docker compose -f docker-compose.qa.yml -f docker-compose.chatbot-knowledge.yml up -d --build --no-deps chatbot-service
```

Cambiar `qa` por `dev`, `pre`, `prod`, `backend` o `local` según la composición.
El overlay conecta solo el chatbot a la red del proyecto de IA. Conserva sus
redes anteriores y usa `http://chatbot-ollama:11434`; `CHATBOT_OLLAMA_URL` del
entorno de Compose permite elegir otro servidor. Para proyectos de IA con otro
nombre, ajustar `CHATBOT_AI_NETWORK`. Si varios ambientes comparten un host,
utilizar proyectos/redes distintos y `CHATBOT_OLLAMA_BIND_PORT` distintos.
La composición base `docker-compose.yml` requiere además los archivos `.env`
propios de los demás servicios; esta tarea no los crea ni modifica.

No se desplegaron servicios en QA, preproducción o producción. Se construyó la
imagen local `esap-chatbot-knowledge:local`, sin sustituir el servicio en ejecución.
La imagen se probó en un contenedor temporal: conexión a Qwen por la red aislada
y extracción PDF en el proceso hijo, sin consultar SQL ni cargar el modelo.

La configuración de backend, desarrollo, QA, preproducción y producción pasó la
validación real de Docker Compose con el overlay. Las siete variantes también
pasaron la revisión estática del contrato del chatbot y la comparación que exige
que los demás servicios conserven exactamente su configuración anterior.
Dos problemas locales anteriores al cambio impiden validar las composiciones
completas restantes en este equipo: `docker-compose.yml` referencia archivos
`.env` ausentes de otros servicios y `docker-compose.local.yml` hereda referencias
a `superapp-net-prod` sin definir esa red. El segundo error se reprodujo también
sin el overlay del chatbot. No se modificaron esos servicios para ocultarlo.

## Límites y comportamiento

- SQL: consultas SELECT parametrizadas, búsqueda léxica sin distinción de tildes,
  hasta tres resultados ordenados por coincidencias; no hay embeddings ni SQL
  elaborado por el modelo. La cuenta debe tener permisos de lectura mínimos.
- Lectura: hasta 5 MiB por descarga, dos redirecciones/saltos dentro de la lista
  autorizada, ocho segundos por descarga y cinco por extracción PDF. Se rechazan
  páginas de login/error. HTML se procesa sin ejecutar JavaScript, respetando su
  charset HTTP. Sigue el enlace principal «Ver Documento». PDF y DOCX usan un
  proceso hijo aislado con 128 MiB de heap: una caída nativa no puede tumbar HTTP.
  PDF: hasta 15 páginas; ambos: hasta 16000 caracteres. PDF escaneados,
  documentos `.doc` antiguos y contenido posterior a esos límites necesitan otra extracción.
  Este lector no llama al OCR de RUND. Caché: hasta 32 documentos durante 5 minutos.
- IA: una consulta activa por proceso, sin cola de inferencias en el backend,
  contexto de 4096 tokens, hasta 512 tokens de salida, timeout de 180 segundos y
  `keep_alive=0`. Respuesta JSON validada, citas limitadas a las fuentes recuperadas
  y enlaces añadidos por el servidor. Instrucciones documentales se tratan como
  datos. Esto reduce errores, pero las respuestas deben evaluarse con casos reales.
- El chat público no consulta ni guarda conversaciones. Envía como máximo dos
  turnos recientes, acotados, desde la memoria de la pestaña; recargar la página
  los elimina. La API acepta hasta cuatro turnos validados. El historial solo
  contextualiza preguntas y no acredita hechos ni permisos.
- Navegador: hasta cuatro segundos para respuestas; configuración, sesión e historial
  conservan 20 segundos. Los proxies de estas composiciones admiten 300 segundos.
  Un balanceador externo también debe permitir ese presupuesto. No hay reintentos
  automáticos de consultas ante timeout. Fallo de IA devuelve extractos leídos;
  fallo de SQL devuelve indisponibilidad, no una respuesta inventada.

`CHATBOT_AI_SHARED_GPU=true` consulta y vigila la actividad del Ollama de OCR;
si está ocupado no inicia la inferencia, y si comienza trabajo cancela Qwen. No
es exclusión mutua: el OCR puede empezar entre dos comprobaciones. Para garantizar
ausencia de contención se necesitan recursos físicos separados o un coordinador
compartido en ambos servicios. Se preservó el código de RUND para esta entrega.

## Verificación reproducible

Resultado final: 60 pruebas del backend y 107 del frontend aprobadas; compilaciones
de Nest, TypeScript y Vite correctas; prueba de navegador en diez tamaños aprobada.
Gemma conservó su digest y los contenedores OCR/Gemma conservaron sus identificadores,
horas de arranque y cero reinicios. Las huellas de los dos archivos locales de RUND
se mantuvieron idénticas y el health de OCR respondió `healthy`. No se ejecutó una
extracción OCR documental completa ni una prueba de carga simultánea de ambos modelos.

```powershell
cd backend/chatbot-service
npm test
npm run build
cd ../..
npm test --workspace @esap-mfe/chatbot
npx tsc --noEmit -p apps/mfe-chatbot/tsconfig.json
node scripts/verify-chatbot-environments.cjs
node scripts/verify-chatbot-knowledge-environments.cjs
node scripts/verify-chatbot-widget-browser.mjs
# Prueba opcional: Qwen real, documento ficticio, sin SQL ni PostgreSQL.
node scripts/verify-chatbot-qwen-live.cjs
```

Referencias oficiales: [Ollama chat](https://docs.ollama.com/api/chat),
[salida estructurada](https://docs.ollama.com/capabilities/structured-outputs),
[concurrencia y memoria](https://docs.ollama.com/faq),
[Cheerio](https://cheerio.js.org/docs/intro/),
[PDF Parse](https://github.com/mehmet-kozan/pdf-parse),
[Mammoth](https://github.com/mwilliamson/mammoth.js),
[Tough Cookie](https://github.com/salesforce/tough-cookie).
