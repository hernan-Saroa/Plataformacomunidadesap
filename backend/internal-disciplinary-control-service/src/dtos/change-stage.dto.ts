import { IsEnum } from 'class-validator';
import { ProcessStage } from '../entities/disciplinary-process.entity';

export class ChangeStageDto {
    @IsEnum(ProcessStage)
    stage: ProcessStage;
}
