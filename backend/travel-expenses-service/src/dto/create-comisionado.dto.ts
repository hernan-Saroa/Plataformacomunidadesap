import { IsString, Length, IsOptional, IsBoolean, IsEmail, IsIn } from 'class-validator';

export class CreateComisionadoDto {
  @IsString()
  @Length(1, 20)
  numeroDocumento: string;

  @IsString()
  @Length(1, 100)
  primerNombre: string;

  @IsString()
  @Length(1, 100)
  primerApellido: string;

  @IsOptional()
  @IsString()
  @Length(1, 100)
  segundoNombre?: string;

  @IsOptional()
  @IsString()
  @Length(1, 100)
  segundoApellido?: string;

  @IsString()
  @Length(1, 150)
  @IsEmail()
  email: string;

  @IsString()
  @Length(1, 150)
  telefonoContacto: string;

  @IsString()
  @IsIn(['FUNCIONARIO', 'CONTRATISTA', 'DOCENTE', 'ESTUDIANTE', 'INVESTIGADOR'])
  tipoComisionado: string;

  @IsString()
  @IsIn(['HUMANO', 'SECOP'])
  origenDatos: string;

  @IsOptional()
  @IsBoolean()
  autorizacionHabeasData?: boolean;
}
