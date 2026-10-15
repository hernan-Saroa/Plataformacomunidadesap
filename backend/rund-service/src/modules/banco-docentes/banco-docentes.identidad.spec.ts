import { NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { BancoDocentesService } from './banco-docentes.service';

describe('Banco RUND: proyección Auth por operación', () => {
  const empty = { version: 1, items: [], total: 0, seccionales: [], seccionalesTotal: 0, sedes: [], sedesTotal: 0 };
  function service() {
    const value = Object.create(BancoDocentesService.prototype) as any;
    value.authBanco = { proyeccion: jest.fn().mockResolvedValue(empty) };
    value.dataSource = { query: jest.fn().mockResolvedValue([]) };
    return value;
  }
  it('pagina después de filtrar y usa el mismo snapshot en conteo y datos', async () => {
    const s = service();
    s.dataSource.query.mockResolvedValueOnce([{ total: 0 }]).mockResolvedValueOnce([]);
    await expect(s.list({ search: "' OR true --", periodoCarga: '2026-2', page: 3, limit: 2 }))
      .resolves.toEqual({ data: [], total: 0, page: 3, limit: 2, pages: 0 });
    expect(s.authBanco.proyeccion).toHaveBeenCalledTimes(1);
    const calls = s.dataSource.query.mock.calls;
    expect(calls[0][1]).toEqual([JSON.stringify(empty), '2026-2', "%' OR true --%"]);
    expect(calls[1][1]).toEqual([JSON.stringify(empty), '2026-2', "%' OR true --%", 2, 4]);
    expect(calls[1][0]).toContain('LIMIT $4 OFFSET $5');
    expect(calls[1][0]).not.toMatch(/auth\.|academic_work_plan\.|OR true/);
  });
  it('reutiliza el snapshot en todos los grupos de estadísticas con parámetros independientes', async () => {
    const s = service(); await s.getStats({ territorial: '9007199254740993', periodoCarga: '2026-2' });
    expect(s.authBanco.proyeccion).toHaveBeenCalledTimes(1);
    expect(s.dataSource.query).toHaveBeenCalledTimes(10);
    for (const [sql, params] of s.dataSource.query.mock.calls) {
      expect(params).toEqual([JSON.stringify(empty), '9007199254740993', '2026-2']);
      expect(sql).not.toMatch(/auth\.|academic_work_plan\./);
    }
  });
  it('ausencia confirmada conserva el 404 por ID y período', async () => {
    const s = service(); await expect(s.getById('ausente', '2026-2')).rejects.toBeInstanceOf(NotFoundException);
    expect(s.dataSource.query.mock.calls[0][1]).toEqual([JSON.stringify(empty), 'ausente', '2026-2']);
  });
  it.each(['list', 'getById', 'getStats'])('%s falla antes de consultar SQL cuando Auth no confirma el snapshot', async method => {
    const s = service(); s.authBanco.proyeccion.mockRejectedValue(new ServiceUnavailableException());
    await expect(s[method](method === 'getById' ? 'id' : {})).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(s.dataSource.query).not.toHaveBeenCalled();
  });
});
