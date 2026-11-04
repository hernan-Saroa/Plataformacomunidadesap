import { Body, Controller, Get, Header, HttpCode, Post } from '@nestjs/common';
import { ArrayMaxSize, IsArray, IsOptional, IsString, Matches, MaxLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { PublicChatService } from './public-chat.service';

export class ChatTurnDto {
  @IsString()
  @MaxLength(500)
  pregunta!: string;

  @IsString()
  @MaxLength(1500)
  respuesta!: string;
}

export class ConsultaPublicaDto {
  @IsString()
  @Matches(/\S/)
  @MaxLength(2000)
  contenido!: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(4)
  @ValidateNested({ each: true })
  @Type(() => ChatTurnDto)
  historial?: ChatTurnDto[];
}

// Este controlador no expone conversaciones ni datos de usuarios.
@Controller(['public', 'api/v1/public'])
export class PublicChatController {
  constructor(private readonly service: PublicChatService) {}

  @Get('config')
  @Header('Cache-Control', 'no-store')
  configuracion() {
    return this.service.configuracion();
  }

  @Post('consultas')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  consultar(@Body() dto: ConsultaPublicaDto) {
    return this.service.consultar(dto.contenido, dto.historial);
  }
}
