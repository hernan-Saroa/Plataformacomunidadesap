import type { EscalonModificacion } from '../../entities/tramite-modificacion.entity';
import {
  abrirRonda,
  esResponsable,
  motivoParaNoDecidir,
  porQueNoAdmiteEfecto,
  porQueNoSeCombinan,
  radicadoDe,
  requisitosPara,
  requisitosQueFaltan,
  trasDecidir,
  validarCadena,
} from './reglas';

const tipo = (codigo: string, efecto: any, vaSola = false) => ({ codigo, nombre: codigo, efecto, vaSola });

describe('porQueNoSeCombinan', () => {
  it('deja juntar adición y prórroga en una sola minuta', () => {
    expect(porQueNoSeCombinan([tipo('ADICION', 'ADICION'), tipo('PRORROGA', 'PRORROGA')])).toBeNull();
  });

  it('no combina lo que va solo', () => {
    expect(porQueNoSeCombinan([tipo('SUSPENSION', 'SUSPENSION', true), tipo('PRORROGA', 'PRORROGA')])).toMatch(/va sola/);
  });

  it('un tipo que va solo, solo, sí se puede', () => {
    expect(porQueNoSeCombinan([tipo('SUSPENSION', 'SUSPENSION', true)])).toBeNull();
  });

  it('no deja dos tipos que cambian lo mismo', () => {
    expect(porQueNoSeCombinan([tipo('ADICION', 'ADICION'), tipo('ADICION_2', 'ADICION')])).toMatch(/cambian lo mismo/);
  });

  it('dos tipos libres sí conviven', () => {
    expect(porQueNoSeCombinan([tipo('OTRO', 'OTRO'), tipo('OBLIGACIONES', 'OTRO')])).toBeNull();
  });

  it('pide al menos uno', () => {
    expect(porQueNoSeCombinan([])).toMatch(/al menos un tipo/);
  });
});

describe('porQueNoAdmiteEfecto', () => {
  it('solo desde la ejecución: firmado o legalizado todavía no', () => {
    expect(porQueNoAdmiteEfecto({ estado: 'PERFECCIONADO', suspendido: false }, 'PRORROGA')).toMatch(/en ejecución/);
    expect(porQueNoAdmiteEfecto({ estado: 'LEGALIZADO', suspendido: false }, 'ADICION')).toMatch(/en ejecución/);
    expect(porQueNoAdmiteEfecto({ estado: 'EJECUCION', suspendido: false }, 'ADICION')).toBeNull();
  });

  it('del suspendido solo se sale reanudando o terminando', () => {
    expect(porQueNoAdmiteEfecto({ estado: 'SUSPENDIDO', suspendido: true }, 'REANUDACION')).toBeNull();
    expect(porQueNoAdmiteEfecto({ estado: 'SUSPENDIDO', suspendido: true }, 'ADICION')).toMatch(/reanudarlo/);
  });

  it('terminado o liquidado ya no se modifica', () => {
    expect(porQueNoAdmiteEfecto({ estado: 'TERMINADO', suspendido: false }, 'ACLARATORIO')).not.toBeNull();
    expect(porQueNoAdmiteEfecto({ estado: 'LIQUIDADO', suspendido: false }, 'OTRO')).not.toBeNull();
  });
});

describe('requisitos', () => {
  const requisitos = [
    { id: 'a', nombre: 'Solicitud', obligatorio: true, informativo: false, activo: true, tiposModificacion: [] },
    { id: 'b', nombre: 'CDP', obligatorio: true, informativo: false, activo: true, tiposModificacion: ['ADICION'] },
    { id: 'c', nombre: 'Guía', obligatorio: false, informativo: true, activo: true, tiposModificacion: [] },
    { id: 'd', nombre: 'Retirado', obligatorio: true, informativo: false, activo: false, tiposModificacion: [] },
    { id: 'e', nombre: 'Opcional', obligatorio: false, informativo: false, activo: true, tiposModificacion: ['PRORROGA'] },
  ];

  it('pide los generales y los de cada tipo elegido', () => {
    expect(requisitosPara(requisitos, ['ADICION']).map((r) => r.id)).toEqual(['a', 'b']);
    expect(requisitosPara(requisitos, ['ADICION', 'PRORROGA']).map((r) => r.id)).toEqual(['a', 'b', 'e']);
  });

  it('solo los obligatorios faltan', () => {
    const pedidos = requisitosPara(requisitos, ['ADICION', 'PRORROGA']);
    expect(requisitosQueFaltan(pedidos, ['a'])).toEqual(['CDP']);
    expect(requisitosQueFaltan(pedidos, ['a', 'b'])).toEqual([]);
  });
});

