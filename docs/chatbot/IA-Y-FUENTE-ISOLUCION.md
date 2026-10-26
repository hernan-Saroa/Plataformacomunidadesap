# Evaluación de IA y fuente documental Isolución

Actualización posterior: se instaló el controlador SQL y se implementó el conector opcional del chatbot. La configuración, pruebas y pendientes reales se detallan en [Integración Isolución](INTEGRACION-ISOLUCION.md). La búsqueda documental continúa desactivada y no se ha establecido conexión con el servidor real.

Revisión local y de fuentes oficiales: 22 de octubre de 2026. Esta fase identifica la configuración existente y prepara la integración; no instala modelos ni modifica el OCR o el chatbot en ejecución.

## Alcance acordado

Orientación sobre el uso de la plataforma, con contexto y fuentes verificables. La consulta de información personal y la ejecución de trámites requieren fases y permisos propios. La selección de un modelo no concede acceso a expedientes ni a conversaciones ajenas.

## Configuración local de RUND verificada

- `.env.rund-ocr.local` y la configuración local de `academic-work-plan-service` apuntan a proveedor OCR `RUND`, servicio en `localhost:8000`, Ollama en `localhost:11434` y modelo `gemma4:e4b`. No se copiaron tokens ni contraseñas en este informe.
- El OCR extrae texto mediante el servicio RUND/PaddleOCR; después `RundExtraccionService` utiliza Ollama para interpretar campos y proponer datos con revisión humana. Son etapas diferentes.
- La API local de Ollama respondió y listó `gemma4:e4b` instalado, aproximadamente 6,6 GB de archivo de modelo. En la consulta de procesos de Ollama no había un modelo cargado en memoria.
- La configuración predeterminada del código contempla `qwen3.5:4b`, pero las variables locales seleccionan Gemma. El documento REQ-RUND-F014 describe tanto el perfil PP-OCRv6/Qwen como la adaptación al grupo RUND existente con PaddleOCR/Gemma. No debe confundirse el valor predeterminado con el modelo seleccionado localmente.
- El equipo consultado dispone de aproximadamente 15 GB de RAM utilizable y una NVIDIA RTX 4060 Laptop con 8188 MiB de VRAM. Estas medidas son locales; no describen el servidor de producción.
- No se ejecutó inferencia ni se procesaron documentos para esta revisión. El health del servicio de puerto 8000 respondió, pero eso no acredita por sí solo precisión o procesamiento correcto. La inspección de contenedores Docker no estuvo disponible por los permisos del entorno.

## Candidatos para conversación

| Modelo | Propuesta de evaluación |
| --- | --- |
| `gemma4:e4b` | Referencia inicial ya instalada. Medir respuestas en español, seguimiento de conversación, citas y latencia con un perfil exclusivo para el chatbot. |
| `qwen3.5:4b` | Alternativa inicial más ligera para este equipo. La biblioteca de Ollama publica artefactos de unos 3,3–4 GB según el paquete. Compararlo con Gemma usando las mismas preguntas. |
| `qwen3.5:9b` | Candidato posterior si la memoria y los tiempos medidos lo permiten; no es el punto de partida propuesto para compartir este portátil con OCR y desarrollo. |

La recomendación es una selección práctica por disponibilidad y recursos, no una clasificación universal de calidad ni un benchmark propio. Las familias Gemma 4 y Qwen 3.5 son multilingües y se publican bajo Apache 2.0. El uso local evita facturación de una API externa, pero conserva el coste del equipo, almacenamiento y operación.

Se pueden conservar varios modelos en disco y elegir el modelo por petición. Instalarlos no garantiza ejecutarlos a la vez: comparten RAM/VRAM. Ollama puede encolar peticiones y descargar/cargar modelos cuando no caben simultáneamente. Dos instancias separan configuración y colas, pero no crean memoria de GPU adicional. Para proteger los tiempos del OCR hay que medir la carga conjunta o usar recursos separados.

