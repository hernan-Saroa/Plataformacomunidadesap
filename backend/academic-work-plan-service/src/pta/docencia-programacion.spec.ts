import { ConflictException, ServiceUnavailableException } from '@nestjs/common';

import {
  aplicarDecision,
  exigirDecisionDocenciaEnPta,
  exigirDocenciaParaEnviar,
  protegerAsignaturas,
  regimenDocencia,
  regimenDocenciaSeguro,
  reiniciarCacheProgramacion,
} from './docencia-programacion';
import { PtaService } from './pta.service';

/**
 * EFDS-2315 :: la Docencia del PTA en el régimen de concertación.
 *
 * La prueba que más importa es la de APAGADO: así llega a producción, y el PTA
 * tiene que comportarse exactamente como hoy (ni una consulta nueva).
 */
describe('EFDS-2315 :: Docencia concertada en el PTA', () => {
  const envAntes = { ...process.env };
  let fetchMock: jest.Mock;
  /** Lo que responde Programación Académica: config o 'caido'. */
  let pa: { habilitada: boolean; desdePeriodo: string | null } | 'caido';

  beforeEach(() => {
    reiniciarCacheProgramacion();
    delete process.env.PROG_CONCERTACION_HABILITADA;
    pa = { habilitada: true, desdePeriodo: '2050-1' };
    fetchMock = jest.fn(async () => {
      if (pa === 'caido') throw new Error('ECONNREFUSED');
      return { ok: true, json: async () => ({ success: true, data: pa }) } as any;
    });
    (global as any).fetch = fetchMock;
  });
  afterAll(() => { process.env = envAntes; });

  const encender = () => { process.env.PROG_CONCERTACION_HABILITADA = 'true'; };
  const borrador = { periodo: '2050-1', estado: 'BORRADOR', datosEstructurados: { asignaturas: [] } };
  const conDocencia = { ...borrador, datosEstructurados: { asignaturas: [{ origen: 'programacion', asignatura_id: '1', nivel_concertacion: 'pregrado' }] } };

  describe('APAGADO (así va a producción): el PTA se comporta exactamente como hoy', () => {
    it('no consulta a Programación Académica y la Docencia sigue en el PTA', async () => {
      expect(await regimenDocencia(borrador)).toBe('actual');
      await expect(exigirDecisionDocenciaEnPta(borrador, 'academica_pregrado')).resolves.toBeUndefined();
      await expect(exigirDocenciaParaEnviar(borrador)).resolves.toBeUndefined();
      expect(protegerAsignaturas('actual', null, [{ asignatura_id: '9' }])).toEqual([{ asignatura_id: '9' }]);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('aprobarComponente de Docencia no hace ninguna lectura extra antes de su flujo de siempre', async () => {
      const service = Object.create(PtaService.prototype) as any;
      service.ptaRepo = { findOne: jest.fn().mockResolvedValue(null) };
      // Sin auth falla en la autorización de siempre; lo que importa es que antes
      // no se consultó el PTA ni Programación Académica por la concertación.
      await expect(service.aprobarComponente('pta-1', { componente: 'academica_pregrado', estado: 'aprobado' }, undefined)).rejects.toBeTruthy();
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('registrar una decisión apagado no la aplica', async () => {
      const q = { query: jest.fn(async (sql: string) => (sql.includes('SELECT * FROM') ? [{ id_concertacion: 'c1' }] : [])) };
      expect(await aplicarDecision(q, 'c1')).toBe('no_aplica_apagada');
      expect(q.query.mock.calls.some(([sql]) => /PtaComponentApproval|"PlanTrabajoAcademico" SET/.test(sql))).toBe(false);
    });
  });

  describe('ENCENDIDO en los dos lados: el PTA no aprueba la Docencia del corte, la recibe', () => {
    beforeEach(encender);

    it('un PTA en borrador del periodo de corte entra al régimen nuevo', async () => {
      expect(await regimenDocencia(borrador)).toBe('programacion');
      await expect(exigirDecisionDocenciaEnPta(borrador, 'academica_pregrado')).rejects.toBeInstanceOf(ConflictException);
      await expect(exigirDecisionDocenciaEnPta(borrador, 'academica_territorial')).rejects.toBeInstanceOf(ConflictException);
      // Los demás componentes siguen en el PTA.
      await expect(exigirDecisionDocenciaEnPta(borrador, 'investigacion')).resolves.toBeUndefined();
    });

    it('no se envía sin la docencia concertada; con ella, sí', async () => {
      await expect(exigirDocenciaParaEnviar(borrador)).rejects.toThrow(/todavía no llega/);
      await expect(exigirDocenciaParaEnviar(conDocencia)).resolves.toBeUndefined();
    });

    it('un periodo anterior al corte sigue en el flujo de hoy', async () => {
      expect(await regimenDocencia({ ...borrador, periodo: '2049-2' })).toBe('actual');
    });

    it('un PTA ya enviado antes de encender (sin docencia de programación) sigue en el flujo de hoy', async () => {
      expect(await regimenDocencia({ ...borrador, estado: 'Pendiente Jefatura' })).toBe('actual');
      // Pero uno enviado CON docencia concertada sigue en el régimen nuevo.
      expect(await regimenDocencia({ ...conDocencia, estado: 'Pendiente Jefatura' })).toBe('programacion');
    });

    it('el servidor rechaza agregar a mano y cambiar las horas concertadas (no depende de la pantalla)', () => {
      const concertada = { origen: 'programacion', id_concertacion: 'c1', asignatura_id: '1', asignatura_codigo: 'ASIG-00001', total_horas: 96, horas_base: 96 };
      const existente = { asignaturas: [concertada] };
      // Devolverla igual (con campos de presentación que agrega la lectura) se acepta y guarda lo concertado.
      expect(protegerAsignaturas('programacion', existente, [{ ...concertada, programa_nombre: 'AP', componente_docencia: 'academica_pregrado' }]))
        .toEqual([concertada]);
      // Cambiar sus horas: 409 explícito, no se ignora en silencio.
      expect(() => protegerAsignaturas('programacion', existente, [{ ...concertada, total_horas: 500 }])).toThrow(/no se cambian en el PTA/);
      expect(() => protegerAsignaturas('programacion', existente, [{ ...concertada, horas_base: 1 }])).toThrow(ConflictException);
      // Agregar a mano, o disfrazada de "programación" sin estar concertada: 409.
      expect(() => protegerAsignaturas('programacion', existente, [{ asignatura_id: '7', asignatura_nombre: 'Manual' }])).toThrow(ConflictException);
      expect(() => protegerAsignaturas('programacion', existente, [concertada, { origen: 'programacion', id_concertacion: 'falsa', asignatura_id: '7' }]))
        .toThrow(/no se agregan asignaturas/);
      // Omitirla no la borra: lo concertado se conserva.
      expect(protegerAsignaturas('programacion', existente, [])).toEqual([concertada]);
    });

    it('Programación Académica no responde: falla cerrado con error explícito, y no se auto-aprueba la Docencia', async () => {
      pa = 'caido';
      await expect(regimenDocencia(borrador)).rejects.toBeInstanceOf(ServiceUnavailableException);
      expect(await regimenDocenciaSeguro(borrador)).toBe('programacion');
    });
  });

  describe('ningún caso con doble aprobación ni sin aprobación', () => {
    // El régimen nuevo exige los DOS lados. Programación Académica, por su parte,
    // rechaza concertar si el PTA no está encendido (ConcertacionService). Así,
    // para cada combinación exactamente UNO aprueba la Docencia.
    const casos: Array<[string, boolean, boolean]> = [
      ['ambos apagados', false, false],
      ['solo el PTA encendido', true, false],
      ['solo PA encendido', false, true],
      ['ambos encendidos', true, true],
    ];
    it.each(casos)('%s', async (_n, ptaOn, paOn) => {
      if (ptaOn) encender(); else delete process.env.PROG_CONCERTACION_HABILITADA;
      pa = { habilitada: paOn && ptaOn, desdePeriodo: '2050-1' }; // PA solo se declara encendida si el PTA también
      const regimen = await regimenDocencia(borrador);
      const apruebaElPta = regimen === 'actual';
      const apruebaLaConcertacion = paOn && ptaOn; // PA verifica al PTA antes de concertar
      expect(Number(apruebaElPta) + Number(apruebaLaConcertacion)).toBe(1);
    });
  });

  describe('aplicar la decisión al PTA', () => {
    beforeEach(encender);
    const decision = {
      id_concertacion: 'c1', documento_docente: '1020304053', periodo: '2050-1', nivel: 'pregrado',
      asignaturas: [{ asignaturaId: '1', programaId: '1', codigo: 'ASIG-00001', nombre: 'Constitución', pensum: 'P1',
        creditos: 3, semestre: 1, modalidad: 'Presencial', fechaInicio: '2050-02-03', fechaFin: '2050-05-30', horas: 96 }],
    };
    const db = (pta: any | null) => {
      const llamadas: Array<{ sql: string; params: any[] }> = [];
      return {
        llamadas,
        query: jest.fn(async (sql: string, params: any[] = []) => {
          llamadas.push({ sql, params });
          if (sql.includes('SELECT * FROM academic_work_plan.docencia_concertada')) return [decision];
          if (sql.includes('FROM academic_work_plan."PlanTrabajoAcademico" p')) return pta ? [pta] : [];
          return [];
        }),
      };
    };

    it('PTA en borrador: carga la docencia como de programación y aprueba el componente', async () => {
      const q = db({ id: 'p1', estado: 'BORRADOR', periodo: '2050-1', ds: { asignaturas: [{ asignatura_id: '9' }] } });
      expect(await aplicarDecision(q, 'c1')).toBe('aplicada');
      const update = q.llamadas.find((l) => l.sql.includes('"PlanTrabajoAcademico" SET'))!;
      const ds = JSON.parse(update.params[1]);
      expect(ds.asignaturas).toHaveLength(1); // la manual previa se quita
      expect(ds.asignaturas[0]).toMatchObject({ origen: 'programacion', editable: false, asignatura_id: '1', programa_id: '1', total_horas: 96, territorial_id: '' });
      const aprobacion = q.llamadas.find((l) => l.sql.includes('INSERT INTO academic_work_plan."PtaComponentApproval"'))!;
      expect(aprobacion.params).toEqual(['p1', 'academica_pregrado', expect.any(String), 'programacion', 'c1']);
    });

    it('PTA firmado: NO se modifica; queda pendiente y se reporta', async () => {
      const q = db({ id: 'p1', estado: 'EN_FIRME', periodo: '2050-1', ds: {} });
      expect(await aplicarDecision(q, 'c1')).toBe('pendiente_pta_firmado');
      expect(q.llamadas.some((l) => /"PlanTrabajoAcademico" SET|PtaComponentApproval/.test(l.sql))).toBe(false);
    });

    it('sin PTA: queda pendiente para precargarse al crearlo', async () => {
      expect(await aplicarDecision(db(null), 'c1')).toBe('pendiente_sin_pta');
    });

    it('PTA enviado antes del corte (flujo anterior): no se aplica, para no aprobar dos veces', async () => {
      const q = db({ id: 'p1', estado: 'Pendiente Jefatura', periodo: '2050-1', ds: { asignaturas: [{ asignatura_id: '9' }] } });
      expect(await aplicarDecision(q, 'c1')).toBe('pendiente_pta_flujo_anterior');
      expect(q.llamadas.some((l) => /PtaComponentApproval/.test(l.sql))).toBe(false);
    });
  });
});
