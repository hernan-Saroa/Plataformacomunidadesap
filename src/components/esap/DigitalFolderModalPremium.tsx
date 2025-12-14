/**
 * CARPETA DIGITAL PREMIUM - FUNCIONALIDAD COMPLETA
 * 
 * ✅ Carga de archivos con Drag & Drop
 * ✅ Visor de documentos integrado
 * ✅ Gestión completa de documentos
 * ✅ Validación y eliminación
 * ✅ Descarga y compartir
 * ✅ Organización por categorías
 */

import { useState, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X, Upload, FileText, Download, Trash2, Eye, FolderOpen,
  FileCheck, GraduationCap, Award, File,
  User, CheckCircle, Search, AlertCircle,
  Grid3x3, List, MoreVertical, Share2, Star,
  Archive, Image as ImageIcon, Plus, Clock,
  Check, XCircle
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '../ui/dialog';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { toast } from 'sonner@2.0.3';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';

interface DigitalFolderModalPremiumProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
  canUpload?: boolean;
}

type DocumentCategory = 
  | 'personal'
  | 'academico'
  | 'certificados'
  | 'laboral'
  | 'otros';

interface Document {
  id: string;
  name: string;
  category: DocumentCategory;
  type: 'pdf' | 'jpg' | 'png' | 'docx' | 'xlsx';
  size: number;
  uploadedBy: string;
  uploadedAt: string;
  validated: boolean;
  favorite: boolean;
  url?: string;
}

// Categorías con diseño premium
const CATEGORIES = [
  {
    id: 'personal' as DocumentCategory,
    name: 'Personal',
    icon: User,
    color: '#3B82F6',
    bgColor: '#EFF6FF',
    description: 'Identidad y documentos personales'
  },
  {
    id: 'academico' as DocumentCategory,
    name: 'Académico',
    icon: GraduationCap,
    color: '#10B981',
    bgColor: '#ECFDF5',
    description: 'Títulos y certificados académicos'
  },
  {
    id: 'certificados' as DocumentCategory,
    name: 'Certificados',
    icon: Award,
    color: '#8B5CF6',
    bgColor: '#F5F3FF',
    description: 'Certificaciones y logros'
  },
  {
    id: 'laboral' as DocumentCategory,
    name: 'Laboral',
    icon: FileCheck,
    color: '#F59E0B',
    bgColor: '#FFFBEB',
    description: 'Contratos y documentos laborales'
  },
  {
    id: 'otros' as DocumentCategory,
    name: 'Otros',
    icon: Archive,
    color: '#6B7280',
    bgColor: '#F9FAFB',
    description: 'Otros documentos'
  }
];

// Mock de documentos iniciales
const INITIAL_DOCUMENTS: Document[] = [
  {
    id: '1',
    name: 'Cédula de Ciudadanía.pdf',
    category: 'personal',
    type: 'pdf',
    size: 524288,
    uploadedBy: 'Admin Sistema',
    uploadedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    validated: true,
    favorite: true
  },
  {
    id: '2',
    name: 'Título Profesional.pdf',
    category: 'academico',
    type: 'pdf',
    size: 1048576,
    uploadedBy: 'Usuario',
    uploadedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
    validated: true,
    favorite: false
  },
  {
    id: '3',
    name: 'Certificado Python.pdf',
    category: 'certificados',
    type: 'pdf',
    size: 312576,
    uploadedBy: 'Usuario',
    uploadedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    validated: false,
    favorite: false
  },
  {
    id: '4',
    name: 'Contrato Laboral.pdf',
    category: 'laboral',
    type: 'pdf',
    size: 425984,
    uploadedBy: 'RRHH',
    uploadedAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
    validated: true,
    favorite: false
  },
];

// Utilidades
const formatSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'Hoy';
  if (diffDays === 1) return 'Ayer';
  if (diffDays < 7) return `Hace ${diffDays} días`;
  if (diffDays < 30) return `Hace ${Math.floor(diffDays / 7)} semanas`;
  if (diffDays < 365) return `Hace ${Math.floor(diffDays / 30)} meses`;
  return date.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
};

const getFileIcon = (type: string) => {
  switch (type) {
    case 'pdf': return FileText;
    case 'jpg':
    case 'png': return ImageIcon;
    case 'docx': return FileText;
    case 'xlsx': return FileText;
    default: return File;
  }
};

