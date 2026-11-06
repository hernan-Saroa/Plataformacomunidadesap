import { CompuertaService, nombreDesdeClave } from './compuerta.service';
import {
  EnvioOmitido,
  EventoNotificacion,
  ModuloAlias,
  ModuloNotificacion,
} from './entities/configuracion.entities';

type Semilla = { modulos?: any[]; alias?: any[]; eventos?: any[] };

const eventoBase = (extra: Partial<EventoNotificacion>): Partial<EventoNotificacion> => ({
  nombre: 'x', descripcion: null, activo: true, canal: null, obligatorio: false, prioridad: null,
  prioridad_codigo: null, envia_correo: false, roles_adicionales: [], dependencias_adicionales: [],
  sedes_adicionales: [], visto_en: null, verificado_en: null, verificado_por: null, ...extra,
});

/** Base en memoria con lo justo que usa la compuerta. */
function baseFalsa(semilla: Semilla = {}) {
  const tablas = new Map<any, any[]>([
    [ModuloNotificacion, semilla.modulos ?? []],
    [ModuloAlias, semilla.alias ?? []],
    [EventoNotificacion, semilla.eventos ?? []],
    [EnvioOmitido, []],
  ]);
  // El evento se identifica por módulo + clave.
  const llaves = (E: any): string[] =>
    E === ModuloNotificacion ? ['codigo'] : E === ModuloAlias ? ['alias'] : E === EventoNotificacion ? ['codigo_modulo', 'clave'] : ['id'];
  const getRepository = (E: any) => {
    const filas = tablas.get(E)!;
    const buscar = (w: any) => filas.find((x) => llaves(E).every((k) => x[k] === w[k]));
    return {
      find: async () => filas.map((f) => ({ ...f })),
      findOneByOrFail: async (w: any) => {
        const f = buscar(w);
        if (!f) throw new Error('no existe');
        return { ...f };
      },
      insert: async (v: any) => { filas.push({ id: filas.length + 1, ...v }); },
      update: async (w: any, c: any) => { const f = buscar(w); if (f) Object.assign(f, c); },
      createQueryBuilder: () => {
        let valores: any;
        const qb: any = {
          insert: () => qb,
          values: (v: any) => { valores = v; return qb; },
          orIgnore: () => qb,
          execute: async () => {
            if (!buscar(valores)) filas.push(E === EventoNotificacion ? { ...eventoBase({}), ...valores } : { ...valores });
          },
        };
        return qb;
      },
    };
  };
  const ds: any = { getRepository, query: jest.fn(async () => []) };
  return { ds, tablas };
}

const modulos = (extra: Partial<ModuloNotificacion>[] = []) => [
  { codigo: 'pta', nombre: 'PTA', activo: true, canal_defecto: 'ambos', orden: 10, correo_desvio: null },
  { codigo: 'gestion-infraestructura', nombre: 'Infra', activo: true, canal_defecto: 'ambos', orden: 20, correo_desvio: null },
  { codigo: 'otros', nombre: 'Otros', activo: true, canal_defecto: 'ambos', orden: 999, correo_desvio: null },
  ...extra,
];
const alias = [
  { alias: 'pta', codigo_modulo: 'pta' },
  { alias: 'umi-mantenimiento', codigo_modulo: 'gestion-infraestructura' },
];

