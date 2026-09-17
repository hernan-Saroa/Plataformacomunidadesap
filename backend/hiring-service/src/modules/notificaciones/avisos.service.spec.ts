import { BadRequestException } from '@nestjs/common';

import { AvisosService } from './avisos.service';

/**
 * Los avisos de cada actividad (EFDS-1183).
 *
 * Los de la aprobación y el del abogado salen siempre; el resto se enciende y
 * se dirige a dependencias, roles y personas, con lo sugerido mientras nadie lo
 * cambie.
 */
describe('AvisosService', () => {
  const acceso = { userId: 'u1', userName: 'director@esap.edu.co', roles: [], puedeEditar: true } as never;

  const conFilas = (filas: any[], extra: { requiere?: boolean; dependencias?: any[] } = {}) => {
    const query = jest.fn(async (sql: string, _params?: unknown[]) => {
      if (sql.includes('FROM hiring.avisos')) return filas;
      if (sql.includes("tipo = 'EXIGE_APROBACION'")) return [{ requiere: extra.requiere ?? false }];
      if (sql.includes('FROM auth.dependencias')) return extra.dependencias ?? [];
      if (sql.includes('FROM auth.role')) return [{ code: 'DIRECTOR_CONTRATACION', name: 'Director de Contratación' }];
      return [];
    });
    return { srv: new AvisosService({ query } as never), query };
  };

  describe('los que salen siempre', () => {
    it('con aprobación, avisa al enviar, al aprobar y al devolver, sin poder apagarse', async () => {
      const { srv } = conFilas([], { requiere: true });
      const { siempre, avisos } = await srv.deActividad('3.2');

      expect(siempre.map((s) => s.evento)).toEqual(['DEVUELTA', 'ENVIADA_A_APROBACION', 'APROBADA']);
      expect(siempre.find((s) => s.evento === 'ENVIADA_A_APROBACION')?.aQuien).toEqual(['Quien la aprueba']);
      expect(avisos.map((a) => a.evento)).not.toContain('DEVUELTA');
    });

    it('sin aprobación no se muestran: en esa actividad nunca saldrían', async () => {
      const { srv } = conFilas([], { requiere: false });

      expect((await srv.deActividad('3.2')).siempre).toEqual([]);
    });

    it('en la 3.4 el «le toca» es del abogado, y dice dónde se asigna', async () => {
      const { srv } = conFilas([], { requiere: false });
      const { siempre, avisos } = await srv.deActividad('3.4');
      const leToca = avisos.find((a) => a.evento === 'HABILITADA');

      expect(siempre).toEqual([]);
      expect(leToca).toMatchObject({ activo: true, papeles: ['ABOGADO'] });
      expect(leToca?.ayuda).toContain('en la 3.3');
    });

    it('lo que se haya guardado para ellos no los cambia', async () => {
      const { srv } = conFilas([{ evento: 'DEVUELTA', activo: false, papeles: [], roles: [] }]);

      expect(await srv.queRige('3.2', 'DEVUELTA')).toMatchObject({ activo: true, papeles: ['QUIEN_ENVIO'] });
    });

    it('no se dejan configurar', async () => {
      const { srv } = conFilas([]);

      await expect(srv.guardar('3.2', 'DEVUELTA', { activo: false }, acceso)).rejects.toThrow(
        'Este aviso sale siempre y no se configura',
      );
    });
  });

  describe('los que se configuran', () => {
    it('«se crea un proceso» llega encendido para el Director de Contratación', async () => {
      const { srv } = conFilas([]);
      const aviso = (await srv.deActividad('3.1')).avisos.find((a) => a.evento === 'PROCESO_RADICADO');

      expect(aviso).toMatchObject({
        activo: true,
        personalizado: false,
        roles: [{ code: 'DIRECTOR_CONTRATACION', name: 'Director de Contratación' }],
      });
    });

    it('«le toca a alguien» llega configurado en cada actividad', async () => {
      const { srv } = conFilas([]);
      const aviso = (await srv.deActividad('4.1')).avisos.find((a) => a.evento === 'HABILITADA');

      expect(aviso).toMatchObject({ activo: true, personalizado: false, papeles: ['EQUIPO_FINANCIERO'] });
    });

    it('dice cada dependencia por su nombre, del catálogo de la plataforma', async () => {
      const { srv } = conFilas([{ evento: 'DOCUMENTO_ADJUNTO', activo: true, roles: [], personas: [], dependencias: [7] }], {
        dependencias: [{ id: '7', nombre: 'Dirección Financiera', activo: 'true' }],
      });
      const aviso = (await srv.deActividad('3.2')).avisos.find((a) => a.evento === 'DOCUMENTO_ADJUNTO');

      expect(aviso?.dependencias).toEqual([{ id: '7', nombre: 'Dirección Financiera' }]);
    });

    it('muestra a cada persona por su nombre', async () => {
      const query = jest.fn(async (sql: string) => {
        if (sql.includes('FROM hiring.avisos')) {
          return [{ evento: 'HABILITADA', activo: true, papeles: [], roles: [], personas: ['p-ana'] }];
        }
        if (sql.includes('FROM auth.personas')) return [{ id: 'p-ana', nombre: 'Ana Lucía Osorio' }];
        return [];
      });
      const srv = new AvisosService({ query } as never);

      const aviso = (await srv.deActividad('4.1')).avisos.find((a) => a.evento === 'HABILITADA');
      expect(aviso?.personas).toEqual([{ id: 'p-ana', nombre: 'Ana Lucía Osorio' }]);
    });

    it('no deja encender uno sin nadie a quien avisar', async () => {
      const { srv, query } = conFilas([]);

      await expect(srv.guardar('3.1', 'PROCESO_RADICADO', { activo: true, roles: [] }, acceso)).rejects.toThrow(
        'Elige a quién avisar antes de encenderlo',
      );
      expect(query.mock.calls.some(([sql]) => String(sql).includes('INSERT'))).toBe(false);
    });

    it('guarda dependencias, roles y personas, y conserva lo que no se manda', async () => {
      const { srv, query } = conFilas([]);

      await srv.guardar('3.2', 'DOCUMENTO_ADJUNTO', { activo: true, dependencias: ['7'] }, acceso);

      const insert = query.mock.calls.find(([sql]) => String(sql).includes('INSERT'));
      expect(insert?.[1]).toEqual([
        '3.2',
        'DOCUMENTO_ADJUNTO',
        true,
        '["ABOGADO"]',
        '[]',
        '[]',
        '["7"]',
        'director@esap.edu.co',
      ]);
    });

    it('no ofrece avisos que no pueden pasar en esa actividad', async () => {
      const { srv } = conFilas([]);

      await expect(srv.guardar('3.2', 'ABOGADO_ASIGNADO', { activo: false }, acceso)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('el correo de la actividad', () => {
    it('viene encendido si nadie lo cambió', async () => {
      const { srv } = conFilas([]);

      expect((await srv.deActividad('3.2')).porCorreo).toBe(true);
    });

    it('se apaga por actividad', async () => {
      const query = jest.fn(async (sql: string, _params?: unknown[]) => {
        if (sql.includes('UPDATE hiring.actividades')) return [{ numeral: '3.2' }];
        if (sql.includes('SELECT avisos_por_correo')) return [{ avisos_por_correo: false }];
        return [];
      });
      const srv = new AvisosService({ query } as never);

      const resultado = await srv.guardarCorreo('3.2', false);

      const update = query.mock.calls.find(([sql]) => String(sql).includes('UPDATE hiring.actividades'));
      expect(update?.[1]).toEqual(['3.2', false]);
      expect(resultado.porCorreo).toBe(false);
    });
  });

  it('sin la tabla no se cae: rige lo sugerido', async () => {
    const srv = new AvisosService({ query: jest.fn().mockRejectedValue(new Error('no existe')) } as never);

    expect((await srv.queRige('3.1', 'PROCESO_RADICADO')).activo).toBe(true);
  });

  it('sin el catálogo de dependencias no se cae: no ofrece ninguna', async () => {
    const srv = new AvisosService({ query: jest.fn().mockRejectedValue(new Error('no existe')) } as never);

    expect(await srv.dependencias()).toEqual([]);
  });
});
