/**
 * SERVICIO: Sincronización de Situaciones Administrativas
 * 
 * Sincronización bidireccional entre el módulo de Personas y el sistema PTA
 * para situaciones administrativas (licencias, comisiones, incapacidades, etc.)
 * 
 * Versión: 1.0.0
 * Fecha: 2026-01-03
 */

import { personasPTAIntegrationService } from './personasPTAIntegrationService';
import type { DocentePTA, SituacionAdministrativa } from '../types/integracion-personas-pta';
import { ptaPersonasService } from './ptaPersonasService';

// ============================================================================
// TIPOS
// ============================================================================

interface SituacionPersonas {
  id: string;
  personId: string;
  tipo: 'licencia' | 'comision' | 'incapacidad' | 'permiso' | 'suspension';
  descripcion: string;
  fechaInicio: string;
  fechaFin: string;
  estado: 'activa' | 'finalizada' | 'cancelada';
  afectaCargaAcademica: boolean;
  horasAfectadas?: number;
  documentoSoporte?: string;
  aprobadaPor?: string;
  fechaRegistro: string;
  observaciones?: string;
}

interface SituacionPTA {
  id: string;
  ptaId: string;
  personId: string;
  tipo: 'licencia' | 'comision' | 'incapacidad' | 'permiso' | 'suspension';
  descripcion: string;
  fechaInicio: string;
  fechaFin: string;
  horasAjustadas: number;
  componenteAfectado: 'docencia' | 'investigacion' | 'extension' | 'complementarias' | 'todas';
  registradaPor: string;
  fechaRegistro: string;
  sincronizadaConPersonas: boolean;
  ultimaSincronizacion?: string;
}

interface ResultadoSincronizacion {
  exito: boolean;
  situacionesCreadas: number;
  situacionesActualizadas: number;
  situacionesEliminadas: number;
  errores: string[];
  detalles: {
    personasAPTA: SituacionPTA[];
    ptaAPersonas: SituacionPersonas[];
  };
}

interface DiferenciaSituacion {
  tipo: 'nueva_en_personas' | 'nueva_en_pta' | 'actualizada_en_personas' | 'actualizada_en_pta' | 'conflicto';
  situacionPersonas?: SituacionPersonas;
  situacionPTA?: SituacionPTA;
  accionRecomendada: 'crear_en_pta' | 'crear_en_personas' | 'actualizar_pta' | 'actualizar_personas' | 'resolver_manual';
}

// ============================================================================
// CLASE DEL SERVICIO
// ============================================================================

class SincronizacionSituacionesService {
  // Caché de situaciones sincronizadas recientemente
  private ultimasSincronizaciones = new Map<string, Date>();
  
  // Intervalo mínimo entre sincronizaciones (5 minutos)
  private readonly INTERVALO_MIN_SYNC = 5 * 60 * 1000;

  // ==========================================================================
  // SINCRONIZACIÓN PRINCIPAL
  // ==========================================================================

  /**
   * Sincronizar situaciones administrativas de una persona
   */
  async sincronizarSituaciones(personId: string): Promise<ResultadoSincronizacion> {
    console.log(`[SincronizacionSituaciones] Iniciando sincronización para persona: ${personId}`);

    try {
      // Verificar si necesita sincronización
      if (!this.necesitaSincronizacion(personId)) {
        console.log(`[SincronizacionSituaciones] Sincronización reciente, omitiendo`);
        return this.crearResultadoVacio();
      }

      // 1. Obtener situaciones del módulo de Personas
      const situacionesPersonas = await this.obtenerSituacionesPersonas(personId);
      console.log(`[SincronizacionSituaciones] Situaciones en Personas: ${situacionesPersonas.length}`);

      // 2. Obtener situaciones del PTA
      const situacionesPTA = await this.obtenerSituacionesPTA(personId);
      console.log(`[SincronizacionSituaciones] Situaciones en PTA: ${situacionesPTA.length}`);

      // 3. Comparar y detectar diferencias
      const diferencias = this.compararSituaciones(situacionesPersonas, situacionesPTA);
      console.log(`[SincronizacionSituaciones] Diferencias detectadas: ${diferencias.length}`);

      // 4. Aplicar cambios
      const resultado = await this.aplicarCambios(personId, diferencias);

      // 5. Registrar sincronización exitosa
      this.ultimasSincronizaciones.set(personId, new Date());

      console.log(`[SincronizacionSituaciones] Sincronización completada:`, resultado);
      return resultado;
    } catch (error: any) {
      console.error(`[SincronizacionSituaciones] Error en sincronización:`, error);
      return {
        exito: false,
        situacionesCreadas: 0,
        situacionesActualizadas: 0,
        situacionesEliminadas: 0,
        errores: [error.message || 'Error desconocido'],
        detalles: {
          personasAPTA: [],
          ptaAPersonas: []
        }
      };
    }
  }

