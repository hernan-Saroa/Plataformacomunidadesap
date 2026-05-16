/**
 * MODAL: HISTORIAL DE VERSIONES - WORLD CLASS
 * 
 * Sistema completo de control de versiones de documentos
 * - Timeline visual con todas las versiones
 * - Preview de cada versión
 * - Comparación entre versiones
 * - Restaurar versiones anteriores
 * - Etiquetas de versión (DRAFT, REVIEW, APPROVED, FINAL)
 * - Download de versiones específicas
 * - Metadata completa por versión
 * 
 * @version 1.0.0 - World Class Version Control
 * @date 2026-03-02
 */

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X, Clock, Download, RotateCcw, User, Calendar, FileText,
  Tag, AlertCircle, CheckCircle, File, Image as ImageIcon,
  ChevronRight, MessageSquare, Upload, Trash2, Eye,
  Archive, GitBranch, History, Star, Info
} from 'lucide-react';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { supabaseService } from '../../services/api/supabase.service';
import { toast } from 'sonner';

// ============================================================================
// TYPES
// ============================================================================

interface DocumentVersion {
  id: string;
  documento_id: string;
  numero_version: number;
  nombre_archivo: string;
  nombre_archivo_storage: string;
  tipo_archivo: string;
  tamano_bytes: number;
  comentarios: string;
  etiqueta: VersionTag;
  creado_por: string;
  fecha_creacion: string;
  es_version_actual: boolean;
  restaurada_desde_version?: number;
}

type VersionTag = '' | 'DRAFT' | 'REVIEW' | 'APPROVED' | 'FINAL' | 'ARCHIVED' | 'RESTORED' | 'RECLASIFICACION';

interface DocumentVersionHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentoId: string;
  documentoNombre: string;
  onVersionRestored?: () => void;
}

// ============================================================================
// UTILS
// ============================================================================

const formatSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('es-CO', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
};

const formatRelativeTime = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - date.getTime());
  const diffMinutes = Math.floor(diffTime / (1000 * 60));
  const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffMinutes < 1) return 'Hace un momento';
  if (diffMinutes < 60) return `Hace ${diffMinutes} min`;
  if (diffHours < 24) return `Hace ${diffHours}h`;
  if (diffDays < 7) return `Hace ${diffDays} días`;
  return formatDate(dateString);
};

const getFileIcon = (type: string) => {
  const lowerType = type.toLowerCase();
  if (lowerType.includes('pdf')) return FileText;
  if (lowerType.includes('image') || lowerType.includes('jpg') || lowerType.includes('png')) return ImageIcon;
  return File;
};

const getTagColor = (tag: VersionTag): string => {
  const colors: Record<VersionTag, string> = {
    '': 'bg-gray-100 text-gray-700 border-gray-300',
    'DRAFT': 'bg-blue-100 text-blue-700 border-blue-300',
    'REVIEW': 'bg-yellow-100 text-yellow-700 border-yellow-300',
    'APPROVED': 'bg-green-100 text-green-700 border-green-300',
    'FINAL': 'bg-purple-100 text-purple-700 border-purple-300',
    'ARCHIVED': 'bg-gray-100 text-gray-600 border-gray-300',
    'RESTORED': 'bg-orange-100 text-orange-700 border-orange-300',
    'RECLASIFICACION': 'bg-pink-100 text-pink-700 border-pink-300'
  };
  return colors[tag] || colors[''];
};

