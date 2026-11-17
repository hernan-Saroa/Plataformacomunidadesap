import { RundPeriodoPruebaAlertasService, claveAlertaPeriodoPrueba, fechaLegible } from './rund-periodo-prueba-alertas.service';

const pendientes = {
  total: 2,
  items: [
    { docente_id: 'doc-1', nombre_completo: 'ANA PRUEBA', periodo_carga: '2026-2', inicio: '2025-05-01', cumplimiento: '2026-05-01', dias_vencido: 198 },
    { docente_id: 'doc-2', nombre_completo: 'LUIS PRUEBA', periodo_carga: '2026-2', inicio: '2025-11-15', cumplimiento: '2026-11-15', dias_vencido: 0 },
  ],
};

function build(opts: { items?: typeof pendientes; recipients?: Array<{ id_user: string }> } = {}) {
  const banco = { getAlertasPeriodoPrueba: jest.fn().mockResolvedValue(opts.items ?? pendientes) };
  const db = { query: jest.fn().mockResolvedValue(opts.recipients ?? [{ id_user: 'ggp-1' }, { id_user: 'ggp-2' }]) };
  const service = new RundPeriodoPruebaAlertasService(db as any, banco as any);
  return { service, banco, db };
}

describe('HU 2424 · RundPeriodoPruebaAlertasService (alerta al rol GGP)', () => {
  const realFetch = global.fetch;
  let fetchMock: jest.Mock;
  beforeEach(() => {
    fetchMock = jest.fn().mockResolvedValue({ ok: true, status: 201 });
    global.fetch = fetchMock as any;
  });
  afterEach(() => { global.fetch = realFetch; });

  it('envía un aviso por docente y por responsable del GGP, con clave idempotente y texto legible', async () => {
    const { service, db } = build();
    const entregados = await service.emitir();

    expect(entregados).toBe(4);
    expect(String(db.query.mock.calls[0][0])).toContain("UPPER(r.code) = 'GESTION_PROFESORAL'");
    expect(fetchMock).toHaveBeenCalledTimes(4);
    const bodies = fetchMock.mock.calls.map(([, init]) => JSON.parse(init.body));
    expect(bodies.map((b) => b.id_usuario_destinatario)).toEqual(['ggp-1', 'ggp-2', 'ggp-1', 'ggp-2']);
    expect(bodies[0]).toMatchObject({
      clave_idempotencia: claveAlertaPeriodoPrueba('doc-1', '2026-05-01', 'ggp-1'),
      tipo_notificacion: 'rund_periodo_prueba_cumplido',
      titulo: 'Periodo de prueba cumplido: pendiente de decisión del comité',
      prioridad: 'Alta', categoria: 'RUND', enviar_email: false,
      datos_adicionales: { rundDocenteId: 'doc-1', cumplimiento: '2026-05-01' },
    });
    expect(bodies[0].mensaje).toBe('ANA PRUEBA cumplió el año de periodo de prueba el 01/05/2026. Registre la decisión del Comité Docente en el RUND.');
    expect(bodies[0].url_accion).toBe('/?module=banco-docentes-pta&rundPeriodoPrueba=PENDIENTE');
    expect(bodies[0].texto_boton_accion).toBe('Ver pendientes');
    expect(new Set(bodies.map((b) => b.clave_idempotencia)).size).toBe(4);
  });

  it('un aviso ya entregado (409) no es un error ni se cuenta de nuevo', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 409 });
    const { service } = build();
    await expect(service.emitir()).resolves.toBe(0);
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it('si notificaciones falla no lanza: reintenta en la próxima revisión', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 503 });
    const { service } = build();
    await expect(service.emitir()).resolves.toBe(0);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('sin pendientes o sin responsables no llama al servicio de notificaciones', async () => {
    await expect(build({ items: { total: 0, items: [] } }).service.emitir()).resolves.toBe(0);
    await expect(build({ recipients: [] }).service.emitir()).resolves.toBe(0);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('no corre dos revisiones a la vez', async () => {
    let liberar!: () => void;
    const { service, banco } = build();
    banco.getAlertasPeriodoPrueba.mockImplementation(() => new Promise((resolve) => { liberar = () => resolve({ total: 0, items: [] }); }));
    const primera = service.emitir();
    await expect(service.emitir()).resolves.toBe(0);
    expect(banco.getAlertasPeriodoPrueba).toHaveBeenCalledTimes(1);
    liberar();
    await primera;
  });

  it('formatea fechas legibles', () => {
    expect(fechaLegible('2026-11-15')).toBe('15/11/2026');
    expect(fechaLegible('sin-formato')).toBe('sin-formato');
  });
});
