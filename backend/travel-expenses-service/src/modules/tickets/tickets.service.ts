import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { SaldoTiqueteEntity } from '../../entities/tickets/saldo-tiquete.entity';
import { RutaRestringidaEntity } from '../../entities/tickets/ruta-restringida.entity';
import { ExcepcionTiqueteEntity } from '../../entities/tickets/excepcion-tiquete.entity';
import { LiquidationParamEntity } from '../../entities/liquidation/liquidation-param.entity';
import {
  ValidateTicketDto,
  CreateSaldoTiqueteDto,
  UpdateSaldoTiqueteDto,
  CreateRutaRestringidaDto,
  UpdateRutaRestringidaDto,
  CrearExcepcionTiqueteDto,
  ReservarSaldoTiqueteDto,
  LiberarSaldoTiqueteDto,
} from '../../dto/tickets/tickets.dto';

/**
 * Respuesta del endpoint `POST /api/v1/tickets/validate`.
 *
 * Expone flags que el frontend consume para activar el semáforo de saldo
 * y la captura obligatoria del PDF de excepción (RF-LIQ-003 / RF-LIQ-004).
 */
export interface TicketValidationResult {
  is_valid: boolean;
  requires_route_exception: boolean;
  requires_budget_exception: boolean;
  force_land_transport: boolean;
  saldo_actual_dependencia: number;
  holgura_aplicada_porcentaje: number;
  monto_reserva_con_holgura: number;
  ruta_restringida_encontrada: {
    origen: string;
    destino: string;
    descripcion: string;
  } | null;
  message: string;
  nivel_alerta: 'VERDE' | 'AMARILLO' | 'ROJO';
  mensaje_alerta: string;
}

@Injectable()
export class TicketsService {
  private readonly logger = new Logger(TicketsService.name);

  /** Umbrales del semáforo (porcentaje del cupo inicial). */
  private readonly UMBRAL_VERDE = 30;
  private readonly UMBRAL_ROJO = 0;

  /** Texto por defecto para rutas restringidas (alineado con la HU). */
  private readonly DESCRIPCION_RUTA_POR_DEFECTO =
    'Ruta corta restringida. Requiere autorización del Director Nacional o Sindicato.';

  constructor(
    @InjectRepository(SaldoTiqueteEntity)
    private readonly saldoRepo: Repository<SaldoTiqueteEntity>,
    @InjectRepository(RutaRestringidaEntity)
    private readonly rutaRepo: Repository<RutaRestringidaEntity>,
    @InjectRepository(ExcepcionTiqueteEntity)
    private readonly excepcionRepo: Repository<ExcepcionTiqueteEntity>,
    @InjectRepository(LiquidationParamEntity)
    private readonly paramRepo: Repository<LiquidationParamEntity>,
    private readonly dataSource: DataSource,
  ) {}

  // ========================================================================
  // Utilidades de normalización
  // ========================================================================

