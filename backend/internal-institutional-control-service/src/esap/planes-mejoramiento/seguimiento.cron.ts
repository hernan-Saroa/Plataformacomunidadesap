import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SeguimientoPlan } from './entities/seguimiento-plan.entity';
import { AlertaPlan, TipoAlertaPlan } from './entities/alerta-plan.entity';
import { AccionCorrectiva } from './entities/accion-correctiva.entity';
import { EvidenciaAccion } from './entities/evidencia-accion.entity';
import { PlanMejoramiento } from './entities/plan-mejoramiento.entity';
import { calcularCumplimiento } from './evaluacion.utils';
import { NotificacionesService } from '../notificaciones/notificaciones.service';
import { TipoNotificacion, PrioridadNotificacion } from '../notificaciones/entities/notificacion.entity';

/**
 * SeguimientoCron — Job programado para seguimiento periódico
 * 
 * RF-SG-09 / US-020: Seguimiento trimestral a planes internos,
 *                     semestral a los de entes externos.
 * RF-SG-08 / US-024: Generación automática de alertas + notificaciones.
 * 
 * Ejecuta el primer día de cada mes a las 6:00 AM.
 * En cada ejecución, evalúa si corresponde un corte trimestral o semestral
 * según el mes actual (Q1=ene, Q2=abr, Q3=jul, Q4=oct; S1=ene, S2=jul).
 */
@Injectable()
export class SeguimientoCron {
  private readonly logger = new Logger(SeguimientoCron.name);

  constructor(
    @InjectRepository(SeguimientoPlan)
    private readonly seguimientoRepo: Repository<SeguimientoPlan>,
    @InjectRepository(AlertaPlan)
    private readonly alertaRepo: Repository<AlertaPlan>,
    @InjectRepository(AccionCorrectiva)
    private readonly accionRepo: Repository<AccionCorrectiva>,
    @InjectRepository(EvidenciaAccion)
    private readonly evidenciaRepo: Repository<EvidenciaAccion>,
    @InjectRepository(PlanMejoramiento)
    private readonly planRepo: Repository<PlanMejoramiento>,
    private readonly notificacionesService: NotificacionesService,
  ) {}

  /**
   * Cron: primer día de cada mes a las 06:00.
   * Verifica si toca trimestral (meses 1,4,7,10) o semestral (meses 1,7).
   */
  @Cron('0 6 1 * *', { name: 'seguimiento-plan-mejoramiento' })
  async handleSeguimientoMensual() {
    const ahora = new Date();
    const mes = ahora.getMonth() + 1; // 1-based
    const esTrimestral = [1, 4, 7, 10].includes(mes);
    const esSemestral = [1, 7].includes(mes);

    this.logger.log(`[Seguimiento] Evaluando mes ${mes}: trimestral=${esTrimestral}, semestral=${esSemestral}`);

    if (esTrimestral) {
      await this.ejecutarSeguimiento('TRIMESTRAL', 'INTERNO', ahora);
    }

    if (esSemestral) {
      await this.ejecutarSeguimiento('SEMESTRAL', 'ENTE_EXTERNO', ahora);
    }

    // Generar alertas para TODOS los planes con acciones abiertas
    await this.generarAlertasGlobales();
  }

