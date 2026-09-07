import { PtaService } from './pta.service';
import { BadRequestException, ForbiddenException } from '@nestjs/common';

describe('PtaService.aprobarComponentesLote', () => {
  function createService() {
    const service = Object.create(PtaService.prototype) as any;
    // Por defecto todo PTA "existe" (aprobarComponentesLote lo verifica antes de
    // tocar getComponentesAprobacion); los tests que necesiten simular un PTA
    // inexistente sobreescriben este mock.
    service.ptaRepo = { exists: jest.fn().mockResolvedValue(true) };
    return service;
  }

  const auth = { userId: 'u1', isSuperUser: false, allowedComponents: ['academica_pregrado', 'complementarias_pregrado'] } as any;

  it('rechaza sin autenticación', async () => {
    const service = createService();
    await expect(service.aprobarComponentesLote({ ptaIds: ['p1'], componentes: ['investigacion'] }))
      .rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rechaza sin ptaIds', async () => {
    const service = createService();
    await expect(service.aprobarComponentesLote({ ptaIds: [], componentes: ['investigacion'] }, auth))
      .rejects.toBeInstanceOf(BadRequestException);
  });

  it('rechaza sin componentes', async () => {
    const service = createService();
    await expect(service.aprobarComponentesLote({ ptaIds: ['p1'], componentes: [] }, auth))
      .rejects.toBeInstanceOf(BadRequestException);
  });

  it('rechaza un componente no soportado', async () => {
    const service = createService();
    await expect(service.aprobarComponentesLote({ ptaIds: ['p1'], componentes: ['no_existe'] }, auth))
      .rejects.toBeInstanceOf(BadRequestException);
  });

  it('aprueba solo lo pendiente, omite lo que no aplica o ya está resuelto, y no aborta el lote si un ítem falla', async () => {
    const service = createService();
    // 'pta-inexistente' no existe: se corta antes de llamar getComponentesAprobacion
    // (que de lo contrario intentaría autocrear filas 'pendiente' y violaría la FK).
    service.ptaRepo = { exists: jest.fn(async ({ where }: any) => where.id !== 'pta-inexistente') };

    // PTA A: academica_pregrado pendiente (se aprueba), complementarias_pregrado ya aprobado (se omite).
    // PTA B: academica_pregrado devuelto (se omite, no se re-aprueba a ciegas), complementarias_pregrado
    // no existe en este PTA (no aplica, se omite).
    // PTA C: academica_pregrado pendiente pero aprobarComponente falla (p.ej. bloqueado por otro
    // componente devuelto) — se reporta fallido y el resto del lote sigue procesándose.
    service.getComponentesAprobacion = jest.fn(async (ptaId: string) => {
      if (ptaId === 'pta-A') {
        return [
          { componente: 'academica_pregrado', estado: 'pendiente' },
          { componente: 'complementarias_pregrado', estado: 'aprobado' },
        ];
      }
      if (ptaId === 'pta-B') {
        return [
          { componente: 'academica_pregrado', estado: 'devuelto' },
        ];
      }
      if (ptaId === 'pta-C') {
        return [
          { componente: 'academica_pregrado', estado: 'pendiente' },
        ];
      }
      throw new Error('No debería llegar aquí: pta-inexistente se corta en el chequeo de existencia');
    });

    const aprobarComponenteCalls: any[] = [];
    service.aprobarComponente = jest.fn(async (ptaId: string, body: any) => {
      aprobarComponenteCalls.push({ ptaId, body });
      if (ptaId === 'pta-C') {
        throw new BadRequestException('El componente "academica_pregrado" tiene revisión(es) pendiente(s)');
      }
      return { approval: { ptaId, componente: body.componente, estado: 'aprobado' }, estadoGeneral: 'Pendiente Decanatura' };
    });

    const result = await service.aprobarComponentesLote(
      {
        ptaIds: ['pta-A', 'pta-B', 'pta-C', 'pta-inexistente'],
        componentes: ['academica_pregrado', 'complementarias_pregrado'],
        comentarios: 'Revisado en lote',
      },
      auth,
    );

    // Solo se intenta aprobar lo que realmente estaba pendiente: pta-A/academica_pregrado y
    // pta-C/academica_pregrado. Nunca complementarias_pregrado de pta-B (no existe) ni el ya
    // aprobado de pta-A, ni nada de pta-inexistente (falla antes de llegar a aprobarComponente).
    expect(aprobarComponenteCalls).toEqual([
      { ptaId: 'pta-A', body: { componente: 'academica_pregrado', estado: 'aprobado', comentarios: 'Revisado en lote' } },
      { ptaId: 'pta-C', body: { componente: 'academica_pregrado', estado: 'aprobado', comentarios: 'Revisado en lote' } },
    ]);

    const byPta = (ptaId: string) => result.resultados.filter((r: any) => r.ptaId === ptaId);

    expect(byPta('pta-A')).toEqual([
      { ptaId: 'pta-A', componente: 'academica_pregrado', estado: 'aprobado' },
      { ptaId: 'pta-A', componente: 'complementarias_pregrado', estado: 'omitido', motivo: 'Ya estaba aprobado' },
    ]);
    expect(byPta('pta-B')).toEqual([
      { ptaId: 'pta-B', componente: 'academica_pregrado', estado: 'omitido', motivo: 'Devuelto: pendiente de corrección del docente' },
      { ptaId: 'pta-B', componente: 'complementarias_pregrado', estado: 'omitido', motivo: 'No aplica a este PTA' },
    ]);
    expect(byPta('pta-C')[0]).toMatchObject({
      ptaId: 'pta-C',
      componente: 'academica_pregrado',
      estado: 'fallido',
      motivo: expect.stringContaining('revisión'),
    });
    expect(byPta('pta-inexistente')).toEqual([
      { ptaId: 'pta-inexistente', componente: 'academica_pregrado', estado: 'fallido', motivo: 'PTA no encontrado' },
      { ptaId: 'pta-inexistente', componente: 'complementarias_pregrado', estado: 'fallido', motivo: 'PTA no encontrado' },
    ]);

    expect(result.resumen).toEqual({ total: 8, aprobados: 1, devueltos: 0, omitidos: 4, fallidos: 3 });
  });

  it('reporta fallido con un motivo legible cuando el PTA no existe, sin tocar getComponentesAprobacion', async () => {
    // Reproduce lo observado en la prueba en vivo contra el backend real: sin este
    // chequeo, un ptaId inexistente llegaba a intentar un INSERT en
    // PtaComponentApproval y violaba la FK, dejando un error crudo de Postgres como
    // motivo en vez de un mensaje legible.
    const service = createService();
    service.ptaRepo = { exists: jest.fn().mockResolvedValue(false) };
    service.getComponentesAprobacion = jest.fn();
    service.aprobarComponente = jest.fn();

    const result = await service.aprobarComponentesLote(
      { ptaIds: ['pta-fantasma'], componentes: ['investigacion'] },
      auth,
    );

    expect(service.getComponentesAprobacion).not.toHaveBeenCalled();
    expect(service.aprobarComponente).not.toHaveBeenCalled();
    expect(result.resultados).toEqual([
      { ptaId: 'pta-fantasma', componente: 'investigacion', estado: 'fallido', motivo: 'PTA no encontrado' },
    ]);
    expect(result.resumen).toEqual({ total: 1, aprobados: 0, devueltos: 0, omitidos: 0, fallidos: 1 });
  });

  it('no llama aprobarComponente para nada si todo ya está resuelto (lote sin cambios)', async () => {
    const service = createService();
    service.getComponentesAprobacion = jest.fn().mockResolvedValue([
      { componente: 'investigacion', estado: 'aprobado' },
    ]);
    service.aprobarComponente = jest.fn();

    const result = await service.aprobarComponentesLote(
      { ptaIds: ['pta-1'], componentes: ['investigacion'] },
      { ...auth, allowedComponents: ['investigacion'] },
    );

    expect(service.aprobarComponente).not.toHaveBeenCalled();
    expect(result.resumen).toEqual({ total: 1, aprobados: 0, devueltos: 0, omitidos: 1, fallidos: 0 });
  });

  it('propaga aprobadorRol al body de aprobarComponente, igual que la aprobación individual', async () => {
    // La identidad (aprobadorId/aprobadorNombre) la impone siempre `auth` server-side,
    // pero aprobadorRol sí se toma del body — sin este passthrough, un componente
    // aprobado en lote mostraría el rol crudo del token en el historial/panel de
    // detalle en vez del mismo rótulo ("Gestión Profesoral", "Jefatura Territorial X",
    // etc.) que deja la aprobación individual desde PTADetallePanelBackoffice.tsx.
    const service = createService();
    service.getComponentesAprobacion = jest.fn().mockResolvedValue([
      { componente: 'investigacion', estado: 'pendiente' },
    ]);
    service.aprobarComponente = jest.fn().mockResolvedValue({ approval: {}, estadoGeneral: 'Aprobado' });

    const authInvestigacion = { ...auth, allowedComponents: ['investigacion'] };
    await service.aprobarComponentesLote(
      {
        ptaIds: ['pta-1'],
        componentes: ['investigacion'],
        aprobadorId: 'ignorado-por-auth',
        aprobadorNombre: 'ignorado-por-auth',
        aprobadorRol: 'Gestión Profesoral',
      },
      authInvestigacion,
    );

    expect(service.aprobarComponente).toHaveBeenCalledWith(
      'pta-1',
      expect.objectContaining({
        componente: 'investigacion',
        estado: 'aprobado',
        aprobadorId: 'ignorado-por-auth',
        aprobadorNombre: 'ignorado-por-auth',
        aprobadorRol: 'Gestión Profesoral',
      }),
      authInvestigacion,
    );
  });

  it('con estado "devuelto" devuelve en lote en vez de aprobar, y omite lo que ya estaba devuelto', async () => {
    const service = createService();
    // PTA A: investigacion pendiente (se devuelve). PTA B: investigacion ya devuelto (se omite,
    // no se re-devuelve — mismo candado que aprobarComponente aplica sobre una devolución previa).
    service.getComponentesAprobacion = jest.fn(async (ptaId: string) => {
      if (ptaId === 'pta-A') return [{ componente: 'investigacion', estado: 'pendiente' }];
      if (ptaId === 'pta-B') return [{ componente: 'investigacion', estado: 'devuelto' }];
      throw new Error('No debería llegar aquí');
    });
    service.aprobarComponente = jest.fn(async (ptaId: string, body: any) => ({
      approval: { ptaId, componente: body.componente, estado: body.estado },
      estadoGeneral: 'Devuelto',
    }));

    const authInvestigacion = { ...auth, allowedComponents: ['investigacion'] };
    const result = await service.aprobarComponentesLote(
      {
        ptaIds: ['pta-A', 'pta-B'],
        componentes: ['investigacion'],
        estado: 'devuelto',
        comentarios: 'Falta corregir horas',
      },
      authInvestigacion,
    );

    expect(service.aprobarComponente).toHaveBeenCalledTimes(1);
    expect(service.aprobarComponente).toHaveBeenCalledWith(
      'pta-A',
      expect.objectContaining({ componente: 'investigacion', estado: 'devuelto', comentarios: 'Falta corregir horas' }),
      authInvestigacion,
    );

    expect(result.resultados).toEqual([
      { ptaId: 'pta-A', componente: 'investigacion', estado: 'devuelto' },
      { ptaId: 'pta-B', componente: 'investigacion', estado: 'omitido', motivo: 'Ya estaba devuelto' },
    ]);
    expect(result.resumen).toEqual({ total: 2, aprobados: 0, devueltos: 1, omitidos: 1, fallidos: 0 });
  });

  it('rechaza un valor de estado distinto de "aprobado"/"devuelto"', async () => {
    const service = createService();
    await expect(
      service.aprobarComponentesLote({ ptaIds: ['p1'], componentes: ['investigacion'], estado: 'rechazado' }, auth),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
