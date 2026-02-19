import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfiguracionProfesionalOCIG } from './entities/configuracion-profesional-ocig.entity';
import { ConfiguracionesProfesionalesOCIGService } from './configuraciones-profesionales-ocig.service';
import { ConfiguracionesProfesionalesOCIGController } from './configuraciones-profesionales-ocig.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ConfiguracionProfesionalOCIG])],
  controllers: [ConfiguracionesProfesionalesOCIGController],
  providers: [ConfiguracionesProfesionalesOCIGService],
  exports: [ConfiguracionesProfesionalesOCIGService],
})
export class ConfiguracionesModule {}
