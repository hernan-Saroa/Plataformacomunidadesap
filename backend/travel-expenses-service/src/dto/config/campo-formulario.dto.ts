import {
  IsString,
  Length,
  IsOptional,
  IsIn,
  IsInt,
  IsBoolean,
  Min,
  Max,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  TipoCampoFormulario,
  GrupoCampoFormulario,
} from '../../entities/config/campo-formulario.entity';

export class OpcionCampoFormularioDto {
  @IsString()
  @Length(1, 100)
  value: string;

  @IsString()
  @Length(1, 200)
  label: string;
}

export class CreateCampoFormularioDto {
  @IsString()
  @Length(1, 100)
  clave: string;

  @IsString()
  @Length(1, 200)
  etiqueta: string;

  @IsString()
  @IsIn(Object.values(TipoCampoFormulario))
  tipoCampo: TipoCampoFormulario;

  @IsOptional()
  @IsString()
  @Length(0, 200)
  placeholder?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OpcionCampoFormularioDto)
  opciones?: OpcionCampoFormularioDto[];

  @IsOptional()
  @IsIn(Object.values(GrupoCampoFormulario))
  grupo?: GrupoCampoFormulario;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1000)
  orden?: number;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}

export class UpdateCampoFormularioDto {
  @IsOptional()
  @IsString()
  @Length(1, 200)
  etiqueta?: string;

  @IsOptional()
  @IsString()
  @IsIn(Object.values(TipoCampoFormulario))
  tipoCampo?: TipoCampoFormulario;

  @IsOptional()
  @IsString()
  @Length(0, 200)
  placeholder?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OpcionCampoFormularioDto)
  opciones?: OpcionCampoFormularioDto[];

  @IsOptional()
  @IsIn(Object.values(GrupoCampoFormulario))
  grupo?: GrupoCampoFormulario;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1000)
  orden?: number;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}

