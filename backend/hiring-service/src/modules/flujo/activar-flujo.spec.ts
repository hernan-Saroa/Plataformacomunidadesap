import { ConflictException } from '@nestjs/common';

import { FlujoService } from './flujo.service';

/**
 * Activar una versión del flujo la lleva a los procesos vivos (en curso y
 * adjudicados). Antes se quedaban con la versión con la que nacieron y el
 * cambio solo lo veían los procesos nuevos.
 */
describe('FlujoService.activar · los procesos vivos pasan a la versión nueva', () => {
  const acceso = { userName: 'directora', userId: 'u-1' } as any;

  /** Una base de mentira que responde por el texto de la consulta y guarda lo que se le pidió. */
  function montar(procesos: { id: string; de: number | null }[]) {
    const consultas: { sql: string; params: any[] }[] = [];
    const em = {
      query: jest.fn(async (sql: string, params: any[] = []) => {
        consultas.push({ sql, params });
        if (sql.includes("WHERE estado = 'BORRADOR'")) return [{ id: 'v-3' }];
        if (sql.includes('SELECT numero FROM hiring.flujo_versiones')) return [{ numero: 3 }];
        if (sql.includes('IS DISTINCT FROM')) return procesos;
        return [];
      }),
    };
    const dataSource = { transaction: (trabajo: any) => trabajo(em) } as any;
    const service = new FlujoService(dataSource, {} as any);
    return { service, consultas };
  }

  it('cambia la versión de cada proceso vivo y lo deja en su trazabilidad', async () => {
    const { service, consultas } = montar([
      { id: 'p-1', de: 2 },
      { id: 'p-2', de: 1 },
    ]);
    jest.spyOn(service, 'validar').mockResolvedValue([]);

    const r = await service.activar(acceso, 'El estudio previo lo revisa el abogado revisor');

    expect(r).toEqual({ activada: true, version: 3, procesosActualizados: 2 });
    const pasos = consultas.filter((c) => c.sql.includes('SET flujo_version_id'));
    expect(pasos.map((c) => c.params)).toEqual([
      ['p-1', 'v-3'],
      ['p-2', 'v-3'],
    ]);
    const trazas = consultas.filter((c) => c.sql.includes('INSERT INTO hiring.trazabilidad'));
    expect(trazas).toHaveLength(2);
    expect(JSON.parse(trazas[0].params[1])).toEqual({
      de: 2,
      a: 3,
      motivo: 'Se activó la versión 3 del flujo: El estudio previo lo revisa el abogado revisor',
      automatico: true,
    });
  });

  it('busca los procesos en curso y los adjudicados, que siguen en ejecución', async () => {
    const { service, consultas } = montar([]);
    jest.spyOn(service, 'validar').mockResolvedValue([]);

    await service.activar(acceso);

    const busqueda = consultas.find((c) => c.sql.includes('IS DISTINCT FROM'));
    expect(busqueda?.params).toEqual(['v-3', ['EN_CURSO', 'ADJUDICADO']]);
  });

  it('si la versión tiene errores no se activa ni se mueve ningún proceso', async () => {
    const { service, consultas } = montar([{ id: 'p-1', de: 2 }]);
    jest.spyOn(service, 'validar').mockResolvedValue([
      { numeral: '3.1', etapa: 3, modalidad: null, parte: 'HACE', gravedad: 'ERROR', mensaje: 'Nadie la puede hacer' } as any,
    ]);

    await expect(service.activar(acceso)).rejects.toBeInstanceOf(ConflictException);
    expect(consultas.some((c) => c.sql.includes('SET flujo_version_id'))).toBe(false);
    expect(consultas.some((c) => c.sql.includes("SET estado = 'ACTIVA'"))).toBe(false);
  });
});