  /**
   * Verificar si una persona necesita sincronización
   */
  private necesitaSincronizacion(personId: string): boolean {
    const ultimaSync = this.ultimasSincronizaciones.get(personId);
    
    if (!ultimaSync) return true;
    
    const tiempoTranscurrido = Date.now() - ultimaSync.getTime();
    return tiempoTranscurrido >= this.INTERVALO_MIN_SYNC;
  }

  /**
   * Forzar sincronización (ignorar intervalo mínimo)
   */
  async forzarSincronizacion(personId: string): Promise<ResultadoSincronizacion> {
    this.ultimasSincronizaciones.delete(personId);
    return this.sincronizarSituaciones(personId);
  }

  // ==========================================================================
  // OBTENCIÓN DE DATOS
  // ==========================================================================

  /**
   * Obtener situaciones del módulo de Personas
   */
  private async obtenerSituacionesPersonas(personId: string): Promise<SituacionPersonas[]> {
    // TODO: En producción, esto debería llamar a la API del módulo de Personas
    // Por ahora, simulamos con datos mock
    
    const docente = personasPTAIntegrationService.buscarDocente({ personId });
    
    if (!docente || !docente.situacionesAdministrativas) {
      return [];
    }

    // Convertir SituacionAdministrativa a SituacionPersonas
    return docente.situacionesAdministrativas.map(sit => ({
      id: `sit-personas-${Math.random().toString(36).substr(2, 9)}`,
      personId,
      tipo: sit.tipo,
      descripcion: sit.descripcion,
      fechaInicio: sit.fechaInicio,
      fechaFin: sit.fechaFin,
      estado: sit.estado,
      afectaCargaAcademica: sit.afectaCargaAcademica,
      horasAfectadas: sit.horasAfectadas,
      documentoSoporte: sit.documentoSoporte,
      aprobadaPor: sit.aprobadaPor,
      fechaRegistro: sit.fechaInicio,
      observaciones: sit.observaciones
    }));
  }

  /**
   * Obtener situaciones del PTA
   */
  private async obtenerSituacionesPTA(personId: string): Promise<SituacionPTA[]> {
    // TODO: En producción, esto debería obtener desde la BD del PTA
    // Por ahora, retornamos array vacío ya que aún no tenemos BD
    return [];
  }

  // ==========================================================================
  // COMPARACIÓN Y DETECCIÓN DE DIFERENCIAS
  // ==========================================================================

