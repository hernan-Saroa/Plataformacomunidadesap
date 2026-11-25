import {
  abrirRonda,
  CAUSAL_PSPAG,
  claseDelContrato,
  esResponsable,
  etapa10Abierta,
  faltanDeLaEtapa9,
  motivoParaNoDecidir,
  PasoDeLaEtapa9,
  radicadoDe,
  requisitosPara,
  requisitosQueFaltan,
  trasDecidir,
  validarCadena,
} from './reglas';
import { actividadesDisponibles, PasoDelFlujo, porEmpezar } from '../notificaciones/secuencia';
import type { EscalonLiquidacion } from '../../entities/tramite-liquidacion.entity';

describe('claseDelContrato', () => {
  it('PSPAG con persona natural va por el cierre', () => {
    expect(claseDelContrato(CAUSAL_PSPAG, 'NATURAL')).toBe('CIERRE');
  });

  it('la misma causal con persona jurídica se liquida', () => {
    expect(claseDelContrato(CAUSAL_PSPAG, 'JURIDICA')).toBe('LIQUIDACION');
  });

  it('cualquier otra causal o modalidad se liquida', () => {
    expect(claseDelContrato('DIRECTA_INTERADMINISTRATIVO', 'NATURAL')).toBe('LIQUIDACION');
    expect(claseDelContrato(null, 'NATURAL')).toBe('LIQUIDACION');
  });
});

describe('faltanDeLaEtapa9', () => {
  const paso = (numeral: string, estado: string | null, aplica = true): PasoDeLaEtapa9 => ({
    numeral,
    nombre: `Actividad ${numeral}`,
    estado,
    aplica,
  });
  const etapa = (estados: Record<string, string | null>) =>
    ['9.1', '9.2', '9.3', '9.4', '9.5'].map((n) => paso(n, estados[n] ?? null));

  it('la 9.2 y la 9.3 abiertas no impiden radicar', () => {
    expect(faltanDeLaEtapa9(etapa({ '9.1': 'APROBADO', '9.4': 'APROBADO' }), false)).toEqual([]);
  });

  it('pide la reunión de inicio y los pagos terminados', () => {
    expect(faltanDeLaEtapa9(etapa({ '9.1': 'BORRADOR' }), false)).toEqual(['9.1 Actividad 9.1', '9.4 Actividad 9.4']);
  });

  it('la 9.5 cuenta por las modificaciones en curso, no por su estado', () => {
    const base = etapa({ '9.1': 'APROBADO', '9.4': 'APROBADO' });
    expect(faltanDeLaEtapa9(base, false)).toEqual([]);
    expect(faltanDeLaEtapa9(base, true)).toEqual(['9.5 Actividad 9.5 (hay una modificación en curso)']);
  });

  it('lo que no aplica no se pide', () => {
    const pasos = [paso('9.1', null, false), paso('9.4', 'APROBADO')];
    expect(faltanDeLaEtapa9(pasos, false)).toEqual([]);
  });
});

describe('etapa10Abierta', () => {
  it('se abre al radicar', () => {
    expect(etapa10Abierta({ tramiteVivo: false, etapa10Empezada: false, estadoContrato: 'EJECUCION' })).toBe(false);
    expect(etapa10Abierta({ tramiteVivo: true, etapa10Empezada: false, estadoContrato: 'EJECUCION' })).toBe(true);
  });

  it('los procesos que ya iban por la etapa 10 siguen abiertos', () => {
    expect(etapa10Abierta({ tramiteVivo: false, etapa10Empezada: true, estadoContrato: 'EJECUCION' })).toBe(true);
    expect(etapa10Abierta({ tramiteVivo: false, etapa10Empezada: false, estadoContrato: 'LIQUIDADO' })).toBe(true);
    expect(etapa10Abierta({ tramiteVivo: false, etapa10Empezada: false, estadoContrato: 'CERRADO' })).toBe(true);
  });
});

describe('la etapa 10 en la secuencia', () => {
  const flujo: PasoDelFlujo[] = [
    { numeral: '9.4', estado: 'APROBADO', aplica: true, construida: true },
    { numeral: '9.5', estado: null, aplica: true, construida: true },
    { numeral: '10.1', estado: null, aplica: true, construida: true },
  ];

  it('sin trámite la 10.1 no se habilita ni se avisa', () => {
    expect(actividadesDisponibles(flujo, { etapa10Abierta: false }).has('10.1')).toBe(false);
    expect(porEmpezar(flujo, { etapa10Abierta: false })).not.toContain('10.1');
  });

  it('con el trámite radicado, sí', () => {
    expect(actividadesDisponibles(flujo, { etapa10Abierta: true }).has('10.1')).toBe(true);
    expect(porEmpezar(flujo, { etapa10Abierta: true })).toContain('10.1');
  });

  it('sin decir nada se comporta como antes', () => {
    expect(actividadesDisponibles(flujo).has('10.1')).toBe(true);
  });
});

