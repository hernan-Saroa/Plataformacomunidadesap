import { IsString, IsOptional, IsBoolean, IsArray, ValidateNested, IsUUID, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateItemListaChequeoDto } from './create-lista-chequeo.dto';
import { TipoListaChequeo } from '../entities/lista-chequeo.entity';

export class UpdateListaChequeoDto {
  @IsOptional()
  @IsString()
  codigo?: string;

  @IsOptional()
  @IsString()
  nombre?: string;

  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsOptional()
  @IsEnum(TipoListaChequeo)
  tipo?: TipoListaChequeo;

  @IsOptional()
  @IsUUID()
  tipoAuditoriaId?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateItemListaChequeoDto)
  items?: CreateItemListaChequeoDto[];

  @IsOptional()
  @IsBoolean()
  activa?: boolean;
}