  /**
   * Ejecuta el seguimiento para un tipo de periodicidad.
   * Busca todos los planes con acciones abiertas y calcula métricas.
   */
  private async ejecutarSeguimiento(
    periodicidad: 'TRIMESTRAL' | 'SEMESTRAL',
    tipoControl: 'INTERNO' | 'ENTE_EXTERNO',
    fechaCorte: Date,
  ): Promise<void> {
    this.logger.log(`[Seguimiento] Ejecutando ${periodicidad} para ${tipoControl}`);

    // Obtener todas las acciones abiertas
    const acciones = await this.accionRepo.find({
      where: { estadoAccionSeguimiento: 'abierta' },
    });

    if (acciones.length === 0) {
      this.logger.log(`[Seguimiento] No hay acciones abiertas para ${tipoControl}`);
      return;
    }

    // Agrupar por planId
    const porPlan = new Map<string, AccionCorrectiva[]>();
    for (const a of acciones) {
      const planId = a.planId;
      if (!planId) continue;
      if (!porPlan.has(planId)) porPlan.set(planId, []);
      porPlan.get(planId)!.push(a);
    }

    for (const [planId, accionesPlan] of porPlan) {
      let cumplen = 0;
      let parcial = 0;
      let noCumplen = 0;

      for (const accion of accionesPlan) {
        // Recalcular cumplimiento
        const programadas = accion.cantidadAccionesProgramadas ?? 0;
        const implementadas = accion.cantidadAccionesImplementadas ?? 0;
        const cumplimiento = calcularCumplimiento(implementadas, programadas);

        // Actualizar
        accion.cumplimientoEmfo = cumplimiento;
        await this.accionRepo.save(accion);

        if (cumplimiento === 2) cumplen++;
        else if (cumplimiento === 1) parcial++;
        else noCumplen++;
      }

      // Registrar seguimiento
      const seguimiento = this.seguimientoRepo.create({
        planId,
        periodicidad,
        tipoControl,
        fechaCorte,
        responsableId: 'SISTEMA',
        responsableNombre: 'Seguimiento Automático',
        resumen: `Seguimiento ${periodicidad.toLowerCase()} automático — ${accionesPlan.length} acciones evaluadas. Cumplen: ${cumplen}, Parcial: ${parcial}, No cumplen: ${noCumplen}.`,
        totalAccionesEvaluadas: accionesPlan.length,
        accionesCumplen: cumplen,
        accionesParcial: parcial,
        accionesNoCumplen: noCumplen,
        automatico: true,
      });

      await this.seguimientoRepo.save(seguimiento);
      this.logger.log(`[Seguimiento] Plan ${planId}: ${cumplen}/${parcial}/${noCumplen}`);

      // ── US-024: Notificar al responsable del plan sobre el seguimiento ──
      try {
        const plan = await this.planRepo.findOne({ where: { id: planId } });
        if (plan?.responsableImplementacion) {
          await this.notificacionesService.create({
            usuarioId: plan.responsableImplementacion,
            tipoNotificacion: TipoNotificacion.ALERTA_VENCIMIENTO,
            titulo: `Seguimiento ${periodicidad.toLowerCase()} generado — Plan de mejoramiento`,
            mensaje: `Se completó el seguimiento ${periodicidad.toLowerCase()} automático de su plan de mejoramiento. ` +
              `Resultado: ${cumplen} cumplen, ${parcial} parcial, ${noCumplen} no cumplen de ${accionesPlan.length} acciones evaluadas.`,
            prioridad: noCumplen > 0 ? PrioridadNotificacion.ALTA : PrioridadNotificacion.NORMAL,
            metadata: { planId, periodicidad, tipoControl, cumplen, parcial, noCumplen },
          });
        }
      } catch (e: any) {
        this.logger.warn(`[Seguimiento] No se pudo notificar seguimiento plan ${planId}: ${e.message}`);
      }
    }
  }

