import { BadRequestException } from '@nestjs/common';

import { CadenaAprobacionService } from '../cadena-aprobacion/cadena-aprobacion.service';
import { CierreActividadService } from './cierre-actividad.service';

/**
 * Lo que decide si una actividad con panel propio se cierra sola o queda
 * pendiente de algo más (EFDS-1183, EFDS-2070).
 *
 * El CDP, el comité y las garantías no llaman a `AprobacionService` para no
 * cerrar un ciclo de módulos, así que este es el único lugar que prueba la
 * regla que todos ellos comparten.
 */
describe('CierreActividadService', () => {
  /**
   * La cadena de verdad para leer la regla —es la misma consulta que usa el
   * servicio—, pero sin abrir rondas: eso se prueba aparte, con su lógica.
   */
  const cadenas = new CadenaAprobacionService({} as never);
  cadenas.iniciar = jest.fn(async () => ({}) as never);
  cadenas.cancelarRonda = jest.fn(async () => undefined);
  const servicio = new CierreActividadService(cadenas);
  const acceso = { userName: 'Adrián Castro', userId: 'u-1' } as never;

  describe('exigirFirmaValida', () => {
    it('rechaza sin evidencia', () => {
      expect(() => servicio.exigirFirmaValida(undefined)).toThrow(BadRequestException);
    });

    it('rechaza una firma vencida', () => {
      const haceUnaHora = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      expect(() =>
        servicio.exigirFirmaValida({ id: 'OTP-1', fechaFirma: haceUnaHora, metodo: 'OTP_EMAIL' }),
      ).toThrow(BadRequestException);
    });

    it('acepta una firma reciente', () => {
      expect(() =>
        servicio.exigirFirmaValida({
          id: 'OTP-1',
          fechaFirma: new Date().toISOString(),
          metodo: 'OTP_EMAIL',
        }),
      ).not.toThrow();
    });
  });

  describe('resolverCierre', () => {
    /** Lo mínimo del EntityManager para estas pruebas. */
    const emCon = (actividadExistente: unknown, aprobadores: unknown) => {
      const guardado: any[] = [];
      const repos: Record<string, any> = {
        ProcesoActividad: {
          findOne: async () => actividadExistente,
        },
        ReglaActividad: {
          find: async () => (aprobadores ? [{ modalidad: null, config: aprobadores }] : []),
        },
      };
      const em: any = {
        getRepository: (entidad: any) => repos[entidad.name] ?? repos.ProcesoActividad,
        create: (_e: unknown, x: unknown) => x,
        save: async (_e: unknown, x: unknown) => {
          guardado.push(x);
          return x;
        },
      };
      return { em, guardado };
    };

    it('cierra en APROBADO cuando nadie revisa', async () => {
      const actividad: any = { estado: 'BORRADOR' };
      const { em } = emCon(actividad, null);

      const { estado, cierra } = await servicio.resolverCierre(
        em,
        'p-1',
        '4.3',
        'LICITACION',
        acceso,
      );

      expect(estado).toBe('APROBADO');
      expect(cierra).toBe(true);
      expect(actividad.estado).toBe('APROBADO');
      expect(actividad.revisadoPor).toBe('Adrián Castro');
    });

    it('la deja en EN_REVISION cuando la matriz configuró quién revisa', async () => {
      const actividad: any = { estado: 'BORRADOR' };
      const { em } = emCon(actividad, { roles: ['DIRECTOR_CONTRATACION'] });

      const { estado, cierra } = await servicio.resolverCierre(
        em,
        'p-1',
        '4.3',
        'LICITACION',
        acceso,
      );

      expect(estado).toBe('EN_REVISION');
      expect(cierra).toBe(false);
      expect(actividad.revisadoPor).toBeUndefined();
      // Y abre la ronda en el primer escalón de la cadena.
      expect(cadenas.iniciar).toHaveBeenCalledWith(
        em,
        actividad,
        expect.objectContaining({ escalones: [expect.objectContaining({ roles: ['DIRECTOR_CONTRATACION'] })] }),
        acceso,
      );
    });

    it('guarda la evidencia de la firma junto a los datos que ya hubiera', async () => {
      const actividad: any = { estado: 'BORRADOR', datos: { algo: 1 } };
      const { em } = emCon(actividad, null);
      const firma = { id: 'OTP-1', fechaFirma: new Date().toISOString(), metodo: 'OTP_EMAIL' };

      await servicio.resolverCierre(em, 'p-1', '4.3', null, acceso, firma);

      expect(actividad.datos).toEqual({ algo: 1, firma });
    });

    it('crea la actividad si todavía no existía', async () => {
      const { em, guardado } = emCon(null, null);

      await servicio.resolverCierre(em, 'p-1', '4.4', null, acceso);

      expect(guardado).toHaveLength(1);
      expect(guardado[0].estado).toBe('APROBADO');
    });
  });
});
