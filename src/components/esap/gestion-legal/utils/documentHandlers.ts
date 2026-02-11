/**
 * HANDLERS COMUNES DE DOCUMENTOS - GESTIÓN LEGAL
 * Funciones reutilizables para operaciones con documentos
 */

import { toast } from 'sonner@2.0.3';

// ============================================================================
// TIPOS
// ============================================================================
export interface Documento {
  id?: number | string;
  nombre: string;
  tipo?: string;
  tamaño?: string;
  tamano?: number;
  archivo?: string;
  fecha?: Date | string;
}

// ============================================================================
// HANDLERS DE VISUALIZACIÓN
// ============================================================================

/**
 * Ver documento en visor
 */
export const handleVerDocumento = (doc: Documento, callback?: () => void) => {
  toast.loading('📄 Cargando visor de documentos...', { 
    duration: 1000,
    id: 'ver-documento'
  });
  
  setTimeout(() => {
    toast.success('✅ Documento cargado', {
      description: doc.nombre,
      duration: 2000
    });
    
    if (callback) callback();
  }, 1000);
};

// ============================================================================
// HANDLERS DE DESCARGA
// ============================================================================

/**
 * Descargar documento individual
 */
export const handleDescargarDocumento = (doc: Documento) => {
  toast.loading('⏳ Preparando descarga...', {
    id: 'descargar-doc',
    duration: 1000
  });
  
  setTimeout(() => {
    const tamaño = doc.tamaño || doc.tamano ? `${doc.tamaño || formatBytes(doc.tamano || 0)}` : '';
    
    toast.success('✅ Descarga iniciada', {
      description: `${doc.nombre} ${tamaño}`,
      duration: 3000
    });
    
    // Simular descarga
    setTimeout(() => {
      toast.info('📥 Descarga completada', {
        description: `El archivo se guardó en tu carpeta de descargas`,
        duration: 2000
      });
    }, 2000);
  }, 1000);
};

/**
 * Descargar múltiples documentos (ZIP)
 */
export const handleDescargarTodos = (documentos: Documento[], nombreArchivo: string = 'expediente') => {
  const totalDocs = documentos.length;
  
  if (totalDocs === 0) {
    toast.warning('⚠️ Sin documentos', {
      description: 'No hay documentos para descargar',
      duration: 2000
    });
    return;
  }
  
  toast.loading('📦 Preparando archivo ZIP...', {
    id: 'descargar-todos',
    duration: 2000
  });
  
  setTimeout(() => {
    toast.success('✅ Generando archivo comprimido', {
      description: `Comprimiendo ${totalDocs} documento(s)`,
      duration: 3000
    });
    
    setTimeout(() => {
      toast.success('📥 Descarga iniciada', {
        description: `${nombreArchivo}.zip está listo`,
        duration: 4000
      });
    }, 2000);
  }, 2000);
};

/**
 * Exportar a PDF
 */
export const handleDescargarPDF = (titulo: string, descripcion?: string) => {
  toast.loading('📄 Generando reporte PDF...', {
    id: 'exportar-pdf',
    duration: 2000
  });
  
  setTimeout(() => {
    toast.success('✅ PDF generado exitosamente', {
      description: descripcion || titulo,
      duration: 3000
    });
    
    setTimeout(() => {
      toast.info('📥 Descarga completada', {
        description: `${titulo}.pdf se guardó en descargas`,
        duration: 2000
      });
    }, 1500);
  }, 2000);
};

// ============================================================================
// HANDLERS DE ELIMINACIÓN
// ============================================================================

/**
 * Eliminar documento con confirmación
 */
export const handleEliminarDocumento = (
  id: number | string,
  nombre: string,
  onConfirm: () => void
) => {
  // Mostrar confirmación (en un caso real usarías un modal)
  const confirmar = confirm(`¿Eliminar "${nombre}"?`);
  
  if (confirmar) {
    toast.loading('🗑️ Eliminando documento...', {
      id: 'eliminar-doc',
      duration: 1000
    });
    
    setTimeout(() => {
      onConfirm();
      
      toast.success('✅ Documento eliminado', {
        description: nombre,
        duration: 2000
      });
    }, 1000);
  }
};

// ============================================================================
// HANDLERS DE CARGA
// ============================================================================

/**
 * Subir documentos con validación
 */
export const handleCargarDocumentos = (
  files: FileList | File[],
  opciones?: {
    maxSize?: number; // en MB
    allowedTypes?: string[];
    onSuccess?: (files: File[]) => void;
  }
) => {
  const archivos = Array.from(files);
  const maxSizeMB = opciones?.maxSize || 10;
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  
  // Validar tamaño
  const archivosGrandes = archivos.filter(f => f.size > maxSizeBytes);
  if (archivosGrandes.length > 0) {
    toast.error('📦 Archivos muy grandes', {
      description: `${archivosGrandes.length} archivo(s) exceden ${maxSizeMB}MB`,
      duration: 4000
    });
    return false;
  }
  
  // Validar tipos
  if (opciones?.allowedTypes) {
    const tiposPermitidos = opciones.allowedTypes;
    const archivosInvalidos = archivos.filter(f => {
      const ext = f.name.split('.').pop()?.toLowerCase();
      return !tiposPermitidos.includes(`.${ext}`);
    });
    
    if (archivosInvalidos.length > 0) {
      toast.error('❌ Tipo de archivo no permitido', {
        description: `Permitidos: ${tiposPermitidos.join(', ')}`,
        duration: 4000
      });
      return false;
    }
  }
  
  // Success
  toast.success('✅ Archivos cargados', {
    description: `${archivos.length} archivo(s) agregado(s)`,
    duration: 2000
  });
  
  if (opciones?.onSuccess) {
    opciones.onSuccess(archivos);
  }
  
  return true;
};

// ============================================================================
// UTILIDADES
// ============================================================================

/**
 * Formatear bytes a tamaño legible
 */
export const formatBytes = (bytes: number, decimales: number = 1): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const dm = decimales < 0 ? 0 : decimales;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

/**
 * Obtener icono según tipo de documento
 */
export const getDocumentoIcon = (tipo: string): string => {
  const tipoNormalizado = tipo.toLowerCase();
  
  const iconos: Record<string, string> = {
    'pdf': '📄',
    'doc': '📝',
    'docx': '📝',
    'xls': '📊',
    'xlsx': '📊',
    'jpg': '🖼️',
    'jpeg': '🖼️',
    'png': '🖼️',
    'zip': '📦',
    'rar': '📦',
    'mp4': '🎥',
    'mp3': '🎵',
    'txt': '📃',
    'default': '📎'
  };
  
  return iconos[tipoNormalizado] || iconos['default'];
};

/**
 * Validar extensión de archivo
 */
export const esExtensionValida = (nombreArchivo: string, extensionesPermitidas: string[]): boolean => {
  const ext = nombreArchivo.split('.').pop()?.toLowerCase();
  return ext ? extensionesPermitidas.includes(`.${ext}`) : false;
};
