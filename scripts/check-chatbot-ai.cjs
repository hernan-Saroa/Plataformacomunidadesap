// Diagnóstico independiente: no conecta a SQL, PostgreSQL ni al HTTP del chatbot.
// Por defecto solo comprueba instalación. --generate ejecuta una prueba sintética.
const model = process.env.CHATBOT_OLLAMA_MODEL || 'qwen3.5:9b';
const base = process.env.CHATBOT_OLLAMA_URL || 'http://127.0.0.1:11436';
const ocrBase = process.env.CHATBOT_OCR_OLLAMA_URL || 'http://127.0.0.1:11434';
const generate = process.argv.includes('--generate');

async function request(baseUrl, path, body, timeout = 10000) {
  const url = new URL(path, baseUrl);
  if (!['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname)
    || url.protocol !== 'http:' || url.username || url.password) {
    throw new Error('LOCAL_ENDPOINT_REQUIRED');
  }
  const response = await fetch(url, {
    method: body ? 'POST' : 'GET',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(timeout),
  });
  if (!response.ok) throw new Error(`OLLAMA_HTTP_${response.status}`);
  return response.json();
}

(async () => {
  if (new URL(base).port !== '11436' || model !== 'qwen3.5:9b') {
    throw new Error('CHATBOT_DEDICATED_PROFILE_REQUIRED');
  }
  const version = await request(base, '/api/version');
  const installed = await request(base, '/api/tags');
  if (!installed.models?.some((item) => item.name === model)) throw new Error('MODEL_NOT_INSTALLED');
  const details = await request(base, '/api/show', { model });
  console.log(JSON.stringify({ installed: true, endpoint: base, model,
    ollamaVersion: version.version, details: details.details, capabilities: details.capabilities }));
  if (!generate) return;

  // Comprobación previa, no es un bloqueo compartido con RUND. No usar como
  // coordinador de concurrencia: el OCR puede recibir trabajo después de aquí.
  const ocr = await request(ocrBase, '/api/ps');
  if (ocr.models?.length) throw new Error('OCR_MODEL_ACTIVE_SKIP_TEST');
  const started = Date.now();
  try {
    const result = await request(base, '/api/chat', {
      model, stream: false, think: false, keep_alive: 0,
      messages: [
        { role: 'system', content: 'Responde en español en una sola frase breve.' },
        { role: 'user', content: 'Saluda e indica que eres la IA de pruebas del chatbot.' },
      ],
      options: { num_ctx: 2048, num_predict: 48, num_thread: 2 },
    }, 180000);
    if (result.model !== model || !result.done || !result.message?.content?.trim()) {
      throw new Error('INVALID_MODEL_RESPONSE');
    }
    console.log(JSON.stringify({ generated: true, model: result.model,
      response: result.message.content, elapsedMs: Date.now() - started, keepAlive: 0 }));
  } finally {
    // También solicitar la descarga explícita si falló o venció la prueba.
    await request(base, '/api/generate', { model, keep_alive: 0, stream: false }, 15000);
  }
})().catch((error) => {
  console.error(JSON.stringify({ ok: false, code: error.cause?.code || error.message }));
  process.exitCode = 1;
});
