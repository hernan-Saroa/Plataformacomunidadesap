import { IsString, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSedeDto {
  @ApiProperty({ example: 'TERR-BOYACA' })
  @IsString()
  @IsNotEmpty()
  codigo: string;

  @ApiProperty({ example: 'Territorial Boyacá - Casanare' })
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @ApiPropertyOptional({ example: 'TERRITORIAL' })
  @IsString()
  @IsOptional()
  tipo?: string;

  @ApiProperty({ example: 'Boyacá' })
  @IsString()
  @IsNotEmpty()
  departamento: string;

  @ApiProperty({ example: 'Tunja' })
  @IsString()
  @IsNotEmpty()
  municipio: string;

  @ApiProperty({ example: 'Calle 20 # 9 - 45' })
  @IsString()
  @IsNotEmpty()
  direccion: string;

  @ApiPropertyOptional({ example: '(608) 7421234' })
  @IsString()
  @IsOptional()
  telefono?: string;

  @ApiPropertyOptional({ example: 'tunja@esap.edu.co' })
  @IsString()
  @IsOptional()
  emailContacto?: string;
}

export class CreateBloqueDto {
  @ApiProperty({ example: 'id-sede-uuid' })
  @IsString()
  @IsNotEmpty()
  idSede: string;

  @ApiProperty({ example: 'BLQ-A' })
  @IsString()
  @IsNotEmpty()
  codigo: string;

  @ApiProperty({ example: 'Bloque Académico Principal' })
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @ApiPropertyOptional({ example: 4 })
  @IsOptional()
  pisos?: number;

  @ApiPropertyOptional({ example: 'Edificio de aulas y laboratorios' })
  @IsString()
  @IsOptional()
  descripcion?: string;
}
