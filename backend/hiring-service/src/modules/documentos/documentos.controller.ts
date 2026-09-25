import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { DocumentosService } from './documentos.service';
import { Puede } from '../../auth/puede.guard';

/**
 * Elaboración de los documentos del proceso — actividad 5.1 (EFDS-1149).
 *
 * El sistema no redacta los documentos: exige los que corresponden a la
 * modalidad —aviso y proyecto de pliego en las competitivas, acto de
 * justificación en directa— y guarda cada uno en el expediente con su hash.
 *
 * Cargar y sustituir van por la ruta de documentos de la actividad, como en
 * cualquier otra (EFDS-2066): esta solo responde el estado propio de la 5.1
 * —si la modalidad la adelanta, si se inició, si está completa—.
 */
@ApiTags('Etapa 5 · Documentos del proceso')
@Controller('procesos/:id/documentos')
export class DocumentosController {
  constructor(private readonly service: DocumentosService) {}

  @Get()
  @Puede('ver', '5.1')
  @ApiOperation({
    summary: 'Documentos que exige la actividad y cuáles ya están cargados',
    description:
      'La lista depende de la modalidad del proceso. Responde aunque la actividad no se haya iniciado: saber qué va a pedirse es lo que permite prepararlo.',
  })
  estado(@Param('id', ParseUUIDPipe) procesoId: string) {
    return this.service.estado(procesoId);
  }
}
