import { BadRequestException, ConflictException } from '@nestjs/common';
import { RundCicloDocente } from './rund-ciclo-docente.workflow';
import { hoyColombia } from './rund-periodo-prueba';

const DOCENTE_ID = '8a7b9c10-1234-4abc-8def-0123456789ab';
const SOPORTE = { id: 'sop-comite', nombre_archivo: 'acta-comite.pdf' };
const actor = { actorId: 'ggp-1', ip: '10.0.0.1' };

interface Opts { docente?: Record<string, unknown>; soportes?: Array<{ id: string; nombre_archivo: string }>; abierta?: boolean; recat?: Record<string, unknown> }

function build(opts: Opts = {}) {
  const docente: any = {
    id: DOCENTE_ID, estado: 'ACTIVO', estadoAprobacion: 'ACTIVO_RUND', periodoCarga: '2026-2', eliminadoRund: false,
    escalafon: 'Asistente', puntajeSalarial: 100, decisionComiteIncorporacion: null, ...opts.docente,
  };
  const writes: Array<{ sql: string; params: any[] }> = [];
  const soportes = opts.soportes ?? [SOPORTE];
  const runner = {
    connect: jest.fn(), startTransaction: jest.fn(), commitTransaction: jest.fn(), rollbackTransaction: jest.fn(), release: jest.fn(),
    query: jest.fn().mockImplementation(async (sql: string, params: any[] = []) => {
      if (sql.includes('FROM academic_work_plan."Docente"') && sql.includes('FOR UPDATE')) return [docente];
      if (sql.includes('FROM academic_work_plan."RundSoporteCampo"')) return soportes.filter((s) => (params[0] as string[]).includes(s.id));
      if (sql.includes('FROM academic_work_plan."RundRecategorizacion"') && sql.includes('FOR UPDATE')) return opts.recat ? [{ id: 'rec-1', docente_id: DOCENTE_ID, ...opts.recat }] : [];
      if (sql.includes('estado IN (\'EN_REVISION\',\'EN_COMITE\')')) return opts.abierta ? [{ abierta: 1 }] : [];
      if (sql.includes('FROM academic_work_plan."RundRecategorizacion" WHERE id::text')) return [{ id: 'rec-1', estado: 'EN_REVISION', propuesta: {}, soporte_ids: [] }];
      writes.push({ sql, params });
      return [];
    }),
  };
  const db = { createQueryRunner: () => runner };
  return { flow: new RundCicloDocente(db as any), runner, writes, docente };
}

const writeOf = (writes: Array<{ sql: string; params: any[] }>, fragment: string) => writes.find((w) => w.sql.includes(fragment));
const favorable = { resultado: 'FAVORABLE', fechaComite: hoyColombia(), soporteId: SOPORTE.id, periodoCarga: '2026-2' };

