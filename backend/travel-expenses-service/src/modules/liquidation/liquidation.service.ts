import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { EscalaViaticoEntity } from '../../entities/liquidation/escala-viatico.entity';
import { TarifaInvestigadorEntity } from '../../entities/liquidation/tarifa-investigador.entity';
import { TarifaRegionalExcepcionEntity } from '../../entities/liquidation/tarifa-regional-excepcion.entity';
import { LiquidationParamEntity } from '../../entities/liquidation/liquidation-param.entity';
import { CalcularLiquidacionDto, TipoComisionadoLiquidacion, CategoriaInvestigador } from '../../dto/liquidation/calcular-liquidacion.dto';
import { DesgloseDiaDto, LiquidacionResponseDto } from '../../dto/liquidation/liquidacion-response.dto';

function getCached<T>(cache: Map<string, { data: T; expiry: number }>, key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiry) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

function setCached<T>(cache: Map<string, { data: T; expiry: number }>, key: string, data: T, ttlMs: number) {
  cache.set(key, { data, expiry: Date.now() + ttlMs });
}

/**
 * Servicio de autoliquidación de viáticos.
 *
 * Implementa el algoritmo de cálculo según Decreto 314 de 2026:
 * - Determina el salario base según el tipo de comisionado.
 * - Busca la escala de viáticos por rango salarial.
 * - Aplica factores por tipo de comisionado y pernocta.
 * - Genera desglose diario y redondeo a enteros (COP).
 * - Considera excepción regional Art. 5 cuando aplica.
 * - Utiliza caché en memoria TTL configurable para escalas, tarifas de investigadores y excepciones regionales.
 */
@Injectable()
export class LiquidationService {
  private readonly escalaCache = new Map<string, { data: EscalaViaticoEntity[]; expiry: number }>();
  private readonly investigadorCache = new Map<string, { data: TarifaInvestigadorEntity; expiry: number }>();
  private readonly regionalCache = new Map<string, { data: TarifaRegionalExcepcionEntity; expiry: number }>();
  private readonly paramsCache = new Map<string, { data: LiquidationParamEntity; expiry: number }>();
  private cacheTtlMs = 5 * 60 * 1000;

  constructor(
    @InjectRepository(EscalaViaticoEntity)
    private readonly escalaRepo: Repository<EscalaViaticoEntity>,
    @InjectRepository(TarifaInvestigadorEntity)
    private readonly investigadorRepo: Repository<TarifaInvestigadorEntity>,
    @InjectRepository(TarifaRegionalExcepcionEntity)
    private readonly regionalRepo: Repository<TarifaRegionalExcepcionEntity>,
    @InjectRepository(LiquidationParamEntity)
    private readonly paramRepo: Repository<LiquidationParamEntity>,
    private readonly dataSource: DataSource,
  ) {}

  private async obtenerParametro(clave: string, valorPorDefecto: string): Promise<string> {
    let param = getCached<LiquidationParamEntity>(this.paramsCache, clave);
    if (!param) {
      param = await this.paramRepo.findOne({ where: { clave } });
      if (!param) {
        return valorPorDefecto;
      }
      setCached(this.paramsCache, clave, param, this.cacheTtlMs);
    }
    return param.valor;
  }

  private async obtenerSMMLV(): Promise<number> {
    const valor = await this.obtenerParametro('SMMLV_2026', '1423500');
    return Number(valor);
  }

  private async obtenerFactorContratista(): Promise<number> {
    const valor = await this.obtenerParametro('FACTOR_CONTRATISTA', '0.8');
    return Number(valor);
  }

  private async obtenerFactorSinPernocta(): Promise<number> {
    const valor = await this.obtenerParametro('FACTOR_SIN_PERNOCTA', '0.5');
    return Number(valor);
  }

  async recargarParametros(): Promise<void> {
    this.paramsCache.clear();
    this.escalaCache.clear();
    this.investigadorCache.clear();
    this.regionalCache.clear();
  }

  private static parseFechaLocal(iso: string): Date {
    const [year, month, day] = iso.split('-').map(Number);
    return new Date(year, month - 1, day);
  }

