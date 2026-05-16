/**
 * MÓDULO PREMIUM: CARPETA DIGITAL WORLD CLASS
 * 
 * Sistema avanzado de gestión documental universitaria
 * - Vista de grilla y lista optimizada
 * - Drag & Drop para subir archivos
 * - Validación y gestión de estados
 * - Vista previa de documentos
 * - Descarga individual y masiva
 * - Búsqueda y filtros avanzados
 * - 100% conectado a Supabase
 * 
 * @version 2.0.3 - Fix: Agregado keys a elementos condicionales
 * @date 2026-03-03
 */

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import {
  FolderOpen, Search, Filter, Eye, ChevronLeft, FileText,
  Image as ImageIcon, File, MoreVertical, Download, Trash2,
  CheckCircle, XCircle, Clock, Upload, Grid3X3, List,
  User, Calendar, AlertCircle, Check, X, MessageSquare,
  RotateCcw, Archive, Share2, Star, Tag, Loader2,
  ChevronRight, FolderPlus, FileUp, RefreshCw,
  Settings, TrendingUp, Mail, GitBranch, History, Keyboard,
  Square, CheckSquare, Move, Command, GripVertical, Zap,
  ClipboardCheck
} from 'lucide-react';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { supabaseService } from '../../services/api/supabase.service';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { Container4K } from '../ui/container-4k';
import { ResponsiveHeader } from '../ui/responsive-header';
import { DocumentUploadModal } from './DocumentUploadModal';
import { DocumentPreviewModal } from './DocumentPreviewModal';
import { DocumentVersionHistoryModal } from './DocumentVersionHistoryModal';
import { DocumentNewVersionModal } from './DocumentNewVersionModal';
import { DocumentsListView } from './DocumentsListView';
import { DocumentsWorldClassView } from './DocumentsWorldClassView';
import { EditDocumentCategoryModal } from './EditDocumentCategoryModal';
import {
  searchContainerStyle, searchContainerClass,
  searchIconWrapStyle, searchIconWrapClass, searchIconStyle,
  searchInputStyle, clearButtonStyle, clearButtonClass, clearIconStyle,
} from './shared/designTokens';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { ConfiguracionTiposDocumentos } from './ConfiguracionTiposDocumentos';
import { DigitalFolderSection } from './DigitalFolderSection';
import { ChecklistMatrixView } from './ChecklistMatrixView';
import { tiposDocumentosService } from '../../services/api/supabase.service';
import { useScopeFilter } from '../../hooks/useScopeFilter'; // ✅ SCOPE FILTER

// [ACTUALIZACIÓN 2026-03-03]: Correcciones de protección contra undefined en filtros y ordenamientos

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

type ViewMode = 'grid' | 'list' | 'checklist';
type ViewType = 'folders' | 'documents';

type DocumentCategory =
  | 'personal'
  | 'academico'
  | 'certificados'
  | 'laboral'
  | 'administrativo'
  | 'otros';

type DocumentStatus =
  | 'validado'
  | 'pendiente'
  | 'rechazado'
  | 'vencido';

interface CarpetaDigital {
  id: string;
  persona_id: string;
  nombre_carpeta: string;
  email_propietario: string;
  numero_documento?: string;
  total_documentos: number;
  documentos_completos: number;
  documentos_pendientes: number;
  documentos_rechazados: number;
  documentos_vencidos: number;
  ultima_actualizacion: string;
  fecha_creacion: string;
}

interface Documento {
  id: string;
  carpeta_id: string;
  nombre: string;
  categoria: DocumentCategory;
  tipo_archivo: string;
  tamano_bytes: number;
  estado: DocumentStatus;
  url_archivo?: string;
  fecha_subida: string;
  fecha_validacion?: string;
  validado_por?: string;
  comentarios?: string;
  fecha_vencimiento?: string;
  version_actual?: number;
  modificado_por?: string;
  ultima_modificacion?: string;
  tipo_documento_id?: string;
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
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - date.getTime());
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Hoy';
  if (diffDays === 1) return 'Ayer';
  if (diffDays < 7) return `Hace ${diffDays} días`;
  if (diffDays < 30) return `Hace ${Math.floor(diffDays / 7)} semanas`;
  if (diffDays < 365) return `Hace ${Math.floor(diffDays / 30)} meses`;
  return `Hace ${Math.floor(diffDays / 365)} años`;
};

const getFileIcon = (type: string) => {
  const lowerType = (type || '').toLowerCase();
  if (lowerType.includes('pdf')) return FileText;
  if (lowerType.includes('jpg') || lowerType.includes('png') || lowerType.includes('jpeg') || lowerType.includes('image')) return ImageIcon;
  if (lowerType.includes('doc')) return FileText;
  if (lowerType.includes('xls')) return FileText;
  return File;
};

const getFileIconColor = (type: string) => {
  const lowerType = (type || '').toLowerCase();
  if (lowerType.includes('pdf')) return '#EF4444';
  if (lowerType.includes('jpg') || lowerType.includes('png') || lowerType.includes('jpeg') || lowerType.includes('image')) return '#8B5CF6';
  if (lowerType.includes('doc')) return '#3B82F6';
  if (lowerType.includes('xls')) return '#10B981';
  return '#6B7280';
};

const getCategoryLabel = (category: DocumentCategory): string => {
  const labels: Record<DocumentCategory, string> = {
    personal: 'Personal',
    academico: 'Académico',
    certificados: 'Certificados',
    laboral: 'Laboral',
    administrativo: 'Administrativo',
    otros: 'Otros'
  };
  return labels[category] || category;
};

const getStatusBadgeProps = (status: DocumentStatus) => {
  const props = {
    validado: {
      className: 'bg-green-100 text-green-700 border-green-300',
      icon: CheckCircle,
      label: 'Validado'
    },
    pendiente: {
      className: 'bg-yellow-100 text-yellow-700 border-yellow-300',
      icon: Clock,
      label: 'Pendiente'
    },
    rechazado: {
      className: 'bg-red-100 text-red-700 border-red-300',
      icon: XCircle,
      label: 'Rechazado'
    },
    vencido: {
      className: 'bg-orange-100 text-orange-700 border-orange-300',
      icon: AlertCircle,
      label: 'Vencido'
    }
  };
  return props[status] || props.pendiente;
};