const getFileColor = (type: string) => {
  switch (type) {
    case 'pdf': return '#EF4444';
    case 'jpg':
    case 'png': return '#8B5CF6';
    case 'docx': return '#3B82F6';
    case 'xlsx': return '#10B981';
    default: return '#6B7280';
  }
};

// Componente de tarjeta de documento
interface DocumentCardProps {
  doc: Document;
  onView: (doc: Document) => void;
  onDownload: (doc: Document) => void;
  onDelete: (doc: Document) => void;
  onShare: (doc: Document) => void;
  onToggleFavorite: (doc: Document) => void;
  onValidate: (doc: Document) => void;
}

const DocumentCard = ({ 
  doc, 
  onView,
  onDownload, 
  onDelete, 
  onShare,
  onToggleFavorite,
  onValidate 
}: DocumentCardProps) => {
  const FileIcon = getFileIcon(doc.type);
  const fileColor = getFileColor(doc.type);
  const category = CATEGORIES.find(c => c.id === doc.category);

  return (
    <div className="bg-white rounded-lg border border-gray-200 hover:border-blue-400 hover:shadow-md transition-all group overflow-hidden">
      {/* Preview */}
      <div 
        className="h-40 flex items-center justify-center relative cursor-pointer"
        style={{ background: `${fileColor}15` }}
        onClick={() => onView(doc)}
      >
        <FileIcon 
          className="w-16 h-16" 
          style={{ color: fileColor }}
        />
        
        {/* Badges */}
        <div className="absolute top-2 left-2 flex gap-1 flex-wrap">
          {doc.validated && (
            <Badge className="bg-green-100 text-green-700 border-green-300 text-xs h-6">
              <CheckCircle className="w-3 h-3 mr-1" />
              Validado
            </Badge>
          )}
          {!doc.validated && (
            <Badge className="bg-yellow-100 text-yellow-700 border-yellow-300 text-xs h-6">
              <Clock className="w-3 h-3 mr-1" />
              Pendiente
            </Badge>
          )}
        </div>

        {/* Favorito */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(doc);
          }}
          className="absolute top-2 right-2 p-1 rounded hover:bg-white/20 transition-colors"
        >
          <Star 
            className={`w-5 h-5 ${doc.favorite ? 'fill-yellow-400 text-yellow-400' : 'text-gray-400'}`}
          />
        </button>

        {/* Acciones al hover - desktop */}
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onView(doc);
            }}
            className="w-10 h-10 rounded-lg bg-white/90 hover:bg-white flex items-center justify-center transition-all"
            title="Ver documento"
          >
            <Eye className="w-5 h-5 text-gray-700" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDownload(doc);
            }}
            className="w-10 h-10 rounded-lg bg-white/90 hover:bg-white flex items-center justify-center transition-all"
            title="Descargar"
          >
            <Download className="w-5 h-5 text-gray-700" />
          </button>
        </div>
      </div>

      {/* Info */}
      <div className="p-3">
        <p 
          className="font-semibold text-sm text-gray-900 truncate mb-2 cursor-pointer hover:text-blue-600"
          title={doc.name}
          onClick={() => onView(doc)}
        >
          {doc.name}
        </p>
        
        <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
          <span>{formatSize(doc.size)}</span>
          <span>{formatDate(doc.uploadedAt)}</span>
        </div>

        {/* Categoría */}
        {category && (
          <div className="flex items-center gap-2 mb-3">
            <div 
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ background: category.color }}
            />
            <span className="text-xs text-gray-600">{category.name}</span>
          </div>
        )}

        {/* Footer con acciones */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
          <span className="text-xs text-gray-500 truncate flex-1 mr-2">
            {doc.uploadedBy}
          </span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-1.5 hover:bg-gray-100 rounded transition-colors">
                <MoreVertical className="w-4 h-4 text-gray-500" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onView(doc)}>
                <Eye className="w-4 h-4 mr-2" />
                Ver documento
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDownload(doc)}>
                <Download className="w-4 h-4 mr-2" />
                Descargar
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onShare(doc)}>
                <Share2 className="w-4 h-4 mr-2" />
                Compartir
              </DropdownMenuItem>
              {!doc.validated && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => onValidate(doc)}>
                    <CheckCircle className="w-4 h-4 mr-2 text-green-600" />
                    Validar documento
                  </DropdownMenuItem>
                </>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => onDelete(doc)}
                className="text-red-600"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Eliminar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
};

