import { BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import { BancoDocentesService } from './banco-docentes.service';

describe('Vencimientos con identidad propietaria', () => {
  const a = '11111111-1111-4111-8111-111111111111', b = '22222222-2222-4222-8222-222222222222';
  function build(rows: any[] = []) {
    const query = jest.fn().mockResolvedValue(rows);
    const nombresPorPersonas = jest.fn().mockResolvedValue(new Map([[a, 'NOMBRE'], [b, null]]));
    const service = new BancoDocentesService({} as any, {} as any, {} as any, {} as any, {} as any,
      { query } as any, {} as any, {} as any, { nombresPorPersonas } as any);
    return { service, query, nombresPorPersonas };
  }
  it('conserva orden, todas las columnas, nombres nulos y exclusión de huérfanos del INNER JOIN', async () => {
    const base = { fecha_vencimiento: '2026-10-14', correoInstitucional: null, estado: 'Pendiente', revisiones_campos: { dato: 'original' } };
    const { service, query, nombresPorPersonas } = build([
      { ...base, id: 'primero', _rundPersonaId: b }, { ...base, id: 'segundo', _rundPersonaId: a.toUpperCase() },
      { ...base, id: 'huerfano', _rundPersonaId: '33333333-3333-4333-8333-333333333333' },
    ]);
    await expect(service.getSoportesProximosVencer()).resolves.toEqual([
      { ...base, id: 'primero', nombre_docente: null }, { ...base, id: 'segundo', nombre_docente: 'NOMBRE' },
    ]);
    expect(nombresPorPersonas).toHaveBeenCalledTimes(1);
    expect(query.mock.calls[0][0]).not.toMatch(/auth\.|academic_work_plan\./);
    expect(query.mock.calls[0][0]).toContain("sc.estado != 'Rechazado'");
    expect(query.mock.calls[0][0]).not.toContain('ACTIVO');
  });
  it.each([-5, 0, 30, 365])('parametriza umbral %s conservando vencidos y futuros sin nuevos filtros', async dias => {
    const { service, query } = build(); await service.getSoportesProximosVencer(dias);
    expect(query).toHaveBeenCalledWith(expect.stringContaining('NOW() + $1::interval'), [`${dias} days`]);
  });
  it.each([NaN, Infinity, 1.5, '30); DROP TABLE x' as any])('umbral inválido %s no consulta fuentes', async dias => {
    const { service, query, nombresPorPersonas } = build();
    await expect(service.getSoportesProximosVencer(dias)).rejects.toBeInstanceOf(BadRequestException);
    expect(query).not.toHaveBeenCalled(); expect(nombresPorPersonas).not.toHaveBeenCalled();
  });
  it('fallo de Auth no entrega vencimientos sin nombres ni consulta tablas externas', async () => {
    const { service, query, nombresPorPersonas } = build([{ id: 'soporte', _rundPersonaId: a }]);
    nombresPorPersonas.mockRejectedValue(new ServiceUnavailableException());
    await expect(service.getSoportesProximosVencer()).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(query).toHaveBeenCalledTimes(1);
  });
});