  /**
   * Comparar situaciones entre Personas y PTA
   */
  private compararSituaciones(
    situacionesPersonas: SituacionPersonas[],
    situacionesPTA: SituacionPTA[]
  ): DiferenciaSituacion[] {
    const diferencias: DiferenciaSituacion[] = [];

    // 1. Buscar situaciones nuevas en Personas que no están en PTA
    for (const sitPersonas of situacionesPersonas) {
      // Solo sincronizar situaciones activas que afectan carga académica
      if (sitPersonas.estado !== 'activa' || !sitPersonas.afectaCargaAcademica) {
        continue;
      }

      const existeEnPTA = situacionesPTA.some(sitPTA => 
        this.sonLaMismaSituacion(sitPersonas, sitPTA)
      );

      if (!existeEnPTA) {
        diferencias.push({
          tipo: 'nueva_en_personas',
          situacionPersonas: sitPersonas,
          accionRecomendada: 'crear_en_pta'
        });
      }
    }

    // 2. Buscar situaciones en PTA que ya no existen o cambiaron en Personas
    for (const sitPTA of situacionesPTA) {
      const sitPersonasCorrespondiente = situacionesPersonas.find(sitPersonas =>
        this.sonLaMismaSituacion(sitPersonas, sitPTA)
      );

      if (!sitPersonasCorrespondiente) {
        // Situación eliminada en Personas o nunca existió
        diferencias.push({
          tipo: 'nueva_en_pta',
          situacionPTA: sitPTA,
          accionRecomendada: 'resolver_manual' // Requiere revisión
        });
      } else if (this.situacionActualizada(sitPersonasCorrespondiente, sitPTA)) {
        // Situación actualizada en Personas
        diferencias.push({
          tipo: 'actualizada_en_personas',
          situacionPersonas: sitPersonasCorrespondiente,
          situacionPTA: sitPTA,
          accionRecomendada: 'actualizar_pta'
        });
      }
    }

    return diferencias;
  }

  /**
   * Verificar si dos situaciones son la misma
   */
  private sonLaMismaSituacion(sitPersonas: SituacionPersonas, sitPTA: SituacionPTA): boolean {
    return (
      sitPersonas.tipo === sitPTA.tipo &&
      sitPersonas.fechaInicio === sitPTA.fechaInicio &&
      sitPersonas.personId === sitPTA.personId
    );
  }

  /**
   * Verificar si una situación fue actualizada
   */
  private situacionActualizada(sitPersonas: SituacionPersonas, sitPTA: SituacionPTA): boolean {
    return (
      sitPersonas.fechaFin !== sitPTA.fechaFin ||
      sitPersonas.descripcion !== sitPTA.descripcion ||
      sitPersonas.horasAfectadas !== sitPTA.horasAjustadas
    );
  }

  // ==========================================================================
  // APLICACIÓN DE CAMBIOS
  // ==========================================================================

  /**
   * Aplicar cambios detectados
   */
  private async aplicarCambios(
    personId: string,
    diferencias: DiferenciaSituacion[]
  ): Promise<ResultadoSincronizacion> {
    const resultado: ResultadoSincronizacion = {
      exito: true,
      situacionesCreadas: 0,
      situacionesActualizadas: 0,
      situacionesEliminadas: 0,
      errores: [],
      detalles: {
        personasAPTA: [],
        ptaAPersonas: []
      }
    };

    for (const diferencia of diferencias) {
      try {
        switch (diferencia.accionRecomendada) {
          case 'crear_en_pta':
            await this.crearSituacionEnPTA(diferencia.situacionPersonas!);
            resultado.situacionesCreadas++;
            resultado.detalles.personasAPTA.push(
              this.convertirPersonasAPTA(diferencia.situacionPersonas!, personId)
            );
            break;

          case 'actualizar_pta':
            await this.actualizarSituacionEnPTA(diferencia.situacionPTA!, diferencia.situacionPersonas!);
            resultado.situacionesActualizadas++;
            break;

          case 'resolver_manual':
            resultado.errores.push(
              `Situación requiere revisión manual: ${diferencia.situacionPTA?.descripcion || 'Sin descripción'}`
            );
            break;
        }
      } catch (error: any) {
        resultado.errores.push(error.message || 'Error al aplicar cambio');
        resultado.exito = false;
      }
    }

    return resultado;
  }

  /**
   * Crear situación en PTA desde Personas
   */
  private async crearSituacionEnPTA(situacion: SituacionPersonas): Promise<void> {
    console.log(`[SincronizacionSituaciones] Creando situación en PTA:`, situacion);
    
    // TODO: En producción, guardar en BD
    // Por ahora solo registramos en consola
    
    // Registrar en auditoría
    this.registrarAuditoria('crear', situacion.personId, {
      tipo: situacion.tipo,
      descripcion: situacion.descripcion,
      fechas: `${situacion.fechaInicio} - ${situacion.fechaFin}`,
      horasAfectadas: situacion.horasAfectadas
    });
  }

