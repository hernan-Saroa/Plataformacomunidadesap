import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

import { PtaPermissionsService } from '../../pta/auth/pta-permissions.service';

export interface DecisionDocenciaDto {
  idConcertacion: string;
  documentoDocente: string;
  periodo: string | null;
  nivel: 'pregrado' | 'posgrado';
  horas: number;
  huella: string;
  asignaturas: Array<{ codigo: string; nombre: string; horas: number }>;
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
 * El PTA REGISTRA lo que Programación Académica concertó y aprobó. No lo aplica
 * todavía a su componente de Docencia: eso es la integración, que va como
 * propuesta de cambio (toca producción). Este servicio solo escribe en su propia
 * tabla `docencia_concertada` (migración 667), nunca en el RUND ni en los PTA.
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

  async registrar(userId: string, d: DecisionDocenciaDto): Promise<{ registrada: true; aplicada: false }> {
    this.validar(d);
    const ctx = await this.permisos.resolveForUser(String(userId ?? ''));
    if (!ctx.approvesAll && !ctx.permissions.has(PERMISO_APROBAR[d.nivel])) {
      throw new ForbiddenException(`Registrar la docencia concertada de ${d.nivel} requiere poder aprobarla en el PTA.`);
    }
    await this.dataSource.query(
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
    return { registrada: true, aplicada: false };
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
    const roles = Array.isArray(d?.firmas) ? d.firmas.map((f) => f?.rol) : [];
    if (!roles.includes('docente') || !roles.includes('aprobador')) {
      errores.push('firmas debe incluir la del docente y la del aprobador');
    }
    if (errores.length) throw new BadRequestException(`Decisión de docencia inválida: ${errores.join('; ')}.`);
  }
}
