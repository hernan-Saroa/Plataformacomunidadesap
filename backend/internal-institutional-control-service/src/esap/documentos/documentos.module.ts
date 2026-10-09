import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DocumentosController } from './documentos.controller';
import { DocumentosService } from './documentos.service';
import { Documento } from './entities/documento.entity';
import { Auditoria } from '../auditorias/entities/auditoria.entity';
import { AuthModule } from '../../auth/auth.module';
import { OnlyOfficeService } from '../common/onlyoffice.service';
import { VistaPreviaController } from './vista-previa.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Documento, Auditoria]),
    AuthModule,
  ],
  controllers: [DocumentosController, VistaPreviaController],
  providers: [DocumentosService, OnlyOfficeService],
  exports: [DocumentosService, TypeOrmModule],
})
export class DocumentosModule {}

