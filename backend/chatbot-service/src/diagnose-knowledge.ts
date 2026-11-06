import 'reflect-metadata';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { KnowledgeModule } from './modules/knowledge/knowledge.module';
import { IsolucionModule } from './modules/isolucion/isolucion.module';
import { IsolucionService } from './modules/isolucion/isolucion.service';
import { OllamaService } from './modules/knowledge/ollama.service';
import { KnowledgeAnswerService } from './modules/knowledge/knowledge-answer.service';
import { DocumentReaderService } from './modules/knowledge/document-reader.service';
import { relevantSources } from './modules/knowledge/evidence-policy';

// El diagnóstico no prepara documentos en segundo plano ni inicia inferencias.
process.env.CHATBOT_DIAGNOSTIC_MODE = 'true';

@Module({ imports: [ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env.knowledge', '.env', '.env.local'] }), KnowledgeModule, IsolucionModule] })
class DiagnosticModule {}

// Sin servidor HTTP ni PostgreSQL. No modifica datos ni carga modelos por defecto.
async function main() {
  const app = await NestFactory.createApplicationContext(DiagnosticModule, { logger: false });
  try {
    const source = await app.get(IsolucionService).diagnostic();
    const ai = await app.get(OllamaService).diagnostic(process.argv.includes('--require-enabled'));
    const enabled = app.get(KnowledgeAnswerService).isEnabled();
    const summary = 'mappingStatus' in source
      ? { connected: source.connected, esquema: source.esquema, vista: source.vista, columnas: source.columnas.length,
        searchEnabled: source.searchEnabled, mappingStatus: source.mappingStatus }
      : source;
    console.log(JSON.stringify({ source: summary, ai, enabled }, null, 2));
    if (!source.connected || !ai.available || !('mappingStatus' in source) || source.mappingStatus !== 'ready') process.exitCode = 1;
    if (process.argv.includes('--require-enabled') && !enabled) process.exitCode = 1;
    if (process.argv.includes('--verify-document')) {
      const code = String(app.get(ConfigService).get('CHATBOT_DEPLOY_DOCUMENT_CODE') || 'GF-PT-008');
      let readable = false;
      try {
        const sources = relevantSources(code, await app.get(IsolucionService).search(code, 'public'));
        if (sources.length) readable = (await app.get(DocumentReaderService).enrich(sources[0])).contenidoDisponible === true;
      } catch { /* Solo se informa el resultado, nunca errores con secretos. */ }
      console.log(JSON.stringify({ document: { code, readable } }));
      if (!readable) process.exitCode = 1;
    }
    const question = process.argv.find((item) => item.startsWith('--question='))?.slice('--question='.length);
    if (question) console.log(JSON.stringify(await app.get(KnowledgeAnswerService).answer(question, 'private'), null, 2));
  } finally { await app.close(); }
}
main().catch(() => { console.error(JSON.stringify({ ok: false, code: 'KNOWLEDGE_CHECK_FAILED' })); process.exitCode = 1; });
