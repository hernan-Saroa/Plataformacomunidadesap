import { PaaRegion, PaaVersion, PaaVigencia } from '../../entities/paa.entity';
import { esLineaOcupada, lineaParaCrear } from './linea-para-crear';

const LINEA = {
  id: 'l1',
  versionId: 'ver',
  regionId: 'r1',
  codigo: 'LINEA 7',
  valores: {
    objeto: 'Soporte técnico',
    modalidad_codigo: 'CONTRATACION_DIRECTA',
    valor_total: 1000,
    duracion: 2,
    duracion_intervalo: 'Meses',
    ubicacion: 'Bogotá',
    responsable_nombre: 'Responsable',
  },
};

function em(opciones: {
  linea?: object | null;
  version?: Partial<PaaVersion>;
  vigencia?: Partial<PaaVigencia>;
  region?: Partial<PaaRegion>;
  ocupada?: string;
}) {
  const lock = jest.fn();
  const manager: any = {
    createQueryBuilder: () => {
      const qb: any = {
        setLock: (modo: string) => {
          lock(modo);
          return qb;
        },
        where: () => qb,
        getOne: async () => (opciones.linea === undefined ? LINEA : opciones.linea),
      };
      return qb;
    },
    findOneOrFail: async (entidad: unknown) => {
      if (entidad === PaaVersion) return { id: 'ver', numero: 31, vigenciaId: 'g', estado: 'ACTIVA', ...opciones.version };
      if (entidad === PaaVigencia) return { id: 'g', anio: 2026, vigente: true, ...opciones.vigencia };
      return { id: 'r1', nombre: 'Sede Central', activa: true, ...opciones.region };
    },
    query: async () => (opciones.ocupada ? [{ radicado: opciones.ocupada }] : []),
  };
  return { manager, lock };
}

describe('lineaParaCrear', () => {
  it('devuelve lo que el PAA le pone al proceso y bloquea la línea', async () => {
    const { manager, lock } = em({});
    const r = await lineaParaCrear(manager, 'l1');

    expect(lock).toHaveBeenCalledWith('pessimistic_write');
    expect(r.origen).toEqual({
      objeto: 'Soporte técnico',
      modalidad: 'CONTRATACION_DIRECTA',
      valorEstimado: 1000,
      objeto_contratar: 'Soporte técnico',
      linea_paa: 'LINEA 7',
      plazo_ejecucion_dias: 60,
      lugar_ejecucion: 'Bogotá',
      responsable_area: 'Responsable',
    });
  });

  it('no deja usar una línea de una versión que ya no es la activa', async () => {
    await expect(lineaParaCrear(em({ version: { estado: 'REEMPLAZADA' } }).manager, 'l1')).rejects.toThrow(
      'ya no es la activa',
    );
  });

  it('ni de una vigencia que no es la vigente', async () => {
    await expect(lineaParaCrear(em({ vigencia: { vigente: false } }).manager, 'l1')).rejects.toThrow(
      'no es la vigente',
    );
  });

  it('ni de una región desactivada', async () => {
    await expect(lineaParaCrear(em({ region: { activa: false } }).manager, 'l1')).rejects.toThrow('desactivada');
  });

  it('dice qué proceso ya ocupa la línea', async () => {
    await expect(lineaParaCrear(em({ ocupada: 'CTO-2026-0042' }).manager, 'l1')).rejects.toThrow('CTO-2026-0042');
  });

  it('responde 404 si la línea no existe', async () => {
    await expect(lineaParaCrear(em({ linea: null }).manager, 'l1')).rejects.toThrow('no existe');
  });
});

describe('esLineaOcupada', () => {
  it('reconoce el índice que reserva la línea, y solo ese', () => {
    expect(esLineaOcupada({ code: '23505', constraint: 'uq_paa_linea_un_proceso_vivo' })).toBe(true);
    expect(esLineaOcupada({ code: '23505', driverError: { constraint: 'uq_paa_linea_un_proceso_vivo' } })).toBe(true);
    expect(esLineaOcupada({ code: '23505', constraint: 'procesos_radicado_key' })).toBe(false);
  });
});
