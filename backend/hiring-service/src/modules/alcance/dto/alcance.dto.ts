import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsIn, IsString, Matches, ValidateNested } from 'class-validator';

import { ACCIONES, Accion } from '../../../auth/alcance';

/** Una acción en un lugar: «ver en E3», «editar en 7.2». */
export class AlcanceDto {
  @ApiProperty({ enum: ACCIONES })
  @IsIn(ACCIONES as unknown as string[], { message: 'La acción es ver, editar, aprobar o decidir' })
  accion: Accion;

  @ApiProperty({ description: "TODO, una etapa (E3), un punto (7.2) o un trámite (INC.1)", example: 'E3' })
  @IsString()
  @Matches(/^(TODO|E\d{1,2}|\d{1,2}\.\d{1,2}|INC\.[12])$/, {
    message: 'El lugar es TODO, una etapa como E3, un punto como 7.2 o un trámite INC.1 / INC.2',
  })
  lugar: string;
}

export class GuardarAlcancesDto {
  @ApiProperty({ type: [AlcanceDto] })
  @IsArray()
  // Sesenta puntos por cuatro acciones, más etapas y trámites: por encima de
  // esto no es una matriz, es un error del cliente.
  @ArrayMaxSize(400)
  @ValidateNested({ each: true })
  @Type(() => AlcanceDto)
  alcances: AlcanceDto[];
}
