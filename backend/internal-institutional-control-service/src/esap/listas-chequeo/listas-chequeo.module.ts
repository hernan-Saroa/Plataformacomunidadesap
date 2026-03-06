import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ListasChequeoController } from './listas-chequeo.controller';
import { ListasChequeoService } from './listas-chequeo.service';
import { ListaChequeo } from './entities/lista-chequeo.entity';
import { ItemListaChequeo } from './entities/item-lista-chequeo.entity';
import { AuthModule } from '../../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ListaChequeo, ItemListaChequeo]),
    AuthModule,
  ],
  controllers: [ListasChequeoController],
  providers: [ListasChequeoService],
  exports: [ListasChequeoService, TypeOrmModule],
})
export class ListasChequeoModule {}
