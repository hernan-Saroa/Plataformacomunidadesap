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
  /** Campos activos de la 3.1; por omisión, los de la siembra (sin el lugar de ejecución, que está inactivo). */
  camposDeLa31?: string[];
}) {
  const camposDeLa31 = opciones.camposDeLa31 ?? ['objeto_contratar', 'linea_paa', 'responsable_area', 'valor_estimado', 'plazo_ejecucion_dias'];
  const etiquetas: Record<string, string> = {
    objeto_contratar: 'Objeto del contrato',
    linea_paa: 'Línea del Plan Anual de Adquisiciones',
    responsable_area: 'Responsable del área',
    valor_estimado: 'Valor estimado del contrato',
    plazo_ejecucion_dias: 'Plazo de ejecución (días)',
    lugar_ejecucion: 'Lugar de ejecución',
  };
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
    query: async (sql: string) =>
      sql.includes('campos_formulario')
        ? camposDeLa31.map((codigo) => ({ codigo, etiqueta: etiquetas[codigo] }))
        : (opciones.clavesEnArchivo ?? []).map((clave) => ({ clave })),
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

  it('sin configuración, la 3.1 muestra lo que no tiene campo propio', async () => {
    const { servicio } = montar({});
    const r = await servicio.campos('r1', 2027);

    const enLa31 = Object.fromEntries(r.campos.map((c) => [c.clave, c.enEstudioPrevio]));
    expect(enLa31).toMatchObject({ unspsc: true, fuente_recursos: true, ubicacion: true, mes_inicio: false });
    expect(r.campos.find((c) => c.clave === 'unspsc')?.yaEnEstudioPrevio).toBeNull();
  });

  it('relaciona cada columna con el campo de la 3.1 que el PAA ya llena', async () => {
    const { servicio } = montar({});
    const r = await servicio.campos('r1', 2027);
    const ya = Object.fromEntries(r.campos.map((c) => [c.clave, c.yaEnEstudioPrevio]));

    expect(ya).toMatchObject({
      objeto: 'Objeto del contrato',
      valor_total: 'Valor estimado del contrato',
      modalidad: 'Modalidad de contratación',
      modalidad_codigo: 'Modalidad de contratación',
      duracion: 'Plazo de ejecución (días)',
      duracion_intervalo: 'Plazo de ejecución (días)',
      responsable_nombre: 'Responsable del área',
      // El lugar de ejecución de la 3.1 está inactivo: la ubicación no llega por ahí.
      ubicacion: null,
    });
    // Llegan a la 3.1 siempre, pero no se repiten en el bloque.
    expect(r.campos.find((c) => c.clave === 'objeto')?.enEstudioPrevio).toBe(true);
    const bloque = (await servicio.delEstudioPrevio('r1', { id: 'v2027', anio: 2027 } as PaaVigencia)).map((c) => c.clave);
    expect(bloque).toContain('ubicacion');
    expect(bloque).not.toContain('objeto');
  });

  it('si se activa el lugar de ejecución, la ubicación sale del bloque', async () => {
    const { servicio } = montar({
      camposDeLa31: ['objeto_contratar', 'lugar_ejecucion'],
    });
    const r = await servicio.campos('r1', 2027);

    expect(r.campos.find((c) => c.clave === 'ubicacion')?.yaEnEstudioPrevio).toBe('Lugar de ejecución');
    const bloque = (await servicio.delEstudioPrevio('r1', { id: 'v2027', anio: 2027 } as PaaVigencia)).map((c) => c.clave);
    expect(bloque).not.toContain('ubicacion');
  });

  it('guarda lo de la 3.1 aparte de lo visible, y conserva lo que no se mandó', async () => {
    const { servicio, insertadas, admin } = montar({
      guardadas: [
        { clave: 'objeto', visible: true, enEstudioPrevio: false, orden: 0 } as PaaCampoVisible,
        { clave: 'responsable_correo', visible: false, enEstudioPrevio: false, orden: 1 } as PaaCampoVisible,
        { clave: 'unspsc', visible: true, enEstudioPrevio: true, orden: 2 } as PaaCampoVisible,
      ],
      clavesEnArchivo: ['objeto', 'responsable_correo', 'unspsc'],
    });
    await servicio.guardar(
      'r1',
      2027,
      {
        campos: [
          { clave: 'responsable_correo', visible: false, enEstudioPrevio: true },
          { clave: 'unspsc', visible: true },
        ],
      },
      { userId: 'u', userName: 'dir', roles: [] },
    );

    expect(insertadas[0].map((f) => [f.clave, f.visible, f.enEstudioPrevio])).toEqual([
      ['responsable_correo', false, true],
      ['unspsc', true, true],
      ['objeto', true, false],
    ]);
    expect(admin.traza.mock.calls[0][5].enEstudioPrevio).toEqual(['responsable_correo', 'unspsc']);
    const delEstudio = await servicio.delEstudioPrevio('r1', { id: 'v2027', anio: 2027 } as PaaVigencia);
    expect(delEstudio.map((c) => c.clave)).toEqual(['responsable_correo', 'unspsc']);
  });

  it('rechaza un campo que el PAA no tiene', async () => {
    const { servicio } = montar({ clavesEnArchivo: ['objeto'] });
    await expect(
      servicio.guardar('r1', 2027, { campos: [{ clave: 'inventado', visible: true }] }, { userId: 'u', userName: 'x', roles: [] }),
    ).rejects.toThrow('inventado');
  });
});
