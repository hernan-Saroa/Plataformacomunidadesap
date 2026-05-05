/**
 * SECCIÓN CARPETA DIGITAL
 * 
 * Vista dedicada dentro del módulo de usuarios para gestionar documentos.
 * NO es un modal - es una sección completa que reemplaza la vista de usuarios.
 * 
 * ✅ Diseño limpio y espacioso
 * ✅ 100% Responsive mobile-first
 * ✅ Búsqueda de usuarios
 * ✅ Navegación desde lista de usuarios
 * ✅ Categorías como tabs horizontales
 * ✅ Tarjetas verticales optimizadas para mobile
 */

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft, FolderOpen, Search, Upload, Download, Eye, Trash2,
  Star, MoreVertical, FileText, User, GraduationCap, Award,
  FileCheck, Archive, CheckCircle, Share2, Image as ImageIcon,
  File, ChevronDown
} from 'lucide-react';
import { Badge } from '@esap-mfe/shared-ui/badge';
import { Input } from '@esap-mfe/shared-ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@esap-mfe/shared-ui/avatar';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@esap-mfe/shared-ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@esap-mfe/shared-ui/select';

interface DigitalFolderSectionProps {
  onBack: () => void;
  initialUserId?: string;
  users: Array<{
    id: string;
    firstName: string;
    lastName: string;
    document: string;
    email: string;
    avatar?: string;
  }>;
  canUpload?: boolean;
  hideBackButton?: boolean;  // ✅ NUEVO: Ocultar botón volver
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
  userId: string;
}

// Categorías
const CATEGORIES = [
  {
    id: 'all' as DocumentCategory,
    name: 'Todos',
    icon: FolderOpen,
    color: '#003DA5',
    bgColor: '#EFF6FF',
    borderColor: '#3B82F6'
  },
  {
    id: 'personal' as DocumentCategory,
    name: 'Personal',
    icon: User,
    color: '#3B82F6',
    bgColor: '#EFF6FF',
    borderColor: '#3B82F6'
  },
  {
    id: 'academico' as DocumentCategory,
    name: 'Académico',
    icon: GraduationCap,
    color: '#10B981',
    bgColor: '#ECFDF5',
    borderColor: '#10B981'
  },
  {
    id: 'certificados' as DocumentCategory,
    name: 'Certificados',
    icon: Award,
    color: '#8B5CF6',
    bgColor: '#F5F3FF',
    borderColor: '#8B5CF6'
  },
  {
    id: 'laboral' as DocumentCategory,
    name: 'Laboral',
    icon: FileCheck,
    color: '#F59E0B',
    bgColor: '#FFFBEB',
    borderColor: '#F59E0B'
  },
  {
    id: 'otros' as DocumentCategory,
    name: 'Otros',
    icon: Archive,
    color: '#6B7280',
    bgColor: '#F9FAFB',
    borderColor: '#6B7280'
  }
];

// Mock de documentos por usuario
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
    favorite: true,
    userId: '1'
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
    favorite: false,
    userId: '1'
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
    favorite: false,
    userId: '1'
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
    favorite: false,
    userId: '1'
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
    favorite: false,
    userId: '1'
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
    favorite: true,
    userId: '1'
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

