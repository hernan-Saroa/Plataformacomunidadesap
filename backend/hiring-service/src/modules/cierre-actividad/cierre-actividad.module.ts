import { Module } from '@nestjs/common';

import { CadenaAprobacionModule } from '../cadena-aprobacion/cadena-aprobacion.module';
import { CierreActividadService } from './cierre-actividad.service';

/**
 * Sin dependencias de otros módulos a propósito: cualquier panel con trámite
 * propio (CDP, comité, garantías...) puede importar esto para preguntar por
 * la aprobación y la firma configuradas en su actividad, sin arrastrar el
 * trámite completo de `AprobacionModule` ni cerrar un ciclo con él.
 *
 * La única excepción es la cadena de aprobación (migración 101), que tampoco
 * depende de nada: el cierre abre la ronda cuando la actividad entra en
 * revisión.
 */
@Module({
  imports: [CadenaAprobacionModule],
  providers: [CierreActividadService],
  exports: [CierreActividadService],
})
export class CierreActividadModule {}
