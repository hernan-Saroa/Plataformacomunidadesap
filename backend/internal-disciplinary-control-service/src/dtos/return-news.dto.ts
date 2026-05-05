import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class ReturnNewsDto {
    @IsString()
    @IsNotEmpty()
    observaciones: string;

    @IsOptional()
    @IsString()
    radicadorId?: string;
}
