/**
 * MODAL PARA RECLASIFICAR DOCUMENTO
 * 
 * Permite cambiar la categoria Y el tipo de documento,
 * generando una traza en el historial de versiones.
 * - Muestra tipos de documentos configurados dinámicamente
 * - Categoría se infiere del tipo seleccionado
 * - Cada cambio crea una entrada de version "RECLASIFICACION"
 * 
 * @version 2.0.0
 * @date 2026-03-03
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X, Tag, Save, AlertCircle, CheckCircle, FileText,
  FolderOpen, BookOpen, Award, Briefcase, MoreHorizontal,
  Loader2, ArrowRight, History, User, Shield, Layers
} from 'lucide-react';
import { supabaseService } from '../../services/api/supabase.service';
import { toast } from 'sonner';
import { ModalPortal } from '../ui/ModalPortal';
import { tiposDocumentosService } from '../../services/api/supabase.service';

// ============================================================================
// TYPES
// ============================================================================

type DocumentCategory = string;

interface Documento {
  id: string;
  carpeta_id: string;
  nombre: string;
  categoria: DocumentCategory;
  tipo_archivo: string;
  tamano_bytes: number;
  estado: string;
  tipo_documento_id?: string;
}

interface TipoDocConfig {
  id: string;
  nombre: string;
  categoria: string;
  color: string;
  obligatorio: boolean;
  formatos_permitidos: string[];
  tamano_max_mb: number;
  activo: boolean;
}

interface EditDocumentCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  documento: Documento | null;
  onSuccess: () => void;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const CATEGORY_META: Record<string, {
  label: string; icon: React.ElementType; color: string; bg: string; border: string;
}> = {
  personal:       { label: 'Personal',       icon: User,       color: '#2962FF', bg: 'bg-blue-50',   border: 'border-blue-200' },
  academico:      { label: 'Academico',      icon: BookOpen,   color: '#059669', bg: 'bg-emerald-50', border: 'border-emerald-200' },
  certificados:   { label: 'Certificados',   icon: Shield,     color: '#7C3AED', bg: 'bg-purple-50', border: 'border-purple-200' },
  laboral:        { label: 'Laboral',        icon: Briefcase,  color: '#D97706', bg: 'bg-amber-50',  border: 'border-amber-200' },
  administrativo: { label: 'Administrativo', icon: FolderOpen,  color: '#DC2626', bg: 'bg-red-50',    border: 'border-red-200' },
  otros:          { label: 'Otros',          icon: Layers,     color: '#4B5563', bg: 'bg-gray-50',   border: 'border-gray-200' },
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function EditDocumentCategoryModal({
  isOpen,
  onClose,
  documento,
  onSuccess
}: EditDocumentCategoryModalProps) {
  const [selectedTipoId, setSelectedTipoId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [tiposDocumentos, setTiposDocumentos] = useState<TipoDocConfig[]>([]);
  const [isLoadingTipos, setIsLoadingTipos] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Cargar tipos de documentos
  useEffect(() => {
    if (!isOpen) return;
    const fetchTipos = async () => {
      setIsLoadingTipos(true);
      try {
        const result = await tiposDocumentosService.getAll();
        if (result.success && result.data) {
          setTiposDocumentos(result.data.filter((t: TipoDocConfig) => t.activo));
        }
      } catch (err) {
        console.warn('Error fetching tipos:', err);
      } finally {
        setIsLoadingTipos(false);
      }
    };
    fetchTipos();
  }, [isOpen]);

  // Inicializar seleccion con valores actuales
  useEffect(() => {
    if (documento) {
      setSelectedTipoId(documento.tipo_documento_id || null);
      setSelectedCategory(documento.categoria || 'otros');
    }
  }, [documento]);

  // Agrupar tipos por categoria
  const tiposPorCategoria = tiposDocumentos.reduce<Record<string, TipoDocConfig[]>>((acc, tipo) => {
    const cat = tipo.categoria || 'otros';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(tipo);
    return acc;
  }, {});

  const handleSelectTipo = (tipo: TipoDocConfig) => {
    setSelectedTipoId(tipo.id);
    setSelectedCategory(tipo.categoria);
  };

  const handleSelectCategoryOnly = (cat: string) => {
    setSelectedTipoId(null);
    setSelectedCategory(cat);
  };

  const hasChanged = () => {
    if (!documento) return false;
    if (selectedTipoId && selectedTipoId !== documento.tipo_documento_id) return true;
    if (!selectedTipoId && selectedCategory !== documento.categoria) return true;
    if (!selectedTipoId && documento.tipo_documento_id) return true; // removing tipo link
    return false;
  };

  const handleSave = async () => {
    if (!documento || !hasChanged()) {
      toast.info('No se realizaron cambios');
      onClose();
      return;
    }

    setIsSaving(true);
    try {
      const response = await supabaseService.documentos.updateDocumentCategory(
        documento.id,
        selectedCategory,
        selectedTipoId || undefined
      );

      if (response.success) {
        toast.success('Documento reclasificado', {
          description: `Se creo la traza de reclasificacion v${response.version?.numero_version || '?'} en el historial`
        });
        onSuccess();
        onClose();
      } else {
        throw new Error(response.error || 'Error al reclasificar');
      }
    } catch (error) {
      console.error('Error al reclasificar:', error);
      toast.error('Error al reclasificar documento', {
        description: error instanceof Error ? error.message : 'No se pudo actualizar'
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (!documento) return null;

  const currentCatMeta = CATEGORY_META[documento.categoria] || CATEGORY_META.otros;
  const CurrentIcon = currentCatMeta.icon;
  const currentTipo = tiposDocumentos.find(t => t.id === documento.tipo_documento_id);
  const newCatMeta = CATEGORY_META[selectedCategory] || CATEGORY_META.otros;

  return (
    <ModalPortal isOpen={isOpen}>
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[99998]"
            />

            <div className="fixed inset-0 flex items-center justify-center z-[99999] p-4 pointer-events-none">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="bg-white sm:rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col pointer-events-auto h-full max-h-[100dvh] sm:h-auto sm:max-h-[90vh]"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header */}
                <div className="px-4 sm:px-6 py-4 flex items-center justify-between border-b border-gray-200 flex-shrink-0 sm:rounded-t-2xl"
                  style={{ background: 'linear-gradient(135deg, #003DA5, #2962FF)' }}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                      <Tag className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-white">Reclasificar Documento</h2>
                      <p className="text-xs text-blue-100">Se registrara traza en historial de versiones</p>
                    </div>
                  </div>
                  <button onClick={onClose} disabled={isSaving}
                    className="p-2 hover:bg-white/20 rounded-lg transition-all disabled:opacity-50">
                    <X className="w-5 h-5 text-white" />
                  </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 sm:space-y-5">
                  {/* Current document info */}
                  <div className="bg-gray-50 rounded-xl border border-gray-200 p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
                        <FileText className="w-5 h-5 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-gray-900 truncate">{documento.nombre}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-gray-500">Clasificacion actual:</span>
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${currentCatMeta.bg} ${currentCatMeta.border} border`}
                            style={{ color: currentCatMeta.color }}>
                            <CurrentIcon className="w-3 h-3" />
                            {currentTipo ? currentTipo.nombre : currentCatMeta.label}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Tipo selector */}
                  <div>
                    <label className="block text-sm font-bold text-gray-900 mb-3">
                      Selecciona el nuevo tipo de documento
                    </label>

                    {isLoadingTipos ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                        <span className="ml-2 text-sm text-gray-500">Cargando tipos...</span>
                      </div>
                    ) : tiposDocumentos.length > 0 ? (
                      <div className="space-y-4">
                        {Object.entries(tiposPorCategoria).map(([cat, tipos]) => {
                          const catMeta = CATEGORY_META[cat] || CATEGORY_META.otros;
                          const CatIcon = catMeta.icon;
                          return (
                            <div key={cat}>
                              <div className="flex items-center gap-2 mb-2">
                                <CatIcon className="w-4 h-4" style={{ color: catMeta.color }} />
                                <span className="text-xs font-bold uppercase tracking-wider" style={{ color: catMeta.color }}>
                                  {catMeta.label}
                                </span>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {tipos.map(tipo => {
                                  const isSelected = selectedTipoId === tipo.id;
                                  const isCurrent = documento.tipo_documento_id === tipo.id;
                                  return (
                                    <button
                                      key={tipo.id}
                                      onClick={() => handleSelectTipo(tipo)}
                                      disabled={isSaving}
                                      className={`text-left px-3 py-2.5 rounded-lg border-2 transition-all text-xs ${
                                        isSelected
                                          ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                                          : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50/50'
                                      } disabled:opacity-50`}
                                    >
                                      <div className="flex items-center gap-2">
                                        <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                                          style={{ background: (tipo.color || catMeta.color) + '15' }}>
                                          <CatIcon className="w-3.5 h-3.5" style={{ color: tipo.color || catMeta.color }} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <p className="font-bold text-gray-900 truncate">{tipo.nombre}</p>
                                          {tipo.obligatorio && (
                                            <span className="text-[9px] text-red-500 font-bold">OBLIGATORIO</span>
                                          )}
                                        </div>
                                        {isSelected && <CheckCircle className="w-4 h-4 text-blue-600 flex-shrink-0" />}
                                        {isCurrent && !isSelected && (
                                          <span className="text-[9px] font-bold text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">ACTUAL</span>
                                        )}
                                      </div>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}

                        {/* Option: assign only category without specific tipo */}
                        <div className="border-t border-gray-200 pt-3 mt-2">
                          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-2">
                            O asignar solo categoria (sin tipo especifico)
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {Object.entries(CATEGORY_META).map(([cat, meta]) => {
                              const CIcon = meta.icon;
                              const isSelected = !selectedTipoId && selectedCategory === cat;
                              return (
                                <button
                                  key={cat}
                                  onClick={() => handleSelectCategoryOnly(cat)}
                                  disabled={isSaving}
                                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[11px] font-bold transition-all ${
                                    isSelected
                                      ? `${meta.bg} ${meta.border} ring-2 ring-blue-200`
                                      : 'border-gray-200 hover:border-blue-300 bg-white'
                                  } disabled:opacity-50`}
                                  style={isSelected ? { color: meta.color } : { color: '#6B7280' }}
                                >
                                  <CIcon className="w-3 h-3" />
                                  {meta.label}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* Fallback: solo categorias si no hay tipos configurados */
                      <div className="space-y-2">
                        {Object.entries(CATEGORY_META).map(([cat, meta]) => {
                          const CIcon = meta.icon;
                          const isSelected = selectedCategory === cat;
                          const isCurrent = documento.categoria === cat && !documento.tipo_documento_id;
                          return (
                            <button
                              key={cat}
                              onClick={() => handleSelectCategoryOnly(cat)}
                              disabled={isSaving}
                              className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-all flex items-center gap-3 ${
                                isSelected
                                  ? `${meta.bg} ${meta.border} ring-2 ring-blue-200`
                                  : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50/50'
                              } disabled:opacity-50`}
                            >
                              <div className={`w-10 h-10 rounded-xl ${meta.bg} flex items-center justify-center flex-shrink-0`}>
                                <CIcon className="w-5 h-5" style={{ color: meta.color }} />
                              </div>
                              <div className="flex-1">
                                <p className="text-sm font-bold" style={{ color: meta.color }}>{meta.label}</p>
                              </div>
                              {isSelected && <CheckCircle className="w-5 h-5 text-blue-600" />}
                              {isCurrent && !isSelected && (
                                <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded">ACTUAL</span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Change preview */}
                  {hasChanged() && (
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-blue-50 border border-blue-200 rounded-xl p-4"
                    >
                      <div className="flex items-start gap-3">
                        <History className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-sm font-bold text-blue-900 mb-1">Traza de reclasificacion</p>
                          <div className="flex items-center gap-2 text-xs text-blue-700 flex-wrap">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full ${currentCatMeta.bg} border ${currentCatMeta.border}`}
                              style={{ color: currentCatMeta.color }}>
                              <CurrentIcon className="w-3 h-3" />
                              {currentTipo ? currentTipo.nombre : currentCatMeta.label}
                            </span>
                            <ArrowRight className="w-4 h-4 text-blue-400" />
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full ${newCatMeta.bg} border ${newCatMeta.border}`}
                              style={{ color: newCatMeta.color }}>
                              {(() => { const NI = newCatMeta.icon; return <NI className="w-3 h-3" />; })()}
                              {selectedTipoId
                                ? tiposDocumentos.find(t => t.id === selectedTipoId)?.nombre || newCatMeta.label
                                : newCatMeta.label}
                            </span>
                          </div>
                          <p className="text-[10px] text-blue-500 mt-2">
                            Se creara una entrada de version con etiqueta "RECLASIFICACION" en el historial del documento.
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </div>

                {/* Footer */}
                <div className="bg-gray-50 px-4 sm:px-5 py-3.5 flex items-center justify-end gap-2 sm:gap-3 border-t border-gray-200 sm:rounded-b-2xl flex-shrink-0">
                  <button onClick={onClose} disabled={isSaving}
                    className="px-5 py-2.5 border border-gray-300 bg-white hover:bg-gray-50 rounded-xl font-semibold text-sm text-gray-700 transition-all disabled:opacity-50">
                    Cancelar
                  </button>
                  <button onClick={handleSave} disabled={isSaving || !hasChanged()}
                    className="px-5 py-2.5 rounded-xl font-semibold text-sm text-white transition-all shadow-lg hover:shadow-xl disabled:opacity-50 flex items-center gap-2"
                    style={{ background: hasChanged() ? '#003DA5' : '#9CA3AF' }}>
                    {isSaving ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Reclasificando...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        Reclasificar con traza
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </ModalPortal>
  );
}
