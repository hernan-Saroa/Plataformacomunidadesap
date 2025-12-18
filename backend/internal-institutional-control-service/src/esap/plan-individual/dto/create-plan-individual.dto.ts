import { IsString, IsNotEmpty, IsUUID, IsDateString, IsEnum, IsObject, IsArray, ValidateNested, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { EstadoPlanIndividual } from '../entities/plan-individual.entity';

class RiesgoDto {
  @IsString()
  @IsNotEmpty()
  descripcion: string;

  @IsOptional()
  probabilidad?: number;

  @IsOptional()
  impacto?: number;

  @IsOptional()
  @IsEnum(['alto', 'medio', 'bajo'])
  nivel?: 'alto' | 'medio' | 'bajo';

  @IsOptional()
  @IsArray()
  controles?: string[];
}

class CriterioAuditoriaDto {
  @IsString()
  @IsNotEmpty()
  codigo: string;

  @IsString()
  @IsNotEmpty()
  descripcion: string;

  @IsString()
  @IsNotEmpty()
  normativa: string;

  @IsEnum(['cumplimiento', 'eficiencia', 'eficacia', 'economia'])
  tipo: 'cumplimiento' | 'eficiencia' | 'eficacia' | 'economia';
}

class NormativaDto {
  @IsString()
  @IsNotEmpty()
  tipo: string;

  @IsString()
  @IsNotEmpty()
  numero: string;

  @IsString()
  @IsNotEmpty()
  nombre: string;

  @IsOptional()
  @IsString()
  articulo?: string;
}

class MiembroEquipoDto {
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @IsString()
  @IsNotEmpty()
  cargo: string;

  @IsString()
  @IsNotEmpty()
  email: string;

  @IsOptional()
  @IsString()
  telefono?: string;
}

class EquipoAuditorDto {
  @ValidateNested()
  @Type(() => MiembroEquipoDto)
  auditorLider: MiembroEquipoDto;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MiembroEquipoDto)
  auditores: MiembroEquipoDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MiembroEquipoDto)
  profesionalesEspecializados?: MiembroEquipoDto[];
}

class DocumentoDto {
  @IsString()
  @IsNotEmpty()
  tipo: string;

  @IsString()
  @IsNotEmpty()
  nombre: string;

  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsOptional()
  @IsDateString()
  fechaGeneracion?: string;

  @IsEnum(['pendiente', 'generado', 'enviado'])
  estado: 'pendiente' | 'generado' | 'enviado';
}

export class CreatePlanIndividualDto {
  @IsUUID()
  @IsNotEmpty()
  auditoriaId: string;

  @IsString()
  @IsNotEmpty()
  nombre: string;

  @IsString()
  @IsNotEmpty()
  alcance: string;

  @IsString()
  @IsNotEmpty()
  objetivo: string;

  @IsString()
  @IsNotEmpty()
  procesoAuditar: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RiesgoDto)
  riesgos: RiesgoDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CriterioAuditoriaDto)
  criteriosAuditoria: CriterioAuditoriaDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => NormativaDto)
  normativaAplicable: NormativaDto[];

  @ValidateNested()
  @Type(() => EquipoAuditorDto)
  equipoAuditor: EquipoAuditorDto;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DocumentoDto)
  documentos: DocumentoDto[];
}

