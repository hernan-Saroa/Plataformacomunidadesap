import { IsInt, IsString, IsNotEmpty, IsOptional, Min, Max } from 'class-validator';

export class CreateProgramaAnualDto {
  @IsInt()
  @Min(2020)
  @Max(2100)
  año: number;

  @IsString()
  @IsNotEmpty()
  nombre: string;

  @IsOptional()
  @IsString()
  version?: string;

  @IsString()
  @IsNotEmpty()
  creadoPor: string;
}

