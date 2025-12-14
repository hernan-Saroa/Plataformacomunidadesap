/**
 * CARPETA DIGITAL - SHEET LATERAL
 * 
 * Sheet que se desliza desde la derecha ocupando toda la altura de la pantalla.
 * Mucho más espacioso y navegable que el modal.
 * 
 * ✅ Layout espacioso y profesional
 * ✅ Categorías en tabs horizontales
 * ✅ Grid grande de documentos
 * ✅ Estadísticas visuales
 * ✅ Drag & Drop para subir
 * ✅ Búsqueda y filtros
 */

import { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X, Upload, FileText, Download, Trash2, Eye, FolderOpen,
  FileCheck, GraduationCap, Award, File,
  User, CheckCircle, Search, Star,
  Archive, Share2, MoreVertical, Image as ImageIcon,
  Calendar, Clock
} from 'lucide-react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';

interface DigitalFolderSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    document: string;
    email: string;
    avatar?: string;
  };
  canUpload?: boolean;
}

type DocumentCategory = 
  | 'all'
  | 'personal'
  | 'academico'
  | 'certificados'
  | 'laboral'
  | 'otros';

interface Document {
  id: string;
  name: string;
  category: Exclude<DocumentCategory, 'all'>;
  type: 'pdf' | 'jpg' | 'png' | 'docx' | 'xlsx';
  size: number;
  uploadedBy: string;
  uploadedAt: string;
  validated: boolean;
  favorite: boolean;
  url?: string;
}

// Categorías
const CATEGORIES = [
  {
    id: 'all' as DocumentCategory,
    name: 'Todos',
    icon: FolderOpen,
    color: '#003DA5',
    bgColor: '#EFF6FF'
  },
  {
    id: 'personal' as DocumentCategory,
    name: 'Personal',
    icon: User,
    color: '#3B82F6',
    bgColor: '#EFF6FF'
  },
  {
    id: 'academico' as DocumentCategory,
    name: 'Académico',
    icon: GraduationCap,
    color: '#10B981',
    bgColor: '#ECFDF5'
  },
  {
    id: 'certificados' as DocumentCategory,
    name: 'Certificados',
    icon: Award,
    color: '#8B5CF6',
    bgColor: '#F5F3FF'
  },
  {
    id: 'laboral' as DocumentCategory,
    name: 'Laboral',
    icon: FileCheck,
    color: '#F59E0B',
    bgColor: '#FFFBEB'
  },
  {
    id: 'otros' as DocumentCategory,
    name: 'Otros',
    icon: Archive,
    color: '#6B7280',
    bgColor: '#F9FAFB'
  }
];

// Mock de documentos
const MOCK_DOCUMENTS: Document[] = [
  {
    id: '1',
    name: 'Cédula de Ciudadanía.pdf',
    category: 'personal',
    type: 'pdf',
    size: 524288,
    uploadedBy: 'Admin Sistema',
    uploadedAt: '2024-01-15',
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
    uploadedAt: '2024-02-10',
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
    uploadedAt: '2024-03-05',
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
    uploadedAt: '2024-01-20',
    validated: true,
    favorite: false
  },
  {
    id: '5',
    name: 'Referencias.pdf',
    category: 'laboral',
    type: 'pdf',
    size: 256000,
    uploadedBy: 'Usuario',
    uploadedAt: '2024-02-28',
    validated: true,
    favorite: false
  },
  {
    id: '6',
    name: 'Acta de Grado.pdf',
    category: 'academico',
    type: 'pdf',
    size: 698880,
    uploadedBy: 'Usuario',
    uploadedAt: '2024-02-15',
    validated: true,
    favorite: true
  }
];

