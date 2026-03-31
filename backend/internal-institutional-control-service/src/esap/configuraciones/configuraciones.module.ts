import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfiguracionProfesionalOCIG } from './entities/configuracion-profesional-ocig.entity';
import { ConfiguracionesProfesionalesOCIGService } from './configuraciones-profesionales-ocig.service';
import { ConfiguracionesProfesionalesOCIGController } from './configuraciones-profesionales-ocig.controller';
import { AuthModule } from '../../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ConfiguracionProfesionalOCIG]),
    AuthModule,
  ],
  controllers: [ConfiguracionesProfesionalesOCIGController],
  providers: [ConfiguracionesProfesionalesOCIGService],
  exports: [ConfiguracionesProfesionalesOCIGService],
})
export class ConfiguracionesModule {}
