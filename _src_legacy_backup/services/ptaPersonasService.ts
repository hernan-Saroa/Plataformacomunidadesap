/**
 * SERVICIO: PTAs con Integración de Personas
 * 
 * Servicio que gestiona PTAs vinculados al módulo de Personas,
 * incluyendo caché de docentes para optimizar rendimiento.
 * 
 * Versión: 1.0.0
 * Fecha: 2026-01-03
 */

import { personasPTAIntegrationService } from './personasPTAIntegrationService';
import type { DocentePTA, RutaAprobacion } from '../types/integracion-personas-pta';
import type { PTAData } from '../contexts/PTAContext';

// ============================================================================
// TIPOS
// ============================================================================

interface PTAConDocente extends PTAData {
  docenteInfo: DocentePTA;
  rutaAprobacion?: RutaAprobacion;
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

// ============================================================================
// CONFIGURACIÓN DE CACHÉ
// ============================================================================

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos
const MAX_CACHE_SIZE = 100; // Máximo de elementos en caché

// ============================================================================
// CLASE DEL SERVICIO
// ============================================================================

class PTAPersonasService {
  // Caché de docentes
  private docentesCache = new Map<string, CacheEntry<DocentePTA>>();
  
  // Caché de rutas de aprobación
  private rutasAprobacionCache = new Map<string, CacheEntry<RutaAprobacion>>();
  
  // Caché de PTAs
  private ptasCache = new Map<string, CacheEntry<PTAConDocente>>();

  // ==========================================================================
  // GESTIÓN DE CACHÉ
  // ==========================================================================

