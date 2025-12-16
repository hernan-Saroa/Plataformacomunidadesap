/**
 * INFORMES Y GESTIÓN DOCUMENTAL COMPLETO
 * Módulo consolidado que integra:
 * - Informes de Ley (Pormenorizado, Anual, etc.)
 * - Gestión Documental (Papeles de trabajo, evidencias)
 * - Repositorio de Documentos
 * 
 * FLUJO: Generación → Revisión → Firma → Publicación → Archivo
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  FileText, FolderOpen, Scale, Send, Download, Upload,
  Eye, Edit, Trash2, CheckCircle, Clock, AlertCircle,
  Search, Filter, Calendar, User, Building2, Hash,
  Paperclip, FileSignature, Archive, ExternalLink,
  PenTool, ChevronRight, Flag, Shield, Award,
  BarChart3, TrendingUp, Percent, Plus, Save, X,
  Settings, Copy, RefreshCw, Share2, Lock, Unlock
} from 'lucide-react';
import { Card } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { toast } from 'sonner@2.0.3';

// ⭐ IMPORTAR COMPONENTE CRÍTICO: CATÁLOGO DE INFORMES DE LEY
import { CatalogoInformesLey } from './CatalogoInformesLey';

// ============ TIPOS ============

type TabPrincipal = 'informes-ley' | 'gestion-documental' | 'repositorio';
type TipoInforme = 'pormenorizado' | 'anual-oci' | 'trimestral' | 'especial' | 'seguimiento';
type EstadoInforme = 'borrador' | 'en-revision' | 'en-firma' | 'publicado' | 'archivado';
type TipoDocumento = 'papel-trabajo' | 'evidencia' | 'acta' | 'oficio' | 'certificacion' | 'informe-auditoria';
type EstadoDocumento = 'borrador' | 'aprobado' | 'archivado';

interface InformeLey {
  id: string;
  codigo: string;
  tipo: TipoInforme;
  titulo: string;
  descripcion: string;
  periodo: string;
  fechaInicio: string;
  fechaFin: string;
  estado: EstadoInforme;
  responsable: string;
  revisor: string | null;
  firmante: string | null;
  fechaCreacion: string;
  fechaPublicacion: string | null;
  baseNormativa: string;
  destinatarios: string[];
  adjuntos: number;
  paginas: number;
  version: number;
  observaciones: string;
}

interface Documento {
  id: string;
  codigo: string;
  tipo: TipoDocumento;
  nombre: string;
  descripcion: string;
  auditoriaAsociada: string | null;
  hallazgoAsociado: string | null;
  autor: string;
  fechaCreacion: string;
  fechaModificacion: string;
  estado: EstadoDocumento;
  tamano: number; // KB
  formato: string;
  ubicacion: string;
  confidencial: boolean;
  version: number;
  tags: string[];
}

interface CategoriaRepositorio {
  id: string;
  nombre: string;
  descripcion: string;
  icono: JSX.Element;
  color: string;
  totalDocumentos: number;
}

// ============ DATOS - INFORMES DE LEY ============

const INFORMES_LEY_EJEMPLO: InformeLey[] = [
  {
    id: 'inf-001',
    codigo: 'INF-PORT-2024',
    tipo: 'pormenorizado',
    titulo: 'Informe Pormenorizado del Estado del Control Interno - II Semestre 2024',
    descripcion: 'Informe semestral sobre el estado del sistema de control interno conforme Ley 1474 de 2011',
    periodo: 'II Semestre 2024',
    fechaInicio: '2024-07-01',
    fechaFin: '2024-12-31',
    estado: 'en-firma',
    responsable: 'Dra. María Fernanda Gómez',
    revisor: 'Carlos Andrés Rodríguez',
    firmante: 'Rector',
    fechaCreacion: '2025-01-10',
    fechaPublicacion: null,
    baseNormativa: 'Ley 1474 de 2011 - Art. 9',
    destinatarios: ['Consejo Superior', 'DAFP', 'Contraloría'],
    adjuntos: 15,
    paginas: 87,
    version: 3,
    observaciones: 'Pendiente firma del Rector'
  },
  {
    id: 'inf-002',
    codigo: 'INF-ANUAL-OCI-2024',
    tipo: 'anual-oci',
    titulo: 'Informe Anual de Gestión OCI - Vigencia 2024',
    descripcion: 'Informe anual de gestión de la Oficina de Control Interno',
    periodo: 'Vigencia 2024',
    fechaInicio: '2024-01-01',
    fechaFin: '2024-12-31',
    estado: 'publicado',
    responsable: 'Dra. María Fernanda Gómez',
    revisor: 'Carlos Andrés Rodríguez',
    firmante: 'Jefe OCI',
    fechaCreacion: '2024-12-15',
    fechaPublicacion: '2025-01-15',
    baseNormativa: 'Decreto 648 de 2017',
    destinatarios: ['Consejo Superior', 'Rectoría', 'Comunidad Universitaria'],
    adjuntos: 22,
    paginas: 124,
    version: 1,
    observaciones: 'Publicado en página web institucional'
  },
  {
    id: 'inf-003',
    codigo: 'INF-TRIM-Q4-2024',
    tipo: 'trimestral',
    titulo: 'Informe Trimestral de Seguimiento - Q4 2024',
    descripcion: 'Seguimiento trimestral a planes de mejoramiento y auditorías',
    periodo: 'Q4 2024',
    fechaInicio: '2024-10-01',
    fechaFin: '2024-12-31',
    estado: 'publicado',
    responsable: 'Carlos Andrés Rodríguez',
    revisor: 'Dra. María Fernanda Gómez',
    firmante: 'Jefe OCI',
    fechaCreacion: '2024-12-20',
    fechaPublicacion: '2025-01-05',
    baseNormativa: 'Procedimiento Interno OCI',
    destinatarios: ['Rectoría', 'Directores'],
    adjuntos: 8,
    paginas: 45,
    version: 1,
    observaciones: 'Informe interno'
  },
  {
    id: 'inf-004',
    codigo: 'INF-ESP-CONT-2025',
    tipo: 'especial',
    titulo: 'Informe Especial - Revisión Proceso Contractual',
    descripcion: 'Informe especial sobre hallazgos en proceso de contratación directa',
    periodo: 'Enero 2025',
    fechaInicio: '2025-01-10',
    fechaFin: '2025-01-20',
    estado: 'en-revision',
    responsable: 'Andrea Ramírez',
    revisor: 'Dra. María Fernanda Gómez',
    firmante: null,
    fechaCreacion: '2025-01-20',
    fechaPublicacion: null,
    baseNormativa: 'Ley 80 de 1993',
    destinatarios: ['Oficina Jurídica', 'Rectoría'],
    adjuntos: 12,
    paginas: 32,
    version: 2,
    observaciones: 'En revisión por Jefe OCI'
  },
  {
    id: 'inf-005',
    codigo: 'INF-SEG-PM-2025-01',
    tipo: 'seguimiento',
    titulo: 'Seguimiento Plan de Mejoramiento PLAN-2025-001',
    descripcion: 'Seguimiento mensual al plan de mejoramiento de PQRS',
    periodo: 'Enero 2025',
    fechaInicio: '2025-01-01',
    fechaFin: '2025-01-31',
    estado: 'borrador',
    responsable: 'Ana Patricia Martínez',
    revisor: null,
    firmante: null,
    fechaCreacion: '2025-01-25',
    fechaPublicacion: null,
    baseNormativa: 'Procedimiento de Seguimiento OCI',
    destinatarios: ['Jefe OCI', 'Responsable Plan'],
    adjuntos: 5,
    paginas: 18,
    version: 1,
    observaciones: 'Borrador en proceso'
  }
];

// ============ DATOS - DOCUMENTOS ============

const DOCUMENTOS_EJEMPLO: Documento[] = [
  {
    id: 'doc-001',
    codigo: 'PT-AUD-2025-001-001',
    tipo: 'papel-trabajo',
    nombre: 'Papeles de Trabajo - Auditoría Académica',
    descripcion: 'Papeles de trabajo de la auditoría de gestión académica',
    auditoriaAsociada: 'AUD-2025-001',
    hallazgoAsociado: null,
    autor: 'Ana Patricia Martínez',
    fechaCreacion: '2025-01-15',
    fechaModificacion: '2025-01-20',
    estado: 'aprobado',
    tamano: 2450,
    formato: 'PDF',
    ubicacion: 'Servidor OCI / Auditorías 2025 / AUD-001',
    confidencial: true,
    version: 2,
    tags: ['auditoría', 'académica', 'papeles-trabajo']
  },
  {
    id: 'doc-002',
    codigo: 'EV-HALL-2025-001-001',
    tipo: 'evidencia',
    nombre: 'Reporte PQRS Q4 2024',
    descripcion: 'Evidencia de hallazgo de incumplimiento en PQRS',
    auditoriaAsociada: 'AUD-2024-015',
    hallazgoAsociado: 'HALL-2025-001',
    autor: 'Andrea Ramírez',
    fechaCreacion: '2024-12-15',
    fechaModificacion: '2024-12-15',
    estado: 'aprobado',
    tamano: 856,
    formato: 'XLSX',
    ubicacion: 'Servidor OCI / Evidencias / 2025',
    confidencial: false,
    version: 1,
    tags: ['evidencia', 'pqrs', 'hallazgo']
  },
  {
    id: 'doc-003',
    codigo: 'ACTA-AUD-2025-001',
    tipo: 'acta',
    nombre: 'Acta de Apertura Auditoría Académica',
    descripcion: 'Acta de reunión de apertura de auditoría',
    auditoriaAsociada: 'AUD-2025-001',
    hallazgoAsociado: null,
    autor: 'María González',
    fechaCreacion: '2025-01-15',
    fechaModificacion: '2025-01-15',
    estado: 'aprobado',
    tamano: 345,
    formato: 'PDF',
    ubicacion: 'Servidor OCI / Auditorías 2025 / AUD-001',
    confidencial: false,
    version: 1,
    tags: ['acta', 'apertura', 'auditoría']
  },
  {
    id: 'doc-004',
    codigo: 'OF-2025-015',
    tipo: 'oficio',
    nombre: 'Oficio Solicitud Información Financiera',
    descripcion: 'Solicitud de información a Dirección Financiera',
    auditoriaAsociada: 'AUD-2025-002',
    hallazgoAsociado: null,
    autor: 'Carlos Rodríguez',
    fechaCreacion: '2025-02-01',
    fechaModificacion: '2025-02-01',
    estado: 'aprobado',
    tamano: 125,
    formato: 'PDF',
    ubicacion: 'Servidor OCI / Oficios / 2025',
    confidencial: false,
    version: 1,
    tags: ['oficio', 'solicitud', 'financiera']
  },
  {
    id: 'doc-005',
    codigo: 'CERT-2025-008',
    tipo: 'certificacion',
    nombre: 'Certificación Cumplimiento Plan de Mejoramiento',
    descripcion: 'Certificación de cumplimiento PLAN-2024-015',
    auditoriaAsociada: null,
    hallazgoAsociado: 'HALL-2024-023',
    autor: 'Dra. María Fernanda Gómez',
    fechaCreacion: '2025-01-10',
    fechaModificacion: '2025-01-10',
    estado: 'aprobado',
    tamano: 180,
    formato: 'PDF',
    ubicacion: 'Servidor OCI / Certificaciones / 2025',
    confidencial: false,
    version: 1,
    tags: ['certificación', 'plan-mejoramiento']
  },
  {
    id: 'doc-006',
    codigo: 'INF-AUD-2024-018',
    tipo: 'informe-auditoria',
    nombre: 'Informe Final Auditoría Contratación',
    descripcion: 'Informe final de auditoría de cumplimiento contratación',
    auditoriaAsociada: 'AUD-2024-018',
    hallazgoAsociado: null,
    autor: 'Andrea Ramírez',
    fechaCreacion: '2025-01-18',
    fechaModificacion: '2025-01-20',
    estado: 'aprobado',
    tamano: 3200,
    formato: 'PDF',
    ubicacion: 'Servidor OCI / Informes Auditoría / 2024',
    confidencial: true,
    version: 1,
    tags: ['informe', 'auditoría', 'contratación']
  },
  {
    id: 'doc-007',
    codigo: 'PT-AUD-2025-004-001',
    tipo: 'papel-trabajo',
    nombre: 'Evaluación Controles Seguridad TI',
    descripcion: 'Papeles de trabajo evaluación seguridad informática',
    auditoriaAsociada: 'AUD-2025-004',
    hallazgoAsociado: null,
    autor: 'Andrés Sánchez',
    fechaCreacion: '2025-01-10',
    fechaModificacion: '2025-01-18',
    estado: 'borrador',
    tamano: 1850,
    formato: 'PDF',
    ubicacion: 'Servidor OCI / Auditorías 2025 / AUD-004',
    confidencial: true,
    version: 1,
    tags: ['papeles-trabajo', 'seguridad', 'TI']
  }
];

// ============ CATEGORÍAS REPOSITORIO ============

const CATEGORIAS_REPOSITORIO: CategoriaRepositorio[] = [
  {
    id: 'papeles-trabajo',
    nombre: 'Papeles de Trabajo',
    descripcion: 'Documentación de soporte de auditorías',
    icono: <FileText className="w-6 h-6" />,
    color: '#3B82F6',
    totalDocumentos: 45
  },
  {
    id: 'evidencias',
    nombre: 'Evidencias',
    descripcion: 'Evidencias de hallazgos y auditorías',
    icono: <Paperclip className="w-6 h-6" />,
    color: '#F59E0B',
    totalDocumentos: 32
  },
  {
    id: 'actas',
    nombre: 'Actas',
    descripción: 'Actas de reuniones y sesiones',
    icono: <FileSignature className="w-6 h-6" />,
    color: '#10B981',
    totalDocumentos: 28
  },
  {
    id: 'oficios',
    nombre: 'Oficios',
    descripcion: 'Comunicaciones oficiales',
    icono: <Send className="w-6 h-6" />,
    color: '#8B5CF6',
    totalDocumentos: 56
  },
  {
    id: 'certificaciones',
    nombre: 'Certificaciones',
    descripcion: 'Certificados y constancias',
    icono: <Award className="w-6 h-6" />,
    color: '#EC4899',
    totalDocumentos: 18
  },
  {
    id: 'informes-auditoria',
    nombre: 'Informes de Auditoría',
    descripcion: 'Informes finales de auditorías',
    icono: <Scale className="w-6 h-6" />,
    color: '#EF4444',
    totalDocumentos: 23
  }
];

// ============ UTILIDADES ============

const getTipoInformeInfo = (tipo: TipoInforme) => {
  const info = {
    'pormenorizado': { label: 'Pormenorizado', color: '#DC2626', icono: '📊' },
    'anual-oci': { label: 'Anual OCI', color: '#3B82F6', icono: '📅' },
    'trimestral': { label: 'Trimestral', color: '#10B981', icono: '📈' },
    'especial': { label: 'Especial', color: '#F59E0B', icono: '🔍' },
    'seguimiento': { label: 'Seguimiento', color: '#8B5CF6', icono: '👁️' }
  };
  return info[tipo];
};

const getEstadoInformeInfo = (estado: EstadoInforme) => {
  const info = {
    'borrador': { label: 'Borrador', color: '#6B7280', icono: <Edit className="w-4 h-4" /> },
    'en-revision': { label: 'En Revisión', color: '#F59E0B', icono: <Eye className="w-4 h-4" /> },
    'en-firma': { label: 'En Firma', color: '#8B5CF6', icono: <PenTool className="w-4 h-4" /> },
    'publicado': { label: 'Publicado', color: '#10B981', icono: <CheckCircle className="w-4 h-4" /> },
    'archivado': { label: 'Archivado', color: '#6B7280', icono: <Archive className="w-4 h-4" /> }
  };
  return info[estado];
};

const getTipoDocumentoInfo = (tipo: TipoDocumento) => {
  const info = {
    'papel-trabajo': { label: 'Papel de Trabajo', color: '#3B82F6', icono: <FileText className="w-4 h-4" /> },
    'evidencia': { label: 'Evidencia', color: '#F59E0B', icono: <Paperclip className="w-4 h-4" /> },
    'acta': { label: 'Acta', color: '#10B981', icono: <FileSignature className="w-4 h-4" /> },
    'oficio': { label: 'Oficio', color: '#8B5CF6', icono: <Send className="w-4 h-4" /> },
    'certificacion': { label: 'Certificación', color: '#EC4899', icono: <Award className="w-4 h-4" /> },
    'informe-auditoria': { label: 'Informe Auditoría', color: '#EF4444', icono: <Scale className="w-4 h-4" /> }
  };
  return info[tipo];
};

const formatTamano = (kb: number) => {
  if (kb < 1024) return `${kb} KB`;
  return `${(kb / 1024).toFixed(2)} MB`;
};

// ============ COMPONENTE PRINCIPAL ============

export function InformesYDocumentalCompleto() {
  const [tabActivo, setTabActivo] = useState<TabPrincipal>('informes-ley');

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
            <Scale className="w-7 h-7" style={{ color: '#8B5CF6' }} />
            Informes y Gestión Documental
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Informes de Ley • Gestión Documental • Repositorio
          </p>
        </div>

        <div className="flex gap-2">
          <Button variant="outline">
            <Upload className="w-4 h-4 mr-2" />
            Cargar
          </Button>
          <Button style={{ background: '#003DA5' }}>
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Informe
          </Button>
        </div>
      </div>

      {/* FLUJO VISUAL */}
      <Card className="p-6 bg-gradient-to-r from-purple-50 to-blue-50">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div
              className={`text-center p-4 rounded-lg transition-all cursor-pointer ${
                tabActivo === 'informes-ley' ? 'bg-purple-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
              onClick={() => setTabActivo('informes-ley')}
            >
              <Scale className={`w-8 h-8 mx-auto mb-2 ${tabActivo === 'informes-ley' ? 'text-white' : 'text-purple-600'}`} />
              <p className="font-bold text-sm">1. Informes de Ley</p>
              <p className="text-xs opacity-80">Normatividad</p>
            </div>
          </div>

          <ChevronRight className="w-6 h-6 text-gray-400 mx-2" />

          <div className="flex-1">
            <div
              className={`text-center p-4 rounded-lg transition-all cursor-pointer ${
                tabActivo === 'gestion-documental' ? 'bg-purple-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
              onClick={() => setTabActivo('gestion-documental')}
            >
              <FileText className={`w-8 h-8 mx-auto mb-2 ${tabActivo === 'gestion-documental' ? 'text-white' : 'text-blue-600'}`} />
              <p className="font-bold text-sm">2. Gestión Documental</p>
              <p className="text-xs opacity-80">Documentos</p>
            </div>
          </div>

          <ChevronRight className="w-6 h-6 text-gray-400 mx-2" />

          <div className="flex-1">
            <div
              className={`text-center p-4 rounded-lg transition-all cursor-pointer ${
                tabActivo === 'repositorio' ? 'bg-purple-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
              onClick={() => setTabActivo('repositorio')}
            >
              <FolderOpen className={`w-8 h-8 mx-auto mb-2 ${tabActivo === 'repositorio' ? 'text-white' : 'text-green-600'}`} />
              <p className="font-bold text-sm">3. Repositorio</p>
              <p className="text-xs opacity-80">Archivo</p>
            </div>
          </div>
        </div>
      </Card>

      {/* CONTENIDO SEGÚN TAB */}
      <AnimatePresence mode="wait">
        {tabActivo === 'informes-ley' && <TabInformesLey />}
        {tabActivo === 'gestion-documental' && <TabGestionDocumental />}
        {tabActivo === 'repositorio' && <TabRepositorio />}
      </AnimatePresence>
    </div>
  );
}

// ============ TAB 1: INFORMES DE LEY ============

function TabInformesLey() {
  const [informes] = useState(INFORMES_LEY_EJEMPLO);
  const [filtroTipo, setFiltroTipo] = useState<TipoInforme | 'todos'>('todos');
  const [filtroEstado, setFiltroEstado] = useState<EstadoInforme | 'todos'>('todos');

  const informesFiltrados = informes.filter(i => {
    const matchTipo = filtroTipo === 'todos' || i.tipo === filtroTipo;
    const matchEstado = filtroEstado === 'todos' || i.estado === filtroEstado;
    return matchTipo && matchEstado;
  });

  const estadisticas = {
    total: informes.length,
    borradores: informes.filter(i => i.estado === 'borrador').length,
    enRevision: informes.filter(i => i.estado === 'en-revision').length,
    publicados: informes.filter(i => i.estado === 'publicado').length
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      {/* ESTADÍSTICAS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 border-2" style={{ borderColor: '#8B5CF6', background: '#F3E8FF' }}>
          <p className="text-sm font-bold text-gray-700 mb-1">Total Informes</p>
          <p className="text-3xl font-black" style={{ color: '#8B5CF6' }}>{estadisticas.total}</p>
        </Card>
        <Card className="p-4 border-2" style={{ borderColor: '#6B7280', background: '#F3F4F6' }}>
          <p className="text-sm font-bold text-gray-700 mb-1">Borradores</p>
          <p className="text-3xl font-black" style={{ color: '#6B7280' }}>{estadisticas.borradores}</p>
        </Card>
        <Card className="p-4 border-2" style={{ borderColor: '#F59E0B', background: '#FEF3C7' }}>
          <p className="text-sm font-bold text-gray-700 mb-1">En Revisión</p>
          <p className="text-3xl font-black" style={{ color: '#F59E0B' }}>{estadisticas.enRevision}</p>
        </Card>
        <Card className="p-4 border-2" style={{ borderColor: '#10B981', background: '#D1FAE5' }}>
          <p className="text-sm font-bold text-gray-700 mb-1">Publicados</p>
          <p className="text-3xl font-black" style={{ color: '#10B981' }}>{estadisticas.publicados}</p>
        </Card>
      </div>

      {/* FILTROS */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              <Filter className="w-4 h-4 inline mr-1" />
              Tipo de Informe
            </label>
            <select
              value={filtroTipo}
              onChange={(e) => setFiltroTipo(e.target.value as any)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="todos">Todos los tipos</option>
              <option value="pormenorizado">Pormenorizado</option>
              <option value="anual-oci">Anual OCI</option>
              <option value="trimestral">Trimestral</option>
              <option value="especial">Especial</option>
              <option value="seguimiento">Seguimiento</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              <Flag className="w-4 h-4 inline mr-1" />
              Estado
            </label>
            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value as any)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="todos">Todos los estados</option>
              <option value="borrador">Borrador</option>
              <option value="en-revision">En Revisión</option>
              <option value="en-firma">En Firma</option>
              <option value="publicado">Publicado</option>
              <option value="archivado">Archivado</option>
            </select>
          </div>
        </div>
      </Card>

      {/* ⭐ CATÁLOGO DE INFORMES DE LEY - COMPONENTE CRÍTICO INTEGRADO */}
      <div className="my-6">
        <Card className="p-6 bg-gradient-to-r from-purple-50 to-indigo-50 border-2 border-purple-200">
          <div className="flex items-center gap-3 mb-4">
            <Scale className="w-6 h-6 text-purple-600" />
            <div>
              <h3 className="text-lg font-black text-gray-900">
                Catálogo Normativo de Informes de Ley
              </h3>
              <p className="text-sm text-gray-600">
                Guía oficial de informes obligatorios según normatividad colombiana
              </p>
            </div>
          </div>
          <CatalogoInformesLey />
        </Card>
      </div>

      {/* LISTA DE INFORMES */}
      <div className="space-y-4">
        {informesFiltrados.map(informe => (
          <CardInforme key={informe.id} informe={informe} />
        ))}
      </div>
    </motion.div>
  );
}

function CardInforme({ informe }: { informe: InformeLey }) {
  const tipoInfo = getTipoInformeInfo(informe.tipo);
  const estadoInfo = getEstadoInformeInfo(informe.estado);

  return (
    <Card className="p-6 hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="outline">{informe.codigo}</Badge>
            <Badge style={{ background: tipoInfo.color, color: 'white' }}>
              {tipoInfo.icono} {tipoInfo.label}
            </Badge>
            <Badge style={{ background: estadoInfo.color, color: 'white' }}>
              {estadoInfo.icono}
              <span className="ml-1">{estadoInfo.label}</span>
            </Badge>
          </div>
          <h3 className="text-lg font-black text-gray-900 mb-2">{informe.titulo}</h3>
          <p className="text-sm text-gray-600 mb-3">{informe.descripcion}</p>
        </div>
        <div className="flex gap-1">
          <Button variant="outline" size="sm">
            <Eye className="w-3 h-3" />
          </Button>
          <Button variant="outline" size="sm">
            <Download className="w-3 h-3" />
          </Button>
          <Button variant="outline" size="sm">
            <Edit className="w-3 h-3" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <InfoField label="Periodo" value={informe.periodo} />
        <InfoField label="Responsable" value={informe.responsable} />
        <InfoField label="Páginas" value={`${informe.paginas} págs.`} />
        <InfoField label="Adjuntos" value={`${informe.adjuntos} archivos`} />
      </div>

      <div className="flex flex-wrap gap-2 mb-3">
        <Badge variant="outline" className="text-xs">
          <Calendar className="w-3 h-3 mr-1" />
          {informe.fechaCreacion}
        </Badge>
        <Badge variant="outline" className="text-xs">
          v{informe.version}
        </Badge>
        {informe.fechaPublicacion && (
          <Badge variant="outline" className="text-xs" style={{ color: '#10B981' }}>
            Publicado: {informe.fechaPublicacion}
          </Badge>
        )}
      </div>

      <div className="text-xs text-gray-600 bg-gray-50 p-3 rounded">
        <p><strong>Base normativa:</strong> {informe.baseNormativa}</p>
        {informe.observaciones && <p className="mt-1"><strong>Observaciones:</strong> {informe.observaciones}</p>}
      </div>
    </Card>
  );
}

// ============ TAB 2: GESTIÓN DOCUMENTAL ============

function TabGestionDocumental() {
  const [documentos] = useState(DOCUMENTOS_EJEMPLO);
  const [filtroTipo, setFiltroTipo] = useState<TipoDocumento | 'todos'>('todos');
  const [busqueda, setBusqueda] = useState('');

  const documentosFiltrados = documentos.filter(d => {
    const matchTipo = filtroTipo === 'todos' || d.tipo === filtroTipo;
    const matchBusqueda = d.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
                          d.codigo.toLowerCase().includes(busqueda.toLowerCase());
    return matchTipo && matchBusqueda;
  });

  const estadisticas = {
    total: documentos.length,
    aprobados: documentos.filter(d => d.estado === 'aprobado').length,
    confidenciales: documentos.filter(d => d.confidencial).length,
    tamanoTotal: documentos.reduce((sum, d) => sum + d.tamano, 0)
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      {/* ESTADÍSTICAS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 border-2" style={{ borderColor: '#3B82F6', background: '#EFF6FF' }}>
          <p className="text-sm font-bold text-gray-700 mb-1">Total Docs.</p>
          <p className="text-3xl font-black" style={{ color: '#3B82F6' }}>{estadisticas.total}</p>
        </Card>
        <Card className="p-4 border-2" style={{ borderColor: '#10B981', background: '#D1FAE5' }}>
          <p className="text-sm font-bold text-gray-700 mb-1">Aprobados</p>
          <p className="text-3xl font-black" style={{ color: '#10B981' }}>{estadisticas.aprobados}</p>
        </Card>
        <Card className="p-4 border-2" style={{ borderColor: '#EF4444', background: '#FEE2E2' }}>
          <p className="text-sm font-bold text-gray-700 mb-1">Confidenciales</p>
          <p className="text-3xl font-black" style={{ color: '#EF4444' }}>{estadisticas.confidenciales}</p>
        </Card>
        <Card className="p-4 border-2" style={{ borderColor: '#8B5CF6', background: '#F3E8FF' }}>
          <p className="text-sm font-bold text-gray-700 mb-1">Tamaño Total</p>
          <p className="text-2xl font-black" style={{ color: '#8B5CF6' }}>
            {formatTamano(estadisticas.tamanoTotal)}
          </p>
        </Card>
      </div>

      {/* FILTROS */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              <Search className="w-4 h-4 inline mr-1" />
              Buscar documento
            </label>
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              <Filter className="w-4 h-4 inline mr-1" />
              Tipo de Documento
            </label>
            <select
              value={filtroTipo}
              onChange={(e) => setFiltroTipo(e.target.value as any)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="todos">Todos los tipos</option>
              <option value="papel-trabajo">Papeles de Trabajo</option>
              <option value="evidencia">Evidencias</option>
              <option value="acta">Actas</option>
              <option value="oficio">Oficios</option>
              <option value="certificacion">Certificaciones</option>
              <option value="informe-auditoria">Informes de Auditoría</option>
            </select>
          </div>
        </div>
      </Card>

      {/* TABLA DE DOCUMENTOS */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b-2">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Código</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Nombre</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Tipo</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Autor</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Fecha</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Tamaño</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Estado</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {documentosFiltrados.map(doc => {
                const tipoInfo = getTipoDocumentoInfo(doc.tipo);
                return (
                  <tr key={doc.id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <Badge variant="outline" className="text-xs">{doc.codigo}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-sm">{doc.nombre}</p>
                        {doc.confidencial && <Lock className="w-3 h-3 text-red-600" />}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge style={{ background: tipoInfo.color, color: 'white' }} className="text-xs">
                        {tipoInfo.label}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-sm">{doc.autor}</td>
                    <td className="px-4 py-3 text-sm">{doc.fechaCreacion}</td>
                    <td className="px-4 py-3 text-sm">{formatTamano(doc.tamano)}</td>
                    <td className="px-4 py-3">
                      <Badge
                        style={{
                          background: doc.estado === 'aprobado' ? '#10B981' : '#6B7280',
                          color: 'white'
                        }}
                        className="text-xs"
                      >
                        {doc.estado}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <Button variant="outline" size="sm">
                          <Eye className="w-3 h-3" />
                        </Button>
                        <Button variant="outline" size="sm">
                          <Download className="w-3 h-3" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </motion.div>
  );
}

// ============ TAB 3: REPOSITORIO ============

function TabRepositorio() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      <Card className="p-6">
        <h3 className="text-lg font-black text-gray-900 mb-4">
          Categorías del Repositorio
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {CATEGORIAS_REPOSITORIO.map(categoria => (
            <div
              key={categoria.id}
              className="p-6 border-2 rounded-xl hover:shadow-lg transition-all cursor-pointer"
              style={{ borderColor: categoria.color + '40', background: categoria.color + '10' }}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="p-3 rounded-lg" style={{ background: categoria.color + '20', color: categoria.color }}>
                  {categoria.icono}
                </div>
                <div className="flex-1">
                  <h4 className="font-black text-gray-900">{categoria.nombre}</h4>
                  <p className="text-sm text-gray-600">{categoria.descripcion}</p>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <Badge style={{ background: categoria.color, color: 'white' }}>
                  {categoria.totalDocumentos} documentos
                </Badge>
                <Button variant="outline" size="sm">
                  <ExternalLink className="w-3 h-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* ACCESO RÁPIDO */}
      <Card className="p-6">
        <h3 className="text-lg font-black text-gray-900 mb-4">
          Acceso Rápido
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Button variant="outline" className="h-auto p-4 justify-start">
            <Download className="w-5 h-5 mr-3" style={{ color: '#3B82F6' }} />
            <div className="text-left">
              <p className="font-bold">Documentos Recientes</p>
              <p className="text-xs text-gray-600">Últimos 30 días</p>
            </div>
          </Button>

          <Button variant="outline" className="h-auto p-4 justify-start">
            <Lock className="w-5 h-5 mr-3" style={{ color: '#EF4444' }} />
            <div className="text-left">
              <p className="font-bold">Documentos Confidenciales</p>
              <p className="text-xs text-gray-600">Acceso restringido</p>
            </div>
          </Button>

          <Button variant="outline" className="h-auto p-4 justify-start">
            <Calendar className="w-5 h-5 mr-3" style={{ color: '#10B981' }} />
            <div className="text-left">
              <p className="font-bold">Por Auditoría</p>
              <p className="text-xs text-gray-600">Agrupado por auditoría</p>
            </div>
          </Button>

          <Button variant="outline" className="h-auto p-4 justify-start">
            <User className="w-5 h-5 mr-3" style={{ color: '#F59E0B' }} />
            <div className="text-left">
              <p className="font-bold">Mis Documentos</p>
              <p className="text-xs text-gray-600">Creados por mí</p>
            </div>
          </Button>
        </div>
      </Card>
    </motion.div>
  );
}

// ============ COMPONENTES AUXILIARES ============

function InfoField({ label, value }: { label: string, value: string }) {
  return (
    <div>
      <p className="text-xs text-gray-600">{label}</p>
      <p className="text-sm font-bold text-gray-900">{value}</p>
    </div>
  );
}