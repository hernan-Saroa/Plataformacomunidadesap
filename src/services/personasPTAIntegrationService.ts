/**
 * SERVICIO DE INTEGRACIÓN: MÓDULO PERSONAS ↔ SISTEMA PTA
 * 
 * Proporciona funcionalidades para sincronizar datos entre el módulo de
 * gestión de personas y el sistema de Plan de Trabajo Académico (PTA).
 * 
 * Funcionalidades principales:
 * - Conversión de datos entre Personas y PTA
 * - Sincronización de docentes
 * - Cálculo de rutas de aprobación
 * - Gestión de situaciones administrativas
 * 
 * Versión: 1.0.0
 * Fecha: 2026-01-03
 */

import {
  calcularHorasProgramables,
  MAPEO_ESTADOS,
  esDocente,
  puedeAprobarPTA,
  obtenerNivelAprobacion
} from '../types/integracion-personas-pta';
import { MOCK_USERS_WITH_SEDES } from '../data/mockUsersWithSedes';
import { periodParametersService } from './periodParametersService';

// ============================================================================
// CLASE PRINCIPAL DEL SERVICIO
// ============================================================================

class PersonasPTAIntegrationService {
  
  // ==========================================================================
  // CONVERSIÓN Y MAPEO DE DATOS
  // ==========================================================================

  /**
   * Convierte un usuario del módulo de Personas a formato DocentePTA
   */
  convertirPersonaADocente(persona: UserWithSedes): DocentePTA | null {
    // Verificar que sea docente
    if (!esDocente(persona)) {
      console.warn(`[PersonasPTA] Usuario ${persona.email} no tiene rol de docente`);
      return null;
    }

    const sedePrincipal = obtenerSedePrincipal(persona);
    const parametroActivo = periodParametersService.getParametroActivo();
    const horasSistema = parametroActivo?.horasTotales || 800;

    // Determinar tipo de vinculación y dedicación
    // Por ahora usamos valores por defecto, pero esto debe venir de metadatos del usuario
    const tipoVinculacion = this.inferirTipoVinculacion(persona);
    const tipoDedicacion = this.inferirTipoDedicacion(persona);
    const perfilAcademico = this.inferirPerfilAcademico(persona);
    const categoria = this.inferirCategoria(persona);
    const nucleoTematico = this.inferirNucleoTematico(persona);

    const horasProgramables = calcularHorasProgramables(
      tipoVinculacion,
      tipoDedicacion,
      horasSistema
    );

    const docentePTA: DocentePTA = {
      personId: persona.personId,
      userId: persona.id,
      documentNumber: persona.documentNumber,
      documentType: persona.documentType,
      nombreCompleto: obtenerNombreCompleto(persona),
      email: persona.email,
      telefono: persona.phone,
      perfilAcademico,
      categoria,
      sedeVinculacion: sedePrincipal.nombre,
      codigoSede: sedePrincipal.codigo,
      tipoVinculacion,
      tipoDedicacion,
      nucleoTematico,
      horasProgramables,
      estado: MAPEO_ESTADOS[persona.status] || 'activo',
      territorial: this.obtenerTerritorialNombre(persona),
      territorialId: this.obtenerTerritorialId(persona),
      sedes: persona.sedes
    };

    return docentePTA;
  }

  /**
   * Buscar docente por diferentes criterios
   */
  buscarDocente(criterios: BusquedaDocente): DocentePTA | null {
    let persona: UserWithSedes | undefined;

    if (criterios.personId) {
      persona = MOCK_USERS_WITH_SEDES.find(u => u.personId === criterios.personId);
    } else if (criterios.userId) {
      persona = MOCK_USERS_WITH_SEDES.find(u => u.id === criterios.userId);
    } else if (criterios.email) {
      persona = MOCK_USERS_WITH_SEDES.find(u => u.email === criterios.email);
    } else if (criterios.documentNumber) {
      persona = MOCK_USERS_WITH_SEDES.find(u => u.documentNumber === criterios.documentNumber);
    }

    if (!persona) {
      console.warn('[PersonasPTA] Docente no encontrado:', criterios);
      return null;
    }

    return this.convertirPersonaADocente(persona);
  }

