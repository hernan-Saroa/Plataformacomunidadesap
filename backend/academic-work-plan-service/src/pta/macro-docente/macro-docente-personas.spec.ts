import { MacroDocenteService } from './macro-docente.service';
import { cargarPersonasDocentes } from './macro-docente-personas';

describe('cargarPersonasDocentes (Macro Docente leía una tabla donde ya no están los docentes)', () => {
  it('resuelve nombre y documento desde auth.personas en una sola consulta', async () => {
    const db = { query: jest.fn().mockResolvedValue([
      { id: 'p-1', nombre: 'ANA LOPEZ', documento: '111' }, { id: 'p-2', nombre: null, documento: null },
    ]) };
    const map = await cargarPersonasDocentes(db, ['p-1', 'p-2', 'p-1']);
    expect(db.query).toHaveBeenCalledTimes(1);
    expect(String(db.query.mock.calls[0][0])).toContain('auth.personas');
    expect(db.query.mock.calls[0][1]).toEqual([['p-1', 'p-2']]);
    expect(map.get('p-1')).toEqual({ nombreCompleto: 'ANA LOPEZ', documento: '111' });
    expect(map.get('p-2')).toEqual({ nombreCompleto: null, documento: null });
  });

  it('sin conexión o sin ids no consulta y devuelve un mapa vacío', async () => {
    const db = { query: jest.fn() };
    expect((await cargarPersonasDocentes(undefined, ['p-1'])).size).toBe(0);
    expect((await cargarPersonasDocentes(db, [])).size).toBe(0);
    expect((await cargarPersonasDocentes(db, ['', '  '])).size).toBe(0);
    expect(db.query).not.toHaveBeenCalled();
  });

  it('ignora a las personas que no existen en auth.personas', async () => {
    const db = { query: jest.fn().mockResolvedValue([]) };
    expect((await cargarPersonasDocentes(db, ['p-9'])).size).toBe(0);
  });
});

describe('Macro Docente: nombre y documento del docente en el reporte', () => {
  const pta = (docenteId: string) => ({
    docenteId, periodo: '2026-2', estado: 'EN_FIRME',
    datosEstructurados: { asignaturas: [{ codigo: 'A1', nombre: 'Asignatura 1', horas: 4, territorial_nombre: 'Santander' }] },
  });
  const repoWith = (rows: any[]) => ({ find: jest.fn().mockResolvedValue(rows), createQueryBuilder: jest.fn() });

  function service(options: { ptas: any[]; docentes: any[]; legacy?: any[]; authRows?: any[]; withDataSource?: boolean }) {
    const qb = { where: jest.fn().mockReturnThis(), andWhere: jest.fn().mockReturnThis(), orderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue(options.ptas) };
    const ptaRepo = { createQueryBuilder: jest.fn(() => qb) };
    const personaRepo = repoWith(options.legacy ?? []);
    const dataSource = { query: jest.fn().mockResolvedValue(options.authRows ?? []) };
    const instance = new MacroDocenteService(
      ptaRepo as any, repoWith(options.docentes) as any, personaRepo as any, repoWith([]) as any,
      repoWith([]) as any, repoWith([]) as any, {} as any, (options.withDataSource === false ? undefined : dataSource) as any,
    );
    return { instance, personaRepo, dataSource };
  }

  it('muestra el nombre y la cédula del docente tomados de auth.personas', async () => {
    const { instance, personaRepo } = service({
      ptas: [pta('d-1')], docentes: [{ id: 'd-1', personaId: 'p-1', nucleoTematico: 'Gestión' }],
      authRows: [{ id: 'p-1', nombre: 'ANA LOPEZ', documento: '1020304050' }],
    });
    const { items } = await instance.getHistorial({ periodo: '2026-2' });
    expect(items[0]).toMatchObject({ docente_nombre: 'ANA LOPEZ', documento_identidad: '1020304050', nucleo_tematico: 'Gestión', asignatura_codigo: 'A1' });
    expect(personaRepo.find).not.toHaveBeenCalled();
  });

  it('recurre a la tabla antigua solo para las personas que no están en auth.personas', async () => {
    const { instance, personaRepo } = service({
      ptas: [pta('d-1'), pta('d-2')],
      docentes: [{ id: 'd-1', personaId: 'p-auth' }, { id: 'd-2', personaId: 'p-legado' }],
      authRows: [{ id: 'p-auth', nombre: 'NUEVA PERSONA', documento: '1' }],
      legacy: [{ id: 'p-legado', primer_nombre: 'LUIS', primer_apellido: 'PEREZ', identificacion: '2' }],
    });
    const { items } = await instance.getHistorial({ periodo: '2026-2' });
    const byDocente = Object.fromEntries(items.map((i) => [i.docente_id, i]));
    expect(byDocente['d-1']).toMatchObject({ docente_nombre: 'NUEVA PERSONA', documento_identidad: '1' });
    expect(byDocente['d-2']).toMatchObject({ docente_nombre: 'LUIS PEREZ', documento_identidad: '2' });
    expect(personaRepo.find).toHaveBeenCalledTimes(1);
  });

  it('sin conexión disponible conserva el comportamiento anterior (tabla antigua)', async () => {
    const { instance } = service({
      ptas: [pta('d-1')], docentes: [{ id: 'd-1', personaId: 'p-1' }], withDataSource: false,
      legacy: [{ id: 'p-1', primer_nombre: 'ANA', primer_apellido: 'LOPEZ', identificacion: '9' }],
    });
    const { items } = await instance.getHistorial({ periodo: '2026-2' });
    expect(items[0]).toMatchObject({ docente_nombre: 'ANA LOPEZ', documento_identidad: '9' });
  });

  it('un docente sin persona en ninguna tabla no rompe el reporte: nombre y documento vacíos', async () => {
    const { instance } = service({ ptas: [pta('d-1')], docentes: [{ id: 'd-1', personaId: 'p-x' }] });
    const { items, total } = await instance.getHistorial({ periodo: '2026-2' });
    expect(total).toBe(1);
    expect(items[0]).toMatchObject({ docente_nombre: null, documento_identidad: null, asignatura_codigo: 'A1' });
  });

  it('la consulta puntual (y el acceso externo) usan la misma resolución de nombres', async () => {
    const { instance } = service({
      ptas: [pta('d-1')], docentes: [{ id: 'd-1', personaId: 'p-1' }], authRows: [{ id: 'p-1', nombre: 'ANA LOPEZ', documento: '5' }],
    });
    const rows = await instance.getConsultaPuntual('d-1', '2026-2');
    expect(rows[0]).toMatchObject({ docente_nombre: 'ANA LOPEZ', documento_identidad: '5' });
  });
});
