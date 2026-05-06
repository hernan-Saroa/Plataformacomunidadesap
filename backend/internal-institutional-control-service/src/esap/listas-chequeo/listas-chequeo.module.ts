import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ListasChequeoController } from './listas-chequeo.controller';
import { ListasChequeoService } from './listas-chequeo.service';
import { ListaChequeo } from './entities/lista-chequeo.entity';
import { ItemListaChequeo } from './entities/item-lista-chequeo.entity';
import { Auditoria } from '../auditorias/entities/auditoria.entity';
import { EtapaKanban } from '../tableros-kanban/entities/etapa-kanban.entity';
import { AuthModule } from '../../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ListaChequeo,
      ItemListaChequeo,
      Auditoria,
      EtapaKanban,
    ]),
    AuthModule,
  ],
  controllers: [ListasChequeoController],
  providers: [ListasChequeoService],
  exports: [ListasChequeoService, TypeOrmModule],
})
export class ListasChequeoModule {}
