import { Global, Module } from '@nestjs/common';

import { ContratoClient } from '../asignaciones/contrato-client.js';
import { DocenciaService } from './docencia.service.js';

/**
 * Docencia del profesor (EFDS-2306): registro único en la franja y horas por el
 * cálculo único del contrato. Global: la usan el acumulado, la asignación, el
 * portal y la concertación.
 */
@Global()
@Module({
  providers: [DocenciaService, ContratoClient],
  exports: [DocenciaService],
})
export class DocenciaModule {}
