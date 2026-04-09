import { IsEnum, IsOptional, IsString, IsNumber } from 'class-validator';
import { ProcessStage } from '../entities/disciplinary-process.entity';

export class ChangeStageDto {
    @IsEnum(ProcessStage)
    stage: ProcessStage;

    @IsOptional()
    @IsNumber()
    kanbanStage?: number;

    @IsOptional()
    @IsString()
    kanbanNotice?: string;
}