describe('HU 2349 · RundCicloDocente.registrarDecisionIncorporacion (CA-01)', () => {
  it('Validado – Cumple + decisión favorable con soporte → Apto para incorporación / Activo y queda en el historial', async () => {
    const { flow, writes, runner } = build();
    const result: any = await flow.registrarDecisionIncorporacion(DOCENTE_ID, favorable, actor);

    expect(result.ciclo).toMatchObject({ etapa: 'ACTIVO', etapaEtiqueta: 'Apto para incorporación / Activo' });
    const update = writeOf(writes, 'UPDATE academic_work_plan."Docente"')!;
    expect(update.params[2]).toBe('ACTIVO');
    expect(JSON.parse(update.params[1])).toMatchObject({ resultado: 'FAVORABLE', soporteId: SOPORTE.id, soporteNombre: 'acta-comite.pdf', registradoPor: 'ggp-1', estadoAnterior: 'ACTIVO' });
    const audit = writeOf(writes, 'RundAprobacionLog')!;
    expect(audit.params).toEqual(expect.arrayContaining([DOCENTE_ID, 'DECISION_COMITE_INCORPORACION', 'ggp-1', SOPORTE.id, '10.0.0.1']));
    expect(JSON.parse(audit.params[audit.params.length - 1]).cambios.ETAPA_DOCENTE).toEqual({ anterior: 'Validado – Cumple', nuevo: 'Apto para incorporación / Activo' });
    expect(runner.commitTransaction).toHaveBeenCalledTimes(1);
  });

  it('sin soporte no toca la base de datos', async () => {
    const { flow, runner } = build();
    await expect(flow.registrarDecisionIncorporacion(DOCENTE_ID, { ...favorable, soporteId: '' }, actor)).rejects.toThrow('soporte de la decisión del comité');
    expect(runner.connect).not.toHaveBeenCalled();
  });

  it('un soporte ajeno o devuelto se rechaza y se revierte', async () => {
    const { flow, runner, writes } = build({ soportes: [] });
    await expect(flow.registrarDecisionIncorporacion(DOCENTE_ID, favorable, actor)).rejects.toThrow('no existe o no pertenece');
    expect(runner.rollbackTransaction).toHaveBeenCalled();
    expect(writes).toHaveLength(0);
  });

  it.each([
    ['sin validar (Cargado)', { estadoAprobacion: 'PENDIENTE_APROBACION' }, 'Validado – Cumple'],
    ['devuelto (No cumple)', { estadoAprobacion: 'DEVUELTO' }, 'Validado – Cumple'],
    ['inactivo', { estado: 'INACTIVO' }, 'reactívelo'],
  ])('no se registra si el docente está %s', async (_name, docente, mensaje) => {
    const { flow, writes } = build({ docente });
    await expect(flow.registrarDecisionIncorporacion(DOCENTE_ID, favorable, actor)).rejects.toThrow(mensaje);
    expect(writes).toHaveLength(0);
  });

  it('el reenvío idéntico no duplica el historial', async () => {
    const previa = { resultado: 'FAVORABLE', fechaComite: favorable.fechaComite, soporteId: SOPORTE.id, motivo: null, observacion: null };
    const { flow, writes } = build({ docente: { decisionComiteIncorporacion: previa } });
    const result: any = await flow.registrarDecisionIncorporacion(DOCENTE_ID, favorable, actor);
    expect(result.ciclo.etapa).toBe('ACTIVO');
    expect(writes).toHaveLength(0);
  });

  it('con decisión favorable vigente, una distinta se rechaza con 409', async () => {
    const previa = { resultado: 'FAVORABLE', fechaComite: '2026-01-01', soporteId: 'otro', motivo: null, observacion: null };
    const { flow } = build({ docente: { decisionComiteIncorporacion: previa } });
    await expect(flow.registrarDecisionIncorporacion(DOCENTE_ID, favorable, actor)).rejects.toBeInstanceOf(ConflictException);
  });

  it('la decisión no favorable queda registrada con motivo y no activa al docente', async () => {
    const { flow, writes } = build();
    const result: any = await flow.registrarDecisionIncorporacion(DOCENTE_ID, { ...favorable, resultado: 'NO_FAVORABLE', motivo: 'Falta experiencia' }, actor);
    expect(result.ciclo.etapa).toBe('VALIDADO_CUMPLE');
    expect(JSON.parse(writeOf(writes, 'UPDATE academic_work_plan."Docente"')!.params[1])).toMatchObject({ resultado: 'NO_FAVORABLE', motivo: 'Falta experiencia' });
  });

  it('rechaza un periodo distinto al del perfil', async () => {
    const { flow } = build();
    await expect(flow.registrarDecisionIncorporacion(DOCENTE_ID, { ...favorable, periodoCarga: '2025-1' }, actor)).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe('HU 2349 · RundCicloDocente · recategorización (CA-03)', () => {
  const solicitud = { justificacion: 'Nuevo título de maestría', propuesta: { escalafon: 'Asociado', puntajeSalarial: 250 }, soporteIds: [SOPORTE.id] };

  it('iniciarla crea la solicitud En revisión SIN modificar el docente', async () => {
    const { flow, writes } = build();
    await flow.iniciarRecategorizacion(DOCENTE_ID, solicitud, actor);
    expect(writeOf(writes, 'INSERT INTO academic_work_plan."RundRecategorizacion"')!.sql).toContain("'EN_REVISION'");
    expect(writes.some((w) => w.sql.includes('UPDATE academic_work_plan."Docente"'))).toBe(false);
    const audit = writeOf(writes, 'RundAprobacionLog')!;
    expect(audit.params).toContain('RECATEGORIZACION_INICIADA');
    expect(JSON.parse(audit.params[audit.params.length - 1]).vigente).toEqual({ escalafon: 'Asistente', puntajeSalarial: 100 });
  });

  it('exige justificación y soportes nuevos', async () => {
    const { flow } = build();
    await expect(flow.iniciarRecategorizacion(DOCENTE_ID, { propuesta: { escalafon: 'A' } }, actor)).rejects.toThrow('justificación');
  });

  it('un docente inactivo o con otra solicitud abierta no puede iniciarla', async () => {
    await expect(build({ docente: { estado: 'INACTIVO' } }).flow.iniciarRecategorizacion(DOCENTE_ID, solicitud, actor)).rejects.toThrow('activo');
    await expect(build({ abierta: true }).flow.iniciarRecategorizacion(DOCENTE_ID, solicitud, actor)).rejects.toThrow('en curso');
  });

  it('la revisión que cumple pasa a comité y la que no cumple se rechaza, sin tocar el docente', async () => {
    const ok = build({ recat: { estado: 'EN_REVISION', propuesta: {} } });
    await ok.flow.revisarRecategorizacion(DOCENTE_ID, 'rec-1', { resultado: 'CUMPLE' }, actor);
    expect(writeOf(ok.writes, 'UPDATE academic_work_plan."RundRecategorizacion"')!.params[1]).toBe('EN_COMITE');
    const no = build({ recat: { estado: 'EN_REVISION', propuesta: {} } });
    await no.flow.revisarRecategorizacion(DOCENTE_ID, 'rec-1', { resultado: 'NO_CUMPLE', observacion: 'Falta el acta de grado' }, actor);
    expect(writeOf(no.writes, 'UPDATE academic_work_plan."RundRecategorizacion"')!.params[1]).toBe('RECHAZADA');
    expect(ok.writes.concat(no.writes).some((w) => w.sql.includes('UPDATE academic_work_plan."Docente"'))).toBe(false);
  });

  it('no se puede pasar a comité sin revisión previa', async () => {
    const { flow } = build({ recat: { estado: 'EN_REVISION', propuesta: { escalafon: 'Asociado' } } });
    await expect(flow.decidirRecategorizacion(DOCENTE_ID, 'rec-1', { resultado: 'APROBADA', fechaComite: hoyColombia(), soporteId: SOPORTE.id }, actor)).rejects.toThrow('aún no fueron revisados');
  });

  it('el comité que aprueba actualiza escalafón y puntaje y lo deja en el historial', async () => {
    const { flow, writes } = build({ recat: { estado: 'EN_COMITE', propuesta: { escalafon: 'Asociado', puntajeSalarial: 250 }, justificacion: 'Nuevo título' } });
    await flow.decidirRecategorizacion(DOCENTE_ID, 'rec-1', { resultado: 'APROBADA', fechaComite: hoyColombia(), soporteId: SOPORTE.id }, actor);
    const update = writeOf(writes, 'UPDATE academic_work_plan."Docente"')!;
    expect(update.params).toEqual([DOCENTE_ID, 'Asociado', 250]);
    const audit = writeOf(writes, 'RundAprobacionLog')!;
    expect(JSON.parse(audit.params[audit.params.length - 1]).cambios).toEqual({
      ESCALAFON: { anterior: 'Asistente', nuevo: 'Asociado' }, PUNTAJE_SALARIAL: { anterior: 100, nuevo: 250 },
    });
  });

  it('el comité que rechaza NO toca el docente y exige motivo', async () => {
    const { flow, writes } = build({ recat: { estado: 'EN_COMITE', propuesta: { escalafon: 'Asociado' }, justificacion: 'x' } });
    await expect(flow.decidirRecategorizacion(DOCENTE_ID, 'rec-1', { resultado: 'RECHAZADA', fechaComite: hoyColombia(), soporteId: SOPORTE.id }, actor)).rejects.toThrow('motivo');
    await flow.decidirRecategorizacion(DOCENTE_ID, 'rec-1', { resultado: 'RECHAZADA', fechaComite: hoyColombia(), soporteId: SOPORTE.id, motivo: 'No cumple puntos' }, actor);
    expect(writes.some((w) => w.sql.includes('UPDATE academic_work_plan."Docente"'))).toBe(false);
    expect(writeOf(writes, 'UPDATE academic_work_plan."RundRecategorizacion"')!.params[1]).toBe('RECHAZADA');
  });

  it('una recategorización ya resuelta no se decide dos veces', async () => {
    const { flow } = build({ recat: { estado: 'APROBADA', propuesta: {} } });
    await expect(flow.decidirRecategorizacion(DOCENTE_ID, 'rec-1', { resultado: 'APROBADA', fechaComite: hoyColombia(), soporteId: SOPORTE.id }, actor)).rejects.toBeInstanceOf(ConflictException);
  });

  it('una recategorización de otro docente no se encuentra', async () => {
    const { flow } = build();
    await expect(flow.revisarRecategorizacion(DOCENTE_ID, 'rec-ajena', { resultado: 'CUMPLE' }, actor)).rejects.toThrow('no encontrada');
  });
});