  /**
   * Obtener todos los docentes del sistema
   */
  obtenerTodosLosDocentes(): DocentePTA[] {
    return MOCK_USERS_WITH_SEDES
      .filter(esDocente)
      .map(persona => this.convertirPersonaADocente(persona))
      .filter((docente): docente is DocentePTA => docente !== null);
  }

  /**
   * Obtener docentes por territorial
   */
  obtenerDocentesPorTerritorial(territorialId: string): DocentePTA[] {
    return MOCK_USERS_WITH_SEDES
      .filter(esDocente)
      .filter(persona => {
        const sedeTerritorial = persona.sedes.find(s => s.nivel === 'territorial');
        return sedeTerritorial?.id === territorialId;
      })
      .map(persona => this.convertirPersonaADocente(persona))
      .filter((docente): docente is DocentePTA => docente !== null);
  }

  /**
   * Obtener docentes por sede
   */
  obtenerDocentesPorSede(sedeId: string): DocentePTA[] {
    return MOCK_USERS_WITH_SEDES
      .filter(esDocente)
      .filter(persona => persona.sedes.some(s => s.id === sedeId))
      .map(persona => this.convertirPersonaADocente(persona))
      .filter((docente): docente is DocentePTA => docente !== null);
  }

  // ==========================================================================
  // RUTAS DE APROBACIÓN
  // ==========================================================================

  /**
   * Calcular la ruta de aprobación para un PTA según jerarquía de Personas
   */
  calcularRutaAprobacion(docentePersonId: string): RutaAprobacion | null {
    const docente = this.buscarDocente({ personId: docentePersonId });
    
    if (!docente) {
      console.error('[PersonasPTA] Docente no encontrado para ruta de aprobación:', docentePersonId);
      return null;
    }

    // Buscar aprobadores según jerarquía
    const aprobadores = this.buscarAprobadoresJerarquia(docente);

    const rutaAprobacion: RutaAprobacion = {
      docentePersonId,
      niveles: [
        {
          orden: 1,
          nivel: 'coordinador-nucleo',
          aprobadores: aprobadores.coordinadores,
          estado: 'pendiente'
        },
        {
          orden: 2,
          nivel: 'director-territorial',
          aprobadores: aprobadores.directores,
          estado: 'pendiente'
        },
        {
          orden: 3,
          nivel: 'subdirector-academico',
          aprobadores: aprobadores.subdirectores,
          estado: 'pendiente'
        }
      ]
    };

    return rutaAprobacion;
  }

  /**
   * Buscar aprobadores en la jerarquía del docente
   */
  private buscarAprobadoresJerarquia(docente: DocentePTA): {
    coordinadores: AprobadorPTA[];
    directores: AprobadorPTA[];
    subdirectores: AprobadorPTA[];
  } {
    const coordinadores: AprobadorPTA[] = [];
    const directores: AprobadorPTA[] = [];
    const subdirectores: AprobadorPTA[] = [];

    // Buscar coordinadores del mismo núcleo/sede
    const coordinadoresEncontrados = MOCK_USERS_WITH_SEDES.filter(persona => {
      const nivel = obtenerNivelAprobacion(persona);
      if (nivel !== 'coordinador-nucleo') return false;
      
      // Verificar que esté en la misma sede o territorial
      return persona.sedes.some(s => 
        docente.sedes.some(ds => ds.id === s.id || ds.codigo === s.codigo)
      );
    });

    coordinadores.push(...coordinadoresEncontrados.map(p => this.convertirAAprobador(p, 'coordinador-nucleo')));

    // Buscar directores territoriales
    const directoresEncontrados = MOCK_USERS_WITH_SEDES.filter(persona => {
      const nivel = obtenerNivelAprobacion(persona);
      if (nivel !== 'director-territorial') return false;
      
      // Verificar que esté en la misma territorial
      const territorialDirector = persona.sedes.find(s => s.nivel === 'territorial');
      return territorialDirector?.id === docente.territorialId;
    });

    directores.push(...directoresEncontrados.map(p => this.convertirAAprobador(p, 'director-territorial')));

    // Buscar subdirectores académicos (nivel nacional)
    const subdirectoresEncontrados = MOCK_USERS_WITH_SEDES.filter(persona => {
      const nivel = obtenerNivelAprobacion(persona);
      return nivel === 'subdirector-academico';
    });

    subdirectores.push(...subdirectoresEncontrados.map(p => this.convertirAAprobador(p, 'subdirector-academico')));

    return { coordinadores, directores, subdirectores };
  }

