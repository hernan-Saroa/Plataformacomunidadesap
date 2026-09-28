import { EmailsService } from './emails.service';

describe('EmailsService decision attachments', () => {
  let service: EmailsService;
  let sendMail: jest.SpyInstance;

  beforeEach(() => {
    service = new EmailsService();
    sendMail = jest
      .spyOn(service as any, 'sendMail')
      .mockResolvedValue({ sent: true });
  });

  it('envía el PDF corregido junto con las evidencias de aprobación', async () => {
    await service.sendEmailWithAttachment({
      to: 'persona@example.com',
      subject: 'Corrección aprobada',
      attachmentName: 'certificado.pdf',
      attachmentBase64: Buffer.from('pdf').toString('base64'),
      attachmentContentType: 'application/pdf',
      additionalAttachments: [
        {
          filename: 'evidencia.png',
          contentBase64: Buffer.from('imagen').toString('base64'),
          contentType: 'image/png',
        },
      ],
    });

    const payload = sendMail.mock.calls[0][0];
    expect(payload.attachments).toHaveLength(2);
    expect(payload.attachments[0].filename).toBe('certificado.pdf');
    expect(payload.attachments[1].filename).toBe('evidencia.png');
    expect(payload.attachments[1].content).toEqual(Buffer.from('imagen'));
  });

  it('envía las evidencias adjuntas al correo de rechazo', async () => {
    await service.sendEmail({
      to: 'persona@example.com',
      subject: 'Corrección no aprobada',
      text: 'Resultado de la revisión',
      attachments: [
        {
          filename: 'respuesta.jpg',
          contentBase64: Buffer.from('evidencia').toString('base64'),
          contentType: 'image/jpeg',
        },
      ],
    });

    const payload = sendMail.mock.calls[0][0];
    expect(payload.attachments).toHaveLength(1);
    expect(payload.attachments[0].filename).toBe('respuesta.jpg');
    expect(payload.attachments[0].contentType).toBe('image/jpeg');
  });

  describe('parseEmailRedirectConfig', () => {
    it('parsea formato compuesto con punto y coma (PRE;correo@esap.edu.co)', () => {
      process.env.EMAIL_REDIRECT_TO = 'PRE;desarrollo.ccd@esap.edu.co';
      const config = (service as any).parseEmailRedirectConfig();
      expect(config).toEqual({
        environmentName: 'PRE',
        redirectEmail: 'desarrollo.ccd@esap.edu.co',
      });
    });

    it('parsea formato compuesto con pipe (DEV|test@esap.edu.co)', () => {
      process.env.EMAIL_REDIRECT_TO = 'dev|test@esap.edu.co';
      const config = (service as any).parseEmailRedirectConfig();
      expect(config).toEqual({
        environmentName: 'DEV',
        redirectEmail: 'test@esap.edu.co',
      });
    });

    it('soporta correo directo sin prefijo y asigna "AMBIENTE NO DETECTADO"', () => {
      process.env.EMAIL_REDIRECT_TO = 'directo@esap.edu.co';
      const config = (service as any).parseEmailRedirectConfig();
      expect(config).toEqual({
        environmentName: 'AMBIENTE NO DETECTADO',
        redirectEmail: 'directo@esap.edu.co',
      });
    });

    it('retorna null si EMAIL_REDIRECT_TO no está configurado', () => {
      delete process.env.EMAIL_REDIRECT_TO;
      const config = (service as any).parseEmailRedirectConfig();
      expect(config).toBeNull();
    });
  });
});
