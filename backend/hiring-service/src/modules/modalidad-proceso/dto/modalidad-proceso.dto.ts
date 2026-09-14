import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

/** La modalidad que el area propone, o corrige tras una devolucion. */
export class CambiarModalidadDto {
  @ApiProperty({ description: 'Codigo de la modalidad del catalogo' })
  @IsString()
  @IsNotEmpty({ message: 'Elige la modalidad de contratacion' })
  @MaxLength(60)
  modalidad: string;
}

/**
 * Lo que el abogado decide sobre la modalidad (EFDS-1183).
 *
 * Dos desenlaces y no tres: devolver es *la* correccion —el area vuelve a
 * elegir y la manda otra vez— y no existe el «esto no procede», porque un
 * proceso siempre se tramita por alguna modalidad. Si ninguna sirve, lo que no
 * procede es la contratacion, y eso se niega en la 3.4.
 */
export class DecidirModalidadDto {
  @ApiProperty({ enum: ['APROBADO', 'DEVUELTO'] })
  @IsIn(['APROBADO', 'DEVUELTO'], {
    message: 'La modalidad se ratifica o se devuelve para corregirla',
  })
  decision: 'APROBADO' | 'DEVUELTO';

  /** Obligatorio al devolver: sin el, el area repetiria la misma eleccion. */
  @ApiProperty({ required: false, description: 'Que modalidad corresponde y por que' })
  @IsOptional()
  @IsString()
  @MinLength(10, { message: 'El motivo debe explicar qué modalidad corresponde' })
  @MaxLength(1000)
  observaciones?: string;
}
