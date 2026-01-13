import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EvidenciasController } from './evidencias.controller';
import { EvidenciasService } from './evidencias.service';
import { EvidenciaDocumento } from './entities/evidencia-documento.entity';

@Module({
  imports: [TypeOrmModule.forFeature([EvidenciaDocumento])],
  controllers: [EvidenciasController],
  providers: [EvidenciasService],
  exports: [EvidenciasService],
})
export class EvidenciasModule {}
