import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsInt,
  IsISO8601,
  IsNumber,
  IsOptional,
  Min,
  ValidateIf,
} from 'class-validator';

import { UnidadUmbral } from '../../../entities/umbral-modalidad.entity';

export class CrearUmbralDto {
  /**
   * Null es un valor con significado —"sin piso"—, distinto de omitir el
   * campo, así que se acepta explícitamente en vez de tratarlo como ausencia.
   */
  @ApiPropertyOptional({
    description: 'Límite inferior del rango, inclusive. Null = sin piso',
    example: 1000,
    nullable: true,
  })
  @ValidateIf((_, valor) => valor !== null)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'El límite inferior debe ser un número' })
  @Min(0, { message: 'El límite inferior no puede ser negativo' })
  limiteInferior: number | null = null;

  @ApiPropertyOptional({
    description: 'Límite superior del rango, exclusive. Null = sin techo',
    example: null,
    nullable: true,
  })
  @ValidateIf((_, valor) => valor !== null)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'El límite superior debe ser un número' })
  @Min(0, { message: 'El límite superior no puede ser negativo' })
  limiteSuperior: number | null = null;

  @ApiProperty({
    description:
      'SMMLV para lo que la ley define en salarios mínimos; PESOS para topes en cifra cerrada',
    enum: ['SMMLV', 'PESOS'],
    example: 'SMMLV',
  })
  @IsIn(['SMMLV', 'PESOS'], { message: 'La unidad debe ser SMMLV o PESOS' })
  unidad: UnidadUmbral;

  @ApiPropertyOptional({
    description: 'Desde cuándo rige (YYYY-MM-DD). Por omisión, hoy',
    example: '2027-01-01',
  })
  @IsOptional()
  @IsISO8601({ strict: true }, { message: 'La vigencia debe tener formato YYYY-MM-DD' })
  vigenciaDesde?: string;
}

export class GuardarSmmlvDto {
  @ApiProperty({ description: 'Año al que corresponde el salario', example: 2027 })
  @IsInt({ message: 'El año debe ser un entero' })
  @Min(2000, { message: 'El año no es plausible' })
  anio: number;

  @ApiProperty({ description: 'Salario mínimo mensual legal vigente, en pesos', example: 1623500 })
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'El salario debe ser un número' })
  @Min(1, { message: 'El salario debe ser mayor que cero' })
  valor: number;
}
