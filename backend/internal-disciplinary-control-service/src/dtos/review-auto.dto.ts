import { IsEnum, IsOptional, IsString } from 'class-validator';

export enum ReviewAction {
    APPROVE = 'APPROVE',
    RETURN = 'RETURN',
}

export class ReviewAutoDto {
    @IsEnum(ReviewAction)
    action: ReviewAction;

    @IsOptional()
    @IsString()
    observaciones?: string;
}
