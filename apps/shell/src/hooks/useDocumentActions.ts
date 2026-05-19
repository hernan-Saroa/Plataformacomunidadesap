/**
 * HOOK: useDocumentActions
 * 
 * Acciones reales de documentos de Carpeta Digital:
 * - Upload: Subida real a Supabase Storage via POST /documentos/upload
 * - Preview: Obtiene signed URL y abre en nueva pestaña
 * - Download: Obtiene signed URL y dispara descarga
 * - Delete: Elimina documento del KV y del storage
 * - Validate/Reject: Cambia estado del documento
 * 
 * Reutilizable en las 4 vistas de carpeta digital.
 * 
 * @version 1.0.0
 * @date 2026-03-09
 */

import { useCallback, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import { documentosService } from '../services/api/supabase.service';

interface DocInfo {
  id: string;
  nombre: string;
  carpeta_id?: string;
  [key: string]: any;
}

interface UseDocumentActionsOptions {
  carpetaId?: string;
  onRefresh?: () => void;
  onDeleteSuccess?: (doc: DocInfo) => void;
}

export function useDocumentActions({ carpetaId, onRefresh, onDeleteSuccess }: UseDocumentActionsOptions = {}) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const pendingCategoriaRef = useRef<string>('otros');
  const pendingTipoDocIdRef = useRef<string | undefined>(undefined);

  // Cleanup hidden file input on unmount
  useEffect(() => {
    return () => {
      if (fileInputRef.current && fileInputRef.current.parentNode) {
        fileInputRef.current.parentNode.removeChild(fileInputRef.current);
        fileInputRef.current = null;
      }
    };
  }, []);

  // ── Upload ──────────────────────────────────────────────────
  const handleUpload = useCallback((categoria?: string, tipoDocumentoId?: string) => {
    if (!carpetaId) {
      toast.error('Error', { description: 'No se ha identificado la carpeta' });
      return;
    }
    pendingCategoriaRef.current = categoria || 'otros';
    pendingTipoDocIdRef.current = tipoDocumentoId;

    // Create or reuse hidden file input
    if (!fileInputRef.current) {
      const input = document.createElement('input');
      input.type = 'file';
      input.style.display = 'none';
      input.accept = '.pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.xlsx,.xls,.pptx,.ppt,.txt,.csv';
      input.addEventListener('change', async () => {
        const file = input.files?.[0];
        if (!file) return;

        if (file.size > 10485760) {
          toast.error('Archivo muy grande', { description: 'El tamaño máximo es 10MB' });
          input.value = '';
          return;
        }

        const toastId = toast.loading(`Subiendo ${file.name}...`);
        try {
          const data = await documentosService.uploadFile(file, carpetaId!, pendingCategoriaRef.current, {
            tipo_documento_id: pendingTipoDocIdRef.current,
          });

          if (data.success) {
            toast.success('Documento subido', { id: toastId, description: `${file.name} subido exitosamente` });
            onRefresh?.();
          } else {
            toast.error('Error al subir', { id: toastId, description: data.error || 'Error desconocido' });
          }
        } catch (err) {
          console.error('Upload error:', err);
          toast.error('Error de conexión', { id: toastId, description: 'No se pudo subir el archivo' });
        } finally {
          input.value = '';
        }
      });
      document.body.appendChild(input);
      fileInputRef.current = input;
    }

    fileInputRef.current.click();
  }, [carpetaId, onRefresh]);

  // ── Preview (signed URL → new tab) ──────────────────────────
  const handlePreview = useCallback(async (doc: DocInfo) => {
    const toastId = toast.loading(`Cargando vista previa de ${doc.nombre}...`);
    try {
      const data = await documentosService.getDownloadUrl(doc.id);

      if (data.success && data.data?.url) {
        toast.dismiss(toastId);
        window.open(data.data.url, '_blank');
      } else {
        toast.error('Error', { id: toastId, description: data.error || 'No se pudo obtener la vista previa' });
      }
    } catch (err) {
      console.error('Preview error:', err);
      toast.error('Error de conexión', { id: toastId, description: 'No se pudo cargar la vista previa' });
    }
  }, []);

  // ── Download (signed URL → trigger download) ────────────────
  const handleDownload = useCallback(async (doc: DocInfo) => {
    const toastId = toast.loading(`Preparando descarga de ${doc.nombre}...`);
    try {
      const data = await documentosService.getDownloadUrl(doc.id);

      if (data.success && data.data?.url) {
        // Trigger download via temporary anchor
        const a = document.createElement('a');
        a.href = data.data.url;
        a.download = doc.nombre || 'documento';
        a.target = '_blank';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        toast.success('Descarga iniciada', { id: toastId, description: doc.nombre });
      } else {
        toast.error('Error', { id: toastId, description: data.error || 'No se pudo descargar el archivo' });
      }
    } catch (err) {
      console.error('Download error:', err);
      toast.error('Error de conexión', { id: toastId, description: 'No se pudo descargar el archivo' });
    }
  }, []);

  // ── Delete ──────────────────────────────────────────────────
  const handleDelete = useCallback(async (doc: DocInfo) => {
    const toastId = toast.loading(`Eliminando ${doc.nombre}...`);
    try {
      const data = await documentosService.delete(doc.id);

      if (data.success) {
        toast.success('Documento eliminado', { id: toastId, description: doc.nombre });
        onDeleteSuccess?.(doc);
        onRefresh?.();
        return true;
      } else {
        toast.error('Error', { id: toastId, description: data.error || 'No se pudo eliminar' });
      }
    } catch (err) {
      console.error('Delete error:', err);
      toast.error('Error de conexión', { id: toastId, description: 'No se pudo eliminar el documento' });
    }
    return false;
  }, [onDeleteSuccess, onRefresh]);

  // ── Validate ────────────────────────────────────────────────
  const handleValidate = useCallback(async (doc: DocInfo) => {
    const toastId = toast.loading(`Validando ${doc.nombre}...`);
    try {
      const data = await documentosService.validarDocumento(doc.id, 'admin');

      if (data.success) {
        toast.success('Documento validado', { id: toastId, description: doc.nombre });
        onRefresh?.();
      } else {
        toast.error('Error', { id: toastId, description: data.error || 'No se pudo validar' });
      }
    } catch (err) {
      console.error('Validate error:', err);
      toast.error('Error de conexión', { id: toastId, description: 'No se pudo validar el documento' });
    }
  }, [onRefresh]);

  // ── Reject ──────────────────────────────────────────────────
  const handleReject = useCallback(async (doc: DocInfo) => {
    const motivo = prompt('Motivo del rechazo (opcional):');
    if (motivo === null) return; // User cancelled the prompt

    const toastId = toast.loading(`Rechazando ${doc.nombre}...`);
    try {
      const data = await documentosService.rechazarDocumento(doc.id, 'admin', motivo || 'Rechazado por el administrador');

      if (data.success) {
        toast.success('Documento rechazado', { id: toastId, description: doc.nombre });
        onRefresh?.();
      } else {
        toast.error('Error', { id: toastId, description: data.error || 'No se pudo rechazar' });
      }
    } catch (err) {
      console.error('Reject error:', err);
      toast.error('Error de conexión', { id: toastId, description: 'No se pudo rechazar el documento' });
    }
  }, [onRefresh]);

  // ── Drop Files (drag-and-drop) ────────────────────────────────
  const handleDropFiles = useCallback(async (files: File[], categoria?: string) => {
    if (!carpetaId) {
      toast.error('Error', { description: 'No se ha identificado la carpeta' });
      return;
    }

    let uploaded = 0;
    let failed = 0;
    const toastId = toast.loading(`Subiendo ${files.length} archivo(s)...`);

    for (const file of files) {
      try {
        const data = await documentosService.uploadFile(file, carpetaId, categoria || 'otros');

        if (data.success) {
          uploaded++;
        } else {
          failed++;
          console.error(`Upload failed for ${file.name}:`, data.error);
        }
      } catch (err) {
        failed++;
        console.error(`Upload error for ${file.name}:`, err);
      }
    }

    if (uploaded > 0 && failed === 0) {
      toast.success(`${uploaded} archivo(s) subido(s) exitosamente`, { id: toastId });
    } else if (uploaded > 0 && failed > 0) {
      toast.warning(`${uploaded} subido(s), ${failed} fallido(s)`, { id: toastId });
    } else {
      toast.error('No se pudo subir ningún archivo', { id: toastId });
    }

    onRefresh?.();
  }, [carpetaId, onRefresh]);

  return {
    handleUpload,
    handlePreview,
    handleDownload,
    handleDelete,
    handleValidate,
    handleReject,
    handleDropFiles,
  };
}