  /**
   * Calcula la autoliquidación de viáticos para una comisión.
   *
   * @param dto Datos de entrada para el cálculo.
   * @returns Respuesta con el desglose completo del viático.
   * @throws BadRequestException Si las fechas son inválidas o no se encuentra escala/tarifa.
   */
  async calcularLiquidacion(dto: CalcularLiquidacionDto): Promise<LiquidacionResponseDto> {
    const fechaInicio = LiquidationService.parseFechaLocal(dto.fechaInicio);
    const fechaFin = LiquidationService.parseFechaLocal(dto.fechaFin);

    if (Number.isNaN(fechaInicio.getTime()) || Number.isNaN(fechaFin.getTime())) {
      throw new BadRequestException('Las fechas de inicio y fin son obligatorias y válidas.');
    }
    if (fechaFin < fechaInicio) {
      throw new BadRequestException('La fecha fin no puede ser anterior a la fecha inicio.');
    }

    const tipo = dto.tipoComisionado;
    const alertas: string[] = [];

    let salarioBaseAplicado = 0;
    let tarifaDiariaBase = 0;
    let decretoAplicado = 'Decreto 314 de 2026';

    if (tipo === TipoComisionadoLiquidacion.INVESTIGADOR) {
      if (!dto.categoriaInvestigador) {
        throw new BadRequestException('La categoría de investigador es obligatoria para tipo INVESTIGADOR.');
      }
      const tarifa = await this.obtenerTarifaInvestigador(dto.categoriaInvestigador);
      tarifaDiariaBase = Number(tarifa.tarifaDiaria);
      salarioBaseAplicado = tarifaDiariaBase;
    } else if (tipo === TipoComisionadoLiquidacion.ESTUDIANTE) {
      const smmlv = await this.obtenerSMMLV();
      salarioBaseAplicado = smmlv;
      const escala = await this.obtenerEscalaPorSalario(smmlv);
      tarifaDiariaBase = Number(escala.tarifaDiaria);
    } else {
      const asignaciones = dto.asignacionesBasicas && dto.asignacionesBasicas.length > 0
        ? dto.asignacionesBasicas
        : [0];
      salarioBaseAplicado = Math.max(...asignaciones);

      if (dto.aplicaExcepcionRegional && dto.destinoDepartamento) {
        const excepcion = await this.obtenerExcepcionRegional(dto.destinoDepartamento);
        if (excepcion && excepcion.activo) {
          tarifaDiariaBase = Number(excepcion.tarifaDiaria);
          decretoAplicado = excepcion.decretoReferencia || decretoAplicado;
        } else {
          const escala = await this.obtenerEscalaPorSalario(salarioBaseAplicado);
          tarifaDiariaBase = Number(escala.tarifaDiaria);
        }
      } else {
        const escala = await this.obtenerEscalaPorSalario(salarioBaseAplicado);
        tarifaDiariaBase = Number(escala.tarifaDiaria);
      }
    }

    const factorComisionado = await this.obtenerFactorComisionado(tipo);
    const factorPernocta = dto.pernocta ? 1.0 : await this.obtenerFactorSinPernocta();

    if (!dto.pernocta) {
      alertas.push('Comisión sin pernoctación: Se aplicará el 50% de la tarifa.');
    }

    const tarifaFinalAplicadaDia = Math.round(tarifaDiariaBase * factorComisionado * factorPernocta);
    const numeroDiasNoches = this.calcularDiasNoches(fechaInicio, fechaFin, dto.pernocta);
    const valorTotalViaticos = tarifaFinalAplicadaDia * numeroDiasNoches;
    const desglose = this.generarDesglose(fechaInicio, fechaFin, dto.pernocta, tarifaFinalAplicadaDia);

    return {
      success: true,
      data: {
        salarioBaseAplicado,
        decretoAplicado,
        tarifaDiariaBase,
        factorComisionado,
        factorPernocta,
        tarifaFinalAplicadaDia,
        numeroDiasNoches,
        valorTotalViaticos,
        desgloseCalculo: desglose,
        alertas: alertas.length > 0 ? alertas : undefined,
      },
    };
  }

  /**
   * Obtiene el factor multiplicador según el tipo de comisionado.
   * CONTRATISTA usa factor configurable, el resto aplica 1.0.
   */
  private async obtenerFactorComisionado(tipo: TipoComisionadoLiquidacion): Promise<number> {
    switch (tipo) {
      case TipoComisionadoLiquidacion.CONTRATISTA:
        return this.obtenerFactorContratista();
      default:
        return 1.0;
    }
  }

  /**
   * Calcula el número de días y noches de la comisión.
   * Sin pernocta retorna 1. Con pernocta retorna la diferencia en días.
   */
  private calcularDiasNoches(fechaInicio: Date, fechaFin: Date, pernocta: boolean): number {
    if (!pernocta) return 1;
    const diffMs = fechaFin.getTime() - fechaInicio.getTime();
    const diffDias = Math.round(diffMs / (1000 * 60 * 60 * 24));
    return Math.max(1, diffDias + 1);
  }

