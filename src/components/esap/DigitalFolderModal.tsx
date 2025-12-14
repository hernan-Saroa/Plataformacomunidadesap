/**
 * MODAL: CARPETA DIGITAL - REPOSITORIO DE DOCUMENTOS POR USUARIO
 * 
 * Características:
 * ✅ Dos categorías principales: Personales e Identidad + Académicos
 * ✅ Subir, visualizar y eliminar documentos
 * ✅ Permisos: administrador puede adjuntar documentos
 * ✅ Visualización de documentos con preview
 * ✅ Organización por categorías
 * ✅ Drag & Drop para subir archivos
 * ✅ Validación de tipos de archivo (PDF, JPG, PNG)
 */

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X, Upload, FileText, Download, Trash2, Eye, FolderOpen,
  FileCheck, GraduationCap, Shield, Award, File, Plus,
  Calendar, User, CheckCircle, AlertCircle, Search, Filter
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Card } from '../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { toast } from 'sonner@2.0.3';
import { Input } from '../ui/input';

interface DigitalFolderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    document: string;
    email: string;
  };
  canUpload?: boolean; // Si el usuario actual tiene permisos para subir documentos
}

type DocumentCategory = 
  | 'identificacion'
  | 'referencias'
  | 'buena-conducta'
  | 'antecedentes'
  | 'grado'
  | 'acta'
  | 'tarjeta-profesional'
  | 'certificados-academicos'
  | 'otros-academicos';

interface Document {
  id: string;
  name: string;
  category: DocumentCategory;
  type: 'pdf' | 'jpg' | 'png' | 'doc';
  size: number;
  uploadedBy: string;
  uploadedAt: string;
  url?: string;
}

// Categorías de documentos
const DOCUMENT_CATEGORIES = {
  personal: [
    { 
      id: 'identificacion' as DocumentCategory, 
      name: 'Documentos de Identificación', 
      icon: Shield,
      description: 'Cédula, pasaporte, registro civil',
      color: '#3B82F6'
    },
    { 
      id: 'referencias' as DocumentCategory, 
      name: 'Referencias', 
      icon: User,
      description: 'Referencias personales y laborales',
      color: '#8B5CF6'
    },
    { 
      id: 'buena-conducta' as DocumentCategory, 
      name: 'Certificados de Buena Conducta', 
      icon: CheckCircle,
      description: 'Certificados de buena conducta',
      color: '#10B981'
    },
    { 
      id: 'antecedentes' as DocumentCategory, 
      name: 'Antecedentes', 
      icon: FileCheck,
      description: 'Antecedentes judiciales, disciplinarios',
      color: '#F59E0B'
    },
  ],
  academic: [
    { 
      id: 'grado' as DocumentCategory, 
      name: 'Diplomas de Grado', 
      icon: GraduationCap,
      description: 'Diplomas de grado universitario',
      color: '#EF4444'
    },
    { 
      id: 'acta' as DocumentCategory, 
      name: 'Actas de Grado', 
      icon: FileText,
      description: 'Actas de grado y certificaciones',
      color: '#6366F1'
    },
    { 
      id: 'tarjeta-profesional' as DocumentCategory, 
      name: 'Tarjetas Profesionales', 
      icon: Award,
      description: 'Tarjetas profesionales expedidas',
      color: '#EC4899'
    },
    { 
      id: 'certificados-academicos' as DocumentCategory, 
      name: 'Certificados Académicos', 
      icon: Award,
      description: 'Certificados de estudio, notas',
      color: '#14B8A6'
    },
    { 
      id: 'otros-academicos' as DocumentCategory, 
      name: 'Otros Documentos Académicos', 
      icon: File,
      description: 'Otros documentos relacionados',
      color: '#64748B'
    },
  ]
};

