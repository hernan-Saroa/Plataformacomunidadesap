/**
 * ============================================
 * GESTIÓN DOCUMENTAL - Control Interno Disciplinario
 * ============================================
 * 
 * Módulo para organización y gestión de documentos
 * Diseño unificado con Proceso de Auditoría
 * ÚLTIMA ACTUALIZACIÓN: 24 Diciembre 2025
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  FolderOpen, File, ChevronRight, Search, Plus, Upload,
  Download, Eye, Trash2, Filter, Calendar, User, FileText,
  ChevronDown, Tag, Folder
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';

// Design System
import { CardSIGL } from '../gestion-legal/design-system/CardSIGL';
import { BadgeSIGL } from '../gestion-legal/design-system/BadgeSIGL';
import { ButtonSIGL } from '../gestion-legal/design-system/ButtonSIGL';
import { ModalSIGL } from '../gestion-legal/design-system/ModalSIGL';
import { HeaderModuloCIG } from '../control-interno/HeaderModuloCIG';

// ============ TIPOS ============

interface CarpetaDocumental {
  id: string;
  nombre: string;
  descripcion: string;
  color: string;
  documentosCount: number;
  ultimaModificacion: string;
}

interface Documento {
  id: string;
  nombre: string;
  tipo: string;
  tamano: string;
  fechaSubida: string;
  subidoPor: string;
  etiquetas: string[];
  carpeta: string;
}

// ============ DATOS MOCK ============

const CARPETAS_MOCK: CarpetaDocumental[] = [
  { 
    id: '1', 
    nombre: 'Informes de Ley', 
    descripcion: 'Informes obligatorios y normativos', 
    color: '#1e5da8', 
    documentosCount: 42,
    ultimaModificacion: '24/12/2024'
  },
  { 
    id: '2', 
    nombre: 'Actas y Reuniones', 
    descripcion: 'Actas de reuniones y comités', 
    color: '#10b981', 
    documentosCount: 18,
    ultimaModificacion: '23/12/2024'
  },
  { 
    id: '3', 
    nombre: 'Oficios y Comunicaciones', 
    descripcion: 'Oficios enviados y recibidos', 
    color: '#f59e0b', 
    documentosCount: 156,
    ultimaModificacion: '24/12/2024'
  },
  { 
    id: '4', 
    nombre: 'Formatos y Plantillas', 
    descripcion: 'Formatos estándar OCI', 
    color: '#8b5cf6', 
    documentosCount: 28,
    ultimaModificacion: '20/12/2024'
  },
  { 
    id: '5', 
    nombre: 'Evidencias', 
    descripcion: 'Evidencias de procesos disciplinarios', 
    color: '#ef4444', 
    documentosCount: 312,
    ultimaModificacion: '24/12/2024'
  },
  { 
    id: '6', 
    nombre: 'Normativa', 
    descripcion: 'Leyes, decretos y resoluciones', 
    color: '#3b82f6', 
    documentosCount: 64,
    ultimaModificación: '22/12/2024'
  }
];

const DOCUMENTOS_MOCK: Documento[] = [
  {
    id: '1',
    nombre: 'Informe Pormenorizado Q4 2024.pdf',
    tipo: 'PDF',
    tamano: '2.3 MB',
    fechaSubida: '20/12/2024',
    subidoPor: 'Fernando Ávila',
    etiquetas: ['Informe', 'Obligatorio', '2024'],
    carpeta: 'Informes de Ley'
  },
  {
    id: '2',
    nombre: 'Acta Reunión 001-2025.docx',
    tipo: 'Word',
    tamano: '856 KB',
    fechaSubida: '15/01/2025',
    subidoPor: 'María González',
    etiquetas: ['Acta', 'Reunión', '2025'],
    carpeta: 'Actas y Reuniones'
  },
  {
    id: '3',
    nombre: 'Oficio Notificación 045-2024.pdf',
    tipo: 'PDF',
    tamano: '456 KB',
    fechaSubida: '23/12/2024',
    subidoPor: 'Carlos Mendoza',
    etiquetas: ['Oficio', 'Notificación'],
    carpeta: 'Oficios y Comunicaciones'
  },
  {
    id: '4',
    nombre: 'Formato Acta Disciplinaria.docx',
    tipo: 'Word',
    tamano: '124 KB',
    fechaSubida: '10/12/2024',
    subidoPor: 'Ana Torres',
    etiquetas: ['Formato', 'Plantilla'],
    carpeta: 'Formatos y Plantillas'
  },
  {
    id: '5',
    nombre: 'Evidencia Caso PD-2025-0025.zip',
    tipo: 'ZIP',
    tamano: '15.8 MB',
    fechaSubida: '22/12/2024',
    subidoPor: 'Fernando Ávila',
    etiquetas: ['Evidencia', 'Proceso'],
    carpeta: 'Evidencias'
  }
];

// ============ COMPONENTE PRINCIPAL ============

export function GestionDocumentalModule() {
  const [vistaActual, setVistaActual] = useState<'carpetas' | 'documentos'>('carpetas');
  const [carpetaSeleccionada, setCarpetaSeleccionada] = useState<CarpetaDocumental | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [modalCarpeta, setModalCarpeta] = useState(false);
  const [modalDocumento, setModalDocumento] = useState(false);

  const totalDocumentos = CARPETAS_MOCK.reduce((sum, c) => sum + c.documentosCount, 0);
  const totalCarpetas = CARPETAS_MOCK.length;

  const handleAbrirCarpeta = (carpeta: CarpetaDocumental) => {
    setCarpetaSeleccionada(carpeta);
    setVistaActual('documentos');
  };

  const handleVolverCarpetas = () => {
    setVistaActual('carpetas');
    setCarpetaSeleccionada(null);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Unificado */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <HeaderModuloCIG
          titulo="Gestión Documental"
          subtitulo="Organización y administración de documentos del Control Interno Disciplinario"
        />
      </div>

      {/* Barra de Estadísticas */}
      <div className="bg-white border-b px-6 py-3">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-700">Repositorio Documental</span>
            <span className="text-sm text-gray-900">{totalDocumentos} documentos en {totalCarpetas} carpetas</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3">
            <StatCard titulo="Total Documentos" valor={totalDocumentos} icono={<File className="w-5 h-5" />} color="#1e5da8" />
            <StatCard titulo="Carpetas" valor={totalCarpetas} icono={<Folder className="w-5 h-5" />} color="#10b981" />
            <StatCard titulo="Subidos Hoy" valor={8} icono={<Upload className="w-5 h-5" />} color="#f59e0b" />
            <StatCard titulo="Espacio Usado" valor="2.4 GB" icono={<FolderOpen className="w-5 h-5" />} color="#8b5cf6" isString />
          </div>
        </div>
      </div>

      {/* Contenido Principal */}
      <div className="max-w-6xl mx-auto px-6 py-6">
        {/* Barra de Búsqueda y Acciones */}
        <div className="flex gap-2 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder={vistaActual === 'carpetas' ? 'Buscar carpetas...' : 'Buscar documentos...'}
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <ButtonSIGL variant="default" size="sm" onClick={() => setModalCarpeta(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Nueva Carpeta
          </ButtonSIGL>
          <ButtonSIGL variant="outline" size="sm" onClick={() => setModalDocumento(true)}>
            <Upload className="w-4 h-4 mr-2" />
            Subir Documento
          </ButtonSIGL>
        </div>

        {/* Breadcrumb */}
        {vistaActual === 'documentos' && carpetaSeleccionada && (
          <div className="flex items-center gap-2 mb-4 text-sm">
            <button 
              onClick={handleVolverCarpetas}
              className="text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              <FolderOpen className="w-4 h-4" />
              Carpetas
            </button>
            <ChevronRight className="w-4 h-4 text-gray-400" />
            <span className="text-gray-900 font-medium">{carpetaSeleccionada.nombre}</span>
          </div>
        )}

        {/* Vista de Carpetas */}
        {vistaActual === 'carpetas' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {CARPETAS_MOCK.map((carpeta) => (
              <CardSIGL
                key={carpeta.id}
                className="p-5 hover:shadow-lg transition-all cursor-pointer group"
                onClick={() => handleAbrirCarpeta(carpeta)}
              >
                <div className="flex items-start gap-4">
                  <div
                    className="w-12 h-12 rounded-lg flex items-center justify-center text-white flex-shrink-0"
                    style={{ backgroundColor: carpeta.color }}
                  >
                    <FolderOpen className="w-6 h-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm text-gray-900 mb-1 group-hover:text-blue-600 transition-colors font-medium">
                      {carpeta.nombre}
                    </h3>
                    <p className="text-xs text-gray-500 mb-2">{carpeta.descripcion}</p>
                    <div className="flex items-center gap-3 text-xs text-gray-600">
                      <div className="flex items-center gap-1">
                        <File className="w-3 h-3" />
                        <span>{carpeta.documentosCount} docs</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        <span>{carpeta.ultimaModificacion}</span>
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-blue-600 transition-colors flex-shrink-0" />
                </div>
              </CardSIGL>
            ))}
          </div>
        )}

        {/* Vista de Documentos */}
        {vistaActual === 'documentos' && (
          <div className="space-y-2">
            {DOCUMENTOS_MOCK.map((doc) => (
              <CardSIGL key={doc.id} className="p-4 hover:shadow-md transition-all">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <FileText className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm text-gray-900 mb-1 font-medium">{doc.nombre}</h4>
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      <span>{doc.tipo}</span>
                      <span>•</span>
                      <span>{doc.tamano}</span>
                      <span>•</span>
                      <div className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        <span>{doc.subidoPor}</span>
                      </div>
                      <span>•</span>
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        <span>{doc.fechaSubida}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 mt-2">
                      {doc.etiquetas.map((etiqueta, idx) => (
                        <BadgeSIGL key={idx} variant="outline" size="sm">
                          {etiqueta}
                        </BadgeSIGL>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                      onClick={() => toast.success(`Previsualizando: ${doc.nombre}`)}
                    >
                      <Eye className="w-4 h-4 text-gray-600" />
                    </button>
                    <button 
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                      onClick={() => toast.success(`Descargando: ${doc.nombre}`)}
                    >
                      <Download className="w-4 h-4 text-gray-600" />
                    </button>
                    <button 
                      className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                      onClick={() => toast.success(`Eliminado: ${doc.nombre}`)}
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </button>
                  </div>
                </div>
              </CardSIGL>
            ))}
          </div>
        )}
      </div>

      {/* Modal Nueva Carpeta */}
      <ModalSIGL
        isOpen={modalCarpeta}
        onClose={() => setModalCarpeta(false)}
        title="Nueva Carpeta"
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Nombre de la carpeta</label>
            <input
              type="text"
              placeholder="Ej: Procesos Disciplinarios 2025"
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Descripción</label>
            <textarea
              placeholder="Descripción breve de la carpeta..."
              rows={3}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <ButtonSIGL variant="outline" onClick={() => setModalCarpeta(false)}>
              Cancelar
            </ButtonSIGL>
            <ButtonSIGL 
              variant="default"
              onClick={() => {
                toast.success('Carpeta creada exitosamente');
                setModalCarpeta(false);
              }}
            >
              Crear Carpeta
            </ButtonSIGL>
          </div>
        </div>
      </ModalSIGL>

      {/* Modal Subir Documento */}
      <ModalSIGL
        isOpen={modalDocumento}
        onClose={() => setModalDocumento(false)}
        title="Subir Documento"
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Seleccionar carpeta</label>
            <select className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
              {CARPETAS_MOCK.map((carpeta) => (
                <option key={carpeta.id}>{carpeta.nombre}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Archivo</label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-500 transition-colors cursor-pointer">
              <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-600">Arrastra un archivo o haz clic para seleccionar</p>
              <p className="text-xs text-gray-400 mt-1">Máximo 50 MB</p>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <ButtonSIGL variant="outline" onClick={() => setModalDocumento(false)}>
              Cancelar
            </ButtonSIGL>
            <ButtonSIGL 
              variant="default"
              onClick={() => {
                toast.success('Documento subido exitosamente');
                setModalDocumento(false);
              }}
            >
              Subir Documento
            </ButtonSIGL>
          </div>
        </div>
      </ModalSIGL>
    </div>
  );
}

// ============ COMPONENTE: STAT CARD ============

function StatCard({
  titulo,
  valor,
  icono,
  color,
  isString = false
}: {
  titulo: string;
  valor: number | string;
  icono: React.ReactNode;
  color: string;
  isString?: boolean;
}) {
  return (
    <div className="bg-white border rounded-lg p-3">
      <div className="flex items-center gap-3">
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center text-white flex-shrink-0"
          style={{ backgroundColor: color }}
        >
          {icono}
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-0.5">{titulo}</p>
          <p className="text-xl font-bold text-gray-900">{valor}</p>
        </div>
      </div>
    </div>
  );
}
