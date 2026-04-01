import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class ApproveReassignmentRequestDto {
  @IsBoolean()
  approved: boolean;

  @IsOptional()
  @IsString()
  jefeObservations?: string;

  @IsOptional()
  @IsString()
  rejectionReason?: string;

  @IsString()
  resolvedBy: string;

  @IsOptional()
  @IsString()
  resolvedById?: string;
}