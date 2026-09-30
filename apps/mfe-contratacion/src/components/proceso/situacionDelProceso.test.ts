import { describe, expect, it } from 'vitest';

import { ResponsableDeLugar } from '../../types';
import {
  destinoDeLaSituacion,
  PasoConDatos,
  pasosDelCatalogo,
  rolesQuePueden,
  situacionDelProceso,
  situacionTrasAprobar,
} from './situacionDelProceso';

const paso = (numeral: string, cambios: Partial<PasoConDatos> = {}): PasoConDatos => ({
  numeral,
  nombre: `Actividad ${numeral}`,
  etapa: Number.parseInt(numeral, 10),
  estado: null,
  aplica: true,
  construida: true,
  ...cambios,
});

/** Un tramo de la matriz: la etapa 3 y el arranque de la 4. */
const flujo = (estados: Record<string, string | null>) =>
  ['3.1', '3.3', '3.4', '3.5', '4.1', '4.2'].map((n) => paso(n, { estado: estados[n] ?? null }));

const responsables: ResponsableDeLugar[] = [
  { rol: 'Gestor de contratación', accion: 'editar', lugar: 'E3' },
  { rol: 'Gestor de contratación', accion: 'editar', lugar: '4.1' },
  { rol: 'Dirección Financiera', accion: 'editar', lugar: '4.2' },
  { rol: 'Revisor', accion: 'aprobar', lugar: 'E4' },
  { rol: 'Administrador', accion: 'editar', lugar: 'TODO' },
];

describe('situación del proceso · el estudio previo', () => {
  it('en borrador le toca al área que lo radicó', () => {
    const s = situacionDelProceso({ pasos: flujo({ '3.1': 'BORRADOR' }), radicadoPorMi: true });

    expect(s).toMatchObject({
      momento: 'redaccion',
      numeral: '3.1',
      quien: 'Área solicitante',
      teToca: true,
    });
  });

  it('enviado y sin recibir, está en la bandeja de la Dirección', () => {
    const s = situacionDelProceso({
      pasos: flujo({ '3.1': 'EN_REVISION' }),
      responsables,
      puedo: (accion, lugar) => accion === 'editar' && lugar === '3.3',
    });

    expect(s).toMatchObject({
      momento: 'asignacion',
      numeral: '3.3',
      quien: 'Gestor de contratación',
      teToca: true,
    });
    expect(s.espera).toMatch(/nadie lo ha recibido/);
  });

  it('recibido y sin abogado, le toca asignarlo a quien lo recibió', () => {
    const s = situacionDelProceso({
      pasos: flujo({ '3.1': 'EN_REVISION', '3.3': 'APROBADO' }),
      participacion: { contratacion: { nombre: 'Ana Gestora', esMio: false } },
    });

    expect(s).toMatchObject({ momento: 'asignacion', titulo: 'Asignar abogado', quien: 'Ana Gestora' });
  });

  it('con abogado, la revisión es suya y no del formulario', () => {
    const s = situacionDelProceso({
      pasos: flujo({ '3.1': 'EN_REVISION', '3.3': 'APROBADO' }),
      participacion: {
        contratacion: { nombre: 'Ana Gestora' },
        abogado: { nombre: 'Luis Abogado', esMio: true },
      },
    });

    expect(s).toMatchObject({
      momento: 'revision',
      titulo: 'Revisión del estudio previo',
      quien: 'Luis Abogado',
      teToca: true,
    });
  });

  it('negado, el proceso terminó y no le toca a nadie', () => {
    const s = situacionDelProceso({ pasos: flujo({ '3.1': 'NEGADO' }) });

    expect(s).toMatchObject({ momento: 'negado', quien: null, teToca: false });
  });
});

