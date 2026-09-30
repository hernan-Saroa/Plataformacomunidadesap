import { IsString, IsNotEmpty, IsOptional, IsEmail, IsBoolean, IsNumber, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateDocenteDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  idPersona?: string;

  @ApiProperty({ example: '1020304050' })
  @IsString()
  @IsNotEmpty()
  numeroDocumento: string;

  @ApiPropertyOptional({ example: 'CC', default: 'CC' })
  @IsString()
  @IsOptional()
  tipoDocumento?: string;

  @ApiProperty({ example: 'Carlos Alberto' })
  @IsString()
  @IsNotEmpty()
  nombres: string;

  @ApiProperty({ example: 'López Restrepo' })
  @IsString()
  @IsNotEmpty()
  apellidos: string;

  @ApiPropertyOptional({ example: 'carlos.lopez@esap.edu.co' })
  @IsEmail()
  @IsOptional()
  correoInstitucional?: string;

  @ApiPropertyOptional({ example: 'carlos.lopez@gmail.com' })
  @IsEmail()
  @IsOptional()
  correoPersonal?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  telefono?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  celular?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  direccion?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  departamentoCodigo?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  departamentoNombre?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  municipioCodigo?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  municipioNombre?: string;

  @ApiPropertyOptional({ example: 'ASOCIADO' })
  @IsString()
  @IsOptional()
  escalafonDocente?: string;

  @ApiPropertyOptional({ example: 'INVESTIGADOR_SENIOR' })
  @IsString()
  @IsOptional()
  categoriaMinciencias?: string;

  @ApiPropertyOptional({ example: 'ACTIVO' })
  @IsString()
  @IsOptional()
  estadoRund?: string;

  @ApiPropertyOptional({ example: 40 })
  @IsNumber()
  @IsOptional()
  horasSemanalesMax?: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  sedePrincipalId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  sedePrincipalNombre?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  fechaIngresoEsap?: string;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  esParEvaluador?: boolean;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  fotoPerfilUrl?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  observaciones?: string;
}
