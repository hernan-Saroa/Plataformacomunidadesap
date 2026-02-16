import { Body, Controller, Post } from '@nestjs/common';
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

  @Post('send')
  async sendEmail(@Body() payload: SendEmailDto) {
    await this.emailsService.sendEmail(payload);
    return { message: 'Correo enviado' };
  }
}
