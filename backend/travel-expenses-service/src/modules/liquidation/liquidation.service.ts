import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { EscalaViaticoEntity } from '../../entities/liquidation/escala-viatico.entity';
import { TarifaInvestigadorEntity } from '../../entities/liquidation/tarifa-investigador.entity';
import { TarifaTransporteTerminalEntity } from '../../entities/liquidation/tarifa-transporte-terminal.entity';
import { LiquidationParamEntity } from '../../entities/liquidation/liquidation-param.entity';
import { AuthSystemSettingEntity } from '../../entities/auth-system-setting.entity';
import { Optional } from '@nestjs/common';
import {
  CalcularLiquidacionDto,
  TipoComisionadoLiquidacion,
  CategoriaInvestigador,
} from '../../dto/liquidation/calcular-liquidacion.dto';
import {
  DesgloseDiaDto,
  LiquidacionResponseDto,
} from '../../dto/liquidation/liquidacion-response.dto';

function getCached<T>(
  cache: Map<string, { data: T; expiry: number }>,
  key: string,
): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiry) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

function setCached<T>(
  cache: Map<string, { data: T; expiry: number }>,
  key: string,
  data: T,
  ttlMs: number,
) {
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
  private readonly escalaCache = new Map<
    string,
    { data: EscalaViaticoEntity[]; expiry: number }
  >();
  private readonly investigadorCache = new Map<
    string,
    { data: TarifaInvestigadorEntity; expiry: number }
  >();
  private readonly terminalCache = new Map<
    string,
    { data: TarifaTransporteTerminalEntity[]; expiry: number }
  >();
  private readonly paramsCache = new Map<
    string,
    { data: LiquidationParamEntity; expiry: number }
  >();
  private cacheTtlMs = 5 * 60 * 1000;

  constructor(
    @InjectRepository(EscalaViaticoEntity)
    private readonly escalaRepo: Repository<EscalaViaticoEntity>,
    @InjectRepository(TarifaInvestigadorEntity)
    private readonly investigadorRepo: Repository<TarifaInvestigadorEntity>,
    @InjectRepository(TarifaTransporteTerminalEntity)
    private readonly terminalRepo: Repository<TarifaTransporteTerminalEntity>,
    @InjectRepository(LiquidationParamEntity)
    private readonly paramRepo: Repository<LiquidationParamEntity>,
    private readonly dataSource: DataSource,
    @Optional()
    @InjectRepository(AuthSystemSettingEntity)
    private readonly authSettingRepo?: Repository<AuthSystemSettingEntity>,
  ) {}

  private async obtenerParametro(
    clave: string,
    valorPorDefecto: string,
  ): Promise<string> {
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

  /**
   * Obtiene el Salario Mínimo Legal Vigente (SMMLV) desde el catálogo maestro
   * centralizado en auth.system_settings ('SALARIO_MINIMO_MENSUAL').
   * Si no estuviera disponible, utiliza el valor legal vigente por defecto (1.423.500 COP).
   */
  private async obtenerSMMLV(): Promise<number> {
    if (this.authSettingRepo) {
      try {
        const setting = await this.authSettingRepo.findOne({
          where: { key: 'SALARIO_MINIMO_MENSUAL' },
        });
        if (setting && setting.value) {
          let numericVal = 1423500;
          try {
            if (setting.value.trim().startsWith('{')) {
              const parsed = JSON.parse(setting.value);
              numericVal = Number(parsed.salarioMinimo) || 1423500;
            } else {
              numericVal = Number(setting.value) || 1423500;
            }
          } catch {
            numericVal = Number(setting.value) || 1423500;
          }
          if (numericVal > 0) {
            return numericVal;
          }
        }
      } catch {
        // En caso de contingencia continúa con el valor por defecto
      }
    }

    return 1423500;
  }

  private async obtenerFactorContratista(): Promise<number> {
    const valor = await this.obtenerParametro('FACTOR_CONTRATISTA', '0.8');
    return Number(valor);
  }

  private async obtenerFactorSinPernocta(): Promise<number> {
    const valor = await this.obtenerParametro('FACTOR_SIN_PERNOCTA', '0.5');
    return Number(valor);
  }

  async obtenerTarifaTerminalAereo(): Promise<number> {
    const valor = await this.obtenerParametro('TARIFA_TERMINAL_AEREO', '162634');
    return Number(valor);
  }

  async recargarParametros(): Promise<void> {
    this.paramsCache.clear();
    this.escalaCache.clear();
    this.investigadorCache.clear();
    this.terminalCache.clear();
  }

  async invalidarCache(): Promise<void> {
    await this.recargarParametros();
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
  async calcularLiquidacion(
    dto: CalcularLiquidacionDto,
  ): Promise<LiquidacionResponseDto> {
    const fechaInicio = LiquidationService.parseFechaLocal(dto.fechaInicio);
    const fechaFin = LiquidationService.parseFechaLocal(dto.fechaFin);

    if (
      Number.isNaN(fechaInicio.getTime()) ||
      Number.isNaN(fechaFin.getTime())
    ) {
      throw new BadRequestException(
        'Las fechas de inicio y fin son obligatorias y válidas.',
      );
    }
    if (fechaFin < fechaInicio) {
      throw new BadRequestException(
        'La fecha fin no puede ser anterior a la fecha inicio.',
      );
    }

    const tipo = dto.tipoComisionado;
    const alertas: string[] = [];

    let salarioBaseAplicado = 0;
    let tarifaDiariaBase = 0;
    let decretoAplicado = 'Decreto 314 de 2026';

    if (tipo === TipoComisionadoLiquidacion.INVESTIGADOR) {
      if (!dto.categoriaInvestigador) {
        throw new BadRequestException(
          'La categoría de investigador es obligatoria para tipo INVESTIGADOR.',
        );
      }
      const tarifa = await this.obtenerTarifaInvestigador(
        dto.categoriaInvestigador,
      );
      tarifaDiariaBase = Number(tarifa.tarifaDiaria);
      salarioBaseAplicado = tarifaDiariaBase;
    } else if (tipo === TipoComisionadoLiquidacion.ESTUDIANTE) {
      const smmlv = await this.obtenerSMMLV();
      salarioBaseAplicado = smmlv;
      const escala = await this.obtenerEscalaPorSalario(smmlv);
      tarifaDiariaBase = Number(escala.tarifaDiaria);
    } else {
      const asignaciones =
        dto.asignacionesBasicas && dto.asignacionesBasicas.length > 0
          ? dto.asignacionesBasicas
          : [0];
      salarioBaseAplicado = Math.max(...asignaciones);

      const escala = await this.obtenerEscalaPorSalario(salarioBaseAplicado);
      tarifaDiariaBase = Number(escala.tarifaDiaria);
    }

    const factorComisionado = await this.obtenerFactorComisionado(tipo);
    const factorPernocta = dto.pernocta
      ? 1.0
      : await this.obtenerFactorSinPernocta();

    if (!dto.pernocta) {
      alertas.push(
        'Comisión sin pernoctación: Se aplicará el 50% de la tarifa.',
      );
    }

    const tarifaDiaPernoctado = Math.round(tarifaDiariaBase * factorComisionado);
    const tarifaDiaNoPernoctado = Math.round(tarifaDiaPernoctado * 0.5);

    const tarifaFinalAplicadaDia = dto.pernocta
      ? tarifaDiaPernoctado
      : tarifaDiaNoPernoctado;

    const numeroDiasNoches = this.calcularDiasNoches(
      fechaInicio,
      fechaFin,
      dto.pernocta,
    );
    const desglose = this.generarDesglose(
      fechaInicio,
      fechaFin,
      dto.pernocta,
      tarifaFinalAplicadaDia,
    );
    const valorTotalViaticos = desglose.reduce(
      (acc, item) => acc + item.valor,
      0,
    );

    // Desglose según Formato GF-FO-023:
    // - Pernoctados: N noches completas al 100% de la tarifa del comisionado.
    // - No Pernoctados: 1 día al 50% de la tarifa (sea comisión de 1 solo día sin pernocta o el día de retorno con pernocta).
    let diasPernoctados = 0;
    let totalPernoctados = 0;
    let diasNoPernoctados = 0;
    let totalNoPernoctados = 0;

    if (!dto.pernocta) {
      diasPernoctados = 0;
      totalPernoctados = 0;
      diasNoPernoctados = 1;
      totalNoPernoctados = tarifaDiaNoPernoctado;
    } else {
      const diffMs = fechaFin.getTime() - fechaInicio.getTime();
      const diffDias = Math.max(0, Math.round(diffMs / (1000 * 60 * 60 * 24)));
      diasPernoctados = diffDias;
      totalPernoctados = diasPernoctados * tarifaDiaPernoctado;
      diasNoPernoctados = 1; // Medio día de regreso
      totalNoPernoctados = tarifaDiaNoPernoctado;
    }

    // Sección 4 GF-FO-023: Liquidación de los Gastos de Desplazamiento
    let transporteTerminalesAereos = 0;
    if (dto.itinerario && dto.itinerario.length > 0) {
      for (const tramo of dto.itinerario) {
        if (tramo.tipoTransporte === 'AEREO') {
          const tarifaTramo = await this.obtenerTarifaTerminal(
            tramo.destinoCiudad,
            tramo.destinoDepartamento,
            (tramo as any).destinoDepartamentoId,
          );
          const factorTrayecto = tramo.tipoTrayecto === 'IDA_Y_VUELTA' ? 2 : 1;
          transporteTerminalesAereos += tarifaTramo * factorTrayecto;
        }
      }
    } else if (dto.incluyeTransporteAereo) {
      transporteTerminalesAereos = await this.obtenerTarifaTerminal(
        dto.destinoCiudad,
        dto.destinoDepartamento,
      );
    }

    const transporteTerrestreFluvial = dto.montoTransporteTerrestre
      ? Math.round(dto.montoTransporteTerrestre)
      : 0;
    const totalGastosDesplazamiento =
      transporteTerminalesAereos + transporteTerrestreFluvial;
    const totalViaticosYDesplazamientos =
      valorTotalViaticos + totalGastosDesplazamiento;

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
        diasPernoctados,
        tarifaDiaPernoctado,
        totalPernoctados,
        diasNoPernoctados,
        tarifaDiaNoPernoctado,
        totalNoPernoctados,
        transporteTerminalesAereos,
        transporteTerrestreFluvial,
        totalGastosDesplazamiento,
        totalViaticosYDesplazamientos,
        desgloseCalculo: desglose,
        alertas: alertas.length > 0 ? alertas : undefined,
      },
    };
  }

  /**
   * Obtiene el factor multiplicador según el tipo de comisionado.
   * CONTRATISTA usa factor configurable, el resto aplica 1.0.
   */
  private async obtenerFactorComisionado(
    tipo: TipoComisionadoLiquidacion,
  ): Promise<number> {
    switch (tipo) {
      case TipoComisionadoLiquidacion.CONTRATISTA:
        return this.obtenerFactorContratista();
      default:
        return 1.0;
    }
  }

  /**
   * Calcula el número de días y noches de la comisión según el Formato GF-FO-023:
   * - Sin pernocta (mismo día): retorna 0.5 días (medio día liquidado al 50%).
   * - Con pernocta: se reconocen N noches completas (1.0 cada una)
   *   más 0.5 día por el retorno sin pernocta (ej: 01 al 02 = 1 noche + 0.5 = 1.5 días).
   */
  private calcularDiasNoches(
    fechaInicio: Date,
    fechaFin: Date,
    pernocta: boolean,
  ): number {
    if (!pernocta) return 0.5;
    const diffMs = fechaFin.getTime() - fechaInicio.getTime();
    const diffDias = Math.round(diffMs / (1000 * 60 * 60 * 24));
    if (diffDias <= 0) return 0.5;
    // N noches completas + 0.5 día de regreso
    return diffDias + 0.5;
  }

  /**
   * Genera el desglose diario de viáticos.
   * - Sin pernocta: genera un solo ítem al 50% de la tarifa.
   * - Con pernocta: genera N ítems con pernocta completa (100% tarifaDia)
   *   y 1 ítem final en la fecha de regreso con medio día (50% tarifaDia sin pernocta).
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

    if (diffDias <= 0) {
      desglose.push({
        dia: 1,
        fecha: this.formatearFechaISO(fechaInicio),
        valor: valorDia,
        pernocta: true,
      });
      return desglose;
    }

    // Días 1 a N con pernocta completa
    for (let i = 0; i < diffDias; i++) {
      const fecha = new Date(fechaInicio);
      fecha.setDate(fecha.getDate() + i);
      desglose.push({
        dia: i + 1,
        fecha: this.formatearFechaISO(fecha),
        valor: valorDia,
        pernocta: true,
      });
    }

    // Día N + 1: Día de retorno (medio día, sin pernocta, 50% de valorDia)
    const fechaRetorno = new Date(fechaInicio);
    fechaRetorno.setDate(fechaRetorno.getDate() + diffDias);
    desglose.push({
      dia: diffDias + 1,
      fecha: this.formatearFechaISO(fechaRetorno),
      valor: Math.round(valorDia * 0.5),
      pernocta: false,
    });

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
  private async obtenerEscalaPorSalario(
    salarioBase: number,
  ): Promise<EscalaViaticoEntity> {
    const anoVigencia = Number(
      await this.obtenerParametro('ANO_VIGENCIA_ESCALAS', '2026'),
    );
    const cacheKey = `escalas_${anoVigencia}`;
    let escalas = getCached<EscalaViaticoEntity[]>(this.escalaCache, cacheKey);
    if (!escalas) {
      escalas = await this.escalaRepo.find({
        where: { anoVigencia },
        order: { rangoMinimo: 'ASC' },
      });
      if (escalas.length === 0) {
        throw new BadRequestException(
          'No hay escalas de viáticos vigentes configuradas.',
        );
      }
      setCached(this.escalaCache, cacheKey, escalas, this.cacheTtlMs);
    }

    const escala = escalas.find(
      (e) =>
        salarioBase >= Number(e.rangoMinimo) &&
        salarioBase <= Number(e.rangoMaximo),
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
  private async obtenerTarifaInvestigador(
    categoria: CategoriaInvestigador,
  ): Promise<TarifaInvestigadorEntity> {
    const cacheKey = `investigador_${categoria.toUpperCase()}`;
    let tarifa = getCached<TarifaInvestigadorEntity>(
      this.investigadorCache,
      cacheKey,
    );
    if (!tarifa) {
      tarifa = await this.investigadorRepo.findOne({
        where: { categoriaInvestigador: categoria.toUpperCase(), activo: true },
      });
      if (!tarifa) {
        throw new BadRequestException(
          'No hay tarifas de investigadores configuradas.',
        );
      }
      setCached(this.investigadorCache, cacheKey, tarifa, this.cacheTtlMs);
    }

    return tarifa;
  }

  /**
   * Obtiene la tarifa máxima de transporte hacia terminal aérea según resolución (tabla oficial).
   * Busca por departamento o ciudad en la tabla travel_expenses.tarifas_transporte_terminal.
   * Si no se encuentra tarifa especial, retorna la tarifa para 'Otros' ($ 50.689).
   */
  async obtenerTarifaTerminal(
    ciudad?: string,
    departamento?: string,
    departamentoId?: number,
  ): Promise<number> {
    const cacheKey = 'all_tarifas_terminal';
    let tarifas = getCached<TarifaTransporteTerminalEntity[]>(
      this.terminalCache as any,
      cacheKey,
    );

    if (!tarifas) {
      tarifas = await this.terminalRepo.find({ where: { activo: true } });
      setCached(this.terminalCache as any, cacheKey, tarifas, this.cacheTtlMs);
    }

    if (!tarifas || tarifas.length === 0) {
      return 50689;
    }

    // 1. Coincidencia directa por ID de geopolítica si viene provisto
    if (departamentoId) {
      const matchPorId = tarifas.find(
        (t) => t.departamentoId === departamentoId && (t.departamento || t.ciudad)?.toLowerCase() !== 'otros',
      );
      if (matchPorId) {
        return Number(matchPorId.valorMaximo);
      }
    }

    const normalizar = (txt?: string): string =>
      (txt || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim();

    const deptoNorm = normalizar(departamento);
    const ciudadNorm = normalizar(ciudad);

    // 2. Mapeo inteligente con los términos de cada departamento/ciudad/aeropuerto
    const match = tarifas.find((t) => {
      const tDepto = normalizar(t.departamento || t.ciudad);
      const tCiudad = normalizar(t.ciudad);
      const tAeropuerto = normalizar(t.ciudadAeropuerto);
      if (tDepto === 'otros' || tCiudad === 'otros') return false;

      // Coincidencia con departamento
      if (deptoNorm && (tDepto === deptoNorm || tDepto.includes(deptoNorm) || deptoNorm.includes(tDepto))) {
        return true;
      }
      // Coincidencia con ciudad o aeropuerto
      if (ciudadNorm && (tDepto.includes(ciudadNorm) || tCiudad.includes(ciudadNorm) || tAeropuerto.includes(ciudadNorm) || ciudadNorm.includes(tCiudad))) {
        return true;
      }
      // Ciudades clave reconocidas en aeropuertos especiales
      if (deptoNorm.includes('antioquia') || ciudadNorm.includes('medellin') || ciudadNorm.includes('rionegro')) {
        return tDepto.includes('antioquia') || tCiudad.includes('antioquia');
      }
      if (deptoNorm.includes('atlantico') || ciudadNorm.includes('barranquilla') || ciudadNorm.includes('soledad')) {
        return tDepto.includes('atlantico') || tCiudad.includes('atlantico');
      }
      if (deptoNorm.includes('cordoba') || ciudadNorm.includes('monteria') || ciudadNorm.includes('garzones')) {
        return tDepto.includes('cordoba') || tCiudad.includes('cordoba');
      }
      if (deptoNorm.includes('magdalena') || ciudadNorm.includes('santa marta')) {
        return tDepto.includes('magdalena') || tCiudad.includes('magdalena');
      }
      if (deptoNorm.includes('narino') || ciudadNorm.includes('pasto') || ciudadNorm.includes('chachagui')) {
        return tDepto.includes('narino') || tCiudad.includes('narino');
      }
      if (deptoNorm.includes('putumayo') || ciudadNorm.includes('puerto asis')) {
        return tDepto.includes('putumayo') || tCiudad.includes('putumayo');
      }
      if (deptoNorm.includes('quindio') || ciudadNorm.includes('armenia') || ciudadNorm.includes('tebaida')) {
        return tDepto.includes('quindio') || tCiudad.includes('quindio');
      }
      if (deptoNorm.includes('santander') || ciudadNorm.includes('bucaramanga') || ciudadNorm.includes('lebrija')) {
        return tDepto.includes('santander') || tCiudad.includes('santander');
      }
      if (deptoNorm.includes('sucre') || ciudadNorm.includes('sincelejo') || ciudadNorm.includes('corozal')) {
        return tDepto.includes('sucre') || tCiudad.includes('sucre');
      }
      if (deptoNorm.includes('valle') || ciudadNorm.includes('cali') || ciudadNorm.includes('palmira')) {
        return tDepto.includes('valle') || tCiudad.includes('valle');
      }
      return false;
    });

    if (match) {
      return Number(match.valorMaximo);
    }

    // Buscar la fila "Otros"
    const otros = tarifas.find((t) => normalizar(t.departamento || t.ciudad).includes('otros'));
    return otros ? Number(otros.valorMaximo) : 50689;
  }
}
