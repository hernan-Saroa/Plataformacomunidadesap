import { Body, Controller, Get, Header, HttpCode, Post } from '@nestjs/common';
import { IsString, Matches, MaxLength } from 'class-validator';
import { PublicChatService } from './public-chat.service';

export class ConsultaPublicaDto {
  @IsString()
  @Matches(/\S/)
  @MaxLength(2000)
  contenido!: string;
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
    return this.service.consultar(dto.contenido);
  }
}
