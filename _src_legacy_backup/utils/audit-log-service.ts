/**
 * ============================================
 * SISTEMA DE AUDITORÍA DE CAMBIOS (AUDIT LOG)
 * ============================================
 * 
 * Sistema automatizado para registrar TODAS las operaciones
 * en el módulo OCIG, cumpliendo con requisitos de compliance
 * y trazabilidad completa (quién, cuándo, qué).
 * 
 * COMPLIANCE: Ley 1581/2012 (Protección de Datos)
 * RETENCIÓN: 90 días en línea, archivo histórico indefinido
 * 
 * FECHA: 30 Enero 2025
 * VERSIÓN: 1.0
 */

import type { AuditLog, Usuario } from '@/types/ocig.types';

// ============================================
// TIPOS PARA AUDIT LOG
// ============================================

export type TipoOperacion =
  | 'CREAR'
  | 'ACTUALIZAR'
  | 'ELIMINAR'
  | 'APROBAR'
  | 'RECHAZAR'
  | 'MOVER'
  | 'ASIGNAR'
  | 'VALIDAR'
  | 'EXPORTAR';

export type TablaSistema =
  | 'plan_anual'
  | 'rol_decreto_648'
  | 'actividad'
  | 'auditoria'
  | 'equipo_auditor'
  | 'hallazgo'
  | 'documento'
  | 'plan_mejoramiento'
  | 'accion_correctiva'
  | 'seguimiento_plan_mejora'
  | 'evidencia_validada'
  | 'informe_ley'
  | 'cumplimiento_informe';

export interface RegistroAuditLog {
  accion: string;
  tabla: TablaSistema;
  registroId: string;
  cambios: {
    operacion: TipoOperacion;
    antes?: any;
    despues?: any;
    campos?: string[];
    metadata?: Record<string, any>;
  };
  usuarioId: string;
  planAnualId?: string;
  auditoriaId?: string;
}

export interface FiltroAuditLog {
  tabla?: TablaSistema;
  registroId?: string;
  usuarioId?: string;
  operacion?: TipoOperacion;
  fechaDesde?: Date;
  fechaHasta?: Date;
  busqueda?: string;
}

export interface DetalleAuditLog extends AuditLog {
  usuario: Usuario;
  descripcionCambios: string;
}

// ============================================
// SERVICIO DE AUDIT LOG
// ============================================

class AuditLogService {
  private static instance: AuditLogService;
  private currentUser: Usuario | null = null;

  private constructor() {}

  public static getInstance(): AuditLogService {
    if (!AuditLogService.instance) {
      AuditLogService.instance = new AuditLogService();
    }
    return AuditLogService.instance;
  }

  /**
   * Configurar usuario actual para el contexto
   */
  public setCurrentUser(usuario: Usuario): void {
    this.currentUser = usuario;
  }

  /**
   * Obtener usuario actual
   */
  public getCurrentUser(): Usuario | null {
    return this.currentUser;
  }

  /**
   * ⚠️ MÉTODO PRINCIPAL: Registrar cambio en el sistema
   */
  public async registrar(registro: RegistroAuditLog): Promise<void> {
    try {
      // En producción, esto guardaría en la base de datos
      // Por ahora, lo simulamos con console.log
      const logEntry = {
        ...registro,
        timestamp: new Date(),
        usuario: this.currentUser
      };

      console.log('🔍 [AUDIT LOG]', {
        timestamp: logEntry.timestamp.toISOString(),
        usuario: `${this.currentUser?.nombre} ${this.currentUser?.apellido}`,
        accion: registro.accion,
        tabla: registro.tabla,
        registroId: registro.registroId,
        operacion: registro.cambios.operacion
      });

      // Simulación de guardado en BD
      // await this.guardarEnBaseDatos(logEntry);
    } catch (error) {
      console.error('❌ Error al registrar audit log:', error);
      // No lanzar error para no interrumpir la operación principal
    }
  }

  /**
   * Registrar creación de registro
   */
  public async registrarCreacion(
    tabla: TablaSistema,
    registroId: string,
    datos: any,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.registrar({
      accion: `Crear ${this.getNombreTabla(tabla)}`,
      tabla,
      registroId,
      cambios: {
        operacion: 'CREAR',
        despues: datos,
        metadata
      },
      usuarioId: this.currentUser?.id || 'sistema'
    });
  }

  /**
   * Registrar actualización de registro
   */
  public async registrarActualizacion(
    tabla: TablaSistema,
    registroId: string,
    antes: any,
    despues: any,
    metadata?: Record<string, any>
  ): Promise<void> {
    // Detectar campos modificados
    const camposModificados = this.detectarCambios(antes, despues);

    await this.registrar({
      accion: `Actualizar ${this.getNombreTabla(tabla)}`,
      tabla,
      registroId,
      cambios: {
        operacion: 'ACTUALIZAR',
        antes,
        despues,
        campos: camposModificados,
        metadata
      },
      usuarioId: this.currentUser?.id || 'sistema'
    });
  }

