import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNumber, Min } from 'class-validator';

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
