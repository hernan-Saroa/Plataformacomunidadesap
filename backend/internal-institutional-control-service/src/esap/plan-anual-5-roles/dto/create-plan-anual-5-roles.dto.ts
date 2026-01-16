import { IsInt, IsString, IsNotEmpty, IsOptional, Min, Max } from 'class-validator';

export class CreatePlanAnual5RolesDto {
  @IsInt()
  @Min(2020)
  @Max(2100)
  año: number;

  @IsString()
  @IsNotEmpty()
  responsable: string;

  @IsOptional()
  @IsString()
  estado?: 'borrador' | 'en-revision' | 'aprobado' | 'en-ejecucion' | 'completado';
}

