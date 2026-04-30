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
 * - Adaptado al shell principal con datos locales del proyecto
 * 
 * @version 2.0.3 - Fix: Agregado keys a elementos condicionales
 * @date 2026-03-03
 */

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import {
  FolderOpen, Search, Filter, Eye, ChevronLeft, FileText,
  Image as ImageIcon, File, MoreVertical, Download, Trash2,
  CheckCircle, XCircle, Clock, Upload, Grid3X3, List,
  User, Calendar, AlertCircle, Check, X, MessageSquare,
  RotateCcw, Archive, Share2, Star, Tag, Loader2,
  ChevronRight, FolderPlus, FileUp, RefreshCw,
  Settings, TrendingUp, Mail, GitBranch, History, Keyboard, Shield, Layers,
  Square, CheckSquare, Move, Command, GripVertical, Zap,
  ClipboardCheck, Plus, Edit, Save, ToggleLeft, ToggleRight, Award, Briefcase
} from 'lucide-react';
import { Badge } from '../ui/badge';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { Container4K } from '../ui/container-4k';
import {
  searchContainerStyle, searchContainerClass,
  searchIconWrapStyle, searchIconWrapClass, searchIconStyle,
  searchInputStyle, clearButtonStyle, clearButtonClass, clearIconStyle,
} from './shared/designTokens';
import { DigitalFolderSection } from './DigitalFolderSection';
import { MOCK_USERS_WITH_SEDES } from '../../data/mockUsersWithSedes';

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

const seededRandom = (seed: number, min: number, max: number) => {
  const x = Math.sin(seed) * 10000;
  return Math.floor((x - Math.floor(x)) * (max - min + 1)) + min;
};

const buildMockCarpetas = (): CarpetaDigital[] => {
  return MOCK_USERS_WITH_SEDES.map((user, index) => {
    const seed = index + 1000;
    const total = seededRandom(seed, 8, 28);
    const completos = seededRandom(seed + 1, Math.floor(total * 0.45), Math.floor(total * 0.78));
    const pendientes = seededRandom(seed + 2, 1, Math.max(2, total - completos));
    const rechazados = Math.max(0, total - completos - pendientes);
    const vencidos = seededRandom(seed + 3, 0, Math.min(3, total));
    const updated = new Date(Date.now() - seededRandom(seed + 4, 1, 45) * 24 * 60 * 60 * 1000);

    return {
      id: `carpeta:${user.personId || user.id}`,
      persona_id: `persona:${user.personId || user.id}`,
      nombre_carpeta: `${user.firstName} ${user.lastName}`,
      email_propietario: user.email,
      numero_documento: user.documentNumber,
      total_documentos: total,
      documentos_completos: completos,
      documentos_pendientes: pendientes,
      documentos_rechazados: rechazados,
      documentos_vencidos: vencidos,
      ultima_actualizacion: updated.toISOString(),
      fecha_creacion: user.createdAt || updated.toISOString(),
    };
  });
};

const buildMockDocumentos = (carpetaId: string): Documento[] => {
  const carpetaSeed = carpetaId.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const count = seededRandom(carpetaSeed, 8, 18);
  const names = [
    'Cédula de Ciudadanía',
    'Hoja de Vida',
    'Acta de Grado',
    'Diploma Profesional',
    'Certificado Laboral',
    'Certificado EPS',
    'Referencias Laborales',
    'Paz y Salvo Académico',
    'Certificado de Ingresos',
    'Foto Documento',
  ];
  const categories: DocumentCategory[] = ['personal', 'academico', 'certificados', 'laboral', 'otros'];
  const statuses: DocumentStatus[] = ['validado', 'pendiente', 'rechazado', 'vencido'];
  const extensions = ['pdf', 'jpg', 'docx', 'xlsx'];

  return Array.from({ length: count }, (_, index) => {
    const seed = carpetaSeed + index * 17;
    const extension = extensions[seededRandom(seed, 0, extensions.length - 1)];
    const nombreBase = names[seededRandom(seed + 1, 0, names.length - 1)];
    return {
      id: `${carpetaId}:doc:${index}`,
      carpeta_id: carpetaId,
      nombre: `${nombreBase}.${extension}`,
      categoria: categories[seededRandom(seed + 2, 0, categories.length - 1)],
      tipo_archivo: extension,
      tamano_bytes: seededRandom(seed + 3, 180000, 5200000),
      estado: statuses[seededRandom(seed + 4, 0, statuses.length - 1)],
      fecha_subida: new Date(Date.now() - seededRandom(seed + 5, 1, 380) * 24 * 60 * 60 * 1000).toISOString(),
      version_actual: seededRandom(seed + 6, 1, 4),
      comentarios: '',
    };
  });
};

