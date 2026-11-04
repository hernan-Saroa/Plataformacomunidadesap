// Prueba opcional de integración con Qwen real y un documento FICTICIO en memoria.
// No consulta SQL, no conecta a PostgreSQL y no publica endpoints.
require('../backend/chatbot-service/node_modules/reflect-metadata');
const assert = require('node:assert/strict');
const { KnowledgeAnswerService } = require('../backend/chatbot-service/dist/modules/knowledge/knowledge-answer.service');
const { DocumentReaderService } = require('../backend/chatbot-service/dist/modules/knowledge/document-reader.service');
const { OllamaService } = require('../backend/chatbot-service/dist/modules/knowledge/ollama.service');
const env = { CHATBOT_AI_ENABLED: 'true', CHATBOT_AI_FAST_MODE: 'false', CHATBOT_OLLAMA_URL: 'http://127.0.0.1:11436',
  CHATBOT_AI_SHARED_GPU: 'true', CHATBOT_AI_OCR_OLLAMA_URL: 'http://127.0.0.1:11434' };
const config = { get: (key) => env[key] };
const source = { isSearchEnabled: () => true, search: async () => [{ id: 'FICTICIO-17', titulo: 'Prueba ficticia de integración',
  codigo: 'PRUEBA-IA', extracto: 'Este es un documento ficticio utilizado exclusivamente para verificar la integración. El trámite ficticio del ejemplo tarda cinco días. Esta información no describe procedimientos reales de ESAP.' }] };
const service = new KnowledgeAnswerService(config, source, new DocumentReaderService(config), new OllamaService(config));
(async () => {
  const started = Date.now();
  const result = await service.answer('Según el documento de prueba, ¿cuántos días tarda el trámite ficticio?', 'private');
  assert.equal(result.metadatos.motor, 'ollama-isolucion');
  assert.equal(result.metadatos.modelo, 'qwen3.5:9b');
  assert(/cinco|\b5\b/i.test(result.contenido));
  assert(result.contenido.includes('PRUEBA-IA'));
  console.log(JSON.stringify({ ok: true, fixture: 'documento_ficticio', elapsedMs: Date.now() - started, ...result }, null, 2));
})().catch(() => { console.error(JSON.stringify({ ok: false, code: 'LIVE_QWEN_INTEGRATION_FAILED' })); process.exitCode = 1; });