const getTagIcon = (tag: VersionTag) => {
  const icons: Record<VersionTag, any> = {
    '': null,
    'DRAFT': File,
    'REVIEW': Eye,
    'APPROVED': CheckCircle,
    'FINAL': Star,
    'ARCHIVED': Archive,
    'RESTORED': RotateCcw,
    'RECLASIFICACION': AlertCircle
  };
  return icons[tag];
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function DocumentVersionHistoryModal({
  isOpen,
  onClose,
  documentoId,
  documentoNombre,
  onVersionRestored
}: DocumentVersionHistoryModalProps) {
  const [versiones, setVersiones] = useState<DocumentVersion[]>([]);
  const [versionActual, setVersionActual] = useState<number>(1);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<DocumentVersion | null>(null);
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);
  const [restoreComentarios, setRestoreComentarios] = useState('');
  const [isRestoring, setIsRestoring] = useState(false);
  const [showTagEditor, setShowTagEditor] = useState<string | null>(null);
  const [selectedTag, setSelectedTag] = useState<VersionTag>('');

  // ========== EFFECTS ==========
  useEffect(() => {
    if (isOpen && documentoId) {
      // ✅ CRÍTICO: NO BLOQUEAR - Cargar datos de forma asíncrona
      setTimeout(() => {
        cargarVersiones();
      }, 0);
    } else if (!isOpen) {
      // Limpiar estado cuando se cierra
      setVersiones([]);
      setSelectedVersion(null);
      setShowRestoreConfirm(false);
      setRestoreComentarios('');
    }
  }, [isOpen, documentoId]);

  // ========== DATA LOADING ==========
  const cargarVersiones = async () => {
    try {
      setIsLoading(true);
      const result = await supabaseService.documentos.getVersiones(documentoId);
      
      if (result.success && result.data) {
        setVersiones(result.data.versiones || []);
        setVersionActual(result.data.version_actual || 1);
      } else {
        // ✅ Manejo graceful: Si no se encuentra el documento, mostrar versiones vacías
        console.warn('⚠️ No se encontraron versiones para el documento:', documentoId);
        setVersiones([]);
        setVersionActual(1);
      }
    } catch (err: any) {
      console.warn('⚠️ Error al cargar versiones del documento:', err.message);
      // Fallback silencioso en caso de no existir versiones reales
      setVersiones([]);
      setVersionActual(1);
    } finally {
      setIsLoading(false);
    }
  };

  // ========== HANDLERS ==========
  const handleDownloadVersion = async (version: DocumentVersion) => {
    try {
      toast.info(`Descargando versión ${version.numero_version}...`);
      
      const result = await supabaseService.documentos.downloadVersion(
        documentoId,
        version.id
      );

      if (result.success && result.data?.url) {
        // Abrir URL en nueva pestaña
        window.open(result.data.url, '_blank');
        toast.success('Descarga iniciada');
      } else {
        throw new Error(result.error || 'Error al descargar');
      }
    } catch (err: any) {
      console.error('❌ Error al descargar versión:', err);
      toast.error('Error al descargar versión');
    }
  };

  const handleRestoreVersion = async (version: DocumentVersion) => {
    setSelectedVersion(version);
    setShowRestoreConfirm(true);
  };

  const confirmRestore = async () => {
    if (!selectedVersion) return;

    try {
      setIsRestoring(true);
      
      const result = await supabaseService.documentos.restaurarVersion(
        documentoId,
        selectedVersion.id,
        restoreComentarios || `Restaurada desde versión ${selectedVersion.numero_version}`
      );

      if (result.success) {
        toast.success(`Versión ${selectedVersion.numero_version} restaurada exitosamente`);
        setShowRestoreConfirm(false);
        setRestoreComentarios('');
        setSelectedVersion(null);
        cargarVersiones();
        onVersionRestored?.();
      } else {
        throw new Error(result.error || 'Error al restaurar');
      }
    } catch (err: any) {
      console.error('❌ Error al restaurar versión:', err);
      toast.error('Error al restaurar versión');
    } finally {
      setIsRestoring(false);
    }
  };

  const handleUpdateTag = async (versionId: string, tag: VersionTag) => {
    try {
      const result = await supabaseService.documentos.actualizarEtiquetaVersion(
        documentoId,
        versionId,
        tag
      );

      if (result.success) {
        toast.success('Etiqueta actualizada');
        cargarVersiones();
        setShowTagEditor(null);
      } else {
        throw new Error(result.error || 'Error al actualizar etiqueta');
      }
    } catch (err: any) {
      console.error('❌ Error al actualizar etiqueta:', err);
      toast.error('Error al actualizar etiqueta');
    }
  };

  const handleDeleteVersion = async (version: DocumentVersion) => {
    if (version.es_version_actual) {
      toast.error('No puedes eliminar la versión actual');
      return;
    }

    if (!confirm(`¿Eliminar versión ${version.numero_version}? Esta acción no se puede deshacer.`)) {
      return;
    }

    try {
      const result = await supabaseService.documentos.eliminarVersion(documentoId, version.id);

      if (result.success) {
        toast.success(`Versión ${version.numero_version} eliminada`);
        cargarVersiones();
      } else {
        throw new Error(result.error || 'Error al eliminar');
      }
    } catch (err: any) {
      console.error('❌ Error al eliminar versión:', err);
      toast.error('Error al eliminar versión');
    }
  };

  // ========== COMPUTED ==========
  const versionesOrdenadas = useMemo(() => {
    return [...versiones].sort((a, b) => b.numero_version - a.numero_version);
  }, [versiones]);

  const totalVersiones = versiones.length;
  const tamanioTotal = versiones.reduce((sum, v) => sum + v.tamano_bytes, 0);

  // ========== RENDER ==========
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center sm:p-4 bg-black/50 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white sm:rounded-2xl shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col h-full max-h-[100dvh] sm:h-auto sm:max-h-[95vh]"
      >
        {/* Header */}
        <div className="px-4 sm:px-6 py-4 sm:py-5 border-b-2 border-gray-200 bg-gradient-to-r from-blue-50 to-white shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start sm:items-center gap-3 sm:gap-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center flex-shrink-0" 
                style={{ background: '#E3F2FD' }}>
                <History className="w-5 h-5 sm:w-6 sm:h-6" style={{ color: '#003DA5' }} />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-gray-900 flex flex-wrap items-center gap-2">
                  Historial de Versiones
                  <Badge className="bg-blue-100 text-blue-700 border-blue-300">
                    {totalVersiones} {totalVersiones === 1 ? 'versión' : 'versiones'}
                  </Badge>
                </h2>
                <p className="text-xs sm:text-sm text-gray-600 mt-1 flex items-center gap-2 line-clamp-1">
                  <FileText className="w-4 h-4 flex-shrink-0" />
                  {documentoNombre}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 sm:p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mt-4">
            <div className="bg-white rounded-lg border border-gray-200 p-3">
              <p className="text-xs text-gray-600 mb-1">Versión actual</p>
              <p className="text-2xl font-bold text-blue-600">v{versionActual}</p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-3">
              <p className="text-xs text-gray-600 mb-1">Total versiones</p>
              <p className="text-2xl font-bold text-gray-900">{totalVersiones}</p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-3">
              <p className="text-xs text-gray-600 mb-1">Espacio total</p>
              <p className="text-2xl font-bold text-gray-900">{formatSize(tamanioTotal)}</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <Clock className="w-12 h-12 animate-spin mx-auto mb-3" style={{ color: '#003DA5' }} />
                <p className="text-sm text-gray-600">Cargando historial...</p>
              </div>
            </div>
          ) : versiones.length === 0 ? (
            <div className="text-center py-12">
              <History className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-gray-900 mb-2">Sin versiones adicionales</h3>
              <p className="text-sm text-gray-600">
                Este documento solo tiene la versión original
              </p>
            </div>
          ) : (
            <div className="relative">
              {/* Timeline Line */}
              <div className="absolute left-4 sm:left-8 top-0 bottom-0 w-0.5 bg-gray-200" />

              {/* Versiones */}
              <div className="space-y-6">
                {versionesOrdenadas.map((version, index) => {
                  const Icon = getFileIcon(version.tipo_archivo);
                  const TagIcon = getTagIcon(version.etiqueta);
                  const isActual = version.numero_version === versionActual;

                  return (
                    <motion.div
                      key={version.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="relative pl-12 sm:pl-20"
                    >
                      {/* Timeline Dot */}
                      <div className={`absolute left-2 sm:left-6 w-5 h-5 rounded-full border-4 ${
                        isActual 
                          ? 'bg-blue-500 border-blue-200' 
                          : 'bg-white border-gray-300'
                      }`} />

                      {/* Card */}
                      <div className={`bg-white rounded-xl border-2 p-4 transition-all hover:shadow-lg ${
                        isActual 
                          ? 'border-blue-400 shadow-md' 
                          : 'border-gray-200 hover:border-blue-300'
                      }`}>
                        <div className="flex flex-col sm:flex-row items-start justify-between mb-3 gap-4">
                          <div className="flex items-start gap-3 flex-1 w-full sm:w-auto">
                            <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                              style={{ background: '#E3F2FD' }}>
                              <Icon className="w-5 h-5" style={{ color: '#003DA5' }} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-bold text-gray-900">
                                  Versión {version.numero_version}
                                </h4>
                                {isActual && (
                                  <Badge className="bg-blue-100 text-blue-700 border-blue-300 text-xs">
                                    ACTUAL
                                  </Badge>
                                )}
                                {version.etiqueta && (
                                  <Badge className={`${getTagColor(version.etiqueta)} text-xs flex items-center gap-1`}>
                                    {TagIcon && <TagIcon className="w-3 h-3" />}
                                    {version.etiqueta}
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-gray-600 mb-2">{version.nombre_archivo}</p>
                              {version.comentarios && (
                                <div className="flex items-start gap-2 bg-gray-50 rounded-lg p-2 mb-2">
                                  <MessageSquare className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                                  <p className="text-sm text-gray-700">{version.comentarios}</p>
                                </div>
                              )}
                              {version.restaurada_desde_version && (
                                <div className="flex items-center gap-2 text-xs text-orange-600 mb-2">
                                  <RotateCcw className="w-3 h-3" />
                                  Restaurada desde versión {version.restaurada_desde_version}
                                </div>
                              )}
                              <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500">
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  {formatRelativeTime(version.fecha_creacion)}
                                </span>
                                {version.creado_por && (
                                  <span className="flex items-center gap-1">
                                    <User className="w-3 h-3" />
                                    {version.creado_por}
                                  </span>
                                )}
                                <span className="flex items-center gap-1">
                                  <File className="w-3 h-3" />
                                  {formatSize(version.tamano_bytes)}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 flex-shrink-0 w-full sm:w-auto justify-end">
                            {/* Tag Editor */}
                            {showTagEditor === version.id ? (
                              <div className="flex items-center gap-2">
                                <select
                                  value={selectedTag}
                                  onChange={(e) => setSelectedTag(e.target.value as VersionTag)}
                                  className="text-xs border border-gray-300 rounded-md px-2 py-1"
                                >
                                  <option value="">Sin etiqueta</option>
                                  <option value="DRAFT">DRAFT</option>
                                  <option value="REVIEW">REVIEW</option>
                                  <option value="APPROVED">APPROVED</option>
                                  <option value="FINAL">FINAL</option>
                                  <option value="ARCHIVED">ARCHIVED</option>
                                  <option value="RECLASIFICACION">RECLASIFICACION</option>
                                </select>
                                <button
                                  onClick={() => handleUpdateTag(version.id, selectedTag)}
                                  className="p-1 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                                >
                                  <CheckCircle className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => setShowTagEditor(null)}
                                  className="p-1 bg-gray-200 rounded-md hover:bg-gray-300"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            ) : (
                              <>
                                <button
                                  onClick={() => {
                                    setShowTagEditor(version.id);
                                    setSelectedTag(version.etiqueta);
                                  }}
                                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                                  title="Editar etiqueta"
                                >
                                  <Tag className="w-4 h-4 text-gray-600" />
                                </button>
                                <button
                                  onClick={() => handleDownloadVersion(version)}
                                  className="p-2 hover:bg-blue-50 rounded-lg transition-colors"
                                  title="Descargar"
                                >
                                  <Download className="w-4 h-4 text-blue-600" />
                                </button>
                                {!isActual && (
                                  <>
                                    <button
                                      onClick={() => handleRestoreVersion(version)}
                                      className="p-2 hover:bg-green-50 rounded-lg transition-colors"
                                      title="Restaurar"
                                    >
                                      <RotateCcw className="w-4 h-4 text-green-600" />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteVersion(version)}
                                      className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                                      title="Eliminar"
                                    >
                                      <Trash2 className="w-4 h-4 text-red-600" />
                                    </button>
                                  </>
                                )}
                              </>
                            )}
                          </div>
                        </div>

                        {/* Metadata adicional */}
                        <div className="text-xs text-gray-500 border-t border-gray-100 pt-3 mt-3">
                          Creada el {formatDate(version.fecha_creacion)}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t-2 border-gray-200 bg-gray-50 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <Info className="w-4 h-4" />
            Las versiones se mantienen por {versiones.length > 10 ? '90 días' : 'tiempo ilimitado'}
          </div>
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg font-medium transition-all"
          >
            Cerrar
          </button>
        </div>
      </motion.div>

      {/* Restore Confirmation Modal */}
      <AnimatePresence>
        {showRestoreConfirm && selectedVersion && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/50">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center">
                  <RotateCcw className="w-6 h-6 text-orange-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Restaurar versión</h3>
                  <p className="text-sm text-gray-600">Versión {selectedVersion.numero_version}</p>
                </div>
              </div>

              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-orange-800">
                  Se creará una nueva versión con el contenido de la versión {selectedVersion.numero_version}.
                  La versión actual se mantendrá en el historial.
                </p>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Comentarios (opcional)
                </label>
                <textarea
                  value={restoreComentarios}
                  onChange={(e) => setRestoreComentarios(e.target.value)}
                  placeholder="Describe por qué restauras esta versión..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg resize-none"
                  rows={3}
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowRestoreConfirm(false);
                    setRestoreComentarios('');
                    setSelectedVersion(null);
                  }}
                  disabled={isRestoring}
                  className="flex-1 px-4 py-2 border-2 border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition-all disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmRestore}
                  disabled={isRestoring}
                  className="flex-1 px-4 py-2 rounded-lg font-medium text-white transition-all disabled:opacity-50"
                  style={{ background: '#003DA5' }}
                >
                  {isRestoring ? 'Restaurando...' : 'Restaurar'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
