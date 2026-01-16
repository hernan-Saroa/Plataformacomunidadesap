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
import { toast } from 'sonner';

// Tipos del frontend (más simples)
export interface ItemChequeo {
  id: string;
  texto: string;
  categoria: string;
  obligatorio: boolean;
}

// Enum para tipo de lista de chequeo
export enum TipoListaChequeoFrontend {
  PLANEACION = 'planeacion',
  EJECUCION = 'ejecucion',
  COMUNICACION = 'comunicacion'
}

export interface ListaChequeoFrontend {
  id: string;
  nombre: string;
  tipo: TipoListaChequeoFrontend; // Tipo de lista: planeacion, ejecucion, comunicacion
  tipoAuditoria: string;
  tipoAuditoriaId?: string; // ID del tipo de auditoría para el backend
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
 * @param data - Datos de la lista
 * @param tiposAuditoria - Array de tipos de auditoría para resolver el ID por nombre
 */
export async function crearListaChequeo(
  data: any, 
  tiposAuditoria?: Array<{ id: string; nombre: string }>
): Promise<ListaChequeoFrontend | null> {
  try {
    const datosBackend = mapearListaChequeoFrontendABackend(data, tiposAuditoria) as CreateListaChequeoDto;
    console.log('[ListaChequeo] 📤 Enviando datos al backend:', datosBackend);
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
 * @param id - ID de la lista a actualizar
 * @param data - Datos de la lista
 * @param tiposAuditoria - Array de tipos de auditoría para resolver el ID por nombre
 */
export async function actualizarListaChequeo(
  id: string, 
  data: any,
  tiposAuditoria?: Array<{ id: string; nombre: string }>
): Promise<ListaChequeoFrontend | null> {
  try {
    const datosBackend = mapearListaChequeoFrontendABackend(data, tiposAuditoria);
    console.log('[ListaChequeo] 📤 Actualizando con datos:', datosBackend);
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
  // Mapear el tipo del backend al enum del frontend
  const tipoMapeado = (lista.tipo as string) || TipoListaChequeoFrontend.EJECUCION;
  
  return {
    id: lista.id,
    nombre: lista.nombre,
    tipo: tipoMapeado as TipoListaChequeoFrontend, // Incluir el tipo de lista
    tipoAuditoria: lista.tipoAuditoria?.nombre || '',
    tipoAuditoriaId: lista.tipoAuditoriaId || lista.tipoAuditoria?.id || undefined,
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
 * @param lista - Datos de la lista desde el frontend
 * @param tiposAuditoria - Array de tipos de auditoría para buscar el ID por nombre
 */
export function mapearListaChequeoFrontendABackend(
  lista: any, 
  tiposAuditoria?: Array<{ id: string; nombre: string }>
): CreateListaChequeoDto | UpdateListaChequeoDto {
  // Generar código si no existe
  const codigo = lista.codigo || `LC-${lista.nombre.substring(0, 3).toUpperCase()}-${Date.now().toString().slice(-3)}`;
  
  // Resolver el tipo de auditoría ID
  let tipoAuditoriaId: string | undefined = undefined;
  
  // Primero intentar usar tipoAuditoriaId si ya viene
  if (lista.tipoAuditoriaId) {
    tipoAuditoriaId = lista.tipoAuditoriaId;
  }
  // Si viene tipoAuditoria como objeto con id
  else if (lista.tipoAuditoria && typeof lista.tipoAuditoria === 'object' && lista.tipoAuditoria.id) {
    tipoAuditoriaId = lista.tipoAuditoria.id;
  }
  // Si viene tipoAuditoria como string (nombre), buscar en el array de tipos
  else if (lista.tipoAuditoria && typeof lista.tipoAuditoria === 'string' && tiposAuditoria) {
    const tipoEncontrado = tiposAuditoria.find((t) => t.nombre === lista.tipoAuditoria);
    if (tipoEncontrado) {
      tipoAuditoriaId = tipoEncontrado.id;
    }
  }
  
  // Mapear el tipo de lista de chequeo (planeacion, ejecucion, comunicacion)
  const tipoLista = lista.tipo || TipoListaChequeoFrontend.EJECUCION;
  
  return {
    codigo,
    nombre: lista.nombre,
    descripcion: lista.descripcion || '',
    tipo: tipoLista, // Usar el tipo de lista correcto (planeacion, ejecucion, comunicacion)
    tipoAuditoriaId: tipoAuditoriaId || undefined,
    items: (lista.items || []).map((item: ItemChequeo, index: number) => ({
      texto: item.texto,
      categoria: item.categoria || undefined,
      obligatorio: item.obligatorio !== undefined ? item.obligatorio : false,
      orden: index,
    })),
    activa: lista.activa !== undefined ? lista.activa : true,
  };
}
