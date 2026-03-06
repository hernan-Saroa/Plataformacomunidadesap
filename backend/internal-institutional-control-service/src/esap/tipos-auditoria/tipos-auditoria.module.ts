import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TiposAuditoriaController } from './tipos-auditoria.controller';
import { TiposAuditoriaService } from './tipos-auditoria.service';
import { TipoAuditoria } from './entities/tipo-auditoria.entity';
import { AuthModule } from '../../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([TipoAuditoria]),
    AuthModule,
  ],
  controllers: [TiposAuditoriaController],
  providers: [TiposAuditoriaService],
  exports: [TiposAuditoriaService, TypeOrmModule],
})
export class TiposAuditoriaModule {}