  /**
   * Genera alertas globales para todos los planes con acciones abiertas.
   * Implementa los 4 tipos del EM-PT-002 act. 6.
   * US-024: Envía notificaciones al responsable por cada alerta nueva.
   */
  async generarAlertasGlobales(): Promise<number> {
    const ahora = new Date();
    const mesActual = ahora.getMonth();
    const anioActual = ahora.getFullYear();
    let totalAlertas = 0;

    // Obtener todas las acciones abiertas con su plan
    const acciones = await this.accionRepo.find({
      where: { estadoAccionSeguimiento: 'abierta' },
    });

    // Pre-cargar planes para evitar N+1
    const planIds = [...new Set(acciones.map(a => a.planId).filter(Boolean))];
    const planesMap = new Map<string, PlanMejoramiento>();
    for (const pid of planIds) {
      const plan = await this.planRepo.findOne({ where: { id: pid } });
      if (plan) planesMap.set(pid, plan);
    }

    for (const accion of acciones) {
      const planId = accion.planId;
      if (!planId) continue;

      const plan = planesMap.get(planId);
      const fechaVenc = accion.fechaFin ? new Date(accion.fechaFin) : null;

      // ── Alerta Tipo 1: VENCIDA_SIN_EVIDENCIA ──
      if (fechaVenc && fechaVenc < ahora) {
        const evidencias = await this.evidenciaRepo.find({
          where: { accionId: accion.id },
        });
        const tieneEvidenciaAceptada = evidencias.some(e => e.estadoValidacion === 'aceptado');
        if (!tieneEvidenciaAceptada) {
          const desc = `Acción "${accion.descripcion?.substring(0, 60)}..." vencida sin evidencia aceptada.`;
          const creada = await this.crearAlertaSiNoExiste(planId, accion.id, TipoAlertaPlan.VENCIDA_SIN_EVIDENCIA, desc);
          if (creada) {
            totalAlertas++;
            await this.notificarAlerta(plan, desc, PrioridadNotificacion.ALTA, planId);
          }
        }
      }

      // ── Alerta Tipo 2: INEFECTIVA ──
      if (accion.efectividadVerificada && accion.efectividadEmfo === 0) {
        const desc = `Acción "${accion.descripcion?.substring(0, 60)}..." calificada como inefectiva.`;
        const creada = await this.crearAlertaSiNoExiste(planId, accion.id, TipoAlertaPlan.INEFECTIVA, desc);
        if (creada) {
          totalAlertas++;
          await this.notificarAlerta(plan, desc, PrioridadNotificacion.ALTA, planId);
        }
      }

      // ── Alerta Tipo 3: CUMPLIMIENTO_MES_ACTUAL ──
      if (fechaVenc && fechaVenc.getMonth() === mesActual && fechaVenc.getFullYear() === anioActual) {
        const desc = `Acción "${accion.descripcion?.substring(0, 60)}..." vence este mes (${fechaVenc.toLocaleDateString('es-CO')}).`;
        const creada = await this.crearAlertaSiNoExiste(planId, accion.id, TipoAlertaPlan.CUMPLIMIENTO_MES_ACTUAL, desc);
        if (creada) {
          totalAlertas++;
          await this.notificarAlerta(plan, desc, PrioridadNotificacion.NORMAL, planId);
        }
      }

      // ── Alerta Tipo 4: CUMPLIMIENTO_MES_SIGUIENTE ──
      const mesSiguiente = (mesActual + 1) % 12;
      const anioSiguiente = mesActual === 11 ? anioActual + 1 : anioActual;
      if (fechaVenc && fechaVenc.getMonth() === mesSiguiente && fechaVenc.getFullYear() === anioSiguiente) {
        const desc = `Acción "${accion.descripcion?.substring(0, 60)}..." vence el mes siguiente (${fechaVenc.toLocaleDateString('es-CO')}).`;
        const creada = await this.crearAlertaSiNoExiste(planId, accion.id, TipoAlertaPlan.CUMPLIMIENTO_MES_SIGUIENTE, desc);
        if (creada) {
          totalAlertas++;
          await this.notificarAlerta(plan, desc, PrioridadNotificacion.BAJA, planId);
        }
      }
    }

    this.logger.log(`[Alertas] Total alertas nuevas generadas: ${totalAlertas}`);
    return totalAlertas;
  }

  /**
   * Crea una alerta solo si no existe una del mismo tipo para la misma acción
   * que no haya sido atendida. Retorna true si fue creada (nueva).
   */
  private async crearAlertaSiNoExiste(
    planId: string,
    accionId: string,
    tipo: TipoAlertaPlan,
    descripcion: string,
  ): Promise<boolean> {
    const existente = await this.alertaRepo.findOne({
      where: { planId, accionId, tipo, atendida: false },
    });
    if (existente) return false;

    const alerta = this.alertaRepo.create({
      planId,
      accionId,
      tipo,
      descripcion,
      atendida: false,
    });
    await this.alertaRepo.save(alerta);
    return true;
  }

  /**
   * US-024: Dispara una notificación al responsable del plan cuando se genera una alerta.
   */
  private async notificarAlerta(
    plan: PlanMejoramiento | undefined,
    descripcion: string,
    prioridad: PrioridadNotificacion,
    planId: string,
  ): Promise<void> {
    if (!plan?.responsableImplementacion) return;
    try {
      await this.notificacionesService.create({
        usuarioId: plan.responsableImplementacion,
        tipoNotificacion: TipoNotificacion.ALERTA_VENCIMIENTO,
        titulo: 'Alerta de seguimiento — Plan de mejoramiento',
        mensaje: descripcion,
        prioridad,
        metadata: { planId, fuente: 'SeguimientoCron' },
      });
    } catch (e: any) {
      this.logger.warn(`[Alertas] No se pudo notificar alerta plan ${planId}: ${e.message}`);
    }
  }
}
