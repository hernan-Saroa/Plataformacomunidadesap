import { IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class ReturnNewsDto {
    @IsString()
    @IsNotEmpty()
    observaciones: string;

    @IsString()
    @IsOptional()
    radicadorId?: string;

    @IsString()
    @IsOptional()
    radicadorNombre?: string;
}
