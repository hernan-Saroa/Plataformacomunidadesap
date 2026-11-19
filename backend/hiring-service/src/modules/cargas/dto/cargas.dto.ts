import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class IniciarCargaDto {
  @ApiProperty({ description: 'Nombre original del archivo', example: 'oferta-empresa-4.zip' })
  @IsString()
  @IsNotEmpty({ message: 'Falta el nombre del archivo' })
  @MaxLength(255, { message: 'El nombre del archivo es demasiado largo' })
  nombre: string;

  @ApiPropertyOptional({ description: 'Tipo MIME que reporta el navegador', example: 'application/zip' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  tipo?: string;

  @ApiProperty({ description: 'Tamaño total en bytes', example: 157286400 })
  @Type(() => Number)
  @IsInt({ message: 'El tamaño del archivo debe ser un número entero de bytes' })
  @Min(1, { message: 'El archivo está vacío' })
  tamano: number;
}
