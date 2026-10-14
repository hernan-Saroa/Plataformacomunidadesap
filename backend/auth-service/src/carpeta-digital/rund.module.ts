import { Module } from '@nestjs/common';
import { RundClient } from './rund-client';

/** Cliente de rund-service compartido por Carpeta Digital y el tablero del backoffice. */
@Module({
  providers: [RundClient],
  exports: [RundClient],
})
export class RundClientModule {}