  /**
   * Convertir persona a aprobador
   */
  private convertirAAprobador(persona: UserWithSedes, nivel: NivelAprobacion): AprobadorPTA {
    const sedeTerritorial = persona.sedes.find(s => s.nivel === 'territorial');
    
    return {
      personId: persona.personId,
      userId: persona.id,
      nombreCompleto: obtenerNombreCompleto(persona),
      email: persona.email,
      nivel,
      rol: persona.roles.find(r => puedeAprobarPTA(persona))?.name || 'Aprobador',
      sedeId: persona.sedes[0]?.id,
      territorialId: sedeTerritorial?.id
    };
  }

  // ==========================================================================
  // SINCRONIZACIÓN
  // ==========================================================================

  /**
   * Sincronizar datos de un docente desde Personas hacia PTA
   */
  async sincronizarDocente(personId: string): Promise<ResultadoSincronizacion> {
    try {
      const persona = MOCK_USERS_WITH_SEDES.find(u => u.personId === personId);
      
      if (!persona) {
        return {
          exito: false,
          mensaje: `Persona con ID ${personId} no encontrada`,
          errores: ['Persona no existe en el módulo de Personas']
        };
      }

      const docentePTA = this.convertirPersonaADocente(persona);
      
      if (!docentePTA) {
        return {
          exito: false,
          mensaje: `La persona ${persona.email} no tiene rol de docente`,
          errores: ['Usuario no tiene rol de docente']
        };
      }

      // Aquí se debería guardar en la BD del PTA
      // Por ahora solo retornamos el resultado

      this.registrarAuditoria({
        id: `audit-${Date.now()}`,
        fecha: new Date().toISOString(),
        operacion: 'sincronizar',
        personId,
        usuarioQueEjecuta: 'system',
        detalles: `Sincronización exitosa del docente ${docentePTA.nombreCompleto}`,
        resultado: 'exitoso'
      });

      return {
        exito: true,
        mensaje: `Docente ${docentePTA.nombreCompleto} sincronizado correctamente`,
        docenteSincronizado: docentePTA
      };

    } catch (error: any) {
      return {
        exito: false,
        mensaje: 'Error al sincronizar docente',
        errores: [error.message || 'Error desconocido']
      };
    }
  }

  /**
   * Sincronizar todos los docentes
   */
  async sincronizarTodosLosDocentes(): Promise<ResultadoSincronizacion[]> {
    const docentes = MOCK_USERS_WITH_SEDES.filter(esDocente);
    const resultados: ResultadoSincronizacion[] = [];

    for (const persona of docentes) {
      const resultado = await this.sincronizarDocente(persona.personId);
      resultados.push(resultado);
    }

    return resultados;
  }

  // ==========================================================================
  // FUNCIONES DE INFERENCIA (para datos que no están en Personas aún)
  // ==========================================================================

  private inferirTipoVinculacion(persona: UserWithSedes): DocentePTA['tipoVinculacion'] {
    // TODO: Esto debería venir de metadatos del usuario en Personas
    // Por ahora retornamos un valor por defecto
    return 'Carrera1';
  }

  private inferirTipoDedicacion(persona: UserWithSedes): DocentePTA['tipoDedicacion'] {
    // TODO: Esto debería venir de metadatos del usuario en Personas
    return 'TC';
  }

