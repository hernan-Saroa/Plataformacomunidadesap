import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PtaController } from './pta.controller';
import { PtaService } from './pta.service';
import { PtaEntity } from './pta.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([PtaEntity])
  ],
  controllers: [PtaController],
  providers: [PtaService],
})
export class PtaModule { }