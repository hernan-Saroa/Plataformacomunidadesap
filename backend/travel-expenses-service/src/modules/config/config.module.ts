import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigController } from './config.controller';
import { ConfigService } from './config.service';
import { CampoFormularioEntity } from '../../entities/config/campo-formulario.entity';
import { ConfigTipoComisionadoEntity } from '../../entities/config/config-tipo-comisionado.entity';
import { TipoDocumentoSoporteEntity } from '../../entities/config/tipo-documento-soporte.entity';
import { ConfigTipoComisionadoDocumentoEntity } from '../../entities/config/config-tipo-comisionado-documento.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CampoFormularioEntity,
      ConfigTipoComisionadoEntity,
      TipoDocumentoSoporteEntity,
      ConfigTipoComisionadoDocumentoEntity,
    ]),
  ],
  controllers: [ConfigController],
  providers: [ConfigService],
  exports: [ConfigService],
})
export class ConfigModule {}