Fuentes primarias: [Gemma 4, ficha de Google](https://ai.google.dev/gemma/docs/core/model_card_4), [Qwen 3.5 4B, ficha del fabricante](https://huggingface.co/Qwen/Qwen3.5-4B), [Qwen 3.5 en Ollama](https://ollama.com/library/qwen3.5), [concurrencia y memoria de Ollama](https://docs.ollama.com/faq).

## Isolución es una fuente SQL, no una pantalla de entrenamiento

La información de conexión proporcionada identifica SQL Server, base `Isolucion5Esap` y objeto `VW_LISTADOMAESTRODOCUMENTOS`. El nombre por sí solo no permite saber si la vista entrega texto completo, metadatos, rutas de archivos, versiones, vigencias o clasificación de acceso.

La prueba TCP inicial al servidor indicado, por el puerto habitual 1433, agotó cinco segundos sin respuesta incluso fuera de la restricción inicial del sandbox. Esa prueba no intentó autenticación. Esto no demuestra que el servidor esté caído: deben confirmarse el puerto real y la conectividad desde red institucional/VPN. No se revisaron columnas ni documentos y no se validó la cuenta de integración.

Después de que el usuario confirmó la conexión VPN, Windows mostró una ruta específica hacia `172.16.0.0/16` por el túnel Fortinet. La nueva prueba TCP 1433 agotó ocho segundos sin respuesta. Una consulta dirigida al servicio SQL Browser de ese mismo servidor, UDP 1434, tampoco obtuvo respuesta. La ruta existe, pero no se ha confirmado el acceso al servicio: falta verificar puerto/instancia y la autorización de red desde ese perfil VPN. No se modificaron rutas, firewall ni perfiles VPN.

Se contrastó también con el cliente oficial `sqlcmd` y ODBC Driver 17, intención de lectura y la consulta de metadatos preparada. La contraseña se introdujo en el prompt oculto del cliente, sin argumentos de contraseña ni archivo de credenciales. El cliente terminó con timeout TCP y «Login timeout expired» antes de ejecutar la consulta. El resultado no valida ni invalida la contraseña: no se estableció una sesión SQL. No se ejecutaron consultas sobre la vista.

El nuevo diagnóstico solicitado desde cero mantuvo la ruta VPN y reprodujo el timeout TCP. También se comprobó el transporte SMB/Named Pipes (TCP 445), sin respuesta, y no se encontraron alias SQL locales para ese servidor. La inspección de Windows no identificó una regla de salida que coincidiera explícitamente con el cliente o el destino SQL revisados; esto no descarta otras políticas o filtros. La traza limitada respondió en la interfaz local VPN y no recibió respuestas en los siguientes tres saltos, algo que no demuestra por sí solo dónde se filtra el tráfico porque ICMP puede estar restringido. Una conexión ligada explícitamente a la IP del túnel también agotó doce segundos. No se cambiaron rutas ni reglas de firewall.

El diagnóstico reproducible es `node scripts/check-isolucion-connectivity.cjs`. Comprueba la ruta más específica, TCP automático, TCP ligado a esa interfaz y el anuncio SQL Browser del mismo servidor. No utiliza contraseñas, no recorre otros equipos y no hace consultas SQL. Permite indicar el puerto real cuando soporte lo confirme: `node scripts/check-isolucion-connectivity.cjs 172.16.202.145 PUERTO`.

Consulta concreta para soporte: «Con la VPN conectada hay ruta a la red del servidor, pero TCP 1433 y SQL Browser no responden. ¿Cuál es el puerto TCP o nombre de instancia de SQL Server? ¿El perfil VPN tiene permitido acceder a ese destino y puerto? El acceso solicitado es exclusivamente SELECT a `Isolucion5Esap.VW_LISTADOMAESTRODOCUMENTOS`, pendiente de confirmar su esquema».

La consulta [inspect-isolucion-view.sql](../../scripts/inspect-isolucion-view.sql) consulta únicamente el catálogo para encontrar el esquema de la vista, sus columnas y el permiso SELECT visible. No asume `dbo` ni lee registros documentales. Microsoft documenta estos metadatos en [vistas de catálogo de objetos](https://learn.microsoft.com/en-us/sql/relational-databases/system-catalog-views/object-catalog-views-transact-sql). Un resultado vacío también puede deberse a falta de visibilidad de metadatos; no prueba que el objeto no exista.

Se puede ejecutar con el `sqlcmd` instalado cuando exista conexión, utilizando la cuenta de integración y la solicitud interactiva de contraseña. No incluir la contraseña mediante `-P`, en scripts, argumentos, prompts, logs ni en el repositorio. [Microsoft: manejo de la contraseña en sqlcmd](https://learn.microsoft.com/en-us/sql/tools/sqlcmd/sqlcmd-utility?view=sql-server-ver17).

## Orden de integración propuesto

1. Confirmar red/VPN, puerto y acceso SELECT a la vista; ejecutar el diagnóstico de estructura.
2. Revisar una muestra autorizada y pequeña: identificador, título, versión, vigencia, clasificación de acceso y texto o ubicación del archivo. Si solo hay enlaces o metadatos, resolver el acceso al contenido antes de prometer respuestas documentales.
3. Comparar Gemma instalado y Qwen 4B con preguntas sintéticas en español y documentos de prueba. Medir fidelidad a la fuente, citas, continuidad, rechazo de información ausente, tiempos y efecto sobre la cola OCR.
4. Crear un perfil propio del chatbot en el backend: modelo/endpoint, instrucciones, límite de contexto y salida, timeout y concurrencia. No reemplazar las variables `RUND_*` ni exponer credenciales al navegador.
5. Conectar recuperación documental (RAG): seleccionar contenido vigente y autorizado antes de enviarlo al modelo; devolver citas con identificador y versión. El modelo no recibirá conexión SQL ni podrá elaborar y ejecutar consultas arbitrarias.
6. Integrar respuestas en el contrato existente del chatbot, con historial acotado por conversación y usuario y los errores visibles ya implementados. Activar gradualmente tras probar que RUND y los demás flujos siguen funcionando.

El cliente actual del chatbot tiene timeout de 20 segundos. Los tiempos de carga y respuesta del modelo deberán medirse antes de elegir el tratamiento de espera o streaming; no se debe copiar sin más el timeout de la extracción OCR, que tiene otro flujo y otra duración.

Para una primera entrega, priorizar orientación con fuentes y acceso de lectura. Las credenciales conectan el backend con la fuente; no son datos de entrenamiento. Cambiar instrucciones o incorporar documentos al contexto no actualiza los pesos de un modelo. Fine-tuning no es un requisito inicial: primero evaluar recuperación y configuración. Referencias: [chat con historial y opciones en Ollama](https://docs.ollama.com/api/chat), [parámetros e instrucciones](https://docs.ollama.com/modelfile), [recuperación y embeddings](https://docs.ollama.com/capabilities/embeddings).
