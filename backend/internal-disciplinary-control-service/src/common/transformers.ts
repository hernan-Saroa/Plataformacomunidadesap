/**
 * Transformadores para convertir entidades a formato de respuesta API
 */

import { TerminoProcesal } from '../entities/termino-procesal.entity';
import { DiaFestivo } from '../entities/dia-festivo.entity';
import { AlertaEnviada } from '../entities/alerta-enviada.entity';

/**
 * Transforma un término procesal al formato esperado por el frontend
 */
export function transformTermino(termino: TerminoProcesal, nombreProceso?: string): any {
  return {
    id: termino.id,
    procesoId: termino.procesoId,
    numeroProceso: termino.numeroProceso,
    proceso: nombreProceso || termino.numeroProceso, // Nombre del denunciado
    actuacion: termino.actuacion,
    responsableId: termino.responsableId,
    responsable: termino.responsableNombre, // Para compatibilidad con frontend
    emailResponsable: termino.emailResponsable,
    fechaInicio: termino.fechaInicio.toISOString().split('T')[0], // YYYY-MM-DD
    diasHabiles: termino.diasHabiles,
    fechaVencimiento: termino.fechaVencimiento.toISOString().split('T')[0], // YYYY-MM-DD
    diasRestantes: termino.diasRestantes,
    estado: termino.estado,
    alertaEnviada: termino.alertaEnviada,
    fechaCumplimiento: termino.fechaCumplimiento 
      ? termino.fechaCumplimiento.toISOString().split('T')[0] 
      : undefined,
    observaciones: termino.observaciones,
    fechaCreacion: termino.fechaCreacion?.toISOString(),
    fechaActualizacion: termino.fechaActualizacion?.toISOString(),
  };
}

/**
 * Transforma un día festivo al formato esperado por el frontend
 */
export function transformFestivo(festivo: DiaFestivo): any {
  // Asegurar conversiones seguras en caso de strings provenientes de queries raw
  const fecha = festivo.fecha instanceof Date ? festivo.fecha : new Date(festivo.fecha as any);
  const fechaCreacion = festivo.fechaCreacion instanceof Date ? festivo.fechaCreacion : festivo.fechaCreacion ? new Date(festivo.fechaCreacion as any) : undefined;
  const fechaActualizacion = festivo.fechaActualizacion instanceof Date ? festivo.fechaActualizacion : festivo.fechaActualizacion ? new Date(festivo.fechaActualizacion as any) : undefined;

  return {
    id: festivo.id,
    fecha: fecha.toISOString().split('T')[0], // YYYY-MM-DD
    descripcion: festivo.descripcion,
    tipo: festivo.tipo,
    territorio: festivo.territorio || undefined,
    activo: festivo.activo,
    fechaCreacion: fechaCreacion?.toISOString(),
    fechaActualizacion: fechaActualizacion?.toISOString(),
  };
}

/**
 * Transforma una alerta al formato esperado por el frontend
 */
export function transformAlerta(alerta: AlertaEnviada, nombreProceso?: string): any {
  return {
    id: alerta.id,
    termino: alerta.terminoId, // ID del término
    proceso: nombreProceso || alerta.termino?.numeroProceso || 'Proceso sin nombre',
    tipo: alerta.tipo,
    fechaEnvio: alerta.fechaEnvio.toISOString().replace('T', ' ').substring(0, 16), // YYYY-MM-DD HH:mm
    destinatario: alerta.destinatario,
    estado: alerta.estado,
    asunto: alerta.asunto || '',
    mensaje: alerta.mensaje,
    reglaAlertaId: alerta.reglaAlertaId,
  };
}

