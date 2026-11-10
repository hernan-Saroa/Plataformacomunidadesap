import { Body, Controller, Post, Res } from '@nestjs/common';
import type { Response } from 'express';
import { EmailsService } from './emails.service';
import { SendValidationCodeDto } from './dto/send-validation-code.dto';
import { SendEmailAttachmentDto } from './dto/send-email-attachment.dto';
import { SendEmailDto } from './dto/send-email.dto';

@Controller('api/v1/emails')
export class EmailsController {
  constructor(private readonly emailsService: EmailsService) {}

  @Post('validation-code')
  async sendValidationCode(@Body() payload: SendValidationCodeDto) {
    await this.emailsService.sendValidationCode(payload);
    return { message: 'Código de validación enviado' };
  }

  @Post('send-with-attachment')
  async sendEmailWithAttachment(@Body() payload: SendEmailAttachmentDto) {
    await this.emailsService.sendEmailWithAttachment(payload);
    return { message: 'Correo con adjunto enviado' };
  }

  // 202 cuando la configuración de notificaciones omite el correo del evento
  @Post('send')
  async sendEmail(@Body() payload: SendEmailDto, @Res({ passthrough: true }) res: Response) {
    const resultado = await this.emailsService.enviarSiPermitido(payload);
    if (resultado.omitida) res.status(202);
    return resultado;
  }
}
