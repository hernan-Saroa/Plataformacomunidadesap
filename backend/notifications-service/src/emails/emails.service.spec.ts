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

  describe('correo desviado (EFDS-2406)', () => {
    const decision = (extra: any = {}) => ({
      permitido: false, motivo: 'modulo_inactivo', modulo: 'viaticos', modulo_nombre: 'Viáticos', clave: 'v_x',
      prioridad: 'Media', canal: 'ambos', evento: null, desvio: 'buzon@esap.edu.co', ...extra,
    });
    const conCompuerta = (d: any) => {
      const s = new EmailsService({ evaluar: jest.fn().mockResolvedValue(d) } as any);
      const envio = jest.spyOn(s as any, 'sendMail').mockResolvedValue({ sent: true });
      return { s, envio };
    };
    const correo = { to: 'real@esap.edu.co', subject: 'Hola', text: 'Cuerpo', evento: 'v_x', modulo: 'viaticos' };

    it('va al buzón en vez del destinatario, con prefijo, aviso arriba y adjuntos del original', async () => {
      const { s, envio } = conCompuerta(decision());
      const r = await s.enviarSiPermitido({
        ...correo,
        html: '<p>Cuerpo</p>',
        attachments: [{ filename: 'a.pdf', contentBase64: Buffer.from('x').toString('base64'), contentType: 'application/pdf' }],
      });
      expect(r).toMatchObject({ sent: false, omitida: true, motivo: 'desviado', desviado_a: 'buzon@esap.edu.co' });
      const payload = envio.mock.calls[0][0] as any;
      expect(payload.to).toBe('buzon@esap.edu.co');
      expect(payload.subject).toBe('[Desviado · Viáticos · v_x] Hola');
      expect(payload.text.startsWith('Este aviso era para real@esap.edu.co (correo). Se desvió porque el módulo Viáticos está apagado.')).toBe(true);
      expect(payload.text).toContain('Cuerpo');
      expect(payload.html).toContain('real@esap.edu.co (correo)');
      expect(payload.html.indexOf('Aviso desviado')).toBeLessThan(payload.html.indexOf('<p>Cuerpo</p>'));
      expect(payload.attachments).toHaveLength(1);
      expect(payload.attachments[0].filename).toBe('a.pdf');
    });

    it('si lo apagado es el aviso, la nota lo dice así', async () => {
      const { s, envio } = conCompuerta(decision({ motivo: 'evento_inactivo', evento: { nombre: 'Viático aprobado' } }));
      await s.enviarSiPermitido(correo);
      expect((envio.mock.calls[0][0] as any).text).toContain('el aviso Viático aprobado está apagado');
    });

    it('sin html escapa el texto del aviso original', async () => {
      const { s, envio } = conCompuerta(decision());
      await s.enviarSiPermitido({ ...correo, text: '<b>x</b>' });
      expect((envio.mock.calls[0][0] as any).html).toContain('&lt;b&gt;x&lt;/b&gt;');
    });

    it('sin desvío la omisión sigue siendo omisión y no sale ningún correo', async () => {
      const { s, envio } = conCompuerta(decision({ desvio: undefined }));
      const r = await s.enviarSiPermitido(correo);
      expect(r).toMatchObject({ sent: false, omitida: true, motivo: 'modulo_inactivo' });
      expect(envio).not.toHaveBeenCalled();
    });

    it('un aviso permitido sale al destinatario real, sin prefijo', async () => {
      const { s, envio } = conCompuerta({ ...decision(), permitido: true, desvio: undefined });
      await s.enviarSiPermitido(correo);
      const payload = envio.mock.calls[0][0] as any;
      expect(payload.to).toBe('real@esap.edu.co');
      expect(payload.subject).toBe('Hola');
    });
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