  /**
   * Genera el desglose diario de viáticos.
   * Sin pernocta genera un solo ítem. Con pernocta genera un ítem por cada noche.
   */
  private generarDesglose(
    fechaInicio: Date,
    fechaFin: Date,
    pernocta: boolean,
    valorDia: number,
  ): DesgloseDiaDto[] {
    const desglose: DesgloseDiaDto[] = [];
    if (!pernocta) {
      desglose.push({
        dia: 1,
        fecha: this.formatearFechaISO(fechaInicio),
        valor: valorDia,
        pernocta: false,
      });
      return desglose;
    }

    const diffMs = fechaFin.getTime() - fechaInicio.getTime();
    const diffDias = Math.round(diffMs / (1000 * 60 * 60 * 24));
    const noches = Math.max(1, diffDias + 1);

    for (let i = 0; i < noches; i++) {
      const fecha = new Date(fechaInicio);
      fecha.setDate(fecha.getDate() + i);
      desglose.push({
        dia: i + 1,
        fecha: this.formatearFechaISO(fecha),
        valor: valorDia,
        pernocta: true,
      });
    }
    return desglose;
  }

  /**
   * Formatea una fecha Date a string ISO (YYYY-MM-DD).
   */
  private formatearFechaISO(fecha: Date): string {
    const y = fecha.getFullYear();
    const m = String(fecha.getMonth() + 1).padStart(2, '0');
    const d = String(fecha.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  /**
   * Obtiene la escala de viáticos vigente para un salario base.
   * Usa caché en memoria TTL configurable.
   */
  private async obtenerEscalaPorSalario(salarioBase: number): Promise<EscalaViaticoEntity> {
    const anoVigencia = Number(await this.obtenerParametro('ANO_VIGENCIA_ESCALAS', '2026'));
    const cacheKey = `escalas_${anoVigencia}`;
    let escalas = getCached<EscalaViaticoEntity[]>(this.escalaCache, cacheKey);
    if (!escalas) {
      escalas = await this.escalaRepo.find({
        where: { anoVigencia },
        order: { rangoMinimo: 'ASC' },
      });
      if (escalas.length === 0) {
        throw new BadRequestException('No hay escalas de viáticos vigentes configuradas.');
      }
      setCached(this.escalaCache, cacheKey, escalas, this.cacheTtlMs);
    }

    const escala = escalas.find(
      (e) => salarioBase >= Number(e.rangoMinimo) && salarioBase <= Number(e.rangoMaximo),
    );

    if (!escala) {
      throw new BadRequestException(
        `No se encontró una escala de viáticos para el salario base ${salarioBase}.`,
      );
    }
    return escala;
  }

  /**
   * Obtiene la tarifa diaria para una categoría de investigador.
   * Usa caché en memoria TTL configurable.
   */
  private async obtenerTarifaInvestigador(categoria: CategoriaInvestigador): Promise<TarifaInvestigadorEntity> {
    const cacheKey = `investigador_${categoria.toUpperCase()}`;
    let tarifa = getCached<TarifaInvestigadorEntity>(this.investigadorCache, cacheKey);
    if (!tarifa) {
      tarifa = await this.investigadorRepo.findOne({
        where: { categoriaInvestigador: categoria.toUpperCase(), activo: true },
      });
      if (!tarifa) {
        throw new BadRequestException('No hay tarifas de investigadores configuradas.');
      }
      setCached(this.investigadorCache, cacheKey, tarifa, this.cacheTtlMs);
    }

    return tarifa;
  }

  /**
   * Obtiene la excepción regional activa para un departamento.
   * Usa caché en memoria TTL configurable.
   * Retorna null si no existe excepción para el departamento.
   */
  private async obtenerExcepcionRegional(departamento: string): Promise<TarifaRegionalExcepcionEntity | null> {
    const cacheKey = `regional_${departamento.toUpperCase()}`;
    let excepcion = getCached<TarifaRegionalExcepcionEntity>(this.regionalCache, cacheKey);
    if (!excepcion) {
      excepcion = await this.regionalRepo.findOne({
        where: { departamento: departamento.toUpperCase(), activo: true },
      });
      if (excepcion) {
        setCached(this.regionalCache, cacheKey, excepcion, this.cacheTtlMs);
      }
    }
    return excepcion || null;
  }
}