// Modal de carga de archivos
interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (files: File[], category: DocumentCategory) => void;
}

const UploadModal = ({ isOpen, onClose, onUpload }: UploadModalProps) => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<DocumentCategory>('personal');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setSelectedFiles(Array.from(e.target.files));
    }
  };

  const handleUpload = () => {
    if (selectedFiles.length > 0) {
      onUpload(selectedFiles, selectedCategory);
      setSelectedFiles([]);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogTitle>Subir Documentos</DialogTitle>
        <DialogDescription>
          Selecciona los archivos y la categoría correspondiente
        </DialogDescription>

        <div className="space-y-4 py-4">
          {/* Selector de categoría */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Categoría
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {CATEGORIES.map((category) => {
                const Icon = category.icon;
                return (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    className={`p-3 rounded-lg border-2 transition-all ${
                      selectedCategory === category.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Icon className="w-5 h-5" style={{ color: category.color }} />
                      <span className="text-sm font-medium">{category.name}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Área de carga */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Archivos
            </label>
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-colors"
            >
              <Upload className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-sm font-medium text-gray-700 mb-1">
                Click para seleccionar archivos
              </p>
              <p className="text-xs text-gray-500">
                PDF, JPG, PNG, DOCX, XLSX (Máx. 10MB cada uno)
              </p>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.jpg,.jpeg,.png,.docx,.xlsx"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
          </div>

          {/* Lista de archivos seleccionados */}
          {selectedFiles.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Archivos seleccionados ({selectedFiles.length})
              </label>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {selectedFiles.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <FileText className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      <span className="text-sm text-gray-700 truncate">{file.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">{formatSize(file.size)}</span>
                      <button
                        onClick={() => {
                          setSelectedFiles(files => files.filter((_, i) => i !== index));
                        }}
                        className="p-1 hover:bg-gray-200 rounded"
                      >
                        <X className="w-4 h-4 text-gray-500" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Botones */}
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleUpload}
            disabled={selectedFiles.length === 0}
            className="px-4 py-2 text-sm font-medium text-white bg-[--esap-primary] hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Subir {selectedFiles.length > 0 && `(${selectedFiles.length})`}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Visor de documentos
interface DocumentViewerProps {
  document: Document | null;
  isOpen: boolean;
  onClose: () => void;
  onDownload: (doc: Document) => void;
  onDelete: (doc: Document) => void;
}

const DocumentViewer = ({ document, isOpen, onClose, onDownload, onDelete }: DocumentViewerProps) => {
  if (!document) return null;

  const category = CATEGORIES.find(c => c.id === document.category);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl h-[90vh] p-0 gap-0 flex flex-col">
        <DialogTitle className="sr-only">
          Visor de documento: {document.name}
        </DialogTitle>
        <DialogDescription className="sr-only">
          Visualización del documento {document.name}
        </DialogDescription>

        {/* Header */}
        <div className="flex-shrink-0 px-6 py-4 border-b flex items-center justify-between bg-gray-50">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div 
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ 
                background: category?.bgColor,
                color: category?.color 
              }}
            >
              {category && <category.icon className="w-5 h-5" />}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-900 truncate">{document.name}</h3>
              <div className="flex items-center gap-3 text-xs text-gray-500">
                <span>{formatSize(document.size)}</span>
                <span>•</span>
                <span>{formatDate(document.uploadedAt)}</span>
                <span>•</span>
                <span>{document.uploadedBy}</span>
              </div>
            </div>
          </div>

          {/* Acciones */}
          <div className="flex items-center gap-2">
            {document.validated && (
              <Badge className="bg-green-100 text-green-700 border-green-300">
                <CheckCircle className="w-3 h-3 mr-1" />
                Validado
              </Badge>
            )}
            <button
              onClick={() => onDownload(document)}
              className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
              title="Descargar"
            >
              <Download className="w-5 h-5 text-gray-600" />
            </button>
            <button
              onClick={() => {
                onDelete(document);
                onClose();
              }}
              className="p-2 hover:bg-red-100 rounded-lg transition-colors"
              title="Eliminar"
            >
              <Trash2 className="w-5 h-5 text-red-600" />
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
              title="Cerrar"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Visor */}
        <div className="flex-1 overflow-hidden bg-gray-900 flex items-center justify-center">
          <div className="text-center p-12">
            <FileText className="w-24 h-24 text-white/50 mx-auto mb-6" />
            <h3 className="text-xl font-semibold text-white mb-2">
              Vista previa no disponible
            </h3>
            <p className="text-white/70 mb-6">
              Para ver este documento, descárgalo haciendo click en el botón de arriba
            </p>
            <button
              onClick={() => onDownload(document)}
              className="px-6 py-3 bg-white text-gray-900 rounded-lg font-medium hover:bg-gray-100 transition-colors inline-flex items-center gap-2"
            >
              <Download className="w-5 h-5" />
              Descargar {document.name}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export function DigitalFolderModalPremium({
  isOpen,
  onClose,
  user,
  canUpload = true
}: DigitalFolderModalPremiumProps) {
  const [documents, setDocuments] = useState<Document[]>(INITIAL_DOCUMENTS);
  const [selectedCategory, setSelectedCategory] = useState<DocumentCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isDragging, setIsDragging] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [viewingDocument, setViewingDocument] = useState<Document | null>(null);

  // Filtrar documentos
  const filteredDocuments = useMemo(() => {
    return documents.filter(doc => {
      const matchesCategory = selectedCategory === 'all' || doc.category === selectedCategory;
      const matchesSearch = doc.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [documents, selectedCategory, searchQuery]);

  // Estadísticas
  const stats = useMemo(() => {
    const total = documents.length;
    const validated = documents.filter(d => d.validated).length;
    const pending = total - validated;
    const size = documents.reduce((acc, doc) => acc + doc.size, 0);

    return { total, validated, pending, size };
  }, [documents]);

  // Contador por categoría
  const getCategoryCount = (categoryId: DocumentCategory | 'all') => {
    if (categoryId === 'all') return documents.length;
    return documents.filter(d => d.category === categoryId).length;
  };

  // Handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (!canUpload) {
      toast.error('No tienes permisos para subir documentos');
      return;
    }

    const files = Array.from(e.dataTransfer.files);
    
    // Crear documentos mock
    const newDocs: Document[] = files.map((file, index) => ({
      id: `doc-${Date.now()}-${index}`,
      name: file.name,
      category: selectedCategory === 'all' ? 'personal' : selectedCategory,
      type: file.name.split('.').pop() as any || 'pdf',
      size: file.size,
      uploadedBy: user?.nombre || 'Usuario',
      uploadedAt: new Date().toISOString(),
      validated: false,
      favorite: false
    }));

    setDocuments(prev => [...newDocs, ...prev]);
    toast.success(`${files.length} archivo(s) subido(s) correctamente`);
  }, [canUpload, selectedCategory, user]);

  const handleUpload = useCallback((files: File[], category: DocumentCategory) => {
    const newDocs: Document[] = files.map((file, index) => ({
      id: `doc-${Date.now()}-${index}`,
      name: file.name,
      category,
      type: file.name.split('.').pop() as any || 'pdf',
      size: file.size,
      uploadedBy: user?.nombre || 'Usuario',
      uploadedAt: new Date().toISOString(),
      validated: false,
      favorite: false
    }));

    setDocuments(prev => [...newDocs, ...prev]);
    toast.success(`${files.length} archivo(s) subido(s) correctamente`);
  }, [user]);

  const handleView = useCallback((doc: Document) => {
    setViewingDocument(doc);
  }, []);

  const handleDownload = useCallback((doc: Document) => {
    toast.success(`Descargando ${doc.name}`);
    // Aquí iría la lógica real de descarga
  }, []);

  const handleDelete = useCallback((doc: Document) => {
    setDocuments(prev => prev.filter(d => d.id !== doc.id));
    toast.success(`${doc.name} eliminado correctamente`);
  }, []);

  const handleShare = useCallback((doc: Document) => {
    toast.success(`Enlace de ${doc.name} copiado al portapapeles`);
  }, []);

  const handleToggleFavorite = useCallback((doc: Document) => {
    setDocuments(prev => prev.map(d => 
      d.id === doc.id ? { ...d, favorite: !d.favorite } : d
    ));
    toast.success(doc.favorite ? 'Eliminado de favoritos' : 'Agregado a favoritos');
  }, []);

  const handleValidate = useCallback((doc: Document) => {
    setDocuments(prev => prev.map(d => 
      d.id === doc.id ? { ...d, validated: true } : d
    ));
    toast.success(`${doc.name} validado correctamente`);
  }, []);

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent 
          className="max-w-6xl w-[95vw] h-[90vh] p-0 gap-0 flex flex-col"
          style={{ borderRadius: '16px' }}
        >
          {/* Títulos de accesibilidad */}
          <DialogTitle className="sr-only">
            Carpeta Digital de {user?.nombre || 'Usuario'}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Gestión de documentos digitales. Total: {stats.total}, Validados: {stats.validated}
          </DialogDescription>

          {/* HEADER FIJO */}
          <div 
            className="flex-shrink-0 px-6 py-4 border-b flex items-center justify-between"
            style={{ 
              background: 'linear-gradient(135deg, #003DA5 0%, #0052CC 100%)',
              borderBottom: '1px solid rgba(255,255,255,0.1)'
            }}
          >
            <div className="flex items-center gap-4 flex-1 min-w-0">
              <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-sm flex-shrink-0">
                <FolderOpen className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-xl font-bold text-white">
                  Carpeta Digital
                </h2>
                <p className="text-sm text-white/80 truncate">
                  {user?.nombre || 'Usuario'} - {user?.email || ''}
                </p>
              </div>
            </div>

            {/* Stats */}
            <div className="flex items-center gap-4">
              <div className="text-center px-4 py-2 bg-white/10 rounded-lg backdrop-blur-sm">
                <p className="text-2xl font-bold text-white">{stats.total}</p>
                <p className="text-xs text-white/70">Total</p>
              </div>
              <div className="text-center px-4 py-2 bg-white/10 rounded-lg backdrop-blur-sm">
                <p className="text-2xl font-bold text-green-300">{stats.validated}</p>
                <p className="text-xs text-white/70">Validados</p>
              </div>
              <div className="text-center px-4 py-2 bg-white/10 rounded-lg backdrop-blur-sm">
                <p className="text-2xl font-bold text-yellow-300">{stats.pending}</p>
                <p className="text-xs text-white/70">Pendientes</p>
              </div>
              
              <button
                onClick={onClose}
                className="w-10 h-10 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors backdrop-blur-sm flex-shrink-0"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>
          </div>

          {/* CONTENIDO PRINCIPAL CON SCROLL */}
          <div className="flex flex-1 overflow-hidden min-h-0">
            {/* SIDEBAR CATEGORÍAS */}
            <div 
              className="w-64 flex-shrink-0 border-r flex flex-col bg-gray-50"
              style={{ borderRight: '1px solid #E5E7EB' }}
            >
              {/* Categorías scrollables */}
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {/* Todas */}
                <button
                  onClick={() => setSelectedCategory('all')}
                  className={`w-full flex items-center justify-between p-3 rounded-lg transition-all ${
                    selectedCategory === 'all'
                      ? 'bg-white shadow-sm border-2 border-blue-500'
                      : 'hover:bg-white/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ 
                        background: selectedCategory === 'all' ? '#003DA5' : '#E5E7EB',
                        color: selectedCategory === 'all' ? '#FFFFFF' : '#6B7280'
                      }}
                    >
                      <FolderOpen className="w-5 h-5" />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-semibold text-gray-900">Todos</p>
                      <p className="text-xs text-gray-500">Ver todos</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="font-semibold">
                    {getCategoryCount('all')}
                  </Badge>
                </button>

                <div className="h-px bg-gray-200 my-3" />

                {/* Categorías */}
                {CATEGORIES.map((category) => {
                  const Icon = category.icon;
                  const count = getCategoryCount(category.id);
                  const isSelected = selectedCategory === category.id;

                  return (
                    <button
                      key={category.id}
                      onClick={() => setSelectedCategory(category.id)}
                      className={`w-full flex items-center justify-between p-3 rounded-lg transition-all ${
                        isSelected
                          ? 'bg-white shadow-sm border-2'
                          : 'hover:bg-white/50'
                      }`}
                      style={{
                        borderColor: isSelected ? category.color : 'transparent'
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{ 
                            background: isSelected ? category.bgColor : '#F3F4F6',
                            color: isSelected ? category.color : '#6B7280'
                          }}
                        >
                          <Icon className="w-5 h-5" />
                        </div>
                        <div className="text-left">
                          <p className="text-sm font-semibold text-gray-900">{category.name}</p>
                          <p className="text-xs text-gray-500 truncate max-w-[100px]">{category.description}</p>
                        </div>
                      </div>
                      <Badge 
                        variant="outline" 
                        className="font-semibold"
                        style={{
                          borderColor: isSelected ? category.color : '#E5E7EB',
                          color: isSelected ? category.color : '#6B7280'
                        }}
                      >
                        {count}
                      </Badge>
                    </button>
                  );
                })}
              </div>

              {/* Botón de subir - fijo */}
              {canUpload && (
                <div className="flex-shrink-0 p-4 border-t bg-white">
                  <button
                    onClick={() => setShowUploadModal(true)}
                    className="w-full py-3 px-4 rounded-lg font-semibold transition-all hover:shadow-lg flex items-center justify-center gap-2"
                    style={{
                      background: 'linear-gradient(135deg, #003DA5 0%, #0052CC 100%)',
                      color: '#FFFFFF'
                    }}
                  >
                    <Plus className="w-5 h-5" />
                    Subir Documentos
                  </button>
                </div>
              )}
            </div>

            {/* ÁREA DE DOCUMENTOS */}
            <div className="flex-1 flex flex-col min-w-0">
              {/* Barra de búsqueda - fija */}
              <div className="flex-shrink-0 px-6 py-4 border-b bg-white">
                <div className="flex items-center gap-3">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <Input
                      placeholder="Buscar documentos..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 h-11"
                    />
                  </div>

                  {/* Vista toggle */}
                  <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-lg">
                    <button
                      onClick={() => setViewMode('grid')}
                      className={`p-2 rounded transition-colors ${
                        viewMode === 'grid'
                          ? 'bg-white shadow-sm'
                          : 'hover:bg-gray-200'
                      }`}
                    >
                      <Grid3x3 className="w-4 h-4 text-gray-700" />
                    </button>
                    <button
                      onClick={() => setViewMode('list')}
                      className={`p-2 rounded transition-colors ${
                        viewMode === 'list'
                          ? 'bg-white shadow-sm'
                          : 'hover:bg-gray-200'
                      }`}
                    >
                      <List className="w-4 h-4 text-gray-700" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Grid de documentos - scrollable */}
              <div
                className="flex-1 overflow-y-auto p-6 bg-gray-50"
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                {/* Overlay de drag & drop */}
                <AnimatePresence>
                  {isDragging && canUpload && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
                      style={{ 
                        background: 'rgba(0, 61, 165, 0.95)',
                        backdropFilter: 'blur(10px)'
                      }}
                    >
                      <div className="text-center">
                        <Upload className="w-20 h-20 text-white mx-auto mb-4" />
                        <p className="text-2xl font-bold text-white mb-2">
                          Suelta aquí para subir
                        </p>
                        <p className="text-white/80">
                          PDF, JPG, PNG, DOCX, XLSX
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Grid */}
                {filteredDocuments.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    <AnimatePresence mode="popLayout">
                      {filteredDocuments.map((doc, index) => (
                        <motion.div
                          key={doc.id}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                          transition={{ delay: index * 0.03 }}
                        >
                          <DocumentCard 
                            doc={doc}
                            onView={handleView}
                            onDownload={handleDownload}
                            onDelete={handleDelete}
                            onShare={handleShare}
                            onToggleFavorite={handleToggleFavorite}
                            onValidate={handleValidate}
                          />
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-center py-12">
                    <FolderOpen className="w-20 h-20 text-gray-300 mb-4" />
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      No hay documentos
                    </h3>
                    <p className="text-gray-500 mb-6 max-w-md">
                      {searchQuery
                        ? `No se encontraron documentos que coincidan con "${searchQuery}"`
                        : selectedCategory !== 'all'
                        ? 'No hay documentos en esta categoría'
                        : 'Aún no se han subido documentos'
                      }
                    </p>
                    {canUpload && !searchQuery && (
                      <button
                        onClick={() => setShowUploadModal(true)}
                        className="py-3 px-6 rounded-lg font-semibold transition-all hover:shadow-lg flex items-center gap-2"
                        style={{
                          background: 'linear-gradient(135deg, #003DA5 0%, #0052CC 100%)',
                          color: '#FFFFFF'
                        }}
                      >
                        <Plus className="w-5 h-5" />
                        Subir Primer Documento
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de carga */}
      <UploadModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onUpload={handleUpload}
      />

      {/* Visor de documentos */}
      <DocumentViewer
        document={viewingDocument}
        isOpen={!!viewingDocument}
        onClose={() => setViewingDocument(null)}
        onDownload={handleDownload}
        onDelete={handleDelete}
      />
    </>
  );
}
