import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SituacionAdministrativaEntity } from '../../entities/situacion-administrativa.entity';
import { SituacionesAdminService } from './situaciones-admin.service';
import { SituacionesAdminController } from './situaciones-admin.controller';
import { AuthModule } from '../../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([SituacionAdministrativaEntity]),
    AuthModule,
  ],
  controllers: [SituacionesAdminController],
  providers: [SituacionesAdminService],
  exports: [SituacionesAdminService],
})
export class SituacionesAdminModule {}
