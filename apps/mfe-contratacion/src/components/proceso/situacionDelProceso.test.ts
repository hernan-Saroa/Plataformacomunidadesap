import { describe, expect, it } from 'vitest';

import { RespondeElAsignado, ResponsableDeLugar } from '../../types';
import {
  destinoDeLaSituacion,
  PasoConDatos,
  pasosDelCatalogo,
  rolesQuePueden,
  situacionDelProceso,
  situacionTrasAprobar,
} from './situacionDelProceso';

/**
 * Lo que manda el backend en `responde` (109): la regla «quién la hace» de la
 * actividad, resuelta para el proceso. Aquí, el puesto Abogado sin ocupante;
 * las pruebas que necesitan a alguien lo ponen.
 */
const DEL_ABOGADO = (
  persona: RespondeElAsignado['persona'] = null,
  soloEnRevision = false,
): RespondeElAsignado => ({ puesto: 'Abogado', persona, accion: 'aprobar', seToma: false, soloEnRevision });
const RESPONDE: Record<string, RespondeElAsignado> = {
  '3.5': DEL_ABOGADO(null, true),
  '3.6': DEL_ABOGADO(),
  '3.7': DEL_ABOGADO(),
};

const paso = (numeral: string, cambios: Partial<PasoConDatos> = {}): PasoConDatos => ({
  numeral,
  responde: RESPONDE[numeral] ?? null,
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

  it('recibido con un puesto obligatorio vacío, le toca asignarlo a quien lo recibió', () => {
    const s = situacionDelProceso({
      pasos: flujo({ '3.1': 'EN_REVISION', '3.3': 'APROBADO' }),
      participacion: { contratacion: { nombre: 'Ana Gestora', esMio: false }, puestosVacios: ['Abogado'] },
    });

    expect(s).toMatchObject({
      momento: 'asignacion',
      titulo: 'Asignar los puestos del proceso',
      quien: 'Ana Gestora',
      espera: 'Falta asignar: Abogado',
    });
  });

  it('sin puestos vacíos, la revisión es de quienes ocupan los puestos y no del formulario', () => {
    const s = situacionDelProceso({
      pasos: flujo({ '3.1': 'EN_REVISION', '3.3': 'APROBADO' }),
      participacion: {
        contratacion: { nombre: 'Ana Gestora' },
        puestos: [{ puesto: 'Abogado', nombre: 'Luis Abogado', esMio: true }],
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

  it('si la regla dice que lo hace un puesto, lo hace quien lo ocupa aunque el Gestor pueda editarlo', () => {
    const entrada = (esMio: boolean) => ({
      pasos: [
        paso('3.1', { estado: 'APROBADO' }),
        paso('3.3', { estado: 'APROBADO' }),
        paso('3.5', { estado: 'APROBADO' }),
        paso('3.7', { estado: 'BORRADOR', responde: DEL_ABOGADO({ nombre: 'Diana Abogada', esMio }) }),
      ],
      responsables: [...responsables, { rol: 'Gestor de contratación', accion: 'editar' as const, lugar: '3.7' }],
      // El permiso lo tienen los dos: no por eso le toca al Gestor.
      puedo: () => true,
    });

    expect(situacionDelProceso(entrada(true))).toMatchObject({
      numeral: '3.7',
      quien: 'Diana Abogada (Abogado)',
      teToca: true,
    });
    expect(situacionDelProceso(entrada(false))).toMatchObject({
      quien: 'Diana Abogada (Abogado)',
      teToca: false,
    });
  });

  it('ocupar el puesto sin el permiso no basta: manda el permiso', () => {
    const s = situacionDelProceso({
      pasos: [
        paso('3.1', { estado: 'APROBADO' }),
        paso('3.3', { estado: 'APROBADO' }),
        paso('3.7', { estado: 'BORRADOR', responde: DEL_ABOGADO({ nombre: 'Diana Abogada', esMio: true }) }),
      ],
      responsables,
      puedo: () => false,
    });

    expect(s).toMatchObject({ teToca: false });
  });

  it('la modalidad la diligencia el Gestor y, en revisión, la decide quien ocupa el puesto', () => {
    const conEstado = (estado: string) => {
      const pasos = flujo({ '3.1': 'APROBADO', '3.3': 'APROBADO', '3.5': estado });
      pasos[3] = { ...pasos[3], responde: DEL_ABOGADO({ nombre: 'Diana Abogada', esMio: false }, true) };
      return situacionDelProceso({ pasos, responsables });
    };

    expect(conEstado('BORRADOR').quien).toBe('Gestor de contratación');
    expect(conEstado('EN_REVISION').quien).toBe('Diana Abogada (Abogado)');
  });

  it('con el puesto vacío no le toca a nadie, y dice que falta asignarlo', () => {
    const s = situacionDelProceso({
      pasos: [
        paso('3.1', { estado: 'APROBADO' }),
        paso('3.3', { estado: 'APROBADO' }),
        paso('3.7', { estado: 'BORRADOR' }),
      ],
      responsables: [
        { rol: 'Gestor de contratación', accion: 'editar', lugar: '3.7' },
        { rol: 'Revisor', accion: 'aprobar', lugar: 'E3' },
        { rol: 'Director', accion: 'aprobar', lugar: 'E3' },
      ],
      puedo: () => true,
    });

    // El puesto se asigna en la 3.3: tener el alcance no basta.
    expect(s).toMatchObject({ quien: 'Abogado, sin asignar', teToca: false });
  });

  it('la solicitud de CDP sin tomar le toca a quien puede tomarla', () => {
    const s = situacionDelProceso({
      pasos: flujo({ '3.1': 'APROBADO', '3.3': 'APROBADO', '3.5': 'APROBADO', '4.1': 'APROBADO' }),
      responsables,
      puedo: (accion, lugar) => accion === 'editar' && lugar === '4.2',
    });

    expect(s).toMatchObject({ numeral: '4.2', quien: 'Dirección Financiera', teToca: true });
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
      participacion: { contratacion: { nombre: 'Ana Gestora' }, puestos: [{ puesto: 'Abogado', nombre: 'Luis' }] },
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

/**
 * El Plan Anual de Adquisiciones (migración 097) puede detener o cancelar el
 * proceso. El riel sigue con una actividad abierta, pero no le toca a nadie
 * trabajarla: el servidor la rechazaría.
 */
describe('situacionDelProceso · el PAA', () => {
  it('un proceso cancelado no le toca a nadie', () => {
    const s = situacionDelProceso({
      pasos: flujo({ '3.1': 'BORRADOR' }),
      radicadoPorMi: true,
      estadoProceso: 'CANCELADO',
      puedo: () => true,
    });
    expect(s).toMatchObject({ momento: 'cancelado', teToca: false });
    expect(destinoDeLaSituacion(s)).toBe('El proceso termina');
  });

  it('detenido, le toca a quien puede decidir las revisiones del PAA', () => {
    const entrada = {
      pasos: flujo({ '3.1': 'BORRADOR' }),
      radicadoPorMi: true,
      detenidoPorPaa: true,
    };
    expect(
      situacionDelProceso({ ...entrada, puedo: (accion, lugar) => accion === 'decidir' && lugar === 'PAA.R' }),
    ).toMatchObject({ momento: 'detenido', teToca: true });
    expect(situacionDelProceso({ ...entrada, puedo: () => false })).toMatchObject({
      momento: 'detenido',
      teToca: false,
    });
  });
});
