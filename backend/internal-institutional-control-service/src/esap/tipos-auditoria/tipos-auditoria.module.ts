import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TiposAuditoriaController } from './tipos-auditoria.controller';
import { TiposAuditoriaService } from './tipos-auditoria.service';
import { TipoAuditoria } from './entities/tipo-auditoria.entity';

@Module({
  imports: [TypeOrmModule.forFeature([TipoAuditoria])],
  controllers: [TiposAuditoriaController],
  providers: [TiposAuditoriaService],
  exports: [TiposAuditoriaService, TypeOrmModule],
})
export class TiposAuditoriaModule {}
