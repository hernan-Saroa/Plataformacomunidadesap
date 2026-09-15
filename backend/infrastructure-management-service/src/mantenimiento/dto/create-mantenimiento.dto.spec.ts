import { validate, validateSync } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import {
  CreateMantenimientoDto,
  UpdateMantenimientoEstadoDto,
} from './create-mantenimiento.dto';

/**
 * Validación de DTOs con class-validator. Documenta los mínimos que
 * garantizamos antes de entrar al service (IsUUID each, longitudes,
 * optionalidad de uploadedEvidenciaIds, campos obligatorios).
 */

const uuid = '550e8400-e29b-41d4-a716-446655440000';

const valido = {
  idSede: uuid,
  nombreAreaSolicitante: 'Coordinación Académica',
  piso: 'Piso 3',
  salon: 'Aula 204',
  tipoMantenimiento: 'PREVENTIVO',
  descripcion: 'Falla aire acondicionado aula magister 204 desde ayer',
};

describe('CreateMantenimientoDto validaciones de entrada', () => {
  const validar = (obj: any) =>
    validate(plainToInstance(CreateMantenimientoDto, obj));

  it('pasa cuando todos los campos cumplen', async () => {
    const errores = await validar(valido);
    expect(errores).toHaveLength(0);
  });

  it('rechaza idSede que no sea UUID (atajo front mandando string random)', async () => {
    const errores = await validar({ ...valido, idSede: 'sede-central-123' });
    expect(errores.some((e) => e.property === 'idSede')).toBe(true);
  });

  it('rechaza descripciones demasiado cortas (MinLength 10)', async () => {
    const errores = await validar({ ...valido, descripcion: 'no' });
    const desc = errores.find((e) => e.property === 'descripcion');
    expect(desc).toBeDefined();
    expect(Object.keys(desc?.constraints || {})).toContain('minLength');
  });

  it('rechaza nombre de área menor a 3 chars', async () => {
    const errores = await validar({ ...valido, nombreAreaSolicitante: 'AC' });
    expect(errores.some((e) => e.property === 'nombreAreaSolicitante')).toBe(true);
  });

  it('acepta uploadedEvidenciaIds vacío o undefined (opcional)', async () => {
    const [eUndefined, eVacio] = await Promise.all([
      validar({ ...valido, uploadedEvidenciaIds: undefined }),
      validar({ ...valido, uploadedEvidenciaIds: [] }),
    ]);
    expect(eUndefined).toHaveLength(0);
    expect(eVacio).toHaveLength(0);
  });

  it('rechaza uploadedEvidenciaIds con strings que NO sean UUID (IsUUID each)', async () => {
    const errores = await validar({
      ...valido,
      uploadedEvidenciaIds: [uuid, 'no-soy-uuid-123'],
    });
    const up = errores.find((e) => e.property === 'uploadedEvidenciaIds');
    expect(up).toBeDefined();
    expect(up?.children?.length).toBeGreaterThan(0);
  });

  it('acepta uploadedEvidenciaIds de UUIDs correctos', async () => {
    const errores = await validar({
      ...valido,
      uploadedEvidenciaIds: [uuid, '550e8400-e29b-41d4-a716-446655440001'],
    });
    expect(errores).toHaveLength(0);
  });

  it('rechaza salon vacío o más largo de 100 chars', async () => {
    const [vacio, largo] = await Promise.all([
      validar({ ...valido, salon: '' }),
      validar({ ...valido, salon: 'X'.repeat(101) }),
    ]);
    expect(vacio.some((e) => e.property === 'salon')).toBe(true);
    expect(largo.some((e) => e.property === 'salon')).toBe(true);
  });

  it('piso, tipoMantenimiento, nombreArea, descripcion NO aceptan nulos', async () => {
    const todos = await Promise.all(
      (['piso', 'salon', 'tipoMantenimiento', 'nombreAreaSolicitante', 'descripcion'] as const).map(
        (k) => validar({ ...valido, [k]: undefined }),
      ),
    );
    todos.forEach((errores) => expect(errores.length).toBeGreaterThan(0));
  });
});

describe('UpdateMantenimientoEstadoDto validaciones', () => {
  it('pasa con estado obligatorio + campos opcionales', () => {
    const res = validateSync(
      plainToInstance(UpdateMantenimientoEstadoDto, {
        estado: 'EN_ANALISIS',
        responsableAsignado: 'Ing. Carlos Perez',
        observaciones: 'Se asigna cuadrilla de mantenimiento',
        fechaEjecucion: '2026-09-18',
      }),
    );
    expect(res).toHaveLength(0);
  });

  it('rechaza cuando falta el estado (no hay orden sin nuevo estado)', () => {
    const res = validateSync(
      plainToInstance(UpdateMantenimientoEstadoDto, {
        responsableAsignado: 'Ing. Carlos Perez',
      }),
    );
    expect(res.some((e) => e.property === 'estado')).toBe(true);
  });
});
