import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DataSource, EntityManager } from 'typeorm';
import { EstadoSolicitud } from '../../entities/estado-solicitud.enum';
import { SolicitudHistorialEstadoEntity } from '../../entities/solicitud-historial-estado.entity';
import { NotificationClientService } from '../../common/notification-client.service';
import { LegalizacionComisionEntity } from './entities/legalizacion-comision.entity';
import { LegalizacionSoporteEntity } from './entities/legalizacion-soporte.entity';
import { AccionRevision, LegalizacionRevisionEntity } from './entities/legalizacion-revision.entity';
import {
  esSuperAdmin,
  LegalizacionService,
  SolicitudContexto,
  UsuarioAutenticado,
} from './legalizacion.service';
import { fechaColombia } from './plazo-legalizacion.util';

/** Evento que consumirá EFDS-1308 (reintegros) cuando el viaje fue menor. */
export const EVENTO_REINTEGRO = 'commission.reintegro_required';

export interface EventoReintegro {
  solicitudId: string;
  legalizacionId: string;
  consecutivoUnico: string;
  comisionadoId: string;
  valorPagado: number;
  valorLegalizado: number;
  valorReintegro: number;
  diasComision: number | null;
  diasReales: number | null;
  usuarioId: string;
}

export type FiltroBandeja = 'POR_REVISAR' | 'DEVUELTAS' | 'CERRADAS';

export interface RegistrarSiifDto {
  numeroRegistroSiif: string;
  fechaRegistroSiif: string;
  valorLegalizado: number;
  diasReales?: number | null;
  observaciones?: string;
}

const MIN_OBSERVACION = 10;

