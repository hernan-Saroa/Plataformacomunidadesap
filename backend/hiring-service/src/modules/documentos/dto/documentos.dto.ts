import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CargarDocumentoDto {
  /**
   * Cuál de los documentos que la actividad exige es este.
   *
   * Va en el cuerpo y no en la ruta porque la petición ya es multipart —el
   * archivo manda— y porque `POST /procesos/:id/documentos/:codigo` chocaría
   * con `/documentos/iniciar`, que es una ruta fija de la misma actividad.
   */
  @ApiProperty({ description: 'Código del documento requerido', example: 'PROYECTO_PLIEGO' })
  @IsString()
  @IsNotEmpty({ message: 'Indica qué documento estás cargando' })
  @MaxLength(60)
  codigo: string;
}
