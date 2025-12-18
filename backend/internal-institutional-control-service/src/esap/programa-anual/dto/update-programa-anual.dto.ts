import { IsOptional, IsString, IsEnum, IsInt, Min, Max } from 'class-validator';

export class UpdateProgramaAnualDto {
  @IsOptional()
  @IsInt()
  @Min(2020)
  @Max(2100)
  año?: number;


  @IsString()
  @IsOptional()
  nombre?: string;

  @IsOptional()
  @IsString()
  version?: string;

  @IsString()
  @IsOptional()
  creadoPor?: string;

  @IsOptional()
  @IsEnum(['borrador', 'aprobado', 'en-ejecucion', 'cerrado'])
  estado?: 'borrador' | 'aprobado' | 'en-ejecucion' | 'cerrado';
}