/** SIIF no acepta tildes, eñes, punto y coma ni saltos de línea (mismo criterio que la Etapa 5). */
export function textoSiif(valor: unknown): string {
  return String(valor ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[ñÑ]/g, (c) => (c === 'ñ' ? 'n' : 'N'))
    .replace(/[;\r\n\t"]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * EFDS-1310 — Revisión de la legalización por el analista, registro en SIIF y
 * cierre del expediente.
 *
 * - No crea estados de la solicitud (C-2): la única transición es
 *   PENDIENTE_LEGALIZACION → LEGALIZADO, al registrar en SIIF y cerrar.
 * - Una devolución deja la solicitud en PENDIENTE_LEGALIZACION; la
 *   legalización vuelve a quedar abierta para el comisionado y se marca en
 *   devuelta_en / observacion_devolucion.
 * - SIIF no es una API: como en las etapas 5, 7 y 8, se exporta un CSV y se
 *   registra el número que el analista digita.
 * - Cerrar vuelve el expediente inmutable; la base lo garantiza (migración 451).
 */
@Injectable()
export class LegalizacionRevisionService {
  private readonly logger = new Logger(LegalizacionRevisionService.name);

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly legalizaciones: LegalizacionService,
    @Optional() private readonly notificationClient?: NotificationClientService,
    @Optional() private readonly eventEmitter?: EventEmitter2,
  ) {}

  // ---------------------------------------------------------------------------
  // Acceso: analista asignado, con segregación de funciones
  // ---------------------------------------------------------------------------

  private async exigirRevisor(sol: SolicitudContexto, user: UsuarioAutenticado): Promise<void> {
    if (esSuperAdmin(user)) return;
    if (!user?.userId || sol.analista_asignado_id !== user.userId) {
      throw new ForbiddenException('Solo el analista asignado a la comisión puede revisar su legalización.');
    }
    // SoD: quien revisa no puede ser quien radicó ni el propio comisionado.
    if (sol.creado_por_usuario_id === user.userId) {
      throw new ForbiddenException('Segregación de funciones: quien radicó la comisión no puede revisar su legalización.');
    }
    const doc = await this.legalizaciones.documentoDelUsuario(user.userId);
    if (doc && doc === sol.comisionado_numero_documento) {
      throw new ForbiddenException('Segregación de funciones: el comisionado no puede revisar su propia legalización.');
    }
  }

  /** Bloquea la legalización para la transacción y valida que esté en revisión. */
  private async bloquearEnRevision(
    m: EntityManager,
    solicitudId: string,
    opciones: { permitirAprobada?: boolean } = {},
  ): Promise<LegalizacionComisionEntity> {
    const filas = await m.query(
      `SELECT id FROM travel_expenses.legalizaciones_comision WHERE solicitud_id = $1 FOR UPDATE`,
      [solicitudId],
    );
    if (!filas[0]) throw new NotFoundException('Esta comisión no tiene legalización.');
    const leg = await m.getRepository(LegalizacionComisionEntity).findOneOrFail({ where: { solicitudId } });
    if (leg.cerradaEn) {
      throw new BadRequestException('El expediente de legalización está cerrado: no admite cambios.');
    }
    if (!leg.fechaEnvio) {
      throw new BadRequestException(
        leg.devueltaEn
          ? 'La legalización fue devuelta al comisionado y aún no la ha reenviado.'
          : 'La legalización todavía no ha sido enviada a revisión.',
      );
    }
    if (leg.revisionAprobadaEn && !opciones.permitirAprobada) {
      throw new BadRequestException('La revisión ya fue aprobada: solo queda registrar en SIIF y cerrar.');
    }
    return leg;
  }

  private async registrar(
    m: EntityManager,
    legalizacionId: string,
    accion: AccionRevision,
    usuarioId: string,
    extra: { soporteId?: string; observacion?: string | null; detalle?: Record<string, unknown> } = {},
  ): Promise<void> {
    const repo = m.getRepository(LegalizacionRevisionEntity);
    await repo.save(
      repo.create({
        legalizacionId,
        accion,
        usuarioId,
        soporteId: extra.soporteId ?? null,
        observacion: extra.observacion ?? null,
        detalle: extra.detalle ?? null,
      }),
    );
  }

  // ---------------------------------------------------------------------------
  // Bandeja y detalle
  // ---------------------------------------------------------------------------

  async bandeja(user: UsuarioAutenticado, filtro: FiltroBandeja = 'POR_REVISAR') {
    if (!user?.userId) throw new ForbiddenException('Usuario no autenticado.');
    const condicion = {
      POR_REVISAR: 'l.fecha_envio IS NOT NULL AND l.cerrada_en IS NULL',
      DEVUELTAS: 'l.devuelta_en IS NOT NULL AND l.fecha_envio IS NULL AND l.cerrada_en IS NULL',
      CERRADAS: 'l.cerrada_en IS NOT NULL',
    }[filtro];
    if (!condicion) throw new BadRequestException(`Filtro no válido: ${filtro}.`);

    return this.dataSource.query(
      `SELECT l.id AS "legalizacionId", s.id AS "solicitudId", s.consecutivo_unico AS "consecutivoUnico",
              s.estado_solicitud AS "estadoSolicitud",
              trim(concat_ws(' ', c.primer_nombre, c.segundo_nombre, c.primer_apellido, c.segundo_apellido)) AS "comisionadoNombre",
              concat_ws(', ', s.destino_ciudad, s.destino_departamento) AS "destino",
              to_char(s.fecha_inicio, 'YYYY-MM-DD') AS "fechaInicio",
              to_char(s.fecha_fin, 'YYYY-MM-DD') AS "fechaFin",
              s.valor_pagado::float AS "valorPagado",
              l.fecha_envio AS "fechaEnvio", l.fecha_limite AS "fechaLimite",
              (l.fecha_envio > l.fecha_limite) AS "enviadaFueraDePlazo",
              l.numero_devoluciones AS "numeroDevoluciones", l.devuelta_en AS "devueltaEn",
              l.revision_aprobada_en AS "revisionAprobadaEn", l.siif_exportado_en AS "siifExportadoEn",
              l.cerrada_en AS "cerradaEn", l.numero_registro_siif AS "numeroRegistroSiif",
              l.valor_reintegro::float AS "valorReintegro",
              count(ls.id)::int AS "soportes",
              count(ls.id) FILTER (WHERE ls.revision IS NULL)::int AS "sinRevisar",
              count(ls.id) FILTER (WHERE ls.revision = 'RECHAZADO')::int AS "rechazados"
         FROM travel_expenses.legalizaciones_comision l
         JOIN travel_expenses.solicitudes_comision s ON s.id = l.solicitud_id
         JOIN travel_expenses.comisionados c ON c.id = s.comisionado_id
         LEFT JOIN travel_expenses.legalizacion_soportes ls ON ls.legalizacion_id = l.id
        WHERE ${condicion}
          AND ($1::boolean OR s.analista_asignado_id = $2)
        GROUP BY l.id, s.id, c.id
        ORDER BY ${filtro === 'CERRADAS' ? 'l.cerrada_en DESC' : 'l.fecha_envio NULLS LAST, l.devuelta_en'}`,
      [esSuperAdmin(user), user.userId],
    );
  }

  async detalle(solicitudId: string, user: UsuarioAutenticado) {
    const sol = await this.legalizaciones.cargarSolicitud(solicitudId);
    await this.exigirRevisor(sol, user);
    // El analista asignado ya tiene lectura en LegalizacionService (relación ANALISTA).
    const detalle = await this.legalizaciones.detalle(solicitudId, user);
    const historial = await this.dataSource.getRepository(LegalizacionRevisionEntity).find({
      where: { legalizacionId: detalle.legalizacionId },
      order: { creadoEn: 'ASC' },
    });
    const leg = await this.legalizaciones.cargarLegalizacion(solicitudId);
    const todosRevisados = detalle.checklist.items.every((i) =>
      i.soportes.every((s) => s.revision !== null),
    );
    const hayRechazos = detalle.checklist.items.some((i) => i.soportes.some((s) => s.revision === 'RECHAZADO'));
    return {
      ...detalle,
      puedeEditar: false,
      numeroObligacion: sol.numero_obligacion,
      codigoRp: sol.codigo_rp,
      fechaPago: sol.fecha_pago_ymd,
      diasComision: sol.dias_comision,
      siifExportadoEn: leg.siifExportadoEn,
      enRevision: Boolean(leg.fechaEnvio && !leg.cerradaEn),
      puedeRevisar: Boolean(leg.fechaEnvio && !leg.cerradaEn && !leg.revisionAprobadaEn),
      puedeAprobar:
        Boolean(leg.fechaEnvio && !leg.cerradaEn && !leg.revisionAprobadaEn) &&
        detalle.checklist.completo &&
        todosRevisados &&
        !hayRechazos,
      puedeRegistrarSiif: Boolean(leg.revisionAprobadaEn && !leg.cerradaEn),
      historialRevision: historial,
    };
  }

  // ---------------------------------------------------------------------------
  // Revisión soporte por soporte
  // ---------------------------------------------------------------------------

  async revisarSoporte(
    solicitudId: string,
    soporteId: string,
    dto: { decision: 'APROBADO' | 'RECHAZADO'; observacion?: string },
    user: UsuarioAutenticado,
  ) {
    if (dto?.decision !== 'APROBADO' && dto?.decision !== 'RECHAZADO') {
      throw new BadRequestException('La decisión debe ser APROBADO o RECHAZADO.');
    }
    const observacion = dto.observacion?.trim() || null;
    if (dto.decision === 'RECHAZADO' && (!observacion || observacion.length < MIN_OBSERVACION)) {
      throw new BadRequestException(
        `Para rechazar un soporte explique el motivo (mínimo ${MIN_OBSERVACION} caracteres).`,
      );
    }
    const sol = await this.legalizaciones.cargarSolicitud(solicitudId);
    await this.exigirRevisor(sol, user);

    return this.dataSource.transaction(async (m) => {
      const leg = await this.bloquearEnRevision(m, solicitudId);
      const repo = m.getRepository(LegalizacionSoporteEntity);
      const soporte = await repo.findOne({ where: { id: soporteId, legalizacionId: leg.id } });
      if (!soporte) throw new NotFoundException('Soporte no encontrado en esta legalización.');

      soporte.revision = dto.decision;
      soporte.observacionRevision = observacion;
      soporte.revisadoPorId = user.userId;
      soporte.revisadoEn = new Date();
      await repo.save(soporte);

      await this.registrar(m, leg.id, dto.decision === 'APROBADO' ? 'SOPORTE_APROBADO' : 'SOPORTE_RECHAZADO', user.userId, {
        soporteId,
        observacion,
        detalle: { nombreArchivo: soporte.nombreArchivoOriginal, sha256: soporte.sha256 },
      });
      return { soporteId, revision: soporte.revision, observacionRevision: soporte.observacionRevision };
    });
  }

  // ---------------------------------------------------------------------------
  // Devolución al comisionado (C-2: sin estado nuevo)
  // ---------------------------------------------------------------------------

  async devolver(solicitudId: string, dto: { observacion: string }, user: UsuarioAutenticado) {
    const observacion = dto?.observacion?.trim() || '';
    if (observacion.length < MIN_OBSERVACION) {
      throw new BadRequestException(
        `La devolución requiere una observación para el comisionado (mínimo ${MIN_OBSERVACION} caracteres).`,
      );
    }
    const sol = await this.legalizaciones.cargarSolicitud(solicitudId);
    await this.exigirRevisor(sol, user);

    const leg = await this.dataSource.transaction(async (m) => {
      const l = await this.bloquearEnRevision(m, solicitudId);
      l.devueltaEn = new Date();
      l.devueltaPorId = user.userId;
      l.observacionDevolucion = observacion;
      l.numeroDevoluciones = (l.numeroDevoluciones ?? 0) + 1;
      // Vuelve a quedar abierta para el comisionado.
      l.fechaEnvio = null;
      l.enviadaPorId = null;
      await m.getRepository(LegalizacionComisionEntity).save(l);

      await this.registrar(m, l.id, 'DEVOLUCION', user.userId, {
        observacion,
        detalle: { numeroDevolucion: l.numeroDevoluciones },
      });
      await m.getRepository(SolicitudHistorialEstadoEntity).save({
        solicitudId,
        estadoAnterior: sol.estado_solicitud,
        estadoNuevo: sol.estado_solicitud,
        usuarioId: user.userId,
        comentarios: `[EFDS-1310] Legalización devuelta al comisionado: ${observacion}`.slice(0, 255),
      });
      return l;
    });

    await this.notificar(sol, {
      tipo: 'VIATICOS_LEGALIZACION_DEVUELTA',
      titulo: `Legalización devuelta: ${sol.consecutivo_unico}`,
      mensaje: `El analista devolvió la legalización de ${sol.consecutivo_unico}: ${observacion}`,
      color: '#dc2626',
    });
    return { legalizacionId: leg.id, devueltaEn: leg.devueltaEn, numeroDevoluciones: leg.numeroDevoluciones };
  }

  // ---------------------------------------------------------------------------
  // Aprobación de la revisión
  // ---------------------------------------------------------------------------

  async aprobar(solicitudId: string, user: UsuarioAutenticado) {
    const sol = await this.legalizaciones.cargarSolicitud(solicitudId);
    await this.exigirRevisor(sol, user);

    return this.dataSource.transaction(async (m) => {
      const leg = await this.bloquearEnRevision(m, solicitudId);
      const chk = await this.legalizaciones.checklist(sol, leg.id);
      if (!chk.completo) {
        throw new BadRequestException('El checklist no está completo: faltan soportes obligatorios.');
      }
      const soportes = chk.items.flatMap((i) => i.soportes);
      const sinRevisar = soportes.filter((s) => s.revision === null).length;
      const rechazados = soportes.filter((s) => s.revision === 'RECHAZADO').length;
      if (sinRevisar || rechazados) {
        throw new BadRequestException(
          `No se puede aprobar: ${sinRevisar} soporte(s) sin revisar y ${rechazados} rechazado(s). ` +
            'Revise todos los soportes; si alguno tiene errores, devuelva la legalización.',
        );
      }
      leg.revisionAprobadaEn = new Date();
      leg.revisionAprobadaPorId = user.userId;
      await m.getRepository(LegalizacionComisionEntity).save(leg);
      await this.registrar(m, leg.id, 'APROBACION', user.userId, { detalle: { soportesAprobados: soportes.length } });
      return { legalizacionId: leg.id, revisionAprobadaEn: leg.revisionAprobadaEn, soportesAprobados: soportes.length };
    });
  }

  // ---------------------------------------------------------------------------
  // SIIF: CSV exportado + número digitado (patrón de las etapas 5, 7 y 8)
  // ---------------------------------------------------------------------------

  async exportarSiif(solicitudId: string, user: UsuarioAutenticado) {
    const sol = await this.legalizaciones.cargarSolicitud(solicitudId);
    await this.exigirRevisor(sol, user);

    return this.dataSource.transaction(async (m) => {
      const leg = await this.bloquearEnRevision(m, solicitudId, { permitirAprobada: true });
      if (!leg.revisionAprobadaEn) {
        throw new BadRequestException('Apruebe la revisión de los soportes antes de exportar a SIIF.');
      }
      const chk = await this.legalizaciones.checklist(sol, leg.id);
      const soportes = chk.items.flatMap((i) => i.soportes).length;

      const columnas = [
        'Consecutivo', 'Cedula', 'Nombre', 'NumeroObligacion', 'CodigoRP', 'FechaPago', 'ValorPagado',
        'FechaInicio', 'FechaFin', 'DiasComision', 'SoportesAprobados', 'FechaAprobacionRevision', 'FechaExportacion',
      ];
      const ahora = new Date();
      const fila = [
        sol.consecutivo_unico,
        sol.comisionado_numero_documento,
        sol.comisionado_nombre,
        sol.numero_obligacion,
        sol.codigo_rp,
        sol.fecha_pago_ymd,
        Number(sol.valor_pagado ?? 0).toFixed(2),
        sol.fecha_inicio_ymd,
        sol.fecha_fin_ymd,
        sol.dias_comision,
        soportes,
        fechaColombia(new Date(leg.revisionAprobadaEn)),
        fechaColombia(ahora),
      ].map(textoSiif);

      leg.siifExportadoEn = ahora;
      leg.siifExportadoPorId = user.userId;
      await m.getRepository(LegalizacionComisionEntity).save(leg);
      await this.registrar(m, leg.id, 'EXPORTACION_SIIF', user.userId);

      return {
        nombreArchivo: `SIIF_LEGALIZACION_${textoSiif(sol.consecutivo_unico)}_${fechaColombia(ahora).replace(/-/g, '')}.csv`,
        contenido: `﻿${columnas.join(';')}\r\n${fila.join(';')}\r\n`,
      };
    });
  }

  /**
   * Registra la legalización en SIIF y cierra el expediente, en una sola
   * transacción: o queda LEGALIZADO y cerrado, o no cambia nada.
   */
  async registrarYCerrar(solicitudId: string, dto: RegistrarSiifDto, user: UsuarioAutenticado) {
    const numero = dto?.numeroRegistroSiif?.trim() || '';
    if (!numero || numero.length > 100) {
      throw new BadRequestException('Digite el número del registro de la legalización en SIIF Nación (máximo 100 caracteres).');
    }
    const fecha = dto?.fechaRegistroSiif?.trim() || '';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha) || Number.isNaN(new Date(`${fecha}T00:00:00Z`).getTime())) {
      throw new BadRequestException('La fecha del registro en SIIF debe tener el formato AAAA-MM-DD.');
    }
    if (fecha > fechaColombia(new Date())) {
      throw new BadRequestException('La fecha del registro en SIIF no puede ser posterior a hoy.');
    }
    const valorLegalizado = Number(dto?.valorLegalizado);
    if (!Number.isFinite(valorLegalizado) || valorLegalizado < 0) {
      throw new BadRequestException('El valor legalizado debe ser un número mayor o igual a cero.');
    }
    const diasReales = dto?.diasReales == null ? null : Number(dto.diasReales);
    if (diasReales !== null && (!Number.isFinite(diasReales) || diasReales < 0)) {
      throw new BadRequestException('Los días reales deben ser un número mayor o igual a cero.');
    }

    const sol = await this.legalizaciones.cargarSolicitud(solicitudId);
    await this.exigirRevisor(sol, user);

    const r = await this.dataSource.transaction(async (m) => {
      const [bloqueada] = await m.query(
        `SELECT estado_solicitud, valor_pagado::text AS valor_pagado
           FROM travel_expenses.solicitudes_comision WHERE id = $1 FOR UPDATE`,
        [solicitudId],
      );
      const leg = await this.bloquearEnRevision(m, solicitudId, { permitirAprobada: true });
      if (!leg.revisionAprobadaEn) {
        throw new BadRequestException('Apruebe la revisión de los soportes antes de registrar en SIIF.');
      }
      if (bloqueada?.estado_solicitud !== EstadoSolicitud.PENDIENTE_LEGALIZACION) {
        throw new BadRequestException(
          `La comisión debe estar en PENDIENTE_LEGALIZACION para cerrarse (estado actual: ${bloqueada?.estado_solicitud}).`,
        );
      }
      if (bloqueada.valor_pagado == null) {
        throw new BadRequestException('La comisión no tiene valor pagado registrado: no se puede calcular el reintegro.');
      }
      const valorPagado = Number(bloqueada.valor_pagado);
      if (valorLegalizado > valorPagado) {
        throw new BadRequestException(
          `El valor legalizado ($${valorLegalizado.toLocaleString('es-CO')}) no puede superar el pagado ` +
            `($${valorPagado.toLocaleString('es-CO')}): un mayor valor se tramita aparte.`,
        );
      }
      const valorReintegro = Math.round((valorPagado - valorLegalizado) * 100) / 100;
      const cierre = new Date();

      Object.assign(leg, {
        numeroRegistroSiif: numero,
        fechaRegistroSiif: fecha,
        registradoSiifPorId: user.userId,
        valorPagado: valorPagado.toFixed(2),
        valorLegalizado: valorLegalizado.toFixed(2),
        valorReintegro: valorReintegro.toFixed(2),
        diasReales: diasReales === null ? null : diasReales.toFixed(2),
        observacionesCierre: dto.observaciones?.trim() || null,
        cerradaEn: cierre,
        cerradaPorId: user.userId,
      });
      await m.getRepository(LegalizacionComisionEntity).save(leg);

      const res = await m.query(
        `UPDATE travel_expenses.solicitudes_comision
            SET estado_solicitud = $2, actualizado_en = now()
          WHERE id = $1 AND estado_solicitud = $3`,
        [solicitudId, EstadoSolicitud.LEGALIZADO, EstadoSolicitud.PENDIENTE_LEGALIZACION],
      );
      if (Number(Array.isArray(res) ? res[1] : 0) !== 1) {
        throw new BadRequestException('La comisión cambió de estado mientras se cerraba: intente de nuevo.');
      }

      await m.getRepository(SolicitudHistorialEstadoEntity).save({
        solicitudId,
        estadoAnterior: EstadoSolicitud.PENDIENTE_LEGALIZACION,
        estadoNuevo: EstadoSolicitud.LEGALIZADO,
        usuarioId: user.userId,
        comentarios: (
          `[EFDS-1310] Legalización registrada en SIIF (${numero}) y expediente cerrado. ` +
          `Legalizado $${valorLegalizado.toLocaleString('es-CO')}` +
          (valorReintegro > 0 ? `; reintegro $${valorReintegro.toLocaleString('es-CO')}.` : '; sin reintegro.')
        ).slice(0, 255),
      });
      await this.registrar(m, leg.id, 'REGISTRO_SIIF_Y_CIERRE', user.userId, {
        observacion: leg.observacionesCierre,
        detalle: { numeroRegistroSiif: numero, fechaRegistroSiif: fecha, valorPagado, valorLegalizado, valorReintegro, diasReales },
      });
      return { leg, valorPagado, valorReintegro };
    });

    // Después del commit: quien escuche lee datos ya confirmados.
    if (r.valorReintegro > 0) {
      const evento: EventoReintegro = {
        solicitudId,
        legalizacionId: r.leg.id,
        consecutivoUnico: sol.consecutivo_unico,
        comisionadoId: sol.comisionado_id,
        valorPagado: r.valorPagado,
        valorLegalizado,
        valorReintegro: r.valorReintegro,
        diasComision: sol.dias_comision == null ? null : Number(sol.dias_comision),
        diasReales,
        usuarioId: user.userId,
      };
      this.eventEmitter?.emit(EVENTO_REINTEGRO, evento);
      this.logger.log(
        `[EFDS-1310] ${sol.consecutivo_unico}: viaje menor, reintegro de $${r.valorReintegro} (evento ${EVENTO_REINTEGRO}).`,
      );
    }
    await this.notificar(sol, {
      tipo: 'VIATICOS_LEGALIZACION_CERRADA',
      titulo: `Comisión legalizada: ${sol.consecutivo_unico}`,
      mensaje:
        `La legalización de ${sol.consecutivo_unico} quedó registrada en SIIF (${numero}) y el expediente cerrado.` +
        (r.valorReintegro > 0 ? ` Debe reintegrar $${r.valorReintegro.toLocaleString('es-CO')}.` : ''),
      color: '#059669',
    });

    return {
      legalizacionId: r.leg.id,
      estadoSolicitud: EstadoSolicitud.LEGALIZADO,
      cerradaEn: r.leg.cerradaEn,
      numeroRegistroSiif: numero,
      valorPagado: r.valorPagado,
      valorLegalizado,
      valorReintegro: r.valorReintegro,
    };
  }

  private async notificar(
    sol: SolicitudContexto,
    n: { tipo: string; titulo: string; mensaje: string; color: string },
  ): Promise<void> {
    if (!this.notificationClient || !sol.creado_por_usuario_id) return;
    try {
      await this.notificationClient.send({
        id_usuario_destinatario: sol.creado_por_usuario_id,
        tipo_notificacion: n.tipo,
        titulo: n.titulo,
        mensaje: n.mensaje,
        icono: 'Receipt',
        color: n.color,
        prioridad: 'Alta',
        categoria: 'VIATICOS',
        tiene_accion: true,
        texto_boton_accion: 'Ver legalización',
        url_accion: '/viaticos',
        datos_adicionales: { solicitudId: sol.id },
      });
    } catch (err: any) {
      this.logger.warn(`[EFDS-1310] No se pudo notificar ${n.tipo} de ${sol.consecutivo_unico}: ${err?.message}`);
    }
  }
}
