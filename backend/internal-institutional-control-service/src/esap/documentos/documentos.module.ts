import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DocumentosController } from './documentos.controller';
import { DocumentosService } from './documentos.service';
import { Documento } from './entities/documento.entity';
import { Auditoria } from '../auditorias/entities/auditoria.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Documento, Auditoria]),
  ],
  controllers: [DocumentosController],
  providers: [DocumentosService],
  exports: [DocumentosService, TypeOrmModule],
})
export class DocumentosModule {}

