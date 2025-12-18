import { IsString, IsUUID, IsEnum, IsObject, IsArray, IsOptional } from 'class-validator';
import { EstadoPlanIndividual } from '../entities/plan-individual.entity';

export class UpdatePlanIndividualDto {
  @IsOptional()
  @IsUUID()
  auditoriaId?: string;

  @IsOptional()
  @IsString()
  nombre?: string;

  @IsOptional()
  @IsString()
  alcance?: string;

  @IsOptional()
  @IsString()
  objetivo?: string;

  @IsOptional()
  @IsString()
  procesoAuditar?: string;

  @IsOptional()
  @IsArray()
  riesgos?: any[];

  @IsOptional()
  @IsArray()
  criteriosAuditoria?: any[];

  @IsOptional()
  @IsArray()
  normativaAplicable?: any[];

  @IsOptional()
  @IsObject()
  equipoAuditor?: any;

  @IsOptional()
  @IsArray()
  documentos?: any[];

  @IsOptional()
  @IsEnum(EstadoPlanIndividual)
  estado?: EstadoPlanIndividual;
}