describe('cadenas', () => {
  const revision: EscalonModificacion[] = [
    { nombre: 'Abogado', papel: 'ABOGADO', roles: [], acciones: ['APROBAR', 'DEVOLVER', 'NEGAR'] },
    { nombre: 'Revisor', papel: 'REVISOR', roles: [], acciones: ['APROBAR', 'DEVOLVER'] },
  ];
  const asignados = { abogadoId: 'abo', revisorId: 'rev' };
  const quien = { nombre: 'X', usuarioId: 'abo' };

  it('valida que cada escalón tenga quién decida y pueda aprobar', () => {
    expect(validarCadena([{ nombre: 'Jefe', papel: null, roles: [], acciones: ['DEVOLVER'] }]).problemas).toHaveLength(2);
    expect(validarCadena(revision).problemas).toEqual([]);
    expect(validarCadena([]).problemas).toHaveLength(1);
  });

  it('el escalón de papel lo decide la persona asignada; el de rol, quien tenga el rol', () => {
    expect(esResponsable(revision[0], { usuarioId: 'abo', roles: [] }, asignados)).toBe(true);
    expect(esResponsable(revision[0], { usuarioId: 'rev', roles: [] }, asignados)).toBe(false);
    const jefe: EscalonModificacion = { nombre: 'Jefe', papel: null, roles: ['DIRECTORA'], acciones: ['APROBAR'] };
    expect(esResponsable(jefe, { usuarioId: 'z', roles: ['DIRECTORA'] }, asignados)).toBe(true);
  });

  it('no deja negar donde el escalón no puede', () => {
    const ronda = abrirRonda(revision);
    const segundo = { ...ronda[1], estado: 'PENDIENTE' as const };
    expect(motivoParaNoDecidir(segundo, 'NEGAR', { usuarioId: 'rev', roles: [] }, asignados)).toMatch(/no puede negar/);
    expect(motivoParaNoDecidir(ronda[0], 'APROBAR', { usuarioId: 'rev', roles: [] }, asignados)).toMatch(/abogado asignado/);
  });

  it('aprobar pasa al siguiente y, en el último, la revisión va a la minuta', () => {
    let ronda = abrirRonda(revision);
    const uno = trasDecidir('REVISION', ronda, 'APROBAR', quien, 't');
    expect(uno).toMatchObject({ ronda: 'EN_CURSO', escalonActual: 2, tramite: 'EN_REVISION' });
    ronda = uno.escalones;
    const dos = trasDecidir('REVISION', ronda, 'APROBAR', { nombre: 'R', usuarioId: 'rev' }, 't');
    expect(dos).toMatchObject({ ronda: 'APROBADA', escalonActual: null, tramite: 'MINUTA' });
  });

  it('el visto bueno aprobado pasa a la firma', () => {
    const ronda = abrirRonda([revision[1]]);
    expect(trasDecidir('VISTO_BUENO', ronda, 'APROBAR', quien, 't').tramite).toBe('EN_FIRMA');
  });

  it('la devolución va a quien envió: en revisión al área, en visto bueno al abogado', () => {
    const ronda = abrirRonda(revision);
    const enRevision = trasDecidir('REVISION', ronda, 'DEVOLVER', quien, 't');
    expect(enRevision).toMatchObject({ ronda: 'DEVUELTA', tramite: 'DEVUELTA' });
    expect(enRevision.escalones[1].estado).toBe('ANULADO');
    expect(trasDecidir('VISTO_BUENO', ronda, 'DEVOLVER', quien, 't').tramite).toBe('MINUTA');
  });

  it('negar cierra el trámite', () => {
    expect(trasDecidir('REVISION', abrirRonda(revision), 'NEGAR', quien, 't')).toMatchObject({
      ronda: 'NEGADA',
      tramite: 'NEGADA',
    });
  });
});

it('el radicado lleva el año y cuatro cifras', () => {
  expect(radicadoDe(2026, 7)).toBe('MOD-2026-0007');
});
