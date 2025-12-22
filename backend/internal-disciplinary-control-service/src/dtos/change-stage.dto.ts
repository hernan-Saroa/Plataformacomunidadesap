import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ProcessStage } from '../entities/disciplinary-process.entity';

export class ChangeStageDto {
    @IsEnum(ProcessStage)
    stage: ProcessStage;

    @IsOptional()
    @IsString()
    kanbanStage?: string;

    @IsOptional()
    @IsString()
    kanbanNotice?: string;
}