// Utilidades
const formatSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('es-CO', { 
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
};

const getFileIcon = (type: string) => {
  switch (type) {
    case 'pdf': return FileText;
    case 'jpg':
    case 'png': return ImageIcon;
    default: return File;
  }
};

const getFileColor = (type: string) => {
  switch (type) {
    case 'pdf': return '#EF4444';
    case 'jpg':
    case 'png': return '#8B5CF6';
    default: return '#6B7280';
  }
};

// Componente de tarjeta de documento
interface DocumentCardProps {
  doc: Document;
  onDownload: (doc: Document) => void;
  onDelete: (doc: Document) => void;
  onShare: (doc: Document) => void;
}

const DocumentCard = ({ doc, onDownload, onDelete, onShare }: DocumentCardProps) => {
  const FileIcon = getFileIcon(doc.type);
  const fileColor = getFileColor(doc.type);
  const category = CATEGORIES.find(c => c.id === doc.category);

  return (
    <div className="bg-white rounded-lg border border-gray-200 hover:border-blue-400 hover:shadow-md transition-all cursor-pointer group">
      {/* Preview */}
      <div 
        className="h-48 flex items-center justify-center relative"
        style={{ background: `${fileColor}15` }}
      >
        <FileIcon 
          className="w-20 h-20" 
          style={{ color: fileColor }}
        />
        
        {/* Badges */}
        <div className="absolute top-3 left-3">
          {doc.validated && (
            <Badge className="bg-green-100 text-green-700 border-green-300">
              <CheckCircle className="w-3 h-3 mr-1" />
              Validado
            </Badge>
          )}
        </div>

        {/* Favorito */}
        {doc.favorite && (
          <div className="absolute top-3 right-3">
            <Star className="w-6 h-6 fill-yellow-400 text-yellow-400" />
          </div>
        )}

        {/* Acciones al hover */}
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDownload(doc);
            }}
            className="w-12 h-12 rounded-lg bg-white hover:bg-gray-100 flex items-center justify-center transition-all"
            title="Descargar"
          >
            <Download className="w-6 h-6 text-gray-700" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
            }}
            className="w-12 h-12 rounded-lg bg-white hover:bg-gray-100 flex items-center justify-center transition-all"
            title="Ver"
          >
            <Eye className="w-6 h-6 text-gray-700" />
          </button>
        </div>
      </div>

      {/* Info */}
      <div className="p-4">
        <p className="font-semibold text-gray-900 truncate mb-2" title={doc.name}>
          {doc.name}
        </p>
        
        <div className="flex items-center justify-between text-sm text-gray-500 mb-3">
          <span>{formatSize(doc.size)}</span>
          <span>{formatDate(doc.uploadedAt)}</span>
        </div>

        {/* Categoría */}
        {category && (
          <div className="flex items-center gap-2 mb-3">
            <div 
              className="w-2 h-2 rounded-full"
              style={{ background: category.color }}
            />
            <span className="text-sm text-gray-600">{category.name}</span>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t">
          <span className="text-sm text-gray-500 truncate flex-1 mr-2">
            {doc.uploadedBy}
          </span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-2 hover:bg-gray-100 rounded transition-colors">
                <MoreVertical className="w-4 h-4 text-gray-500" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onDownload(doc)}>
                <Download className="w-4 h-4 mr-2" />
                Descargar
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onShare(doc)}>
                <Share2 className="w-4 h-4 mr-2" />
                Compartir
              </DropdownMenuItem>
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

