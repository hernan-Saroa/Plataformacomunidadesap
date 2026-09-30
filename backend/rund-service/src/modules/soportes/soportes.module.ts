import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SoporteDocumentalEntity } from '../../entities/soporte-documental.entity';
import { SoportesService } from './soportes.service';
import { SoportesController } from './soportes.controller';
import { AuthModule } from '../../auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([SoporteDocumentalEntity]), AuthModule],
  controllers: [SoportesController],
  providers: [SoportesService],
  exports: [SoportesService],
})
export class SoportesModule {}
