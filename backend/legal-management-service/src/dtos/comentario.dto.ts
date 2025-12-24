import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateComentarioDto {
    @IsString()
    @IsNotEmpty()
    contenido: string;

    @IsString()
    @IsOptional()
    usuarioId?: string;

    @IsString()
    @IsNotEmpty()
    usuarioNombre: string;
}