  /**
   * Actualizar situación en PTA
   */
  private async actualizarSituacionEnPTA(
    situacionPTA: SituacionPTA,
    situacionPersonas: SituacionPersonas
  ): Promise<void> {
    console.log(`[SincronizacionSituaciones] Actualizando situación en PTA:`, situacionPTA.id);
    
    // TODO: En producción, actualizar en BD
    
    // Registrar en auditoría
    this.registrarAuditoria('actualizar', situacionPTA.personId, {
      situacionId: situacionPTA.id,
      cambios: {
        fechaFin: { antes: situacionPTA.fechaFin, despues: situacionPersonas.fechaFin },
        horasAjustadas: { antes: situacionPTA.horasAjustadas, despues: situacionPersonas.horasAfectadas }
      }
    });
  }

  /**
   * Convertir SituacionPersonas a SituacionPTA
   */
  private convertirPersonasAPTA(situacion: SituacionPersonas, personId: string): SituacionPTA {
    return {
      id: `sit-pta-${Math.random().toString(36).substr(2, 9)}`,
      ptaId: '', // Se asignará cuando se cree el PTA
      personId,
      tipo: situacion.tipo,
      descripcion: situacion.descripcion,
      fechaInicio: situacion.fechaInicio,
      fechaFin: situacion.fechaFin,
      horasAjustadas: situacion.horasAfectadas || 0,
      componenteAfectado: this.determinarComponenteAfectado(situacion.tipo),
      registradaPor: 'sistema',
      fechaRegistro: new Date().toISOString(),
      sincronizadaConPersonas: true,
      ultimaSincronizacion: new Date().toISOString()
    };
  }

  /**
   * Determinar qué componente del PTA se ve afectado según el tipo de situación
   */
  private determinarComponenteAfectado(
    tipo: SituacionPersonas['tipo']
  ): SituacionPTA['componenteAfectado'] {
    switch (tipo) {
      case 'licencia':
      case 'incapacidad':
      case 'suspension':
        return 'todas'; // Afecta todo el PTA
      case 'comision':
        return 'docencia'; // Generalmente afecta docencia
      case 'permiso':
        return 'complementarias'; // Afecta actividades complementarias
      default:
        return 'todas';
    }
  }

  // ==========================================================================
  // OPERACIONES ESPECÍFICAS
  // ==========================================================================

  /**
   * Registrar una nueva situación desde el PTA
   */
  async registrarSituacionDesdePTA(
    personId: string,
    ptaId: string,
    situacion: Omit<SituacionPTA, 'id' | 'personId' | 'ptaId' | 'fechaRegistro' | 'sincronizadaConPersonas'>
  ): Promise<{ exito: boolean; situacionId?: string; error?: string }> {
    try {
      console.log(`[SincronizacionSituaciones] Registrando situación desde PTA:`, situacion);

      // Crear situación en PTA
      const nuevaSituacion: SituacionPTA = {
        ...situacion,
        id: `sit-pta-${Date.now()}`,
        personId,
        ptaId,
        fechaRegistro: new Date().toISOString(),
        sincronizadaConPersonas: false // Aún no sincronizada
      };

      // TODO: Guardar en BD
      console.log(`[SincronizacionSituaciones] Situación creada:`, nuevaSituacion.id);

      // Intentar sincronizar con Personas
      await this.sincronizarSituacionConPersonas(nuevaSituacion);

      return {
        exito: true,
        situacionId: nuevaSituacion.id
      };
    } catch (error: any) {
      console.error(`[SincronizacionSituaciones] Error al registrar situación:`, error);
      return {
        exito: false,
        error: error.message || 'Error al registrar situación'
      };
    }
  }

