import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

import { PtaPermissionsService } from '../../pta/auth/pta-permissions.service';
import { aplicarDecision, habilitadaLocal } from '../../pta/docencia-programacion';

export interface AsignaturaConcertadaDto {
  idGrupo: string; asignaturaId: string; codigo: string; nombre: string; programaId: string;
  pensum: string | null; creditos: number; semestre: number | null; modalidad: string | null;
  fechaInicio: string; fechaFin: string; horas: number;
}

export interface DecisionDocenciaDto {
  idConcertacion: string;
  documentoDocente: string;
  periodo: string | null;
  nivel: 'pregrado' | 'posgrado';
  horas: number;
  huella: string;
  asignaturas: AsignaturaConcertadaDto[];
  firmas: Array<{ rol: string; idUser: string; firmadoEn: string; modoOtp: string }>;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PERMISO_APROBAR: Record<'pregrado' | 'posgrado', string> = {
  pregrado: 'pta.approve.academica.pregrado',
  posgrado: 'pta.approve.academica.posgrado',
};

/**
 * Contrato PROG↔PTA v1 — decisiones de concertación de la docencia (EFDS-2315).
 *
 * El PTA REGISTRA lo que Programación Académica concertó y aprobó en su tabla
 * `docencia_concertada` (migración 667). Con PROG_CONCERTACION_HABILITADA lo
 * APLICA además al componente de Docencia del PTA (pta/docencia-programacion.ts);
 * apagado, solo registra. Nunca escribe en el RUND.
 *
 * Autorización en el servidor, con los permisos VIGENTES del PTA: solo quien
 * puede aprobar la Docencia de ese nivel entrega la decisión.
 */
@Injectable()
export class DocenciaDecisionesService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly permisos: PtaPermissionsService,
  ) {}

  /** El interruptor de este lado (lo consulta Programación Académica). */
  configuracion() {
    return { habilitada: habilitadaLocal() };
  }

  async registrar(userId: string, d: DecisionDocenciaDto): Promise<{ registrada: true; aplicada: boolean; estadoAplicacion: string | null }> {
    this.validar(d);
    const ctx = await this.permisos.resolveForUser(String(userId ?? ''));
    if (!ctx.approvesAll && !ctx.permissions.has(PERMISO_APROBAR[d.nivel])) {
      throw new ForbiddenException(`Registrar la docencia concertada de ${d.nivel} requiere poder aprobarla en el PTA.`);
    }
    const guardar = (q: { query(sql: string, p?: any[]): Promise<any> }) => q.query(
      `INSERT INTO academic_work_plan.docencia_concertada
         (id_concertacion, documento_docente, periodo, nivel, horas, huella, asignaturas, firmas, registrada_por)
       VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb, $9)
       ON CONFLICT (id_concertacion) DO UPDATE SET
         documento_docente = EXCLUDED.documento_docente, periodo = EXCLUDED.periodo, nivel = EXCLUDED.nivel,
         horas = EXCLUDED.horas, huella = EXCLUDED.huella, asignaturas = EXCLUDED.asignaturas,
         firmas = EXCLUDED.firmas, registrada_por = EXCLUDED.registrada_por, actualizada_en = NOW()`,
      [d.idConcertacion, d.documentoDocente, d.periodo ?? null, d.nivel, d.horas, d.huella,
        JSON.stringify(d.asignaturas), JSON.stringify(d.firmas), String(userId)],
    );
    // EFDS-2315: con la concertación encendida, la decisión se APLICA al PTA del
    // docente (Docencia aprobada y cargada como de programación). Un PTA firmado
    // no se toca: queda pendiente y se reporta. Apagada: solo se registra.
    if (!habilitadaLocal()) {
      await guardar(this.dataSource);
      return { registrada: true, aplicada: false, estadoAplicacion: null };
    }
    // Registrar y aplicar en UNA transacción: si aplicar falla, no queda una
    // decisión registrada a medias; Programación Académica reintenta (idempotente).
    const estadoAplicacion = await this.dataSource.transaction(async (m) => {
      await guardar(m);
      return aplicarDecision(m, d.idConcertacion);
    });
    return { registrada: true, aplicada: estadoAplicacion === 'aplicada', estadoAplicacion };
  }

  /** Forma de la decisión: estructurada y completa, o 400. */
  private validar(d: DecisionDocenciaDto): void {
    const errores: string[] = [];
    if (!UUID.test(String(d?.idConcertacion ?? ''))) errores.push('idConcertacion debe ser un UUID');
    if (!String(d?.documentoDocente ?? '').trim()) errores.push('documentoDocente es obligatorio');
    if (!['pregrado', 'posgrado'].includes(d?.nivel as string)) errores.push('nivel debe ser pregrado o posgrado');
    if (!Number.isFinite(Number(d?.horas)) || Number(d?.horas) < 0) errores.push('horas debe ser un número no negativo');
    if (!/^[0-9a-f]{64}$/.test(String(d?.huella ?? ''))) errores.push('huella debe ser un sha256 en hexadecimal');
    if (!Array.isArray(d?.asignaturas) || d.asignaturas.length === 0) errores.push('asignaturas no puede estar vacío');
    for (const [i, a] of (Array.isArray(d?.asignaturas) ? d.asignaturas : []).entries()) {
      // Lo que el PTA exige al validar el envío (validatePtaForSubmission).
      if (!/^\d+$/.test(String(a?.asignaturaId ?? '')) || !/^\d+$/.test(String(a?.programaId ?? ''))) errores.push(`asignatura ${i + 1}: ids de catálogo`);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(String(a?.fechaInicio ?? '')) || !/^\d{4}-\d{2}-\d{2}$/.test(String(a?.fechaFin ?? ''))) errores.push(`asignatura ${i + 1}: fechas del ciclo`);
      if (!(Number(a?.horas) > 0)) errores.push(`asignatura ${i + 1}: horas > 0`);
    }
    const roles = Array.isArray(d?.firmas) ? d.firmas.map((f) => f?.rol) : [];
    if (!roles.includes('docente') || !roles.includes('aprobador')) {
      errores.push('firmas debe incluir la del docente y la del aprobador');
    }
    if (errores.length) throw new BadRequestException(`Decisión de docencia inválida: ${errores.join('; ')}.`);
  }
}
