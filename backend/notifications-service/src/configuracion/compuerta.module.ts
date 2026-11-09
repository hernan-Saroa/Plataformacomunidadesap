import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CompuertaService } from './compuerta.service';
import { ENTIDADES_CONFIGURACION } from './entities/configuracion.entities';

/**
 * Solo la compuerta: la importan la campana y el correo. La consola de
 * administración vive en ConfiguracionModule, que importa a su vez a esos dos.
 */
@Module({
  imports: [TypeOrmModule.forFeature(ENTIDADES_CONFIGURACION)],
  providers: [CompuertaService],
  exports: [CompuertaService, TypeOrmModule],
})
export class CompuertaModule {}
