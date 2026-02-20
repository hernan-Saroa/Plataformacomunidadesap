import { IsString, IsOptional, IsBoolean, IsEnum, IsNumber, IsEmail, Min } from 'class-validator';
import { TipoCompartido } from '../entities/expediente-compartido.entity';

export class CrearCompartidoDto {
  @IsEnum(TipoCompartido)
  @IsOptional()
  tipoCompartido?: TipoCompartido;

  @IsBoolean()
  @IsOptional()
  requiereClave?: boolean;

  @IsString()
  @IsOptional()
  clave?: string;

  @IsNumber()
  @IsOptional()
  @Min(1)
  tiempoExpiracionHoras?: number;

  @IsEmail()
  @IsOptional()
  emailDestinatario?: string;

  @IsString()
  @IsOptional()
  mensajeAdicional?: string;

  @IsBoolean()
  @IsOptional()
  esPublico?: boolean;
}

export class AccederCompartidoDto {
  @IsString()
  token: string;

  @IsString()
  @IsOptional()
  clave?: string;
}

export class VerificarClaveDto {
  @IsString()
  token: string;

  @IsString()
  clave: string;
}
