import { ServiceUnavailableException } from '@nestjs/common';
import { RundBancoController, RundBancoService } from './rund-banco.controller';

describe('Proyección interna del banco RUND en Auth', () => {
  it('proyecta en una lectura únicamente docentes y los catálogos requeridos, sin perfiles RUND ni secretos', async () => {
    const proyeccion = { version: 1, items: [], total: 0, seccionales: [], seccionalesTotal: 0, sedes: [], sedesTotal: 0 };
    const query = jest.fn().mockResolvedValue([{ proyeccion }]);
    await expect(new RundBancoController(new RundBancoService({ query } as any)).proyeccion()).resolves.toEqual(proyeccion);
    expect(query).toHaveBeenCalledTimes(1);
    const sql = query.mock.calls[0][0];
    expect(sql).not.toMatch(/rund\.|academic_work_plan\.|password|token|dir_residencia|id_tercero|SELECT \*/i);
    expect(sql).toContain("UPPER(r.name)='DOCENTE'");
    expect(sql).toContain('COALESCE(ur.is_active,true)=true');
    expect(sql).toContain('COALESCE(r.is_active,true)=true');
    expect(sql).not.toContain('u.is_active=true');
    expect(sql).toContain('p.id_seccional::text');
    expect(sql).toContain('p.id_sede::text');
  });

  it.each([{ rows: [] }, { rows: [{}] }])('una lectura sin proyección no se presenta como banco vacío: %s', async ({ rows }) => {
    await expect(new RundBancoService({ query: jest.fn().mockResolvedValue(rows) } as any).proyeccion())
      .rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});