  /**
   * Normaliza un nombre de ciudad para la comparación contra la tabla
   * `rutas_restringidas`: mayúsculas, sin acentos, sin prefijos (D.C., etc.).
   */
  private normalizarCiudad(ciudad: string): string {
    return (ciudad || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toUpperCase()
      .replace(/\s+/g, ' ')
      .trim();
  }

  private calcularNivelAlerta(
    disponible: number,
    cupoInicial: number,
  ): 'VERDE' | 'AMARILLO' | 'ROJO' {
    if (cupoInicial <= 0) {
      return disponible <= this.UMBRAL_ROJO ? 'ROJO' : 'AMARILLO';
    }
    const porcentaje = (disponible / cupoInicial) * 100;
    if (disponible <= this.UMBRAL_ROJO) return 'ROJO';
    if (porcentaje <= this.UMBRAL_VERDE) return 'AMARILLO';
    return 'VERDE';
  }

  private mensajeAlerta(nivel: 'VERDE' | 'AMARILLO' | 'ROJO'): string {
    switch (nivel) {
      case 'VERDE':
        return 'Saldo suficiente para el tiquete estimado. La reserva se registra con la holgura de mercado aplicada.';
      case 'AMARILLO':
        return 'Presupuesto de tiquetes próximo a agotarse. Se recomienda optimizar rutas o solicitar excepción.';
      case 'ROJO':
        return 'Presupuesto agotado. El sistema forzará transporte terrestre o exigirá la carga del PDF de excepción presupuestal firmado por Dirección Nacional.';
    }
  }

  // ========================================================================
  // Holgura de precio (RF-LIQ-004)
  // ========================================================================

  /**
   * Recupera el porcentaje de holgura aplicable a la reserva de tiquetes
   * (RF-LIQ-004). Prioridad:
   *   1. Parámetro global `HOLGURA_TIQUETES_PORCENTAJE` (LiquidationParamEntity).
   *   2. Columna `holgura_porcentaje` del registro de saldo de la dependencia.
   *   3. Valor por defecto (15%).
   */
  async obtenerHolguraGlobal(): Promise<number> {
    const param = await this.paramRepo.findOne({
      where: { clave: 'HOLGURA_TIQUETES_PORCENTAJE' },
    });
    if (!param) return 15;
    const n = Number(param.valor);
    return Number.isFinite(n) && n >= 0 ? n : 15;
  }

  private calcularMontoReserva(
    monto: number,
    holguraPorcentaje: number,
  ): number {
    const factor = 1 + Math.max(0, holguraPorcentaje) / 100;
    return Math.round((Number(monto) * factor + Number.EPSILON) * 100) / 100;
  }

  // ========================================================================
  // Validación de ruta y presupuesto (POST /api/v1/tickets/validate)
  // ========================================================================

  /**
   * Valida de forma proactiva (sin reservar saldo) si una solicitud de tiquete
   * aéreo es viable para una dependencia y una ruta determinadas.
   *
   * Reglas:
   *  - Ruta restringida + AEREO  -> requires_route_exception = true.
   *  - Saldo < monto estimado    -> requires_budget_exception = true.
   *  - Saldo = 0 (agotado)       -> force_land_transport = true (a menos que
   *    el cliente envíe una excepción presupuestal previa).
   *
   * El método NO muta el saldo; para reservar ver {@link reservarSaldo}.
   */
  async validarTiquete(
    dto: ValidateTicketDto,
  ): Promise<TicketValidationResult> {
    const origenNorm = this.normalizarCiudad(dto.origenCiudad);
    const destinoNorm = this.normalizarCiudad(dto.destinoCiudad);

    // La normalización NFD + remoción de diacríticos ya se hizo en JS
    // (ver normalizarCiudad), por lo que basta una comparación UPPER simple.
    const rutaRestringida = await this.rutaRepo
      .createQueryBuilder('r')
      .where('UPPER(r.origen_ciudad) = :origen', { origen: origenNorm })
      .andWhere('UPPER(r.destino_ciudad) = :destino', { destino: destinoNorm })
      .andWhere('r.activo = TRUE')
      .getOne();

    const saldo = await this.saldoRepo.findOne({
      where: { dependenciaId: dto.dependenciaId, activo: true },
    });

    const saldoDisponible = saldo ? Number(saldo.presupuestoDisponible) : 0;
    const cupoInicial = saldo ? Number(saldo.presupuestoInicial) : 0;
    const holguraPorcentaje = saldo
      ? Number(saldo.holguraPorcentaje)
      : await this.obtenerHolguraGlobal();
    const montoReserva = this.calcularMontoReserva(
      dto.montoEstimadoTiquete,
      holguraPorcentaje,
    );

    const requiereExcepRuta =
      Boolean(rutaRestringida) && dto.tipoTransporte === 'AEREO';
    const requiereExcepPresupuesto = saldoDisponible < montoReserva;
    const fuerzaTerrestre =
      saldoDisponible <= 0 && dto.tipoTransporte === 'AEREO';

    const nivel = this.calcularNivelAlerta(saldoDisponible, cupoInicial);

    let mensaje = 'Solicitud de tiquete viable.';
    if (requiereExcepRuta && rutaRestringida) {
      mensaje = `La ruta seleccionada (${dto.origenCiudad} - ${dto.destinoCiudad}) es corta y aérea restringida. Debe aportar soporte de excepción autorizado por Dirección Nacional o Sindicato.`;
    } else if (fuerzaTerrestre) {
      mensaje =
        'El saldo de la dependencia está en cero. El sistema forzará transporte terrestre o exigirá autorización explícita del Director Nacional.';
    } else if (requiereExcepPresupuesto) {
      mensaje = `Saldo insuficiente para cubrir el tiquete con la holgura de mercado (${holguraPorcentaje}%). Adjunte PDF de excepción firmado por Dirección Nacional.`;
    }

    return {
      is_valid: !requiereExcepRuta && !requiereExcepPresupuesto,
      requires_route_exception: requiereExcepRuta,
      requires_budget_exception: requiereExcepPresupuesto && !fuerzaTerrestre,
      force_land_transport: fuerzaTerrestre,
      saldo_actual_dependencia: Math.round(saldoDisponible * 100) / 100,
      holgura_aplicada_porcentaje: holguraPorcentaje,
      monto_reserva_con_holgura: montoReserva,
      ruta_restringida_encontrada: rutaRestringida
        ? {
            origen: rutaRestringida.origenCiudad,
            destino: rutaRestringida.destinoCiudad,
            descripcion: rutaRestringida.descripcionRestriccion || '',
          }
        : null,
      message: mensaje,
      nivel_alerta: nivel,
      mensaje_alerta: this.mensajeAlerta(nivel),
    };
  }

  // ========================================================================
  // Reserva / liberación de saldo (concurrencia con SELECT ... FOR UPDATE)
  // ========================================================================

  /**
   * Reserva saldo presupuestal de forma atómica usando un bloqueo pesimista
   * (`SELECT ... FOR UPDATE`) sobre la fila del saldo. Esto evita sobregiros
   * cuando dos solicitudes del mismo enlace (o de distintos enlaces de la
   * misma dependencia) intentan reservar simultáneamente.
   *
   * Si la reserva supera el disponible se lanza `BadRequestException` para
   * que el cliente muestre la alerta de semáforo en rojo.
   */
  async reservarSaldo(
    dto: ReservarSaldoTiqueteDto,
  ): Promise<SaldoTiqueteEntity> {
    return this.dataSource.transaction(async (manager) => {
      // Bloqueo pesimista: la fila queda retenida hasta el COMMIT.
      const fila = await manager
        .createQueryBuilder(SaldoTiqueteEntity, 's')
        .setLock('pessimistic_write')
        .where('s.dependencia_id = :dep', { dep: dto.dependenciaId })
        .andWhere('s.activo = TRUE')
        .getOne();

      if (!fila) {
        throw new NotFoundException(
          `No existe un saldo presupuestal configurado para la dependencia ${dto.dependenciaId}.`,
        );
      }

      const holgura = Number(fila.holguraPorcentaje);
      const montoAReservar = this.calcularMontoReserva(
        dto.montoEstimadoTiquete,
        holgura,
      );

      if (Number(fila.presupuestoDisponible) < montoAReservar) {
        throw new BadRequestException(
          `Saldo insuficiente para reservar el tiquete de la solicitud ${dto.solicitudId}. ` +
            `Disponible: ${fila.presupuestoDisponible}, requerido (con holgura ${holgura}%): ${montoAReservar}.`,
        );
      }

      fila.presupuestoReservado =
        Number(fila.presupuestoReservado) + montoAReservar;
      fila.presupuestoDisponible =
        Number(fila.presupuestoDisponible) - montoAReservar;

      const saved = await manager.save(SaldoTiqueteEntity, fila);

      this.logger.log(
        `[reservarSaldo] solicitud=${dto.solicitudId} dep=${dto.dependenciaId} ` +
          `monto=${montoAReservar} holgura=${holgura}% dispFinal=${saved.presupuestoDisponible}`,
      );

      return saved;
    });
  }

  /**
   * Libera una reserva previa (p. ej. cuando se rechaza o anula una solicitud).
   * Usa el mismo bloqueo pesimista para garantizar consistencia.
   */
  async liberarSaldo(dto: LiberarSaldoTiqueteDto): Promise<SaldoTiqueteEntity> {
    return this.dataSource.transaction(async (manager) => {
      const fila = await manager
        .createQueryBuilder(SaldoTiqueteEntity, 's')
        .setLock('pessimistic_write')
        .where('s.dependencia_id = :dep', { dep: dto.dependenciaId })
        .andWhere('s.activo = TRUE')
        .getOne();

      if (!fila) {
        throw new NotFoundException(
          `No existe un saldo presupuestal configurado para la dependencia ${dto.dependenciaId}.`,
        );
      }

      const holgura = Number(fila.holguraPorcentaje);
      const montoALiberar = this.calcularMontoReserva(
        dto.montoEstimadoTiquete,
        holgura,
      );

      fila.presupuestoReservado = Math.max(
        0,
        Number(fila.presupuestoReservado) - montoALiberar,
      );
      fila.presupuestoDisponible =
        Number(fila.presupuestoDisponible) + montoALiberar;

      const saved = await manager.save(SaldoTiqueteEntity, fila);

      this.logger.log(
        `[liberarSaldo] solicitud=${dto.solicitudId} dep=${dto.dependenciaId} ` +
          `monto=${montoALiberar} dispFinal=${saved.presupuestoDisponible}`,
      );

      return saved;
    });
  }

  // ========================================================================
  // Excepciones (RUTA_CORTA / PRESUPUESTO_AGOTADO)
  // ========================================================================

  async registrarExcepcion(
    dto: CrearExcepcionTiqueteDto,
  ): Promise<ExcepcionTiqueteEntity> {
    const entity = this.excepcionRepo.create({
      solicitudId: dto.solicitudId,
      tipoExcepcion: dto.tipoExcepcion,
      autorizadoPor: dto.autorizadoPor,
      numeroDocumentoSoporte: dto.numeroDocumentoSoporte,
      documentoSoporteUrl: dto.documentoSoporteUrl ?? null,
      comentarios: dto.comentarios ?? null,
    });
    return this.excepcionRepo.save(entity);
  }

  // ========================================================================
  // Parámetro global de holgura (RF-LIQ-004)
  // ========================================================================

  /**
   * Recupera el registro completo del parámetro `HOLGURA_TIQUETES_PORCENTAJE`
   * para mostrarlo en el panel de configuración administrativa.
   */
  async obtenerParametroHolgura(): Promise<LiquidationParamEntity | null> {
    return this.paramRepo.findOne({
      where: { clave: 'HOLGURA_TIQUETES_PORCENTAJE' },
    });
  }

  /**
   * Actualiza el porcentaje de holgura global (RF-LIQ-004). Aplica a todas
   * las dependencias que no tengan un valor explícito en su columna
   * `holgura_porcentaje`. El valor debe estar entre 0 y 100.
   */
  async actualizarParametroHolgura(
    valor: number,
  ): Promise<LiquidationParamEntity> {
    if (!Number.isFinite(valor) || valor < 0 || valor > 100) {
      throw new BadRequestException(
        'La holgura porcentual debe ser un número entre 0 y 100.',
      );
    }
    let param = await this.paramRepo.findOne({
      where: { clave: 'HOLGURA_TIQUETES_PORCENTAJE' },
    });
    if (!param) {
      param = this.paramRepo.create({
        clave: 'HOLGURA_TIQUETES_PORCENTAJE',
        valor: String(valor),
        tipo: 'NUMBER',
        descripcion:
          'Holgura porcentual aplicada a la reserva presupuestal de tiquetes para absorber fluctuaciones de tarifa aérea (RF-LIQ-004).',
      });
    } else {
      param.valor = String(valor);
    }
    return this.paramRepo.save(param);
  }

  async obtenerExcepcionesPorSolicitud(
    solicitudId: string,
  ): Promise<ExcepcionTiqueteEntity[]> {
    return this.excepcionRepo.find({
      where: { solicitudId },
      order: { creadoEn: 'DESC' },
    });
  }

  // ========================================================================
  // CRUD de saldos (parametrización administrativa)
  // ========================================================================

  async obtenerSaldos(): Promise<SaldoTiqueteEntity[]> {
    return this.saldoRepo.find({
      where: { activo: true },
      order: { nombreDependencia: 'ASC' },
    });
  }

  async obtenerSaldoPorDependencia(
    dependenciaId: string,
  ): Promise<SaldoTiqueteEntity | null> {
    return this.saldoRepo.findOne({ where: { dependenciaId } });
  }

  async crearSaldo(dto: CreateSaldoTiqueteDto): Promise<SaldoTiqueteEntity> {
    const existe = await this.saldoRepo.findOne({
      where: { dependenciaId: dto.dependenciaId },
    });
    if (existe) {
      throw new BadRequestException(
        `Ya existe un saldo configurado para la dependencia ${dto.dependenciaId}.`,
      );
    }
    const holgura =
      dto.holguraPorcentaje ?? (await this.obtenerHolguraGlobal());
    const entity = this.saldoRepo.create({
      dependenciaId: dto.dependenciaId,
      nombreDependencia: dto.nombreDependencia,
      presupuestoInicial: dto.presupuestoInicial,
      presupuestoReservado: 0,
      presupuestoDisponible: dto.presupuestoInicial,
      holguraPorcentaje: holgura,
      activo: dto.activo ?? true,
    });
    return this.saldoRepo.save(entity);
  }

  async actualizarSaldo(
    id: string,
    dto: UpdateSaldoTiqueteDto,
  ): Promise<SaldoTiqueteEntity> {
    const entity = await this.saldoRepo.findOne({ where: { id } });
    if (!entity) {
      throw new NotFoundException(`Saldo con id ${id} no encontrado.`);
    }
    if (dto.nombreDependencia !== undefined) {
      entity.nombreDependencia = dto.nombreDependencia;
    }
    if (dto.presupuestoInicial !== undefined) {
      const diferencia =
        dto.presupuestoInicial - Number(entity.presupuestoInicial);
      entity.presupuestoInicial = dto.presupuestoInicial;
      entity.presupuestoDisponible =
        Number(entity.presupuestoDisponible) + diferencia;
    }
    if (dto.holguraPorcentaje !== undefined) {
      entity.holguraPorcentaje = dto.holguraPorcentaje;
    }
    if (dto.activo !== undefined) {
      entity.activo = dto.activo;
    }
    return this.saldoRepo.save(entity);
  }

  async eliminarSaldo(id: string): Promise<{ message: string }> {
    const entity = await this.saldoRepo.findOne({ where: { id } });
    if (!entity) {
      throw new NotFoundException(`Saldo con id ${id} no encontrado.`);
    }
    entity.activo = false;
    await this.saldoRepo.save(entity);
    return { message: 'Saldo de tiquetes desactivado correctamente.' };
  }

  // ========================================================================
  // CRUD de rutas restringidas
  // ========================================================================

  async obtenerRutasRestringidas(): Promise<RutaRestringidaEntity[]> {
    return this.rutaRepo.find({
      where: { activo: true },
      order: { origenCiudad: 'ASC' },
    });
  }

  async crearRutaRestringida(
    dto: CreateRutaRestringidaDto,
  ): Promise<RutaRestringidaEntity> {
    const origenNorm = this.normalizarCiudad(dto.origenCiudad);
    const destinoNorm = this.normalizarCiudad(dto.destinoCiudad);
    const existe = await this.rutaRepo
      .createQueryBuilder('r')
      .where('UPPER(r.origen_ciudad) = :origen', { origen: origenNorm })
      .andWhere('UPPER(r.destino_ciudad) = :destino', { destino: destinoNorm })
      .getOne();
    if (existe) {
      throw new BadRequestException(
        `Ya existe una ruta restringida registrada para ${dto.origenCiudad} - ${dto.destinoCiudad}.`,
      );
    }
    const descripcion =
      dto.descripcionRestriccion && dto.descripcionRestriccion.trim().length > 0
        ? dto.descripcionRestriccion.trim()
        : this.DESCRIPCION_RUTA_POR_DEFECTO;
    const entity = this.rutaRepo.create({
      origenCiudad: origenNorm,
      destinoCiudad: destinoNorm,
      descripcionRestriccion: descripcion,
      activo: dto.activo ?? true,
    });
    return this.rutaRepo.save(entity);
  }

  async actualizarRutaRestringida(
    id: number,
    dto: UpdateRutaRestringidaDto,
  ): Promise<RutaRestringidaEntity> {
    const entity = await this.rutaRepo.findOne({ where: { id } });
    if (!entity) {
      throw new NotFoundException(
        `Ruta restringida con id ${id} no encontrada.`,
      );
    }
    if (dto.origenCiudad !== undefined) {
      entity.origenCiudad = this.normalizarCiudad(dto.origenCiudad);
    }
    if (dto.destinoCiudad !== undefined) {
      entity.destinoCiudad = this.normalizarCiudad(dto.destinoCiudad);
    }
    if (dto.descripcionRestriccion !== undefined) {
      entity.descripcionRestriccion =
        dto.descripcionRestriccion && dto.descripcionRestriccion.trim().length > 0
          ? dto.descripcionRestriccion.trim()
          : this.DESCRIPCION_RUTA_POR_DEFECTO;
    }
    if (dto.activo !== undefined) {
      entity.activo = dto.activo;
    }
    return this.rutaRepo.save(entity);
  }

  async eliminarRutaRestringida(id: number): Promise<{ message: string }> {
    const entity = await this.rutaRepo.findOne({ where: { id } });
    if (!entity) {
      throw new NotFoundException(
        `Ruta restringida con id ${id} no encontrada.`,
      );
    }
    entity.activo = false;
    await this.rutaRepo.save(entity);
    return { message: 'Ruta restringida desactivada correctamente.' };
  }
}
