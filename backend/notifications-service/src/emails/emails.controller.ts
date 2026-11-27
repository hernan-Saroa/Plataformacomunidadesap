import { Body, Controller, Post, Res } from '@nestjs/common';
import type { Response } from 'express';
import { EmailsService } from './emails.service';
import { SendValidationCodeDto } from './dto/send-validation-code.dto';
import { SendEmailAttachmentDto } from './dto/send-email-attachment.dto';
import { SendEmailDto } from './dto/send-email.dto';

@Controller()
export class EmailsController {
  constructor(private readonly emailsService: EmailsService) {}

  // En las tres rutas: 202 cuando la configuración de notificaciones omite el correo del evento.
  @Post('api/v1/emails/validation-code')
  async sendValidationCode(@Body() payload: SendValidationCodeDto, @Res({ passthrough: true }) res: Response) {
    const resultado = await this.emailsService.enviarCodigoSiPermitido(payload);
    if (resultado.omitida) res.status(202);
    return resultado;
  }

  @Post('api/v1/emails/send-with-attachment')
  async sendEmailWithAttachment(@Body() payload: SendEmailAttachmentDto, @Res({ passthrough: true }) res: Response) {
    const resultado = await this.emailsService.enviarAdjuntoSiPermitido(payload);
    if (resultado.omitida) res.status(202);
    return resultado;
  }

  @Post(['api/v1/emails/send', 'emails/send'])
  async sendEmail(@Body() payload: SendEmailDto, @Res({ passthrough: true }) res: Response) {
    const resultado = await this.emailsService.enviarSiPermitido(payload);
    if (resultado.omitida) res.status(202);
    return resultado;
  }
}
