/**
 * Lógica de negocio para Tipos de Auditoría
 * Funciones para llamar desde el componente sin modificar el formulario
 */

import { tiposAuditoriaService, type TipoAuditoria, type CreateTipoAuditoriaDto, type UpdateTipoAuditoriaDto } from '../../../../services/api/tiposAuditoriaService';
import { toast } from 'sonner';

/**
 * Cargar todos los tipos de auditoría
 */
export async function cargarTiposAuditoria(includeInactive: boolean = false): Promise<TipoAuditoria[]> {
  try {
    const tipos = await tiposAuditoriaService.getAll(includeInactive);
    return tipos;
  } catch (error) {
    console.error('❌ Error cargando tipos de auditoría:', error);
    toast.error('Error al cargar tipos de auditoría', {
      description: error instanceof Error ? error.message : 'Error desconocido'
    });
    return [];
  }
}

/**
 * Crear un nuevo tipo de auditoría
 */
export async function crearTipoAuditoria(data: CreateTipoAuditoriaDto): Promise<TipoAuditoria | null> {
  try {
    const nuevoTipo = await tiposAuditoriaService.create(data);
    toast.success('✅ Tipo de auditoría creado exitosamente');
    return nuevoTipo;
  } catch (error) {
    console.error('❌ Error creando tipo de auditoría:', error);
    toast.error('Error al crear tipo de auditoría', {
      description: error instanceof Error ? error.message : 'Error desconocido'
    });
    return null;
  }
}

/**
 * Actualizar un tipo de auditoría
 */
export async function actualizarTipoAuditoria(id: string, data: UpdateTipoAuditoriaDto): Promise<TipoAuditoria | null> {
  try {
    const tipoActualizado = await tiposAuditoriaService.update(id, data);
    toast.success('✅ Tipo de auditoría actualizado exitosamente');
    return tipoActualizado;
  } catch (error) {
    console.error('❌ Error actualizando tipo de auditoría:', error);
    toast.error('Error al actualizar tipo de auditoría', {
      description: error instanceof Error ? error.message : 'Error desconocido'
    });
    return null;
  }
}

/**
 * Eliminar un tipo de auditoría
 */
export async function eliminarTipoAuditoria(id: string): Promise<boolean> {
  try {
    await tiposAuditoriaService.delete(id);
    toast.success('✅ Tipo de auditoría eliminado exitosamente');
    return true;
  } catch (error) {
    console.error('❌ Error eliminando tipo de auditoría:', error);
    toast.error('Error al eliminar tipo de auditoría', {
      description: error instanceof Error ? error.message : 'Error desconocido'
    });
    return false;
  }
}

/**
 * Mapear TipoAuditoria del backend al formato del frontend
 */
export function mapearTipoAuditoriaBackendAFrontend(tipo: TipoAuditoria): any {
  return {
    id: tipo.id,
    codigo: tipo.codigo,
    nombre: tipo.nombre,
    descripcion: tipo.descripcion || '',
    alcance: tipo.alcance || '',
    duracionPromedio: tipo.duracionPromedio,
    equipoPromedio: tipo.equipoPromedio,
    color: tipo.color,
    activa: tipo.activa,
    auditoriasProgramadas: tipo.auditoriasProgramadas,
  };
}

/**
 * Mapear datos del frontend al formato del backend
 */
export function mapearTipoAuditoriaFrontendABackend(tipo: any): CreateTipoAuditoriaDto | UpdateTipoAuditoriaDto {
  return {
    codigo: tipo.codigo,
    nombre: tipo.nombre,
    descripcion: tipo.descripcion || undefined,
    alcance: tipo.alcance || undefined,
    duracionPromedio: tipo.duracionPromedio,
    equipoPromedio: tipo.equipoPromedio,
    color: tipo.color,
    activa: tipo.activa,
  };
}