  /**
   * Sincronizar una situación del PTA con Personas
   */
  private async sincronizarSituacionConPersonas(situacion: SituacionPTA): Promise<void> {
    console.log(`[SincronizacionSituaciones] Sincronizando situación con Personas:`, situacion.id);
    
    // TODO: En producción, llamar a la API del módulo de Personas
    // para registrar o actualizar la situación
    
    // Por ahora solo registramos en auditoría
    this.registrarAuditoria('sincronizar_con_personas', situacion.personId, {
      situacionId: situacion.id,
      tipo: situacion.tipo,
      fechas: `${situacion.fechaInicio} - ${situacion.fechaFin}`
    });
  }

  /**
   * Calcular impacto de situaciones en horas programables
   */
  calcularImpactoEnHoras(
    personId: string,
    fechaInicio: string,
    fechaFin: string
  ): {
    horasAfectadas: number;
    porcentajeAfectado: number;
    componentesAfectados: string[];
  } {
    // Obtener docente
    const docente = personasPTAIntegrationService.buscarDocente({ personId });
    
    if (!docente) {
      return {
        horasAfectadas: 0,
        porcentajeAfectado: 0,
        componentesAfectados: []
      };
    }

    // Calcular días afectados
    const inicio = new Date(fechaInicio);
    const fin = new Date(fechaFin);
    const diasAfectados = Math.ceil((fin.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24));

    // Calcular horas por día
    const horasPorDia = docente.horasProgramables / 180; // Asumiendo semestre de 6 meses (180 días)
    const horasAfectadas = Math.round(horasPorDia * diasAfectados);

    const porcentajeAfectado = (horasAfectadas / docente.horasProgramables) * 100;

    return {
      horasAfectadas,
      porcentajeAfectado,
      componentesAfectados: ['docencia', 'investigacion', 'extension', 'complementarias']
    };
  }

  // ==========================================================================
  // AUDITORÍA Y UTILIDADES
  // ==========================================================================

  /**
   * Registrar operación en auditoría
   */
  private registrarAuditoria(
    operacion: string,
    personId: string,
    datos: any
  ): void {
    const registro = {
      id: `audit-${Date.now()}`,
      fecha: new Date().toISOString(),
      operacion: `sincronizacion_situaciones:${operacion}`,
      personId,
      datos,
      origen: 'sincronizacionSituaciones'
    };

    console.log(`[Auditoría]`, registro);
    
    // TODO: En producción, guardar en BD de auditoría
  }

  /**
   * Crear resultado vacío
   */
  private crearResultadoVacio(): ResultadoSincronizacion {
    return {
      exito: true,
      situacionesCreadas: 0,
      situacionesActualizadas: 0,
      situacionesEliminadas: 0,
      errores: [],
      detalles: {
        personasAPTA: [],
        ptaAPersonas: []
      }
    };
  }

  /**
   * Obtener estadísticas de sincronización
   */
  obtenerEstadisticas(): {
    personasSincronizadas: number;
    ultimaSincronizacion: Date | null;
  } {
    const personasSincronizadas = this.ultimasSincronizaciones.size;
    let ultimaSincronizacion: Date | null = null;

    this.ultimasSincronizaciones.forEach(fecha => {
      if (!ultimaSincronizacion || fecha > ultimaSincronizacion) {
        ultimaSincronizacion = fecha;
      }
    });

    return {
      personasSincronizadas,
      ultimaSincronizacion
    };
  }

  /**
   * Limpiar historial de sincronizaciones
   */
  limpiarHistorial(): void {
    this.ultimasSincronizaciones.clear();
  }
}

// ============================================================================
// INSTANCIA SINGLETON
// ============================================================================

export const sincronizacionSituacionesService = new SincronizacionSituacionesService();

// ============================================================================
// EXPORTACIONES
// ============================================================================

export default sincronizacionSituacionesService;
export type {
  SituacionPersonas,
  SituacionPTA,
  ResultadoSincronizacion,
  DiferenciaSituacion
};