export function DigitalFolderSheet({
  open,
  onOpenChange,
  user,
  canUpload = false
}: DigitalFolderSheetProps) {
  const [documents] = useState<Document[]>(MOCK_DOCUMENTS);
  const [selectedCategory, setSelectedCategory] = useState<DocumentCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isDragging, setIsDragging] = useState(false);

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

    return { total, validated, pending };
  }, [documents]);

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
    toast.success(`${files.length} archivo(s) subido(s) correctamente`);
  }, [canUpload]);

  const handleDownload = useCallback((doc: Document) => {
    toast.success(`Descargando ${doc.name}`);
  }, []);

  const handleDelete = useCallback((doc: Document) => {
    toast.success(`${doc.name} eliminado correctamente`);
  }, []);

  const handleShare = useCallback((doc: Document) => {
    toast.success(`Enlace de ${doc.name} copiado al portapapeles`);
  }, []);

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/50"
        onClick={() => onOpenChange(false)}
      >
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          className="fixed right-0 top-0 bottom-0 w-full md:w-[85vw] lg:w-[80vw] bg-white shadow-2xl flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* HEADER */}
          <div 
            className="flex-shrink-0 px-8 py-6 border-b flex items-center justify-between"
            style={{ 
              background: 'linear-gradient(135deg, #003DA5 0%, #0052CC 100%)'
            }}
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
                <FolderOpen className="w-7 h-7 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">
                  Carpeta Digital
                </h2>
                <p className="text-white/90">
                  {user.firstName} {user.lastName} • CC {user.document}
                </p>
              </div>
            </div>

            {/* Stats */}
            <div className="flex items-center gap-4">
              <div className="text-center px-5 py-3 bg-white/10 rounded-xl backdrop-blur-sm">
                <p className="text-3xl font-bold text-white">{stats.total}</p>
                <p className="text-xs text-white/80">Total</p>
              </div>
              <div className="text-center px-5 py-3 bg-white/10 rounded-xl backdrop-blur-sm">
                <p className="text-3xl font-bold text-green-300">{stats.validated}</p>
                <p className="text-xs text-white/80">Validados</p>
              </div>
              <div className="text-center px-5 py-3 bg-white/10 rounded-xl backdrop-blur-sm">
                <p className="text-3xl font-bold text-yellow-300">{stats.pending}</p>
                <p className="text-xs text-white/80">Pendientes</p>
              </div>
              
              <button
                onClick={() => onOpenChange(false)}
                className="w-12 h-12 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
              >
                <X className="w-6 h-6 text-white" />
              </button>
            </div>
          </div>

          {/* TABS DE CATEGORÍAS */}
          <div className="flex-shrink-0 px-8 py-4 border-b bg-gray-50">
            <Tabs value={selectedCategory} onValueChange={(v) => setSelectedCategory(v as DocumentCategory)} className="w-full">
              <TabsList className="grid grid-cols-6 w-full h-14 bg-white border">
                {CATEGORIES.map((cat) => {
                  const Icon = cat.icon;
                  const count = selectedCategory === cat.id 
                    ? filteredDocuments.length 
                    : cat.id === 'all' 
                      ? documents.length 
                      : documents.filter(d => d.category === cat.id).length;
                  
                  return (
                    <TabsTrigger 
                      key={cat.id}
                      value={cat.id} 
                      className="flex items-center justify-center gap-2 data-[state=active]:bg-blue-50 data-[state=active]:border-b-2 data-[state=active]:border-blue-500"
                    >
                      <Icon className="w-5 h-5" style={{ color: cat.color }} />
                      <span className="font-semibold">{cat.name}</span>
                      <Badge variant="outline" style={{ borderColor: cat.color, color: cat.color }}>
                        {count}
                      </Badge>
                    </TabsTrigger>
                  );
                })}
              </TabsList>
            </Tabs>
          </div>

          {/* BARRA DE BÚSQUEDA Y ACCIONES */}
          <div className="flex-shrink-0 px-8 py-4 border-b bg-white">
            <div className="flex items-center gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  placeholder="Buscar documentos..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-12 h-12 text-base"
                />
              </div>

              {canUpload && (
                <button
                  className="px-6 h-12 rounded-lg font-semibold transition-all hover:shadow-lg flex items-center gap-2"
                  style={{
                    background: 'linear-gradient(135deg, #003DA5 0%, #0052CC 100%)',
                    color: '#FFFFFF'
                  }}
                >
                  <Upload className="w-5 h-5" />
                  Subir Documento
                </button>
              )}
            </div>
          </div>

          {/* GRID DE DOCUMENTOS */}
          <div
            className="flex-1 overflow-y-auto px-8 py-6 bg-gray-50"
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
                    <Upload className="w-24 h-24 text-white mx-auto mb-4" />
                    <p className="text-3xl font-bold text-white mb-2">
                      Suelta aquí para subir
                    </p>
                    <p className="text-xl text-white/80">
                      PDF, JPG, PNG, DOCX, XLSX
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Grid */}
            {filteredDocuments.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
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
                        onDownload={handleDownload}
                        onDelete={handleDelete}
                        onShare={handleShare}
                      />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center py-20">
                <FolderOpen className="w-24 h-24 text-gray-300 mb-6" />
                <h3 className="text-2xl font-semibold text-gray-900 mb-3">
                  No hay documentos
                </h3>
                <p className="text-gray-500 text-lg mb-8 max-w-md">
                  {searchQuery
                    ? `No se encontraron documentos que coincidan con "${searchQuery}"`
                    : selectedCategory !== 'all'
                    ? 'No hay documentos en esta categoría'
                    : 'Aún no se han subido documentos'
                  }
                </p>
                {canUpload && !searchQuery && (
                  <button
                    className="py-4 px-8 rounded-lg font-semibold transition-all hover:shadow-lg flex items-center gap-3 text-lg"
                    style={{
                      background: 'linear-gradient(135deg, #003DA5 0%, #0052CC 100%)',
                      color: '#FFFFFF'
                    }}
                  >
                    <Upload className="w-6 h-6" />
                    Subir Primer Documento
                  </button>
                )}
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
