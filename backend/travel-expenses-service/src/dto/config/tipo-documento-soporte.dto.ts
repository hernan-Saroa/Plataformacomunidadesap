import {
  IsString,
  Length,
  IsOptional,
  IsBoolean,
  Matches,
} from 'class-validator';

export class CreateTipoDocumentoSoporteDto {
  @IsString()
  @Length(2, 50)
  @Matches(/^[A-Z0-9_-]+$/, {
    message: 'El código solo puede contener letras mayúsculas, números, guiones y guiones bajos (ej. CERT_BANCARIA)',
  })
  codigo: string;

  @IsString()
  @Length(2, 100)
  nombre: string;

  @IsOptional()
  @IsString()
  @Length(0, 255)
  descripcion?: string;

  @IsOptional()
  @IsString()
  instruccionesValidacion?: string;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}

export class UpdateTipoDocumentoSoporteDto {
  @IsOptional()
  @IsString()
  @Length(2, 100)
  nombre?: string;

  @IsOptional()
  @IsString()
  @Length(0, 255)
  descripcion?: string;

  @IsOptional()
  @IsString()
  instruccionesValidacion?: string;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
