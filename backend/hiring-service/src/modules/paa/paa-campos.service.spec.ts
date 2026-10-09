import { PaaCampoVisible, PaaRegion, PaaVersion, PaaVigencia } from '../../entities/paa.entity';
import { PaaCamposService } from './paa-campos.service';

/**
 * Un EntityManager de mentira con lo justo: las filas de configuración por
 * vigencia, una versión activa y las claves que traen sus líneas.
 */
function montar(opciones: {
  guardadas?: Partial<PaaCampoVisible>[];
  delAnioAnterior?: Partial<PaaCampoVisible>[];
  clavesEnArchivo?: string[];
}) {
  const region = { id: 'r1', nombre: 'Sede Central' } as PaaRegion;
  const vigencia = { id: 'v2027', anio: 2027 } as PaaVigencia;
  const anterior = { id: 'v2026', anio: 2026 } as PaaVigencia;
  let guardadas = (opciones.guardadas ?? []) as PaaCampoVisible[];
  const insertadas: Partial<PaaCampoVisible>[][] = [];

  const em: any = {
    find: async (entidad: unknown, { where }: any) => {
      if (entidad !== PaaCampoVisible) return [];
      if (where.vigenciaId === 'v2027') return guardadas;
      return (opciones.delAnioAnterior ?? []) as PaaCampoVisible[];
    },
    findOne: async (entidad: unknown, { where }: any) => {
      if (entidad === PaaVigencia) return where.anio === 2027 ? vigencia : anterior;
      if (entidad === PaaVersion) return opciones.clavesEnArchivo && where.estado === 'ACTIVA' ? { id: 'ver' } : null;
      return null;
    },
    query: async () => (opciones.clavesEnArchivo ?? []).map((clave) => ({ clave })),
    delete: async () => {
      guardadas = [];
    },
    insert: async (_: unknown, filas: Partial<PaaCampoVisible>[]) => {
      insertadas.push(filas);
      guardadas = filas as PaaCampoVisible[];
    },
  };

  const dataSource: any = {
    manager: em,
    transaction: (fn: (em: any) => unknown) => fn(em),
    getRepository: (entidad: unknown) => ({
      findOne: async ({ where }: any) => (entidad === PaaRegion ? region : where.anio === 2027 ? vigencia : null),
    }),
  };
  const admin: any = { traza: jest.fn() };
  return { servicio: new PaaCamposService(dataSource, admin), insertadas, admin };
}

describe('PaaCamposService', () => {
  it('sin configuración, propone el formato y oculta lo repetido y los datos de contacto', async () => {
    const { servicio } = montar({});
    const r = await servicio.campos('r1', 2027);

    expect(r.origen).toBe('formato');
    const visible = Object.fromEntries(r.campos.map((c) => [c.clave, c.visible]));
    expect(visible).toMatchObject({
      objeto: true,
      valor_total: true,
      modalidad: true,
      descripcion: false,
      responsable_correo: false,
      responsable_telefono: false,
    });
  });

  it('un año sin configurar hereda la del anterior, sin guardarla', async () => {
    const { servicio, insertadas } = montar({
      delAnioAnterior: [
        { clave: 'objeto', visible: true, etiqueta: 'Qué se contrata', orden: 0 },
        { clave: 'valor_total', visible: false, etiqueta: null, orden: 1 },
      ],
      clavesEnArchivo: ['objeto', 'valor_total', 'mes_inicio'],
    });
    const r = await servicio.campos('r1', 2027);

    expect(r.origen).toBe('vigencia_anterior');
    expect(r.campos.map((c) => [c.clave, c.visible, c.etiqueta, c.estado])).toEqual([
      ['objeto', true, 'Qué se contrata', 'normal'],
      ['valor_total', false, 'Valor total estimado', 'normal'],
      ['mes_inicio', true, 'Mes estimado de inicio del proceso', 'nueva'],
    ]);
    expect(insertadas).toEqual([]);
  });

  it('señala la columna que el archivo ya no trae', async () => {
    const { servicio } = montar({
      guardadas: [
        { clave: 'objeto', visible: true, orden: 0 } as PaaCampoVisible,
        { clave: 'extra:Prioridad', visible: true, orden: 1 } as PaaCampoVisible,
      ],
      clavesEnArchivo: ['objeto'],
    });
    const r = await servicio.campos('r1', 2027);
    expect(r.campos.find((c) => c.clave === 'extra:Prioridad')?.estado).toBe('huerfana');
    expect(await servicio.visibles('r1', { id: 'v2027', anio: 2027 } as PaaVigencia)).toHaveLength(1);
  });

  it('no deja ocultar el objeto y guarda el orden en que llegaron', async () => {
    const { servicio, insertadas, admin } = montar({ clavesEnArchivo: ['objeto', 'valor_total', 'mes_inicio'] });
    await servicio.guardar(
      'r1',
      2027,
      {
        campos: [
          { clave: 'valor_total', visible: true, etiqueta: 'Cuánto' },
          { clave: 'objeto', visible: false },
        ],
      },
      { userId: 'u', userName: 'dir', roles: [] },
    );

    expect(insertadas[0].map((f) => [f.clave, f.visible, f.etiqueta, f.orden])).toEqual([
      ['valor_total', true, 'Cuánto', 0],
      ['objeto', true, null, 1],
      ['mes_inicio', true, null, 2],
    ]);
    expect(insertadas[0][0].vigenciaId).toBe('v2027');
    expect(admin.traza).toHaveBeenCalled();
  });

  it('rechaza un campo que el PAA no tiene', async () => {
    const { servicio } = montar({ clavesEnArchivo: ['objeto'] });
    await expect(
      servicio.guardar('r1', 2027, { campos: [{ clave: 'inventado', visible: true }] }, { userId: 'u', userName: 'x', roles: [] }),
    ).rejects.toThrow('inventado');
  });
});
