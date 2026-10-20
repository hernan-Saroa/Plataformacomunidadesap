import { clasificarOfertas, PROGRAMA_NUEVO } from '../ofertas-clasificacion';
import { ImportCountDto, ImportResultDto } from '../dto/import-result.dto';

const matriz = (cetap: string, programas: string[]) => ({
  codigo_cetap: cetap,
  nombre_cetap: `Nombre ${cetap}`,
  codigo_dt: 'DT-009',
  nombre_dt: 'Huila',
  programas_ofertados: programas,
});

const ctx = (extra: Partial<Parameters<typeof clasificarOfertas>[1]> = {}) => ({
  cetapIdPorCodigo: new Map([['cet-1', '10'], ['cet-2', '20']]),
  programaIdPorCodigo: new Map([['pro-1', '1'], ['pro-2', '2']]),
  nombreProgramaPorCodigo: new Map([['pro-1', 'Programa uno'], ['pro-2', 'Programa dos']]),
  ofertasExistentes: new Set<string>(),
  ...extra,
});

describe('clasificarOfertas: qué pasa con cada oferta del Excel en el periodo', () => {
  it('en un periodo sin ofertas todas son por crear', () => {
    const r = clasificarOfertas([matriz('CET-1', ['PRO-1', 'PRO-2']), matriz('CET-2', ['PRO-1'])], ctx());
    expect(r).toMatchObject({ por_crear: 3, ya_existentes: 0, rechazadas: 0 });
    expect(r.detalle.map((d) => d.estado)).toEqual(['por_crear', 'por_crear', 'por_crear']);
    expect(r.detalle[0]).toMatchObject({ codigo_cetap: 'CET-1', nombre_cetap: 'Nombre CET-1', codigo_programa: 'PRO-1', nombre_programa: 'Programa uno' });
  });

  it('las que ya existen en ESE periodo son «ya existentes», no «por crear»', () => {
    const r = clasificarOfertas(
      [matriz('CET-1', ['PRO-1', 'PRO-2'])],
      ctx({ ofertasExistentes: new Set(['10::1']) }),
    );
    expect(r).toMatchObject({ por_crear: 1, ya_existentes: 1, rechazadas: 0 });
    expect(r.detalle.map((d) => `${d.codigo_programa}:${d.estado}`)).toEqual(['PRO-1:ya_existente', 'PRO-2:por_crear']);
  });

  it('una oferta de otro periodo no cuenta: el mismo CETAP y programa en un periodo nuevo se crea', () => {
    // El conjunto solo trae las ofertas del periodo destino; las de otros periodos no están.
    const r = clasificarOfertas([matriz('CET-1', ['PRO-1'])], ctx({ ofertasExistentes: new Set() }));
    expect(r.por_crear).toBe(1);
  });

  it('un CETAP o un programa nuevos (aún no en la base) se crean con la carga', () => {
    const r = clasificarOfertas(
      [matriz('CET-NUEVO', ['PRO-1']), matriz('CET-1', ['PRO-NUEVO'])],
      ctx({
        programaIdPorCodigo: new Map([['pro-1', '1'], ['pro-nuevo', PROGRAMA_NUEVO]]),
        ofertasExistentes: new Set(['10::1']),
      }),
    );
    expect(r).toMatchObject({ por_crear: 2, ya_existentes: 0, rechazadas: 0 });
  });

  it('un programa que no existe en el catálogo ni en el Excel se RECHAZA y no se cuenta como creada', () => {
    const r = clasificarOfertas([matriz('CET-1', ['PRO-1', 'PRO-FANTASMA'])], ctx());
    expect(r).toMatchObject({ por_crear: 1, ya_existentes: 0, rechazadas: 1 });
    const rechazada = r.detalle.find((d) => d.estado === 'rechazada')!;
    expect(rechazada.codigo_programa).toBe('PRO-FANTASMA');
    expect(rechazada.motivo).toMatch(/PRO-FANTASMA.*no existe/);
  });

  it('si el periodo todavía no existe (null) nada existe: todo es por crear', () => {
    const r = clasificarOfertas([matriz('CET-1', ['PRO-1'])], ctx({ ofertasExistentes: null }));
    expect(r).toMatchObject({ por_crear: 1, ya_existentes: 0 });
  });

  it('«sin cambios» y «rechazadas» son cuentas distintas en el reporte de la carga', () => {
    const cuenta = new ImportCountDto();
    expect(cuenta).toMatchObject({ omitidos: 0, sin_cambios: 0, rechazadas: 0 });
    expect(new ImportResultDto().ofertas).toEqual({ por_crear: 0, ya_existentes: 0, rechazadas: 0, detalle: [] });
  });
});
