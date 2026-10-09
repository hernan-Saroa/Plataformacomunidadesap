import { ProcesoSinBloqueoGuard } from './proceso-sin-bloqueo.guard';

const ID = '6d1c3c1e-2f7b-4a7e-9a55-5a1c0d1e2f3a';

function contexto(method: string, path: string, id: string | undefined = ID) {
  return {
    getType: () => 'http',
    switchToHttp: () => ({ getRequest: () => ({ method, route: { path }, params: { id } }) }),
  } as any;
}

function guard(fila: object | undefined) {
  const query = jest.fn(async () => (fila ? [fila] : []));
  return { guard: new ProcesoSinBloqueoGuard({ query } as any), query };
}

describe('ProcesoSinBloqueoGuard', () => {
  it('detiene una escritura si la línea del proceso ya no está en el PAA', async () => {
    const { guard: g } = guard({ estado: 'EN_CURSO', codigo: 'CHOCO 3', tipo: 'ELIMINACION' });
    await expect(g.canActivate(contexto('POST', '/api/v1/hiring/procesos/:id/cdp'))).rejects.toThrow('CHOCO 3');
  });

  it('dice que es por el cambio de vigencia cuando lo es', async () => {
    const { guard: g } = guard({ estado: 'EN_CURSO', codigo: 'LINEA 1', tipo: 'CAMBIO_VIGENCIA' });
    await expect(g.canActivate(contexto('PUT', '/procesos/:id/estudio-previo'))).rejects.toThrow('cambio de vigencia');
  });

  it('deja escribir si no hay revisión que bloquee', async () => {
    const { guard: g } = guard({ estado: 'EN_CURSO', codigo: null, tipo: null });
    await expect(g.canActivate(contexto('POST', '/procesos/:id/estudio-previo/enviar'))).resolves.toBe(true);
  });

  it('un proceso cancelado no admite cambios', async () => {
    const { guard: g } = guard({ estado: 'CANCELADO', codigo: null, tipo: null });
    await expect(g.canActivate(contexto('PATCH', '/procesos/:id/contrato'))).rejects.toThrow('se canceló');
  });

  it('nunca detiene las consultas', async () => {
    const { guard: g, query } = guard({ estado: 'CANCELADO', codigo: 'X', tipo: 'ELIMINACION' });
    await expect(g.canActivate(contexto('GET', '/procesos/:id/expediente'))).resolves.toBe(true);
    expect(query).not.toHaveBeenCalled();
  });

  it('deja asignar al abogado aunque el proceso esté detenido: es quien decide', async () => {
    const { guard: g, query } = guard({ estado: 'EN_CURSO', codigo: 'X', tipo: 'ELIMINACION' });
    await expect(g.canActivate(contexto('POST', '/procesos/:id/participacion/abogado'))).resolves.toBe(true);
    expect(query).not.toHaveBeenCalled();
  });

  it('no mira rutas que no son de un proceso', async () => {
    const { guard: g, query } = guard({ estado: 'CANCELADO', codigo: 'X', tipo: 'ELIMINACION' });
    await expect(g.canActivate(contexto('POST', '/paa/revisiones/:id/decidir'))).resolves.toBe(true);
    await expect(g.canActivate(contexto('POST', '/procesos'))).resolves.toBe(true);
    expect(query).not.toHaveBeenCalled();
  });
});