describe('documentos', () => {
  const req = (id: string, tramiteLiquidacion: 'LIQUIDACION' | 'CIERRE' | null, obligatorio = true) => ({
    id,
    nombre: id,
    obligatorio,
    informativo: false,
    activo: true,
    tramiteLiquidacion,
  });

  it('cada clase recibe los suyos y los de las dos', () => {
    const todos = [req('acta', 'LIQUIDACION'), req('memo', 'CIERRE'), req('comun', null)];
    expect(requisitosPara(todos, 'LIQUIDACION').map((r) => r.id)).toEqual(['acta', 'comun']);
    expect(requisitosPara(todos, 'CIERRE').map((r) => r.id)).toEqual(['memo', 'comun']);
  });

  it('dice qué obligatorios faltan', () => {
    expect(requisitosQueFaltan([req('acta', null), req('opcional', null, false)], [])).toEqual(['acta']);
  });
});

describe('cadenas', () => {
  const cadena: EscalonLiquidacion[] = [
    { nombre: 'Abogado', papel: 'ABOGADO', roles: [], acciones: ['APROBAR', 'DEVOLVER'] },
    { nombre: 'Líder', papel: 'LIDER', roles: [], acciones: ['APROBAR', 'DEVOLVER'] },
  ];
  const tramite = { abogadoId: 'abogado', liderId: 'lider' };
  const quien = (usuarioId: string) => ({ nombre: usuarioId, usuarioId });

  it('valida que cada escalón tenga quién decida y pueda aprobar', () => {
    const { problemas } = validarCadena([{ nombre: '', papel: null, roles: [], acciones: ['DEVOLVER'] }]);
    expect(problemas).toHaveLength(3);
  });

  it('el escalón de la líder lo decide quien asignó', () => {
    expect(esResponsable(cadena[1], { usuarioId: 'lider', roles: [] }, tramite)).toBe(true);
    expect(esResponsable(cadena[1], { usuarioId: 'abogado', roles: [] }, tramite)).toBe(false);
    const ronda = abrirRonda(cadena);
    expect(motivoParaNoDecidir(ronda[0], 'APROBAR', { usuarioId: 'lider', roles: [] }, tramite)).toMatch(/abogado asignado/);
  });

  it('la revisión aprobada pasa al acta; el visto bueno aprobado, a la firma', () => {
    let ronda = abrirRonda(cadena);
    const uno = trasDecidir('REVISION', ronda, 'APROBAR', quien('abogado'), 'ahora');
    expect(uno).toMatchObject({ ronda: 'EN_CURSO', escalonActual: 2, tramite: 'EN_REVISION' });
    expect(trasDecidir('REVISION', uno.escalones, 'APROBAR', quien('lider'), 'ahora')).toMatchObject({
      ronda: 'APROBADA',
      tramite: 'ACTA',
    });
    ronda = abrirRonda(cadena);
    const vb = trasDecidir('VISTO_BUENO', trasDecidir('VISTO_BUENO', ronda, 'APROBAR', quien('lider'), 'a').escalones, 'APROBAR', quien('jefe'), 'a');
    expect(vb.tramite).toBe('EN_FIRMA');
  });

  it('devolver en la revisión va al área; en el visto bueno, al abogado', () => {
    const ronda = abrirRonda(cadena);
    const enRevision = trasDecidir('REVISION', ronda, 'DEVOLVER', quien('abogado'), 'a');
    expect(enRevision).toMatchObject({ ronda: 'DEVUELTA', tramite: 'DEVUELTA' });
    expect(enRevision.escalones[1].estado).toBe('ANULADO');
    expect(trasDecidir('VISTO_BUENO', ronda, 'DEVOLVER', quien('lider'), 'a').tramite).toBe('ACTA');
  });
});

describe('radicadoDe', () => {
  it('distingue la clase en el prefijo', () => {
    expect(radicadoDe('LIQUIDACION', 2026, 7)).toBe('LIQ-2026-0007');
    expect(radicadoDe('CIERRE', 2026, 12)).toBe('CIE-2026-0012');
  });
});
