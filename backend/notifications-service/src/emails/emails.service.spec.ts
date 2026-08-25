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
});
