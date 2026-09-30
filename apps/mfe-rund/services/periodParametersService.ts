/**
 * Servicio de Parámetros de Período - ESAP PTA
 * Gestiona la configuración de periodicidad (semestral/anual) del sistema
 */

import {
  ParametroPeriodo,
  ConfiguracionPeriodo,
  HORAS_SEMESTRAL,
  HORAS_ANUAL,
  TipoPeriodo,
  RANGOS_SEMESTRAL,
  RANGOS_ANUAL,
  RangosComponente,
} from '../types/periodParameters';

const STORAGE_KEY = 'esap_parametros_periodo';

class PeriodParametersService {
  /**
   * Obtiene el parámetro de período activo
   */
  getParametroActivo(): ParametroPeriodo | null {
    const config = this.getConfiguracion();
    return config.parametroActivo;
  }

  /**
   * Obtiene toda la configuración de períodos
   */
  getConfiguracion(): ConfiguracionPeriodo {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const config: ConfiguracionPeriodo = JSON.parse(stored);
      // Convertir strings a Date
      if (config.parametroActivo) {
        config.parametroActivo.fechaInicio = new Date(config.parametroActivo.fechaInicio);
        config.parametroActivo.fechaFin = new Date(config.parametroActivo.fechaFin);
        config.parametroActivo.fechaCreacion = new Date(config.parametroActivo.fechaCreacion);
        if (config.parametroActivo.fechaModificacion) {
          config.parametroActivo.fechaModificacion = new Date(config.parametroActivo.fechaModificacion);
        }
      }
      config.historicoParametros = config.historicoParametros.map(p => ({
        ...p,
        fechaInicio: new Date(p.fechaInicio),
        fechaFin: new Date(p.fechaFin),
        fechaCreacion: new Date(p.fechaCreacion),
        fechaModificacion: p.fechaModificacion ? new Date(p.fechaModificacion) : undefined,
      }));
      return config;
    }

    // Configuración por defecto: Semestral 2025-1
    const parametroDefault: ParametroPeriodo = {
      id: crypto.randomUUID(),
      tipoPeriodo: 'SEMESTRAL',
      horasTotales: HORAS_SEMESTRAL,
      periodoAcademico: '2025-1',
      fechaInicio: new Date('2025-02-01'),
      fechaFin: new Date('2025-06-30'),
      activo: true,
      descripcion: 'Período semestral 2025-1 (Configuración por defecto)',
      creadoPor: 'Sistema',
      fechaCreacion: new Date(),
    };

    const configDefault: ConfiguracionPeriodo = {
      parametroActivo: parametroDefault,
      historicoParametros: [parametroDefault],
    };

    this.saveConfiguracion(configDefault);
    return configDefault;
  }

  /**
   * Crea un nuevo parámetro de período
   */
  crearParametro(
    tipoPeriodo: TipoPeriodo,
    periodoAcademico: string,
    fechaInicio: Date,
    fechaFin: Date,
    descripcion: string,
    usuario: string
  ): ParametroPeriodo {
    const config = this.getConfiguracion();

    // Desactivar parámetro anterior
    if (config.parametroActivo) {
      config.parametroActivo.activo = false;
    }

    const nuevoParametro: ParametroPeriodo = {
      id: crypto.randomUUID(),
      tipoPeriodo,
      horasTotales: tipoPeriodo === 'SEMESTRAL' ? HORAS_SEMESTRAL : HORAS_ANUAL,
      periodoAcademico,
      fechaInicio,
      fechaFin,
      activo: true,
      descripcion,
      creadoPor: usuario,
      fechaCreacion: new Date(),
    };

    config.parametroActivo = nuevoParametro;
    config.historicoParametros.push(nuevoParametro);

    this.saveConfiguracion(config);
    return nuevoParametro;
  }

  /**
   * Actualiza un parámetro existente
   */
  actualizarParametro(
    id: string,
    datos: Partial<ParametroPeriodo>,
    usuario: string
  ): ParametroPeriodo | null {
    const config = this.getConfiguracion();
    const index = config.historicoParametros.findIndex(p => p.id === id);

    if (index === -1) return null;

    const parametroActualizado = {
      ...config.historicoParametros[index],
      ...datos,
      modificadoPor: usuario,
      fechaModificacion: new Date(),
    };

    config.historicoParametros[index] = parametroActualizado;

    if (parametroActualizado.activo) {
      config.parametroActivo = parametroActualizado;
    }

    this.saveConfiguracion(config);
    return parametroActualizado;
  }

  /**
   * Obtiene las horas totales del período activo
   */
  getHorasTotales(): number {
    const parametro = this.getParametroActivo();
    return parametro?.horasTotales || HORAS_SEMESTRAL;
  }

  /**
   * Obtiene el tipo de período activo
   */
  getTipoPeriodo(): TipoPeriodo {
    const parametro = this.getParametroActivo();
    return parametro?.tipoPeriodo || 'SEMESTRAL';
  }

  /**
   * Obtiene los rangos según el período activo
   */
  getRangosComponente(): RangosComponente {
    const tipoPeriodo = this.getTipoPeriodo();
    return tipoPeriodo === 'SEMESTRAL' ? RANGOS_SEMESTRAL : RANGOS_ANUAL;
  }

  /**
   * Obtiene el período académico activo
   */
  getPeriodoAcademicoActivo(): string {
    const parametro = this.getParametroActivo();
    return parametro?.periodoAcademico || '2025-1';
  }

  /**
   * Valida si una fecha está dentro del período activo
   */
  validarFechaEnPeriodo(fecha: Date): boolean {
    const parametro = this.getParametroActivo();
    if (!parametro) return false;

    return fecha >= parametro.fechaInicio && fecha <= parametro.fechaFin;
  }

  /**
   * Obtiene el histórico de parámetros
   */
  getHistorico(): ParametroPeriodo[] {
    const config = this.getConfiguracion();
    return config.historicoParametros.sort((a, b) => 
      b.fechaCreacion.getTime() - a.fechaCreacion.getTime()
    );
  }

  /**
   * Guarda la configuración en localStorage
   */
  private saveConfiguracion(config: ConfiguracionPeriodo): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  }

  /**
   * Resetea a configuración por defecto (solo para desarrollo)
   */
  resetToDefault(): void {
    localStorage.removeItem(STORAGE_KEY);
    this.getConfiguracion(); // Esto recreará la configuración por defecto
  }
}

export const periodParametersService = new PeriodParametersService();
