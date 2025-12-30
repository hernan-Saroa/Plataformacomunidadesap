import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PeiController } from '../controllers/pei.controller';
import { PeiService } from '../services/pei.service';
import { PeiIndicador } from '../entities/pei-indicador.entity';
import { PeiRegistroAvance } from '../entities/pei-registro-avance.entity';

@Module({
    imports: [TypeOrmModule.forFeature([PeiIndicador, PeiRegistroAvance])],
    controllers: [PeiController],
    providers: [PeiService],
    exports: [PeiService]
})
export class PeiModule { }
