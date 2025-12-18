import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InformesLeyController } from './informes-ley.controller';
import { InformesLeyService } from './informes-ley.service';
import { InformeLey } from './entities/informe-ley.entity';
import { EntregaInformeLey } from './entities/entrega-informe-ley.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([InformeLey, EntregaInformeLey]),
  ],
  controllers: [InformesLeyController],
  providers: [InformesLeyService],
  exports: [InformesLeyService, TypeOrmModule],
})
export class InformesLeyModule {}