export function DigitalFolderModal({ 
  open, 
  onOpenChange, 
  user,
  canUpload = false 
}: DigitalFolderModalProps) {
  const [activeTab, setActiveTab] = useState<'personal' | 'academic'>('personal');
  const [documents, setDocuments] = useState<Document[]>([
    // Mock data - en producción vendría de la API
    {
      id: '1',
      name: 'Cedula_Colombia.pdf',
      category: 'identificacion',
      type: 'pdf',
      size: 245000,
      uploadedBy: 'Sistema - Carga Masiva',
      uploadedAt: '2024-11-15T10:30:00',
    },
    {
      id: '2',
      name: 'Diploma_Administracion_Publica.pdf',
      category: 'grado',
      type: 'pdf',
      size: 1200000,
      uploadedBy: 'Admin Regional',
      uploadedAt: '2024-10-20T14:15:00',
    },
    {
      id: '3',
      name: 'Antecedentes_Judiciales.pdf',
      category: 'antecedentes',
      type: 'pdf',
      size: 180000,
      uploadedBy: user.firstName + ' ' + user.lastName,
      uploadedAt: '2024-09-05T08:45:00',
    },
  ]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<DocumentCategory | 'all'>('all');
  const [isDragging, setIsDragging] = useState(false);

  // Filtrar documentos
  const filteredDocs = documents.filter(doc => {
    const categories = activeTab === 'personal' 
      ? DOCUMENT_CATEGORIES.personal.map(c => c.id)
      : DOCUMENT_CATEGORIES.academic.map(c => c.id);
    
    const matchesTab = categories.includes(doc.category);
    const matchesSearch = doc.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || doc.category === selectedCategory;
    
    return matchesTab && matchesSearch && matchesCategory;
  });

  // Contar documentos por categoría
  const getDocumentCount = (categoryId: DocumentCategory) => {
    return documents.filter(doc => doc.category === categoryId).length;
  };

  // Formatear tamaño de archivo
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  // Handler para subir archivo
  const handleFileUpload = useCallback((files: FileList | null, category: DocumentCategory) => {
    if (!files || files.length === 0) return;
    if (!canUpload) {
      toast.error('No tienes permisos para subir documentos');
      return;
    }

    const file = files[0];
    
    // Validar tipo de archivo
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Tipo de archivo no permitido', {
        description: 'Solo se permiten archivos PDF, JPG y PNG'
      });
      return;
    }

    // Validar tamaño (máx 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Archivo muy grande', {
        description: 'El tamaño máximo permitido es 5MB'
      });
      return;
    }

    // Crear nuevo documento
    const newDoc: Document = {
      id: Date.now().toString(),
      name: file.name,
      category,
      type: file.type.includes('pdf') ? 'pdf' : file.type.includes('jpeg') || file.type.includes('jpg') ? 'jpg' : 'png',
      size: file.size,
      uploadedBy: 'Usuario Actual',
      uploadedAt: new Date().toISOString(),
    };

    setDocuments(prev => [...prev, newDoc]);
    toast.success('Documento cargado exitosamente', {
      description: `${file.name} se agregó a ${DOCUMENT_CATEGORIES.personal.find(c => c.id === category)?.name || DOCUMENT_CATEGORIES.academic.find(c => c.id === category)?.name}`
    });

    // En producción: await uploadDocument(user.id, file, category);
  }, [canUpload, user.id]);

  // Handler para drag & drop
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, category: DocumentCategory) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileUpload(e.dataTransfer.files, category);
  }, [handleFileUpload]);

  // Handler para eliminar documento
  const handleDeleteDocument = (docId: string) => {
    if (!canUpload) {
      toast.error('No tienes permisos para eliminar documentos');
      return;
    }

    const confirmed = window.confirm('¿Estás seguro de eliminar este documento?');
    if (!confirmed) return;

    setDocuments(prev => prev.filter(doc => doc.id !== docId));
    toast.success('Documento eliminado exitosamente');
    
    // En producción: await deleteDocument(user.id, docId);
  };

  // Handler para descargar documento
  const handleDownloadDocument = (doc: Document) => {
    toast.success('Descargando documento...', {
      description: doc.name
    });
    // En producción: descargar archivo real
  };

  // Handler para visualizar documento
  const handleViewDocument = (doc: Document) => {
    toast.info('Abriendo visualización...', {
      description: doc.name
    });
    // En producción: abrir modal de preview o nueva pestaña
  };

  // Total de documentos
  const totalDocs = documents.length;
  const personalDocs = documents.filter(doc => 
    DOCUMENT_CATEGORIES.personal.map(c => c.id).includes(doc.category)
  ).length;
  const academicDocs = documents.filter(doc => 
    DOCUMENT_CATEGORIES.academic.map(c => c.id).includes(doc.category)
  ).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden p-0 flex flex-col">
        <DialogHeader className="sr-only">
          <DialogTitle>Carpeta Digital - {user.firstName} {user.lastName}</DialogTitle>
          <DialogDescription>
            Repositorio de documentos personales y académicos
          </DialogDescription>
        </DialogHeader>

        {/* Header */}
        <div className="p-6 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div 
                  className="p-3 rounded-xl"
                  style={{
                    background: 'linear-gradient(135deg, #003DA5 0%, #0052CC 100%)',
                    boxShadow: '0 4px 12px rgba(0, 61, 165, 0.2)'
                  }}
                >
                  <FolderOpen className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 
                    className="font-bold"
                    style={{
                      fontSize: '24px',
                      lineHeight: '32px',
                      color: '#1F2937'
                    }}
                  >
                    Carpeta Digital
                  </h2>
                  <p 
                    className="mt-0.5"
                    style={{
                      fontSize: '14px',
                      lineHeight: '20px',
                      color: '#6B7280'
                    }}
                  >
                    {user.firstName} {user.lastName} • {user.document}
                  </p>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="flex gap-3">
              <div className="text-center px-4 py-2 bg-blue-50 rounded-lg border border-blue-200">
                <div className="text-2xl font-bold text-blue-600">{totalDocs}</div>
                <div className="text-xs text-blue-600">Total</div>
              </div>
              <div className="text-center px-4 py-2 bg-purple-50 rounded-lg border border-purple-200">
                <div className="text-2xl font-bold text-purple-600">{personalDocs}</div>
                <div className="text-xs text-purple-600">Personales</div>
              </div>
              <div className="text-center px-4 py-2 bg-green-50 rounded-lg border border-green-200">
                <div className="text-2xl font-bold text-green-600">{academicDocs}</div>
                <div className="text-xs text-green-600">Académicos</div>
              </div>
            </div>
          </div>

          {/* Búsqueda */}
          <div className="mt-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                type="text"
                placeholder="Buscar documentos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex-1 overflow-hidden flex flex-col">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'personal' | 'academic')} className="flex-1 flex flex-col">
            <div className="px-6 pt-4 flex-shrink-0">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="personal" className="gap-2">
                  <Shield className="w-4 h-4" />
                  Personales e Identidad ({personalDocs})
                </TabsTrigger>
                <TabsTrigger value="academic" className="gap-2">
                  <GraduationCap className="w-4 h-4" />
                  Académicos ({academicDocs})
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Contenido Personal */}
            <TabsContent value="personal" className="flex-1 overflow-auto p-6 mt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {DOCUMENT_CATEGORIES.personal.map((category) => {
                  const Icon = category.icon;
                  const count = getDocumentCount(category.id);
                  const categoryDocs = filteredDocs.filter(doc => doc.category === category.id);

                  return (
                    <Card 
                      key={category.id}
                      className="p-4 border-2"
                      style={{ borderColor: '#E5E7EB' }}
                    >
                      {/* Header de categoría */}
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-start gap-3">
                          <div 
                            className="p-2 rounded-lg"
                            style={{ 
                              background: `${category.color}15`,
                              color: category.color 
                            }}
                          >
                            <Icon className="w-5 h-5" />
                          </div>
                          <div className="flex-1">
                            <h3 
                              className="font-bold"
                              style={{
                                fontSize: '14px',
                                lineHeight: '20px',
                                color: '#1F2937'
                              }}
                            >
                              {category.name}
                            </h3>
                            <p 
                              className="text-xs mt-0.5"
                              style={{ color: '#6B7280' }}
                            >
                              {category.description}
                            </p>
                          </div>
                        </div>
                        <Badge 
                          variant="secondary"
                          style={{
                            background: `${category.color}15`,
                            color: category.color,
                            border: `1px solid ${category.color}30`
                          }}
                        >
                          {count}
                        </Badge>
                      </div>

                      {/* Lista de documentos */}
                      <div className="space-y-2 mb-3">
                        {categoryDocs.length === 0 ? (
                          <div className="text-center py-4 text-gray-400 text-sm">
                            Sin documentos
                          </div>
                        ) : (
                          categoryDocs.map((doc) => (
                            <motion.div
                              key={doc.id}
                              initial={{ opacity: 0, y: -10 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all"
                            >
                              <FileText className="w-4 h-4 text-gray-500 flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">
                                  {doc.name}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {formatFileSize(doc.size)} • {new Date(doc.uploadedAt).toLocaleDateString('es-CO')}
                                </p>
                              </div>
                              <div className="flex gap-1 flex-shrink-0">
                                <button
                                  onClick={() => handleViewDocument(doc)}
                                  className="p-1.5 hover:bg-blue-100 rounded transition-colors"
                                  title="Ver documento"
                                >
                                  <Eye className="w-4 h-4 text-blue-600" />
                                </button>
                                <button
                                  onClick={() => handleDownloadDocument(doc)}
                                  className="p-1.5 hover:bg-green-100 rounded transition-colors"
                                  title="Descargar"
                                >
                                  <Download className="w-4 h-4 text-green-600" />
                                </button>
                                {canUpload && (
                                  <button
                                    onClick={() => handleDeleteDocument(doc.id)}
                                    className="p-1.5 hover:bg-red-100 rounded transition-colors"
                                    title="Eliminar"
                                  >
                                    <Trash2 className="w-4 h-4 text-red-600" />
                                  </button>
                                )}
                              </div>
                            </motion.div>
                          ))
                        )}
                      </div>

                      {/* Botón de subir */}
                      {canUpload && (
                        <div
                          className={`border-2 border-dashed rounded-lg p-3 transition-all ${
                            isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
                          }`}
                          onDragOver={handleDragOver}
                          onDragLeave={handleDragLeave}
                          onDrop={(e) => handleDrop(e, category.id)}
                        >
                          <label className="flex items-center justify-center gap-2 cursor-pointer">
                            <input
                              type="file"
                              className="hidden"
                              accept=".pdf,.jpg,.jpeg,.png"
                              onChange={(e) => handleFileUpload(e.target.files, category.id)}
                            />
                            <Upload className="w-4 h-4 text-gray-500" />
                            <span className="text-sm text-gray-600">
                              Subir documento
                            </span>
                          </label>
                        </div>
                      )}
                    </Card>
                  );
                })}
              </div>
            </TabsContent>

            {/* Contenido Académico */}
            <TabsContent value="academic" className="flex-1 overflow-auto p-6 mt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {DOCUMENT_CATEGORIES.academic.map((category) => {
                  const Icon = category.icon;
                  const count = getDocumentCount(category.id);
                  const categoryDocs = filteredDocs.filter(doc => doc.category === category.id);

                  return (
                    <Card 
                      key={category.id}
                      className="p-4 border-2"
                      style={{ borderColor: '#E5E7EB' }}
                    >
                      {/* Header de categoría */}
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-start gap-3">
                          <div 
                            className="p-2 rounded-lg"
                            style={{ 
                              background: `${category.color}15`,
                              color: category.color 
                            }}
                          >
                            <Icon className="w-5 h-5" />
                          </div>
                          <div className="flex-1">
                            <h3 
                              className="font-bold"
                              style={{
                                fontSize: '14px',
                                lineHeight: '20px',
                                color: '#1F2937'
                              }}
                            >
                              {category.name}
                            </h3>
                            <p 
                              className="text-xs mt-0.5"
                              style={{ color: '#6B7280' }}
                            >
                              {category.description}
                            </p>
                          </div>
                        </div>
                        <Badge 
                          variant="secondary"
                          style={{
                            background: `${category.color}15`,
                            color: category.color,
                            border: `1px solid ${category.color}30`
                          }}
                        >
                          {count}
                        </Badge>
                      </div>

                      {/* Lista de documentos */}
                      <div className="space-y-2 mb-3">
                        {categoryDocs.length === 0 ? (
                          <div className="text-center py-4 text-gray-400 text-sm">
                            Sin documentos
                          </div>
                        ) : (
                          categoryDocs.map((doc) => (
                            <motion.div
                              key={doc.id}
                              initial={{ opacity: 0, y: -10 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all"
                            >
                              <FileText className="w-4 h-4 text-gray-500 flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">
                                  {doc.name}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {formatFileSize(doc.size)} • {new Date(doc.uploadedAt).toLocaleDateString('es-CO')}
                                </p>
                              </div>
                              <div className="flex gap-1 flex-shrink-0">
                                <button
                                  onClick={() => handleViewDocument(doc)}
                                  className="p-1.5 hover:bg-blue-100 rounded transition-colors"
                                  title="Ver documento"
                                >
                                  <Eye className="w-4 h-4 text-blue-600" />
                                </button>
                                <button
                                  onClick={() => handleDownloadDocument(doc)}
                                  className="p-1.5 hover:bg-green-100 rounded transition-colors"
                                  title="Descargar"
                                >
                                  <Download className="w-4 h-4 text-green-600" />
                                </button>
                                {canUpload && (
                                  <button
                                    onClick={() => handleDeleteDocument(doc.id)}
                                    className="p-1.5 hover:bg-red-100 rounded transition-colors"
                                    title="Eliminar"
                                  >
                                    <Trash2 className="w-4 h-4 text-red-600" />
                                  </button>
                                )}
                              </div>
                            </motion.div>
                          ))
                        )}
                      </div>

                      {/* Botón de subir */}
                      {canUpload && (
                        <div
                          className={`border-2 border-dashed rounded-lg p-3 transition-all ${
                            isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
                          }`}
                          onDragOver={handleDragOver}
                          onDragLeave={handleDragLeave}
                          onDrop={(e) => handleDrop(e, category.id)}
                        >
                          <label className="flex items-center justify-center gap-2 cursor-pointer">
                            <input
                              type="file"
                              className="hidden"
                              accept=".pdf,.jpg,.jpeg,.png"
                              onChange={(e) => handleFileUpload(e.target.files, category.id)}
                            />
                            <Upload className="w-4 h-4 text-gray-500" />
                            <span className="text-sm text-gray-600">
                              Subir documento
                            </span>
                          </label>
                        </div>
                      )}
                    </Card>
                  );
                })}
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 bg-gray-50 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              {canUpload ? (
                <span className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  Tienes permisos para gestionar documentos
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600" />
                  Solo visualización (sin permisos de edición)
                </span>
              )}
            </div>
            <Button
              onClick={() => onOpenChange(false)}
              variant="outline"
            >
              Cerrar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
