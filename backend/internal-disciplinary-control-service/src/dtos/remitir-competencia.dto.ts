import {
  IsString,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  IsObject,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RemitirPorCompetenciaDto {
  @ApiProperty({ description: 'ID de la noticia a remitir' })
  @IsUUID()
  @IsNotEmpty()
  newsId: string;

  @ApiProperty({ description: 'Radicado de la noticia' })
  @IsString()
  @IsNotEmpty()
  radicado: string;

  @ApiProperty({ description: 'Correo electrónico del destinatario' })
  @IsEmail()
  @IsNotEmpty()
  emailDestinatario: string;

  @ApiProperty({ description: 'Nombre de la entidad de destino' })
  @IsString()
  @IsNotEmpty()
  entidadDestino: string;

  @ApiProperty({ description: 'Justificación de la remisión' })
  @IsString()
  @IsNotEmpty()
  justificacion: string;

  @ApiProperty({ description: 'Descripción detallada en formato JSON con datos de la noticia', required: false })
  @IsOptional()
  @IsObject()
  descripcion?: {
    numeroRadicado: string;
    origen: string;
    fechaRecepcion: string;
    territorial: string;
    dependenciaDenunciado: string;
    denunciante: {
      nombre: string;
      identificacion?: string;
      cargo?: string;
      dependencia?: string;
    };
    disciplinable: {
      nombre: string;
      identificacion?: string;
      cargo?: string;
      dependencia?: string;
    };
    hechos: string;
    conductas?: string[];
    fundamentosLegales?: string[];
  };

  @ApiProperty({ description: 'Tipo de remisión (sin-competencia, factor-territorial, etc.)', required: false })
  @IsOptional()
  @IsString()
  tipoRemision?: string;

  @ApiProperty({ description: 'Usuario que realiza la remisión', required: false })
  @IsOptional()
  @IsString()
  usuarioRemision?: string;
}

export class RemisionPorCompetenciaResponseDto {
  @ApiProperty({ description: 'Indica si el correo fue enviado exitosamente' })
  success: boolean;

  @ApiProperty({ description: 'Mensaje de respuesta' })
  message: string;

  @ApiProperty({ description: 'ID de la noticia remitida' })
  newsId: string;

  @ApiProperty({ description: 'Correo electrónico al que se envió la información' })
  emailEnviado: string;

  @ApiProperty({ description: 'Fecha y hora de la remisión' })
  fechaRemision: Date;
}
