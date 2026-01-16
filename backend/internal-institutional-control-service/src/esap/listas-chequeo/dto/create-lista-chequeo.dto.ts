import { IsString, IsOptional, IsBoolean, IsArray, ValidateNested, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';

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
  @IsString()
  tipo?: string;

  @IsOptional()
  @IsString()
  categoria?: string;

  @IsOptional()
  @IsString()
  version?: string;

  @IsOptional()
  @IsString()
  estado?: string;

  @IsOptional()
  aplicablePara?: any[];

  @IsOptional()
  @IsString()
  createdBy?: string;

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