  /**
   * Registrar eliminación de registro
   */
  public async registrarEliminacion(
    tabla: TablaSistema,
    registroId: string,
    datos: any,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.registrar({
      accion: `Eliminar ${this.getNombreTabla(tabla)}`,
      tabla,
      registroId,
      cambios: {
        operacion: 'ELIMINAR',
        antes: datos,
        metadata
      },
      usuarioId: this.currentUser?.id || 'sistema'
    });
  }

  /**
   * Registrar aprobación
   */
  public async registrarAprobacion(
    tabla: TablaSistema,
    registroId: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.registrar({
      accion: `Aprobar ${this.getNombreTabla(tabla)}`,
      tabla,
      registroId,
      cambios: {
        operacion: 'APROBAR',
        metadata: {
          ...metadata,
          fechaAprobacion: new Date(),
          aprobadoPor: this.currentUser?.id
        }
      },
      usuarioId: this.currentUser?.id || 'sistema'
    });
  }

  /**
   * Registrar cambio de estado en Kanban
   */
  public async registrarCambioEstado(
    auditoriaId: string,
    estadoAnterior: string,
    estadoNuevo: string,
    planAnualId?: string
  ): Promise<void> {
    await this.registrar({
      accion: `Mover auditoría: ${estadoAnterior} → ${estadoNuevo}`,
      tabla: 'auditoria',
      registroId: auditoriaId,
      cambios: {
        operacion: 'MOVER',
        antes: { estado: estadoAnterior },
        despues: { estado: estadoNuevo },
        metadata: {
          transicion: `${estadoAnterior} → ${estadoNuevo}`,
          timestamp: new Date()
        }
      },
      usuarioId: this.currentUser?.id || 'sistema',
      auditoriaId,
      planAnualId
    });
  }

  /**
   * Registrar asignación de usuario
   */
  public async registrarAsignacion(
    tabla: TablaSistema,
    registroId: string,
    usuarioAsignadoId: string,
    rol?: string
  ): Promise<void> {
    await this.registrar({
      accion: `Asignar usuario a ${this.getNombreTabla(tabla)}`,
      tabla,
      registroId,
      cambios: {
        operacion: 'ASIGNAR',
        despues: {
          usuarioAsignadoId,
          rol
        },
        metadata: {
          fechaAsignacion: new Date()
        }
      },
      usuarioId: this.currentUser?.id || 'sistema'
    });
  }

  /**
   * Registrar validación de evidencia
   */
  public async registrarValidacionEvidencia(
    evidenciaId: string,
    calificacion: string,
    comentarios?: string
  ): Promise<void> {
    await this.registrar({
      accion: `Validar evidencia: ${calificacion}`,
      tabla: 'evidencia_validada',
      registroId: evidenciaId,
      cambios: {
        operacion: 'VALIDAR',
        despues: {
          calificacion,
          comentarios,
          fechaValidacion: new Date()
        },
        metadata: {
          validador: this.currentUser?.id
        }
      },
      usuarioId: this.currentUser?.id || 'sistema'
    });
  }

  /**
   * Consultar historial de cambios
   */
  public async consultarHistorial(
    filtros: FiltroAuditLog
  ): Promise<DetalleAuditLog[]> {
    // En producción, esto consultaría la base de datos
    // Por ahora, retornamos array vacío
    console.log('📋 Consultando historial con filtros:', filtros);
    return [];
  }

  /**
   * Obtener último cambio de un registro
   */
  public async obtenerUltimoCambio(
    tabla: TablaSistema,
    registroId: string
  ): Promise<DetalleAuditLog | null> {
    // En producción, consultaría la BD
    console.log(`🔍 Obteniendo último cambio de ${tabla}:${registroId}`);
    return null;
  }

  /**
   * Generar reporte de auditoría
   */
  public async generarReporteAuditoria(
    filtros: FiltroAuditLog
  ): Promise<{
    total: number;
    porOperacion: Record<TipoOperacion, number>;
    porUsuario: Record<string, number>;
    porTabla: Record<TablaSistema, number>;
  }> {
    // En producción, generaría estadísticas reales
    console.log('📊 Generando reporte de auditoría:', filtros);
    return {
      total: 0,
      porOperacion: {} as Record<TipoOperacion, number>,
      porUsuario: {},
      porTabla: {} as Record<TablaSistema, number>
    };
  }

  // ============================================
  // MÉTODOS AUXILIARES
  // ============================================

  /**
   * Detectar campos que cambiaron entre dos objetos
   */
  private detectarCambios(antes: any, despues: any): string[] {
    const cambios: string[] = [];

    if (!antes || !despues) return cambios;

    const todasLasClaves = new Set([
      ...Object.keys(antes),
      ...Object.keys(despues)
    ]);

    todasLasClaves.forEach(clave => {
      if (JSON.stringify(antes[clave]) !== JSON.stringify(despues[clave])) {
        cambios.push(clave);
      }
    });

    return cambios;
  }

