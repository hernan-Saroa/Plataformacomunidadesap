import { NotFoundException } from '@nestjs/common';
import { ProgramasService } from './programas.service';

describe('retiro de programas sin borrar información académica', () => {
  function setup({ otros = [], propietario = '1', columna = true, existe = true, periodoExiste = true }: any = {}) {
    const query = jest.fn(async (sql: string) => {
      if (sql.includes('FOR UPDATE')) return existe ? [{ id: '111' }] : [];
      if (sql.includes('periodo_academico WHERE codigo')) return periodoExiste ? [{ id: '1' }] : [];
      if (sql.includes('SELECT id_periodo_academico FROM academic_work_plan.oferta')) return otros;
      if (sql.includes('SELECT id_periodo_academico FROM academic_work_plan.programa')) return [{ id_periodo_academico: propietario }];
      return [];
    });
    const transaction = jest.fn(async fn => fn({ query }));
    const service = new ProgramasService({ manager: { transaction } } as any, {} as any);
    (service as any).programaPeriodoColumn = columna;
    return { service, query, transaction };
  }

  it.each([true, false])('retira el último período y conserva asignaturas, núcleos y PTAs (columna=%s)', async columna => {
    const { service, query } = setup({ columna });
    await service.eliminarPrograma('111', '2026-1');
    expect(query.mock.calls.some(([sql]) => sql.includes('SET activa = FALSE') && sql.includes('id_periodo_academico = $2'))).toBe(true);
    expect(query.mock.calls.some(([sql]) => sql.includes('SET activo = FALSE, deleted_at = COALESCE'))).toBe(true);
    expect(query.mock.calls.every(([sql]) => !sql.includes('DELETE') && !sql.includes('UPDATE academic_work_plan.asignatura') && !sql.includes('UPDATE academic_work_plan.nucleo_tematico'))).toBe(true);
  });

  it('mantiene el programa disponible en otros períodos y conserva su mismo identificador', async () => {
    const { service, query } = setup({ otros: [{ id_periodo_academico: '2' }] });
    await service.eliminarPrograma('111', '2026-1');
    expect(query).toHaveBeenCalledWith(expect.stringContaining('SET id_periodo_academico = $1'), ['2', '111']);
    expect(query.mock.calls.some(([sql]) => sql.includes('deleted_at ='))).toBe(false);
    expect(query.mock.calls.every(([sql]) => !sql.includes('DELETE'))).toBe(true);
  });

  it('conserva un programa propio de otro período aunque no tenga otras ofertas activas', async () => {
    const { service, query } = setup({ propietario: '2' });
    await service.eliminarPrograma('111', '2026-1');
    expect(query.mock.calls.some(([sql]) => sql.includes('deleted_at ='))).toBe(false);
  });

  it('el retiro global desactiva las ofertas y conserva los registros vinculados', async () => {
    const { service, query, transaction } = setup();
    await service.eliminarPrograma('111');
    expect(transaction).toHaveBeenCalledTimes(1);
    expect(query).toHaveBeenCalledWith(expect.stringContaining('SET activa = FALSE WHERE id_programa = $1'), ['111']);
    expect(query.mock.calls.every(([sql]) => !sql.includes('DELETE'))).toBe(true);
  });

  it('un período inexistente no provoca un retiro global', async () => {
    const { service, query } = setup({ periodoExiste: false });
    await expect(service.eliminarPrograma('111', 'inexistente')).rejects.toThrow(NotFoundException);
    expect(query.mock.calls.every(([sql]) => !sql.trimStart().startsWith('UPDATE'))).toBe(true);
  });

  it('valida programa y período antes de modificar registros', async () => {
    const { service, query } = setup({ existe: false });
    await expect(service.eliminarPrograma('111', '2026-1')).rejects.toThrow(NotFoundException);
    await expect(service.eliminarPrograma('111', ' ')).rejects.toThrow('período válido');
    expect(query.mock.calls.every(([sql]) => !sql.trimStart().startsWith('UPDATE'))).toBe(true);
  });
});
