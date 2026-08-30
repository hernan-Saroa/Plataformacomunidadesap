import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigController } from './config.controller';
import { ConfigService } from './config.service';
import { CampoFormularioEntity } from '../../entities/config/campo-formulario.entity';
import { ConfigTipoComisionadoEntity } from '../../entities/config/config-tipo-comisionado.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CampoFormularioEntity,
      ConfigTipoComisionadoEntity,
    ]),
  ],
  controllers: [ConfigController],
  providers: [ConfigService],
  exports: [ConfigService],
})
export class ConfigModule {}
