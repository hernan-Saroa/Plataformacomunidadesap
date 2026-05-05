/**
 * MÓDULO: CARPETA DIGITAL
 * 
 * Sistema de gestión de carpetas digitales por usuario
 * - Vista principal: Lista de usuarios con sus carpetas
 * - Vista detalle: Documentos del usuario seleccionado
 */

import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import {
  FolderOpen, Search, Filter, Eye, ChevronLeft, FileText,
  Image as ImageIcon, File, MoreVertical, Download, Trash2,
  CheckCircle, XCircle, Clock, Upload
} from 'lucide-react';
import { Badge } from '@esap-mfe/shared-ui/badge';
import { Input } from '@esap-mfe/shared-ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@esap-mfe/shared-ui/avatar';
import { MOCK_USERS_WITH_SEDES } from '../../data/mockUsersWithSedes';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@esap-mfe/shared-ui/dropdown-menu';

// ✅ DÍA 4: Container4K para padding adaptativo
import { Container4K } from '@/components/ui';

// ✅ DÍA 5: ResponsiveHeader para headers adaptativos
import { ResponsiveHeader } from '@/components/ui';

type ViewMode = 'folders' | 'documents';

type DocumentCategory = 'personal' | 'academico' | 'certificador' | 'laboral' | 'otros';

type DocumentStatus = 'validado' | 'vencido' | 'pendiente';

interface UserFolder {
  userId: string;
  userName: string;
  email: string;
  avatar?: string;
  totalDocuments: number;
  completos: number;
  formatos: number;
  rechazados: number;
  lastModified: string;
}

interface Document {
  id: string;
  name: string;
  type: 'pdf' | 'jpg' | 'png' | 'docx' | 'xlsx';
  category: DocumentCategory;
  size: number;
  status: DocumentStatus;
  modifiedAt: string;
}

// Generar carpetas de usuarios
const generateUserFolders = (): UserFolder[] => {
  // Usar seed basado en userId para generar datos consistentes
  const seededRandom = (seed: number, min: number, max: number) => {
    const x = Math.sin(seed++) * 10000;
    return Math.floor((x - Math.floor(x)) * (max - min + 1)) + min;
  };

  return MOCK_USERS_WITH_SEDES.map((user, index) => {
    // ✅ FIX: Generar seed de manera más robusta
    const seedStr = user.id.replace(/\D/g, ''); // Extraer solo números
    const seed = seedStr ? parseInt(seedStr) : index + 1000; // Usar index como fallback
    
    const total = seededRandom(seed, 8, 25);
    const completos = seededRandom(seed + 100, Math.floor(total * 0.5), Math.floor(total * 0.8));
    const formatos = seededRandom(seed + 200, 1, Math.min(4, total - completos));
    const rechazados = Math.max(0, total - completos - formatos); // ✅ Asegurar que no sea negativo

    return {
      userId: user.id,
      userName: `${user.firstName} ${user.lastName}`,
      email: user.email,
      avatar: user.avatar,
      totalDocuments: total,
      completos: completos,
      formatos: formatos,
      rechazados: rechazados,
      lastModified: `Hace ${seededRandom(seed + 300, 1, 30)} días`
    };
  });
};

