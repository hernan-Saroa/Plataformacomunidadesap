import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TablerosKanbanService } from './tableros-kanban.service';
import { TablerosKanbanController } from './tableros-kanban.controller';
import { TableroKanban } from './entities/tablero-kanban.entity';
import { EtapaKanban } from './entities/etapa-kanban.entity';
import { AuthModule } from '../../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([TableroKanban, EtapaKanban]),
    AuthModule,
  ],
  controllers: [TablerosKanbanController],
  providers: [TablerosKanbanService],
  exports: [TablerosKanbanService],
})
export class TablerosKanbanModule {}

