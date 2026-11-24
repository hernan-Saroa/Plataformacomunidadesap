import { Module } from '@nestjs/common';

import { CargasController } from './cargas.controller';
import { CargasService } from './cargas.service';

/** Cargas por partes de archivos grandes (BUG-004). La usa la recepción de ofertas. */
@Module({
  controllers: [CargasController],
  providers: [CargasService],
  exports: [CargasService],
})
export class CargasModule {}