  /**
   * Limpiar entradas expiradas del caché
   */
  private limpiarCacheExpirado<T>(cache: Map<string, CacheEntry<T>>): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    cache.forEach((entry, key) => {
      if (entry.expiresAt < now) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach(key => cache.delete(key));
  }

  /**
   * Limitar tamaño del caché (eliminar más antiguos)
   */
  private limitarTamanoCache<T>(cache: Map<string, CacheEntry<T>>): void {
    if (cache.size > MAX_CACHE_SIZE) {
      // Ordenar por timestamp y eliminar los más antiguos
      const entries = Array.from(cache.entries());
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      
      const toDelete = entries.slice(0, entries.length - MAX_CACHE_SIZE);
      toDelete.forEach(([key]) => cache.delete(key));
    }
  }

  /**
   * Obtener del caché
   */
  private obtenerDeCache<T>(
    cache: Map<string, CacheEntry<T>>,
    key: string
  ): T | null {
    const entry = cache.get(key);
    
    if (!entry) return null;
    
    // Verificar si expiró
    if (entry.expiresAt < Date.now()) {
      cache.delete(key);
      return null;
    }
    
    return entry.data;
  }

  /**
   * Guardar en caché
   */
  private guardarEnCache<T>(
    cache: Map<string, CacheEntry<T>>,
    key: string,
    data: T,
    duration: number = CACHE_DURATION
  ): void {
    const now = Date.now();
    
    cache.set(key, {
      data,
      timestamp: now,
      expiresAt: now + duration
    });
    
    // Limpiar caché periódicamente
    this.limpiarCacheExpirado(cache);
    this.limitarTamanoCache(cache);
  }

  /**
   * Invalidar caché
   */
  invalidarCache(tipo?: 'docentes' | 'rutas' | 'ptas' | 'all'): void {
    switch (tipo) {
      case 'docentes':
        this.docentesCache.clear();
        break;
      case 'rutas':
        this.rutasAprobacionCache.clear();
        break;
      case 'ptas':
        this.ptasCache.clear();
        break;
      case 'all':
      default:
        this.docentesCache.clear();
        this.rutasAprobacionCache.clear();
        this.ptasCache.clear();
        break;
    }
  }

  // ==========================================================================
  // OPERACIONES CON DOCENTES (CON CACHÉ)
  // ==========================================================================

  /**
   * Obtener docente por personId (con caché)
   */
  obtenerDocente(personId: string): DocentePTA | null {
    // Intentar obtener del caché
    const cached = this.obtenerDeCache(this.docentesCache, personId);
    if (cached) {
      console.log(`[PTAPersonasService] Docente ${personId} obtenido del caché`);
      return cached;
    }

    // Si no está en caché, obtener del servicio
    const docente = personasPTAIntegrationService.buscarDocente({ personId });
    
    if (docente) {
      this.guardarEnCache(this.docentesCache, personId, docente);
    }
    
    return docente;
  }

  /**
   * Obtener todos los docentes (con caché)
   */
  obtenerTodosLosDocentes(): DocentePTA[] {
    const cacheKey = 'all_docentes';
    
    // Intentar obtener del caché
    const cached = this.obtenerDeCache(this.docentesCache, cacheKey);
    if (cached) {
      console.log('[PTAPersonasService] Todos los docentes obtenidos del caché');
      return Array.isArray(cached) ? cached : [cached];
    }

    // Si no está en caché, obtener del servicio
    const docentes = personasPTAIntegrationService.obtenerTodosLosDocentes();
    
    // Guardar cada docente individualmente en caché
    docentes.forEach(docente => {
      this.guardarEnCache(this.docentesCache, docente.personId, docente);
    });
    
    return docentes;
  }

  /**
   * Obtener docentes por territorial
   */
  obtenerDocentesPorTerritorial(territorialId: string): DocentePTA[] {
    const cacheKey = `territorial_${territorialId}`;
    
    const cached = this.obtenerDeCache(this.docentesCache, cacheKey);
    if (cached) {
      return Array.isArray(cached) ? cached : [cached];
    }

    const docentes = personasPTAIntegrationService.obtenerDocentesPorTerritorial(territorialId);
    
    docentes.forEach(docente => {
      this.guardarEnCache(this.docentesCache, docente.personId, docente);
    });
    
    return docentes;
  }

  // ==========================================================================
  // OPERACIONES CON RUTAS DE APROBACIÓN (CON CACHÉ)
  // ==========================================================================

  /**
   * Obtener ruta de aprobación (con caché)
   */
  obtenerRutaAprobacion(personId: string): RutaAprobacion | null {
    // Intentar obtener del caché
    const cached = this.obtenerDeCache(this.rutasAprobacionCache, personId);
    if (cached) {
      console.log(`[PTAPersonasService] Ruta de aprobación para ${personId} obtenida del caché`);
      return cached;
    }

    // Si no está en caché, calcular
    const ruta = personasPTAIntegrationService.calcularRutaAprobacion(personId);
    
    if (ruta) {
      this.guardarEnCache(this.rutasAprobacionCache, personId, ruta);
    }
    
    return ruta;
  }

  // ==========================================================================
  // OPERACIONES CON PTAs
  // ==========================================================================

  /**
   * Crear PTA vinculado a persona
   */
  async crearPTA(personId: string, periodo: string): Promise<PTAConDocente | null> {
    const docente = this.obtenerDocente(personId);
    
    if (!docente) {
      console.error(`[PTAPersonasService] No se encontró docente con personId: ${personId}`);
      return null;
    }

    const rutaAprobacion = this.obtenerRutaAprobacion(personId);

    const pta: PTAConDocente = {
      id: `PTA-${Date.now()}`,
      docenteId: docente.userId,
      personId: docente.personId,
      periodo,
      horasBase: docente.horasProgramables,
      estado: 'Borrador',
      fechaCreacion: new Date().toISOString(),
      fechaActualizacion: new Date().toISOString(),
      fechaLimite: this.calcularFechaLimite(periodo),
      docenteInfo: docente,
      rutaAprobacion: rutaAprobacion || undefined,
      asignaturas: [],
      actividadesInvestigacion: [],
      actividadesExtension: [],
      actividadesComplementarias: []
    };

    // Guardar en caché
    this.guardarEnCache(this.ptasCache, pta.id, pta);

    return pta;
  }

  /**
   * Obtener PTA por ID
   */
  obtenerPTA(ptaId: string): PTAConDocente | null {
    // Intentar obtener del caché
    const cached = this.obtenerDeCache(this.ptasCache, ptaId);
    if (cached) {
      console.log(`[PTAPersonasService] PTA ${ptaId} obtenido del caché`);
      return cached;
    }

    // TODO: En producción, esto debería cargar desde la API/BD
    // Por ahora retornamos null
    return null;
  }

  /**
   * Obtener PTAs del docente
   */
  obtenerPTAsDelDocente(personId: string): PTAConDocente[] {
    // TODO: En producción, esto debería filtrar desde la API/BD
    // Por ahora retornamos array vacío
    
    // Filtrar del caché
    const ptas: PTAConDocente[] = [];
    
    this.ptasCache.forEach((entry) => {
      if (entry.data.personId === personId) {
        ptas.push(entry.data);
      }
    });
    
    return ptas;
  }

  /**
   * Actualizar PTA
   */
  actualizarPTA(pta: PTAConDocente): void {
    const ptaActualizado = {
      ...pta,
      fechaActualizacion: new Date().toISOString()
    };

    // Actualizar en caché
    this.guardarEnCache(this.ptasCache, pta.id, ptaActualizado);

    // TODO: En producción, guardar en API/BD
  }

  /**
   * Eliminar PTA
   */
  eliminarPTA(ptaId: string): void {
    this.ptasCache.delete(ptaId);
    
    // TODO: En producción, eliminar de API/BD
  }

  // ==========================================================================
  // UTILIDADES
  // ==========================================================================

  /**
   * Calcular fecha límite según el período
   */
  private calcularFechaLimite(periodo: string): string {
    // Extraer año y semestre del período (formato: "2025-1" o "2025-2")
    const [anio, semestre] = periodo.split('-');
    
    if (semestre === '1') {
      // Primer semestre: fecha límite en febrero
      return `${anio}-02-28`;
    } else {
      // Segundo semestre: fecha límite en agosto
      return `${anio}-08-31`;
    }
  }

  /**
   * Obtener estadísticas del caché
   */
  obtenerEstadisticasCache(): {
    docentes: { total: number; expirados: number };
    rutas: { total: number; expirados: number };
    ptas: { total: number; expirados: number };
  } {
    const now = Date.now();
    
    const contarExpirados = <T>(cache: Map<string, CacheEntry<T>>) => {
      let expirados = 0;
      cache.forEach(entry => {
        if (entry.expiresAt < now) expirados++;
      });
      return expirados;
    };

    return {
      docentes: {
        total: this.docentesCache.size,
        expirados: contarExpirados(this.docentesCache)
      },
      rutas: {
        total: this.rutasAprobacionCache.size,
        expirados: contarExpirados(this.rutasAprobacionCache)
      },
      ptas: {
        total: this.ptasCache.size,
        expirados: contarExpirados(this.ptasCache)
      }
    };
  }

  /**
   * Sincronizar docente (actualizar en caché)
   */
  async sincronizarDocente(personId: string): Promise<void> {
    // Invalidar caché del docente
    this.docentesCache.delete(personId);
    
    // Sincronizar con el servicio de integración
    const resultado = await personasPTAIntegrationService.sincronizarDocente(personId);
    
    if (resultado.exito && resultado.docenteSincronizado) {
      // Actualizar caché con datos sincronizados
      this.guardarEnCache(
        this.docentesCache,
        personId,
        resultado.docenteSincronizado
      );
    }
  }

  /**
   * Pre-cargar docentes en caché
   */
  precargarDocentes(personIds: string[]): void {
    personIds.forEach(personId => {
      const docente = personasPTAIntegrationService.buscarDocente({ personId });
      if (docente) {
        this.guardarEnCache(this.docentesCache, personId, docente);
      }
    });
  }
}

// ============================================================================
// INSTANCIA SINGLETON
// ============================================================================

export const ptaPersonasService = new PTAPersonasService();

// ============================================================================
// EXPORTACIONES
// ============================================================================

export default ptaPersonasService;
export type { PTAConDocente };
