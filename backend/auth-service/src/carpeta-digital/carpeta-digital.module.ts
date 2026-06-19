import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Person } from '../users/person.entity';
import { CarpetaDigitalController } from './carpeta-digital.controller';
import { CarpetaDigital } from './carpeta-digital.entity';
import { CarpetaDigitalService } from './carpeta-digital.service';
import { TipoDocumento } from './tipo-documento.entity';
import { DocumentoCarpetaDigital } from './documento-carpeta-digital.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CarpetaDigital,
      TipoDocumento,
      DocumentoCarpetaDigital,
      Person,
    ]),
  ],
  controllers: [CarpetaDigitalController],
  providers: [CarpetaDigitalService],
  exports: [CarpetaDigitalService],
})
export class CarpetaDigitalModule {}
