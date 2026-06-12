import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EstructuraImportController } from './estructura-import.controller';
import { EstructuraImportService } from './estructura-import.service';
import { DireccionTerritorialEntity } from '../pta/entities/direccion-territorial.entity';
import { CetapEntity } from '../pta/entities/cetap.entity';

@Module({
  imports: [TypeOrmModule.forFeature([DireccionTerritorialEntity, CetapEntity])],
  controllers: [EstructuraImportController],
  providers: [EstructuraImportService],
})
export class EstructuraImportModule {}
