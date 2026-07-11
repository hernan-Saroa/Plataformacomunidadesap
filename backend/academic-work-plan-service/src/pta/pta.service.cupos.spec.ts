import { PtaService } from './pta.service';

describe('PtaService - cupos dinámicos de asignaturas', () => {
  it('reemplaza el valor guardado por el cupo vigente y reutiliza la consulta por oferta', async () => {
    const service = Object.create(PtaService.prototype) as any;
    service.getOfertaCetapPrograma = jest.fn().mockResolvedValue({ cupos_estimados: 90 });

    const asignaturas = [
      { id: 1, cetap_id: '10', programa_id: '20', total_estudiantes: 95 },
      { id: 2, cetap_id: '10', programa_id: '20', total_estudiantes: 95 },
      { id: 3, asignatura_id: 'legacy', total_estudiantes: 40 },
    ];

    const result = await service.syncAsignaturasCupos(asignaturas, '2025-2');

    expect(result.map((item: any) => item.total_estudiantes)).toEqual([90, 90, 40]);
    expect(service.getOfertaCetapPrograma).toHaveBeenCalledTimes(1);
    expect(service.getOfertaCetapPrograma).toHaveBeenCalledWith({
      cetap_id: '10',
      programa_id: '20',
      periodo: '2025-2',
    });
    expect(asignaturas[0].total_estudiantes).toBe(95);
  });

  it('filtra la oferta por el periodo académico solicitado', async () => {
    const query = jest.fn().mockResolvedValue([{ cupos_estimados: 90 }]);
    const service = Object.create(PtaService.prototype) as any;
    service.ptaRepo = { manager: { query } };

    const result = await service.getOfertaCetapPrograma({
      cetap_id: '10',
      programa_id: '20',
      periodo: '2025-2',
    });

    expect(result).toEqual({ cupos_estimados: 90 });
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('pa.codigo = $3'),
      ['10', '20', '2025-2'],
    );
  });
});
