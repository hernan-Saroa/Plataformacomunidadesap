/**
 * HOOK: usePTAConPersonas
 * 
 * Hook simplificado que integra el sistema PTA con el módulo de Personas
 * y la autenticación del usuario actual.
 * 
 * Proporciona acceso automático a:
 * - Información del usuario autenticado
 * - Datos del docente desde el módulo de Personas
 * - PTAs filtrados por el docente actual
 * - Funciones para crear y gestionar PTAs
 * 
 * Versión: 1.0.0
 * Fecha: 2026-01-03
 */

import { useState, useEffect, useMemo } from 'react';
import { usePTA } from '../contexts/PTAContext';
import { personasPTAIntegrationService } from '../services/personasPTAIntegrationService';
import type { DocentePTA } from '../types/integracion-personas-pta';
import { MOCK_USERS_WITH_SEDES, type UserWithSedes } from '../data/mockUsersWithSedes';

// ============================================================================
// TIPOS
// ============================================================================

interface UsePTAConPersonasReturn {
  // Usuario y Docente
  usuarioActual: UserWithSedes | null;
  docenteInfo: DocentePTA | null;
  esDocente: boolean;
  puedeCrearPTA: boolean;
  puedeAprobarPTAs: boolean;
  nivelAprobacion: 'coordinador-nucleo' | 'director-territorial' | 'subdirector-academico' | null;
  
  // Estado del PTA actual
  pta: ReturnType<typeof usePTA>['pta'];
  isLoading: boolean;
  isSaving: boolean;
  
  // Acciones
  inicializarNuevoPTA: (periodo: string) => Promise<void>;
  cargarPTA: (ptaId: string) => Promise<void>;
  guardarPTA: () => Promise<void>;
  enviarAAprobacion: () => Promise<string>;
  
  // Gestión de actividades
  agregarAsignatura: ReturnType<typeof usePTA>['agregarAsignatura'];
  editarAsignatura: ReturnType<typeof usePTA>['editarAsignatura'];
  eliminarAsignatura: ReturnType<typeof usePTA>['eliminarAsignatura'];
  agregarActividadInvestigacion: ReturnType<typeof usePTA>['agregarActividadInvestigacion'];
  editarActividadInvestigacion: ReturnType<typeof usePTA>['editarActividadInvestigacion'];
  eliminarActividadInvestigacion: ReturnType<typeof usePTA>['eliminarActividadInvestigacion'];
  agregarActividadExtension: ReturnType<typeof usePTA>['agregarActividadExtension'];
  editarActividadExtension: ReturnType<typeof usePTA>['editarActividadExtension'];
  eliminarActividadExtension: ReturnType<typeof usePTA>['eliminarActividadExtension'];
  agregarActividadComplementaria: ReturnType<typeof usePTA>['agregarActividadComplementaria'];
  editarActividadComplementaria: ReturnType<typeof usePTA>['editarActividadComplementaria'];
  eliminarActividadComplementaria: ReturnType<typeof usePTA>['eliminarActividadComplementaria'];
  
  // Cálculos
  calcularHorasTotales: ReturnType<typeof usePTA>['calcularHorasTotales'];
  calcularHorasDocencia: ReturnType<typeof usePTA>['calcularHorasDocencia'];
  calcularHorasInvestigacion: ReturnType<typeof usePTA>['calcularHorasInvestigacion'];
  calcularHorasExtension: ReturnType<typeof usePTA>['calcularHorasExtension'];
  calcularHorasComplementarias: ReturnType<typeof usePTA>['calcularHorasComplementarias'];
  calcularEvidenciasCompletas: ReturnType<typeof usePTA>['calcularEvidenciasCompletas'];
  
  // Estadísticas
  estadisticas: {
    horasProgramables: number;
    horasUtilizadas: number;
    porcentajeCompletado: number;
    horasRestantes: number;
    cumpleRequisitos: boolean;
  };
}

// ============================================================================
// HOOK PRINCIPAL
// ============================================================================

/**
 * Hook que integra PTA con el módulo de Personas
 * 
 * @param userId - ID del usuario (opcional, si no se proporciona se usa el autenticado)
 * @returns Objeto con toda la información y funciones del PTA integrado
 * 
 * @example
 * ```tsx
 * function MiComponente() {
 *   const {
 *     usuarioActual,
 *     docenteInfo,
 *     esDocente,
 *     inicializarNuevoPTA,
 *     pta,
 *     estadisticas
 *   } = usePTAConPersonas();
 *   
 *   if (!esDocente) {
 *     return <div>No tienes permisos de docente</div>;
 *   }
 *   
 *   return (
 *     <div>
 *       <h1>PTA de {docenteInfo?.nombreCompleto}</h1>
 *       <p>Horas: {estadisticas.horasUtilizadas} / {estadisticas.horasProgramables}</p>
 *     </div>
 *   );
 * }
 * ```
 */
