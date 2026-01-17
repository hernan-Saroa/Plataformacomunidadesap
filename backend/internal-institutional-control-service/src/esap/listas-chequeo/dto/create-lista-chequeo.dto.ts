import { IsString, IsOptional, IsBoolean, IsArray, ValidateNested, IsUUID, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { TipoListaChequeo } from '../entities/lista-chequeo.entity';

export class CreateItemListaChequeoDto {
  @IsString()
  texto: string;

  @IsOptional()
  @IsString()
  categoria?: string;

  @IsOptional()
  @IsBoolean()
  obligatorio?: boolean;

  @IsOptional()
  orden?: number;
}

export class CreateListaChequeoDto {
  @IsString()
  codigo: string;

  @IsString()
  nombre: string;

  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsOptional()
  @IsEnum(TipoListaChequeo)
  tipo?: TipoListaChequeo;

  @IsOptional()
  @IsUUID()
  tipoAuditoriaId?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateItemListaChequeoDto)
  items: CreateItemListaChequeoDto[];

  @IsOptional()
  @IsBoolean()
  activa?: boolean;
}
