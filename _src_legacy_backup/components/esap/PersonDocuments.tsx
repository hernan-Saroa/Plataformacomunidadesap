import { useState } from 'react';
import { 
  FileText, Download, Upload, Trash2, Eye, 
  File, FileCheck, FileClock, FileX, Plus,
  Search, Filter, MoreVertical, AlertCircle,
  GraduationCap, IdCard, ClipboardList, Heart
} from 'lucide-react';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import { DocumentCard } from './DocumentCard';

interface Document {
  id: string;
  name: string;
  type: string;
  size: string;
  uploadDate: string;
  status: 'verified' | 'pending' | 'rejected';
  category: string;
  uploadedBy: string;
}

interface PersonDocumentsProps {
  personId: string;
}

const mockDocuments: Document[] = [
  {
    id: '1',
    name: 'Documento de Identidad.pdf',
    type: 'PDF',
    size: '2.4 MB',
    uploadDate: '2024-11-10',
    status: 'verified',
    category: 'Identificación',
    uploadedBy: 'Sistema'
  },
  {
    id: '2',
    name: 'Certificado de Estudios.pdf',
    type: 'PDF',
    size: '1.8 MB',
    uploadDate: '2024-11-08',
    status: 'verified',
    category: 'Académico',
    uploadedBy: 'Admin'
  },
  {
    id: '3',
    name: 'Comprobante de Matrícula.pdf',
    type: 'PDF',
    size: '856 KB',
    uploadDate: '2024-11-05',
    status: 'pending',
    category: 'Administrativo',
    uploadedBy: 'Usuario'
  },
  {
    id: '4',
    name: 'Certificado Médico.pdf',
    type: 'PDF',
    size: '1.2 MB',
    uploadDate: '2024-11-01',
    status: 'verified',
    category: 'Salud',
    uploadedBy: 'Admin'
  },
  {
    id: '5',
    name: 'Foto Carnet.jpg',
    type: 'JPG',
    size: '345 KB',
    uploadDate: '2024-10-28',
    status: 'verified',
    category: 'Identificación',
    uploadedBy: 'Usuario'
  }
];

export function PersonDocuments({ personId }: PersonDocumentsProps) {
  const [documents] = useState<Document[]>(mockDocuments);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const categories = ['all', 'Identificación', 'Académico', 'Administrativo', 'Salud'];

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || doc.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const getStatusConfig = (status: Document['status']) => {
    switch (status) {
      case 'verified':
        return { icon: FileCheck, color: 'text-green-600', bg: 'bg-green-100', label: 'Verificado' };
      case 'pending':
        return { icon: FileClock, color: 'text-amber-600', bg: 'bg-amber-100', label: 'Pendiente' };
      case 'rejected':
        return { icon: FileX, color: 'text-red-600', bg: 'bg-red-100', label: 'Rechazado' };
      default:
        return { icon: File, color: 'text-gray-600', bg: 'bg-gray-100', label: 'Desconocido' };
    }
  };

  const handleDownload = (doc: Document) => {
    toast.success(`Descargando ${doc.name}`);
  };

  const handleView = (doc: Document) => {
    toast.info(`Abriendo ${doc.name}`);
  };

  const handleDelete = (doc: Document) => {
    toast.success(`${doc.name} eliminado`);
  };

  const handleUpload = () => {
    toast.info('Funcionalidad de carga en desarrollo');
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-[--esap-gray-900]">Documentos</h3>
          <p className="text-sm text-[--esap-gray-600]">
            {filteredDocuments.length} documentos encontrados
          </p>
        </div>
        <button
          onClick={handleUpload}
          className="px-4 py-2 bg-[--esap-primary] text-white rounded-lg hover:bg-[--esap-primary-dark] transition-colors flex items-center gap-2"
        >
          <Upload className="w-4 h-4" />
          Subir documento
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[--esap-gray-400]" />
          <input
            type="text"
            placeholder="Buscar documentos..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg border-2 border-[--esap-gray-200] focus:border-[--esap-primary] focus:outline-none transition-colors"
          />
        </div>
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="px-4 py-2 rounded-lg border-2 border-[--esap-gray-200] focus:border-[--esap-primary] focus:outline-none transition-colors"
        >
          {categories.map(cat => (
            <option key={cat} value={cat}>
              {cat === 'all' ? 'Todas las categorías' : cat}
            </option>
          ))}
        </select>
      </div>

      {/* Documents List */}
      {filteredDocuments.length === 0 ? (
        <div className="py-12 text-center">
          <FileText className="w-16 h-16 text-[--esap-gray-300] mx-auto mb-4" />
          <p className="text-[--esap-gray-600]">No se encontraron documentos</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDocuments.map((doc) => {
            // Map category to icon and color scheme
            const getDocumentConfig = (category: string) => {
              switch (category) {
                case 'Identificación':
                  return { icon: IdCard, colorScheme: 'blue' as const };
                case 'Académico':
                  return { icon: GraduationCap, colorScheme: 'green' as const };
                case 'Administrativo':
                  return { icon: ClipboardList, colorScheme: 'purple' as const };
                case 'Salud':
                  return { icon: Heart, colorScheme: 'red' as const };
                default:
                  return { icon: FileText, colorScheme: 'blue' as const };
              }
            };

            const config = getDocumentConfig(doc.category);

            return (
              <DocumentCard
                key={doc.id}
                id={doc.id}
                title={doc.name.replace('.pdf', '').replace('.jpg', '')}
                subtitle={doc.category}
                size={doc.size}
                uploadDate={doc.uploadDate}
                type={doc.type as any}
                category={doc.category}
                icon={config.icon}
                colorScheme={config.colorScheme}
                status={doc.status}
                onView={() => handleView(doc)}
                onDownload={() => handleDownload(doc)}
              />
            );
          })}
        </div>
      )}

      {/* Info Card */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div>
          <h4 className="font-semibold text-blue-900 text-sm mb-1">
            Información sobre documentos
          </h4>
          <p className="text-xs text-blue-700">
            Los documentos son verificados automáticamente. Los archivos PDF tienen un tamaño máximo de 10MB y las imágenes de 5MB.
          </p>
        </div>
      </div>
    </div>
  );
}
