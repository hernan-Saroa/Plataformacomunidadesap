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

  describe('copia a destinatarios adicionales (EFDS-2406)', () => {
    const permitida = (extra: any = {}) => ({
      permitido: true, modulo: 'viaticos', modulo_nombre: 'Viáticos', clave: 'v_x',
      prioridad: 'Media', canal: 'ambos', evento: { clave: 'v_x' }, ...extra,
    });
    const montar = (d: any, adicionales: any[], reservas?: (c: string) => boolean | Promise<boolean>) => {
      const vistos = new Set<string>();
      const compuerta = {
        evaluar: jest.fn().mockResolvedValue(d),
        destinatariosAdicionales: jest.fn().mockResolvedValue(adicionales),
        // Por omisión imita la tabla: solo la primera reserva del mismo correo pasa.
        reservarCopiaCorreo: jest.fn(async (_m: string, _c: string, _h: string, correo: string) => {
          if (reservas) return reservas(correo);
          if (vistos.has(correo.toLowerCase())) return false;
          vistos.add(correo.toLowerCase());
          return true;
        }),
      };
      const s = new EmailsService(compuerta as any);
      const envio = jest.spyOn(s as any, 'sendMail').mockResolvedValue({ sent: true });
      return { s, envio, compuerta };
    };
    const correo = { to: 'real@esap.edu.co', subject: 'Hola', text: 'Cuerpo', html: '<p>Cuerpo</p>', evento: 'v_x', modulo: 'viaticos' };
    const adicionales = [
      { id_user: '1', email: 'copia@esap.edu.co' },
      { id_user: '2', email: 'REAL@esap.edu.co' },
    ];

    it('copia a cada adicional con el mismo asunto, cuerpo y adjuntos, y un bloque arriba', async () => {
      const { s, envio } = montar(permitida(), adicionales);
      const adj = [{ filename: 'a.pdf', contentBase64: Buffer.from('x').toString('base64'), contentType: 'application/pdf' }];
      const r = await s.enviarSiPermitido({ ...correo, attachments: adj });
      expect(r).toMatchObject({ sent: true });
      expect(envio).toHaveBeenCalledTimes(2);
      const copia = envio.mock.calls[1][0] as any;
      expect(copia.to).toBe('copia@esap.edu.co');
      expect(copia.subject).toBe('Hola');
      expect(copia.text).toContain('Recibe esta copia porque la configuración de notificaciones lo incluye en este aviso.');
      expect(copia.text).toContain('Cuerpo');
      expect(copia.html.indexOf('Recibe esta copia')).toBeLessThan(copia.html.indexOf('<p>Cuerpo</p>'));
      expect(copia.attachments).toHaveLength(1);
    });

    it('no copia al mismo destinatario aunque cambien las mayúsculas', async () => {
      const { s, envio } = montar(permitida(), [{ id_user: '2', email: 'REAL@esap.edu.co' }]);
      await s.enviarSiPermitido(correo);
      expect(envio).toHaveBeenCalledTimes(1);
    });

    it('no repite la copia la segunda vez el mismo día (tres directores, una copia)', async () => {
      const { s, envio } = montar(permitida(), [{ id_user: '1', email: 'copia@esap.edu.co' }]);
      await s.enviarSiPermitido({ ...correo, to: 'd1@esap.edu.co' });
      await s.enviarSiPermitido({ ...correo, to: 'd2@esap.edu.co' });
      await s.enviarSiPermitido({ ...correo, to: 'd3@esap.edu.co' });
      const aCopia = envio.mock.calls.filter((c: any) => c[0].to === 'copia@esap.edu.co');
      expect(aCopia).toHaveLength(1);
      expect(envio).toHaveBeenCalledTimes(4);
    });

    it('un aviso obligatorio también copia', async () => {
      const { s, envio } = montar(permitida({ obligatorio: true }), [{ id_user: '1', email: 'copia@esap.edu.co' }]);
      await s.enviarSiPermitido(correo);
      expect(envio).toHaveBeenCalledTimes(2);
    });

    it('un desvío no genera copias', async () => {
      const { s, envio, compuerta } = montar(
        permitida({ permitido: false, motivo: 'modulo_inactivo', desvio: 'buzon@esap.edu.co' }),
        [{ id_user: '1', email: 'copia@esap.edu.co' }],
      );
      await s.enviarSiPermitido(correo);
      expect(envio).toHaveBeenCalledTimes(1);
      expect(compuerta.destinatariosAdicionales).not.toHaveBeenCalled();
    });

    it('sin adicionales no hace nada más', async () => {
      const { s, envio, compuerta } = montar(permitida(), []);
      await s.enviarSiPermitido(correo);
      expect(envio).toHaveBeenCalledTimes(1);
      expect(compuerta.reservarCopiaCorreo).not.toHaveBeenCalled();
    });

    it('si la reserva falla no manda la copia y el original sale bien', async () => {
      const { s, envio } = montar(permitida(), [{ id_user: '1', email: 'copia@esap.edu.co' }], () => false);
      const r = await s.enviarSiPermitido(correo);
      expect(r).toMatchObject({ sent: true });
      expect(envio).toHaveBeenCalledTimes(1);
    });

    it('el fallo de una copia no afecta al original ni a las demás copias', async () => {
      const { s, envio } = montar(permitida(), [
        { id_user: '1', email: 'mala@esap.edu.co' },
        { id_user: '3', email: 'buena@esap.edu.co' },
      ]);
      envio.mockImplementation(async (p: any) => {
        if (p.to === 'mala@esap.edu.co') throw new Error('SMTP caído');
        return { sent: true };
      });
      const r = await s.enviarSiPermitido(correo);
      expect(r).toMatchObject({ sent: true });
      expect(envio.mock.calls.map((c: any) => c[0].to)).toEqual(['real@esap.edu.co', 'mala@esap.edu.co', 'buena@esap.edu.co']);
    });

    it('si resolver los adicionales falla, el original igual sale', async () => {
      const { s, envio, compuerta } = montar(permitida(), []);
      compuerta.destinatariosAdicionales.mockRejectedValue(new Error('db'));
      const r = await s.enviarSiPermitido(correo);
      expect(r).toMatchObject({ sent: true });
      expect(envio).toHaveBeenCalledTimes(1);
    });
  });
  describe('certificado con adjunto y código de validación por la compuerta (EFDS-2406)', () => {
    const decision = (extra: any = {}) => ({
      permitido: false, motivo: 'modulo_inactivo', modulo: 'certificados-laborales', modulo_nombre: 'Certificados Laborales',
      clave: 'certificados_certificado_emitido', prioridad: 'Media', canal: 'ambos', evento: null, ...extra,
    });
    const montar = (d: any) => {
      const compuerta = {
        evaluar: jest.fn().mockResolvedValue(d),
        destinatariosAdicionales: jest.fn().mockResolvedValue([]),
        reservarCopiaCorreo: jest.fn().mockResolvedValue(true),
      };
      const s = new EmailsService(compuerta as any);
      const envio = jest.spyOn(s as any, 'sendMail').mockResolvedValue({ sent: true });
      return { s, envio, compuerta };
    };
    const certificado = {
      to: 'persona@esap.edu.co',
      subject: 'Certificado Laboral ESAP - CL-1',
      html: '<p>Adjuntamos tu certificado</p>',
      attachmentName: 'certificado.pdf',
      attachmentBase64: Buffer.from('pdf').toString('base64'),
      attachmentContentType: 'application/pdf',
      additionalAttachments: [{ filename: 'evidencia.png', contentBase64: Buffer.from('img').toString('base64'), contentType: 'image/png' }],
      modulo: 'certificados-laborales',
      evento: 'certificados_certificado_emitido',
    };

    it('con el módulo apagado el certificado no sale', async () => {
      const { s, envio, compuerta } = montar(decision());
      const r = await s.enviarAdjuntoSiPermitido(certificado);
      expect(r).toMatchObject({ sent: false, omitida: true, motivo: 'modulo_inactivo', modulo: 'certificados-laborales' });
      expect(envio).not.toHaveBeenCalled();
      expect(compuerta.evaluar).toHaveBeenCalledWith(expect.objectContaining({
        clave: 'certificados_certificado_emitido', modulo: 'certificados-laborales', canal: 'correo', destinatario: 'persona@esap.edu.co',
      }));
    });

    it('con el aviso apagado tampoco sale', async () => {
      const { s, envio } = montar(decision({ motivo: 'evento_inactivo' }));
      const r = await s.enviarAdjuntoSiPermitido(certificado);
      expect(r).toMatchObject({ sent: false, omitida: true, motivo: 'evento_inactivo' });
      expect(envio).not.toHaveBeenCalled();
    });

    it('encendido sale al solicitante con el PDF y las evidencias', async () => {
      const { s, envio } = montar(decision({ permitido: true, motivo: undefined }));
      const r = await s.enviarAdjuntoSiPermitido(certificado);
      expect(r).toEqual({ sent: true, message: 'Correo con adjunto enviado' });
      const payload = envio.mock.calls[0][0] as any;
      expect(payload.to).toBe('persona@esap.edu.co');
      expect(payload.html).toBe('<p>Adjuntamos tu certificado</p>');
      expect(payload.attachments.map((a: any) => a.filename)).toEqual(['certificado.pdf', 'evidencia.png']);
      expect(payload.attachments[0].content).toEqual(Buffer.from('pdf'));
      expect(payload.attachments[0].contentType).toBe('application/pdf');
    });

    it('apagado y con buzón, el certificado va al buzón con su PDF', async () => {
      const { s, envio } = montar(decision({ desvio: 'buzon@esap.edu.co' }));
      const r = await s.enviarAdjuntoSiPermitido(certificado);
      expect(r).toMatchObject({ sent: false, omitida: true, motivo: 'desviado', desviado_a: 'buzon@esap.edu.co' });
      expect(envio).toHaveBeenCalledTimes(1);
      const payload = envio.mock.calls[0][0] as any;
      expect(payload.to).toBe('buzon@esap.edu.co');
      expect(payload.attachments[0].filename).toBe('certificado.pdf');
    });

    it('sin evento el adjunto sale como antes, sin consultar la configuración', async () => {
      const { s, envio, compuerta } = montar(decision());
      const { evento, modulo, ...sinEvento } = certificado;
      const r = await s.enviarAdjuntoSiPermitido(sinEvento);
      expect(r).toMatchObject({ sent: true });
      expect(compuerta.evaluar).not.toHaveBeenCalled();
      expect(envio).toHaveBeenCalledTimes(1);
    });

    const codigo = { to: 'persona@esap.edu.co', code: '123456', modulo: 'certificados-laborales', evento: 'certificados_codigo_validacion' };

    it('el código de validación (obligatorio) sale aunque el módulo esté apagado', async () => {
      const { s, envio, compuerta } = montar(decision({ permitido: true, motivo: undefined, clave: 'certificados_codigo_validacion' }));
      const r = await s.enviarCodigoSiPermitido(codigo);
      expect(r).toEqual({ sent: true, message: 'Código de validación enviado' });
      expect(compuerta.evaluar).toHaveBeenCalledWith(expect.objectContaining({ clave: 'certificados_codigo_validacion', modulo: 'certificados-laborales', canal: 'correo' }));
      expect((envio.mock.calls[0][0] as any).text).toContain('123456');
    });

    it('si la configuración omite el código, no sale ni se desvía al buzón', async () => {
      const { s, envio } = montar(decision({ desvio: 'buzon@esap.edu.co', clave: 'certificados_codigo_validacion' }));
      const r = await s.enviarCodigoSiPermitido(codigo);
      expect(r).toMatchObject({ sent: false, omitida: true, motivo: 'modulo_inactivo' });
      expect(envio).not.toHaveBeenCalled();
    });

    it('sin evento el código sale como antes', async () => {
      const { s, envio, compuerta } = montar(decision());
      const r = await s.enviarCodigoSiPermitido({ to: 'persona@esap.edu.co', code: '123456' });
      expect(r).toMatchObject({ sent: true });
      expect(compuerta.evaluar).not.toHaveBeenCalled();
      expect(envio).toHaveBeenCalledTimes(1);
    });
  });
});
