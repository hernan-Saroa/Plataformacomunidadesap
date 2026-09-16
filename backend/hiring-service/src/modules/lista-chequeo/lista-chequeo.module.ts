import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ListaChequeoService } from './lista-chequeo.service';

import { DocumentoRequerido } from '../../entities/documento-requerido.entity';
import { DocumentoProceso } from '../../entities/documento-proceso.entity';
import { Documento } from '../../entities/documento.entity';
import { Expediente } from '../../entities/expediente.entity';
import { Modalidad } from '../../entities/modalidad.entity';
import { Proceso } from '../../entities/proceso.entity';
import { Trazabilidad } from '../../entities/trazabilidad.entity';

/**
 * La lista de chequeo de la radicación (etapa 3).
 *
 * Sin controlador propio: sus tres rutas cuelgan del estudio previo, porque
 * quién puede armar el paquete es la misma regla que protege el borrador y el
 * envío —el área que radicó el proceso— y vive en `EstudioPrevioService`.
 * Exponerlas aquí obligaría a repetirla o a dejar la carga más abierta que el
 * formulario al que acompaña.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      DocumentoRequerido,
      DocumentoProceso,
      Documento,
      Expediente,
      Modalidad,
      Proceso,
      Trazabilidad,
    ]),
  ],
  providers: [ListaChequeoService],
  exports: [ListaChequeoService],
})
export class ListaChequeoModule {}