describe('CompuertaService — la puerta por la que pasa cada aviso (EFDS-2406)', () => {
  beforeEach(() => {
    delete process.env.NOTIFICACIONES_COMPUERTA;
    process.env.NOTIFICACIONES_CACHE_MS = '0';
  });

  it('con el interruptor apagado todo pasa sin tocar el catálogo', async () => {
    process.env.NOTIFICACIONES_COMPUERTA = 'false';
    const { ds, tablas } = baseFalsa();
    const d = await new CompuertaService(ds).evaluar({ clave: 'pta_aprobado', canal: 'plataforma', prioridad: 'Alta' });
    expect(d).toMatchObject({ permitido: true, motivo: 'compuerta_apagada', prioridad: 'Alta' });
    expect(tablas.get(EventoNotificacion)).toHaveLength(0);
  });

  it('un evento desconocido se registra activo y pasa', async () => {
    const { ds, tablas } = baseFalsa({ modulos: modulos(), alias });
    const d = await new CompuertaService(ds).evaluar({ clave: 'pta_aprobado', canal: 'plataforma', categoria: 'PTA', prioridad: 'Alta' });
    expect(d.permitido).toBe(true);
    expect(d.modulo).toBe('pta');
    const evento = tablas.get(EventoNotificacion)![0];
    expect(evento).toMatchObject({ clave: 'pta_aprobado', codigo_modulo: 'pta', activo: true, prioridad_codigo: 'Alta', nombre: 'Pta aprobado' });
  });

  it('resuelve el módulo por alias de categoría, por prefijo de la clave o cae en "otros"', async () => {
    const { ds } = baseFalsa({ modulos: modulos([{ codigo: 'contratacion', nombre: 'C', activo: true, canal_defecto: 'ambos', orden: 60 }]), alias });
    const s = new CompuertaService(ds);
    expect((await s.evaluar({ clave: 'umi_nueva', canal: 'plataforma', categoria: 'UMI-MANTENIMIENTO' })).modulo).toBe('gestion-infraestructura');
    expect((await s.evaluar({ clave: 'contratacion_cdp', canal: 'plataforma' })).modulo).toBe('contratacion');
    expect((await s.evaluar({ clave: 'algo_raro', canal: 'plataforma', categoria: 'Sistema X' })).modulo).toBe('otros');
    expect((await s.evaluar({ clave: 'con_modulo', canal: 'plataforma', modulo: 'PTA' })).modulo).toBe('pta');
  });

  it('módulo apagado: se omite y queda en la bitácora de omitidas', async () => {
    const { ds, tablas } = baseFalsa({ modulos: modulos([{ codigo: 'viaticos', nombre: 'V', activo: false, canal_defecto: 'ambos', orden: 50 }]), alias });
    const d = await new CompuertaService(ds).evaluar({ clave: 'viaticos_x', canal: 'plataforma', modulo: 'viaticos', destinatario: 'u1', titulo: 'Hola' });
    expect(d).toMatchObject({ permitido: false, motivo: 'modulo_inactivo' });
    expect(tablas.get(EnvioOmitido)![0]).toMatchObject({ codigo_modulo: 'viaticos', clave_evento: 'viaticos_x', canal: 'plataforma', destinatario: 'u1', motivo: 'modulo_inactivo', titulo: 'Hola' });
  });

  it('evento apagado: se omite; obligatorio: pasa aunque módulo y evento estén apagados', async () => {
    const { ds } = baseFalsa({
      modulos: modulos([{ codigo: 'sistema', nombre: 'S', activo: false, canal_defecto: 'ambos', orden: 90 }]),
      alias,
      eventos: [
        eventoBase({ clave: 'pta_apagado', codigo_modulo: 'pta', activo: false }),
        eventoBase({ clave: 'otp', codigo_modulo: 'sistema', activo: false, obligatorio: true }),
      ],
    });
    const s = new CompuertaService(ds);
    expect(await s.evaluar({ clave: 'pta_apagado', canal: 'plataforma', modulo: 'pta' })).toMatchObject({ permitido: false, motivo: 'evento_inactivo' });
    expect(await s.evaluar({ clave: 'otp', canal: 'correo', modulo: 'sistema' })).toMatchObject({ permitido: true });
  });

  it('el canal decide: "solo correo" omite la campana y "solo plataforma" omite el correo', async () => {
    const { ds } = baseFalsa({
      modulos: modulos(),
      alias,
      eventos: [
        eventoBase({ clave: 'solo_correo', codigo_modulo: 'pta', canal: 'correo', envia_correo: true }),
        eventoBase({ clave: 'solo_campana', codigo_modulo: 'pta', canal: 'plataforma', envia_correo: true }),
      ],
    });
    const s = new CompuertaService(ds);
    expect(await s.evaluar({ clave: 'solo_correo', canal: 'plataforma', modulo: 'pta' })).toMatchObject({ permitido: false, motivo: 'canal_solo_correo' });
    expect(await s.evaluar({ clave: 'solo_correo', canal: 'correo', modulo: 'pta' })).toMatchObject({ permitido: true });
    expect(await s.evaluar({ clave: 'solo_campana', canal: 'correo', modulo: 'pta' })).toMatchObject({ permitido: false, motivo: 'canal_solo_plataforma' });
    expect(await s.evaluar({ clave: 'solo_campana', canal: 'plataforma', modulo: 'pta' })).toMatchObject({ permitido: true });
  });

  it('sin canal propio, el evento hereda el canal por defecto del módulo', async () => {
    const { ds } = baseFalsa({
      modulos: modulos([{ codigo: 'legal', nombre: 'L', activo: true, canal_defecto: 'plataforma', orden: 40 }]),
      alias,
      eventos: [eventoBase({ clave: 'legal_x', codigo_modulo: 'legal', envia_correo: true })],
    });
    expect(await new CompuertaService(ds).evaluar({ clave: 'legal_x', canal: 'correo', modulo: 'legal' })).toMatchObject({ permitido: false, motivo: 'canal_solo_plataforma' });
  });

  it('la prioridad de la consola manda sobre la del código; sin ella queda la del código', async () => {
    const { ds } = baseFalsa({
      modulos: modulos(),
      alias,
      eventos: [
        eventoBase({ clave: 'con_prioridad', codigo_modulo: 'pta', prioridad: 'Crítica' }),
        eventoBase({ clave: 'sin_prioridad', codigo_modulo: 'pta' }),
      ],
    });
    const s = new CompuertaService(ds);
    expect((await s.evaluar({ clave: 'con_prioridad', canal: 'plataforma', modulo: 'pta', prioridad: 'Baja' })).prioridad).toBe('Crítica');
    expect((await s.evaluar({ clave: 'sin_prioridad', canal: 'plataforma', modulo: 'pta', prioridad: 'Baja' })).prioridad).toBe('Baja');
    expect((await s.evaluar({ clave: 'sin_prioridad', canal: 'plataforma', modulo: 'pta' })).prioridad).toBe('Media');
  });

  it('un correo marca que el evento manda correo, para que la consola ofrezca ese canal', async () => {
    const { ds, tablas } = baseFalsa({ modulos: modulos(), alias, eventos: [eventoBase({ clave: 'pta_x', codigo_modulo: 'pta' })] });
    await new CompuertaService(ds).evaluar({ clave: 'pta_x', canal: 'correo', modulo: 'pta' });
    expect(tablas.get(EventoNotificacion)![0].envia_correo).toBe(true);
  });

  it('si la base falla, el aviso pasa: la compuerta nunca pierde un aviso legítimo', async () => {
    const ds: any = { getRepository: () => ({ find: async () => { throw new Error('sin conexión'); } }), query: jest.fn() };
    const d = await new CompuertaService(ds).evaluar({ clave: 'pta_x', canal: 'plataforma', prioridad: 'Alta' });
    expect(d).toMatchObject({ permitido: true, motivo: 'sin_catalogo', prioridad: 'Alta' });
  });

  it('los destinatarios adicionales se buscan por rol, dependencia y sede, y nunca rompen el envío', async () => {
    const { ds } = baseFalsa();
    ds.query.mockResolvedValueOnce([{ id_user: 'u9', email: 'u9@esap.edu.co' }]);
    const s = new CompuertaService(ds);
    expect(await s.destinatariosAdicionales(null)).toEqual([]);
    expect(await s.destinatariosAdicionales(eventoBase({ clave: 'x', codigo_modulo: 'pta' }) as EventoNotificacion)).toEqual([]);
    expect(ds.query).not.toHaveBeenCalled();
    const con = eventoBase({ clave: 'x', codigo_modulo: 'pta', roles_adicionales: ['jefe_oci'], dependencias_adicionales: ['3'] }) as EventoNotificacion;
    expect(await s.destinatariosAdicionales(con)).toEqual([{ id_user: 'u9', email: 'u9@esap.edu.co' }]);
    expect(ds.query.mock.calls[0][1]).toEqual([['JEFE_OCI'], ['3'], []]);
    ds.query.mockRejectedValueOnce(new Error('caída'));
    expect(await s.destinatariosAdicionales(con)).toEqual([]);
  });

  describe('clave compuesta: la misma clave en dos módulos', () => {
    const dosModulos = () =>
      baseFalsa({
        modulos: modulos([
          { codigo: 'control-disciplinario', nombre: 'Disc', activo: true, canal_defecto: 'ambos', orden: 30 },
          { codigo: 'gestion-legal', nombre: 'Legal', activo: true, canal_defecto: 'ambos', orden: 40 },
        ]),
        alias,
        eventos: [
          eventoBase({ clave: 'PROCESO_ASIGNADO', codigo_modulo: 'control-disciplinario', activo: false }),
          eventoBase({ clave: 'PROCESO_ASIGNADO', codigo_modulo: 'gestion-legal', activo: true }),
        ],
      });

    it('se gobiernan por separado: apagar uno no apaga el otro', async () => {
      const { ds } = dosModulos();
      const s = new CompuertaService(ds);
      expect(await s.evaluar({ clave: 'PROCESO_ASIGNADO', canal: 'plataforma', modulo: 'control-disciplinario' }))
        .toMatchObject({ permitido: false, motivo: 'evento_inactivo', modulo: 'control-disciplinario' });
      expect(await s.evaluar({ clave: 'PROCESO_ASIGNADO', canal: 'plataforma', modulo: 'gestion-legal' }))
        .toMatchObject({ permitido: true, modulo: 'gestion-legal' });
    });

    it('un módulo nuevo con una clave que ya existe en otro registra su propia fila', async () => {
      const { ds, tablas } = baseFalsa({
        modulos: modulos([{ codigo: 'viaticos', nombre: 'V', activo: true, canal_defecto: 'ambos', orden: 50 }]),
        alias,
        eventos: [eventoBase({ clave: 'PROCESO_ASIGNADO', codigo_modulo: 'pta' })],
      });
      await new CompuertaService(ds).evaluar({ clave: 'PROCESO_ASIGNADO', canal: 'plataforma', modulo: 'viaticos' });
      const filas = tablas.get(EventoNotificacion)!;
      expect(filas.map((f) => `${f.codigo_modulo}:${f.clave}`).sort()).toEqual(['pta:PROCESO_ASIGNADO', 'viaticos:PROCESO_ASIGNADO']);
    });

    it('sin módulo: si la clave está en uno solo es de ese; en varios o en ninguno, "otros"', async () => {
      const { ds } = baseFalsa({
        modulos: modulos([
          { codigo: 'control-disciplinario', nombre: 'D', activo: true, canal_defecto: 'ambos', orden: 30 },
          { codigo: 'gestion-legal', nombre: 'L', activo: true, canal_defecto: 'ambos', orden: 40 },
        ]),
        alias,
        eventos: [
          eventoBase({ clave: 'PROCESO_ASIGNADO', codigo_modulo: 'control-disciplinario' }),
          eventoBase({ clave: 'PROCESO_ASIGNADO', codigo_modulo: 'gestion-legal' }),
          eventoBase({ clave: 'SOLO_LEGAL', codigo_modulo: 'gestion-legal' }),
        ],
      });
      const s = new CompuertaService(ds);
      expect((await s.evaluar({ clave: 'SOLO_LEGAL', canal: 'plataforma' })).modulo).toBe('gestion-legal');
      expect((await s.evaluar({ clave: 'PROCESO_ASIGNADO', canal: 'plataforma' })).modulo).toBe('otros');
      expect((await s.evaluar({ clave: 'NUNCA_VISTA', canal: 'plataforma' })).modulo).toBe('otros');
    });
  });

  describe('buzón de desvío', () => {
    const conBuzon = (activo: boolean, eventos: any[] = []) =>
      baseFalsa({
        modulos: modulos([{ codigo: 'viaticos', nombre: 'Viáticos', activo, canal_defecto: 'ambos', orden: 50, correo_desvio: 'buzon@esap.edu.co' } as any]),
        alias,
        eventos,
      });

    it('módulo apagado con buzón: la decisión trae el desvío y la omisión queda como "desviado"', async () => {
      const { ds, tablas } = conBuzon(false);
      const d = await new CompuertaService(ds).evaluar({ clave: 'v_x', canal: 'correo', modulo: 'viaticos', destinatario: 'a@x.co', titulo: 'T' });
      expect(d).toMatchObject({ permitido: false, motivo: 'modulo_inactivo', desvio: 'buzon@esap.edu.co', modulo_nombre: 'Viáticos' });
      expect(tablas.get(EnvioOmitido)![0]).toMatchObject({
        motivo: 'desviado', desviado_a: 'buzon@esap.edu.co', destinatario: 'a@x.co', codigo_modulo: 'viaticos', clave_evento: 'v_x',
      });
    });

    it('evento apagado con buzón: también se desvía', async () => {
      const { ds } = conBuzon(true, [eventoBase({ clave: 'v_x', codigo_modulo: 'viaticos', activo: false })]);
      expect(await new CompuertaService(ds).evaluar({ clave: 'v_x', canal: 'plataforma', modulo: 'viaticos' }))
        .toMatchObject({ permitido: false, motivo: 'evento_inactivo', desvio: 'buzon@esap.edu.co' });
    });

    it('sin buzón no hay desvío y la omisión conserva su motivo', async () => {
      const { ds, tablas } = baseFalsa({
        modulos: modulos([{ codigo: 'viaticos', nombre: 'V', activo: false, canal_defecto: 'ambos', orden: 50, correo_desvio: null } as any]),
        alias,
      });
      const d = await new CompuertaService(ds).evaluar({ clave: 'v_x', canal: 'correo', modulo: 'viaticos' });
      expect(d.desvio).toBeUndefined();
      expect(tablas.get(EnvioOmitido)![0]).toMatchObject({ motivo: 'modulo_inactivo', desviado_a: null });
    });

    it('un aviso obligatorio nunca se desvía: sale al destinatario real', async () => {
      const { ds, tablas } = conBuzon(false, [eventoBase({ clave: 'v_otp', codigo_modulo: 'viaticos', obligatorio: true, activo: false })]);
      const d = await new CompuertaService(ds).evaluar({ clave: 'v_otp', canal: 'correo', modulo: 'viaticos' });
      expect(d).toMatchObject({ permitido: true });
      expect(d.desvio).toBeUndefined();
      expect(tablas.get(EnvioOmitido)).toHaveLength(0);
    });

    it('los motivos de canal no se desvían', async () => {
      const { ds } = conBuzon(true, [eventoBase({ clave: 'v_c', codigo_modulo: 'viaticos', canal: 'correo', envia_correo: true })]);
      const d = await new CompuertaService(ds).evaluar({ clave: 'v_c', canal: 'plataforma', modulo: 'viaticos' });
      expect(d).toMatchObject({ permitido: false, motivo: 'canal_solo_correo' });
      expect(d.desvio).toBeUndefined();
    });
  });

  it('resuelve el correo del usuario para el aviso de desvío y devuelve null si no lo halla', async () => {
    const { ds } = baseFalsa();
    ds.query.mockResolvedValueOnce([{ email: 'u@esap.edu.co' }]).mockResolvedValueOnce([]).mockRejectedValueOnce(new Error('x'));
    const s = new CompuertaService(ds);
    expect(await s.resolverCorreoDeUsuario('u1')).toBe('u@esap.edu.co');
    expect(await s.resolverCorreoDeUsuario('u2')).toBeNull();
    expect(await s.resolverCorreoDeUsuario('u3')).toBeNull();
  });

  it('nombra los eventos nuevos a partir de la clave', () => {
    expect(nombreDesdeClave('pta_pendiente_aprobacion')).toBe('Pta pendiente aprobacion');
    expect(nombreDesdeClave('gestion-legal')).toBe('Gestion legal');
  });
});
