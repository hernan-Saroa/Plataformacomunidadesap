import { IsString, IsOptional, IsIn, IsInt, Min, Max, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAutosConfigurationDto {
  @ApiProperty({ description: 'Tipo de auto (ej: AUTO_APERTURA, AUTO_NO_PREVISTO)' })
  @IsString()
  tipo: string;

  @ApiProperty({ description: 'Nombre descriptivo del auto' })
  @IsString()
  nombre: string;

  @ApiPropertyOptional({ description: 'Estado del auto (activo/inactivo)', default: 'activo' })
  @IsOptional()
  @IsString()
  @IsIn(['activo', 'inactivo'])
  estado?: string;

  @ApiPropertyOptional({ description: 'Plantilla en formato base64 o link', nullable: true })
  @IsOptional()
  @IsString()
  plantilla?: string;

  @ApiPropertyOptional({ description: 'Orden para visualización', default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(9999)
  orden?: number;
}

export class UpdateAutosConfigurationDto {
  @ApiPropertyOptional({ description: 'Tipo de auto' })
  @IsOptional()
  @IsString()
  tipo?: string;

  @ApiPropertyOptional({ description: 'Nombre descriptivo del auto' })
  @IsOptional()
  @IsString()
  nombre?: string;

  @ApiPropertyOptional({ description: 'Estado del auto (activo/inactivo)' })
  @IsOptional()
  @IsString()
  @IsIn(['activo', 'inactivo'])
  estado?: string;

  @ApiPropertyOptional({ description: 'Plantilla en formato base64 o link' })
  @IsOptional()
  @IsString()
  plantilla?: string;

  @ApiPropertyOptional({ description: 'Orden para visualización' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(9999)
  orden?: number;
}

export class AutosConfigurationResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  tipo: string;

  @ApiProperty()
  nombre: string;

  @ApiProperty()
  estado: string;

  @ApiPropertyOptional()
  plantilla?: string;

  @ApiProperty()
  orden: number;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
