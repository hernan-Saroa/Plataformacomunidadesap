# Qwen exclusivo para el chatbot

Para nuevas instalaciones y actualizaciones por ambiente, usar la guía de
[despliegue y push](DESPLIEGUE-Y-PUSH.md). Las mediciones siguientes documentan
la instalación inicial; el modo rápido actual se explica en esa guía y en la
configuración del chatbot.

Esta etapa instala `qwen3.5:9b` en una instancia propia de Ollama. El servidor
escucha solo en `127.0.0.1:11436` y usa un volumen del proyecto Docker
`esap-chatbot-ai`, independiente del volumen `rund_ollama-data`.
No cambia el modelo Gemma, el endpoint `11434`, las variables `RUND_*`, los
contenedores de OCR ni la búsqueda de Isolución.

```powershell
docker compose -p esap-chatbot-ai -f docker-compose.chatbot-ia.yml up -d
docker compose -p esap-chatbot-ai -f docker-compose.chatbot-ia.yml exec -T chatbot-ollama ollama pull qwen3.5:9b
node scripts/check-chatbot-ai.cjs
# Solo con el OCR sin trabajo en curso:
node scripts/check-chatbot-ai.cjs --generate
```

El perfil que utilizará la integración del backend es exclusivamente:

```dotenv
CHATBOT_OLLAMA_URL=http://127.0.0.1:11436
CHATBOT_OLLAMA_MODEL=qwen3.5:9b
```

La integración posterior ya incorpora llamadas al modelo desde el backend,
habilitadas mediante `CHATBOT_AI_ENABLED`. Configuración y pendientes de contenido
real: [chatbot con fuente documental](CONFIGURACION-CHATBOT-IA.md). El archivo
local utiliza un lanzador que inyecta las claves solo en memoria para activar
el nuevo motor. Sin ese entorno, se conserva la orientación anterior.
Si el backend se ejecuta en un contenedor, su URL deberá apuntar a este servicio
por una red Docker explícita; `127.0.0.1` es para el backend ejecutado en Windows.

Se limita a una solicitud de inferencia, contexto de 2048 tokens, dos CPU y 3 GiB
de RAM del contenedor. Se habilita GPU y `keep_alive=0` para liberar el modelo
al acabar cada consulta. La descarga del modelo no lo carga para inferencia.

La separación de puertos, configuración y almacenamiento no separa el hardware.
La GPU local de 8 GiB no permite asumir que Gemma y Qwen 9B quepan juntos. Antes
de habilitar conversaciones reales hay que coordinar las inferencias con RUND
o disponer de hardware separado. La comprobación previa de `--generate` solo
rechaza una prueba si el OCR ya tiene un modelo cargado; no garantiza exclusión
mutua frente a trabajos que empiecen después. No se ha medido carga simultánea.

## Verificación inicial de instalación del 3 de noviembre de 2026

- Instalado y confirmado por `/api/show`: familia `qwen35`, 9.0B, `Q4_K_M`.
- La prueba `--generate` respondió: «¡Hola! Soy la IA de pruebas del chatbot,
  aquí para ayudarte a evaluar el funcionamiento del sistema.»
- Primera respuesta: 71,9 segundos, incluida la carga inicial. No es una medida
  de rendimiento sostenido. El cliente del chatbot tiene una espera de 20
  segundos; la integración futura debe resolver esa diferencia antes de activarse.
- Después de la prueba, `/api/ps` de Qwen quedó vacío y la GPU marcó 0 MiB usados.
- Gemma conservó su identificador de modelo; los contenedores `rund-ocr` y
  `rund-ollama` conservaron sus identificadores, horas de inicio y cero reinicios.
- Las huellas SHA-256 de los dos archivos locales de configuración de RUND
  permanecieron iguales antes y después. El health de OCR devolvió `healthy`
  y el del chatbot `ok`. No se ejecutó una extracción documental completa.
- Composición Docker validada y diagnóstico de instalación correcto. No se
  modificó código de la aplicación ni fue necesario recompilar sus servicios.

Para detener únicamente esta instancia sin borrar el modelo:

```powershell
docker compose -p esap-chatbot-ai -f docker-compose.chatbot-ia.yml stop
```

Referencias: [modelo oficial en Ollama](https://ollama.com/library/qwen3.5:9b),
[memoria y concurrencia](https://docs.ollama.com/faq),
[API de conversación y keep_alive](https://docs.ollama.com/api/chat).