export function usePTAConPersonas(userId?: string): UsePTAConPersonasReturn {
  // Contexto del PTA
  const ptaContext = usePTA();
  
  // Estado del usuario actual
  const [usuarioActual, setUsuarioActual] = useState<UserWithSedes | null>(null);
  const [docenteInfo, setDocenteInfo] = useState<DocentePTA | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);

  // ============================================================================
  // CARGAR USUARIO Y DOCENTE
  // ============================================================================

  useEffect(() => {
    const cargarUsuario = () => {
      setIsLoadingUser(true);
      try {
        // TODO: En producción, esto debería venir de useAuth()
        // Por ahora, simulamos con el primer docente de los datos mock
        let usuario: UserWithSedes | undefined;
        
        if (userId) {
          usuario = MOCK_USERS_WITH_SEDES.find(u => u.id === userId);
        } else {
          // Buscar el primer usuario con rol de docente
          usuario = MOCK_USERS_WITH_SEDES.find(u => 
            u.roles.some(r => r.code === 'DOCENTE')
          );
        }

        if (usuario) {
          setUsuarioActual(usuario);
          
          // Obtener información del docente desde el servicio de integración
          const docente = personasPTAIntegrationService.buscarDocente({
            personId: usuario.personId
          });
          
          setDocenteInfo(docente);
        }
      } catch (error) {
        console.error('[usePTAConPersonas] Error al cargar usuario:', error);
      } finally {
        setIsLoadingUser(false);
      }
    };

    cargarUsuario();
  }, [userId]);

  // ============================================================================
  // PERMISOS Y ROLES
  // ============================================================================

  const esDocente = useMemo(() => {
    if (!usuarioActual) return false;
    return usuarioActual.roles.some(r => 
      r.code === 'DOCENTE' || r.name.toLowerCase().includes('docente')
    );
  }, [usuarioActual]);

  const puedeCrearPTA = useMemo(() => {
    if (!docenteInfo) return false;
    return personasPTAIntegrationService.puedeCrearPTA(docenteInfo.personId);
  }, [docenteInfo]);

  const puedeAprobarPTAs = useMemo(() => {
    if (!docenteInfo) return false;
    return personasPTAIntegrationService.puedeAprobarPTAs(docenteInfo.personId);
  }, [docenteInfo]);

  const nivelAprobacion = useMemo(() => {
    if (!docenteInfo) return null;
    return personasPTAIntegrationService.obtenerNivelAprobacionUsuario(docenteInfo.personId);
  }, [docenteInfo]);

  // ============================================================================
  // ACCIONES SIMPLIFICADAS
  // ============================================================================

  /**
   * Inicializar un nuevo PTA para el docente actual
   */
  const inicializarNuevoPTA = async (periodo: string) => {
    if (!docenteInfo) {
      throw new Error('No hay información del docente');
    }

    await ptaContext.inicializarPTAConPersonId(docenteInfo.personId, periodo);
  };

  // ============================================================================
  // ESTADÍSTICAS CALCULADAS
  // ============================================================================

  const estadisticas = useMemo(() => {
    const horasProgramables = docenteInfo?.horasProgramables || 0;
    const horasUtilizadas = ptaContext.calcularHorasTotales();
    const porcentajeCompletado = horasProgramables > 0 
      ? (horasUtilizadas / horasProgramables) * 100 
      : 0;
    const horasRestantes = Math.max(0, horasProgramables - horasUtilizadas);
    const cumpleRequisitos = Math.abs(horasUtilizadas - horasProgramables) < 1; // Margen de 1 hora

    return {
      horasProgramables,
      horasUtilizadas,
      porcentajeCompletado,
      horasRestantes,
      cumpleRequisitos
    };
  }, [docenteInfo, ptaContext.pta]);

  // ============================================================================
  // RETURN
  // ============================================================================

  return {
    // Usuario y Docente
    usuarioActual,
    docenteInfo,
    esDocente,
    puedeCrearPTA,
    puedeAprobarPTAs,
    nivelAprobacion,
    
    // Estado del PTA
    pta: ptaContext.pta,
    isLoading: isLoadingUser || ptaContext.isLoading,
    isSaving: ptaContext.isSaving,
    
    // Acciones
    inicializarNuevoPTA,
    cargarPTA: ptaContext.cargarPTA,
    guardarPTA: ptaContext.guardarPTA,
    enviarAAprobacion: ptaContext.enviarAAprobacion,
    
    // Gestión de actividades
    agregarAsignatura: ptaContext.agregarAsignatura,
    editarAsignatura: ptaContext.editarAsignatura,
    eliminarAsignatura: ptaContext.eliminarAsignatura,
    agregarActividadInvestigacion: ptaContext.agregarActividadInvestigacion,
    editarActividadInvestigacion: ptaContext.editarActividadInvestigacion,
    eliminarActividadInvestigacion: ptaContext.eliminarActividadInvestigacion,
    agregarActividadExtension: ptaContext.agregarActividadExtension,
    editarActividadExtension: ptaContext.editarActividadExtension,
    eliminarActividadExtension: ptaContext.eliminarActividadExtension,
    agregarActividadComplementaria: ptaContext.agregarActividadComplementaria,
    editarActividadComplementaria: ptaContext.editarActividadComplementaria,
    eliminarActividadComplementaria: ptaContext.eliminarActividadComplementaria,
    
    // Cálculos
    calcularHorasTotales: ptaContext.calcularHorasTotales,
    calcularHorasDocencia: ptaContext.calcularHorasDocencia,
    calcularHorasInvestigacion: ptaContext.calcularHorasInvestigacion,
    calcularHorasExtension: ptaContext.calcularHorasExtension,
    calcularHorasComplementarias: ptaContext.calcularHorasComplementarias,
    calcularEvidenciasCompletas: ptaContext.calcularEvidenciasCompletas,
    
    // Estadísticas
    estadisticas
  };
}

// ============================================================================
// EXPORTACIONES
// ============================================================================

export default usePTAConPersonas;