// Generar documentos de un usuario
const generateUserDocuments = (userId: string): Document[] => {
  // ✅ FIX: Generar seed de manera más robusta
  const seedStr = userId.replace(/\D/g, ''); // Extraer solo números
  const seed = seedStr ? parseInt(seedStr) : Math.floor(Math.random() * 10000); // Usar random como fallback
  
  const seededRandom = (s: number, min: number, max: number) => {
    const x = Math.sin(s++) * 10000;
    return Math.floor((x - Math.floor(x)) * (max - min + 1)) + min;
  };

  const count = seededRandom(seed, 8, 20);
  const names = [
    'Cédula de Ciudadanía', 'Foto 3x4', 'Certificado de Bachiller',
    'Acta de Grado', 'Diploma Profesional', 'Certificado Laboral',
    'Referencias Laborales', 'Hoja de Vida', 'Certificado EPS',
    'Certificado de Ingresos', 'Recibo de Servicio Público',
    'Certificado Python Avanzado', 'Certificado Excel', 'Foto Documento',
    'Contrato de Trabajo', 'Paz y Salvo Académico'
  ];
  const types: Array<'pdf' | 'jpg' | 'png' | 'docx' | 'xlsx'> = ['pdf', 'jpg', 'docx', 'xlsx'];
  const categories: DocumentCategory[] = ['personal', 'academico', 'certificador', 'laboral', 'otros'];
  const statuses: DocumentStatus[] = ['validado', 'vencido', 'pendiente'];

  return Array.from({ length: count }, (_, i) => {
    const nameIndex = seededRandom(seed + i, 0, names.length - 1);
    const typeIndex = seededRandom(seed + i + 100, 0, types.length - 1);
    const categoryIndex = seededRandom(seed + i + 200, 0, categories.length - 1);
    const statusIndex = seededRandom(seed + i + 300, 0, statuses.length - 1);
    
    return {
      id: `doc-${userId}-${i}`,
      name: `${names[nameIndex]}.${types[typeIndex]}`,
      type: types[typeIndex],
      category: categories[categoryIndex],
      size: seededRandom(seed + i + 400, 100000, 5000000),
      status: statuses[statusIndex],
      modifiedAt: `Hace ${seededRandom(seed + i + 500, 1, 12)} meses`
    };
  });
};

