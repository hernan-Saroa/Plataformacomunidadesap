import { Injectable } from '@nestjs/common';

/**
 * Una asignatura concertada, con lo que el PTA exige para validar el envío
 * (validatePtaForSubmission): ids de catálogo, pensum, créditos, fechas del
 * ciclo del grupo y horas > 0.
 */
export interface AsignaturaConcertada {
  idGrupo: string;
  asignaturaId: string;
  codigo: string;
  nombre: string;
  programaId: string;
  pensum: string | null;
  creditos: number;
  semestre: number | null;
  modalidad: string | null;
  fechaInicio: string;
  fechaFin: string;
  horas: number;
}

/** Decisión de concertación que se entrega al PTA por el contrato. */
export interface DecisionDocencia {
  idConcertacion: string;
  documentoDocente: string;
  periodo: string | null;
  nivel: 'pregrado' | 'posgrado';
  horas: number;
  huella: string;
  asignaturas: AsignaturaConcertada[];
  firmas: Array<{ rol: string; idUser: string; firmadoEn: string; modoOtp: string }>;
}

/**
 * Contrato PROG↔PTA, lado de Programación Académica — EFDS-2315.
 *
 * Usa los endpoints del contrato cuyo dueño es el PTA; este servicio nunca
 * escribe en el esquema del PTA.
 */
@Injectable()
export class ContratoPtaClient {
  private readonly base =
    process.env.ACADEMIC_WORK_PLAN_SERVICE_URL || 'http://academic-work-plan-service:3003';

  /** ¿El PTA tiene encendido el mismo interruptor? Lanza si no responde. */
  async ptaHabilitada(): Promise<boolean> {
    const res = await fetch(`${this.base}/contrato-programacion/v1/docencia/configuracion`);
    if (!res.ok) throw new Error(`El PTA respondió ${res.status} al consultar la configuración.`);
    const c: any = await res.json();
    return (c?.data ?? c)?.habilitada === true;
  }

  async registrarDecision(decision: DecisionDocencia, token: string | null): Promise<any> {
    const res = await fetch(`${this.base}/contrato-programacion/v1/docencia/decisiones`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify(decision),
    });
    if (!res.ok) {
      let detalle = '';
      try { const c: any = await res.json(); detalle = c?.message ?? ''; } catch { /* sin cuerpo */ }
      throw new Error(`El PTA respondió ${res.status}${detalle ? `: ${detalle}` : ''}`);
    }
    const c: any = await res.json();
    return c?.data ?? c;
  }
}
