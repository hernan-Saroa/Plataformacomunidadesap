import { Module } from '@nestjs/common';
import { IsolucionModule } from '../isolucion/isolucion.module';
import { DocumentReaderService } from './document-reader.service';
import { OllamaService } from './ollama.service';
import { KnowledgeAnswerService } from './knowledge-answer.service';
import { IsolucionWebSessionService } from './isolucion-web-session.service';

@Module({ imports: [IsolucionModule], providers: [DocumentReaderService, OllamaService, KnowledgeAnswerService, IsolucionWebSessionService],
  exports: [KnowledgeAnswerService, OllamaService] })
export class KnowledgeModule {}
