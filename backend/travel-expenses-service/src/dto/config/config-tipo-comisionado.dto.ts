import { IsString, Length, IsArray, IsOptional, IsIn, IsBoolean } from 'class-validator';

export class CreateConfigTipoComisionadoDto {
  @IsString()
  @Length(1, 50)
  tipoComisionado: string;

  @IsArray()
  @IsString({ each: true })
  camposObligatorios: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  camposOpcionales?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  camposOcultos?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  documentosObligatorios?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  documentosOcionales?: string[];

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}

export class UpdateConfigTipoComisionadoDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  camposObligatorios?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  camposOpcionales?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  camposOcultos?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  documentosObligatorios?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  documentosOpcionales?: string[];

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
