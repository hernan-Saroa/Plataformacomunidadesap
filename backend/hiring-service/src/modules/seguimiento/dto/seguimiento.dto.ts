import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

/** Carga de un soporte del seguimiento (EFDS-1168, actividad 9.2). */
export class CargarSeguimientoDto {
  @ApiProperty({
    description: 'Clase de soporte',
    enum: ['INFORME', 'ACTA', 'SOPORTE'],
  })
  @IsIn(['INFORME', 'ACTA', 'SOPORTE'], {
    message: 'El soporte es un informe, un acta u otro documento de la ejecucion',
  })
  tipo: 'INFORME' | 'ACTA' | 'SOPORTE';

  @ApiProperty({ description: 'Que acredita el soporte' })
  @IsString()
  @IsNotEmpty({ message: 'Describe que acredita el soporte' })
  @MinLength(5, { message: 'La descripcion debe decir que es, no una palabra suelta' })
  @MaxLength(1000)
  descripcion: string;

  /** La del soporte, no la del registro: un informe de enero es de enero. */
  @ApiProperty({ description: 'Fecha del soporte (YYYY-MM-DD)' })
  @IsDateString({}, { message: 'La fecha del soporte debe tener el formato YYYY-MM-DD' })
  fechaSoporte: string;

  @ApiPropertyOptional({ description: 'Inicio del periodo que cubre (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString({}, { message: 'El inicio del periodo debe tener el formato YYYY-MM-DD' })
  periodoDesde?: string;

  @ApiPropertyOptional({ description: 'Fin del periodo que cubre (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString({}, { message: 'El fin del periodo debe tener el formato YYYY-MM-DD' })
  periodoHasta?: string;
}