const buildMockTiposDocumentos = (documentos: Documento[]) => {
  const tipos = [
    { id: 'tipo-cedula', nombre: 'Cédula de Ciudadanía', categoria: 'personal', obligatorio: true, color: '#2563EB' },
    { id: 'tipo-hoja-vida', nombre: 'Hoja de Vida', categoria: 'laboral', obligatorio: true, color: '#059669' },
    { id: 'tipo-diploma', nombre: 'Diploma Profesional', categoria: 'academico', obligatorio: true, color: '#7C3AED' },
    { id: 'tipo-certificado-laboral', nombre: 'Certificado Laboral', categoria: 'laboral', obligatorio: false, color: '#D97706' },
    { id: 'tipo-acta-grado', nombre: 'Acta de Grado', categoria: 'academico', obligatorio: false, color: '#003DA5' },
  ];

  return tipos.map((tipo) => {
    const matchedDoc = documentos.find((doc) =>
      doc.nombre.toLowerCase().includes(tipo.nombre.toLowerCase()) ||
      doc.categoria === tipo.categoria
    );

    return {
      ...tipo,
      descripcion: '',
      requiere_validacion: true,
      formatos_permitidos: ['pdf', 'jpg', 'png', 'docx'],
      icono: 'file-text',
      completado: !!matchedDoc,
      documento: matchedDoc || null,
    };
  });
};

