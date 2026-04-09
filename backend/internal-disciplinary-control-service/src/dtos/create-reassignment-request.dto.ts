import { IsString, IsOptional, IsUUID, IsEnum } from 'class-validator';
import { ReassignmentPriority } from '../entities/disciplinary-process-reassignment-request.entity';

export class CreateReassignmentRequestDto {
  @IsUUID()
  processId: string;

  @IsString()
  newProfessionalId: string;

  @IsString()
  justification: string;

  @IsOptional()
  @IsEnum(ReassignmentPriority)
  priority?: ReassignmentPriority;

  @IsString()
  requestedBy: string;

  @IsOptional()
  @IsString()
  requestedById?: string;
}