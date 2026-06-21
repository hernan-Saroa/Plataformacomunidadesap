import { IsIn, IsNotEmpty, IsOptional, IsString, IsNumber } from 'class-validator';

export class DecisionAuditorDto {
  @IsString()
  @IsNotEmpty()
  @IsIn(['ratificado', 'modificado', 'retirado', 'devolver'])
  tipoDecision: 'ratificado' | 'modificado' | 'retirado' | 'devolver';

  @IsString()
  @IsNotEmpty()
  fundamentacionTecnica: string;

  @IsOptional()
  @IsNumber()
  auditorId?: number;
}