function ChecklistMatrixView({
  carpetas,
  tiposDocumentos,
  onOpenCarpeta,
}: {
  carpetas: CarpetaDigital[];
  tiposDocumentos: any[];
  onOpenCarpeta: (carpetaId: string) => void;
}) {
  const tipos = tiposDocumentos.length > 0 ? tiposDocumentos : buildMockTiposDocumentos([]);

  return (
    <div className="bg-white rounded-xl border-2 border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full" style={{ minWidth: 900 }}>
          <thead className="bg-gray-50 border-b-2 border-gray-200">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                Carpeta
              </th>
              {tipos.map((tipo) => (
                <th key={tipo.id} className="px-4 py-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">
                  {tipo.nombre}
                </th>
              ))}
              <th className="px-6 py-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">
                Completitud
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {carpetas.map((carpeta) => {
              const completionRate = carpeta.total_documentos > 0
                ? Math.round((carpeta.documentos_completos / carpeta.total_documentos) * 100)
                : 0;

              return (
                <tr key={carpeta.id} className="hover:bg-blue-50 cursor-pointer" onClick={() => onOpenCarpeta(carpeta.id)}>
                  <td className="px-6 py-4">
                    <p className="text-sm font-semibold text-gray-900">{carpeta.nombre_carpeta}</p>
                    <p className="text-xs text-blue-600">{carpeta.email_propietario}</p>
                  </td>
                  {tipos.map((tipo, index) => {
                    const completed = (carpeta.documentos_completos + index) % 3 !== 0;
                    return (
                      <td key={tipo.id} className="px-4 py-4 text-center">
                        {completed ? (
                          <CheckCircle className="w-5 h-5 text-green-600 mx-auto" />
                        ) : (
                          <Clock className="w-5 h-5 text-yellow-600 mx-auto" />
                        )}
                      </td>
                    );
                  })}
                  <td className="px-6 py-4 text-center">
                    <span className="text-sm font-bold text-blue-700">{completionRate}%</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ConfiguracionTiposDocumentos({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const initialTipos = useMemo(() => buildMockTiposDocumentos([]), []);
  const [activeTab, setActiveTab] = useState<'tipos' | 'checklist'>('tipos');
  const [documentTypes, setDocumentTypes] = useState<any[]>(initialTipos);
  const [templates, setTemplates] = useState([
    {
      id: 'tpl-docente',
      nombre: 'Checklist Docente',
      descripcion: 'Documentos requeridos para docentes y gestión profesoral.',
      color: '#003DA5',
      items: ['Cédula de Ciudadanía', 'Hoja de Vida', 'Diploma Profesional', 'Certificado Laboral'],
      activo: true,
    },
    {
      id: 'tpl-estudiante',
      nombre: 'Checklist Estudiante',
      descripcion: 'Documentación base para trámites académicos.',
      color: '#10B981',
      items: ['Cédula de Ciudadanía', 'Acta de Grado', 'Diploma Profesional'],
      activo: true,
    },
  ]);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [showEditor, setShowEditor] = useState(false);
  const [editingType, setEditingType] = useState<any | null>(null);
  const [form, setForm] = useState({
    nombre: '',
    descripcion: '',
    categoria: 'personal',
    icono: 'file-text',
    color: '#2962FF',
    obligatorio: false,
    requiere_validacion: true,
    formatos_permitidos: ['pdf'],
    tamano_max_mb: 10,
    activo: true,
    rol_validador: '',
    asignacion_tipo: 'todos',
    asignacion_valor: '',
  });

  const categories = [
    { id: 'personal', nombre: 'Personal', color: '#2962FF', icon: User },
    { id: 'academico', nombre: 'Académico', color: '#10B981', icon: FileText },
    { id: 'laboral', nombre: 'Laboral', color: '#F59E0B', icon: Archive },
    { id: 'certificados', nombre: 'Certificados', color: '#8B5CF6', icon: Shield },
    { id: 'otros', nombre: 'Otros', color: '#6B7280', icon: Layers },
  ];
  const iconOptions = [
    { nombre: 'Documento', valor: 'file-text', icon: FileText },
    { nombre: 'Archivo', valor: 'file', icon: File },
    { nombre: 'Imagen', valor: 'image', icon: ImageIcon },
    { nombre: 'Certificado', valor: 'award', icon: Award },
    { nombre: 'Carpeta', valor: 'folder', icon: FolderOpen },
    { nombre: 'Laboral', valor: 'briefcase', icon: Briefcase },
    { nombre: 'Seguridad', valor: 'shield', icon: Shield },
    { nombre: 'Etiqueta', valor: 'tag', icon: Tag },
    { nombre: 'Archivo Hist.', valor: 'archive', icon: Archive },
  ];
  const colorOptions = [
    { nombre: 'Azul ESAP', valor: '#2962FF' },
    { nombre: 'Azul Oscuro', valor: '#003DA5' },
    { nombre: 'Verde', valor: '#10B981' },
    { nombre: 'Amarillo', valor: '#F59E0B' },
    { nombre: 'Rojo', valor: '#EF4444' },
    { nombre: 'Púrpura', valor: '#8B5CF6' },
    { nombre: 'Naranja', valor: '#FF6D00' },
    { nombre: 'Gris', valor: '#6B7280' },
    { nombre: 'Rosa', valor: '#EC4899' },
    { nombre: 'Cyan', valor: '#06B6D4' },
  ];
  const formatOptions = [
    { label: 'PDF', value: 'pdf' },
    { label: 'Word', value: 'doc,docx' },
    { label: 'Excel', value: 'xls,xlsx' },
    { label: 'Imágenes', value: 'jpg,jpeg,png' },
    { label: 'Todos', value: '*' },
  ];

  const filteredTypes = useMemo(() => {
    return documentTypes.filter((type) => {
      const matchesCategory = categoryFilter === 'all' || type.categoria === categoryFilter;
      const matchesSearch =
        !searchQuery.trim() ||
        type.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (type.descripcion || '').toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [documentTypes, categoryFilter, searchQuery]);

  const groupedTypes = useMemo(() => {
    return filteredTypes.reduce<Record<string, any[]>>((acc, type) => {
      const category = type.categoria || 'otros';
      if (!acc[category]) acc[category] = [];
      acc[category].push(type);
      return acc;
    }, {});
  }, [filteredTypes]);

  const stats = useMemo(() => ({
    total: documentTypes.length,
    activos: documentTypes.filter(type => type.activo !== false).length,
    obligatorios: documentTypes.filter(type => type.obligatorio).length,
    validacion: documentTypes.filter(type => type.requiere_validacion).length,
  }), [documentTypes]);

  const resetForm = () => {
    setForm({
      nombre: '',
      descripcion: '',
      categoria: 'personal',
      icono: 'file-text',
      color: '#2962FF',
      obligatorio: false,
      requiere_validacion: true,
      formatos_permitidos: ['pdf'],
      tamano_max_mb: 10,
      activo: true,
      rol_validador: '',
      asignacion_tipo: 'todos',
      asignacion_valor: '',
    });
    setEditingType(null);
  };

  const openCreate = () => {
    resetForm();
    setShowEditor(true);
  };

  const openEdit = (type: any) => {
    setEditingType(type);
    setForm({
      nombre: type.nombre || '',
      descripcion: type.descripcion || '',
      categoria: type.categoria || 'personal',
      icono: type.icono || 'file-text',
      color: type.color || '#2962FF',
      obligatorio: !!type.obligatorio,
      requiere_validacion: !!type.requiere_validacion,
      formatos_permitidos: type.formatos_permitidos || ['pdf'],
      tamano_max_mb: type.tamano_max_mb || 10,
      activo: type.activo !== false,
      rol_validador: type.rol_validador || '',
      asignacion_tipo: type.asignacion_tipo || 'todos',
      asignacion_valor: type.asignacion_valor || '',
    });
    setShowEditor(true);
  };

  const toggleFormatoPermitido = (value: string) => {
    setForm(prev => {
      if (value === '*') {
        return {
          ...prev,
          formatos_permitidos: prev.formatos_permitidos.includes('*') ? ['pdf'] : ['*'],
        };
      }

      const parts = value.split(',');
      const current = prev.formatos_permitidos.filter(format => format !== '*');
      const isSelected = parts.every(part => current.includes(part));
      const next = isSelected
        ? current.filter(format => !parts.includes(format))
        : Array.from(new Set([...current, ...parts]));

      return {
        ...prev,
        formatos_permitidos: next.length > 0 ? next : ['pdf'],
      };
    });
  };

  const saveType = () => {
    if (form.nombre.trim().length < 3) {
      toast.error('Validación', { description: 'El nombre debe tener al menos 3 caracteres.' });
      return;
    }

    if (editingType) {
      setDocumentTypes(prev => prev.map(type => (
        type.id === editingType.id
          ? { ...type, ...form, updated_at: new Date().toISOString() }
          : type
      )));
      toast.success('Tipo actualizado', { description: `"${form.nombre}" actualizado.` });
    } else {
      setDocumentTypes(prev => [
        ...prev,
        {
          id: `tipo-${Date.now()}`,
          ...form,
          icono: 'file-text',
          activo: true,
          es_sistema: false,
          orden: prev.length,
          documentos_asociados: 0,
        },
      ]);
      toast.success('Tipo creado', { description: `"${form.nombre}" creado.` });
    }

    setShowEditor(false);
    resetForm();
  };

  const deleteType = (type: any) => {
    setDocumentTypes(prev => prev.filter(item => item.id !== type.id));
    toast.success('Tipo eliminado', { description: `"${type.nombre}" eliminado.` });
  };

  const duplicateTemplate = (template: any) => {
    const duplicated = {
      ...template,
      id: `tpl-${Date.now()}`,
      nombre: `${template.nombre} copia`,
    };
    setTemplates(prev => [...prev, duplicated]);
    toast.success('Lista duplicada', { description: `"${duplicated.nombre}" creada.` });
  };

  if (!isOpen) return null;

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
        style={{ background: 'rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(4px)' }}
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="bg-white rounded-2xl shadow-2xl w-full overflow-hidden flex flex-col"
          style={{ maxWidth: 1280, height: '95vh' }}
          onClick={(event) => event.stopPropagation()}
        >
          <div
            className="px-6 py-4 flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #003DA5 0%, #2962FF 100%)' }}
          >
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4 min-w-0">
                <div className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                  <Settings className="w-6 h-6 text-white" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-lg font-bold text-white truncate">Configuración Documental</h2>
                  <p className="text-sm text-white/80 truncate">Tipos de documentos y listas de chequeo</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="hidden sm:flex items-center gap-1 bg-white/15 rounded-xl p-1">
                  {[
                    { key: 'tipos' as const, label: 'Tipos de Documentos', icon: FileText, count: documentTypes.length },
                    { key: 'checklist' as const, label: 'Listas de Chequeo', icon: ClipboardCheck, count: templates.length },
                  ].map((tab) => {
                    const TabIcon = tab.icon;
                    const active = activeTab === tab.key;
                    return (
                      <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className="h-10 px-4 rounded-lg transition-all flex items-center gap-2 text-sm font-bold"
                        style={{
                          background: active ? '#FFFFFF' : 'transparent',
                          color: active ? '#003DA5' : 'rgba(255,255,255,0.88)',
                          boxShadow: active ? '0 2px 8px rgba(0,0,0,0.14)' : 'none',
                        }}
                      >
                        <TabIcon className="w-4 h-4" />
                        <span>{tab.label}</span>
                        <span
                          className="text-[10px] rounded-md px-1.5 py-0.5"
                          style={{
                            background: active ? '#003DA5' : 'rgba(255,255,255,0.24)',
                            color: '#FFFFFF',
                          }}
                        >
                          {tab.count}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={onClose}
                  className="w-9 h-9 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>
            </div>
          </div>

          <div className="sm:hidden px-4 py-3 bg-blue-50 border-b border-blue-100 flex gap-2">
            <button
              onClick={() => setActiveTab('tipos')}
              className={`flex-1 h-10 rounded-lg text-sm font-bold ${activeTab === 'tipos' ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-600'}`}
            >
              Tipos
            </button>
            <button
              onClick={() => setActiveTab('checklist')}
              className={`flex-1 h-10 rounded-lg text-sm font-bold ${activeTab === 'checklist' ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-600'}`}
            >
              Listas
            </button>
          </div>

          {activeTab === 'tipos' ? (
            <>
              <div className="px-6 py-3 bg-gray-50 border-b border-gray-200 flex-shrink-0">
                <div className="flex flex-col xl:flex-row xl:items-center gap-4">
                  <div className="flex items-center gap-5">
                    {[
                      { label: 'Total', value: stats.total, color: '#003DA5', bg: '#EFF6FF', icon: FileText },
                      { label: 'Activos', value: stats.activos, color: '#059669', bg: '#ECFDF5', icon: CheckCircle },
                      { label: 'Obligatorios', value: stats.obligatorios, color: '#D97706', bg: '#FFFBEB', icon: AlertCircle },
                      { label: 'Validación', value: stats.validacion, color: '#7C3AED', bg: '#F5F3FF', icon: Shield },
                    ].map((stat) => {
                      const StatIcon = stat.icon;
                      return (
                        <div key={stat.label} className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: stat.bg }}>
                            <StatIcon className="w-4 h-4" style={{ color: stat.color }} />
                          </div>
                          <div>
                            <p className="text-[10px] text-gray-500 font-semibold leading-none">{stat.label}</p>
                            <p className="text-sm font-extrabold leading-tight" style={{ color: stat.color }}>{stat.value}</p>
                          </div>
                        </div>
                      );
                    })}
                    <div className="flex-1" />
                    <button
                      onClick={openCreate}
                      className="h-10 px-5 rounded-xl text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transition-all"
                      style={{ background: 'linear-gradient(135deg, #003DA5 0%, #2962FF 100%)' }}
                    >
                      <FolderPlus className="w-4 h-4" />
                      Nuevo Tipo
                    </button>
                  </div>
                  
                </div>
              </div>

              <div className="px-6 py-4 border-b border-gray-100 flex flex-col md:flex-row gap-3 flex-shrink-0">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Buscar tipos de documentos..."
                    className="w-full h-10 pl-10 pr-4 border border-gray-300 rounded-xl text-sm outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
                  />
                </div>

                <select
                  value={categoryFilter}
                  onChange={(event) => setCategoryFilter(event.target.value)}
                  className="h-10 px-4 border border-gray-300 rounded-xl text-sm outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100 bg-white"
                >
                  <option value="all">Todas las categorías</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>{category.nombre}</option>
                  ))}
                </select>
              </div>

              <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
                <div className="space-y-6">
                  {Object.entries(groupedTypes).map(([categoryId, types]) => {
                    const category = categories.find(item => item.id === categoryId) || categories[categories.length - 1];
                    const CategoryIcon = category.icon;
                    return (
                      <section key={categoryId}>
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${category.color}18` }}>
                            <CategoryIcon className="w-5 h-5" style={{ color: category.color }} />
                          </div>
                          <div>
                            <h3 className="font-bold text-gray-900">{category.nombre}</h3>
                            <p className="text-xs text-gray-500">{types.length} tipo(s) configurado(s)</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                          {types.map((type) => (
                            <motion.div
                              key={type.id}
                              layout
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="bg-white rounded-2xl border border-gray-200 p-4 hover:border-blue-300 hover:shadow-lg transition-all"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex items-start gap-3 min-w-0">
                                  <div
                                    className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                                    style={{ background: `${type.color || category.color}16` }}
                                  >
                                    <FileText className="w-5 h-5" style={{ color: type.color || category.color }} />
                                  </div>
                                  <div className="min-w-0">
                                    <h4 className="font-bold text-gray-900 text-sm truncate">{type.nombre}</h4>
                                    <p className="text-xs text-gray-500 line-clamp-2 mt-1">{type.descripcion || 'Sin descripción'}</p>
                                  </div>
                                </div>

                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <button className="p-2 hover:bg-gray-100 rounded-lg">
                                      <MoreVertical className="w-4 h-4 text-gray-500" />
                                    </button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => openEdit(type)}>
                                      <Settings className="w-4 h-4 mr-2" />
                                      Editar
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => deleteType(type)} className="text-red-600">
                                      <Trash2 className="w-4 h-4 mr-2" />
                                      Eliminar
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>

                              <div className="flex flex-wrap gap-2 mt-4">
                                <Badge className={type.obligatorio ? 'bg-orange-100 text-orange-700 border-orange-300' : 'bg-gray-100 text-gray-700 border-gray-300'}>
                                  {type.obligatorio ? 'Obligatorio' : 'Opcional'}
                                </Badge>
                                <Badge className={type.requiere_validacion ? 'bg-blue-100 text-blue-700 border-blue-300' : 'bg-gray-100 text-gray-700 border-gray-300'}>
                                  {type.requiere_validacion ? 'Con validación' : 'Sin validación'}
                                </Badge>
                              </div>

                              <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100 text-xs text-gray-500">
                                <span>{(type.formatos_permitidos || ['pdf']).join(', ').toUpperCase()}</span>
                                <span>{type.documentos_asociados || 0} documentos</span>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      </section>
                    );
                  })}
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-[320px_1fr] min-h-0 bg-gray-50">
              <aside className="border-r border-gray-200 bg-white p-4 overflow-y-auto">
                <button
                  onClick={() => {
                    const next = {
                      id: `tpl-${Date.now()}`,
                      nombre: 'Nueva lista de chequeo',
                      descripcion: 'Plantilla documental personalizada.',
                      color: '#2962FF',
                      items: ['Cédula de Ciudadanía'],
                      activo: true,
                    };
                    setTemplates(prev => [...prev, next]);
                    toast.success('Lista creada');
                  }}
                  className="w-full h-11 rounded-xl text-white font-bold text-sm flex items-center justify-center gap-2 mb-4"
                  style={{ background: 'linear-gradient(135deg, #003DA5 0%, #2962FF 100%)' }}
                >
                  <FolderPlus className="w-4 h-4" />
                  Nueva lista
                </button>

                <div className="space-y-2">
                  {templates.map((template) => (
                    <div key={template.id} className="rounded-xl border border-gray-200 p-3 hover:border-blue-300 transition-all">
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${template.color}18` }}>
                          <ClipboardCheck className="w-5 h-5" style={{ color: template.color }} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold text-gray-900 truncate">{template.nombre}</p>
                          <p className="text-xs text-gray-500 line-clamp-2">{template.descripcion}</p>
                          <p className="text-[11px] text-blue-700 font-semibold mt-2">{template.items.length} ítems</p>
                        </div>
                      </div>
                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={() => duplicateTemplate(template)}
                          className="flex-1 h-8 rounded-lg bg-blue-50 text-blue-700 text-xs font-bold hover:bg-blue-100"
                        >
                          Duplicar
                        </button>
                        <button
                          onClick={() => setTemplates(prev => prev.filter(item => item.id !== template.id))}
                          className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center hover:bg-red-100"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </aside>

              <main className="p-6 overflow-y-auto">
                <div className="max-w-4xl">
                  <div className="mb-6">
                    <h3 className="text-xl font-bold text-gray-900">Editor de listas de chequeo</h3>
                    <p className="text-sm text-gray-500 mt-1">
                      Configura plantillas reutilizables con documentos obligatorios, validación y orden de presentación.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {templates.map((template) => (
                      <div key={template.id} className="bg-white rounded-2xl border border-gray-200 p-5">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: `${template.color}18` }}>
                            <ClipboardCheck className="w-6 h-6" style={{ color: template.color }} />
                          </div>
                          <div>
                            <h4 className="font-bold text-gray-900">{template.nombre}</h4>
                            <p className="text-xs text-gray-500">{template.descripcion}</p>
                          </div>
                        </div>

                        <div className="space-y-2">
                          {template.items.map((item, index) => (
                            <div key={`${template.id}-${item}`} className="flex items-center gap-3 rounded-xl bg-gray-50 border border-gray-100 p-3">
                              <span className="w-6 h-6 rounded-lg bg-white border border-gray-200 text-xs font-bold text-gray-500 flex items-center justify-center">
                                {index + 1}
                              </span>
                              <FileText className="w-4 h-4 text-blue-600" />
                              <span className="text-sm font-medium text-gray-800 flex-1">{item}</span>
                              <Badge className="bg-blue-100 text-blue-700 border-blue-300">Validación</Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </main>
            </div>
          )}
        </motion.div>

        <AnimatePresence>
          {showEditor && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[10000] flex items-center justify-center p-4"
              style={{ background: 'rgba(0,0,0,0.4)' }}
              onClick={(event) => {
                event.stopPropagation();
                setShowEditor(false);
              }}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="w-full max-w-xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col"
                style={{ maxHeight: '85vh' }}
                onClick={(event) => event.stopPropagation()}
              >
                <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex-shrink-0">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                        {editingType ? <Edit className="w-5 h-5 text-blue-800" /> : <Plus className="w-5 h-5 text-blue-800" />}
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-[15px] font-bold text-gray-800 truncate">
                          {editingType ? 'Editar Tipo de Documento' : 'Nuevo Tipo de Documento'}
                        </h3>
                        <p className="text-xs text-gray-500 truncate">
                          {editingType ? 'Actualiza la configuración' : 'Completa los datos del tipo'}
                        </p>
                      </div>
                    </div>
                    <button onClick={() => setShowEditor(false)} className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center shrink-0">
                      <X className="w-4 h-4 text-gray-500" />
                    </button>
                  </div>
                </div>

                <div className="p-6 overflow-y-auto">
                  <div className="flex flex-col gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5">
                      Nombre <span className="text-red-500">*</span>
                    </label>
                    <input
                      value={form.nombre}
                      onChange={(event) => setForm(prev => ({ ...prev, nombre: event.target.value }))}
                      className="w-full h-9 px-3 border border-gray-300 rounded-[10px] text-[13px] outline-none focus:border-blue-800 focus:ring-4 focus:ring-blue-100"
                      placeholder="Ej: Copia documento de identidad"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5">Descripción</label>
                    <textarea
                      value={form.descripcion}
                      onChange={(event) => setForm(prev => ({ ...prev, descripcion: event.target.value }))}
                      rows={2}
                      className="w-full min-h-[72px] px-3 py-2 border border-gray-300 rounded-[10px] text-[13px] outline-none focus:border-blue-800 focus:ring-4 focus:ring-blue-100 resize-none"
                      placeholder="Describe el tipo de documento..."
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1.5">Carpeta / Categoría</label>
                      <select
                        value={form.categoria}
                        onChange={(event) => setForm(prev => ({ ...prev, categoria: event.target.value }))}
                        className="w-full h-9 px-3 border border-gray-300 rounded-[10px] text-[13px] bg-white outline-none focus:border-blue-800 focus:ring-4 focus:ring-blue-100"
                      >
                        {categories.map((category) => (
                          <option key={category.id} value={category.id}>{category.nombre}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1.5">Icono</label>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {iconOptions.map((option) => {
                          const IconOption = option.icon;
                          const selected = form.icono === option.valor;
                          return (
                            <button
                              key={option.valor}
                              type="button"
                              onClick={() => setForm(prev => ({ ...prev, icono: option.valor }))}
                              className="w-8 h-8 rounded-lg border flex items-center justify-center"
                              style={{
                                borderColor: selected ? '#2962FF' : '#E5E7EB',
                                borderWidth: selected ? 2 : 1,
                                background: selected ? '#EFF6FF' : '#FFFFFF',
                              }}
                              title={option.nombre}
                            >
                              <IconOption className="w-4 h-4" style={{ color: selected ? '#2962FF' : '#6B7280' }} />
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5">Color</label>
                    <div className="flex items-center gap-2 flex-wrap">
                      {colorOptions.map((color) => (
                        <button
                          key={color.valor}
                          type="button"
                          onClick={() => setForm(prev => ({ ...prev, color: color.valor }))}
                          className="w-7 h-7 rounded-full transition-transform"
                          style={{
                            background: color.valor,
                            border: form.color === color.valor ? '3px solid #1F2937' : '2px solid transparent',
                            transform: form.color === color.valor ? 'scale(1.08)' : 'scale(1)',
                          }}
                          title={color.nombre}
                        />
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5">Formatos permitidos</label>
                    <div className="flex items-center gap-2 flex-wrap">
                      {formatOptions.map((format) => {
                        const parts = format.value.split(',');
                        const selected = format.value === '*'
                          ? form.formatos_permitidos.includes('*')
                          : parts.every(part => form.formatos_permitidos.includes(part));
                        return (
                          <button
                            type="button"
                            key={format.value}
                            onClick={() => toggleFormatoPermitido(format.value)}
                            className="px-3.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors"
                            style={{
                              borderColor: selected ? '#BFDBFE' : '#E5E7EB',
                              background: selected ? '#EFF6FF' : '#FFFFFF',
                              color: selected ? '#2962FF' : '#6B7280',
                            }}
                          >
                            {format.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5">Tamaño máximo (MB)</label>
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={form.tamano_max_mb}
                      onChange={(event) => setForm(prev => ({ ...prev, tamano_max_mb: parseInt(event.target.value, 10) || 10 }))}
                      className="w-24 h-9 px-3 border border-gray-300 rounded-[10px] text-[13px] outline-none focus:border-blue-800 focus:ring-4 focus:ring-blue-100"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {[
                      { key: 'obligatorio' as const, label: 'Obligatorio', desc: 'El usuario debe subir este tipo', color: '#D97706', bg: '#FFFBEB', border: '#FDE68A' },
                      { key: 'requiere_validacion' as const, label: 'Validación', desc: 'Requiere revisión manual', color: '#2962FF', bg: '#EFF6FF', border: '#BFDBFE' },
                      { key: 'activo' as const, label: 'Activo', desc: 'Visible para usuarios', color: '#059669', bg: '#ECFDF5', border: '#A7F3D0' },
                    ].map((toggle) => {
                      const active = form[toggle.key];
                      return (
                        <button
                          key={toggle.key}
                          type="button"
                          onClick={() => setForm(prev => ({ ...prev, [toggle.key]: !active }))}
                          className="rounded-[10px] p-3 text-left border transition-colors"
                          style={{
                            borderColor: active ? toggle.border : '#E5E7EB',
                            background: active ? toggle.bg : '#F9FAFB',
                          }}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            {active ? <ToggleRight className="w-5 h-5" style={{ color: toggle.color }} /> : <ToggleLeft className="w-5 h-5 text-gray-400" />}
                            <span className="text-xs font-bold text-gray-700">{toggle.label}</span>
                          </div>
                          <p className="text-[10px] text-gray-500">{toggle.desc}</p>
                        </button>
                      );
                    })}
                  </div>

                  {form.requiere_validacion && (
                    <div className="p-4 rounded-xl border border-blue-200 bg-blue-50">
                      <div className="flex items-center gap-2 mb-2">
                        <Shield className="w-4 h-4 text-blue-800" />
                        <label className="block text-xs font-extrabold text-blue-900">Autorización de Validación</label>
                      </div>
                      <label className="block text-[11px] font-bold text-blue-600 mb-1">Especifique qué rol puede validar este documento</label>
                      <input
                        type="text"
                        value={form.rol_validador}
                        onChange={(event) => setForm(prev => ({ ...prev, rol_validador: event.target.value }))}
                        placeholder="Ej: Coordinador Académico, RRHH, Revisor..."
                        className="w-full h-9 px-3 border border-blue-300 rounded-[10px] text-[13px] text-blue-900 outline-none focus:border-blue-700 focus:ring-4 focus:ring-blue-100"
                      />
                      <p className="text-[10px] text-blue-400 mt-1.5">Si se deja vacío, cualquier usuario con permisos de edición en la carpeta podrá validarlo.</p>
                    </div>
                  )}

                  <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
                    <div className="flex items-center gap-2 mb-3">
                      <Shield className="w-4 h-4 text-blue-800" />
                      <label className="block text-[13px] font-extrabold text-slate-800">Alcance y Visibilidad</label>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-500 mb-1">Asignar a</label>
                        <select
                          value={form.asignacion_tipo}
                          onChange={(event) => setForm(prev => ({ ...prev, asignacion_tipo: event.target.value, asignacion_valor: '' }))}
                          className="w-full h-9 px-3 border border-gray-300 rounded-[10px] text-[13px] bg-white outline-none focus:border-blue-800 focus:ring-4 focus:ring-blue-100"
                        >
                          <option value="todos">Todos los usuarios</option>
                          <option value="rol">Por Rol Específico</option>
                          <option value="territorial">Por Territorial</option>
                          <option value="sede">Por Sede / CETAP</option>
                          <option value="asignatura">Por Asignatura</option>
                        </select>
                      </div>

                      {form.asignacion_tipo !== 'todos' && (
                        <div>
                          <label className="block text-[11px] font-bold text-slate-500 mb-1">
                            Especifique el {form.asignacion_tipo}
                          </label>
                          <input
                            type="text"
                            value={form.asignacion_valor}
                            onChange={(event) => setForm(prev => ({ ...prev, asignacion_valor: event.target.value }))}
                            placeholder={
                              form.asignacion_tipo === 'rol' ? 'Ej: Docente, Estudiante' :
                              form.asignacion_tipo === 'territorial' ? 'Ej: Antioquia' :
                              form.asignacion_tipo === 'sede' ? 'Ej: CETAP Medellín' : 'Ej: Algebra'
                            }
                            className="w-full h-9 px-3 border border-gray-300 rounded-[10px] text-[13px] outline-none focus:border-blue-800 focus:ring-4 focus:ring-blue-100"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                  </div>
                </div>

                <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3 flex-shrink-0">
                  <button
                    onClick={() => setShowEditor(false)}
                    className="h-10 px-4 rounded-[10px] border border-gray-300 bg-white text-gray-700 font-semibold text-[13px] hover:bg-gray-50"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={saveType}
                    className="h-10 px-5 rounded-[10px] text-white font-bold text-[13px] flex items-center gap-2 disabled:opacity-60"
                    style={{ background: '#2962FF' }}
                  >
                    <Save className="w-4 h-4" />
                    {editingType ? 'Actualizar' : 'Crear'}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}

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

  // ========== COMPUTED VALUES (BEFORE EFFECTS) ==========
  const filteredCarpetas = useMemo(() => {
    const filtered = carpetas.filter(carpeta => {
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
    setIsLoadingCarpetas(true);
    setError(null);

    window.setTimeout(() => {
      const carpetasMock = buildMockCarpetas();
      setCarpetas(carpetasMock);
      setCarpetaOrder(carpetasMock.map((carpeta) => carpeta.id));
      setIsLoadingCarpetas(false);
    }, 250);
  };

  const cargarDocumentos = async (carpetaId: string) => {
    setIsLoadingDocumentos(true);

    window.setTimeout(() => {
      const docs = buildMockDocumentos(carpetaId);
      setDocumentos(docs);
      setIsLoadingDocumentos(false);
    }, 180);
  };

  const cargarTiposDocumentos = async () => {
    setTiposDocumentos(buildMockTiposDocumentos(documentos));
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
    setDocumentos([]);
    setSelectedCarpetaId(null);
    await cargarCarpetas();
    toast.success('Documentos reiniciados en la vista de demostración');
  };

  const handlePreviewDocumento = (documento: Documento) => {
    setSelectedDocumento(documento);
    toast.info(`Vista previa de ${documento.nombre}`, {
      description: 'La previsualización real se conecta al repositorio documental en producción.',
    });
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

    setDocumentos(prev => prev.filter(doc => doc.id !== documentToDelete.id));
    toast.success('Documento eliminado de la vista');
    setDocumentToDelete(null);
    setShowDeleteSingleConfirmDialog(false);
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
              <p className="text-sm text-gray-600 mt-1">Obteniendo datos de Supabase...</p>
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
            <div className="sticky top-0 z-40 bg-white/95 backdrop-blur-xl py-3 sm:py-4 mb-4 sm:mb-6 flex flex-col md:flex-row gap-3 border-b border-gray-100 shadow-sm rounded-xl px-2 sm:px-4 -mx-2 sm:-mx-4 w-[calc(100%+16px)] sm:w-[calc(100%+32px)]">
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
              <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-6">
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
                        <div className="p-5 flex flex-col h-full relative z-0">
                          {/* Top section: Avatar + Folder Icon */}
                          <div className="flex items-start justify-between mb-4">
                            <div className="relative">
                              <div className="w-14 h-14 rounded-full flex items-center justify-center bg-gradient-to-br from-[#E3F2FD] to-[#BBDEFB] shadow-sm border-2 border-white ring-1 ring-gray-100">
                                <span className="text-xl font-bold" style={{ color: '#003DA5' }}>
                                  {initials}
                                </span>
                              </div>
                              {/* Document Count Badge */}
                              <div className="absolute -top-1.5 -right-1.5 bg-blue-600 text-white rounded-full min-w-[24px] h-6 px-1.5 flex items-center justify-center shadow-sm border-2 border-white">
                                <span className="text-[11px] font-bold">{carpeta.total_documentos || 0}</span>
                              </div>
                            </div>
                            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-gray-50 border border-gray-200 group-hover:bg-blue-50 group-hover:border-blue-200 transition-colors">
                              <FolderOpen
                                className="w-5 h-5 text-gray-500 group-hover:text-blue-600 transition-colors"
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
