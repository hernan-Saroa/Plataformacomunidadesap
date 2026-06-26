import { IsOptional, IsString, Matches, IsArray } from 'class-validator';

const POSTGRES_UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class UpdateRolPlanAnual5Dto {
  @IsOptional()
  @IsString()
  responsable?: string;

  @IsOptional()
  @Matches(POSTGRES_UUID_RE, { message: 'responsable_id must be a UUID' })
  responsable_id?: string;

  @IsOptional()
  @IsArray()
  responsables?: Array<{ id: string; nombre: string; cargo?: string; email?: string }>;

  @IsOptional()
  @IsString()
  nombre?: string;

  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  activo?: boolean;
}
