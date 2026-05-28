import { IsOptional, IsString, IsUUID, IsArray } from 'class-validator';

export class UpdateRolPlanAnual5Dto {
  @IsOptional()
  @IsString()
  responsable?: string;

  @IsOptional()
  @IsUUID('all')
  responsable_id?: string;

  @IsOptional()
  @IsArray()
  responsables?: Array<{ id: string; nombre: string; cargo?: string; email?: string }>;
}