  private inferirPerfilAcademico(persona: UserWithSedes): DocentePTA['perfilAcademico'] {
    // TODO: Esto debería venir de metadatos del usuario en Personas
    return 'Maestría';
  }

  private inferirCategoria(persona: UserWithSedes): DocentePTA['categoria'] {
    // TODO: Esto debería venir de metadatos del usuario en Personas
    return 'Asistente';
  }

  private inferirNucleoTematico(persona: UserWithSedes): string {
    // TODO: Esto debería venir de metadatos del usuario en Personas
    return 'Administración Pública';
  }

  private obtenerTerritorialNombre(persona: UserWithSedes): string | undefined {
    const sedeTerritorial = persona.sedes.find(s => s.nivel === 'territorial');
    return sedeTerritorial?.nombre;
  }

  private obtenerTerritorialId(persona: UserWithSedes): string | undefined {
    const sedeTerritorial = persona.sedes.find(s => s.nivel === 'territorial');
    return sedeTerritorial?.id;
  }

  // ==========================================================================
  // AUDITORÍA
  // ==========================================================================

  private registrarAuditoria(auditoria: AuditoriaIntegracion): void {
    // TODO: Guardar en sistema de auditoría
    console.log('[PersonasPTA] Auditoría:', auditoria);
  }

  // ==========================================================================
  // UTILIDADES
  // ==========================================================================

  /**
   * Verificar si un usuario puede crear PTA
   */
  puedeCrearPTA(personId: string): boolean {
    const docente = this.buscarDocente({ personId });
    return docente !== null && docente.estado === 'activo';
  }

  /**
   * Verificar si un usuario puede aprobar PTA
   */
  puedeAprobarPTAs(personId: string): boolean {
    const persona = MOCK_USERS_WITH_SEDES.find(u => u.personId === personId);
    return persona ? puedeAprobarPTA(persona) : false;
  }

  /**
   * Obtener el nivel de aprobación de un usuario
   */
  obtenerNivelAprobacionUsuario(personId: string): NivelAprobacion | null {
    const persona = MOCK_USERS_WITH_SEDES.find(u => u.personId === personId);
    return persona ? obtenerNivelAprobacion(persona) : null;
  }

  /**
   * Crear notificación para un usuario de Personas
   */
  crearNotificacion(notificacion: Omit<NotificacionPersonasPTA, 'fechaEnvio'>): NotificacionPersonasPTA {
    return {
      ...notificacion,
      fechaEnvio: new Date().toISOString()
    };
  }

  /**
   * Obtener estadísticas de docentes
   */
  obtenerEstadisticasDocentes(): {
    total: number;
    activos: number;
    enLicencia: number;
    enComision: number;
    porTerritorial: Record<string, number>;
    porSede: Record<string, number>;
  } {
    const docentes = this.obtenerTodosLosDocentes();

    return {
      total: docentes.length,
      activos: docentes.filter(d => d.estado === 'activo').length,
      enLicencia: docentes.filter(d => d.estado === 'licencia').length,
      enComision: docentes.filter(d => d.estado === 'comision').length,
      porTerritorial: this.contarPorTerritorial(docentes),
      porSede: this.contarPorSede(docentes)
    };
  }

  private contarPorTerritorial(docentes: DocentePTA[]): Record<string, number> {
    return docentes.reduce((acc, docente) => {
      const territorial = docente.territorial || 'Sin asignar';
      acc[territorial] = (acc[territorial] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }

  private contarPorSede(docentes: DocentePTA[]): Record<string, number> {
    return docentes.reduce((acc, docente) => {
      acc[docente.sedeVinculacion] = (acc[docente.sedeVinculacion] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }
}

// ============================================================================
// INSTANCIA SINGLETON DEL SERVICIO
// ============================================================================

export const personasPTAIntegrationService = new PersonasPTAIntegrationService();

// ============================================================================
// EXPORTACIONES
// ============================================================================

export default personasPTAIntegrationService;