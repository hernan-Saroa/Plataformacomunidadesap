import { IsString, IsNotEmpty, IsOptional, IsNumber, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateEspacioDto {
  @ApiProperty({ example: 'id-bloque-uuid' })
  @IsString()
  @IsNotEmpty()
  idBloque: string;

  @ApiProperty({ example: 'AULA-101' })
  @IsString()
  @IsNotEmpty()
  codigo: string;

  @ApiProperty({ example: 'Aula Magistral 101' })
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @ApiProperty({ example: 'AULA' })
  @IsString()
  @IsNotEmpty()
  tipo: string;

  @ApiPropertyOptional({ example: 40 })
  @IsNumber()
  @IsOptional()
  capacidad?: number;

  @ApiPropertyOptional({ example: 1 })
  @IsNumber()
  @IsOptional()
  piso?: number;

  @ApiPropertyOptional({ example: 65.5 })
  @IsNumber()
  @IsOptional()
  areaM2?: number;

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  tieneAireAcondicionado?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  tieneVideobeam?: boolean;

  @ApiPropertyOptional({ example: false })
  @IsBoolean()
  @IsOptional()
  tieneComputadores?: boolean;

  @ApiPropertyOptional({ example: 'DISPONIBLE' })
  @IsString()
  @IsOptional()
  estado?: string;
}

export class UpdateEstadoEspacioDto {
  @ApiProperty({ example: 'MANTENIMIENTO' })
  @IsString()
  @IsNotEmpty()
  estado: string;
}
