import { asignacionQueRige, FilaAsignacion } from '../../flujo/lectura';
import { DatosDeValidacion, modoDeAsignacion, usosDePuestos, validarModalidad } from './flujo';

/**
 * Las versiones del flujo (migración 111): qué rige en cada modalidad y qué
 * impide activar una versión.
 */
describe('qué rige en una actividad', () => {
  const filas: FilaAsignacion[] = [
    { numeral: '3.6', modalidad: null, laHace: { tipo: 'PUESTO', puestoId: 'p-caso' }, aprobacion: { tipo: 'NINGUNA' } },
    { numeral: '3.6', modalidad: 'MINIMA_CUANTIA', laHace: { tipo: 'PERMISO' }, aprobacion: null },
  ];

  it('sin fila de la modalidad, la general', () => {
    const r = asignacionQueRige(filas, '3.6', 'LICITACION_PUBLICA');
    expect(r.laHace).toEqual({ tipo: 'PUESTO', puestoId: 'p-caso' });
    expect(r.propiaDeLaModalidad).toEqual({ laHace: false, aprobacion: false });
  });

  it('la de la modalidad reemplaza columna por columna; NULL hereda', () => {
    const r = asignacionQueRige(filas, '3.6', 'MINIMA_CUANTIA');
    expect(r.laHace).toEqual({ tipo: 'PERMISO' });
    expect(r.aprobacion).toEqual({ tipo: 'NINGUNA' });
    expect(r.propiaDeLaModalidad).toEqual({ laHace: true, aprobacion: false });
  });

  it('sin ninguna fila, por permiso y sin aprobación', () => {
    expect(asignacionQueRige([], '5.1', null)).toMatchObject({ laHace: { tipo: 'PERMISO' }, aprobacion: { tipo: 'NINGUNA' } });
  });

  it('cómo se asigna, para el diagrama', () => {
    expect(modoDeAsignacion({ tipo: 'PERMISO' })).toBe('ROL');
    expect(modoDeAsignacion({ tipo: 'PERSONAS', personas: ['x'] })).toBe('PERSONA');
    expect(modoDeAsignacion({ tipo: 'PUESTO', puestoId: 'p' })).toBe('AL_EJECUTAR');
  });
});

describe('validar el flujo antes de activarlo', () => {
  const datos = (cambios: Partial<DatosDeValidacion> = {}): DatosDeValidacion => ({
    actividades: [
      { numeral: '3.1', nombre: 'Estudio previo', etapa: 3 },
      { numeral: '3.6', nombre: 'Causal', etapa: 3 },
    ],
    filas: [],
    modalidad: null,
    pueden: () => new Set(['u-1']),
    conRol: (rol) => new Set(rol === 'DIRECTOR' ? ['u-1'] : []),
    cuentaDe: (p) => (p === 'persona-1' ? 'u-1' : null),
    puestos: new Map([['p-revisor', 'Abogado revisor']]),
    cadenas: new Map(),
    ...cambios,
  });

  it('con permisos para todo, no hay nada que corregir', () => {
    expect(validarModalidad(datos())).toEqual([]);
  });

  it('por rol, sin nadie con el permiso, no se puede activar', () => {
    const problemas = validarModalidad(datos({ pueden: () => new Set() }));
    expect(problemas.map((p) => [p.numeral, p.parte, p.gravedad])).toEqual([
      ['3.1', 'HACE', 'ERROR'],
      ['3.6', 'HACE', 'ERROR'],
    ]);
    expect(problemas[0].mensaje).toMatch(/Permisos por etapa/);
  });

  it('una persona sin cuenta con permiso no sirve para hacerla', () => {
    const filas: FilaAsignacion[] = [{ numeral: '3.6', modalidad: null, laHace: { tipo: 'PERSONAS', personas: ['persona-9'] }, aprobacion: null }];
    expect(validarModalidad(datos({ filas }))[0]).toMatchObject({ numeral: '3.6', parte: 'HACE', gravedad: 'ERROR' });
  });

  it('elegirlo al ejecutar exige un puesto que exista y que alguien pueda ocupar', () => {
    const filas: FilaAsignacion[] = [{ numeral: '3.6', modalidad: null, laHace: { tipo: 'PUESTO', puestoId: 'p-borrado' }, aprobacion: null }];
    expect(validarModalidad(datos({ filas }))[0].mensaje).toMatch(/ya no existe/);

    const conPuesto: FilaAsignacion[] = [{ numeral: '3.6', modalidad: null, laHace: { tipo: 'PUESTO', puestoId: 'p-revisor' }, aprobacion: null }];
    expect(validarModalidad(datos({ filas: conPuesto, pueden: (accion) => (accion === 'aprobar' ? new Set() : new Set(['u-1'])) }))[0].mensaje).toMatch(
      /Nadie puede ocupar el puesto Abogado revisor/,
    );
  });

  it('cada escalón de la cadena tiene que tener quién lo decida', () => {
    const cadenas = new Map([
      [
        'c-1',
        {
          nombre: 'Revisión',
          activa: true,
          escalones: [
            { nombre: 'Abogado revisor', roles: [], personas: [], papeles: [], puestos: ['p-revisor'] },
            { nombre: 'Jefe', roles: ['ROL_SIN_NADIE'], personas: [], papeles: [] },
          ],
        },
      ],
    ]);
    const filas: FilaAsignacion[] = [{ numeral: '3.1', modalidad: null, laHace: null, aprobacion: { tipo: 'CADENA', cadenaId: 'c-1' } }];
    const problemas = validarModalidad(datos({ filas, cadenas }));
    expect(problemas).toHaveLength(1);
    expect(problemas[0]).toMatchObject({ numeral: '3.1', parte: 'APRUEBA', gravedad: 'ERROR' });
    expect(problemas[0].mensaje).toMatch(/escalón 2 \(Jefe\)/);
  });

  it('una cadena archivada no deja activar', () => {
    const cadenas = new Map([['c-1', { nombre: 'Vieja', activa: false, escalones: [] }]]);
    const filas: FilaAsignacion[] = [{ numeral: '3.1', modalidad: null, laHace: null, aprobacion: { tipo: 'CADENA', cadenaId: 'c-1' } }];
    expect(validarModalidad(datos({ filas, cadenas }))[0].mensaje).toMatch(/archivada/);
  });

  it('lo que hace un puesto suma los permisos de todo lo que hace y aprueba', () => {
    const filas: FilaAsignacion[] = [
      { numeral: '3.6', modalidad: null, laHace: { tipo: 'PUESTO', puestoId: 'p-caso' }, aprobacion: null },
      { numeral: '3.1', modalidad: null, laHace: null, aprobacion: { tipo: 'ESCALON', roles: [], personas: [], puestos: ['p-caso'] } },
    ];
    const usos = usosDePuestos(datos().actividades, filas, null, new Map());
    expect(usos.get('p-caso')).toEqual([
      { accion: 'aprobar', numeral: '3.1' },
      { accion: 'aprobar', numeral: '3.6' },
    ]);
  });
});
