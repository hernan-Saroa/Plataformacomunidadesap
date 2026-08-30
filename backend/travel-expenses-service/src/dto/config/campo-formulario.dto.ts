import { IsString, Length, IsOptional, IsIn, IsInt, IsBoolean, Min, Max } from 'class-validator';
import { TipoCampoFormulario, GrupoCampoFormulario } from '../../entities/config/campo-formulario.entity';

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
  opciones?: Array<{ value: string; label: string }>;

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
  @Length(0, 200)
  placeholder?: string;

  @IsOptional()
  opciones?: Array<{ value: string; label: string }>;

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
