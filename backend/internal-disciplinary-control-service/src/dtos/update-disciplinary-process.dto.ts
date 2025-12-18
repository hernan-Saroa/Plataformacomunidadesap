import { IsOptional, IsString, IsUUID, IsObject, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

class DisciplinableUpdateDto {
    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    nombre?: string;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    cedula?: string;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    cargo?: string;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    email?: string;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    dependencia?: string;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    telefono?: string;
}

export class UpdateDisciplinaryProcessDto {
    @ApiProperty({ description: 'ID del nuevo abogado a asignar', required: false })
    @IsOptional()
    @IsUUID()
    abogadoId?: string;

    @ApiProperty({ description: 'Nuevos hechos del proceso', required: false })
    @IsOptional()
    @IsString()
    hechos?: string;

    @ApiProperty({ description: 'Datos del disciplinable', required: false })
    @IsOptional()
    @IsObject()
    @ValidateNested()
    @Type(() => DisciplinableUpdateDto)
    disciplinable?: DisciplinableUpdateDto;
}
