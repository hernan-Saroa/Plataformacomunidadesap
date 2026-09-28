import { IsNumber, IsPositive, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class UpdateSalarioMinimoDto {
  @IsNumber({}, { message: 'El salario mínimo debe ser un valor numérico' })
  @IsPositive({ message: 'El salario mínimo debe ser un número positivo' })
  salarioMinimo: number;

  @IsOptional()
  @IsNumber()
  anio?: number;
}

export class SyncFestivosDto {
  @IsOptional()
  @IsNumber()
  year?: number;
}

export class CreateFestivoDto {
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'La fecha debe tener formato YYYY-MM-DD',
  })
  fecha: string;

  @IsString()
  @MaxLength(150, { message: 'La descripción no puede superar 150 caracteres' })
  descripcion: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  origen?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  regla?: string;
}

export class UpdateFestivoDto {
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'La fecha debe tener formato YYYY-MM-DD',
  })
  fecha?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  descripcion?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  origen?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  regla?: string;
}