const formatSize = (bytes: number): string => {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

const getFileIcon = (type: string) => {
  if (type === 'pdf') return FileText;
  if (type === 'jpg' || type === 'png') return ImageIcon;
  return File;
};

const getFileIconColor = (type: string) => {
  if (type === 'pdf') return '#EF4444';
  if (type === 'jpg' || type === 'png') return '#8B5CF6';
  return '#6B7280';
};

export function CarpetaDigitalModule() {
  const [viewMode, setViewMode] = useState<ViewMode>('folders');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'all' | DocumentCategory>('all');

  const userFolders = useMemo(() => generateUserFolders(), []);
  
  const selectedUser = useMemo(() => {
    if (!selectedUserId) return null;
    return MOCK_USERS_WITH_SEDES.find(u => u.id === selectedUserId);
  }, [selectedUserId]);

  const userDocuments = useMemo(() => {
    if (!selectedUserId) return [];
    return generateUserDocuments(selectedUserId);
  }, [selectedUserId]);

  // Calcular métricas globales
  const globalMetrics = useMemo(() => {
    const totalFolders = userFolders.length;
    const totalDocuments = userFolders.reduce((sum, folder) => sum + folder.totalDocuments, 0);
    const totalFormatos = userFolders.reduce((sum, folder) => sum + folder.formatos, 0);
    const totalCompletos = userFolders.reduce((sum, folder) => sum + folder.completos, 0);
    const totalRechazados = userFolders.reduce((sum, folder) => sum + folder.rechazados, 0);
    const totalVencidos = Math.floor(totalDocuments * 0.15);

    return {
      folders: totalFolders,
      documents: totalDocuments,
      formatos: totalFormatos,
      completos: totalCompletos,
      rechazados: totalRechazados,
      vencidos: totalVencidos
    };
  }, [userFolders]);

  // Métricas del usuario seleccionado
  const userMetrics = useMemo(() => {
    if (!selectedUserId) return null;
    const docs = userDocuments;
    return {
      total: docs.length,
      validados: docs.filter(d => d.status === 'validado').length,
      rechazados: docs.filter(d => d.status === 'vencido').length
    };
  }, [selectedUserId, userDocuments]);

  // Contar documentos por categoría
  const categoryCounts = useMemo(() => {
    if (!selectedUserId) return {
      all: 0,
      personal: 0,
      academico: 0,
      certificador: 0,
      laboral: 0,
      otros: 0
    };
    return {
      all: userDocuments.length,
      personal: userDocuments.filter(d => d.category === 'personal').length,
      academico: userDocuments.filter(d => d.category === 'academico').length,
      certificador: userDocuments.filter(d => d.category === 'certificador').length,
      laboral: userDocuments.filter(d => d.category === 'laboral').length,
      otros: userDocuments.filter(d => d.category === 'otros').length
    };
  }, [selectedUserId, userDocuments]);

  // Documentos filtrados
  const filteredDocuments = useMemo(() => {
    return userDocuments.filter(doc => {
      const matchesCategory = selectedCategory === 'all' || doc.category === selectedCategory;
      const matchesSearch = doc.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [userDocuments, selectedCategory, searchQuery]);

  const filteredFolders = useMemo(() => {
    return userFolders.filter(folder =>
      folder.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      folder.userName.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [userFolders, searchQuery]);

  const handleViewFolder = (userId: string) => {
    setSelectedUserId(userId);
    setViewMode('documents');
    setSearchQuery('');
    setSelectedCategory('all');
  };

  const handleBackToFolders = () => {
    setViewMode('folders');
    setSelectedUserId(null);
    setSearchQuery('');
  };

  // VISTA: Lista de Carpetas
  if (viewMode === 'folders') {
    return (
      <Container4K>
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <FolderOpen className="w-6 h-6" style={{ color: '#003DA5' }} />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Carpeta Digital</h1>
                <p className="text-sm text-gray-600">{globalMetrics.folders} usuarios</p>
              </div>
            </div>
          </div>

          {/* Métricas Globales */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <p className="text-sm text-gray-600">Carpeta</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{globalMetrics.folders}</p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <p className="text-sm text-blue-600">Documentos</p>
              <p className="text-2xl font-bold text-blue-600 mt-1">{globalMetrics.documents}</p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <p className="text-sm text-purple-600">Formatos</p>
              <p className="text-2xl font-bold text-purple-600 mt-1">{globalMetrics.formatos}</p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <p className="text-sm text-green-600">Completos</p>
              <p className="text-2xl font-bold text-green-600 mt-1">{globalMetrics.completos}</p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <p className="text-sm text-orange-600">Rechazados</p>
              <p className="text-2xl font-bold text-orange-600 mt-1">{globalMetrics.rechazados}</p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <p className="text-sm text-red-600">Vencidos</p>
              <p className="text-2xl font-bold text-red-600 mt-1">{globalMetrics.vencidos}</p>
            </div>
          </div>

          {/* Búsqueda */}
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                placeholder="Buscar carpeta..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2">
              <Filter className="w-4 h-4" />
              Filtros
            </button>
          </div>
        </div>

        {/* Tabla de Carpetas */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Nombre
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Documentos
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Modificado
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredFolders.map((folder) => (
                  <tr key={folder.userId} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <FolderOpen className="w-5 h-5 text-blue-600" />
                        <span className="text-sm text-blue-600">{folder.email}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-900">{folder.totalDocuments} archivos</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Badge className="bg-green-100 text-green-700 border-green-300">
                          {folder.completos}
                        </Badge>
                        {folder.formatos > 0 && (
                          <Badge className="bg-yellow-100 text-yellow-700 border-yellow-300">
                            {folder.formatos}
                          </Badge>
                        )}
                        {folder.rechazados > 0 && (
                          <Badge className="bg-red-100 text-red-700 border-red-300">
                            {folder.rechazados}
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-600">{folder.lastModified}</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => handleViewFolder(folder.userId)}
                        className="inline-flex items-center justify-center p-2 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        <Eye className="w-5 h-5 text-gray-600" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Container4K>
    );
  }

  // VISTA: Documentos del Usuario
  return (
    <Container4K>
      {/* Breadcrumb y Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
          <button
            onClick={handleBackToFolders}
            className="flex items-center gap-1 hover:text-blue-600 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Carpeta Digital
          </button>
          <span>/</span>
          <span>Usuario</span>
          <span>/</span>
          <span>CC</span>
        </div>

        {/* Usuario Info */}
        {selectedUser && (
          <div className="flex items-center gap-3 mb-6">
            <Avatar className="w-12 h-12">
              <AvatarImage src={selectedUser.avatar} />
              <AvatarFallback style={{ background: '#003DA5', color: '#FFF' }}>
                {selectedUser.firstName[0]}{selectedUser.lastName[0]}
              </AvatarFallback>
            </Avatar>
            <div>
              <h2 className="font-bold text-gray-900">Usuario</h2>
              <p className="text-sm text-gray-600">Sin documento</p>
            </div>
          </div>
        )}

        {/* Métricas del Usuario */}
        {userMetrics && (
          <div className="flex items-center gap-6 mb-6">
            <div className="px-4 py-2 bg-blue-50 rounded-lg">
              <p className="text-2xl font-bold text-blue-600">{userMetrics.total}</p>
              <p className="text-xs text-gray-600">Total</p>
            </div>
            <div className="px-4 py-2 bg-green-50 rounded-lg">
              <p className="text-2xl font-bold text-green-600">{userMetrics.validados}</p>
              <p className="text-xs text-gray-600">Validados</p>
            </div>
            <div className="px-4 py-2 bg-red-50 rounded-lg">
              <p className="text-2xl font-bold text-red-600">{userMetrics.rechazados}</p>
              <p className="text-xs text-gray-600">Rechazados</p>
            </div>
          </div>
        )}

        {/* Tabs de Categorías */}
        <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              selectedCategory === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Todos {categoryCounts.all}
          </button>
          <button
            onClick={() => setSelectedCategory('personal')}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              selectedCategory === 'personal'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Personal {categoryCounts.personal}
          </button>
          <button
            onClick={() => setSelectedCategory('academico')}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              selectedCategory === 'academico'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Académico {categoryCounts.academico}
          </button>
          <button
            onClick={() => setSelectedCategory('certificador')}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              selectedCategory === 'certificador'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Certificador {categoryCounts.certificador}
          </button>
          <button
            onClick={() => setSelectedCategory('laboral')}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              selectedCategory === 'laboral'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Laboral {categoryCounts.laboral}
          </button>
          <button
            onClick={() => setSelectedCategory('otros')}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              selectedCategory === 'otros'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Otros {categoryCounts.otros}
          </button>
        </div>

        {/* Búsqueda de Documentos */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <Input
            placeholder="Buscar documentos..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Tabla de Documentos */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Nombre
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Tamaño
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Modificado
                </th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredDocuments.map((doc) => {
                const FileIcon = getFileIcon(doc.type);
                const iconColor = getFileIconColor(doc.type);

                return (
                  <tr key={doc.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <FileIcon className="w-5 h-5" style={{ color: iconColor }} />
                        <span className="text-sm text-gray-900">{doc.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-600">{formatSize(doc.size)}</span>
                    </td>
                    <td className="px-6 py-4">
                      {doc.status === 'validado' && (
                        <Badge className="bg-green-100 text-green-700 border-green-300">
                          Validado
                        </Badge>
                      )}
                      {doc.status === 'vencido' && (
                        <Badge className="bg-red-100 text-red-700 border-red-300">
                          Vencido
                        </Badge>
                      )}
                      {doc.status === 'pendiente' && (
                        <Badge className="bg-yellow-100 text-yellow-700 border-yellow-300">
                          Pendiente
                        </Badge>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-600">{doc.modifiedAt}</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="inline-flex items-center justify-center p-2 hover:bg-gray-100 rounded-lg transition-colors">
                            <MoreVertical className="w-5 h-5 text-gray-600" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            <Download className="w-4 h-4 mr-2" />
                            Descargar
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-red-600">
                            <Trash2 className="w-4 h-4 mr-2" />
                            Eliminar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </Container4K>
  );
}