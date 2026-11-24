import { Module } from '@nestjs/common';

import { AlertasModule } from '../alertas/alertas.module';
import { CronogramaController } from './cronograma.controller';
import { CronogramaService } from './cronograma.service';
import { CronogramaPredeterminadoController } from './cronograma-predeterminado.controller';
import { CronogramaPredeterminadoService } from './cronograma-predeterminado.service';

/**
 * Cronograma de la 5.2: por etapas (135), por actividad (138-139) y el
 * predeterminado por modalidad que se configura (140). SQL directo, como las alertas.
 */
@Module({
  imports: [AlertasModule],
  controllers: [CronogramaController, CronogramaPredeterminadoController],
  providers: [CronogramaService, CronogramaPredeterminadoService],
})
export class CronogramaModule {}
