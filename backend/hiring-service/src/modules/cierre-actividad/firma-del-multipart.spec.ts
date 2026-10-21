import { ValidationPipe } from '@nestjs/common';

import { ExpedirCdpConSoporteDto } from '../cdp/dto/cdp.dto';
import { RegistrarSesionComiteDto } from '../comite-contratacion/dto/comite-contratacion.dto';
import { RegistrarActividadDto } from '../registro-actividad/dto/registro-actividad.dto';

/**
 * La firma viaja como texto JSON en los multipart. Con `JSON.parse` a secas
 * llegaba como `{}` —el `whitelist` despoja un objeto plano de todos sus
 * campos— y el cierre la daba por expirada justo después de verificarla.
 *
 * Se prueba con el mismo ValidationPipe que monta `main.ts`.
 */
describe('Firma dentro de un multipart', () => {
  const pipe = new ValidationPipe({ whitelist: true, forbidNonWhitelisted: false, transform: true });
  const firma = { id: 'OTP-1234', fechaFirma: new Date().toISOString(), metodo: 'OTP_EMAIL' };

  const casos: Array<[string, any, Record<string, string>]> = [
    [
      'expedición del CDP',
      ExpedirCdpConSoporteDto,
      { numero: 'CDP-1', valor: '1000', fechaExpedicion: '2026-10-05' },
    ],
    ['sesión del comité', RegistrarSesionComiteDto, { fecha: '2026-10-05', decision: 'APROBADO' }],
    [
      'registro de actividad',
      RegistrarActividadDto,
      { fecha: '2026-10-05', nota: 'Se registró la actividad con su soporte' },
    ],
  ];

  it.each(casos)('conserva los campos de la firma en la %s', async (_, metatype, cuerpo) => {
    const dto = await pipe.transform(
      { ...cuerpo, firma: JSON.stringify(firma) },
      { type: 'body', metatype },
    );

    expect(dto.firma).toEqual(expect.objectContaining(firma));
  });

  it('sigue rechazando una firma sin la forma esperada', async () => {
    await expect(
      pipe.transform(
        { numero: 'CDP-1', valor: '1000', fechaExpedicion: '2026-10-05', firma: '{"id":"x"}' },
        { type: 'body', metatype: ExpedirCdpConSoporteDto },
      ),
    ).rejects.toThrow();
  });
});
