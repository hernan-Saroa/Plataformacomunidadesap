/**
 * Lógica de negocio para Listas de Chequeo
 * Funciones para llamar desde el componente sin modificar el formulario
 */

import { 
  listasChequeoService, 
  type ListaChequeo, 
  type CreateListaChequeoDto, 
  type UpdateListaChequeoDto,
  type ItemListaChequeo as ItemListaChequeoBackend
} from '../../../../services/api/listasChequeoService';
import { toast } from 'sonner@2.0.3';

// Tipos del frontend (más simples)
export interface ItemChequeo {
  id: string;
  texto: string;
  categoria: string;
  obligatorio: boolean;
}

export interface ListaChequeoFrontend {
  id: string;
  nombre: string;
  tipoAuditoria: string;
  descripcion: string;
  items: ItemChequeo[];
  activa: boolean;
  usosProgramados: number;
  fechaCreacion: string;
  ultimaActualizacion: string;
}

/**
 * Cargar todas las listas de chequeo
 */
export async function cargarListasChequeo(includeInactive: boolean = false): Promise<ListaChequeoFrontend[]> {
  try {
    const listas = await listasChequeoService.getAll(includeInactive);
    return listas.map(mapearListaChequeoBackendAFrontend);
  } catch (error) {
    console.error('❌ Error cargando listas de chequeo:', error);
    toast.error('Error al cargar listas de chequeo', {
      description: error instanceof Error ? error.message : 'Error desconocido'
    });
    return [];
  }
}

/**
 * Crear una nueva lista de chequeo
 */
export async function crearListaChequeo(data: any): Promise<ListaChequeoFrontend | null> {
  try {
    const datosBackend = mapearListaChequeoFrontendABackend(data);
    const nuevaLista = await listasChequeoService.create(datosBackend);
    toast.success('✅ Lista de chequeo creada exitosamente');
    return mapearListaChequeoBackendAFrontend(nuevaLista);
  } catch (error) {
    console.error('❌ Error creando lista de chequeo:', error);
    toast.error('Error al crear lista de chequeo', {
      description: error instanceof Error ? error.message : 'Error desconocido'
    });
    return null;
  }
}

/**
 * Actualizar una lista de chequeo
 */
export async function actualizarListaChequeo(id: string, data: any): Promise<ListaChequeoFrontend | null> {
  try {
    const datosBackend = mapearListaChequeoFrontendABackend(data);
    const listaActualizada = await listasChequeoService.update(id, datosBackend);
    toast.success('✅ Lista de chequeo actualizada exitosamente');
    return mapearListaChequeoBackendAFrontend(listaActualizada);
  } catch (error) {
    console.error('❌ Error actualizando lista de chequeo:', error);
    toast.error('Error al actualizar lista de chequeo', {
      description: error instanceof Error ? error.message : 'Error desconocido'
    });
    return null;
  }
}

/**
 * Eliminar una lista de chequeo
 */
export async function eliminarListaChequeo(id: string): Promise<boolean> {
  try {
    await listasChequeoService.delete(id);
    toast.success('✅ Lista de chequeo eliminada exitosamente');
    return true;
  } catch (error) {
    console.error('❌ Error eliminando lista de chequeo:', error);
    toast.error('Error al eliminar lista de chequeo', {
      description: error instanceof Error ? error.message : 'Error desconocido'
    });
    return false;
  }
}

/**
 * Mapear ListaChequeo del backend al formato del frontend
 */
export function mapearListaChequeoBackendAFrontend(lista: ListaChequeo): ListaChequeoFrontend {
  return {
    id: lista.id,
    nombre: lista.nombre,
    tipoAuditoria: lista.tipoAuditoria?.nombre || 'Regular',
    descripcion: lista.descripcion || '',
    items: (lista.items || []).map(item => ({
      id: item.id,
      texto: item.texto,
      categoria: item.categoria || 'General',
      obligatorio: item.obligatorio || false,
    })),
    activa: lista.activa,
    usosProgramados: lista.usosProgramados,
    fechaCreacion: lista.createdAt ? new Date(lista.createdAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    ultimaActualizacion: lista.updatedAt ? new Date(lista.updatedAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
  };
}

/**
 * Mapear datos del frontend al formato del backend
 */
export function mapearListaChequeoFrontendABackend(lista: any): CreateListaChequeoDto | UpdateListaChequeoDto {
  // Generar código si no existe
  const codigo = lista.codigo || `LC-${lista.nombre.substring(0, 3).toUpperCase()}-${Date.now().toString().slice(-3)}`;
  
  return {
    codigo,
    nombre: lista.nombre,
    descripcion: lista.descripcion || undefined,
    tipoAuditoriaId: lista.tipoAuditoriaId || undefined,
    items: (lista.items || []).map((item: ItemChequeo, index: number) => ({
      texto: item.texto,
      categoria: item.categoria || undefined,
      obligatorio: item.obligatorio !== undefined ? item.obligatorio : false,
      orden: index,
    })),
    activa: lista.activa !== undefined ? lista.activa : true,
  };
}
