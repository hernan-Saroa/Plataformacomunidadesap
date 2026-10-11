import { Injectable } from '@nestjs/common';

/** Decisión de concertación que se entrega al PTA por el contrato. */
export interface DecisionDocencia {
  idConcertacion: string;
  documentoDocente: string;
  periodo: string | null;
  nivel: 'pregrado' | 'posgrado';
  horas: number;
  huella: string;
  asignaturas: Array<{ codigo: string; nombre: string; horas: number }>;
  firmas: Array<{ rol: string; idUser: string; firmadoEn: string; modoOtp: string }>;
}

/**
 * Entrega al PTA de una concertación aprobada — EFDS-2315.
 *
 * Usa el endpoint NUEVO del contrato PROG↔PTA (POST
 * /contrato-programacion/v1/docencia/decisiones), dueño: el PTA. Este servicio
 * nunca escribe en el esquema del PTA. Hoy el PTA solo REGISTRA la decisión:
 * aplicarla a su componente de Docencia es la integración, que va como
 * propuesta. Si el PTA no responde, la concertación queda aprobada igual y con
 * la notificación pendiente, para reintentar.
 */
@Injectable()
export class ContratoPtaClient {
  private readonly base =
    process.env.ACADEMIC_WORK_PLAN_SERVICE_URL || 'http://academic-work-plan-service:3003';

  async registrarDecision(decision: DecisionDocencia, token: string | null): Promise<void> {
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
  }
}
