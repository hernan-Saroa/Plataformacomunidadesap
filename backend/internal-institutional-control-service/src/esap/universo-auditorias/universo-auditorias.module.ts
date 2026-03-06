import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UniversoAuditoriasController } from './universo-auditorias.controller';
import { UniversoAuditoriasService } from './universo-auditorias.service';
import { ProcesoAuditable } from './entities/proceso-auditable.entity';
import { AuthModule } from '../../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ProcesoAuditable]),
    AuthModule,
  ],
  controllers: [UniversoAuditoriasController],
  providers: [UniversoAuditoriasService],
  exports: [UniversoAuditoriasService, TypeOrmModule],
})
export class UniversoAuditoriasModule {}

