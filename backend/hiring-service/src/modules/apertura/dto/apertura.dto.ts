import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsNotEmpty, IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';

export class RegistrarAperturaDto {
  @ApiProperty({ description: 'Número de la resolución de apertura', example: '0451 de 2026' })
  @IsString()
  @IsNotEmpty({ message: 'El número de la resolución de apertura es obligatorio' })
  @MaxLength(80)
  resolucionNumero: string;

  /**
   * La del acto administrativo, no la del registro: de ella dependen los
   * términos que corren desde la apertura.
   */
  @ApiProperty({ description: 'Fecha de la resolución (YYYY-MM-DD)', example: '2026-08-12' })
  @IsDateString({}, { message: 'La fecha de la resolución debe tener el formato YYYY-MM-DD' })
  resolucionFecha: string;

  @ApiPropertyOptional({ description: 'Enlace del proceso en SECOP II' })
  @IsOptional()
  @IsUrl({}, { message: 'El enlace de SECOP II no es una URL válida' })
  @MaxLength(500)
  secopUrl?: string;
}
