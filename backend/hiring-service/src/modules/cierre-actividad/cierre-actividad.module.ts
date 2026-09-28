import { Module } from '@nestjs/common';

import { CierreActividadService } from './cierre-actividad.service';

/**
 * Sin dependencias de otros módulos a propósito: cualquier panel con trámite
 * propio (CDP, comité, garantías...) puede importar esto para preguntar por
 * la aprobación y la firma configuradas en su actividad, sin arrastrar el
 * trámite completo de `AprobacionModule` ni cerrar un ciclo con él.
 */
@Module({
  providers: [CierreActividadService],
  exports: [CierreActividadService],
})
export class CierreActividadModule {}