describe('situación del proceso · lo que sigue', () => {
  it('aprobado el estudio, sigue la primera pendiente y la 3.4 no cuenta', () => {
    const s = situacionDelProceso({
      pasos: flujo({ '3.1': 'APROBADO', '3.3': 'APROBADO' }),
      responsables,
    });

    // La 3.4 queda sin estado en la base porque vive dentro de la 3.1; si
    // contara, todo proceso aprobado diría que le falta la revisión.
    expect(s).toMatchObject({ momento: 'tramite', numeral: '3.5', quien: 'Gestor de contratación' });
  });

  it('la Financiera que tomó el CDP es quien responde, no el rol', () => {
    const s = situacionDelProceso({
      pasos: flujo({ '3.1': 'APROBADO', '3.3': 'APROBADO', '3.5': 'APROBADO', '4.1': 'APROBADO' }),
      responsables,
      participacion: { financiera: { nombre: 'Marta Presupuesto', esMio: false } },
    });

    expect(s).toMatchObject({ numeral: '4.2', quien: 'Marta Presupuesto', teToca: false });
  });

  it('sin persona a cargo, nombra a los roles que pueden actuar', () => {
    const s = situacionDelProceso({
      pasos: flujo({ '3.1': 'APROBADO', '3.3': 'APROBADO', '3.5': 'APROBADO', '4.1': 'APROBADO' }),
      responsables,
    });

    expect(s.quien).toBe('Dirección Financiera');
  });

  it('el cargo configurado manda sobre los roles', () => {
    const pasos = flujo({ '3.1': 'APROBADO', '3.3': 'APROBADO' });
    pasos[3] = { ...pasos[3], responsableCargo: 'Jefe de la Oficina Jurídica' };

    expect(situacionDelProceso({ pasos, responsables }).quien).toBe('Jefe de la Oficina Jurídica');
  });

  it('enviada a aprobación, espera a quien aprueba', () => {
    const s = situacionDelProceso({
      pasos: flujo({ '3.1': 'APROBADO', '3.3': 'APROBADO', '3.5': 'APROBADO', '4.1': 'EN_REVISION' }),
      responsables,
    });

    expect(s).toMatchObject({ momento: 'revision', numeral: '4.1', quien: 'Revisor' });
  });

  it('lo devuelto manda sobre lo que viene después', () => {
    const s = situacionDelProceso({
      pasos: flujo({ '3.1': 'DEVUELTO', '3.3': 'APROBADO', '3.5': 'APROBADO' }),
      radicadoPorMi: true,
    });

    expect(s).toMatchObject({ momento: 'redaccion', numeral: '3.1', teToca: true });
    expect(s.titulo).toMatch(/^Corregir/);
  });

  it('sin el alcance cargado no le dice «te toca» a nadie', () => {
    const s = situacionDelProceso({
      pasos: flujo({ '3.1': 'APROBADO', '3.3': 'APROBADO' }),
      responsables,
    });

    expect(s.teToca).toBe(false);
  });

  it('con todo aprobado, el proceso terminó', () => {
    const s = situacionDelProceso({
      pasos: flujo({
        '3.1': 'APROBADO',
        '3.3': 'APROBADO',
        '3.5': 'APROBADO',
        '4.1': 'APROBADO',
        '4.2': 'APROBADO',
      }),
    });

    expect(s.momento).toBe('terminado');
  });

  it('con solo el seguimiento abierto, el contrato está en ejecución', () => {
    const pasos = [
      paso('3.1', { estado: 'APROBADO' }),
      paso('9.1', { estado: 'APROBADO' }),
      paso('9.2', { estado: 'BORRADOR' }),
    ];

    expect(situacionDelProceso({ pasos }).momento).toBe('ejecucion');
  });

  it('el último movimiento es la fecha más reciente del flujo', () => {
    const pasos = flujo({ '3.1': 'APROBADO' });
    pasos[0] = { ...pasos[0], actualizadoEn: '2026-09-01T10:00:00Z' };
    pasos[1] = { ...pasos[1], actualizadoEn: '2026-09-20T10:00:00Z' };

    expect(situacionDelProceso({ pasos }).ultimoMovimiento).toBe('2026-09-20T10:00:00Z');
  });
});

describe('rolesQuePueden', () => {
  it('prefiere el alcance del punto al de la etapa y al de todo el módulo', () => {
    expect(rolesQuePueden(responsables, 'editar', '4.2')).toEqual(['Dirección Financiera']);
    expect(rolesQuePueden(responsables, 'editar', '3.5')).toEqual(['Gestor de contratación']);
    expect(rolesQuePueden(responsables, 'editar', '7.1')).toEqual(['Administrador']);
  });
});

describe('a dónde pasa al aprobar', () => {
  it('aprobar el estudio previo lo lleva a lo que sigue, con su responsable', () => {
    const entrada = {
      pasos: flujo({ '3.1': 'EN_REVISION', '3.3': 'APROBADO' }),
      participacion: { contratacion: { nombre: 'Ana Gestora' }, abogado: { nombre: 'Luis' } },
      responsables,
    };

    const despues = situacionTrasAprobar(entrada, '3.1');

    expect(despues).toMatchObject({ numeral: '3.5', quien: 'Gestor de contratación' });
    expect(destinoDeLaSituacion(despues)).toBe('Actividad 3.5 · Gestor de contratación');
  });

  it('aprobar lo último deja el proceso sin pendientes', () => {
    const pasos = [paso('3.1', { estado: 'APROBADO' }), paso('4.1', { estado: 'EN_REVISION' })];

    expect(destinoDeLaSituacion(situacionTrasAprobar({ pasos }, '4.1'))).toBe(
      'El proceso queda sin pasos pendientes',
    );
  });

  it('arma los pasos del catálogo con el estado del estudio previo', () => {
    const pasos = pasosDelCatalogo(
      [
        { numeral: '3.1', nombre: 'Estudio', etapa: 3, estado: 'BORRADOR' },
        { numeral: '5.9', nombre: 'Manifestación', etapa: 5, aplica: false, estado: 'NO_APLICA' },
      ],
      'EN_REVISION',
      (n) => n !== '5.9',
    );

    expect(pasos[0]).toMatchObject({ estado: 'EN_REVISION', construida: true });
    expect(pasos[1]).toMatchObject({ aplica: false, construida: false });
  });
});
