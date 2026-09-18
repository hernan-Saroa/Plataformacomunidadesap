import { IsString, IsNotEmpty, IsOptional, IsNumber, IsBoolean, IsUUID, Min, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

const TIPOS_ESPACIO = ['AULA', 'AUDITORIO', 'LABORATORIO', 'OFICINA', 'BIBLIOTECA', 'SALA_CONSEJO'] as const;
type TipoEspacio = (typeof TIPOS_ESPACIO)[number];

export const ES_TIPO_ESPACIO_VALIDO = (v: string): v is TipoEspacio => (TIPOS_ESPACIO as readonly string[]).includes(v);
export const TIPOS_ESPACIO_LISTA = TIPOS_ESPACIO;

export class CreateEspacioDto {
  @ApiProperty({ example: 'id-bloque-uuid' })
  @IsUUID('4', { message: 'idBloque debe ser un UUID v4 válido.' })
  @IsNotEmpty()
  idBloque: string;

  @ApiProperty({ example: 'AULA-101' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50, { message: 'Codigo maximo 50 caracteres.' })
  codigo: string;

  @ApiProperty({ example: 'Aula Magistral 101' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  nombre: string;

  @ApiProperty({ example: 'AULA' })
  @IsString()
  @IsNotEmpty()
  tipo: TipoEspacio;

  @ApiPropertyOptional({ example: 40 })
  @IsNumber({}, { message: 'Capacidad debe ser un número entero.' })
  @Min(1, { message: 'Capacidad minima 1 puesto.' })
  @IsOptional()
  capacidad?: number;

  @ApiPropertyOptional({ example: 1 })
  @IsNumber({}, { message: 'Piso debe ser un número entero.' })
  @IsOptional()
  piso?: number;

  @ApiPropertyOptional({ example: 65.5 })
  @IsNumber({}, { message: 'Area M2 debe ser un número.' })
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
  estado?: 'DISPONIBLE' | 'MANTENIMIENTO' | 'INACTIVO' | 'RESERVADO';

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  isActivo?: boolean;
}

export type UpdateEspacioDto = Partial<CreateEspacioDto> & { isActivo?: boolean };

export class UpdateEstadoEspacioDto {
  @ApiProperty({ example: 'MANTENIMIENTO' })
  @IsString()
  @IsNotEmpty()
  estado: 'DISPONIBLE' | 'MANTENIMIENTO' | 'INACTIVO' | 'RESERVADO';
}