// Componente de tarjeta de documento (mobile-optimized)
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
    <div className="bg-white rounded-xl border border-gray-200 hover:border-blue-400 hover:shadow-md transition-all overflow-hidden">
      {/* Preview */}
      <div 
        className="h-48 flex items-center justify-center relative"
        style={{ background: `${fileColor}10` }}
      >
        <FileIcon 
          className="w-20 h-20" 
          style={{ color: fileColor }}
        />
        
        {/* Badges superiores */}
        <div className="absolute top-3 left-3">
          {doc.validated && (
            <Badge className="bg-blue-100 text-blue-700 border-blue-300 text-xs">
              <CheckCircle className="w-3 h-3 mr-1" />
              Validado
            </Badge>
          )}
        </div>

        {/* Favorito */}
        {doc.favorite && (
          <div className="absolute top-3 right-3">
            <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-4">
        <h4 className="font-semibold text-gray-900 mb-1 truncate" title={doc.name}>
          {doc.name}
        </h4>
        
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
          <span className="text-xs text-gray-500 truncate flex-1 mr-2">
            {doc.uploadedBy}
          </span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
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

export function DigitalFolderSection({
  onBack,
  initialUserId,
  users,
  canUpload = false,
  hideBackButton = false  // ✅ NUEVO: Ocultar botón volver
}: DigitalFolderSectionProps) {
  const [selectedUserId, setSelectedUserId] = useState(initialUserId || users[0]?.id);
  const [selectedCategory, setSelectedCategory] = useState<DocumentCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Usuario seleccionado
  const selectedUser = useMemo(() => {
    return users.find(u => u.id === selectedUserId);
  }, [users, selectedUserId]);

  // Documentos del usuario - GENERADOS DINÁMICAMENTE
  const userDocuments = useMemo(() => {
    if (!selectedUserId) return [];
    
    // Generar documentos mock para cualquier usuario
    const numDocs = Math.floor(Math.random() * 12) + 5; // 5-16 documentos
    const categories: Array<Exclude<DocumentCategory, 'all'>> = ['personal', 'academico', 'laboral', 'certificados', 'otros'];
    const fileTypes: Array<'pdf' | 'jpg' | 'png' | 'docx' | 'xlsx'> = ['pdf', 'pdf', 'pdf', 'jpg', 'docx', 'xlsx'];
    const fileNames = [
      'Cédula de Ciudadanía', 'Diploma Profesional', 'Certificado Laboral',
      'Hoja de Vida', 'Acta de Grado', 'Certificado Python',
      'Referencias Laborales', 'Título Bachiller', 'Certificado Inglés',
      'Contrato de Trabajo', 'Foto Documento', 'Carta de Recomendación',
      'Certificado EPS', 'Libreta Militar', 'Diploma Especialización'
    ];
    
    return Array.from({ length: numDocs }, (_, i) => {
      const category = categories[Math.floor(Math.random() * categories.length)];
      const type = fileTypes[Math.floor(Math.random() * fileTypes.length)];
      const name = fileNames[Math.floor(Math.random() * fileNames.length)];
      
      return {
        id: `doc-${selectedUserId}-${i}`,
        name: `${name}.${type}`,
        category,
        type,
        size: Math.floor(Math.random() * 3000000) + 100000,
        uploadedBy: Math.random() > 0.5 ? 'Usuario' : 'Admin Sistema',
        uploadedAt: new Date(Date.now() - Math.random() * 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        validated: Math.random() > 0.3,
        favorite: Math.random() > 0.7,
        userId: selectedUserId
      } as Document;
    });
  }, [selectedUserId]);

  // Filtrar documentos
  const filteredDocuments = useMemo(() => {
    return userDocuments.filter(doc => {
      const matchesCategory = selectedCategory === 'all' || doc.category === selectedCategory;
      const matchesSearch = doc.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [userDocuments, selectedCategory, searchQuery]);

  // Estadísticas
  const stats = useMemo(() => {
    const total = userDocuments.length;
    const validated = userDocuments.filter(d => d.validated).length;
    const pending = total - validated;

    return { total, validated, pending };
  }, [userDocuments]);

  // Handlers
  const handleDownload = (doc: Document) => {
    toast.success(`Descargando ${doc.name}`);
  };

  const handleDelete = (doc: Document) => {
    toast.success(`${doc.name} eliminado correctamente`);
  };

  const handleShare = (doc: Document) => {
    toast.success(`Enlace de ${doc.name} copiado al portapapeles`);
  };

  const handleUpload = () => {
    if (!canUpload) {
      toast.error('No tienes permisos para subir documentos');
      return;
    }
    toast.success('Modal de subida de documentos (por implementar)');
  };

  if (!selectedUser) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-gray-500">No hay usuario seleccionado</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* HEADER AZUL COMPACTO */}
      <div 
        className="flex-shrink-0 px-4 md:px-6 py-4"
        style={{ 
          background: 'linear-gradient(135deg, #003DA5 0%, #0052CC 100%)'
        }}
      >
        <div className="flex items-center justify-between gap-4">
          {/* Back + Info */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {!hideBackButton && (
              <button
                onClick={onBack}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors flex-shrink-0"
                title="Volver"
              >
                <ArrowLeft className="w-5 h-5 text-white" />
              </button>
            )}

            <FolderOpen className="w-6 h-6 text-white flex-shrink-0" />

            <div className="flex-1 min-w-0">
              <h2 className="font-bold text-white truncate">
                Carpeta Digital
              </h2>
              <p className="text-sm text-white/80 truncate">
                {selectedUser.firstName} {selectedUser.lastName} • CC {selectedUser.document}
              </p>
            </div>
          </div>

          {/* Stats compactos */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="text-center">
              <p className="text-2xl font-bold text-white">{stats.total}</p>
              <p className="text-xs text-white/70">Total</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-300">{stats.validated}</p>
              <p className="text-xs text-white/70">Validados</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-yellow-300">{stats.pending}</p>
              <p className="text-xs text-white/70">Pendientes</p>
            </div>
          </div>
        </div>
      </div>

      {/* SELECTOR DE USUARIO */}
      <div className="flex-shrink-0 px-4 md:px-6 py-4 bg-white border-b">
        <div className="flex items-center gap-3">
          <Avatar className="w-10 h-10 border-2 border-blue-500">
            <AvatarImage src={selectedUser.avatar} />
            <AvatarFallback style={{ background: '#003DA5', color: '#FFFFFF' }}>
              {selectedUser.firstName[0]}{selectedUser.lastName[0]}
            </AvatarFallback>
          </Avatar>
          
          <Select value={selectedUserId} onValueChange={setSelectedUserId}>
            <SelectTrigger className="flex-1 h-11">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {users.map(user => (
                <SelectItem key={user.id} value={user.id}>
                  {user.firstName} {user.lastName} • CC {user.document}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* TABS DE CATEGORÍAS */}
      <div className="flex-shrink-0 px-4 md:px-6 py-3 bg-white border-b overflow-x-auto">
        <div className="flex items-center gap-2 min-w-max">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const count = cat.id === 'all' 
              ? userDocuments.length 
              : userDocuments.filter(d => d.category === cat.id).length;
            const isActive = selectedCategory === cat.id;
            
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg transition-all whitespace-nowrap"
                style={{
                  background: isActive ? cat.bgColor : 'transparent',
                  border: isActive ? `2px solid ${cat.borderColor}` : '2px solid transparent',
                  color: isActive ? cat.color : '#6B7280'
                }}
              >
                <Icon className="w-4 h-4" />
                <span className="font-medium">{cat.name}</span>
                <Badge 
                  variant="outline"
                  style={{
                    borderColor: isActive ? cat.borderColor : '#E5E7EB',
                    color: isActive ? cat.color : '#6B7280',
                    background: isActive ? 'white' : 'transparent'
                  }}
                >
                  {count}
                </Badge>
              </button>
            );
          })}
        </div>
      </div>

      {/* BÚSQUEDA + BOTÓN SUBIR */}
      <div className="flex-shrink-0 px-4 md:px-6 py-4 bg-white border-b">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              placeholder="Buscar documentos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-11"
            />
          </div>

          {canUpload && (
            <button
              onClick={handleUpload}
              className="h-11 px-6 rounded-lg font-semibold transition-all hover:shadow-lg flex items-center justify-center gap-2 whitespace-nowrap"
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
      <div className="flex-1 overflow-y-auto px-4 md:px-6 py-6">
        {filteredDocuments.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            <AnimatePresence mode="popLayout">
              {filteredDocuments.map((doc, index) => (
                <motion.div
                  key={doc.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: index * 0.05 }}
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
                onClick={handleUpload}
                className="py-3 px-6 rounded-lg font-semibold transition-all hover:shadow-lg flex items-center gap-2"
                style={{
                  background: 'linear-gradient(135deg, #003DA5 0%, #0052CC 100%)',
                  color: '#FFFFFF'
                }}
              >
                <Upload className="w-5 h-5" />
                Subir Primer Documento
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}