  /**
   * Obtener nombre legible de tabla
   */
  private getNombreTabla(tabla: TablaSistema): string {
    const nombres: Record<TablaSistema, string> = {
      plan_anual: 'Plan Anual',
      rol_decreto_648: 'Rol Decreto 648',
      actividad: 'Actividad',
      auditoria: 'Auditoría',
      equipo_auditor: 'Equipo Auditor',
      hallazgo: 'Hallazgo',
      documento: 'Documento',
      plan_mejoramiento: 'Plan de Mejoramiento',
      accion_correctiva: 'Acción Correctiva',
      seguimiento_plan_mejora: 'Seguimiento Plan Mejora',
      evidencia_validada: 'Evidencia Validada',
      informe_ley: 'Informe de Ley',
      cumplimiento_informe: 'Cumplimiento Informe'
    };

    return nombres[tabla] || tabla;
  }
}

// ============================================
// HOC - Higher Order Function para Audit Log
// ============================================

/**
 * Wrapper que registra automáticamente en audit log
 * 
 * @example
 * const crearPlanConAudit = withAuditLog(
 *   crearPlan,
 *   'plan_anual',
 *   'CREAR'
 * );
 */
export function withAuditLog<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  tabla: TablaSistema,
  operacion: TipoOperacion
): T {
  return (async (...args: Parameters<T>) => {
    const auditService = AuditLogService.getInstance();
    let resultado: any;

    try {
      resultado = await fn(...args);

      // Registrar operación exitosa
      await auditService.registrar({
        accion: `${operacion} ${auditService['getNombreTabla'](tabla)}`,
        tabla,
        registroId: resultado?.id || 'unknown',
        cambios: {
          operacion,
          despues: resultado
        },
        usuarioId: auditService.getCurrentUser()?.id || 'sistema'
      });

      return resultado;
    } catch (error) {
      // Registrar operación fallida
      await auditService.registrar({
        accion: `${operacion} ${auditService['getNombreTabla'](tabla)} (FALLIDO)`,
        tabla,
        registroId: 'error',
        cambios: {
          operacion,
          metadata: {
            error: error instanceof Error ? error.message : 'Error desconocido'
          }
        },
        usuarioId: auditService.getCurrentUser()?.id || 'sistema'
      });

      throw error;
    }
  }) as T;
}

// ============================================
// HOOK DE REACT PARA AUDIT LOG
// ============================================

/**
 * Hook personalizado para usar audit log en componentes React
 */
export function useAuditLog() {
  const auditService = AuditLogService.getInstance();

  return {
    registrarCreacion: auditService.registrarCreacion.bind(auditService),
    registrarActualizacion: auditService.registrarActualizacion.bind(auditService),
    registrarEliminacion: auditService.registrarEliminacion.bind(auditService),
    registrarAprobacion: auditService.registrarAprobacion.bind(auditService),
    registrarCambioEstado: auditService.registrarCambioEstado.bind(auditService),
    registrarAsignacion: auditService.registrarAsignacion.bind(auditService),
    registrarValidacionEvidencia: auditService.registrarValidacionEvidencia.bind(auditService),
    consultarHistorial: auditService.consultarHistorial.bind(auditService),
    obtenerUltimoCambio: auditService.obtenerUltimoCambio.bind(auditService)
  };
}

// ============================================
// EXPORTACIONES
// ============================================

export const auditLogService = AuditLogService.getInstance();
export default auditLogService;

// ============================================
// EJEMPLOS DE USO
// ============================================

/**
 * EJEMPLO 1: Uso directo del servicio
 * 
 * ```typescript
 * import { auditLogService } from '@/utils/audit-log-service';
 * 
 * async function crearPlanAnual(data: CreatePlanAnualDTO) {
 *   const plan = await prisma.planAnual.create({ data });
 *   
 *   await auditLogService.registrarCreacion(
 *     'plan_anual',
 *     plan.id,
 *     plan,
 *     { vigencia: data.vigencia }
 *   );
 *   
 *   return plan;
 * }
 * ```
 * 
 * EJEMPLO 2: Uso del HOC
 * 
 * ```typescript
 * import { withAuditLog } from '@/utils/audit-log-service';
 * 
 * const crearPlanAnual = withAuditLog(
 *   async (data: CreatePlanAnualDTO) => {
 *     return await prisma.planAnual.create({ data });
 *   },
 *   'plan_anual',
 *   'CREAR'
 * );
 * ```
 * 
 * EJEMPLO 3: Uso del hook en componente React
 * 
 * ```typescript
 * import { useAuditLog } from '@/utils/audit-log-service';
 * 
 * function ComponenteAuditoria() {
 *   const { registrarCambioEstado } = useAuditLog();
 *   
 *   const moverAuditoria = async (id: string, nuevoEstado: string) => {
 *     const auditoriaActual = auditorias.find(a => a.id === id);
 *     
 *     await cambiarEstado(id, nuevoEstado);
 *     
 *     await registrarCambioEstado(
 *       id,
 *       auditoriaActual.estado,
 *       nuevoEstado,
 *       auditoriaActual.planAnualId
 *     );
 *   };
 * }
 * ```
 */