const normalizeDocumentText = (value: unknown): string =>
  String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\.[a-z0-9]+$/i, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function CarpetaDigitalModule() {
  // ========== STATE ==========
  const [viewType, setViewType] = useState<ViewType>('folders');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [selectedCarpetaId, setSelectedCarpetaId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'all' | DocumentCategory>('all');
  const [selectedStatus, setSelectedStatus] = useState<'all' | DocumentStatus>('all');
  const [carpetasSortBy, setCarpetasSortBy] = useState<string>('creacion_desc');
  const [sortBy, setSortBy] = useState<'nombre' | 'fecha' | 'tamano'>('fecha');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);

  // Data state
  const [carpetas, setCarpetas] = useState<CarpetaDigital[]>([]);
  const [documentos, setDocumentos] = useState<Documento[]>([]);
  const [isLoadingCarpetas, setIsLoadingCarpetas] = useState(true);
  const [isLoadingDocumentos, setIsLoadingDocumentos] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Upload state
  const [isUploading, setIsUploading] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [selectedDocumento, setSelectedDocumento] = useState<Documento | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Version control state
  const [showVersionHistoryModal, setShowVersionHistoryModal] = useState(false);
  const [showNewVersionModal, setShowNewVersionModal] = useState(false);
  const [selectedDocumentoForVersion, setSelectedDocumentoForVersion] = useState<Documento | null>(null);

  // Edit category state
  const [showEditCategoryModal, setShowEditCategoryModal] = useState(false);
  const [selectedDocumentoForCategory, setSelectedDocumentoForCategory] = useState<Documento | null>(null);

  // Delete confirmation dialogs
  const [showDeleteConfirmDialog, setShowDeleteConfirmDialog] = useState(false);
  const [showDeleteSingleConfirmDialog, setShowDeleteSingleConfirmDialog] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<Documento | null>(null);

  // Config modal state
  const [showConfigTiposDocumentos, setShowConfigTiposDocumentos] = useState(false);

  // Tipos de documentos requeridos (checklist)
  const [tiposDocumentos, setTiposDocumentos] = useState<any[]>([]);

  // ========== WORLD-CLASS FEATURES: Selection, Drag & Drop, Keyboard Shortcuts ==========
  const [selectedCarpetaIds, setSelectedCarpetaIds] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // ========== COMMAND PALETTE ==========
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [commandSearch, setCommandSearch] = useState('');
  const commandInputRef = useRef<HTMLInputElement>(null);

  // ========== DRAG & DROP STATE ==========
  const [draggedCarpetaId, setDraggedCarpetaId] = useState<string | null>(null);
  const [carpetaOrder, setCarpetaOrder] = useState<string[]>([]);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);

  // ✅ SCOPE FILTER - Filtrado por alcance territorial del rol
  const { applyAllFilters, scopeBadge, isGlobal: isScopeGlobal } = useScopeFilter();
  const scopedCarpetas = useMemo(() => applyAllFilters(carpetas), [carpetas, applyAllFilters]);

  // ========== COMPUTED VALUES (BEFORE EFFECTS) ==========
  const filteredCarpetas = useMemo(() => {
    const filtered = scopedCarpetas.filter(carpeta => {
      const matchesSearch =
        (carpeta.nombre_carpeta || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (carpeta.email_propietario || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (carpeta.numero_documento && carpeta.numero_documento.includes(searchQuery));

      return matchesSearch;
    });

    // Apply custom order if available OR sorting method
    if (carpetasSortBy === 'custom' && carpetaOrder.length > 0) {
      return filtered.sort((a, b) => {
        const indexA = carpetaOrder.indexOf(a.id);
        const indexB = carpetaOrder.indexOf(b.id);
        // If not in order array, put at end
        if (indexA === -1) return 1;
        if (indexB === -1) return -1;
        return indexA - indexB;
      });
    }

    filtered.sort((a, b) => {
      if (carpetasSortBy === 'alfabetico') {
        return (a.nombre_carpeta || '').localeCompare(b.nombre_carpeta || '');
      } else if (carpetasSortBy === 'creacion_asc') {
        return new Date(a.fecha_creacion || 0).getTime() - new Date(b.fecha_creacion || 0).getTime();
      } else if (carpetasSortBy === 'creacion_desc') {
        return new Date(b.fecha_creacion || 0).getTime() - new Date(a.fecha_creacion || 0).getTime();
      }
      return 0;
    });

    return filtered;
  }, [carpetas, searchQuery, carpetaOrder, carpetasSortBy]);

  const ITEMS_PER_PAGE = 24;
  const paginatedCarpetas = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredCarpetas.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredCarpetas, currentPage]);

  const totalPages = Math.ceil(filteredCarpetas.length / ITEMS_PER_PAGE);

  // Reset page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  // ========== EFFECTS ==========
  useEffect(() => {
    cargarCarpetas();
  }, []);

  useEffect(() => {
    if (selectedCarpetaId) {
      cargarDocumentos(selectedCarpetaId);
    }
  }, [selectedCarpetaId]);

  // Load tipos de documentos when documents change
  useEffect(() => {
    if (selectedCarpetaId) {
      cargarTiposDocumentos();
    }
  }, [selectedCarpetaId, documentos.length]);

  // Initialize carpeta order when carpetas are loaded
  useEffect(() => {
    if (carpetas.length > 0 && carpetaOrder.length === 0) {
      setCarpetaOrder(carpetas.map(c => c.id));
    }
  }, [carpetas]);

  // Focus command palette input when opened
  useEffect(() => {
    if (showCommandPalette) {
      setTimeout(() => commandInputRef.current?.focus(), 100);
    }
  }, [showCommandPalette]);

  // ========== KEYBOARD SHORTCUTS ==========
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + A: Select All
      if ((e.metaKey || e.ctrlKey) && e.key === 'a' && viewType === 'folders') {
        e.preventDefault();
        if (filteredCarpetas.length > 0) {
          setIsSelectionMode(true);
          setSelectedCarpetaIds(new Set(filteredCarpetas.map(c => c.id)));
          toast.success(`${filteredCarpetas.length} carpetas seleccionadas`, {
            icon: <CheckSquare className="w-4 h-4" />
          });
        }
      }

      // Cmd/Ctrl + D: Deselect All
      if ((e.metaKey || e.ctrlKey) && e.key === 'd' && viewType === 'folders') {
        e.preventDefault();
        setSelectedCarpetaIds(new Set());
        setIsSelectionMode(false);
        toast.info('Selección cancelada');
      }

      // Escape: Clear selection / Close modals
      if (e.key === 'Escape') {
        if (isSelectionMode) {
          setSelectedCarpetaIds(new Set());
          setIsSelectionMode(false);
        }
        if (showKeyboardShortcuts) {
          setShowKeyboardShortcuts(false);
        }
      }

      // Cmd/Ctrl + F: Focus search
      if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
        e.preventDefault();
        searchInputRef.current?.focus();
        toast.info('Buscador activado', {
          icon: <Search className="w-4 h-4" />
        });
      }

      // ?: Show keyboard shortcuts
      if (e.key === '?' && !e.shiftKey && viewType === 'folders') {
        setShowKeyboardShortcuts(!showKeyboardShortcuts);
      }

      // Delete: Delete selected folders (with confirmation)
      if (e.key === 'Delete' && selectedCarpetaIds.size > 0) {
        e.preventDefault();
        toast.info('Eliminar carpetas: funcionalidad protegida', {
          description: 'Requiere confirmación administrativa'
        });
      }

      // Cmd/Ctrl + K: Command palette
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowCommandPalette(!showCommandPalette);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [viewType, filteredCarpetas, isSelectionMode, selectedCarpetaIds, showKeyboardShortcuts]);

  // ========== DATA LOADING ==========
  const cargarCarpetas = async () => {
    try {
      setIsLoadingCarpetas(true);
      setError(null);
      const result = await supabaseService.documentos.getAllCarpetas();

      if (result.success) {
        // Filtro de seguridad: excluir carpetas sin usuario asociado válido
        const carpetasValidas = (result.data || []).filter((c: CarpetaDigital) =>
          c.persona_id && c.persona_id.trim() !== '' &&
          c.nombre_carpeta && c.nombre_carpeta.trim() !== ''
        );
        const excluidas = (result.data || []).length - carpetasValidas.length;
        if (excluidas > 0) {
          console.warn(`⚠️ ${excluidas} carpeta(s) huérfana(s) excluida(s) (sin usuario asociado)`);
        }
        setCarpetas(carpetasValidas);
      } else {
        throw new Error('Error al cargar carpetas digitales');
      }
    } catch (err: any) {
      console.warn('⚠️ Error al cargar carpetas:', err.message);
      setError(err.message || 'Error al cargar carpetas');

      // Manejo específico para timeout
      if (err.message && err.message.includes('Timeout')) {
        toast.warning('La carga está tardando más de lo esperado', {
          description: 'El servidor está procesando muchos datos. Por favor espera...'
        });
      } else {
        toast.error('Error al cargar carpetas', {
          description: 'No se pudieron cargar las carpetas digitales'
        });
      }
    } finally {
      setIsLoadingCarpetas(false);
    }
  };

  const cargarDocumentos = async (carpetaId: string) => {
    try {
      console.log('═══════════════════════════════════════════════════════════════');
      console.log('📥 FRONTEND - CARGAR DOCUMENTOS DE CARPETA');
      console.log('═══════════════════════════════════════════════════════════════');
      console.log('📂 Carpeta ID:', carpetaId);
      console.log('───────────────────────────────────────────────────────────────');

      setIsLoadingDocumentos(true);
      const result = await supabaseService.documentos.getDocumentosByCarpeta(carpetaId);

      console.log('📥 Respuesta del backend:', result);

      if (result.success) {
        const docs = result.data || [];
        console.log(`✅ ${docs.length} documentos cargados exitosamente`);
        console.log('📋 Lista de documentos cargados:');
        docs.forEach((doc: Documento, idx: number) => {
          console.log(`   ${idx + 1}. "${doc.nombre}" (ID: "${doc.id}", Estado: ${doc.estado})`);
        });
        console.log('═══════════════════════════════════════════════════════════════');
        setDocumentos(docs);
      } else {
        throw new Error(result.error || 'Error al cargar documentos');
      }
    } catch (err: any) {
      console.error('❌ Error al cargar documentos:', err.message);
      console.log('═══════════════════════════════════════════════════════════════');

      // Manejo específico para timeout
      if (err.message && err.message.includes('Timeout')) {
        toast.warning('La carga está tardando más de lo esperado', {
          description: 'Intenta recargar la página o verifica tu conexión'
        });
      } else {
        toast.error('Error al cargar documentos', {
          description: 'No se pudieron cargar los documentos de esta carpeta'
        });
      }

      setDocumentos([]);
    } finally {
      setIsLoadingDocumentos(false);
    }
  };

  const cargarTiposDocumentos = async () => {
    try {
      const personaId = selectedCarpeta?.persona_id || selectedCarpetaId || '';
      const result = await supabaseService.documentos.getChecklistForPersona(personaId);
      const tiposRaw = result.success && result.data?.tiposDocumentos
        ? result.data.tiposDocumentos
        : [];

      if (result.success) {
        const tiposChecklist = result.data
          ? tiposRaw.filter((t: any) => t.activo !== false)
          .map((tipo: any) => {
            const tipoNombre = normalizeDocumentText(tipo.nombre_documento || tipo.nombre);

            const matchedDoc = documentos.find((d) => {
              if (d.tipo_documento_id && d.tipo_documento_id === tipo.id) return true;
              if (d.tipo_documento_id) return false;
              const docNombre = normalizeDocumentText(d.nombre);
              return !!tipoNombre && !!docNombre && (docNombre.includes(tipoNombre) || tipoNombre.includes(docNombre));
            });

            return {
              id: tipo.id,
              nombre: tipo.nombre,
              descripcion: tipo.descripcion || '',
              categoria: tipo.categoria || 'otros',
              obligatorio: !!tipo.obligatorio,
              requiere_validacion: !!tipo.requiere_validacion,
              formatos_permitidos: tipo.formatos_permitidos || [],
              color: tipo.color || '#6B7280',
              icono: tipo.icono || 'file-text',
              completado: !!matchedDoc,
              documento: matchedDoc || null,
            };
          }) : [];
        setTiposDocumentos(tiposChecklist);
      }
    } catch (err) {
      console.warn('No se pudieron cargar tipos de documentos:', err);
      setTiposDocumentos([]);
    }
  };

  // ========== COMPUTED VALUES ==========
  const selectedCarpeta = useMemo(() => {
    if (!selectedCarpetaId) return null;
    return carpetas.find(c => c.id === selectedCarpetaId);
  }, [selectedCarpetaId, carpetas]);

  const globalMetrics = useMemo(() => {
    return {
      totalCarpetas: carpetas.length,
      totalDocumentos: carpetas.reduce((sum, c) => sum + (c.total_documentos || 0), 0),
      documentosValidados: carpetas.reduce((sum, c) => sum + (c.documentos_completos || 0), 0),
      documentosPendientes: carpetas.reduce((sum, c) => sum + (c.documentos_pendientes || 0), 0),
      documentosRechazados: carpetas.reduce((sum, c) => sum + (c.documentos_rechazados || 0), 0),
      documentosVencidos: carpetas.reduce((sum, c) => sum + (c.documentos_vencidos || 0), 0),
    };
  }, [carpetas]);

  const filteredDocumentos = useMemo(() => {
    let filtered = documentos;

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(d => d.categoria === selectedCategory);
    }

    // Filter by status
    if (selectedStatus !== 'all') {
      filtered = filtered.filter(d => d.estado === selectedStatus);
    }

    // Filter by search
    if (searchQuery) {
      filtered = filtered.filter(d =>
        (d.nombre || '').toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Sort
    filtered = [...filtered].sort((a, b) => {
      let comparison = 0;

      if (sortBy === 'nombre') {
        comparison = (a.nombre || '').localeCompare(b.nombre || '');
      } else if (sortBy === 'fecha') {
        comparison = new Date(a.fecha_subida || 0).getTime() - new Date(b.fecha_subida || 0).getTime();
      } else if (sortBy === 'tamano') {
        comparison = (a.tamano_bytes || 0) - (b.tamano_bytes || 0);
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [documentos, selectedCategory, selectedStatus, searchQuery, sortBy, sortOrder]);

  // ========== COMPUTED VALUES: MÉTRICAS DE DOCUMENTOS DESDE DOCUMENTOS REALES ==========
  const documentMetrics = useMemo(() => {
    // Calcular métricas REALES desde los documentos cargados, no desde la carpeta
    const total = documentos.length;
    const validados = documentos.filter(d => d.estado === 'validado').length;
    const pendientes = documentos.filter(d => d.estado === 'pendiente').length;
    const rechazados = documentos.filter(d => d.estado === 'rechazado').length;
    const vencidos = documentos.filter(d => d.estado === 'vencido').length;

    return {
      total,
      validados,
      pendientes,
      rechazados,
      vencidos
    };
  }, [documentos]);

  // ========== HANDLERS ==========
  const handleOpenCarpeta = (carpetaId: string) => {
    setSelectedCarpetaId(carpetaId);
    setViewType('documents');
    setSearchQuery('');
    setSelectedCategory('all');
    setSelectedStatus('all');
  };

  const handleBackToFolders = () => {
    setViewType('folders');
    setSelectedCarpetaId(null);
    setSearchQuery('');
  };

  const handleUploadFiles = () => {
    setShowUploadModal(true);
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    // TODO: Implementar upload a Supabase Storage
    toast.info('Subiendo archivos...', {
      description: 'Funcionalidad en implementación'
    });
  };

  const handleDeleteAllDocuments = async () => {
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('🗑️ FRONTEND - ELIMINAR TODOS LOS DOCUMENTOS');
    console.log('═══════════════════════════════════════════════════════════════');
    toast.info('Eliminando todos los documentos...', { duration: 1000 });

    try {
      console.log('📤 Enviando petición de eliminación masiva...');
      const result = await supabaseService.documentos.eliminarTodosLosDocumentos();
      console.log('📥 Respuesta del backend:', JSON.stringify(result, null, 2));

      if (result.success) {
        console.log('✅ Eliminación exitosa');
        console.log('📊 Estadísticas:', result.stats);
        toast.success(
          `✅ Eliminación completada: ${result.stats.documentos_eliminados} documentos eliminados`,
          { duration: 3000 }
        );

        // Recargar las carpetas
        console.log('🔄 Recargando carpetas...');
        await cargarCarpetas();

        // Limpiar selección
        setSelectedCarpetaId(null);
        setDocumentos([]);
        console.log('✅ UI actualizada - selección limpiada');
      } else {
        console.error('❌ Respuesta con success: false');
        console.error('Error del backend:', result.error);
        toast.error(`Error: ${result.error || 'Error desconocido'}`);
      }
      console.log('═══════════════════════════════════════════════════════════════');
    } catch (error: any) {
      console.error('═══════════════════════════════════════════════════════════════');
      console.error('❌ EXCEPCIÓN AL ELIMINAR DOCUMENTOS');
      console.error('═══════════════════════════════════════════════════════════════');
      console.error('Tipo de error:', typeof error);
      console.error('Error completo:', error);
      console.error('Mensaje:', error.message);
      console.error('Stack:', error.stack);
      console.error('═══════════════════════════════════════════════════════════════');

      toast.error(`⚠️ Error al eliminar: ${error.message}`, {
        duration: 5000,
        description: 'Revisa la consola para más detalles'
      });
    }
  };

  const handlePreviewDocumento = (documento: Documento) => {
    console.log('👁️ FRONTEND - PREVIEW DOCUMENTO:', documento.nombre, 'ID:', documento.id);

    toast.info('Cargando vista previa...', { duration: 1000 });

    (async () => {
      try {
        const result = await supabaseService.documentos.getDownloadUrl(documento.id);
        if (result.success && result.data?.url) {
          const docWithUrl = { ...documento, url_archivo: result.data.url };
          setSelectedDocumento(docWithUrl);
          setShowPreviewModal(true);
        } else {
          console.warn('No signed URL available, opening modal without preview');
          setSelectedDocumento(documento);
          setShowPreviewModal(true);
        }
      } catch (err: any) {
        console.warn('Error fetching preview URL:', err.message);
        setSelectedDocumento(documento);
        setShowPreviewModal(true);
      }
    })();
  };

  const handleShowVersionHistory = (documento: Documento) => {
    console.log('📜 CLICK VERSION HISTORY - Documento:', documento.nombre);
    console.log('📜 ID del documento:', documento.id);
    console.log('📜 Documento completo:', documento);
    // ✅ NO BLOQUEANTE: Ejecutar en el siguiente tick
    requestAnimationFrame(() => {
      console.log('📜 ABRIENDO MODAL VERSION HISTORY');
      setSelectedDocumentoForVersion(documento);
      setShowVersionHistoryModal(true);
    });
  };

  const handleCreateNewVersion = (documento: Documento) => {
    // ✅ NO BLOQUEANTE: Ejecutar en el siguiente tick
    setTimeout(() => {
      setSelectedDocumentoForVersion(documento);
      setShowNewVersionModal(true);
    }, 0);
  };

  const handleVersionCreated = () => {
    // Recargar documentos después de crear una versión
    if (selectedCarpetaId) {
      cargarDocumentos(selectedCarpetaId);
    }
  };

  const handleVersionRestored = () => {
    // Recargar documentos después de restaurar una versión
    if (selectedCarpetaId) {
      cargarDocumentos(selectedCarpetaId);
    }
  };

  const handleEditCategory = (documento: Documento) => {
    // ✅ NO BLOQUEANTE: Ejecutar en el siguiente tick
    setTimeout(() => {
      setSelectedDocumentoForCategory(documento);
      setShowEditCategoryModal(true);
    }, 0);
  };

  const handleCategoryUpdated = () => {
    // Recargar documentos después de actualizar categoría
    if (selectedCarpetaId) {
      cargarDocumentos(selectedCarpetaId);
    }
  };

  // ========== DELETE HANDLERS ==========
  const handleInitiateDeleteDocument = (documento: Documento) => {
    setDocumentToDelete(documento);
    setShowDeleteSingleConfirmDialog(true);
  };

  const handleConfirmDeleteDocument = async () => {
    if (!documentToDelete) return;

    console.log('🗑️ ELIMINANDO DOCUMENTO INDIVIDUAL:', documentToDelete.nombre);
    toast.info('Eliminando documento...', { duration: 500 });

    try {
      const result = await supabaseService.documentos.delete(documentToDelete.id);
      if (result.success) {
        toast.success('Documento eliminado exitosamente');
        cargarDocumentos(selectedCarpetaId || '');
      } else {
        toast.error('No se pudo eliminar el documento', {
          description: result.error || 'Error desconocido'
        });
      }
    } catch (err: any) {
      console.error('❌ Error al eliminar documento:', err);
      if (err.message?.includes('Timeout') || err.message?.includes('tardó')) {
        toast.error('Timeout de eliminación', {
          description: 'El servidor no responde. Intente más tarde.'
        });
      } else {
        toast.error('Error al eliminar documento', {
          description: err.message || 'Error desconocido'
        });
      }
    } finally {
      setDocumentToDelete(null);
      setShowDeleteSingleConfirmDialog(false);
    }
  };

  // ========== SELECTION HANDLERS ==========
  const handleToggleSelection = (carpetaId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    setIsSelectionMode(true);
    const newSelection = new Set(selectedCarpetaIds);
    if (newSelection.has(carpetaId)) {
      newSelection.delete(carpetaId);
      if (newSelection.size === 0) {
        setIsSelectionMode(false);
      }
    } else {
      newSelection.add(carpetaId);
    }
    setSelectedCarpetaIds(newSelection);
  };

  const handleSelectAll = () => {
    setIsSelectionMode(true);
    setSelectedCarpetaIds(new Set(filteredCarpetas.map(c => c.id)));
    toast.success(`${filteredCarpetas.length} carpetas seleccionadas`);
  };

  const handleDeselectAll = () => {
    setSelectedCarpetaIds(new Set());
    setIsSelectionMode(false);
  };

  const handleBulkDownload = async () => {
    toast.info(`Descargando ${selectedCarpetaIds.size} carpetas`, {
      description: 'Preparando archivo ZIP...',
      icon: <Archive className="w-4 h-4" />
    });
    // TODO: Implementar descarga masiva
  };

  const handleBulkShare = () => {
    toast.info(`Compartir ${selectedCarpetaIds.size} carpetas`, {
      description: 'Funcionalidad próximamente',
      icon: <Share2 className="w-4 h-4" />
    });
  };

  const handleBulkNotify = () => {
    toast.info(`Notificar ${selectedCarpetaIds.size} usuarios`, {
      description: 'Funcionalidad próximamente',
      icon: <Mail className="w-4 h-4" />
    });
  };

  // ========== DRAG & DROP HANDLERS ==========
  const handleDragStart = (carpetaId: string) => {
    setDraggedCarpetaId(carpetaId);
    setIsDragging(true);
    toast.info('Arrastra para reordenar', {
      icon: <Move className="w-4 h-4" />,
      duration: 2000
    });
  };

  const handleDragEnd = () => {
    setDraggedCarpetaId(null);
    setIsDragging(false);
    setDropTargetId(null);
  };

  const handleDrop = (targetCarpetaId: string) => {
    if (!draggedCarpetaId || draggedCarpetaId === targetCarpetaId) {
      handleDragEnd();
      return;
    }

    const newOrder = [...carpetaOrder];
    const draggedIndex = newOrder.indexOf(draggedCarpetaId);
    const targetIndex = newOrder.indexOf(targetCarpetaId);

    // Remove dragged item
    newOrder.splice(draggedIndex, 1);
    // Insert at target position
    newOrder.splice(targetIndex, 0, draggedCarpetaId);

    setCarpetaOrder(newOrder);
    toast.success('Carpeta reordenada', {
      icon: <Move className="w-4 h-4" />
    });
    handleDragEnd();
  };

  // ========== RENDER: LOADING STATE ==========
  if (isLoadingCarpetas) {
    return (
      <DndProvider backend={HTML5Backend}>
        <Container4K>
          <div className="flex items-center justify-center min-h-[500px]">
            <div className="text-center">
              <Loader2 className="w-16 h-16 animate-spin mx-auto mb-4" style={{ color: '#003DA5' }} />
              <p className="text-base font-medium text-gray-900">Cargando Carpeta Digital</p>
              <p className="text-sm text-gray-600 mt-1">Obteniendo datos ...</p>
            </div>
          </div>
        </Container4K>
      </DndProvider>
    );
  }

  // ========== RENDER: ERROR STATE ==========
  if (error && carpetas.length === 0) {
    return (
      <DndProvider backend={HTML5Backend}>
        <Container4K>
          <div className="flex items-center justify-center min-h-[500px]">
            <div className="text-center max-w-md">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Error al cargar carpetas</h3>
              <p className="text-sm text-gray-600 mb-6">{error}</p>
              <button
                onClick={cargarCarpetas}
                className="px-6 py-3 rounded-lg font-medium text-white transition-all hover:shadow-lg"
                style={{ background: '#003DA5' }}
              >
                <RefreshCw className="w-4 h-4 inline mr-2" />
                Reintentar
              </button>
            </div>
          </div>
        </Container4K>
      </DndProvider>
    );
  }

  // ========== RENDER: FOLDERS VIEW ==========
  if (viewType === 'folders') {
    return (
      <DndProvider backend={HTML5Backend}>
        <Container4K>
          {/* Header World-Class */}
          <div className="mb-8 w-full max-w-full overflow-hidden">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 md:gap-6 mb-8 w-full relative">
              <div className="flex items-center gap-4 shrink-0 min-w-0 w-full sm:w-auto">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg shrink-0"
                  style={{ background: 'linear-gradient(135deg, #2962FF 0%, #003DA5 100%)' }}>
                  <FolderOpen className="w-7 h-7 text-white" strokeWidth={2} />
                </div>
                <div className="min-w-0">
                  <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1 truncate">Carpeta Digital</h1>
                  <p className="text-xs sm:text-sm text-gray-600 truncate">
                    Gestión documental universitaria de clase mundial
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full lg:w-auto justify-start lg:justify-end">


                <div className="flex gap-2 w-full sm:w-auto scrollbar-hide overflow-x-auto pb-1 sm:pb-0">
                  <button
                    onClick={cargarCarpetas}
                    className="px-4 sm:px-5 h-[44px] bg-white border-2 border-gray-200 rounded-xl hover:border-blue-300 hover:bg-blue-50 transition-all flex items-center justify-center gap-2 shadow-sm font-medium text-sm whitespace-nowrap flex-1 sm:flex-none"
                  >
                    <RefreshCw className="w-4 h-4 shrink-0" />
                    <span className="hidden sm:inline">Actualizar</span>
                  </button>

                  <button
                    onClick={() => setShowKeyboardShortcuts(true)}
                    className="w-[44px] h-[44px] flex items-center justify-center bg-white border-2 border-gray-200 rounded-xl hover:border-blue-300 hover:bg-blue-50 transition-all shadow-sm shrink-0 hidden sm:flex"
                    title="Atajos de teclado (?)"
                    style={{ padding: '10px' }}
                  >
                    <Keyboard className="w-4 h-4 text-gray-600" />
                  </button>

                  <button
                    onClick={() => setShowConfigTiposDocumentos(true)}
                    className="px-4 sm:px-5 h-[44px] rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm font-semibold text-sm text-white hover:shadow-lg whitespace-nowrap flex-1 sm:flex-none"
                    style={{ background: 'linear-gradient(135deg, #003DA5 0%, #2962FF 100%)' }}
                    title="Configuración Documental"
                  >
                    <Settings className="w-4 h-4 shrink-0" />
                    <span className="truncate max-w-[120px] sm:max-w-none">Config. Documental</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Métricas Globales - World Class Dashboard */}


            {/* Barra de herramientas premium - Sticky & Glassmorphism */}
            <div className="sticky top-0 z-40 bg-white/95 backdrop-blur-xl py-3 sm:py-4 mb-10 sm:mb-12 flex flex-col md:flex-row gap-3 border-b border-gray-200 shadow-sm px-0 w-full">
              <div className="flex-1 min-w-0">
                <div
                  className={searchContainerClass}
                  style={searchContainerStyle}
                >
                  <div className={searchIconWrapClass} style={searchIconWrapStyle}>
                    <Search style={searchIconStyle} />
                  </div>
                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder="Buscar carpetas por nombre, email o documento..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={searchInputStyle}
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className={clearButtonClass}
                      style={clearButtonStyle}
                    >
                      <X style={clearIconStyle} />
                    </button>
                  )}
                </div>
              </div>

              {/* ORDENAMIENTO CARPETAS */}
              <div className="w-full md:w-auto shrink-0 md:min-w-[200px]">
                <select
                  value={carpetasSortBy}
                  onChange={(e) => setCarpetasSortBy(e.target.value)}
                  className="block w-full px-3 py-3 min-h-[44px] h-[44px] border border-gray-300 rounded-lg focus:ring-[#003DA5] focus:border-[#003DA5] text-[15px] text-gray-900 bg-white truncate"
                >
                  <option value="creacion_desc">Más recientes primero</option>
                  <option value="creacion_asc">Más antiguas primero</option>
                  <option value="alfabetico">Orden alfabético</option>
                  <option value="custom">Orden personalizado</option>
                </select>
              </div>

              {/* View Mode Toggle - Movido al Sticky Header para Mobile First */}
              <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1 shadow-sm h-[44px] overflow-x-auto w-full md:w-auto shrink-0 md:justify-end">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`flex-1 md:flex-none px-3 sm:px-4 h-full rounded-lg transition-all font-medium text-sm flex items-center justify-center gap-2 whitespace-nowrap ${viewMode === 'grid'
                      ? 'bg-white shadow-md text-blue-600'
                      : 'text-gray-600 hover:text-gray-900'
                    }`}
                >
                  <Grid3X3 className="w-4 h-4 shrink-0" />
                  <span className="inline">Grilla</span>
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`flex-1 md:flex-none px-3 sm:px-4 h-full rounded-lg transition-all font-medium text-sm flex items-center justify-center gap-2 whitespace-nowrap ${viewMode === 'list'
                      ? 'bg-white shadow-md text-blue-600'
                      : 'text-gray-600 hover:text-gray-900'
                    }`}
                >
                  <List className="w-4 h-4 shrink-0" />
                  <span className="inline">Lista</span>
                </button>
                <button
                  onClick={() => setViewMode('checklist')}
                  className={`flex-1 md:flex-none px-3 sm:px-4 h-full rounded-lg transition-all font-medium text-sm flex items-center justify-center gap-2 whitespace-nowrap ${viewMode === 'checklist'
                      ? 'bg-white shadow-md text-blue-600'
                      : 'text-gray-600 hover:text-gray-900'
                    }`}
                >
                  <ClipboardCheck className="w-4 h-4 shrink-0" />
                  <span className="hidden sm:inline">Checklist</span>
                </button>
              </div>
            </div>
          </div>

          {/* Toolbar Flotante de Selección Múltiple */}
          <AnimatePresence>
            {isSelectionMode && selectedCarpetaIds.size > 0 && (
              <motion.div
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 100, opacity: 0 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50"
              >
                <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-2xl shadow-2xl border-2 border-blue-400 px-6 py-4 flex items-center gap-6">
                  {/* Selected Count */}
                  <div className="flex items-center gap-3 pr-6 border-r border-blue-400">
                    <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                      <CheckSquare className="w-5 h-5 text-white" strokeWidth={2.5} />
                    </div>
                    <div>
                      <p className="text-sm font-bold">{selectedCarpetaIds.size} seleccionadas</p>
                      <p className="text-xs text-blue-100">de {filteredCarpetas.length} carpetas</p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleSelectAll}
                      className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-all flex items-center gap-2 text-sm font-medium"
                    >
                      <CheckSquare className="w-4 h-4" />
                      Seleccionar todas
                    </button>

                    <button
                      onClick={handleBulkDownload}
                      className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-all flex items-center gap-2 text-sm font-medium"
                    >
                      <Archive className="w-4 h-4" />
                      Descargar ZIP
                    </button>

                    <button
                      onClick={handleBulkShare}
                      className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-all flex items-center gap-2 text-sm font-medium"
                    >
                      <Share2 className="w-4 h-4" />
                      Compartir
                    </button>

                    <button
                      onClick={handleBulkNotify}
                      className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-all flex items-center gap-2 text-sm font-medium"
                    >
                      <Mail className="w-4 h-4" />
                      Notificar
                    </button>

                    <div className="w-px h-8 bg-blue-400 mx-2" />

                    <button
                      onClick={handleDeselectAll}
                      className="px-4 py-2 bg-white/10 hover:bg-red-500/20 rounded-lg transition-all flex items-center gap-2 text-sm font-medium"
                    >
                      <X className="w-4 h-4" />
                      Cancelar
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Selection Mode Banner */}
          <AnimatePresence>
            {isSelectionMode && selectedCarpetaIds.size === 0 && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mb-4 bg-blue-50 border-2 border-blue-200 rounded-xl p-4"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center">
                      <CheckSquare className="w-5 h-5 text-white" strokeWidth={2.5} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-blue-900">Modo de selección activado</p>
                      <p className="text-xs text-blue-700">Haz clic en las carpetas para seleccionarlas o usa ⌘+A para seleccionar todas</p>
                    </div>
                  </div>
                  <button
                    onClick={handleDeselectAll}
                    className="px-4 py-2 bg-white border border-blue-300 rounded-lg hover:bg-blue-100 transition-all text-sm font-medium text-blue-700"
                  >
                    Cancelar
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Carpetas Grid/List */}
          {viewMode === 'grid' && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-5 2xl:gap-6 items-start">
                <AnimatePresence mode="popLayout">
                  {paginatedCarpetas.map((carpeta, index) => {
                    // Protección contra undefined/null para evitar NaN
                    const totalDocs = carpeta.total_documentos || 0;
                    const completosDocs = carpeta.documentos_completos || 0;
                    const completionRate = totalDocs > 0
                      ? (completosDocs / totalDocs) * 100
                      : 0;
                    const initials = (carpeta.nombre_carpeta || 'NA')
                      .split(' ')
                      .map(n => n[0])
                      .join('')
                      .toUpperCase()
                      .slice(0, 2);

                    return (
                      <motion.div
                        key={carpeta.id || `carpeta-grid-${index}`}
                        layout
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: -20 }}
                        transition={{ duration: 0.2, ease: 'easeOut' }}
                        whileHover={{ y: -4, transition: { duration: 0.2 } }}
                        draggable={!isSelectionMode}
                        onDragStart={() => handleDragStart(carpeta.id)}
                        onDragEnd={handleDragEnd}
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          if (draggedCarpetaId && draggedCarpetaId !== carpeta.id) {
                            setDropTargetId(carpeta.id);
                          }
                        }}
                        onDragLeave={() => {
                          setDropTargetId(null);
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleDrop(carpeta.id);
                        }}
                        className={`bg-white rounded-2xl border-2 hover:shadow-2xl transition-all group relative overflow-hidden ${selectedCarpetaIds.has(carpeta.id)
                            ? 'border-blue-600 shadow-xl ring-4 ring-blue-100'
                            : draggedCarpetaId === carpeta.id
                              ? 'border-purple-400 opacity-50 cursor-move'
                              : dropTargetId === carpeta.id
                                ? 'border-green-500 shadow-2xl ring-4 ring-green-200 scale-105'
                                : isDragging && draggedCarpetaId !== carpeta.id
                                  ? 'border-dashed border-blue-300'
                                  : 'border-gray-200 hover:border-blue-400'
                          } ${!isSelectionMode ? 'cursor-move' : 'cursor-pointer'}`}
                        onClick={(e) => {
                          if (isSelectionMode) {
                            handleToggleSelection(carpeta.id, e);
                          } else {
                            handleOpenCarpeta(carpeta.id);
                          }
                        }}
                      >
                        {/* Gradient Overlay */}
                        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/0 via-blue-500/0 to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                        {/* Drag Handle - Top Center */}
                        {!isSelectionMode && (
                          <div key={`drag-handle-${carpeta.id}`} className="absolute top-2 left-1/2 -translate-x-1/2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="bg-gradient-to-r from-purple-400 to-purple-500 rounded-full px-2 py-1 cursor-move shadow-lg">
                              <GripVertical className="w-3 h-3 text-white" />
                            </div>
                          </div>
                        )}

                        {/* Dragging Indicator */}
                        {draggedCarpetaId === carpeta.id && (
                          <div key={`dragging-${carpeta.id}`} className="absolute inset-0 bg-purple-500/20 rounded-2xl border-2 border-purple-500 border-dashed z-20 flex items-center justify-center">
                            <div className="bg-white rounded-xl px-4 py-2 shadow-2xl">
                              <p className="text-sm font-bold text-purple-600 flex items-center gap-2">
                                <Move className="w-4 h-4" />
                                Arrastrando...
                              </p>
                            </div>
                          </div>
                        )}

                        {/* Drop Target Indicator */}
                        {dropTargetId === carpeta.id && draggedCarpetaId !== carpeta.id && (
                          <div key={`drop-target-${carpeta.id}`} className="absolute inset-0 bg-green-500/10 rounded-2xl border-2 border-green-500 z-20 flex items-center justify-center">
                            <div className="bg-green-500 rounded-xl px-4 py-2 shadow-2xl">
                              <p className="text-sm font-bold text-white flex items-center gap-2">
                                <Download className="w-4 h-4" />
                                Soltar aquí
                              </p>
                            </div>
                          </div>
                        )}

                        {/* Checkbox - Top Left */}
                        <div className="absolute top-3 left-3 z-10">
                          <motion.button
                            initial={false}
                            animate={{
                              scale: isSelectionMode || selectedCarpetaIds.has(carpeta.id) ? 1 : 0,
                              opacity: isSelectionMode || selectedCarpetaIds.has(carpeta.id) ? 1 : 0
                            }}
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={(e) => handleToggleSelection(carpeta.id, e)}
                            className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all shadow-md ${selectedCarpetaIds.has(carpeta.id)
                                ? 'bg-blue-600 border-blue-600'
                                : 'bg-white border-gray-300 hover:border-blue-400'
                              }`}
                          >
                            {selectedCarpetaIds.has(carpeta.id) && (
                              <Check className="w-4 h-4 text-white" strokeWidth={3} />
                            )}
                          </motion.button>
                        </div>

                        {/* Quick Actions - Top Right */}
                        <div className="absolute top-3 right-3 z-10 opacity-0 group-hover:opacity-100 transition-all">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                              <button className="p-2 bg-white/90 backdrop-blur-sm hover:bg-white rounded-lg shadow-lg border border-gray-200 transition-all">
                                <MoreVertical className="w-4 h-4 text-gray-700" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56">
                              <DropdownMenuItem>
                                <Eye className="w-4 h-4 mr-2" />
                                Abrir carpeta
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Download className="w-4 h-4 mr-2" />
                                Descargar todo (ZIP)
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Share2 className="w-4 h-4 mr-2" />
                                Compartir carpeta
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem>
                                <Mail className="w-4 h-4 mr-2" />
                                Notificar usuario
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Settings className="w-4 h-4 mr-2" />
                                Configuración
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>

                        {/* Card Content */}
                        <div className="p-4 flex flex-col h-full relative z-0">
                          {/* Top section: Avatar + Folder Icon */}
                          <div className="flex items-start justify-between mb-4">
                            <div className="relative">
                              <div
                                className="w-12 h-12 rounded-full flex items-center justify-center shadow-sm border-2 border-white ring-1 ring-gray-200"
                                style={{ backgroundColor: '#D9EEFF' }}
                              >
                                <span className="text-sm font-bold leading-none" style={{ color: '#003DA5' }}>
                                  {initials}
                                </span>
                              </div>
                              {/* Document Count Badge */}
                              <div className="absolute -top-1 -right-1 bg-blue-600 text-white rounded-full min-w-[20px] h-5 px-1 flex items-center justify-center shadow-sm border-2 border-white">
                                <span className="text-[10px] font-bold leading-none">{carpeta.total_documentos || 0}</span>
                              </div>
                            </div>
                            <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-gray-50 border border-gray-200 group-hover:bg-blue-50 group-hover:border-blue-200 transition-colors">
                              <FolderOpen
                                className="w-4 h-4 text-gray-500 group-hover:text-blue-600 transition-colors"
                                strokeWidth={2}
                              />
                            </div>
                          </div>

                          {/* User Info */}
                          <div className="mb-4 text-left">
                            <h3 className="font-bold text-gray-900 text-sm mb-0.5 truncate" title={carpeta.nombre_carpeta}>
                              {carpeta.nombre_carpeta}
                            </h3>
                            <p className="text-xs text-blue-600 truncate font-medium mb-1" title={carpeta.email_propietario}>
                              {carpeta.email_propietario}
                            </p>
                            {carpeta.numero_documento && (
                              <p className="text-[11px] text-gray-500 font-medium">CC {carpeta.numero_documento}</p>
                            )}
                          </div>

                          {/* Progress Bar */}
                          <div className="mb-4 mt-auto">
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-xs font-semibold text-gray-600">Completitud</span>
                              <span className="text-xs font-bold text-blue-600">{Math.round(completionRate || 0)}%</span>
                            </div>
                            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-500 rounded-full"
                                style={{ width: `${completionRate || 0}%` }}
                              />
                            </div>
                          </div>

                          {/* Status Grid */}
                          <div className="grid grid-cols-3 gap-2 mb-4">
                            <div className="bg-green-50 border border-green-100 rounded-lg py-1.5 flex flex-col items-center justify-center">
                              <CheckCircle className="w-3.5 h-3.5 text-green-600 mb-1" />
                              <span className="text-xs font-bold text-green-700">{carpeta.documentos_completos || 0}</span>
                            </div>
                            <div className="bg-yellow-50 border border-yellow-100 rounded-lg py-1.5 flex flex-col items-center justify-center">
                              <Clock className="w-3.5 h-3.5 text-yellow-600 mb-1" />
                              <span className="text-xs font-bold text-yellow-700">{carpeta.documentos_pendientes || 0}</span>
                            </div>
                            <div className="bg-red-50 border border-red-100 rounded-lg py-1.5 flex flex-col items-center justify-center">
                              <XCircle className="w-3.5 h-3.5 text-red-600 mb-1" />
                              <span className="text-xs font-bold text-red-700">{carpeta.documentos_rechazados || 0}</span>
                            </div>
                          </div>

                          {/* Footer */}
                          <div className="flex items-center justify-between text-[11px] text-gray-500 pt-3 border-t border-gray-100 mt-auto">
                            <div className="flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5" />
                              <span>{formatDate(carpeta.ultima_actualizacion)}</span>
                            </div>
                            <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>

              {/* Empty State visual */}
              {filteredCarpetas.length === 0 && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center justify-center py-20 px-4 text-center bg-white rounded-3xl border border-gray-100 shadow-sm mt-8"
                >
                  <div className="w-24 h-24 mb-6 rounded-3xl bg-blue-50/50 flex items-center justify-center border border-blue-100/50 shadow-inner">
                    <FolderOpen className="w-12 h-12 text-blue-300" strokeWidth={1.5} />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">No se encontraron carpetas</h3>
                  <p className="text-sm text-gray-500 max-w-sm mb-6">
                    No hay resultados que coincidan con tu búsqueda.
                    Intenta comprobar la ortografía o usar otros términos.
                  </p>
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-md transition-colors"
                    >
                      Limpiar búsqueda
                    </button>
                  )}
                </motion.div>
              )}

              {/* UI de Paginación World-Class */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between py-6 mt-4 border-t border-gray-100">
                  <p className="text-sm font-medium text-gray-500">
                    Mostrando <span className="text-gray-900 font-bold">{((currentPage - 1) * 24) + 1}</span> a <span className="text-gray-900 font-bold">{Math.min(currentPage * 24, filteredCarpetas.length)}</span> de <span className="text-blue-600 font-bold">{filteredCarpetas.length}</span> carpetas
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="px-3.5 py-2 border border-gray-200 rounded-lg text-sm font-semibold hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm flex items-center gap-1"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Anterior
                    </button>
                    <button
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="px-3.5 py-2 border border-gray-200 bg-white rounded-lg text-sm font-semibold hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm flex items-center gap-1"
                    >
                      Siguiente
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
          {viewMode === 'list' && (
            <div className="bg-white rounded-xl border-2 border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full" style={{ minWidth: '900px' }}>
                  <thead className="bg-gray-50 border-b-2 border-gray-200">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                        Usuario
                      </th>
                      <th className="px-6 py-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">
                        Documentos
                      </th>
                      <th className="px-6 py-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">
                        Validados
                      </th>
                      <th className="px-6 py-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">
                        Pendientes
                      </th>
                      <th className="px-6 py-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">
                        Rechazados
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                        Última actualización
                      </th>
                      <th className="px-6 py-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredCarpetas.map((carpeta, index) => (
                      <tr
                        key={carpeta.id || `carpeta-list-${index}`}
                        className="hover:bg-blue-50 transition-colors cursor-pointer group"
                        onClick={() => handleOpenCarpeta(carpeta.id)}
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                              style={{ background: '#E3F2FD' }}>
                              <User className="w-5 h-5" style={{ color: '#003DA5' }} />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-gray-900 truncate">
                                {carpeta.nombre_carpeta}
                              </p>
                              <p className="text-xs text-blue-600 truncate">
                                {carpeta.email_propietario}
                              </p>
                              {carpeta.numero_documento && (
                                <p className="text-xs text-gray-500">CC {carpeta.numero_documento}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="text-sm font-bold text-gray-900">{carpeta.total_documentos || 0}</span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <Badge className="bg-green-100 text-green-700 border-green-300">
                            {carpeta.documentos_completos || 0}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <Badge className="bg-yellow-100 text-yellow-700 border-yellow-300">
                            {carpeta.documentos_pendientes || 0}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <Badge className="bg-red-100 text-red-700 border-red-300">
                            {carpeta.documentos_rechazados || 0}
                          </Badge>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-gray-600">{formatDate(carpeta.ultima_actualizacion)}</span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <button
                            className="p-2 hover:bg-white rounded-lg transition-all opacity-0 group-hover:opacity-100"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenCarpeta(carpeta.id);
                            }}
                          >
                            <Eye className="w-5 h-5" style={{ color: '#003DA5' }} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ═══ VISTA LISTA DE CHEQUEO — Matriz de cumplimiento documental ═══ */}
          {viewMode === 'checklist' && (
            <ChecklistMatrixView
              carpetas={filteredCarpetas}
              tiposDocumentos={tiposDocumentos}
              onOpenCarpeta={handleOpenCarpeta}
            />
          )}

          {/* Empty State - Tabla vacía coordinada con vista de documentos */}
          {filteredCarpetas.length === 0 && (
            <div className="bg-white rounded-xl border-2 border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full" style={{ minWidth: '900px' }}>
                  <thead className="bg-gray-50 border-b-2 border-gray-200">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                        Documento
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                        Categoría
                      </th>
                      <th className="px-6 py-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">
                        Estado
                      </th>
                      <th className="px-6 py-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">
                        Versión
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                        Fecha
                      </th>
                      <th className="px-6 py-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td colSpan={6} className="px-6 py-16">
                        <div className="text-center">
                          <File className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                          <h3 className="text-lg font-bold text-gray-900 mb-2">No hay documentos</h3>
                          <p className="text-sm text-gray-600">
                            {searchQuery ? 'Intenta con otro término de búsqueda' : 'Haz clic para subir archivos para comenzar'}
                          </p>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Keyboard Shortcuts Modal */}
          <AnimatePresence>
            {showKeyboardShortcuts && (
              <React.Fragment key="keyboard-shortcuts">
                {/* Backdrop */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setShowKeyboardShortcuts(false)}
                  className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
                />

                {/* Modal */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: 20 }}
                  transition={{ type: "spring", damping: 25 }}
                  className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl z-50"
                >
                  <div className="bg-white rounded-2xl shadow-2xl border-2 border-gray-200 overflow-hidden">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                            <Keyboard className="w-6 h-6 text-white" strokeWidth={2.5} />
                          </div>
                          <div>
                            <h2 className="text-2xl font-bold text-white">Atajos de Teclado</h2>
                            <p className="text-sm text-blue-100">Mejora tu productividad</p>
                          </div>
                        </div>
                        <button
                          onClick={() => setShowKeyboardShortcuts(false)}
                          className="p-2 hover:bg-white/10 rounded-lg transition-all"
                        >
                          <X className="w-6 h-6 text-white" />
                        </button>
                      </div>
                    </div>

                    {/* Shortcuts List */}
                    <div className="p-8">
                      <div className="grid grid-cols-2 gap-6">
                        {/* Selección */}
                        <div>
                          <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-4">Selección</h3>
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-gray-700">Seleccionar todas</span>
                              <div className="flex items-center gap-1">
                                <kbd className="px-3 py-1.5 bg-gray-100 border border-gray-300 rounded-lg text-xs font-bold text-gray-700 shadow-sm">
                                  <Command className="w-3 h-3 inline mr-1" />A
                                </kbd>
                              </div>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-gray-700">Deseleccionar todas</span>
                              <div className="flex items-center gap-1">
                                <kbd className="px-3 py-1.5 bg-gray-100 border border-gray-300 rounded-lg text-xs font-bold text-gray-700 shadow-sm">
                                  <Command className="w-3 h-3 inline mr-1" />D
                                </kbd>
                              </div>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-gray-700">Cancelar selección</span>
                              <kbd className="px-3 py-1.5 bg-gray-100 border border-gray-300 rounded-lg text-xs font-bold text-gray-700 shadow-sm">
                                Esc
                              </kbd>
                            </div>
                          </div>
                        </div>

                        {/* Navegación */}
                        <div>
                          <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-4">Navegación</h3>
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-gray-700">Buscar carpetas</span>
                              <div className="flex items-center gap-1">
                                <kbd className="px-3 py-1.5 bg-gray-100 border border-gray-300 rounded-lg text-xs font-bold text-gray-700 shadow-sm">
                                  <Command className="w-3 h-3 inline mr-1" />F
                                </kbd>
                              </div>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-gray-700">Command Palette</span>
                              <div className="flex items-center gap-1">
                                <kbd className="px-3 py-1.5 bg-gradient-to-r from-yellow-100 to-orange-100 border-2 border-yellow-400 rounded-lg text-xs font-bold text-yellow-900 shadow-sm">
                                  <Zap className="w-3 h-3 inline mr-1" />
                                  <Command className="w-3 h-3 inline mr-1" />K
                                </kbd>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Acciones */}
                        <div>
                          <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-4">Acciones</h3>
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-gray-700">Eliminar seleccionadas</span>
                              <kbd className="px-3 py-1.5 bg-gray-100 border border-gray-300 rounded-lg text-xs font-bold text-gray-700 shadow-sm">
                                Delete
                              </kbd>
                            </div>
                          </div>
                        </div>

                        {/* Ayuda */}
                        <div>
                          <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-4">Ayuda</h3>
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-gray-700">Mostrar/ocultar atajos</span>
                              <kbd className="px-3 py-1.5 bg-gray-100 border border-gray-300 rounded-lg text-xs font-bold text-gray-700 shadow-sm">
                                ?
                              </kbd>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Footer Tip */}
                      <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0">
                            <AlertCircle className="w-4 h-4 text-white" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-blue-900 mb-1">Tip profesional</p>
                            <p className="text-xs text-blue-700">
                              En Windows/Linux usa <kbd className="px-2 py-0.5 bg-white border border-blue-300 rounded text-xs font-bold">Ctrl</kbd> en lugar de <kbd className="px-2 py-0.5 bg-white border border-blue-300 rounded text-xs font-bold">⌘</kbd>
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </React.Fragment>
            )}
          </AnimatePresence>

          {/* Command Palette World-Class */}
          <AnimatePresence>
            {showCommandPalette && (
              <React.Fragment key="command-palette">
                {/* Backdrop */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setShowCommandPalette(false)}
                  className="fixed inset-0 bg-black/60 backdrop-blur-md z-50"
                />

                {/* Command Palette */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -20 }}
                  transition={{ type: "spring", damping: 30, stiffness: 400 }}
                  className="fixed top-[15%] left-1/2 -translate-x-1/2 w-full max-w-2xl z-50"
                >
                  <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
                    {/* Search Input */}
                    <div className="p-4 border-b border-gray-200">
                      <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                          ref={commandInputRef}
                          type="text"
                          value={commandSearch}
                          onChange={(e) => setCommandSearch(e.target.value)}
                          placeholder="Buscar acciones, carpetas o comandos..."
                          className="w-full pl-12 pr-4 py-3 text-base bg-transparent border-0 focus:outline-none text-gray-900 placeholder-gray-400"
                        />
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                          <kbd className="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-xs font-bold text-gray-600">
                            Esc
                          </kbd>
                        </div>
                      </div>
                    </div>

                    {/* Commands List */}
                    <div className="max-h-96 overflow-y-auto">
                      {/* Quick Actions */}
                      <div className="p-2">
                        <div className="px-3 py-2">
                          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide">Acciones Rápidas</h3>
                        </div>

                        <button
                          onClick={() => {
                            handleSelectAll();
                            setShowCommandPalette(false);
                          }}
                          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-blue-50 transition-all group"
                        >
                          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                            <CheckSquare className="w-5 h-5 text-white" strokeWidth={2} />
                          </div>
                          <div className="flex-1 text-left">
                            <p className="text-sm font-semibold text-gray-900">Seleccionar todas las carpetas</p>
                            <p className="text-xs text-gray-500">Selecciona las {filteredCarpetas.length} carpetas visibles</p>
                          </div>
                          <kbd className="px-2 py-1 bg-gray-100 border border-gray-200 rounded text-xs font-bold text-gray-600 opacity-0 group-hover:opacity-100">
                            ⌘A
                          </kbd>
                        </button>

                        <button
                          onClick={() => {
                            cargarCarpetas();
                            setShowCommandPalette(false);
                            toast.success('Carpetas actualizadas');
                          }}
                          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-green-50 transition-all group"
                        >
                          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center">
                            <RefreshCw className="w-5 h-5 text-white" strokeWidth={2} />
                          </div>
                          <div className="flex-1 text-left">
                            <p className="text-sm font-semibold text-gray-900">Actualizar carpetas</p>
                            <p className="text-xs text-gray-500">Recargar datos desde Supabase</p>
                          </div>
                        </button>

                        <button
                          onClick={() => {
                            setShowKeyboardShortcuts(true);
                            setShowCommandPalette(false);
                          }}
                          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-purple-50 transition-all group"
                        >
                          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
                            <Keyboard className="w-5 h-5 text-white" strokeWidth={2} />
                          </div>
                          <div className="flex-1 text-left">
                            <p className="text-sm font-semibold text-gray-900">Ver atajos de teclado</p>
                            <p className="text-xs text-gray-500">Muestra todos los shortcuts disponibles</p>
                          </div>
                          <kbd className="px-2 py-1 bg-gray-100 border border-gray-200 rounded text-xs font-bold text-gray-600 opacity-0 group-hover:opacity-100">
                            ?
                          </kbd>
                        </button>

                        {isSelectionMode && selectedCarpetaIds.size > 0 && (
                          <React.Fragment key="selection-actions">
                            <div className="my-2 border-t border-gray-200" />
                            <button
                              onClick={() => {
                                handleBulkDownload();
                                setShowCommandPalette(false);
                              }}
                              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-orange-50 transition-all group"
                            >
                              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center">
                                <Archive className="w-5 h-5 text-white" strokeWidth={2} />
                              </div>
                              <div className="flex-1 text-left">
                                <p className="text-sm font-semibold text-gray-900">Descargar seleccionadas ({selectedCarpetaIds.size})</p>
                                <p className="text-xs text-gray-500">Crear archivo ZIP con las carpetas</p>
                              </div>
                            </button>

                            <button
                              onClick={() => {
                                handleDeselectAll();
                                setShowCommandPalette(false);
                              }}
                              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-red-50 transition-all group"
                            >
                              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center">
                                <X className="w-5 h-5 text-white" strokeWidth={2} />
                              </div>
                              <div className="flex-1 text-left">
                                <p className="text-sm font-semibold text-gray-900">Cancelar selección</p>
                                <p className="text-xs text-gray-500">Deseleccionar todas las carpetas</p>
                              </div>
                              <kbd className="px-2 py-1 bg-gray-100 border border-gray-200 rounded text-xs font-bold text-gray-600 opacity-0 group-hover:opacity-100">
                                Esc
                              </kbd>
                            </button>
                          </React.Fragment>
                        )}
                      </div>

                      {/* Carpetas - Show only if search */}
                      {commandSearch && (
                        <React.Fragment key="search-results">
                          <div className="my-2 border-t border-gray-200" />
                          <div className="p-2">
                            <div className="px-3 py-2">
                              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide">Carpetas</h3>
                            </div>
                            {filteredCarpetas
                              .filter(c =>
                                (c.nombre_carpeta || '').toLowerCase().includes(commandSearch.toLowerCase()) ||
                                (c.email_propietario || '').toLowerCase().includes(commandSearch.toLowerCase())
                              )
                              .slice(0, 5)
                              .map((carpeta, index) => (
                                <button
                                  key={carpeta.id || `search-${index}`}
                                  onClick={() => {
                                    handleOpenCarpeta(carpeta.id);
                                    setShowCommandPalette(false);
                                    setCommandSearch('');
                                  }}
                                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 transition-all group"
                                >
                                  <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                                    <FolderOpen className="w-5 h-5 text-blue-600" strokeWidth={2} />
                                  </div>
                                  <div className="flex-1 text-left min-w-0">
                                    <p className="text-sm font-semibold text-gray-900 truncate">{carpeta.nombre_carpeta}</p>
                                    <p className="text-xs text-gray-500 truncate">{carpeta.email_propietario}</p>
                                  </div>
                                  <ChevronRight className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100" />
                                </button>
                              ))}
                          </div>
                        </React.Fragment>
                      )}
                    </div>

                    {/* Footer */}
                    <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1">
                            <kbd className="px-2 py-0.5 bg-white border border-gray-300 rounded font-bold">↑↓</kbd>
                            <span>Navegar</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <kbd className="px-2 py-0.5 bg-white border border-gray-300 rounded font-bold">↵</kbd>
                            <span>Seleccionar</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Zap className="w-3 h-3 text-yellow-500" />
                          <span className="font-semibold">Command Palette</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </React.Fragment>
            )}
          </AnimatePresence>
          {/* Modal de Configuración de Tipos de Documentos */}
          <ConfiguracionTiposDocumentos
            isOpen={showConfigTiposDocumentos}
            onClose={() => setShowConfigTiposDocumentos(false)}
          />
        </Container4K>
      </DndProvider>
    );
  }

  // ========== RENDER: DOCUMENTS VIEW ==========
  return (
    <Container4K>
      <DigitalFolderSection
        onBack={handleBackToFolders}
        initialUserId={selectedCarpeta?.persona_id || selectedCarpetaId || undefined}
        users={carpetas.map(c => ({
          id: c.persona_id || c.id,
          firstName: (c.nombre_carpeta || '').split(' ')[0] || '',
          lastName: (c.nombre_carpeta || '').split(' ').slice(1).join(' ') || '',
          document: c.numero_documento || '',
          email: c.email_propietario || ''
        }))}
        canUpload={true}
        hideBackButton={false}
      />
    </Container4K>
  );
}
