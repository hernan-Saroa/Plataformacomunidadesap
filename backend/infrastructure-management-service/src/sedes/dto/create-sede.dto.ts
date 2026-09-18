import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsInt, Min, IsUUID } from 'class-validator';
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

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  isActivo?: boolean;

  @ApiPropertyOptional({ example: false })
  @IsBoolean()
  @IsOptional()
  alcanceUmi?: boolean;
}

export class CreateBloqueDto {
  @ApiProperty({ example: 'id-sede-uuid' })
  @IsUUID('4')
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
  @IsInt()
  @Min(1)
  @IsOptional()
  pisos?: number;

  @ApiPropertyOptional({ example: 'Edificio de aulas y laboratorios' })
  @IsString()
  @IsOptional()
  descripcion?: string;

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  isActivo?: boolean;
}

export type UpdateBloqueDto = Partial<CreateBloqueDto>;
